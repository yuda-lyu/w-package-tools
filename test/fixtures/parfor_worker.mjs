import { parentPort, workerData } from 'worker_threads'


//parfor 測試用 worker entry, 遵守 parfor worker 協定:
//  經 workerData 收 initData(一次); 收 { k, job } → 算完回 { k, r }; 失敗回 { k, err }(字串); messageerror 時拋出(協定第 6 條)
let base = (workerData && Number.isFinite(workerData.base)) ? workerData.base : 0


//協定第 6 條: job 於 worker 端反序列化失敗時該 job 不會送達, 拋出成 worker 未捕捉例外, 由主程序經 error 路徑整批 fail-fast(帶原始錯誤)
parentPort.on('messageerror', (err) => {
    throw err
})


let core = (job) => {
    if (job && job.bad === true) {
        throw new Error('intentional job failure') //測試「單 job 失敗不炸批」用
    }
    if (job && job.exit0 === true) {
        process.exit(0) //測試「worker 中途以 code 0 退出須整批 fail-fast」用
    }
    return base + job.v * 2
}


parentPort.on('message', (m) => {
    let { k, job } = m
    if (job && job.msgerr === true) {
        //測試「job 於 worker 端反序列化失敗」用: 真實情形該 job 不會送達, 改由 port 另行發出 messageerror;
        //以計時器發出, 同真實事件不在 message 處理路徑內(若同步 emit, 監聽內之拋錯會被下方 try 接住而變成單 job 失敗)
        setTimeout(() => {
            parentPort.emit('messageerror', new Error('msgerr-in'))
        }, 0)
        return
    }
    try {
        let r = core(job)
        parentPort.postMessage({ k, r })
    }
    catch (err) {
        parentPort.postMessage({ k, err: String((err && err.stack) || err) })
    }
})
