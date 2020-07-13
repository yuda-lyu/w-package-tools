/*!
 * getReadme v1.0.27
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs"),require("lodash")):"function"==typeof define&&define.amd?define(["fs","lodash"],t):(e=e||self).getReadme=t(e.fs,e.lodash)}(this,(function(e,t){"use strict";return e=e&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e,t=t&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t,function(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./README.md",o=e.readFileSync(n,"utf8");return{content:o,lines:t.split(o,"\r\n")}}}));
//# sourceMappingURL=getReadme.umd.js.map
