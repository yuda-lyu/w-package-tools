/*!
 * pmSeries v1.0.0
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */(function(a,b){"object"==typeof exports&&"undefined"!=typeof module?module.exports=b():"function"==typeof define&&define.amd?define(b):(a=a||self,a.pmSeries=b())})(this,function(){'use strict';return function(a,b){return new Promise(function(c,d){a.reduce(function(a,c){return a.then(function(){return b(c)})},Promise.resolve()).then(function(){c()})["catch"](function(a){d(a)})})}});
//# sourceMappingURL=pmSeries.umd.js.map
