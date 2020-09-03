/*!
 * cleanFolder v1.0.29
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n(require("fs")):"function"==typeof define&&define.amd?define(["fs"],n):(e="undefined"!=typeof globalThis?globalThis:e||self).cleanFolder=n(e.fs)}(this,(function(e){"use strict";function n(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var t=n(e);return function(e){t.default.existsSync(e)?t.default.readdirSync(e).forEach((function(n,f){var i=e+"/"+n;t.default.lstatSync(i).isDirectory()?function e(n){t.default.readdirSync(n).forEach((function(f,i){var u=n+"/"+f;t.default.lstatSync(u).isDirectory()?e(u):t.default.unlinkSync(u)})),t.default.rmdirSync(n)}(i):t.default.unlinkSync(i)})):t.default.mkdirSync(e)}}));
//# sourceMappingURL=cleanFolder.umd.js.map
