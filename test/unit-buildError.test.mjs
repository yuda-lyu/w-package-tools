import path from 'path'
import fs from 'fs'
import assert from 'assert'
import rollupFile from '../src/rollupFile.mjs'
import rollupCode from '../src/rollupCode.mjs'
import rollupWorkerCore from '../src/rollupWorkerCore.mjs'
import rollupWorker from '../src/rollupWorker.mjs'
import rollupParfor from '../src/rollupParfor.mjs'
import rollupFiles from '../src/rollupFiles.mjs'
import rollupVueToHtml from '../src/rollupVueToHtml.mjs'
import extractHtml from '../src/extractHtml.mjs'


//run: 執行並攔截其間之console輸出, 回傳settle結果與輸出(預期內之失敗訊息不污染npm test輸出, 並可斷言無雜訊)
let run = async (fn) => {
    let logs = []
    let oriLog = console.log
    let oriErr = console.error
    let push = (...args) => {
        logs.push(args.map(String).join(' '))
    }
    console.log = push
    console.error = push
    let res
    try {
        res = await fn().then((v) => ({ state: 'resolve', v }), (e) => ({ state: 'reject', e }))
    }
    finally {
        console.log = oriLog
        console.error = oriErr
    }
    return { res, logs }
}

let msgOf = (e) => String((e && e.message) || e)

//lsTemp: cwd下之暫存檔(rollupCode、rollupWorker、rollupParfor、rollupFile皆以temp-為前綴產於cwd), 失敗後不得殘留
let lsTemp = () => fs.readdirSync('.').filter((fn) => fn.startsWith('temp-'))


