import assert from 'assert'
import parfor from '../src/parfor.mjs'


let fpWorker = new URL('./fixtures/parfor_worker.mjs', import.meta.url)


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

        //parfor 對失敗 job 會 console.log(這是預期的 production 行為). 暫時攔截 console.log,
        //避免「預期內的錯誤」污染 npm test 輸出, 同時把「有記錄失敗」轉成正向斷言.
        let logs = []
        let oriLog = console.log
        console.log = (...args) => {
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
            console.log = oriLog //無論成敗都還原, 不影響後續測試輸出
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

})
