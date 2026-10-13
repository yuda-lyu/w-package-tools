//測試worker崩潰行為專用fixture(object模式), 各函數模擬不同崩潰型態
import { parentPort } from 'worker_threads'


async function tok(p1) {
    return 'ok:' + p1
}

async function treject() {
    return Promise.reject('expected-reject') //一般reject, 走既有return訊息路徑, 不會崩潰worker
}

async function tcrash() {
    //於呼叫處理路徑外拋錯, 形成worker內uncaughtException, worker崩潰(error事件+exit code 1)
    setTimeout(() => {
        throw new Error('worker-crash')
    }, 10)
    return new Promise(() => {}) //懸置, 由崩潰終結
}

async function texit0() {
    process.exit(0) //worker直接退出, exit code 0, 無error事件
}

async function texit5() {
    process.exit(5) //worker直接退出, exit code 5, 無error事件
}

async function thang() {
    return new Promise(() => {}) //永不settle, 模擬呼叫中之pending(供驗主動terminate時之處置)
}

async function tmsgerr() {
    //模擬宿主送來之訊息於worker端反序列化失敗: Node之MessagePort可直接emit事件; 本呼叫永不settle, 驗外層是否整批reject呼叫中之pending
    parentPort.emit('messageerror', new Error('msgerr-in'))
    return new Promise(() => {})
}


async function tpostnull() {
    parentPort.postMessage(null) //使用者程式碼自行送出非協定訊息(null), 外層須略過而不得於宿主拋錯
    return 'posted'
}


let gWorker7_ObjCrash = {
    tok,
    treject,
    tcrash,
    texit0,
    texit5,
    thang,
    tmsgerr,
    tpostnull,
}


export default gWorker7_ObjCrash
