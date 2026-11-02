import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { fileURLToPath } from 'url'
import { spawnSync, execFileSync } from 'child_process'


//規則帳本R23: bin/gh-pages.mjs 職責僅部署 -d 資料夾(規格: 自有套件之瀏覽器端取用與gh-pages 規則1, 使用者2026-11-02: 「gh-pages.mjs 職責僅發布, 沒有要複製自己 dist」),
//dist 由建置時之 genDocsDist 複製到 docs/dist/(R24)隨 -d 資料夾部署, 本檔不提供專案根 ./dist/;
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


describe('bin/gh-pages: 只部署-d資料夾, 不提供專案根./dist/(規則帳本R23)', function() {

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
            //各套件package.json之deploy為"gh-pages -d docs", 經node_modules/.bin解析到本套件之bin
            assert.strict.deepStrictEqual(pks.bin['gh-pages'], 'bin/gh-pages.mjs')
            assert.strict.deepStrictEqual(pks.scripts.deploy, 'node bin/gh-pages.mjs -d docs')
            assert.strict.ok(fs.existsSync(path.join(path.dirname(PKG), pks.bin['gh-pages'])))
        })

    })

    describe('只部署-d資料夾', function() {

        it('docs/dist/(genDocsDist之產物, 含子資料夾、二進位、.map)隨docs原樣部署, 位元一致; .nojekyll照舊; 暫存夾已清除', function() {
            let { proj, remote } = mkProj({
                'docs/index.html': '<p>home</p>\n',
                'docs/sub/x.html': '<p>x</p>\n',
                'docs/dist/a.umd.js': 'A\n',
                'docs/dist/a.umd.js.map': 'M1',
                'docs/dist/bin.dat': BIN_DATA,
                'docs/dist/sub/b.js': 'B\n',
                'docs/dist/sub/B.JS.MAP': 'M2',
            })
            let r = deploy(proj)
            assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
            //規格(瀏覽器端取用與gh-pages規則1): 站台dist/即docs/dist/, 含.map
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'dist/a.umd.js', 'dist/a.umd.js.map', 'dist/bin.dat', 'dist/sub/B.JS.MAP', 'dist/sub/b.js', 'index.html', 'sub/x.html'])
            assert.strict.deepStrictEqual(show(remote, 'dist/bin.dat').toString('hex'), BIN_DATA.toString('hex'))
            assert.strict.deepStrictEqual(show(remote, 'dist/a.umd.js.map').toString(), 'M1')
            assert.strict.deepStrictEqual(show(remote, 'index.html').toString(), '<p>home</p>\n')
            //暫存夾清除; 專案本身之docs不被更動
            assert.strict.deepStrictEqual(fs.existsSync(path.join(proj, '_gh-pages-deploy')), false)
            assert.strict.deepStrictEqual(fs.readFileSync(path.join(proj, 'docs/dist/a.umd.js'), 'utf8'), 'A\n')
        })

        it('專案根有./dist/(含.map)而-d內無dist/: 部署內容不含dist/(不提供專案根./dist/); 輸出無dist提供之說明或警告', function() {
            let { proj, remote } = mkProj({
                'docs/index.html': 'x',
                'dist/a.umd.js': 'A',
                'dist/a.umd.js.map': 'M',
                'dist/sub/b.js': 'B',
            })
            let r = deploy(proj)
            assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
            //使用者2026-11-02: gh-pages.mjs職責僅發布, 不複製自己dist
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'index.html'])
            assert.strict.deepStrictEqual(r.stdout.includes('dist/ 內') || r.stdout.includes('專案 dist'), false, r.stdout)
            assert.strict.deepStrictEqual(r.stderr.includes('警告'), false, r.stderr)
            //專案根之dist不被更動
            assert.strict.deepStrictEqual(fs.readFileSync(path.join(proj, 'dist/a.umd.js'), 'utf8'), 'A')
        })

        it('-d內已有dist/且專案根亦有不同內容之./dist/: 部署內容為-d內之dist/(不被專案根./dist/覆蓋、無衝突警告)', function() {
            let { proj, remote } = mkProj({
                'docs/index.html': 'x',
                'docs/dist/a.umd.js': 'DOCS-VERSION',
                'docs/dist/only-docs.js': 'ONLYDOCS',
                'dist/a.umd.js': 'ROOT-VERSION',
                'dist/only-root.js': 'ONLYROOT',
            })
            let r = deploy(proj)
            assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'dist/a.umd.js', 'dist/only-docs.js', 'index.html'])
            assert.strict.deepStrictEqual(show(remote, 'dist/a.umd.js').toString(), 'DOCS-VERSION')
            assert.strict.deepStrictEqual(r.stderr.includes('衝突'), false, r.stderr)
        })

        it('已移除之參數--no-dist、--dist-map: 視為未知參數而忽略(行為同不給), 不提供專案根./dist/', function() {
            let files = { 'docs/index.html': 'x', 'docs/dist/in-docs.js': 'D', 'dist/a.umd.js': 'A', 'dist/a.umd.js.map': 'M' }
            for (let extra of [['--no-dist'], ['--dist-map'], ['--no-dist', '--dist-map']]) {
                let { proj, remote } = mkProj(files)
                let r = deploy(proj, ['-d', 'docs', ...extra])
                assert.strict.deepStrictEqual(r.status, 0, `${extra.join(' ')}: ${r.stdout}${r.stderr}`)
                //--dist-map不再使專案根./dist/(含.map)進入部署內容
                assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'dist/in-docs.js', 'index.html'], extra.join(' '))
            }
        })

    })

    describe('既有參數與行為不變', function() {

        it('-d <dir>: 指定其他資料夾部署其內容(預設docs); 未知參數忽略', function() {
            let { proj, remote } = mkProj({ 'site/index.html': 'SITE', 'docs/index.html': 'DOCS', 'dist/a.umd.js': 'A' })
            let r = deploy(proj, ['--unknown-flag', '-d', 'site', '-m', 'ignored'])
            assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'index.html'])
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

        it('-d即為專案根./dist/: 該夾內容即部署內容(含.map, 屬-d內容), 無巢狀之dist/dist', function() {
            let { proj, remote } = mkProj({ 'dist/a.umd.js': 'A', 'dist/sub/b.js': 'B', 'dist/a.umd.js.map': 'M' })
            let r = deploy(proj, ['-d', 'dist'])
            assert.strict.deepStrictEqual(r.status, 0, r.stdout + r.stderr)
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'a.umd.js', 'a.umd.js.map', 'sub/b.js'])
            //-d為dist之子資料夾亦然
            let b = mkProj({ 'dist/a.umd.js': 'A', 'dist/sub/b.js': 'B' })
            let rb = deploy(b.proj, ['-d', 'dist/sub'])
            assert.strict.deepStrictEqual(rb.status, 0, rb.stdout + rb.stderr)
            assert.strict.deepStrictEqual(tree(b.remote), ['.nojekyll', 'b.js'])
        })

        it('已有gh-pages分支再次部署: 內容整體取代(舊檔移除、新dist進入); 內容不變時無變更不commit', function() {
            let { proj, remote } = mkProj({ 'docs/index.html': 'V1', 'docs/dist/old.js': 'OLD', 'docs/dist/a.umd.js': 'A1' })
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
            fs.rmSync(path.join(proj, 'docs/dist/old.js'))
            put(proj, 'docs/dist/a.umd.js', 'A2')
            put(proj, 'docs/dist/new.js', 'NEW')
            let r3 = deploy(proj)
            assert.strict.deepStrictEqual(r3.status, 0, r3.stdout + r3.stderr)
            assert.strict.deepStrictEqual(tree(remote), ['.nojekyll', 'dist/a.umd.js', 'dist/new.js', 'index.html'])
            assert.strict.deepStrictEqual(show(remote, 'dist/a.umd.js').toString(), 'A2')
            assert.strict.deepStrictEqual(nCommits(remote), 2)
        })

        it('部署失敗(origin不可用): 退出碼1、暫存夾清除、專案本身之檔不被更動', function() {
            let { proj, dir } = mkProj({ 'docs/index.html': 'x', 'docs/dist/a.umd.js': 'A' }, false)
            let r = deploy(proj)
            assert.strict.deepStrictEqual(r.status, 1, r.stdout + r.stderr)
            assert.strict.ok(r.stderr.includes('部署失敗'), r.stderr)
            assert.strict.deepStrictEqual(fs.existsSync(path.join(proj, '_gh-pages-deploy')), false)
            assert.strict.deepStrictEqual(fs.readFileSync(path.join(proj, 'docs/dist/a.umd.js'), 'utf8'), 'A')
            assert.strict.deepStrictEqual(fs.existsSync(path.join(dir, 'remote.git')), false)
        })

    })

})
