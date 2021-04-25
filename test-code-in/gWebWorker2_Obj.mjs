import trim from 'lodash/trim'

async function aaa(p1) {
    return 'aaaRes p [' + p1 + '] p' + trim(' [trim] ')
}

async function bbb(p1, p2) {
    if (p1 <= p2) {
        return 'bbbRes p1<=p2'
    }
    return Promise.reject('bbbRes p1>p2')
}

async function ccc(n) {
    let r = 1
    for (let i = 0; i < n; i++) {
        r += 1
        r -= 1
        r *= 5.5
        r /= 5.5
    }
    return 'no.=' + n + ', r=' + r
}

let gWebWorker2_Obj = {
    aaa,
    bbb,
    ccc,
}


export default gWebWorker2_Obj
