import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { spawnSync } from 'child_process'
import modifyReadme from '../src/modifyReadme.mjs'


//規則帳本R22: modifyReadme, README之瀏覽器用法改指gh-pages; 以暫存夾內之假套件驗證, 不碰任何真實專案

let root = path.resolve('./test/_tmp/modifyReadme')
let seq = 0

let pkgJson = (name, repository, version = '1.2.3') => JSON.stringify({ name, version, repository })
let ghRepo = (name, owner = 'some-owner') => ({ type: 'git', url: `git+https://github.com/${owner}/${name}.git` })

//mkCase: 建立假套件(package.json與README.md), 回傳{ dir, fnRM, fnPks }
let mkCase = (readme, opt = {}) => {
    let name = opt.name || 'w-fake'
    let version = opt.version || '1.2.3'
    let repository = 'repository' in opt ? opt.repository : ghRepo(name) //明給repository:undefined表示package.json無此欄位
    let dir = path.join(root, `c${++seq}`)
    fs.mkdirSync(dir, { recursive: true })
    let fnRM = path.join(dir, 'README.md')
    let fnPks = path.join(dir, 'package.json')
    fs.writeFileSync(fnPks, pkgJson(name, repository, version))
    fs.writeFileSync(fnRM, readme)
    return { dir, fnRM, fnPks }
}

