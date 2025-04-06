import _ from 'lodash-es'
import w from './wsemip.umd.js'


function getFiles(fd) {
    //給各專案處理使用

    //fsGetFilesInFolder
    let vpfs = w.fsGetFilesInFolder(fd)
    let files = _.map(vpfs, 'path')
    return files

}


export default getFiles
