import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { spawnSync } from 'child_process'
import genDocsExams from '../src/genDocsExams.mjs'


//規則帳本R21: genDocsExams, 範例頁自給自足(不依賴npm之CDN); 以暫存夾內之假套件驗證, 不碰任何真實專案

let root = path.resolve('./test/_tmp/genDocsExams')
let seq = 0

let put = (dir, rel, c) => {
    let fp = path.join(dir, rel)
    fs.mkdirSync(path.dirname(fp), { recursive: true })
    fs.writeFileSync(fp, c)
}
let get = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')
let has = (dir, rel) => fs.existsSync(path.join(dir, rel))
let pkgOf = (name) => JSON.stringify({ name, version: '1.2.3', repository: { type: 'git', url: `git+https://github.com/some-owner/${name}.git` } })

//mkCase: 建立假套件資料夾, files為{ 相對路徑: 字串或Buffer }; 預設含package.json(name為w-fake)
let mkCase = (files = {}, name = 'w-fake') => {
    let dir = path.join(root, `c${++seq}`)
    fs.mkdirSync(dir, { recursive: true })
    if (!Object.prototype.hasOwnProperty.call(files, 'package.json')) {
        put(dir, 'package.json', pkgOf(name))
    }
    for (let [rel, c] of Object.entries(files)) {
        put(dir, rel, c)
    }
    return dir
}

