import path from 'path'
import fs from 'fs'
import assert from 'assert'
import w from '../src/wsemip.umd.js'
import { cleanFolderStrict } from '../src/buildCheck.mjs'
import getFiles from '../src/getFiles.mjs'


//本檔守的是「本套件對內附wsemip(src/wsemip.umd.js)之依賴」, 站點全集與逐站判定見規則帳本R18〈wsemip版本敏感站點〉;
//升級內附之wsemip時, 本檔紅燈處即為須逐站重新評估之處(wsemip 1.9.16→1.9.17之評估見帳本破壞性變更紀錄)

let msgOf = (e) => String((e && e.message) || e)

let mkErr = (code, msg) => {
    let e = new Error(msg || `${code}: simulated`)
    e.code = code
    return e
}

//mkW: 假之w, fsCleanFolder依序執行steps(每步為{ ret }或{ throw }, 用盡後重複最後一步), calls記錄呼叫次數
let mkW = (steps) => {
    let o = { calls: 0 }
    o.fsCleanFolder = () => {
        let s = steps[Math.min(o.calls, steps.length - 1)]
        o.calls += 1
        if ('throw' in s) {
            throw s.throw
        }
        return s.ret
    }
    return o
}

//strictOf: 執行cleanFolderStrict, 回傳{ ok, v, e, calls }
let strictOf = (steps, fd) => {
    let ww = mkW(steps)
    try {
        let v = cleanFolderStrict(ww, fd, { retries: 2, delay: 1 })
        return { ok: true, v, calls: ww.calls }
    }
    catch (e) {
        return { ok: false, e, calls: ww.calls }
    }
}

//withLstatFail: 於fn執行期間令fs.lstatSync對target拋出指定code之錯誤(同步執行, 結束必還原), 模擬競態或權限錯誤
let withLstatFail = (target, code, fn) => {
    let real = fs.lstatSync
    let abs = path.resolve(target)
    fs.lstatSync = function(p, ...rest) {
        if (typeof p === 'string' && path.resolve(p) === abs) {
            throw mkErr(code, `${code}: injected, lstat '${p}'`)
        }
        return real.call(fs, p, ...rest)
    }
    try {
        return fn()
    }
    finally {
        fs.lstatSync = real
    }
}


