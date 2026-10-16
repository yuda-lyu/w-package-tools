import path from 'path'
import fs from 'fs'
import assert from 'assert'
import { spawn, spawnSync } from 'child_process'
import { pathToFileURL } from 'url'
import cleanFolder from '../src/cleanFolder.mjs'
import rollupFiles from '../src/rollupFiles.mjs'


let msgOf = (e) => String((e && e.message) || e)
let sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

//throwsOf: 執行同步函數, 回傳{ thrown, e, v, ms }
let throwsOf = (fn) => {
    let t0 = Date.now()
    try {
        let v = fn()
        return { thrown: false, v, ms: Date.now() - t0 }
    }
    catch (e) {
        return { thrown: true, e, ms: Date.now() - t0 }
    }
}

//hold: 以子程序把工作目錄設在fd(Windows下被行程作為工作目錄之資料夾無法刪除), 子程序於msLife後自行結束; 回傳{ cp, exited }
let hold = async (fd, msLife) => {
    let cp = spawn(process.execPath, ['-e', `setTimeout(() => {}, ${msLife})`], { cwd: fd, stdio: 'ignore', windowsHide: true })
    let exited = new Promise((resolve) => cp.on('exit', resolve))
    await new Promise((resolve) => cp.on('spawn', resolve))
    await sleep(300) //子程序啟動並取得工作目錄
    return { cp, exited }
}


