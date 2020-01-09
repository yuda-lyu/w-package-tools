/*!
 * createDir v1.0.17
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs"),require("path"),require("lodash")):"function"==typeof define&&define.amd?define(["fs","path","lodash"],t):(e=e||self).createDir=t(e.fs,e.path,e.lodash)}(this,(function(e,t,n){"use strict";function r(e){return e=function(e){return e=(e=e.replace(/\\/g,t.sep)).replace(/\//g,t.sep)}(e),n.split(e,t.sep)}return e=e&&e.hasOwnProperty("default")?e.default:e,t=t&&t.hasOwnProperty("default")?t.default:t,n=n&&n.hasOwnProperty("default")?n.default:n,function(f){var u=r(f),s=[];n.each(u,(function(r){s.push(r+t.sep);var f=n.join(s,"");r.indexOf(":")<0&&(e.existsSync(f)||e.mkdirSync(f))}))}}));
//# sourceMappingURL=createDir.umd.js.map