describe('產製API之建置錯誤一律reject(規則帳本R9)', function() {

    let fdTmp = './test/_tmp/buildError'
    let fdSrc = `${fdTmp}/src`
    let fnBad = 'badRel.mjs'
    let fpBad = path.resolve(fdSrc, fnBad)
    let miss = 'does-not-exist-zzz' //以相對路徑引用不存在之模組(rollup本即錯誤); 裸套件名之缺漏見unit-buildCheck(規則帳本R16)

    before(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fs.mkdirSync(fdSrc, { recursive: true })
        fs.writeFileSync(fpBad, `import x from './${miss}.mjs'\n\nasync function badRel() {\n    return x\n}\n\nexport default badRel\n`, 'utf8')
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    it('rollupFile(基準, 既有即reject): reject且錯誤含缺漏模組', async function() {
        let { res } = await run(() => rollupFile({ fn: fnBad, fdSrc, fdTar: `${fdTmp}/out-file`, bLog: false }))
        assert.strict.deepStrictEqual(res.state, 'reject')
        assert.strict.ok(msgOf(res.e).includes(miss), `實得: ${msgOf(res.e)}`)
    })

    it('rollupCode(基準, 既有即reject): reject且錯誤含缺漏模組, 不殘留暫存檔', async function() {
        let { res } = await run(() => rollupCode(fs.readFileSync(fpBad, 'utf8'), { name: 'badRel', bLog: false }))
        assert.strict.deepStrictEqual(res.state, 'reject')
        assert.strict.ok(msgOf(res.e).includes(miss), `實得: ${msgOf(res.e)}`)
        assert.strict.deepStrictEqual(lsTemp(), [])
    })

    it('rollupWorkerCore(基準, 既有即reject): reject且錯誤含缺漏模組', async function() {
        let { res } = await run(() => rollupWorkerCore({ name: 'badRel', type: 'function', fpSrc: fpBad, bReturnCode: true, runin: 'nodejs', bLog: false }))
        assert.strict.deepStrictEqual(res.state, 'reject')
        assert.strict.ok(msgOf(res.e).includes(miss), `實得: ${msgOf(res.e)}`)
    })

    it('rollupWorker: reject真因, 清理不印ENOENT雜訊, 不殘留暫存檔, 不產出產物', async function() {
        let fpTar = `${fdTmp}/out-worker/badRel.wk.umd.js`
        let { res, logs } = await run(() => rollupWorker({ name: 'badRel', type: 'function', fpSrc: fpBad, fpTar, formatOut: 'umd', runin: 'both', bLog: false }))

        //R9: 建置錯誤須reject(與rollupFile、rollupCode、rollupWorkerCore一致), 呼叫端才能中止後續產製
        assert.strict.deepStrictEqual(res.state, 'reject', '建置失敗時應reject, 不得吞錯而resolve')
        assert.strict.ok(msgOf(res.e).includes(miss), `應reject真因, 實得: ${msgOf(res.e)}`)

        //R9: 清理尚未建立之暫存檔不得印出ENOENT(會被誤認為真因)
        assert.strict.deepStrictEqual(logs.filter((s) => s.includes('ENOENT')), [])
        assert.strict.deepStrictEqual(lsTemp(), [])
        assert.strict.ok(!fs.existsSync(fpTar), '失敗時不得產出產物')
    })

    it('rollupParfor: reject真因(非次生之暫存檔錯誤), 清理不印ENOENT雜訊, 不殘留暫存檔', async function() {
        let fpTar = `${fdTmp}/out-parfor/badRel.pf.umd.js`
        let { res, logs } = await run(() => rollupParfor({ name: 'badRelPf', fpSrc: fpBad, fpTar, formatOut: 'umd', runin: 'both', bLog: false }))

        //R9: 同上; 內層rollupWorker之錯誤須原樣往外拋, 不得被吞後再於外層出現找不到暫存產物之次生錯誤
        assert.strict.deepStrictEqual(res.state, 'reject', '建置失敗時應reject, 不得吞錯而resolve')
        assert.strict.ok(msgOf(res.e).includes(miss), `應reject真因, 實得: ${msgOf(res.e)}`)
        assert.strict.deepStrictEqual(logs.filter((s) => s.includes('ENOENT')), [])
        assert.strict.deepStrictEqual(lsTemp(), [])
        assert.strict.ok(!fs.existsSync(fpTar), '失敗時不得產出產物')
    })

    it('rollupFiles: reject且錯誤含缺漏模組', async function() {
        let { res } = await run(() => rollupFiles({ fns: [fnBad], fdSrc, fdTar: `${fdTmp}/out-files`, bLog: false }))
        assert.strict.deepStrictEqual(res.state, 'reject', '建置失敗時應reject, 不得吞錯而resolve')
        assert.strict.ok(msgOf(res.e).includes(miss), `實得: ${msgOf(res.e)}`)
    })

    it('rollupVueToHtml: 建置失敗須reject且不寫出html(否則html引用不存在之產物)', async function() {
        let fpHtml = `${fdTmp}/out-vue/app.html`
        let { res } = await run(() => rollupVueToHtml(`${fdSrc}/notexist.vue`, fpHtml, {}))
        assert.strict.deepStrictEqual(res.state, 'reject', '建置失敗時應reject, 不得吞錯而resolve')
        assert.strict.ok(msgOf(res.e).includes('notexist.vue'), `實得: ${msgOf(res.e)}`)
        assert.strict.ok(!fs.existsSync(fpHtml), '建置失敗時不得寫出html')
    })

    it('extractHtml: 寫檔失敗須reject', async function() {
        let { res } = await run(() => extractHtml({ fpHtml: `${fdTmp}/no-such-dir/x.html` }))
        assert.strict.deepStrictEqual(res.state, 'reject', '寫檔失敗時應reject, 不得吞錯而resolve')
        assert.strict.ok(msgOf(res.e).includes('no-such-dir'), `實得: ${msgOf(res.e)}`)
    })

})


describe('formatOut iife僅支援runin browser(規則帳本R9)', function() {

    let fdTmp = './test/_tmp/buildIife'

    before(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fs.mkdirSync(fdTmp, { recursive: true })
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    //iife以全域識別子傳入external模組, nodejs版outer引用之worker_threads於任何環境皆非全域變數, 產物載入即ReferenceError, 故須於參數檢查即明確拒絕
    let isIifeReject = (e) => msgOf(e).includes('iife') && msgOf(e).includes('browser')

    it('rollupWorker: iife×nodejs、iife×both(runin預設)須reject並指明僅支援browser, 不產出產物', async function() {
        for (let runin of ['nodejs', 'both', undefined]) {
            let fpTar = `${fdTmp}/w-${runin}.wk.iife.js`
            let { res } = await run(() => rollupWorker({ name: 'gIifeW', type: 'function', fpSrc: path.resolve('./test-code-in', 'gWorker8_FunCrash.mjs'), fpTar, formatOut: 'iife', runin, bLog: false }))
            assert.strict.deepStrictEqual(res.state, 'reject', `runin[${runin}]應reject`)
            assert.strict.ok(isIifeReject(res.e), `runin[${runin}]實得: ${msgOf(res.e)}`)
            assert.strict.ok(!fs.existsSync(fpTar), `runin[${runin}]不得產出產物`)
        }
    })

    it('rollupParfor: iife×nodejs、iife×both(runin預設)須reject並指明僅支援browser, 不產出產物', async function() {
        for (let runin of ['nodejs', 'both', undefined]) {
            let fpTar = `${fdTmp}/pf-${runin}.pf.iife.js`
            let { res } = await run(() => rollupParfor({ name: 'gIifePf', fpSrc: path.resolve('./test-code-in', 'gParfor1_Fun.mjs'), fpTar, formatOut: 'iife', runin, bLog: false }))
            assert.strict.deepStrictEqual(res.state, 'reject', `runin[${runin}]應reject`)
            assert.strict.ok(isIifeReject(res.e), `runin[${runin}]實得: ${msgOf(res.e)}`)
            assert.strict.ok(!fs.existsSync(fpTar), `runin[${runin}]不得產出產物`)
        }
    })

    it('rollupWorkerCore: iife×nodejs須reject並指明僅支援browser', async function() {
        let { res } = await run(() => rollupWorkerCore({ name: 'gIifeC', type: 'function', fpSrc: path.resolve('./test-code-in', 'gWorker8_FunCrash.mjs'), bReturnCode: true, formatOut: 'iife', runin: 'nodejs', bLog: false }))
        assert.strict.deepStrictEqual(res.state, 'reject', '建置成功而產物載入即壞, 應於參數檢查即reject')
        assert.strict.ok(isIifeReject(res.e), `實得: ${msgOf(res.e)}`)
    })

})
