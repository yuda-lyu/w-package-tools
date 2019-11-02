/*!
 * cleanFolder v1.0.10
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(n,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e(require("fs")):"function"==typeof define&&define.amd?define(["fs"],e):(n=n||self).cleanFolder=e(n.fs)}(this,(function(n){"use strict";return n=n&&n.hasOwnProperty("default")?n.default:n,function(e){n.existsSync(e)?n.readdirSync(e).forEach((function(t,i){var r=e+"/"+t;n.lstatSync(r).isDirectory()?function e(t){n.readdirSync(t).forEach((function(i,r){var c=t+"/"+i;n.lstatSync(c).isDirectory()?e(c):n.unlinkSync(c)})),n.rmdirSync(t)}(r):n.unlinkSync(r)})):n.mkdirSync(e)}}));
//# sourceMappingURL=cleanFolder.umd.js.map
