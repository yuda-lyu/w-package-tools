/*!
 * deleteFolder v1.0.2
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */(function(a,b){"object"==typeof exports&&"undefined"!=typeof module?module.exports=b(require("fs")):"function"==typeof define&&define.amd?define(["fs"],b):(a=a||self,a.deleteFolder=b(a.fs))})(this,function(a){'use strict';function b(c){a.existsSync(c)&&(a.readdirSync(c).forEach(function(d){var e=c+"/"+d;a.lstatSync(e).isDirectory()?b(e):a.unlinkSync(e)}),a.rmdirSync(c))}return a=a&&a.hasOwnProperty("default")?a["default"]:a,b});
//# sourceMappingURL=deleteFolder.umd.js.map
