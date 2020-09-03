/*!
 * setPks v1.0.29
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs")):"function"==typeof define&&define.amd?define(["fs"],t):(e="undefined"!=typeof globalThis?globalThis:e||self).setPks=t(e.fs)}(this,(function(e){"use strict";function t(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var n=t(e);return function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"./package.json",f=JSON.stringify(e,null,2);n.default.writeFileSync(t,f,"utf8")}}));
//# sourceMappingURL=setPks.umd.js.map
