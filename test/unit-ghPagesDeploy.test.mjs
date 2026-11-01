import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { fileURLToPath } from 'url'
import { spawnSync, execFileSync } from 'child_process'


//規則帳本R23: bin/gh-pages.mjs 部署時一併提供專案根 ./dist/ (規格: 自有套件之瀏覽器端取用與gh-pages 規則1: 站台 https://<擁有者>.github.io/<套件名>/dist/<檔>);
//以暫存夾內之假專案(本機git倉庫)與本機bare倉庫(origin)驗證, 子行程實跑bin; 不碰任何真實專案、不連任何遠端

let root = path.resolve('./test/_tmp/ghPagesDeploy')
let BIN = fileURLToPath(new URL('../bin/gh-pages.mjs', import.meta.url))
let PKG = fileURLToPath(new URL('../package.json', import.meta.url))
let seq = 0

//git環境: 固定身分、不開互動、autocrlf關閉(位元比對不受使用者設定影響)
let env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'tester',
    GIT_AUTHOR_EMAIL: 'tester@example.invalid',
    GIT_COMMITTER_NAME: 'tester',
    GIT_COMMITTER_EMAIL: 'tester@example.invalid',
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'core.autocrlf',
    GIT_CONFIG_VALUE_0: 'false',
}
let git = (args, cwd) => execFileSync('git', args, { cwd, env, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
let posix = (s) => s.split(path.sep).join('/')

let put = (dir, rel, c) => {
    let fp = path.join(dir, rel)
    fs.mkdirSync(path.dirname(fp), { recursive: true })
    fs.writeFileSync(fp, c)
}

//mkProj: 假專案(git倉庫, origin指向本機bare倉庫); files為{ 相對路徑: 字串或Buffer }
let mkProj = (files = {}, bBareOk = true) => {
    let dir = path.join(root, `c${++seq}`)
    let proj = path.join(dir, 'proj')
    let remote = path.join(dir, 'remote.git')
    fs.mkdirSync(proj, { recursive: true })
    if (bBareOk) {
        git(['init', '--bare', remote])
    }
    git(['init'], proj)
    git(['remote', 'add', 'origin', posix(remote)], proj)
    //安全: origin必為暫存夾內之本機路徑, 部署絕不會推送到任何真實遠端
    let origin = git(['config', '--get', 'remote.origin.url'], proj).trim()
    assert.strict.ok(path.resolve(origin).startsWith(root), `origin不在暫存夾內: ${origin}`)
    for (let [rel, c] of Object.entries(files)) {
        put(proj, rel, c)
    }
    return { dir, proj, remote }
}

//deploy: 於假專案根以子行程執行bin(受測檔以本測試檔相對位置取得, 變異驗證時為副本)
let deploy = (proj, args = ['-d', 'docs']) => {
    let r = spawnSync(process.execPath, [BIN, ...args], { cwd: proj, env, encoding: 'utf8', windowsHide: true, timeout: 150000 })
    assert.strict.ok(r.error === undefined, String(r.error))
    return r
}

//遠端gh-pages分支內容
let tree = (remote) => git(['--git-dir', remote, 'ls-tree', '-r', '--name-only', 'gh-pages']).split('\n').filter(Boolean).sort()
let show = (remote, p) => execFileSync('git', ['--git-dir', remote, 'show', `gh-pages:${p}`], { env, windowsHide: true, maxBuffer: 1e8 })
let nCommits = (remote) => Number(git(['--git-dir', remote, 'rev-list', '--count', 'gh-pages']).trim())

let BIN_DATA = Buffer.concat([Buffer.from([0xff, 0xfe, 0x00, 0x80, 0x0d, 0x0a]), Buffer.from('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js'), Buffer.from([0xc3, 0x28, 0x00])])


describe('bin/gh-pages: 部署時提供專案根./dist/(規則帳本R23)', function() {

    before(function() {
        fs.rmSync(root, { recursive: true, force: true })
        fs.mkdirSync(root, { recursive: true })
    })

    after(function() {
        fs.rmSync(root, { recursive: true, force: true })
    })

    describe('套件宣告', function() {

        it('package.json之bin.gh-pages指向bin/gh-pages.mjs(各套件之"gh-pages -d docs"解析至此), 本套件deploy腳本呼叫之', function() {
            let pks = JSON.parse(fs.readFileSync(PKG, 'utf8'))
            //wpt257b#1: 各套件package.json之deploy為"gh-pages -d docs", 經node_modules/.bin解析到本套件之bin
            assert.strict.deepStrictEqual(pks.bin['gh-pages'], 'bin/gh-pages.mjs')
            assert.strict.deepStrictEqual(pks.scripts.deploy, 'node bin/gh-pages.mjs -d docs')
            assert.strict.ok(fs.existsSync(path.join(path.dirname(PKG), pks.bin['gh-pages'])))
        })

    })

    describe('提供dist', function() {

        it('專案根./dist/(含子資料夾、二進位)複製到部署內容之dist/, 預設排除.map(不分大小寫); -d內容與.nojekyll照舊; 位元一致; 暫存夾已清除', function() {
            let { proj, remote } = mkProj({
                'docs/index.html': '<p>home</p>\n',
                'docs/sub/x.html': '<p>x</p>\n',
                'dist/a.umd.js': 'A\n',
                'dist/bin.dat': BIN_DATA,
                'dist/sub/b.js': 'B\n',
                'dist/a.umd.js.map': 'M1',
                'dist/sub/B.JS.MAP': 'M2',
            })
            let r = deploy(proj)
            assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
            //wpt257b#1/規格規則1: dist複製到站台之dist/; .map預設排除
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'dist/a.umd.js', 'dist/bin.dat', 'dist/sub/b.js', 'index.html', 'sub/x.html'])
            assert.strict.deepStrictEqual(show(remote, 'dist/bin.dat').toString('hex'), BIN_DATA.toString('hex'))
            assert.strict.deepStrictEqual(show(remote, 'dist/sub/b.js').toString(), 'B\n')
            //-d內容照舊
            assert.strict.deepStrictEqual(show(remote, 'index.html').toString(), '<p>home</p>\n')
            //說明一行: 提供數與排除.map數
            assert.strict.ok(r.stdout.includes('[gh-pages] 專案 dist: 提供專案根 ./dist/ -> 部署內容之 dist/ (3 個檔案, 排除 .map 2 個)'), r.stdout)
            assert.strict.deepStrictEqual(r.stderr.includes('警告'), false, r.stderr)
            //暫存夾清除; 專案本身之docs與dist不被更動
            assert.strict.deepStrictEqual(fs.existsSync(path.join(proj, '_gh-pages-deploy')), false)
            assert.strict.deepStrictEqual(fs.existsSync(path.join(proj, 'docs/dist')), false)
        })

        it('--dist-map: 一併含.map; 預設(不給)排除', function() {
            let files = { 'docs/index.html': 'x', 'dist/a.umd.js': 'A', 'dist/a.umd.js.map': 'M' }
            let a = mkProj(files)
            let ra = deploy(a.proj, ['-d', 'docs', '--dist-map'])
            assert.strict.deepStrictEqual(ra.status, 0, ra.stdout + ra.stderr)
            assert.strict.deepStrictEqual(tree(a.remote), ['.nojekyll', 'dist/a.umd.js', 'dist/a.umd.js.map', 'index.html'])
            assert.strict.ok(ra.stdout.includes('(2 個檔案, 排除 .map 0 個)'), ra.stdout)
            let b = mkProj(files)
            let rb = deploy(b.proj)
            assert.strict.deepStrictEqual(tree(b.remote), ['.nojekyll', 'dist/a.umd.js', 'index.html'])
            assert.strict.ok(rb.stdout.includes('(1 個檔案, 排除 .map 1 個)'), rb.stdout)
        })

        it('--no-dist: 停用, 不提供dist/(即使有./dist/, 與--dist-map併用亦然), 說明一行', function() {
            let { proj, remote } = mkProj({ 'docs/index.html': 'x', 'dist/a.umd.js': 'A' })
            let r = deploy(proj, ['--no-dist', '-d', 'docs', '--dist-map'])
            assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'index.html'])
            assert.strict.ok(r.stdout.includes('[gh-pages] 專案 dist: 已停用(--no-dist), 不提供 dist/'), r.stdout)
        })

        it('專案根無./dist/、./dist/為空、./dist/僅含.map、./dist為檔案: 照舊部署(只有-d內容), 各印一行說明, 不報錯', function() {
            let cases = [
                ['不存在', {}, false, '專案根 ./dist/ 不存在或不是資料夾('],
                ['為空', {}, true, '專案根 ./dist/ 為空('],
                ['僅含.map', { 'dist/a.umd.js.map': 'M' }, false, '專案根 ./dist/ 無可提供之檔案(排除 .map 1 個)'],
                ['為檔案', { 'dist': 'FILE' }, false, '專案根 ./dist/ 不存在或不是資料夾('],
            ]
            for (let [title, extra, bEmptyDir, msg] of cases) {
                let { proj, remote } = mkProj({ 'docs/index.html': 'x', ...extra })
                if (bEmptyDir) {
                    fs.mkdirSync(path.join(proj, 'dist'))
                }
                let r = deploy(proj)
                //wpt257b#1: 無./dist/(或無檔可提供)時照舊部署並印一行說明
                assert.strict.deepStrictEqual(r.status, 0, `${title}: ${r.stdout}${r.stderr}`)
                assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'index.html'], title)
                assert.strict.ok(r.stdout.includes(msg), `${title}: ${r.stdout}`)
                assert.strict.ok(r.stdout.includes('照舊部署, 不提供 dist/'), `${title}: ${r.stdout}`)
            }
        })

        it('./dist/內之連結(junction/符號連結)不跟進: 略過並警告, 連結目標內容不被部署', function() {
            let { proj, remote, dir } = mkProj({ 'docs/index.html': 'x', 'dist/a.umd.js': 'A' })
            put(dir, 'outside/secret.txt', 'SECRET')
            let link = path.join(proj, 'dist/lnk')
            try {
                fs.symlinkSync(path.join(dir, 'outside'), link, 'junction')
            }
            catch (e) {
                this.skip() //無權限建立連結之環境
            }
            try {
                let r = deploy(proj)
                assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
                assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'dist/a.umd.js', 'index.html'])
                assert.strict.ok(r.stderr.includes('不跟進') && r.stderr.includes('lnk'), r.stderr)
            }
            finally {
                try {
                    fs.unlinkSync(link)
                }
                catch (e) {
                    fs.rmdirSync(link)
                }
            }
            assert.strict.deepStrictEqual(fs.readFileSync(path.join(dir, 'outside/secret.txt'), 'utf8'), 'SECRET')
        })

    })

    describe('與-d資料夾內既有之dist/衝突: 以專案根./dist/為準並警告', function() {

        it('同路徑且內容不同之檔: 以專案根./dist/為準並警告(列出路徑); 內容相同不警告; 只在-d內之檔保留; 只在專案根之檔加入', function() {
            let { proj, remote } = mkProj({
                'docs/index.html': 'x',
                'docs/dist/a.umd.js': 'DOCS-OLD',
                'docs/dist/same.js': 'SAME',
                'docs/dist/only-docs.js': 'ONLYDOCS',
                'dist/a.umd.js': 'ROOT-NEW',
                'dist/same.js': 'SAME',
                'dist/only-root.js': 'ONLYROOT',
            })
            let r = deploy(proj)
            assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'dist/a.umd.js', 'dist/only-docs.js', 'dist/only-root.js', 'dist/same.js', 'index.html'])
            //規則: 衝突以專案根./dist/為準
            assert.strict.deepStrictEqual(show(remote, 'dist/a.umd.js').toString(), 'ROOT-NEW')
            assert.strict.deepStrictEqual(show(remote, 'dist/only-docs.js').toString(), 'ONLYDOCS')
            //警告: 1個路徑衝突(a.umd.js); same.js內容相同不算
            assert.strict.ok(r.stderr.includes('[gh-pages] 警告: -d 資料夾內既有之 dist/ 與專案根 ./dist/ 有 1 個路徑衝突, 以專案根 ./dist/ 為準: dist/a.umd.js'), r.stderr)
            assert.strict.deepStrictEqual(r.stderr.includes('same.js'), false, r.stderr)
            //專案根之docs內檔案不被改動(只動部署用暫存副本)
            assert.strict.deepStrictEqual(fs.readFileSync(path.join(proj, 'docs/dist/a.umd.js'), 'utf8'), 'DOCS-OLD')
        })

        it('型態衝突: -d內之dist為檔案、dist/子路徑為檔案而專案根為資料夾、-d內為資料夾而專案根為檔案: 皆以專案根./dist/為準並警告', function() {
            //-d內之dist為檔案
            let a = mkProj({ 'docs/index.html': 'x', 'docs/dist': 'IAM-A-FILE', 'dist/a.umd.js': 'A' })
            let ra = deploy(a.proj)
            assert.strict.deepStrictEqual(ra.status, 0, ra.stdout + ra.stderr)
            assert.strict.deepStrictEqual(tree(a.remote), ['.nojekyll', 'dist/a.umd.js', 'index.html'])
            assert.strict.ok(ra.stderr.includes('有 1 個路徑衝突') && ra.stderr.includes('dist'), ra.stderr)
            //-d內dist/sub為檔案, 專案根dist/sub/x.js
            let b = mkProj({ 'docs/index.html': 'x', 'docs/dist/sub': 'FILE', 'dist/sub/x.js': 'X' })
            let rb = deploy(b.proj)
            assert.strict.deepStrictEqual(rb.status, 0, rb.stdout + rb.stderr)
            assert.strict.deepStrictEqual(tree(b.remote), ['.nojekyll', 'dist/sub/x.js', 'index.html'])
            assert.strict.ok(rb.stderr.includes('有 1 個路徑衝突') && rb.stderr.includes('dist/sub'), rb.stderr)
            //-d內dist/x.js為資料夾, 專案根dist/x.js為檔案
            let c = mkProj({ 'docs/index.html': 'x', 'docs/dist/x.js/inner.txt': 'INNER', 'dist/x.js': 'X' })
            let rc = deploy(c.proj)
            assert.strict.deepStrictEqual(rc.status, 0, rc.stdout + rc.stderr)
            assert.strict.deepStrictEqual(tree(c.remote), ['.nojekyll', 'dist/x.js', 'index.html'])
            assert.strict.deepStrictEqual(show(c.remote, 'dist/x.js').toString(), 'X')
            assert.strict.ok(rc.stderr.includes('有 1 個路徑衝突') && rc.stderr.includes('dist/x.js'), rc.stderr)
        })

        it('衝突多於5個: 警告只列前5個並以...示意(恰5個不加...), 計數為實數', function() {
            for (let n of [5, 6, 7]) {
                let files = { 'docs/index.html': 'x' }
                for (let i = 1; i <= n; i++) {
                    files[`docs/dist/f${i}.js`] = `OLD${i}`
                    files[`dist/f${i}.js`] = `NEW${i}`
                }
                let { proj, remote } = mkProj(files)
                let r = deploy(proj)
                assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
                assert.strict.ok(r.stderr.includes(`有 ${n} 個路徑衝突`), r.stderr)
                //列前5個; 超過5個才加...
                let list = 'dist/f1.js, dist/f2.js, dist/f3.js, dist/f4.js, dist/f5.js'
                assert.strict.ok(r.stderr.includes(n > 5 ? `${list} ...` : `${list}\n`) || r.stderr.includes(n > 5 ? `${list} ...` : `${list}\r\n`), `n=${n}: ${r.stderr}`)
                assert.strict.deepStrictEqual(r.stderr.includes(' ...'), n > 5, `n=${n}: ${r.stderr}`)
                assert.strict.deepStrictEqual(r.stderr.includes('f6.js'), false, `n=${n}: ${r.stderr}`)
                assert.strict.deepStrictEqual(show(remote, `dist/f${n}.js`).toString(), `NEW${n}`)
            }
        })

    })

    describe('既有參數與行為不變', function() {

        it('-d <dir>: 指定其他資料夾部署其內容(預設docs); 未知參數忽略; 專案dist照樣提供', function() {
            let { proj, remote } = mkProj({ 'site/index.html': 'SITE', 'docs/index.html': 'DOCS', 'dist/a.umd.js': 'A' })
            let r = deploy(proj, ['--unknown-flag', '-d', 'site', '-m', 'ignored'])
            assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'dist/a.umd.js', 'index.html'])
            assert.strict.deepStrictEqual(show(remote, 'index.html').toString(), 'SITE')
            //未給-d: 預設docs
            let d = mkProj({ 'site/index.html': 'SITE', 'docs/index.html': 'DOCS' })
            let rd = deploy(d.proj, [])
            assert.strict.deepStrictEqual(rd.status, 0, rd.stdout + rd.stderr)
            assert.strict.deepStrictEqual(show(d.remote, 'index.html').toString(), 'DOCS')
        })

        it('-d資料夾不存在或為空: 退出碼1且不部署(遠端無gh-pages分支), 即使有./dist/', function() {
            let a = mkProj({ 'dist/a.umd.js': 'A' })
            let ra = deploy(a.proj)
            assert.strict.deepStrictEqual(ra.status, 1)
            assert.strict.ok(ra.stderr.includes('來源資料夾不存在'), ra.stderr)
            assert.strict.deepStrictEqual(git(['--git-dir', a.remote, 'branch', '--list']).trim(), '')
            let b = mkProj({ 'dist/a.umd.js': 'A' })
            fs.mkdirSync(path.join(b.proj, 'docs'))
            let rb = deploy(b.proj)
            assert.strict.deepStrictEqual(rb.status, 1)
            assert.strict.ok(rb.stderr.includes('來源資料夾為空, 拒絕部署'), rb.stderr)
            assert.strict.deepStrictEqual(git(['--git-dir', b.remote, 'branch', '--list']).trim(), '')
        })

        it('-d即為(或位於)專案根./dist/: 該夾內容為部署內容, 不重複提供dist/', function() {
            let { proj, remote } = mkProj({ 'dist/a.umd.js': 'A', 'dist/sub/b.js': 'B', 'dist/a.umd.js.map': 'M' })
            let r = deploy(proj, ['-d', 'dist'])
            assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
            //部署內容即dist夾本身(含.map, 因屬-d內容, 行為同修前), 無巢狀之dist/dist
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'a.umd.js', 'a.umd.js.map', 'sub/b.js'])
            assert.strict.ok(r.stdout.includes('即為(或位於)專案根 ./dist/, 不重複提供'), r.stdout)
            //-d為dist之子資料夾亦然
            let b = mkProj({ 'dist/a.umd.js': 'A', 'dist/sub/b.js': 'B' })
            let rb = deploy(b.proj, ['-d', 'dist/sub'])
            assert.strict.deepStrictEqual(rb.status, 0, rb.stdout + rb.stderr)
            assert.strict.deepStrictEqual(tree(b.remote), ['.nojekyll', 'b.js'])
            assert.strict.ok(rb.stdout.includes('即為(或位於)專案根 ./dist/, 不重複提供'), rb.stdout)
        })

        it('已有gh-pages分支再次部署: 內容整體取代(舊檔移除、新dist進入); 內容不變時無變更不commit', function() {
            let { proj, remote } = mkProj({ 'docs/index.html': 'V1', 'dist/old.js': 'OLD', 'dist/a.umd.js': 'A1' })
            let r1 = deploy(proj)
            assert.strict.deepStrictEqual(r1.status, 0, r1.stdout + r1.stderr)
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'dist/a.umd.js', 'dist/old.js', 'index.html'])
            assert.strict.deepStrictEqual(nCommits(remote), 1)
            //內容不變: 無變更, 不新增commit
            let r2 = deploy(proj)
            assert.strict.deepStrictEqual(r2.status, 0, r2.stdout + r2.stderr)
            assert.strict.ok(r2.stdout.includes('無變更, 跳過 commit/push'), r2.stdout)
            assert.strict.deepStrictEqual(nCommits(remote), 1)
            //dist更新、舊檔移除
            fs.rmSync(path.join(proj, 'dist/old.js'))
            put(proj, 'dist/a.umd.js', 'A2')
            put(proj, 'dist/new.js', 'NEW')
            let r3 = deploy(proj)
            assert.strict.deepStrictEqual(r3.status, 0, r3.stdout + r3.stderr)
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'dist/a.umd.js', 'dist/new.js', 'index.html'])
            assert.strict.deepStrictEqual(show(remote, 'dist/a.umd.js').toString(), 'A2')
            assert.strict.deepStrictEqual(nCommits(remote), 2)
        })

        it('部署失敗(origin不可用): 退出碼1、暫存夾清除、專案本身之檔不被更動', function() {
            let { proj, dir } = mkProj({ 'docs/index.html': 'x', 'dist/a.umd.js': 'A' }, false)
            let r = deploy(proj)
            assert.strict.deepStrictEqual(r.status, 1, r.stdout + r.stderr)
            assert.strict.ok(r.stderr.includes('部署失敗'), r.stderr)
            assert.strict.deepStrictEqual(fs.existsSync(path.join(proj, '_gh-pages-deploy')), false)
            assert.strict.deepStrictEqual(fs.readFileSync(path.join(proj, 'dist/a.umd.js'), 'utf8'), 'A')
            assert.strict.deepStrictEqual(fs.existsSync(path.join(dir, 'remote.git')), false)
        })

    })

})
