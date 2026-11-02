import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { spawnSync } from 'child_process'
import genDocsDist from '../src/genDocsDist.mjs'


//規則帳本R24: genDocsDist, 把./dist/全部(含子資料夾與.map)複製到./docs/dist/, 依循genDocsExams複製examples至docs/examples之方式;
//規格: 自有套件之瀏覽器端取用與gh-pages 規則1(dist不存在或為空即報錯、docs/dist/須含.map)、自有套件之發布與建置腳本 規則4;
//以暫存夾內之假套件驗證, 不碰任何真實專案

let root = path.resolve('./test/_tmp/genDocsDist')
let seq = 0

let put = (dir, rel, c) => {
    let fp = path.join(dir, rel)
    fs.mkdirSync(path.dirname(fp), { recursive: true })
    fs.writeFileSync(fp, c)
}
let get = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')
let has = (dir, rel) => fs.existsSync(path.join(dir, rel))

//mkCase: 建立假套件資料夾, files為{ 相對路徑: 字串或Buffer }
let mkCase = (files = {}) => {
    let dir = path.join(root, `c${++seq}`)
    fs.mkdirSync(dir, { recursive: true })
    for (let [rel, c] of Object.entries(files)) {
        put(dir, rel, c)
    }
    return dir
}

//O: 路徑指向假套件資料夾之絕對路徑, 不印主控台
let O = (dir, extra = {}) => ({
    fdDist: path.join(dir, 'dist'),
    fdTar: path.join(dir, 'docs/dist'),
    bLog: false,
    ...extra,
})

let throwsOf = (fn) => {
    try {
        return { thrown: false, v: fn() }
    }
    catch (e) {
        return { thrown: true, e }
    }
}

let capture = (fn) => {
    let lines = []
    let old = console.log
    console.log = (...a) => {
        lines.push(a.join(' '))
    }
    try {
        let v = fn()
        return { v, lines }
    }
    finally {
        console.log = old
    }
}

//資料夾內全部檔案內容(相對路徑 → hex), 供比對「完全未動」; 不存在回傳null
let snap = (dir) => {
    if (!fs.existsSync(dir)) {
        return null
    }
    let out = {}
    let walk = (d) => {
        for (let ent of fs.readdirSync(d, { withFileTypes: true })) {
            let fp = path.join(d, ent.name)
            if (ent.isDirectory()) {
                walk(fp)
            }
            else {
                out[path.relative(dir, fp).split(path.sep).join('/')] = fs.readFileSync(fp).toString('hex')
            }
        }
    }
    walk(dir)
    return out
}
let hex = (s) => Buffer.from(s).toString('hex')

let assertErr = (r, code, re) => {
    assert.strict.deepStrictEqual(r.thrown, true, '未拋錯')
    assert.strict.ok(r.e instanceof Error, '拋出值須為Error物件')
    assert.strict.deepStrictEqual(r.e.code, code)
    assert.strict.ok(typeof r.e.stack === 'string' && r.e.stack.length > 0)
    if (re) {
        assert.strict.ok(re.test(r.e.message), r.e.message)
    }
}

//mkLink: 建立目錄連結(junction), 無權限之環境回傳false
let mkLink = (target, link) => {
    try {
        fs.symlinkSync(target, link, 'junction')
        return true
    }
    catch (e) {
        return false
    }
}
let rmLink = (link) => {
    try {
        fs.unlinkSync(link)
    }
    catch (e) {
        fs.rmdirSync(link)
    }
}


