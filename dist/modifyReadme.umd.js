/*!
 * modifyReadme v1.0.34
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n(require("fs"),require("lodash")):"function"==typeof define&&define.amd?define(["fs","lodash"],n):(e="undefined"!=typeof globalThis?globalThis:e||self).modifyReadme=n(e.fs,e.lodash)}(this,(function(e,n){"use strict";function t(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var o=t(e),d=t(n);function f(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./package.json",n=o.default.readFileSync(e,"utf8");return JSON.parse(n)}function i(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./README.md",n=o.default.readFileSync(e,"utf8");return{content:n,lines:d.default.split(n,"\r\n")}}return function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"./README.md",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"./package.json",t=f(n),d=i(e),a="(".concat(t.name,"@)+(\\d+.\\d+.\\d+)"),u="".concat(t.name,"@").concat(t.version),l=new RegExp(a,"g"),r=d.content.replace(l,u);o.default.writeFileSync(e,r,"utf8")}}));
//# sourceMappingURL=modifyReadme.umd.js.map
