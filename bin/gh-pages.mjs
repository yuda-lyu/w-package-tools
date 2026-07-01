#!/usr/bin/env node
//gh-pages: w-package-tools 提供的 gh-pages CLI 無縫平替.
//解 gh-pages@6.3.0 在 Windows + 大量檔案撞 spawn ENAMETOOLONG 的問題.
//機制: clone target branch 到暫存 → git rm -rf . (不列舉檔案) → 複製 → push.
//支援 flags: -d <dir> (來源資料夾, 預設 'docs')
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, copyFileSync, statSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

//==== 最小 CLI parsing ====
let DIST = 'docs'
let argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-d' && argv[i + 1]) {
        DIST = argv[i + 1]; i++
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
