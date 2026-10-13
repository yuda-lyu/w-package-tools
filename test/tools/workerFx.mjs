import fs from 'fs'
import path from 'path'


/**
 * worker作用域、匯出取用、執行環境與選項之fixture(使用者模組原始碼), 供unit與e2e測試共用(單一擁有者)
 *
 * 每支fixture為一個使用者模組; 格號對應規則帳本R7、R11~R13之格(S##), 期望值為規格之觀察值
 */
let fxs = {

    //使用者頂層宣告與inner名稱同名(R7)
    'fxLet': `let instance = 'mine'
async function fxLet(p) {
    return instance + ':' + p
}
export default fxLet
`,
    'fxVarInst': `var instance = 'mine-var'
async function fxVarInst(p) {
    return instance + ':' + p
}
export default fxVarInst
`,
    'fxConstSend': `const sendMessage = (p) => 'user-send:' + p
async function fxConstSend(p) {
    return sendMessage(p)
}
export default fxConstSend
`,
    'fxFun': `function run(p) {
    return 'user-run:' + p
}
async function fxFun(p) {
    return run(p)
}
export default fxFun
`,
    'fxFunKf': `function run(p) {
    let s = 'user-run:'
    for (let i = 0; i < 1; i++) {
        s += p
    }
    return s
}
async function fxFunKf(p) {
    return [run, run].map((f) => f(p)).join('|')
}
export default fxFunKf
`,
    'fxVarRun': `var run = function (p) {
    return 'user-var-run:' + p
}
async function fxVarRun(p) {
    return run(p)
}
export default fxVarRun
`,
    'fxParentPort': `let parentPort = 'pp'
async function fxParentPort(p) {
    return parentPort + ':' + p
}
export default fxParentPort
`,
    'fxEvalFun': `function run(p) {
    return 'user-run:' + p
}
async function fxEvalFun(p) {
    return run(p) + eval('""')
}
export default fxEvalFun
`,
    'fxNameRun': `async function run(p) {
    return 'name-run:' + p
}
export default run
`,
    'fxPostMsg': `function postMessage(m) {
    return 'user-pm:' + m
}
async function fxPostMsg(p) {
    return postMessage(p)
}
export default fxPostMsg
`,
    'fxSelfVar': `var self = 'user-self'
async function fxSelfVar(p) {
    return self + ':' + p
}
export default fxSelfVar
`,

    //inner→使用者: 自由參照與自由賦值(R7雙向隔離)
    'fxFreeRef': `async function fxFreeRef(p) {
    return typeof init + ':' + p
}
export default fxFreeRef
`,
    'fxFreeAssign': `const fxFreeAssign = {
    a: async (p) => {
        instance = null
        return 'a:' + p
    },
    b: async (p) => {
        return 'b:' + p
    },
}
export default fxFreeAssign
`,

    //執行環境(R7嚴格模式、Node模組; R13 this)
    'fxStrict': `function probe() {
    return this === undefined ? 'strict' : 'sloppy'
}
async function fxStrict(p) {
    return probe() + ':' + p
}
export default fxStrict
`,
    'dep-leak.cjs': `module.exports = function () {
    leakedCounter = (typeof leakedCounter === 'number' ? leakedCounter : 0) + 1
    return leakedCounter
}
`,
    'fxLeakDep': `import leak from './dep-leak.cjs'
async function fxLeakDep(p) {
    return leak() + ':' + p
}
export default fxLeakDep
`,
    'fxModReq': `async function fxModReq(p) {
    return (typeof module === 'object' ? typeof module.require : 'no-module') + ':' + p
}
export default fxModReq
`,
    'fxModTypes': `async function fxModTypes(p) {
    return typeof module + ',' + typeof exports + ':' + p
}
export default fxModTypes
`,
    'fxLodashTA': `import isTypedArray from 'lodash-es/isTypedArray.js'
async function fxLodashTA(p) {
    return isTypedArray(new Uint8Array(2)) + ':' + p
}
export default fxLodashTA
`,
    'fxThisMethod': `const fxThisMethod = {
    val: 3,
    getVal: async function () {
        return this.val
    },
}
export default fxThisMethod
`,
    'fxClassInst': `class Counter {
    constructor() {
        this.n = 0
    }
    inc() {
        this.n += 1
        return this.n
    }
}
function fxClassInst() {
    return new Counter()
}
export default fxClassInst
`,
    'fxThisFn': `async function fxThisFn(p) {
    return (this === undefined ? 'undef' : typeof this) + ':' + p
}
export default fxThisFn
`,

    //匯出形狀(R7、R12)
    'fxNamed': `export let version = '1.0'
async function fxNamed(p) {
    return 'named:' + p
}
export default fxNamed
`,
    'fxOnlyNamed': `export async function fxOnlyNamed(p) {
    return 'only-named:' + p
}
`,
    'fxOnlyNamedObj': `export async function a(p) {
    return 'a:' + p
}
`,
    'fxNoExport': `async function fxNoExport(p) {
    return 'no-export:' + p
}
globalThis.__fxNoExport = fxNoExport
`,
    'fxCjsSrc.js': `module.exports = async function fxCjsSrc(p) {
    return 'cjs:' + p
}
`,
    'fxStrLit': `const tpl = 'module.exports=1'
async function core(p) {
    return tpl + ':' + p
}
export default core
`,
    'fxAnonDefault': `export default async function (p) {
    return 'anon:' + p
}
`,

    //選項(R11、R12): funNames與outer名稱、evNames
    'fxObjNames': `const fxObjNames = {
    other: async (p) => 'other:' + p,
    init: async (p) => 'init:' + p,
    recvMessage: async (p) => 'recvMessage:' + p,
    genPm: async (p) => 'genPm:' + p,
    rejectPendings: async (p) => 'rejectPendings:' + p,
    'my-fn': async (p) => 'my-fn:' + p,
    emit: async (p) => 'emit:' + p,
    terminate: async (p) => 'terminate:' + p,
}
export default fxObjNames
`,
    'fxFacEvQuote': `function fxFacEvQuote() {
    let ls = {}
    return {
        on(name, cb) {
            ls[name] = cb
        },
        go(p) {
            setTimeout(() => {
                if (ls["a'b"]) {
                    ls["a'b"]('ev:' + p)
                }
            }, 10)
            return 'go:' + p
        },
    }
}
export default fxFacEvQuote
`,
    'fxPlain': `async function core(p) {
    return 'plain:' + p
}
export default core
`,
}


/**
 * 將全部fixture寫入指定資料夾
 *
 * @param {String} fd 輸入資料夾路徑字串
 * @returns {Function} 回傳fp(name)函數, 由fixture名稱取得原始碼檔案路徑(無副檔名者為.mjs)
 */
function writeWorkerFx(fd) {
    fs.mkdirSync(fd, { recursive: true })
    let fn = (k) => (path.extname(k) ? k : `${k}.mjs`)
    for (let k in fxs) {
        fs.writeFileSync(path.resolve(fd, fn(k)), fxs[k], 'utf8')
    }
    return (k) => path.resolve(fd, fn(k))
}


export default writeWorkerFx
