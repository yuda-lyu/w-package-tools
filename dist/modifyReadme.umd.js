/*!
 * modifyReadme v1.0.19
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n(require("fs"),require("lodash")):"function"==typeof define&&define.amd?define(["fs","lodash"],n):(e=e||self).modifyReadme=n(e.fs,e.lodash)}(this,(function(e,n){"use strict";return e=e&&e.hasOwnProperty("default")?e.default:e,n=n&&n.hasOwnProperty("default")?n.default:n,function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./README.md",o=function(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./package.json",t=e.readFileSync(n,"utf8");return JSON.parse(t)}(arguments.length>1&&void 0!==arguments[1]?arguments[1]:"./package.json"),d=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./README.md",o=e.readFileSync(t,"utf8");return{content:o,lines:n.split(o,"\r\n")}}(t),a="(".concat(o.name,"@)+(\\d+.\\d+.\\d+)"),r="".concat(o.name,"@").concat(o.version),i=new RegExp(a,"g"),f=d.content.replace(i,r);e.writeFileSync(t,f,"utf8")}}));
//# sourceMappingURL=modifyReadme.umd.js.map
