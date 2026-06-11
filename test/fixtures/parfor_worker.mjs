import { parentPort, workerData } from 'worker_threads'


//parfor 測試用 worker entry, 遵守 parfor worker 協定:
//  經 workerData 收 initData(一次); 收 { k, job } → 算完回 { k, r }; 失敗回 { k, err }(字串)
let base = (workerData && Number.isFinite(workerData.base)) ? workerData.base : 0


let core = (job) => {
    if (job && job.bad === true) {
        throw new Error('intentional job failure') //測試「單 job 失敗不炸批」用
    }
    return base + job.v * 2
}


parentPort.on('message', (m) => {
    let { k, job } = m
    try {
        let r = core(job)
        parentPort.postMessage({ k, r })
    }
    catch (err) {
        parentPort.postMessage({ k, err: String((err && err.stack) || err) })
    }
})
