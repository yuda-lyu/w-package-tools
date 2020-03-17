/*!
 * setPks v1.0.23
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs")):"function"==typeof define&&define.amd?define(["fs"],t):(e=e||self).setPks=t(e.fs)}(this,(function(e){"use strict";return e=e&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e,function(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"./package.json",f=JSON.stringify(t,null,2);e.writeFileSync(n,f,"utf8")}}));
//# sourceMappingURL=setPks.umd.js.map
