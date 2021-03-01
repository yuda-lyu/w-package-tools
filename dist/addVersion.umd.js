/*!
 * addVersion v1.0.35
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n(require("lodash"),require("fs")):"function"==typeof define&&define.amd?define(["lodash","fs"],n):(e="undefined"!=typeof globalThis?globalThis:e||self).addVersion=n(e.lodash,e.fs)}(this,(function(e,n){"use strict";function o(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var t=o(e),i=o(n);function f(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./package.json",n=i.default.readFileSync(e,"utf8");return JSON.parse(n)}function u(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"./package.json",o=JSON.stringify(e,null,2);i.default.writeFileSync(n,o,"utf8")}return function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./package.json",n=f(e),o=n.version,i=t.default.split(o,".");i[2]=t.default.toString(t.default.toNumber(i[2])+1),n.version=t.default.join(i,"."),u(n,e),console.log("now version: "+n.version)}}));
//# sourceMappingURL=addVersion.umd.js.map
