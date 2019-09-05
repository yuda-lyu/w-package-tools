/*!
 * setPks v1.0.0
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */(function(a,b){"object"==typeof exports&&"undefined"!=typeof module?module.exports=b(require("fs")):"function"==typeof define&&define.amd?define(["fs"],b):(a=a||self,a.setPks=b(a.fs))})(this,function(a){'use strict';function b(b){var d=1<arguments.length&&void 0!==arguments[1]?arguments[1]:"./package.json",e=JSON.stringify(b,null,2);a.writeFileSync(d,e,"utf8")}return a=a&&a.hasOwnProperty("default")?a["default"]:a,b});
//# sourceMappingURL=setPks.umd.js.map
