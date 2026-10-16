import path from 'path'
import fs from 'fs'
import assert from 'assert'
import rollupCode from '../src/rollupCode.mjs'
import rollupWorker from '../src/rollupWorker.mjs'
import rollupParfor from '../src/rollupParfor.mjs'
import { rmTempFile } from '../src/wptCommon.mjs'


//規格(規則帳本R20): 暫存檔(./temp-<id>-*)清理失敗(建置已成功)時, 只留一行含code與絕對路徑之警告, 不印Error物件(其堆疊框會被w-pksupdate R15判為建置失敗),
//不拋錯, 不覆蓋建置之原始錯誤; EBUSY、EPERM短重試後成功者不留警告


let fdTmp = path.resolve('./test/_tmp/tempCleanup')
let fpFun = path.resolve(fdTmp, 'fxFun.mjs')
let fpMiss = path.resolve(fdTmp, 'fxMiss.mjs')
let fpNodeOnly = path.resolve(fdTmp, 'fxNodeOnly.mjs')
let fpParforSrc = path.resolve('./test-code-in/gParfor1_Fun.mjs')

let reFrame = /^[ \t]+at[ \t]+.*:\d+:\d+\)?[ \t]*$/m
let isTempName = (p) => typeof p === 'string' && path.basename(p).startsWith('temp-')

//withRmFault: 於fn執行期間令fs.rmSync與fs.unlinkSync對「已存在之temp-開頭檔」失敗(結束必還原), 回傳{ r, logs, seen }
//  mode: 'always'持續拋EPERM(訊息與path為Windows ANSI亂碼); 'transient'前n次拋EBUSY其後照常刪除
let withRmFault = async (mode, fn, n = 2) => {
    let realRm = fs.rmSync
    let realUnlink = fs.unlinkSync
    let oriLog = console.log
    let seen = []
    let count = {}
    let logs = []
    let fault = (p, real, thisArg, args) => {
        if (isTempName(p) && fs.existsSync(p)) {
            let ap = path.resolve(p)
            if (!seen.includes(ap)) {
                seen.push(ap)
            }
            count[ap] = (count[ap] || 0) + 1
            if (mode === 'always' || count[ap] <= n) {
                let e = new Error('EPERM, Permission denied: \\\\?\\C:\\opensrc\\¶}·½-JS-001\\temp \'\\\\?\\C:\\opensrc\\\uFFFD}\uFFFD\uFFFD-JS-001\\temp\'')
                e.code = mode === 'always' ? 'EPERM' : 'EBUSY'
                e.syscall = 'rm'
                e.path = '\\\\?\\C:\\opensrc\\\uFFFD}\uFFFD\uFFFD-JS-001\\temp'
                throw e
            }
        }
        return real.apply(thisArg, args)
    }
    fs.rmSync = function(p, ...rest) {
        return fault(p, realRm, fs, [p, ...rest])
    }
    fs.unlinkSync = function(p, ...rest) {
        return fault(p, realUnlink, fs, [p, ...rest])
    }
    console.log = (...args) => {
        logs.push(args)
    }
    let r
    try {
        r = await fn().then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }))
    }
    finally {
        fs.rmSync = realRm
        fs.unlinkSync = realUnlink
        console.log = oriLog
    }
    return { r, logs, seen }
}

//warnsOf: 警告行(單一字串引數且以warning: temp file[開頭)
let warnsOf = (logs) => logs.filter((a) => a.length === 1 && typeof a[0] === 'string' && a[0].startsWith('warning: temp file['))

