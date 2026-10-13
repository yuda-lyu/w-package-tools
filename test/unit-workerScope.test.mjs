import path from 'path'
import fs from 'fs'
import vm from 'vm'
import assert from 'assert'
import rollupWorker from '../src/rollupWorker.mjs'
import childRun from './tools/childRun.mjs'
import createBrowserSim from './tools/browserSim.mjs'
import writeWorkerFx from './tools/workerFx.mjs'


//規格(規則帳本R7、R11、R12、R13): 使用者程式碼以CommonJS模組包裝執行, 與inner雙向隔離(互不可見、不受bMinify/keepFnames/eval/opt.name影響);
//預設匯出取module.exports; worker內為嚴格模式; nodejs之module為Node之CommonJS模組物件; 方法以所屬物件為this(function每次呼叫新建為undefined);
//建置期檢查(預設匯出、evNames與實體模式、funNames保留名)不通過即reject且不產出; 使用者可控之名稱不成為膠水碼之識別子


let fdTmp = path.resolve('./test/_tmp/workerScope')
let fx = null
let nb = 0

let msgOf = (e) => String((e && e.message) || e)

//build: 以rollupWorker產製fixture(暫止console輸出), 成功回傳{fpTar}, 失敗回傳{err, exists}
async function build(name, cfg) {
    nb++
    let ext = cfg.formatOut === 'es' ? 'mjs' : 'umd.js'
    let fpTar = path.resolve(fdTmp, 'out', `${cfg.fx.replace(/\.\w+$/, '')}-${nb}.wk.${ext}`)
    fs.mkdirSync(path.dirname(fpTar), { recursive: true })
    let oriLog = console.log
    let oriWarn = console.warn
    console.log = () => {}
    console.warn = () => {}
    try {
        await rollupWorker({
            name,
            type: cfg.type || 'function',
            execFunctionByInstance: cfg.execFunctionByInstance,
            execObjectFunsByInstance: cfg.execObjectFunsByInstance,
            funNames: cfg.funNames,
            evNames: cfg.evNames,
            fpSrc: fx(cfg.fx),
            fpTar,
            formatOut: cfg.formatOut || 'umd',
            runin: cfg.runin,
            bMinify: cfg.bMinify === true,
            keepFnames: cfg.keepFnames === true,
            bLog: false,
        })
        return { fpTar }
    }
    catch (err) {
        return { err: msgOf(err), exists: fs.existsSync(fpTar) }
    }
    finally {
        console.log = oriLog
        console.warn = oriWarn
    }
}

//settle之程式文字: 逾時判懸置; 結果後清除計時器, 使子程序於無遺留worker時可自行結束
let cSettle = `
let fmt = (v) => (typeof v === 'string' ? v : JSON.stringify(v))
let settle = (pm, ms = 4000) => new Promise((resolve) => {
    let t = setTimeout(() => resolve('hang'), ms)
    Promise.resolve(pm).then((v) => {
        clearTimeout(t)
        resolve('resolve:' + fmt(v))
    }, (e) => {
        clearTimeout(t)
        resolve('reject:' + String((e && e.message) || e))
    })
})
`

//callNode: 於乾淨子程序import產物並執行呼叫本體(body內以f為產物匯出), 回傳{out, timedOut, status, stderr}; 子程序不主動exit, 以能否自行結束判worker遺留
function callNode(fpTar, body, opt = {}) {
    let r = childRun(`
let { pathToFileURL } = require('url')
${cSettle}
let f = (await import(pathToFileURL(process.argv[1]).href)).default
let out = await (async () => { ${body} })()
console.log('OUT=' + JSON.stringify(out))
`, [fpTar], { timeout: opt.timeout || 15000, execArgv: opt.execArgv })
    let m = r.stdout.match(/OUT=(.*)/)
    return { out: m ? JSON.parse(m[1]) : null, timedOut: r.timedOut, status: r.status, stderr: r.stderr }
}

//callBrowser: 以vm模擬瀏覽器載入產物並執行呼叫本體
async function callBrowser(fpTar, gName, body) {
    let sim = createBrowserSim()
    let f = sim.load(fs.readFileSync(fpTar, 'utf8'), gName)
    let fn = vm.compileFunction(`return (async () => { ${cSettle} ${body} })()`, ['f', 'setTimeout', 'clearTimeout'])
    return fn(f, setTimeout, clearTimeout)
}