let run = (readme, opt) => {
    let c = mkCase(readme, opt)
    let r = modifyReadme(c.fnRM, c.fnPks)
    return { ...c, r, out: fs.readFileSync(c.fnRM, 'utf8') }
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

let tag = (u) => `<script src="${u}"></script>`


describe('modifyReadme: README之瀏覽器用法改指gh-pages(規則帳本R22)', function() {

    before(function() {
        fs.rmSync(root, { recursive: true, force: true })
        fs.mkdirSync(root, { recursive: true })
    })

    after(function() {
        fs.rmSync(root, { recursive: true, force: true })
    })

    describe('網址改寫', function() {

        let forms = [
            ['自身釘版(最常見之發布時形態)', 'https://cdn.jsdelivr.net/npm/w-fake@1.0.37/dist/w-fake.umd.js', 'https://some-owner.github.io/w-fake/dist/w-fake.umd.js'],
            ['自身未釘版', 'https://cdn.jsdelivr.net/npm/w-fake/dist/w-fake.umd.js', 'https://some-owner.github.io/w-fake/dist/w-fake.umd.js'],
            ['自身@latest', 'https://cdn.jsdelivr.net/npm/w-fake@latest/dist/w-fake.umd.js', 'https://some-owner.github.io/w-fake/dist/w-fake.umd.js'],
            ['自身wk檔', 'https://cdn.jsdelivr.net/npm/w-fake@1.0.37/dist/w-fake.wk.umd.js', 'https://some-owner.github.io/w-fake/dist/w-fake.wk.umd.js'],
            ['其他自有套件未釘版', 'https://cdn.jsdelivr.net/npm/w-converhp/dist/w-converhp-client.umd.js', 'https://some-owner.github.io/w-converhp/dist/w-converhp-client.umd.js'],
            ['wsemi釘版', 'https://cdn.jsdelivr.net/npm/wsemi@1.9.39/dist/wsemi.umd.js', 'https://some-owner.github.io/wsemi/dist/wsemi.umd.js'],
            ['無協定', '//cdn.jsdelivr.net/npm/w-fake@1.0.37/dist/w-fake.umd.js', 'https://some-owner.github.io/w-fake/dist/w-fake.umd.js'],
            ['http', 'http://cdn.jsdelivr.net/npm/w-fake@1.0.37/dist/w-fake.umd.js', 'https://some-owner.github.io/w-fake/dist/w-fake.umd.js'],
            ['fastly.jsdelivr', 'https://fastly.jsdelivr.net/npm/w-fake@1.0.37/dist/w-fake.umd.js', 'https://some-owner.github.io/w-fake/dist/w-fake.umd.js'],
            ['unpkg', 'https://unpkg.com/w-fake@1.0.37/dist/w-fake.umd.js', 'https://some-owner.github.io/w-fake/dist/w-fake.umd.js'],
            ['?查詢與#片段保留', 'https://cdn.jsdelivr.net/npm/w-fake@1.0.37/dist/w-fake.umd.js?x=1#h', 'https://some-owner.github.io/w-fake/dist/w-fake.umd.js?x=1#h'],
        ]
        for (let [title, from, to] of forms) {
            it(`${title}: ${from} → gh-pages`, function() {
                let { r, out } = run(`# t\n\n${tag(from)}\n\nend\n`)
                //R22: 自有套件發布檔網址 → https://<擁有者>.github.io/<套件名>/dist/<檔>
                assert.strict.deepStrictEqual(out, `# t\n\n${tag(to)}\n\nend\n`)
                assert.strict.deepStrictEqual(r.changed, true)
                assert.strict.deepStrictEqual(r.rewrites, [{ from, to }])
            })
        }

        it('Markdown連結、行內文字、同一行多個網址: 皆改寫, 周邊文字不動', function() {
            let a = 'https://cdn.jsdelivr.net/npm/w-fake@1.0.37/dist/w-fake.umd.js'
            let b = 'https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js'
            let { out } = run(`[a](${a}) and \`${b}\`, ${a}; 'x'\n`)
            //R22: 括號、反引號、引號、逗號/分號前之網址邊界
            assert.strict.deepStrictEqual(out, '[a](https://some-owner.github.io/w-fake/dist/w-fake.umd.js) and `https://some-owner.github.io/wsemi/dist/wsemi.umd.js`, https://some-owner.github.io/w-fake/dist/w-fake.umd.js; \'x\'\n')
        })

        it('徽章、第三方套件、自有套件之非/dist/路徑、外形相似者不動', function() {
            let keep = [
                '![language](https://img.shields.io/badge/language-JavaScript-orange.svg) ',
                '[![npm version](http://img.shields.io/npm/v/w-fake.svg?style=flat)](https://npmjs.org/package/w-fake) ',
                '[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-fake.svg)](https://www.jsdelivr.com/package/npm/w-fake)',
                tag('https://cdn.jsdelivr.net/npm/vue@2.x/dist/vue.min.js'),
                tag('https://cdn.jsdelivr.net/npm/lodash/lodash.min.js'),
                tag('https://cdn.jsdelivr.net/npm/@babel/polyfill@7.12.1/dist/polyfill.min.js'),
                tag('https://cdn.jsdelivr.net/npm/w-demores/res/data/dataEasy.js'),
                tag('https://cdn.jsdelivr.net/npm/w-fake@1.2.3/res/a.js'),
                tag('https://cdn.jsdelivr.net/npm/w-fake/dist/'),
                tag('https://cdn.jsdelivr.net/npm/w-fake'),
                tag('https://cdn.jsdelivr.net/npm/wsemi-extra/dist/x.js'),
                tag('https://cdn.jsdelivr.net/npm/wsemi.js/dist/x.js'),
                tag('https://cdn.jsdelivr.net/npm/w-fake_x/dist/x.js'),
                tag('https://cdn.jsdelivr.net/npm/wx-foo/dist/x.js'),
                tag('https://cdn.jsdelivr.net/npm/Wsemi/dist/wsemi.umd.js'),
                tag('https://cdn.jsdelivr.net/gh/yuda-lyu/w-fake@master/dist/x.js'),
                tag('https://raw.githubusercontent.com/yuda-lyu/w-fake/master/dist/x.js'),
                tag('https://example.com/npm/wsemi/dist/wsemi.umd.js'),
                tag('https://cdn.jsdelivr.net.example.com/npm/wsemi/dist/wsemi.umd.js'),
                tag('https://some-owner.github.io/w-fake/dist/w-fake.umd.js'),
                'To view documentation or get support, visit [docs](https://some-owner.github.io/w-fake/global.html).',
            ]
            //以w-fake@1.2.3(與現行版號同)避免版號替換干擾本案; 目的為驗證網址改寫不誤傷
            let readme = keep.join('\n') + '\n'
            let { r, out } = run(readme)
            //R22: 徽章(img.shields.io、www.jsdelivr.com/package)與非發布檔網址不動
            assert.strict.deepStrictEqual(out, readme)
            assert.strict.deepStrictEqual(r.changed, false)
            assert.strict.deepStrictEqual(r.rewrites, [])
        })

    })

    describe('既有之版號替換行為維持', function() {

        it('其餘字樣"本套件名@x.y.z"換成現行版號; 其他套件名@版號不動', function() {
            let readme = [
                'npm i w-fake@1.0.1',
                'npm i w-fake@0.0.9 w-other@3.4.5 wsemi@1.9.1',
                '`w-fake@1.0.0` and w-fake@latest and w-fake@x',
                tag('https://cdn.jsdelivr.net/npm/w-fake@1.0.1/res/a.js'),
                tag('https://cdn.jsdelivr.net/npm/w-fake@1.0.1/dist/w-fake.umd.js'),
                '',
            ].join('\n')
            let { out } = run(readme, { version: '4.5.6' })
            //R22: 非dist路徑(與一般字樣)之'本套件名@x.y.z'仍換為現行版號; dist網址改指gh-pages(無版號)
            assert.strict.deepStrictEqual(out, [
                'npm i w-fake@4.5.6',
                'npm i w-fake@4.5.6 w-other@3.4.5 wsemi@1.9.1',
                '`w-fake@4.5.6` and w-fake@latest and w-fake@x',
                tag('https://cdn.jsdelivr.net/npm/w-fake@4.5.6/res/a.js'),
                tag('https://some-owner.github.io/w-fake/dist/w-fake.umd.js'),
                '',
            ].join('\n'))
        })

    })

    describe('寫檔語意', function() {

        it('無對應(無網址、版號已是現行)時不寫檔: 內容與mtime皆不變, changed為false', function() {
            let readme = '# t\r\n\r\nnpm i w-fake@1.2.3\r\n'
            let c = mkCase(readme)
            let past = new Date('2020-01-02T03:04:05Z')
            fs.utimesSync(c.fnRM, past, past)
            let mt0 = fs.statSync(c.fnRM).mtimeMs
            let r = modifyReadme(c.fnRM, c.fnPks)
            //R22: 無對應時不改檔
            assert.strict.deepStrictEqual(r.changed, false)
            assert.strict.deepStrictEqual(fs.statSync(c.fnRM).mtimeMs, mt0)
            assert.strict.deepStrictEqual(fs.readFileSync(c.fnRM, 'utf8'), readme)
        })

        it('有改寫時保留CRLF與BOM; 重跑冪等(第二次不再變動)', function() {
            let readme = '﻿# t\r\n\r\n<script src="https://cdn.jsdelivr.net/npm/w-fake@1.0.1/dist/w-fake.umd.js"></script>\r\n'
            let c = mkCase(readme)
            let r1 = modifyReadme(c.fnRM, c.fnPks)
            let out1 = fs.readFileSync(c.fnRM, 'utf8')
            //R22: 僅動網址
            assert.strict.deepStrictEqual(out1, '﻿# t\r\n\r\n<script src="https://some-owner.github.io/w-fake/dist/w-fake.umd.js"></script>\r\n')
            assert.strict.deepStrictEqual(r1.changed, true)
            let r2 = modifyReadme(c.fnRM, c.fnPks)
            assert.strict.deepStrictEqual(r2.changed, false)
            assert.strict.deepStrictEqual(fs.readFileSync(c.fnRM, 'utf8'), out1)
        })

    })

    describe('擁有者取自package.json之repository', function() {

        let forms = [
            ['物件url(git+https…git)', { type: 'git', url: 'git+https://github.com/own-a/w-fake.git' }, 'own-a'],
            ['物件url(https無.git)', { url: 'https://github.com/own-b/w-fake' }, 'own-b'],
            ['物件url(git://)', { url: 'git://github.com/own-c/w-fake.git' }, 'own-c'],
            ['物件url(ssh://git@)', { url: 'ssh://git@github.com/own-d/w-fake.git' }, 'own-d'],
            ['物件url(git@github.com:)', { url: 'git@github.com:own-e/w-fake.git' }, 'own-e'],
            ['字串github:', 'github:own-f/w-fake', 'own-f'],
            ['字串簡寫o/r', 'own-g/w-fake', 'own-g'],
            ['字串https', 'https://github.com/own-h/w-fake', 'own-h'],
            ['擁有者含大寫: 網址主機名為小寫', { url: 'https://github.com/Own-Z/w-fake' }, 'own-z'],
        ]
        for (let [title, repository, owner] of forms) {
            it(`${title}: 擁有者為${owner}`, function() {
                let { out } = run(tag('https://cdn.jsdelivr.net/npm/w-fake@1.0.1/dist/w-fake.umd.js'), { repository })
                //R22: 擁有者不寫死, 取自repository
                assert.strict.deepStrictEqual(out, tag(`https://${owner}.github.io/w-fake/dist/w-fake.umd.js`))
            })
        }

        let bads = [
            ['無repository', undefined],
            ['非GitHub主機', { type: 'git', url: 'https://gitea.example.com/own-x/w-fake.git' }],
            ['repository為空物件', {}],
            ['url為空字串', { url: '' }],
        ]
        for (let [title, repository] of bads) {
            it(`${title}: 不改寫網址、不拋錯、印警告並回傳warnings; 版號替換仍進行`, function() {
                let u = 'https://cdn.jsdelivr.net/npm/w-fake@1.0.1/dist/w-fake.umd.js'
                let c = mkCase(`${tag(u)}\nnpm i w-fake@0.0.1\n`, { repository, version: '2.0.0' })
                let { v, lines } = capture(() => modifyReadme(c.fnRM, c.fnPks))
                //R22: 取不到擁有者時不猜測; 警告可見
                assert.strict.deepStrictEqual(fs.readFileSync(c.fnRM, 'utf8'), `${tag('https://cdn.jsdelivr.net/npm/w-fake@2.0.0/dist/w-fake.umd.js')}\nnpm i w-fake@2.0.0\n`)
                assert.strict.deepStrictEqual(v.warnings.length, 1)
                assert.strict.ok(lines.some((s) => s.startsWith('warning: ') && s.includes('GitHub owner')), lines.join('|'))
            })
        }

        it('取不到擁有者但README無對應網址: 不警告', function() {
            let c = mkCase('# t\nnpm i w-fake@1.0.1\n', { repository: undefined })
            let { v, lines } = capture(() => modifyReadme(c.fnRM, c.fnPks))
            assert.strict.deepStrictEqual(v.warnings, [])
            assert.strict.deepStrictEqual(lines, [])
        })

    })

    describe('位置參數之檢測(規格輸入參數之檢測機制K2、K3): 帶預設值者視同opt鍵', function() {

        it('fnRM、fnPks給了而非非空字串(數字、空字串、物件、null): 視為未給, 改用./README.md與./package.json', function() {
            for (let [a, b] of [['5', '\'\''], ['\'\'', '5'], ['{}', '[]'], ['null', 'null'], ['undefined', 'undefined']]) {
                let c = mkCase(`${tag('https://cdn.jsdelivr.net/npm/w-fake@1.0.1/dist/w-fake.umd.js')}\n`)
                let href = new URL('../src/modifyReadme.mjs', import.meta.url).href
                fs.writeFileSync(path.join(c.dir, 'run.mjs'), `import m from ${JSON.stringify(href)}\nm(${a}, ${b})\n`)
                let r = spawnSync(process.execPath, [path.join(c.dir, 'run.mjs')], { cwd: c.dir, encoding: 'utf8', windowsHide: true })
                //K3: 非預期之輸入視為未給, 改用預設(cwd下之README.md與package.json)
                assert.strict.deepStrictEqual(r.status, 0, r.stderr)
                assert.strict.deepStrictEqual(fs.readFileSync(c.fnRM, 'utf8'), `${tag('https://some-owner.github.io/w-fake/dist/w-fake.umd.js')}\n`)
            }
        })

    })

    describe('各專案現有之toolg/modifyReadme.mjs不改即生效', function() {

        it('以該腳本(無參數, 預設./README.md與./package.json)於假套件資料夾執行, README改寫', function() {
            let c = mkCase(`${tag('https://cdn.jsdelivr.net/npm/w-fake@1.0.1/dist/w-fake.umd.js')}\n${tag('https://cdn.jsdelivr.net/npm/wsemi/dist/wsemi.umd.js')}\nnpm i w-fake@0.0.1\n`)
            let r = spawnSync(process.execPath, [path.resolve('./toolg/modifyReadme.mjs')], { cwd: c.dir, encoding: 'utf8', windowsHide: true })
            //R22: 腳本內容仍為import後呼叫modifyReadme(), 結果含gh-pages改寫與版號替換
            assert.strict.deepStrictEqual(r.status, 0, r.stderr)
            assert.strict.deepStrictEqual(fs.readFileSync(c.fnRM, 'utf8'), `${tag('https://some-owner.github.io/w-fake/dist/w-fake.umd.js')}\n${tag('https://some-owner.github.io/wsemi/dist/wsemi.umd.js')}\nnpm i w-fake@1.2.3\n`)
            assert.strict.deepStrictEqual(fs.readFileSync(path.resolve('./toolg/modifyReadme.mjs'), 'utf8').replace(/\r\n/g, '\n'), 'import modifyReadme from \'../src/modifyReadme.mjs\'\n\n\nmodifyReadme()\n')
        })

    })

})
