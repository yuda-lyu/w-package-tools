/**
 * 輸入數據陣列並循序執行
 *
 * @param {Array} pms 輸入數據陣列
 * @param {Function} fn 輸入執行函數，需return Promise
 * @returns {Promise} 回傳Promise，resolve為成功，reject為失敗並提供錯誤訊息
 */
function pmSeries(pms, fn) {
    return new Promise((resolve, reject) => {
        pms.reduce(function(pmm, v) {
            return pmm.then(function(t) {
                return fn(v)
            })
        }, Promise.resolve())
            .then(function() {
                resolve()
            }).catch(function(err) {
                reject(err)
            })
    })
}

export default pmSeries
