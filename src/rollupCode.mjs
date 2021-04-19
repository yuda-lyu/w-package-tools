import fs from 'fs'
import path from 'path'
import genID from './genID.mjs'
import rollupFile from './rollupFile.mjs'


async function rollupCode(codeSrc, opt = {}) {

    //name
    let name = opt.name
    if (!name) {
        name = `./temp-${genID()}`
    }

    //formatIn,formatOut
    let formatIn = opt.formatIn
    if (!formatIn) {
        formatIn = 'js'
    }
    let formatOut = opt.formatOut
    if (!formatOut) {
        formatOut = 'umd'
    }

    let fnSrc = `${name}.${formatIn}`
    let fnTar = `${name}.${formatOut}.js`
    let fd = path.dirname(`./${fnSrc}`)

    //把欲轉換之程式碼寫入檔案
    fs.writeFileSync(`./${fnSrc}`, codeSrc, 'utf8')

    //opt
    opt.fdSrc = fd
    opt.fdTar = fd
    opt.fn = fnSrc
    opt.format = formatOut
    opt.bLog = false
    opt.bBanner = false
    opt.bSourcemap = false

    //rollupFile
    await rollupFile(opt)

    //讀取轉換後之程式碼
    let r = fs.readFileSync(`./${fnTar}`, 'utf8')

    //unlinkSync
    fs.unlinkSync(`./${fnSrc}`)
    fs.unlinkSync(`./${fnTar}`)

    return r
}


export default rollupCode
