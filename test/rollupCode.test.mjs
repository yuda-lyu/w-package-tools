import fs from 'fs'
import assert from 'assert'
import * as acorn from 'acorn'
import rollupCode from '../src/rollupCode.mjs'


//walk: 深度優先走訪ESTree節點
let walk = (node, fn) => {
    if (!node || typeof node.type !== 'string') {
        return
    }
    fn(node)
    for (let k of Object.keys(node)) {
        let v = node[k]
        if (Array.isArray(v)) {
            v.forEach((c) => walk(c, fn))
        }
        else if (v && typeof v.type === 'string') {
            walk(v, fn)
        }
    }
}

//fakeDocument: 只供vue樣式注入(createElement、createTextNode、head.appendChild)之假document, head.children記錄被注入之元素
let fakeDocument = () => {
    let head = {
        children: [],
        appendChild(e) {
            this.children.push(e)
        },
    }
    let document = {
        head,
        createElement: (tag) => ({
            tag,
            attrs: {},
            childNodes: [],
            setAttribute(k, v) {
                this.attrs[k] = v
            },
            appendChild(n) {
                this.childNodes.push(n)
            },
        }),
        createTextNode: (text) => ({ text }),
    }
    return { document, head }
}

//loadUmdCjs: 以CommonJS分支載入umd產物(提供module、exports與假document), 回傳{ c: module.exports, head }
let loadUmdCjs = (code) => {
    let { document, head } = fakeDocument()
    let module = { exports: {} }
    new Function('module', 'exports', 'document', code)(module, module.exports, document) // eslint-disable-line no-new-func
    return { c: module.exports, head }
}

//loadUmdGlobal: 無module、exports、define時, umd產物掛於全域之name; 取出後自全域移除
let loadUmdGlobal = (code, name) => {
    let { document } = fakeDocument()
    new Function('module', 'exports', 'define', 'document', code)(undefined, undefined, undefined, document) // eslint-disable-line no-new-func
    let g = globalThis[name]
    delete globalThis[name]
    return g
}


