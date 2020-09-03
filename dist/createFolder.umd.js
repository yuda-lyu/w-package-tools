/*!
 * createFolder v1.0.29
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs")):"function"==typeof define&&define.amd?define(["fs"],t):(e="undefined"!=typeof globalThis?globalThis:e||self).createFolder=t(e.fs)}(this,(function(e){"use strict";function t(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var o=t(e);return function(e){try{o.default.mkdirSync(e,{recursive:!0})}catch(e){console.log("createFolder catch",e)}}}));
//# sourceMappingURL=createFolder.umd.js.map
