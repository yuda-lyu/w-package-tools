

async function gParfor1_Fun(p) {
    // throw new Error('gParfor1_Fun error')
    let r = 1
    for (let i = 0; i < p.count; i++) {
        r += 1
        r *= 2.5
        r /= 2.5
        r -= 1
    }
    return 'p1:' + p.p1 + ', p2:' + p.p2 + ', 測試中文' + ', count:' + p.count + ', r:' + r
}


export default gParfor1_Fun
