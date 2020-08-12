/*!
 * cleanFolder v1.0.28
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(n,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e(require("fs")):"function"==typeof define&&define.amd?define(["fs"],e):(n="undefined"!=typeof globalThis?globalThis:n||self).cleanFolder=e(n.fs)}(this,(function(n){"use strict";return n=n&&Object.prototype.hasOwnProperty.call(n,"default")?n.default:n,function(e){n.existsSync(e)?n.readdirSync(e).forEach((function(t,i){var o=e+"/"+t;n.lstatSync(o).isDirectory()?function e(t){n.readdirSync(t).forEach((function(i,o){var r=t+"/"+i;n.lstatSync(r).isDirectory()?e(r):n.unlinkSync(r)})),n.rmdirSync(t)}(o):n.unlinkSync(o)})):n.mkdirSync(e)}}));
//# sourceMappingURL=cleanFolder.umd.js.map
