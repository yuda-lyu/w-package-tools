import path from 'path'
import fs from 'fs'
import assert from 'assert'
import rollupCode from '../src/rollupCode.mjs'
import rollupParfor from '../src/rollupParfor.mjs'
import childRun from './tools/childRun.mjs'


//規格(規則帳本R14、R15): rollupFile未給fdTar為回傳程式碼模式, 對cwd零寫入(成功與失敗皆然)、回傳碼不含指向檔案之sourceMappingURL、內容與寫檔模式(bSourcemap false)相同;
//經回傳模式之入口(rollupFiles未給fdTar、rollupWorkerCore之bReturnCode)同; 給了fdTar而資料夾不可用即reject; fdSrc給定而非資料夾即reject; rollupParfor之opt帶fdTar仍產出程式碼; rollupCode不改呼叫端之opt


let fdTmp = path.resolve('./test/_tmp/rollupFileReturnCode')
let fdIn = path.resolve('./test-code-in')
let fpMod = path.resolve('./src/rollupFile.mjs')

//reSmuFile: 指向檔案之sourceMappingURL(data:內嵌者自足, 不屬之)
let reSmuFile = /\/\/# sourceMappingURL=(?!data:)/

//mkCwd: 建立隔離之cwd(rollupFile讀cwd之package.json), 回傳絕對路徑
function mkCwd(name) {
    let fd = path.resolve(fdTmp, name)
    fs.rmSync(fd, { recursive: true, force: true })
    fs.mkdirSync(fd, { recursive: true })
    fs.writeFileSync(path.resolve(fd, 'package.json'), JSON.stringify({ name: 'x', version: '0.0.0', author: 'a' }), 'utf8')
    return fd
}

//runInCwd: 於隔離cwd之乾淨子程序呼叫產製API(預設rollupFile; cwd之副作用不可在mocha行程內量測), 回傳{st, added, msg, code}; 回傳值為陣列(rollupFiles)時code為其JSON
function runInCwd(cwd, opt, nPar = 1, fpApi = fpMod) {
    let fpOut = path.resolve(cwd, '..', `${path.basename(cwd)}.out.txt`)
    fs.rmSync(fpOut, { force: true })
    let r = childRun(`
let fs = require('fs')
let { pathToFileURL } = require('url')
let [fpApi, optJson, fpOut, nPar] = process.argv.slice(1)
let before = fs.readdirSync('.')
let api = (await import(pathToFileURL(fpApi).href)).default
let opt = JSON.parse(optJson)
let rs = await Promise.all(Array.from({ length: Number(nPar) }, () => api({ ...opt, bLog: false }).then((v) => ({ st: 'resolve', v }), (e) => ({ st: 'reject', v: String((e && e.message) || e) }))))
let added = fs.readdirSync('.').filter((f) => !before.includes(f))
let r0 = rs[0]
if (r0.st === 'resolve' && (typeof r0.v === 'string' || Array.isArray(r0.v))) {
    fs.writeFileSync(fpOut, typeof r0.v === 'string' ? r0.v : JSON.stringify(r0.v), 'utf8')
}
console.log('RES=' + JSON.stringify({ st: rs.map((r) => r.st), added, msg: rs.filter((r) => r.st === 'reject').map((r) => r.v), allSame: rs.every((r) => r.v === r0.v) }))
`, [fpApi, JSON.stringify(opt), fpOut, String(nPar)], { cwd, timeout: 120000 })
    let m = r.stdout.match(/RES=(.*)/)
    assert.strict.ok(m, `子程序未回報, status=${r.status}, stderr=${r.stderr.slice(0, 300)}`)
    let o = JSON.parse(m[1])
    o.code = fs.existsSync(fpOut) ? fs.readFileSync(fpOut, 'utf8') : null
    return o
}

//refCode: 寫檔模式(bSourcemap false)之產物內容, 作為回傳模式之完整性對照
function refCode(name, opt, ext) {
    let cwd = mkCwd(`ref-${name}`)
    let o = runInCwd(cwd, { ...opt, fdTar: 'ref', bSourcemap: false })
    assert.strict.deepStrictEqual(o.st, ['resolve'], `寫檔模式失敗: ${o.msg}`)
    let fp = path.resolve(cwd, 'ref', `${path.parse(opt.fn).name}.${opt.format}.${ext}`)
    assert.strict.ok(fs.existsSync(fp), `寫檔模式未產出 ${fp}`)
    return fs.readFileSync(fp, 'utf8')
}


