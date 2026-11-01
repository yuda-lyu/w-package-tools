#!/usr/bin/env node
//gh-pages: w-package-tools 提供的 gh-pages CLI 無縫平替.
//解 gh-pages@6.3.0 在 Windows + 大量檔案撞 spawn ENAMETOOLONG 的問題.
//機制: clone target branch 到暫存 → git rm -rf . (不列舉檔案) → 複製 → push.
//支援 flags: -d <dir> (來源資料夾, 預設 'docs')
//            --no-dist  (停用: 部署時不提供專案根 ./dist/)
//            --dist-map (提供專案根 ./dist/ 時一併含 .map 檔, 預設排除)
//dist 提供: 專案根 (cwd) 有 ./dist/ 且非空時, 一併複製到部署內容之 dist/ (站台 https://<擁有者>.github.io/<套件名>/dist/<檔>),
//  與 -d 資料夾內既有之 dist/ 同路徑且內容不同之檔衝突時以專案根 ./dist/ 為準並警告; 無 ./dist/ 時照舊部署並印一行說明.
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, copyFileSync, statSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, relative, dirname, isAbsolute, sep } from 'node:path'

//==== 最小 CLI parsing ====
let DIST = 'docs'
let PROJ_DIST = true
let PROJ_DIST_MAP = false
let argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-d' && argv[i + 1]) {
        DIST = argv[i + 1]; i++
    }
    else if (argv[i] === '--no-dist') {
        PROJ_DIST = false
    }
    else if (argv[i] === '--dist-map') {
        PROJ_DIST_MAP = true
    }
}

const BRANCH = 'gh-pages'
const REMOTE = 'origin'
const TMP = './_gh-pages-deploy'

function run(cmd, opts = {}) {
    return execSync(cmd, { stdio: 'inherit', ...opts })
}
function runQuiet(cmd, opts = {}) {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim()
}

const distAbs = resolve(DIST)
const tmpAbs = resolve(TMP)

console.log('[gh-pages] cwd  :', process.cwd())
console.log('[gh-pages] dist :', distAbs)
console.log('[gh-pages] tmp  :', tmpAbs)

if (!existsSync(distAbs)) {
    console.error(`[gh-pages] 來源資料夾不存在: ${distAbs}`)
    process.exit(1)
}

//拒絕用空來源部署: 空 docs 會讓後續 git rm -rf . 清光舊站卻只補一個 .nojekyll,
//等同安靜抹除線上網站. 常見於建置失敗產出空 docs 卻仍跑 deploy, 故在破壞性操作前 fail-fast.
if (readdirSync(distAbs).length === 0) {
    console.error(`[gh-pages] 來源資料夾為空, 拒絕部署 (避免清空線上網站): ${distAbs}`)
    process.exit(1)
}

//專案根 ./dist/ 之提供規劃 (唯讀, 先於任何破壞性操作)
let projDist
try {
    projDist = planProjDist()
}
catch (e) {
    console.error(`[gh-pages] 讀取專案根 ./dist/ 失敗: ${e.message}`)
    process.exit(1)
}
console.log('[gh-pages] 專案 dist:', projDist.msg)
for (let fp of projDist.skipped) {
    console.warn(`[gh-pages] 警告: ./dist/ 內之連結(符號連結或 junction)不跟進, 已略過: ${fp}`)
}

let remoteUrl
try {
    remoteUrl = runQuiet(`git config --get remote.${REMOTE}.url`)
}
catch {
    console.error(`[gh-pages] 取不到 remote.${REMOTE}.url`)
    process.exit(1)
}
console.log('[gh-pages] remote:', remoteUrl)

