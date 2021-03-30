/*!
 * getFiles v1.0.37
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("fs")):"function"==typeof define&&define.amd?define(["fs"],t):(e="undefined"!=typeof globalThis?globalThis:e||self).getFiles=t(e.fs)}(this,(function(e){"use strict";function t(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var n=t(e);return function(e){if(!n.default.existsSync(e))return[];var t=n.default.readdirSync(e,{withFileTypes:!0});return t=(t=t.filter((function(e){return!e.isDirectory()}))).map((function(e){return e.name}))}}));
//# sourceMappingURL=getFiles.umd.js.map
