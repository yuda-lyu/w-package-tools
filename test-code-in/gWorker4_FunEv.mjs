import trim from 'lodash-es/trim.js'
import EventEmitter from 'eventemitter3'


function evem() {
    return new EventEmitter()
}

function gWorker4_FunEv(inip1, inip2) {
    let ev = evem()

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
        return 'no.=' + n + ', r=' + r
    }

    async function tf4(p1, p2) {
        ev.emit('ev-tf4', `emit data p1='${p1}', p2='${p2}'`)
        return 'tf4Res emit-event'
    }

    setTimeout(() => {
        tf4(`${inip1}~${inip2}`, `call by setTimeout(1000ms)`)
    }, 1000)

    ev.tf1 = tf1
    ev.tf2 = tf2
    ev.tf3 = tf3
    ev.tf4 = tf4
    return ev
}


export default gWorker4_FunEv
