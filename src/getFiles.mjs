import fs from 'fs'


/**
 * 取得資料夾下所有檔案
 *
 * @param {String} fd 輸入資料夾路徑字串
 * @returns {Array} 回傳檔案字串陣列
 */
function getFiles(fd) {

    //check
    if (!fs.existsSync(fd)) {
        return []
    }

    //readdir
    let ltfs = fs.readdirSync(fd, { withFileTypes: true })

    //filter
    ltfs = ltfs.filter((v) => {
        let b = !v.isDirectory()
        return b
    })

    //map
    ltfs = ltfs.map((v) => {
        return v.name
    })

    return ltfs
}


export default getFiles
