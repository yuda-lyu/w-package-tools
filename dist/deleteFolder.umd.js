/*!
 * deleteFolder v1.0.27
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs")):"function"==typeof define&&define.amd?define(["fs"],t):(e=e||self).deleteFolder=t(e.fs)}(this,(function(e){"use strict";return e=e&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e,function t(n){e.existsSync(n)&&(e.readdirSync(n).forEach((function(f,o){var r=n+"/"+f;e.lstatSync(r).isDirectory()?t(r):e.unlinkSync(r)})),e.rmdirSync(n))}}));
//# sourceMappingURL=deleteFolder.umd.js.map
