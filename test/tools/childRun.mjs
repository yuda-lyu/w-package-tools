import { spawnSync } from 'child_process'


/**
 * 以乾淨子程序執行一段CommonJS程式碼(包於async函數內, 可await動態import產物), 模擬引用產物之宿主
 *
 * why用子程序: 宿主能否自行退出、未處理rejection是否致exit 1、輸出落於stdout或stderr, 於mocha行程內量測必然失真(mocha自掛process監聽且行程不因遺留worker以外之因素結束)
 * why用CommonJS之-e: 不可用--input-type=module, 子程序內建立之eval worker會繼承execArgv而把inner之cjs程式碼當ESM, require失效使worker靜默壞掉
 *
 * @param {String} code 輸入子程序程式碼字串, 於async函數內執行, 可用require、await import與process.argv(argv[1]起為args)
 * @param {Array} [args=[]] 輸入子程序參數陣列, 預設[]
 * @param {Object} [opt={}] 輸入設定物件, 預設{}
 * @param {Number} [opt.timeout=60000] 輸入子程序逾時毫秒數, 逾時即終止並以timedOut回報(視為宿主無法自行退出), 預設60000
 * @returns {Object} 回傳{status, timedOut, stdout, stderr}
 */
function childRun(code, args = [], opt = {}) {
    let timeout = opt.timeout || 60000
    let r = spawnSync(process.execPath, ['-e', `(async () => {\n${code}\n})()`, ...args], { encoding: 'utf8', timeout })
    return {
        status: r.status,
        timedOut: !!(r.error && r.error.code === 'ETIMEDOUT'),
        stdout: r.stdout || '',
        stderr: r.stderr || '',
    }
}


export default childRun
