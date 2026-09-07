import path from 'path'
import fs from 'fs'
import assert from 'assert'
import rollupWorker from '../src/rollupWorker.mjs'


describe('rollupWorker worker崩潰時pending promise須reject', function() {

    let fdSrc = './test-code-in'
    let fdTar = './test/fixtures'
    let fpFun = path.resolve(fdTar, 'gWorkerCrashTest_Fun.wk.umd.js') //function+execFunctionByInstance(預設)
    let fpObj = path.resolve(fdTar, 'gWorkerCrashTest_Obj.wk.umd.js') //object+execObjectFunsByInstance(預設)
    let fpObjP = path.resolve(fdTar, 'gWorkerCrashTest_ObjP.wk.umd.js') //object持久實體(execObjectFunsByInstance=false)

    //全域uncaught/unhandled計數, 崩潰處理不得外溢
    let nUncaught = 0
    let onUncaught = () => {
        nUncaught += 1
    }

    //settle, 4秒內須settle, 否則視為懸置
    let settle = (pm) => Promise.race([
        pm.then((v) => ({ state: 'resolve', v })).catch((e) => ({ state: 'reject', e })),
        new Promise((res) => setTimeout(() => res({ state: 'hang' }), 4000)),
    ])

    before(async function() {
        this.timeout(60000)

        process.on('uncaughtException', onUncaught)
        process.on('unhandledRejection', onUncaught)

        if (!fs.existsSync(fdTar)) {
            fs.mkdirSync(fdTar, { recursive: true })
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
    })

    after(function() {
        process.off('uncaughtException', onUncaught)
        process.off('unhandledRejection', onUncaught)
        for (let fp of [fpFun, fpObj, fpObjP]) {
            try {
                fs.unlinkSync(fp)
            }
            catch (err) {}
        }
    })

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

    describe('衛生', function() {

        it('全部崩潰處理不得外溢uncaughtException或unhandledRejection', async function() {
            await new Promise((res) => setTimeout(res, 300))
            assert.strict.deepStrictEqual(nUncaught, 0)
        })

    })

})
