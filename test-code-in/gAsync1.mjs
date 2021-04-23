async function gAsync1() {
    let data = { a: 1, b: 2.2, c: 'xyz' }
    let f = () => {
        let k = 'n'
        return {
            m: data.a,
            [k]: data.b,
        }
    }
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('gAsync1 data=', data)
            console.log('gAsync1 f()=', f())
            resolve({
                name: 'gAsync1',
                data,
                fr: f(),
            })
        }, 300)
    })
}

export default gAsync1
