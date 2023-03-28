/*!
 * gVue1 v1.0.66
 * (c) 2018-2021 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('vue')) :
    typeof define === 'function' && define.amd ? define(['vue'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.gVue1 = factory(global.vue));
})(this, (function (vue) { 'use strict';

    // import trim from 'lodash/trim'

    var script = {
        components: {
        },
        props: {
            pathItems: {
                type: Array,
                default: () => [ //array function
                    'src:aaa',
                ],
            },
            opt: {
                type: Object,
                default: () => {}, //array function
            },
            height: {
                type: Number,
                default: 300
            },
            filterall: {
                type: String,
                default: ''
            },
        },
        data: function() {
            return {
                name: 'name',
            }
        },
        mounted: () => {
            console.log('mounted');
        },
        computed: {
        },
        methods: {
            testArrFun: () => { //array function
                console.log('testArrFun');
            },
            testAsyncFun1: async () => { //async function
                console.log('testAsyncFun1');
                let name = 'testAsyncFun1 xyz';
                let c = ` testAsyncFun1 a ${name} b `;
                console.log((c));
            },
            testAsyncFun2: () => { //async function
                console.log('testAsyncFun2');
                async function core() {
                    let name = 'testAsyncFun2 xyz';
                    let c = ` testAsyncFun2 a ${name} b `;
                    console.log((c));
                }
                core()
                    .catch(() => {});
            },
            async testAsyncFun3() { //async function
                await (() => {
                    return new Promise(resolve => { //promise
                        setTimeout(() => {
                            window.console.log('testAsyncFun3');
                            resolve();
                        }, 3000);
                    })
                })();
            },
        },
    };

    const _hoisted_1 = ["a"];

    function render(_ctx, _cache, $props, $setup, $data, $options) {
      return (vue.openBlock(), vue.createElementBlock("div", null, [
        vue.createElementVNode("div", {
          onClick: _cache[0] || (_cache[0] = (...args) => ($options.testArrFun && $options.testArrFun(...args)))
        }, "aaa"),
        vue.createElementVNode("div", {
          a: `abc-${_ctx.name}`
        }, vue.toDisplayString(_ctx.name), 9 /* TEXT, PROPS */, _hoisted_1)
      ]))
    }

    script.render = render;
    script.__file = "test-code-in/gVue1.vue";

    return script;

}));
