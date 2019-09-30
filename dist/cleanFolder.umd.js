/*!
 * cleanFolder v1.0.5
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('fs')) :
    typeof define === 'function' && define.amd ? define(['fs'], factory) :
    (global = global || self, global.cleanFolder = factory(global.fs));
}(this, function (fs) { 'use strict';

    fs = fs && fs.hasOwnProperty('default') ? fs['default'] : fs;

    function core(path) {
      fs.readdirSync(path).forEach(function (file, index) {
        var curPath = path + '/' + file;

        if (fs.lstatSync(curPath).isDirectory()) {
          // recurse
          core(curPath);
        } else {
          // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
    /**
     * 清空資料夾
     *
     * @param {String} path 輸入欲清空資料夾路徑字串
     */


    function cleanFolder(path) {
      if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
          var curPath = path + '/' + file;

          if (fs.lstatSync(curPath).isDirectory()) {
            // recurse
            core(curPath);
          } else {
            fs.unlinkSync(curPath);
          }
        });
      } else {
        fs.mkdirSync(path);
      }
    }

    return cleanFolder;

}));
//# sourceMappingURL=cleanFolder.umd.js.map
