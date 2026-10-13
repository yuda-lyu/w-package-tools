import fs from 'fs'
import _ from 'lodash-es'
import w from './wsemip.umd.js'
import rollupFile from './rollupFile.mjs'
import rollupCode from './rollupCode.mjs'


let cmain = 'main' //'__system__main__'


function str2b64(str) {
    return Buffer.from(str, 'utf8').toString('base64')
}


function clearExportCode(code, name) {

    //clec, cjs會轉譯成為「module.exports = OOO;」
    let clec = () => {
        let err = ''
        let c = `module.exports = ${name};`
        let s = _.split(code, c)
        if (_.size(s) < 2) {
            err = `找不到 '${c}'`
            return { err }
        }
        else if (_.size(s) > 2) {
            err = `出現多個 '${c}'`
            return { err }
        }
        return _.get(s, 0)
    }

    //clecm, cjs會轉譯與壓縮成為「module.exports=OOO;」
    let clecm = () => {
        let err = ''
        let c = `module.exports=${name};`
        let s = _.split(code, c)
        if (_.size(s) < 2) {
            err = `找不到 '${c}'`
            return { err }
        }
        else if (_.size(s) > 2) {
            err = `出現多個 '${c}'`
            return { err }
        }
        return _.get(s, 0)
    }

    //cleim, cjs會轉譯與壓縮成為「module.exports=程式碼」, 因同樣會出現module.exports, 故須等前面cjs兩種都偵測完再偵測
    let cleim = () => {
        let c = `module.exports=`
        if (code.indexOf(c) >= 0) {
            code = code.replace(`module.exports=`, `let ${name}=`)
            return code
        }
        //找不到須回err使後續判斷續行, 不可回undefined: undefined會被check當成成功, inner程式碼成為字面undefined, 建置不報錯而執行期才壞
        let err = `找不到 '${c}'`
        return { err }
    }

    //clecg, cjs未壓縮且name與原始碼default export不同名時(bMinify為false常見), 結尾為「module.exports = 其他名稱;」, 改以let宣告name指向該名稱;
    //以結尾錨定, 避免誤中被包裝之相依套件內仍保留之module.exports
    let clecg = () => {
        let m = code.match(/module\.exports\s*=\s*([A-Za-z_$][\w$]*)\s*;?\s*$/)
        if (!m) {
            let err = `找不到結尾之 'module.exports = 名稱;'`
            return { err }
        }
        let c = code.slice(0, m.index)
        if (m[1] !== name) {
            c += `let ${name} = ${m[1]};\n` //同名時name已於程式碼內宣告, 只去掉匯出敘述
        }
        return c
    }

    //cled, es6會轉譯成為「export default OOO;」
    let cled = () => {
        let err = ''
        let c = `export default ${name};`
        let s = _.split(code, c)
        if (_.size(s) < 2) {
            err = `找不到 '${c}'`
            return { err }
        }
        else if (_.size(s) > 2) {
            err = `出現多個 '${c}'`
            return { err }
        }
        return _.get(s, 0)
    }

    //clead, es6有專案設定導致轉譯成為「export { OOO as default };」
    let clead = () => {
        let err = ''
        let c = `export { ${name} as default };`
        let s = _.split(code, c)
        if (_.size(s) < 2) {
            err = `找不到 '${c}'`
            return { err }
        }
        else if (_.size(s) > 2) {
            err = `出現多個 '${c}'`
            return { err }
        }
        return _.get(s, 0)
    }

    //cleadm, es6有專案設定導致轉譯與壓縮成為「export{OOO as default};」
    let cleadm = () => {
        let err = ''
        let c = `export{${name} as default};`
        let s = _.split(code, c)
        if (_.size(s) < 2) {
            err = `找不到 '${c}'`
            return { err }
        }
        else if (_.size(s) > 2) {
            err = `出現多個 '${c}'`
            return { err }
        }
        return _.get(s, 0)
    }

    //clec
    let rec = clec()

    //check
    if (!w.isestr(_.get(rec, 'err'))) {
        return rec
    }

    //clecm
    let recm = clecm()

    //check
    if (!w.isestr(_.get(recm, 'err'))) {
        return recm
    }

    //cleim
    let reim = cleim()

    //check
    if (!w.isestr(_.get(reim, 'err'))) {
        return reim
    }

    //clecg
    let recg = clecg()

    //check
    if (!w.isestr(_.get(recg, 'err'))) {
        return recg
    }

    //cled
    let red = cled()

    //check
    if (!w.isestr(_.get(red, 'err'))) {
        return red
    }

    //clead
    let read = clead()

    //check
    if (!w.isestr(_.get(read, 'err'))) {
        return read
    }

    //cleadm
    let readm = cleadm()

    //check
    if (!w.isestr(_.get(readm, 'err'))) {
        return readm
    }

    //err, 全部比對皆失敗: 明確拋錯使建置失敗, 不可產出無法使用之產物
    console.log(rec.err, recm.err, reim.err, recg.err, red.err, read.err, readm.err)
    throw new Error(`can not clear export default of name[${name}]`)
}


