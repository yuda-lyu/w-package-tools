import trim from 'lodash-es/trim.js'

async function gAsync2() {
    let key = '*'
    let data = { a: 1, b: 2.2, c: `${key}`, d: trim(' trim me ') }
    let f = () => {
        let k = 'n'
        return {
            m: data.a,
            [k]: data.b,
        }
    }
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('gAsync2 data=', data)
            console.log('gAsync2 f()=', f())
            resolve({
                name: 'gAsync2',
                data,
                fr: f(),
            })
        }, 300)
    })
}

export default gAsync2
