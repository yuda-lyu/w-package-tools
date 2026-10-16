import path from 'path'
import fs from 'fs'
import vm from 'vm'
import util from 'util'
import assert from 'assert'
import { spawn } from 'child_process'
import { pathToFileURL } from 'url'
import _ from 'lodash-es'
import EventEmitter from 'eventemitter3'
import rollupFile from '../src/rollupFile.mjs'
import rollupCode from '../src/rollupCode.mjs'
import rollupWorker from '../src/rollupWorker.mjs'
import rollupWorkerCore from '../src/rollupWorkerCore.mjs'
import rollupParfor from '../src/rollupParfor.mjs'
import rollupFiles from '../src/rollupFiles.mjs'
import { cleanFolderStrict } from '../src/buildCheck.mjs'


//規格(規則帳本R19): 本套件自行拒絕或拋出之錯誤一律為Error物件(有堆疊)並帶WPT_碼, 訊息文字維持既有字串(w-pksupdate之固定字串清單依此比對);
//不引用Node fs錯誤之message與path(Windows下路徑含非ASCII時為亂碼), cleanFolderStrict之訊息改以絕對路徑、code、syscall與嘗試次數組成


let fdTmp = path.resolve('./test/_tmp/rejectShape')
let fdFx = path.resolve(fdTmp, 'fx')
let fpFun = path.resolve(fdFx, 'fxFun.mjs')
let fpNamed = path.resolve(fdFx, 'fxNamed.mjs')
let fpNoExport = path.resolve(fdFx, 'fxNoExport.mjs')
let fpFile = path.resolve(fdFx, 'aFile.txt')
let fpNoSrc = path.resolve(fdFx, 'noSuchFile.mjs')
let fpOut = path.resolve(fdTmp, 'out.js')
let fdKeep = path.resolve(fdTmp, 'keep')

//回傳物件(EventEmitter實體)之對外介面名稱(帳本R11: 由eventemitter3之原型與實例推導, 加terminate與__proto__), 為站點21訊息之完整後綴
let reservedList = _.join(_.uniq([...Object.getOwnPropertyNames(EventEmitter.prototype), ...Object.keys(new EventEmitter()), 'terminate', '__proto__']), ', ')

//堆疊框行(同w-pksupdate R15之判定精神: 有堆疊框行才可由結構特徵判為失敗)
let reFrame = /^[ \t]+at[ \t]+.*:\d+:\d+\)?[ \t]*$/m

let rejOf = (fn) => {
    return Promise.resolve()
        .then(fn)
        .then(() => ({ ok: true }), (e) => ({ ok: false, e }))
}

let throwsOf = (fn) => {
    try {
        let v = fn()
        return { ok: true, v }
    }
    catch (e) {
        return { ok: false, e }
    }
}

//assertShape: 拒絕值須為帶碼之Error物件, 訊息文字與原字串逐字相同, 堆疊自呼叫處起算, util.inspect(console.log之輸出)含堆疊框行與code
let assertShape = (e, code, msg, label) => {
    assert.strict.ok(e instanceof Error, `${label}: 拒絕值非Error物件(typeof ${typeof e}): ${String(e)}`)
    assert.strict.deepStrictEqual(e.code, code, `${label}: code`)
    if (typeof msg === 'string') {
        assert.strict.deepStrictEqual(e.message, msg, `${label}: 訊息文字須與原字串逐字相同`)
    }
    else {
        assert.strict.ok(msg.test(e.message), `${label}: 訊息[${e.message}]不符${msg}`)
    }
    let frames = e.stack.split('\n').filter((ln) => reFrame.test(ln))
    assert.strict.ok(frames.length > 0, `${label}: 堆疊無框行`)
    assert.strict.ok(!frames[0].includes('wptCommon.mjs'), `${label}: 堆疊須自呼叫處起算, 首框為[${frames[0].trim()}]`)
    let shown = util.inspect(e)
    assert.strict.ok(shown.includes(e.message) && reFrame.test(shown) && shown.includes(`code: '${code}'`), `${label}: console.log輸出缺訊息、堆疊框行或code`)
}


