/*!
 * gBase2 v1.0.76
 * (c) 2018-2021 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.gBase2 = factory());
})(this, (function () { 'use strict';

  function _typeof(o) {
    "@babel/helpers - typeof";

    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
      return typeof o;
    } : function (o) {
      return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
    }, _typeof(o);
  }

  function toPrimitive(t, r) {
    if ("object" != _typeof(t) || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r || "default");
      if ("object" != _typeof(i)) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }

  function toPropertyKey(t) {
    var i = toPrimitive(t, "string");
    return "symbol" == _typeof(i) ? i : i + "";
  }

  function _defineProperty(obj, key, value) {
    key = toPropertyKey(key);
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

  function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
  function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
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
      console.log('tf1 testAsync resolve', r);
    }).catch(r => {
      console.log('tf1 testAsync reject', r);
    });
    console.log('gBase2 objData=', objData);
    console.log('gBase2 testLongName()=', testLongName());
  }

  return gBase2;

}));