describe('rollupFile回傳程式碼模式: cwd零寫入且輸出完整(規則帳本R14)', function() {

    before(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fs.mkdirSync(fdTmp, { recursive: true })
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    for (let format of ['es', 'umd', 'iife', 'cjs']) {
        it(`format ${format} × bSourcemap未給/false/true/'inline': cwd不新增任何項目, 回傳碼不含指向檔案之sourceMappingURL且與寫檔模式逐位元組相同`, function() {
            let opt = { fn: 'gAsync1.mjs', fdSrc: fdIn, format }
            let ref = refCode(format, opt, format === 'es' ? 'mjs' : 'js')
            assert.strict.ok(!reSmuFile.test(ref), '對照之寫檔產物(bSourcemap false)不應有sourceMappingURL')
            for (let [k, bSourcemap] of [['unset', undefined], ['false', false], ['true', true], ['inline', 'inline']]) {
                let cwd = mkCwd(`${format}-${k}`)
                let o = runInCwd(cwd, bSourcemap === undefined ? opt : { ...opt, bSourcemap })
                assert.strict.deepStrictEqual(o.st, ['resolve'], `${k}: ${o.msg}`)
                assert.strict.deepStrictEqual(o.added, [], `${k}: cwd新增了 ${o.added}`)
                assert.strict.ok(!reSmuFile.test(o.code), `${k}: 回傳碼含指向檔案之sourceMappingURL`)
                assert.strict.ok(o.code === ref, `${k}: 回傳碼與寫檔模式之產物不同`)
            }
        })
    }

    it('同一cwd並發3個回傳模式呼叫: cwd不新增任何項目, 三者結果相同', function() {
        let cwd = mkCwd('par3')
        let o = runInCwd(cwd, { fn: 'gAsync1.mjs', fdSrc: fdIn, format: 'umd' }, 3)
        assert.strict.deepStrictEqual(o.st, ['resolve', 'resolve', 'resolve'])
        assert.strict.deepStrictEqual(o.added, [])
        assert.strict.ok(o.allSame, '並發三者之回傳碼應相同')
    })

    it('.vue輸入: cwd不新增任何項目, 回傳碼只允許data:內嵌之sourceMappingURL', function() {
        let cwd = mkCwd('vue')
        let o = runInCwd(cwd, { fn: 'gVue1.vue', fdSrc: fdIn, format: 'umd' })
        assert.strict.deepStrictEqual(o.st, ['resolve'], o.msg.join(' '))
        assert.strict.deepStrictEqual(o.added, [])
        assert.strict.ok(!reSmuFile.test(o.code))
    })

    it('bMinify false且輸入引用css(postcss注入): cwd不新增任何項目, 回傳碼不含指向檔案之sourceMappingURL', function() {
        let cwd = mkCwd('css')
        let fdCss = path.resolve(fdTmp, 'css-src')
        fs.mkdirSync(fdCss, { recursive: true })
        fs.writeFileSync(path.resolve(fdCss, 'x.css'), '.wpt-x { color: red; }\n', 'utf8')
        fs.writeFileSync(path.resolve(fdCss, 'withCss.mjs'), `import './x.css'\nexport default function withCss() {\n    return 1\n}\n`, 'utf8')
        let o = runInCwd(cwd, { fn: 'withCss.mjs', fdSrc: fdCss, format: 'umd', bMinify: false })
        assert.strict.deepStrictEqual(o.st, ['resolve'], o.msg.join(' '))
        assert.strict.deepStrictEqual(o.added, [])
        assert.strict.ok(!reSmuFile.test(o.code))
        assert.strict.ok(o.code.includes('wpt-x'), '回傳碼應含注入之css')
    })

    it('建置失敗(缺漏之相對模組): reject且cwd不新增任何項目', function() {
        let cwd = mkCwd('bad')
        let fdBad = path.resolve(fdTmp, 'bad-src')
        fs.mkdirSync(fdBad, { recursive: true })
        fs.writeFileSync(path.resolve(fdBad, 'bad.mjs'), `import x from './not-exist-zz.mjs'\nexport default x\n`, 'utf8')
        let o = runInCwd(cwd, { fn: 'bad.mjs', fdSrc: fdBad, format: 'umd' })
        assert.strict.deepStrictEqual(o.st, ['reject'])
        assert.strict.ok(o.msg[0].includes('not-exist-zz'), o.msg[0])
        assert.strict.deepStrictEqual(o.added, [])
    })

    it('輸出選項錯誤(format不支援): reject且cwd不新增任何項目', function() {
        let cwd = mkCwd('bad-format')
        let o = runInCwd(cwd, { fn: 'gAsync1.mjs', fdSrc: fdIn, format: 'zzz' })
        assert.strict.deepStrictEqual(o.st, ['reject'])
        assert.strict.ok(o.msg[0].includes('zzz'), o.msg[0])
        assert.strict.deepStrictEqual(o.added, [])
    })

    it('rollupFiles未給fdTar: 回傳各檔程式碼, cwd不新增任何項目, 各碼不含指向檔案之sourceMappingURL', function() {
        let cwd = mkCwd('files')
        let o = runInCwd(cwd, { fns: ['gAsync1.mjs', 'gAsync2.mjs'], fdSrc: fdIn, format: 'umd' }, 1, path.resolve('./src/rollupFiles.mjs'))
        assert.strict.deepStrictEqual(o.st, ['resolve'], o.msg.join(' '))
        assert.strict.deepStrictEqual(o.added, [])
        let codes = JSON.parse(o.code)
        assert.strict.deepStrictEqual(codes.length, 2)
        for (let c of codes) {
            assert.strict.ok(typeof c === 'string' && c.length > 0 && !reSmuFile.test(c))
        }
    })

    it('rollupWorkerCore之bReturnCode: 回傳程式碼, cwd不新增任何項目', function() {
        let cwd = mkCwd('worker-code')
        let o = runInCwd(cwd, { name: 'gWorker3_Fun', type: 'function', fpSrc: path.resolve(fdIn, 'gWorker3_Fun.mjs'), bReturnCode: true, runin: 'nodejs', formatOut: 'umd' }, 1, path.resolve('./src/rollupWorkerCore.mjs'))
        assert.strict.deepStrictEqual(o.st, ['resolve'], o.msg.join(' '))
        assert.strict.deepStrictEqual(o.added, [])
        assert.strict.ok(o.code.length > 1000 && !reSmuFile.test(o.code))
    })

})


describe('產製路徑不可用即reject, 不靜默改道(規則帳本R14)', function() {

    before(function() {
        fs.mkdirSync(fdTmp, { recursive: true })
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    it('fdTar為既有檔案: reject並指明fdTar, 不回傳程式碼, cwd不新增任何項目且該檔不變', function() {
        let cwd = mkCwd('tar-is-file')
        fs.writeFileSync(path.resolve(cwd, 'outfile'), 'x', 'utf8')
        let o = runInCwd(cwd, { fn: 'gAsync1.mjs', fdSrc: fdIn, format: 'umd', fdTar: 'outfile' })
        assert.strict.deepStrictEqual(o.st, ['reject'], `應reject, 實得回傳${o.code ? '程式碼' : ''}`)
        assert.strict.ok(o.msg[0].includes('fdTar'), o.msg[0])
        assert.strict.deepStrictEqual(o.added, [])
        assert.strict.deepStrictEqual(fs.readFileSync(path.resolve(cwd, 'outfile'), 'utf8'), 'x')
    })

    it('fdTar之上層為檔案(無法建立資料夾): reject並指明fdTar, cwd不新增任何項目', function() {
        let cwd = mkCwd('tar-under-file')
        fs.writeFileSync(path.resolve(cwd, 'afile'), 'x', 'utf8')
        let o = runInCwd(cwd, { fn: 'gAsync1.mjs', fdSrc: fdIn, format: 'umd', fdTar: 'afile/sub' })
        assert.strict.deepStrictEqual(o.st, ['reject'])
        assert.strict.ok(o.msg[0].includes('fdTar'), o.msg[0])
        assert.strict.deepStrictEqual(o.added, [])
    })

    it('fdSrc給定而非資料夾: reject並指明fdSrc, 不靜默改用./(cwd內有同名檔亦不得被建置)', function() {
        let cwd = mkCwd('src-not-dir')
        fs.copyFileSync(path.resolve(fdIn, 'gAsync1.mjs'), path.resolve(cwd, 'gAsync1.mjs')) //若靜默改用./即會建置此檔
        let o = runInCwd(cwd, { fn: 'gAsync1.mjs', fdSrc: path.resolve(fdIn, 'gAsync1.mjs'), format: 'umd' })
        assert.strict.deepStrictEqual(o.st, ['reject'], '應reject而非改用cwd之同名檔')
        assert.strict.ok(o.msg[0].includes('fdSrc'), o.msg[0])
    })

    it('rollupParfor之opt帶fdTar: 產物仍為程式碼, 不得為字串finish', async function() {
        let fdOut = path.resolve(fdTmp, 'parfor')
        fs.mkdirSync(fdOut, { recursive: true })
        let fpTar = path.resolve(fdOut, 'gParfor1_Fun.pf.umd.js')
        let oriLog = console.log
        console.log = () => {}
        try {
            await rollupParfor({ name: 'gParfor1_Fun', fpSrc: path.resolve(fdIn, 'gParfor1_Fun.mjs'), fpTar, formatOut: 'umd', fdTar: path.resolve(fdOut, 'extra'), bLog: false })
        }
        finally {
            console.log = oriLog
        }
        let c = fs.readFileSync(fpTar, 'utf8')
        assert.strict.notDeepStrictEqual(c, 'finish')
        assert.strict.ok(c.length > 1000 && c.includes('gParfor1_Fun'), `產物不像umd程式碼(長度${c.length})`) //umd以name掛全域
    })

    it('rollupCode不改寫呼叫端之opt', async function() {
        let opt = { name: 'gBase1', bLog: false }
        let snap = JSON.stringify(opt)
        await rollupCode(fs.readFileSync(path.resolve(fdIn, 'gBase1.js'), 'utf8'), opt)
        assert.strict.deepStrictEqual(JSON.stringify(opt), snap)
    })

})
