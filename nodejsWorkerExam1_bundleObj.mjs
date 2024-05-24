import w from './test-code-out-wk/gWorker2_Obj.wk.umd.js'


let n = 0
let t = setInterval(function() {
    n++
    console.log(n * 200)
    if (n >= 15) {
        clearInterval(t)
    }
}, 200)

w.on('error', (msg) => {
    console.log('w.error', msg)
})

w.aaa(1)
    .then((res) => {
        console.log('w.aaa(1) then', res)
    })
    .catch((err) => {
        console.log('w.aaa(1) catch', err)
    })

w.bbb(1, 2)
    .then((res) => {
        console.log('w.bbb(1,2) then', res)
    })
    .catch((err) => {
        console.log('w.bbb(1,2) catch', err)
    })

w.bbb(5, 3)
    .then((res) => {
        console.log('w.bbb(5,3) then', res)
    })
    .catch((err) => {
        console.log('w.bbb(5,3) catch', err)
    })

//執行超大迴圈, 確定可執行於web worker而不佔用主執行緒
w.ccc(300000000)
    .then((res) => {
        console.log('w.ccc(n) then', res)
    })
    .catch((err) => {
        console.log('w.ccc(n) catch', err)
    })

//node --experimental-modules nodejsWorkerExam1_bundleObj.mjs
