/*!
 * getPks v1.0.38
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs")):"function"==typeof define&&define.amd?define(["fs"],t):(e="undefined"!=typeof globalThis?globalThis:e||self).getPks=t(e.fs)}(this,(function(e){"use strict";function t(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var n=t(e);return function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./package.json",t=n.default.readFileSync(e,"utf8");return JSON.parse(t)}}));
//# sourceMappingURL=getPks.umd.js.map
