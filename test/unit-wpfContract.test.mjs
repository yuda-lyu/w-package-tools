import fs from 'fs'
import assert from 'assert'
import wpf from '../src/wpf.umd.js'
import pmSeries from '../src/wpf_pmSeries.umd.js'


//本檔守的是「rollupParfor 模板內嵌之 wpf(src/wpf.umd.js、src/wpf_pmSeries.umd.js,與 wsemip 為不同之 bundle,版本獨立)」,
//站點全集與判準見規則帳本R18〈wsemip 站點全集與判準〉之「wpf」段; 升級內嵌之 wpf 時, 本檔紅燈處即須重新評估之處

let delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

//tplNames: 取 rollupParfor.mjs 之 genParforCode 模板內所有 w.<名稱>(模板之 w 即 wpf)
let tplNames = () => {
    let src = fs.readFileSync('./src/rollupParfor.mjs', 'utf8')
    let a = src.indexOf('function genParforCode(')
    let b = src.indexOf('export default parfor', a)
    assert.strict.ok(a > 0 && b > a, '找不到 genParforCode 模板範圍')
    return [...new Set([...src.slice(a, b).matchAll(/\bw\.([A-Za-z0-9_]+)/g)].map((m) => m[1]))].sort()
}

//runMap: 以模板之用法執行 wpf.pmMap, 回傳{ res, max, starts }; fn 為各任務之耗時(ms)
let runMap = async (n, takeLimit, mk) => {
    let running = 0
    let max = 0
    let starts = []
    let res = await wpf.pmMap(Array.from({ length: n }, (_, i) => i), async (v, k) => {
        running += 1
        max = Math.max(max, running)
        starts.push(k)
        try {
            return await mk(v, k)
        }
        finally {
            running -= 1
        }
    }, takeLimit)
    return { res, max, starts }
}


describe('rollupParfor模板內嵌之wpf之契約守門(規則帳本R18、R4)', function() {

    it('模板使用之w.<名稱>皆為wpf匯出之函數(含pmMap、isbol、isfun、ispint、iseobj、isearr、cint)', function() {
        let names = tplNames()
        //R4/R18: 模板內之w為wpf; 模板新增取用而wpf未匯出即為執行期TypeError(產物載入後才壞)
        for (let k of ['pmMap', 'isbol', 'isfun', 'ispint', 'iseobj', 'isearr', 'cint']) {
            assert.strict.ok(names.includes(k), `模板未取用 ${k}(自模板推導之名稱: ${names.join(',')}), 本檔須同步更新`)
        }
        for (let k of names) {
            assert.strict.deepStrictEqual(typeof wpf[k], 'function', `wpf 未匯出 ${k}`)
        }
    })

    it('wpf_pmSeries之預設匯出為函數(模板parforCore以import pmSeries取用)', function() {
        assert.strict.deepStrictEqual(typeof pmSeries, 'function')
    })

    it('選項判定之語意: takeLimit/takeNumOfPgs為正整數才採用(其餘用預設), cint取整, returnResult須為布林, cb須為函數, pgs須為非空陣列或物件', function() {
        //R4: 模板以 ispint 判 takeLimit/takeNumOfPgs, 否則預設; cint 轉為整數
        for (let v of [1, 4, 10, '4']) {
            assert.strict.deepStrictEqual(wpf.ispint(v), true, String(v))
        }
        for (let v of [0, -1, 1.5, 'a', '4a', null, undefined, NaN, true, [], {}]) {
            assert.strict.deepStrictEqual(wpf.ispint(v), false, String(v))
        }
        assert.strict.deepStrictEqual([4, '4', 1.4, 1.6].map((v) => wpf.cint(v)), [4, 4, 1, 2]) //數字字串亦可, 轉為整數(四捨五入)
        //R4: returnResult非布林視為false; cb須為函數(async函數亦是)
        assert.strict.deepStrictEqual([true, false].map((v) => wpf.isbol(v)), [true, true])
        for (let v of [0, 1, 'true', null, undefined, [], {}]) {
            assert.strict.deepStrictEqual(wpf.isbol(v), false, String(v))
        }
        assert.strict.deepStrictEqual([() => 1, async () => 1, function() {}].map((v) => wpf.isfun(v)), [true, true, true])
        for (let v of [null, undefined, 'f', 1, {}, []]) {
            assert.strict.deepStrictEqual(wpf.isfun(v), false, String(v))
        }
        //模板: pgs為有內容之物件或陣列才處理, 空陣列/空物件/其他即拋'pgs is not an effective array or object'(故pmMap不會收到空輸入)
        assert.strict.deepStrictEqual([{ a: 1 }, {}, [1], []].map((v) => wpf.iseobj(v)), [true, false, false, false])
        assert.strict.deepStrictEqual([{ a: 1 }, {}, [1], [], 'a'].map((v) => wpf.isearr(v)), [false, false, true, false, false])
    })

    it('pmMap: 同時執行數不超過takeLimit(1、2、4,且達到min(takeLimit, 筆數)), 全部完成才resolve, 結果依索引序', async function() {
        //R4: 並行度受takeLimit節流; parfor resolve前所有任務已完成
        for (let [n, lim] of [[7, 1], [7, 2], [7, 4], [3, 10]]) {
            let t0 = Date.now()
            let { res, max, starts } = await runMap(n, lim, async (v) => {
                await delay(v === 0 ? 40 : 5) //第0個最慢, 完成順序與索引序不同
                return v * 2
            })
            assert.strict.deepStrictEqual(max, Math.min(lim, n), `n[${n}] limit[${lim}]`)
            assert.strict.deepStrictEqual(res, Array.from({ length: n }, (_, i) => i * 2), `n[${n}] limit[${lim}] 結果須依索引序`)
            assert.strict.deepStrictEqual(starts, Array.from({ length: n }, (_, i) => i), `n[${n}] limit[${lim}] 須依索引序派發`)
            assert.strict.ok(Date.now() - t0 >= 38, `n[${n}] limit[${lim}] 須待最慢任務完成才resolve`)
        }
    })

    it('pmMap: 任一任務reject即以該錯誤原值reject, 並停止派發後續任務(takeLimit=1時其後任務皆不執行)', async function() {
        //R4: cb拋錯或reject傳染至parfor
        let err = new Error('stop at 1')
        let ran = []
        let r = await runMap(4, 1, async (v) => {
            ran.push(v)
            if (v === 1) {
                throw err
            }
            return v
        }).then(() => null, (e) => e)
        assert.strict.deepStrictEqual(r, err)
        assert.strict.deepStrictEqual(ran, [0, 1])
        await delay(30)
        assert.strict.deepStrictEqual(ran, [0, 1], 'reject後不得再派發')
    })

    it('pmSeries(parforCore): 依序執行、結果依序、任一reject即以原值reject且不再執行後續', async function() {
        //R4: 組內依k序
        let log = []
        let rs = await pmSeries(['a', 'b', 'c'], async (x) => {
            log.push(x)
            await delay(3)
            return `${x}!`
        })
        assert.strict.deepStrictEqual(rs, ['a!', 'b!', 'c!'])
        assert.strict.deepStrictEqual(log, ['a', 'b', 'c'])
        log = []
        let err = new Error('stop at b')
        let r = await pmSeries(['a', 'b', 'c'], async (x) => {
            log.push(x)
            if (x === 'b') {
                throw err
            }
            return x
        }).then(() => null, (e) => e)
        assert.strict.deepStrictEqual(r, err)
        assert.strict.deepStrictEqual(log, ['a', 'b'])
    })
})
