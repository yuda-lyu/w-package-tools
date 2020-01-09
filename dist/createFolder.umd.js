/*!
 * createFolder v1.0.18
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs"),require("path"),require("lodash")):"function"==typeof define&&define.amd?define(["fs","path","lodash"],t):(e=e||self).createFolder=t(e.fs,e.path,e.lodash)}(this,(function(e,t,n){"use strict";function r(e){return e=function(e){return e=(e=e.replace(/\\/g,t.sep)).replace(/\//g,t.sep)}(e),n.split(e,t.sep)}return e=e&&e.hasOwnProperty("default")?e.default:e,t=t&&t.hasOwnProperty("default")?t.default:t,n=n&&n.hasOwnProperty("default")?n.default:n,function(f){var u=r(f),o=[];n.each(u,(function(r){o.push(r+t.sep);var f=n.join(o,"");r.indexOf(":")<0&&(e.existsSync(f)||e.mkdirSync(f))}))}}));
//# sourceMappingURL=createFolder.umd.js.map
