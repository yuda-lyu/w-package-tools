import _ from 'lodash-es'
import w from './wsemip.umd.js'


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
