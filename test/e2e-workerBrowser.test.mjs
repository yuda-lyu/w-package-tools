import path from 'path'
import fs from 'fs'
import assert from 'assert'
import { chromium } from 'playwright'
import rollupWorker from '../src/rollupWorker.mjs'
import writeWorkerFx from './tools/workerFx.mjs'


//真瀏覽器冒煙(Chromium, 規則帳本R7、R11、R13之瀏覽器格; e2e映射見帳本六):
//受測對象為無UI之函式庫產物(瀏覽器worker), 使用者路徑為「頁面程式於使用者操作時呼叫產物」: 每案以測試頁之按鈕觸發呼叫(真滑鼠點擊), 頁面把結果寫入畫面, 斷言畫面文字;
//vm模擬(test/tools/browserSim.mjs)無法代表真瀏覽器之全域物件語意(self、postMessage等之屬性)與polyfill偵測(run01審計: vm誤報而Chromium正常), 故瀏覽器格須於此實跑;
//頁面與產物以page.route供檔, 不開埠; 每案一個新瀏覽器


let fdTmp = path.resolve('./test/_tmp/e2eWorkerBrowser')
let fx = null
let host = 'http://wpt.test'

let msgOf = (e) => String((e && e.message) || e)

//cases: 每案一個產物, call為頁面內之呼叫本體(f為產物匯出, settle判懸置), want為規格之觀察值
let cases = [
    { id: 'S01', fx: 'fxLet', want: 'resolve:mine:p' },
    { id: 'S04', fx: 'fxFun', want: 'resolve:user-run:p' },
    { id: 'S06', fx: 'fxVarRun', want: 'resolve:user-var-run:p' },
    { id: 'S13', fx: 'fxPostMsg', want: 'resolve:user-pm:p' },
    { id: 'S14', fx: 'fxSelfVar', want: 'resolve:user-self:p' },
    { id: 'S15', fx: 'fxFreeRef', want: 'resolve:undefined:p' },
    { id: 'S17', fx: 'fxStrict', want: 'resolve:strict:p' },
    { id: 'S24', fx: 'fxNamed', want: 'resolve:named:p' },
    { id: 'S19', fx: 'fxThisMethod', type: 'object', funNames: ['getVal'], call: `return await settle(f.getVal())`, want: 'resolve:3' },
    {
        id: 'S20',
        fx: 'fxClassInst',
        execFunctionByInstance: false,
        funNames: ['inc'],
        call: `let o = f()
let r1 = await settle(o.inc())
let r2 = await settle(o.inc())
o.terminate()
return [r1, r2]`,
        want: ['resolve:1', 'resolve:2'],
    },
    { id: 'S41', fx: 'fxPlain', name: 'self', want: 'resolve:plain:p' },
    {
        id: 'S43',
        fx: 'fxObjNames',
        type: 'object',
        funNames: ['other', 'init', 'recvMessage', 'genPm', 'my-fn'],
        call: `let rs = []
for (let k of ['other', 'init', 'recvMessage', 'genPm', 'my-fn']) {
    rs.push(await settle(f[k]('p')))
}
return rs`,
        want: ['resolve:other:p', 'resolve:init:p', 'resolve:recvMessage:p', 'resolve:genPm:p', 'resolve:my-fn:p'],
    },
    {
        id: 'S49',
        fx: 'fxFacEvQuote',
        execFunctionByInstance: false,
        funNames: ['go'],
        evNames: ['a\'b'],
        call: `let o = f()
let got = new Promise((resolve) => o.on("a'b", resolve))
let r = await settle(o.go('p'))
let e = await settle(got)
o.terminate()
return [r, e]`,
        want: ['resolve:go:p', 'resolve:ev:p'],
    },
    { id: 'iife', fx: 'fxPlain', name: 'fxPlainIife', formatOut: 'iife', want: 'resolve:plain:p' },
    { id: 'es', fx: 'fxPlain', name: 'fxPlainEs', formatOut: 'es', want: 'resolve:plain:p' },
]

