/*!
 * deleteFolder v1.0.5
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('fs')) :
    typeof define === 'function' && define.amd ? define(['fs'], factory) :
    (global = global || self, global.deleteFolder = factory(global.fs));
}(this, function (fs) { 'use strict';

    fs = fs && fs.hasOwnProperty('default') ? fs['default'] : fs;

    /**
     * 刪除資料牙
     *
     * @param {Str} path 輸入欲刪除資料夾路徑字串
     */

    function deleteFolder(path) {
      if (fs.existsSync(path)) {
        //console.log('in: ', path)
        fs.readdirSync(path).forEach(function (file, index) {
          var curPath = path + '/' + file;

          if (fs.lstatSync(curPath).isDirectory()) {
            // recurse
            deleteFolder(curPath);
          } else {
            // delete file
            //console.log('delete file: ', curPath)
            fs.unlinkSync(curPath);
          }
        }); //console.log('delete folder: ', path)

        fs.rmdirSync(path);
      }
    }

    return deleteFolder;

}));
//# sourceMappingURL=deleteFolder.umd.js.map
