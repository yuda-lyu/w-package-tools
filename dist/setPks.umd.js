/*!
 * setPks v1.0.5
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('fs')) :
    typeof define === 'function' && define.amd ? define(['fs'], factory) :
    (global = global || self, global.setPks = factory(global.fs));
}(this, function (fs) { 'use strict';

    fs = fs && fs.hasOwnProperty('default') ? fs['default'] : fs;

    /**
     * 儲存資料至package.json
     *
     * @param {Object} pks 輸入package.json資料物件
     * @param {string} [fn='./package.json'] 輸入package.json路徑字串
     */

    function setPks(pks) {
      var fn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : './package.json';
      var c = JSON.stringify(pks, null, 2);
      fs.writeFileSync(fn, c, 'utf8');
    }

    return setPks;

}));
//# sourceMappingURL=setPks.umd.js.map