function genInnerWebWorkerCodeEv(evName) {
    let c = `

    r.on('${evName}',(msg) => {

        //sendMessage
        let res = {
            mode: 'emit',
            evName: '${evName}',
            msg,
        }
        sendMessage(res, 'payload of event[${evName}]')

    })

`
    return c
}


function genInnerWebWorkerCodeEvs(evNames) {
    let c = ''
    for (let i = 0; i < evNames.length; i++) {
        let evName = evNames[i]
        c += genInnerWebWorkerCodeEv(evName)
    }
    return c
}


function addInnerWebWorkerCode(code, name, evNames, opt = {}) {

    //evs
    let evs = genInnerWebWorkerCodeEvs(evNames)

    //cnwt
    let cnwt = ''
    if (opt.runin === 'nodejs') {
        cnwt = `
        //import { parentPort } from 'worker_threads'
        let { parentPort } = require('worker_threads') //inner以new Worker(code, { eval: true })執行, eval字串預設以CommonJS解析(與package.json之type無關, 僅由--input-type決定), 故得使用require
        //設計限制: 宿主以--input-type=module啟動時worker繼承該參數, inner被當ESM解析而require失效, 屬不支援之執行方式
        //若要於nodejs worker內使用無法轉譯的原生套件例如fs, 避免使用頂層import加載使用, 因無法轉譯會直接保留
        //並因eval字串為CommonJS而不接受import, 故出現錯誤無法轉譯
        `
    }

    //crvk, 瀏覽器worker由blob URL載入, 載入後即自行revoke(同Vite之inline worker作法), 避免長時運行之頁面隨呼叫次數累積blob; 未載入即中止、載入失敗、建立失敗時由outer層revoke
    let crvk = ''
    if (opt.runin !== 'nodejs') {
        crvk = `
        try {
            (self.URL || self.webkitURL).revokeObjectURL(self.location.href)
        }
        catch (err) {}
        `
    }

    //csm, 送出原語, 輸入為欲送出之變數名稱
    let csm = (v) => {
        if (opt.runin === 'nodejs') {
            return `parentPort.postMessage(${v})`
        }
        return `self.postMessage(${v})`
    }

    //ciit
    let ciit = ''
    if (opt.type === 'function' && opt.execFunctionByInstance) {
        ciit = `
        r = {
            ${cmain}: ${name}
        }
        `
    }
    else {
        ciit = `
        r = ${name}(...input)
        `
    }

    //crm, 另綁messageerror: 宿主送來之訊息於worker端反序列化失敗時worker永遠收不到該呼叫, 且無法得知屬於哪個呼叫, 故通知外層整批reject呼叫中之pending以免懸置
    let crm = ''
    if (opt.runin === 'nodejs') {
        crm = `
        parentPort.on('message', recvMessage)
        parentPort.on('messageerror', (err) => {
            sendMessage({ mode: 'messageerror', msg: err }, 'messageerror of worker')
        })
        `
    }
    else {
        crm = `
        self.onmessage = function (e) {
            recvMessage(e.data)
        }
        self.onmessageerror = function () {
            sendMessage({ mode: 'messageerror', msg: 'worker messageerror' }, 'messageerror of worker') //依規範messageerror之事件data為null, 故以固定訊息通知
        }
        `
    }

    let c = `
${cnwt}

${crvk}

${code}

let instance = null
let initFail = null //初始化失敗(工廠函數拋錯等)時之{ err }, 以物件包裝因錯誤值可為任意值; 後續呼叫以其原始錯誤回應
function init(input){

    //init
    let r
    ${ciit}

    //on
    ${evs}

    //save
    instance = r

}

function sendMessage(data, desc) {
    try {
        ${csm('data')}
    }
    catch (err) {
        //data含無法結構化複製之內容(函數、Symbol等)時postMessage同步拋DataCloneError: 不處理則拋於呼叫路徑外, 於nodejs成worker未捕捉錯誤而崩潰(持久與工廠實體從此死亡), 於瀏覽器成未處理rejection而呼叫永久懸置;
        //依訊息類型改送可複製之字串說明(desc為內容之描述), 使呼叫端得到具名原因且worker續可服務; 兜底再失敗即放棄, 不可遞迴
        let msg = ''
        try {
            msg = desc + ' could not be cloned: ' + String((err && err.message) || err)
        }
        catch (e) {}
        let dataSafe = null
        if (data.mode === 'return') {
            dataSafe = {
                mode: 'return',
                id: data.id,
                fun: data.fun,
                state: 'error',
                msg,
            }
        }
        else if (data.mode === 'emit') {
            dataSafe = {
                mode: 'emit',
                evName: 'error',
                msg,
            }
        }
        else {
            dataSafe = {
                mode: data.mode, //messageerror之通知不可略過, 否則外層呼叫中之pending懸置
                msg,
            }
        }
        try {
            ${csm('dataSafe')}
        }
        catch (e) {}
    }
}

async function run(data) {
    // console.log('inner worker run',data)

    //mode
    let mode = data.mode

    //check
    if(mode !== 'init' && mode !== 'call'){
        return
    }

    //init
    if(mode === 'init'){
        
        try{

            //type
            let type = data.type

            //input
            let input = data.input
    
            //instance
            if(type === 'function'){
                init(...input)
            }
            else if(type === 'object'){
                instance = ${name}
            }

        }
        catch(err){

            //initFail
            initFail = { err }

            //sendMessage
            let res = {
                mode: 'emit',
                evName: 'error',
                msg: err,
            }
            sendMessage(res, 'init error')

        }

    }

    //check
    if(mode === 'call'){
        let state = ''
        let msg = null

        try{

            //check, 初始化失敗時instance為null, 以初始化之原始錯誤回應(同建立失敗之處置), 不得對null取值而得誤導之TypeError
            if (initFail) {
                throw initFail.err
            }

            //fun
            let fun = instance[data.fun]

            //input
            let input = data.input

            //exec, 以await取值: 非async函數回傳非promise時亦可交付, 不得因呼叫.then而失敗
            msg = await fun(...input)
            state = 'success'

        }
        catch(err){
            state = 'error'
            msg = err
        }

        //desc, 回應內容無法結構化複製時兜底說明之描述
        let desc = ''
        if (state === 'success') {
            desc = 'return value of function[' + data.fun + ']'
        }
        else if (initFail) {
            desc = 'init error'
        }
        else {
            desc = 'rejected value of function[' + data.fun + ']'
        }

        //sendMessage
        let res = {
            mode: 'return',
            id: data.id,
            fun: data.fun,
            state,
            msg,
        }
        sendMessage(res, desc)

    }

}

function recvMessage(data) {
    // console.log('inner worker recv:', data)

    //dataRecv
    let dataRecv = data

    //run
    run(dataRecv)

}

${crm}

try{

    //僅以uncaughtExceptionMonitor記錄worker內未捕捉錯誤, 不可註冊uncaughtException與unhandledRejection監聽:
    //於worker內註冊該二監聽會阻止worker依預設終止, 外層收不到error/exit而令pending永久懸置, 殭屍worker並令宿主無法退出;
    //錯誤雖已經error事件傳至外層reject pending, 但無pending且呼叫端未監聽error時(eventemitter3無監聽者時emit不拋錯)此輸出為唯一痕跡, 故保留;
    //本監聽於被包裝程式碼執行之後才安裝, 載入期之錯誤不經此記錄
    process.on('uncaughtExceptionMonitor', (err) => {
        console.error('inner:uncaughtExceptionMonitor', err) //診斷輸出至stderr(同Node未捕捉錯誤之慣例), worker之stdio轉送至宿主, 不得混入宿主stdout之資料流
    })

}
catch(err){}

`

    return c
}


