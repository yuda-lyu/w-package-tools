import path from 'path'
import fs from 'fs'
import assert from 'assert'
import { pathToFileURL } from 'url'
import rollupWorker from '../src/rollupWorker.mjs'
import hostProbe, { hasProcessListen } from './tools/hostProbe.mjs'
import childRun from './tools/childRun.mjs'
import createBrowserSim from './tools/browserSim.mjs'
import { withCtorFail, withCtorSpy, waitExit } from './tools/workerCtor.mjs'


describe('rollupWorker worker崩潰處理與宿主隔離', function() {

    let fdSrc = './test-code-in'
    let fdTar = './test/fixtures'
    let fpFun = path.resolve(fdTar, 'gWorkerCrashTest_Fun.wk.umd.js') //function+execFunctionByInstance(預設)
    let fpObj = path.resolve(fdTar, 'gWorkerCrashTest_Obj.wk.umd.js') //object+execObjectFunsByInstance(預設)
    let fpObjP = path.resolve(fdTar, 'gWorkerCrashTest_ObjP.wk.umd.js') //object持久實體(execObjectFunsByInstance=false)
    let fpBoth = path.resolve(fdTar, 'gWorkerCrashTest_Both.wk.umd.js') //function, runin both(產物內含nodejs與browser兩個outer)
    let fpBrowser = path.resolve(fdTar, 'gWorkerCrashTest_Browser.wk.umd.js') //function, runin browser(於Node引用以驗outer頂層副作用; 於vm模擬瀏覽器驗瀏覽器端行為)
    let fpEs = path.resolve(fdTar, 'gWorkerCrashTest_Es.wk.mjs') //function, nodejs, formatOut es(es內容須用.mjs副檔名才會被node當ESM載入)
    let fpUnminSame = path.resolve(fdTar, 'gWorkerCrashTest_UnminSame.wk.umd.js') //function, bMinify false, name與原始碼default export同名
    let fpUnminDiff = path.resolve(fdTar, 'gWorkerCrashTest_UnminDiff.wk.umd.js') //function, bMinify false, name與原始碼default export不同名
    let fpFac = path.resolve(fdTar, 'gWorkerCloneTest_Fac.wk.umd.js') //function工廠(execFunctionByInstance=false, 同w-pubsub client用法), nodejs
    let fpFacBr = path.resolve(fdTar, 'gWorkerCloneTest_FacBr.wk.umd.js') //function工廠, runin browser(於vm模擬瀏覽器驗瀏覽器端行為)
    let fps = [fpFun, fpObj, fpObjP, fpBoth, fpBrowser, fpEs, fpUnminSame, fpUnminDiff, fpFac, fpFacBr]
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

    //msgOf, 錯誤訊息字串(錯誤可能為Error、字串或模擬瀏覽器之事件物件)
    let msgOf = (e) => String((e && e.message) || e)

    //sleep
    let sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    before(async function() {
        this.timeout(60000)

        process.on('uncaughtException', onUncaught)
        process.on('unhandledRejection', onUncaught)

        if (!fs.existsSync(fdTar)) {
            fs.mkdirSync(fdTar, { recursive: true })
        }

        //先刪舊產物: 建置失敗時不會覆寫目標檔, 不先刪則可能沿用舊檔而假通過
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
            funNames: ['tok', 'treject', 'tcrash', 'texit0', 'texit5', 'thang', 'tmsgerr', 'tpostnull'],
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
            funNames: ['tok', 'treject', 'tcrash', 'texit0', 'texit5', 'thang', 'tmsgerr', 'tpostnull'],
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

        //function工廠(execFunctionByInstance=false), nodejs: 驗結構化複製失敗之處置
        let optFac = {
            type: 'function',
            execFunctionByInstance: false,
            funNames: ['tok', 'tsync', 'tretfn', 'trejfn', 'temitLater', 'temitNow', 'temitOk', 'thang'],
            evNames: ['evt'],
            fpSrc: path.resolve(fdSrc, 'gWorker9_FunClone.mjs'),
            formatOut: 'umd',
            bLog: false,
        }
        await rollupWorker({
            ...optFac,
            name: 'gWorkerCloneTest_Fac',
            fpTar: fpFac,
            runin: 'nodejs',
        })

        //function工廠, runin browser: 於vm模擬瀏覽器驗瀏覽器端行為
        await rollupWorker({
            ...optFac,
            name: 'gWorkerCloneTest_FacBr',
            fpTar: fpFacBr,
            runin: 'browser',
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

    //withCtorFail、withCtorSpy、waitExit: 見tools/workerCtor.mjs(UMD產物於建立worker時才取用模組物件之Worker, 故可暫換攔截)

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

        it('import nodejs/object/持久實體/both/browser/es/未壓縮/工廠各型產物後, 宿主process全部事件之監聽數皆不增', function() {
            let r = hostProbe(fps, { mode: 'none' })

            //正向對照: 子程序須確實載入全部產物, 防import失敗或路徑錯誤而因「沒有監聽」假通過
            assert.strict.ok(r.info !== null, `子程序未回報: ${r.stderr}`)
            assert.strict.deepStrictEqual(r.info.types, ['function', 'object', 'object', 'function', 'undefined', 'function', 'function', 'function', 'function', 'undefined'])

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

    describe('訊息反序列化失敗(messageerror)時呼叫端必有結果(規則帳本R3)', function() {

        //註: 真實之反序列化失敗難以製造, 以Node於該情形發出之事件模擬(〔模擬事件〕): 宿主端對Worker實體emit, worker端由fixture對parentPort emit

        it('宿主端(worker回傳之訊息)反序列化失敗, 持久實體: 呼叫中之pending須reject並發error事件, worker仍可服務', async function() {
            let { r: wo, created } = await withCtorSpy(() => impCopy(fpObjP))
            assert.strict.deepStrictEqual(created.length, 1)
            let evErrs = []
            wo.on('error', (err) => {
                evErrs.push(String((err && err.message) || err))
            })

            let pm = wo.thang()
            created[0].emit('messageerror', new Error('msgerr-out'))
            let r1 = await settle(pm)

            //R3: 無法得知失敗之訊息屬哪個呼叫, 須整批reject呼叫中之pending而非懸置
            assert.strict.deepStrictEqual(r1.state, 'reject', 'messageerror時呼叫中之pending應reject, 不得懸置')
            assert.strict.ok(String((r1.e && r1.e.message) || r1.e).includes('msgerr-out'))

            //R3: 有訊息遺失須讓監聽者知道
            assert.strict.deepStrictEqual(evErrs, ['msgerr-out'])

            //R3: worker本身仍可服務, 不標死亡
            let r2 = await settle(wo.tok(1))
            assert.strict.deepStrictEqual(r2, { state: 'resolve', v: 'ok:1' })
            wo.terminate()
        })

        it('宿主端反序列化失敗, function每次呼叫新建: 呼叫須reject', async function() {
            let wf = await impFresh(fpFun)
            let { r: obj, created } = await withCtorSpy(() => ({ pm: wf('hang') })) //包成物件回傳, 不await永不settle之呼叫
            assert.strict.deepStrictEqual(created.length, 1)
            created[0].emit('messageerror', new Error('msgerr-out-fun'))
            let r = await settle(obj.pm)

            //R3: 同上
            assert.strict.deepStrictEqual(r.state, 'reject', 'messageerror時呼叫應reject, 不得懸置')
            assert.strict.ok(String((r.e && r.e.message) || r.e).includes('msgerr-out-fun'))
        })

        it('worker端(宿主送去之訊息)反序列化失敗, 持久實體: 呼叫中之pending須reject, worker仍可服務', async function() {
            let wo = await impCopy(fpObjP)
            let evErrs = []
            wo.on('error', (err) => {
                evErrs.push(String((err && err.message) || err))
            })

            //fixture之tmsgerr於worker內對parentPort發出messageerror且本身永不settle
            let r1 = await settle(wo.tmsgerr())

            //R3: worker端收不到宿主之訊息時須通知外層, 呼叫中之pending整批reject而非懸置
            assert.strict.deepStrictEqual(r1.state, 'reject', 'worker端messageerror時呼叫中之pending應reject, 不得懸置')
            assert.strict.ok(String((r1.e && r1.e.message) || r1.e).includes('msgerr-in'))
            assert.strict.deepStrictEqual(evErrs, ['msgerr-in'])

            //R3: worker仍可服務
            let r2 = await settle(wo.tok(2))
            assert.strict.deepStrictEqual(r2, { state: 'resolve', v: 'ok:2' })
            wo.terminate()
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

    describe('結構化複製失敗: worker回傳之內容無法複製時呼叫端必有具名結果且worker續可服務(規則帳本R3⑥)', function() {

        //Node修正前: inner之postMessage同步拋DataCloneError於呼叫路徑外, worker崩潰(呼叫只得空訊息Error, 持久與工廠實體從此死亡); 瀏覽器修正前為永久懸置(見「瀏覽器端」)

        it('回傳值無法複製(工廠): 呼叫以具名原因reject, 之後呼叫照常', async function() {
            let fac = await impFresh(fpFac)
            let ev = fac('normal')
            let r1 = await settle(ev.tretfn())
            assert.strict.deepStrictEqual(r1.state, 'reject')
            assert.strict.ok(msgOf(r1.e).includes('return value of function[tretfn] could not be cloned'), `實得: ${msgOf(r1.e)}`)
            let r2 = await settle(ev.tok(1))
            assert.strict.deepStrictEqual(r2, { state: 'resolve', v: 'ok:1' }, 'worker不得因此崩潰')
            ev.terminate()
        })

        it('reject值無法複製(工廠): 呼叫以具名原因reject, 之後呼叫照常', async function() {
            let fac = await impFresh(fpFac)
            let ev = fac('normal')
            let r1 = await settle(ev.trejfn())
            assert.strict.deepStrictEqual(r1.state, 'reject')
            assert.strict.ok(msgOf(r1.e).includes('rejected value of function[trejfn] could not be cloned'), `實得: ${msgOf(r1.e)}`)
            let r2 = await settle(ev.tok(2))
            assert.strict.deepStrictEqual(r2, { state: 'resolve', v: 'ok:2' }, 'worker不得因此崩潰')
            ev.terminate()
        })

        it('回傳值無法複製(function每次呼叫新建): 呼叫以具名原因reject', async function() {
            let wf = await impFresh(fpFun)
            let r = await settle(wf('retfn'))
            assert.strict.deepStrictEqual(r.state, 'reject')
            assert.strict.ok(msgOf(r.e).includes('return value of function[') && msgOf(r.e).includes('could not be cloned'), `實得: ${msgOf(r.e)}`)
        })

        it('事件內容無法複製且於呼叫路徑外emit(工廠): 改發error事件說明, 原事件不送達, worker續可服務', async function() {
            let fac = await impFresh(fpFac)
            let ev = fac('normal')
            let evErrs = []
            let evts = []
            ev.on('error', (err) => {
                evErrs.push(msgOf(err))
            })
            ev.on('evt', (msg) => {
                evts.push(msg)
            })
            let r1 = await settle(ev.temitLater())
            assert.strict.deepStrictEqual(r1, { state: 'resolve', v: 'scheduled' })
            await sleep(300)
            assert.strict.deepStrictEqual(evErrs.length, 1, `實得: ${JSON.stringify(evErrs)}`)
            assert.strict.ok(evErrs[0].includes('payload of event[evt] could not be cloned'), `實得: ${evErrs[0]}`)
            assert.strict.deepStrictEqual(evts, [])
            let r2 = await settle(ev.tok(3))
            assert.strict.deepStrictEqual(r2, { state: 'resolve', v: 'ok:3' }, 'worker不得因此崩潰')
            ev.terminate()
        })

        it('事件內容無法複製且於呼叫路徑內emit(工廠): 該呼叫照常resolve並改發error事件說明', async function() {
            let fac = await impFresh(fpFac)
            let ev = fac('normal')
            let evErrs = []
            ev.on('error', (err) => {
                evErrs.push(msgOf(err))
            })
            let r1 = await settle(ev.temitNow())
            assert.strict.deepStrictEqual(r1, { state: 'resolve', v: 'emitted' }, '事件送出失敗不得改變使用者函數之結果')
            assert.strict.deepStrictEqual(evErrs.length, 1, `實得: ${JSON.stringify(evErrs)}`)
            assert.strict.ok(evErrs[0].includes('payload of event[evt] could not be cloned'), `實得: ${evErrs[0]}`)
            ev.terminate()
        })

        it('事件內容可複製(基準, 工廠): 監聽者收到原內容', async function() {
            let fac = await impFresh(fpFac)
            let ev = fac('normal')
            let evts = []
            ev.on('evt', (msg) => {
                evts.push(msg)
            })
            let r1 = await settle(ev.temitOk(7))
            assert.strict.deepStrictEqual(r1, { state: 'resolve', v: 'emitted' })
            assert.strict.deepStrictEqual(evts, ['payload:7'])
            ev.terminate()
        })

        it('非async函數(工廠): 回傳值照常交付, 不得因呼叫.then而失敗', async function() {
            let fac = await impFresh(fpFac)
            let ev = fac('normal')
            let r1 = await settle(ev.tsync(1))
            assert.strict.deepStrictEqual(r1, { state: 'resolve', v: 'sync:1' })
            ev.terminate()
        })

        it('初始化失敗(工廠, 錯誤可複製): 發error事件, 其後呼叫以初始化之原始錯誤reject(不得為對null取值之TypeError)', async function() {
            let fac = await impFresh(fpFac)
            let ev = fac('initThrow')
            let evErrs = []
            ev.on('error', (err) => {
                evErrs.push(msgOf(err))
            })
            let r1 = await settle(ev.tok(1))
            assert.strict.deepStrictEqual(r1.state, 'reject')
            assert.strict.ok(msgOf(r1.e).includes('init-fail'), `應收到初始化之原始錯誤, 實得: ${msgOf(r1.e)}`)
            assert.strict.deepStrictEqual(evErrs, ['init-fail'])
            ev.terminate()
        })

        it('初始化失敗(工廠, 錯誤無法複製): error事件與其後呼叫皆得具名說明, worker不崩潰', async function() {
            let fac = await impFresh(fpFac)
            let ev = fac('initThrowFun')
            let evErrs = []
            ev.on('error', (err) => {
                evErrs.push(msgOf(err))
            })
            let r1 = await settle(ev.tok(1))
            assert.strict.deepStrictEqual(r1.state, 'reject')
            assert.strict.ok(msgOf(r1.e).includes('init error could not be cloned'), `實得: ${msgOf(r1.e)}`)
            assert.strict.deepStrictEqual(evErrs.length, 1, `實得: ${JSON.stringify(evErrs)}`)
            assert.strict.ok(evErrs[0].includes('init error could not be cloned'), `實得: ${evErrs[0]}`)
            ev.terminate()
        })

    })

    describe('結構化複製失敗: 宿主送出之引數無法複製時回reject、不殘留pending、不遺留worker(規則帳本R3⑦)', function() {

        it('持久實體: 呼叫回傳rejected promise(不同步拋錯), 之後呼叫照常, terminate不產生未處理rejection', async function() {
            let wo = await impCopy(fpObjP)
            let pm = null
            assert.strict.doesNotThrow(() => {
                pm = wo.tok(() => 1)
            }, '回傳promise之API不得同步拋錯')
            let r1 = await settle(pm)
            assert.strict.deepStrictEqual(r1.state, 'reject')
            assert.strict.ok(msgOf(r1.e).includes('could not be cloned'), `實得: ${msgOf(r1.e)}`)
            let r2 = await settle(wo.tok(1))
            assert.strict.deepStrictEqual(r2, { state: 'resolve', v: 'ok:1' })

            //失敗之呼叫不得殘留pending: 否則terminate時被整批reject而無人處理, 成宿主未處理rejection(Node預設即exit 1)
            let n0 = nUncaught
            wo.terminate()
            await sleep(200)
            assert.strict.deepStrictEqual(nUncaught - n0, 0)
        })

        it('function每次呼叫新建: 呼叫reject且該次建立之worker須被終止(不得遺留而撐住宿主)', async function() {
            let wf = await impFresh(fpFun)
            let { r: obj, created } = await withCtorSpy(() => ({ pm: wf(() => 1) }))
            let r = await settle(obj.pm)
            assert.strict.deepStrictEqual(r.state, 'reject')
            assert.strict.ok(msgOf(r.e).includes('could not be cloned'), `實得: ${msgOf(r.e)}`)
            assert.strict.deepStrictEqual(created.length, 1)
            assert.strict.ok(await waitExit(created[0]), '該次建立之worker應已被終止')
        })

        it('object每次呼叫新建: 呼叫reject且該次建立之worker須被終止(不得遺留而撐住宿主)', async function() {
            let wo = await impFresh(fpObj)
            let { r: obj, created } = await withCtorSpy(() => ({ pm: wo.tok(() => 1) }))
            let r = await settle(obj.pm)
            assert.strict.deepStrictEqual(r.state, 'reject')
            assert.strict.ok(msgOf(r.e).includes('could not be cloned'), `實得: ${msgOf(r.e)}`)
            assert.strict.deepStrictEqual(created.length, 1)
            assert.strict.ok(await waitExit(created[0]), '該次建立之worker應已被終止')
        })

        it('工廠初始化引數無法複製: 維持同步拋錯(工廠為同步API之既有契約), 且已建之worker須被終止', async function() {
            let fac = await impFresh(fpFac)
            let { r: err, created } = await withCtorSpy(() => {
                try {
                    fac(() => 1)
                    return null
                }
                catch (e) {
                    return e
                }
            })
            assert.strict.ok(err !== null, '工廠初始化引數無法複製時應同步拋錯')
            assert.strict.ok(msgOf(err).includes('could not be cloned'), `實得: ${msgOf(err)}`)
            assert.strict.deepStrictEqual(created.length, 1)
            assert.strict.ok(await waitExit(created[0]), '已建之worker應已被終止')
        })

    })

    describe('worker內使用者程式碼自送之非協定訊息須略過(規則帳本R3)', function() {

        it('持久實體: worker內postMessage(null)不得於宿主拋錯, 呼叫照常', async function() {
            let wo = await impCopy(fpObjP)
            let n0 = nUncaught
            let r = await settle(wo.tpostnull())
            assert.strict.deepStrictEqual(r, { state: 'resolve', v: 'posted' })
            await sleep(100)
            assert.strict.deepStrictEqual(nUncaught - n0, 0, '外層收到非協定訊息時不得於宿主拋錯')
            wo.terminate()
        })

    })

    describe('診斷輸出通道(規則帳本R2)', function() {

        it('worker崩潰之inner monitor輸出須在stderr, 不得混入宿主stdout之資料流', function() {
            let r = childRun(`
    let { pathToFileURL } = require('url')
    let m = await import(pathToFileURL(process.argv[1]).href)
    await m.default('crash').catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 500)) //worker之stdio為非同步轉送至宿主, 稍候使輸出到齊
`, [fpFun], { timeout: 30000 })
            let count = (s) => s.split('inner:uncaughtExceptionMonitor').length - 1
            assert.strict.deepStrictEqual(r.timedOut, false)
            assert.strict.deepStrictEqual(count(r.stdout), 0, `stdout: ${r.stdout}`)
            assert.strict.deepStrictEqual(count(r.stderr), 1, `stderr: ${r.stderr}`)
        })

    })

    describe('瀏覽器端: 結構化複製失敗與資源釋放(vm模擬瀏覽器, 規則帳本R3⑥、R10)', function() {

        let codeOf = (fp) => fs.readFileSync(fp, 'utf8')

        it('回傳值、reject值無法複製(工廠): 呼叫以具名原因reject而非永久懸置, 之後呼叫照常', async function() {
            let sim = createBrowserSim()
            let fac = sim.load(codeOf(fpFacBr), 'gWorkerCloneTest_FacBr')
            let ev = fac('normal')
            let r1 = await settle(ev.tretfn())
            assert.strict.deepStrictEqual(r1.state, 'reject', '瀏覽器worker內未處理rejection不觸發error事件, 不兜底即永久懸置')
            assert.strict.ok(msgOf(r1.e).includes('return value of function[tretfn] could not be cloned'), `實得: ${msgOf(r1.e)}`)
            let r2 = await settle(ev.trejfn())
            assert.strict.deepStrictEqual(r2.state, 'reject')
            assert.strict.ok(msgOf(r2.e).includes('rejected value of function[trejfn] could not be cloned'), `實得: ${msgOf(r2.e)}`)
            let r3 = await settle(ev.tok(1))
            assert.strict.deepStrictEqual(r3, { state: 'resolve', v: 'ok:1' })
            ev.terminate()
        })

        it('事件內容無法複製且於呼叫路徑外emit(工廠): 改發error事件說明, worker不被標死', async function() {
            let sim = createBrowserSim()
            let fac = sim.load(codeOf(fpFacBr), 'gWorkerCloneTest_FacBr')
            let ev = fac('normal')
            let evErrs = []
            ev.on('error', (err) => {
                evErrs.push(msgOf(err))
            })
            let r1 = await settle(ev.temitLater())
            assert.strict.deepStrictEqual(r1, { state: 'resolve', v: 'scheduled' })
            await sleep(300)
            assert.strict.deepStrictEqual(evErrs.length, 1, `實得: ${JSON.stringify(evErrs)}`)
            assert.strict.ok(evErrs[0].includes('payload of event[evt] could not be cloned'), `實得: ${evErrs[0]}`)
            let r2 = await settle(ev.tok(2))
            assert.strict.deepStrictEqual(r2, { state: 'resolve', v: 'ok:2' }, 'worker不得被標死')
            ev.terminate()
        })

        it('正常呼叫(function每次呼叫新建): blob URL於worker載入後由worker自行撤銷, 呼叫後worker被終止', async function() {
            let sim = createBrowserSim()
            let wf = sim.load(codeOf(fpBrowser), 'gWorkerCrashTest_Browser')
            let r = await settle(wf('ok'))
            assert.strict.deepStrictEqual(r, { state: 'resolve', v: 'OK' })
            assert.strict.deepStrictEqual(sim.urls.created.length, 1)
            assert.strict.deepStrictEqual(sim.urls.revoked, [{ url: sim.urls.created[0], by: 'worker' }], '應由worker載入後自行撤銷(同Vite之inline worker)')
            assert.strict.ok(sim.workers[0].nTerminate >= 1)
        })

        it('引數無法複製(function每次呼叫新建): 呼叫reject, worker未載入即被終止且blob URL由頁面撤銷', async function() {
            let sim = createBrowserSim()
            let wf = sim.load(codeOf(fpBrowser), 'gWorkerCrashTest_Browser')
            let r = await settle(wf(() => 1))
            assert.strict.deepStrictEqual(r.state, 'reject')
            assert.strict.ok(msgOf(r.e).includes('could not be cloned'), `實得: ${msgOf(r.e)}`)
            assert.strict.ok(sim.workers[0].nTerminate >= 1, 'worker應被終止')
            assert.strict.deepStrictEqual(sim.urls.revoked, [{ url: sim.urls.created[0], by: 'page' }], 'worker未載入即終止, 須由頁面撤銷')
        })

        it('worker腳本載入失敗(function每次呼叫新建): 呼叫reject而非懸置, worker被終止且blob URL由頁面撤銷', async function() {
            let sim = createBrowserSim({ failLoad: true })
            let wf = sim.load(codeOf(fpBrowser), 'gWorkerCrashTest_Browser')
            let r = await settle(wf('ok'))
            assert.strict.deepStrictEqual(r.state, 'reject')
            assert.strict.ok(sim.workers[0].nTerminate >= 1, 'worker應被終止')
            assert.strict.deepStrictEqual(sim.urls.revoked, [{ url: sim.urls.created[0], by: 'page' }], '載入失敗時worker未及自行撤銷, 須由頁面撤銷')
        })

        it('new Worker同步拋錯(function每次呼叫新建): 呼叫以原始錯誤reject且blob URL由頁面撤銷', async function() {
            let sim = createBrowserSim({ failCtor: 'ctor-fail-br' })
            let wf = sim.load(codeOf(fpBrowser), 'gWorkerCrashTest_Browser')
            let r = await settle(wf('ok'))
            assert.strict.deepStrictEqual(r.state, 'reject')
            assert.strict.ok(msgOf(r.e).includes('ctor-fail-br'), `實得: ${msgOf(r.e)}`)
            assert.strict.deepStrictEqual(sim.urls.created.length, 1)
            assert.strict.deepStrictEqual(sim.urls.revoked, [{ url: sim.urls.created[0], by: 'page' }])
        })

        it('worker執行期未捕捉錯誤(工廠): 呼叫中之pending reject, 已標死之worker須被終止, 其後使用者terminate不誤發error事件', async function() {
            let sim = createBrowserSim()
            let fac = sim.load(codeOf(fpFacBr), 'gWorkerCloneTest_FacBr')
            let ev = fac('normal')
            let evErrs = []
            ev.on('error', (err) => {
                evErrs.push(msgOf(err))
            })
            let r0 = await settle(ev.tok(1))
            assert.strict.deepStrictEqual(r0, { state: 'resolve', v: 'ok:1' })
            let pm = ev.thang()
            sim.workers[0].fireError('boom-br')
            let r1 = await settle(pm)
            assert.strict.deepStrictEqual(r1.state, 'reject')
            assert.strict.ok(sim.workers[0].nTerminate >= 1, '瀏覽器worker不因未捕捉錯誤而結束, 標死後須主動終止以釋放執行緒')
            let r2 = await settle(ev.tok(2))
            assert.strict.deepStrictEqual(r2.state, 'reject')
            assert.strict.ok(msgOf(r2.e).includes('worker is dead'), `實得: ${msgOf(r2.e)}`)
            ev.terminate()
            assert.strict.deepStrictEqual(evErrs.length, 1, `使用者其後之terminate不得誤發error事件, 實得: ${JSON.stringify(evErrs)}`)
        })

    })

    describe('瀏覽器端: iife產物(vm模擬瀏覽器, 規則帳本R9)', function() {

        let fpIife = path.resolve(fdTar, 'gWorkerCrashTest_Iife.wk.iife.js') //function, runin browser, formatOut iife

        before(async function() {
            this.timeout(60000)
            try {
                fs.unlinkSync(fpIife)
            }
            catch (err) {}
            await rollupWorker({
                name: 'gWorkerCrashTest_Iife',
                type: 'function',
                fpSrc: path.resolve(fdSrc, 'gWorker8_FunCrash.mjs'),
                fpTar: fpIife,
                formatOut: 'iife',
                runin: 'browser',
                bLog: false,
            })
            assert.strict.ok(fs.existsSync(fpIife) && fs.statSync(fpIife).size > 0, '產物應已產出')
        })

        after(function() {
            try {
                fs.unlinkSync(fpIife)
            }
            catch (err) {}
        })

        it('iife×browser產物可載入並呼叫, 且產物明文不含process監聽之註冊', async function() {
            let sim = createBrowserSim()
            let wf = sim.load(fs.readFileSync(fpIife, 'utf8'), 'gWorkerCrashTest_Iife')
            assert.strict.deepStrictEqual(typeof wf, 'function')
            let r = await settle(wf('ok'))
            assert.strict.deepStrictEqual(r, { state: 'resolve', v: 'OK' })
            assert.strict.ok(!hasProcessListen(fpIife))
        })

    })

    describe('衛生', function() {

        it('全部崩潰處理不得外溢uncaughtException或unhandledRejection', async function() {
            await new Promise((resolve) => setTimeout(resolve, 300))
            assert.strict.deepStrictEqual(nUncaught, 0)
        })

    })

})
