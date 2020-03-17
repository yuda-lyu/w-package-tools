/*!
 * createFolder v1.0.23
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs"),require("path"),require("lodash")):"function"==typeof define&&define.amd?define(["fs","path","lodash"],t):(e=e||self).createFolder=t(e.fs,e.path,e.lodash)}(this,(function(e,t,r){"use strict";function n(e){return e=function(e){return e=(e=e.replace(/\\/g,t.sep)).replace(/\//g,t.sep)}(e),r.split(e,t.sep)}return e=e&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e,t=t&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t,r=r&&Object.prototype.hasOwnProperty.call(r,"default")?r.default:r,function(o){var a=n(o),f=[];r.each(a,(function(n){f.push(n+t.sep);var o=r.join(f,"");n.indexOf(":")<0&&(e.existsSync(o)||e.mkdirSync(o))}))}}));
//# sourceMappingURL=createFolder.umd.js.map
