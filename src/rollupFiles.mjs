import _ from 'lodash'
import w from './wsemip.umd.js'
import rollupFile from './rollupFile.mjs'


/**
 * 使用rollup編譯檔案
 *
 * @param {Object} opt 輸入設定物件
 * @param {String|Array} opt.fns 輸入原始碼檔案名稱字串陣列，各檔案含副檔名，不含所在資料夾
 * @param {String} [opt.fdSrc='./'] 輸入原始碼檔案所在資料夾字串，預設'./'
 * @param {String} [opt.fdTar=''] 輸入編譯檔案至儲存資料夾字串，預設''
 * @param {String} [opt.nameDistType=''] 輸入編譯檔案名稱格式字串，可選'kebabCase'，預設''
 * @param {Function} [opt.hookNameDist=null]  輸入強制指定編譯檔案名稱函數，預設null，會複寫nameDistType之處理結果
 * @param {String} [opt.format='umd'] 輸入編譯格式字串，可選'umd'、'iife'、'es'，預設'umd'
 * @param {String} [opt.targets='old'] 輸入編譯等級字串，可選'new'、'old'，預設'old'
 * @param {String} [opt.ext='js'] 輸入編譯檔案副檔名字串，可選'js'、'mjs'，預設'js'
 * @param {Boolean} [opt.bSourcemap=true] 輸入編譯檔案是否提供sourcemap布林值，預設true
 * @param {Boolean} [opt.bBanner=true] 輸入編譯檔案是否帶有開頭banner布林值，預設true
 * @param {Boolean} [opt.bNodePolyfill=false] 輸入編譯檔案是否自動加入node polyfill布林值，主要把node專用語法(例如fs)轉為瀏覽器端語法，預設true
 * @param {Boolean} [opt.bMinify=true] 輸入編譯檔案是否進行壓縮布林值，預設true
 * @param {Boolean} [opt.keepFnames=false] 輸入當編譯檔案需壓縮時，是否保留函數名稱布林值，預設false
 * @param {Array} [opt.mangleReserved=[]] 輸入當編譯檔案需壓縮時，需保留函數名稱或變數名稱布林值，預設[]
 * @param {Object} [opt.globals={}] 輸入指定內外模組的關聯性物件，預設{}
 * @param {Array} [opt.external=[]] 輸入指定內部模組需引用外部模組陣列，預設[]
 * @param {Boolean} [opt.bLog=true] 輸入是否顯示預設log布林值，預設true
 */
async function rollupFiles(opt = {}) {

    //fsCleanFolder
    w.fsCleanFolder(opt.fdTar)

    //fns
    let fns = opt.fns
    if (_.isString(fns)) {
        fns = [fns]
    }

    //pmSeries
    return w.pmSeries(fns, (fn) => {
        let o = { ...opt }
        o.fn = fn
        return rollupFile(o)
    })
        .catch((err) => {
            console.log(err)
        })

}


export default rollupFiles
