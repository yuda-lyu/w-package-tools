import fs from 'fs'
import _ from 'lodash'
import * as w from './wsemip.es.mjs' //因mocha無法識別得用*轉出default
import rollupFile from './rollupFile.mjs'
import rollupCode from './rollupCode.mjs'


function str2b64(str) {
    return Buffer.from(str).toString('base64')
}


function clearExportDefault(code, name) {
    return code.replace(`export default ${name};`, '')
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


function addInnerWebWorkerCode(code, name, evNames) {

    //evs
    let evs = genInnerWebWorkerCodeEvs(evNames)

    let c = `

${code}

let instance = null
function init(input){

    //init
    let r = ${name}(...input)

    //on
    ${evs}

    //save
    instance = r

}

function sendMessage(data) {
    self.postMessage(data)
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

self.onmessage = function (e) {
    // console.log('inner worker recv:', e.data)

    //dataRecv
    let dataRecv = e.data

    //run
    run(dataRecv)

}
    
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
    let nww = wrapWebWorker()
    let r = await nww.${funName}(...input)
        .finally(() => {
            nww.terminate() //每次執行完不論成功失敗都要中止web worker
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


function addOuterWebWorkerCode(code, type, funNames, opt = {}) {

    // //codeShow
    // let codeShow = w.replace(code, '`', '\'')

    //codeB64
    let codeB64 = str2b64(code)

    //genOuterWebWorkerCodeFuns
    let cfs = genOuterWebWorkerCodeFuns(funNames)

    //cev
    let cev = _.join(_.map(funNames, (funName) => {
        return `ev.${funName} = ${funName}`
    }), '\n')

    //cofs
    let cofs
    if (opt.execObjectFunsByInstance) {
        cofs = `
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
        cofs = `
        ww = wrapWebWorker()
        `
    }

    let c = `
import EventEmitter from 'eventemitter3'

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
    return atob(b64) //預設是瀏覽器端執行故使用atob
}
// function b642str(b64) {
//     return Buffer.from(b64, 'base64').toString('ascii')
// }

//codeShow

//codeB64, 此處需提供worker執行程式碼, 因有特殊符號編譯困難, 故需先轉base64再使用
let codeB64 = '${codeB64}'

//code
let code = b642str(codeB64)

function wrapWebWorker(){

    function genWebWorker(code) {

        //URL
        let URL = window.URL || window.webkitURL

        //blob
        let blob
        try {
            //blob for Chrome 8+, Firefox 6+, Safari 6.0+, Opera 15+
            blob = new Blob([code])
            return new Worker(URL.createObjectURL(blob))
        }
        catch (err) {
            console.log(err)
        }

    }

    //genWebWorker
    let wk = genWebWorker(code)

    //check, IE11安全性問題
    if (wk === null) {
        console.log('invalid webworker')
        return null
    }

    function terminate() {
        wk.terminate()
        wk = undefined
    }

    //evem
    let ev = evem()

    function init(){

        //dataSend
        let dataSend = {
            mode:'init',
            type:'${type}',
            input: [...arguments], //若直接用arguments會無法編譯
        }

        //postMessage
        wk.postMessage(dataSend)

    }

    ${cfs}
    
    //onmessage
    wk.onmessage = function (e) {
        // console.log('outer worker recv:', e.data)

        //dataRecv
        let dataRecv = e.data

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

    //init
    init([...arguments]) //若直接用arguments會無法編譯

    ${cev}
    ev.terminate = terminate
    return ev
}

let ww=null
if('${type}'==='function'){
    ww = wrapWebWorker
}
else if('${type}'==='object'){
    ${cofs}
}

export default ww

`

    return c
}


/**
 * 使用rollup編譯檔案，並封裝至前端web worker內
 *
 * @param {Object} opt 輸入設定物件
 * @param {String} opt.name 輸入模組名稱字串，將來會掛於winodw下
 * @param {String} [opt.type='object'] 輸入模組類型字串，可選'object'、'function'，預設'object'
 * @param {Array} opt.funNames 輸入模組可被呼叫的函數名稱陣列
 * @param {Array} [opt.evNames=[]] 輸入模組可監聽的函數名稱陣列，預設[]
 * @param {String} opt.fpSrc 輸入原始碼檔案位置字串
 * @param {String} opt.fpTar 輸入編譯完程式碼檔案儲存位置字串
 * @param {String} [opt.nameDistType=''] 輸入編譯檔案名稱格式字串，可選'kebabCase'，預設''
 * @param {Function} [opt.hookNameDist=null]  輸入強制指定編譯檔案名稱函數，預設null，會複寫nameDistType之處理結果
 * @param {String} [opt.formatOut='es'] 輸入欲編譯成js格式字串，可選'umd'、'iife'、'es'，預設'umd'
 * @param {String} [opt.targets='new'] 輸入編譯等級字串，可選'new'、'old'，預設'new'
 * @param {Boolean} [opt.execObjectFunsByInstance=true] 輸入若模組類型為物件「type='object'」時，各函式使用獨立實體執行布林值，例如使用到stream的各函式會因共用同一個實體導致降速，故各函數需自動有各自實體，預設true
 * @param {Boolean} [opt.bNodePolyfill=false] 輸入編譯檔案是否自動加入node polyfill布林值，主要把node專用語法(例如fs)轉為瀏覽器端語法，預設true
 * @param {Boolean} [opt.bMinify=true] 輸入編譯檔案是否進行壓縮布林值，預設true
 * @param {Boolean} [opt.keepFnames=false] 輸入當編譯檔案需壓縮時，是否保留函數名稱布林值，預設false
 * @param {Array} [opt.mangleReserved=[]] 輸入當編譯檔案需壓縮時，需保留函數名稱或變數名稱布林值，預設[]
 * @param {Boolean} [opt.bLog=true] 輸入是否顯示預設log布林值，預設true
 */
async function rollupWebWorker(opt = {}) {

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

    //funNames
    let funNames = _.get(opt, 'funNames', null)
    if (!w.isearr(funNames)) {
        return Promise.reject('invalid opt.funNames')
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

    //fpTar
    let fpTar = _.get(opt, 'fpTar', null)
    if (!w.isestr(fpTar)) {
        return Promise.reject('invalid opt.fpTar')
    }

    //nameDistType
    let nameDistType = _.get(opt, 'nameDistType', null)

    //nameDist
    let nameDist = name //nameTrue
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
        targets = 'new' //因程式碼用字串+blob方式作為web worker初始化之方式, 無法支援ie11(會需要改安全性)只好放棄, 改用最新語法new打包
    }

    //execObjectFunsByInstance
    let execObjectFunsByInstance = _.get(opt, 'execObjectFunsByInstance', null)
    if (!w.isbol(execObjectFunsByInstance)) {
        execObjectFunsByInstance = true
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


    // //globals, inner必須有完整依賴程式碼且outer無依賴
    // let globals = _.get(opt, 'globals', null)
    // if (!w.isobj(globals)) {
    //     globals = {}
    // }

    // //external, inner必須有完整依賴程式碼且outer無依賴
    // let external = _.get(opt, 'external', null)
    // if (!w.isarr(external)) {
    //     external = []
    // }

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
    let codeTransOri = await rollupFile({
        // name, //打包成es不需要name
        fn, //rollupFile會偵測副檔名作為formatIn
        fdSrc: w.getDirName(fpSrc),
        // fdTar: '', //沒給代表回傳程式碼
        format: 'es', //輸出formatOut
        targets,
        bNodePolyfill,
        bMinify,
        keepFnames,
        mangleReserved: [name, ...mangleReserved],
        bBanner: false,
        bSourcemap: false, //預設值為true得關閉
        // globals, //inner必須有完整依賴程式碼
        // external, //inner必須有完整依賴程式碼
        bLog: false,
    })

    //clearExportDefault
    let codeTrans = clearExportDefault(codeTransOri, name)

    //addInnerWebWorkerCode
    let codeTransAdd = addInnerWebWorkerCode(codeTrans, name, evNames)

    //addOuterWebWorkerCode
    let codeMerge = addOuterWebWorkerCode(codeTransAdd, type, funNames, { execObjectFunsByInstance })
    // fs.writeFileSync(fpTar, codeMerge, 'utf8')

    //rollupCode
    let codeRes = await rollupCode(codeMerge, {
        name: nameDist,
        formatOut,
        targets,
        // bSourcemap: false, //rollupCode不提供sourcemap
        bNodePolyfill: false, //outer不需使用node polyfill
        bMinify,
        bBanner: false,
        bSourcemap: false, //rollupCode不提供sourcemap
        // globals, //outer無依賴
        // external, //outer無依賴
        bLog: false,
    })

    //writeFileSync
    fs.writeFileSync(fpTar, codeRes, 'utf8')

    //console
    if (bLog) {
        console.log('\x1b[32m%s\x1b[0m', 'output: ' + w.getFileName(fpTar))
    }

    return ''
}


export default rollupWebWorker
