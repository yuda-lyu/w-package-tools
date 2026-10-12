import fs from 'fs'
import { spawnSync } from 'child_process'


//子程序腳本: 以乾淨宿主import指定產物, 回報匯出型別與import前後process全部事件監聽數之差異; 依mode再拋出宿主未捕捉例外或未處理rejection
//why用子程序: 於mocha行程內量測必然失真——mocha自掛process監聽, 且UMD(CJS)產物以檔名快取, 加查詢字串重複import不會重新求值頂層, 註冊不會再發生而假通過
let CHILD = `
import { pathToFileURL } from 'url'
let [mode, tag, ...fps] = process.argv.slice(1)
let snap = () => {
    let r = {}
    for (let k of process.eventNames()) {
        r[String(k)] = process.listenerCount(k)
    }
    return r
}
let s0 = snap()
let types = []
for (let fp of fps) {
    let m = await import(pathToFileURL(fp).href)
    types.push(m.default === null ? 'null' : typeof m.default)
}
let s1 = snap()
let delta = {}
for (let k of new Set([...Object.keys(s0), ...Object.keys(s1)])) {
    let d = (s1[k] || 0) - (s0[k] || 0)
    if (d !== 0) {
        delta[k] = d
    }
}
console.log('HOSTPROBE=' + JSON.stringify({ imported: fps.length, types, delta }))
if (mode === 'none') {
    process.exit(0) //持久實體產物於import時即建worker, 不主動結束子程序會懸置
}
let err = new Error(tag) //先建立再拋出: Node之fatal輸出含拋出處之來源行, 以變數拋出則訊息不會因來源行而重複出現
if (mode === 'throw') {
    setTimeout(() => {
        throw err
    }, 50)
}
if (mode === 'reject') {
    setTimeout(() => {
        Promise.reject(err)
    }, 50)
}
`


/**
 * 以乾淨子程序模擬引用產物之宿主
 *
 * @param {Array} fps 輸入產物絕對路徑陣列
 * @param {Object} [opt={}] 輸入設定物件
 * @param {String} [opt.mode='none'] 輸入模式字串, 'none'僅回報後結束, 'throw'再拋出宿主未捕捉例外, 'reject'再產生宿主未處理rejection
 * @returns {Object} 回傳{status, info, stdout, stderr, nStdout, nStderr}, info為子程序回報之{imported, types, delta}(未回報為null), nStdout/nStderr為該錯誤訊息行於各通道之出現次數
 */
function hostProbe(fps, opt = {}) {
    let mode = opt.mode || 'none'
    let tag = `hostprobe-${mode}-${Date.now()}` //動態組字, 錯誤訊息不以字面值出現在子程序原始碼內
    let r = spawnSync(process.execPath, ['--input-type=module', '-e', CHILD, mode, tag, ...fps], { encoding: 'utf8', timeout: 60000 })
    let stdout = r.stdout || ''
    let stderr = r.stderr || ''
    let m = stdout.match(/HOSTPROBE=(.*)/)
    let count = (s) => s.split(`Error: ${tag}`).length - 1
    return {
        status: r.status,
        info: m ? JSON.parse(m[1]) : null,
        stdout,
        stderr,
        nStdout: count(stdout),
        nStderr: count(stderr),
    }
}


//產物明文中之宿主process監聽註冊: inner為base64不在明文, 明文只有outer層與其內嵌之函式庫
let reProcessListen = /process\.(on|once|addListener|prependListener|prependOnceListener)\(/


/**
 * 檢查產物明文是否含process監聽之註冊
 *
 * @param {String} fp 輸入產物絕對路徑
 * @returns {Boolean} 回傳是否含有
 */
function hasProcessListen(fp) {
    return reProcessListen.test(fs.readFileSync(fp, 'utf8'))
}


export { hasProcessListen }
export default hostProbe
