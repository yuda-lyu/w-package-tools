import * as w from './wsemip.es.mjs' //因mocha無法識別得用*轉出default


function cleanFolder(fd) {
    //給各專案處理使用

    //fsCleanFolder
    return w.fsCleanFolder(fd)

}


export default cleanFolder
