import trim from 'lodash-es/trim.js'
// import fs from 'fs'
// let fs = require('fs')


async function tf1(p1) {
    return 'tf1Res p [' + p1 + '] p' + trim(' [trim] ')
}

async function tf2(p1, p2) {
    if (p1 <= p2) {
        return 'tf2Res p1<=p2'
    }
    return Promise.reject('tf2Res p1>p2')
}

async function tf3(n) {
    let r = 1
    for (let i = 0; i < n; i++) {
        r += 1
        r -= 1
        r *= 5.5
        r /= 5.5
    }
    // let fs = await import('fs')
    // fs.writeFileSync(`./_${n}.txt`, `_${r}`, 'utf8')
    return 'no.=' + n + ', r=' + r
}

let gWorker2_Obj = {
    tf1,
    tf2,
    tf3,
}


export default gWorker2_Obj
