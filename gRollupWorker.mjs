import path from 'path'
import _ from 'lodash-es'
import w from './src/wsemip.umd.js'
import rollupWorker from './src/rollupWorker.mjs'
import gWorker2_Obj from './test-code-in/gWorker2_Obj.mjs'
// import gWorker3_Fun from './test-code-in/gWorker3_Fun.mjs'
import gWorker4_FunEv from './test-code-in/gWorker4_FunEv.mjs'
import gWorker5_FunAsm from './test-code-in/gWorker5_FunAsm.mjs'
import gWorker6_ObjStream from './test-code-in/gWorker6_ObjStream.mjs'


let fdSrc = './test-code-in'
let fdTar = './test-code-out-wk'

w.fsCleanFolder(fdTar)

async function core() {

    await rollupWorker({
        name: 'gWorker2_Obj', //原模組名稱, 將來會掛於winodw下或於node引入使用
        type: 'object', //原模組輸出為物件
        funNames: _.keys(gWorker2_Obj),
        fpSrc: path.resolve(fdSrc, 'gWorker2_Obj.mjs'), //原始檔案路徑
        fpTar: path.resolve(fdTar, 'gWorker2_Obj.wk.umd.js'), //檔案輸出路徑
        formatOut: 'umd',
        // bMinify: false,
        // globals: {
        //     // 'fs': 'fs',
        // },
        // external: [
        //     // 'fs',
        // ],
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupWorker({
        name: 'gWorker3_Fun', //原模組名稱, 將來會掛於winodw下或於node引入使用
        type: 'function', //原模組輸出為函數, 可傳入參數初始化
        // execFunctionByInstance: true, //default, 原模組為計算函數回傳結果
        fpSrc: path.resolve(fdSrc, 'gWorker3_Fun.mjs'), //原始檔案路徑
        fpTar: path.resolve(fdTar, 'gWorker3_Fun.wk.umd.js'), //檔案輸出路徑
        formatOut: 'umd',
        // bMinify: false,
        // globals: {
        //     // 'fs': 'fs',
        // },
        // external: [
        //     // 'fs',
        // ],
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupWorker({
        name: 'gWorker4_FunEv', //原模組名稱, 將來會掛於winodw下或於node引入使用
        type: 'function', //原模組輸出為函數, 可傳入參數初始化
        execFunctionByInstance: false, //原模組為計算函數回傳結果, 故設為false使回傳結果為繼承eventemitter3物件
        funNames: _.filter(_.keys(gWorker4_FunEv()), (v) => { //要初始化函數才能取得可提供外部呼叫之函數
            return w.strleft(v, 1) !== '_' //要剔除eventemitter3提供之函數
        }),
        evNames: ['ev-tf4'], //由內部emit外部的函數得手動提供,
        fpSrc: path.resolve(fdSrc, 'gWorker4_FunEv.mjs'), //原始檔案路徑
        fpTar: path.resolve(fdTar, 'gWorker4_FunEv.wk.umd.js'), //檔案輸出路徑
        formatOut: 'umd',
        // bMinify: false,
        // globals: {
        //     // 'fs': 'fs',
        // },
        // external: [
        //     // 'fs',
        // ],
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupWorker({
        name: 'gWorker5_FunAsm', //原模組名稱, 將來會掛於winodw下或於node引入使用
        type: 'function', //原模組輸出為函數, 可傳入參數初始化
        execFunctionByInstance: false, //原模組為計算函數回傳結果, 故設為false使回傳結果為繼承eventemitter3物件
        funNames: _.filter(_.keys(gWorker5_FunAsm()), (v) => { //要初始化函數才能取得可提供外部呼叫之函數
            return w.strleft(v, 1) !== '_' //要剔除eventemitter3提供之函數
        }),
        evNames: ['ev-tf4'], //由內部emit外部的函數得手動提供,
        fpSrc: path.resolve(fdSrc, 'gWorker5_FunAsm.mjs'), //原始檔案路徑
        fpTar: path.resolve(fdTar, 'gWorker5_FunAsm.wk.umd.js'), //檔案輸出路徑
        formatOut: 'umd',
        // bMinify: false,
        // globals: {
        //     // 'fs': 'fs',
        // },
        // external: [
        //     // 'fs',
        // ],
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupWorker({
        name: 'gWorker6_ObjStream', //原模組名稱, 將來會掛於winodw下或於node引入使用
        type: 'object', //原模組輸出為物件
        funNames: _.keys(gWorker6_ObjStream),
        fpSrc: path.resolve(fdSrc, 'gWorker6_ObjStream.mjs'), //原始檔案路徑
        fpTar: path.resolve(fdTar, 'gWorker6_ObjStream.wk.umd.js'), //檔案輸出路徑
        formatOut: 'umd',
        // execObjectFunsByInstance: true, //模組為物件時會自動將各函數使用獨立實體執行
        bNodePolyfill: true, //WJsonStream已修改程式碼有添加import buffer或timers等故一定要使用node poyfill才能執行
        // bMinify: false,
        // globals: {
        //     // 'fs': 'fs',
        // },
        // external: [
        //     // 'fs',
        // ],
    })
        .catch((err) => {
            console.log(err)
        })

}
core()
    .catch((err) => {
        console.log(err)
    })


//node --experimental-modules gRollupWorker.mjs
