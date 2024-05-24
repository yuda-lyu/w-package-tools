// import w from './src/parfor.mjs'
import w from './test-code-out-pf/gParfor1_Fun.pf.umd.js'


let count = 500000000
let pgs = [
    {
        count,
        p1: 11,
        p2: 'xyz 11(きんぎょ)',
    },
    {
        count,
        p1: 12,
        p2: 'xyz 12',
    },
    {
        count,
        p1: 13,
        p2: 'xyz 13',
    },
    {
        count,
        p1: 21,
        p2: 'xyz 21',
    },
    {
        count,
        p1: 22,
        p2: 'xyz 22',
    },
    {
        count,
        p1: 23,
        p2: 'xyz 23',
    },
    {
        count,
        p1: 31,
        p2: 'xyz 31',
    },
    {
        count,
        p1: 32,
        p2: 'xyz 32',
    },
    {
        count,
        p1: 33,
        p2: 'xyz 33',
    },
]

w(pgs, {
    takeLimit: 4,
    takeNumOfPgs: 1,
    cb: (res, k) => {
        console.log('cb', res, k)
    },
    returnResult: false, //預設為false, 因會使用cb拿回數據就不回傳, 可節省記憶體
})
    .then((res) => {
        console.log('then', res)
    })
    .catch((err) => {
        console.log('catch', err)
    })

//node --experimental-modules nodejsParforExam1_bundleFun.mjs
