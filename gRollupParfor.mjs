import path from 'path'
// import _ from 'lodash-es'
import w from './src/wsemip.umd.js'
import rollupParfor from './src/rollupParfor.mjs'


let fdSrc = './test-code-in'
let fdTar = './test-code-out-pf'

w.fsCleanFolder(fdTar)

async function core() {

    await rollupParfor({
        name: 'gParfor1_Fun', //原模組名稱, 將來會掛於winodw下或於node引入使用
        // execFunctionByInstance: true, //default, 原模組為計算函數回傳結果
        fpSrc: path.resolve(fdSrc, 'gParfor1_Fun.mjs'), //原始檔案路徑
        fpTar: path.resolve(fdTar, 'gParfor1_Fun.pf.umd.js'), //檔案輸出路徑
        formatOut: 'es', //umd //用es編譯可減少體積
        // bMinify: false,
    })
        .catch((err) => {
            console.log(err)
        })

}
core()
    .catch((err) => {
        console.log(err)
    })


//node --experimental-modules gRollupParfor.mjs
