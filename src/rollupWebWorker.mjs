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


function genCodeEv(evName) {
    let c = `

    r.on('${evName}',(msg)=>{

        //sendMessage
        let res={
            mode:'emit',
            evName:'${evName}',
            msg,
        }
        sendMessage(res)

    })

`
    return c
}


function genCodeEvs(evNames) {
    let c = ''
    for (let i = 0; i < evNames.length; i++) {
        let evName = evNames[i]
        c += genCodeEv(evName)
    }
    return c
}


function addInnerWebWorkerCode(code, name, evNames) {

    //evs
    let evs = genCodeEvs(evNames)

    let c = `

${code}

let instance=null
function init(input){

    //init
    let r=${name}(...input)

    //on
    ${evs}

    //save
    instance=r

}

function sendMessage(data) {
    self.postMessage(data)
}

async function run(data) {
    // console.log('inner worker run',data)

    //mode
    let mode=data.mode

    //check
    if(mode!=='init' && mode!=='call'){
        return
    }

    //init
    if(mode==='init'){
        
        try{

            //type
            let type=data.type

            //input
            let input=data.input
    
            //instance
            if(type==='function'){
                init(...input)
            }
            else if(type==='object'){
                instance=${name}
            }

        }
        catch(err){
        
            //sendMessage
            let res={
                mode:'emit',
                evName:'error',
                msg:err,
            }
            sendMessage(res)

        }
            
    }

    //check
    if(mode==='call'){
        let state=''
        let msg=null

        try{

            //fun
            let fun=instance[data.fun]

            //input
            let input=data.input

            //exec
            await fun(...input)
                .then((suc)=>{
                    state='success'
                    msg=suc
                })
                .catch((err)=>{
                    state='error'
                    msg=err
                })

        }
        catch(err){
            state='error'
            msg=err
        }
        
        //sendMessage
        let res={
            mode:'return',
            id:data.id,
            fun:data.fun,
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


function genCodeFun(funName) {
    let c = `

function ${funName}(){

    //pm
    let pm=genPm()

    //id
    let id=genID()

    //dataSend
    let dataSend={
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


function genCodeFuns(funNames) {
    let c = ''
    for (let i = 0; i < funNames.length; i++) {
        let funName = funNames[i]
        c += genCodeFun(funName)
    }
    return c
}


function addOuterWebworkerCode(code, type, funNames) {

    // //codeShow
    // let codeShow = w.replace(code, '`', '\'')

    //codeB64
    let codeB64 = str2b64(code)

    //genCodeFuns
    let cfs = genCodeFuns(funNames)

    //cev
    let cev = _.join(_.map(funNames, (funName) => {
        return `ev.${funName}=${funName}`
    }), '\n')

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

    // function terminate() {
    //     wk.terminate()
    //     wk = undefined
    // }

    //evem
    let ev = evem()

    function init(){

        //dataSend
        let dataSend={
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
        let mode=dataRecv.mode

        //check
        if(mode!=='emit' && mode!=='return'){
            return
        }

        //emit
        if(mode==='emit'){

            //emit
            ev.emit(dataRecv.evName, dataRecv.msg)

        }

        //return
        if(mode==='return'){

            //emit
            ev.emit(dataRecv.id, dataRecv)

        }

    }

    //init
    init([...arguments]) //若直接用arguments會無法編譯

    ${cev}
    return ev
}

let ww=null
if('${type}'==='function'){
    ww=wrapWebWorker
}
else if('${type}'==='object'){
    ww=wrapWebWorker()
}

export default ww

`

    return c
}


async function rollupWebWorker(opt = {}) {

    //bLog
    let bLog = opt.bLog
    bLog = bLog !== false

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
    if (_.size(funNames) === 0) {
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

    //console
    if (bLog) {
        console.log('compiling: ' + w.getFileName(fpSrc))
    }

    //fpTar
    let fpTar = _.get(opt, 'fpTar', null)
    if (!w.isestr(fpTar)) {
        return Promise.reject('invalid opt.fpTar')
    }

    //formatOut, umd為瀏覽器端直接使用, es為供vue-cli或webpack使用
    let formatOut = _.get(opt, 'formatOut', null)
    if (!formatOut) {
        formatOut = 'es'
    }

    //rollupFile, 預處理, 把code內的關聯都打包出來, 故需用es, 程式碼之後還會編譯故targets使用new, 此處要用rollupFile對原檔案打包, 才能正確引入相關模組與套件
    let codeTransOri = await rollupFile({
        // name, //打包成es不需要name
        fn: w.getFileName(fpSrc), //rollupFile會偵測副檔名作為formatIn
        fdSrc: w.getDirName(fpSrc),
        // fdTar: '', //沒給代表回傳程式碼
        format: 'es', //輸出formatOut
        targets: 'new',
        bLog: false,
        bBanner: false,
        bSourcemap: false,
        bMinify: false,
    })

    //clearExportDefault
    let codeTrans = clearExportDefault(codeTransOri, name)

    //addInnerWebWorkerCode
    let codeTransAdd = addInnerWebWorkerCode(codeTrans, name, evNames)

    //addOuterWebworkerCode
    let codeMerge = addOuterWebworkerCode(codeTransAdd, type, funNames)
    // fs.writeFileSync(fpTar, codeMerge, 'utf8')

    //rollupCode
    let codeRes = await rollupCode(codeMerge, {
        name,
        formatOut,
        targets: 'new', //因程式碼用字串+blob方式作為web worker初始化之方式, 無法支援ie11(會需要改安全性)只好放棄, 改用最新語法new打包
        bSourcemap: false,
        bMinify: true,
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
