import wf from './test-code-out-wk/gWorker5_FunAsm.wk.umd.js'


let n = 0
let t = setInterval(function() {
    n++
    console.log(n * 200)
    if (n >= 15) {
        clearInterval(t)
    }
}, 200)

let w = wf(1.234, 'xyz')
// console.log(w)

w.on('ev-tf4', (msg) => {
    console.log('w.ev-tf4', msg)
})
w.on('error', (msg) => {
    console.log('w.error', msg)
})

w.tf1(1)
    .then((res) => {
        console.log('w.tf1(1) then', res)
    })
    .catch((err) => {
        console.log('w.tf1(1) catch', err)
    })

w.tf2(1, 2)
    .then((res) => {
        console.log('w.tf2(1,2) then', res)
    })
    .catch((err) => {
        console.log('w.tf2(1,2) catch', err)
    })

w.tf2(5, 3)
    .then((res) => {
        console.log('w.tf2(5,3) then', res)
    })
    .catch((err) => {
        console.log('w.tf2(5,3) catch', err)
    })

//執行超大迴圈, 確定可執行於web worker而不佔用主執行緒
w.tf3(300000000)
    .then((res) => {
        console.log('w.tf3(n) then', res)
    })
    .catch((err) => {
        console.log('w.tf3(n) catch', err)
    })

w.tf4(4.56, 'mnop')
    .then((res) => {
        console.log('w.tf4(4.56,\'mnop\') then', res)
    })
    .catch((err) => {
        console.log('w.tf4(4.56,\'mnop\') catch', err)
    })

//w-distributions核心有使用cephes, 於前端會自解WebAssembly二進位程式碼執行, 確定可於web worker內執行
w.tf5(34, 0.95) //1.6909242551868549
    .then((res) => {
        console.log('w.tf5(34,0.95) then', res)
    })
    .catch((err) => {
        console.log('w.tf5(34,0.95) catch', err)
    })

setTimeout(() => {
    w.terminate()
}, 3000)

//node --experimental-modules nodejsWorkerExam4_bundleFunWithAsm.mjs
