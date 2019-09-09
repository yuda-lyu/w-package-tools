/*!
 * getPks v1.0.3
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */(function(a,b){"object"==typeof exports&&"undefined"!=typeof module?module.exports=b(require("fs")):"function"==typeof define&&define.amd?define(["fs"],b):(a=a||self,a.getPks=b(a.fs))})(this,function(a){'use strict';function b(){var b=0<arguments.length&&void 0!==arguments[0]?arguments[0]:"./package.json",d=a.readFileSync(b,"utf8");return JSON.parse(d)}return a=a&&a.hasOwnProperty("default")?a["default"]:a,b});
//# sourceMappingURL=getPks.umd.js.map
