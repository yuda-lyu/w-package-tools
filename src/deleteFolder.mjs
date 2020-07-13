import fs from 'fs'


/**
 * 刪除資料夾
 *
 * @param {String} pah 輸入欲刪除資料夾路徑字串
 */
function deleteFolder(pah) {
    if (fs.existsSync(pah)) {
        //console.log('in: ', pah)
        fs.readdirSync(pah).forEach(function(file, index) {
            var curPath = pah + '/' + file
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolder(curPath)
            }
            else { // delete file
                //console.log('delete file: ', curPath)
                fs.unlinkSync(curPath)
            }
        })
        //console.log('delete folder: ', pah)
        fs.rmdirSync(pah)
    }
}


export default deleteFolder
