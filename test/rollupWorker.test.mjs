import path from 'path'
import fs from 'fs'
import assert from 'assert'
import rollupWorker from '../src/rollupWorker.mjs'
import hostProbe, { hasProcessListen } from './tools/hostProbe.mjs'


describe('rollupWorker worker崩潰處理與宿主隔離', function() {

    let fdSrc = './test-code-in'
    let fdTar = './test/fixtures'
    let fpFun = path.resolve(fdTar, 'gWorkerCrashTest_Fun.wk.umd.js') //function+execFunctionByInstance(預設)
    let fpObj = path.resolve(fdTar, 'gWorkerCrashTest_Obj.wk.umd.js') //object+execObjectFunsByInstance(預設)
    let fpObjP = path.resolve(fdTar, 'gWorkerCrashTest_ObjP.wk.umd.js') //object持久實體(execObjectFunsByInstance=false)
    let fpBoth = path.resolve(fdTar, 'gWorkerCrashTest_Both.wk.umd.js') //function, runin both(產物內含nodejs與browser兩個outer)
    let fpBrowser = path.resolve(fdTar, 'gWorkerCrashTest_Browser.wk.umd.js') //function, runin browser(於Node引用以驗outer頂層副作用)
    let fpEs = path.resolve(fdTar, 'gWorkerCrashTest_Es.wk.mjs') //function, nodejs, formatOut es(es內容須用.mjs副檔名才會被node當ESM載入)
    let fps = [fpFun, fpObj, fpObjP, fpBoth, fpBrowser, fpEs]

    //全域uncaught/unhandled計數, 崩潰處理不得外溢
    let nUncaught = 0
    let onUncaught = () => {
        nUncaught += 1
    }

    //settle, 4秒內須settle, 否則視為懸置
    let settle = (pm) => Promise.race([
        pm.then((v) => ({ state: 'resolve', v })).catch((e) => ({ state: 'reject', e })),
        new Promise((resolve) => setTimeout(() => resolve({ state: 'hang' }), 4000)),
    ])

    before(async function() {
        this.timeout(60000)

        process.on('uncaughtException', onUncaught)
        process.on('unhandledRejection', onUncaught)

        if (!fs.existsSync(fdTar)) {
            fs.mkdirSync(fdTar, { recursive: true })
        }

        //先刪舊產物: rollupWorker會吞掉建置錯誤而照常resolve, 不先刪則建置失敗時可能沿用舊檔而假通過
        for (let fp of fps) {
            try {
                fs.unlinkSync(fp)
            }
            catch (err) {}
        }

        //function模式(預設execFunctionByInstance=true, 同rollupParfor之parforCore用法)
        await rollupWorker({
            name: 'gWorkerCrashTest_Fun',
            type: 'function',
            fpSrc: path.resolve(fdSrc, 'gWorker8_FunCrash.mjs'),
            fpTar: fpFun,
            formatOut: 'umd',
            runin: 'nodejs', //fixture用process.exit, 僅nodejs可測
            bLog: false,
        })

        //object模式(預設execObjectFunsByInstance=true, 各呼叫獨立worker)
        await rollupWorker({
            name: 'gWorkerCrashTest_Obj',
            type: 'object',
            funNames: ['tok', 'treject', 'tcrash', 'texit0', 'texit5'],
            fpSrc: path.resolve(fdSrc, 'gWorker7_ObjCrash.mjs'),
            fpTar: fpObj,
            formatOut: 'umd',
            runin: 'nodejs',
            bLog: false,
        })

        //object持久實體模式(execObjectFunsByInstance=false, 全部呼叫共用worker)
        await rollupWorker({
            name: 'gWorkerCrashTest_ObjP',
            type: 'object',
            funNames: ['tok', 'treject', 'tcrash', 'texit0', 'texit5'],
            fpSrc: path.resolve(fdSrc, 'gWorker7_ObjCrash.mjs'),
            fpTar: fpObjP,
            formatOut: 'umd',
            runin: 'nodejs',
            execObjectFunsByInstance: false,
            bLog: false,
        })

        //runin both(產物內含nodejs與browser兩個outer, 為outer頂層副作用之最大來源)
        await rollupWorker({
            name: 'gWorkerCrashTest_Both',
            type: 'function',
            fpSrc: path.resolve(fdSrc, 'gWorker8_FunCrash.mjs'),
            fpTar: fpBoth,
            formatOut: 'umd',
            runin: 'both',
            bLog: false,
        })

        //runin browser(於Node引用時protectShell提前返回, 但outer頂層程式碼仍會執行)
        await rollupWorker({
            name: 'gWorkerCrashTest_Browser',
            type: 'function',
            fpSrc: path.resolve(fdSrc, 'gWorker8_FunCrash.mjs'),
            fpTar: fpBrowser,
            formatOut: 'umd',
            runin: 'browser',
            bLog: false,
        })

        //formatOut es(輸出格式軸)
        await rollupWorker({
            name: 'gWorkerCrashTest_Es',
            type: 'function',
            fpSrc: path.resolve(fdSrc, 'gWorker8_FunCrash.mjs'),
            fpTar: fpEs,
            formatOut: 'es',
            runin: 'nodejs',
            bLog: false,
        })

        //產物須確實產出(防建置失敗被吞)
        for (let fp of fps) {
            assert.strict.ok(fs.existsSync(fp) && fs.statSync(fp).size > 0, `產物應已產出: ${path.basename(fp)}`)
        }
    })

    after(function() {
        process.off('uncaughtException', onUncaught)
        process.off('unhandledRejection', onUncaught)
        for (let fp of fps) {
            try {
                fs.unlinkSync(fp)
            }
            catch (err) {}
        }
    })

    //impFresh: 取得產物之預設匯出供呼叫用; 註: UMD(CJS)產物以檔名快取, 加查詢字串不會重新求值頂層(同一行程內取得的是同一實例), 僅ESM產物會重新求值,
    //故量測import之副作用(如宿主監聽註冊)不可在本行程內做, 須用乾淨子程序(見tools/hostProbe.mjs)
    let impFresh = async (fp) => {
        let url = `file://${fp.replace(/\\/g, '/')}?t=${Date.now()}-${Math.random()}`
        let mod = await import(url)
        return mod.default
    }

    describe('function模式(execFunctionByInstance=true)', function() {

        it('正常回傳: resolve(基準)', async function() {
            let wf = await impFresh(fpFun)
            let r = await settle(wf('ok'))
            assert.strict.deepStrictEqual(r, { state: 'resolve', v: 'OK' })
        })

        it('函數內reject: reject(既有路徑不受影響)', async function() {
            let wf = await impFresh(fpFun)
            let r = await settle(wf('reject'))
            assert.strict.deepStrictEqual(r.state, 'reject')
            assert.strict.ok(String(r.e).includes('expected-reject'))
        })

        it('worker內uncaughtException: 須reject而非懸置', async function() {
            let wf = await impFresh(fpFun)
            let r = await settle(wf('crash'))
            assert.strict.deepStrictEqual(r.state, 'reject', 'worker崩潰時pending promise應reject, 不得懸置')
            assert.strict.ok(String((r.e && r.e.message) || r.e).includes('worker-crash'), '應收到崩潰錯誤訊息')
        })

        it('worker內process.exit(0): 須reject而非懸置', async function() {
            let wf = await impFresh(fpFun)
            let r = await settle(wf('exit0'))
            assert.strict.deepStrictEqual(r.state, 'reject', 'worker退出(code 0)時pending promise應reject, 不得懸置')
        })

        it('worker內process.exit(5): 須reject而非懸置', async function() {
            let wf = await impFresh(fpFun)
            let r = await settle(wf('exit5'))
            assert.strict.deepStrictEqual(r.state, 'reject', 'worker退出(code 5)時pending promise應reject, 不得懸置')
        })

    })

    describe('object模式(execObjectFunsByInstance=true)', function() {

        it('正常回傳: resolve(基準)', async function() {
            let wo = await impFresh(fpObj)
            let r = await settle(wo.tok(1))
            assert.strict.deepStrictEqual(r, { state: 'resolve', v: 'ok:1' })
        })

        it('worker內uncaughtException: 須reject而非懸置', async function() {
            let wo = await impFresh(fpObj)
            let r = await settle(wo.tcrash())
            assert.strict.deepStrictEqual(r.state, 'reject', 'worker崩潰時pending promise應reject, 不得懸置')
        })

    })

    describe('object持久實體模式(execObjectFunsByInstance=false)', function() {

        it('worker崩潰: pending reject, error事件可監聽, 後續呼叫立即reject', async function() {
            let wo = await impFresh(fpObjP)

            //error事件監聽者應可收到
            let evErr = null
            wo.on('error', (err) => {
                evErr = err
            })

            //正常呼叫(基準)
            let r0 = await settle(wo.tok(9))
            assert.strict.deepStrictEqual(r0, { state: 'resolve', v: 'ok:9' })

            //崩潰: pending應reject
            let r1 = await settle(wo.tcrash())
            assert.strict.deepStrictEqual(r1.state, 'reject', 'worker崩潰時pending promise應reject, 不得懸置')

            //error事件應已發出
            assert.strict.ok(evErr !== null, 'on(error)監聽者應收到錯誤')

            //崩潰後之後續呼叫: 應立即reject, 不得懸置
            let r2 = await settle(wo.tok(1))
            assert.strict.deepStrictEqual(r2.state, 'reject', 'worker已死後之呼叫應立即reject, 不得懸置')
        })

    })

    describe('宿主隔離: 產物import不得於宿主註冊process監聽(規則帳本R1)', function() {

        it('import nodejs/object/持久實體/both/browser/es各型產物後, 宿主process全部事件之監聽數皆不增', function() {
            let r = hostProbe(fps, { mode: 'none' })

            //正向對照: 子程序須確實載入全部產物, 防import失敗或路徑錯誤而因「沒有監聽」假通過
            assert.strict.ok(r.info !== null, `子程序未回報: ${r.stderr}`)
            assert.strict.deepStrictEqual(r.info.types, ['function', 'object', 'object', 'function', 'undefined', 'function'])

            //R1: outer層不於宿主註冊任何process監聽(含uncaughtExceptionMonitor)
            assert.strict.deepStrictEqual(r.info.delta, {})
        })

        it('宿主未捕捉例外: 錯誤只由Node印出一次(stderr 1次、stdout 0次)並以exit 1終止', function() {
            let r = hostProbe(fps, { mode: 'throw' })
            assert.strict.ok(r.info !== null, `子程序未回報: ${r.stderr}`)

            //R1: 宿主未捕捉錯誤之處置屬宿主, 函式庫不攔截(維持exit 1)、不重印(stdout 0次)
            assert.strict.deepStrictEqual(r.status, 1)
            assert.strict.deepStrictEqual(r.nStderr, 1)
            assert.strict.deepStrictEqual(r.nStdout, 0)
        })

        it('宿主未處理rejection(Node預設throw模式): 錯誤只由Node印出一次並以exit 1終止', function() {
            let r = hostProbe(fps, { mode: 'reject' })
            assert.strict.ok(r.info !== null, `子程序未回報: ${r.stderr}`)

            //R1: 同上, rejection於throw模式下轉為未捕捉例外, 函式庫不得重印
            assert.strict.deepStrictEqual(r.status, 1)
            assert.strict.deepStrictEqual(r.nStderr, 1)
            assert.strict.deepStrictEqual(r.nStdout, 0)
        })

        it('產物明文不得含process監聽之註冊(涵蓋Node無法執行到之瀏覽器/類Electron宿主路徑)', function() {
            //R1: outer模板不含任何process監聽註冊; inner為base64不在明文, 明文只有outer層與其內嵌之函式庫
            for (let fp of fps) {
                assert.strict.ok(!hasProcessListen(fp), `${path.basename(fp)} 明文含process監聽註冊`)
            }
        })

    })

    describe('衛生', function() {

        it('全部崩潰處理不得外溢uncaughtException或unhandledRejection', async function() {
            await new Promise((resolve) => setTimeout(resolve, 300))
            assert.strict.deepStrictEqual(nUncaught, 0)
        })

    })

})
