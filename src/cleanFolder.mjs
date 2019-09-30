import fs from 'fs'


function core(path) {
    fs.readdirSync(path).forEach(function(file, index) {
        var curPath = path + '/' + file
        if (fs.lstatSync(curPath).isDirectory()) { // recurse
            core(curPath)
        }
        else { // delete file
            fs.unlinkSync(curPath)
        }
    })
    fs.rmdirSync(path)
}


/**
 * 清空資料夾
 *
 * @param {String} path 輸入欲清空資料夾路徑字串
 */
function cleanFolder(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function(file, index) {
            var curPath = path + '/' + file
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                core(curPath)
            }
            else {
                fs.unlinkSync(curPath)
            }
        })
    }
    else {
        fs.mkdirSync(path)
    }
}


export default cleanFolder
