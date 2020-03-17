/*!
 * getPks v1.0.23
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs")):"function"==typeof define&&define.amd?define(["fs"],t):(e=e||self).getPks=t(e.fs)}(this,(function(e){"use strict";return e=e&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e,function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./package.json",n=e.readFileSync(t,"utf8");return JSON.parse(n)}}));
//# sourceMappingURL=getPks.umd.js.map
