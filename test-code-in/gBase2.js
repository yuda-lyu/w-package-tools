function gBase2() {

    let objData = { a: 1, b: 2.2 }

    let xyzForLongName = 'xyz:12.34'

    //object-rest-spread
    objData = { ...objData, c: `abc&${xyzForLongName}` } //會添加_objectSpread2, _defineProperty等函式

    //array function
    let testLongName = () => {
        return 'ttt:5678'
    }

    //promise
    let pm = new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('gBase2 foo')
        }, 300)
    })
    pm.then((value) => {
        console.log(value)
    })

    //async function
    async function testAsync() {
        async function core() {
            return Promise.reject('reject')
        }
        await core()
    }
    testAsync()
        .then((r) => {
            console.log('tf1 testAsync resolve', r)
        })
        .catch((r) => {
            console.log('tf1 testAsync reject', r)
        })

    console.log('gBase2 objData=', objData)
    console.log('gBase2 testLongName()=', testLongName())
}

export default gBase2
