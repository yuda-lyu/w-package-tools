import path from 'path'
import fs from 'fs'
import assert from 'assert'
import { pathToFileURL } from 'url'
import { createRequire } from 'module'
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
    let fpUnminSame = path.resolve(fdTar, 'gWorkerCrashTest_UnminSame.wk.umd.js') //function, bMinify false, name與原始碼default export同名
    let fpUnminDiff = path.resolve(fdTar, 'gWorkerCrashTest_UnminDiff.wk.umd.js') //function, bMinify false, name與原始碼default export不同名
    let fps = [fpFun, fpObj, fpObjP, fpBoth, fpBrowser, fpEs, fpUnminSame, fpUnminDiff]
    let copies = [] //impCopy所建之複本, after時刪除

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
            funNames: ['tok', 'treject', 'tcrash', 'texit0', 'texit5', 'thang'],
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
            funNames: ['tok', 'treject', 'tcrash', 'texit0', 'texit5', 'thang'],
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

        //bMinify false且name與原始碼default export同名(結尾module.exports = gWorker8_FunCrash;)
        await rollupWorker({
            name: 'gWorker8_FunCrash',
            type: 'function',
            fpSrc: path.resolve(fdSrc, 'gWorker8_FunCrash.mjs'),
            fpTar: fpUnminSame,
            formatOut: 'umd',
            runin: 'nodejs',
            bMinify: false,
            bLog: false,
        })

        //bMinify false且name與原始碼default export不同名(結尾仍為module.exports = gWorker8_FunCrash;)
        await rollupWorker({
            name: 'gWorkerCrashTest_UnminDiff',
            type: 'function',
            fpSrc: path.resolve(fdSrc, 'gWorker8_FunCrash.mjs'),
            fpTar: fpUnminDiff,
            formatOut: 'umd',
            runin: 'nodejs',
            bMinify: false,
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
        for (let fp of [...fps, ...copies]) {
            try {
                fs.unlinkSync(fp)
            }
            catch (err) {}
        }
    })

    //impCopy: 複製產物為新檔名後import, 以取得新實例(UMD以檔名快取, 持久實體須新實例才能各自驗生命週期)
    let impCopy = async (fp) => {
        let fpc = fp.replace(/\.wk\.umd\.js$/, `.copy${copies.length}.wk.umd.js`)
        fs.copyFileSync(fp, fpc)
        copies.push(fpc)
        let mod = await import(pathToFileURL(fpc).href)
        return mod.default
    }

    //withCtorFail: 期間內令worker_threads.Worker建構時拋出指定訊息之錯誤(UMD產物於呼叫時才取用模組物件之Worker), 結束必還原
    let wt = createRequire(import.meta.url)('worker_threads')
    let withCtorFail = async (msg, fn) => {
        let WorkerOri = wt.Worker
        wt.Worker = class {
            constructor() {
                throw new Error(msg)
            }
        }
        try {
            return await fn()
        }
        finally {
            wt.Worker = WorkerOri
        }
    }

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

        it('import nodejs/object/持久實體/both/browser/es/未壓縮各型產物後, 宿主process全部事件之監聽數皆不增', function() {
            let r = hostProbe(fps, { mode: 'none' })

            //正向對照: 子程序須確實載入全部產物, 防import失敗或路徑錯誤而因「沒有監聽」假通過
            assert.strict.ok(r.info !== null, `子程序未回報: ${r.stderr}`)
            assert.strict.deepStrictEqual(r.info.types, ['function', 'object', 'object', 'function', 'undefined', 'function', 'function', 'function'])

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

    describe('生命週期: 主動terminate與建立失敗時呼叫端必有結果(規則帳本R3)', function() {

        it('持久實體: terminate時呼叫中之pending須以worker has been terminated reject, 且不發error事件', async function() {
            let wo = await impCopy(fpObjP)
            let evErrs = []
            wo.on('error', (err) => {
                evErrs.push(err)
            })

            //基準: 正常呼叫
            let r0 = await settle(wo.tok(1))
            assert.strict.deepStrictEqual(r0, { state: 'resolve', v: 'ok:1' })

            //呼叫中(永不settle)時主動terminate
            let pm = wo.thang()
            wo.terminate()
            let r1 = await settle(pm)

            //R3: 主動中止後worker不再回應, 呼叫中之pending須reject而非懸置
            assert.strict.deepStrictEqual(r1.state, 'reject', 'terminate時呼叫中之pending應reject, 不得懸置')
            assert.strict.ok(String(r1.e).includes('worker has been terminated'))

            //R3: 主動中止屬預期操作, 不發error事件
            assert.strict.deepStrictEqual(evErrs.length, 0)
        })

        it('持久實體: terminate後之呼叫須立即reject(不得同步拋錯或懸置)', async function() {
            let wo = await impCopy(fpObjP)
            wo.terminate()

            //R3: 終止後之呼叫為死後呼叫, 須回reject之promise, 不得因worker已釋放而同步拋TypeError
            let pm = null
            assert.strict.doesNotThrow(() => {
                pm = wo.tok(1)
            }, 'terminate後之呼叫不得同步拋錯')
            let r = await settle(pm)
            assert.strict.deepStrictEqual(r.state, 'reject', 'terminate後之呼叫應立即reject')
            assert.strict.ok(String(r.e).includes('worker has been terminated'))
        })

        it('建立失敗(function, 每次呼叫新建): 呼叫須以原始錯誤reject', async function() {
            let wf = await impFresh(fpFun)
            let r = await withCtorFail('ctor-fail-fun', () => settle(wf('ok')))

            //R3: 建立失敗之原始錯誤須交到呼叫端, 不得變成對null取值之TypeError
            assert.strict.deepStrictEqual(r.state, 'reject')
            assert.strict.ok(String((r.e && r.e.message) || r.e).includes('ctor-fail-fun'), `應收到原始錯誤, 實得: ${(r.e && r.e.message) || r.e}`)
        })

        it('建立失敗(object, 每次呼叫新建): 呼叫須以原始錯誤reject', async function() {
            let wo = await impFresh(fpObj)
            let r = await withCtorFail('ctor-fail-obj', () => settle(wo.tok(1)))

            //R3: 同上
            assert.strict.deepStrictEqual(r.state, 'reject')
            assert.strict.ok(String((r.e && r.e.message) || r.e).includes('ctor-fail-obj'), `應收到原始錯誤, 實得: ${(r.e && r.e.message) || r.e}`)
        })

        it('建立失敗(object持久, import時建立): 匯出不得為null, 呼叫須以原始錯誤reject', async function() {
            let res = await withCtorFail('ctor-fail-objp', async () => {
                let wo = await impCopy(fpObjP)
                if (wo === null) {
                    return { type: 'null' }
                }
                return { type: typeof wo, r: await settle(wo.tok(1)) }
            })

            //R3: 建立失敗時仍須回傳可呼叫之物件, 呼叫以原始錯誤reject
            assert.strict.deepStrictEqual(res.type, 'object', '建立失敗時匯出不得為null')
            assert.strict.deepStrictEqual(res.r.state, 'reject')
            assert.strict.ok(String((res.r.e && res.r.e.message) || res.r.e).includes('ctor-fail-objp'))
        })

    })

    describe('clearExportCode: bMinify不影響產物正確性(規則帳本R7)', function() {

        it('bMinify false且name與原始碼default export同名: 產物可正常呼叫', async function() {
            let wf = await impFresh(fpUnminSame)
            let r = await settle(wf('ok'))
            assert.strict.deepStrictEqual(r, { state: 'resolve', v: 'OK' })
        })

        it('bMinify false且name與原始碼default export不同名: 產物可正常呼叫(不得產出inner為undefined之壞產物)', async function() {
            let wf = await impFresh(fpUnminDiff)
            let r = await settle(wf('ok'))

            //R7: bMinify只影響體積, 不得影響產物能否使用
            assert.strict.deepStrictEqual(r, { state: 'resolve', v: 'OK' })
        })

    })

    describe('衛生', function() {

        it('全部崩潰處理不得外溢uncaughtException或unhandledRejection', async function() {
            await new Promise((resolve) => setTimeout(resolve, 300))
            assert.strict.deepStrictEqual(nUncaught, 0)
        })

    })

})
