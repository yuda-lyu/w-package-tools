
import fs from 'fs'
import path from 'path'
import _ from 'lodash'


function unitPath(c) {
    c = c.replace(/\\/g, path.sep)
    c = c.replace(/\//g, path.sep)
    return c
}

function sepPath(c) {
    c = unitPath(c)
    let s = _.split(c, path.sep)
    return s
}

/**
 * 自動建立資料夾
 *
 * @param {String} pah 輸入資料夾路徑字串
 */
function createFolder(pah) {

    //s
    let s = sepPath(pah)

    //each
    let n = []
    _.each(s, (v) => {

        //push
        n.push(v + path.sep)

        //t
        let t = _.join(n, '')

        //check
        if (v.indexOf(':') < 0) {

            //mkdirSync
            //console.log(t, fs.existsSync(t))
            if (!fs.existsSync(t)) {
                fs.mkdirSync(t)
            }

        }

    })


}


export default createFolder