let bodyFn = `return await settle(f('p'))`

//expectFn: 產製並於nodejs與browser(vm)呼叫function每次呼叫新建之產物, 斷言回傳值
async function expectFn(fxName, cfgs, want, name) {
    for (let cfg of cfgs) {
        for (let runin of cfg.runins || ['nodejs', 'browser']) {
            let tag = `${fxName} runin=${runin} bMinify=${cfg.bMinify === true}${cfg.keepFnames ? ' keepFnames' : ''}`
            let b = await build(name || fxName, { ...cfg, fx: fxName, runin })
            assert.strict.ok(!b.err, `${tag} 建置失敗: ${b.err}`)
            let out = runin === 'nodejs' ? callNode(b.fpTar, bodyFn).out : await callBrowser(b.fpTar, name || fxName, bodyFn)
            assert.strict.deepStrictEqual(out, want, tag)
        }
    }
}


describe('worker之使用者程式碼與inner雙向隔離(規則帳本R7)', function() {

    before(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fx = writeWorkerFx(path.resolve(fdTmp, 'fx'))
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    let unmin = [{ bMinify: false }]

    it('S01 使用者頂層let與inner同名(instance): 載入不拋錯且得正確值', async function() {
        await expectFn('fxLet', unmin, 'resolve:mine:p')
    })

    it('S02 使用者頂層var與inner之let同名: 得正確值', async function() {
        await expectFn('fxVarInst', unmin, 'resolve:mine-var:p')
    })

    it('S03 使用者頂層const與inner之function同名(sendMessage): 得正確值', async function() {
        await expectFn('fxConstSend', unmin, 'resolve:user-send:p')
    })

    it('S04 使用者頂層function與inner同名(run): 不被inner覆蓋', async function() {
        await expectFn('fxFun', unmin, 'resolve:user-run:p')
    })

    it('S05 使用者頂層function與inner同名(run)且被當值取用: 取到使用者函數', async function() {
        await expectFn('fxFunKf', unmin, 'resolve:user-run:p|user-run:p')
    })

    it('S06 使用者頂層var賦值與inner之function同名(run): 不懸置且得正確值', async function() {
        await expectFn('fxVarRun', unmin, 'resolve:user-var-run:p')
    })

    it('S07 nodejs: 使用者頂層let parentPort: 得正確值', async function() {
        await expectFn('fxParentPort', [{ bMinify: false, runins: ['nodejs'] }], 'resolve:pp:p')
    })

    it('S08 S01~S06之使用者程式碼於bMinify true(未保留名稱): 皆得正確值', async function() {
        let min = [{ bMinify: true }]
        await expectFn('fxLet', min, 'resolve:mine:p')
        await expectFn('fxVarInst', min, 'resolve:mine-var:p')
        await expectFn('fxConstSend', min, 'resolve:user-send:p')
        await expectFn('fxFun', min, 'resolve:user-run:p')
        await expectFn('fxFunKf', min, 'resolve:user-run:p|user-run:p')
        await expectFn('fxVarRun', min, 'resolve:user-var-run:p')
    })

    it('S09、S10 bMinify true時保留頂層名稱(keepFnames、直接eval)亦不撞名', async function() {
        await expectFn('fxFunKf', [{ bMinify: true, keepFnames: true }], 'resolve:user-run:p|user-run:p')
        await expectFn('fxEvalFun', [{ bMinify: true }], 'resolve:user-run:p')
    })

    it('S11、S12 opt.name與inner名稱相同(run): bMinify false與true皆得正確值', async function() {
        await expectFn('fxNameRun', [{ bMinify: false }, { bMinify: true }], 'resolve:name-run:p', 'run')
    })

    it('S13、S14 browser: 使用者頂層function postMessage、var self不遮蔽worker全域', async function() {
        await expectFn('fxPostMsg', [{ bMinify: false, runins: ['browser'] }], 'resolve:user-pm:p')
        await expectFn('fxSelfVar', [{ bMinify: false, runins: ['browser'] }], 'resolve:user-self:p')
    })

    it('S15 使用者程式碼之自由參照看不到inner名稱(typeof init為undefined)', async function() {
        await expectFn('fxFreeRef', [{ bMinify: false }, { bMinify: true }], 'resolve:undefined:p')
    })

    it('S16 使用者程式碼對inner名稱之自由賦值不污染持久實體: 該呼叫以ReferenceError拒絕, 之後呼叫照常', async function() {
        for (let runin of ['nodejs', 'browser']) {
            let b = await build('fxFreeAssign', { fx: 'fxFreeAssign', type: 'object', execObjectFunsByInstance: false, funNames: ['a', 'b'], runin })
            assert.strict.ok(!b.err, b.err)
            let body = `let ra = await settle(f.a('p'))
let rb = await settle(f.b('p'))
f.terminate()
return [ra, rb]`
            let out = runin === 'nodejs' ? callNode(b.fpTar, body).out : await callBrowser(b.fpTar, 'fxFreeAssign', body)
            assert.strict.ok(/^reject:.*instance is not defined/.test(out[0]), `${runin}: ${out[0]}`)
            assert.strict.deepStrictEqual(out[1], 'resolve:b:p', runin)
        }
    })

})


describe('worker之預設匯出取用與建置期檢查(規則帳本R7、R12)', function() {

    before(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fx = writeWorkerFx(path.resolve(fdTmp, 'fx'))
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    it('S24 預設匯出之外另有具名匯出: 可產製且取預設匯出', async function() {
        await expectFn('fxNamed', [{ bMinify: false }, { bMinify: true }], 'resolve:named:p')
    })

    it('S25 type object只有具名匯出: 以命名空間為物件呼叫', async function() {
        for (let runin of ['nodejs', 'browser']) {
            let b = await build('fxOnlyNamedObj', { fx: 'fxOnlyNamedObj', type: 'object', funNames: ['a'], runin })
            assert.strict.ok(!b.err, b.err)
            let body = `return await settle(f.a('p'))`
            let out = runin === 'nodejs' ? callNode(b.fpTar, body).out : await callBrowser(b.fpTar, 'fxOnlyNamedObj', body)
            assert.strict.deepStrictEqual(out, 'resolve:a:p', runin)
        }
    })

    it('S26、S27 type function缺預設匯出(只有具名、無匯出): 建置期reject並指明缺預設匯出, 不產出', async function() {
        for (let fxName of ['fxOnlyNamed', 'fxNoExport']) {
            let b = await build(fxName, { fx: fxName, runin: 'nodejs' })
            assert.strict.ok(b.err, `${fxName} 應於建置期reject`)
            assert.strict.ok(b.err.includes('default export'), `${fxName}: ${b.err}`)
            assert.strict.deepStrictEqual(b.exists, false, `${fxName} 不得產出`)
        }
    })

    it('type object無任何匯出: 建置期reject並指明無匯出, 不產出', async function() {
        let b = await build('fxNoExport', { fx: 'fxNoExport', type: 'object', funNames: ['a'], runin: 'nodejs' })
        assert.strict.ok(b.err && b.err.includes('has no export'), `應於建置期reject: ${b.err}`)
        assert.strict.deepStrictEqual(b.exists, false)
    })

    it('S28 CommonJS原始碼(module.exports = 具名函數): bMinify false可用', async function() {
        await expectFn('fxCjsSrc.js', [{ bMinify: false }], 'resolve:cjs:p', 'fxCjsSrc')
    })

    it('S29 字串常值含module.exports=且opt.name與原始碼不同名: 字串不被改寫', async function() {
        await expectFn('fxStrLit', [{ bMinify: false }, { bMinify: true }], 'resolve:module.exports=1:p', 'fxStrLitX')
    })

    it('S31 匿名預設匯出: 可用', async function() {
        await expectFn('fxAnonDefault', [{ bMinify: false }], 'resolve:anon:p', 'fxAnonX')
    })

})


describe('worker內之執行環境(規則帳本R7、R13)', function() {

    before(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fx = writeWorkerFx(path.resolve(fdTmp, 'fx'))
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    it('S17 worker內使用者程式碼為嚴格模式(同rollup一般輸出)', async function() {
        await expectFn('fxStrict', [{ bMinify: false }, { bMinify: true }], 'resolve:strict:p')
    })

    it('S18 相依CommonJS之隱式全域於嚴格模式下以ReferenceError拒絕(與主執行緒產物同語意)', async function() {
        for (let runin of ['nodejs', 'browser']) {
            let b = await build('fxLeakDep', { fx: 'fxLeakDep', runin })
            assert.strict.ok(!b.err, b.err)
            let out = runin === 'nodejs' ? callNode(b.fpTar, bodyFn).out : await callBrowser(b.fpTar, 'fxLeakDep', bodyFn)
            assert.strict.ok(/^reject:.*leakedCounter is not defined/.test(out), `${runin}: ${out}`)
        }
    })

    it('S21 使用者程式碼於CommonJS模組包裝內: module與exports皆為物件(browser亦同)', async function() {
        await expectFn('fxModTypes', [{ bMinify: false }], 'resolve:object,object:p')
    })

    it('S22 nodejs: 使用者程式碼之module為Node之CommonJS模組物件(含require)', async function() {
        await expectFn('fxModReq', [{ bMinify: false, runins: ['nodejs'] }], 'resolve:function:p')
    })

    it('S23 nodejs、宿主帶--pending-deprecation: 內嵌lodash不走process.binding(stderr無DEP0111)', async function() {
        let b = await build('fxLodashTA', { fx: 'fxLodashTA', runin: 'nodejs' })
        assert.strict.ok(!b.err, b.err)
        let r = callNode(b.fpTar, bodyFn, { execArgv: ['--pending-deprecation'] })
        assert.strict.deepStrictEqual(r.out, 'resolve:true:p')
        assert.strict.ok(!r.stderr.includes('DEP0111'), r.stderr.slice(0, 300))
    })

    it('S19 type object之方法以該物件為this', async function() {
        for (let runin of ['nodejs', 'browser']) {
            let b = await build('fxThisMethod', { fx: 'fxThisMethod', type: 'object', funNames: ['getVal'], runin })
            assert.strict.ok(!b.err, b.err)
            let body = `return await settle(f.getVal())`
            let out = runin === 'nodejs' ? callNode(b.fpTar, body).out : await callBrowser(b.fpTar, 'fxThisMethod', body)
            assert.strict.deepStrictEqual(out, 'resolve:3', runin)
        }
    })

    it('S20 工廠回傳class實例: 方法以實例為this', async function() {
        for (let runin of ['nodejs', 'browser']) {
            let b = await build('fxClassInst', { fx: 'fxClassInst', execFunctionByInstance: false, funNames: ['inc'], runin })
            assert.strict.ok(!b.err, b.err)
            let body = `let o = f()
let r1 = await settle(o.inc())
let r2 = await settle(o.inc())
o.terminate()
return [r1, r2]`
            let out = runin === 'nodejs' ? callNode(b.fpTar, body).out : await callBrowser(b.fpTar, 'fxClassInst', body)
            assert.strict.deepStrictEqual(out, ['resolve:1', 'resolve:2'], runin)
        }
    })

    it('S52 function每次呼叫新建: 使用者函數之this為undefined(同直接呼叫)', async function() {
        await expectFn('fxThisFn', [{ bMinify: false }], 'resolve:undef:p')
    })

    it('S53 呼叫不存在之方法: 以具名訊息reject', async function() {
        let b = await build('fxThisMethod', { fx: 'fxThisMethod', type: 'object', funNames: ['getVal', 'nope'], runin: 'nodejs' })
        assert.strict.ok(!b.err, b.err)
        let out = callNode(b.fpTar, `return await settle(f.nope())`).out
        assert.strict.ok(/^reject:.*nope.*not a function/.test(out), out)
    })

})


describe('worker選項: 使用者可控之名稱不成為膠水碼之識別子、建置期檢查(規則帳本R11、R12)', function() {

    before(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fx = writeWorkerFx(path.resolve(fdTmp, 'fx'))
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    it('S43、S46 funNames含outer內部名稱(init、recvMessage、genPm、rejectPendings)與非識別子(my-fn): 皆可呼叫, 宿主不崩潰且worker於呼叫後終止(子程序自行結束)', async function() {
        let funNames = ['other', 'init', 'recvMessage', 'genPm', 'rejectPendings', 'my-fn']
        for (let execObjectFunsByInstance of [true, false]) {
            let b = await build('fxObjNames', { fx: 'fxObjNames', type: 'object', funNames, execObjectFunsByInstance, runin: 'nodejs' })
            assert.strict.ok(!b.err, b.err)
            let body = `let rs = []
for (let k of ${JSON.stringify(funNames)}) {
    rs.push(await settle(f[k]('p')))
}
${execObjectFunsByInstance ? '' : 'f.terminate()'}
return rs`
            let r = callNode(b.fpTar, body, { timeout: 20000 })
            assert.strict.deepStrictEqual(r.timedOut, false, `ByInstance=${execObjectFunsByInstance}: 子程序未自行結束(worker遺留)`)
            assert.strict.deepStrictEqual(r.status, 0, `ByInstance=${execObjectFunsByInstance}: ${r.stderr.slice(0, 300)}`)
            assert.strict.deepStrictEqual(r.out, funNames.map((k) => `resolve:${k}:p`))
        }
    })

    it('S44、S45 funNames含對外物件之介面名稱(emit、once、terminate、__proto__): 建置期reject並指明保留名, 不產出', async function() {
        for (let bad of ['emit', 'once', 'terminate', '__proto__']) {
            let b = await build('fxObjNames', { fx: 'fxObjNames', type: 'object', funNames: ['other', bad], runin: 'nodejs' })
            assert.strict.ok(b.err, `${bad} 應於建置期reject`)
            assert.strict.ok(b.err.includes(bad) && b.err.includes('reserved'), b.err)
            assert.strict.deepStrictEqual(b.exists, false)
        }
        let b = await build('fxClassInst', { fx: 'fxClassInst', execFunctionByInstance: false, funNames: ['inc', 'on'], runin: 'nodejs' })
        assert.strict.ok(b.err && b.err.includes('reserved'), `工廠模式亦須檢查: ${b.err}`)
    })

    it('funNames須為非空字串: 否則建置期reject', async function() {
        let b = await build('fxObjNames', { fx: 'fxObjNames', type: 'object', funNames: ['other', 1], runin: 'nodejs' })
        assert.strict.ok(b.err && b.err.includes('funNames'), b.err)
    })

    it('S47、S48 evNames只支援function工廠: function每次呼叫新建或type object給evNames即建置期reject', async function() {
        let b1 = await build('fxPlain', { fx: 'fxPlain', evNames: ['tick'], runin: 'nodejs' })
        assert.strict.ok(b1.err && b1.err.includes('evNames'), `function每次呼叫新建: ${b1.err}`)
        assert.strict.deepStrictEqual(b1.exists, false)
        let b2 = await build('fxThisMethod', { fx: 'fxThisMethod', type: 'object', funNames: ['getVal'], evNames: ['tick'], runin: 'nodejs' })
        assert.strict.ok(b2.err && b2.err.includes('evNames'), `type object: ${b2.err}`)
        assert.strict.deepStrictEqual(b2.exists, false)
    })

    it('S49 evName含引號(工廠): 事件照常轉送', async function() {
        for (let runin of ['nodejs', 'browser']) {
            let b = await build('fxFacEvQuote', { fx: 'fxFacEvQuote', execFunctionByInstance: false, funNames: ['go'], evNames: ['a\'b'], runin })
            assert.strict.ok(!b.err, b.err)
            let body = `let o = f()
let got = new Promise((resolve) => o.on("a'b", resolve))
let r = await settle(o.go('p'))
let e = await settle(got)
o.terminate()
return [r, e]`
            let out = runin === 'nodejs' ? callNode(b.fpTar, body).out : await callBrowser(b.fpTar, 'fxFacEvQuote', body)
            assert.strict.deepStrictEqual(out, ['resolve:go:p', 'resolve:ev:p'], runin)
        }
    })

    it('S41、S42 opt.name為self(browser)、含-(es): 不進inner, 呼叫照常', async function() {
        let b1 = await build('self', { fx: 'fxPlain', runin: 'browser' })
        assert.strict.ok(!b1.err, b1.err)
        assert.strict.deepStrictEqual(await callBrowser(b1.fpTar, 'self', bodyFn), 'resolve:plain:p')
        let b2 = await build('my-worker', { fx: 'fxPlain', runin: 'nodejs', formatOut: 'es' })
        assert.strict.ok(!b2.err, b2.err)
        assert.strict.deepStrictEqual(callNode(b2.fpTar, bodyFn).out, 'resolve:plain:p')
    })

})