describe('清空資料夾失敗即錯誤(規則帳本R18)', function() {

    let fdTmp = './test/_tmp/cleanFolder'

    beforeEach(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
        fs.mkdirSync(fdTmp, { recursive: true })
    })

    after(function() {
        fs.rmSync(fdTmp, { recursive: true, force: true })
    })

    it('cleanFolder: 不存在則建立且回傳success; 既有資料夾清空', function() {
        let fd = `${fdTmp}/a-new`
        let r = throwsOf(() => cleanFolder(fd))
        //R18: 清空資料夾(不存在則建立), 成功回傳{ success }
        assert.strict.deepStrictEqual(r.thrown, false, r.e && msgOf(r.e))
        assert.strict.ok(r.v && r.v.success !== undefined)
        assert.strict.deepStrictEqual(fs.readdirSync(fd), [])
        fs.mkdirSync(`${fd}/sub/deep`, { recursive: true })
        fs.writeFileSync(`${fd}/sub/deep/x.txt`, 'x')
        fs.writeFileSync(`${fd}/y.txt`, 'y')
        cleanFolder(fd)
        assert.strict.deepStrictEqual(fs.readdirSync(fd), [])
    })

    it('cleanFolder: 目標為檔案、上層為檔案、未給路徑即拋錯(訊息含路徑)', function() {
        let fp = `${fdTmp}/b-file.txt`
        fs.writeFileSync(fp, 'x')
        for (let target of [fp, `${fp}/sub`, undefined]) {
            let r = throwsOf(() => cleanFolder(target))
            //R18: 目標為檔案、無法建立即拋錯
            assert.strict.deepStrictEqual(r.thrown, true, `target[${target}] 未拋錯`)
            //R19④: 括號內為絕對路徑(輸入非字串時為String(fd))
            let shown = typeof target === 'string' ? path.resolve(target) : String(target)
            assert.strict.ok(msgOf(r.e).includes(`can not clean folder[${shown}]`), msgOf(r.e))
        }
        assert.strict.deepStrictEqual(fs.readFileSync(fp, 'utf8'), 'x', '目標檔案不得被改動')
    })

    it('cleanFolder: 拒絕清空根目錄、cwd與其上層、目標本身為連結(不清空也不動其內容)', function() {
        let fdCwd = process.cwd()
        for (let target of [path.parse(fdCwd).root, '/', '.', '..', fdCwd]) {
            let r = throwsOf(() => cleanFolder(target))
            //R18: 由錯誤路徑算出根目錄或cwd時不得清空(rollupVueToHtml之tar無資料夾部分即得'/')
            assert.strict.deepStrictEqual(r.thrown, true, `target[${target}] 未拋錯`)
            assert.strict.ok(msgOf(r.e).includes('refuse to clean'), msgOf(r.e))
        }
        assert.strict.ok(fs.existsSync('./package.json'), 'cwd內容不得被動')
        let tgt = path.resolve(fdTmp, 'link-target')
        fs.mkdirSync(tgt)
        fs.writeFileSync(`${tgt}/keep.txt`, 'k')
        let lk = path.resolve(fdTmp, 'a-link')
        fs.symlinkSync(tgt, lk, 'junction')
        let r = throwsOf(() => cleanFolder(lk))
        //R18: 目標本身為連結即拋錯, 不跟隨
        assert.strict.deepStrictEqual(r.thrown, true)
        assert.strict.ok(msgOf(r.e).includes('symbolic link or junction'), msgOf(r.e))
        assert.strict.deepStrictEqual(fs.readdirSync(tgt), ['keep.txt'])
    })

    it('cleanFolder: 多個程序並發清空同一資料夾皆成功(項目已被他方刪除之ENOENT以重試吸收)', async function() {
        this.timeout(120000)
        let fd = path.resolve(fdTmp, 'c-concurrent')
        for (let i = 0; i < 20; i++) {
            fs.mkdirSync(`${fd}/d${i}`, { recursive: true })
            for (let j = 0; j < 100; j++) {
                fs.writeFileSync(`${fd}/d${i}/f${j}.txt`, 'x')
            }
        }
        for (let j = 0; j < 500; j++) {
            fs.writeFileSync(`${fd}/g${j}.txt`, 'x')
        }
        let fpScript = path.resolve(fdTmp, 'cleanConcurrent.mjs')
        fs.writeFileSync(fpScript, `import cleanFolder from ${JSON.stringify(pathToFileURL(path.resolve('./src/cleanFolder.mjs')).href)}\ncleanFolder(${JSON.stringify(fd)})\n`, 'utf8')
        let cps = [0, 1, 2].map(() => spawn(process.execPath, [fpScript], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }))
        let res = await Promise.all(cps.map((cp) => new Promise((resolve) => {
            let se = ''
            cp.stderr.on('data', (d) => {
                se += d
            })
            cp.on('exit', (code) => resolve({ code, se }))
        })))
        //R18: 並發清空時項目已被他方刪除屬暫時性, 不得使建置失敗
        assert.strict.deepStrictEqual(res.map((r) => r.code), [0, 0, 0], JSON.stringify(res.map((r) => r.se.slice(0, 200))))
        assert.strict.deepStrictEqual(fs.readdirSync(fd), [])
    })

    it('cleanFolder: 內含懸空之連結(junction)只移除連結本身, 照常清空', function() {
        let fd = `${fdTmp}/e-dangling`
        let tgt = path.resolve(fdTmp, 'e-target')
        fs.mkdirSync(fd, { recursive: true })
        fs.mkdirSync(tgt)
        fs.symlinkSync(tgt, path.resolve(fd, 'a-link'), 'junction')
        fs.writeFileSync(`${fd}/zz-stale.js`, 'stale')
        fs.rmSync(tgt, { recursive: true, force: true })
        let r = throwsOf(() => cleanFolder(fd))
        //R18: 資料夾內之連結只移除連結本身(含目標已不存在者), 不中斷清空
        assert.strict.deepStrictEqual(r.thrown, false, r.e && msgOf(r.e))
        assert.strict.deepStrictEqual(fs.readdirSync(fd), [])
    })

    it('cleanFolder(Windows): 子資料夾持續被占用 → 重試後拋錯(歷時約10×300ms); 占用中途解除 → 重試後成功', async function() {
        if (process.platform !== 'win32') {
            this.skip() //POSIX可刪除被行程作為工作目錄之資料夾, 無法以此方式製造占用
        }
        this.timeout(30000)
        let fd = `${fdTmp}/d-busy`
        fs.mkdirSync(`${fd}/sub`, { recursive: true })
        fs.writeFileSync(`${fd}/zz-stale.js`, 'stale')
        let h = await hold(path.resolve(fd, 'sub'), 20000)
        let r = throwsOf(() => cleanFolder(fd))
        h.cp.kill()
        await h.exited
        //R18: 項目被占用經重試(10次、間隔300ms)後仍失敗即拋錯
        assert.strict.deepStrictEqual(r.thrown, true)
        assert.strict.ok(/EPERM|EBUSY/.test(msgOf(r.e)), msgOf(r.e))
        assert.strict.ok(r.ms >= 2500, `歷時${r.ms}ms, 未見重試`)

        fs.mkdirSync(`${fd}/sub`, { recursive: true })
        let h2 = await hold(path.resolve(fd, 'sub'), 600) //子程序約0.6秒後自行結束(清空為同步, 期間本行程之計時器不會觸發)
        let r2 = throwsOf(() => cleanFolder(fd))
        await h2.exited
        //R18: 暫時性占用以重試吸收
        assert.strict.deepStrictEqual(r2.thrown, false, r2.e && msgOf(r2.e))
        assert.strict.ok(r2.ms >= 250, `歷時${r2.ms}ms, 未經重試即成功(占用未生效)`)
        assert.strict.deepStrictEqual(fs.readdirSync(fd), [])
    })

    it('呼叫端(同各套件toolg/cleanFolder.mjs之裸呼叫): 目標為檔案時程序以離開碼1結束', function() {
        let fp = path.resolve(fdTmp, 'i-file.txt')
        fs.writeFileSync(fp, 'x')
        let fpScript = path.resolve(fdTmp, 'toolgCleanFolder.mjs')
        fs.writeFileSync(fpScript, `import cleanFolder from ${JSON.stringify(pathToFileURL(path.resolve('./src/cleanFolder.mjs')).href)}\ncleanFolder(${JSON.stringify(fp)})\n`, 'utf8')
        let sp = spawnSync(process.execPath, [fpScript], { encoding: 'utf8', timeout: 60000 })
        //R18: 拋錯即未捕捉例外, 裸呼叫之建置腳本以非0結束
        assert.strict.deepStrictEqual(sp.status, 1, sp.stderr)
        assert.strict.ok(sp.stderr.includes('can not clean folder'), sp.stderr)
    })

    it('rollupFiles: 給定fdTar而清空失敗(為檔案; Windows另測被占用)即reject且不建置', async function() {
        let fdSrc = `${fdTmp}/src`
        fs.mkdirSync(fdSrc, { recursive: true })
        fs.writeFileSync(`${fdSrc}/fxA.mjs`, `export default function fxA() { return 1 }\n`, 'utf8')
        let fp = `${fdTmp}/out-file.txt`
        fs.writeFileSync(fp, 'x')
        let e1 = await rollupFiles({ fns: 'fxA.mjs', fdSrc, fdTar: fp, bLog: false }).then(() => null, (e) => e)
        //R18: rollupFiles給定fdTar時先清空, 清空失敗即reject
        assert.strict.ok(e1 && msgOf(e1).includes('can not clean folder'), msgOf(e1))
        if (process.platform === 'win32') {
            let fdT = `${fdTmp}/out-busy`
            fs.mkdirSync(`${fdT}/sub`, { recursive: true })
            fs.writeFileSync(`${fdT}/zz-stale.js`, 'stale')
            let h = await hold(path.resolve(fdT, 'sub'), 20000)
            let e2 = await rollupFiles({ fns: 'fxA.mjs', fdSrc, fdTar: fdT, bLog: false }).then(() => null, (e) => e)
            h.cp.kill()
            await h.exited
            //R18: 清空失敗不續行建置(不得產出而與殘留舊檔並存)
            assert.strict.ok(e2 && /EPERM|EBUSY/.test(msgOf(e2)), msgOf(e2))
            assert.strict.deepStrictEqual(fs.existsSync(`${fdT}/fxA.umd.js`), false)
        }
    })

})
