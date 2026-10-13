import { createRequire } from 'module'


//worker_threads之CommonJS模組物件: UMD(CJS)產物於建立worker時才取用其Worker屬性, 暫換該屬性即可攔截產物之建構
let wt = createRequire(import.meta.url)('worker_threads')


/**
 * 期間內令worker_threads.Worker建構時拋出指定訊息之錯誤, 結束必還原
 *
 * @param {String} msg 輸入錯誤訊息字串
 * @param {Function} fn 輸入期間內執行之函數, 可為async
 * @returns {Promise} 回傳Promise, resolve為fn之回傳值
 */
async function withCtorFail(msg, fn) {
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


/**
 * 期間內攔截worker_threads.Worker之建構以取得實體(供對其送出模擬事件或驗其是否結束), 結束必還原
 * 註: fn不可await永不settle之呼叫本身, 否則卡住; 須包成物件回傳(如{ pm: wf('hang') })
 *
 * @param {Function} fn 輸入期間內執行之函數, 可為async
 * @returns {Promise} 回傳Promise, resolve為{r, created}, r為fn之回傳值, created為期間內建立之Worker實體陣列
 */
async function withCtorSpy(fn) {
    let WorkerOri = wt.Worker
    let created = []
    wt.Worker = class extends WorkerOri {
        constructor(...args) {
            super(...args)
            created.push(this)
        }
    }
    try {
        let r = await fn()
        return { r, created }
    }
    finally {
        wt.Worker = WorkerOri
    }
}


/**
 * 等待Worker實體結束(exit事件), 已結束者(threadId為-1)立即回傳true
 *
 * @param {Worker} wk 輸入Worker實體
 * @param {Number} [ms=3000] 輸入等待上限毫秒數, 預設3000
 * @returns {Promise} 回傳Promise, resolve為是否已結束布林值
 */
async function waitExit(wk, ms = 3000) {
    if (wk.threadId === -1) {
        return true
    }
    let t
    let r = await Promise.race([
        new Promise((resolve) => wk.once('exit', () => resolve(true))),
        new Promise((resolve) => {
            t = setTimeout(() => resolve(false), ms)
        }),
    ])
    clearTimeout(t) //已結束即清除計時器, 不拖延測試行程結束
    return r
}


export { withCtorFail, withCtorSpy, waitExit }
