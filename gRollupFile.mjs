import w from './src/wsemip.umd.js'
import rollupFile from './src/rollupFile.mjs'


let fdSrc = './test-code-in'
let fdTar = './test-code-out'

w.fsCleanFolder(fdTar)

async function core() {

    await rollupFile({
        fn: 'gBase1.js',
        fdSrc,
        fdTar,
        // bBanner: false,
        bSourcemap: false,
        bMinify: false,
        // globals: {
        // },
        // external: [
        // ],
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupFile({
        fn: 'gBase2.js',
        fdSrc,
        fdTar,
        // bBanner: false,
        bSourcemap: false,
        bMinify: false,
        // globals: {
        // },
        // external: [
        // ],
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupFile({
        fn: 'gVue1.vue',
        fdSrc,
        fdTar,
        // bBanner: false,
        bSourcemap: false,
        bMinify: false,
        // globals: {
        // },
        // external: [
        // ],
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupFile({
        fn: 'gAsync1.mjs',
        fdSrc,
        fdTar,
        format: 'es',
        targets: 'new',
        bSourcemap: false,
        bMinify: false,
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupFile({
        fn: 'gAsync2.mjs',
        fdSrc,
        fdTar,
        format: 'es',
        targets: 'new',
        bSourcemap: false,
        bMinify: false,
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupFile({
        fn: 'gWorker1_EnvSelf.mjs',
        fdSrc,
        fdTar,
        format: 'es',
        targets: 'new',
        bSourcemap: false,
        bMinify: false,
    })
        .catch((err) => {
            console.log(err)
        })

    await rollupFile({
        fn: 'gWorker2_Obj.mjs',
        fdSrc,
        fdTar,
        format: 'es',
        targets: 'new',
        bSourcemap: false,
        bMinify: false,
    })
        .catch((err) => {
            console.log(err)
        })

}
core()
    .catch((err) => {
        console.log(err)
    })

//node --experimental-modules gRollupFile.mjs
