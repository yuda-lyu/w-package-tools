import w from './test-code-out-wk/gWorker6_ObjStream.wk.umd.js'


let n = 0
let t = setInterval(function() {
    n++
    console.log(n * 200)
    if (n >= 15) {
        clearInterval(t)
    }
}, 200)

let m = 700000

let carr = ''
let arr = []
for (let i = 1; i <= m; i++) {
    arr.push({
        key: 'k' + i,
        value: i,
    })
}
let cobj = ''
let obj = {}
for (let i = 1; i <= m; i++) {
    obj['k' + i] = i
}

try {
    let res = JSON.stringify(arr)
    console.log('JSON.stringify(arr)', res.length, res.substr(0, 200) + '...')
}
catch (err) {
    console.log('JSON.stringify(arr) catch', err)
}

try {
    let res = JSON.stringify(obj)
    console.log('JSON.stringify(obj)', res.length, res.substr(0, 200) + '...')
}
catch (err) {
    console.log('JSON.stringify(obj) catch', err)
}

let pmArr = w.stringify(arr)
    .then((res) => {
        console.log('w.stringify(arr) then', res.length, res.substr(0, 200) + '...')
        carr = res
    })
    .catch((err) => {
        console.log('w.stringify(arr) catch', err)
    })

let pmObj = w.stringify(obj)
    .then((res) => {
        console.log('w.stringify(obj) then', res.length, res.substr(0, 200) + '...')
        cobj = res
    })
    .catch((err) => {
        console.log('w.stringify(obj) catch', err)
    })

Promise.all([pmArr, pmObj])
    .then(() => {

        w.parse(carr)
            .then((res) => {
                console.log('w.parse(carr) then', res[0], res[1], '...')
            })
            .catch((err) => {
                console.log('w.parse(carr) catch', err)
            })

        w.parse(cobj)
            .then((res) => {
                console.log('w.parse(cobj) then', res.k1, res.k2, '...')
            })
            .catch((err) => {
                console.log('w.parse(cobj) catch', err)
            })

    })
    .catch((err) => {
        console.log(err)
    })

//node --experimental-modules --es-module-specifier-resolution=node nodejsWorkerExam5_bundleObjWithStream.mjs
