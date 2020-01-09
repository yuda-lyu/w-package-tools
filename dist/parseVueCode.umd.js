/*!
 * parseVueCode v1.0.18
 * (c) 2018-2019 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
!function(n,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("lodash")):"function"==typeof define&&define.amd?define(["lodash"],t):(n=n||self).parseVueCode=t(n.lodash)}(this,(function(n){"use strict";function t(n,t){return function(n,t){return n.substr(0,t)}(n,n.length-t)}function e(n,t,e){for(var r=[],o=0;o<n.length;o++){var u=n[o];if(u.indexOf(t)>=0){var i=u.substring(u.indexOf(t)+t.length,u.length);r.push(i)}else if(r.length>0&&(r.push(u),u===e))break}return r.join("\r\n")}return n=n&&n.hasOwnProperty("default")?n.default:n,function(r){var o,u=r.split("\r\n");o=new RegExp("<template>[\\s\\S]+</template>","g");var i=r.match(o)[0],a=i.split("\r\n");a=n.drop(a,2),i=(a=n.dropRight(a,2)).join("\r\n");var f=e(u,"mounted: function() {","    },");f=f?t(f="function() {"+f,1):"function() { return {} }";var d=e(u,"data: function() {","    },");d=d?t(d="function() {"+d,1):"function() { return {} }";var s=e(u,"computed:","    },");s=s?t(s,1):"{}";var c=e(u,"methods:","    },");c=c?t(c,1):"{}";var p=e(u,"'actions':","            ],");return{tmp:i,mounted:f,data:d,computed:s,methods:c,action:p=p?t(p,1):"[]"}}}));
//# sourceMappingURL=parseVueCode.umd.js.map
