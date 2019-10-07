/*!
 * getFiles v1.0.9
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs")):"function"==typeof define&&define.amd?define(["fs"],t):(e=e||self).getFiles=t(e.fs)}(this,(function(e){"use strict";return e=e&&e.hasOwnProperty("default")?e.default:e,function(t){if(!e.existsSync(t))return[];var n=e.readdirSync(t,{withFileTypes:!0});return n=(n=n.filter((function(e){return!e.isDirectory()}))).map((function(e){return e.name}))}}));
//# sourceMappingURL=getFiles.umd.js.map
