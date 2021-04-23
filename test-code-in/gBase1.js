function gBase1() {
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
            resolve('gBase1 foo')
        }, 300)
    })
    pm.then(value => {
        console.log(value)
    })

    console.log('gBase1 objData=', objData)
    console.log('gBase1 testLongName()=', testLongName())
}

export default gBase1
