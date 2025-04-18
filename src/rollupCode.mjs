import fs from 'fs'
import _ from 'lodash-es'
import w from './wsemip.umd.js'
import rollupFile from './rollupFile.mjs'


/**
 * 使用rollup編譯程式碼
 *
 * @param {String} codeSrc 輸入程式碼字串
 * @param {Object} opt 輸入設定物件
 * @param {String} opt.name 輸入模組名稱字串
 * @param {String} [opt.formatIn='js'] 輸入待編譯程式碼格式字串，可選'js'、'mjs'，預設'js'
 * @param {String} [opt.formatOut='umd'] 輸入欲編譯成js格式字串，可選'umd'、'iife'、'es'，預設'umd'
 * @param {String} [opt.targets='old'] 輸入編譯等級字串，可選'new'、'old'，預設'old'
 * @param {Boolean} [opt.bNodePolyfill=false] 輸入編譯檔案是否自動加入node polyfill布林值，主要把node專用語法(例如fs)轉為瀏覽器端語法，預設true
 * @param {Boolean} [opt.bMinify=true] 輸入編譯檔案是否進行壓縮布林值，預設true
 * @param {Boolean} [opt.keepFnames=false] 輸入當編譯檔案需壓縮時，是否保留函數名稱布林值，預設false
 * @param {Array} [opt.mangleReserved=[]] 輸入當編譯檔案需壓縮時，需保留函數名稱或變數名稱陣列，預設[]
 * @param {Object} [opt.globals={}] 輸入指定內外模組的關聯性物件，預設{}
 * @param {Array} [opt.external=[]] 輸入指定內部模組需引用外部模組陣列，預設[]
 * @param {Boolean} [opt.bLog=true] 輸入是否顯示預設log布林值，預設true
 */
async function rollupCode(codeSrc, opt = {}) {

    //name
    let name = _.get(opt, 'name', null)
    if (!w.isestr(name)) {
        return Promise.reject('invalid opt.name')
    }

    //formatIn
    let formatIn = _.get(opt, 'formatIn', null)
    if (!formatIn) {
        formatIn = 'js'
    }

    //formatOut
    let formatOut = _.get(opt, 'formatOut', null)
    if (!formatOut) {
        formatOut = 'umd'
    }

    //targets
    let targets = _.get(opt, 'targets', null)
    if (!w.isbol(targets)) {
        targets = 'old'
    }

    //bNodePolyfill
    let bNodePolyfill = _.get(opt, 'bNodePolyfill', null)
    if (!w.isbol(bNodePolyfill)) {
        bNodePolyfill = false
    }

    //bMinify
    let bMinify = _.get(opt, 'bMinify', null)
    if (!w.isbol(bMinify)) {
        bMinify = true
    }

    //keepFnames
    let keepFnames = _.get(opt, 'keepFnames', null)
    if (!w.isbol(keepFnames)) {
        keepFnames = false
    }

    //mangleReserved
    let mangleReserved = _.get(opt, 'mangleReserved', null)
    if (!w.isarr(mangleReserved)) {
        mangleReserved = []
    }

    //globals, 提供字串需解析成物件, 指定內外模組的關聯性，左邊key為內部使用之模組名稱，右邊value為外部提供之模組名稱
    let globals = _.get(opt, 'globals', null)
    if (!w.isobj(globals)) {
        globals = {}
    }

    //external, 提供字串需解析成陣列, 指定哪些內部模組需引用外部模組
    let external = _.get(opt, 'external', null)
    if (!w.isarr(external)) {
        external = []
    }

    //bLog
    let bLog = _.get(opt, 'bLog', null)
    if (!w.isbol(bLog)) {
        bLog = true
    }

    //fpSrc
    let fpSrc = `./temp-${w.genID()}-${name}.${formatIn}`

    //把欲轉換之程式碼寫入檔案
    fs.writeFileSync(fpSrc, codeSrc, 'utf8')

    //opt
    // opt.fdSrc = ''
    opt.fdTar = '' //不給輸出資料夾則為回傳程式碼
    // opt.fn = fpSrc
    opt.fpSrc = fpSrc //直接給含隨機字串檔名
    opt.hookNameDist = () => {
        return name //直接給模組名
    }
    opt.format = formatOut
    opt.targets = targets
    opt.bSourcemap = false
    opt.bBanner = false
    opt.bNodePolyfill = bNodePolyfill
    opt.bMinify = bMinify
    opt.keepFnames = keepFnames
    opt.mangleReserved = mangleReserved
    opt.globals = globals
    opt.external = external
    opt.bLog = bLog

    //rollupFile
    let code = await rollupFile(opt)
        .finally(() => {

            //unlinkSync, 不論編譯成功失敗都刪除檔案
            try {
                fs.unlinkSync(fpSrc)
            }
            catch (err) {
                console.log(err)
            }

        })

    return code
}


export default rollupCode