describe('內附wsemip之契約守門(規則帳本R18、wsemip版本敏感站點)', function() {

    let fdTmp = './test/_tmp/wsemipContract'
    let fdTarget = `${fdTmp}/target`

    beforeEach(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fs.mkdirSync(fdTarget, { recursive: true })
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    describe('buildCheck.mjs cleanFolderStrict對w.fsCleanFolder之判定(站點:buildCheck.mjs之w.fsCleanFolder呼叫)', function() {

        let fd = `${fdTmp}/to-clean`
        //兩種錯誤形狀: 回傳{ error }(1.9.17起前置檢查亦如此)、直接拋出(1.9.16之前置檢查)
        let shapes = [
            ['回傳{ error }', (e) => ({ ret: { error: e } })],
            ['直接拋出', (e) => ({ throw: e })],
        ]

        for (let [nm, mk] of shapes) {

            it(`${nm}: 暫時性錯誤(EBUSY、EPERM、ENOTEMPTY、ENOENT)重試後成功`, function() {
                for (let code of ['EBUSY', 'EPERM', 'ENOTEMPTY', 'ENOENT']) {
                    let r = strictOf([mk(mkErr(code)), mk(mkErr(code)), { ret: { success: 'done' } }], fd)
                    //R18①: 以EBUSY、EPERM、ENOTEMPTY、ENOENT重試(共11次嘗試), 成功回傳{ success }
                    assert.strict.deepStrictEqual(r.ok, true, `code[${code}]: ${msgOf(r.e)}`)
                    assert.strict.deepStrictEqual(r.v, { success: 'done' })
                    assert.strict.deepStrictEqual(r.calls, 3, `code[${code}]`)
                }
            })

            it(`${nm}: 暫時性錯誤持續 → 重試耗盡後拋「can not clean folder[路徑]: 原因」且cause為原錯誤`, function() {
                let err = mkErr('EBUSY', 'EBUSY: resource busy')
                let r = strictOf([mk(err)], fd)
                //R18①: 最終拋can not clean folder[<fd>]: <原因>, cause為原錯誤; retries=2即共3次嘗試
                assert.strict.deepStrictEqual(r.ok, false)
                assert.strict.deepStrictEqual(r.calls, 3)
                assert.strict.deepStrictEqual(msgOf(r.e), `can not clean folder[${fd}]: EBUSY: resource busy`)
                assert.strict.deepStrictEqual(r.e.cause, err)
            })

            it(`${nm}: 其他錯誤(EACCES、EIO)不重試, 立即拋錯`, function() {
                for (let code of ['EACCES', 'EIO']) {
                    let err = mkErr(code, `${code}: denied`)
                    let r = strictOf([mk(err)], fd)
                    //R18①: 其他錯誤不重試(EACCES等權限錯誤不重試)
                    assert.strict.deepStrictEqual(r.ok, false, code)
                    assert.strict.deepStrictEqual(r.calls, 1, code)
                    assert.strict.deepStrictEqual(msgOf(r.e), `can not clean folder[${fd}]: ${code}: denied`)
                    assert.strict.deepStrictEqual(r.e.cause, err)
                }
            })
        }

        it('回傳{ error: 說明字串 }(如目標非資料夾)不重試, 訊息帶該字串', function() {
            let r = strictOf([{ ret: { error: 'input path is not a folder' } }], fd)
            //R18①: 非success之回傳依錯誤碼處置, 無code之字串不重試
            assert.strict.deepStrictEqual(r.ok, false)
            assert.strict.deepStrictEqual(r.calls, 1)
            assert.strict.deepStrictEqual(msgOf(r.e), `can not clean folder[${fd}]: input path is not a folder`)
            assert.strict.deepStrictEqual(r.e.cause, 'input path is not a folder')
        })
    })

    describe('w.fsCleanFolder(內附wsemip之實際行為)', function() {

        it('不存在則建立並回傳{ success }; 清空後資料夾存在且為空', function() {
            let fd = `${fdTmp}/new/deep`
            let r = w.fsCleanFolder(fd)
            //R18①: 清空資料夾(不存在則建立), 成功回傳{ success }
            assert.strict.ok(typeof r.success === 'string' && r.success.length > 0, JSON.stringify(r))
            assert.strict.deepStrictEqual(r.error, undefined)
            assert.strict.deepStrictEqual(fs.readdirSync(fd), [])
        })

        it('目標為檔案 → 回傳{ error: 非空說明字串 }, 不拋錯、不動檔案', function() {
            let fp = `${fdTmp}/f.txt`
            fs.writeFileSync(fp, 'x')
            let r = w.fsCleanFolder(fp)
            //R18①: 目標為檔案即失敗(由cleanFolderStrict轉為拋錯); 失敗一律回傳{ error }且error為truthy
            assert.strict.ok(typeof r.error === 'string' && r.error.length > 0, JSON.stringify(r))
            assert.strict.deepStrictEqual(r.success, undefined)
            assert.strict.deepStrictEqual(fs.readFileSync(fp, 'utf8'), 'x')
        })

        it('上層為檔案(無法建立) → 回傳{ error }, error為保有字串code之Error物件(cleanFolderStrict依code分流)', function() {
            let fp = `${fdTmp}/f2.txt`
            fs.writeFileSync(fp, 'x')
            let r = w.fsCleanFolder(`${fp}/sub`)
            //R18①: 依錯誤碼處置, 故系統錯誤須以保有code之Error物件回傳(不可被轉為字串而失去code)
            assert.strict.ok(r.error instanceof Error, JSON.stringify(r))
            assert.strict.ok(typeof r.error.code === 'string' && r.error.code.length > 0, `code[${r.error.code}]`)
        })

        it('前置檢查(lstat)失敗 → 不同步拋出, 回傳{ error: 保有code之Error物件 }(wsemip 1.9.17起; 1.9.16為同步拋出)', function() {
            let fd = `${fdTmp}/existing`
            fs.mkdirSync(fd)
            for (let code of ['EBUSY', 'EACCES']) {
                let r = null
                let thrown = null
                try {
                    r = withLstatFail(fd, code, () => w.fsCleanFolder(fd))
                }
                catch (e) {
                    thrown = e
                }
                //R18①: 清空前之檢查亦以{ error }回報, 與其他失敗出口一致(cleanFolderStrict兩種形狀皆接, 本條守的是wsemip端之契約)
                assert.strict.deepStrictEqual(thrown, null, `code[${code}] 同步拋出: ${msgOf(thrown)}`)
                assert.strict.ok(r.error instanceof Error && r.error.code === code, JSON.stringify(r))
            }
        })
    })

    describe('w.fsCreateFolder(站點:rollupFile.mjs fdTar建立、rollupVueToHtml.mjs fdTar建立; 兩處皆不取用回傳值, 失敗改由後續檢查判定)', function() {

        it('不存在則建立(含多層)並回傳{ success }; 已存在之資料夾亦為success', function() {
            let fd = `${fdTmp}/a/b/c`
            let r1 = w.fsCreateFolder(fd)
            //R14: fdTar給定即為寫檔模式, 資料夾不存在則建立
            assert.strict.ok(typeof r1.success === 'string', JSON.stringify(r1))
            assert.strict.deepStrictEqual(fs.statSync(fd).isDirectory(), true)
            let r2 = w.fsCreateFolder(fd)
            assert.strict.ok(typeof r2.success === 'string', JSON.stringify(r2))
        })

        it('目標為檔案或上層為檔案 → 回傳{ error }不拋錯(rollupFile.mjs註解:失敗時不拋錯, 由fsIsFolder判定)', function() {
            let fp = `${fdTmp}/f3.txt`
            fs.writeFileSync(fp, 'x')
            for (let target of [fp, `${fp}/sub`]) {
                let r = null
                let thrown = null
                try {
                    r = w.fsCreateFolder(target)
                }
                catch (e) {
                    thrown = e
                }
                //R14: fdTar為檔案或無法建立 → 由下方fsIsFolder檢查reject, 故此處須不拋錯且回傳error
                assert.strict.deepStrictEqual(thrown, null, `target[${target}] 同步拋出: ${msgOf(thrown)}`)
                assert.strict.ok(r.error, JSON.stringify(r))
                assert.strict.deepStrictEqual(w.fsIsFolder(target), false)
            }
        })

        it('前置檢查(lstat)失敗 → 不同步拋出, 回傳{ error }(wsemip 1.9.17起; 1.9.16為同步拋出)', function() {
            let fd = `${fdTmp}/existing2`
            fs.mkdirSync(fd)
            let r = null
            let thrown = null
            try {
                r = withLstatFail(fd, 'EACCES', () => w.fsCreateFolder(fd))
            }
            catch (e) {
                thrown = e
            }
            //R14: 同上, 此處之註解「失敗時不拋錯(回傳error物件)」於前置檢查失敗時亦須成立
            assert.strict.deepStrictEqual(thrown, null, `同步拋出: ${msgOf(thrown)}`)
            assert.strict.ok(r.error instanceof Error && r.error.code === 'EACCES', JSON.stringify(r))
        })
    })

    describe('getFiles.mjs之w.fsGetFilesInFolder', function() {

        it('回傳第一層檔案之檔名陣列; 目標非資料夾同步拋出', function() {
            let fd = `${fdTmp}/gf`
            fs.mkdirSync(`${fd}/sub`, { recursive: true })
            fs.writeFileSync(`${fd}/a.txt`, 'a')
            fs.writeFileSync(`${fd}/sub/b.txt`, 'b')
            //getFiles註解: 給各專案處理使用, 回傳檔名陣列(levelLimit預設1, 只第一層)
            assert.strict.deepStrictEqual(getFiles(fd), ['a.txt'])
            let items = w.fsGetFilesInFolder(fd)
            assert.strict.deepStrictEqual(items.map((v) => [v.level, v.name]), [[1, 'a.txt']])
            assert.strict.ok(typeof items[0].path === 'string' && path.basename(items[0].path) === 'a.txt')
            let r = null
            try {
                getFiles(`${fd}/a.txt`)
            }
            catch (e) {
                r = e
            }
            assert.strict.ok(r instanceof Error && /is not a folder/.test(r.message), msgOf(r))
        })
    })

    describe('rollupFiles.mjs之w.pmSeries與w.isestr', function() {

        it('pmSeries: 依序執行、結果依序、任一reject即以原值reject且不再執行後續', async function() {
            let log = []
            let fun = async (x) => {
                log.push(x)
                await new Promise((resolve) => setTimeout(resolve, 5))
                return `${x}!`
            }
            //R9: rollupFiles以pmSeries循序產製, 建置錯誤原樣往外拋(呼叫端才能中止後續產製)
            assert.strict.deepStrictEqual(await w.pmSeries(['a', 'b', 'c'], fun), ['a!', 'b!', 'c!'])
            assert.strict.deepStrictEqual(log, ['a', 'b', 'c'])
            log = []
            let err = new Error('stop at b')
            let rej = await w.pmSeries(['a', 'b', 'c'], (x) => {
                log.push(x)
                return x === 'b' ? Promise.reject(err) : x
            }).then(() => null, (e) => e)
            assert.strict.deepStrictEqual(rej, err)
            assert.strict.deepStrictEqual(log, ['a', 'b'])
        })

        it('isestr: 非空字串為true; 空字串與非字串為false(各產製API以之判定opt之字串選項)', function() {
            //R14/R15: opt.fdTar、fpSrc、name等字串選項「給了才生效」, 空字串視同未給
            for (let v of ['a', ' ', 'abc', './x']) {
                assert.strict.deepStrictEqual(w.isestr(v), true, JSON.stringify(v))
            }
            for (let v of ['', null, undefined, 0, 1, true, [], ['a'], {}, { a: 1 }, () => 'a']) {
                assert.strict.deepStrictEqual(w.isestr(v), false, String(v))
            }
        })
    })
})
