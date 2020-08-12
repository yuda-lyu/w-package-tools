/*!
 * getReadme v1.0.28
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs"),require("lodash")):"function"==typeof define&&define.amd?define(["fs","lodash"],t):(e="undefined"!=typeof globalThis?globalThis:e||self).getReadme=t(e.fs,e.lodash)}(this,(function(e,t){"use strict";return e=e&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e,t=t&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t,function(){var o=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./README.md",n=e.readFileSync(o,"utf8");return{content:n,lines:t.split(n,"\r\n")}}}));
//# sourceMappingURL=getReadme.umd.js.map
