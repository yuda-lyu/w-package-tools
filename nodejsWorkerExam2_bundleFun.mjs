import w from './test-code-out-wk/gWorker3_Fun.wk.umd.js'

// console.log('w', w)
// => w [Function (anonymous)]

w(1.234, 'xyz')
    .then((res) => {
        console.log('w(1.234,\'xyz\') then', res)
    })
    .catch((err) => {
        console.log('w(1.234,\'xyz\') catch', err)
    })

//node --experimental-modules nodejsWorkerExam2_bundleFun.mjs
