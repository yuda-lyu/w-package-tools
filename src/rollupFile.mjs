import fs from 'fs'
import path from 'path'
import _ from 'lodash-es'
import w from './wsemip.umd.js'
import { rollup } from 'rollup'
import vue from 'rollup-plugin-vue' //5.1.9為轉譯vue2, 6.0.0為轉譯vue3
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import postcss from 'rollup-plugin-postcss'
import { babel } from '@rollup/plugin-babel' //考慮ie11已剔除, 不須轉譯async或模版語法等, 故vue2直接使用轉譯程式碼的@rollup/plugin-babel
// import babelForVue2 from 'rollup-plugin-babel' //才能轉譯vue2含async語法的組件
import terser from '@rollup/plugin-terser'
import nodePolyfills from 'rollup-plugin-node-polyfills'
import getPks from './getPks.mjs'
import { genBuildCheck } from './buildCheck.mjs'
import { rejectWpt } from './wptCommon.mjs'


// let babelForJs = babel
// let babelForVue2 = babel


/**
 * 使用rollup轉譯檔案
 *
 * 建置期檢查(依tree-shaking後之產物判定，任一不通過即reject且不產出)：
 * ①產物仍引用之無法解析裸引用(套件或子路徑不存在、不存在之node:模組)建置失敗，Node內建模組除外(但iife、或runin為browser且bNodePolyfill時，未明列於external之內建模組亦失敗)；只以受守衛(try、.catch)之動態import()引用之選用相依只警告；確為執行期由使用端提供之模組須明列於opt.external；
 * ②require(非字面值)會被commonjs換成呼叫即拋錯之樁，未受守衛(不在try內)之呼叫即建置失敗；
 * ③format非es時，原始碼(含被打包之相依)取用import.meta之url以外屬性(dirname、filename、resolve、main、env、glob等)須受守衛(typeof、??、?.、條件判斷)，否則建置失敗(rollup只模擬url，其餘換成undefined)；亦不得寫入import.meta、以別名或解構取出url以外屬性；
 * ④format為umd或cjs時，產物內不得有與import.meta.url墊片同名之宣告(umd：__filename、location；cjs：函數內之__filename)，否則墊片綁到該宣告而載入即TDZ或得錯值；import.meta.url於umd、cjs為產物檔之URL(非原始碼位置)。
 *
 * @param {Object} opt 輸入設定物件
 * @param {String} opt.fn 輸入原始碼檔案名稱字串，檔案需含副檔名，不含所在資料夾
 * @param {String} [opt.fdSrc='./'] 輸入原始碼檔案所在資料夾字串，給定時須為既存資料夾否則reject(不改用'./')，未給才為'./'，預設'./'
 * @param {String} [opt.fdTar=''] 輸入轉譯檔案至儲存資料夾字串，給定時為寫檔模式(資料夾不存在則建立，為檔案或無法建立則reject)並回傳'finish'；未給時為回傳程式碼模式，於記憶體產出、不寫入任何檔案且不產生sourcemap，回傳轉譯後程式碼字串，預設''
 * @param {String} [opt.nameDistType=''] 輸入轉譯檔案名稱格式字串，可選'kebabCase'，預設''
 * @param {Function} [opt.hookNameDist=null]  輸入強制指定轉譯檔案名稱函數，預設null，會複寫nameDistType之處理結果
 * @param {String} [opt.format='umd'] 輸入轉譯格式字串，可選'umd'、'iife'、'es'，預設'umd'
 * @param {String} [opt.targets='old'] 輸入轉譯等級字串，可選'new'、'old'，預設'old'
 * @param {String} [opt.ext='js'] 輸入轉譯檔案副檔名字串，可選'js'、'mjs'，預設'js'
 * @param {Boolean} [opt.bSourcemap=true] 輸入轉譯檔案是否提供sourcemap布林值，僅寫檔模式有效(回傳程式碼模式一律不產生)，預設true
 * @param {Boolean} [opt.bBanner=true] 輸入轉譯檔案是否帶有開頭banner布林值，預設true
 * @param {String} [opt.runin='browser'] 輸入執行環境字串，可選'nodejs'、'browser'，預設'browser'
 * @param {Boolean} [opt.bResolveExtPath=true] 輸入是否啟用[深層子路徑無副檔名引用之補全解析]布林值，針對套件(如echarts-gl)以無副檔名寫法深層引用他套件(如'zrender/lib/core/LRU')、而被引用套件exports末端為萬用對應"./*"導致rollup載入ENOENT之情形，先試原樣解析、失敗才補.js重試，因自有套件會逐層被自有套件引用故預設需開啟，預設true
 * @param {Boolean} [opt.bNodePolyfill=false] 輸入當runin='browser'時，轉譯檔案是否自動加入node polyfill布林值，主要把node專用語法(例如fs)轉為瀏覽器端語法，預設false
 * @param {Boolean} [opt.bMinify=true] 輸入轉譯檔案是否進行壓縮布林值，預設true
 * @param {Boolean} [opt.keepFnames=false] 輸入當轉譯檔案需壓縮時，是否保留函數名稱布林值，預設false
 * @param {Array} [opt.mangleReserved=[]] 輸入當轉譯檔案需壓縮時，需保留函數名稱或變數名稱陣列，預設[]
 * @param {Array} [opt.mainFields=null] 輸入取用套件內環境入口時，可強制給予循序入口陣列，各入口可選'browser'、'module'、'main'，給予null則代表用rollup內建，預設null
 * @param {Object} [opt.globals={}] 輸入指定內外模組的關聯性物件，預設{}
 * @param {Array} [opt.external=[]] 輸入指定內部模組需引用外部模組陣列(字串以全名比對，深層子路徑須另列全名或改給RegExp)，未列入且無法解析之裸引用(Node內建模組除外)建置即失敗，預設[]
 * @param {Boolean} [opt.bLog=true] 輸入是否顯示預設log布林值，預設true
 */
