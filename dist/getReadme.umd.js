/*!
 * getReadme v1.0.4
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */(function(a,b){"object"==typeof exports&&"undefined"!=typeof module?module.exports=b(require("fs"),require("lodash")):"function"==typeof define&&define.amd?define(["fs","lodash"],b):(a=a||self,a.getReadme=b(a.fs,a.lodash))})(this,function(a,b){'use strict';function c(){var d=0<arguments.length&&void 0!==arguments[0]?arguments[0]:"./README.md",e=a.readFileSync(d,"utf8");return{content:e,lines:b.split(e,"\r\n")}}return a=a&&a.hasOwnProperty("default")?a["default"]:a,b=b&&b.hasOwnProperty("default")?b["default"]:b,c});
//# sourceMappingURL=getReadme.umd.js.map
