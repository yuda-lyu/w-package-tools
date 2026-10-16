import path from 'path'
import fs from 'fs'
import assert from 'assert'
import { createRequire } from 'module'
import { pathToFileURL } from 'url'
import rollupFile from '../src/rollupFile.mjs'
import rollupFiles from '../src/rollupFiles.mjs'
import rollupCode from '../src/rollupCode.mjs'
import rollupWorkerCore from '../src/rollupWorkerCore.mjs'
import rollupWorker from '../src/rollupWorker.mjs'


//run: 執行並攔截其間之console輸出(rollup之警告、建置log), 回傳settle結果與輸出
let run = async (fn) => {
    let logs = []
    let ori = { log: console.log, warn: console.warn, error: console.error }
    let push = (...args) => {
        logs.push(args.map((a) => (typeof a === 'string' ? a : String((a && a.message) || a))).join(' '))
    }
    console.log = push
    console.warn = push
    console.error = push
    let res
    try {
        res = await fn().then((v) => ({ state: 'resolve', v }), (e) => ({ state: 'reject', e }))
    }
    finally {
        Object.assign(console, ori)
    }
    return { res, logs }
}

let msgOf = (e) => String((e && e.message) || e)
let codeOf = (e) => (e && (e.pluginCode || e.code)) || ''

let req = createRequire(import.meta.url)

let fdTmp = './test/_tmp/buildCheck'
let fdSrc = `${fdTmp}/src`
let fdOut = `${fdTmp}/out`

//H: 引用path與url之共同開頭(皆列external)
let H = `import path from 'path'\nimport { fileURLToPath } from 'url'\n`