//assertWarns: 每個清理失敗之暫存檔恰一行警告, 且警告行符合R20 ③④
let assertWarns = (logs, seen, label) => {
    assert.strict.ok(seen.length > 0, `${label}: 未見暫存檔被清理(注入未生效)`)
    //不印Error物件: 所有console.log之引數皆為字串
    for (let a of logs) {
        for (let x of a) {
            assert.strict.deepStrictEqual(typeof x, 'string', `${label}: console.log印出非字串引數(${Object.prototype.toString.call(x)}): ${String(x && x.stack).slice(0, 200)}`)
        }
    }
    let warns = warnsOf(logs).map((a) => a[0])
    assert.strict.deepStrictEqual(warns.length, seen.length, `${label}: 警告行數[${warns.length}]須等於清理失敗之暫存檔數[${seen.length}]\n${warns.join('\n')}`)
    for (let ap of seen) {
        let hit = warns.filter((s) => s.includes(`temp file[${ap}]`))
        assert.strict.deepStrictEqual(hit.length, 1, `${label}: ${ap}應恰一行警告`)
        assert.strict.ok(hit[0].includes('code[EPERM]') && hit[0].includes('syscall[rm]'), hit[0])
    }
    for (let s of warns) {
        assert.strict.ok(!s.includes('\n'), `${label}: 警告須為單行`)
        assert.strict.ok(!reFrame.test(s), `${label}: 警告不得含堆疊框行: ${s}`)
        assert.strict.ok(!/\uFFFD|¶}|Permission denied/.test(s), `${label}: 警告不得引用Node之亂碼訊息: ${s}`)
        assert.strict.ok(!/can not clean folder\[|invalid opt\.|invalid fpSrc|RollupError|Error:/.test(s), `${label}: 警告不得含建置失敗之固定字樣: ${s}`)
    }
}


