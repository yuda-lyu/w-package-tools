//測試worker崩潰行為專用fixture(function模式), 以act參數模擬不同崩潰型態


async function gWorker8_FunCrash(act) {
    if (act === 'ok') {
        return 'OK'
    }
    if (act === 'reject') {
        return Promise.reject('expected-reject') //一般reject, 走既有return訊息路徑, 不會崩潰worker
    }
    if (act === 'crash') {
        //於呼叫處理路徑外拋錯, 形成worker內uncaughtException, worker崩潰(error事件+exit code 1)
        setTimeout(() => {
            throw new Error('worker-crash')
        }, 10)
        return new Promise(() => {}) //懸置, 由崩潰終結
    }
    if (act === 'exit0') {
        process.exit(0) //worker直接退出, exit code 0, 無error事件
    }
    if (act === 'exit5') {
        process.exit(5) //worker直接退出, exit code 5, 無error事件
    }
    return 'unknown'
}


export default gWorker8_FunCrash
