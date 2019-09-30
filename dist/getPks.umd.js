/*!
 * getPks v1.0.5
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('fs')) :
    typeof define === 'function' && define.amd ? define(['fs'], factory) :
    (global = global || self, global.getPks = factory(global.fs));
}(this, function (fs) { 'use strict';

    fs = fs && fs.hasOwnProperty('default') ? fs['default'] : fs;

    /**
     * 取得package.json資料物件
     *
     * @param {string} [fn='./package.json'] 輸入package.json路徑字串
     * @returns {Object} 回傳資料物件
     */

    function getPks() {
      var fn = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : './package.json';
      var c = fs.readFileSync(fn, 'utf8');
      return JSON.parse(c);
    }

    return getPks;

}));
//# sourceMappingURL=getPks.umd.js.map
