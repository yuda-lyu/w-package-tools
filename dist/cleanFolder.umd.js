/*!
 * cleanFolder v1.0.34
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n(require("fs")):"function"==typeof define&&define.amd?define(["fs"],n):(e="undefined"!=typeof globalThis?globalThis:e||self).cleanFolder=n(e.fs)}(this,(function(e){"use strict";function n(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var t=n(e);function f(e){t.default.readdirSync(e).forEach((function(n,i){var u=e+"/"+n;t.default.lstatSync(u).isDirectory()?f(u):t.default.unlinkSync(u)})),t.default.rmdirSync(e)}return function(e){t.default.existsSync(e)?t.default.readdirSync(e).forEach((function(n,i){var u=e+"/"+n;t.default.lstatSync(u).isDirectory()?f(u):t.default.unlinkSync(u)})):t.default.mkdirSync(e)}}));
//# sourceMappingURL=cleanFolder.umd.js.map