let fx = {
    //R16 引用
    bareMissingPkg: `import nx from 'no-such-pkg-zz9'\nexport default function where() { return typeof nx }\n`,
    bareMissingSub: `import nx from 'lodash-es/notExistAbc.mjs'\nexport default function where() { return typeof nx }\n`,
    bareDynamic: `export default async function where() { let m = await import('no-such-pkg-zz9'); return typeof m }\n`,
    builtins: `import fs from 'fs'\nimport fs2 from 'node:fs'\nimport { pipeline } from 'stream/promises'\nexport default function where() { return [typeof fs.readFileSync, typeof fs2.readFileSync, typeof pipeline].join(',') }\n`,
    bareExternal: `import nx from 'no-such-pkg-zz9'\nexport default function where() { return typeof nx }\n`,
    wkBuiltin: `import fs from 'fs'\nexport default async function where() { return typeof fs.readFileSync }\n`,
    wkExternal: `import get from 'lodash-es/get.js'\nexport default async function where() { return typeof get }\n`,
    dynRequire: `import load from './dynReqLib.js'\nexport default function where() { return load('./lit.js') }\n`,
    litRequire: `import load from './litReqLib.js'\nexport default function where() { return load() }\n`,
    //R17 墊片劫持(umd)
    tdzLet: H + `let __filename = fileURLToPath(import.meta.url)\nexport default function where() { return path.dirname(__filename) }\n`,
    tdzConst: H + `const __filename = fileURLToPath(import.meta.url)\nexport default function where() { return path.dirname(__filename) }\n`,
    tdzVar: H + `var __filename = fileURLToPath(import.meta.url)\nexport default function where() { return path.dirname(__filename) }\n`,
    tdzExportLet: H + `export let __filename = fileURLToPath(import.meta.url)\nexport default function where() { return path.dirname(__filename) }\n`,
    tdzComma: H + `let a = 1, __filename = fileURLToPath(import.meta.url)\nexport default function where() { return a + path.dirname(__filename) }\n`,
    tdzDestr: H + `const { __filename } = { __filename: fileURLToPath(import.meta.url) }\nexport default function where() { return path.dirname(__filename) }\n`,
    tdzFunc: H + `function __filename() { return 'fn' }\nlet u = fileURLToPath(import.meta.url)\nexport default function where() { return path.dirname(u) + __filename() }\n`,
    tdzClass: H + `class __filename {}\nlet u = fileURLToPath(import.meta.url)\nexport default function where() { return path.dirname(u) + typeof __filename }\n`,
    tdzImport: H + `import __filename from './fnDefault.mjs'\nlet u = fileURLToPath(import.meta.url)\nexport default function where() { return path.dirname(u) + __filename }\n`,
    tdzLocation: H + `let location = fileURLToPath(import.meta.url)\nexport default function where() { return path.dirname(location) }\n`,
    crossAB: `import { a } from './crossA.mjs'\nimport { b } from './crossB.mjs'\nexport default function where() { return a() + '|' + b() }\n`,
    crossBA: `import { b } from './crossB.mjs'\nimport { a } from './crossA.mjs'\nexport default function where() { return a() + '|' + b() }\n`,
    crossLate: `import { a } from './crossA.mjs'\nimport { bLate } from './crossBLate.mjs'\nexport default function where() { return a() + '|' + bLate() }\n`,
    //R17 墊片劫持(umd與cjs之函數內)
    localParam: H + `function g(__filename) { return fileURLToPath(import.meta.url) + __filename }\nexport default function where() { return g('x') }\n`,
    localLet: H + `export default function where() { let __filename = 'local'; return path.dirname(fileURLToPath(import.meta.url)) + __filename }\n`,
    //R17 對照(不得誤擋)
    okDirOnly: H + `let __dirname = path.dirname(fileURLToPath(import.meta.url))\nexport default function where() { return __dirname }\n`,
    okRenamed: H + `let fpSelf = fileURLToPath(import.meta.url)\nexport default function where() { return path.dirname(fpSelf) }\n`,
    okGlobals: H + `let document = 1\nlet URL = 2\nexport default function where() { return path.dirname(fileURLToPath(import.meta.url)) + '|' + (document + URL) }\n`,
    okUnusedDecl: H + `let __filename = 'unused'\nexport default function where() { return path.dirname(fileURLToPath(import.meta.url)) }\n`,
    //R17 屬性
    metaDirname: `export default function where() { return String(import.meta.dirname) }\n`,
    metaFilename: `export default function where() { return String(import.meta.filename) }\n`,
    metaResolve: `export default function where() { return import.meta.resolve('./x.mjs') }\n`,
    metaMain: `export default function where() { return String(import.meta.main) }\n`,
    metaBare: `export default function where() { let m = import.meta; return String(m.dirname) }\n`,
    metaDestr: `export default function where() { let { dirname } = import.meta; return String(dirname) }\n`,
    metaComputed: `let k = 'dirname'\nexport default function where() { return String(import.meta[k]) }\n`,
    metaEnv: `export default function where() { return String(import.meta.env.MODE) }\n`,
    metaGlob: `export default function where() { return import.meta.glob('./*.mjs') }\n`,
    metaEnvGuarded: `export default function where() { return String(import.meta.env?.MODE) }\n`,
    metaDirGuarded: H + `export default function where() { return import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url)) }\n`,
    metaDirTypeof: H + `export default function where() { return typeof import.meta.dirname === 'string' ? import.meta.dirname : path.dirname(fileURLToPath(import.meta.url)) }\n`,
    tdzCatchParam: H + `export default function where() { try { throw new Error('x') } catch (__filename) { return fileURLToPath(import.meta.url) } }\n`,
    okStaticBlock: H + `class K { static u = fileURLToPath(import.meta.url); static { let __filename = 1; this.v = __filename } }\nexport default function where() { return path.dirname(K.u) }\n`,
    sideEffectsFree: `import { a } from 'fakelib-se'\nexport default function where() { return a }\n`,
    dynTry: `export default async function where() { try { await import('no-such-pkg-zz9') } catch (e) { return 'fallback' } return 'loaded' }\n`,
    dynCatch: `export default function where() { return import('no-such-pkg-zz9').then(() => 'loaded', () => 'fallback') }\n`,
    bareSubpath: `import nx from 'no-such-zz8/sub'\nexport default function where() { return typeof nx }\n`,
    iifeFs: `import fs from 'fs'\nexport default function where() { return typeof fs }\n`,
    polyStreamPromises: `import { pipeline } from 'stream/promises'\nexport default function where() { return typeof pipeline }\n`,
    dynRequireTry: `import load from './dynReqTryLib.js'\nexport default function where() { return load('./lit.js') }\n`,
    typeofRequire: `import f from './typeofReqLib.js'\nexport default function where() { return f() }\n`,
    wkRawRequire: `export default async function where() { return typeof require('fs').readFileSync }\n`,
    wkRawRequireGuarded: `export default async function where() { let m = typeof require === 'function' ? require('fs') : null; return typeof m }\n`,
    metaTypeof: `export default function where() { return typeof import.meta !== 'undefined' ? import.meta.url : 'none' }\n`,
    metaAnd: `export default function where() { return import.meta && import.meta.url }\n`,
    metaDestrUrl: `export default function where() { let { url } = import.meta; return url }\n`,
    metaDead: `export default function where() { if (false) { return import.meta.dirname } return import.meta.url }\n`,
    bareNodeNo: `import x from 'node:nonexist-zz9'\nexport default function where() { return typeof x }\n`,
    //R17 worker inner
    wkMeta: `export default async function where() { return import.meta.url }\n`,
    wkMetaGuarded: `export default async function where() { return import.meta.hot ? 1 : 7 }\n`,
}
let libs = {
    'dynReqLib.js': `module.exports = function(n) { return typeof require(n) }\n`,
    'litReqLib.js': `module.exports = function() { return typeof require('./lit.js') }\n`,
    'lit.js': `module.exports = { lit: 1 }\n`,
    'fnDefault.mjs': `export default 'imp'\n`,
    'crossA.mjs': `export let __filename = 'A-decl'\nexport function a() { return __filename }\n`,
    'crossB.mjs': `export let bTop = import.meta.url\nexport function b() { return bTop }\n`,
    'crossBLate.mjs': `export function bLate() { return import.meta.url }\n`,
    'dynReqTryLib.js': `module.exports = function(n) { try { return typeof require(n) } catch (e) { return 'fallback' } }\n`,
    'typeofReqLib.js': `module.exports = function() { return typeof require === 'function' ? 'cjs' : 'none' }\n`,
}

