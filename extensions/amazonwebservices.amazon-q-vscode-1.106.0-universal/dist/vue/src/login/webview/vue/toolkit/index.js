(()=>{var ce={848:(e,r,n)=>{"use strict";n.r(r),n.d(r,{default:()=>k});var i=n(6758),s=n.n(i),l=n(935),C=n.n(l),b=n(6122),v=C()(s());v.i(b.A),v.push([e.id,`
.selectable-item[data-v-7be6f060] {
    margin-bottom: 10px;
    margin-top: 10px;
    cursor: pointer;
}
.logoIcon[data-v-7be6f060] {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    height: auto;
}
.hint[data-v-7be6f060] {
    color: #c6c6c6;
    margin-bottom: 5px;
    margin-top: 5px;
    font-size: var(--font-size-sm);
    font-weight: 500;
}
.vscode-light .hint[data-v-7be6f060] {
    color: #3d3a3a;
}
.vscode-dark .hint[data-v-7be6f060] {
    color: #c6c6c6;
}
.auth-container[data-v-7be6f060] {
    height: auto;
    margin: auto;
    position: absolute;
    top: var(--auth-container-top);
    max-width: 260px;
    width: 90vw;
}
.header[data-v-7be6f060] {
    font-size: var(--font-size-base);
    font-weight: bold;
}
.vscode-dark .header[data-v-7be6f060] {
    color: white;
}
.vscode-light .header[data-v-7be6f060] {
    color: black;
}
.title[data-v-7be6f060] {
    margin-bottom: 3px;
    margin-top: 3px;
    font-size: var(--font-size-base);
    font-weight: 500;
}
.vscode-dark .title[data-v-7be6f060] {
    color: white;
}
.vscode-light .title[data-v-7be6f060] {
    color: black;
}
.subHeader[data-v-7be6f060] {
    font-size: var(--font-size-sm);
}
.continue-button[data-v-7be6f060] {
    background-color: var(--vscode-button-background);
    color: white;
    width: 100%;
    height: 30px;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    margin-bottom: 3px;
    margin-top: 3px;
    cursor: pointer;
    font-size: var(--font-size-base);
}
.back-button[data-v-7be6f060] {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--vscode-button-foreground);
    height: 13px;
    display: flex;
    align-items: center;
    padding-left: 0;
}
.back-button svg[data-v-7be6f060] {
    margin-left: 0px;
}
.continue-button[data-v-7be6f060]:disabled {
    background-color: var(--vscode-input-background);
    color: #6f6f6f;
    cursor: not-allowed;
}
body.vscode-high-contrast:not(body.vscode-high-contrast-light) .continue-button[data-v-7be6f060] {
    background-color: white;
    color: var(--vscode-input-background);
}
body.vscode-high-contrast:not(body.vscode-high-contrast-light) .continue-button[data-v-7be6f060]:disabled {
    background-color: #6f6f6f;
    color: var(--vscode-input-background);
}
body.vscode-high-contrast-light .continue-button[data-v-7be6f060] {
    background-color: var(--vscode-button-background);
    color: white;
}
body.vscode-high-contrast-light .continue-button[data-v-7be6f060]:disabled {
    background-color: #6f6f6f;
    color: var(--vscode-input-background);
}
.urlInput[data-v-7be6f060] {
    background-color: var(--vscode-input-background);
    width: 244px;
    height: 28px;
    box-sizing: border-box;
    border: none;
    padding-left: 8px;
    padding-right: 8px;
    padding-top: 6px;
    padding-bottom: 6px;
    font-size: var(--font-size-base);
    font-weight: 400;
}
body.vscode-light .urlInput[data-v-7be6f060],
body.vscode-high-contrast-light .urlInput[data-v-7be6f060] {
    color: black;
}
body.vscode-dark .urlInput[data-v-7be6f060],
body.vscode-high-contrast:not(body.vscode-high-contrast-light) .urlInput[data-v-7be6f060] {
    color: #cccccc;
}
.iamInput[data-v-7be6f060] {
    background-color: var(--vscode-input-background);
    width: 244px;
    height: 28px;
    box-sizing: border-box;
    border: none;
    padding-left: 8px;
    padding-right: 8px;
    padding-top: 6px;
    padding-bottom: 6px;
    font-size: var(--font-size-base);
    font-weight: 400;
}
body.vscode-light .iamInput[data-v-7be6f060],
body.vscode-high-contrast-light .iamInput[data-v-7be6f060] {
    color: black;
}
body.vscode-dark .iamInput[data-v-7be6f060],
body.vscode-high-contrast:not(body.vscode-high-contrast-light) .iamInput[data-v-7be6f060] {
    color: #cccccc;
}
.regionSelect[data-v-7be6f060] {
    background-color: var(--vscode-input-background);
    width: 244px;
    margin-bottom: 5px;
    margin-top: 2px;
    padding-left: 8px;
    padding-right: 8px;
    padding-top: 6px;
    padding-bottom: 6px;
    font-size: var(--font-size-base);
    font-weight: 400;
}
body.vscode-light .regionSelect[data-v-7be6f060],
body.vscode-high-contrast-light .regionSelect[data-v-7be6f060] {
    color: black;
}
body.vscode-dark .regionSelect[data-v-7be6f060],
body.vscode-high-contrast:not(body.vscode-high-contrast-light) .regionSelect[data-v-7be6f060] {
    color: white;
}
.start-url-error[data-v-7be6f060] {
    color: #ff0000;
    font-size: var(--font-size-sm);
}
.start-url-warning[data-v-7be6f060] {
    color: #dfe216;
    font-size: var(--font-size-sm);
}
#logo[data-v-7be6f060] {
    fill: var(--vscode-button-foreground);
}
body.vscode-dark #logo-text[data-v-7be6f060] {
    fill: white;
}
body.vscode-light #logo-text[data-v-7be6f060] {
    fill: #232f3e; /* squid ink */
}
.bottomMargin[data-v-7be6f060] {
    margin-bottom: 12px;
}
.topMargin[data-v-7be6f060] {
    margin-top: 12px;
}
.help-link[data-v-7be6f060],
.help-link__icon[data-v-7be6f060] {
    align-items: center;
    display: flex;
}
.help-link[data-v-7be6f060],
.help-link__label[data-v-7be6f060] {
    font-size: 10px;
    font-weight: 400;
    margin: 4px 0 0;
    text-decoration: none;
}
.help-link__icon[data-v-7be6f060] {
    border-radius: 50%;
    border: 1px solid var(--vscode-textLink-foreground);
    font-size: 8px;
    height: 10px;
    justify-content: center;
    width: 10px;
}
.help-link__label[data-v-7be6f060] {
    margin: 0;
    padding: 0 0 0 2px;
}
`,""]);const k=v},6179:(e,r,n)=>{"use strict";n.r(r),n.d(r,{default:()=>k});var i=n(6758),s=n.n(i),l=n(935),C=n.n(l),b=n(6122),v=C()(s());v.i(b.A),v.push([e.id,`
#reauthenticate-container {
    height: auto;
    margin: auto;
    position: absolute;
    top: var(--auth-container-top);
    width: 100%;
}

/* Immediate children */
#reauthenticate-container > * {
    margin-bottom: 2rem;
}
#content-container {
    display: flex;
    flex-direction: column;
    /* All items are centered vertically */
    justify-content: space-between;
    /** The overall height of the container, then spacing is automatic between child elements */
    height: 7rem;
    text-align: center;
}
#content-container > * {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}
#icon-container {
    display: flex;
    flex-direction: column;
    /* justify-content: center; */
    align-items: center;
}
#text-container {
    display: flex;
    flex-direction: column;
}
#button-container {
    display: flex;
    flex-direction: column;
}
button#reauthenticate-button {
    cursor: pointer;
    background-color: var(--vscode-button-background);
    color: white;
    border-radius: 3px;
    border: none;
    padding: 0.3rem;
    width: 80%;
    user-select: none;
    max-width: 260px;
}
button#signout {
    cursor: pointer;
    color: var(--vscode-textLink-foreground);
    border: none;
    background: none;
    user-select: none;
}
button#cancel {
    background-color: var(--vscode-button-background);
    color: white;
    border-radius: 3px;
    border: none;
    padding: 0.3rem;
    width: 80%;
    font-weight: bold;
    margin-top: 15px;
    cursor: pointer;
}
body.vscode-high-contrast:not(body.vscode-high-contrast-light) button#reauthenticate-button {
    background-color: white;
    color: black;
}
#title {
    font-weight: bold;
}
#call-to-action {
    font-weight: normal;
}
#error-message {
    text-align: center;
}
`,""]);const k=v},4037:(e,r,n)=>{"use strict";n.r(r),n.d(r,{default:()=>k});var i=n(6758),s=n.n(i),l=n(935),C=n.n(l),b=n(6122),v=C()(s());v.i(b.A),v.push([e.id,`
/* TODO: clean up these CSS entries */
#profile-selector-container[data-v-9f4375b8] {
    height: auto;
    margin: auto;
    position: absolute;
    top: var(--auth-container-top);
    max-width: 260px;
    width: 90vw;
}
.selectable-item[data-v-9f4375b8] {
    margin-bottom: 5px;
    /* margin-top: 10px; */
    cursor: pointer;
    width: 100%;
}
.header[data-v-9f4375b8] {
    font-size: var(--font-size-base);
    font-weight: bold;
}
.vscode-dark .header[data-v-9f4375b8] {
    color: white;
}
.vscode-light .header[data-v-9f4375b8] {
    color: black;
}
.title[data-v-9f4375b8] {
    margin-bottom: 3px;
    margin-top: 3px;
    font-size: var(--font-size-base);
    font-weight: 500;
}
.vscode-dark .title[data-v-9f4375b8] {
    color: white;
}
.vscode-light .title[data-v-9f4375b8] {
    color: black;
}
.subHeader[data-v-9f4375b8] {
    font-size: var(--font-size-sm);
}
.continue-button[data-v-9f4375b8] {
    background-color: var(--vscode-button-background);
    color: white;
    width: 100%;
    height: 30px;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    margin-bottom: 3px;
    margin-top: 3px;
    cursor: pointer;
    font-size: var(--font-size-base);
}
.continue-button[data-v-9f4375b8]:disabled {
    background-color: var(--vscode-input-background);
    color: #6f6f6f;
    cursor: not-allowed;
}
body.vscode-high-contrast:not(body.vscode-high-contrast-light) .continue-button[data-v-9f4375b8] {
    background-color: white;
    color: var(--vscode-input-background);
}
body.vscode-high-contrast:not(body.vscode-high-contrast-light) .continue-button[data-v-9f4375b8]:disabled {
    background-color: #6f6f6f;
    color: var(--vscode-input-background);
}
body.vscode-high-contrast-light .continue-button[data-v-9f4375b8] {
    background-color: var(--vscode-button-background);
    color: white;
}
.bottomMargin[data-v-9f4375b8] {
    margin-bottom: 12px;
}
.topMargin[data-v-9f4375b8] {
    margin-top: 6px;
}
#icon-container[data-v-9f4375b8] {
    display: flex;
    flex-direction: column;
    /* justify-content: center; */
    align-items: center;
}
#error-message[data-v-9f4375b8] {
    text-align: center;
    font-size: var(--font-size-base);
}
button#signout[data-v-9f4375b8] {
    cursor: pointer;
    color: var(--vscode-textLink-foreground);
    border: none;
    background: none;
    user-select: none;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}
`,""]);const k=v},8432:(e,r,n)=>{"use strict";n.r(r),n.d(r,{default:()=>v});var i=n(6758),s=n.n(i),l=n(935),C=n.n(l),b=C()(s());b.push([e.id,`
body {
    /**
     * Overriding the margin and padding defined by vscode
     * https://github.com/microsoft/vscode/blame/54e0cddffb51553e76fb8d65474ba855c30621e8/src/vs/workbench/contrib/webview/browser/pre/index.html
     */
    padding: 0;
}
.body {
    /* The container takes up the entire height of the screen */
    height: 100vh;
    display: flex;
    flex-direction: column;
    /* All items are centered horizontally */
    align-items: center;
}
`,""]);const v=b},2247:(e,r,n)=>{"use strict";n.r(r),n.d(r,{default:()=>v});var i=n(6758),s=n.n(i),l=n(935),C=n.n(l),b=C()(s());b.push([e.id,`
.item-container-base[data-v-2c8c801d] {
    display: flex;
    border-width: 1px;
    border-style: solid;
    border-color: #625f5f;
    user-select: none;
    /* Some items do not have itemText, so we need a consistent height for all items */
    height: 50px;
    position: relative;
}
.item-container-base.focussed[data-v-2c8c801d]::before {
    content: attr(title);
    cursor: default;
    display: block;
    font-size: var(--font-size-sm);
    height: auto;
    max-width: 130px;
    padding: 5px;
    position: absolute;
    right: 0;
    transform: translate(0, -100%);
    word-break: break-all;
}
.vscode-dark .item-container-base.focussed[data-v-2c8c801d]:before,
body.vscode-high-contrast:not(body.vscode-high-contrast-light) .item-container-base.focussed[data-v-2c8c801d]:before {
    background-color: white;
    color: rgba(0, 0, 0, 0.8);
}
.vscode-light .item-container-base.focussed[data-v-2c8c801d]:before,
body.vscode-high-contrast-light .item-container-base.focussed[data-v-2c8c801d]:before {
    background-color: rgba(255, 255, 255, 0.8);
    color: black;
}
.hovering[data-v-2c8c801d] {
    border-color: #0e639c;
}
.selected[data-v-2c8c801d] {
    border-color: #3675f4;
}
.title[data-v-2c8c801d] {
    font-size: var(--font-size-base);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0.2rem;
}
.p[data-v-2c8c801d] {
    font-weight: var(--font-size-base);
    margin-top: 0.2rem;
    text-align: justify;
}
.text[data-v-2c8c801d] {
    display: flex;
    flex-direction: column;
    font-size: var(--font-size-sm);
    justify-content: center;
    overflow: hidden;
}
.vscode-dark .text[data-v-2c8c801d] {
    color: white;
}
.vscode-light .text[data-v-2c8c801d] {
    color: black;
}
.icon[data-v-2c8c801d] {
    padding-left: 8px;
    padding-right: 11px;
    display: flex;
    align-items: center;
}
.vscode-dark .icon .svg-path[data-v-2c8c801d],
body.vscode-high-contrast:not(body.vscode-high-contrast-light) .icon .svg-path[data-v-2c8c801d] {
    fill: white;
}
.vscode-light .icon .svg-path[data-v-2c8c801d],
body.vscode-high-contrast-light .icon .svg-path[data-v-2c8c801d] {
    fill: black;
}
.item-container-base .text .p[data-v-2c8c801d] {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
`,""]);const v=b},6122:(e,r,n)=>{"use strict";n.d(r,{A:()=>v});var i=n(6758),s=n.n(i),l=n(935),C=n.n(l),b=C()(s());b.push([e.id,`:root {
    /* Font-sizes */
    --font-size-sm: calc(0.75 * var(--font-size-base));
    --font-size-base: var(--vscode-font-size);
    --font-size-md: calc(1.25 * var(--font-size-base));
    --font-size-lg: calc(1.5 * var(--font-size-base));
    --font-size-xl: calc(1.75 * var(--font-size-base));

    /* Alignment */
    --auth-container-top: 15%;
}
`,""]);const v=b},935:e=>{"use strict";e.exports=function(r){var n=[];return n.toString=function(){return this.map(function(s){var l="",C=typeof s[5]<"u";return s[4]&&(l+="@supports (".concat(s[4],") {")),s[2]&&(l+="@media ".concat(s[2]," {")),C&&(l+="@layer".concat(s[5].length>0?" ".concat(s[5]):""," {")),l+=r(s),C&&(l+="}"),s[2]&&(l+="}"),s[4]&&(l+="}"),l}).join("")},n.i=function(s,l,C,b,v){typeof s=="string"&&(s=[[null,s,void 0]]);var k={};if(C)for(var B=0;B<this.length;B++){var D=this[B][0];D!=null&&(k[D]=!0)}for(var A=0;A<s.length;A++){var m=[].concat(s[A]);C&&k[m[0]]||(typeof v<"u"&&(typeof m[5]>"u"||(m[1]="@layer".concat(m[5].length>0?" ".concat(m[5]):""," {").concat(m[1],"}")),m[5]=v),l&&(m[2]&&(m[1]="@media ".concat(m[2]," {").concat(m[1],"}")),m[2]=l),b&&(m[4]?(m[1]="@supports (".concat(m[4],") {").concat(m[1],"}"),m[4]=b):m[4]="".concat(b)),n.push(m))}},n}},6758:e=>{"use strict";e.exports=function(r){return r[1]}},7433:(e,r)=>{"use strict";var n;n={value:!0},r.A=(i,s)=>{const l=i.__vccOpts||i;for(const[C,b]of s)l[C]=b;return l}},7988:(e,r,n)=>{var i=n(848);i.__esModule&&(i=i.default),typeof i=="string"&&(i=[[e.id,i,""]]),i.locals&&(e.exports=i.locals);var s=n(611).A,l=s("3ed2ad88",i,!1,{})},127:(e,r,n)=>{var i=n(6179);i.__esModule&&(i=i.default),typeof i=="string"&&(i=[[e.id,i,""]]),i.locals&&(e.exports=i.locals);var s=n(611).A,l=s("197e8df4",i,!1,{})},7897:(e,r,n)=>{var i=n(4037);i.__esModule&&(i=i.default),typeof i=="string"&&(i=[[e.id,i,""]]),i.locals&&(e.exports=i.locals);var s=n(611).A,l=s("a347e2dc",i,!1,{})},4732:(e,r,n)=>{var i=n(8432);i.__esModule&&(i=i.default),typeof i=="string"&&(i=[[e.id,i,""]]),i.locals&&(e.exports=i.locals);var s=n(611).A,l=s("5b0ffe0a",i,!1,{})},2619:(e,r,n)=>{var i=n(2247);i.__esModule&&(i=i.default),typeof i=="string"&&(i=[[e.id,i,""]]),i.locals&&(e.exports=i.locals);var s=n(611).A,l=s("865d45b2",i,!1,{})},611:(e,r,n)=>{"use strict";n.d(r,{A:()=>ae});function i(d,g){for(var _=[],p={},c=0;c<g.length;c++){var L=g[c],y=L[0],V=L[1],O=L[2],U=L[3],N={id:d+":"+c,css:V,media:O,sourceMap:U};p[y]?p[y].parts.push(N):_.push(p[y]={id:y,parts:[N]})}return _}var s=typeof document<"u";if(typeof DEBUG<"u"&&DEBUG&&!s)throw new Error("vue-style-loader cannot be used in a non-browser environment. Use { target: 'node' } in your Webpack config to indicate a server-rendering environment.");var l={},C=s&&(document.head||document.getElementsByTagName("head")[0]),b=null,v=0,k=!1,B=function(){},D=null,A="data-vue-ssr-id",m=typeof navigator<"u"&&/msie [6-9]\b/.test(navigator.userAgent.toLowerCase());function ae(d,g,_,p){k=_,D=p||{};var c=i(d,g);return H(c),function(y){for(var V=[],O=0;O<c.length;O++){var U=c[O],N=l[U.id];N.refs--,V.push(N)}y?(c=i(d,y),H(c)):c=[];for(var O=0;O<V.length;O++){var N=V[O];if(N.refs===0){for(var F=0;F<N.parts.length;F++)N.parts[F]();delete l[N.id]}}}}function H(d){for(var g=0;g<d.length;g++){var _=d[g],p=l[_.id];if(p){p.refs++;for(var c=0;c<p.parts.length;c++)p.parts[c](_.parts[c]);for(;c<_.parts.length;c++)p.parts.push(W(_.parts[c]));p.parts.length>_.parts.length&&(p.parts.length=_.parts.length)}else{for(var L=[],c=0;c<_.parts.length;c++)L.push(W(_.parts[c]));l[_.id]={id:_.id,refs:1,parts:L}}}}function $(){var d=document.createElement("style");return d.type="text/css",C.appendChild(d),d}function W(d){var g,_,p=document.querySelector("style["+A+'~="'+d.id+'"]');if(p){if(k)return B;p.parentNode.removeChild(p)}if(m){var c=v++;p=b||(b=$()),g=Z.bind(null,p,c,!1),_=Z.bind(null,p,c,!0)}else p=$(),g=Y.bind(null,p),_=function(){p.parentNode.removeChild(p)};return g(d),function(y){if(y){if(y.css===d.css&&y.media===d.media&&y.sourceMap===d.sourceMap)return;g(d=y)}else _()}}var J=function(){var d=[];return function(g,_){return d[g]=_,d.filter(Boolean).join(`
`)}}();function Z(d,g,_,p){var c=_?"":p.css;if(d.styleSheet)d.styleSheet.cssText=J(g,c);else{var L=document.createTextNode(c),y=d.childNodes;y[g]&&d.removeChild(y[g]),y.length?d.insertBefore(L,y[g]):d.appendChild(L)}}function Y(d,g){var _=g.css,p=g.media,c=g.sourceMap;if(p&&d.setAttribute("media",p),D.ssrId&&d.setAttribute(A,g.id),c&&(_+=`
/*# sourceURL=`+c.sources[0]+" */",_+=`
/*# sourceMappingURL=data:application/json;base64,`+btoa(unescape(encodeURIComponent(JSON.stringify(c))))+" */"),d.styleSheet)d.styleSheet.cssText=_;else{for(;d.firstChild;)d.removeChild(d.firstChild);d.appendChild(document.createTextNode(_))}}}},oe={};function I(e){var r=oe[e];if(r!==void 0)return r.exports;var n=oe[e]={id:e,exports:{}};return ce[e](n,n.exports,I),n.exports}I.n=e=>{var r=e&&e.__esModule?()=>e.default:()=>e;return I.d(r,{a:r}),r},I.d=(e,r)=>{for(var n in r)I.o(r,n)&&!I.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:r[n]})},I.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),I.r=e=>{typeof Symbol<"u"&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var X={};(()=>{"use strict";const e=Vue,r=["data-app"];function n(t,o,h,S,w,M){const f=(0,e.resolveComponent)("Login"),a=(0,e.resolveComponent)("Reauthenticate"),T=(0,e.resolveComponent)("RegionProfileSelector");return(0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,null,[(0,e.createCommentVNode)(" Body "),(0,e.createElementVNode)("div",{class:"body",style:{height:"100vh"},"data-app":t.app},[(0,e.createCommentVNode)(" Functionality "),t.authFlowState==="LOGIN"?((0,e.openBlock)(),(0,e.createBlock)(f,{key:0,app:t.app},null,8,["app"])):t.authFlowState==="REAUTHNEEDED"||t.authFlowState==="REAUTHENTICATING"?((0,e.openBlock)(),(0,e.createBlock)(a,{app:t.app,state:t.authFlowState,key:t.refreshKey},null,8,["app","state"])):(0,e.createCommentVNode)("v-if",!0),t.authFlowState==="PENDING_PROFILE_SELECTION"?((0,e.openBlock)(),(0,e.createBlock)(T,{key:2,app:t.app,state:t.authFlowState},null,8,["app","state"])):(0,e.createCommentVNode)("v-if",!0)],8,r)],2112)}const i=t=>((0,e.pushScopeId)("data-v-7be6f060"),t=t(),(0,e.popScopeId)(),t),s=["data-app"],l={class:"logoIcon bottomMargin"},C={key:0,width:"71",height:"71",viewBox:"0 0 71 71",fill:"none",xmlns:"http://www.w3.org/2000/svg"},v=[(0,e.createStaticVNode)('<g clip-path="url(#clip0_331_37336)" data-v-7be6f060><path d="M30.1307 1.46438L8.83068 13.7563C5.45818 15.7087 3.37256 19.3031 3.37256 23.2081V47.8067C3.37256 51.6969 5.45818 55.306 8.83068 57.2585L30.1307 69.5504C33.5032 71.5029 37.6596 71.5029 41.0321 69.5504L62.3321 57.2585C65.7046 55.306 67.7903 51.7117 67.7903 47.8067V23.2081C67.7903 19.3179 65.7046 15.7087 62.3321 13.7563L41.0321 1.46438C37.6596 -0.488125 33.5032 -0.488125 30.1307 1.46438Z" fill="url(#paint0_linear_331_37336)" data-v-7be6f060></path><path d="M54.1966 21.6843L38.2364 12.469C37.5116 12.0401 36.5354 11.833 35.5739 11.833C34.6124 11.833 33.651 12.0401 32.9114 12.469L16.9512 21.6843C15.4868 22.5274 14.2887 24.5982 14.2887 26.2845V44.7149C14.2887 46.4011 15.4868 48.472 16.9512 49.3151L32.9114 58.5303C33.6362 58.9593 34.6124 59.1663 35.5739 59.1663C36.5354 59.1663 37.4968 58.9593 38.2364 58.5303L54.1966 49.3151C55.661 48.472 56.8591 46.4011 56.8591 44.7149V26.2845C56.8591 24.5982 55.661 22.5274 54.1966 21.6843ZM36.0029 54.7141C36.0029 54.7141 35.7958 54.7584 35.5887 54.7584C35.3816 54.7584 35.2337 54.7288 35.1745 54.7141L19.1699 45.4693C19.0072 45.3213 18.8002 44.9515 18.7558 44.7445V26.2549C18.8002 26.0478 19.022 25.678 19.1699 25.5301L35.1745 16.2853C35.1745 16.2853 35.3816 16.2409 35.5887 16.2409C35.7958 16.2409 35.9437 16.2705 36.0029 16.2853L52.0075 25.5301C52.1702 25.678 52.3772 26.0478 52.4216 26.2549V42.6588L40.0262 35.4997V33.5472C40.0262 33.1626 39.8191 32.8224 39.4937 32.6301L36.1212 30.6776C35.9585 30.5888 35.7662 30.5297 35.5887 30.5297C35.4112 30.5297 35.2189 30.574 35.0562 30.6776L31.6837 32.6301C31.3583 32.8224 31.1512 33.1774 31.1512 33.5472V37.4374C31.1512 37.822 31.3583 38.1622 31.6837 38.3545L35.0562 40.307C35.2189 40.3957 35.4112 40.4549 35.5887 40.4549C35.7662 40.4549 35.9585 40.4105 36.1212 40.307L37.8074 39.3307L50.2029 46.4899L36.0029 54.6845V54.7141Z" fill="white" data-v-7be6f060></path></g><defs data-v-7be6f060><linearGradient id="paint0_linear_331_37336" x1="64.1515" y1="-5.31021" x2="10.5465" y2="71.2515" gradientUnits="userSpaceOnUse" data-v-7be6f060><stop stop-color="#A7F8FF" data-v-7be6f060></stop><stop offset="0.03" stop-color="#9DF1FF" data-v-7be6f060></stop><stop offset="0.08" stop-color="#84E1FF" data-v-7be6f060></stop><stop offset="0.15" stop-color="#5AC7FF" data-v-7be6f060></stop><stop offset="0.22" stop-color="#21A2FF" data-v-7be6f060></stop><stop offset="0.26" stop-color="#008DFF" data-v-7be6f060></stop><stop offset="0.66" stop-color="#7F33FF" data-v-7be6f060></stop><stop offset="0.99" stop-color="#39127D" data-v-7be6f060></stop></linearGradient><clipPath id="clip0_331_37336" data-v-7be6f060><rect width="71" height="71" fill="white" data-v-7be6f060></rect></clipPath></defs>',2)],k={key:1,width:"100",height:"80",viewBox:"0 0 54 40",fill:"none",id:"Layer_1","data-name":"Layer 1",xmlns:"http://www.w3.org/2000/svg"},m=[i(()=>(0,e.createElementVNode)("path",{id:"logo-text",d:"M14.09,10.85a4.7,4.7,0,0,0,.19,1.48,7.73,7.73,0,0,0,.54,1.19.77.77,0,0,1,.12.38.64.64,0,0,1-.32.49l-1,.7a.83.83,0,0,1-.44.15.69.69,0,0,1-.49-.23,3.8,3.8,0,0,1-.6-.77q-.25-.42-.51-1a6.14,6.14,0,0,1-4.89,2.3,4.54,4.54,0,0,1-3.32-1.19,4.27,4.27,0,0,1-1.22-3.2A4.28,4.28,0,0,1,3.61,7.75,6.06,6.06,0,0,1,7.69,6.46a12.47,12.47,0,0,1,1.76.13q.92.13,1.91.36V5.73a3.65,3.65,0,0,0-.79-2.66A3.81,3.81,0,0,0,7.86,2.3a7.71,7.71,0,0,0-1.79.22,12.78,12.78,0,0,0-1.79.57,4.55,4.55,0,0,1-.58.22l-.26,0q-.35,0-.35-.52V2a1.09,1.09,0,0,1,.12-.58,1.2,1.2,0,0,1,.47-.35A10.88,10.88,0,0,1,5.77.32,10.19,10.19,0,0,1,8.36,0a6,6,0,0,1,4.35,1.35,5.49,5.49,0,0,1,1.38,4.09ZM7.34,13.38a5.36,5.36,0,0,0,1.72-.31A3.63,3.63,0,0,0,10.63,12,2.62,2.62,0,0,0,11.19,11a5.63,5.63,0,0,0,.16-1.44v-.7a14.35,14.35,0,0,0-1.53-.28,12.37,12.37,0,0,0-1.56-.1,3.84,3.84,0,0,0-2.47.67A2.34,2.34,0,0,0,5,11a2.35,2.35,0,0,0,.61,1.76A2.4,2.4,0,0,0,7.34,13.38Zm13.35,1.8a1,1,0,0,1-.64-.16,1.3,1.3,0,0,1-.35-.65L15.81,1.51a3,3,0,0,1-.15-.67.36.36,0,0,1,.41-.41H17.7a1,1,0,0,1,.65.16,1.4,1.4,0,0,1,.33.65l2.79,11,2.59-11A1.17,1.17,0,0,1,24.39.6a1.1,1.1,0,0,1,.67-.16H26.4a1.1,1.1,0,0,1,.67.16,1.17,1.17,0,0,1,.32.65L30,12.39,32.88,1.25A1.39,1.39,0,0,1,33.22.6a1,1,0,0,1,.65-.16h1.54a.36.36,0,0,1,.41.41,1.36,1.36,0,0,1,0,.26,3.64,3.64,0,0,1-.12.41l-4,12.86a1.3,1.3,0,0,1-.35.65,1,1,0,0,1-.64.16H29.25a1,1,0,0,1-.67-.17,1.26,1.26,0,0,1-.32-.67L25.67,3.64,23.11,14.34a1.26,1.26,0,0,1-.32.67,1,1,0,0,1-.67.17Zm21.36.44a11.28,11.28,0,0,1-2.56-.29,7.44,7.44,0,0,1-1.92-.67,1,1,0,0,1-.61-.93v-.84q0-.52.38-.52a.9.9,0,0,1,.31.06l.42.17a8.77,8.77,0,0,0,1.83.58,9.78,9.78,0,0,0,2,.2,4.48,4.48,0,0,0,2.43-.55,1.76,1.76,0,0,0,.86-1.57,1.61,1.61,0,0,0-.45-1.16A4.29,4.29,0,0,0,43,9.22l-2.41-.76A5.15,5.15,0,0,1,38,6.78a3.94,3.94,0,0,1-.83-2.41,3.7,3.7,0,0,1,.45-1.85,4.47,4.47,0,0,1,1.19-1.37A5.27,5.27,0,0,1,40.51.29,7.4,7.4,0,0,1,42.6,0a8.87,8.87,0,0,1,1.12.07q.57.07,1.08.19t.95.26a4.27,4.27,0,0,1,.7.29,1.59,1.59,0,0,1,.49.41.94.94,0,0,1,.15.55v.79q0,.52-.38.52a1.76,1.76,0,0,1-.64-.2,7.74,7.74,0,0,0-3.2-.64,4.37,4.37,0,0,0-2.21.47,1.6,1.6,0,0,0-.79,1.48,1.58,1.58,0,0,0,.49,1.18,4.94,4.94,0,0,0,1.83.92L44.55,7a5.08,5.08,0,0,1,2.57,1.6A3.76,3.76,0,0,1,47.9,11a4.21,4.21,0,0,1-.44,1.93,4.4,4.4,0,0,1-1.21,1.47,5.43,5.43,0,0,1-1.85.93A8.25,8.25,0,0,1,42.05,15.62Z"},null,-1)),i(()=>(0,e.createElementVNode)("path",{fill:"#FF9900",class:"cls-1",d:"M45.19,23.81C39.72,27.85,31.78,30,25,30A36.64,36.64,0,0,1,.22,20.57c-.51-.46-.06-1.09.56-.74A49.78,49.78,0,0,0,25.53,26.4,49.23,49.23,0,0,0,44.4,22.53C45.32,22.14,46.1,23.14,45.19,23.81Z"},null,-1)),i(()=>(0,e.createElementVNode)("path",{fill:"#FF9900",class:"cls-1",d:"M47.47,21.21c-.7-.9-4.63-.42-6.39-.21-.53.06-.62-.4-.14-.74,3.13-2.2,8.27-1.57,8.86-.83s-.16,5.89-3.09,8.35c-.45.38-.88.18-.68-.32C46.69,25.8,48.17,22.11,47.47,21.21Z"},null,-1))],H=[i(()=>(0,e.createElementVNode)("svg",{width:"13",height:"11",viewBox:"0 0 13 11",fill:"none",xmlns:"http://www.w3.org/2000/svg"},[(0,e.createElementVNode)("path",{d:"M4.98667 0.0933332L5.73333 0.786666L1.57333 4.94667H12.0267V5.96H1.57333L5.73333 10.0667L4.98667 10.8133L0.0266666 5.8V5.10667L4.98667 0.0933332Z",fill:"#21A2FF"})],-1))],$={class:"auth-container-section"},W={key:0,class:"imported-logins"},J=i(()=>(0,e.createElementVNode)("div",{class:"header bottomMargin"},"Connect with an existing account:",-1)),Z=i(()=>(0,e.createElementVNode)("div",{class:"header"},"Or, choose a sign-in option:",-1)),Y={key:1,class:"header bottomMargin"},d=["disabled"],_=[i(()=>(0,e.createElementVNode)("svg",{width:"13",height:"11",viewBox:"0 0 13 11",fill:"none",xmlns:"http://www.w3.org/2000/svg"},[(0,e.createElementVNode)("path",{d:"M4.98667 0.0933332L5.73333 0.786666L1.57333 4.94667H12.0267V5.96H1.57333L5.73333 10.0667L4.98667 10.8133L0.0266666 5.8V5.10667L4.98667 0.0933332Z",fill:"#21A2FF"})],-1))],p={class:"auth-container-section"},c={class:"header bottomMargin"},L=i(()=>(0,e.createElementVNode)("br",null,null,-1)),O=[i(()=>(0,e.createElementVNode)("span",{class:"help-link__icon"},"?",-1)),i(()=>(0,e.createElementVNode)("span",{class:"help-link__label"},"Need help signing in?",-1))],U={key:0,class:"code-catalyst-login"},N=i(()=>(0,e.createElementVNode)("div",{style:{"margin-bottom":"4px"}},null,-1)),F={class:"subHeader"},ue=i(()=>(0,e.createElementVNode)("div",{class:"title topMargin"},"Start URL",-1)),pe=i(()=>(0,e.createElementVNode)("div",{class:"hint"},"Provided by your admin or help desk",-1)),_e={class:"start-url-error"},he={class:"start-url-warning"},fe=i(()=>(0,e.createElementVNode)("div",{class:"title topMargin"},"Region",-1)),ge=i(()=>(0,e.createElementVNode)("div",{class:"hint"},"AWS Region that hosts identity directory",-1)),ve=["value"],me=["disabled"],be={key:2,class:"auth-container-section"},Ce={key:0,class:"header bottomMargin"},Ee={key:1,class:"header bottomMargin"},ye=[i(()=>(0,e.createElementVNode)("svg",{width:"13",height:"11",viewBox:"0 0 13 11",fill:"none",xmlns:"http://www.w3.org/2000/svg"},[(0,e.createElementVNode)("path",{d:"M4.98667 0.0933332L5.73333 0.786666L1.57333 4.94667H12.0267V5.96H1.57333L5.73333 10.0667L4.98667 10.8133L0.0266666 5.8V5.10667L4.98667 0.0933332Z",fill:"#21A2FF"})],-1))],Se=(0,e.createStaticVNode)('<div class="header" data-v-7be6f060>IAM Credentials:</div><div class="hint" data-v-7be6f060>Credentials will be added to the appropriate ~/.aws/ files</div><a class="hint" href="https://docs.aws.amazon.com/sdkref/latest/guide/access-iam-users.html#step1authIamUser" data-v-7be6f060>Learn More</a><div class="title topMargin" data-v-7be6f060>Profile Name</div><div class="hint" data-v-7be6f060>The identifier for these credentials</div>',5),we=i(()=>(0,e.createElementVNode)("div",{class:"title"},"Access Key",-1)),Ie=i(()=>(0,e.createElementVNode)("div",{class:"title"},"Secret Key",-1)),Le=["disabled"];function ke(t,o,h,S,w,M){const f=(0,e.resolveComponent)("SelectableItem");return t.stage!=="CONNECTED"?((0,e.openBlock)(),(0,e.createElementBlock)("div",{key:0,class:(0,e.normalizeClass)([[t.disabled?"disabled-form":""],"auth-container"]),"data-app":t.app,onClick:o[20]||(o[20]=(...a)=>t.handleDocumentClick&&t.handleDocumentClick(...a))},[(0,e.createElementVNode)("div",l,[(0,e.createCommentVNode)(" Icon "),t.app==="AMAZONQ"?((0,e.openBlock)(),(0,e.createElementBlock)("svg",C,v)):(0,e.createCommentVNode)("v-if",!0),t.app==="TOOLKIT"?((0,e.openBlock)(),(0,e.createElementBlock)("svg",k,m)):(0,e.createCommentVNode)("v-if",!0)]),t.stage==="START"?((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:0},[t.app==="TOOLKIT"?((0,e.openBlock)(),(0,e.createElementBlock)("button",{key:0,class:"back-button bottomMargin",onClick:o[0]||(o[0]=(...a)=>t.handleBackButtonClick&&t.handleBackButtonClick(...a))},H)):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("div",$,[t.importedLogins.length>0?((0,e.openBlock)(),(0,e.createElementBlock)("div",W,[J,((0,e.openBlock)(!0),(0,e.createElementBlock)(e.Fragment,null,(0,e.renderList)(t.importedLogins,(a,T)=>((0,e.openBlock)(),(0,e.createElementBlock)("div",{key:T},[(0,e.createVNode)(f,{onToggle:t.toggleItemSelection,isSelected:t.selectedLoginOption===t.LoginOption.IMPORTED_LOGINS+T,itemId:t.LoginOption.IMPORTED_LOGINS+T,itemText:a.text,itemTitle:a.title,itemType:a.type,class:"selectable-item bottomMargin"},null,8,["onToggle","isSelected","itemId","itemText","itemTitle","itemType"])]))),128)),Z])):(0,e.createCommentVNode)("v-if",!0),t.importedLogins.length==0?((0,e.openBlock)(),(0,e.createElementBlock)("div",Y,"Choose a sign-in option:")):(0,e.createCommentVNode)("v-if",!0),t.app==="AMAZONQ"?((0,e.openBlock)(),(0,e.createBlock)(f,{key:2,onToggle:t.toggleItemSelection,isSelected:t.selectedLoginOption===t.LoginOption.BUILDER_ID,itemId:t.LoginOption.BUILDER_ID,itemText:"Free to start with a Builder ID.",itemTitle:"Personal account",itemType:t.LoginOption.BUILDER_ID,class:"selectable-item bottomMargin"},null,8,["onToggle","isSelected","itemId","itemText","itemType"])):(0,e.createCommentVNode)("v-if",!0),t.app==="AMAZONQ"?((0,e.openBlock)(),(0,e.createBlock)(f,{key:3,onToggle:t.toggleItemSelection,isSelected:t.selectedLoginOption===t.LoginOption.ENTERPRISE_SSO,itemId:t.LoginOption.ENTERPRISE_SSO,itemText:"Best for individual teams or organizations.",itemTitle:"Company account",itemType:t.LoginOption.ENTERPRISE_SSO,class:"selectable-item bottomMargin"},null,8,["onToggle","isSelected","itemId","itemText","itemType"])):(0,e.createCommentVNode)("v-if",!0),t.app==="TOOLKIT"?((0,e.openBlock)(),(0,e.createBlock)(f,{key:4,onToggle:t.toggleItemSelection,isSelected:t.selectedLoginOption===t.LoginOption.ENTERPRISE_SSO,itemId:t.LoginOption.ENTERPRISE_SSO,itemText:"Sign in to AWS with single sign-on",itemTitle:"Workforce",itemType:t.LoginOption.ENTERPRISE_SSO,class:"selectable-item bottomMargin"},null,8,["onToggle","isSelected","itemId","itemType"])):(0,e.createCommentVNode)("v-if",!0),t.app==="TOOLKIT"?((0,e.openBlock)(),(0,e.createBlock)(f,{key:5,onToggle:t.toggleItemSelection,isSelected:t.selectedLoginOption===t.LoginOption.IAM_CREDENTIAL,itemId:t.LoginOption.IAM_CREDENTIAL,itemText:"Store keys for use with AWS CLI tools",itemTitle:"IAM Credentials",itemType:t.LoginOption.IAM_CREDENTIAL,class:"selectable-item bottomMargin"},null,8,["onToggle","isSelected","itemId","itemType"])):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("button",{class:"continue-button",id:"connection-selection-continue-button",disabled:t.selectedLoginOption===0,onClick:o[1]||(o[1]=a=>t.handleContinueClick())}," Continue ",8,d)])],64)):(0,e.createCommentVNode)("v-if",!0),t.stage==="SSO_FORM"?((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:1},[(0,e.createElementVNode)("button",{class:"back-button bottomMargin",onClick:o[2]||(o[2]=(...a)=>t.handleBackButtonClick&&t.handleBackButtonClick(...a))},_),(0,e.createElementVNode)("div",p,[(0,e.createElementVNode)("div",c,[(0,e.createTextVNode)(" Sign in with AWS IAM Identity Center:"),L,t.app==="AMAZONQ"?((0,e.openBlock)(),(0,e.createElementBlock)("a",{key:0,class:"help-link",href:"https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-in-IDE-setup.html#q-in-IDE-setup-pro-auth",onClick:o[3]||(o[3]=(...a)=>t.handleHelpLinkClick&&t.handleHelpLinkClick(...a))},O)):(0,e.createCommentVNode)("v-if",!0)]),t.app==="TOOLKIT"?((0,e.openBlock)(),(0,e.createElementBlock)("div",U,[N,(0,e.createElementVNode)("div",F,[(0,e.createTextVNode)(" Using CodeCatalyst with AWS Builder ID? "),(0,e.createElementVNode)("a",{href:"#",onClick:o[4]||(o[4]=a=>t.handleCodeCatalystSignin())},"Skip to sign-in")])])):(0,e.createCommentVNode)("v-if",!0),ue,pe,(0,e.withDirectives)((0,e.createElementVNode)("input",{class:"urlInput",type:"text",id:"startUrl",name:"startUrl",onInput:o[5]||(o[5]=(...a)=>t.handleUrlInput&&t.handleUrlInput(...a)),"onUpdate:modelValue":o[6]||(o[6]=a=>t.startUrl=a),onKeydown:o[7]||(o[7]=(0,e.withKeys)(a=>t.handleContinueClick(),["enter"]))},null,544),[[e.vModelText,t.startUrl]]),(0,e.createElementVNode)("h4",_e,(0,e.toDisplayString)(t.startUrlError),1),(0,e.createElementVNode)("h4",he,(0,e.toDisplayString)(t.startUrlWarning),1),fe,ge,(0,e.withDirectives)((0,e.createElementVNode)("select",{class:"regionSelect",id:"regions",name:"regions","onUpdate:modelValue":o[8]||(o[8]=a=>t.selectedRegion=a),onChange:o[9]||(o[9]=a=>t.handleRegionInput(a))},[((0,e.openBlock)(!0),(0,e.createElementBlock)(e.Fragment,null,(0,e.renderList)(t.regions,a=>((0,e.openBlock)(),(0,e.createElementBlock)("option",{key:a.id,value:a.id},(0,e.toDisplayString)(`${a.name} (${a.id})`),9,ve))),128))],544),[[e.vModelSelect,t.selectedRegion]]),(0,e.createElementVNode)("button",{class:"continue-button topMargin",disabled:t.shouldDisableSsoContinue(),onClick:o[10]||(o[10]=a=>t.handleContinueClick())}," Continue ",8,me)])],64)):(0,e.createCommentVNode)("v-if",!0),t.stage==="AUTHENTICATING"?((0,e.openBlock)(),(0,e.createElementBlock)("div",be,[t.app==="TOOLKIT"&&t.profileName.length>0?((0,e.openBlock)(),(0,e.createElementBlock)("div",Ce," Connecting to IAM... ")):((0,e.openBlock)(),(0,e.createElementBlock)("div",Ee,"Authenticating in browser...")),(0,e.createElementVNode)("button",{class:"continue-button",onClick:o[11]||(o[11]=a=>t.handleCancelButton())},"Cancel")])):(0,e.createCommentVNode)("v-if",!0),t.stage==="AWS_PROFILE"?((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:3},[(0,e.createElementVNode)("button",{class:"back-button bottomMargin",onClick:o[12]||(o[12]=(...a)=>t.handleBackButtonClick&&t.handleBackButtonClick(...a))},ye),Se,(0,e.withDirectives)((0,e.createElementVNode)("input",{class:"iamInput bottomMargin",type:"text",id:"profileName",name:"profileName","onUpdate:modelValue":o[13]||(o[13]=a=>t.profileName=a),onKeydown:o[14]||(o[14]=(0,e.withKeys)(a=>t.handleContinueClick(),["enter"]))},null,544),[[e.vModelText,t.profileName]]),we,(0,e.withDirectives)((0,e.createElementVNode)("input",{class:"iamInput bottomMargin",type:"text",id:"accessKey",name:"accessKey","onUpdate:modelValue":o[15]||(o[15]=a=>t.accessKey=a),onKeydown:o[16]||(o[16]=(0,e.withKeys)(a=>t.handleContinueClick(),["enter"]))},null,544),[[e.vModelText,t.accessKey]]),Ie,(0,e.withDirectives)((0,e.createElementVNode)("input",{class:"iamInput bottomMargin",type:"text",id:"secretKey",name:"secretKey","onUpdate:modelValue":o[17]||(o[17]=a=>t.secretKey=a),onKeydown:o[18]||(o[18]=(0,e.withKeys)(a=>t.handleContinueClick(),["enter"]))},null,544),[[e.vModelText,t.secretKey]]),(0,e.createElementVNode)("button",{class:"continue-button",disabled:t.shouldDisableIamContinue(),onClick:o[19]||(o[19]=a=>t.handleContinueClick())}," Continue ",8,Le)],64)):(0,e.createCommentVNode)("v-if",!0)],10,s)):(0,e.createCommentVNode)("v-if",!0)}const q=t=>((0,e.pushScopeId)("data-v-2c8c801d"),t=t(),(0,e.popScopeId)(),t),Te=["title"],Ne={class:"icon"},Oe={key:0,width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg"},Me=[q(()=>(0,e.createElementVNode)("path",{class:"svg-path","fill-rule":"evenodd","clip-rule":"evenodd",d:"M8 2C6.68228 2 5.61 3.07228 5.61 4.39C5.61 5.70772 6.68228 6.78 8 6.78C9.31771 6.78 10.39 5.70772 10.39 4.39C10.39 3.07228 9.31772 2 8 2ZM3.61 4.39C3.61 1.96772 5.57771 0 8 0C10.4223 0 12.39 1.96771 12.39 4.39C12.39 5.66447 11.8453 6.81311 10.9762 7.61551C11.1666 7.71116 11.3535 7.81608 11.5368 7.93001C13.5215 9.15787 15 11.3598 15 14V15H1V14C1 11.147 2.63919 8.7213 4.99701 7.59061C4.14356 6.78943 3.61 5.65134 3.61 4.39ZM10.482 9.62922C9.71501 9.15233 8.88729 8.90797 8.00229 8.91L8 8.91C5.59623 8.91 3.5507 10.634 3.09474 13H12.8975C12.601 11.5742 11.6867 10.3744 10.484 9.63047L10.482 9.62922Z"},null,-1))],Ae={key:1,width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg"},Re=[q(()=>(0,e.createElementVNode)("path",{class:"svg-path","fill-rule":"evenodd","clip-rule":"evenodd",d:"M4 3C3.44772 3 3 3.44772 3 4C3 4.55229 3.44772 5 4 5C4.55228 5 5 4.55229 5 4C5 3.44772 4.55228 3 4 3ZM1 4C1 2.34315 2.34315 1 4 1C5.65685 1 7 2.34315 7 4C7 5.65676 5.65701 6.99984 4.00029 7C6.21244 7.00016 8 8.78781 8 11C8 8.78772 9.78771 7 12 7C14.2123 7 16 8.78772 16 11V14C16 14.5523 15.5523 15 15 15H9C8.44771 15 8 14.5523 8 14C8 14.5523 7.55228 15 7 15H1C0.447715 15 0 14.5523 0 14V11C0 8.78772 1.78801 7 4.00029 7C2.34344 7 1 5.65685 1 4ZM12 7C10.3431 7 9 5.65685 9 4C9 2.34315 10.3431 1 12 1C13.6569 1 15 2.34315 15 4C15 5.65685 13.6569 7 12 7ZM11 4C11 3.44772 11.4477 3 12 3C12.5523 3 13 3.44772 13 4C13 4.55229 12.5523 5 12 5C11.4477 5 11 4.55229 11 4ZM10 11C10 9.89228 10.8923 9 12 9C13.1077 9 14 9.89228 14 11V13H10V11ZM2 11C2 9.89228 2.89228 9 4 9C5.10772 9 6 9.89228 6 11V13H2V11Z"},null,-1))],Pe={key:2,width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg"},Be=[q(()=>(0,e.createElementVNode)("path",{class:"svg-path","fill-rule":"evenodd","clip-rule":"evenodd",d:"M10.0042 11C10.0042 11.009 10.002 11.0325 9.99974 11.0548L9.99979 11.0502L10 11L10 10.9993L9.99997 11L9.995 11.1L9.99652 11.0855L9.99974 11.0548C9.978 13.1703 8.62586 15.046 6.62064 15.7331C4.59789 16.4261 2.3583 15.7562 1.0483 14.0663C-0.261694 12.3764 -0.352147 10.0406 0.823246 8.25441C1.89701 6.62271 3.81005 5.77972 5.71121 6.05367L12.3412 0.24769C12.5235 0.0880192 12.7576 0 13 0H15C15.5523 0 16 0.447715 16 1V6C16 6.55228 15.5523 7 15 7H14V8C14 8.55229 13.5523 9 13 9H12V10C12 10.5523 11.5523 11 11 11H10.0042ZM13.376 2L6.65881 7.88231C6.41017 8.10005 6.07001 8.18087 5.75 8.09825C4.50783 7.77752 3.19918 8.28216 2.49395 9.35384C1.78871 10.4255 1.84298 11.827 2.62898 12.841C3.41498 13.8549 4.75873 14.2569 5.97239 13.841C7.18604 13.4252 8.00096 12.2837 8 11.0007L8.00502 10.9C8.03175 10.634 8.03175 10.366 8.00502 10.1C7.94583 9.51115 8.40818 9 9 9H10V8C10 7.44772 10.4477 7 11 7H12V6C12 5.44772 12.4477 5 13 5H14V2H13.376ZM6 10H4V12H6V10Z"},null,-1))],De={class:"text"},Ve={class:"title"},Ue=["title"];function Fe(t,o,h,S,w,M){return(0,e.openBlock)(),(0,e.createElementBlock)("div",{class:(0,e.normalizeClass)(["item-container-base",{selected:t.isSelected,hovering:t.isHovering,focussed:t.isFocused}]),tabindex:"0",title:t.itemTitle,onBlur:o[0]||(o[0]=(...f)=>t.hideFocus&&t.hideFocus(...f)),onClick:o[1]||(o[1]=(...f)=>t.toggleSelection&&t.toggleSelection(...f)),onFocus:o[2]||(o[2]=(...f)=>t.showFocus&&t.showFocus(...f)),onKeydown:o[3]||(o[3]=(0,e.withKeys)((...f)=>t.toggleSelection&&t.toggleSelection(...f),["enter"])),onMouseover:o[4]||(o[4]=f=>t.isHovering=!0),onMouseout:o[5]||(o[5]=f=>t.isHovering=!1)},[(0,e.createElementVNode)("div",Ne,[t.itemType===t.LoginOption.BUILDER_ID?((0,e.openBlock)(),(0,e.createElementBlock)("svg",Oe,Me)):(0,e.createCommentVNode)("v-if",!0),t.itemType===t.LoginOption.ENTERPRISE_SSO?((0,e.openBlock)(),(0,e.createElementBlock)("svg",Ae,Re)):(0,e.createCommentVNode)("v-if",!0),t.itemType===t.LoginOption.IAM_CREDENTIAL?((0,e.openBlock)(),(0,e.createElementBlock)("svg",Pe,Be)):(0,e.createCommentVNode)("v-if",!0)]),(0,e.createElementVNode)("div",De,[(0,e.createElementVNode)("div",Ve,[(0,e.createTextVNode)((0,e.toDisplayString)(t.itemTitle)+" ",1),t.itemSubTitle?((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:0},[(0,e.createTextVNode)(" - "),(0,e.createElementVNode)("i",null,(0,e.toDisplayString)(t.itemSubTitle),1)],64)):(0,e.createCommentVNode)("v-if",!0)]),t.itemText?((0,e.openBlock)(),(0,e.createElementBlock)("div",{key:0,class:"p",title:t.itemText},(0,e.toDisplayString)(t.itemText),9,Ue)):(0,e.createCommentVNode)("v-if",!0)])],42,Te)}const Pt={TOOLKIT:"TOOLKIT",AMAZONQ:"AMAZONQ"},Bt={LOGIN:"LOGIN",REAUTHNEEDED:"REAUTHNEEDED",REAUTHENTICATING:"REAUTHENTICATING",PENDING_PROFILE_SELECTION:"PENDING_PROFILE_SELECTION"};var E=(t=>(t[t.NONE=0]="NONE",t[t.BUILDER_ID=1]="BUILDER_ID",t[t.ENTERPRISE_SSO=2]="ENTERPRISE_SSO",t[t.IAM_CREDENTIAL=3]="IAM_CREDENTIAL",t[t.IMPORTED_LOGINS=4]="IMPORTED_LOGINS",t))(E||{});const Dt="userCancelled";function Vt(t){return typeof t=="string"&&(t==="awsExplorer"||t==="codewhisperer"||t==="codecatalyst")}const xe=(0,e.defineComponent)({name:"SelectableItem",components:{},props:{itemId:Number,itemText:String,itemTitle:String,itemSubTitle:String,itemType:Number,isSelected:Boolean,isHovering:Boolean},data(){return{itemId:this.itemId,itemTitle:this.itemTitle,itemSubTitle:this.itemSubTitle,itemText:this.itemText,isSelected:this.isSelected,isHovering:!1,isFocused:!1,LoginOption:E}},async created(){},methods:{toggleSelection(){this.$emit("toggle",this.itemId)},hideFocus(t){t.stopPropagation(),this.isFocused=!1},showFocus(t){t.stopPropagation(),this.isHovering||(this.isFocused=!0)}}});var Ut=I(2619),x=I(7433);const se=(0,x.A)(xe,[["render",Fe],["__scopeId","data-v-2c8c801d"]]);class R{static registerGlobalCommands(){const o=new Event("remount");window.addEventListener("message",h=>{const{command:S}=h.data;if(S==="$clear"){vscode.setState({});for(const w of this.messageListeners)this.removeListener(w);window.dispatchEvent(o)}})}static addListener(o){this.messageListeners.add(o),window.addEventListener("message",o)}static removeListener(o){this.messageListeners.delete(o),window.removeEventListener("message",o)}static sendRequest(o,h,S){const w=JSON.parse(JSON.stringify(S)),M=new Promise((f,a)=>{const T=Tt=>{const z=Tt.data;if(o===z.id)if(this.removeListener(T),window.clearTimeout(kt),z.error===!0){const Nt=JSON.parse(z.data);a(new Error(Nt.message))}else z.event?(typeof S[0]!="function"&&a(new Error(`Expected frontend event handler to be a function: ${h}`)),f(this.registerEventHandler(h,S[0]))):f(z.data)},kt=setTimeout(()=>{this.removeListener(T),a(new Error(`Timed out while waiting for response: id: ${o}, command: ${h}`))},3e5);this.addListener(T)});return vscode.postMessage({id:o,command:h,data:w}),M}static registerEventHandler(o,h){const S=w=>{const M=w.data;if(M.command===o){if(!M.event)throw new Error(`Expected backend handler to be an event emitter: ${o}`);h(M.data)}};return this.addListener(S),{dispose:()=>this.removeListener(S)}}static create(){return this.initialized||(this.initialized=!0,this.registerGlobalCommands()),new Proxy({},{set:()=>{throw new TypeError("Cannot set property to webview client")},get:(o,h)=>{if(typeof h!="string"){console.warn(`Tried to index webview client with non-string property: ${String(h)}`);return}if(h==="init"){const w=vscode.getState()??{};if(w.__once)return()=>Promise.resolve();vscode.setState(Object.assign(w,{__once:!0}))}const S=(this.counter++).toString();return(...w)=>this.sendRequest(S,h,w)}})}}R.counter=0,R.initialized=!1,R.messageListeners=new Set;const xt="https://view.awsapps.com/start",Kt="https://amzn.awsapps.com/start",Ke=/^(https?:\/\/(.+)\.awsapps\.com\/start|https?:\/\/identitycenter\.amazonaws\.com\/ssoins-[\da-zA-Z]{16})\/?$/,ze="URL possibly invalid. Expected format: https://xxxxxxxxxx.awsapps.com/start",He="URL format invalid. Expected format: https://xxxxxxxxxx.com/yyyy",u=R.create();function $e(t){switch(t){case E.BUILDER_ID:return"awsId";case E.ENTERPRISE_SSO:return"iamIdentityCenter";case E.IAM_CREDENTIAL:return"sharedCredentials";default:return}}const We={[E.BUILDER_ID]:"auth_builderIdOption",[E.ENTERPRISE_SSO]:"auth_idcOption",[E.IAM_CREDENTIAL]:"auth_credentialsOption",[E.IMPORTED_LOGINS]:"auth_existingAuthOption"};function Ze(t){return We[t]}const Ge=(0,e.defineComponent)({name:"Login",components:{SelectableItem:se},props:{disabled:{type:Boolean,default:!1},app:{type:String,default:"",required:!0}},data(){return{existingStartUrls:[],importedLogins:[],selectedLoginOption:E.NONE,stage:"START",regions:[],startUrlError:"",startUrlWarning:"",selectedRegion:"",startUrl:"",app:this.app,LoginOption:E,profileName:"",accessKey:"",secretKey:""}},async created(){const t=await this.getDefaultSso();this.startUrl=t.startUrl,this.selectedRegion=t.region,await this.emitUpdate("created")},async mounted(){this.fetchRegions(),await this.updateExistingStartUrls(),await this.updateImportedConnections(),u.resetStoredMetricMetadata(),await this.preselectLoginOption(),await this.handleUrlInput()},methods:{toggleItemSelection(t){this.selectedLoginOption=t,u.storeMetricMetadata({credentialSourceId:$e(t)});const o=Ze(t);o!==void 0&&u.emitUiClick(o)},handleDocumentClick(t){t.target.closest(".selectable-item")||(this.selectedLoginOption=0)},async handleBackButtonClick(){this.stage==="START"?(u.emitUiClick("auth_toolkitCloseButton"),u.quitLoginScreen()):(await u.storeMetricMetadata({isReAuth:!1,result:"Cancelled"}),u.emitAuthMetric(),u.emitUiClick("auth_backButton"),this.stage="START")},async handleContinueClick(){if(this.stage==="START")if(this.selectedLoginOption===E.BUILDER_ID){this.stage="AUTHENTICATING";const t=await u.startBuilderIdSetup(this.app);t?(this.stage="START",u.errorNotification(t)):this.stage="CONNECTED"}else if(this.selectedLoginOption===E.ENTERPRISE_SSO)this.stage="SSO_FORM",this.$nextTick(()=>document.getElementById("startUrl").focus()),await u.storeMetricMetadata({awsRegion:this.selectedRegion});else if(this.selectedLoginOption>=E.IMPORTED_LOGINS){this.stage="AUTHENTICATING";const t=this.importedLogins[this.selectedLoginOption-E.IMPORTED_LOGINS],o=await u.startEnterpriseSetup(t.startUrl,t.region,this.app);o?(this.stage="START",u.errorNotification(o)):this.stage="CONNECTED"}else this.selectedLoginOption===E.IAM_CREDENTIAL&&(this.stage="AWS_PROFILE",this.$nextTick(()=>document.getElementById("profileName").focus()));else if(this.stage==="SSO_FORM"){if(this.shouldDisableSsoContinue())return;this.stage="AUTHENTICATING";const t=await u.startEnterpriseSetup(this.startUrl,this.selectedRegion,this.app);t?(this.stage="START",u.errorNotification(t)):this.stage="CONNECTED"}else if(this.stage==="AWS_PROFILE"){if(this.shouldDisableIamContinue())return;this.stage="AUTHENTICATING";const t=await u.startIamCredentialSetup(this.profileName,this.accessKey,this.secretKey);t?(this.stage="START",u.errorNotification(t)):this.stage="CONNECTED"}u.emitUiClick("auth_continueButton")},async handleCodeCatalystSignin(){u.emitUiClick("auth_codeCatalystSignIn"),this.stage="AUTHENTICATING";const t=await u.startBuilderIdSetup(this.app);t?(this.stage="START",u.errorNotification(t)):this.stage="CONNECTED"},async handleUrlInput(){const t=await o(this.startUrl,this.existingStartUrls);this.startUrlError=t.error,this.startUrlWarning=t.warning,!t.error&&!t.warning&&u.storeMetricMetadata({credentialStartUrl:this.startUrl});async function o(h,S){return h?Ke.test(h)?S.some(w=>w===h)?{error:"A connection for this start URL already exists. Sign out before creating a new one.",warning:""}:{error:"",warning:""}:(console.log("Before Validate"),await u.validateUrl(h)?(console.log("After Validate"),{error:"",warning:ze}):{error:He,warning:""}):{error:"",warning:""}}},handleRegionInput(t){u.storeMetricMetadata({awsRegion:t.target.value}),u.emitUiClick("auth_regionSelection")},async handleCancelButton(){u.cancelAuthFlow(),await u.storeMetricMetadata({isReAuth:!1,result:"Cancelled"}),u.emitAuthMetric(),u.emitUiClick("auth_cancelButton"),this.stage="START"},async fetchRegions(){const t=await u.getRegions();this.regions=t},async emitUpdate(t){},async updateImportedConnections(){(await u.fetchConnections())?.filter(o=>!this.existingStartUrls.includes(o.startUrl)).forEach((o,h)=>{this.importedLogins.push({id:E.IMPORTED_LOGINS+h,text:this.app==="TOOLKIT"?"Used by Amazon Q":"Used by AWS Toolkit",title:`IAM Identity Center ${o.startUrl}`,type:E.ENTERPRISE_SSO,startUrl:o.startUrl,region:o.ssoRegion})}),this.$forceUpdate()},async updateExistingStartUrls(){this.existingStartUrls=(await u.listSsoConnections()).map(t=>t.startUrl)},async getDefaultSso(){return await u.getDefaultSsoProfile()},handleHelpLinkClick(){u.emitUiClick("auth_helpLink")},async preselectLoginOption(){this.importedLogins.length>0?this.selectedLoginOption=E.IMPORTED_LOGINS:this.app==="AMAZONQ"?this.selectedLoginOption=E.BUILDER_ID:this.app==="TOOLKIT"&&(this.selectedLoginOption=E.ENTERPRISE_SSO),this.$forceUpdate()},shouldDisableSsoContinue(){return this.startUrl.length==0||this.startUrlError.length>0||!this.selectedRegion},shouldDisableIamContinue(){return this.profileName.length<=0||this.accessKey.length<=0||this.secretKey.length<=0}}});function je(){return"connection-selection-continue-button"}var zt=I(7988);const Qe=(0,x.A)(Ge,[["render",ke],["__scopeId","data-v-7be6f060"]]),Xe=["data-app"],Je={id:"icon-container"},Ye={key:0,width:"71",height:"71",viewBox:"0 0 71 71",fill:"none",xmlns:"http://www.w3.org/2000/svg"},qe=[(0,e.createStaticVNode)('<g clip-path="url(#clip0_331_37336)"><path d="M30.1307 1.46438L8.83068 13.7563C5.45818 15.7087 3.37256 19.3031 3.37256 23.2081V47.8067C3.37256 51.6969 5.45818 55.306 8.83068 57.2585L30.1307 69.5504C33.5032 71.5029 37.6596 71.5029 41.0321 69.5504L62.3321 57.2585C65.7046 55.306 67.7903 51.7117 67.7903 47.8067V23.2081C67.7903 19.3179 65.7046 15.7087 62.3321 13.7563L41.0321 1.46438C37.6596 -0.488125 33.5032 -0.488125 30.1307 1.46438Z" fill="url(#paint0_linear_331_37336)"></path><path d="M54.1966 21.6843L38.2364 12.469C37.5116 12.0401 36.5354 11.833 35.5739 11.833C34.6124 11.833 33.651 12.0401 32.9114 12.469L16.9512 21.6843C15.4868 22.5274 14.2887 24.5982 14.2887 26.2845V44.7149C14.2887 46.4011 15.4868 48.472 16.9512 49.3151L32.9114 58.5303C33.6362 58.9593 34.6124 59.1663 35.5739 59.1663C36.5354 59.1663 37.4968 58.9593 38.2364 58.5303L54.1966 49.3151C55.661 48.472 56.8591 46.4011 56.8591 44.7149V26.2845C56.8591 24.5982 55.661 22.5274 54.1966 21.6843ZM36.0029 54.7141C36.0029 54.7141 35.7958 54.7584 35.5887 54.7584C35.3816 54.7584 35.2337 54.7288 35.1745 54.7141L19.1699 45.4693C19.0072 45.3213 18.8002 44.9515 18.7558 44.7445V26.2549C18.8002 26.0478 19.022 25.678 19.1699 25.5301L35.1745 16.2853C35.1745 16.2853 35.3816 16.2409 35.5887 16.2409C35.7958 16.2409 35.9437 16.2705 36.0029 16.2853L52.0075 25.5301C52.1702 25.678 52.3772 26.0478 52.4216 26.2549V42.6588L40.0262 35.4997V33.5472C40.0262 33.1626 39.8191 32.8224 39.4937 32.6301L36.1212 30.6776C35.9585 30.5888 35.7662 30.5297 35.5887 30.5297C35.4112 30.5297 35.2189 30.574 35.0562 30.6776L31.6837 32.6301C31.3583 32.8224 31.1512 33.1774 31.1512 33.5472V37.4374C31.1512 37.822 31.3583 38.1622 31.6837 38.3545L35.0562 40.307C35.2189 40.3957 35.4112 40.4549 35.5887 40.4549C35.7662 40.4549 35.9585 40.4105 36.1212 40.307L37.8074 39.3307L50.2029 46.4899L36.0029 54.6845V54.7141Z" fill="white"></path></g><defs><linearGradient id="paint0_linear_331_37336" x1="64.1515" y1="-5.31021" x2="10.5465" y2="71.2515" gradientUnits="userSpaceOnUse"><stop stop-color="#A7F8FF"></stop><stop offset="0.03" stop-color="#9DF1FF"></stop><stop offset="0.08" stop-color="#84E1FF"></stop><stop offset="0.15" stop-color="#5AC7FF"></stop><stop offset="0.22" stop-color="#21A2FF"></stop><stop offset="0.26" stop-color="#008DFF"></stop><stop offset="0.66" stop-color="#7F33FF"></stop><stop offset="0.99" stop-color="#39127D"></stop></linearGradient><clipPath id="clip0_331_37336"><rect width="71" height="71" fill="white"></rect></clipPath></defs>',2)],et={id:"content-container"},tt={id:"title"},ot=(0,e.createElementVNode)("div",{id:"call-to-action"},"Please re-authenticate to continue",-1),it={key:0,id:"error-message",style:{color:"red"}},nt={key:1},at=(0,e.createElementVNode)("div",null,"Re-authentication in progress",-1);function st(t,o,h,S,w,M){return(0,e.withDirectives)(((0,e.openBlock)(),(0,e.createElementBlock)("div",{id:"reauthenticate-container","data-app":t.app},[(0,e.createCommentVNode)(" Icon "),(0,e.createElementVNode)("div",Je,[t.app==="AMAZONQ"?((0,e.openBlock)(),(0,e.createElementBlock)("svg",Ye,qe)):(0,e.createCommentVNode)("v-if",!0)]),(0,e.createElementVNode)("div",et,[t.state==="REAUTHNEEDED"?((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:0},[(0,e.createElementVNode)("div",null,[(0,e.createElementVNode)("div",tt,"Connection to "+(0,e.toDisplayString)(t.name)+" Expired",1),ot]),(0,e.createElementVNode)("div",null,[(0,e.createElementVNode)("button",{id:"reauthenticate-button",onClick:o[0]||(o[0]=(...f)=>t.reauthenticate&&t.reauthenticate(...f))},"Re-authenticate"),t.errorMessage?((0,e.openBlock)(),(0,e.createElementBlock)("div",it,(0,e.toDisplayString)(t.errorMessage),1)):(0,e.createCommentVNode)("v-if",!0)]),(0,e.createElementVNode)("button",{id:"signout",onClick:o[1]||(o[1]=(...f)=>t.signout&&t.signout(...f))},"Sign Out")],64)):t.state==="REAUTHENTICATING"?((0,e.openBlock)(),(0,e.createElementBlock)("div",nt,[at,(0,e.createElementVNode)("button",{id:"cancel",style:{color:"#6f6f6f","background-color":"var(--vscode-input-background)"},onClick:o[2]||(o[2]=(...f)=>t.cancel&&t.cancel(...f))}," Cancel ")])):(0,e.createCommentVNode)("v-if",!0)])],8,Xe)),[[e.vShow,t.doShow]])}const P=R.create(),rt={AMAZONQ:"Amazon Q",TOOLKIT:"Toolkit"},lt=(0,e.defineComponent)({name:"Reauthenticate",data(){return{name:"",errorMessage:"",doShow:!1}},props:{app:{type:String,required:!0},state:{type:String,required:!0}},async created(){this.name=rt[this.app];const t=await P.getReauthError();this.errorMessage=t?t.text:"",this.doShow=!0},methods:{async reauthenticate(){P.emitUiClick("auth_reauthenticate"),await P.reauthenticateConnection()},async signout(){P.emitUiClick("auth_signout"),await P.signout()},async cancel(){P.emitUiClick("auth_reauthCancelButton"),await P.cancelAuthFlow()}}});function dt(){return"reauthenticate-button"}var Wt=I(127);const ct=(0,x.A)(lt,[["render",st]]),re=t=>((0,e.pushScopeId)("data-v-9f4375b8"),t=t(),(0,e.popScopeId)(),t),ut=["data-app"],pt={id:"icon-container",class:"bottomMargin"},_t={key:0,width:"71",height:"71",viewBox:"0 0 71 71",fill:"none",xmlns:"http://www.w3.org/2000/svg"},ht=[(0,e.createStaticVNode)('<g clip-path="url(#clip0_331_37336)" data-v-9f4375b8><path d="M30.1307 1.46438L8.83068 13.7563C5.45818 15.7087 3.37256 19.3031 3.37256 23.2081V47.8067C3.37256 51.6969 5.45818 55.306 8.83068 57.2585L30.1307 69.5504C33.5032 71.5029 37.6596 71.5029 41.0321 69.5504L62.3321 57.2585C65.7046 55.306 67.7903 51.7117 67.7903 47.8067V23.2081C67.7903 19.3179 65.7046 15.7087 62.3321 13.7563L41.0321 1.46438C37.6596 -0.488125 33.5032 -0.488125 30.1307 1.46438Z" fill="url(#paint0_linear_331_37336)" data-v-9f4375b8></path><path d="M54.1966 21.6843L38.2364 12.469C37.5116 12.0401 36.5354 11.833 35.5739 11.833C34.6124 11.833 33.651 12.0401 32.9114 12.469L16.9512 21.6843C15.4868 22.5274 14.2887 24.5982 14.2887 26.2845V44.7149C14.2887 46.4011 15.4868 48.472 16.9512 49.3151L32.9114 58.5303C33.6362 58.9593 34.6124 59.1663 35.5739 59.1663C36.5354 59.1663 37.4968 58.9593 38.2364 58.5303L54.1966 49.3151C55.661 48.472 56.8591 46.4011 56.8591 44.7149V26.2845C56.8591 24.5982 55.661 22.5274 54.1966 21.6843ZM36.0029 54.7141C36.0029 54.7141 35.7958 54.7584 35.5887 54.7584C35.3816 54.7584 35.2337 54.7288 35.1745 54.7141L19.1699 45.4693C19.0072 45.3213 18.8002 44.9515 18.7558 44.7445V26.2549C18.8002 26.0478 19.022 25.678 19.1699 25.5301L35.1745 16.2853C35.1745 16.2853 35.3816 16.2409 35.5887 16.2409C35.7958 16.2409 35.9437 16.2705 36.0029 16.2853L52.0075 25.5301C52.1702 25.678 52.3772 26.0478 52.4216 26.2549V42.6588L40.0262 35.4997V33.5472C40.0262 33.1626 39.8191 32.8224 39.4937 32.6301L36.1212 30.6776C35.9585 30.5888 35.7662 30.5297 35.5887 30.5297C35.4112 30.5297 35.2189 30.574 35.0562 30.6776L31.6837 32.6301C31.3583 32.8224 31.1512 33.1774 31.1512 33.5472V37.4374C31.1512 37.822 31.3583 38.1622 31.6837 38.3545L35.0562 40.307C35.2189 40.3957 35.4112 40.4549 35.5887 40.4549C35.7662 40.4549 35.9585 40.4105 36.1212 40.307L37.8074 39.3307L50.2029 46.4899L36.0029 54.6845V54.7141Z" fill="white" data-v-9f4375b8></path></g><defs data-v-9f4375b8><linearGradient id="paint0_linear_331_37336" x1="64.1515" y1="-5.31021" x2="10.5465" y2="71.2515" gradientUnits="userSpaceOnUse" data-v-9f4375b8><stop stop-color="#A7F8FF" data-v-9f4375b8></stop><stop offset="0.03" stop-color="#9DF1FF" data-v-9f4375b8></stop><stop offset="0.08" stop-color="#84E1FF" data-v-9f4375b8></stop><stop offset="0.15" stop-color="#5AC7FF" data-v-9f4375b8></stop><stop offset="0.22" stop-color="#21A2FF" data-v-9f4375b8></stop><stop offset="0.26" stop-color="#008DFF" data-v-9f4375b8></stop><stop offset="0.66" stop-color="#7F33FF" data-v-9f4375b8></stop><stop offset="0.99" stop-color="#39127D" data-v-9f4375b8></stop></linearGradient><clipPath id="clip0_331_37336" data-v-9f4375b8><rect width="71" height="71" fill="white" data-v-9f4375b8></rect></clipPath></defs>',2)],ft={key:0,class:"header bottomMargin"},gt=re(()=>(0,e.createElementVNode)("div",{class:"header"},"Choose a Q Developer profile",-1)),vt=re(()=>(0,e.createElementVNode)("div",{class:"subHeader bottomMargin topMargin"},[(0,e.createTextVNode)(" Your administrator has given you access to Q from multiple profiles. Choose the profile that meets your current working needs. You can change your profile at any time. "),(0,e.createElementVNode)("a",{href:"https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/subscribe-understanding-profile.html"},"More info.")],-1)),mt={class:"bottomMargin"},bt={key:0,id:"error-message",class:"bottomMargin"},Ct=["disabled"];function Et(t,o,h,S,w,M){const f=(0,e.resolveComponent)("SelectableItem");return(0,e.withDirectives)(((0,e.openBlock)(),(0,e.createElementBlock)("div",{id:"profile-selector-container","data-app":t.app},[(0,e.createCommentVNode)(" Icon "),(0,e.createElementVNode)("div",pt,[t.app==="AMAZONQ"?((0,e.openBlock)(),(0,e.createElementBlock)("svg",_t,ht)):(0,e.createCommentVNode)("v-if",!0)]),t.isFirstLoading?((0,e.openBlock)(),(0,e.createElementBlock)("div",ft,"Fetching Q Developer profiles...this may take a minute.")):((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:1},[gt,vt,(0,e.createElementVNode)("div",mt,[(0,e.createCommentVNode)(" TODO: should use profile.arn as item-id but not idx, which will require more work to refactor auth flow code path "),((0,e.openBlock)(!0),(0,e.createElementBlock)(e.Fragment,null,(0,e.renderList)(t.availableRegionProfiles,(a,T)=>((0,e.openBlock)(),(0,e.createBlock)(f,{key:a.arn,onToggle:t.toggleItemSelection,"item-id":T,"item-title":`${a.name}`,"item-sub-title":`${a.region}`,"item-text":`Account: ${a.description}`,isSelected:t.selectedRegionProfileIndex===T,class:(0,e.normalizeClass)(["selectable-item",{selected:t.selectedRegionProfileIndex===T}])},null,8,["onToggle","item-id","item-title","item-sub-title","item-text","isSelected","class"]))),128))]),t.errorMessage?((0,e.openBlock)(),(0,e.createElementBlock)("div",bt," We couldn't load your Q Developer profiles. Please try again. ")):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("div",null,[t.errorMessage?((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:0},[(0,e.createElementVNode)("button",{id:"reload",class:"continue-button",onClick:o[0]||(o[0]=(...a)=>t.retryLoadProfiles&&t.retryLoadProfiles(...a))},"Try again"),(0,e.createElementVNode)("button",{id:"signout",class:"topMargin",onClick:o[1]||(o[1]=(...a)=>t.signout&&t.signout(...a))},"Sign Out")],64)):((0,e.openBlock)(),(0,e.createElementBlock)("button",{key:1,class:"continue-button",id:"profile-selection-continue-button",onClick:o[2]||(o[2]=a=>t.onClickContinue()),disabled:t.isRetryLoading},(0,e.toDisplayString)(t.isRetryLoading?"Refreshing":"Continue"),9,Ct))])],64))],8,ut)),[[e.vShow,t.doShow]])}const K=R.create(),jt={AMAZONQ:"Amazon Q",TOOLKIT:"Toolkit"},yt=(0,e.defineComponent)({name:"RegionProfileSelector",components:{SelectableItem:se},data(){return{name:"",errorMessage:"",doShow:!1,availableRegionProfiles:[],selectedRegionProfileIndex:0,isFirstLoading:!1,isRetryLoading:!1}},props:{app:{type:String,required:!0},state:{type:String,required:!0}},async created(){this.doShow=!0},async mounted(){this.firstTimeLoadProfiles()},methods:{toggleItemSelection(t){this.selectedRegionProfileIndex=t},onClickContinue(){if(this.availableRegionProfiles[this.selectedRegionProfileIndex]!==void 0){const t=this.availableRegionProfiles[this.selectedRegionProfileIndex];K.selectRegionProfile(t,"auth")}},async signout(){K.emitUiClick("auth_signout"),await K.signout()},async retryLoadProfiles(){this.isRetryLoading=!0,await this.listAvailableProfiles(),this.isRetryLoading=!1},firstTimeLoadProfiles(){this.isFirstLoading=!0,this.listAvailableProfiles().then(()=>{this.isFirstLoading=!1})},async listAvailableProfiles(){this.errorMessage="";const t=await K.listRegionProfiles();typeof t=="string"?this.errorMessage=t:(this.availableRegionProfiles=t,this.availableRegionProfiles.length===1&&await K.selectRegionProfile(this.availableRegionProfiles[0],"update"))}}});function St(){return"profile-selection-continue-button"}var Qt=I(7897);const wt=(0,x.A)(yt,[["render",Et],["__scopeId","data-v-9f4375b8"]]),G=R.create(),It=(0,e.defineComponent)({name:"auth",components:{Login:Qe,Reauthenticate:ct,RegionProfileSelector:wt},data(){return{authFlowState:"",refreshKey:0}},props:{app:{type:String,required:!0}},async created(){G.onActiveConnectionModified(()=>{this.refreshAuthState()}),await this.refreshAuthState(),ee?te():window.addEventListener("load",()=>{te()})},async updated(){ee&&te()},methods:{async refreshAuthState(){await G.refreshAuthState(),this.authFlowState=await G.getAuthState(),this.authFlowState==="LOGIN"?(window.uiState="login",window.uiReadyElementId=je()):this.authFlowState==="PENDING_PROFILE_SELECTION"?(window.uiState="selectProfile",window.uiReadyElementId=St()):this.authFlowState&&this.authFlowState!==void 0&&(window.uiState="reauth",window.uiReadyElementId=dt()),this.refreshKey+=1}}}),j={auth:!1,selectProfile:!1};window.onerror=function(t){const o=window.uiState;j[o==="login"||o==="reauth"?"auth":"selectProfile"]||Q(window.uiState,t.toString())},document.addEventListener("error",t=>{const o=window.uiState;j[o==="login"||o==="reauth"?"auth":"selectProfile"]||Q(window.uiState,t.message)},!0);let ee=!1;window.addEventListener("load",()=>{ee=!0});const te=()=>{const t=window.uiState;if(j[t==="login"||t==="reauth"?"auth":"selectProfile"])return;!!document.getElementById(window.uiReadyElementId)?Q(window.uiState):Q(window.uiState,`Could not find element: ${window.uiReadyElementId}`)},Q=(t,o)=>{G.setUiReady(t,o);const h=t==="selectProfile"?"selectProfile":"auth";j[h]=!0};var Jt=I(4732);const Lt=(0,x.A)(It,[["render",n]]);const le=()=>(0,e.createApp)(Lt,{app:"TOOLKIT"}),de=le();de.mount("#vue-app"),window.addEventListener("remount",()=>{de.unmount(),le().mount("#vue-app")})})();var ie=this;for(var ne in X)ie[ne]=X[ne];X.__esModule&&Object.defineProperty(ie,"__esModule",{value:!0})})();
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 *
 * This module is run within the webview, and will mount the Vue app.
 */
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
