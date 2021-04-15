/*!
 * parseVueCode v1.0.38
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(t,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n(require("lodash")):"function"==typeof define&&define.amd?define(["lodash"],n):(t="undefined"!=typeof globalThis?globalThis:t||self).parseVueCode=n(t.lodash)}(this,(function(t){"use strict";function n(t){return t&&"object"==typeof t&&"default"in t?t:{default:t}}var e=n(t);function o(t,n){return function(t,n){return t.substr(0,n)}(t,t.length-n)}function r(t,n,e){for(var o=[],r=0;r<t.length;r++){var u=t[r];if(u.indexOf(n)>=0){var i=u.substring(u.indexOf(n)+n.length,u.length);o.push(i)}else if(o.length>0&&(o.push(u),u===e))break}return o.join("\r\n")}return function(t){var n,u=t.split("\r\n");n=new RegExp("<template>[\\s\\S]+</template>","g");var i=t.match(n)[0],f=i.split("\r\n");f=e.default.drop(f,2),i=(f=e.default.dropRight(f,2)).join("\r\n");var a=r(u,"data: function() {","    },");a=a?o(a="function() {"+a,1):"function() { return {} }";var d=r(u,"mounted: function() {","    },");d=d?o(d="function() {"+d,1):"function() { return {} }";var s=r(u,"computed:","    },");s=s?o(s,1):"{}";var l=r(u,"methods:","    },");l=l?o(l,1):"{}";var c=r(u,"'actions':","            ],");return{tmp:i,data:a,mounted:d,computed:s,methods:l,action:c=c?o(c,1):"[]"}}}));
//# sourceMappingURL=parseVueCode.umd.js.map