//genHtml: 測試頁, 載入產物並於按下「執行」時呼叫, 結果以JSON寫入#out並標data-done
function genHtml(cs, name) {
    let call = cs.call || `return await settle(f('p'))`
    let fmt = `let fmtv = (v) => (typeof v === 'string' ? v : JSON.stringify(v))
let settle = (pm, ms = 6000) => new Promise((resolve) => {
    let t = setTimeout(() => resolve('hang'), ms)
    Promise.resolve(pm).then((v) => {
        clearTimeout(t)
        resolve('resolve:' + fmtv(v))
    }, (e) => {
        clearTimeout(t)
        resolve('reject:' + String((e && e.message) || e))
    })
})`
    let bind = `document.getElementById('run').addEventListener('click', async () => {
    let out = document.getElementById('out')
    let r = await (async () => { ${call} })()
    out.textContent = JSON.stringify(r)
    out.dataset.done = '1'
})`
    let body = cs.formatOut === 'es'
        ? `<script type="module">
import f from '/p.mjs'
${fmt}
${bind}
</script>`
        : `<script src="/p.js"></script>
<script>
let f = window[${JSON.stringify(name)}]
${fmt}
${bind}
</script>`
    return `<!doctype html><html><head><meta charset="utf-8"><title>worker</title></head><body>
<button id="run" type="button">執行</button>
<pre id="out"></pre>
${body}
</body></html>`
}


describe('瀏覽器worker產物於真瀏覽器(Chromium)之作用域、匯出與呼叫(規則帳本R7、R11、R13)', function() {
    let products = {}
    let browser = null

    before(async function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fx = writeWorkerFx(path.resolve(fdTmp, 'fx'))
        let fdOut = path.resolve(fdTmp, 'out')
        fs.mkdirSync(fdOut, { recursive: true })
        let oriLog = console.log
        let oriWarn = console.warn
        console.log = () => {}
        console.warn = () => {}
        try {
            for (let cs of cases) {
                let name = cs.name || cs.fx
                let fpTar = path.resolve(fdOut, `${cs.id}.wk.${cs.formatOut === 'es' ? 'mjs' : 'js'}`)
                //各案之建置失敗記於該案, 由該案之it回報(不使整批於before失敗)
                let err = await rollupWorker({
                    name,
                    type: cs.type || 'function',
                    execFunctionByInstance: cs.execFunctionByInstance,
                    funNames: cs.funNames,
                    evNames: cs.evNames,
                    fpSrc: fx(cs.fx),
                    fpTar,
                    formatOut: cs.formatOut || 'umd',
                    runin: 'browser',
                    bMinify: false,
                    bLog: false,
                }).then(() => null, (e) => msgOf(e))
                products[cs.id] = { fpTar, name, err }
            }
        }
        finally {
            console.log = oriLog
            console.warn = oriWarn
        }
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    beforeEach(async function() {
        browser = await chromium.launch({ headless: true })
    })

    afterEach(async function() {
        if (browser) {
            await browser.close()
            browser = null
        }
    })

    for (let cs of cases) {
        it(`${cs.id}(${cs.fx}${cs.formatOut ? ', ' + cs.formatOut : ''}): 按下執行後畫面顯示正確之呼叫結果, 頁面無未捕捉錯誤`, async function() {
            let { fpTar, name, err } = products[cs.id]
            assert.strict.deepStrictEqual(err, null, `${cs.id} 建置失敗: ${err}`)
            let html = genHtml(cs, name)
            let code = fs.readFileSync(fpTar, 'utf8')
            let page = await browser.newPage()
            let errs = []
            page.on('pageerror', (e) => errs.push(msgOf(e)))
            await page.route(`${host}/**`, async (route) => {
                let u = new URL(route.request().url())
                if (u.pathname === '/index.html') {
                    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
                }
                if (u.pathname === '/p.js' || u.pathname === '/p.mjs') {
                    return route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: code })
                }
                return route.fulfill({ status: 404, body: 'not found' })
            })
            await page.goto(`${host}/index.html`)

            //act: 使用者按下「執行」(真滑鼠點擊), 頁面程式呼叫worker產物
            await page.getByRole('button', { name: '執行' }).click()

            //assert: 結果寫入畫面後讀取畫面文字(呼叫懸置時頁面內6秒判hang, 亦寫入畫面)
            let out = page.locator('#out[data-done="1"]')
            await out.waitFor({ state: 'attached', timeout: 20000 })
            let got = JSON.parse(await out.textContent())
            assert.strict.deepStrictEqual(got, cs.want, `${cs.id}`)
            assert.strict.deepStrictEqual(errs, [], `${cs.id} 頁面錯誤: ${errs.join(' | ')}`)
        })
    }

})
