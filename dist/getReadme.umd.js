/*!
 * getReadme v1.0.5
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('fs'), require('lodash')) :
    typeof define === 'function' && define.amd ? define(['fs', 'lodash'], factory) :
    (global = global || self, global.getReadme = factory(global.fs, global.lodash));
}(this, function (fs, _) { 'use strict';

    fs = fs && fs.hasOwnProperty('default') ? fs['default'] : fs;
    _ = _ && _.hasOwnProperty('default') ? _['default'] : _;

    /**
     * 讀取readme資料物件
     *
     * @param {string} [fn='./README.md'] 輸入readme檔案路徑字串
     * @returns {Object} 回傳readme資料物件
     */

    function getReadme() {
      var fn = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : './README.md';
      var c = fs.readFileSync(fn, 'utf8');
      return {
        content: c,
        lines: _.split(c, '\r\n')
      };
    }

    return getReadme;

}));
//# sourceMappingURL=getReadme.umd.js.map
