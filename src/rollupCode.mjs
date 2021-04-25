import fs from 'fs'
import * as w from './wsemip.es.mjs' //因mocha無法識別得用*轉出default
import rollupFile from './rollupFile.mjs'


async function rollupCode(codeSrc, opt = {}) {

    //name
    let name = opt.name
    if (!name) {
        name = `temp-${w.genID()}`
    }

    //formatIn
    let formatIn = opt.formatIn
    if (!formatIn) {
        formatIn = 'js'
    }

    //formatOut
    let formatOut = opt.formatOut
    if (!formatOut) {
        formatOut = 'umd'
    }

    //fpIn
    let fpIn = `./${name}.${formatIn}`

    //把欲轉換之程式碼寫入檔案
    fs.writeFileSync(fpIn, codeSrc, 'utf8')

    //opt
    opt.fdSrc = ''
    opt.fdTar = '' //不給輸出資料夾則為回傳程式碼
    opt.fn = fpIn
    opt.format = formatOut
    opt.bLog = false
    opt.bBanner = false
    opt.bSourcemap = false

    //rollupFile
    let code = await rollupFile(opt)
        .finally(() => {

            //unlinkSync, 不論編譯成功失敗都刪除檔案
            try {
                fs.unlinkSync(fpIn)
            }
            catch (err) {
                console.log(err)
            }

        })

    return code
}


export default rollupCode
