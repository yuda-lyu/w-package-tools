/*!
 * getFiles v1.0.5
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('fs')) :
    typeof define === 'function' && define.amd ? define(['fs'], factory) :
    (global = global || self, global.getFiles = factory(global.fs));
}(this, function (fs) { 'use strict';

    fs = fs && fs.hasOwnProperty('default') ? fs['default'] : fs;

    /**
     * 取得資料夾下所有檔案
     *
     * @param {String} fd 輸入資料夾路徑字串
     * @returns {Array} 回傳檔案字串陣列
     */

    function getFiles(fd) {
      //check
      if (!fs.existsSync(fd)) {
        return [];
      } //readdir


      var ltfs = fs.readdirSync(fd, {
        withFileTypes: true
      }); //filter

      ltfs = ltfs.filter(function (v) {
        var b = !v.isDirectory();
        return b;
      }); //map

      ltfs = ltfs.map(function (v) {
        return v.name;
      });
      return ltfs;
    }

    return getFiles;

}));
//# sourceMappingURL=getFiles.umd.js.map
