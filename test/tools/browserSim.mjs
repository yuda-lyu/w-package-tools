import vm from 'vm'


/**
 * 以vm模擬瀏覽器之最小執行環境, 供於Node驗證runin為browser之產物(outer於頁面context執行, inner於worker context執行)
 *
 * 模擬內容:
 *   · 頁面: window(即全域)、document、Blob、URL、Worker、atob/btoa、TextDecoder/TextEncoder、計時器。
 *   · URL.createObjectURL/revokeObjectURL: 記錄建立與撤銷(含撤銷者為頁面或worker); 撤銷後之URL無法再載入(同WebKit, 可抓出載入前即撤銷之錯誤)。
 *   · Worker: 建構後非同步載入, 以獨立vm context執行blob內容, worker全域即self(含postMessage、location.href、URL、計時器);
 *     雙向postMessage以structuredClone複製(無法複製時同步拋DataCloneError, 同瀏覽器)並以計時器非同步遞送, 載入前送達者排隊;
 *     worker內計時器或訊息處理之未捕捉例外轉為Worker之error事件, worker不因此結束(瀏覽器語意); terminate後雙向訊息皆不再遞送。
 * 非真瀏覽器: 驗訊息協定與資源釋放(revoke、terminate)之呼叫與時序; worker內未處理rejection於此會成為Node宿主之unhandledRejection(瀏覽器則僅於worker內發unhandledrejection)。
 *
 * @param {Object} [opt={}] 輸入設定物件, 預設{}
 * @param {Boolean} [opt.failLoad=false] 輸入是否模擬worker腳本載入失敗(網路、CSP等), 為true時不執行worker程式碼而發出error事件, 預設false
 * @param {String} [opt.failCtor=''] 輸入非空時模擬new Worker同步拋錯, 值為錯誤訊息, 預設''
 * @returns {Object} 回傳{load, urls, workers}: load(code, name)於頁面context執行產物並回傳全域name之值; urls為{created, revoked}, revoked元素為{url, by}(by為'page'或'worker'); workers為已建Worker實體陣列(各有nTerminate與fireError(msg))
 */
function createBrowserSim(opt = {}) {
    let failLoad = opt.failLoad === true
    let failCtor = opt.failCtor || ''

    let blobs = new Map() //url → 內容
    let urls = { created: [], revoked: [] }
    let workers = []
    let nUrl = 0

    class Blob {
        constructor(parts) {
            this.text = parts.join('')
        }
    }

    let genURL = (by) => {
        return {
            createObjectURL: (blob) => {
                nUrl += 1
                let url = `blob:sim/${nUrl}`
                blobs.set(url, blob.text)
                urls.created.push(url)
                return url
            },
            revokeObjectURL: (url) => {
                //撤銷不存在或已撤銷之URL為no-op(同瀏覽器)
                if (blobs.has(url)) {
                    blobs.delete(url)
                    urls.revoked.push({ url, by })
                }
            },
        }
    }

    class Worker {

        constructor(url) {
            if (failCtor) {
                throw new Error(failCtor)
            }
            this.url = url
            this.onmessage = null
            this.onerror = null
            this.onmessageerror = null
            this.nTerminate = 0
            this.terminated = false
            this.loaded = false
            this.queue = []
            this.g = null
            workers.push(this)
            setTimeout(() => {
                this.load()
            }, 0)
        }

        load() {
            if (this.terminated) {
                return //載入前已中止
            }
            let code = blobs.get(this.url)
            if (failLoad || code === undefined) {
                this.dispatchError(new Error('sim: worker script load failed')) //載入失敗(含blob URL於載入前已撤銷)
                return
            }
            let g = {}
            g.self = g
            g.location = { href: this.url }
            g.URL = genURL('worker')
            g.console = console
            g.setTimeout = (fn, ms, ...args) => {
                return setTimeout(() => {
                    if (this.terminated) {
                        return
                    }
                    try {
                        fn(...args)
                    }
                    catch (err) {
                        this.dispatchError(err) //worker內未捕捉例外 → Worker之error事件
                    }
                }, ms)
            }
            g.clearTimeout = clearTimeout
            g.postMessage = (data) => {
                if (this.terminated) {
                    return
                }
                let d = structuredClone(data) //無法複製時同步拋DataCloneError
                setTimeout(() => {
                    if (!this.terminated && typeof this.onmessage === 'function') {
                        this.onmessage({ data: d })
                    }
                }, 0)
            }
            this.g = g
            vm.createContext(g)
            try {
                vm.runInContext(code, g)
            }
            catch (err) {
                this.dispatchError(err) //載入期錯誤
                return
            }
            this.loaded = true
            let q = this.queue
            this.queue = []
            for (let d of q) {
                this.deliver(d)
            }
        }

        deliver(d) {
            setTimeout(() => {
                if (this.terminated || typeof this.g.onmessage !== 'function') {
                    return
                }
                try {
                    this.g.onmessage({ data: d })
                }
                catch (err) {
                    this.dispatchError(err)
                }
            }, 0)
        }

        postMessage(data) {
            if (this.terminated) {
                return
            }
            let d = structuredClone(data) //無法複製時同步拋DataCloneError
            if (!this.loaded) {
                this.queue.push(d) //載入前送達者排隊
                return
            }
            this.deliver(d)
        }

        terminate() {
            this.nTerminate += 1
            this.terminated = true
        }

        dispatchError(err) {
            if (this.terminated || typeof this.onerror !== 'function') {
                return
            }
            this.onerror({ type: 'error', message: String((err && err.message) || err), error: err })
        }

        fireError(msg) {
            //供測試模擬worker內執行期之未捕捉錯誤
            this.dispatchError(new Error(msg))
        }

    }

    let page = {}
    page.window = page
    page.self = page
    page.document = {}
    page.Blob = Blob
    page.URL = genURL('page')
    page.Worker = Worker
    page.console = console
    page.setTimeout = setTimeout
    page.clearTimeout = clearTimeout
    page.atob = atob
    page.btoa = btoa
    page.TextDecoder = TextDecoder
    page.TextEncoder = TextEncoder
    vm.createContext(page)

    let load = (code, name) => {
        vm.runInContext(code, page)
        return page[name]
    }

    return { load, urls, workers }
}


export default createBrowserSim