function genOuterWebWorkerCodeFun(funName) {
    let c = `

function ${funName}(){

    //pm
    let pm = genPm()

    //check, worker已死(崩潰、異常退出、主動中止或建立失敗)後之呼叫立即reject(原因見errDead), 不得懸置或因worker已釋放而同步拋錯
    if (bDead) {
        pm.reject(errDead)
        return pm
    }

    //id
    let id = genID()

    //dataSend
    let dataSend = {
        mode:'call',
        id,
        fun: '${funName}',
        input: [...arguments], //若直接用arguments會無法轉譯
    }

    //postMessage, 引數無法結構化複製時postMessage同步拋DataCloneError: 改以reject回報(回傳promise之API不得同步拋錯, 否則每次呼叫新建模式之finally未接上而worker遺留);
    //須送出成功才登記pending, 否則殘留之pending日後於terminate或worker崩潰時被整批reject而無人處理(宿主未處理rejection, nodejs預設即exit 1); postMessage為非同步送達, 同tick內登記無競態
    try {
        wk.postMessage(dataSend)
    }
    catch (err) {
        pm.reject(err)
        return pm
    }

    //pendings, 登記pending promise, 供worker崩潰或異常退出時整批reject
    pendings[id] = pm

    //once
    ev.once(id, (res) => {
        delete pendings[id]
        if (res.state === 'success') {
            pm.resolve(res.msg)
        }
        else {
            pm.reject(res.msg)
        }
    })

    return pm
}

`

    return c
}


function genOuterWebWorkerCodeFuns(funNames) {
    let c = ''
    for (let i = 0; i < funNames.length; i++) {
        let funName = funNames[i]
        c += genOuterWebWorkerCodeFun(funName)
    }
    return c
}


function genOuterWebWorkerCodeInstanceObj(funName) {
    let c = `

    ${funName}: async function(){
    let input = [...arguments]
    let nww = wrapWorker()
    let r = await nww.${funName}(...input)
        .finally(() => {
            nww.terminate() //每次執行完不論成功失敗都要中止worker
        })
    return r
},

`

    return c
}


function genOuterWebWorkerCodeInstanceObjs(funNames) {
    let c = ''
    for (let i = 0; i < funNames.length; i++) {
        let funName = funNames[i]
        c += genOuterWebWorkerCodeInstanceObj(funName)
    }
    return c
}


