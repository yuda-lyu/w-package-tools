/*!
 * addVersion v1.0.25
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,o){"object"==typeof exports&&"undefined"!=typeof module?module.exports=o(require("lodash"),require("fs")):"function"==typeof define&&define.amd?define(["lodash","fs"],o):(e=e||self).addVersion=o(e.lodash,e.fs)}(this,(function(e,o){"use strict";function n(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./package.json",n=o.readFileSync(e,"utf8");return JSON.parse(n)}function t(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"./package.json",t=JSON.stringify(e,null,2);o.writeFileSync(n,t,"utf8")}return e=e&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e,o=o&&Object.prototype.hasOwnProperty.call(o,"default")?o.default:o,function(){var o=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./package.json",r=n(o),i=r.version,s=e.split(i,".");s[2]=e.toString(e.toNumber(s[2])+1),r.version=e.join(s,"."),t(r,o),console.log("now version: "+r.version)}}));
//# sourceMappingURL=addVersion.umd.js.map
