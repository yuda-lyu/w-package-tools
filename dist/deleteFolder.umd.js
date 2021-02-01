/*!
 * deleteFolder v1.0.31
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs")):"function"==typeof define&&define.amd?define(["fs"],t):(e="undefined"!=typeof globalThis?globalThis:e||self).deleteFolder=t(e.fs)}(this,(function(e){"use strict";function t(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var n=t(e);return function e(t){n.default.existsSync(t)&&(n.default.readdirSync(t).forEach((function(f,i){var d=t+"/"+f;n.default.lstatSync(d).isDirectory()?e(d):n.default.unlinkSync(d)})),n.default.rmdirSync(t))}}));
//# sourceMappingURL=deleteFolder.umd.js.map