function addOuterWebWorkerCode(code, funNames, opt = {}) {

    // //codeShow
    // let codeShow = w.replace(code, '`', '\'')

    //codeB64
    let codeB64 = str2b64(code)
    // let codeB64 = code

    //cipwt
    let cipwt = ''
    if (opt.runin === 'nodejs') {
        cipwt = `
        import { Worker } from 'worker_threads'
        `
    }
    else {
        cipwt = `
        import { Base64 } from 'js-base64'
        `
    }

    //cb642str
    let cb642str = ''
    if (opt.runin === 'nodejs') {
        cb642str = `
        //return b64
        return Buffer.from(b64, 'base64').toString('utf8') //Nodejs端使用Buffer解碼 
        `
    }
    else {
        cb642str = `
        //return b64
        return Base64.decode(b64) //瀏覽器端使用Base64解碼 
        // return window.atob(b64) //瀏覽器端執行使用 atob 或 decodeURIComponent(atob()) 或 unescape(decodeURIComponent(atob('ooxx'))) 無法解Buffer轉出的b64, 因這只能解由瀏覽器對應的函數產生b64
        `
    }

    //modify funNames for execFunctionByInstance
    if (opt.type === 'function' && opt.execFunctionByInstance) {
        funNames = [cmain]
    }

    //genOuterWebWorkerCodeFuns
    let cfs = genOuterWebWorkerCodeFuns(funNames)

    //cev
    let cev = _.join(_.map(funNames, (funName) => {
        return `ev.${funName} = ${funName}`
    }), '\n')

    //cnw
    let cnw = ''
    if (opt.runin === 'nodejs') {
        cnw = `
        return new Worker(code, { eval: true })
        `
    }
    else {
        cnw = `
        let blob = new Blob([code]) //blob for Chrome 8+, Firefox 6+, Safari 6.0+, Opera 15+
        let URL = window.URL || window.webkitURL
        urlBlob = URL.createObjectURL(blob)
        return new Worker(urlBlob)
        `
    }

    //curl, worker程式碼之blob URL之釋放: 瀏覽器端由inner於載入後自行revoke, 未載入即中止、載入失敗、建立失敗時由此revoke(重複revoke為no-op), 不revoke則長時運行之頁面隨呼叫次數累積
    let curl = ''
    if (opt.runin === 'nodejs') {
        curl = `
        function revokeUrlBlob() {
            //nodejs以eval字串建立worker, 無blob URL須revoke
        }
        `
    }
    else {
        curl = `
        let urlBlob = null
        function revokeUrlBlob() {
            if (urlBlob) {
                try {
                    let URL = window.URL || window.webkitURL
                    URL.revokeObjectURL(urlBlob)
                }
                catch (err) {}
                urlBlob = null
            }
        }
        `
    }

    //cwt
    let cwt = ''
    if (opt.type === 'function') {
        if (opt.execFunctionByInstance) {
            cwt = `
            ww = async function (){
                let input = [...arguments]
                let nww = wrapWorker()
                let r = await nww.main(...input) //nww.main需跟cmain一致
                    .finally(() => {
                        nww.terminate() //每次執行完不論成功失敗都要中止worker
                    })
                return r
            }
            `
        }
        else {
            cwt = `
            ww = wrapWorker
            `
        }
    }
    else {
        if (opt.execObjectFunsByInstance) {
            cwt = `
            let funs = {
                ${genOuterWebWorkerCodeInstanceObjs(funNames)}
            }
            ww = evem()
            for(let k in funs){
                let v = funs[k]
                ww[k] = v
            }
            `
        }
        else {
            cwt = `
            ww = wrapWorker()
            `
        }
    }

    //cee, worker之error屬致命錯誤, 用emitFatal標記死亡並整批reject pending
    let cee = ''
    if (opt.runin === 'nodejs') {
        cee = `
        wk.on('error', emitFatal)
        `
    }
    else {
        cee = `
        wk.onerror = function (e) {
            emitFatal(e)
            //瀏覽器worker內之未捕捉錯誤不會使worker結束(nodejs則自行結束), 已標記死亡須主動中止以釋放執行緒;
            //不清空wk, 使其後使用者之terminate照常(wk已清空時terminate會發error事件)
            if (wk) {
                wk.terminate()
            }
        }
        `
    }

    //cte
    let cte = ''
    if (opt.runin === 'nodejs') {
        cte = `
        wk.on('exit', (code) => {
            //worker停止(崩潰後exit code 1, 或worker內process.exit之任意code): 凡非由terminate()主動中止一律視為異常,
            //標記死亡並整批reject pending; 崩潰時error事件先行已標記死亡, 此處emitFatal因bDead為true而不重複發送
            if (!bTerminated) {
                emitFatal('worker exit, code['+code+']')
            }
        })
        wk.on('messageerror', (err) => {
            //worker回傳之訊息於宿主端反序列化失敗: 無法得知屬於哪個呼叫, 整批reject呼叫中之pending以免懸置(代價為同時進行中之其他呼叫一併reject, 其後到之回傳因監聽已移除而略過); worker仍可服務故不標死亡;
            //註: MessagePort依序遞送且messageerror就地觸發, 精確歸屬可依序號達成, 因罕見且成熟產品(piscina、workerpool)皆未處理messageerror而不實作
            emitError(err)
        })
        `
    }
    else {
        cte = `
        wk.onmessageerror  = function () {
            //同nodejs之messageerror處置; 依規範messageerror之事件data為null, 故以固定訊息reject
            emitError('worker messageerror')
        }
        `
    }

    //crm
    let crm = ''
    if (opt.runin === 'nodejs') {
        crm = `
        wk.on('message', recvMessage)
        `
    }
    else {
        crm = `
        wk.onmessage = function (e) {
            recvMessage(e.data)
        }
        `
    }

    //cmn
    let cmn = ''
    if (opt.type === 'function' && opt.execFunctionByInstance) {
        cmn = `
        ev.${cmain} = ${cmain}
        `
    }

    let c = `
${cipwt}
import EventEmitter from 'eventemitter3'

function isWindow() {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined'
}

//ww
let ww

function protectShell() {

    //cEnv
    let cEnv = isWindow()?'browser':'nodejs'
    
    //check, 後續會有Nodejs或瀏覽器依賴的API例如window.atob或Buffer, 於import階段時就先行偵測跳出
    if(cEnv !== '${opt.runin}'){
        return null
    }

    function evem() {
        return new EventEmitter()
    }

    function genPm() {
        let resolve
        let reject
        let p = new Promise(function() {
            resolve = arguments[0]
            reject = arguments[1]
        })
        p.resolve = resolve
        p.reject = reject
        return p
    }

    function genID(len = 10) {
        let uuid = []
        let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')
        let radix = chars.length
        for (let i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix]
        let r = uuid.join('')
        return r
    }

    function b642str(b64) {
        ${cb642str}
    }

    //codeShow

    //codeB64, 此處需提供worker執行程式碼, 因有特殊符號轉譯困難, 故需先轉base64再使用
    let codeB64 = \`${codeB64}\`

    //code
    let code = b642str(codeB64)

    function wrapWorker() {

        //evem
        let ev = evem()

        //pendings, 呼叫中promise登記表; bDead, worker已死標記(死後呼叫立即reject); errDead, 死後呼叫之reject原因; bTerminated, 由terminate()主動中止標記(exit事件不視為異常)
        let pendings = {}
        let bDead = false
        let errDead = 'worker is dead'
        let bTerminated = false

        function rejectPendings(err) {
            //整批reject呼叫中之pending, 為pending清理之單一擁有者: pending promise之settle僅靠worker回傳return訊息, worker崩潰或被中止即永無回音
            for (let id in pendings) {
                let pm = pendings[id]
                delete pendings[id]
                ev.removeAllListeners(id) //清除genOuterWebWorkerCodeFun內對應once監聽, 避免監聽器殘留
                pm.reject(err)
            }
        }

        function emitError(err) {
            //先整批reject pending, 錯誤發生時呼叫端不得永久懸置
            rejectPendings(err)
            ev.emit('error', err)
        }

        ${curl}

        function emitFatal(err) {
            //致命錯誤: worker已無法再服務(崩潰,異常退出,建立失敗), 標記死亡使後續呼叫立即reject; 已標記則不重複發送
            if (bDead) {
                return
            }
            bDead = true
            emitError(err)
            revokeUrlBlob() //載入失敗或建立失敗時worker未及自行revoke
        }

        function genWorker(code) {

            //new Worker
            try {
                ${cnw}
            }
            catch (err) {
                errDead = err //保存建立失敗之原始錯誤(如瀏覽器CSP阻擋)供後續呼叫reject: 此時ev尚未回傳, emit之error無人能監聽而遺失
                emitFatal(err)
            }

        }

        //genWorker
        let wk = genWorker(code)

        //check, 於瀏覽器端可能會遭遇IE11安全性問題, 或被CSP的worker-src或script-src設定阻擋
        //建立失敗時不回傳null而照常回傳ev: 後續呼叫以原始錯誤reject, 而非由呼叫端對null取值得到誤導之TypeError
        if (!wk && !bDead) {
            errDead = 'invalid worker'
            emitFatal(errDead)
        }

        function terminate() {
            if (wk) {
                bTerminated = true //先標記再中止, 使exit事件不被視為異常
                if (!bDead) {
                    bDead = true //中止後之新呼叫立即reject, 不得因worker已釋放而同步拋錯
                    errDead = 'worker has been terminated'
                }
                wk.terminate()
                wk = undefined
                revokeUrlBlob() //未載入即中止時worker未及自行revoke(如引數無法複製而立即中止)
                rejectPendings('worker has been terminated') //呼叫中之pending一併reject: 主動中止後worker不再回應, 不reject即永久懸置; 屬預期操作故不emit error
            }
            else {
                emitError('worker has been terminated')
            }
        }

        function init(){

            //dataSend
            let dataSend = {
                mode:'init',
                type:'${opt.type}',
                input: [...arguments], //若直接用arguments會無法轉譯
            }

            //postMessage, 初始化引數無法結構化複製時postMessage同步拋錯: 先中止已建之worker(否則遺留而撐住宿主)再原樣拋出, 維持工廠函數(同步回傳之API)以同步拋錯回報之既有契約
            try {
                wk.postMessage(dataSend)
            }
            catch (err) {
                terminate()
                throw err
            }

        }

        ${cfs}

        function recvMessage(data) {
            // console.log('outer worker recv:', data)

            //dataRecv
            let dataRecv = data

            //mode, worker內使用者程式碼自行送出之非協定訊息(含null)一律略過, 不得於宿主拋錯
            let mode = dataRecv && dataRecv.mode

            //check
            if(mode !== 'emit' && mode !== 'return' && mode !== 'messageerror'){
                return
            }

            //emit
            if(mode === 'emit'){

                //emit
                ev.emit(dataRecv.evName, dataRecv.msg)

            }

            //return
            if(mode === 'return'){

                //emit
                ev.emit(dataRecv.id, dataRecv)

            }

            //messageerror, worker端收不到(反序列化失敗)宿主送去之訊息: 無法得知屬於哪個呼叫, 整批reject呼叫中之pending以免懸置; worker仍可服務故不標死亡
            if(mode === 'messageerror'){
                emitError(dataRecv.msg)
            }

        }
        
        //建立成功才綁定事件與初始化(建立失敗時wk為undefined, 已標記死亡)
        if (wk) {

            //bind recvMessage
            ${crm}

            //bind emitFatal
            ${cee}

            //bind emitFatal(nodejs exit)或emitError(browser messageerror) for special condition
            ${cte}

            //init
            init([...arguments]) //若直接用arguments會無法轉譯

        }

        ${cev}
        ${cmn}
        ev.terminate = terminate
        return ev
    }

    //set ww
    ${cwt}

}
protectShell()

//outer層運行於引用產物之宿主程序, 刻意不註冊任何process監聽(含uncaughtExceptionMonitor):
//每支產物各註冊一次(runin為both者含兩個outer而註冊兩次), 只會把與本函式庫無關之宿主錯誤重印至stdout, 數量多時並觸發MaxListenersExceededWarning;
//宿主未捕捉錯誤之處置屬宿主(預設由Node印出並終止); worker之致命error與非主動exit已由wrapWorker之emitFatal整批reject pending;
//曾註冊吞噬型uncaughtException與unhandledRejection(只印不終止, 劫持宿主錯誤語意), 其後僅留uncaughtExceptionMonitor, 皆已移除, 勿再加回

export default ww

`

    return c
}


