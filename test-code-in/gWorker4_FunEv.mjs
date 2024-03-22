import trim from 'lodash-es/trim.js'
import EventEmitter from 'eventemitter3'


function evem() {
    return new EventEmitter()
}

function gWorker4_FunEv(inip1, inip2) {
    let ev = evem()

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

    async function ddd(p1, p2) {
        ev.emit('ev-ddd', `emit data p1='${p1}', p2='${p2}'`)
        return 'dddRes emit-event'
    }

    setTimeout(() => {
        ddd(`${inip1}~${inip2}`, `call by setTimeout(1000ms)`)
    }, 1000)

    ev.aaa = aaa
    ev.bbb = bbb
    ev.ccc = ccc
    ev.ddd = ddd
    return ev
}


export default gWorker4_FunEv
