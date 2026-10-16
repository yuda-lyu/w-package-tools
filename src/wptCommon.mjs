import fs from 'fs'
import path from 'path'


//wptCommon, 內部用(非公開API; 故用//註解而非JSDoc, 以免被jsdoc收進公開文件): 帶WPT_碼之Error物件與暫存檔清理(帳本R19、R20)


//mkError, 建立帶code之Error物件, 堆疊自topFn之呼叫處起算(不含本檔之輔助函數框)
function mkError(code, msg, topFn) {
    let err = new Error(msg)
    err.code = code
    Error.captureStackTrace(err, topFn)
    return err
}


//wptError, 回傳帶code之Error物件(code為WPT_開頭字串, msg為訊息字串)
//  產製API自行拒絕或拋出之錯誤一律為Error物件(有堆疊)並帶WPT_碼, 訊息文字為既有字串; 不得以字串reject或throw
function wptError(code, msg) {
    return mkError(code, msg, wptError)
}


//rejectWpt, 回傳已拒絕之Promise, 拒絕值為帶code之Error物件(同wptError)
function rejectWpt(code, msg) {
    return Promise.reject(mkError(code, msg, rejectWpt))
}


//rmTempFile, 刪除暫存檔(帳本R20), 回傳Promise, resolve布林值: 已刪除(或本即不存在)為true, 仍失敗為false
//  不存在不算失敗; EBUSY、EPERM(Windows下防毒掃描等暫時占用)短重試(opt.retries預設3次, opt.delay預設100ms, 非同步不阻塞事件迴圈);
//  仍失敗只印一行警告(含code與絕對路徑), 不印Error物件(其堆疊框會被下游偵測工具判為建置失敗, 而此時建置實際已成功), 亦不拋錯(不使成功之建置失敗、不覆蓋建置之原始錯誤)
//  路徑於進入時即固定為絕對路徑: 重試等待期間宿主若process.chdir(), 相對路徑會改指他處而刪錯檔或靜默略過
async function rmTempFile(fp, opt = {}) {
    let retries = opt.retries === undefined ? 3 : opt.retries
    let delay = opt.delay === undefined ? 100 : opt.delay
    let abs = path.resolve(fp)
    for (let i = 0; ; i++) {
        try {
            fs.rmSync(abs, { force: true })
            return true
        }
        catch (err) {
            let code = err && err.code
            if ((code === 'EBUSY' || code === 'EPERM') && i < retries) {
                await new Promise((resolve) => setTimeout(resolve, delay))
                continue
            }

            //不引用err.message與err.path: Windows下路徑含非ASCII時為亂碼, 路徑改用已知之絕對路徑
            let syscall = err && err.syscall ? ` syscall[${err.syscall}]` : ''
            console.log(`warning: temp file[${abs}] was not removed: code[${code || (err && err.name)}]${syscall}; the build result is not affected, please remove it manually`)
            return false
        }
    }
}


export { wptError, rejectWpt, rmTempFile }
