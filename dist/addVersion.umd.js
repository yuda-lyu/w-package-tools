/*!
 * addVersion v1.0.19
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n(require("lodash"),require("fs")):"function"==typeof define&&define.amd?define(["lodash","fs"],n):(e=e||self).addVersion=n(e.lodash,e.fs)}(this,(function(e,n){"use strict";return e=e&&e.hasOwnProperty("default")?e.default:e,n=n&&n.hasOwnProperty("default")?n.default:n,function(){var o=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./package.json",t=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./package.json",o=n.readFileSync(e,"utf8");return JSON.parse(o)}(o),i=t.version,r=e.split(i,".");r[2]=e.toString(e.toNumber(r[2])+1),t.version=e.join(r,"."),function(e){var o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"./package.json",t=JSON.stringify(e,null,2);n.writeFileSync(o,t,"utf8")}(t,o),console.log("now version: "+t.version)}}));
//# sourceMappingURL=addVersion.umd.js.map
