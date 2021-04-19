/*!
 * g1 v1.0.39
 * (c) 2018-2021 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.g1 = factory());
}(this, (function () { 'use strict';

    function g1() {
      var objData = {
        a: 1,
        b: 2.2
      }; //array function

      var testLongName = function testLongName() {
        return 'ttt:5678';
      }; //nullish-coalescing-operator


      var oc = !(objData !== null && objData !== void 0 && objData.d);
      console.log('oc', oc); //promise

      var pm = new Promise(function (resolve, reject) {
        setTimeout(function () {
          resolve('g1 foo');
        }, 300);
      });
      pm.then(function (value) {
        console.log(value);
      });
      console.log('g1 objData=', objData);
      console.log('g1 testLongName()=', testLongName());
    }

    return g1;

})));
//# sourceMappingURL=g1.umd.js.map
