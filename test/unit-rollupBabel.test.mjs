import path from 'path'
import fs from 'fs'
import assert from 'assert'
import { pathToFileURL } from 'url'
import { DEFAULT_EXTENSIONS } from '@babel/core'
import presetEnv from '@babel/preset-env'
import childRun from './tools/childRun.mjs'


//規格(規則帳本R25): rollupFile之babel轉譯不受使用端之babel設定與使用端之安裝擺放影響
//①建置不讀使用端之babel設定(babel.config.*、.babelrc*、package.json之babel鍵): 使用端cwd有會拋錯之設定時rollupFile仍成功, 產物與無設定時逐字相同;
//  使用端之browserslist設定(package.json之browserslist鍵、.browserslistrc、兩者並存、環境變數BROWSERSLIST)亦不影響產物(轉譯等級只由opt.targets決定)
//②轉譯外掛之篩選規則同@rollup/plugin-babel 6.1.0(其dist/es/index.js:268、273與@rollup/pluginutils之createFilter): id含\0不處理; id去query後(bareId)以@babel/core之DEFAULT_EXTENSIONS結尾才處理(區分大小寫);
//  故.vue主檔與.vue之區塊(如x.vue?rollup-plugin-vue=script.js)不經babel, x.js?query經babel; 轉譯結果帶sourcemap, 且保留ES模組語法(caller宣告supportsStaticESM)交由rollup處理
//③使用端根目錄另有@babel/core 7、@babel/preset-env 7、@babel/plugin-transform-runtime 7(及與其同層提升、peer接受core 7之套件)時, 仍以本套件相依之@babel/core與外掛轉譯(外掛以模組物件傳入, 不以字串自使用端根目錄解析), 產物與直接以本套件建置者相同
//觀察方式: babel之產生器會重印整個模組(縮排2格、敘述補分號), 而rollup(bMinify false)只改寫頂層宣告、函數本體保留原文,
//故原始碼函數本體以4格縮排且不寫分號時, 產物中該行為[2格且有分號]即該模組經babel, 為[原樣4格無分號]即未經babel(頂層let會被rollup補分號, 不可作為觀察點)


let fdTmp = path.resolve('./test/_tmp/rollupBabel')
let fpMod = path.resolve('./src/rollupFile.mjs')
let fpRollupBabel = path.resolve('./src/rollupBabel.mjs')

let srcMain = `import helper from './helper.js'
let bb02Marker = 'bb02-js'
export default function bb02Main() {
    return bb02Marker + helper()
}
`
let srcHelper = `let bb02Helper = 'bb02-helper'
export default function helper() {
    return bb02Helper
}
`
let srcVue = `<template>
    <div>{{ msg }}</div>
</template>

<script>
import helper from './helper.js'
let bb02VueMarker = 'bb02-vue'
export default {
    data: function() {
        return { msg: bb02VueMarker + helper() }
    },
}
</script>
`
let srcThrowPlugin = `module.exports = function() {
    throw new Error('BB02_CONSUMER_BABELRC_PLUGIN_LOADED')
}
`

//optBuild: 回傳程式碼模式(不寫檔)、不壓縮、無banner, 使產物保留各模組原文以觀察分號
let optBuild = { fn: 'main.mjs', format: 'es', bMinify: false, bBanner: false }

//reBabelJs/reBabelHelper/reRawVue: 函數本體之行, 經babel者為2格縮排且補分號, 未經babel者保留原文(4格以上縮排、無分號)
let reBabelJs = /\n {2}return bb02Marker \+ helper\(\);\r?\n/
let reBabelHelper = /\n {2}return bb02Helper;\r?\n/
let reRawVue = /\n {8}return \{ msg: bb02VueMarker \+ helper\(\) \}\r?\n/


//mkPkg: 建立假使用端資料夾(含package.json與src), 回傳絕對路徑
function mkPkg(name, pkgExtra = {}) {
    let fd = path.resolve(fdTmp, name)
    fs.rmSync(fd, { recursive: true, force: true })
    fs.mkdirSync(path.resolve(fd, 'src'), { recursive: true })
    fs.writeFileSync(path.resolve(fd, 'package.json'), JSON.stringify({ name: 'x', version: '0.0.0', author: 'a', ...pkgExtra }), 'utf8')
    fs.writeFileSync(path.resolve(fd, 'src', 'main.mjs'), srcMain, 'utf8')
    fs.writeFileSync(path.resolve(fd, 'src', 'helper.js'), srcHelper, 'utf8')
    fs.writeFileSync(path.resolve(fd, 'src', 'comp.vue'), srcVue, 'utf8')
    return fd
}

