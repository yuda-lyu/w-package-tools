import fs from 'fs'
import _ from 'lodash'


/**
 * 讀取readme資料物件
 *
 * @param {string} [fn='./README.md'] 輸入readme檔案路徑字串
 * @returns {Object} 回傳readme資料物件
 */
function getReadme(fn = './README.md') {
    let c = fs.readFileSync(fn, 'utf8')
    return {
        content: c,
        lines: _.split(c, '\r\n')
    }
}


export default getReadme