//sideEffects:false之套件: 未被使用之子模組b.mjs引用不存在之套件(rollup於tree-shaking移除該子模組)
let pkgSe = {
    'package.json': JSON.stringify({ name: 'fakelib-se', version: '1.0.0', sideEffects: false, module: 'index.mjs', main: 'index.mjs' }),
    'index.mjs': `export { a } from './a.mjs'\nexport { b } from './b.mjs'\n`,
    'a.mjs': `export let a = 'A'\n`,
    'b.mjs': `import nx from 'no-such-zz6'\nexport let b = nx\n`,
}

//build: 以rollupFile建置fixture至fdOut/<id>/, 回傳{ res, logs, fp }(fp為預期之產物路徑)
let build = async (c, opt = {}) => {
    let format = opt.format || 'umd'
    let id = `${c}_${format}${opt.runin ? '_' + opt.runin : ''}${opt.bMinify ? '_min' : ''}` //產物名即umd、iife之全域名, 須為合法識別子
    let fdTar = `${fdOut}/${id}`
    fs.rmSync(fdTar, { recursive: true, force: true })
    let r = await run(() => rollupFile({
        fn: `${c}.mjs`,
        fdSrc,
        fdTar,
        hookNameDist: () => id,
        bMinify: false,
        bSourcemap: false,
        bLog: false,
        external: ['path', 'url'],
        globals: { path: 'path', url: 'url' },
        ...opt,
    }))
    r.fp = path.resolve(fdTar, `${id}.${format}.${format === 'es' ? 'mjs' : 'js'}`)
    return r
}

//prepFx, clearFx: 各describe各自備妥與清除fixture(單獨以--grep執行某describe亦可)
let prepFx = () => {
    fs.rmSync(fdTmp, { recursive: true, force: true })
    fs.mkdirSync(fdSrc, { recursive: true })
    for (let [k, v] of Object.entries(fx)) {
        fs.writeFileSync(`${fdSrc}/${k}.mjs`, v, 'utf8')
    }
    for (let [k, v] of Object.entries(libs)) {
        fs.writeFileSync(`${fdSrc}/${k}`, v, 'utf8')
    }
    fs.mkdirSync(`${fdTmp}/node_modules/fakelib-se`, { recursive: true })
    for (let [k, v] of Object.entries(pkgSe)) {
        fs.writeFileSync(`${fdTmp}/node_modules/fakelib-se/${k}`, v, 'utf8')
    }
}
let clearFx = () => {
    fs.rmSync(fdTmp, { recursive: true, force: true })
}

//loadWhere: 載入產物並呼叫其預設匯出
let loadWhere = async (fp, format) => {
    let m = format === 'es' ? (await import(pathToFileURL(fp).href)).default : req(fp)
    if (typeof m !== 'function') {
        m = m.default
    }
    return m()
}