describe('genDocsDist: 複製dist至docs/dist(規則帳本R24)', function() {

    before(function() {
        fs.rmSync(root, { recursive: true, force: true })
        fs.mkdirSync(root, { recursive: true })
    })

    after(function() {
        fs.rmSync(root, { recursive: true, force: true })
    })

    describe('預設路徑(子行程於假套件資料夾)', function() {

        it('不給opt: ./dist/→./docs/dist/(相對cwd); 摘要預設印於主控台; 來源不動', function() {
            let dir = mkCase({
                'dist/w-fake.umd.js': 'DIST',
                'dist/w-fake.umd.js.map': 'MAP',
                'docs/index.html': 'HOME',
            })
            let before = snap(path.join(dir, 'dist'))
            //受測模組以本測試檔相對位置取得(變異驗證時為副本)
            put(dir, 'run.mjs', `import g from ${JSON.stringify(new URL('../src/genDocsDist.mjs', import.meta.url).href)}\nlet r = g()\nprocess.stdout.write('__JSON__' + JSON.stringify(r))\n`)
            let r = spawnSync(process.execPath, [path.join(dir, 'run.mjs')], { cwd: dir, encoding: 'utf8', windowsHide: true })
            //規格(發布與建置腳本規則4): 預設以cwd相對之./dist/與./docs/dist/
            assert.strict.deepStrictEqual(r.status, 0, r.stderr)
            let sum = JSON.parse(r.stdout.split('__JSON__')[1])
            assert.strict.deepStrictEqual(get(dir, 'docs/dist/w-fake.umd.js'), 'DIST')
            //規格(瀏覽器端取用與gh-pages規則1): docs/dist/須含.map
            assert.strict.deepStrictEqual(get(dir, 'docs/dist/w-fake.umd.js.map'), 'MAP')
            assert.strict.deepStrictEqual(sum.files, ['w-fake.umd.js', 'w-fake.umd.js.map'])
            //bLog預設為true, 一行摘要印於主控台
            assert.strict.ok(r.stdout.split('__JSON__')[0].startsWith('genDocsDist: dist 2 file(s) (.map 1) -> '), r.stdout)
            //docs內其他內容與來源不動
            assert.strict.deepStrictEqual(get(dir, 'docs/index.html'), 'HOME')
            assert.strict.deepStrictEqual(snap(path.join(dir, 'dist')), before)
        })

    })

    describe('複製', function() {

        it('含子資料夾、二進位、.map(含大寫副檔名): 全部複製, 位元一致; 回傳files與nMap', function() {
            let bin = Buffer.concat([Buffer.from([0xff, 0xfe, 0x00, 0x80, 0x0d, 0x0a]), Buffer.from('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js'), Buffer.from([0xc3, 0x28, 0x00])])
            let dir = mkCase({
                'dist/w-fake.umd.js': 'A',
                'dist/w-fake.umd.js.map': 'M1',
                'dist/w-fake.wk.umd.js': 'B',
                'dist/sub/deep/x.js': 'C',
                'dist/sub/deep/X.JS.MAP': 'M2',
                'dist/bin.dat': bin,
            })
            let before = snap(path.join(dir, 'dist'))
            let r = genDocsDist(O(dir))
            //規格(瀏覽器端取用與gh-pages規則1): ./dist/全部(含子資料夾、.map)複製到./docs/dist/
            assert.strict.deepStrictEqual(snap(path.join(dir, 'docs/dist')), before)
            //.map不分大小寫皆計入
            assert.strict.deepStrictEqual(r.files, ['bin.dat', 'sub/deep/X.JS.MAP', 'sub/deep/x.js', 'w-fake.umd.js', 'w-fake.umd.js.map', 'w-fake.wk.umd.js'])
            assert.strict.deepStrictEqual(r.nMap, 2)
            assert.strict.deepStrictEqual(r.warnings, [])
            //二進位位元一致
            assert.strict.deepStrictEqual(fs.readFileSync(path.join(dir, 'docs/dist/bin.dat')).toString('hex'), bin.toString('hex'))
            //來源不動
            assert.strict.deepStrictEqual(snap(path.join(dir, 'dist')), before)
        })

        it('只有.map的dist亦視為有檔案(不因無js而拋錯); 無.map的dist不報錯(nMap為0)', function() {
            let dir = mkCase({ 'dist/a.js.map': 'M' })
            let r = genDocsDist(O(dir))
            assert.strict.deepStrictEqual(r.files, ['a.js.map'])
            assert.strict.deepStrictEqual(r.nMap, 1)
            let dir2 = mkCase({ 'dist/a.js': 'A' })
            let r2 = genDocsDist(O(dir2))
            assert.strict.deepStrictEqual(r2.files, ['a.js'])
            assert.strict.deepStrictEqual(r2.nMap, 0)
        })

        it('複製前先清空目標: 目標內舊檔與舊子資料夾移除, 目標不存在則建立, 目標之外(docs內他處)不動', function() {
            let dir = mkCase({
                'dist/a.js': 'NEW',
                'docs/dist/a.js': 'OLD',
                'docs/dist/old.js': 'OLD2',
                'docs/dist/oldsub/deep/z.js': 'OLD3',
                'docs/index.html': 'HOME',
                'docs/examples/ex-a.html': 'EX',
            })
            genDocsDist(O(dir))
            //規格(任務要求): 複製前先清空目標
            assert.strict.deepStrictEqual(snap(path.join(dir, 'docs/dist')), { 'a.js': hex('NEW') })
            assert.strict.deepStrictEqual(has(dir, 'docs/dist/oldsub'), false)
            assert.strict.deepStrictEqual(get(dir, 'docs/index.html'), 'HOME')
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), 'EX')
            //目標(含其上層docs)不存在則建立
            let dir2 = mkCase({ 'dist/a.js': 'A' })
            assert.strict.deepStrictEqual(has(dir2, 'docs'), false)
            genDocsDist(O(dir2))
            assert.strict.deepStrictEqual(get(dir2, 'docs/dist/a.js'), 'A')
        })

        it('重跑冪等(內容與摘要皆同); dist縮減後再跑, 已移除之檔不殘留於目標', function() {
            let dir = mkCase({ 'dist/a.js': 'A', 'dist/b.js': 'B', 'dist/b.js.map': 'M' })
            let r1 = genDocsDist(O(dir))
            let s1 = snap(path.join(dir, 'docs/dist'))
            let r2 = genDocsDist(O(dir))
            assert.strict.deepStrictEqual(r2, r1)
            assert.strict.deepStrictEqual(snap(path.join(dir, 'docs/dist')), s1)
            fs.rmSync(path.join(dir, 'dist/b.js'))
            fs.rmSync(path.join(dir, 'dist/b.js.map'))
            genDocsDist(O(dir))
            assert.strict.deepStrictEqual(snap(path.join(dir, 'docs/dist')), { 'a.js': hex('A') })
        })

        it('fdDist、fdTar可由opt指定(相對路徑相對cwd解析於呼叫時)', function() {
            let dir = mkCase({ 'out/web/a.js': 'A', 'out/web/sub/b.js': 'B' })
            let r = genDocsDist(O(dir, { fdDist: path.join(dir, 'out/web'), fdTar: path.join(dir, 'site/lib') }))
            assert.strict.deepStrictEqual(snap(path.join(dir, 'site/lib')), { 'a.js': hex('A'), 'sub/b.js': hex('B') })
            assert.strict.deepStrictEqual(r.files, ['a.js', 'sub/b.js'])
        })

        it('不跟進連結: dist內之junction/符號連結略過並列入warnings, 連結目標內容不被複製且完好', function() {
            let dir = mkCase({ 'dist/a.js': 'A', 'outside/secret.txt': 'SECRET' })
            let link = path.join(dir, 'dist/lnk')
            if (!mkLink(path.join(dir, 'outside'), link)) {
                this.skip() //無權限建立連結之環境
            }
            try {
                let r = genDocsDist(O(dir))
                //規格(任務要求): 連結不跟進
                assert.strict.deepStrictEqual(has(dir, 'docs/dist/lnk'), false)
                assert.strict.deepStrictEqual(r.files, ['a.js'])
                assert.strict.deepStrictEqual(r.warnings.length, 1)
                assert.strict.ok(r.warnings[0].includes('lnk') && r.warnings[0].includes('skipped'), r.warnings[0])
            }
            finally {
                rmLink(link)
            }
            assert.strict.deepStrictEqual(get(dir, 'outside/secret.txt'), 'SECRET')
        })

    })

    describe('dist不存在或無檔案: 拋錯, 且不更動目標', function() {

        it('dist不存在或不是資料夾: WPT_DOCS_DIST_NOT_FOUND(訊息含資料夾路徑); 目標既有內容不被清空', function() {
            let dir = mkCase({ 'docs/dist/keep.js': 'KEEP', 'docs/index.html': 'HOME' })
            let before = snap(dir)
            //規格(瀏覽器端取用與gh-pages規則1): dist/不存在即報錯中止發布
            let r = throwsOf(() => genDocsDist(O(dir)))
            assertErr(r, 'WPT_DOCS_DIST_NOT_FOUND', /^dist folder\[.+\] not found/)
            assert.strict.ok(r.e.message.includes(path.join(dir, 'dist')), r.e.message)
            assert.strict.deepStrictEqual(snap(dir), before)
            //dist為檔案
            let dir2 = mkCase({ 'dist': 'IAM-A-FILE', 'docs/dist/keep.js': 'KEEP' })
            let before2 = snap(dir2)
            assertErr(throwsOf(() => genDocsDist(O(dir2))), 'WPT_DOCS_DIST_NOT_FOUND', /not found/)
            assert.strict.deepStrictEqual(snap(dir2), before2)
        })

        it('dist為空資料夾: WPT_DOCS_DIST_EMPTY(訊息含資料夾路徑); 目標既有內容不被清空', function() {
            let dir = mkCase({ 'docs/dist/keep.js': 'KEEP' })
            fs.mkdirSync(path.join(dir, 'dist'))
            let before = snap(dir)
            //規格(瀏覽器端取用與gh-pages規則1): dist/為空即報錯中止發布(使用者同意主控之建議)
            let r = throwsOf(() => genDocsDist(O(dir)))
            assertErr(r, 'WPT_DOCS_DIST_EMPTY', /^dist folder\[.+\] has no file/)
            assert.strict.ok(r.e.message.includes(path.join(dir, 'dist')), r.e.message)
            assert.strict.deepStrictEqual(snap(dir), before)
            assert.strict.deepStrictEqual(get(dir, 'docs/dist/keep.js'), 'KEEP')
        })

        it('dist內只有空資料夾(無任何檔案)亦視為空: WPT_DOCS_DIST_EMPTY, 不建立也不清空目標', function() {
            let dir = mkCase({ 'docs/dist/keep.js': 'KEEP' })
            fs.mkdirSync(path.join(dir, 'dist/sub/deep'), { recursive: true })
            assertErr(throwsOf(() => genDocsDist(O(dir))), 'WPT_DOCS_DIST_EMPTY', /has no file/)
            assert.strict.deepStrictEqual(get(dir, 'docs/dist/keep.js'), 'KEEP')
        })

        it('dist內只有連結(不跟進, 故無檔案)亦視為空: WPT_DOCS_DIST_EMPTY, 連結目標完好', function() {
            let dir = mkCase({ 'outside/secret.txt': 'SECRET', 'docs/dist/keep.js': 'KEEP' })
            fs.mkdirSync(path.join(dir, 'dist'))
            let link = path.join(dir, 'dist/lnk')
            if (!mkLink(path.join(dir, 'outside'), link)) {
                this.skip() //無權限建立連結之環境
            }
            try {
                assertErr(throwsOf(() => genDocsDist(O(dir))), 'WPT_DOCS_DIST_EMPTY', /has no file/)
                assert.strict.deepStrictEqual(get(dir, 'docs/dist/keep.js'), 'KEEP')
            }
            finally {
                rmLink(link)
            }
            assert.strict.deepStrictEqual(get(dir, 'outside/secret.txt'), 'SECRET')
        })

    })

    describe('目標與來源重疊: WPT_DOCS_PATH_OVERLAP(先於清空, 不更動任何檔)', function() {

        it('目標等於或位於來源之內; 來源等於或位於目標之內(清空目標會刪掉來源)', function() {
            let dir = mkCase({ 'dist/a.js': 'A', 'dist/sub/b.js': 'B', 'docs/x.js': 'X' })
            let cases = [
                [{ fdTar: path.join(dir, 'dist') }, /must not be inside source folder/],
                [{ fdTar: path.join(dir, 'dist/docs') }, /must not be inside source folder/],
                [{ fdTar: path.join(dir, 'dist/sub') }, /must not be inside source folder/],
                [{ fdTar: dir }, /source folder.+must not be inside opt\.fdTar/],
                [{ fdTar: path.join(dir, '..') }, /source folder.+must not be inside opt\.fdTar/],
                [{ fdDist: path.join(dir, 'docs/dist-src'), fdTar: path.join(dir, 'docs') }, /source folder.+must not be inside opt\.fdTar/],
            ]
            put(dir, 'docs/dist-src/c.js', 'C')
            for (let [extra, re] of cases) {
                let before = snap(dir)
                assertErr(throwsOf(() => genDocsDist(O(dir, extra))), 'WPT_DOCS_PATH_OVERLAP', re)
                //V17: 檢測先於清空, 不留任何副作用
                assert.strict.deepStrictEqual(snap(dir), before, `${JSON.stringify(extra)}不得有寫入或刪除`)
            }
        })

        it('目標之上層為指向dist內部之連結: 連結解開後仍判為重疊, dist內容完好', function() {
            let dir = mkCase({ 'dist/a.js': 'A', 'dist/sub/old.js': 'OLD' })
            let link = path.join(dir, 'docs')
            if (!mkLink(path.join(dir, 'dist/sub'), link)) {
                this.skip() //無權限建立連結之環境
            }
            try {
                //docs → dist/sub, 目標docs/dist實際位於dist/sub/dist(在dist內)
                assertErr(throwsOf(() => genDocsDist(O(dir))), 'WPT_DOCS_PATH_OVERLAP', /must not be inside source folder/)
                assert.strict.deepStrictEqual(snap(path.join(dir, 'dist')), { 'a.js': hex('A'), 'sub/old.js': hex('OLD') })
                assert.strict.deepStrictEqual(has(dir, 'dist/sub/dist'), false)
            }
            finally {
                rmLink(link)
            }
        })

        it('來源為指向目標內部之連結: 連結解開後來源位於目標之內, 判為重疊(清空目標會刪掉來源之真實內容), 內容完好', function() {
            let dir = mkCase({ 'docs/real-dist/a.js': 'A', 'docs/real-dist/sub/b.js': 'B' })
            let link = path.join(dir, 'dist')
            if (!mkLink(path.join(dir, 'docs/real-dist'), link)) {
                this.skip() //無權限建立連結之環境
            }
            try {
                //dist → docs/real-dist, fdTar=docs: 字面上互不包含, 真實位置上來源在目標之內
                assertErr(throwsOf(() => genDocsDist(O(dir, { fdTar: path.join(dir, 'docs') }))), 'WPT_DOCS_PATH_OVERLAP', /source folder.+must not be inside opt\.fdTar/)
                assert.strict.deepStrictEqual(snap(path.join(dir, 'docs')), { 'real-dist/a.js': hex('A'), 'real-dist/sub/b.js': hex('B') })
            }
            finally {
                rmLink(link)
            }
        })

        it('目標本身為連結(junction): 不跟進、不清空連結目標之內容(WPT_CLEAN_FOLDER), 來源不動', function() {
            let dir = mkCase({ 'dist/a.js': 'A', 'elsewhere/keep.txt': 'KEEP' })
            fs.mkdirSync(path.join(dir, 'docs'))
            let link = path.join(dir, 'docs/dist')
            if (!mkLink(path.join(dir, 'elsewhere'), link)) {
                this.skip() //無權限建立連結之環境
            }
            try {
                assertErr(throwsOf(() => genDocsDist(O(dir))), 'WPT_CLEAN_FOLDER', /symbolic link or junction/)
            }
            finally {
                rmLink(link)
            }
            assert.strict.deepStrictEqual(get(dir, 'elsewhere/keep.txt'), 'KEEP')
            assert.strict.deepStrictEqual(get(dir, 'dist/a.js'), 'A')
        })

        it('目標為檔案: WPT_CLEAN_FOLDER(不覆蓋、不複製)', function() {
            let dir = mkCase({ 'dist/a.js': 'A', 'docs/dist': 'IAM-A-FILE' })
            assertErr(throwsOf(() => genDocsDist(O(dir))), 'WPT_CLEAN_FOLDER', /can not clean folder/)
            assert.strict.deepStrictEqual(get(dir, 'docs/dist'), 'IAM-A-FILE')
        })

    })

    describe('opt之檢測(規格輸入參數之檢測機制K3、K9、V4): 型別不符視為未給、改用預設', function() {

        let nonEmptyStr = 'a non-empty string'
        let fixture = () => mkCase({ 'dist/a.js': 'A', 'dist/a.js.map': 'M' })
        let expected = { 'a.js': hex('A'), 'a.js.map': hex('M') }

        // 以子行程於假套件資料夾呼叫(預設路徑為相對於cwd), optSrc為opt之JS原始碼
        let runIn = (dir, optSrc) => {
            let href = new URL('../src/genDocsDist.mjs', import.meta.url).href
            put(dir, 'run-k3.mjs', `import g from ${JSON.stringify(href)}\nlet o = ${optSrc}\nlet r1 = g(o)\nlet r2 = o !== null && typeof o === 'object' ? g({ ...o, debug: true }) : null\nprocess.stdout.write('__JSON__' + JSON.stringify({ r1, r2 }))\n`)
            let r = spawnSync(process.execPath, [path.join(dir, 'run-k3.mjs')], { cwd: dir, encoding: 'utf8', windowsHide: true })
            assert.strict.deepStrictEqual(r.status, 0, r.stderr)
            return JSON.parse(r.stdout.split('__JSON__')[1])
        }

        let cases = [
            ['fdDist', '1', nonEmptyStr], ['fdDist', '\'\'', nonEmptyStr], ['fdDist', '{}', nonEmptyStr], ['fdDist', 'null', null],
            ['fdTar', '[\'SECRET-VALUE\']', nonEmptyStr], ['fdTar', '\'\'', nonEmptyStr], ['fdTar', 'null', null],
            ['bLog', '1', 'a boolean'], ['bLog', '\'yes\'', 'a boolean'], ['bLog', 'null', null], ['debug', '1', null],
        ]
        for (let [k, v, desc] of cases) {
            it(`opt.${k}給${v}: 視為未給(用預設路徑), 不拋錯; debug為true時警告${desc ? `「invalid opt.${k}: must be ${desc}, using default」` : '無'}`, function() {
                let dir = fixture()
                let { r1, r2 } = runIn(dir, `{ ${k}: ${v}, ${k === 'bLog' ? '' : 'bLog: false'} }`)
                //K3: 非預期之輸入視為未給, 改用預設(結果同預設)
                assert.strict.deepStrictEqual(snap(path.join(dir, 'docs/dist')), expected)
                //opt.debug未給時靜默
                assert.strict.deepStrictEqual(r1.warnings, [])
                //opt.debug為true時說明, 固定詞彙, 不含傳入之值(K9)
                assert.strict.deepStrictEqual(r2.warnings, desc ? [`invalid opt.${k}: must be ${desc}, using default`] : [])
                assert.strict.ok(!JSON.stringify(r2.warnings).includes('SECRET'))
            })
        }

        it('opt為undefined或null: 視為未給(預設路徑), 不拋錯', function() {
            for (let optSrc of ['undefined', 'null']) {
                let dir = fixture()
                let { r1 } = runIn(dir, optSrc)
                //V4: opt本身undefined、null視為未給
                assert.strict.deepStrictEqual(snap(path.join(dir, 'docs/dist')), expected)
                assert.strict.deepStrictEqual(r1.warnings, [])
            }
        })

        it('opt為非一般物件(字串、數字、布林、陣列、函數): WPT_DOCS_INVALID_OPT(訊息固定、不回顯值), 先於任何寫入', function() {
            let dir = mkCase({ 'dist/a.js': 'A', 'docs/dist/keep.js': 'KEEP' })
            let before = snap(dir)
            for (let bad of ['secret-x', 5, true, [], [1], () => 1]) {
                //V4: 其他非一般物件無效; V19格式; K9不回顯輸入值
                assertErr(throwsOf(() => genDocsDist(bad)), 'WPT_DOCS_INVALID_OPT', /^invalid opt: must be an object$/)
            }
            assert.strict.deepStrictEqual(snap(dir), before)
        })

    })

    describe('摘要與主控台輸出', function() {

        it('回傳{ files, nMap, warnings }; bLog為true(預設)時印出一行摘要(含複製數、.map數、目標)與警告列, false時不印', function() {
            let dir = mkCase({ 'dist/a.js': 'A', 'dist/a.js.map': 'M', 'dist/b.js': 'B', 'outside/o.txt': 'O' })
            let { v, lines } = capture(() => genDocsDist(O(dir, { bLog: true })))
            assert.strict.deepStrictEqual(Object.keys(v), ['files', 'nMap', 'warnings'])
            assert.strict.deepStrictEqual(lines, [`genDocsDist: dist 3 file(s) (.map 1) -> ${path.join(dir, 'docs/dist')}; warnings 0`])
            //有警告時另印警告列
            let link = path.join(dir, 'dist/lnk')
            if (mkLink(path.join(dir, 'outside'), link)) {
                try {
                    let q = capture(() => genDocsDist(O(dir, { bLog: true })))
                    assert.strict.deepStrictEqual(q.lines.length, 2, q.lines.join('\n'))
                    assert.strict.ok(q.lines[0].endsWith('; warnings 1'), q.lines[0])
                    assert.strict.ok(q.lines[1].startsWith('  warning: ') && q.lines[1].includes('lnk'), q.lines[1])
                }
                finally {
                    rmLink(link)
                }
            }
            let q2 = capture(() => genDocsDist(O(dir, { bLog: false })))
            assert.strict.deepStrictEqual(q2.lines, [])
        })

    })

})
