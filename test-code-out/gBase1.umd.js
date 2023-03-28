/*!
 * gBase1 v1.0.66
 * (c) 2018-2021 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.gBase1 = factory());
})(this, (function () { 'use strict';

    function gBase1() {
      let objData = {
        a: 1,
        b: 2.2
      };

      //array function
      let testLongName = () => {
        return 'ttt:5678';
      };

      //nullish-coalescing-operator
      let oc = !(objData !== null && objData !== void 0 && objData.d);
      console.log('oc', oc);

      //promise
      let pm = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve('gBase1 foo');
        }, 300);
      });
      pm.then(value => {
        console.log(value);
      });
      console.log('gBase1 objData=', objData);
      console.log('gBase1 testLongName()=', testLongName());
    }

    return gBase1;

}));
