import fs from 'fs'
import rollupFile from './src/rollupFile.mjs'
import rollupCode from './src/rollupCode.mjs'
import cleanFolder from './src/cleanFolder.mjs'


let fdSrc = './test-code-in'
let fdTar = './test-code-out'

cleanFolder(fdTar)

rollupFile({
    fn: 'g1.js',
    fdSrc,
    fdTar,
    // bBanner: false,
    // bSourcemap: false,
    bMinify: false,
    // globals: {
    // },
    // external: [
    // ],
})
    .catch((err) => {
        console.log(err)
    })

rollupFile({
    fn: 'g2.js',
    fdSrc,
    fdTar,
    // bBanner: false,
    // bSourcemap: false,
    bMinify: false,
    // globals: {
    // },
    // external: [
    // ],
})
    .catch((err) => {
        console.log(err)
    })

rollupFile({
    fn: 'g3.vue',
    fdSrc,
    fdTar,
    // bBanner: false,
    // bSourcemap: false,
    bMinify: false,
    // globals: {
    // },
    // external: [
    // ],
})
    .catch((err) => {
        console.log(err)
    })

// rollupCode(fs.readFileSync(`${fdSrc}/g1.js`, 'utf8'), {
//     bMinify: false,
// })
//     .then((code) => {
//         console.log(code)
//     })
//     .catch((err) => {
//         console.log(err)
//     })

// rollupCode(fs.readFileSync(`${fdSrc}/g3.vue`, 'utf8'), {
//     bMinify: false,
//     formatIn: 'vue'
// })
//     .then((code) => {
//         console.log(code)
//     })
//     .catch((err) => {
//         console.log(err)
//     })


//node --experimental-modules --es-module-specifier-resolution=node g.mjs
