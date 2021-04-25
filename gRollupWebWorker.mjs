import path from 'path'
import _ from 'lodash'
import * as w from './src/wsemip.es.mjs' //因mocha無法識別得用*轉出default
import rollupWebWorker from './src/rollupWebWorker.mjs'
import gWebWorker2_Obj from './test-code-in/gWebWorker2_Obj.mjs'
import gWebWorker3_Fun from './test-code-in/gWebWorker3_Fun.mjs'
import gWebWorker4_FunAsm from './test-code-in/gWebWorker4_FunAsm.mjs'


let fdSrc = './test-code-in'
let fdTar = './test-code-out-ww'

let funNames2_Obj = _.keys(gWebWorker2_Obj)
//console.log('funNames2_Obj', funNames2_Obj)

let funNames3_Fun = _.keys(gWebWorker3_Fun()) //要初始化函數才能取得可提供外部呼叫之函數
funNames3_Fun = _.filter(funNames3_Fun, (v) => {
    return w.strleft(v, 1) !== '_' //要剔除eventemitter3提供之函數
})
//console.log('funNames3_Fun', funNames3_Fun)
let evNames3_Fun = ['ev-ddd'] //由內部emit外部的函數得手動提供

let funNames4_FunAsm = _.keys(gWebWorker4_FunAsm()) //要初始化函數才能取得可提供外部呼叫之函數
funNames4_FunAsm = _.filter(funNames4_FunAsm, (v) => {
    return w.strleft(v, 1) !== '_' //要剔除eventemitter3提供之函數
})
//console.log('funNames4_FunAsm', funNames4_FunAsm)
let evNames4_FunAsm = ['ev-ddd'] //由內部emit外部的函數得手動提供

w.fsCleanFolder(fdTar)

async function core() {
    //欲編譯檔案需使用es6模組語法, 輸出格式為export default, 輸出需為物件, 該物件給予任意可執行之async函數, 打包後會於web worker內執行, 並再把全部async函數映射出來至指定物件當中, 故可採一樣(未封裝前)方式執行

    await rollupWebWorker({
        name: 'gWebWorker2_Obj', //原模組名稱, 將來會掛於winodw下
        type: 'object', //原模組輸出為物件
        funNames: funNames2_Obj,
        fpSrc: path.resolve(fdSrc, 'gWebWorker2_Obj.mjs'), //原始檔案路徑
        fpTar: path.resolve(fdTar, 'gWebWorker2_Obj.ww.umd.js'), //檔案輸出路徑
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupWebWorker({
        name: 'gWebWorker3_Fun', //原模組名稱, 將來會掛於winodw下
        type: 'function', //原模組輸出為函數, 可傳入參數初始化, 回傳需為繼承eventemitter3物件
        funNames: funNames3_Fun,
        evNames: evNames3_Fun,
        fpSrc: path.resolve(fdSrc, 'gWebWorker3_Fun.mjs'), //原始檔案路徑
        fpTar: path.resolve(fdTar, 'gWebWorker3_Fun.ww.umd.js'), //檔案輸出路徑
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupWebWorker({
        name: 'gWebWorker4_FunAsm', //原模組名稱, 將來會掛於winodw下
        type: 'function', //原模組輸出為函數, 可傳入參數初始化, 回傳需為繼承eventemitter3物件
        funNames: funNames4_FunAsm,
        evNames: evNames4_FunAsm,
        fpSrc: path.resolve(fdSrc, 'gWebWorker4_FunAsm.mjs'), //原始檔案路徑
        fpTar: path.resolve(fdTar, 'gWebWorker4_FunAsm.ww.umd.js'), //檔案輸出路徑
    })
        .catch((err) => {
            console.log(err)
        })

}
core()
    .catch((err) => {
        console.log(err)
    })


//node --experimental-modules --es-module-specifier-resolution=node gRollupWebWorker.mjs