/**
 * 使用rollup轉譯檔案，並封裝至前端web worker內或後端nodejs worker內
 *
 * @param {Object} opt 輸入設定物件
 * @param {String} opt.name 輸入模組名稱字串，將來會掛於winodw下或於node引入使用
 * @param {String} [opt.type='object'] 輸入模組類型字串，可選'function'、'object'。若使用'function'，於初始化後可呼叫terminate銷毀；若使用'object'，預設execObjectFunsByInstance為true，執行完指定函數後亦自動銷毀，若改execObjectFunsByInstance為false，就一樣得於初始化後呼叫terminate銷毀。回傳函數或物件。轉譯後會掛載模組名稱至window下，若type使用'function'時則window['模組名稱']為函數，得自己初始化才能呼叫其內函數或監聽事件；若type使用'object'時則window['模組名稱']為物件，可直接呼叫其內函數預設'object'
 * @param {Boolean} [opt.execFunctionByInstance=true] 輸入若模組類型為物件type='function'時，是否將function視為使用獨立實體執行並自動銷毀實體布林值，例如原模組就是一個運算函數，不需要回傳eventemmitter監聽事件，預設true
 * @param {Boolean} [opt.execObjectFunsByInstance=true] 輸入若模組類型為物件type='object'時，各函式是否使用獨立實體執行布林值，例如使用到stream的各函式會因共用同一個實體導致降速，故各函數需自動有各自實體，預設true
 * @param {Array} [opt.funNames=[]] 輸入模組可被呼叫的函數名稱陣列，預設[]
 * @param {Array} [opt.evNames=[]] 輸入模組可監聽的函數名稱陣列，預設[]
 * @param {String} opt.fpSrc 輸入原始碼檔案位置字串
 * @param {Boolean} [opt.bReturnCode=false] 輸入是否回傳轉譯後程式碼而不輸出布林值，設定為true時則fpTar失效，預設false
 * @param {String} opt.fpTar 輸入轉譯完程式碼檔案儲存位置字串
 * @param {String} [opt.nameDistType=''] 輸入轉譯檔案名稱格式字串，可選'kebabCase'，預設''
 * @param {Function} [opt.hookNameDist=null]  輸入強制指定轉譯檔案名稱函數，預設null，會複寫nameDistType之處理結果
 * @param {String} [opt.formatOut='es'] 輸入欲轉譯成js格式字串，可選'umd'、'iife'、'es'，其中'iife'僅支援runin為'browser'，預設'es'
 * @param {String} [opt.targets='new'] 輸入轉譯等級字串，可選'new'、'old'，預設'new'
 * @param {String} [opt.runin='browser'] 輸入執行環境字串，可選'nodejs'、'browser'，預設'browser'
 * @param {Boolean} [opt.bNodePolyfill=false] 輸入轉譯是否自動加入Nodejs polyfill布林值，主要把Nodejs語法(例如fs)轉為瀏覽器端語法，預設false
 * @param {Boolean} [opt.bMinify=true] 輸入轉譯檔案是否進行壓縮布林值，預設true
 * @param {Boolean} [opt.keepFnames=false] 輸入當轉譯檔案需壓縮時，是否保留函數名稱布林值，預設false
 * @param {Array} [opt.mangleReserved=[]] 輸入當轉譯檔案需壓縮時，需保留函數名稱或變數名稱陣列，預設[]
 * @param {Array} [opt.mainFields=null] 輸入取用套件內環境入口時，可強制給予循序入口陣列，各入口可選'browser'、'module'、'main'，給予null則代表用rollup內建，預設null
 * @param {Object} [opt.globals={}] 輸入指定內外模組的關聯性物件，預設{}
 * @param {Array} [opt.external=[]] 輸入指定內部模組需引用外部模組陣列，預設[]
 * @param {Boolean} [opt.bLog=true] 輸入是否顯示預設log布林值，預設true
 */
