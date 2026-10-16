import fs from 'fs'
import path from 'path'
import { isBuiltin } from 'module'
import * as acorn from 'acorn'
import * as eslintScope from 'eslint-scope'
import { wptError } from './wptCommon.mjs'


//buildCheck, 內部用(非公開API): 建置期檢查(帳本R16、R17)與清空資料夾(帳本R18)
//  R16 引用: 產物仍引用之無法解析裸引用(Node內建模組除外, 受try/catch守衛之動態import()只警告)即錯誤; 產物不可能取得內建模組者(iife、瀏覽器且bNodePolyfill)不豁免; commonjs動態require樁之未受守衛呼叫即錯誤; 瀏覽器worker之inner不得引用外部模組(rollupWorkerCore以imports與findFreeRequires判定)
//  R17 import.meta: 非es格式存活之url以外屬性未受守衛即錯誤; umd/cjs之url墊片內之__filename(umd另有location)不得綁到產物內之宣告
//  R18 清空: 非success即拋錯, 暫時性占用與並發刪除自寫重試, 拒絕清空根目錄與cwd(含其上層)
//  只用rollup 3.20起即有之API(onwarn、moduleParsed、resolveImportMeta、renderChunk、chunk.imports): 下游實裝之rollup為3.20.2~3.30.0, onLog於3.25才有


//commonjs外掛(24.x)把require(非字面值)與非呼叫之require參照換成引用此模組之commonjsRequire(未設dynamicRequireTargets時為呼叫即拋Could not dynamically require之樁)
const cjsDynamicModulesId = '\0commonjs-dynamic-modules'
const cjsRequireStub = 'commonjsRequire'

//rollup於非es格式只模擬url, 其餘屬性換成undefined(呼叫則拋錯), 裸import.meta只得{ url }
const metaUrl = 'url'

//umd/cjs之url墊片以free之__filename取Node端位置(umd另以typeof location判斷), rollup未避讓者會被同名宣告劫持
const shimNames = {
    umd: ['__filename', 'location'],
    cjs: ['__filename'],
}


//isNodeBuiltin, Node內建模組(依執行建置之Node之module.isBuiltin, 含node:前綴與子路徑如stream/promises)
//  不可以node:前綴一律視為內建: 不存在之node:xxx會被放行而產物載入即No such built-in module
function isNodeBuiltin(id) {
    return typeof id === 'string' && isBuiltin(id)
}


//isListedExternal, id是否為呼叫端明列於external(陣列元素為字串時全名比對、為RegExp時test, 同rollup之getIdMatcher)
function isListedExternal(id, external) {
    for (let e of external || []) {
        if (typeof e === 'string' && e === id) {
            return true
        }
        if (e instanceof RegExp && e.test(id)) {
            return true
        }
    }
    return false
}


function relId(id) {
    let s = String(id).replace(/^\0/, '')
    return path.isAbsolute(s) ? path.relative(process.cwd(), s).replace(/\\/g, '/') : s
}


//walkAst, 深度優先走訪ESTree節點, fn(node, parents)回傳false則不進入子節點
function walkAst(ast, fn) {
    let parents = []
    let visit = (node) => {
        if (!node || typeof node.type !== 'string') {
            return
        }
        if (fn(node, parents) === false) {
            return
        }
        parents.push(node)
        for (let k of Object.keys(node)) {
            if (k === 'loc' || k === 'range' || k === 'start' || k === 'end') {
                continue
            }
            let v = node[k]
            if (Array.isArray(v)) {
                for (let c of v) {
                    visit(c)
                }
            }
            else if (v && typeof v.type === 'string') {
                visit(v)
            }
        }
        parents.pop()
    }
    visit(ast)
}

const funTypes = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']

//inTryBlock, node是否位於同一函數內之try區塊(不含catch、finally; 跨函數邊界之try不算)
function inTryBlock(node, parents) {
    for (let i = parents.length - 1; i >= 0; i--) {
        let p = parents[i]
        if (funTypes.includes(p.type)) {
            return false
        }
        if (p.type === 'TryStatement' && node.start >= p.block.start && node.end <= p.block.end) {
            return true
        }
    }
    return false
}

