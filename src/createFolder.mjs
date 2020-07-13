import fs from 'fs'


/**
 * 自動建立資料夾
 *
 * @param {String} pah 輸入資料夾路徑字串
 */
function createFolder(pah) {

    //mkdirSync
    try {
        fs.mkdirSync(pah, { recursive: true })
    }
    catch (err) {
        console.log('createFolder catch', err)
    }

}


export default createFolder
