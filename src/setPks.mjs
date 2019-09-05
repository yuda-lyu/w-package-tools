import fs from 'fs'


/**
 * 儲存資料至package.json
 *
 * @param {Object} pks 輸入package.json資料物件
 * @param {string} [fn='./package.json'] 輸入package.json路徑字串
 */
function setPks(pks, fn = './package.json') {
    let c = JSON.stringify(pks, null, 2)
    fs.writeFileSync(fn, c, 'utf8')
}


export default setPks