//isTestContext, node(運算式)之值只被判斷(typeof、條件、邏輯左運算元、相等比較)或其後續取用為可選鏈
function isTestContext(node, parent) {
    if (!parent) {
        return false
    }
    if (parent.type === 'UnaryExpression' && parent.operator === 'typeof') {
        return true
    }
    if ((parent.type === 'IfStatement' || parent.type === 'ConditionalExpression' || parent.type === 'WhileStatement' || parent.type === 'DoWhileStatement') && parent.test === node) {
        return true
    }
    if (parent.type === 'LogicalExpression' && parent.left === node) {
        return true
    }
    if (parent.type === 'BinaryExpression' && ['==', '===', '!=', '!=='].includes(parent.operator)) {
        return true
    }
    if (parent.type === 'MemberExpression' && parent.object === node && parent.optional) {
        return true
    }
    if (parent.type === 'CallExpression' && parent.callee === node && parent.optional) {
        return true
    }
    return false
}


//getMetaUses, 模組內各import.meta之取用分類:
//  member[P]: 以字面屬性P取用者是否有受守衛者(只判斷存在、或後續為可選鏈); 存活之P(url以外)在模組內無任何受守衛之取用即視為必壞
//  bare: 非以字面屬性取用者: safe(只判斷存在)、destructure(解構, 取出之屬性名; rest記為'...')、unsafe(別名、傳遞、計算屬性非字串常值等)
//  writes: 被寫入(賦值、遞增減、delete)之字面屬性; 非es格式下url被換成墊片運算式、其他被換成undefined, 寫入即無效左值或對undefined賦值
function getMetaUses(ast) {
    let guarded = {}
    let bare = []
    let writes = []
    walkAst(ast, (node, parents) => {
        if (!(node.type === 'MetaProperty' && node.meta && node.meta.name === 'import')) {
            return true
        }
        let parent = parents[parents.length - 1]
        if (parent && parent.type === 'MemberExpression' && parent.object === node && (!parent.computed || (parent.property.type === 'Literal' && typeof parent.property.value === 'string'))) {
            let p = parent.computed ? parent.property.value : parent.property.name
            let gp = parents[parents.length - 2]
            if (gp && ((gp.type === 'AssignmentExpression' && gp.left === parent) || (gp.type === 'UpdateExpression' && gp.argument === parent) || (gp.type === 'UnaryExpression' && gp.operator === 'delete' && gp.argument === parent))) {
                writes.push(p)
            }
            else if (isTestContext(parent, gp)) {
                guarded[p] = true
            }
            return false
        }
        if (isTestContext(node, parent)) {
            bare.push({ kind: 'safe' })
        }
        else if (parent && parent.type === 'VariableDeclarator' && parent.init === node && parent.id.type === 'ObjectPattern') {
            let props = parent.id.properties.map((p) => {
                if (p.type === 'RestElement') {
                    return '...'
                }
                if (!p.computed && p.key.type === 'Identifier') {
                    return p.key.name
                }
                if (p.key.type === 'Literal' && typeof p.key.value === 'string') {
                    return p.key.value
                }
                return '[computed]'
            })
            bare.push({ kind: 'destructure', props })
        }
        else {
            bare.push({ kind: 'unsafe' })
        }
        return false
    })
    return { guarded, bare, writes }
}


