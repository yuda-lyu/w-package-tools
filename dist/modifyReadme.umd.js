/*!
 * modifyReadme v1.0.27
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs"),require("lodash")):"function"==typeof define&&define.amd?define(["fs","lodash"],t):(e=e||self).modifyReadme=t(e.fs,e.lodash)}(this,(function(e,t){"use strict";function n(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./package.json",n=e.readFileSync(t,"utf8");return JSON.parse(n)}function o(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./README.md",o=e.readFileSync(n,"utf8");return{content:o,lines:t.split(o,"\r\n")}}return e=e&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e,t=t&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t,function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./README.md",a=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"./package.json",r=n(a),d=o(t),c="(".concat(r.name,"@)+(\\d+.\\d+.\\d+)"),i="".concat(r.name,"@").concat(r.version),f=new RegExp(c,"g"),l=d.content.replace(f,i);e.writeFileSync(t,l,"utf8")}}));
//# sourceMappingURL=modifyReadme.umd.js.map