describe('產製API之錯誤一律為帶碼Error物件(規則帳本R19)', function() {

    this.timeout(180000)

    //res: 各站點之結果{ ok, e }; 於before一次跑完, 單一站點之意外(如注入失敗)記於該站點, 不使整檔失去判別力
    let res = {}

    before(async function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fs.mkdirSync(fdFx, { recursive: true })
        fs.writeFileSync(fpFun, `export default function fxFun() { return 1 }\n`, 'utf8')
        fs.writeFileSync(fpNamed, `export function fxNamed() { return 1 }\n`, 'utf8')
        fs.writeFileSync(fpNoExport, `let a = 1\nconsole.log(a)\n`, 'utf8')
        fs.writeFileSync(fpFile, 'x', 'utf8')
        fs.mkdirSync(fdKeep, { recursive: true })
        fs.writeFileSync(path.resolve(fdKeep, 'stale.js'), 'stale', 'utf8')
        for (let s of sites) {
            res[s.id] = await rejOf(s.run)
        }
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    //站點26: inner建置期語法檢查無自然輸入可觸發(rollup已先驗語法), 於呼叫期間注入vm.Script
    let runInnerSyntax = async () => {
        let RealScript = vm.Script
        vm.Script = class {
            constructor(code, o) {
                if (o && /^inner of /.test(o.filename)) {
                    throw new SyntaxError('injected')
                }
                return new RealScript(code, o)
            }
        }
        try {
            return await rollupWorkerCore({ name: 'x', type: 'function', fpSrc: fpFun, bReturnCode: true, runin: 'nodejs', bLog: false })
        }
        finally {
            vm.Script = RealScript
        }
    }

    //站點4: 回傳程式碼模式多項輸出於現行外掛組合不可達(R14 ③), 於src副本注入使generate多回一項, 其餘為src原樣
    let runMultiOutput = async () => {
        let fdV = path.resolve(fdTmp, 'variant')
        fs.cpSync(path.resolve('./src'), path.resolve(fdV, 'src'), { recursive: true })
        let fpV = path.resolve(fdV, 'src/rollupFile.mjs')
        let c = fs.readFileSync(fpV, 'utf8')
        let ori = `import { rollup } from 'rollup'`
        assert.strict.ok(c.includes(ori), '副本之rollup匯入敘述已改動, 請同步更新本測試之注入')
        c = c.replace(ori, `import { rollup as rollupReal } from 'rollup'
let rollup = async (o) => {
    let b = await rollupReal(o)
    let gen = b.generate.bind(b)
    b.generate = async (oo) => {
        let r = await gen(oo)
        r.output.push({ type: 'asset', fileName: 'extra.txt', source: 'x' })
        return r
    }
    return b
}`)
        fs.writeFileSync(fpV, c, 'utf8')
        let m = await import(pathToFileURL(fpV).href)
        return await m.default({ fn: 'fxFun.mjs', fdSrc: fdFx, bLog: false })
    }

    //站點27: 新產製之parfor產物(模板內之檢查), 產物於未給cb且returnResult非true時於建立worker前即拒絕
    let runParforProduct = async () => {
        let fpPf = path.resolve(fdTmp, 'rejectParfor.pf.umd.js')
        await rollupParfor({ name: 'rejectParfor', fpSrc: path.resolve('./test-code-in/gParfor1_Fun.mjs'), fpTar: fpPf, runin: 'nodejs', formatOut: 'umd', bLog: false })
        assert.strict.ok(fs.existsSync(fpPf), '產物應存在')
        let mod = await import(`${pathToFileURL(fpPf).href}?t=${Date.now()}`)
        return await mod.default([{ count: 1, p1: 1, p2: 'a' }], {})
    }

    let sites = [
        { id: 1, code: 'WPT_INVALID_FDTAR', msg: () => `invalid opt.fdTar[${fpFile}]: not a folder and can not be created`, run: () => rollupFile({ fn: 'fxFun.mjs', fdSrc: fdFx, fdTar: fpFile, bLog: false }) },
        { id: 2, code: 'WPT_INVALID_FDSRC', msg: () => `invalid opt.fdSrc[${fpFile}]: not a folder`, run: () => rollupFile({ fn: 'fxFun.mjs', fdSrc: fpFile, bLog: false }) },
        { id: 3, code: 'WPT_INVALID_FPSRC', msg: () => `invalid fpSrc: ${fpNoSrc}`, run: () => rollupFile({ fn: 'noSuchFile.mjs', fdSrc: fdFx, bLog: false }) },
        { id: 4, code: 'WPT_MULTI_OUTPUT', msg: () => /^return-code mode of rollupFile can not output multiple files: temp-[A-Za-z0-9]+, extra\.txt$/, run: runMultiOutput }, //首項為回傳模式內部以隨機id命名之chunk(R14), 其後為注入之extra.txt
        { id: 5, code: 'WPT_INVALID_NAME', msg: () => 'invalid opt.name', run: () => rollupCode('export default 1', { bLog: false }) },
        { id: 6, code: 'WPT_INVALID_NAME', msg: () => 'invalid opt.name', run: () => rollupWorker({ bLog: false }) },
        { id: 7, code: 'WPT_INVALID_NAME', msg: () => 'invalid opt.name', run: () => rollupParfor({ bLog: false }) },
        { id: 8, code: 'WPT_INVALID_NAME', msg: () => 'invalid opt.name', run: () => rollupWorkerCore({ bLog: false }) },
        { id: 9, code: 'WPT_INVALID_FPSRC', msg: () => 'opt.fpSrc is not file', run: () => rollupWorker({ name: 'x', fpSrc: fpNoSrc, fpTar: fpOut, bLog: false }) },
        { id: 10, code: 'WPT_INVALID_FPSRC', msg: () => 'opt.fpSrc is not file', run: () => rollupParfor({ name: 'x', fpSrc: fpNoSrc, fpTar: fpOut, bLog: false }) },
        { id: 11, code: 'WPT_INVALID_FPSRC', msg: () => 'opt.fpSrc is not file', run: () => rollupWorkerCore({ name: 'x', type: 'function', fpSrc: fpNoSrc, fpTar: fpOut, bLog: false }) },
        { id: 12, code: 'WPT_INVALID_FPTAR', msg: () => 'invalid opt.fpTar', run: () => rollupWorker({ name: 'x', fpSrc: fpFun, bLog: false }) },
        { id: 13, code: 'WPT_INVALID_FPTAR', msg: () => 'invalid opt.fpTar', run: () => rollupParfor({ name: 'x', fpSrc: fpFun, bLog: false }) },
        { id: 14, code: 'WPT_INVALID_FPTAR', msg: () => 'invalid opt.fpTar', run: () => rollupWorkerCore({ name: 'x', type: 'function', fpSrc: fpFun, bLog: false }) },
        { id: 15, code: 'WPT_INVALID_TYPE', msg: () => `opt.type need to set 'function'`, run: () => rollupParfor({ name: 'x', fpSrc: fpFun, fpTar: fpOut, type: 'object', bLog: false }) },
        { id: 16, code: 'WPT_IIFE_RUNIN', msg: () => 'formatOut[iife] only supports runin[browser], but runin is [nodejs]', run: () => rollupWorker({ name: 'x', fpSrc: fpFun, fpTar: fpOut, formatOut: 'iife', runin: 'nodejs', bLog: false }) },
        { id: 17, code: 'WPT_IIFE_RUNIN', msg: () => 'formatOut[iife] only supports runin[browser], but runin is [nodejs]', run: () => rollupParfor({ name: 'x', fpSrc: fpFun, fpTar: fpOut, formatOut: 'iife', runin: 'nodejs', bLog: false }) },
        { id: 18, code: 'WPT_IIFE_RUNIN', msg: () => 'formatOut[iife] only supports runin[browser], but runin is [nodejs]', run: () => rollupWorkerCore({ name: 'x', type: 'function', fpSrc: fpFun, fpTar: fpOut, formatOut: 'iife', runin: 'nodejs', bLog: false }) },
        { id: 19, code: 'WPT_INVALID_FUNNAMES', msg: () => 'invalid opt.funNames', run: () => rollupWorkerCore({ name: 'x', type: 'object', fpSrc: fpFun, fpTar: fpOut, bLog: false }) },
        { id: 20, code: 'WPT_INVALID_FUNNAMES', msg: () => 'invalid opt.funNames: [1] is not a non-empty string', run: () => rollupWorkerCore({ name: 'x', type: 'object', funNames: ['a', 1], fpSrc: fpFun, fpTar: fpOut, bLog: false }) },
        { id: 21, code: 'WPT_FUNNAMES_RESERVED', msg: () => `opt.funNames[emit] is reserved by the returned object(EventEmitter): ${reservedList}`, run: () => rollupWorkerCore({ name: 'x', type: 'object', funNames: ['emit'], fpSrc: fpFun, fpTar: fpOut, bLog: false }) },
        { id: 22, code: 'WPT_EVNAMES_UNSUPPORTED', msg: () => 'opt.evNames only supports type[function] with execFunctionByInstance[false], but type is [object] and execFunctionByInstance is [true]', run: () => rollupWorkerCore({ name: 'x', type: 'object', funNames: ['a'], evNames: ['tick'], fpSrc: fpFun, fpTar: fpOut, bLog: false }) },
        { id: 23, code: 'WPT_INVALID_EVNAMES', msg: () => 'invalid opt.evNames: [1] is not a non-empty string', run: () => rollupWorkerCore({ name: 'x', type: 'function', execFunctionByInstance: false, funNames: ['go'], evNames: [1], fpSrc: fpFun, fpTar: fpOut, bLog: false }) },
        { id: 24, code: 'WPT_NO_DEFAULT_EXPORT', msg: () => 'module[fxNamed.mjs] has no default export, type[function] requires a default export, exports[fxNamed]', run: () => rollupWorkerCore({ name: 'x', type: 'function', fpSrc: fpNamed, bReturnCode: true, runin: 'nodejs', bLog: false }) },
        { id: 25, code: 'WPT_NO_EXPORT', msg: () => 'module[fxNoExport.mjs] has no export, type[object] requires a default export or named exports', run: () => rollupWorkerCore({ name: 'x', type: 'object', funNames: ['a'], fpSrc: fpNoExport, bReturnCode: true, runin: 'nodejs', bLog: false }) },
        { id: 26, code: 'WPT_INNER_SYNTAX', msg: () => 'inner of worker[fxFun.mjs] has syntax error: injected', run: runInnerSyntax },
        { id: 27, code: 'WPT_PARFOR_NO_CB', msg: () => 'cb is not a function, need to set opt.returnResult to true', run: runParforProduct },
        { id: 29, code: 'WPT_INVALID_FNS', msg: () => 'invalid opt.fns: need a file name string or an array of file name strings', run: () => rollupFiles({ fdSrc: fdFx, fdTar: fdKeep, bLog: false }) },
    ]

    //站點29(審計發現之間接站點: 原由wsemip之pmSeries以字串'rs is not an array or object'拒絕, 且已先清空fdTar): 須於清空前拒絕, fdTar內既有檔不得被動
    it('站點29: fns無效時於清空前即拒絕, fdTar內既有檔不被清掉', function() {
        assert.strict.deepStrictEqual(fs.readFileSync(path.resolve(fdKeep, 'stale.js'), 'utf8'), 'stale')
    })

    //訊息文字鎖定(行為鎖定, 修前即綠): 站點仍須reject, 且訊息文字與原字串逐字相同(w-pksupdate之固定字串清單依此比對); 值為字串或Error皆取其文字
    for (let s of sites) {
        it(`站點${s.id}(${s.code}): 仍reject且訊息文字與原字串逐字相同`, function() {
            let r = res[s.id]
            assert.strict.ok(r, `站點${s.id}未執行`)
            assert.strict.deepStrictEqual(r.ok, false, `站點${s.id}應reject`)
            let text = String((r.e && r.e.message !== undefined) ? r.e.message : r.e)
            let want = s.msg()
            if (typeof want === 'string') {
                assert.strict.deepStrictEqual(text, want)
            }
            else {
                assert.strict.ok(want.test(text), `訊息[${text}]不符${want}`)
            }
        })
    }

    //拒絕值形狀(修前紅): Error物件、WPT_碼、堆疊自呼叫處起算、console.log輸出含堆疊框行與code
    for (let s of sites) {
        it(`站點${s.id}(${s.code}): 拒絕值為帶碼之Error物件`, function() {
            let r = res[s.id]
            assert.strict.ok(r, `站點${s.id}未執行`)
            assert.strict.deepStrictEqual(r.ok, false, `站點${s.id}應reject`)
            assertShape(r.e, s.code, s.msg(), `站點${s.id}`)
        })
    }

    it('靜態守門: src與建置腳本無以字串reject或throw之處; Promise.reject僅存於wptCommon與parfor模板; rejectWpt/wptError之碼一律為WPT_字面值', function() {
        let fps = []
        for (let fn of fs.readdirSync('./src')) {
            if (fn.endsWith('.mjs')) {
                fps.push(`./src/${fn}`)
            }
        }
        for (let fn of fs.readdirSync('.')) {
            if (/^gRollup\w*\.mjs$/.test(fn)) {
                fps.push(`./${fn}`)
            }
        }
        for (let d of ['./bin', './toolg']) {
            for (let fn of fs.readdirSync(d)) {
                if (fn.endsWith('.mjs')) {
                    fps.push(`${d}/${fn}`)
                }
            }
        }
        assert.strict.ok(fps.length > 20, `掃描檔數異常: ${fps.length}`)
        let bad = []
        let withReject = []
        let nCall = 0
        let nLit = 0
        for (let fp of fps) {
            let lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/)
            lines.forEach((ln, i) => {
                if (/^\s*(\/\/|\*)/.test(ln)) {
                    return
                }
                if (/Promise\.reject\(\s*['"`]/.test(ln) || /\bthrow\s+['"`]/.test(ln) || /\breject\(\s*['"`]/.test(ln)) {
                    bad.push(`${fp}:${i + 1}: ${ln.trim()}`)
                }
                if (/Promise\.reject\(/.test(ln) && !withReject.includes(path.basename(fp))) {
                    withReject.push(path.basename(fp))
                }
                if (!fp.endsWith('wptCommon.mjs')) {
                    nCall += (ln.match(/\b(rejectWpt|wptError)\(/g) || []).length
                    nLit += (ln.match(/\b(rejectWpt|wptError)\(\s*'WPT_[A-Z_]+'/g) || []).length
                }
            })
        }
        assert.strict.deepStrictEqual(bad, [], '仍有字串reject或throw')
        assert.strict.deepStrictEqual(withReject.sort(), ['rollupParfor.mjs', 'wptCommon.mjs'])
        assert.strict.deepStrictEqual(nLit, nCall, 'rejectWpt/wptError之第一引數須為WPT_字面值')
        assert.strict.ok(nCall >= 27, `呼叫數異常: ${nCall}`)
    })

})


describe('cleanFolderStrict之錯誤訊息(規則帳本R19④)', function() {

    this.timeout(180000)

    let fdT = path.resolve('./test/_tmp/rejectShape-clean')

    let mkErr = (code, msg, extra = {}) => {
        let e = new Error(msg || `${code}: simulated`)
        if (code !== undefined) {
            e.code = code
        }
        return Object.assign(e, extra)
    }

    //strictOf: 以假w執行cleanFolderStrict(fsCleanFolder每次回傳{ error: err }或字串), 回傳{ ok, e }
    let strictOf = (error, fd, opt = { retries: 2, delay: 1 }) => {
        let calls = 0
        let w = {
            fsCleanFolder: () => {
                calls++
                return { error }
            },
        }
        let r = throwsOf(() => cleanFolderStrict(w, fd, opt))
        return { ...r, calls }
    }

    before(function() {
        fs.rmSync(fdT, { recursive: true, force: true })
        fs.mkdirSync(fdT, { recursive: true })
    })

    after(function() {
        fs.rmSync(fdT, { recursive: true, force: true })
    })

    it('Error: 以絕對路徑、code、syscall、attempts組成, 帶WPT_CLEAN_FOLDER碼, cause為原錯誤', function() {
        let err = mkErr('EBUSY', 'EBUSY: resource busy', { syscall: 'rmdir' })
        let fd = './test/_tmp/rejectShape-clean/dist'
        let r = strictOf(err, fd)
        assert.strict.deepStrictEqual(r.ok, false)
        assert.strict.deepStrictEqual(r.calls, 3)
        assertShape(r.e, 'WPT_CLEAN_FOLDER', `can not clean folder[${path.resolve(fd)}]: code[EBUSY] syscall[rmdir] attempts[3]`, 'EBUSY')
        assert.strict.deepStrictEqual(r.e.cause, err)
    })

    it('Error無syscall則省略該段; 不重試之錯誤attempts為1', function() {
        let err = mkErr('EACCES', 'EACCES: denied')
        let fd = './test/_tmp/rejectShape-clean/dist'
        let r = strictOf(err, fd)
        assert.strict.deepStrictEqual(r.calls, 1)
        assertShape(r.e, 'WPT_CLEAN_FOLDER', `can not clean folder[${path.resolve(fd)}]: code[EACCES] attempts[1]`, 'EACCES')
    })

    it('Error無code(非fs錯誤, 如wsemi內部之TypeError)則以name與message代之(其message不含fs路徑亂碼)', function() {
        let err = mkErr(undefined, 'boom')
        let fd = './test/_tmp/rejectShape-clean/dist'
        let r = strictOf(err, fd)
        assertShape(r.e, 'WPT_CLEAN_FOLDER', `can not clean folder[${path.resolve(fd)}]: Error: boom attempts[1]`, '無code')
        assert.strict.deepStrictEqual(r.e.cause, err)
    })

    it('原錯誤之message與path為亂碼(Windows ANSI碼頁): 訊息不引用之', function() {
        let garbled = 'EPERM, Permission denied: \\\\?\\C:\\opensrc\\¶}·½-JS-001\\dist\\sub \'\\\\?\\C:\\opensrc\\\uFFFD}\uFFFD\uFFFD-JS-001\\dist\\sub\''
        let err = mkErr('EPERM', garbled, { syscall: 'rm', errno: 1, path: '\\\\?\\C:\\opensrc\\\uFFFD}\uFFFD\uFFFD-JS-001\\dist\\sub' })
        let fd = './test/_tmp/rejectShape-clean/開源-dist'
        let r = strictOf(err, fd)
        assertShape(r.e, 'WPT_CLEAN_FOLDER', `can not clean folder[${path.resolve(fd)}]: code[EPERM] syscall[rm] attempts[3]`, '亂碼')
        assert.strict.ok(!r.e.message.includes('¶}') && !r.e.message.includes('\uFFFD') && !r.e.message.includes('Permission denied'), r.e.message)
        assert.strict.ok(r.e.message.includes('開源-dist'), '已知之路徑須完整保留非ASCII字元')
        assert.strict.deepStrictEqual(r.e.cause, err)
    })

    it('wsemip以字串回報(如目標為檔案): 訊息帶該字串, cause為該字串', function() {
        let fd = './test/_tmp/rejectShape-clean/aFile.txt'
        let r = strictOf('input path is not a folder', fd)
        assert.strict.deepStrictEqual(r.calls, 1)
        assertShape(r.e, 'WPT_CLEAN_FOLDER', `can not clean folder[${path.resolve(fd)}]: input path is not a folder`, '字串')
        assert.strict.deepStrictEqual(r.e.cause, 'input path is not a folder')
    })

    it('輸入檢查失敗(非字串、空字串、根目錄、連結)亦為帶碼Error, 括號內為絕對路徑或String(fd)', function() {
        let w = { fsCleanFolder: () => ({ success: 'x' }) }
        let cases = [
            [undefined, 'can not clean folder[undefined]: path must be a non-empty string'],
            ['', 'can not clean folder[]: path must be a non-empty string'],
            [null, 'can not clean folder[null]: path must be a non-empty string'],
        ]
        for (let [fd, msg] of cases) {
            let r = throwsOf(() => cleanFolderStrict(w, fd))
            assert.strict.deepStrictEqual(r.ok, false)
            assertShape(r.e, 'WPT_CLEAN_FOLDER', msg, `fd[${fd}]`)
        }
        let root = path.parse(process.cwd()).root
        let r1 = throwsOf(() => cleanFolderStrict(w, root))
        assertShape(r1.e, 'WPT_CLEAN_FOLDER', new RegExp(`^can not clean folder\\[${root.replace(/\\/g, '\\\\')}\\]: refuse to clean the filesystem root`), '根目錄')
        let tgt = path.resolve(fdT, 'link-target')
        fs.mkdirSync(tgt, { recursive: true })
        let lk = path.resolve(fdT, 'a-link')
        fs.symlinkSync(tgt, lk, 'junction')
        let r2 = throwsOf(() => cleanFolderStrict(w, path.relative(process.cwd(), lk)))
        assertShape(r2.e, 'WPT_CLEAN_FOLDER', `can not clean folder[${lk}]: target is a symbolic link or junction, not a folder`, '連結')
    })

    //前置lstat檢查(目標已存在與否): 非ENOENT之錯誤亦須為帶碼Error(原樣拋出原始fs錯誤則無WPT碼、無絕對路徑格式; POSIX下上層為檔案之lstat為ENOTDIR, 專案CI為ubuntu)
    it('前置lstat檢查失敗(ENOTDIR、EACCES等非ENOENT)亦為帶碼Error, 帶code與syscall、cause為原錯誤, 且不呼叫w', function() {
        let target = './test/_tmp/rejectShape-clean/lst/sub'
        let abs = path.resolve(target)
        let real = fs.lstatSync
        for (let code of ['ENOTDIR', 'EACCES', 'EPERM']) {
            let err = mkErr(code, `${code}: injected, lstat '${abs}'`, { syscall: 'lstat' })
            let calls = 0
            let w = {
                fsCleanFolder: () => {
                    calls++
                    return { success: 'x' }
                },
            }
            fs.lstatSync = function(p, ...rest) {
                if (typeof p === 'string' && path.resolve(p) === abs) {
                    throw err
                }
                return real.call(fs, p, ...rest)
            }
            let r
            try {
                r = throwsOf(() => cleanFolderStrict(w, target))
            }
            finally {
                fs.lstatSync = real
            }
            assert.strict.deepStrictEqual(r.ok, false, code)
            assertShape(r.e, 'WPT_CLEAN_FOLDER', `can not clean folder[${abs}]: code[${code}] syscall[lstat]`, `lstat ${code}`)
            assert.strict.deepStrictEqual(r.e.cause, err)
            assert.strict.deepStrictEqual(calls, 0, '前置檢查失敗不得呼叫w.fsCleanFolder')
        }
    })

    it('路徑含NUL(真實lstat拋ERR_INVALID_ARG_VALUE)與無原型物件之輸入: 亦為帶碼Error, 格式化不因轉字串而先拋錯', function() {
        let w = { fsCleanFolder: () => ({ success: 'x' }) }
        let r1 = throwsOf(() => cleanFolderStrict(w, 'a\0b'))
        assert.strict.deepStrictEqual(r1.ok, false)
        assertShape(r1.e, 'WPT_CLEAN_FOLDER', /^can not clean folder\[.+\]: code\[ERR_INVALID_ARG_VALUE\]/, 'NUL')
        assert.strict.ok(r1.e.cause instanceof Error)
        let r2 = throwsOf(() => cleanFolderStrict(w, Object.create(null)))
        assert.strict.deepStrictEqual(r2.ok, false)
        assertShape(r2.e, 'WPT_CLEAN_FOLDER', 'can not clean folder[[object Object]]: path must be a non-empty string', '無原型物件')
    })

    it('Windows: 磁碟機代號或目錄名稱之大小寫別名不得繞過cwd與其上層之保護(檔案系統不分大小寫)', function() {
        if (process.platform !== 'win32') {
            this.skip() //POSIX之檔案系統分大小寫, 不同大小寫為不同目錄
        }
        let calls = 0
        let w = {
            fsCleanFolder: () => {
                calls++
                return { success: 'x' }
            },
        }
        let cwd = process.cwd()
        let anc = path.dirname(cwd)
        for (let [nm, p] of [['cwd全小寫', cwd.toLowerCase()], ['cwd全大寫', cwd.toUpperCase()], ['上層全小寫', anc.toLowerCase()], ['磁碟機代號改小寫', cwd.replace(/^[A-Z]:/, (m) => m.toLowerCase())], ['根目錄小寫', path.parse(cwd).root.toLowerCase()]]) {
            let r = throwsOf(() => cleanFolderStrict(w, p))
            assert.strict.deepStrictEqual(r.ok, false, `${nm}[${p}]未拒絕`)
            assertShape(r.e, 'WPT_CLEAN_FOLDER', /refuse to clean the filesystem root, the current working directory or its ancestor/, nm)
        }
        assert.strict.deepStrictEqual(calls, 0, '被拒絕者不得呼叫w.fsCleanFolder')
    })

    it('Windows實測: 路徑含非ASCII且子資料夾被占用 → rollupFiles reject之訊息含正確絕對路徑與EPERM, 無亂碼(建議書之重現法)', async function() {
        if (process.platform !== 'win32') {
            this.skip() //POSIX可刪除被行程作為工作目錄之資料夾, 無法以此方式製造EPERM
        }
        let fdSrc = path.resolve(fdT, 'src')
        fs.mkdirSync(fdSrc, { recursive: true })
        fs.writeFileSync(path.resolve(fdSrc, 'fxA.mjs'), `export default function fxA() { return 1 }\n`, 'utf8')
        let fdTar = path.resolve(fdT, '開源-清空', 'dist')
        fs.mkdirSync(path.resolve(fdTar, 'sub'), { recursive: true })
        fs.writeFileSync(path.resolve(fdTar, 'zz-stale.js'), 'stale')
        let cp = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 20000)'], { cwd: path.resolve(fdTar, 'sub'), stdio: 'ignore', windowsHide: true })
        let exited = new Promise((resolve) => cp.on('exit', resolve))
        await new Promise((resolve) => cp.on('spawn', resolve))
        await new Promise((resolve) => setTimeout(resolve, 300))
        let r
        try {
            r = await rejOf(() => rollupFiles({ fns: 'fxA.mjs', fdSrc, fdTar: path.relative(process.cwd(), fdTar), bLog: false }))
        }
        finally {
            cp.kill()
            await exited
        }
        assert.strict.deepStrictEqual(r.ok, false, '被占用時應reject')
        //斷言形狀而非Node實作細節(syscall為rm、碼為EPERM是Node 24之C++版rmSync; 其他版本可能為rmdir/unlink、EBUSY/ENOTEMPTY), 三者皆屬重試集合故attempts為11
        assertShape(r.e, 'WPT_CLEAN_FOLDER', new RegExp(`^can not clean folder\\[${fdTar.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}\\]: code\\[(EPERM|EBUSY|ENOTEMPTY)\\] syscall\\[\\w+\\] attempts\\[11\\]$`), '實測')
        assert.strict.ok(!/\uFFFD|¶}/.test(r.e.message), r.e.message)
        assert.strict.ok(r.e.cause instanceof Error && r.e.cause.code === 'EPERM', 'cause須保留原錯誤')
        assert.strict.deepStrictEqual(fs.existsSync(path.resolve(fdTar, 'fxA.umd.js')), false, '清空失敗不得續行建置')
    })

})
