import path from 'path'
import fs from 'fs'
import assert from 'assert'
import rollupParfor from '../src/rollupParfor.mjs'
import hostProbe, { hasProcessListen } from './tools/hostProbe.mjs'
import childRun from './tools/childRun.mjs'
import createBrowserSim from './tools/browserSim.mjs'


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
        //先刪舊產物: 建置失敗時不會覆寫目標檔, 不先刪則可能沿用舊檔而假通過
        for (let fp of [fpTar, fpTarEs]) {
            try {
                fs.unlinkSync(fp)
            }
            catch (err) {}
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

    it('async cb 會被 await: parfor resolve 前 cb 全數完成, cb reject 傳染至 parfor', async function() {
        //沿用第一個測試產出的 umd bundle
        let url = `file://${fpTar.replace(/\\/g, '/')}?t=${Date.now()}`
        let mod = await import(url)
        let parfor = mod.default

        let count = 100000
        let pgs = [
            { count, p1: 11, p2: 'a' },
            { count, p1: 12, p2: 'b' },
            { count, p1: 13, p2: 'c' },
        ]

        //async cb: 每筆 delay 後才記錄, 若未被 await 則 parfor resolve 時 done 數必不足
        let done = []
        await parfor(pgs, {
            takeLimit: 2,
            returnResult: true,
            cb: async (r, k) => {
                await new Promise((resolve) => setTimeout(resolve, 50))
                done.push(k)
            },
        })
        assert.strict.deepStrictEqual(done.length, pgs.length, 'parfor resolve 前 async cb 應全數完成')

        //async cb reject 應使 parfor reject
        let err = null
        await parfor(pgs, {
            takeLimit: 2,
            returnResult: true,
            cb: async () => {
                throw new Error('cb-boom')
            },
        })
            .catch((e) => {
                err = e
            })
        assert.strict.ok(err !== null && String((err && err.message) || err).includes('cb-boom'), 'async cb reject 應傳染至 parfor')
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

    it('import parfor 產物(umd 與 es)不得於宿主註冊 process 監聽(規則帳本R1)', function() {
        //沿用前述兩個 it 產出之 umd 與 es 產物(parforCore 經 rollupWorker 產製, 預設 runin both 內含兩個 outer)
        assert.strict.ok(fs.existsSync(fpTar) && fs.existsSync(fpTarEs), 'umd 與 es 產物應已產出')
        let r = hostProbe([fpTar, fpTarEs], { mode: 'none' })

        //正向對照: 子程序須確實載入兩支產物
        assert.strict.ok(r.info !== null, `子程序未回報: ${r.stderr}`)
        assert.strict.deepStrictEqual(r.info.types, ['function', 'function'])

        //R1: import 後宿主 process 全部事件之監聽數皆不增
        assert.strict.deepStrictEqual(r.info.delta, {})

        //R1: 產物明文不含 process 監聽之註冊
        for (let fp of [fpTar, fpTarEs]) {
            assert.strict.ok(!hasProcessListen(fp), `${path.basename(fp)} 明文含process監聽註冊`)
        }
    })

    it('job 無法結構化複製: parfor reject 且宿主可自行退出(不得遺留 parforCore worker, 規則帳本R3⑦)', function() {
        //沿用第一個測試產出的 umd bundle; 以乾淨子程序驗宿主能否自行退出(遺留 worker 時子程序懸置至逾時)
        assert.strict.ok(fs.existsSync(fpTar), 'umd 產物應已產出')
        let r = childRun(`
    let { pathToFileURL } = require('url')
    let m = await import(pathToFileURL(process.argv[1]).href)
    let e = await m.default([{ count: 10, p1: 1, p2: 'a', f: () => 1 }], { takeLimit: 1, returnResult: true }).then(() => null, (err) => err)
    console.log('PFRES=' + JSON.stringify(String((e && e.message) || e)))
`, [fpTar], { timeout: 20000 })
        assert.strict.deepStrictEqual(r.timedOut, false, '宿主應可自行退出(不得遺留 worker)')
        assert.strict.deepStrictEqual(r.status, 0, `stderr: ${r.stderr}`)
        let m = r.stdout.match(/PFRES=(.*)/)
        assert.strict.ok(m && JSON.parse(m[1]).includes('could not be cloned'), `parfor 應以 DataCloneError reject, stdout: ${r.stdout}`)
    })

    describe('formatOut=iife(僅支援 runin browser, 規則帳本R9)', function() {

        let nameIife = 'gParforTest_Iife'
        let fpTarIife = path.resolve(fdTar, `${nameIife}.pf.iife.js`)

        before(async function() {
            this.timeout(60000)
            try {
                fs.unlinkSync(fpTarIife)
            }
            catch (err) {}
            await rollupParfor({
                name: nameIife,
                fpSrc,
                fpTar: fpTarIife,
                runin: 'browser',
                formatOut: 'iife',
                bLog: false,
            })
            assert.strict.ok(fs.existsSync(fpTarIife) && fs.statSync(fpTarIife).size > 0, '產物應已產出')
        })

        after(function() {
            try {
                fs.unlinkSync(fpTarIife)
            }
            catch (err) {}
        })

        it('iife×browser 產物於 vm 模擬瀏覽器可載入並平行計算', async function() {
            let sim = createBrowserSim()
            let parfor = sim.load(fs.readFileSync(fpTarIife, 'utf8'), nameIife)
            assert.strict.deepStrictEqual(typeof parfor, 'function')

            let count = 1000
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
            pgs.forEach((pg, k) => {
                assert.strict.ok(String(res[k]).includes('p1:' + pg.p1), `res[${k}] 應含 p1:${pg.p1}`)
                assert.strict.ok(String(got[k]).includes('p1:' + pg.p1), `cb got[${k}] 應含 p1:${pg.p1}`)
            })

            //R10: 每個 worker 皆被終止, 其 blob URL 皆已撤銷
            assert.strict.ok(sim.workers.length > 0 && sim.workers.every((wk) => wk.nTerminate >= 1))
            assert.strict.deepStrictEqual(sim.urls.revoked.length, sim.urls.created.length)
        })

    })

})