//getStubRefs, 模組內commonjsRequire(樁)之參照分類: guardedCalls(try區塊內之呼叫, 呼叫失敗被接住)、bad(未受守衛之呼叫與非呼叫之參照; typeof只判斷不計)
function getStubRefs(ast) {
    let local = null
    for (let st of ast.body) {
        if (st.type === 'ImportDeclaration' && st.source.value === cjsDynamicModulesId) {
            for (let sp of st.specifiers) {
                if (sp.type === 'ImportSpecifier' && sp.imported.name === cjsRequireStub) {
                    local = sp.local.name
                }
            }
        }
    }
    let r = { guardedCalls: 0, bad: 0 }
    if (!local) {
        return r
    }
    walkAst(ast, (node, parents) => {
        if (node.type === 'ImportDeclaration') {
            return false
        }
        if (node.type !== 'Identifier' || node.name !== local) {
            return true
        }
        let parent = parents[parents.length - 1]
        if (parent && parent.type === 'MemberExpression' && parent.property === node && !parent.computed) {
            return true
        }
        if (parent && (parent.type === 'Property' && parent.key === node && !parent.computed)) {
            return true
        }
        if (parent && parent.type === 'UnaryExpression' && parent.operator === 'typeof') {
            return true
        }
        if (parent && parent.type === 'CallExpression' && parent.callee === node && inTryBlock(parent, parents)) {
            r.guardedCalls++
            return true
        }
        r.bad++
        return true
    })
    return r
}


//getDynImportSites, 模組內以字面值source動態import()之各處是否受守衛(try區塊內、.catch或.then(ok, onRejected))
function getDynImportSites(ast, source) {
    let sites = []
    walkAst(ast, (node, parents) => {
        if (node.type !== 'ImportExpression') {
            return true
        }
        let s = node.source
        let v = s.type === 'Literal' ? s.value : (s.type === 'TemplateLiteral' && s.expressions.length === 0 ? s.quasis[0].value.cooked : null)
        if (v !== source) {
            return true
        }
        let p1 = parents[parents.length - 1]
        let p2 = parents[parents.length - 2]
        let byPromise = p1 && p1.type === 'MemberExpression' && p1.object === node && !p1.computed && p2 && p2.type === 'CallExpression' && p2.callee === p1 &&
            (p1.property.name === 'catch' || (p1.property.name === 'then' && p2.arguments.length >= 2))
        sites.push(inTryBlock(node, parents) || byPromise)
        return true
    })
    return sites
}


//findShimRanges, 輸出中之url墊片範圍: 以pathToFileURL(__filename)之呼叫為錨點, 其外為`.href`再外為墊片之條件運算式(含typeof location之判斷與location.href分支, 見rollup之importMetaMechanisms)
function findShimRanges(ast) {
    let ranges = []
    walkAst(ast, (node, parents) => {
        if (node.type === 'CallExpression' &&
            node.callee && node.callee.type === 'MemberExpression' && !node.callee.computed && node.callee.property.name === 'pathToFileURL' &&
            node.arguments.length > 0 && node.arguments[0].type === 'Identifier' && node.arguments[0].name === '__filename') {
            let top = node
            let p1 = parents[parents.length - 1]
            let p2 = parents[parents.length - 2]
            if (p1 && p1.type === 'MemberExpression' && p1.object === node && p2 && p2.type === 'ConditionalExpression' && p2.consequent === p1) {
                top = p2
            }
            ranges.push([top.start, top.end])
        }
        return true
    })
    return ranges
}

function parseScript(code) {
    return acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', ranges: true, locations: true, allowReturnOutsideFunction: true, allowHashBang: true })
}

function analyzeScope(ast) {
    //fallback: 遇eslint-scope不認得之新語法節點時逐鍵走訪, 不因分析器版本而使合法建置失敗
    //ignoreEval: 本檢查為純語彙之同名綁定判定, 直接eval使作用域成為動態時仍須查到語彙宣告(否則漏擋)
    return eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script', fallback: 'iteration', ignoreEval: true })
}


//guardedByTypeofRequire, node是否位於以typeof require為條件之分支內(條件式之consequent/alternate、if之分支、&&或||之右運算元; 不跨函數邊界)
function guardedByTypeofRequire(node, parents, code) {
    let hasTypeof = (n) => n && /typeof\s+require\b/.test(code.slice(n.start, n.end))
    for (let i = parents.length - 1; i >= 0; i--) {
        let p = parents[i]
        if (funTypes.includes(p.type)) {
            return false
        }
        let inside = (n) => n && node.start >= n.start && node.end <= n.end
        if ((p.type === 'ConditionalExpression' || p.type === 'IfStatement') && !inside(p.test) && hasTypeof(p.test)) {
            return true
        }
        if (p.type === 'LogicalExpression' && inside(p.right) && hasTypeof(p.left)) {
            return true
        }
    }
    return false
}


