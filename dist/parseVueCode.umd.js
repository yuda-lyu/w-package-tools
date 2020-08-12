/*!
 * parseVueCode v1.0.28
 * (c) 2018-2020 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e(require("lodash")):"function"==typeof define&&define.amd?define(["lodash"],e):(t="undefined"!=typeof globalThis?globalThis:t||self).parseVueCode=e(t.lodash)}(this,(function(t){"use strict";function e(t,e){return function(t,e){return t.substr(0,e)}(t,t.length-e)}function n(t,e,n){for(var o=[],r=0;r<t.length;r++){var u=t[r];if(u.indexOf(e)>=0){var i=u.substring(u.indexOf(e)+e.length,u.length);o.push(i)}else if(o.length>0&&(o.push(u),u===n))break}return o.join("\r\n")}return t=t&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t,function(o){var r,u=o.split("\r\n");r=new RegExp("<template>[\\s\\S]+</template>","g");var i=o.match(r)[0],a=i.split("\r\n");a=t.drop(a,2),i=(a=t.dropRight(a,2)).join("\r\n");var f=n(u,"mounted: function() {","    },");f=f?e(f="function() {"+f,1):"function() { return {} }";var d=n(u,"data: function() {","    },");d=d?e(d="function() {"+d,1):"function() { return {} }";var s=n(u,"computed:","    },");s=s?e(s,1):"{}";var l=n(u,"methods:","    },");l=l?e(l,1):"{}";var c=n(u,"'actions':","            ],");return{tmp:i,mounted:f,data:d,computed:s,methods:l,action:c=c?e(c,1):"[]"}}}));
//# sourceMappingURL=parseVueCode.umd.js.map
