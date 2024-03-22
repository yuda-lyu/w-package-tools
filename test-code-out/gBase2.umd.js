/*!
 * gBase2 v1.0.73
 * (c) 2018-2021 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.gBase2 = factory());
})(this, (function () { 'use strict';

  function _typeof(obj) {
    "@babel/helpers - typeof";

    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
      return typeof obj;
    } : function (obj) {
      return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    }, _typeof(obj);
  }

  function _toPrimitive(input, hint) {
    if (_typeof(input) !== "object" || input === null) return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== undefined) {
      var res = prim.call(input, hint || "default");
      if (_typeof(res) !== "object") return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }

  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return _typeof(key) === "symbol" ? key : String(key);
  }

  function _defineProperty(obj, key, value) {
    key = _toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }

  function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
  function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
  function gBase2() {
    let objData = {
      a: 1,
      b: 2.2
    };
    let xyzForLongName = 'xyz:12.34';

    //object-rest-spread
    objData = _objectSpread(_objectSpread({}, objData), {}, {
      c: `abc&${xyzForLongName}`
    }); //會添加_objectSpread2, _defineProperty等函式

    //array function
    let testLongName = () => {
      return 'ttt:5678';
    };

    //promise
    let pm = new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('gBase2 foo');
      }, 300);
    });
    pm.then(value => {
      console.log(value);
    });

    //async function
    async function testAsync() {
      async function core() {
        return Promise.reject('reject');
      }
      await core();
    }
    testAsync().then(r => {
      console.log('aaa testAsync resolve', r);
    }).catch(r => {
      console.log('aaa testAsync reject', r);
    });
    console.log('gBase2 objData=', objData);
    console.log('gBase2 testLongName()=', testLongName());
  }

  return gBase2;

}));