//findFreeRequires, cjs輸出中未宣告之require參照(瀏覽器worker內無require): 排除typeof判斷、以typeof require為條件之分支與try區塊內者, 回傳各參照之行號
function findFreeRequires(code) {
    if (code.indexOf('require') < 0) {
        return []
    }
    let ast = parseScript(code)
    let sm = analyzeScope(ast)
    let free = new Set()
    for (let ref of sm.globalScope.through) {
        if (ref.identifier.name === 'require') {
            free.add(ref.identifier.range[0])
        }
    }
    let lines = []
    walkAst(ast, (node, parents) => {
        if (node.type === 'Identifier' && node.name === 'require' && free.has(node.start)) {
            let parent = parents[parents.length - 1]
            if (!(parent && parent.type === 'UnaryExpression' && parent.operator === 'typeof') && !inTryBlock(node, parents) && !guardedByTypeofRequire(node, parents, code)) {
                lines.push(node.loc.start.line)
            }
        }
        return true
    })
    return lines
}


//genBuildCheck, 供rollupFileCore: 回傳{ onwarn, plugin }, onwarn記錄rollup之UNRESOLVED_IMPORT(照常輸出警告), plugin(須置於terser之前)於renderChunk依產物判定, 不通過即this.error(RollupError)
//  cfg: { external(呼叫端明列之external陣列), runin, bNodePolyfill, workerInner(rollupWorkerCore之inner: 'nodejs'或'browser', 一般建置為null) }
function genBuildCheck(cfg = {}) {
    let unresolved = new Map() //source -> Set(importer)
    let survivors = {} //module id -> Set(存活之屬性名, 裸用為'(bare)')
    let stubUsers = {} //module id -> getStubRefs

    let onwarn = (warning, warn) => {
        if (warning.code === 'UNRESOLVED_IMPORT' && typeof warning.exporter === 'string') {
            if (!unresolved.has(warning.exporter)) {
                unresolved.set(warning.exporter, new Set())
            }
            unresolved.get(warning.exporter).add(warning.id)
        }
        warn(warning)
    }

    let plugin = {
        name: 'wpt-build-check',
        moduleParsed(info) {
            if (info.ast && info.importedIds.includes(cjsDynamicModulesId)) {
                stubUsers[info.id] = getStubRefs(info.ast)
            }
        },
        resolveImportMeta(prop, { moduleId }) {
            //rollup只對tree-shaking後存活之import.meta呼叫此掛鉤(帶屬性名, 裸用或非常值之計算屬性為null), 故死碼內之取用不誤擋; 回傳null交還rollup之預設墊片
            if (!survivors[moduleId]) {
                survivors[moduleId] = new Set()
            }
            survivors[moduleId].add(prop === null ? '(bare)' : prop)
            return null
        },
        renderChunk(code, chunk, outputOptions) {
            let fmt = outputOptions.format
            let rendered = (id) => chunk.modules[id] && chunk.modules[id].renderedLength > 0
            let staticIds = new Set(chunk.imports)
            let ids = new Set([...chunk.imports, ...chunk.dynamicImports])
            let fail = (code, message) => {
                this.error({ code, message: `[w-package-tools] ${message}` })
            }

            //R16③: rollupWorkerCore之瀏覽器inner, worker內無require: 不得引用任何外部模組(含Node內建模組與列於external者), 亦不得有未受守衛之free require
            //  於import.meta之檢查之後執行(inner使用import.meta.url時其墊片含require, 須先以R17③之訊息回報)
            let checkBrowserInner = () => {
                if (cfg.workerInner !== 'browser') {
                    return
                }
                if (ids.size > 0) {
                    fail('WPT_WORKER_EXTERNAL', `inner of runin[browser] worker can not import external modules (a browser worker has no require): ${[...ids].join(', ')}`)
                }
                let lns = []
                try {
                    lns = findFreeRequires(code)
                }
                catch (err) {
                    fail('WPT_CHECK_PARSE', `can not analyze the inner of runin[browser] worker: ${err.message}`)
                }
                if (lns.length > 0) {
                    fail('WPT_WORKER_EXTERNAL', `inner of runin[browser] worker uses require (a browser worker has no require) at inner output line(s) ${lns.join(', ')}`)
                }
            }

            //R16①: 產物仍引用之無法解析裸引用(被tree-shaking移除者不擋), Node內建模組除外; 只以動態import()引用且各處皆受守衛(選用相依)者只警告
            for (let [source, importers] of unresolved) {
                if (!ids.has(source) || isNodeBuiltin(source)) {
                    continue
                }
                let guarded = false
                if (!staticIds.has(source)) {
                    let sites = []
                    for (let imp of importers) {
                        let info = this.getModuleInfo(imp)
                        if (info && info.ast) {
                            sites.push(...getDynImportSites(info.ast, source))
                        }
                    }
                    guarded = sites.length > 0 && sites.every((b) => b)
                }
                let where = [...importers].map(relId).join(', ')
                if (guarded) {
                    this.warn({ code: 'WPT_UNRESOLVED_OPTIONAL', message: `[w-package-tools] "${source}" (imported by ${where}) can not be resolved; it is only imported by guarded dynamic import() (optional dependency) and is kept as external` })
                    continue
                }
                fail('UNRESOLVED_IMPORT', `"${source}" is imported by ${where}, but could not be resolved, so the product fails at runtime; if it is provided by the consumer at runtime, list it in opt.external (full id, or a RegExp for subpaths)`)
            }

            //R16①之例外: 產物不可能取得Node內建模組者(iife以全域識別子傳入external; 瀏覽器且bNodePolyfill時polyfill未涵蓋者成為瀏覽器內之require)不豁免, 明列於external者除外
            if (fmt === 'iife' || (cfg.runin === 'browser' && cfg.bNodePolyfill === true)) {
                let bad = [...ids].filter((id) => isNodeBuiltin(id) && !isListedExternal(id, cfg.external))
                if (bad.length > 0) {
                    fail('WPT_BUILTIN_UNAVAILABLE', `Node built-in module(s) ${bad.join(', ')} can not be obtained by a ${fmt === 'iife' ? 'format[iife]' : 'runin[browser] with bNodePolyfill'} product; list them in opt.external explicitly if they are provided at runtime`)
                }
            }

            //R16②: commonjs動態require樁(呼叫即拋Could not dynamically require), 須樁在產物內; try區塊內之呼叫只警告(失敗被接住), typeof只判斷不計
            if (rendered(cjsDynamicModulesId)) {
                let bad = []
                let soft = []
                for (let [id, r] of Object.entries(stubUsers)) {
                    if (!rendered(id)) {
                        continue
                    }
                    if (r.bad > 0) {
                        bad.push(id)
                    }
                    else if (r.guardedCalls > 0) {
                        soft.push(id)
                    }
                }
                if (bad.length > 0) {
                    fail('WPT_DYNAMIC_REQUIRE', `require() with a non-literal argument (or a non-call reference to require) is replaced by @rollup/plugin-commonjs with a stub that always throws "Could not dynamically require", in module(s): ${bad.map(relId).join(', ')}; use a literal require, obtain require via createRequire of the Node 'module' builtin, or list the containing package in opt.external`)
                }
                if (soft.length > 0) {
                    this.warn({ code: 'WPT_DYNAMIC_REQUIRE_GUARDED', message: `[w-package-tools] require() with a non-literal argument inside try is replaced by a stub that always throws (the catch branch always runs), in module(s): ${soft.map(relId).join(', ')}` })
                }
            }

            //R17: import.meta(只看存活者); es與system原樣保留import.meta, 不檢查
            let used = Object.keys(survivors).filter(rendered)
            if (used.length === 0 || ((fmt === 'es' || fmt === 'system') && !cfg.workerInner)) {
                checkBrowserInner()
                return null
            }
            let bUrl = false
            for (let id of used) {
                let props = [...survivors[id]]
                let info = this.getModuleInfo(id)
                let mu = info && info.ast ? getMetaUses(info.ast) : { guarded: {}, bare: [], writes: [] }
                let bad = props.filter((p) => p !== metaUrl && p !== '(bare)' && !mu.guarded[p])
                bad.push(...mu.writes.filter((p) => props.includes(p)).map((p) => `${p}(write)`))
                let mUrl = props.includes(metaUrl) //本模組是否取得url(含經別名、解構)
                if (props.includes('(bare)')) {
                    for (let b of mu.bare) {
                        if (b.kind === 'unsafe') {
                            bad.push('(alias or other non-literal access)')
                            mUrl = true
                        }
                        else if (b.kind === 'destructure') {
                            bad.push(...b.props.filter((p) => p !== metaUrl).map((p) => `{ ${p} }`))
                            if (b.props.includes(metaUrl)) {
                                mUrl = true
                            }
                        }
                    }
                }
                bUrl = bUrl || mUrl
                bad = [...new Set(bad)]
                if (bad.length > 0) {
                    fail('WPT_IMPORT_META_PROP', `module[${relId(id)}] uses import.meta ${bad.join(', ')} without a guard, which rollup replaces with undefined (only url is emulated) in format[${fmt}]; use fileURLToPath(import.meta.url) or createRequire(import.meta.url).resolve(), guard it (typeof, ??, ?.), or build with format es`)
                }
                //R17③: worker之inner以eval(nodejs)或blob(browser)執行而無模組位置, url於nodejs為以cwd組成之錯值、於browser為require未定義
                if (cfg.workerInner && mUrl) {
                    fail('WPT_WORKER_IMPORT_META', `module[${relId(id)}] uses import.meta.url inside worker, which is unavailable: the inner runs from eval(nodejs) or blob(browser) without a module URL`)
                }
            }

            checkBrowserInner()

            //R17②: umd/cjs之url墊片劫持
            let names = shimNames[fmt]
            if (!names || !bUrl) {
                return null
            }
            let ast = null
            let sm = null
            try {
                ast = parseScript(code)
                sm = analyzeScope(ast)
            }
            catch (err) {
                fail('WPT_CHECK_PARSE', `can not analyze the output for the import.meta.url shim: ${err.message}`)
            }
            let ranges = findShimRanges(ast)
            if (ranges.length === 0) {
                //fail-closed: rollup改版使墊片結構不同時不可靜默略過
                fail('WPT_IMPORT_META_SHIM_UNKNOWN', `import.meta.url is used in format[${fmt}] but its shim (pathToFileURL(__filename)) is not found in the output; this rollup version is not supported by the check`)
            }
            let hits = []
            for (let sc of sm.scopes) {
                for (let ref of sc.references) {
                    let nm = ref.identifier.name
                    if (!names.includes(nm) || !ref.resolved) {
                        continue
                    }
                    let st = ref.identifier.range[0]
                    if (!ranges.some(([a, b]) => st >= a && st < b)) {
                        continue
                    }
                    let d = ref.resolved.defs[0]
                    let ln = d && d.name && d.name.loc ? d.name.loc.start.line : '?'
                    hits.push(`${nm}(${d ? d.type : '?'} at output line ${ln})`)
                }
            }
            if (hits.length > 0) {
                fail('WPT_IMPORT_META_SHIM', `import.meta.url in format[${fmt}] is emulated by a shim that references ${names.join('/')}, but the bundle declares ${[...new Set(hits)].join(', ')}, so the shim binds to that declaration (TDZ or wrong value at runtime); rename the declaration in the sources (including bundled dependencies)`)
            }
            return null
        },
    }

    return { onwarn, plugin }
}


