import fs from 'fs'
import _ from 'lodash-es'
import prettyhtml from '@starptech/prettyhtml'
import w from './wsemip.umd.js'


/**
 * 產生瀏覽範例用的html檔
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.htmlLang='zh-tw'] 輸入所產生html的lang字串，預設'zh-tw'
 * @param {String} [opt.title=''] 輸入標題字串，預設''
 * @param {String} [opt.head=''] 輸入head內額外html字串，預設''
 * @param {String} [opt.appTag=''] 輸入app使用標記字串，預設'div'
 * @param {String} [opt.appClass=''] 輸入app的class字串，預設''
 * @param {String} [opt.appStyle=''] 輸入app的style字串，預設''
 * @param {String} [opt.appTmp=''] 輸入app的html字串，預設''
 * @param {String} [opt.installVue=''] 輸入註冊vue組件的js程式碼字串，預設''
 * @param {String} [opt.newVue=''] 輸入初始化(new Vue)內額外設定字串，預設''
 * @param {String} [opt.data='function(){return {}}'] 輸入初始化(new Vue)時的data設定字串，預設'function(){return {}}'
 * @param {String} [opt.mounted='function(){}'] 輸入初始化(new Vue)時的mounted設定字串，預設'function(){}'
 * @param {String} [opt.computed='{}'] 輸入初始化(new Vue)時的computed設定字串，預設'{}'
 * @param {String} [opt.methods='{}'] 輸入初始化(new Vue)時的methods設定字串，預設'{}'
 * @param {String} [opt.action='[]'] 輸入執行測試腳本action設定字串，預設''
 * @param {Function} [opt.procHtml=null] 輸入呼叫處理html函數，為html重新排版前呼叫，函數輸入為當前html，回傳處理後html，預設null
 * @param {String} [opt.fpHtml=''] 輸入寫入html之檔案位置字串，預設''
 * @param {String} [opt.fpAction=''] 輸入寫入action之檔案位置字串，預設''
 */
async function extractHtml(opt = {}) {

    //opt
    let htmlLang = _.get(opt, 'htmlLang', 'zh-tw')
    let title = _.get(opt, 'title', '')
    let head = _.get(opt, 'head', '')
    let appTag = _.get(opt, 'appTag', 'div')
    let appClass = _.get(opt, 'appClass', '')
    let appStyle = _.get(opt, 'appStyle', '')
    let appTmp = _.get(opt, 'appTmp', '')
    let installVue = _.get(opt, 'installVue', '')
    let newVue = _.get(opt, 'newVue', '')
    let data = _.get(opt, 'data', 'function(){return {}}')
    let mounted = _.get(opt, 'mounted', 'function(){}')
    let computed = _.get(opt, 'computed', '{}')
    let methods = _.get(opt, 'methods', '{}')
    let action = _.get(opt, 'action', '[]')
    let procHtml = _.get(opt, 'procHtml', null)
    let fpHtml = _.get(opt, 'fpHtml', '')
    let fpAction = _.get(opt, 'fpAction', '')

    //newVue若為有效字串, 需偵測最末是否有逗號, 若無則自動添加
    if (w.isestr(newVue) && w.strright(newVue, 1) !== ',') {
        newVue = `${newVue},`
    }

    //h
    let h = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${htmlLang}">
<head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, minimal-ui">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>${title}</title>

    <!-- @babel/polyfill -->
    <script nomodule src="https://cdn.jsdelivr.net/npm/@babel/polyfill/dist/polyfill.min.js"></script>

    <!-- vue -->
    <script src="https://cdn.jsdelivr.net/npm/vue@2.x/dist/vue.min.js"></script>

    ${head}

</head>
<body style="font-family:'Microsoft JhengHei','Avenir','Helvetica'; padding:0px; margin:0px;">

    <${appTag} id="app" class="${appClass}" style="${appStyle}">

        ${appTmp}

    </${appTag}>

    <script>

        //install
        ${installVue}

        //initialize
        new Vue({
            el: '#app',
            ${newVue}
            data: ${data},
            mounted: ${mounted},
            computed: ${computed},
            methods: ${methods},
        })

    </script>

</body>
</html>
    `

    //procHtml
    if (_.isFunction(procHtml)) {
        h = procHtml(h)
    }

    //prettyhtml
    h = prettyhtml(h, {
        tabWidth: 4,
    })
    h = h.contents //取contents
    //console.log('prettyhtml', h)

    //write html
    if (w.isestr(fpHtml)) {
        try {
            fs.writeFileSync(fpHtml, h, 'utf8')
        }
        catch (err) {
            console.log(err)
        }
    }

    //write action
    if (w.isestr(fpAction)) {
        try {
            fs.writeFileSync(fpAction, action, 'utf8')
        }
        catch (err) {
            console.log(err)
        }
    }

}


export default extractHtml
