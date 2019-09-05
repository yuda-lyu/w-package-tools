import fs from 'fs'
import getPks from './getPks.mjs'
import getReadme from './getReadme.mjs'


/**
 * 更新readme內cdn連結為最新版本
 *
 * @param {string} [fnRM='./README.md'] 輸入readme檔案路徑字串
 */
async function modifyReadme(fnRM = './README.md', fnPks = './package.json') {

    //pks
    let pks = getPks(fnPks)

    //rdme
    let rdme = getReadme(fnRM)

    //replace
    let sf = `(${pks.name}@)+(\\d+.\\d+.\\d+)`
    let sr = `${pks.name}@${pks.version}`
    let reg = new RegExp(sf, 'g')
    let c = rdme.content.replace(reg, sr)

    //write
    //console.log(c)
    fs.writeFileSync(fnRM, c, 'utf8')

}
modifyReadme()
