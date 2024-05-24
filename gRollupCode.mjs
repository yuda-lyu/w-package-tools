import fs from 'fs'
import w from './src/wsemip.umd.js'
import rollupCode from './src/rollupCode.mjs'


let fdSrc = './test-code-in'
let fdTar = './test-code-out-cp'
let bMinify = true //false

w.fsCleanFolder(fdTar)

async function core() {

    await rollupCode(fs.readFileSync(`${fdSrc}/gBase1.js`, 'utf8'), {
        name: 'gBase1',
        formatIn: 'js',
        formatOut: 'umd',
        bMinify,
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTar}/gBase1.umd.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

    await rollupCode(fs.readFileSync(`${fdSrc}/gBase2.js`, 'utf8'), {
        name: 'gBase2',
        formatIn: 'js',
        formatOut: 'umd',
        bMinify,
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTar}/gBase2.umd.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

    await rollupCode(fs.readFileSync(`${fdSrc}/gVue1.vue`, 'utf8'), {
        name: 'gVue1',
        formatIn: 'vue',
        formatOut: 'umd',
        bMinify,
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTar}/gVue1.umd.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

    await rollupCode(fs.readFileSync(`${fdSrc}/gAsync1.mjs`, 'utf8'), {
        name: 'gAsync1',
        formatIn: 'mjs',
        formatOut: 'es',
        targets: 'new',
        bMinify,
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTar}/gAsync1.es.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

    await rollupCode(fs.readFileSync(`${fdSrc}/gAsync2.mjs`, 'utf8'), {
        name: 'gAsync2',
        formatIn: 'mjs',
        formatOut: 'es',
        targets: 'new',
        bMinify,
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTar}/gAsync2.es.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

    await rollupCode(fs.readFileSync(`${fdSrc}/gWorker1_EnvSelf.mjs`, 'utf8'), {
        name: 'gWorker1_EnvSelf',
        formatIn: 'mjs',
        formatOut: 'es',
        targets: 'new',
        bMinify,
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTar}/gWorker1_EnvSelf.es.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

    await rollupCode(fs.readFileSync(`${fdSrc}/gWorker2_Obj.mjs`, 'utf8'), {
        name: 'gWorker2_Obj',
        formatIn: 'mjs',
        formatOut: 'es',
        targets: 'new',
        bMinify,
    })
        .then((code) => {
            //console.log(code)
            fs.writeFileSync(`${fdTar}/gWorker2_Obj.es.js`, code, 'utf8')
        })
        .catch((err) => {
            console.log(err)
        })

}
core()
    .then(() => {
        console.log('finish')
    })
    .catch((err) => {
        console.log(err)
    })


//node --experimental-modules gRollupCode.mjs
