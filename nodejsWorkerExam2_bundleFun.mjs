import w from './test-code-out-wk/gWorker3_Fun.wk.umd.js'

w(1.234, 'xyz')
    .then((res) => {
        console.log('w(1.234,\'xyz\') then', res)
    })
    .catch((err) => {
        console.log('w(1.234,\'xyz\') catch', err)
    })

//node --experimental-modules --es-module-specifier-resolution=node nodejsWorkerExam2_bundleFun.mjs
