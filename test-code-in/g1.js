function g1() {
    let objData = { a: 1, b: 2.2 }

    //array function
    let testLongName = () => {
        return 'ttt:5678'
    }

    //nullish-coalescing-operator
    let oc = !objData?.d
    console.log('oc', oc)

    //promise
    let pm = new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('g1 foo')
        }, 300)
    })
    pm.then(value => {
        console.log(value)
    })

    console.log('g1 objData=', objData)
    console.log('g1 testLongName()=', testLongName())
}

export default g1
