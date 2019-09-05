import fs from 'fs'


/**
 * 刪除資料牙
 *
 * @param {Str} path 輸入欲刪除資料夾路徑字串
 */
function deleteFolder(path) {
    if (fs.existsSync(path)) {
        //console.log('in: ', path)
        fs.readdirSync(path).forEach(function(file, index) {
            var curPath = path + '/' + file
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolder(curPath)
            }
            else { // delete file
                //console.log('delete file: ', curPath)
                fs.unlinkSync(curPath)
            }
        })
        //console.log('delete folder: ', path)
        fs.rmdirSync(path)
    }
}


export default deleteFolder