async function rollupWorkerCore(opt = {}) {
    let rpOpt

    //name
    let name = _.get(opt, 'name', null)
    if (!w.isestr(name)) {
        return Promise.reject('invalid opt.name')
    }

    //type
    let type = _.get(opt, 'type', null)
    if (type !== 'function' && type !== 'object') {
        type = 'object'
    }

    //execFunctionByInstance
    let execFunctionByInstance = _.get(opt, 'execFunctionByInstance', null)
    if (!w.isbol(execFunctionByInstance)) {
        execFunctionByInstance = true
    }

    //execObjectFunsByInstance
    let execObjectFunsByInstance = _.get(opt, 'execObjectFunsByInstance', null)
    if (!w.isbol(execObjectFunsByInstance)) {
        execObjectFunsByInstance = true
    }

    //funNames
    let funNames = _.get(opt, 'funNames', null)
    if (!w.isearr(funNames)) {
        if (type === 'function' && execFunctionByInstance) {
            funNames = []
        }
        else {
            return Promise.reject('invalid opt.funNames')
        }
    }

    //evNames, 可不給予監聽事件
    let evNames = _.get(opt, 'evNames', null)
    if (!w.isarr(evNames)) {
        evNames = []
    }

    //fpSrc
    let fpSrc = _.get(opt, 'fpSrc', null)
    if (!w.fsIsFile(fpSrc)) {
        return Promise.reject('opt.fpSrc is not file')
    }

    //fn
    let fn = w.getFileName(fpSrc)

    //bReturnCode
    let bReturnCode = _.get(opt, 'bReturnCode', null)
    if (!w.isbol(bReturnCode)) {
        bReturnCode = false
    }

    //fpTar
    let fpTar = _.get(opt, 'fpTar', null)
    if (!bReturnCode && !w.isestr(fpTar)) {
        return Promise.reject('invalid opt.fpTar')
    }

    //nameDistType
    let nameDistType = _.get(opt, 'nameDistType', null)

    //nameDist
    let nameDist = name
    if (nameDistType === 'kebabCase') {
        nameDist = _.kebabCase(name)
    }

    //hookNameDist
    let hookNameDist = _.get(opt, 'hookNameDist', null)
    if (_.isFunction(hookNameDist)) {
        nameDist = hookNameDist(nameDist, name, fn)
    }

    //formatOut, umd可支援nodejs或為瀏覽器端直接使用, es為供vue-cli或webpack使用
    let formatOut = _.get(opt, 'formatOut', null)
    if (!formatOut) {
        formatOut = 'es'
    }

    //targets
    let targets = opt.targets
    if (!w.isbol(targets)) {
        targets = 'new' //於瀏覽器端，因程式碼用字串+blob方式作為web worker初始化之方式, 無法支援ie11(會需要改安全性)只好放棄, 且若被CSP檔那只能由伺服器改設定, 故此處直接改用最新語法new打包
    }

    //runin
    let runin = _.get(opt, 'runin', null)
    if (runin !== 'nodejs' && runin !== 'browser') {
        console.log(`invalid runin[${runin}], set to 'browser'`)
        runin = 'browser'
    }

    //check, iife以全域識別子傳入external模組, nodejs版outer引用之worker_threads於任何環境皆非全域變數, 產物會建置成功而載入即拋ReferenceError, 故iife僅支援runin為browser
    if (formatOut === 'iife' && runin !== 'browser') {
        return Promise.reject(`formatOut[iife] only supports runin[browser], but runin is [${runin}]`)
    }

    //bNodePolyfill
    let bNodePolyfill = _.get(opt, 'bNodePolyfill', null)
    if (!w.isbol(bNodePolyfill)) {
        bNodePolyfill = false
    }

    //bMinify
    let bMinify = _.get(opt, 'bMinify', null)
    if (!w.isbol(bMinify)) {
        bMinify = true
    }

    //keepFnames
    let keepFnames = _.get(opt, 'keepFnames', null)
    if (!w.isbol(keepFnames)) {
        keepFnames = false
    }

    //mangleReserved
    let mangleReserved = _.get(opt, 'mangleReserved', null)
    if (!w.isarr(mangleReserved)) {
        mangleReserved = []
    }

    //mainFields
    let mainFields = _.get(opt, 'mainFields', null)
    if (!w.isearr(mainFields)) {
        mainFields = null
    }

    //globals, 提供字串需解析成物件, 指定內外模組的關聯性，左邊key為內部使用之模組名稱，右邊value為外部提供之模組名稱
    let globals = _.get(opt, 'globals', null)
    if (!w.isobj(globals)) {
        globals = {}
    }

    //external, 提供字串需解析成陣列, 指定哪些內部模組需引用外部模組
    let external = _.get(opt, 'external', null)
    if (!w.isarr(external)) {
        external = []
    }

    //bLog
    let bLog = _.get(opt, 'bLog', null)
    if (!w.isbol(bLog)) {
        bLog = true
    }

    //console
    if (bLog) {
        console.log('transpiling: ' + w.getFileName(fpSrc))
    }

    //rollupFile, 預處理, 把code內的關聯都打包出來, 故需用es, 程式碼之後還會轉譯故targets使用new, 此處要用rollupFile對原檔案打包, 才能正確引入相關模組與套件
    rpOpt = {
        //不沿用設定
        // name, //打包成cjs不需要name
        fn,
        fdSrc: w.getPathParent(fpSrc),
        // fdTar: '', //沒給代表回傳程式碼
        format: 'cjs', //rollupFile須使用format
        targets,
        bSourcemap: false, //預設值為true得關閉
        bBanner: false,
        runin,
        bNodePolyfill,
        bMinify,
        keepFnames,
        mangleReserved: [name, ...mangleReserved],
        mainFields,
        globals: {},
        external: [],
        bLog: false,
    }
    if (runin === 'nodejs') {
        rpOpt.globals = { //需指定剔除Nodejs的inner的worker的引用
            'worker_threads': 'worker_threads',
        }
        rpOpt.external = [
            'worker_threads',
        ]
    }
    rpOpt.globals = {
        ...rpOpt.globals,
        ...globals,
    }
    rpOpt.external = [
        ...rpOpt.external,
        ...external,
    ]
    let codeTransOri = await rollupFile(rpOpt)
    // fs.writeFileSync(`./z-1-node[${runin}]-1-codeTransOri.js`, codeTransOri, 'utf8')

    //clearExportCode
    let codeTransClr = clearExportCode(codeTransOri, name)
    // fs.writeFileSync(`./z-1-node[${runin}]-2-codeTransClr.js`, codeTransClr, 'utf8')

    //addInnerWebWorkerCode
    let codeTransAdd = addInnerWebWorkerCode(codeTransClr, name, evNames, { runin, type, execFunctionByInstance, execObjectFunsByInstance })
    // fs.writeFileSync(`./z-1-node[${runin}]-3-codeTransAdd.js`, codeTransAdd, 'utf8')

    //addOuterWebWorkerCode
    let codeMerge = addOuterWebWorkerCode(codeTransAdd, funNames, { runin, type, execFunctionByInstance, execObjectFunsByInstance })
    // fs.writeFileSync(`./z-1-node[${runin}]-4-codeMerge.js`, codeMerge, 'utf8')

    //rollupCode, 轉譯合併內外worker的程式碼
    rpOpt = {
        //不沿用設定
        name: nameDist,
        formatOut, //rollupCode使用formatIn(可不給)與formatOut
        targets,
        bSourcemap: false, //rollupCode不提供sourcemap
        bBanner: false, //rollupCode不提供banner
        runin,
        bNodePolyfill: false, //outer不需使用node polyfill
        bMinify,
        mainFields: null, //outer不需使用mainFields
        globals: {},
        external: [],
        bLog: false,
    }
    if (runin === 'nodejs') {
        rpOpt.globals = { //需指定剔除Nodejs的inner的worker的引用
            'worker_threads': 'worker_threads',
        }
        rpOpt.external = [
            'worker_threads',
        ]
    }
    rpOpt.globals = {
        ...rpOpt.globals,
        ...globals,
    }
    rpOpt.external = [
        ...rpOpt.external,
        ...external,
    ]
    let codeRes = await rollupCode(codeMerge, rpOpt)
    // fs.writeFileSync(`./z-1-node[${runin}]-5-codeRes.js`, codeRes, 'utf8')

    if (bReturnCode) {
        return codeRes
    }

    //writeFileSync
    fs.writeFileSync(fpTar, codeRes, 'utf8')

    //console
    if (bLog) {
        console.log('\x1b[32m%s\x1b[0m', 'output: ' + w.getFileName(fpTar))
    }

}


export default rollupWorkerCore
