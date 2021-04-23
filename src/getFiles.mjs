import _ from 'lodash'
import * as w from './wsemip.es.mjs' //因mocha無法識別得用*轉出default


function getFiles(fd) {
    //給各專案處理使用

    //fsGetFilesInFolder
    let files = w.fsGetFilesInFolder(fd)

    //getFileName
    files = _.map(files, (v) => {
        return w.getFileName(v)
    })

    return files
}


export default getFiles
