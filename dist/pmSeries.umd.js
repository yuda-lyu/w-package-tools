/*!
 * pmSeries v1.0.5
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.pmSeries = factory());
}(this, function () { 'use strict';

    /**
     * 輸入數據陣列並循序執行
     *
     * @param {Array} pms 輸入數據陣列
     * @param {Function} fn 輸入執行函數，需return Promise
     * @returns {Promise} 回傳Promise，resolve為成功，reject為失敗並提供錯誤訊息
     */
    function pmSeries(pms, fn) {
      return new Promise(function (resolve, reject) {
        pms.reduce(function (pmm, v) {
          return pmm.then(function (t) {
            return fn(v);
          });
        }, Promise.resolve()).then(function () {
          resolve();
        })["catch"](function (err) {
          reject(err);
        });
      });
    }

    return pmSeries;

}));
//# sourceMappingURL=pmSeries.umd.js.map