describe('rollupCode', function() {
    let fdSrc = './test-code-in'
    let fdTarCp = './test-code-out-cp'

    if (true) {
        let name = 'gBase1'
        let fnIn = `${name}.js`
        let fnOut = `${name}.umd.js`
        it(`should be ok when run ${name}'`, async function() {
            let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), {
                name
            })
            let cCp = fs.readFileSync(`${fdTarCp}/${fnOut}`, 'utf8')
            assert.strict.deepStrictEqual(cNow, cCp)
        })
    }

    if (true) {
        let name = 'gBase2'
        let fnIn = `${name}.js`
        let fnOut = `${name}.umd.js`
        it(`should be ok when run ${name}'`, async function() {
            let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), {
                name
            })
            let cCp = fs.readFileSync(`${fdTarCp}/${fnOut}`, 'utf8')
            assert.strict.deepStrictEqual(cNow, cCp)
        })
    }

    if (true) {
        //gVue1: 語意斷言(原以產物長度比對預期檔, 屬現狀指紋; rollup 4依呼叫端常數剪除normalizeComponent之SSR、shadow、functional分支而長度改變, 行為不變)
        let name = 'gVue1'
        let fnIn = `${name}.vue`
        it(`should be ok when run ${name}' (vue2 component options, render, scoped style injection)`, async function() {
            let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), {
                name,
                formatIn: 'vue'
            })

            //規格(rollupCode之bMinify預設true): 壓縮(terser預設輸出為單行, 以此為壓縮之可觀察表現)
            assert.strict.deepStrictEqual(cNow.trim().split('\n').length, 1)

            //規格(rollupCode之formatOut預設umd): CommonJS環境以module.exports取得元件; 樣式注入所需之document以假物件提供
            let { c, head } = loadUmdCjs(cNow)

            //規格(.vue之script預設匯出之元件選項原樣保留): props之型別與預設值、data、methods與mounted之行為(呼叫後之console輸出, 與gVue1.vue之原始碼相同)
            let sorted = (o) => Object.keys(o).sort()
            assert.strict.deepStrictEqual(sorted(c.props), ['filterall', 'height', 'opt', 'pathItems'])
            assert.strict.deepStrictEqual([c.props.pathItems.type, c.props.opt.type, c.props.height.type, c.props.filterall.type], [Array, Object, Number, String])
            assert.strict.deepStrictEqual(c.props.pathItems.default(), ['src:tf1'])
            assert.strict.deepStrictEqual(c.props.opt.default(), undefined)
            assert.strict.deepStrictEqual(c.props.height.default, 300)
            assert.strict.deepStrictEqual(c.props.filterall.default, '')
            assert.strict.deepStrictEqual(c.data(), { name: 'name' })
            assert.strict.deepStrictEqual(sorted(c.methods), ['testArrFun', 'testAsyncFun1', 'testAsyncFun2', 'testAsyncFun3'])
            let logs = []
            let oriLog = console.log
            console.log = (...args) => logs.push(args.join(' '))
            try {
                c.mounted()
                c.methods.testArrFun()
                await c.methods.testAsyncFun1()
                c.methods.testAsyncFun2()
            }
            finally {
                console.log = oriLog
            }
            assert.strict.deepStrictEqual(logs, ['mounted', 'testArrFun', 'testAsyncFun1', ' testAsyncFun1 a testAsyncFun1 xyz b ', 'testAsyncFun2', ' testAsyncFun2 a testAsyncFun2 xyz b '])

            //規格(rollup-plugin-vue 5.1.9轉譯vue2, src/rollupFile.mjs之vue外掛): template編譯為vue2之render函數, 以假vm呼叫得與template相同之節點樹(click綁定methods.testArrFun、:a綁定abc-${name}、文字插值name)
            assert.strict.deepStrictEqual(c._compiled, true)
            assert.strict.deepStrictEqual(c.staticRenderFns, [])
            let h = (tag, a, b) => (Array.isArray(a) ? { tag, data: undefined, children: a } : { tag, data: a, children: b })
            let vmFake = { $createElement: h, _self: { _c: h }, _v: (t) => ({ text: t }), _s: (v) => String(v), name: 'name', testArrFun: c.methods.testArrFun }
            assert.strict.deepStrictEqual(c.render.call(vmFake), {
                tag: 'div',
                data: undefined,
                children: [
                    { tag: 'div', data: { on: { click: c.methods.testArrFun } }, children: [{ text: 'tf1' }] },
                    { text: ' ' },
                    { tag: 'div', data: { attrs: { a: 'abc-name' } }, children: [{ text: 'name' }] },
                ],
            })

            //規格(<style scoped>): 元件帶scopeId(data-v-雜湊), 其樣式以同一雜湊之id注入; 樣式於元件建立前(beforeCreate)注入head一個style元素並寫入樣式文字; 非SSR建置(無_ssrRegister)、非functional
            //  (_scopeId、beforeCreate、functional、_ssrRegister為rollup-plugin-vue 5之產物交給vue 2執行期之元件選項; 驗不到真vue之掛載、更新、scoped屬性之套用與CSS解析, 見規則帳本三之rollupCode列)
            assert.strict.ok(/^data-v-[0-9a-f]{8}$/.test(c._scopeId), c._scopeId)
            assert.strict.ok(cNow.includes(`"${c._scopeId}_0"`), 'style id derives from scopeId')
            assert.strict.deepStrictEqual(c._ssrRegister, undefined)
            assert.strict.deepStrictEqual(c.functional, undefined)
            assert.strict.deepStrictEqual(c.beforeCreate.length, 1)
            assert.strict.deepStrictEqual(head.children.length, 0) //載入時不注入
            c.beforeCreate[0].call({})
            assert.strict.deepStrictEqual(head.children.map((e) => [e.tag, e.type, e.childNodes.length]), [['style', 'text/css', 1]])

            //規格(rollupCode之opt.name): 無CommonJS與AMD時掛於全域之name
            let g = loadUmdGlobal(cNow, name)
            assert.strict.deepStrictEqual(sorted(g.props), sorted(c.props))
            assert.strict.deepStrictEqual(g.data(), { name: 'name' })
        })
    }

    if (true) {
        let name = 'gAsync1'
        let fnIn = `${name}.mjs`
        let fnOut = `${name}.es.js`
        it(`should be ok when run ${name}'`, async function() {
            let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), {
                name,
                formatOut: 'es',
                targets: 'new',
            })
            let cCp = fs.readFileSync(`${fdTarCp}/${fnOut}`, 'utf8')
            assert.strict.deepStrictEqual(cNow, cCp)
        })
    }

    if (true) {
        //gAsync2: 語意斷言(原以逐字比對預期檔, 屬現狀指紋; rollup 4內聯常數別名、折疊常數並依呼叫端常數剪除lodash-es內之分支而逐字不同, 行為不變)
        let name = 'gAsync2'
        let fnIn = `${name}.mjs`
        it(`should be ok when run ${name}' (es module, bundled dependency, async kept by targets new)`, async function() {
            let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), {
                name,
                formatOut: 'es',
                targets: 'new',
            })

            //規格(rollupCode之bMinify預設true): 壓縮(terser預設輸出為單行, 以此為壓縮之可觀察表現)
            assert.strict.deepStrictEqual(cNow.trim().split('\n').length, 1)

            let ast = acorn.parse(cNow, { ecmaVersion: 'latest', sourceType: 'module' })
            let types = new Set()
            walk(ast, (n) => {
                types.add(n.type)
            })

            //規格(rollupCode之external預設[], 未列入者打包進產物): 引用之lodash-es/trim.js被打包, 產物無任何import
            assert.strict.deepStrictEqual(types.has('ImportDeclaration') || types.has('ImportExpression'), false)

            //規格(rollupCode之formatOut為'es'): 產物為ES模組且有預設匯出
            let exportNames = ast.body.filter((n) => n.type === 'ExportNamedDeclaration').flatMap((n) => n.specifiers.map((s) => s.exported.name))
            assert.strict.ok(exportNames.includes('default') || types.has('ExportDefaultDeclaration'), JSON.stringify(exportNames))

            //端到端: 載入產物並呼叫預設匯出, 得原始碼之回傳值(含被打包之trim之結果)
            let m = await import(`data:text/javascript;base64,${Buffer.from(cNow).toString('base64')}`)

            //規格(rollupCode之targets為'new'即依值, 規則帳本R15): 不降轉async函數——預設匯出本身仍為async函數, 產物無regenerator
            assert.strict.deepStrictEqual(Object.prototype.toString.call(m.default), '[object AsyncFunction]')
            assert.strict.deepStrictEqual(cNow.includes('regenerator'), false)

            let logs = []
            let oriLog = console.log
            console.log = (...args) => logs.push(args)
            let r
            try {
                r = await m.default()
            }
            finally {
                console.log = oriLog
            }
            assert.strict.deepStrictEqual(r, { name: 'gAsync2', data: { a: 1, b: 2.2, c: '*', d: 'trim me' }, fr: { m: 1, n: 2.2 } })
            assert.strict.deepStrictEqual(logs.map((a) => a[0]), ['gAsync2 data=', 'gAsync2 f()='])
        })
    }

})