//sleepSync, 同步等待(清空之重試須維持同步, 呼叫端cleanFolder為同步API)
function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}


//cleanFolderStrict, 清空資料夾(不存在則建立): 非success即拋錯
//  拒絕: 非字串或空字串、根目錄、cwd與其上層(如由錯誤之路徑算出'/'時不得清空整個磁碟)、目標本身為連結
//  重試: EBUSY、EPERM(Windows下被占用之資料夾)、ENOTEMPTY、ENOENT(並發清空同一資料夾時項目已被他方刪除); Node之fs.rmSync之maxRetries於Windows對EPERM不生效(v24.19.0實測), 故自寫迴圈
//  錯誤: 一律為帶WPT_CLEAN_FOLDER碼之Error(含前置lstat檢查失敗者), 訊息以已知之絕對路徑、code、syscall與嘗試次數組成, 不引用Node fs錯誤之message與path(Windows下路徑含非ASCII時為亂碼), cause為原錯誤(帳本R19④)
//  比較: 根目錄、cwd與其上層之比較於win32不分大小寫(檔案系統不分大小寫, 如磁碟機代號c:與C:, 字串相等不等於同一目錄)
function cleanFolderStrict(w, fd, opt = {}) {
    let retries = opt.retries === undefined ? 10 : opt.retries
    let delay = opt.delay === undefined ? 300 : opt.delay
    let valid = typeof fd === 'string' && fd.trim() !== ''
    let showFd = () => {
        try {
            return String(fd)
        }
        catch (err) {
            return Object.prototype.toString.call(fd) //無原型物件等無法轉字串者
        }
    }
    let abs = valid ? path.resolve(fd) : showFd()
    let fail = (msg, cause) => {
        let err = wptError('WPT_CLEAN_FOLDER', `can not clean folder[${abs}]: ${msg}`)
        if (cause !== undefined) {
            err.cause = cause
        }
        return err
    }

    //describe, Error之原因文字: 有code者以code與syscall(與嘗試次數)組成, 不引用message; 無code者(非fs錯誤, 如wsemi內部之TypeError)其message不含fs路徑亂碼, 保留之
    let describe = (e, n) => {
        let at = n > 0 ? ` attempts[${n}]` : ''
        if (e.code) {
            return `code[${e.code}]${e.syscall ? ` syscall[${e.syscall}]` : ''}${at}`
        }
        return `${e.name}: ${e.message}${at}`
    }
    if (!valid) {
        throw fail('path must be a non-empty string')
    }
    let norm = (p) => (process.platform === 'win32' ? p.toLowerCase() : p)
    let nAbs = norm(abs)
    let nCwd = norm(process.cwd())
    if (nAbs === norm(path.parse(abs).root) || nAbs === nCwd || nCwd.startsWith(nAbs.endsWith(path.sep) ? nAbs : nAbs + path.sep)) {
        throw fail(`refuse to clean the filesystem root, the current working directory or its ancestor (${abs})`)
    }
    let st = null
    try {
        st = fs.lstatSync(abs)
    }
    catch (err) {
        if (err.code !== 'ENOENT') {
            throw fail(describe(err, 0), err) //如POSIX下上層為檔案之ENOTDIR、權限不足、路徑含NUL: 亦為帶碼Error, 不原樣拋出原始fs錯誤
        }
    }
    if (st && st.isSymbolicLink()) {
        throw fail('target is a symbolic link or junction, not a folder')
    }
    let last = null
    let attempts = 0
    for (let i = 0; i <= retries; i++) {
        if (i > 0) {
            sleepSync(delay)
        }
        attempts++
        let r
        try {
            r = w.fsCleanFolder(fd)
        }
        catch (err) {
            r = err //wsemip 1.9.16之清空前檢查(lstat等)失敗會直接拋出, 1.9.17起改回傳{ error }(不可達); 兩種形狀同等判定是否重試, 此分支刻意保留
        }
        if (r && !(r instanceof Error) && r.success !== undefined) {
            return r
        }
        last = r instanceof Error ? r : (r && r.error)
        let code = last && last.code
        if (code !== 'EBUSY' && code !== 'EPERM' && code !== 'ENOTEMPTY' && code !== 'ENOENT') {
            break
        }
    }
    throw fail(last instanceof Error ? describe(last, attempts) : String(last), last) //wsemip以字串回報者(如input path is not a folder)為wsemi自撰文字, 無路徑
}


export { isNodeBuiltin, isListedExternal, findFreeRequires, genBuildCheck, cleanFolderStrict }
