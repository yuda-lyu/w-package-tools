import fs from 'fs'
import _ from 'lodash-es'
import w from './wsemip.umd.js'
import rollupFile from './rollupFile.mjs'
import rollupCode from './rollupCode.mjs'


let cmain = 'main' //'__system__main__'


function str2b64(str) {
    return Buffer.from(str, 'utf8').toString('base64')
}


function clearExportDefault(code, name) {

    //cled, 通常會編譯成為「export default OOO;」
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

    //clead, 有專案設定導致編譯成為非預期格式「export { OOO as default };」
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

    //cleadm, 有專案設定導致編譯成為非預期格式「export{OOO as default};」, 開啟壓縮後只有as前後有空白
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

    //err
    console.log(red.err, read.err, readm.err)
    throw new Error('can not clear export default')
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
        sendMessage(res)

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
    if (opt.bNode) {
        cnwt = `
        let { parentPort } = require('worker_threads') //因尚未支援es6 import得使用require
        `
    }

    //csm
    let csm = ''
    if (opt.bNode) {
        csm = `
        parentPort.postMessage(data)
        `
    }
    else {
        csm = `
        self.postMessage(data)
        `
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

    //crm
    let crm = ''
    if (opt.bNode) {
        crm = `
        parentPort.on('message', recvMessage)
        `
    }
    else {
        crm = `
        self.onmessage = function (e) {
            recvMessage(e.data)
        }
        `
    }

    let c = `
${cnwt}

${code}

let instance = null
function init(input){

    //init
    let r
    ${ciit}

    //on
    ${evs}

    //save
    instance = r

}

function sendMessage(data) {
    ${csm}
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
        
            //sendMessage
            let res = {
                mode: 'emit',
                evName: 'error',
                msg: err,
            }
            sendMessage(res)

        }
            
    }

    //check
    if(mode === 'call'){
        let state = ''
        let msg = null

        try{

            //fun
            let fun = instance[data.fun]

            //input
            let input = data.input

            //exec
            await fun(...input)
                .then((suc) => {
                    state='success'
                    msg=suc
                })
                .catch((err) => {
                    state='error'
                    msg=err
                })

        }
        catch(err){
            state = 'error'
            msg = err
        }
        
        //sendMessage
        let res = {
            mode: 'return',
            id: data.id,
            fun: data.fun,
            state,
            msg,
        }
        sendMessage(res)

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
    process.on('unhandledRejection', (err) => {
        console.log('inner:unhandledRejection', err)
    })
    process.on('uncaughtException', (err) => {
        console.log('inner:uncaughtException', err)
    })
    process.on('uncaughtExceptionMonitor', (err) => {
        console.log('inner:uncaughtExceptionMonitor', err)
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

    //id
    let id = genID()

    //dataSend
    let dataSend = {
        mode:'call',
        id,
        fun: '${funName}',
        input: [...arguments], //若直接用arguments會無法編譯
    }

    //postMessage
    wk.postMessage(dataSend)

    //once
    ev.once(id, (res) => {
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

    //cEnvRun
    let cEnvRun = opt.bNode ? 'nodejs' : 'browser'

    //cipwt
    let cipwt = ''
    if (opt.bNode) {
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
    if (opt.bNode) {
        cb642str = `
        return Buffer.from(b64, 'base64').toString('utf8') //Nodejs端使用Buffer
        `
    }
    else {
        cb642str = `
        return Base64.decode(b64)
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
    if (opt.bNode) {
        cnw = `
        return new Worker(code, { eval: true })
        `
    }
    else {
        cnw = `
        let blob = new Blob([code]) //blob for Chrome 8+, Firefox 6+, Safari 6.0+, Opera 15+
        let URL = window.URL || window.webkitURL
        return new Worker(URL.createObjectURL(blob))
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

    //cee
    let cee = ''
    if (opt.bNode) {
        cee = `
        wk.on('error', emitError)
        `
    }
    else {
        cee = `
        wk.onerror = emitError
        `
    }

    //cte
    let cte = ''
    if (opt.bNode) {
        cte = `
        wk.on('exit', (code) => {
            //The 'exit' event is emitted once the worker has stopped. If the worker exited by calling process.exit(), the exitCode parameter is the passed exit code. If the worker was terminated, the exitCode parameter is 1.
            if (code !== 1) {
                emitError('exit code['+code+'] !== 1')
            }
        })
        `
    }
    else {
        cte = `
        wk.onmessageerror  = function (e) {
            emitError(e.data)
        }
        `
    }

    //crm
    let crm = ''
    if (opt.bNode) {
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
    if(cEnv !== '${cEnvRun}'){
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

    //codeB64, 此處需提供worker執行程式碼, 因有特殊符號編譯困難, 故需先轉base64再使用
    let codeB64 = '${codeB64}'

    //code
    let code = b642str(codeB64)

    function wrapWorker() {

        //evem
        let ev = evem()

        function genWorker(code) {

            //new Worker
            try {
                ${cnw}
            }
            catch (err) {
                emitError(err)
            }

        }

        //genWorker
        let wk = genWorker(code)

        //check, 於瀏覽器端可能會遭遇IE11安全性問題, 或被CSP的worker-src或script-src設定阻擋
        if (!wk) {
            emitError('invalid worker')
            return null
        }

        function terminate() {
            if (wk) {
                wk.terminate()
                wk = undefined
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
                input: [...arguments], //若直接用arguments會無法編譯
            }

            //postMessage
            wk.postMessage(dataSend)

        }

        ${cfs}

        function recvMessage(data) {
            // console.log('outer worker recv:', data)

            //dataRecv
            let dataRecv = data

            //mode
            let mode = dataRecv.mode

            //check
            if(mode !== 'emit' && mode !== 'return'){
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

        }
        
        //bind recvMessage
        ${crm}

        function emitError(err) {
            ev.emit('error', err)
        }

        //bind emitError
        ${cee}

        //bind emitError for special condition
        ${cte}

        //init
        init([...arguments]) //若直接用arguments會無法編譯

        ${cev}
        ${cmn}
        ev.terminate = terminate
        return ev
    }

    //set ww
    ${cwt}

}
protectShell()

try{
    process.on('unhandledRejection', (err) => {
        console.log('outer:unhandledRejection', err)
    })
    process.on('uncaughtException', (err) => {
        console.log('outer:uncaughtException', err)
    })
    process.on('uncaughtExceptionMonitor', (err) => {
        console.log('outer:uncaughtExceptionMonitor', err)
    })
}
catch(err){}

export default ww

`

    return c
}


/**
 * 使用rollup編譯檔案，並封裝至前端web worker內或後端nodejs worker內
 *
 * @param {Object} opt 輸入設定物件
 * @param {String} opt.name 輸入模組名稱字串，將來會掛於winodw下或於node引入使用
 * @param {String} [opt.type='object'] 輸入模組類型字串，可選'function'、'object'。若使用'function'，於初始化後可呼叫terminate銷毀；若使用'object'，預設execObjectFunsByInstance為true，執行完指定函數後亦自動銷毀，若改execObjectFunsByInstance為false，就一樣得於初始化後呼叫terminate銷毀。回傳函數或物件。編譯後會掛載模組名稱至window下，若type使用'function'時則window['模組名稱']為函數，得自己初始化才能呼叫其內函數或監聽事件；若type使用'object'時則window['模組名稱']為物件，可直接呼叫其內函數預設'object'
 * @param {Boolean} [opt.execFunctionByInstance=true] 輸入若模組類型為物件type='function'時，是否將function視為使用獨立實體執行並自動銷毀實體布林值，例如原模組就是一個運算函數，不需要回傳eventemmitter監聽事件，預設true
 * @param {Boolean} [opt.execObjectFunsByInstance=true] 輸入若模組類型為物件type='object'時，各函式是否使用獨立實體執行布林值，例如使用到stream的各函式會因共用同一個實體導致降速，故各函數需自動有各自實體，預設true
 * @param {Array} [opt.funNames=[]] 輸入模組可被呼叫的函數名稱陣列，預設[]
 * @param {Array} [opt.evNames=[]] 輸入模組可監聽的函數名稱陣列，預設[]
 * @param {String} opt.fpSrc 輸入原始碼檔案位置字串
 * @param {Boolean} [opt.bReturnCode=false] 輸入是否回傳編譯後程式碼而不輸出布林值，設定為true時則fpTar失效，預設false
 * @param {String} opt.fpTar 輸入編譯完程式碼檔案儲存位置字串
 * @param {String} [opt.nameDistType=''] 輸入編譯檔案名稱格式字串，可選'kebabCase'，預設''
 * @param {Function} [opt.hookNameDist=null]  輸入強制指定編譯檔案名稱函數，預設null，會複寫nameDistType之處理結果
 * @param {String} [opt.formatOut='es'] 輸入欲編譯成js格式字串，可選'umd'、'iife'、'es'，預設'es'
 * @param {String} [opt.targets='new'] 輸入編譯等級字串，可選'new'、'old'，預設'new'
 * @param {Boolean} [opt.bNode=false] 輸入是否運行於Nodejs布林值，預設false
 * @param {Boolean} [opt.bNodePolyfill=false] 輸入編譯是否自動加入Nodejs polyfill布林值，主要把Nodejs語法(例如fs)轉為瀏覽器端語法，預設true
 * @param {Boolean} [opt.bMinify=true] 輸入編譯檔案是否進行壓縮布林值，預設true
 * @param {Boolean} [opt.keepFnames=false] 輸入當編譯檔案需壓縮時，是否保留函數名稱布林值，預設false
 * @param {Array} [opt.mangleReserved=[]] 輸入當編譯檔案需壓縮時，需保留函數名稱或變數名稱布林值，預設[]
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

    //formatOut, umd為瀏覽器端直接使用, es為供vue-cli或webpack使用
    let formatOut = _.get(opt, 'formatOut', null)
    if (!formatOut) {
        formatOut = 'es'
    }

    //targets
    let targets = opt.targets
    if (!w.isbol(targets)) {
        targets = 'new' //於瀏覽器端，因程式碼用字串+blob方式作為web worker初始化之方式, 無法支援ie11(會需要改安全性)只好放棄, 且若被CSP檔那只能由伺服器改設定, 故此處直接改用最新語法new打包
    }

    //bNode
    let bNode = _.get(opt, 'bNode', null)
    if (!w.isbol(bNode)) {
        bNode = false
    }

    //bNodePolyfill
    let bNodePolyfill = _.get(opt, 'bNodePolyfill', null)
    if (!w.isbol(bNodePolyfill)) {
        bNodePolyfill = false
    }
    // if (bNode) { //即使是node環境也可能需要polyfill, 因程式碼語法已修改成添加import buffer或timers等, 需要通過polyfill才能使用
    //     bNodePolyfill = false
    // }

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

    //bLog
    let bLog = _.get(opt, 'bLog', null)
    if (!w.isbol(bLog)) {
        bLog = true
    }

    //console
    if (bLog) {
        console.log('transpiling: ' + w.getFileName(fpSrc))
    }

    //rollupFile, 預處理, 把code內的關聯都打包出來, 故需用es, 程式碼之後還會編譯故targets使用new, 此處要用rollupFile對原檔案打包, 才能正確引入相關模組與套件
    rpOpt = {
        // name, //打包成es不需要name
        fn, //rollupFile會偵測副檔名作為formatIn
        fdSrc: w.getPathParent(fpSrc),
        // fdTar: '', //沒給代表回傳程式碼
        format: 'es', //輸出formatOut
        targets,
        bNodePolyfill,
        bMinify,
        keepFnames,
        mangleReserved: [name, ...mangleReserved],
        bBanner: false,
        bSourcemap: false, //預設值為true得關閉
        bLog: false,
    }
    if (bNode) {
        rpOpt.globals = {
            'worker_threads': 'worker_threads',
        }
        rpOpt.external = [
            'worker_threads',
        ]
    }
    else {
        // globals, //inner必須有完整依賴程式碼
        // external, //inner必須有完整依賴程式碼
    }
    let codeTransOri = await rollupFile(rpOpt)
    // fs.writeFileSync('./z0-codeTransOri.js', codeTransOri, 'utf8')

    //clearExportDefault
    let codeTrans = clearExportDefault(codeTransOri, name)
    // fs.writeFileSync('./z1-codeTrans.js', codeTrans, 'utf8')

    //addInnerWebWorkerCode
    let codeTransAdd = addInnerWebWorkerCode(codeTrans, name, evNames, { bNode, type, execFunctionByInstance, execObjectFunsByInstance })
    // fs.writeFileSync('./z2-codeTransAdd.js', codeTransAdd, 'utf8')

    //addOuterWebWorkerCode
    let codeMerge = addOuterWebWorkerCode(codeTransAdd, funNames, { bNode, type, execFunctionByInstance, execObjectFunsByInstance })
    // fs.writeFileSync('./z3-codeMerge.js', codeMerge, 'utf8')

    //rollupCode
    rpOpt = {
        name: nameDist,
        formatOut,
        targets,
        bNodePolyfill: false, //outer不需使用node polyfill
        bMinify,
        bBanner: false,
        bSourcemap: false, //rollupCode不提供sourcemap
        bLog: false,
    }
    if (bNode) {
        rpOpt.globals = {
            'worker_threads': 'worker_threads',
        }
        rpOpt.external = [
            'worker_threads',
        ]
    }
    else {
        // globals, //outer無依賴
        // external, //outer無依賴
    }
    let codeRes = await rollupCode(codeMerge, rpOpt)
    // fs.writeFileSync('./z4-codeRes.js', codeRes, 'utf8')

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
