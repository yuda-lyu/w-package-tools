import fs from 'fs'
import * as w from './src/wsemip.es.mjs' //因mocha無法識別得用*轉出default
import rollupCode from './src/rollupCode.mjs'


let fdSrc = './test-code-in'
// let fdTar = './test-code-out'
let fdTarCp = './test-code-out-cp'
let bMinify = true

w.fsCleanFolder(fdTarCp)

async function core() {

    await rollupCode(fs.readFileSync(`${fdSrc}/gBase1.js`, 'utf8'), {
        name: 'gBase1',
        bMinify,
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTarCp}/gBase1.umd.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

    await rollupCode(fs.readFileSync(`${fdSrc}/gBase2.js`, 'utf8'), {
        name: 'gBase2',
        bMinify,
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTarCp}/gBase2.umd.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

    await rollupCode(fs.readFileSync(`${fdSrc}/gVue1.vue`, 'utf8'), {
        name: 'gVue1',
        bMinify,
        formatIn: 'vue'
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTarCp}/gVue1.umd.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

    await rollupCode(fs.readFileSync(`${fdSrc}/gAsync1.mjs`, 'utf8'), {
        name: 'gAsync1',
        format: 'es',
        targets: 'new',
        bMinify,
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTarCp}/gAsync1.umd.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

    await rollupCode(fs.readFileSync(`${fdSrc}/gAsync2.mjs`, 'utf8'), {
        name: 'gAsync2',
        format: 'es',
        targets: 'new',
        bMinify,
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTarCp}/gAsync2.umd.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

}
core()
    .catch((err) => {
        console.log(err)
    })


//node --experimental-modules --es-module-specifier-resolution=node gRollupCode.mjs
