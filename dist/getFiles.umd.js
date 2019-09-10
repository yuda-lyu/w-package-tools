/*!
 * getFiles v1.0.4
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */(function(a,b){"object"==typeof exports&&"undefined"!=typeof module?module.exports=b(require("fs")):"function"==typeof define&&define.amd?define(["fs"],b):(a=a||self,a.getFiles=b(a.fs))})(this,function(a){'use strict';function b(b){if(!a.existsSync(b))return[];var c=a.readdirSync(b,{withFileTypes:!0});return c=c.filter(function(a){var c=!a.isDirectory();return c}),c=c.map(function(a){return a.name}),c}return a=a&&a.hasOwnProperty("default")?a["default"]:a,b});
//# sourceMappingURL=getFiles.umd.js.map
