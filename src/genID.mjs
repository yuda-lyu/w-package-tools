let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')
let radix = chars.length

function genID(len = 10) {
    let uuid = []

    //uuid
    for (let i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix]

    let r = uuid.join('')

    return r
}


export default genID