describe('暫存檔清理失敗之留痕(規則帳本R20)', function() {

    this.timeout(180000)

    let before0 = new Set()

    before(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fs.mkdirSync(fdTmp, { recursive: true })
        fs.writeFileSync(fpFun, `export default function fxFun() { return 1 }\n`, 'utf8')
        fs.writeFileSync(fpMiss, `import nx from './noSuchZz.mjs'\nexport default function fxMiss() { return nx }\n`, 'utf8')
        //nodejs版inner可建置(留下暫存檔)而瀏覽器版inner引用內建模組fs → 建置於其後失敗(R16 ④), 使「建置失敗而暫存檔已存在」成立
        fs.writeFileSync(fpNodeOnly, `import fs from 'fs'\nexport default function fxNodeOnly() { return fs.existsSync('.') }\n`, 'utf8')
    })

    beforeEach(function() {
        before0 = new Set(fs.readdirSync('.'))
    })

    afterEach(function() {
        //注入使暫存檔留在cwd: 以真實之rmSync清掉本案新增者
        for (let f of fs.readdirSync('.')) {
            if (!before0.has(f) && f.startsWith('temp-')) {
                fs.rmSync(f, { force: true })
            }
        }
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    let leftover = () => fs.readdirSync('.').filter((f) => !before0.has(f) && f.startsWith('temp-'))

    //三個API: 成功建置之呼叫與失敗建置之呼叫
    let apis = [
        {
            nm: 'rollupCode',
            ok: () => rollupCode(`export default function fxA() { return 1 }`, { name: 'fxA', bLog: false, bMinify: false }),
            check: (v) => assert.strict.ok(typeof v === 'string' && v.includes('fxA'), '應回傳程式碼'),
            miss: () => rollupCode(`import nx from './noSuchZz.mjs'\nexport default nx`, { name: 'fxA', bLog: false, bMinify: false }),
            isCause: (e) => String(e && e.message).includes('noSuchZz'),
            parts: [],
        },
        {
            nm: 'rollupWorker',
            ok: () => rollupWorker({ name: 'fxW', fpSrc: fpFun, fpTar: path.resolve(fdTmp, 'w-out.js'), type: 'function', formatOut: 'umd', runin: 'both', bMinify: false, bLog: false }),
            check: () => assert.strict.ok(fs.existsSync(path.resolve(fdTmp, 'w-out.js')) && fs.statSync(path.resolve(fdTmp, 'w-out.js')).size > 0, '產物應存在'),
            miss: () => rollupWorker({ name: 'fxW', fpSrc: fpNodeOnly, fpTar: path.resolve(fdTmp, 'w-miss.js'), type: 'function', formatOut: 'umd', runin: 'both', bMinify: false, bLog: false }),
            isCause: (e) => (e && e.pluginCode) === 'WPT_WORKER_EXTERNAL',
            parts: ['-nw.js', '-ww.js', '-mg.js'],
        },
        {
            nm: 'rollupParfor',
            ok: () => rollupParfor({ name: 'fxP', fpSrc: fpParforSrc, fpTar: path.resolve(fdTmp, 'p-out.js'), formatOut: 'umd', runin: 'nodejs', bMinify: false, bLog: false }),
            check: () => assert.strict.ok(fs.existsSync(path.resolve(fdTmp, 'p-out.js')) && fs.statSync(path.resolve(fdTmp, 'p-out.js')).size > 0, '產物應存在'),
            miss: () => rollupParfor({ name: 'fxP', fpSrc: fpNodeOnly, fpTar: path.resolve(fdTmp, 'p-miss.js'), formatOut: 'umd', runin: 'both', bMinify: false, bLog: false }),
            isCause: (e) => (e && e.pluginCode) === 'WPT_WORKER_EXTERNAL',
            parts: ['-parforCore-src.mjs', '-parforCore-tar.wk.umd.js', '-parfor-src.mjs'],
        },
    ]

    for (let a of apis) {

        it(`${a.nm}: 建置成功而清理持續失敗 → 仍resolve且產物不變, 每個殘留暫存檔恰一行警告(含絕對路徑與code), 不印Error物件`, async function() {
            let { r, logs, seen } = await withRmFault('always', a.ok)
            assert.strict.deepStrictEqual(r.ok, true, `建置已成功, 清理失敗不得使其reject: ${r.e && r.e.message}`)
            a.check(r.v)
            assertWarns(logs, seen, a.nm)
            for (let part of a.parts) {
                assert.strict.ok(seen.some((ap) => ap.endsWith(part)), `${a.nm}: 應見暫存檔[*${part}]被清理`)
            }
            assert.strict.ok(leftover().length > 0, '注入使暫存檔殘留, 此為測試前提')
        })

        it(`${a.nm}: 清理暫時失敗(EBUSY前2次) → 重試後成功, 無警告, 無殘留`, async function() {
            let { r, logs, seen } = await withRmFault('transient', a.ok, 2)
            assert.strict.deepStrictEqual(r.ok, true, r.e && r.e.message)
            a.check(r.v)
            assert.strict.ok(seen.length > 0, '注入未生效')
            assert.strict.deepStrictEqual(warnsOf(logs).length, 0, `重試後成功不應有警告: ${JSON.stringify(warnsOf(logs))}`)
            for (let x of logs.flat()) {
                assert.strict.deepStrictEqual(typeof x, 'string', '不得印出Error物件')
            }
            assert.strict.deepStrictEqual(leftover(), [], '重試後應已刪除')
        })

        it(`${a.nm}: 建置失敗兼清理失敗 → reject的是建置真因(非清理錯誤), 警告照留`, async function() {
            let { r, logs, seen } = await withRmFault('always', a.miss)
            assert.strict.deepStrictEqual(r.ok, false, '建置失敗須reject')
            let msg = String((r.e && r.e.message) || r.e)
            assert.strict.ok(a.isCause(r.e), `應為建置真因: ${msg.slice(0, 300)}`)
            assert.strict.ok(!/Permission denied|EPERM|temp file\[/.test(msg), `不得被清理錯誤覆蓋: ${msg.slice(0, 300)}`)
            //建置失敗時暫存檔已存在(注入才有清理失敗可言)
            assertWarns(logs, seen, a.nm)
        })
    }

    //rmTempFile之重試語意(帳本R20 ②): EBUSY、EPERM重試3次(共4次嘗試)、間隔100ms、非同步不阻塞事件迴圈; 其餘錯誤碼不重試; 路徑於進入時固定為絕對路徑
    describe('rmTempFile之重試與路徑語意', function() {

        let fdRm = path.resolve(fdTmp, 'rm')

        beforeEach(function() {
            fs.rmSync(fdRm, { recursive: true, force: true })
            fs.mkdirSync(fdRm, { recursive: true })
        })

        let mkFsErr = (code) => {
            let e = new Error(`${code}, simulated: \\\\?\\C:\\opensrc\\¶}·½-JS-001\\temp`)
            e.code = code
            e.syscall = 'rm'
            return e
        }

        //withScript: 令fs.rmSync對target依序拋codes[n](n為嘗試序號), 其後照常刪除; 記錄各次嘗試時刻與console.log引數
        let withScript = async (target, codes, fn, onAttempt) => {
            let realRm = fs.rmSync
            let oriLog = console.log
            let times = []
            let logs = []
            fs.rmSync = function(p, ...rest) {
                if (path.resolve(p) === target) {
                    let n = times.length
                    times.push(Date.now())
                    if (onAttempt) {
                        onAttempt(n)
                    }
                    if (n < codes.length) {
                        throw mkFsErr(codes[n])
                    }
                }
                return realRm.call(fs, p, ...rest)
            }
            console.log = (...a) => {
                logs.push(a)
            }
            try {
                let v = await fn()
                return { v, times, logs }
            }
            finally {
                fs.rmSync = realRm
                console.log = oriLog
            }
        }

        it('EBUSY前3次失敗、第4次成功 → 已刪除, 共4次嘗試, 無警告', async function() {
            let fp = path.resolve(fdRm, 'temp-a.js')
            fs.writeFileSync(fp, 'x')
            let r = await withScript(fp, ['EBUSY', 'EBUSY', 'EBUSY'], () => rmTempFile(fp, { delay: 5 }))
            assert.strict.deepStrictEqual(r.v, true)
            assert.strict.deepStrictEqual(r.times.length, 4)
            assert.strict.deepStrictEqual(r.logs, [])
            assert.strict.deepStrictEqual(fs.existsSync(fp), false)
        })

        it('EPERM(Windows下實際之暫時占用碼)亦重試: 前2次EPERM後成功 → 共3次嘗試, 無警告', async function() {
            let fp = path.resolve(fdRm, 'temp-b.js')
            fs.writeFileSync(fp, 'x')
            let r = await withScript(fp, ['EPERM', 'EPERM'], () => rmTempFile(fp, { delay: 5 }))
            assert.strict.deepStrictEqual(r.v, true)
            assert.strict.deepStrictEqual(r.times.length, 3)
            assert.strict.deepStrictEqual(r.logs, [])
            assert.strict.deepStrictEqual(fs.existsSync(fp), false)
        })

        it('暫時性錯誤持續 → 恰4次嘗試(1+重試3次)後回傳false並留恰一行警告', async function() {
            for (let code of ['EBUSY', 'EPERM']) {
                let fp = path.resolve(fdRm, `temp-c-${code}.js`)
                fs.writeFileSync(fp, 'x')
                let r = await withScript(fp, [code, code, code, code, code, code], () => rmTempFile(fp, { delay: 5 }))
                assert.strict.deepStrictEqual(r.v, false, code)
                assert.strict.deepStrictEqual(r.times.length, 4, `${code}: 嘗試次數`)
                assert.strict.deepStrictEqual(r.logs.length, 1, code)
                assert.strict.ok(r.logs[0].length === 1 && r.logs[0][0].includes(`temp file[${fp}]`) && r.logs[0][0].includes(`code[${code}]`), String(r.logs[0]))
            }
        })

        it('其他錯誤碼(EIO、EACCES)不重試: 1次嘗試即留一行警告', async function() {
            for (let code of ['EIO', 'EACCES']) {
                let fp = path.resolve(fdRm, `temp-d-${code}.js`)
                fs.writeFileSync(fp, 'x')
                let r = await withScript(fp, [code, code, code, code], () => rmTempFile(fp, { delay: 5 }))
                assert.strict.deepStrictEqual(r.v, false, code)
                assert.strict.deepStrictEqual(r.times.length, 1, `${code}: 不應重試`)
                assert.strict.deepStrictEqual(r.logs.length, 1, code)
            }
        })

        it('預設間隔約100ms: 各次嘗試間隔不得過短(3次重試總長約300ms)', async function() {
            let fp = path.resolve(fdRm, 'temp-e.js')
            fs.writeFileSync(fp, 'x')
            let r = await withScript(fp, ['EBUSY', 'EBUSY', 'EBUSY', 'EBUSY'], () => rmTempFile(fp))
            assert.strict.deepStrictEqual(r.times.length, 4)
            for (let i = 1; i < r.times.length; i++) {
                assert.strict.ok(r.times[i] - r.times[i - 1] >= 90, `第${i}次間隔${r.times[i] - r.times[i - 1]}ms過短(預設100ms)`)
            }
            assert.strict.ok(r.times[3] - r.times[0] < 3000, '總長異常偏長')
        })

        it('重試等待為非同步: 等待期間事件迴圈可執行其他計時器(不阻塞)', async function() {
            let fp = path.resolve(fdRm, 'temp-f.js')
            fs.writeFileSync(fp, 'x')
            let ticks = 0
            let iv = setInterval(() => {
                ticks++
            }, 10)
            try {
                await withScript(fp, ['EBUSY', 'EBUSY', 'EBUSY', 'EBUSY'], () => rmTempFile(fp, { delay: 100 }))
            }
            finally {
                clearInterval(iv)
            }
            assert.strict.ok(ticks >= 10, `重試等待約300ms期間心跳僅${ticks}次, 事件迴圈疑遭阻塞`)
        })

        it('重試期間宿主改變cwd: 仍只操作原本之暫存檔(路徑於進入時固定為絕對路徑), 不刪他處同名檔', async function() {
            let dirA = path.resolve(fdRm, 'A')
            let dirB = path.resolve(fdRm, 'B')
            fs.mkdirSync(dirA, { recursive: true })
            fs.mkdirSync(dirB, { recursive: true })
            fs.writeFileSync(path.resolve(dirA, 'temp-owned.js'), 'A')
            fs.writeFileSync(path.resolve(dirB, 'temp-owned.js'), 'B')
            let cwd0 = process.cwd()
            process.chdir(dirA)
            try {
                //第1次嘗試失敗(EBUSY)時, 宿主於等待期間切換cwd至B
                let r = await withScript(path.resolve(dirA, 'temp-owned.js'), ['EBUSY'], () => rmTempFile('./temp-owned.js', { delay: 10 }), (n) => {
                    if (n === 0) {
                        process.chdir(dirB)
                    }
                })
                assert.strict.deepStrictEqual(r.v, true)
                assert.strict.deepStrictEqual(r.logs, [])
            }
            finally {
                process.chdir(cwd0)
            }
            assert.strict.deepStrictEqual(fs.existsSync(path.resolve(dirA, 'temp-owned.js')), false, '原本之暫存檔應已刪除')
            assert.strict.deepStrictEqual(fs.readFileSync(path.resolve(dirB, 'temp-owned.js'), 'utf8'), 'B', '他處同名檔不得被動')
        })

    })

    it('靜態守門: src無console.log(err)印出清理錯誤之寫法, 暫存檔清理皆經rmTempFile', function() {
        let bad = []
        let owners = []
        for (let fn of fs.readdirSync('./src')) {
            if (!fn.endsWith('.mjs')) {
                continue
            }
            let lines = fs.readFileSync(`./src/${fn}`, 'utf8').split(/\r?\n/)
            lines.forEach((ln, i) => {
                if (/^\s*(\/\/|\*)/.test(ln)) {
                    return
                }
                if (/console\.log\(\s*err\s*\)/.test(ln)) {
                    bad.push(`src/${fn}:${i + 1}: ${ln.trim()}`)
                }
                if (/\brmTempFile\(/.test(ln) && fn !== 'wptCommon.mjs') {
                    owners.push(fn)
                }
            })
        }
        assert.strict.deepStrictEqual(bad, [], '仍有console.log(err)')
        assert.strict.deepStrictEqual([...new Set(owners)].sort(), ['rollupCode.mjs', 'rollupParfor.mjs', 'rollupWorker.mjs'])
    })

})
