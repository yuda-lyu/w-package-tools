import os from 'os'
import { Worker } from 'worker_threads'


/**
 * 輕量持久 worker pool 平行執行器,用原生 worker_threads 把 CPU 密集計算分散到多核心,免任何編譯步驟
 *
 * 機制:
 *   · 免編譯 ESM worker:new Worker(URL)直接跑 .mjs 檔,worker 內可正常 import 專案模組與 node_modules。
 *   · 持久 pool:每個 worker 只建立一次(import core、模組級預計算、initData 注入都只付一次),跑完整批工作才 terminate;對比「每批新建 worker + eval bundle」省去重複啟動 / 解析 / 預計算成本。
 *   · 動態派工:閒置的 worker 自動領取下一個 job(內建負載均衡,不需 caller 預先平衡 job 順序)。
 *   · lifecycle 對稱:全部完成(或失敗)一律 terminate 所有 worker,直跑 node 不會 hang。
 *
 * worker 協定(worker entry 檔須遵守):
 *   1. 經 workerData 收 initData(一次)。
 *   2. 收 { k, job } → 計算 → 回 { k, r }。
 *   3. 單 job 失敗回 { k, err }(err 為字串)→ 不炸批,主程序印錯後續跑。
 *   4. worker 載入 / init 失敗(import 錯、workerData 處理 throw)→ 整批 fail-fast 拋錯(不默跑)。
 *
 * 適用:CPU 密集的純計算(大量迴圈、數值運算、回測撮合),且工作可拆成多個彼此獨立的 job
 * 不適用:I/O 密集任務(讀檔、網路請求),這類用單執行緒 Promise 並行即可,開 worker 反而多付啟動與傳輸成本
 *
 * @param {String|URL} fpWorker 輸入 worker entry 之 file URL(建議 new URL('./xxx_worker.mjs', import.meta.url))或絕對路徑字串
 * @param {Array} jobs 輸入工作陣列,每個 job 經 postMessage 結構化複製傳入 worker
 * @param {Object} [opt={}] 輸入設定物件,預設 {}
 * @param {Integer} [opt.takeLimit=os.availableParallelism()-1] 輸入同時 worker 數正整數,至少 1,預設 os.availableParallelism()-1
 * @param {*} [opt.initData] 輸入經 workerData 一次性注入每個 worker 的共享唯讀資料,結構化複製,支援 TypedArray
 * @param {Function} [opt.cb=null] 輸入每個 job 完成即時回呼函數,簽名為 cb(r, k),r 為該 job 回傳值、k 為 job 索引,job 失敗時 r 為 undefined(錯誤已印出,不中斷整批),預設 null
 * @param {Boolean} [opt.returnResult=false] 輸入是否回傳 results 陣列布林值,true 時依 job 索引對位回傳,預設 false(省記憶體,結果由 cb 收)
 * @returns {Promise} 回傳 Promise,resolve 時:opt.returnResult 為 true 回傳 results 陣列(依 job 索引對位),否則回傳 undefined
 */
async function parfor(fpWorker, jobs, opt = {}) {

    let takeLimit = Number.isInteger(opt.takeLimit) && opt.takeLimit > 0 ? opt.takeLimit : Math.max(os.availableParallelism() - 1, 1)
    let initData = opt.initData
    let cb = typeof opt.cb === 'function' ? opt.cb : null
    let returnResult = opt.returnResult === true

    let n = jobs.length
    if (n === 0) {
        return returnResult ? [] : undefined
    }

    let nw = Math.min(takeLimit, n)
    let results = returnResult ? new Array(n) : null
    let workers = []

    await new Promise((resolve, reject) => {
        let next = 0 //下一個待派 job 索引
        let done = 0 //已完成 job 數
        let settled = false

        let finish = (err) => {
            if (settled) {
                return
            }
            settled = true
            for (let wk of workers) {
                wk.terminate()
            }
            if (err) {
                reject(err)
            }
            else {
                resolve()
            }
        }

        let assign = (wk) => {
            if (settled || next >= n) {
                return //無新工作 → 閒置(等全部完成由 finish 統一 terminate)
            }
            let k = next++
            wk.postMessage({ k, job: jobs[k] })
        }

        for (let i = 0; i < nw; i++) {
            let wk = new Worker(fpWorker, { workerData: initData })
            workers.push(wk)
            wk.on('message', (m) => {
                if (m && typeof m.err === 'string') {
                    console.log(`parfor: job ${m.k} 失敗(不炸批):`, m.err)
                }
                else if (results) {
                    results[m.k] = m.r
                }
                if (cb) {
                    cb(m && typeof m.err === 'string' ? undefined : m.r, m.k)
                }
                done++
                if (done >= n) {
                    finish()
                }
                else {
                    assign(wk)
                }
            })
            wk.on('error', (err) => {
                finish(err) //worker 載入/init 失敗 → fail-fast(不默跑)
            })
            wk.on('exit', (code) => {
                if (!settled && code !== 0) {
                    finish(new Error(`parfor: worker 非預期退出(code ${code})`))
                }
            })
            assign(wk) //每 worker 先派 1 個(訊息會排隊至 worker init 完成掛上 listener 才消化)
        }
    })

    //確保全部 terminate 完成(event loop 清空 → 直跑乾淨 exit)
    await Promise.all(workers.map((wk) => wk.terminate()))

    return returnResult ? results : undefined
}


export default parfor
