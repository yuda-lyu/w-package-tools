var r="object"==typeof global&&global&&global.Object===Object&&global,t="object"==typeof self&&self&&self.Object===Object&&self,n=(r||t||Function("return this")()).Symbol;var e=Array.isArray,u=Object.prototype,f=u.hasOwnProperty,o=u.toString,c=n?n.toStringTag:void 0;var i=Object.prototype.toString;var a="[object Null]",l="[object Undefined]",d=n?n.toStringTag:void 0;function v(r){return null==r?void 0===r?l:a:d&&d in Object(r)?function(r){var t=f.call(r,c),n=r[c];try{r[c]=void 0;var e=!0}catch(r){}var u=o.call(r);return e&&(t?r[c]=n:delete r[c]),u}(r):function(r){return i.call(r)}(r)}var g="[object Symbol]";var b=1/0,s=n?n.prototype:void 0,y=s?s.toString:void 0;function p(r){if("string"==typeof r)return r;if(e(r))return function(r,t){for(var n=-1,e=null==r?0:r.length,u=Array(e);++n<e;)u[n]=t(r[n],n,r);return u}(r,p)+"";if(function(r){return"symbol"==typeof r||function(r){return null!=r&&"object"==typeof r}(r)&&v(r)==g}(r))return y?y.call(r):"";var t=r+"";return"0"==t&&1/r==-b?"-0":t}var j=/\s/;var h=/^\s+/;function m(r){return r?r.slice(0,function(r){for(var t=r.length;t--&&j.test(r.charAt(t)););return t}(r)+1).replace(h,""):r}function A(r,t,n){var e=r.length;return n=void 0===n?e:n,!t&&n>=e?r:function(r,t,n){var e=-1,u=r.length;t<0&&(t=-t>u?0:u+t),(n=n>u?u:n)<0&&(n+=u),u=t>n?0:n-t>>>0,t>>>=0;for(var f=Array(u);++e<u;)f[e]=r[e+t];return f}(r,t,n)}function O(r){return r!=r}function S(r,t,n){return t==t?function(r,t,n){for(var e=n-1,u=r.length;++e<u;)if(r[e]===t)return e;return-1}(r,t,n):function(r,t,n,e){for(var u=r.length,f=n+(e?1:-1);e?f--:++f<u;)if(t(r[f],f,r))return f;return-1}(r,O,n)}var x=RegExp("[\\u200d\\ud800-\\udfff\\u0300-\\u036f\\ufe20-\\ufe2f\\u20d0-\\u20ff\\ufe0e\\ufe0f]");var T="\\ud800-\\udfff",w="["+T+"]",E="[\\u0300-\\u036f\\ufe20-\\ufe2f\\u20d0-\\u20ff]",P="\\ud83c[\\udffb-\\udfff]",R="[^"+T+"]",F="(?:\\ud83c[\\udde6-\\uddff]){2}",N="[\\ud800-\\udbff][\\udc00-\\udfff]",U="(?:"+E+"|"+P+")"+"?",k="[\\ufe0e\\ufe0f]?",q=k+U+("(?:\\u200d(?:"+[R,F,N].join("|")+")"+k+U+")*"),z="(?:"+[R+E+"?",E,F,N,w].join("|")+")",B=RegExp(P+"(?="+P+")|"+z+q,"g");function C(r){return function(r){return x.test(r)}(r)?function(r){return r.match(B)||[]}(r):function(r){return r.split("")}(r)}function D(r,t,n){var e;if((r=null==(e=r)?"":p(e))&&(n||void 0===t))return m(r);if(!r||!(t=p(t)))return r;var u=C(r),f=C(t),o=function(r,t){for(var n=-1,e=r.length;++n<e&&S(t,r[n],0)>-1;);return n}(u,f),c=function(r,t){for(var n=r.length;n--&&S(t,r[n],0)>-1;);return n}(u,f)+1;return A(u,o,c).join("")}async function G(){let r={a:1,b:2.2,c:"*",d:D(" trim me ")},t=()=>({m:r.a,n:r.b});return new Promise(((n,e)=>{setTimeout((()=>{console.log("gAsync2 data=",r),console.log("gAsync2 f()=",t()),n({name:"gAsync2",data:r,fr:t()})}),300)}))}export{G as default};