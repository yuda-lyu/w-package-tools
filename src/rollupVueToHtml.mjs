import fs from 'fs'
import _ from 'lodash'
import createFolder from './createFolder.mjs'
import rollupFiles from './rollupFiles.mjs'


/**
 * 使用rollup編譯Vue檔案並自動產生瀏覽用的html檔
 *
 * @param {String} [src='./src/App.vue'] 輸入欲打包Vue檔案(*.vue)的位置字串，預設'./src/App.vue'
 * @param {String} [tar='./docs/examples/app.html'] 輸入輸出html的位置字串，並於該目錄下會出現打包後的js檔與map檔，預設'./docs/examples/app.html'
 * @param {Object} [opt={}] 輸入其他設定物件，預設{}
 * @param {String} [opt.title=''] 輸入標題字串，預設''
 * @param {String} [opt.htmlLang='zh-tw'] 輸入所產生html的lang字串，預設'zh-tw'
 * @param {String} [opt.head=''] 輸入head內額外html字串，預設''
 * @param {String} [opt.newVue=''] 輸入body初始化(new Vue)內額外設定字串，預設''
 * @param {String} [opt.globals={}] 輸入rollup不打包套件時內外部套件關聯性設定物件，預設{}
 * @param {String} [opt.external=[]] 輸入rollup不打包套件清單陣列，預設[]
 */
async function rollupVueToHtml(src = './src/App.vue', tar = './docs/examples/app.html', opt = {}) {

    //param
    let vsrc = _.split(src, '/')
    let vtar = _.split(tar, '/')
    let fdSrc = _.join(_.dropRight(vsrc), '/') + '/'
    let fdTar = _.join(_.dropRight(vtar), '/') + '/'
    let srcName = _.last(vsrc) //'App.vue'
    let tarName = _.head(_.split(_.last(vtar), '.')) //'app'

    //opt
    let title = _.get(opt, 'title', '')
    let htmlLang = _.get(opt, 'htmlLang', 'zh-tw')
    let head = _.get(opt, 'head', '')
    let newVue = _.get(opt, 'newVue', '')
    let globals = _.get(opt, 'globals', {})
    let external = _.get(opt, 'external', [])

    //h
    let h = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${htmlLang}">
<head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, minimal-ui">
    <title>${title}</title>

    <!-- @babel/polyfill -->
    <script nomodule src="https://cdn.jsdelivr.net/npm/@babel/polyfill/dist/polyfill.min.js"></script>

    <!-- vue -->
    <script src="https://cdn.jsdelivr.net/npm/vue/dist/vue.min.js"></script>

    ${head}

    <!-- ${tarName} -->
    <script src="${tarName}.umd.js?${Date.now()}"></script>

</head>
<body style="font-family:'Microsoft JhengHei','Avenir','Helvetica'; padding:0px; margin:0px;">

    <div id="app">
        <w-app></w-app>
    </div>

    <script>

        //install app
        Vue.component('w-app',${tarName})

        //initialize
        new Vue({
            el: '#app',
            ${newVue}
        })

    </script>

</body>
</html>
`

    //createFolder
    createFolder(fdTar)

    //rollupFiles
    await rollupFiles({
        fns: `${srcName}`,
        fdSrc,
        fdTar,
        nameDistType: 'kebabCase',
        hookNameDist: () => {
            return tarName
        },
        globals,
        external,
    })

    //app.html
    fs.writeFileSync(`${fdTar}${tarName}.html`, h, 'utf8')

}


export default rollupVueToHtml