//runBuild: 於cwd之乾淨子程序以fpApi(rollupFile)建置, 回傳{st, msg, code, coreCalls, presetCalls, runtimeCalls}; cwd決定babel之root(使用端設定之讀取起點), 不可在mocha行程內chdir; env為子程序額外之環境變數(於載入前設定)
function runBuild(cwd, opt, fpApi = fpMod, env = {}) {
    let fpOut = path.resolve(cwd, '..', `${path.basename(cwd)}.out.txt`)
    fs.rmSync(fpOut, { force: true })
    let r = childRun(`
let fs = require('fs')
let { pathToFileURL } = require('url')
let [fpApi, optJson, fpOut, envJson] = process.argv.slice(1)
Object.assign(process.env, JSON.parse(envJson))
let api = (await import(pathToFileURL(fpApi).href)).default
let opt = JSON.parse(optJson)
let o = await api({ ...opt, bLog: false }).then((v) => ({ st: 'resolve', v }), (e) => ({ st: 'reject', v: String((e && e.message) || e) }))
if (o.st === 'resolve') {
    fs.writeFileSync(fpOut, o.v, 'utf8')
}
console.log('RES=' + JSON.stringify({ st: o.st, msg: o.st === 'reject' ? o.v : '', coreCalls: globalThis.__bb02CoreCalls || 0, presetCalls: globalThis.__bb02PresetCalls || 0, runtimeCalls: globalThis.__bb02RuntimeCalls || 0 }))
`, [fpApi, JSON.stringify(opt), fpOut, JSON.stringify(env)], { cwd, timeout: 120000 })
    let m = r.stdout.match(/RES=(.*)/)
    assert.strict.ok(m, `子程序未回報, status=${r.status}, stderr=${r.stderr.slice(0, 500)}`)
    let o = JSON.parse(m[1])
    o.code = fs.existsSync(fpOut) ? fs.readFileSync(fpOut, 'utf8') : null
    return o
}

//decodeMappings: 解sourcemap之mappings(Base64 VLQ)為各產物行之區段陣列[{genCol, src, srcLine, srcCol}](行、欄皆0起); 自寫以免測試依賴傳遞相依套件
function decodeMappings(mappings) {
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let lines = []
    let src = 0
    let srcLine = 0
    let srcCol = 0
    for (let line of mappings.split(';')) {
        let segs = []
        let genCol = 0
        for (let seg of line.split(',')) {
            if (seg === '') {
                continue
            }
            let vals = []
            let v = 0
            let shift = 0
            for (let ch of seg) {
                let d = chars.indexOf(ch)
                v += (d & 31) << shift
                if (d & 32) {
                    shift += 5
                }
                else {
                    let neg = v & 1
                    v = v >> 1
                    vals.push(neg ? -v : v)
                    v = 0
                    shift = 0
                }
            }
            genCol += vals[0]
            let s = { genCol }
            if (vals.length >= 4) {
                src += vals[1]
                srcLine += vals[2]
                srcCol += vals[3]
                s.src = src
                s.srcLine = srcLine
                s.srcCol = srcCol
            }
            segs.push(s)
        }
        lines.push(segs)
    }
    return lines
}

//loadRollupBabel: 動態載入, 使模組不存在(修前)時各案個別失敗而非整檔無法載入
async function loadRollupBabel() {
    return (await import(pathToFileURL(fpRollupBabel).href)).default
}


