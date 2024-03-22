import trim from 'lodash-es/trim.js'
import EventEmitter from 'eventemitter3'
// import wd from 'w-distributions'
import wd from './w-distributions.umd.js'


function evem() {
    return new EventEmitter()
}

async function get_t_test(df, p) {
    let studentt = await wd.Studentt(df)
    let r = studentt.inv(p) //one or two sided test p-values
    return r
}

function gWorker5_FunAsm(inip1, inip2) {
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

    async function eee(df, p) {
        return get_t_test(df, p)
    }

    ev.aaa = aaa
    ev.bbb = bbb
    ev.ccc = ccc
    ev.ddd = ddd
    ev.eee = eee
    return ev
}


export default gWorker5_FunAsm
