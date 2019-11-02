/*!
 * getReadme v1.0.10
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs"),require("lodash")):"function"==typeof define&&define.amd?define(["fs","lodash"],t):(e=e||self).getReadme=t(e.fs,e.lodash)}(this,(function(e,t){"use strict";return e=e&&e.hasOwnProperty("default")?e.default:e,t=t&&t.hasOwnProperty("default")?t.default:t,function(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./README.md",f=e.readFileSync(n,"utf8");return{content:f,lines:t.split(f,"\r\n")}}}));
//# sourceMappingURL=getReadme.umd.js.map
