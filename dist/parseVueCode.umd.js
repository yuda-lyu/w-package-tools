/*!
 * parseVueCode v1.0.22
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(t,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n(require("lodash")):"function"==typeof define&&define.amd?define(["lodash"],n):(t=t||self).parseVueCode=n(t.lodash)}(this,(function(t){"use strict";function n(t,n){return function(t,n){return t.substr(0,n)}(t,t.length-n)}function e(t,n,e){for(var r=[],o=0;o<t.length;o++){var u=t[o];if(u.indexOf(n)>=0){var i=u.substring(u.indexOf(n)+n.length,u.length);r.push(i)}else if(r.length>0&&(r.push(u),u===e))break}return r.join("\r\n")}return t=t&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t,function(r){var o,u=r.split("\r\n");o=new RegExp("<template>[\\s\\S]+</template>","g");var i=r.match(o)[0],a=i.split("\r\n");a=t.drop(a,2),i=(a=t.dropRight(a,2)).join("\r\n");var f=e(u,"mounted: function() {","    },");f=f?n(f="function() {"+f,1):"function() { return {} }";var d=e(u,"data: function() {","    },");d=d?n(d="function() {"+d,1):"function() { return {} }";var s=e(u,"computed:","    },");s=s?n(s,1):"{}";var c=e(u,"methods:","    },");c=c?n(c,1):"{}";var p=e(u,"'actions':","            ],");return{tmp:i,mounted:f,data:d,computed:s,methods:c,action:p=p?n(p,1):"[]"}}}));
//# sourceMappingURL=parseVueCode.umd.js.map