async function rollupFile(opt = {}) {

    //rollupFileCore
    let r = await rollupFileCore(opt)

    //回傳程式碼模式回傳程式碼, 寫檔模式回傳'finish'
    if (r.bReturnCode) {
        return r.code
    }
    return 'finish'
}


//rollupFileCore, 內部用(非公開API): 轉譯並回傳{ bReturnCode, code, exports }, exports為rollup之chunk.exports(回傳程式碼模式才有), 供rollupWorkerCore於建置期檢查預設匯出; 此資訊不經公開opt交出
//  internal: 內部呼叫者之設定(不經公開opt), { workerInner: rollupWorkerCore之inner之runin('nodejs'或'browser'), 建置期另檢查inner不得使用import.meta.url、瀏覽器inner不得引用外部模組(帳本R16③、R17③) }
async function rollupFileCore(opt = {}, internal = {}) {

    //bLog
    let bLog = _.get(opt, 'bLog', null)
    if (!w.isbol(bLog)) {
        bLog = true
    }

    //pkg
    let pkg = getPks()

    //env
    let env = process.env.NODE_ENV

    //fdTar, 給定即為寫檔模式, 資料夾不存在則建立, 為檔案或無法建立即reject: 不可靜默改走回傳程式碼模式而不產出(呼叫端以為已寫檔, 等同吞錯); 未給才為回傳程式碼模式
    let fdTar = _.get(opt, 'fdTar', null)
    let bReturnCode = false
    if (w.isestr(fdTar)) {
        if (!w.fsIsFolder(fdTar)) {
            w.fsCreateFolder(fdTar) //失敗時不拋錯(回傳error物件), 由下方之檢查判定
        }
        if (!w.fsIsFolder(fdTar)) {
            return rejectWpt('WPT_INVALID_FDTAR', `invalid opt.fdTar[${fdTar}]: not a folder and can not be created`)
        }
    }
    else {
        fdTar = ''
        bReturnCode = true
    }

    //fn
    let fn = _.get(opt, 'fn', '')

    //fpSrc, 欲轉譯的檔案; 未給fpSrc時以fdSrc與fn組成, fdSrc給定即須為既存資料夾(路徑不可用即reject, 不靜默改用'./'), 未給才為'./'
    let fpSrc = ''
    if (w.isestr(_.get(opt, 'fpSrc', null))) {
        fpSrc = opt.fpSrc
    }
    else {
        let fdSrc = _.get(opt, 'fdSrc', null)
        if (w.isestr(fdSrc)) {
            if (!w.fsIsFolder(fdSrc)) {
                return rejectWpt('WPT_INVALID_FDSRC', `invalid opt.fdSrc[${fdSrc}]: not a folder`)
            }
        }
        else {
            fdSrc = './'
        }
        fpSrc = path.resolve(fdSrc, fn)
    }

    //check
    if (!w.fsIsFile(fpSrc)) {
        return rejectWpt('WPT_INVALID_FPSRC', `invalid fpSrc: ${fpSrc}`)
    }

    //console
    if (bLog) {
        console.log('transpiling: ' + w.getFileName(fpSrc))
    }

    //extIn
    let extIn = _.toLower(w.strdelleft(path.extname(fpSrc), 1))

    //nameTrue
    let nameTrue = w.getFileTrueName(fpSrc)

    //nameDistType
    let nameDistType = _.get(opt, 'nameDistType', null)

    //nameDist
    let nameDist = nameTrue
    if (nameDistType === 'kebabCase') {
        nameDist = _.kebabCase(nameTrue)
    }

    //hookNameDist
    let hookNameDist = _.get(opt, 'hookNameDist', null)
    if (_.isFunction(hookNameDist)) {
        nameDist = hookNameDist(nameDist, nameTrue, fn)
    }

    //format
    let format = _.get(opt, 'format', null)
    if (!w.isestr(format)) {
        format = 'umd'
    }

    //targets
    let targets = _.get(opt, 'targets', null)
    if (targets === 'new') {
        targets = 'last 2 Chrome versions'
    }
    else {
        targets = 'defaults' //> 0.5%, last 2 versions, Firefox ESR, not dead
    }

    //extOut
    let extOut = _.get(opt, 'ext', null)
    if (extOut === null && format === 'es') {
        extOut = 'mjs' //若使用es且沒指定ext就改副檔名為mjs
    }
    if (extOut !== 'js' && extOut !== 'mjs') {
        extOut = 'js'
    }

    //license
    let license = _.get(opt, 'license', null)
    if (!w.isestr(license)) {
        license = 'MIT'
    }

    //bSourcemap
    let bSourcemap = _.get(opt, 'bSourcemap', null)
    if (!w.isbol(bSourcemap)) {
        bSourcemap = true
    }

    //banner
    let bBanner = _.get(opt, 'bBanner', null)
    if (!w.isbol(bBanner)) {
        bBanner = true
    }

    //banner
    let cbanner = null
    if (bBanner) {
        cbanner = `/*!\n * ${nameDist} v${pkg.version}\n * (c) 2018-2021 ${pkg.author}\n * Released under the ${license} License.\n */`
    }
    let banner = cbanner

    //runin
    let runin = _.get(opt, 'runin', null)
    if (runin !== 'nodejs' && runin !== 'browser') {
        if (runin !== null) {
            console.log(`invalid runin[${runin}], set to 'browser'`) //未給即用預設browser, 給了非法值才提示
        }
        runin = 'browser'
    }

    //bResolveExtPath
    let bResolveExtPath = _.get(opt, 'bResolveExtPath', null)
    if (!w.isbol(bResolveExtPath)) {
        bResolveExtPath = true
    }

    //bNodePolyfill, 提供使用node用api的轉譯
    let bNodePolyfill = _.get(opt, 'bNodePolyfill', null)
    if (!w.isbol(bNodePolyfill)) {
        bNodePolyfill = false
    }

    //minify
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
        mangleReserved = [] //可禁止使用'$', 因有些技術使用取代字串成轉譯後程式碼, 若轉譯後程式碼內含$&會導致觸發regex的插入匹配的字串, 從而造成非預期問題
    }

    //mainFields
    let mainFields = _.get(opt, 'mainFields', null)
    if (!w.isearr(mainFields)) {
        mainFields = null
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

    //plugins
    let plugins = []

    plugins.push(json())

    plugins.push(replace({
        'preventAssignment': true,
        'process.env.NODE_ENV': JSON.stringify(env)
    }))

    if (extIn === 'vue') {
        plugins.push(vue())
    }

    plugins.push(commonjs())

    if (runin === 'browser' && bNodePolyfill) {
        //要放在commonjs之後否則無法處理require語法
        plugins.push(nodePolyfills())
    }

    if (true) {

        //resolveExtSubpath, 深層子路徑無副檔名引用之補全解析
        //why: 部分套件(如echarts-gl)之esm原始碼以無副檔名寫法深層引用他套件(如'zrender/lib/core/LRU'),
        //而被引用套件(echarts, zrender)之package.json exports末端為萬用對應"./*": "./*",
        //依Node規範該對應原樣輸出不補副檔名, resolve(node-resolve)會回傳無副檔名之實體路徑, rollup載入時直接ENOENT,
        //且node-resolve之mainFields/exportConditions選項皆無法繞過(15.3.1與16.0.3實測皆然);
        //webpack對此類引用內建[補.js重試]行為(fullySpecified=false), 故同一套件於webpack可編譯而rollup失敗,
        //此plugin等效補上webpack行為, 且採fallback-first: 先試原樣解析, 成功且檔案存在則完全不介入(維持既有行為逐byte不變),
        //僅當原樣解析失敗(null)或解析出不存在之實體路徑時才補.js重試, 重試仍走完整解析鏈並驗證實體檔案存在才採用,
        //避免對現行正常引用搶答補.js造成劫持(如@babel/runtime之'./helpers/x'於import條件映射esm版, 補.js可能誤導向cjs版);
        //預設開啟(bResolveExtPath=true), 因自有套件會逐層被自有套件引用(如引用w-echarts-vue之自有套件),
        //下游打包時同樣會經過echarts-gl此類引用, 須靠預設開啟才能編譯, 故僅提供可選關閉不提供可選開啟
        if (bResolveExtPath) {
            plugins.push({
                name: 'resolve-ext-subpath',
                resolveId: async function(source, importer, options) {
                    if (source.startsWith('\0')) { //虛擬模組(commonjs proxy等)不介入
                        return null
                    }
                    let bBare = /^[^./\\]/.test(source) //裸套件引用(非相對/絕對路徑)
                    let bDeep = source.indexOf('/') >= 0 //深層子路徑
                    let bNoExt = path.extname(source) === '' //無副檔名
                    if (bBare && bDeep && bNoExt) {
                        //先試原樣解析, 成功且(為external或檔案存在)則不介入, 交回原流程
                        let r0 = await this.resolve(source, importer, { ...options, skipSelf: true })
                        if (r0 && (r0.external || fs.existsSync(r0.id))) {
                            return null
                        }
                        //原樣解析失敗或解析出不存在之實體路徑, 補.js重試
                        let r = await this.resolve(`${source}.js`, importer, { ...options, skipSelf: true })
                        if (r && !r.external && fs.existsSync(r.id)) {
                            return r
                        }
                    }
                    return null
                },
            })
        }

        let resolveOpt = {}
        if (runin === 'browser') {
            resolveOpt = {
                preferBuiltins: false,
                browser: true,
            }
        }
        else {
            resolveOpt = {
                preferBuiltins: true,
                browser: false,
            }
        }
        if (w.isearr(mainFields)) {
            //package.json內 browser:true => mainFields預設值['browser', 'module', 'main']
            //package.json內 browser:false => mainFields預設值['module', 'main']
            resolveOpt.mainFields = mainFields
        }
        plugins.push(resolve(resolveOpt))
    }

    let babelOpt = {
        // babelrc: false,
        presets: [
            [
                '@babel/preset-env',
                {
                    useBuiltIns: 'entry', //entry usage, usage is not stable
                    corejs: 3,
                    // modules: false,
                    targets,
                }
            ]
        ],
        plugins: [
            '@babel/plugin-transform-runtime',
            '@babel/plugin-proposal-export-default-from',
            // '@babel/plugin-proposal-nullish-coalescing-operator', //browser與nodejs已支援
            // '@babel/plugin-proposal-object-rest-spread', //browser與nodejs已支援
            // '@babel/plugin-proposal-optional-chaining', //browser與nodejs已支援
        ]
    }
    let babelPlugin
    // if (extIn === 'vue') {
    //     babelOpt.runtimeHelpers = true //給rollup-plugin-babel用, 為舊版babel設定
    //     babelPlugin = babelForVue2(babelOpt)
    // }
    // else {
    //     babelOpt.babelHelpers = 'runtime' //新版babel設定
    //     babelPlugin = babelForJs(babelOpt)
    // }
    babelOpt.babelHelpers = 'runtime' //新版babel設定
    babelPlugin = babel(babelOpt)
    plugins.push(babelPlugin)

    plugins.push(postcss({
        extensions: ['.css']
    }))

    //genBuildCheck, 建置期檢查(帳本R16、R17): 外掛須在terser之前以檢查未壓縮之輸出, onwarn記錄rollup之UNRESOLVED_IMPORT; workerInner由rollupWorkerCore經第二參數給定(不經公開opt)
    let bc = genBuildCheck({ external, runin, bNodePolyfill, workerInner: _.get(internal, 'workerInner', null) })
    plugins.push(bc.plugin)

    if (bMinify) {
        // plugins.push(terser.terser({
        //     output: {
        //         comments: false, //default
        //     },
        // }))
        plugins.push(terser({
            keep_fnames: keepFnames,
            mangle: {
                reserved: mangleReserved
            }
        }))
    }

    //fpTar, 轉譯後檔案; 回傳程式碼模式不寫檔, 此名稱只供rollup為產出命名
    let fpTar = ''
    if (!bReturnCode) {
        fpTar = path.resolve(fdTar, `${nameDist}.${format}.${extOut}`)
    }
    else {
        fpTar = `./temp-${w.genID()}`
    }
    // console.log('fpTar', fpTar)

    //inputOptions
    let inputOptions = {
        external,
        input: fpSrc,
        // treeshake: false,
        plugins,
        onwarn: bc.onwarn, //記錄無法解析之裸引用並照常輸出警告, 由bc.plugin依產物判定(帳本R16①); 不用onLog: 其於rollup 3.25才有, 下游實裝之rollup最舊為3.20.2
    }

    //outputOptions
    let outputOptions = {
        banner,
        globals,
        format, //若format='umd', 則會被當成browser環境編譯, 偵測不支援套件而提示Creating a browser bundle that depends on Node.js built-in modules...
        name: nameDist,
        file: fpTar,
        inlineDynamicImports: true, //有些套件例如pyodide內會使用動態加載技術, 故得使用inlineDynamicImports
        sourcemap: bReturnCode ? false : bSourcemap, //回傳程式碼模式不產生sourcemap: 無檔可指, 產出則回傳碼末行指向不存在之檔案(帳本R14)
        sourcemapExcludeSources: true,
    }

    //bundle
    let bundle = await rollup(inputOptions)

    //回傳程式碼模式以generate於記憶體產出, 不寫任何檔案(cwd零寫入, 帳本R14); 寫檔模式才write
    let code = ''
    let exports = []
    if (bReturnCode) {

        //generate
        let { output } = await bundle.generate(outputOptions)

        //check, 回傳程式碼模式只能交出單一程式碼, 產出多項(外掛emitFile之asset等)即reject, 不可靜默丟失
        if (output.length > 1) {
            return rejectWpt('WPT_MULTI_OUTPUT', `return-code mode of rollupFile can not output multiple files: ${_.join(_.map(output, 'fileName'), ', ')}`)
        }

        //code, exports
        code = output[0].code
        exports = output[0].exports

    }
    else {

        //write
        await bundle.write(outputOptions)

    }

    //console
    if (bLog && !bReturnCode) {
        console.log('\x1b[32m%s\x1b[0m', 'output: ' + w.getFileName(fpTar))
    }

    return {
        bReturnCode,
        code,
        exports,
    }
}


export { rollupFileCore }
export default rollupFile