describe('引用類: 無法解析之裸引用一律建置失敗(Node內建模組除外)、commonjs動態require樁、瀏覽器worker之inner不得引用外部模組(規則帳本R16)', function() {

    before(prepFx)

    after(clearFx)

    it('rollupFile: 裸名之套件不存在、子路徑不存在、動態import()皆reject(code為UNRESOLVED_IMPORT, 訊息含來源與opt.external指引), 不產出', async function() {
        for (let c of ['bareMissingPkg', 'bareMissingSub', 'bareDynamic', 'bareNodeNo']) {
            for (let opt of [{}, { format: 'es' }, { runin: 'nodejs' }]) {
                let { res, fp } = await build(c, opt)
                //R16①: 無法解析之裸引用(套件或子路徑不存在, 含動態import()與不存在之node:模組)一律建置失敗
                assert.strict.deepStrictEqual(res.state, 'reject', `${c} ${JSON.stringify(opt)}`)
                assert.strict.deepStrictEqual(codeOf(res.e), 'UNRESOLVED_IMPORT', `${c}: ${msgOf(res.e)}`)
                assert.strict.ok(/no-such-pkg-zz9|lodash-es\/notExistAbc\.mjs|node:nonexist-zz9/.test(msgOf(res.e)), msgOf(res.e))
                //R16①: 確為執行期由使用端提供之模組須列於opt.external(訊息須給出此指引)
                assert.strict.ok(msgOf(res.e).includes('opt.external'), msgOf(res.e))
                //R16①: 不通過即reject且不產出
                assert.strict.deepStrictEqual(fs.existsSync(fp), false)
            }
        }
    })

    it('rollupFiles、rollupCode、rollupWorkerCore(nodejs與browser)、rollupWorker: 同經rollupFileCore, 裸名不存在皆reject', async function() {
        let fpSrc = path.resolve(fdSrc, 'bareMissingPkg.mjs')
        let cases = [
            ['rollupFiles', () => rollupFiles({ fns: 'bareMissingPkg.mjs', fdSrc, fdTar: `${fdOut}/files`, bLog: false })],
            ['rollupCode', () => rollupCode(fs.readFileSync(fpSrc, 'utf8'), { name: 'bareMissingPkg', formatIn: 'mjs', bLog: false })],
            ['rollupWorkerCore nodejs', () => rollupWorkerCore({ name: 'bareMissingPkg', type: 'function', fpSrc, bReturnCode: true, runin: 'nodejs', bLog: false })],
            ['rollupWorkerCore browser', () => rollupWorkerCore({ name: 'bareMissingPkg', type: 'function', fpSrc, bReturnCode: true, runin: 'browser', bLog: false })],
            ['rollupWorker both', () => rollupWorker({ name: 'bareMissingPkg', type: 'function', fpSrc, fpTar: `${fdOut}/worker/bareMissingPkg.wk.umd.js`, formatOut: 'umd', runin: 'both', bLog: false })],
        ]
        for (let [k, fn] of cases) {
            let { res } = await run(fn)
            //R16①: 各產製入口皆經rollupFileCore, 一處生效
            assert.strict.deepStrictEqual(res.state, 'reject', k)
            assert.strict.ok(msgOf(res.e).includes('no-such-pkg-zz9'), `${k}: ${msgOf(res.e)}`)
        }
        assert.strict.deepStrictEqual(fs.existsSync(`${fdOut}/worker/bareMissingPkg.wk.umd.js`), false)
    })

    it('Node內建模組(fs、node:fs、stream/promises)未列external: runin browser與nodejs皆照常建置, 產物於Node可用', async function() {
        for (let opt of [{}, { runin: 'nodejs' }, { format: 'es' }]) {
            let { res, fp } = await build('builtins', opt)
            //R16①: Node內建模組(含node:前綴與子路徑)除外
            assert.strict.deepStrictEqual(res.state, 'resolve', `${JSON.stringify(opt)}: ${res.e && msgOf(res.e)}`)
            assert.strict.deepStrictEqual(await loadWhere(fp, opt.format), 'function,function,function')
        }
    })

    it('裸名列於opt.external: 照常建置且產物保留對該模組之引用', async function() {
        let { res, fp } = await build('bareExternal', { external: ['path', 'url', 'no-such-pkg-zz9'] })
        //R16①: 列於opt.external者視為執行期由使用端提供
        assert.strict.deepStrictEqual(res.state, 'resolve', res.e && msgOf(res.e))
        assert.strict.ok(/require\(['"]no-such-pkg-zz9['"]\)/.test(fs.readFileSync(fp, 'utf8')))
    })

    it('commonjs動態require樁: require(變數)reject(code為WPT_DYNAMIC_REQUIRE且指明模組), 字面require照常', async function() {
        let { res, fp } = await build('dynRequire')
        //R16②: 產物含commonjs動態require樁(呼叫即拋Could not dynamically require)即建置失敗, 訊息指明模組
        assert.strict.deepStrictEqual(res.state, 'reject')
        assert.strict.deepStrictEqual(codeOf(res.e), 'WPT_DYNAMIC_REQUIRE', msgOf(res.e))
        assert.strict.ok(msgOf(res.e).includes('dynReqLib.js'), msgOf(res.e))
        assert.strict.deepStrictEqual(fs.existsSync(fp), false)
        let r2 = await build('litRequire')
        //R16②之反面: 字面require由commonjs轉為import, 不產生樁
        assert.strict.deepStrictEqual(r2.res.state, 'resolve', r2.res.e && msgOf(r2.res.e))
        assert.strict.deepStrictEqual(await loadWhere(r2.fp), 'object')
    })

    it('以產物為準: tree-shaking移除之引用、受守衛之動態import()(選用相依)照常建置; external以RegExp涵蓋子路徑', async function() {
        let r1 = await build('sideEffectsFree')
        //R16①: 只擋仍留在產物中之引用(sideEffects:false套件未被使用之子模組被移除)
        assert.strict.deepStrictEqual(r1.res.state, 'resolve', r1.res.e && msgOf(r1.res.e))
        assert.strict.deepStrictEqual(await loadWhere(r1.fp), 'A')
        for (let c of ['dynTry', 'dynCatch']) {
            let { res, fp, logs } = await build(c)
            //R16①: 只以受守衛(try、.catch、.then第二參數)之動態import()引用者為選用相依, 只警告
            assert.strict.deepStrictEqual(res.state, 'resolve', `${c}: ${res.e && msgOf(res.e)}`)
            assert.strict.ok(logs.some((s) => s.includes('optional dependency')), `${c} logs: ${JSON.stringify(logs)}`)
            assert.strict.deepStrictEqual(await loadWhere(fp), 'fallback')
        }
        let r2 = await build('bareSubpath', { external: ['path', 'url', 'no-such-zz8'] })
        //R16①: external以全名比對, 列套件名不涵蓋子路徑
        assert.strict.deepStrictEqual(r2.res.state, 'reject')
        let r3 = await build('bareSubpath', { external: ['path', 'url', /^no-such-zz8(\/|$)/] })
        //R16①: external陣列元素可為RegExp以涵蓋子路徑
        assert.strict.deepStrictEqual(r3.res.state, 'resolve', r3.res.e && msgOf(r3.res.e))
    })

    it('產物不可能取得Node內建模組者(iife; runin browser且bNodePolyfill)不豁免: 未列external即reject, 明列者照常', async function() {
        let r1 = await build('iifeFs', { format: 'iife' })
        //R16①之例外: iife以全域識別子傳入external, Node內建模組必不可得
        assert.strict.deepStrictEqual(r1.res.state, 'reject')
        assert.strict.deepStrictEqual(codeOf(r1.res.e), 'WPT_BUILTIN_UNAVAILABLE', msgOf(r1.res.e))
        let r2 = await build('iifeFs', { format: 'iife', external: ['path', 'url', 'fs'], globals: { path: 'path', url: 'url', fs: 'fs' } })
        //明列於external者視為執行期由使用端提供(如w-batch以後處理注入)
        assert.strict.deepStrictEqual(r2.res.state, 'resolve', r2.res.e && msgOf(r2.res.e))
        let r3 = await build('polyStreamPromises', { bNodePolyfill: true })
        //R16①之例外: runin browser且bNodePolyfill時polyfill未涵蓋之內建模組成為瀏覽器內之require
        assert.strict.deepStrictEqual(r3.res.state, 'reject')
        assert.strict.deepStrictEqual(codeOf(r3.res.e), 'WPT_BUILTIN_UNAVAILABLE', msgOf(r3.res.e))
    })

    it('commonjs動態require樁: try區塊內之呼叫只警告(catch必走), typeof require只判斷者照常', async function() {
        let r1 = await build('dynRequireTry')
        //R16②: try區塊內之呼叫失敗被接住, 只警告
        assert.strict.deepStrictEqual(r1.res.state, 'resolve', r1.res.e && msgOf(r1.res.e))
        assert.strict.ok(r1.logs.some((s) => s.includes('inside try')), JSON.stringify(r1.logs))
        let r2 = await build('typeofRequire')
        //R16②: typeof require只判斷不呼叫樁
        assert.strict.deepStrictEqual(r2.res.state, 'resolve', r2.res.e && msgOf(r2.res.e))
    })

    it('rollupWorkerCore: runin browser之inner有未受守衛之free require即reject; 以typeof require守衛者照常', async function() {
        let fpSrc = path.resolve(fdSrc, 'wkRawRequire.mjs')
        let fpTar = path.resolve(fdOut, 'wk-raw-browser.wk.umd.js')
        let { res } = await run(() => rollupWorkerCore({ name: 'wkRawRequire', type: 'function', fpSrc, fpTar, formatOut: 'umd', runin: 'browser', bLog: false }))
        //R16③: ESM原始碼直寫之require不經commonjs而原樣保留, 瀏覽器worker內載入即require is not defined
        assert.strict.deepStrictEqual(res.state, 'reject')
        assert.strict.deepStrictEqual(codeOf(res.e), 'WPT_WORKER_EXTERNAL', msgOf(res.e))
        assert.strict.ok(msgOf(res.e).includes('uses require'), msgOf(res.e))
        assert.strict.deepStrictEqual(fs.existsSync(fpTar), false)
        let fpSrc2 = path.resolve(fdSrc, 'wkRawRequireGuarded.mjs')
        let r2 = await run(() => rollupWorkerCore({ name: 'wkRawRequireGuarded', type: 'function', fpSrc: fpSrc2, fpTar: path.resolve(fdOut, 'wk-rawg-browser.wk.umd.js'), formatOut: 'umd', runin: 'browser', bLog: false }))
        //R16③之反面: 以typeof require為條件之分支在瀏覽器不執行
        assert.strict.deepStrictEqual(r2.res.state, 'resolve', r2.res.e && msgOf(r2.res.e))
    })

    it('rollupWorkerCore: runin browser之inner引用Node內建模組或external即reject且不產出; runin nodejs照常', async function() {
        for (let [c, external] of [['wkBuiltin', []], ['wkExternal', ['lodash-es/get.js']]]) {
            let fpSrc = path.resolve(fdSrc, `${c}.mjs`)
            let fpTar = path.resolve(fdOut, `wk-${c}-browser.wk.umd.js`)
            let { res } = await run(() => rollupWorkerCore({ name: c, type: 'function', fpSrc, fpTar, formatOut: 'umd', runin: 'browser', external, bLog: false }))
            //R16③: 瀏覽器worker內無require, inner不得引用外部模組(含Node內建模組與列於external者)
            assert.strict.deepStrictEqual(res.state, 'reject', c)
            assert.strict.ok(msgOf(res.e).includes('runin[browser]'), msgOf(res.e))
            assert.strict.deepStrictEqual(fs.existsSync(fpTar), false)
            let fpTarN = path.resolve(fdOut, `wk-${c}-nodejs.wk.umd.js`)
            let r2 = await run(() => rollupWorkerCore({ name: c, type: 'function', fpSrc, fpTar: fpTarN, formatOut: 'umd', runin: 'nodejs', external, bLog: false }))
            //R16③之反面: nodejs之inner以worker內之require取得外部模組
            assert.strict.deepStrictEqual(r2.res.state, 'resolve', r2.res.e && msgOf(r2.res.e))
        }
    })

})


describe('import.meta類: 墊片不被劫持、url以外屬性與worker inner使用即建置失敗(規則帳本R17)', function() {

    before(prepFx)

    after(clearFx)

    it('umd: 頂層以各宣告形式宣告__filename(let、const、var、function、class、export let、逗號串列、解構、import綁定)或location即reject且不產出', async function() {
        for (let c of ['tdzLet', 'tdzConst', 'tdzVar', 'tdzFunc', 'tdzClass', 'tdzExportLet', 'tdzComma', 'tdzDestr', 'tdzImport', 'tdzLocation']) {
            let { res, fp } = await build(c)
            //R17②: umd之墊片引用__filename、location, 產物內同名宣告使墊片綁到該宣告, 建置即失敗
            assert.strict.deepStrictEqual(res.state, 'reject', c)
            assert.strict.deepStrictEqual(codeOf(res.e), 'WPT_IMPORT_META_SHIM', `${c}: ${msgOf(res.e)}`)
            assert.strict.ok(msgOf(res.e).includes(c === 'tdzLocation' ? 'location' : '__filename'), msgOf(res.e))
            assert.strict.deepStrictEqual(fs.existsSync(fp), false, c)
        }
        let { res } = await build('tdzLet', { bMinify: true })
        //R17②: 壓縮時亦同(檢查於terser之前)
        assert.strict.deepStrictEqual(res.state, 'reject')
    })

    it('umd: 跨模組(宣告與使用在不同模組, 兩種引入順序與延後使用)即reject', async function() {
        for (let c of ['crossAB', 'crossBA', 'crossLate']) {
            let { res } = await build(c)
            //R17②: 以bundle為單位(同名宣告在任一模組)
            assert.strict.deepStrictEqual(res.state, 'reject', c)
            assert.strict.deepStrictEqual(codeOf(res.e), 'WPT_IMPORT_META_SHIM', `${c}: ${msgOf(res.e)}`)
        }
    })

    it('umd與cjs: 使用import.meta.url之函數內以參數或區域宣告__filename即reject', async function() {
        for (let c of ['localParam', 'localLet']) {
            for (let format of ['umd', 'cjs']) {
                let { res } = await build(c, { format })
                //R17②: cjs之頂層由rollup避讓, 函數內不避讓
                assert.strict.deepStrictEqual(res.state, 'reject', `${c} ${format}`)
                assert.strict.deepStrictEqual(codeOf(res.e), 'WPT_IMPORT_META_SHIM', `${c} ${format}: ${msgOf(res.e)}`)
            }
        }
    })

    it('umd與cjs: 使用import.meta.url處之catch參數名為__filename即reject', async function() {
        for (let format of ['umd', 'cjs']) {
            let { res } = await build('tdzCatchParam', { format })
            //R17②: catch參數亦為宣告, 墊片綁到該參數
            assert.strict.deepStrictEqual(res.state, 'reject', format)
            assert.strict.deepStrictEqual(codeOf(res.e), 'WPT_IMPORT_META_SHIM', `${format}: ${msgOf(res.e)}`)
        }
    })

    it('對照: cjs之頂層宣告、只宣告__dirname、改名、宣告document與URL、未被使用之宣告、class static block內之同名宣告照常建置, 產物取得之位置為產物所在資料夾', async function() {
        let cases = [['tdzLet', 'cjs'], ['okDirOnly', 'umd'], ['okRenamed', 'umd'], ['okGlobals', 'umd'], ['okUnusedDecl', 'umd'], ['okDirOnly', 'cjs'], ['okStaticBlock', 'umd'], ['okStaticBlock', 'cjs']]
        for (let [c, format] of cases) {
            let { res, fp } = await build(c, { format })
            //R17②之反面: 墊片未被劫持者不得誤擋
            assert.strict.deepStrictEqual(res.state, 'resolve', `${c} ${format}: ${res.e && msgOf(res.e)}`)
            //R17(文件化): umd/cjs之import.meta.url為產物檔之URL, 端到端取得產物所在資料夾
            let v = await loadWhere(fp, format)
            assert.strict.ok(String(v).startsWith(path.dirname(fp)), `${c} ${format}: ${v}`)
        }
    })

    it('非es格式: 未受守衛之import.meta之dirname、filename、resolve、main、env、glob, 與別名、解構取出url以外屬性、計算屬性即reject; es照常且得原生值', async function() {
        let cs = ['metaDirname', 'metaFilename', 'metaResolve', 'metaMain', 'metaBare', 'metaDestr', 'metaComputed', 'metaEnv', 'metaGlob']
        for (let c of cs) {
            for (let format of ['umd', 'cjs', 'iife']) {
                let { res, fp } = await build(c, { format })
                //R17①: 非es格式時url以外之Node定義屬性(含裸import.meta與計算屬性)會被換成undefined, 建置即失敗
                assert.strict.deepStrictEqual(res.state, 'reject', `${c} ${format}`)
                assert.strict.deepStrictEqual(codeOf(res.e), 'WPT_IMPORT_META_PROP', `${c} ${format}: ${msgOf(res.e)}`)
                assert.strict.deepStrictEqual(fs.existsSync(fp), false)
            }
        }
        let { res, fp } = await build('metaDirname', { format: 'es' })
        //R17①: es格式原樣保留
        assert.strict.deepStrictEqual(res.state, 'resolve', res.e && msgOf(res.e))
        assert.strict.deepStrictEqual(await loadWhere(fp, 'es'), path.dirname(fp))
    })

    it('非es格式之守衛: url以外屬性以??、typeof、可選鏈守衛者照常建置, 產物走退路而得正確值', async function() {
        for (let format of ['umd', 'cjs']) {
            for (let c of ['metaDirGuarded', 'metaDirTypeof']) {
                let { res, fp } = await build(c, { format })
                //R17①: 受守衛之取用(undefined時走退路)產物正確, 不擋
                assert.strict.deepStrictEqual(res.state, 'resolve', `${c} ${format}: ${res.e && msgOf(res.e)}`)
                assert.strict.deepStrictEqual(await loadWhere(fp, format), path.dirname(fp), `${c} ${format}`)
            }
            let { res, fp } = await build('metaEnvGuarded', { format })
            assert.strict.deepStrictEqual(res.state, 'resolve', res.e && msgOf(res.e))
            assert.strict.deepStrictEqual(await loadWhere(fp, format), 'undefined')
        }
    })

    it('非es格式之對照: 只判斷存在(typeof、&&)、解構只取url、死碼內之url以外屬性照常建置且取得產物URL', async function() {
        for (let c of ['metaTypeof', 'metaAnd', 'metaDestrUrl', 'metaDead']) {
            for (let format of ['umd', 'cjs']) {
                let { res, fp } = await build(c, { format })
                //R17①之反面: 只判斷存在或只取url者產物正確; 檢查以tree-shaking後存活之取用為準
                assert.strict.deepStrictEqual(res.state, 'resolve', `${c} ${format}: ${res.e && msgOf(res.e)}`)
                assert.strict.deepStrictEqual(await loadWhere(fp, format), pathToFileURL(fp).href, `${c} ${format}`)
            }
        }
    })

    it('rollupWorkerCore: inner(nodejs與browser)使用import.meta即reject且不產出', async function() {
        let fpSrc = path.resolve(fdSrc, 'wkMeta.mjs')
        for (let runin of ['nodejs', 'browser']) {
            let fpTar = path.resolve(fdOut, `wk-meta-${runin}.wk.umd.js`)
            let { res } = await run(() => rollupWorkerCore({ name: 'wkMeta', type: 'function', fpSrc, fpTar, formatOut: 'umd', runin, bLog: false }))
            //R17③: inner以eval/blob執行而無模組位置, 使用import.meta.url即建置失敗
            assert.strict.deepStrictEqual(res.state, 'reject', runin)
            assert.strict.deepStrictEqual(codeOf(res.e), 'WPT_WORKER_IMPORT_META', msgOf(res.e))
            assert.strict.deepStrictEqual(fs.existsSync(fpTar), false)
            let r2 = await run(() => rollupWorkerCore({ name: 'wkMetaGuarded', type: 'function', fpSrc: path.resolve(fdSrc, 'wkMetaGuarded.mjs'), bReturnCode: true, runin, bLog: false }))
            //R17③之反面: 只判斷存在之守衛(import.meta.hot ? : )於inner走退路, 照常
            assert.strict.deepStrictEqual(r2.res.state, 'resolve', r2.res.e && msgOf(r2.res.e))
        }
    })

})


describe('runin之訊息只在給了非法值時印出', function() {

    it('rollupFile、rollupCode、rollupWorkerCore: 未給runin不印invalid runin; 給非法值才印', async function() {
        let fd = './test/_tmp/buildCheckRunin'
        fs.rmSync(fd, { recursive: true, force: true })
        fs.mkdirSync(fd, { recursive: true })
        fs.writeFileSync(`${fd}/ok.mjs`, `export default async function ok() { return 1 }\n`, 'utf8')
        let fpSrc = path.resolve(fd, 'ok.mjs')
        try {
            for (let runin of [undefined, 'xyz']) {
                let o = runin ? { runin } : {}
                let r1 = await run(() => rollupFile({ fn: 'ok.mjs', fdSrc: fd, bLog: false, ...o }))
                let r2 = await run(() => rollupCode(`export default 1\n`, { name: 'ok', bLog: false, ...o }))
                let r3 = await run(() => rollupWorkerCore({ name: 'ok', type: 'function', fpSrc, bReturnCode: true, bLog: false, ...o }))
                for (let r of [r1, r2, r3]) {
                    assert.strict.deepStrictEqual(r.res.state, 'resolve', r.res.e && msgOf(r.res.e))
                    let has = r.logs.some((s) => s.includes('invalid runin'))
                    //未給runin即用預設browser, 不是非法值; 給了非法值才提示
                    assert.strict.deepStrictEqual(has, runin !== undefined, `runin[${runin}] logs: ${JSON.stringify(r.logs)}`)
                }
            }
        }
        finally {
            fs.rmSync(fd, { recursive: true, force: true })
        }
    })

})
