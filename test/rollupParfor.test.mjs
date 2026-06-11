import path from 'path'
import fs from 'fs'
import assert from 'assert'
import rollupParfor from '../src/rollupParfor.mjs'


describe('rollupParfor', function() {

    let fdSrc = './test-code-in'
    let fdTar = './test/fixtures'
    let name = 'gParforTest_Fun'
    let fpSrc = path.resolve(fdSrc, 'gParfor1_Fun.mjs') //沿用既有 parfor core 範例檔
    let fpTar = path.resolve(fdTar, `${name}.pf.umd.js`)
    let fpTarEs = path.resolve(fdTar, `${name}.pf.mjs`) //es 內容須用 .mjs 副檔名才會被 node 當 ESM 載入

    before(function() {
        if (!fs.existsSync(fdTar)) {
            fs.mkdirSync(fdTar, { recursive: true })
        }
    })

    after(function() {
        for (let fp of [fpTar, fpTarEs]) {
            try {
                fs.unlinkSync(fp) //清掉產出的 bundle, 不污染 repo
            }
            catch (err) {}
        }
    })

    it('轉譯後產出 parfor bundle 檔', async function() {
        await rollupParfor({
            name,
            fpSrc,
            fpTar,
            runin: 'both',
            formatOut: 'umd', //umd 帶 worker 封裝且可被 node import 執行(對齊 nodejsParforExam1 用法)
            bLog: false,
        })
        assert.strict.ok(fs.existsSync(fpTar), 'fpTar 應存在')
        let code = fs.readFileSync(fpTar, 'utf8')
        assert.strict.ok(code.length > 0, 'bundle 不應為空')
    })

    it('轉譯後的 parfor bundle 可平行計算並回傳正確結果', async function() {
        //import 上一步產出的 bundle 直接執行(加 query 避開 ESM module cache)
        let url = `file://${fpTar.replace(/\\/g, '/')}?t=${Date.now()}`
        let mod = await import(url)
        let parfor = mod.default

        let count = 100000 //小量計算即可驗證, 不需大數
        let pgs = [
            { count, p1: 11, p2: 'a' },
            { count, p1: 12, p2: 'b' },
            { count, p1: 13, p2: 'c' },
        ]

        let got = {}
        let res = await parfor(pgs, {
            takeLimit: 2,
            cb: (r, k) => {
                got[k] = r
            },
            returnResult: true,
        })

        assert.strict.deepStrictEqual(res.length, pgs.length)
        //核心函數回傳字串含 'p1:<p1>', 逐筆驗證對位正確
        pgs.forEach((pg, k) => {
            assert.strict.ok(String(res[k]).includes('p1:' + pg.p1), `res[${k}] 應含 p1:${pg.p1}`)
            assert.strict.ok(String(got[k]).includes('p1:' + pg.p1), `cb got[${k}] 應含 p1:${pg.p1}`)
        })
    })

    it('formatOut=es 產出真 ES module 且可平行計算', async function() {
        await rollupParfor({
            name,
            fpSrc,
            fpTar: fpTarEs,
            runin: 'both',
            formatOut: 'es', //真 ES 輸出(import/export), 對應 .mjs 副檔名
            bLog: false,
        })
        assert.strict.ok(fs.existsSync(fpTarEs), 'fpTarEs 應存在')

        //驗證內容確實是 ES module(含 import/export), 而非 umd/iife
        let code = fs.readFileSync(fpTarEs, 'utf8')
        assert.strict.ok(/(^|\b)import\b/.test(code) && /export\s*\{|export default/.test(code), 'bundle 應為 ES module(含 import 與 export)')
        assert.strict.ok(!/typeof exports.*module\.exports/.test(code), 'bundle 不應為 umd 包裝')

        //import 執行(.mjs 被 node 當 ESM), 驗證可平行計算
        let url = `file://${fpTarEs.replace(/\\/g, '/')}?t=${Date.now()}`
        let mod = await import(url)
        let parfor = mod.default
        assert.strict.deepStrictEqual(typeof parfor, 'function', 'ES module default 應為函數')

        let count = 100000
        let pgs = [
            { count, p1: 11, p2: 'a' },
            { count, p1: 12, p2: 'b' },
        ]
        let res = await parfor(pgs, { takeLimit: 2, returnResult: true, cb: () => {} })
        assert.strict.deepStrictEqual(res.length, pgs.length)
        pgs.forEach((pg, k) => {
            assert.strict.ok(String(res[k]).includes('p1:' + pg.p1), `res[${k}] 應含 p1:${pg.p1}`)
        })
    })

})
