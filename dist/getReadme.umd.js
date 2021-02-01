/*!
 * getReadme v1.0.32
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs"),require("lodash")):"function"==typeof define&&define.amd?define(["fs","lodash"],t):(e="undefined"!=typeof globalThis?globalThis:e||self).getReadme=t(e.fs,e.lodash)}(this,(function(e,t){"use strict";function n(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var f=n(e),o=n(t);return function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./README.md",t=f.default.readFileSync(e,"utf8");return{content:t,lines:o.default.split(t,"\r\n")}}}));
//# sourceMappingURL=getReadme.umd.js.map
