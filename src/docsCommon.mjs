import fs from 'fs'
import path from 'path'
import { wptError } from './wptCommon.mjs'


//docsCommon, 內部用(非公開API; 故用//註解而非JSDoc, 以免被jsdoc收進公開文件): genDocsExams與genDocsDist共用之路徑、檔案走訪與opt讀取(帳本R21、R24)


//toPosix, 路徑分隔轉為/
function toPosix(s) {
    return s.split(path.sep).join('/')
}


//isInside, child是否等於或位於parent之內(皆為絕對路徑, Windows下不分大小寫由path.relative處理)
function isInside(child, parent) {
    let r = path.relative(parent, child)
    return r === '' || (!r.startsWith('..') && !path.isAbsolute(r))
}


//walk, 遞迴列出資料夾內檔案(相對posix路徑, 同層依名稱排序); 連結(符號連結、junction)不跟進, 記入skipped
function walk(fd, skipped, base = fd) {
    let out = []
    let ents = fs.readdirSync(fd, { withFileTypes: true })
    ents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    for (let ent of ents) {
        let fp = path.join(fd, ent.name)
        if (ent.isSymbolicLink()) {
            skipped.push(fp)
        }
        else if (ent.isDirectory()) {
            out.push(...walk(fp, skipped, base))
        }
        else if (ent.isFile()) {
            out.push(toPosix(path.relative(base, fp)))
        }
    }
    return out
}


//copyFile, 複製檔案(自動建立上層資料夾)
function copyFile(fpSrc, fpTar) {
    fs.mkdirSync(path.dirname(fpTar), { recursive: true })
    fs.copyFileSync(fpSrc, fpTar)
}


//readOpt, 讀取opt(規格輸入參數之檢測機制V4、K3、K9): opt為undefined或null視為未給; 其他非一般物件(字串、數字、布林、陣列、函數)拋WPT_DOCS_INVALID_OPT;
//  各鍵為undefined或null取預設, 給了而型別不符者視為未給、改用預設(不拋錯), opt.debug為true時於msgs說明(固定詞彙, 不含傳入之值)
//  回傳{ msgs, strOpt, arrOpt, bolOpt, bad }; strOpt須為非空字串, arrOpt須為非空字串陣列, bolOpt須為布林; bad供各函數處理特殊鍵(如fdSrc可為空字串)時使用
function readOpt(opt) {
    if (opt === undefined || opt === null) {
        opt = {}
    }
    if (typeof opt !== 'object' || Array.isArray(opt)) {
        throw wptError('WPT_DOCS_INVALID_OPT', 'invalid opt: must be an object')
    }
    let bDebug = opt.debug === true
    let msgs = []
    let bad = (k, desc) => {
        if (bDebug) {
            msgs.push(`invalid opt.${k}: must be ${desc}, using default`)
        }
    }
    let strOpt = (k, def) => {
        let v = opt[k]
        if (v === undefined || v === null) {
            return def
        }
        if (typeof v !== 'string' || v === '') {
            bad(k, 'a non-empty string')
            return def
        }
        return v
    }
    let arrOpt = (k, def) => {
        let v = opt[k]
        if (v === undefined || v === null) {
            return def
        }
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || x === '')) {
            bad(k, 'an array of non-empty strings')
            return def
        }
        return v
    }
    let bolOpt = (k, def) => {
        let v = opt[k]
        if (v === undefined || v === null) {
            return def
        }
        if (typeof v !== 'boolean') {
            bad(k, 'a boolean')
            return def
        }
        return v
    }
    return { opt, msgs, strOpt, arrOpt, bolOpt, bad }
}


export { toPosix, isInside, walk, copyFile, readOpt }
