import assert from 'assert'
import { createRequire, syncBuiltinESMExports } from 'module'
import parfor from '../src/parfor.mjs'
import { waitExit } from './tools/workerCtor.mjs'


let fpWorker = new URL('./fixtures/parfor_worker.mjs', import.meta.url)

//settle, 5秒內須settle, 否則視為懸置
let settle = (pm) => Promise.race([
    pm.then((v) => ({ state: 'resolve', v })).catch((e) => ({ state: 'reject', e })),
    new Promise((resolve) => setTimeout(() => resolve({ state: 'hang' }), 5000)),
])


describe('parfor', function() {

    it('returnResult 依 job 索引對位回傳, 與完成順序無關', async function() {
        let jobs = [...Array(10).keys()].map((v) => ({ v }))
        let results = await parfor(fpWorker, jobs, {
            takeLimit: 4,
            initData: { base: 100 },
            returnResult: true,
        })
        let exp = jobs.map((job) => 100 + job.v * 2)
        assert.strict.deepStrictEqual(results, exp)
    })

    it('cb 逐 job 即時回呼, 收齊全部結果', async function() {
        let jobs = [...Array(8).keys()].map((v) => ({ v }))
        let got = new Array(jobs.length)
        let cnt = 0
        await parfor(fpWorker, jobs, {
            takeLimit: 3,
            cb: (r, k) => {
                got[k] = r
                cnt++
            },
        })
        assert.strict.deepStrictEqual(cnt, jobs.length)
        assert.strict.deepStrictEqual(got, jobs.map((job) => job.v * 2))
    })

    it('initData 經 workerData 一次性注入, 計算有套用', async function() {
        let jobs = [{ v: 5 }]
        let results = await parfor(fpWorker, jobs, {
            initData: { base: 1000 },
            returnResult: true,
        })
        assert.strict.deepStrictEqual(results, [1010])
    })

    it('空 jobs: returnResult 回 [], 否則回 undefined', async function() {
        let r1 = await parfor(fpWorker, [], { returnResult: true })
        assert.strict.deepStrictEqual(r1, [])
        let r2 = await parfor(fpWorker, [], { cb: () => {} })
        assert.strict.deepStrictEqual(r2, undefined)
    })

    it('takeLimit 大於 jobs 數時仍正確(只建 n 個 worker)', async function() {
        let jobs = [{ v: 1 }, { v: 2 }]
        let results = await parfor(fpWorker, jobs, {
            takeLimit: 16,
            returnResult: true,
        })
        assert.strict.deepStrictEqual(results, [2, 4])
    })

    it('單 job 失敗不炸批: 該 job 結果為 undefined, 其餘照常', async function() {
        let jobs = [{ v: 0 }, { v: 1, bad: true }, { v: 2 }]
        let cbResults = new Array(jobs.length)

        //parfor 對失敗 job 會以 console.error 記錄(這是預期的 production 行為; 診斷輸出走 stderr, 不混入宿主 stdout 之資料流). 暫時攔截 console.error,
        //避免「預期內的錯誤」污染 npm test 輸出, 同時把「有記錄失敗」轉成正向斷言.
        let logs = []
        let oriErr = console.error
        console.error = (...args) => {
            logs.push(args.map(String).join(' '))
        }
        let results
        try {
            results = await parfor(fpWorker, jobs, {
                cb: (r, k) => {
                    cbResults[k] = r
                },
                returnResult: true,
            })
        }
        finally {
            console.error = oriErr //無論成敗都還原, 不影響後續測試輸出
        }

        assert.strict.deepStrictEqual(results[0], 0)
        assert.strict.deepStrictEqual(results[1], undefined) //失敗 job 不寫入結果
        assert.strict.deepStrictEqual(results[2], 4)
        assert.strict.deepStrictEqual(cbResults[1], undefined) //cb 對失敗 job 給 undefined
        assert.strict.ok(logs.some((s) => s.includes('job 1 失敗')), 'parfor 應記錄失敗 job(不炸批)')
    })

    it('worker 載入失敗: 整批 fail-fast 拋錯', async function() {
        let fpBad = new URL('./fixtures/nonexistent_worker.mjs', import.meta.url)
        await assert.rejects(async () => {
            await parfor(fpBad, [{ v: 1 }], { returnResult: true })
        })
    })

    it('worker 中途以 code 0 退出: 整批 fail-fast 拋錯(不得懸置)', async function() {
        //takeLimit 1: 第 2 個 job 令唯一的 worker process.exit(0), 該 job 永不回報
        let jobs = [{ v: 1 }, { v: 2, exit0: true }, { v: 3 }]
        let r = await settle(parfor(fpWorker, jobs, { takeLimit: 1, returnResult: true }))

        //規則帳本R8: finish 前之任何 worker 退出(含 code 0)皆為異常, 須 fail-fast 而非懸置
        assert.strict.deepStrictEqual(r.state, 'reject', 'worker 以 code 0 中途退出時 parfor 應 reject, 不得懸置')
        assert.strict.ok(String(r.e && r.e.message).includes('code 0'))
    })

    it('cb 拋錯: 整批 fail-fast 拋錯(不得成為宿主未捕捉例外)', async function() {
        let jobs = [{ v: 1 }, { v: 2 }]
        let r = await settle(parfor(fpWorker, jobs, {
            takeLimit: 1,
            cb: () => {
                throw new Error('cb-boom')
            },
        }))

        //規則帳本R8: cb 錯誤傳染至 parfor(與 rollupParfor 一致)
        assert.strict.deepStrictEqual(r.state, 'reject', 'cb 拋錯時 parfor 應 reject')
        assert.strict.ok(String(r.e && r.e.message).includes('cb-boom'))
    })

    it('job 於 worker 端反序列化失敗(worker 協定第 6 條): 整批 fail-fast 拋出原始錯誤(不得懸置)', async function() {
        //第 2 個 job 模擬於 worker 端反序列化失敗(該 job 不會送達, 改由 port 發出 messageerror); fixture 依協定第 6 條於 messageerror 監聽內拋出
        let jobs = [{ v: 1 }, { v: 2, msgerr: true }, { v: 3 }]
        let r = await settle(parfor(fpWorker, jobs, { takeLimit: 1, returnResult: true }))

        //規則帳本R8: 經 worker error 路徑整批 fail-fast, 帶原始錯誤
        assert.strict.deepStrictEqual(r.state, 'reject', 'job 於 worker 端反序列化失敗時 parfor 應 reject, 不得懸置')
        assert.strict.ok(String(r.e && r.e.message).includes('msgerr-in'), `實得: ${r.e}`)
    })

    it('job 無法結構化複製: 整批 fail-fast 拋錯(不得成為宿主未捕捉例外)', async function() {
        //第 2 個 job 含函數, 於 message 監聽內派工時 postMessage 同步拋 DataCloneError
        let jobs = [{ v: 1 }, { v: 2, f: () => 1 }, { v: 3 }]
        let r = await settle(parfor(fpWorker, jobs, { takeLimit: 1, returnResult: true }))

        //規則帳本R8: 派工失敗須 fail-fast
        assert.strict.deepStrictEqual(r.state, 'reject', 'job 無法複製時 parfor 應 reject')
        assert.strict.ok(String(r.e).includes('could not be cloned'), `實得: ${r.e}`)
    })

    it('建立第 2 個 worker 失敗: 整批 fail-fast 拋錯, 已建之 worker 須被 terminate, 失敗後不再呼叫 cb', async function() {
        //令 worker_threads.Worker 第 2 次建構時拋錯(syncBuiltinESMExports 使 parfor.mjs 之 ESM 具名匯入同步更新)
        let wt = createRequire(import.meta.url)('worker_threads')
        let WorkerOri = wt.Worker
        let created = []
        wt.Worker = class extends WorkerOri {
            constructor(...args) {
                if (created.length >= 1) {
                    throw new Error('ctor-fail-2nd')
                }
                super(...args)
                created.push(this)
            }
        }
        syncBuiltinESMExports()
        let nCb = 0
        let r
        try {
            r = await settle(parfor(fpWorker, [{ v: 1 }, { v: 2 }, { v: 3 }], {
                takeLimit: 3,
                cb: () => {
                    nCb++
                },
            }))
        }
        finally {
            wt.Worker = WorkerOri
            syncBuiltinESMExports()
        }

        //規則帳本R8: 建立失敗須 fail-fast 並帶原始錯誤
        assert.strict.deepStrictEqual(r.state, 'reject')
        assert.strict.ok(String(r.e && r.e.message).includes('ctor-fail-2nd'))

        //規則帳本R8: 已建之 worker 須被 terminate(不得遺留而撐住宿主)
        assert.strict.deepStrictEqual(created.length, 1)
        assert.strict.ok(await waitExit(created[0]), '已建之 worker 應已被 terminate')

        //規則帳本R8: 整批已失敗後, 陸續到達之結果不得再呼叫 cb
        await new Promise((resolve) => setTimeout(resolve, 500))
        assert.strict.deepStrictEqual(nCb, 0, '失敗後不得再呼叫 cb')
    })

})
