//測試結構化複製失敗處置專用fixture(function工廠模式, execFunctionByInstance=false), 以初始化參數模擬初始化失敗; 不引用nodejs專用模組, 可同時產製nodejs與browser版
import EventEmitter from 'eventemitter3'


function gWorker9_FunClone(act) {

    if (act === 'initThrow') {
        throw new Error('init-fail') //初始化失敗(錯誤可結構化複製)
    }
    if (act === 'initThrowFun') {
        // eslint-disable-next-line no-throw-literal
        throw () => 1 //初始化失敗(錯誤無法結構化複製), 刻意拋出非Error值
    }

    let ev = new EventEmitter()

    async function tok(p1) {
        return 'ok:' + p1
    }

    function tsync(p1) {
        return 'sync:' + p1 //非async函數, 回傳非promise
    }

    async function tretfn() {
        return () => 1 //回傳值無法結構化複製
    }

    async function trejfn() {
        return Promise.reject(() => 1) //reject值無法結構化複製
    }

    async function temitLater() {
        //於呼叫路徑外(計時器內)emit無法結構化複製之事件內容
        setTimeout(() => {
            ev.emit('evt', () => 1)
        }, 10)
        return 'scheduled'
    }

    async function temitNow() {
        ev.emit('evt', () => 1) //於呼叫路徑內emit無法結構化複製之事件內容
        return 'emitted'
    }

    async function temitOk(p1) {
        ev.emit('evt', 'payload:' + p1)
        return 'emitted'
    }

    async function thang() {
        return new Promise(() => {}) //永不settle, 模擬呼叫中之pending
    }

    ev.tok = tok
    ev.tsync = tsync
    ev.tretfn = tretfn
    ev.trejfn = trejfn
    ev.temitLater = temitLater
    ev.temitNow = temitNow
    ev.temitOk = temitOk
    ev.thang = thang
    return ev
}


export default gWorker9_FunClone
