/*!
 * cleanFolder v1.0.23
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(n,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e(require("fs")):"function"==typeof define&&define.amd?define(["fs"],e):(n=n||self).cleanFolder=e(n.fs)}(this,(function(n){"use strict";return n=n&&Object.prototype.hasOwnProperty.call(n,"default")?n.default:n,function(e){n.existsSync(e)?n.readdirSync(e).forEach((function(t,r){var c=e+"/"+t;n.lstatSync(c).isDirectory()?function e(t){n.readdirSync(t).forEach((function(r,c){var i=t+"/"+r;n.lstatSync(i).isDirectory()?e(i):n.unlinkSync(i)})),n.rmdirSync(t)}(c):n.unlinkSync(c)})):n.mkdirSync(e)}}));
//# sourceMappingURL=cleanFolder.umd.js.map