describe('rollupFile之babel轉譯不受使用端設定與安裝擺放影響(規則帳本R25)', function() {

    let codeClean = null

    before(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fs.mkdirSync(fdTmp, { recursive: true })
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    it('對照: 無使用端設定之cwd建置成功, main.mjs與helper.js皆經babel(函數本體被重印)', function() {
        let cwd = mkPkg('clean')
        let o = runBuild(cwd, { ...optBuild, fdSrc: path.resolve(cwd, 'src') })
        //規格①之對照組: 無設定時建置成功
        assert.strict.equal(o.st, 'resolve', o.msg)
        //規格②: .mjs與.js皆經babel
        assert.strict.ok(reBabelJs.test(o.code), `main.mjs應經babel:\n${o.code}`)
        assert.strict.ok(reBabelHelper.test(o.code), `helper.js應經babel:\n${o.code}`)
        codeClean = o.code
    })

    //規格①: 各種使用端設定皆不被讀取; 每種各自一個cwd(babel對同一資料夾多個設定檔會另行報錯)
    let cases = [
        {
            k: 'babel.config.js(載入即拋錯)',
            setup: (fd) => fs.writeFileSync(path.resolve(fd, 'babel.config.js'), `throw new Error('BB02_CONSUMER_BABEL_CONFIG_LOADED')\n`, 'utf8'),
        },
        {
            k: 'babel.config.js(使用端標準版: useBuiltIns/corejs與以字串指名之外掛)',
            setup: (fd) => fs.writeFileSync(path.resolve(fd, 'babel.config.js'), `module.exports = {
    'presets': [
        ['@babel/preset-env', {
            'useBuiltIns': 'entry',
            'corejs': 3
        }]
    ],
    'plugins': [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-export-default-from',
    ]
}
`, 'utf8'),
        },
        {
            k: 'babel.config.json(外掛載入即拋錯)',
            setup: (fd) => {
                fs.writeFileSync(path.resolve(fd, 'bb02ThrowPlugin.cjs'), srcThrowPlugin, 'utf8')
                fs.writeFileSync(path.resolve(fd, 'babel.config.json'), JSON.stringify({ plugins: ['./bb02ThrowPlugin.cjs'] }), 'utf8')
            },
        },
        {
            k: '.babelrc(外掛載入即拋錯)',
            setup: (fd) => {
                fs.writeFileSync(path.resolve(fd, 'bb02ThrowPlugin.cjs'), srcThrowPlugin, 'utf8')
                fs.writeFileSync(path.resolve(fd, '.babelrc'), JSON.stringify({ plugins: ['./bb02ThrowPlugin.cjs'] }), 'utf8')
            },
        },
        {
            k: '.babelrc.js(載入即拋錯)',
            setup: (fd) => fs.writeFileSync(path.resolve(fd, '.babelrc.js'), `throw new Error('BB02_CONSUMER_BABELRC_JS_LOADED')\n`, 'utf8'),
        },
        {
            k: 'package.json之babel鍵(外掛載入即拋錯)',
            pkgExtra: { babel: { plugins: ['./bb02ThrowPlugin.cjs'] } },
            setup: (fd) => fs.writeFileSync(path.resolve(fd, 'bb02ThrowPlugin.cjs'), srcThrowPlugin, 'utf8'),
        },
        {
            k: 'package.json之browserslist鍵(ie 11, 若被採用則let會被轉為var)',
            pkgExtra: { browserslist: ['ie 11'] },
            setup: () => {},
        },
        {
            k: '.browserslistrc(ie 11, 若被採用則let會被轉為var)',
            setup: (fd) => fs.writeFileSync(path.resolve(fd, '.browserslistrc'), 'ie 11\n', 'utf8'),
        },
        {
            k: '.browserslistrc與package.json之browserslist鍵並存(browserslist讀取即拋錯)',
            pkgExtra: { browserslist: ['ie 11'] },
            setup: (fd) => fs.writeFileSync(path.resolve(fd, '.browserslistrc'), 'ie 11\n', 'utf8'),
        },
        {
            k: '環境變數BROWSERSLIST為無效查詢(browserslist讀取即拋錯)',
            env: { BROWSERSLIST: 'bb02notabrowser 99' },
            setup: () => {},
        },
    ]
    for (let [i, c] of cases.entries()) {
        it(`使用端cwd有${c.k}: rollupFile仍成功, 產物與無設定時逐字相同`, function() {
            assert.strict.ok(codeClean !== null, '對照組未產出')
            let cwd = mkPkg(`cfg${i}`, c.pkgExtra || {})
            c.setup(cwd)
            let o = runBuild(cwd, { ...optBuild, fdSrc: path.resolve(cwd, 'src') }, fpMod, c.env || {})
            //規格①: 不讀使用端設定, 故設定拋錯不影響建置
            assert.strict.equal(o.st, 'resolve', o.msg)
            //規格①: 產物不受影響
            assert.strict.ok(o.code === codeClean, `產物與無設定時不同:\n${o.code}`)
        })
    }

    it('.vue主檔建置: .vue之script區塊(x.vue?rollup-plugin-vue=script.js)不經babel, 其引用之.js經babel', function() {
        let cwd = mkPkg('vue')
        let o = runBuild(cwd, { ...optBuild, fn: 'comp.vue', fdSrc: path.resolve(cwd, 'src') })
        assert.strict.equal(o.st, 'resolve', o.msg)
        //規格②: .vue之區塊以query標示, bareId為.vue, 不經babel(函數本體保留原文)
        assert.strict.ok(reRawVue.test(o.code), `.vue之script區塊不應經babel:\n${o.code}`)
        //規格②: .vue引用之.js照常經babel
        assert.strict.ok(reBabelHelper.test(o.code), `helper.js應經babel:\n${o.code}`)
    })

    it('外掛之篩選: 依id逐一判定是否交給babel, 與@rollup/plugin-babel 6.1.0之規則相同', async function() {
        let rollupBabel = await loadRollupBabel()
        let seen = []
        let spy = () => ({
            visitor: {
                Program(p, state) {
                    seen.push(state.filename)
                },
            },
        })
        let pl = rollupBabel({ babelrc: false, configFile: false, plugins: [spy] })
        let code = `let a = 1\nexport default a\n`
        let fd = path.resolve(fdTmp, 'filter')
        //規格②之id表: [id, 是否經babel]
        let ids = [
            ...DEFAULT_EXTENSIONS.map((ext) => [path.resolve(fd, `x${ext}`), true]), //DEFAULT_EXTENSIONS(.js .jsx .es6 .es .mjs .cjs)皆處理
            [path.resolve(fd, 'x.js') + '?commonjs-entry', true], //去query後為.js即處理
            [path.resolve(fd, 'x.vue'), false], //.vue主檔不處理
            [path.resolve(fd, 'x.vue') + '?rollup-plugin-vue=script.js', false], //.vue區塊: 整串以.js結尾但bareId為.vue, 不處理
            [path.resolve(fd, 'x.vue') + '?vue&type=script&lang.js', false], //同上
            ['\0commonjsHelpers.js', false], //虛擬模組(含\0)不處理
            ['\0' + path.resolve(fd, 'x.js') + '?commonjs-proxy', false], //同上
            [path.resolve(fd, 'x.ts'), false], //非DEFAULT_EXTENSIONS不處理
            [path.resolve(fd, 'x.css'), false],
            [path.resolve(fd, 'x.json'), false],
            [path.resolve(fd, 'x.JS'), false], //副檔名比對區分大小寫
        ]
        for (let [id, bExpect] of ids) {
            seen = []
            let r = await pl.transform(code, id)
            if (bExpect) {
                //規格②: 經babel且帶sourcemap
                assert.strict.ok(r && typeof r.code === 'string', `${JSON.stringify(id)} 應經babel`)
                assert.strict.deepStrictEqual(seen, [id], `${JSON.stringify(id)} 應以原id為filename交給babel一次`)
                assert.strict.ok(r.map && typeof r.map.mappings === 'string', `${JSON.stringify(id)} 應回傳sourcemap`)
            }
            else {
                //規格②: 不經babel(回傳null交由rollup原樣處理)
                assert.strict.equal(r, null, `${JSON.stringify(id)} 不應經babel`)
                assert.strict.deepStrictEqual(seen, [], `${JSON.stringify(id)} 不應交給babel`)
            }
        }
    })

    it('外掛之轉譯保留ES模組語法(交由rollup處理), 不改為CommonJS', async function() {
        let rollupBabel = await loadRollupBabel()
        let pl = rollupBabel({ babelrc: false, configFile: false, presets: [[presetEnv, { targets: 'defaults' }]] })
        let r = await pl.transform(`import a from './a.js'\nexport default function f() { return a }\n`, path.resolve(fdTmp, 'esm', 'x.js'))
        //規格②: caller宣告supportsStaticESM, preset-env不轉換模組語法
        assert.strict.ok(/^import a from '\.\/a\.js';/m.test(r.code), r.code)
        assert.strict.ok(/^export default function f\(\)/m.test(r.code), r.code)
        assert.strict.ok(!/require\(|exports\./.test(r.code), r.code)
    })

    it('外掛交給babel之caller與sourcemap: caller同@rollup/plugin-babel 6.1.0(名稱與四項能力), sourcemap指向原始檔且產物各行對應回原始碼之同一行', async function() {
        let rollupBabel = await loadRollupBabel()
        let callers = []
        let spy = (api) => {
            callers.push(JSON.parse(api.caller((c) => JSON.stringify(c)))) //api.caller之回傳須為簡單型別(作快取鍵), 故以字串取出
            return { visitor: {} }
        }
        let pl = rollupBabel({ babelrc: false, configFile: false, plugins: [spy] })
        let id = path.resolve(fdTmp, 'map', 'x.js')
        let r = await pl.transform(`let a = 1\nlet b = 2\nexport default a + b\n`, id)
        //規格②: caller同6.1.0(babelHelpers為runtime、rollup 3以上時之值)
        assert.strict.deepStrictEqual(callers[0], { name: '@rollup/plugin-babel', supportsStaticESM: true, supportsDynamicImport: true, supportsTopLevelAwait: true, supportsExportNamespaceFrom: true })
        //規格②: sourcemap之來源為原始檔
        assert.strict.deepStrictEqual(r.map.sources.map((s) => path.basename(s)), ['x.js'])
        //規格②: 產物3行依序對應原始碼第1、2、3行(行首區段)
        let lines = decodeMappings(r.map.mappings)
        assert.strict.deepStrictEqual(r.code.split(/\r?\n/), ['let a = 1;', 'let b = 2;', 'export default a + b;'])
        assert.strict.deepStrictEqual([0, 1, 2].map((i) => lines[i] && lines[i][0] && lines[i][0].srcLine), [0, 1, 2])
        assert.strict.deepStrictEqual([0, 1, 2].map((i) => lines[i] && lines[i][0] && lines[i][0].srcCol), [0, 0, 0])
    })

    it('使用端根目錄另有@babel/core 7、preset-env 7、plugin-transform-runtime 7(與同層提升之套件)而本套件之babel巢狀安裝: 仍以本套件之core與外掛轉譯, 產物與直接建置者相同', function() {
        assert.strict.ok(codeClean !== null, '對照組未產出')
        let cwd = mkPkg('consumer')
        let fdNm = path.resolve(cwd, 'node_modules')
        let fdWpt = path.resolve(fdNm, 'w-package-tools')
        let pkgWpt = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'))

        //使用端根目錄之@babel/core 7(假): 任何呼叫即拋錯, 用以偵測被誤用
        let fdFake = path.resolve(fdNm, '@babel', 'core')
        fs.mkdirSync(fdFake, { recursive: true })
        fs.writeFileSync(path.resolve(fdFake, 'package.json'), JSON.stringify({ name: '@babel/core', version: '7.29.7', main: 'index.js' }), 'utf8')
        fs.writeFileSync(path.resolve(fdFake, 'index.js'), `function used() { throw new Error('BB02_FAKE_CORE7_USED') }
exports.version = '7.29.7'
exports.DEFAULT_EXTENSIONS = Object.freeze(['.js', '.jsx', '.es6', '.es', '.mjs', '.cjs'])
exports.loadPartialConfig = used
exports.loadPartialConfigAsync = used
exports.transform = used
exports.transformAsync = used
exports.transformSync = used
exports.buildExternalHelpers = used
`, 'utf8')

        //同層提升: 本套件相依中peer接受@babel/core 7者, npm會提升至使用端根目錄(與core 7同層)
        let hoisted = []
        for (let k of Object.keys(pkgWpt.dependencies || {})) {
            let fpPk = path.resolve('./node_modules', k, 'package.json')
            if (!fs.existsSync(fpPk)) {
                continue
            }
            let peer = (JSON.parse(fs.readFileSync(fpPk, 'utf8')).peerDependencies || {})['@babel/core'] || ''
            if (/^\^7\./.test(peer)) {
                fs.cpSync(path.resolve('./node_modules', k), path.resolve(fdNm, k), { recursive: true })
                hoisted.push(k)
            }
        }

        //使用端根目錄之@babel/preset-env 7、@babel/plugin-transform-runtime 7(假, 如由@vue/cli-plugin-babel帶入): 被載入即拋錯, 用以偵測外掛以字串指名而自使用端根目錄解析
        for (let k of ['@babel/preset-env', '@babel/plugin-transform-runtime']) {
            let fdK = path.resolve(fdNm, k)
            fs.rmSync(fdK, { recursive: true, force: true })
            fs.mkdirSync(fdK, { recursive: true })
            fs.writeFileSync(path.resolve(fdK, 'package.json'), JSON.stringify({ name: k, version: '7.29.7', main: 'index.js' }), 'utf8')
            fs.writeFileSync(path.resolve(fdK, 'index.js'), `throw new Error('BB02_FAKE_ROOT_PLUGIN7_USED: ${k}')\n`, 'utf8')
        }

        //本套件(src與package.json)安裝於使用端node_modules, 其@babel/core巢狀安裝(以轉接模組指向實際版本並計數呼叫)
        fs.mkdirSync(fdWpt, { recursive: true })
        fs.cpSync(path.resolve('./src'), path.resolve(fdWpt, 'src'), { recursive: true })
        fs.copyFileSync(path.resolve('./package.json'), path.resolve(fdWpt, 'package.json'))
        let urlCore = import.meta.resolve('@babel/core')
        let fdShim = path.resolve(fdWpt, 'node_modules', '@babel', 'core')
        fs.mkdirSync(fdShim, { recursive: true })
        fs.writeFileSync(path.resolve(fdShim, 'package.json'), JSON.stringify({ name: '@babel/core', version: '0.0.0-shim', type: 'module', exports: { '.': './index.mjs' } }), 'utf8')
        fs.writeFileSync(path.resolve(fdShim, 'index.mjs'), `import * as real from ${JSON.stringify(urlCore)}
export * from ${JSON.stringify(urlCore)}
export async function transformAsync(...args) {
    globalThis.__bb02CoreCalls = (globalThis.__bb02CoreCalls || 0) + 1
    return real.transformAsync(...args)
}
`, 'utf8')

        //本套件之preset-env、plugin-transform-runtime亦巢狀安裝(根目錄為7, npm把本套件所需之版本放在本套件之node_modules內), 以轉接模組指向實際版本並計數被babel呼叫之次數(證明確實套用)
        for (let [k, g] of [['@babel/preset-env', '__bb02PresetCalls'], ['@babel/plugin-transform-runtime', '__bb02RuntimeCalls']]) {
            let url = import.meta.resolve(k)
            let fdK = path.resolve(fdWpt, 'node_modules', k)
            fs.mkdirSync(fdK, { recursive: true })
            fs.writeFileSync(path.resolve(fdK, 'package.json'), JSON.stringify({ name: k, version: '0.0.0-shim', type: 'module', exports: { '.': './index.mjs' } }), 'utf8')
            fs.writeFileSync(path.resolve(fdK, 'index.mjs'), `import real from ${JSON.stringify(url)}
export * from ${JSON.stringify(url)}
export default function bb02Counted(...args) {
    globalThis.${g} = (globalThis.${g} || 0) + 1
    return real(...args)
}
`, 'utf8')
        }

        let o = runBuild(cwd, { ...optBuild, fdSrc: path.resolve(cwd, 'src') }, path.resolve(fdWpt, 'src', 'rollupFile.mjs'))
        //規格③: 不用使用端根目錄之core 7與外掛7(誤用即拋BB02_FAKE_*)
        assert.strict.equal(o.st, 'resolve', `${o.msg} (同層提升: ${hoisted.join(', ')})`)
        //規格③: 以本套件之core轉譯(main.mjs、helper.js各一次)
        assert.strict.ok(o.coreCalls >= 2, `本套件之@babel/core未被使用, 呼叫次數 ${o.coreCalls}`)
        //規格③(R25②④): 本套件之preset-env與plugin-transform-runtime確實被套用
        assert.strict.ok(o.presetCalls >= 1, `本套件之@babel/preset-env未被套用, 呼叫次數 ${o.presetCalls}`)
        assert.strict.ok(o.runtimeCalls >= 1, `本套件之@babel/plugin-transform-runtime未被套用, 呼叫次數 ${o.runtimeCalls}`)
        //規格③: 產物與直接以本套件建置者相同
        assert.strict.ok(o.code === codeClean, `產物與直接建置者不同:\n${o.code}`)
    })

})
