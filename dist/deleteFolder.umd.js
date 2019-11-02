/*!
 * deleteFolder v1.0.11
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n(require("fs")):"function"==typeof define&&define.amd?define(["fs"],n):(e=e||self).deleteFolder=n(e.fs)}(this,(function(e){"use strict";return e=e&&e.hasOwnProperty("default")?e.default:e,function n(t){e.existsSync(t)&&(e.readdirSync(t).forEach((function(f,i){var r=t+"/"+f;e.lstatSync(r).isDirectory()?n(r):e.unlinkSync(r)})),e.rmdirSync(t))}}));
//# sourceMappingURL=deleteFolder.umd.js.map
