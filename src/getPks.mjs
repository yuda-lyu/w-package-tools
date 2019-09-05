import fs from 'fs'


/**
 * 取得package.json資料物件
 *
 * @param {string} [fn='./package.json'] 輸入package.json路徑字串
 * @returns {Object} 回傳資料物件
 */
function getPks(fn = './package.json') {
    let c = fs.readFileSync(fn, 'utf8')
    return JSON.parse(c)
}


export default getPks
