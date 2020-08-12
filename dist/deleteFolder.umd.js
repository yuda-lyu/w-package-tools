/*!
 * deleteFolder v1.0.28
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs")):"function"==typeof define&&define.amd?define(["fs"],t):(e="undefined"!=typeof globalThis?globalThis:e||self).deleteFolder=t(e.fs)}(this,(function(e){"use strict";return e=e&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e,function t(n){e.existsSync(n)&&(e.readdirSync(n).forEach((function(o,f){var i=n+"/"+o;e.lstatSync(i).isDirectory()?t(i):e.unlinkSync(i)})),e.rmdirSync(n))}}));
//# sourceMappingURL=deleteFolder.umd.js.map
