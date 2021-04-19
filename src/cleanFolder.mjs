import fs from 'fs'


function core(pah) {
    fs.readdirSync(pah).forEach(function(file, index) {
        let curPath = pah + '/' + file
        if (fs.lstatSync(curPath).isDirectory()) {
            core(curPath) // recurse
        }
        else { // delete file
            fs.unlinkSync(curPath)
        }
    })
    fs.rmdirSync(pah)
}


/**
 * 清空資料夾
 *
 * @param {String} pah 輸入欲清空資料夾路徑字串
 */
function cleanFolder(pah) {
    if (fs.existsSync(pah)) {
        fs.readdirSync(pah).forEach(function(file, index) {
            let curPath = pah + '/' + file
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                core(curPath)
            }
            else {
                fs.unlinkSync(curPath)
            }
        })
    }
    else {
        fs.mkdirSync(pah)
    }
}


export default cleanFolder
