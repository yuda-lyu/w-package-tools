// import path from 'path'
import fs from 'fs'
import _ from 'lodash-es'
import w from './wsemip.umd.js'
// import rollupNodeWorker from './rollupNodeWorker.mjs'
// import rollupWebWorker from './rollupWebWorker.mjs'
import rollupWorkerCore from './rollupWorkerCore.mjs'
import rollupCode from './rollupCode.mjs'


function mergeCore(fpSrcNW, fpSrcWW) {
    let c = `
    import nw from '${fpSrcNW}'
    import ww from '${fpSrcWW}'
    
    function isWindow() {
        return typeof window !== 'undefined' && typeof window.document !== 'undefined'
    }
    
    let wk
    if(isWindow()){
        wk = ww 
    }
    else {
        wk = nw
    }
    
    export default wk
    `
    return c
}


/**
 * 使用rollup編譯檔案，並封裝至前端web worker與後端worker內
 *
 * @param {Object} opt 輸入設定物件
 * @param {String} opt.name 輸入模組名稱字串，將來會掛於winodw下或於node引入使用
 * @param {String} [opt.type='object'] 輸入模組類型字串，可選'function'、'object'。若使用'function'，於初始化後可呼叫terminate銷毀；若使用'object'，預設execObjectFunsByInstance為true，執行完指定函數後亦自動銷毀，若改execObjectFunsByInstance為false，就一樣得於初始化後呼叫terminate銷毀。回傳函數或物件。編譯後會掛載模組名稱至window下，若type使用'function'時則window['模組名稱']為函數，得自己初始化才能呼叫其內函數或監聽事件；若type使用'object'時則window['模組名稱']為物件，可直接呼叫其內函數預設'object'
 * @param {Array} opt.funNames 輸入模組可被呼叫的函數名稱陣列
 * @param {Array} [opt.evNames=[]] 輸入模組可監聽的函數名稱陣列，預設[]
 * @param {String} opt.fpSrc 輸入原始碼檔案位置字串
 * @param {String} opt.fpTar 輸入編譯完程式碼檔案儲存位置字串
 * @param {String} [opt.nameDistType=''] 輸入編譯檔案名稱格式字串，可選'kebabCase'，預設''
 * @param {Function} [opt.hookNameDist=null]  輸入強制指定編譯檔案名稱函數，預設null，會複寫nameDistType之處理結果
 * @param {String} [opt.formatOut='es'] 輸入欲編譯成js格式字串，可選'umd'、'iife'、'es'，預設'es'
 * @param {String} [opt.targets='new'] 輸入編譯等級字串，可選'new'、'old'，預設'new'
 * @param {Boolean} [opt.execFunctionByInstance=true] 輸入若模組類型為物件type='function'時，是否將function視為使用獨立實體執行並自動銷毀實體布林值，例如原模組就是一個運算函數，不需要回傳eventemmitter監聽事件，預設true
 * @param {Boolean} [opt.execObjectFunsByInstance=true] 輸入若模組類型為物件type='object'時，各函式是否使用獨立實體執行布林值，例如使用到stream的各函式會因共用同一個實體導致降速，故各函數需自動有各自實體，預設true
 * @param {Boolean} [opt.bMinify=true] 輸入編譯檔案是否進行壓縮布林值，預設true
 * @param {Boolean} [opt.keepFnames=false] 輸入當編譯檔案需壓縮時，是否保留函數名稱布林值，預設false
 * @param {Array} [opt.mangleReserved=[]] 輸入當編譯檔案需壓縮時，需保留函數名稱或變數名稱陣列，預設[]
 * @param {Object} [opt.globals={}] 輸入指定內外模組的關聯性物件，預設{}
 * @param {Array} [opt.external=[]] 輸入指定內部模組需引用外部模組陣列，預設[]
 * @param {Boolean} [opt.bLog=true] 輸入是否顯示預設log布林值，預設true
 */
async function rollupWorker(opt = {}) {

    //name
    let name = _.get(opt, 'name', null)
    if (!w.isestr(name)) {
        return Promise.reject('invalid opt.name')
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
        mangleReserved = [] //可禁止使用'$', 因有些技術使用取代字串成編譯後程式碼, 若編譯後程式碼內含$&會導致觸發regex的插入匹配的字串, 從而造成非預期問題
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

    //id
    let id = w.genID()
    let fpSrcNW = `./temp-${id}-nw.js`
    let fpSrcWW = `./temp-${id}-ww.js`
    let fpSrcMg = `./temp-${id}-mg.js`

    async function core() {

        //rollupWorkerCore for nodejs worker
        let codeNW = await rollupWorkerCore({
            ...opt,
            bNode: true,
            bReturnCode: true,
            bLog: false,
        })
        fs.writeFileSync(fpSrcNW, codeNW, 'utf8')

        //rollupWorkerCore for web worker
        let codeWW = await rollupWorkerCore({
            ...opt,
            bNode: false,
            bReturnCode: true,
            bLog: false,
        })
        fs.writeFileSync(fpSrcWW, codeWW, 'utf8')

        //mergeCore, 合併nodejs與web的worker的程式碼
        let codeMerge = mergeCore(fpSrcNW, fpSrcWW)
        fs.writeFileSync(fpSrcMg, codeMerge, 'utf8')
        // fs.writeFileSync(`./z-2-node[both]-1-mergeBoth.js`, codeMerge, 'utf8')

        //rollupCode, 編譯合併nodejs與web的worker的程式碼
        let codeRes = await rollupCode(codeMerge, {
            name: nameDist,
            formatOut,
            targets,
            bSourcemap: false, //rollupCode不提供sourcemap
            bBanner: false, //rollupCode不提供banner
            bNodePolyfill: false, //outer不需使用node polyfill
            bMinify,
            keepFnames,
            mangleReserved,
            globals: { //因有已包含Nodejs與瀏覽器的worker封裝, 故需指定剔除Nodejs的inner的worker的引用即可
                'worker_threads': 'worker_threads',
                ...globals,
            },
            external: [
                'worker_threads',
                ...external,
            ],
            bLog: false,
        })

        //writeFileSync
        fs.writeFileSync(fpTar, codeRes, 'utf8')
        // fs.writeFileSync(`./z-2-node[both]-2-finall.js`, codeMerge, 'utf8')

        //console
        if (bLog) {
            console.log('\x1b[32m%s\x1b[0m', 'output: ' + w.getFileName(fpTar))
        }

    }

    //core
    await core()
        .catch((err) => {
            console.log(err)
        })
        .finally(() => {

            //unlinkSync, 不論編譯成功失敗都刪除檔案
            try {
                fs.unlinkSync(fpSrcNW)
            }
            catch (err) {
                console.log(err)
            }
            try {
                fs.unlinkSync(fpSrcWW)
            }
            catch (err) {
                console.log(err)
            }
            try {
                fs.unlinkSync(fpSrcMg)
            }
            catch (err) {
                console.log(err)
            }

        })

}


export default rollupWorker