//O: 全部路徑指向假套件資料夾之絕對路徑, 不印主控台
let O = (dir, extra = {}) => ({
    fdSrc: path.join(dir, 'examples'),
    fdTar: path.join(dir, 'docs/examples'),
    fdDist: path.join(dir, 'dist'),
    fdTarDist: path.join(dir, 'docs/dist'),
    fdLibs: path.join(dir, 'docs/libs'),
    fdNodeModules: path.join(dir, 'node_modules'),
    fnPks: path.join(dir, 'package.json'),
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

//runIn: 以子行程、工作目錄為假套件資料夾呼叫genDocsExams(optSrc為opt之JS原始碼, 如"{ fdTar: 1 }"、"null"); 受測模組以本測試檔相對位置取得
//  r1為optSrc本身之結果, r2為再加debug:true之結果(optSrc非物件字面時為null); 預設路徑相對於假套件資料夾, 不碰repo
let runIn = (dir, optSrc) => {
    let href = new URL('../src/genDocsExams.mjs', import.meta.url).href
    put(dir, 'run-k3.mjs', `import g from ${JSON.stringify(href)}\nlet o = ${optSrc}\nlet r1 = g(o)\nlet r2 = o !== null && typeof o === 'object' ? g({ ...o, debug: true }) : null\nprocess.stdout.write('__JSON__' + JSON.stringify({ r1, r2 }))\n`)
    let r = spawnSync(process.execPath, [path.join(dir, 'run-k3.mjs')], { cwd: dir, encoding: 'utf8', windowsHide: true })
    assert.strict.deepStrictEqual(r.status, 0, r.stderr)
    return JSON.parse(r.stdout.split('__JSON__')[1])
}

//資料夾內全部檔案內容(相對路徑 → hex), 供比對「完全未動」
let snap = (dir) => {
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

let page = (...lines) => `<html><head>\n${lines.join('\n')}\n</head><body></body></html>\n`
let script = (u) => `<script src="${u}"></script>`


describe('genDocsExams: 範例頁自給自足(規則帳本R21)', function() {

    before(function() {
        fs.rmSync(root, { recursive: true, force: true })
        fs.mkdirSync(root, { recursive: true })
    })

    after(function() {
        fs.rmSync(root, { recursive: true, force: true })
    })

    describe('預設路徑(子行程於假套件資料夾)', function() {

        it('不給opt: ./examples/→./docs/examples/、其他自有套件→./docs/libs/; 自身../dist/引用保持相對; dist不複製(由bin/gh-pages部署時提供)', function() {
            let dir = mkCase({
                'examples/ex-a.html': page(script('../dist/w-fake.umd.js'), script('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js')),
                'dist/w-fake.umd.js': 'DIST',
                'dist/w-fake.umd.js.map': 'MAP',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
            })
            let runner = path.join(dir, 'run.mjs')
            //受測模組以本測試檔相對位置取得(變異驗證時為副本)
            put(dir, 'run.mjs', `import g from ${JSON.stringify(new URL('../src/genDocsExams.mjs', import.meta.url).href)}\nlet r = g()\nprocess.stdout.write('__JSON__' + JSON.stringify(r))\n`)
            let r = spawnSync(process.execPath, [runner], { cwd: dir, encoding: 'utf8', windowsHide: true })
            //R21: 以預設路徑呼叫成功
            assert.strict.deepStrictEqual(r.status, 0, r.stderr)
            let sum = JSON.parse(r.stdout.split('__JSON__')[1])
            //R21: bLog預設為true, 摘要印於主控台
            assert.strict.ok(r.stdout.split('__JSON__')[0].includes('genDocsExams[w-fake]'), r.stdout)
            //R21①: 範例複製到docs/examples, 自身../dist/引用不換成CDN
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script('../dist/w-fake.umd.js'), script('../libs/wsemi/dist/wsemi.umd.js')))
            //R21①(wpt257b): dist預設不複製(由bin/gh-pages部署時提供), docs/dist不產生, 回傳之dist為空
            assert.strict.deepStrictEqual(has(dir, 'docs/dist'), false)
            assert.strict.deepStrictEqual(sum.dist, [])
            //R21②: 其他自有套件複製到docs/libs
            assert.strict.deepStrictEqual(get(dir, 'docs/libs/wsemi/dist/wsemi.umd.js'), 'WSEMI')
            assert.strict.deepStrictEqual(sum.warnings, [])
            //R21①: 自身../dist/引用不是改寫(只有他套件之網址1筆)
            assert.strict.deepStrictEqual(sum.rewrites, [{ file: 'ex-a.html', from: 'https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js', to: '../libs/wsemi/dist/wsemi.umd.js' }])
        })

    })

    describe('opt之檢測(規格輸入參數之檢測機制K3、K9、V4): 型別不符視為未給、改用預設', function() {

        //docs/examples/pre.html為先前步驟產製之既有頁面(供區分bInplace給無效值時是否仍用預設true)
        let fixture = () => mkCase({
            'examples/ex-a.html': page(script('../dist/w-fake.umd.js'), script('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js')),
            'docs/examples/pre.html': page(script('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js')),
            'dist/w-fake.umd.js': 'DIST',
            'dist/w-fake.umd.js.map': 'MAP',
            'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
        })
        let baseSnap = null
        let getBase = () => {
            if (baseSnap === null) {
                let dir = fixture()
                let { r1 } = runIn(dir, '{}')
                assert.strict.deepStrictEqual(r1.warnings, [])
                baseSnap = snap(path.join(dir, 'docs'))
                assert.strict.deepStrictEqual(Object.keys(baseSnap).sort(), ['examples/ex-a.html', 'examples/pre.html', 'libs/wsemi/dist/wsemi.umd.js'])
                assert.strict.deepStrictEqual(Buffer.from(baseSnap['examples/pre.html'], 'hex').toString('utf8'), page(script('../libs/wsemi/dist/wsemi.umd.js')))
            }
            return baseSnap
        }

        let nonEmptyStr = 'a non-empty string'
        let arrStr = 'an array of non-empty strings'
        let cases = [
            ['fdTar', '1', nonEmptyStr], ['fdTar', '\'\'', nonEmptyStr], ['fdTar', 'null', null], ['fdDist', '{}', nonEmptyStr], ['fdTarDist', '[]', nonEmptyStr],
            ['fdLibs', '[\'SECRET-VALUE\']', nonEmptyStr], ['fdNodeModules', '0', nonEmptyStr], ['fnPks', '\'\'', nonEmptyStr],
            ['fdSrc', '5', 'a string'], ['fdSrc', 'null', null],
            ['files', '\'a.html\'', arrStr], ['files', '[1]', arrStr], ['files', 'null', null], ['keepCdn', 'null', null], ['keepCdn', '\'w-demores\'', arrStr], ['keepCdn', '[\'wsemi\', \'\']', arrStr], ['extsText', '\'.html\'', arrStr],
            ['bDistMap', '\'yes\'', 'a boolean'], ['bCopyDist', '\'yes\'', 'a boolean'], ['bCopyDist', '1', 'a boolean'], ['bInplace', '0', 'a boolean'], ['bInplace', 'null', null],
            ['bLog', '1', 'a boolean'], ['bLog', 'null', null], ['debug', '1', null],
        ]
        for (let [k, v, desc] of cases) {
            it(`opt.${k}給${v}: 視為未給, 結果與不給相同; debug為true時警告${desc ? `「invalid opt.${k}: must be ${desc}, using default」` : '無'}`, function() {
                let base = getBase()
                let dir = fixture()
                let { r1, r2 } = runIn(dir, `{ ${k}: ${v} }`)
                //K3: 非預期之輸入視為未給, 改用預設(不拋錯、結果同預設)
                assert.strict.deepStrictEqual(snap(path.join(dir, 'docs')), base)
                //opt.debug未給時靜默
                assert.strict.deepStrictEqual(r1.warnings, [])
                //opt.debug為true時說明, 固定詞彙, 不含傳入之值(K9)
                assert.strict.deepStrictEqual(r2.warnings, desc ? [`invalid opt.${k}: must be ${desc}, using default`] : [])
                assert.strict.ok(!JSON.stringify(r2.warnings).includes('SECRET'))
            })
        }

        it('opt為undefined或null: 視為未給(預設路徑), 不拋錯', function() {
            let base = getBase()
            for (let optSrc of ['undefined', 'null']) {
                let dir = fixture()
                let { r1 } = runIn(dir, optSrc)
                //V4: opt本身undefined、null視為未給
                assert.strict.deepStrictEqual(snap(path.join(dir, 'docs')), base)
                assert.strict.deepStrictEqual(r1.warnings, [])
            }
        })

    })

    describe('①範例與dist之複製', function() {

        it('範例含子資料夾與二進位檔: 全部複製, 二進位(含非UTF-8位元組與網址字樣)位元一致, 子資料夾內相對路徑深度正確', function() {
            let bin = Buffer.concat([Buffer.from([0xff, 0xfe, 0x00, 0x80]), Buffer.from('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js'), Buffer.from([0xc3, 0x28])])
            let dir = mkCase({
                'examples/ex-a.html': page(script('../dist/w-fake.umd.js')),
                'examples/sub/deep/ex-b.html': page(script('../../../dist/w-fake.umd.js'), script('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js')),
                'examples/img/pic.png': bin,
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
            })
            let r = genDocsExams(O(dir))
            //R21①: 保留子資料夾, 全部檔案複製(相對fdTar之posix路徑, 排序)
            assert.strict.deepStrictEqual(r.examples, ['ex-a.html', 'img/pic.png', 'sub/deep/ex-b.html'])
            //R21①: 非文字副檔名原樣複製(不經文字轉換)
            assert.strict.deepStrictEqual(fs.readFileSync(path.join(dir, 'docs/examples/img/pic.png')).toString('hex'), bin.toString('hex'))
            //R21①: 子資料夾內自身dist引用不變; 他套件之相對路徑依檔案深度計算
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/sub/deep/ex-b.html'), page(script('../../../dist/w-fake.umd.js'), script('../../../libs/wsemi/dist/wsemi.umd.js')))
        })

        it('無改寫之文字檔(含非UTF-8位元組)原樣複製; 改寫之文字檔保留BOM與CRLF', function() {
            let raw = Buffer.concat([Buffer.from('<html>'), Buffer.from([0xa4, 0xa4, 0xa4, 0xe5]), Buffer.from('</html>')])
            let withBom = '﻿<html>\r\n<script src="https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js"></script>\r\n</html>\r\n'
            let dir = mkCase({
                'examples/big5.html': raw,
                'examples/bom.html': withBom,
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
            })
            genDocsExams(O(dir))
            //R21①: 無改寫者不經UTF-8轉換
            assert.strict.deepStrictEqual(fs.readFileSync(path.join(dir, 'docs/examples/big5.html')).toString('hex'), raw.toString('hex'))
            //R21①: 改寫僅動網址, BOM與CRLF保留
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/bom.html'), withBom.replace('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js', '../libs/wsemi/dist/wsemi.umd.js'))
        })

        it('dist: 預設不複製(docs/dist不產生、回傳dist為空); bCopyDist為true才含.wk.umd.js與子資料夾全部複製, 預設排除.map, bDistMap為true才含.map', function() {
            let files = {
                'examples/ex-a.html': page(script('../dist/w-fake.umd.js'), script('../dist/w-fake.wk.umd.js')),
                'dist/w-fake.umd.js': 'A',
                'dist/w-fake.wk.umd.js': 'B',
                'dist/w-fake.umd.js.map': 'M1',
                'dist/sub/x.js': 'C',
                'dist/sub/x.js.MAP': 'M2',
            }
            //wpt257b: 預設不複製dist(部署時由bin/gh-pages提供), bDistMap單獨給不生效
            let dir0 = mkCase(files)
            let r0 = genDocsExams(O(dir0))
            assert.strict.deepStrictEqual(r0.dist, [])
            assert.strict.deepStrictEqual(has(dir0, 'docs/dist'), false)
            let r0b = genDocsExams(O(dir0, { bDistMap: true }))
            assert.strict.deepStrictEqual(r0b.dist, [])
            assert.strict.deepStrictEqual(has(dir0, 'docs/dist'), false)
            let dir = mkCase(files)
            let r = genDocsExams(O(dir, { bCopyDist: true }))
            //R21①: bCopyDist為true時, .map預設排除(不分大小寫), 其餘遞迴複製
            assert.strict.deepStrictEqual(r.dist, ['sub/x.js', 'w-fake.umd.js', 'w-fake.wk.umd.js'])
            assert.strict.deepStrictEqual(snap(path.join(dir, 'docs/dist')), { 'sub/x.js': Buffer.from('C').toString('hex'), 'w-fake.umd.js': Buffer.from('A').toString('hex'), 'w-fake.wk.umd.js': Buffer.from('B').toString('hex') })
            let dir2 = mkCase({
                'examples/ex-a.html': page(script('../dist/w-fake.umd.js')),
                'dist/w-fake.umd.js': 'A',
                'dist/w-fake.umd.js.map': 'M1',
            })
            let r2 = genDocsExams(O(dir2, { bCopyDist: true, bDistMap: true }))
            //R21①: 可由opt控制含.map
            assert.strict.deepStrictEqual(r2.dist, ['w-fake.umd.js', 'w-fake.umd.js.map'])
        })

        it('extsText: 只有副檔名在內者才改寫; 預設.html/.htm/.js/.mjs/.css, 可由opt增加', function() {
            let u = 'https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js'
            let files = {
                'examples/a.html': u,
                'examples/b.HTM': u,
                'examples/c.js': u,
                'examples/d.json': u,
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
            }
            let dir = mkCase(files)
            genDocsExams(O(dir))
            //R21①: 預設副檔名改寫(含大寫副檔名), .json不改
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/a.html'), '../libs/wsemi/dist/wsemi.umd.js')
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/b.HTM'), '../libs/wsemi/dist/wsemi.umd.js')
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/c.js'), '../libs/wsemi/dist/wsemi.umd.js')
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/d.json'), u)
            let dir2 = mkCase(files)
            genDocsExams(O(dir2, { extsText: ['.json'] }))
            //R21①: extsText可由opt指定
            assert.strict.deepStrictEqual(get(dir2, 'docs/examples/d.json'), '../libs/wsemi/dist/wsemi.umd.js')
            assert.strict.deepStrictEqual(get(dir2, 'docs/examples/a.html'), u)
        })

        it('不跟進連結: 範例夾內之junction/符號連結略過並列入warnings, 連結目標內容不被複製', function() {
            let dir = mkCase({
                'examples/ex-a.html': page(script('../dist/w-fake.umd.js')),
                'dist/w-fake.umd.js': 'DIST',
                'outside/secret.txt': 'SECRET',
            })
            let link = path.join(dir, 'examples/lnk')
            try {
                fs.symlinkSync(path.join(dir, 'outside'), link, 'junction')
            }
            catch (e) {
                this.skip() //無權限建立連結之環境
            }
            try {
                let r = genDocsExams(O(dir))
                //R21: 連結不跟進, 以警告回報
                assert.strict.deepStrictEqual(has(dir, 'docs/examples/lnk/secret.txt'), false)
                assert.strict.deepStrictEqual(r.examples, ['ex-a.html'])
                assert.strict.ok(r.warnings.some((s) => s.includes('lnk') && s.includes('skipped')), JSON.stringify(r.warnings))
            }
            finally {
                try {
                    fs.unlinkSync(link)
                }
                catch (e) {
                    fs.rmdirSync(link)
                }
            }
            //連結目標完好
            assert.strict.deepStrictEqual(get(dir, 'outside/secret.txt'), 'SECRET')
        })

        it('只增不刪: 目標內既有之檔不被清除; 重跑冪等且不更動來源', function() {
            let dir = mkCase({
                'examples/ex-a.html': page(script('../dist/w-fake.umd.js'), script('https://unpkg.com/wsemi@latest/dist/wsemi.umd.js')),
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
                'docs/dist/old.js': 'OLD',
            })
            let before = snap(path.join(dir, 'examples'))
            let r1 = genDocsExams(O(dir))
            let s1 = snap(path.join(dir, 'docs'))
            let r2 = genDocsExams(O(dir))
            let s2 = snap(path.join(dir, 'docs'))
            //R21: 不清空目標
            assert.strict.deepStrictEqual(get(dir, 'docs/dist/old.js'), 'OLD')
            //R21: 冪等(內容與摘要皆同), 來源不動
            assert.strict.deepStrictEqual(s2, s1)
            assert.strict.deepStrictEqual(r2, r1)
            assert.strict.deepStrictEqual(snap(path.join(dir, 'examples')), before)
        })

    })

    describe('②其他自有套件之網址', function() {

        let forms = [
            ['jsDelivr未釘版', 'https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js'],
            ['jsDelivr @latest', 'https://cdn.jsdelivr.net/npm/wsemi@latest/dist/wsemi.umd.js'],
            ['jsDelivr @x.y.z', 'https://cdn.jsdelivr.net/npm/wsemi@1.9.39/dist/wsemi.umd.js'],
            ['jsDelivr @範圍', 'https://cdn.jsdelivr.net/npm/wsemi@^1.9.0/dist/wsemi.umd.js'],
            ['jsDelivr無協定', '//cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js'],
            ['jsDelivr http', 'http://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js'],
            ['fastly.jsdelivr', 'https://fastly.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js'],
            ['unpkg未釘版', 'https://unpkg.com/wsemi/dist/wsemi.umd.js'],
            ['unpkg @latest', 'https://unpkg.com/wsemi@latest/dist/wsemi.umd.js'],
        ]
        for (let [title, u] of forms) {
            it(`${title}: 自node_modules複製到docs/libs並改為相對路徑`, function() {
                let dir = mkCase({
                    'examples/ex-a.html': page(script(u)),
                    'dist/w-fake.umd.js': 'DIST',
                    'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
                })
                let r = genDocsExams(O(dir))
                //R21②: 網址 → docs/libs/<名>/<路徑>之相對路徑; 檔案複製自node_modules
                assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script('../libs/wsemi/dist/wsemi.umd.js')))
                assert.strict.deepStrictEqual(get(dir, 'docs/libs/wsemi/dist/wsemi.umd.js'), 'WSEMI')
                assert.strict.deepStrictEqual(r.rewrites, [{ file: 'ex-a.html', from: u, to: '../libs/wsemi/dist/wsemi.umd.js' }])
                assert.strict.deepStrictEqual(r.libs, ['wsemi/dist/wsemi.umd.js'])
                assert.strict.deepStrictEqual(r.warnings, [])
            })
        }

        it('gh-pages形態(本套件擁有者): 他套件/dist/…自node_modules複製並改相對路徑; 自身/dist/…改指docs/dist; 導覽連結與非/dist/路徑不動且不警告', function() {
            let own = 'https://some-owner.github.io'
            let nav = [
                '<a href="//some-owner.github.io/w-fake/examples/ex-a.html">x</a>',
                `<a href="${own}/w-gis/global.html">x</a>`,
                `<a href="${own}/w-gis/dist/">x</a>`,
                `<a href="${own}/w-gis">x</a>`,
                `<a href="${own}/w-demores/">x</a>`,
            ]
            let dir = mkCase({
                'examples/ex-a.html': page(script(`${own}/wsemi/dist/wsemi.umd.js`), script('//some-owner.github.io/w-jsonview-tree/dist/w-jsonview-tree.umd.js?v=2'), script('http://some-owner.github.io/w-fake/dist/w-fake.umd.js'), ...nav),
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
                'node_modules/w-jsonview-tree/dist/w-jsonview-tree.umd.js': 'JV',
            })
            let r = genDocsExams(O(dir))
            //規格(自有套件之瀏覽器端取用與gh-pages)規則2+3: 已改指gh-pages之他套件網址,於產製時就地化, 範例頁不對外取用
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script('../libs/wsemi/dist/wsemi.umd.js'), script('../libs/w-jsonview-tree/dist/w-jsonview-tree.umd.js?v=2'), script('../dist/w-fake.umd.js'), ...nav))
            assert.strict.deepStrictEqual([...r.libs].sort(), ['w-jsonview-tree/dist/w-jsonview-tree.umd.js', 'wsemi/dist/wsemi.umd.js'])
            assert.strict.deepStrictEqual(r.warnings, [])
            assert.strict.deepStrictEqual(r.rewrites.length, 3)
        })

        it('gh-pages形態: 他人之github.io、擁有者不明(無repository)時不辨識(不動); 擁有者大小寫不拘; 找不到本機檔時保留並警告; keepCdn亦適用', function() {
            let u = 'https://some-owner.github.io/wsemi/dist/wsemi.umd.js'
            let uOther = 'https://other-owner.github.io/wsemi/dist/wsemi.umd.js'
            let base = { 'examples/ex-a.html': page(script(u), script(uOther)), 'dist/w-fake.umd.js': 'DIST', 'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI' }
            //他人之github.io不動
            let dir = mkCase(base)
            genDocsExams(O(dir))
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script('../libs/wsemi/dist/wsemi.umd.js'), script(uOther)))
            //無repository: 擁有者不明, gh-pages形態不辨識
            let dir2 = mkCase({ ...base, 'package.json': JSON.stringify({ name: 'w-fake', version: '1.0.0' }) })
            let r2 = genDocsExams(O(dir2))
            assert.strict.deepStrictEqual(get(dir2, 'docs/examples/ex-a.html'), page(script(u), script(uOther)))
            assert.strict.deepStrictEqual(r2.warnings, [])
            //擁有者大小寫不拘(gh-pages主機名為小寫)
            let dir3 = mkCase({ ...base, 'package.json': JSON.stringify({ name: 'w-fake', repository: 'github:Some-Owner/w-fake' }) })
            genDocsExams(O(dir3))
            assert.strict.deepStrictEqual(get(dir3, 'docs/examples/ex-a.html'), page(script('../libs/wsemi/dist/wsemi.umd.js'), script(uOther)))
            //找不到本機檔
            let dir4 = mkCase(base)
            fs.rmSync(path.join(dir4, 'node_modules/wsemi'), { recursive: true, force: true })
            let r4 = genDocsExams(O(dir4))
            assert.strict.deepStrictEqual(get(dir4, 'docs/examples/ex-a.html'), page(script(u), script(uOther)))
            assert.strict.deepStrictEqual(r4.warnings.length, 1)
            assert.strict.ok(r4.warnings[0].includes(u), r4.warnings[0])
            //keepCdn
            let dir5 = mkCase(base)
            let r5 = genDocsExams(O(dir5, { keepCdn: ['wsemi'] }))
            assert.strict.deepStrictEqual(get(dir5, 'docs/examples/ex-a.html'), page(script(u), script(uOther)))
            assert.strict.deepStrictEqual(r5.keeps, [{ file: 'ex-a.html', url: u }])
        })

        it('同一檔被多頁引用只複製一次; ?查詢與#片段保留; 多個套件各自複製; CSS與JS內之網址亦改寫', function() {
            let dir = mkCase({
                'examples/a.html': page(script('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js?v=1#h'), script('https://cdn.jsdelivr.net/npm/w-jsonview-tree@latest/dist/w-jsonview-tree.umd.js')),
                'examples/b.html': page(script('https://cdn.jsdelivr.net/npm/wsemi@1.0.0/dist/wsemi.umd.js')),
                'examples/s.css': '@import url(https://cdn.jsdelivr.net/npm/w-ui-x/dist/w-ui-x.css);',
                'examples/m.mjs': 'import x from \'https://unpkg.com/wsemi/dist/wsemi.umd.js\'\n',
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
                'node_modules/w-jsonview-tree/dist/w-jsonview-tree.umd.js': 'JV',
                'node_modules/w-ui-x/dist/w-ui-x.css': 'CSS',
            })
            let r = genDocsExams(O(dir))
            //R21②: 查詢與片段保留
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/a.html'), page(script('../libs/wsemi/dist/wsemi.umd.js?v=1#h'), script('../libs/w-jsonview-tree/dist/w-jsonview-tree.umd.js')))
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/s.css'), '@import url(../libs/w-ui-x/dist/w-ui-x.css);')
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/m.mjs'), 'import x from \'../libs/wsemi/dist/wsemi.umd.js\'\n')
            //R21②: 每個檔案只複製一次
            assert.strict.deepStrictEqual([...r.libs].sort(), ['w-jsonview-tree/dist/w-jsonview-tree.umd.js', 'w-ui-x/dist/w-ui-x.css', 'wsemi/dist/wsemi.umd.js'])
            assert.strict.deepStrictEqual(r.rewrites.length, 5)
        })

        it('本機找不到(套件未安裝/套件內無該檔)且路徑為/dist/<檔>: 改寫為擁有者之gh-pages網址並列入warnings(含網址與檔名), 範例其餘仍複製', function() {
            let u1 = 'https://cdn.jsdelivr.net/npm/w-not-installed/dist/a.umd.js'
            let u2 = 'https://cdn.jsdelivr.net/npm/wsemi/dist/missing.umd.js'
            let dir = mkCase({
                'examples/ex-a.html': page(script(u1), script(u2), script('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js')),
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
            })
            let r = genDocsExams(O(dir))
            let g1 = 'https://some-owner.github.io/w-not-installed/dist/a.umd.js'
            let g2 = 'https://some-owner.github.io/wsemi/dist/missing.umd.js'
            //wpt257b/規格規則2: 找不到者(dist檔)改指擁有者(取自package.json之repository)之gh-pages網址; 本機有者仍就地化
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script(g1), script(g2), script('../libs/wsemi/dist/wsemi.umd.js')))
            assert.strict.deepStrictEqual(r.rewrites.map((x) => [x.from, x.to]), [[u1, g1], [u2, g2], ['https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js', '../libs/wsemi/dist/wsemi.umd.js']])
            //R21②: 列入回傳之警告(含網址、檔名與改寫結果)
            assert.strict.deepStrictEqual(r.warnings.length, 2)
            assert.strict.ok(r.warnings[0].includes(u1) && r.warnings[0].includes('ex-a.html') && r.warnings[0].includes(`rewritten to the gh-pages url[${g1}]`), r.warnings[0])
            assert.strict.ok(r.warnings[1].includes(u2) && r.warnings[1].includes('missing.umd.js') && r.warnings[1].includes(`rewritten to the gh-pages url[${g2}]`), r.warnings[1])
            assert.strict.deepStrictEqual(r.libs, ['wsemi/dist/wsemi.umd.js'])
        })

        it('本機找不到之gh-pages網址: 版本與協定形式不拘(@x.y.z、@latest、無協定、http、unpkg)皆正規化為https且不釘版; ?查詢與#片段、%編碼保留', function() {
            let us = [
                'https://cdn.jsdelivr.net/npm/w-a@1.2.3/dist/a.umd.js',
                'https://cdn.jsdelivr.net/npm/w-a@latest/dist/a.umd.js?v=1#h',
                '//cdn.jsdelivr.net/npm/w-b/dist/sub/b%20c.js',
                'http://unpkg.com/w-c@^1.0.0/dist/c.css',
                'https://fastly.jsdelivr.net/npm/w-d/dist/d.umd.js',
            ]
            let dir = mkCase({
                'examples/ex-a.html': page(...us.map(script)),
                'dist/w-fake.umd.js': 'DIST',
            })
            let r = genDocsExams(O(dir))
            let o = 'https://some-owner.github.io'
            //不釘版(規格規則5)、保留查詢片段與編碼
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script(`${o}/w-a/dist/a.umd.js`), script(`${o}/w-a/dist/a.umd.js?v=1#h`), script(`${o}/w-b/dist/sub/b%20c.js`), script(`${o}/w-c/dist/c.css`), script(`${o}/w-d/dist/d.umd.js`)))
            assert.strict.deepStrictEqual(r.warnings.length, 5)
            assert.strict.deepStrictEqual(r.libs, [])
        })

        it('本機找不到且路徑不是單純之/dist/<檔>(/res/…、/dist/、/dist/../x、/dist//x、反斜線、%2F、無repository之擁有者不明): 保留原網址並警告, 不組gh-pages網址', function() {
            let us = [
                'https://cdn.jsdelivr.net/npm/w-a/res/data/x.js',
                'https://cdn.jsdelivr.net/npm/w-a/dist/',
                'https://cdn.jsdelivr.net/npm/w-a/dist/../x.js',
                'https://cdn.jsdelivr.net/npm/w-a/dist//x.js',
                'https://cdn.jsdelivr.net/npm/w-a/dist/a\\b.js',
                'https://cdn.jsdelivr.net/npm/w-a/dist/a%2Fb.js',
                'https://cdn.jsdelivr.net/npm/w-a/dist/a%5Cb.js',
                'https://cdn.jsdelivr.net/npm/w-a/dist/./x.js',
            ]
            let dir = mkCase({
                'examples/ex-a.html': page(...us.map(script)),
                'dist/w-fake.umd.js': 'DIST',
            })
            let r = genDocsExams(O(dir))
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(...us.map(script)))
            assert.strict.deepStrictEqual(r.rewrites, [])
            assert.strict.deepStrictEqual(r.warnings.length, us.length, JSON.stringify(r.warnings))
            assert.strict.ok(r.warnings.every((s) => s.includes('kept') && !s.includes('github.io')), JSON.stringify(r.warnings))
            //擁有者不明(無repository): /dist/<檔>亦無法組網址, 保留並警告
            let dir2 = mkCase({
                'examples/ex-a.html': page(script('https://cdn.jsdelivr.net/npm/w-a/dist/a.umd.js')),
                'package.json': JSON.stringify({ name: 'w-fake', version: '1.0.0' }),
            })
            let r2 = genDocsExams(O(dir2))
            assert.strict.deepStrictEqual(get(dir2, 'docs/examples/ex-a.html'), page(script('https://cdn.jsdelivr.net/npm/w-a/dist/a.umd.js')))
            assert.strict.deepStrictEqual(r2.warnings.length, 1)
            assert.strict.deepStrictEqual(r2.rewrites, [])
        })

        it('本機找不到: keepCdn內之套件優先(保留CDN、不警告、列入keeps); 已是gh-pages網址者原樣保留並警告(不記為改寫); 本機找得到者不改指gh-pages', function() {
            let ghU = 'https://some-owner.github.io/w-none/dist/n.umd.js'
            let dir = mkCase({
                'examples/ex-a.html': page(script('https://cdn.jsdelivr.net/npm/w-demores/dist/x.js'), script(ghU), script('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js')),
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
            })
            let r = genDocsExams(O(dir))
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script('https://cdn.jsdelivr.net/npm/w-demores/dist/x.js'), script(ghU), script('../libs/wsemi/dist/wsemi.umd.js')))
            assert.strict.deepStrictEqual(r.keeps.length, 1)
            assert.strict.deepStrictEqual(r.rewrites.map((x) => x.to), ['../libs/wsemi/dist/wsemi.umd.js'])
            assert.strict.deepStrictEqual(r.warnings.length, 1)
            assert.strict.ok(r.warnings[0].includes(ghU) && r.warnings[0].includes('kept as the gh-pages url'), r.warnings[0])
        })

        it('同類警告於主控台歸併: 多頁各一則者印一列「warning xN: …」(不含檔名), 單則者印全文; 回傳之warnings仍逐則完整', function() {
            let u = 'https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.min.js'
            let dir = mkCase({
                'examples/a.html': page(script(u)),
                'examples/b.html': page(script(u)),
                'examples/c.html': page(script(u), script('https://cdn.jsdelivr.net/npm/w-solo/dist/solo.js')),
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
            })
            let { v, lines } = capture(() => genDocsExams(O(dir, { bLog: true })))
            //回傳逐則(含檔名)
            assert.strict.deepStrictEqual(v.warnings.length, 4)
            assert.strict.ok(v.warnings.some((s) => s.includes('file[a.html]')) && v.warnings.some((s) => s.includes('file[b.html]')) && v.warnings.some((s) => s.includes('file[c.html]')))
            //主控台: 同網址之三則歸併為一列(印次數, 不含檔名), 單則印全文(含檔名)
            let ws = lines.filter((s) => s.startsWith('  warning'))
            assert.strict.deepStrictEqual(ws.length, 2, lines.join('\n'))
            assert.strict.ok(ws.some((s) => s.startsWith('  warning x3: ') && s.includes(u) && !/in file\[/.test(s)), ws.join('\n'))
            assert.strict.ok(ws.some((s) => s.startsWith('  warning: ') && s.includes('w-solo') && s.includes('file[c.html]')), ws.join('\n'))
        })

        it('keepCdn: 預設w-demores保留CDN(不複製、不警告、列入keeps); 可指定其他套件; 給[]則一般處理', function() {
            let u = 'https://cdn.jsdelivr.net/npm/w-demores/res/data/dataEasy.js'
            let u2 = 'https://cdn.jsdelivr.net/npm/w-gis/dist/w-gis.umd.js'
            let files = {
                'examples/ex-a.html': page(script(u), script(u2)),
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/w-demores/res/data/dataEasy.js': 'DATA',
                'node_modules/w-gis/dist/w-gis.umd.js': 'GIS',
            }
            let dir = mkCase(files)
            let r = genDocsExams(O(dir))
            //R21②: 預設保留w-demores, 其餘(w-gis)複製
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script(u), script('../libs/w-gis/dist/w-gis.umd.js')))
            assert.strict.deepStrictEqual(r.keeps, [{ file: 'ex-a.html', url: u }])
            assert.strict.deepStrictEqual(has(dir, 'docs/libs/w-demores'), false)
            assert.strict.deepStrictEqual(r.warnings, [])
            let dir2 = mkCase(files)
            let r2 = genDocsExams(O(dir2, { keepCdn: ['w-gis'] }))
            //R21②: keepCdn由opt指定(取代預設)
            assert.strict.deepStrictEqual(get(dir2, 'docs/examples/ex-a.html'), page(script('../libs/w-demores/res/data/dataEasy.js'), script(u2)))
            assert.strict.deepStrictEqual(r2.keeps, [{ file: 'ex-a.html', url: u2 }])
            let dir3 = mkCase(files)
            fs.rmSync(path.join(dir3, 'node_modules/w-demores'), { recursive: true, force: true })
            let r3 = genDocsExams(O(dir3, { keepCdn: [] }))
            //R21②: keepCdn為[]時w-demores與一般套件同(本機無則警告)
            assert.strict.deepStrictEqual(r3.keeps, [])
            assert.strict.ok(r3.warnings.some((s) => s.includes(u)), JSON.stringify(r3.warnings))
        })

        it('第三方套件與外形相似者一律不動: 內容位元一致、無libs、無警告', function() {
            let html = page(
                script('https://cdn.jsdelivr.net/npm/vue@2.x/dist/vue.min.js'),
                script('https://cdn.jsdelivr.net/npm/lodash/lodash.min.js'),
                '<script nomodule src="https://cdn.jsdelivr.net/npm/@babel/polyfill@7.12.1/dist/polyfill.min.js"></script>',
                script('https://cdn.jsdelivr.net/npm/@w-scope/w-x/dist/x.js'),
                script('https://cdn.jsdelivr.net/npm/wsemi-extra/dist/x.js'),
                script('https://cdn.jsdelivr.net/npm/wsemi.js/dist/x.js'),
                script('https://cdn.jsdelivr.net/npm/w-fake_x/dist/x.js'),
                script('https://cdn.jsdelivr.net/npm/wx-foo/dist/x.js'),
                script('https://cdn.jsdelivr.net/npm/www-foo/dist/x.js'),
                script('https://cdn.jsdelivr.net/gh/yuda-lyu/w-gis@master/dist/x.js'),
                script('https://raw.githubusercontent.com/yuda-lyu/w-demores/master/res/a.js'),
                script('https://example.com/npm/wsemi/dist/wsemi.umd.js'),
                script('https://cdn.jsdelivr.net.example.com/npm/wsemi/dist/wsemi.umd.js'),
                script('https://xcdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js'),
                script('https://cdn.jsdelivr.net/npm/Wsemi/dist/wsemi.umd.js'),
                '<a href="//yuda-lyu.github.io/w-fake/examples/ex-a.html">example</a>'
            )
            let dir = mkCase({
                'examples/ex-a.html': html,
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
                'node_modules/wsemi-extra/dist/x.js': 'X',
                'node_modules/w-gis/dist/x.js': 'X',
            })
            let r = genDocsExams(O(dir))
            //R21③: 第三方與非自有套件之網址不動
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), html)
            assert.strict.deepStrictEqual(r.libs, [])
            assert.strict.deepStrictEqual(r.rewrites, [])
            assert.strict.deepStrictEqual(r.warnings, [])
        })

        it('本套件名取自package.json(不寫死): 自身CDN網址(任何版號/形式)改指docs/dist, 他名視為其他自有套件', function() {
            let dir = mkCase({
                'examples/ex-a.html': page(
                    script('https://cdn.jsdelivr.net/npm/w-foo-bar@9.9.9/dist/w-foo-bar.umd.js'),
                    script('https://cdn.jsdelivr.net/npm/w-foo-bar/dist/w-foo-bar.wk.umd.js?x=1'),
                    script('https://cdn.jsdelivr.net/npm/w-foo/dist/w-foo.umd.js'),
                    script('../dist/w-foo-bar.umd.js')
                ),
                'dist/w-foo-bar.umd.js': 'SELF',
                'dist/w-foo-bar.wk.umd.js': 'SELFWK',
                'node_modules/w-foo/dist/w-foo.umd.js': 'OTHER',
            }, 'w-foo-bar')
            let r = genDocsExams(O(dir))
            //R21: 自身名稱取自package.json, 自身網址改指同站dist(含查詢保留)
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(
                script('../dist/w-foo-bar.umd.js'),
                script('../dist/w-foo-bar.wk.umd.js?x=1'),
                script('../libs/w-foo/dist/w-foo.umd.js'),
                script('../dist/w-foo-bar.umd.js')
            ))
            assert.strict.deepStrictEqual(r.name, 'w-foo-bar')
            assert.strict.deepStrictEqual(r.libs, ['w-foo/dist/w-foo.umd.js'])
            assert.strict.deepStrictEqual(r.warnings, [])
        })

        it('自身網址: 路徑不在/dist/下、或跳出dist(/dist/../x、/dist/)保留原網址並警告; 檔不在dist者, 預設(dist由部署提供, 不驗證)改指同站dist, bCopyDist為true時保留並警告', function() {
            let u1 = 'https://cdn.jsdelivr.net/npm/w-fake@1.0.0/dist/nofile.umd.js'
            let u2 = 'https://cdn.jsdelivr.net/npm/w-fake@1.0.0/res/a.js'
            let u3 = 'https://cdn.jsdelivr.net/npm/w-fake@1.0.0/dist/../x.js'
            let u4 = 'https://cdn.jsdelivr.net/npm/w-fake@1.0.0/dist/'
            let u5 = 'https://cdn.jsdelivr.net/npm/w-fake@1.0.0/dist/..'
            let u6 = 'https://cdn.jsdelivr.net/npm/w-fake@1.0.0/dist/Z:/x.js' //Windows下為他磁碟機之絕對路徑
            let outs = [u2, u3, u4, u5, ...(process.platform === 'win32' ? [u6] : [])]
            let files = {
                'examples/ex-a.html': page(script(u1), ...outs.map(script)),
                'dist/w-fake.umd.js': 'DIST',
            }
            let dir = mkCase(files)
            let r = genDocsExams(O(dir))
            //wpt257b: 預設不複製也不驗證dist(部署時由bin/gh-pages提供), 檔名單純者改指同站dist; 非/dist/下與跳出dist者保留並警告
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script('../dist/nofile.umd.js'), ...outs.map(script)))
            assert.strict.deepStrictEqual(r.warnings.length, outs.length, JSON.stringify(r.warnings))
            assert.strict.deepStrictEqual(r.rewrites, [{ file: 'ex-a.html', from: u1, to: '../dist/nofile.umd.js' }])
            //bCopyDist為true: 找不到者保留原網址並警告(R21原行為)
            let dir2 = mkCase(files)
            let r2 = genDocsExams(O(dir2, { bCopyDist: true }))
            assert.strict.deepStrictEqual(get(dir2, 'docs/examples/ex-a.html'), page(script(u1), ...outs.map(script)))
            assert.strict.deepStrictEqual(r2.warnings.length, outs.length + 1, JSON.stringify(r2.warnings))
        })

        it('路徑跳出套件資料夾(../、%2F、反斜線): 不複製套件外之檔, 保留原網址並警告', function() {
            let us = [
                'https://cdn.jsdelivr.net/npm/w-a/../secret.txt',
                'https://cdn.jsdelivr.net/npm/w-a/dist/../../secret.txt',
                'https://cdn.jsdelivr.net/npm/w-a/dist/..%2F..%2Fsecret.txt',
                'https://cdn.jsdelivr.net/npm/w-a/dist/..\\..\\secret.txt',
                'https://cdn.jsdelivr.net/npm/w-a/.',
            ]
            let dir = mkCase({
                'examples/ex-a.html': page(...us.map(script)),
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/secret.txt': 'SECRET',
                'node_modules/w-a/dist/ok.js': 'OK',
            })
            let r = genDocsExams(O(dir))
            //R21: 套件外之檔不被複製(docs內無secret.txt), 網址保留
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(...us.map(script)))
            assert.strict.deepStrictEqual(Object.keys(snap(path.join(dir, 'docs'))).filter((k) => k.includes('secret')), [])
            assert.strict.deepStrictEqual(r.libs, [])
            assert.strict.ok(r.warnings.length >= 5, JSON.stringify(r.warnings))
        })

        it('樣板變數與無路徑之網址: 保留原網址並警告', function() {
            let dir = mkCase({
                // eslint-disable-next-line no-template-curly-in-string
                'examples/ex-a.html': '<script src="https://cdn.jsdelivr.net/npm/w-fake@${pks.version}/dist/w-fake.umd.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/wsemi@1.0.0"></script>\n<script src="https://cdn.jsdelivr.net/npm/wsemi/"></script>\n',
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
            })
            let r = genDocsExams(O(dir))
            //R21②: 無法解析者不改, 以警告回報
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), get(dir, 'examples/ex-a.html'))
            assert.strict.deepStrictEqual(r.warnings.length, 3)
        })

        it('網址含%編碼: 以解碼後檔名查找, 改寫後保留原編碼', function() {
            let dir = mkCase({
                'examples/ex-a.html': page(script('https://cdn.jsdelivr.net/npm/w-a/dist/a%20b.js'), script('https://cdn.jsdelivr.net/npm/w-a/dist/bad%E0%A4%A.js')),
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/w-a/dist/a b.js': 'AB',
            })
            let r = genDocsExams(O(dir))
            //R21②: 解碼查找、保留編碼; 無法解碼者保留並警告
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script('../libs/w-a/dist/a%20b.js'), script('https://cdn.jsdelivr.net/npm/w-a/dist/bad%E0%A4%A.js')))
            assert.strict.deepStrictEqual(get(dir, 'docs/libs/w-a/dist/a b.js'), 'AB')
            assert.strict.deepStrictEqual(r.warnings.length, 1)
        })

    })

    describe('相對dist引用(自身)', function() {

        it('範例檔在專案根、引用dist/…(files指定): 複製到docs/examples後改指../dist/…; 只複製files指定者; 完整網址與他處之dist/不被當成本套件dist', function() {
            let others = [script('https://example.com/dist/w-fake.umd.js'), '<img src="assets/dist/w-fake.umd.js">']
            let dir = mkCase({
                'web.html': page(script('dist/w-fake.umd.js'), ...others),
                'other.html': page(script('dist/w-fake.umd.js')),
                'dist/w-fake.umd.js': 'DIST',
            })
            let r = genDocsExams(O(dir, { fdSrc: dir, files: ['web.html'] }))
            //R21①: 複製後原引用失效者改指fdTarDist之同一檔; 完整網址、assets/dist/(前一字元為/或字母)不動
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/web.html'), page(script('../dist/w-fake.umd.js'), ...others))
            assert.strict.deepStrictEqual(r.rewrites, [{ file: 'web.html', from: 'dist/w-fake.umd.js', to: '../dist/w-fake.umd.js' }])
            assert.strict.deepStrictEqual(r.warnings, [])
            //R21: files只複製指定者(fdSrc含fdTar之上層不報重疊)
            assert.strict.deepStrictEqual(r.examples, ['web.html'])
            assert.strict.deepStrictEqual(has(dir, 'docs/examples/other.html'), false)
        })

        it('目錄配置可調: fdTar為docs根時, 同層之相對路徑以./開頭, 自身../dist/引用改指同層dist', function() {
            let dir = mkCase({
                'examples/ex-a.html': page(script('../dist/w-fake.umd.js'), script('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js')),
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
            })
            let r = genDocsExams(O(dir, { fdTar: path.join(dir, 'docs') }))
            //R21: 相對路徑以./或../開頭(瀏覽器以同層檔案解析)
            assert.strict.deepStrictEqual(get(dir, 'docs/ex-a.html'), page(script('./dist/w-fake.umd.js'), script('./libs/wsemi/dist/wsemi.umd.js')))
            assert.strict.deepStrictEqual(r.warnings, [])
        })

        it('預設(dist由部署提供): 引用的dist檔不存在、dist資料夾不存在或為空(script.txt中本函數在dist建置之前執行)皆不警告、不影響範例複製與引用保持原字串', function() {
            //wpt257b: 與dist建置之先後無關, 預設不再警告
            let html = page(script('../dist/missing.umd.js'), script('../dist/w-fake.umd.js'))
            let dir = mkCase({ 'examples/ex-a.html': html, 'dist/w-fake.umd.js': 'DIST' })
            let r = genDocsExams(O(dir))
            assert.strict.deepStrictEqual(r.warnings, [])
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), html)
            //資料夾不存在
            let dir2 = mkCase({ 'examples/ex-a.html': page(script('../dist/w-fake.umd.js')) })
            let r2 = genDocsExams(O(dir2))
            assert.strict.deepStrictEqual(r2.warnings, [], JSON.stringify(r2.warnings))
            assert.strict.deepStrictEqual(r2.examples, ['ex-a.html'])
            assert.strict.deepStrictEqual(get(dir2, 'docs/examples/ex-a.html'), page(script('../dist/w-fake.umd.js')))
            //資料夾為空(cleanFolder剛清空)
            let dir3 = mkCase({ 'examples/ex-a.html': page(script('../dist/w-fake.umd.js')) })
            fs.mkdirSync(path.join(dir3, 'dist'))
            let r3 = genDocsExams(O(dir3))
            assert.strict.deepStrictEqual(r3.warnings, [], JSON.stringify(r3.warnings))
            //範例無任何dist引用且dist不存在
            let dir4 = mkCase({ 'examples/ex-a.html': '<p>x</p>' })
            assert.strict.deepStrictEqual(genDocsExams(O(dir4)).warnings, [])
        })

        it('bCopyDist為true: 引用的dist檔不存在(未建置/檔名誤)或dist資料夾不存在/為空: 以warnings回報, 其餘照常複製', function() {
            let dir = mkCase({
                'examples/ex-a.html': page(script('../dist/missing.umd.js'), script('../dist/w-fake.umd.js')),
                'dist/w-fake.umd.js': 'DIST',
            })
            let r = genDocsExams(O(dir, { bCopyDist: true }))
            assert.strict.deepStrictEqual(r.warnings.length, 1)
            assert.strict.ok(r.warnings[0].includes('missing.umd.js') && r.warnings[0].includes('ex-a.html'), r.warnings[0])
            //資料夾不存在
            let dir2 = mkCase({ 'examples/ex-a.html': page(script('../dist/w-fake.umd.js')) })
            let r2 = genDocsExams(O(dir2, { bCopyDist: true }))
            //R21: dist未建置須有警告: 資料夾本身一則、引用之檔一則(註明folder not found)
            assert.strict.deepStrictEqual(r2.warnings.length, 2, JSON.stringify(r2.warnings))
            assert.strict.ok(r2.warnings.some((s) => s.startsWith('dist folder[') && s.includes('not found, nothing copied')), JSON.stringify(r2.warnings))
            assert.strict.ok(r2.warnings.some((s) => s.startsWith('dist file[') && s.includes('(folder not found)')), JSON.stringify(r2.warnings))
            assert.strict.deepStrictEqual(r2.examples, ['ex-a.html'])
            assert.strict.ok(has(dir2, 'docs/examples/ex-a.html'))
            //範例無任何dist引用時, dist資料夾不存在仍警告(僅資料夾一則)
            let dir2b = mkCase({ 'examples/ex-a.html': '<p>x</p>' })
            let r2b = genDocsExams(O(dir2b, { bCopyDist: true }))
            assert.strict.deepStrictEqual(r2b.warnings.length, 1, JSON.stringify(r2b.warnings))
            assert.strict.ok(r2b.warnings[0].startsWith('dist folder[') && r2b.warnings[0].includes('not found, nothing copied'), r2b.warnings[0])
            //資料夾為空(cleanFolder剛清空)
            let dir3 = mkCase({ 'examples/ex-a.html': page(script('../dist/w-fake.umd.js')) })
            fs.mkdirSync(path.join(dir3, 'dist'))
            let r3 = genDocsExams(O(dir3, { bCopyDist: true }))
            assert.strict.ok(r3.warnings.some((s) => s.includes('no file to copy')), JSON.stringify(r3.warnings))
        })

        it('他處之dist(如examples/dist/或libs/…/dist/或完整網址之/dist/)不被當成本套件dist', function() {
            let html = page(script('./dist/local.js'), script('../libs/wsemi/dist/wsemi.umd.js'), script('https://example.com/dist/a.js'), '<a href="/dist/a.js">x</a>')
            let dir = mkCase({
                'examples/ex-a.html': html,
                'dist/w-fake.umd.js': 'DIST',
                'examples/dist/local.js': 'LOCAL',
            })
            let r = genDocsExams(O(dir))
            //R21: 非本套件dist之引用不動、不警告
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), html)
            assert.strict.deepStrictEqual(r.warnings, [])
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/dist/local.js'), 'LOCAL')
        })

    })

    describe('原地改寫fdTar內既有之頁面(bInplace, wpt257b)', function() {

        let uWsemiMin = 'https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.min.js'
        let uGis = 'https://cdn.jsdelivr.net/npm/w-gis@latest/dist/w-gis.umd.js'
        let uDemo = 'https://cdn.jsdelivr.net/npm/w-demores/res/data/dataRain.js'
        let uVue = 'https://cdn.jsdelivr.net/npm/vue@2.x/dist/vue.min.js'
        let uJv = 'https://some-owner.github.io/w-jsonview-tree/dist/w-jsonview-tree.umd.js'
        let uSelf = 'https://cdn.jsdelivr.net/npm/w-fake@9.9.9/dist/w-fake.umd.js'
        let nm = {
            'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
            'node_modules/w-gis/dist/w-gis.umd.js': 'GIS',
            'node_modules/w-jsonview-tree/dist/w-jsonview-tree.umd.js': 'JV',
        }

        it('既有頁面(如gDistApp產製之app.html)之自有套件網址一併改寫, 規則同複製來之檔: 就地化、gh-pages形態、本機無檔改指gh-pages、keepCdn、自身改指同站dist、第三方不動; inplace列出有變動者, 不列入examples', function() {
            let app = page(script(uWsemiMin), script(uGis), script(uDemo), script(uVue), script(uJv), script(uSelf), script('../dist/w-fake.umd.js'))
            let bin = Buffer.concat([Buffer.from([0xff, 0xfe, 0x00]), Buffer.from(uGis)])
            let big5 = Buffer.concat([Buffer.from('<html>'), Buffer.from([0xa4, 0xa4, 0xa4, 0xe5]), Buffer.from('</html>')])
            let dir = mkCase({
                'docs/examples/app.html': app,
                'docs/examples/app.umd.js': `var a = 1\n//no url here\n`,
                'docs/examples/app.umd.js.map': uGis,
                'docs/examples/data.json': uGis,
                'docs/examples/pic.png': bin,
                'docs/examples/big5.html': big5,
                'examples/ex-a.html': page(script(uGis)),
                'dist/w-fake.umd.js': 'DIST',
                ...nm,
            })
            let r = genDocsExams(O(dir))
            //wpt257b#3: 既有頁面一併改寫(規則同複製來之檔); app.html之w-gis就地化(本機有), wsemi.umd.min.js本機無(只有umd.js)改指gh-pages
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/app.html'), page(
                script('https://some-owner.github.io/wsemi/dist/wsemi.umd.min.js'),
                script('../libs/w-gis/dist/w-gis.umd.js'),
                script(uDemo),
                script(uVue),
                script('../libs/w-jsonview-tree/dist/w-jsonview-tree.umd.js'),
                script('../dist/w-fake.umd.js'),
                script('../dist/w-fake.umd.js')
            ))
            //inplace只列內容有變動者; examples只列由fdSrc複製者
            assert.strict.deepStrictEqual(r.inplace, ['app.html'])
            assert.strict.deepStrictEqual(r.examples, ['ex-a.html'])
            assert.strict.deepStrictEqual(r.keeps.map((x) => x.file), ['app.html'])
            assert.strict.deepStrictEqual(r.warnings.length, 1)
            assert.strict.ok(r.warnings[0].includes(uWsemiMin) && r.warnings[0].includes('app.html'), r.warnings[0])
            //非extsText副檔名(.map、.json、.png)與無改寫之檔(含非UTF-8)位元不動
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/app.umd.js.map'), uGis)
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/data.json'), uGis)
            assert.strict.deepStrictEqual(fs.readFileSync(path.join(dir, 'docs/examples/pic.png')).toString('hex'), bin.toString('hex'))
            assert.strict.deepStrictEqual(fs.readFileSync(path.join(dir, 'docs/examples/big5.html')).toString('hex'), big5.toString('hex'))
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/app.umd.js'), `var a = 1\n//no url here\n`)
            //複製來之檔照常改寫
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script('../libs/w-gis/dist/w-gis.umd.js')))
            assert.strict.deepStrictEqual([...r.libs].sort(), ['w-gis/dist/w-gis.umd.js', 'w-jsonview-tree/dist/w-jsonview-tree.umd.js'])
        })

        it('由fdSrc複製覆蓋同名既有檔者只處理一次(不列入inplace、rewrites不重複); 其餘既有檔仍原地改寫; 子資料夾內相對路徑深度正確', function() {
            let dir = mkCase({
                'docs/examples/ex-a.html': page(script(uGis), script('STALE-OLD')),
                'docs/examples/stale.html': page(script(uGis)),
                'docs/examples/sub/deep/p.html': page(script(uGis)),
                'examples/ex-a.html': page(script(uGis)),
                ...nm,
            })
            let r = genDocsExams(O(dir))
            //覆蓋(非合併): 複製來之內容取代既有內容, 且只處理一次
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script('../libs/w-gis/dist/w-gis.umd.js')))
            assert.strict.deepStrictEqual(r.examples, ['ex-a.html'])
            assert.strict.deepStrictEqual(r.inplace, ['stale.html', 'sub/deep/p.html'])
            assert.strict.deepStrictEqual(r.rewrites.filter((x) => x.file === 'ex-a.html').length, 1)
            assert.strict.deepStrictEqual(r.rewrites.length, 3)
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/sub/deep/p.html'), page(script('../../../libs/w-gis/dist/w-gis.umd.js')))
        })

        it('bInplace為false: 既有檔不改寫(位元不動), 只改寫由fdSrc複製者', function() {
            let pre = page(script(uGis))
            let dir = mkCase({
                'docs/examples/app.html': pre,
                'examples/ex-a.html': page(script(uGis)),
                ...nm,
            })
            let r = genDocsExams(O(dir, { bInplace: false }))
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/app.html'), pre)
            assert.strict.deepStrictEqual(r.inplace, [])
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/ex-a.html'), page(script('../libs/w-gis/dist/w-gis.umd.js')))
        })

        it('既有檔之相對dist引用以其目前位置判定: 已指向fdTarDist同一檔(../dist/…)或他處(dist/…)者保持原字串且不重寫(mtime不變); 指向專案./dist者(../../dist/…)改指fdTarDist', function() {
            let same = page(script('../dist/w-fake.umd.js'), script('dist/w-fake.umd.js'), script(uVue))
            let dir = mkCase({
                'docs/examples/p.html': same,
                'dist/w-fake.umd.js': 'DIST',
                'examples/ex-a.html': 'x',
            })
            let fp = path.join(dir, 'docs/examples/p.html')
            let old = new Date('2001-02-03T04:05:06Z')
            fs.utimesSync(fp, old, old)
            let r = genDocsExams(O(dir))
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/p.html'), same)
            assert.strict.deepStrictEqual(fs.statSync(fp).mtimeMs, old.getTime())
            assert.strict.deepStrictEqual(r.inplace, [])
            assert.strict.deepStrictEqual(r.rewrites, [])
            //頁面位置(docs/examples)之../../dist/…指向專案./dist(部署後在站台根之上, 無效): 改指fdTarDist之同一檔
            let dir2 = mkCase({
                'docs/examples/q.html': page(script('../../dist/w-fake.umd.js')),
                'docs/examples/sub/r.html': page(script('../../../dist/w-fake.umd.js')),
                'dist/w-fake.umd.js': 'DIST',
                'examples/ex-a.html': 'x',
            })
            let r2 = genDocsExams(O(dir2))
            assert.strict.deepStrictEqual(get(dir2, 'docs/examples/q.html'), page(script('../dist/w-fake.umd.js')))
            assert.strict.deepStrictEqual(get(dir2, 'docs/examples/sub/r.html'), page(script('../../dist/w-fake.umd.js')))
            assert.strict.deepStrictEqual(r2.inplace, ['q.html', 'sub/r.html'])
        })

        it('fdLibs與fdTarDist位於fdTar內時其內之檔不改寫(其為函式庫/發布檔而非頁面); fdTar內之頁面照改', function() {
            let lib = 'var u = "https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js"\n'
            let dir = mkCase({
                'docs/page.html': page(script(uGis)),
                'docs/libs/other/dist/a.js': lib,
                'docs/dist/b.js': lib,
                'docs/other/c.js': lib,
                'dist/w-fake.umd.js': 'DIST',
                ...nm,
                'examples/a.html': 'x',
            })
            let r = genDocsExams(O(dir, { fdTar: path.join(dir, 'docs') }))
            assert.strict.deepStrictEqual(get(dir, 'docs/libs/other/dist/a.js'), lib)
            assert.strict.deepStrictEqual(get(dir, 'docs/dist/b.js'), lib)
            assert.strict.deepStrictEqual(get(dir, 'docs/page.html'), page(script('./libs/w-gis/dist/w-gis.umd.js')))
            assert.strict.deepStrictEqual(get(dir, 'docs/other/c.js'), 'var u = "../libs/wsemi/dist/wsemi.umd.js"\n')
            assert.strict.deepStrictEqual(r.inplace, ['other/c.js', 'page.html'])
        })

        it('改寫保留BOM與CRLF; 重跑冪等(第二次inplace為空、檔案內容不變)', function() {
            let bom = '﻿<html>\r\n<script src="https://cdn.jsdelivr.net/npm/w-gis@latest/dist/w-gis.umd.js"></script>\r\n</html>\r\n'
            let dir = mkCase({
                'docs/examples/app.html': bom,
                'examples/ex-a.html': 'x',
                ...nm,
            })
            let r1 = genDocsExams(O(dir))
            assert.strict.deepStrictEqual(get(dir, 'docs/examples/app.html'), bom.replace(uGis, '../libs/w-gis/dist/w-gis.umd.js'))
            assert.strict.deepStrictEqual(r1.inplace, ['app.html'])
            let s1 = snap(path.join(dir, 'docs'))
            let r2 = genDocsExams(O(dir))
            assert.strict.deepStrictEqual(r2.inplace, [])
            assert.strict.deepStrictEqual(snap(path.join(dir, 'docs')), s1)
            assert.strict.deepStrictEqual(r2.rewrites, [])
        })

        it('fdTar不存在(且無範例可複製): 不報錯、inplace為空; fdTar內之連結不跟進(略過並警告, 連結目標內容不被改寫)', function() {
            let dir = mkCase({ 'dist/w-fake.umd.js': 'DIST' })
            let r = genDocsExams(O(dir, { fdSrc: '' }))
            assert.strict.deepStrictEqual(r.inplace, [])
            assert.strict.deepStrictEqual(has(dir, 'docs'), false)
            let dir2 = mkCase({
                'docs/examples/app.html': page(script(uGis)),
                'outside/o.html': page(script(uGis)),
                ...nm,
            })
            let link = path.join(dir2, 'docs/examples/lnk')
            try {
                fs.symlinkSync(path.join(dir2, 'outside'), link, 'junction')
            }
            catch (e) {
                this.skip() //無權限建立連結之環境
            }
            try {
                let r2 = genDocsExams(O(dir2, { fdSrc: '' }))
                assert.strict.deepStrictEqual(r2.inplace, ['app.html'])
                assert.strict.ok(r2.warnings.some((s) => s.includes('lnk') && s.includes('skipped')), JSON.stringify(r2.warnings))
            }
            finally {
                try {
                    fs.unlinkSync(link)
                }
                catch (e) {
                    fs.rmdirSync(link)
                }
            }
            assert.strict.deepStrictEqual(get(dir2, 'outside/o.html'), page(script(uGis)))
        })

    })

    describe('無範例頁(fdSrc為\'\')', function() {

        it('fdSrc為\'\': 不複製範例也不要求資料夾存在; 預設不複製dist(無任何輸出); bCopyDist為true才複製dist', function() {
            let dir = mkCase({ 'dist/w-fake.umd.js': 'DIST' })
            let r0 = genDocsExams(O(dir, { fdSrc: '' }))
            //wpt257b: dist由bin/gh-pages部署時提供, 無範例頁之套件不必再呼叫本函數; 呼叫亦不產生任何輸出
            assert.strict.deepStrictEqual(r0.examples, [])
            assert.strict.deepStrictEqual(r0.dist, [])
            assert.strict.deepStrictEqual(r0.warnings, [])
            assert.strict.deepStrictEqual(has(dir, 'docs'), false)
            let r = genDocsExams(O(dir, { fdSrc: '', bCopyDist: true }))
            //R21: 特殊情形(不經bin/gh-pages部署)可自行複製dist
            assert.strict.deepStrictEqual(r.examples, [])
            assert.strict.deepStrictEqual(r.dist, ['w-fake.umd.js'])
            assert.strict.deepStrictEqual(r.warnings, [])
            assert.strict.deepStrictEqual(has(dir, 'docs/examples'), false)
        })

    })

    describe('摘要與主控台輸出', function() {

        it('回傳{ name, examples, inplace, dist, libs, rewrites, keeps, warnings }; bLog為true(預設)時印出摘要與警告, false時不印', function() {
            let dir = mkCase({
                'examples/ex-a.html': page(script('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js'), script('https://cdn.jsdelivr.net/npm/w-none/dist/a.js')),
                'docs/examples/pre.html': page(script('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js')),
                'dist/w-fake.umd.js': 'DIST',
                'node_modules/wsemi/dist/wsemi.umd.js': 'WSEMI',
            })
            let { v, lines } = capture(() => genDocsExams(O(dir, { bLog: true })))
            //R21: 回傳摘要之結構
            assert.strict.deepStrictEqual(Object.keys(v), ['name', 'examples', 'inplace', 'dist', 'libs', 'rewrites', 'keeps', 'warnings'])
            assert.strict.deepStrictEqual(v.name, 'w-fake')
            assert.strict.deepStrictEqual(v.inplace, ['pre.html'])
            //R21: 主控台印出(摘要列、改寫列、警告列); dist預設不複製, 摘要註明
            let text = lines.join('\n')
            assert.strict.ok(text.includes('genDocsExams[w-fake]') && text.includes('examples 1 file(s)') && text.includes('in-place 1 file(s)') && text.includes('dist not copied (provided by deploy)') && text.includes('libs 1 file(s)') && text.includes('rewritten 3 url(s)') && text.includes('warnings 1'), text)
            //同一網址於ex-a.html與原地改寫之pre.html各一筆, 歸併為x2
            assert.strict.ok(text.includes('rewrite x2: https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js -> ../libs/wsemi/dist/wsemi.umd.js'), text)
            assert.strict.ok(text.includes('rewrite x1: https://cdn.jsdelivr.net/npm/w-none/dist/a.js -> https://some-owner.github.io/w-none/dist/a.js'), text)
            assert.strict.ok(text.includes('warning: ') && text.includes('w-none'), text)
            //bCopyDist為true: 摘要列出dist
            let dirD = mkCase({ 'examples/ex-a.html': 'x', 'dist/w-fake.umd.js': 'DIST' })
            let qd = capture(() => genDocsExams(O(dirD, { bLog: true, bCopyDist: true })))
            assert.strict.ok(qd.lines.join('\n').includes('dist 1 file(s) ->') && !qd.lines.join('\n').includes('not copied'), qd.lines.join('\n'))
            let dir2 = mkCase({ 'examples/ex-a.html': 'x', 'dist/w-fake.umd.js': 'DIST' })
            let q = capture(() => genDocsExams(O(dir2, { bLog: false })))
            assert.strict.deepStrictEqual(q.lines, [])
        })

    })

    describe('錯誤語意(帶WPT_碼之Error物件)', function() {

        let assertErr = (r, code, re) => {
            assert.strict.deepStrictEqual(r.thrown, true, '未拋錯')
            assert.strict.ok(r.e instanceof Error, '拋出值須為Error物件')
            assert.strict.deepStrictEqual(r.e.code, code)
            assert.strict.ok(typeof r.e.stack === 'string' && r.e.stack.length > 0)
            if (re) {
                assert.strict.ok(re.test(r.e.message), r.e.message)
            }
        }

        it('opt為非一般物件(字串、數字、布林、陣列、函數): WPT_DOCS_INVALID_OPT(訊息格式invalid opt: must be …、不回顯值)', function() {
            let dir = mkCase({ 'examples/a.html': 'x', 'dist/a.js': 'x' })
            let before = snap(dir)
            for (let bad of ['secret-x', 5, true, [], [1], () => 1]) {
                //規格V4: 其他非一般物件無效; V19格式; K9不回顯輸入值
                let r = throwsOf(() => genDocsExams(bad))
                assertErr(r, 'WPT_DOCS_INVALID_OPT', /^invalid opt: must be an object$/)
            }
            assert.strict.deepStrictEqual(snap(dir), before)
        })

        it('檢測先於任何寫入: fdSrc不存在、files內之檔不存在時不留任何副作用(dist存在亦不先複製)', function() {
            let dir = mkCase({ 'examples/a.html': 'x', 'dist/a.js': 'x' })
            let before = snap(dir)
            //規格V17: 全部檢測先於任何副作用
            assertErr(throwsOf(() => genDocsExams(O(dir, { fdSrc: path.join(dir, 'nope') }))), 'WPT_DOCS_SRC_NOT_FOUND', /not found/)
            assertErr(throwsOf(() => genDocsExams(O(dir, { files: ['nope.html'] }))), 'WPT_DOCS_SRC_NOT_FOUND', /nope\.html/)
            assert.strict.deepStrictEqual(snap(dir), before)
            assert.strict.deepStrictEqual(has(dir, 'docs'), false)
        })

        it('package.json讀不到/不是JSON/無name: WPT_DOCS_INVALID_PKG(訊息不引用fs之原訊息)', function() {
            let dir = mkCase({ 'examples/a.html': 'x', 'dist/a.js': 'x' })
            fs.rmSync(path.join(dir, 'package.json'))
            assertErr(throwsOf(() => genDocsExams(O(dir))), 'WPT_DOCS_INVALID_PKG', /can not read package\.json/)
            put(dir, 'package.json', '{ not json')
            assertErr(throwsOf(() => genDocsExams(O(dir))), 'WPT_DOCS_INVALID_PKG', /can not read package\.json/)
            put(dir, 'package.json', JSON.stringify({ version: '1.0.0' }))
            assertErr(throwsOf(() => genDocsExams(O(dir))), 'WPT_DOCS_INVALID_PKG', /has no name/)
            put(dir, 'package.json', JSON.stringify({ name: '' }))
            assertErr(throwsOf(() => genDocsExams(O(dir))), 'WPT_DOCS_INVALID_PKG', /has no name/)
        })

        it('fdSrc(非空)不存在或為檔案、files內之檔不存在或跳出fdSrc: WPT_DOCS_SRC_NOT_FOUND', function() {
            let dir = mkCase({ 'examples/a.html': 'x', 'dist/a.js': 'x', 'afile': 'x', 'outside.html': 'x' })
            assertErr(throwsOf(() => genDocsExams(O(dir, { fdSrc: path.join(dir, 'nope') }))), 'WPT_DOCS_SRC_NOT_FOUND', /not found/)
            assertErr(throwsOf(() => genDocsExams(O(dir, { fdSrc: path.join(dir, 'afile') }))), 'WPT_DOCS_SRC_NOT_FOUND', /not found/)
            assertErr(throwsOf(() => genDocsExams(O(dir, { files: ['nope.html'] }))), 'WPT_DOCS_SRC_NOT_FOUND', /nope\.html/)
            assertErr(throwsOf(() => genDocsExams(O(dir, { files: ['../outside.html'] }))), 'WPT_DOCS_SRC_NOT_FOUND', /outside\.html/)
            assertErr(throwsOf(() => genDocsExams(O(dir, { files: ['a.html', '.'] }))), 'WPT_DOCS_SRC_NOT_FOUND')
        })

        it('目標資料夾等於或位於來源資料夾之內: WPT_DOCS_PATH_OVERLAP(不寫入任何檔)', function() {
            let mk = () => mkCase({ 'examples/a.html': 'x', 'dist/a.js': 'x' })
            let dir = mk()
            let cases = [
                { fdTar: path.join(dir, 'examples') },
                { fdTar: path.join(dir, 'examples/out') },
                { bCopyDist: true, fdTarDist: path.join(dir, 'dist') },
                { bCopyDist: true, fdTarDist: path.join(dir, 'dist/docs') },
                { fdLibs: path.join(dir, 'examples/libs') },
                { fdLibs: path.join(dir, 'dist') },
                { fdTar: path.join(dir, 'dist/ex') },
            ]
            for (let extra of cases) {
                let before = snap(dir)
                assertErr(throwsOf(() => genDocsExams(O(dir, extra))), 'WPT_DOCS_PATH_OVERLAP', /must not be inside source folder/)
                assert.strict.deepStrictEqual(snap(dir), before, `${JSON.stringify(extra)}不得有寫入`)
            }
        })

        it('fdTarDist只在bCopyDist為true時才是寫入目標: 預設(不複製dist)位於dist之內不報重疊(僅用於計算引用之相對路徑)', function() {
            let dir = mkCase({ 'examples/a.html': page(script('https://cdn.jsdelivr.net/npm/w-fake/dist/w-fake.umd.js')), 'dist/a.js': 'x' })
            //wpt257b: 此時fdTarDist不被寫入, 無自我複製之虞
            let r = genDocsExams(O(dir, { fdTarDist: path.join(dir, 'dist') }))
            assert.strict.deepStrictEqual(r.examples, ['a.html'])
            assert.strict.deepStrictEqual(snap(path.join(dir, 'dist')), { 'a.js': Buffer.from('x').toString('hex') })
        })

    })

})