//Windows 上 git clone 的 .git/ 含 read-only 檔, rmSync 預設只擋 ENOENT, 不擋 EPERM/EBUSY,
//需 maxRetries + retryDelay 內建重試 (對 EBUSY/EMFILE/ENFILE/ENOTEMPTY/EPERM 都生效).
function safeRm(p) {
    rmSync(p, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}

if (existsSync(tmpAbs)) safeRm(tmpAbs)
mkdirSync(tmpAbs, { recursive: true })

//Windows + Unicode cwd 下 cpSync recursive 模式對 directory 會撞 Node/OS bug 殺 process
//(實測 node v24 + cwd 含中文/空格, cpSync 對 docs/fonts 無 stack trace 直接 exit),
//改用 copyFileSync 自寫遞迴 copy 繞開.
function copyRecursive(src, dst) {
    let s = statSync(src)
    if (s.isDirectory()) {
        mkdirSync(dst, { recursive: true })
        for (let entry of readdirSync(src)) {
            copyRecursive(join(src, entry), join(dst, entry))
        }
    }
    else {
        copyFileSync(src, dst)
    }
}

//listFiles, 列出資料夾內全部檔案(相對 posix 路徑, 排序); 連結(符號連結、junction)不跟進, 記入 skipped
function listFiles(fd, skipped, base = fd) {
    let out = []
    let ents = readdirSync(fd, { withFileTypes: true })
    ents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    for (let ent of ents) {
        let fp = join(fd, ent.name)
        if (ent.isSymbolicLink()) {
            skipped.push(fp)
        }
        else if (ent.isDirectory()) {
            out.push(...listFiles(fp, skipped, base))
        }
        else if (ent.isFile()) {
            out.push(relative(base, fp).split(sep).join('/'))
        }
    }
    return out
}

//isSubPath, child 是否等於或位於 parent 之內 (皆為絕對路徑)
function isSubPath(child, parent) {
    let r = relative(parent, child)
    return !r.startsWith('..') && !isAbsolute(r)
}

//planProjDist, 規劃是否提供專案根 ./dist/ (自有套件之瀏覽器端產物, 站台 dist/): 回傳 { src, files, nMap, skipped, msg }
//  files 為要提供之檔案(相對 ./dist/ 之 posix 路徑); 空陣列表示不提供, msg 說明原因
function planProjDist() {
    let src = resolve('dist')
    let plan = { src, files: [], nMap: 0, skipped: [], msg: '' }
    if (!PROJ_DIST) {
        plan.msg = '已停用(--no-dist), 不提供 dist/'
        return plan
    }
    if (!existsSync(src) || !statSync(src).isDirectory()) {
        plan.msg = `專案根 ./dist/ 不存在或不是資料夾(${src}), 照舊部署, 不提供 dist/`
        return plan
    }
    //-d 即為(或位於)專案根 ./dist/: 其內容本身就是部署內容, 不重複提供
    if (isSubPath(distAbs, src)) {
        plan.msg = `-d 資料夾[${distAbs}]即為(或位於)專案根 ./dist/, 不重複提供`
        return plan
    }
    if (readdirSync(src).length === 0) {
        plan.msg = `專案根 ./dist/ 為空(${src}), 照舊部署, 不提供 dist/`
        return plan
    }
    let lt = listFiles(src, plan.skipped)
    for (let rel of lt) {
        if (!PROJ_DIST_MAP && rel.toLowerCase().endsWith('.map')) {
            plan.nMap++
        }
        else {
            plan.files.push(rel)
        }
    }
    if (plan.files.length === 0) {
        plan.msg = `專案根 ./dist/ 無可提供之檔案(排除 .map ${plan.nMap} 個), 照舊部署, 不提供 dist/`
    }
    else {
        plan.msg = `提供專案根 ./dist/ -> 部署內容之 dist/ (${plan.files.length} 個檔案, 排除 .map ${plan.nMap} 個)`
    }
    return plan
}

//provideProjDist, 把專案根 ./dist/ 之檔案複製到部署內容 (tmpAbs) 之 dist/; 回傳因與 -d 資料夾內既有之 dist/ 衝突而以專案根 ./dist/ 為準之路徑
//  衝突: 同路徑之檔內容不同; 型態不同 (一邊為檔案、一邊為資料夾)
function provideProjDist(plan) {
    let conflicts = new Set()
    for (let rel of plan.files) {
        let segs = ['dist', ...rel.split('/')]

        //沿途若有檔案擋在應為資料夾之處, 移除之
        let p = tmpAbs
        for (let k = 0; k < segs.length - 1; k++) {
            p = join(p, segs[k])
            if (existsSync(p) && !lstatSync(p).isDirectory()) {
                rmSync(p, { force: true })
                conflicts.add(segs.slice(0, k + 1).join('/'))
            }
        }

        //目標處若為資料夾則移除; 為檔案且內容不同則記為衝突, 兩者皆以專案根 ./dist/ 為準覆蓋
        let fpSrc = join(plan.src, ...rel.split('/'))
        let fpTar = join(tmpAbs, ...segs)
        if (existsSync(fpTar)) {
            if (lstatSync(fpTar).isDirectory()) {
                safeRm(fpTar)
                conflicts.add(segs.join('/'))
            }
            else if (!readFileSync(fpTar).equals(readFileSync(fpSrc))) {
                conflicts.add(segs.join('/'))
            }
        }
        mkdirSync(dirname(fpTar), { recursive: true })
        copyFileSync(fpSrc, fpTar)
    }
    return [...conflicts]
}

//主流程整段包 try/finally: 任何一步(clone/copy/add/commit/push)失敗都不能跳過 finally 的清理,
//否則 tmpAbs 會變孤兒資料夾遺留在專案根目錄.
try {
    let branchExists = true
    try {
        run(`git clone --branch ${BRANCH} --single-branch --depth 1 "${remoteUrl}" "${tmpAbs}"`)
    }
    catch {
        branchExists = false
        console.log(`[gh-pages] ${BRANCH} branch 不存在於 remote, 改為 init orphan`)
        safeRm(tmpAbs)
        mkdirSync(tmpAbs, { recursive: true })
        run(`git init "${tmpAbs}"`)
        run(`git remote add ${REMOTE} "${remoteUrl}"`, { cwd: tmpAbs })
        run(`git checkout --orphan ${BRANCH}`, { cwd: tmpAbs })
    }

    if (branchExists) {
        try {
            run(`git rm -rf .`, { cwd: tmpAbs })
        }
        catch {
            console.log('[gh-pages] (無檔案可清空)')
        }
    }

    for (let entry of readdirSync(distAbs)) {
        copyRecursive(join(distAbs, entry), join(tmpAbs, entry))
    }
    let conflicts = provideProjDist(projDist)
    if (conflicts.length > 0) {
        console.warn(`[gh-pages] 警告: -d 資料夾內既有之 dist/ 與專案根 ./dist/ 有 ${conflicts.length} 個路徑衝突, 以專案根 ./dist/ 為準: ${conflicts.slice(0, 5).join(', ')}${conflicts.length > 5 ? ' ...' : ''}`)
    }
    writeFileSync(join(tmpAbs, '.nojekyll'), '')

    run(`git add -A`, { cwd: tmpAbs })
    let hasChange = true
    try {
        execSync(`git diff --cached --quiet`, { cwd: tmpAbs, stdio: 'ignore' }); hasChange = false
    }
    catch {}
    if (hasChange) {
        run(`git commit -m "deploy ${new Date().toISOString()}"`, { cwd: tmpAbs })
        run(`git push ${REMOTE} ${BRANCH}`, { cwd: tmpAbs })
        console.log('[gh-pages] push 完成')
    }
    else {
        console.log('[gh-pages] 無變更, 跳過 commit/push')
    }
    console.log('[gh-pages] done')
}
catch (e) {
    console.error(`[gh-pages] 部署失敗: ${e.message}`)
    process.exitCode = 1
}
finally {
    try {
        safeRm(tmpAbs)
    }
    catch (e) {
        console.warn(`[gh-pages] 清理暫存失敗: ${e.message}`)
    }
}
