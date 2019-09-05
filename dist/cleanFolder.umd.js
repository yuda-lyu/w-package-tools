/*!
 * cleanFolder v1.0.2
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */(function(a,b){"object"==typeof exports&&"undefined"!=typeof module?module.exports=b(require("fs")):"function"==typeof define&&define.amd?define(["fs"],b):(a=a||self,a.cleanFolder=b(a.fs))})(this,function(a){'use strict';function b(c){a.readdirSync(c).forEach(function(d){var e=c+"/"+d;a.lstatSync(e).isDirectory()?b(e):a.unlinkSync(e)}),a.rmdirSync(c)}function c(c){a.existsSync(c)&&a.readdirSync(c).forEach(function(d){var e=c+"/"+d;a.lstatSync(e).isDirectory()?b(e):a.unlinkSync(e)})}return a=a&&a.hasOwnProperty("default")?a["default"]:a,c});
//# sourceMappingURL=cleanFolder.umd.js.map
