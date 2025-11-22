(()=>{var X={6092:(e,i,n)=>{"use strict";n.r(i),n.d(i,{default:()=>T});var a=n(6758),r=n.n(a),c=n(935),h=n.n(c),v=h()(r());v.push([e.id,`
.generateSuggestionDiv {
    width: 100%;
    margin-right: 5%;
    height: auto;
    display: flex;
    flex-direction: column;
    margin-bottom: 40px;
}
.generateSuggestionHeaderDiv {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 15px;
}
.generateSuggestionHeader {
    font-family: Verdana;
    font-size: 18px;
    font-weight: 860;
    line-height: 24px;
    letter-spacing: 0em;
    text-align: left;
}
.generateSuggestionDescription {
    font-family: Verdana;
    font-size: 14px;
    font-weight: 510;
    line-height: 21px;
    padding-top: 20px;
    letter-spacing: 0em;
    text-align: left;
}
.generateSuggestionLearnMore {
    font-size: 14px;
    text-decoration: none;
    cursor: pointer;
    color: #0097fb;
}
.generateSuggestionTabRow {
    display: flex;
    flex-direction: row;
    height: 26px;
    gap: 10px;
    padding-left: 10px;
    padding-right: 25px;
    padding-top: 15px;
    padding-bottom: 15px;
    align-items: center;
    justify-content: space-between;
}
.generateSuggestionTabRowLabel {
    font-family: Verdana;
    font-size: 14px;
    font-weight: 350;
    line-height: 17px;
    text-align: left;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
}
.generateSuggestionTabMachine {
    display: flex;
    flex-direction: row;
    padding-left: 10px;
}
.generateSuggestionTabMachineColorGroup1 {
    background-color: var(--vscode-editorWidget-background);
}
.generateSuggestionTabMachineText {
    padding-left: 5px;
    padding-right: 10px;
    padding-top: 4px;
    font-family: Verdana;
    text-align: center;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 350;
}
.tableDivSub {
    margin-top: 10px;
    border-collapse: collapse;
    width: 100%;
    border-radius: 8px;
    border: 1.12px solid #424750;
}
.col2 {
    border: 1px solid #555353;
    border-radius: 3px;
    width: fit-content;
    padding: 2px 10px;
    margin-right: 5px;
    color: #ffffff;
    background: linear-gradient(0deg, #3d3d3d, #3d3d3d), linear-gradient(0deg, #555353, #555353);
    font-family: Verdana;
    font-size: 13px;
    font-weight: 400;
    line-height: 19px;
    letter-spacing: 0em;
    text-align: left;
    justify-content: center;
    justify-items: center;
    align-items: center;
}
.tryExample {
    justify-content: end;
    height: fit-content;
    width: fit-content;
    padding: 6.7 12.3;
}
`,""]);const T=v},3588:(e,i,n)=>{"use strict";n.r(i),n.d(i,{default:()=>T});var a=n(6758),r=n.n(a),c=n(935),h=n.n(c),v=h()(r());v.push([e.id,`
.headerDiv {
    display: flex;
    flex-direction: column;
}
.banner {
    padding-left: 30px;
    padding-right: 30px;
    background-color: #0a4265;
    border-radius: 10px;
    display: flex;
    height: 48px;
    align-items: center;
    /* border: 1px solid #f5f5f5; */
}
.bannerDiv {
    display: flex;
    flex-direction: row;
    flex: 0.95;
    align-items: center;
    justify-content: left;
    gap: 20px;
}
.infoIcon {
    margin-top: 3px;
    justify-content: left;
}
.bannerDescription {
    color: #f5f5f5;
    font-family: Verdana;
    font-size: 14px;
    font-weight: 350;
    text-align: left;
    justify-content: left;
}
.closeBanner {
    cursor: pointer;
    color: #ffffff;
    align-items: center;
    flex: 0.05;
    text-align: right;
    padding-top: 5px;
}
.logoIcon {
    display: flex;
    flex-direction: row;
    justify-content: left;
    align-items: center;
    padding-top: 25px;
    padding-bottom: 30px;
    padding-left: 60px;
    height: auto;
}
.titleDiv {
    display: flex;
    flex-direction: column;
    padding-left: 20px;
    padding-top: 10px;
    padding-bottom: 10px;
}
.titleHeader {
    font-family: Verdana;
    font-size: 24px;
    font-weight: 860;
    line-height: 12px;
    letter-spacing: 0em;
    text-align: left;
}
.titleSubHeader {
    font-family: Verdana;
    font-size: 14px;
    font-weight: 400;
    padding-top: 10px;
    line-height: 21px;
    letter-spacing: 0em;
    text-align: left;
}
.body {
    display: flex;
    flex-wrap: wrap-reverse;
    height: auto;
    justify-content: left;
    gap: 5%;
    justify-items: left;
    padding-left: 60px;
}
.bodySubDiv {
    display: flex;
    flex-direction: column;
    width: 860;
    height: auto;
    justify-items: start;
    align-items: start;
}
`,""]);const T=v},935:e=>{"use strict";e.exports=function(i){var n=[];return n.toString=function(){return this.map(function(r){var c="",h=typeof r[5]<"u";return r[4]&&(c+="@supports (".concat(r[4],") {")),r[2]&&(c+="@media ".concat(r[2]," {")),h&&(c+="@layer".concat(r[5].length>0?" ".concat(r[5]):""," {")),c+=i(r),h&&(c+="}"),r[2]&&(c+="}"),r[4]&&(c+="}"),c}).join("")},n.i=function(r,c,h,v,T){typeof r=="string"&&(r=[[null,r,void 0]]);var M={};if(h)for(var D=0;D<this.length;D++){var O=this[D][0];O!=null&&(M[O]=!0)}for(var w=0;w<r.length;w++){var p=[].concat(r[w]);h&&M[p[0]]||(typeof T<"u"&&(typeof p[5]>"u"||(p[1]="@layer".concat(p[5].length>0?" ".concat(p[5]):""," {").concat(p[1],"}")),p[5]=T),c&&(p[2]&&(p[1]="@media ".concat(p[2]," {").concat(p[1],"}")),p[2]=c),v&&(p[4]?(p[1]="@supports (".concat(p[4],") {").concat(p[1],"}"),p[4]=v):p[4]="".concat(v)),n.push(p))}},n}},6758:e=>{"use strict";e.exports=function(i){return i[1]}},7433:(e,i)=>{"use strict";var n;n={value:!0},i.A=(a,r)=>{const c=a.__vccOpts||a;for(const[h,v]of r)c[h]=v;return c}},4872:(e,i,n)=>{var a=n(6092);a.__esModule&&(a=a.default),typeof a=="string"&&(a=[[e.id,a,""]]),a.locals&&(e.exports=a.locals);var r=n(611).A,c=r("083180a5",a,!1,{})},7592:(e,i,n)=>{var a=n(3588);a.__esModule&&(a=a.default),typeof a=="string"&&(a=[[e.id,a,""]]),a.locals&&(e.exports=a.locals);var r=n(611).A,c=r("1ed610be",a,!1,{})},611:(e,i,n)=>{"use strict";n.d(i,{A:()=>G});function a(t,d){for(var l=[],s={},o=0;o<d.length;o++){var x=d[o],u=x[0],A=x[1],C=x[2],$=x[3],b={id:t+":"+o,css:A,media:C,sourceMap:$};s[u]?s[u].parts.push(b):l.push(s[u]={id:u,parts:[b]})}return l}var r=typeof document<"u";if(typeof DEBUG<"u"&&DEBUG&&!r)throw new Error("vue-style-loader cannot be used in a non-browser environment. Use { target: 'node' } in your Webpack config to indicate a server-rendering environment.");var c={},h=r&&(document.head||document.getElementsByTagName("head")[0]),v=null,T=0,M=!1,D=function(){},O=null,w="data-vue-ssr-id",p=typeof navigator<"u"&&/msie [6-9]\b/.test(navigator.userAgent.toLowerCase());function G(t,d,l,s){M=l,O=s||{};var o=a(t,d);return R(o),function(u){for(var A=[],C=0;C<o.length;C++){var $=o[C],b=c[$.id];b.refs--,A.push(b)}u?(o=a(t,u),R(o)):o=[];for(var C=0;C<A.length;C++){var b=A[C];if(b.refs===0){for(var B=0;B<b.parts.length;B++)b.parts[B]();delete c[b.id]}}}}function R(t){for(var d=0;d<t.length;d++){var l=t[d],s=c[l.id];if(s){s.refs++;for(var o=0;o<s.parts.length;o++)s.parts[o](l.parts[o]);for(;o<l.parts.length;o++)s.parts.push(z(l.parts[o]));s.parts.length>l.parts.length&&(s.parts.length=l.parts.length)}else{for(var x=[],o=0;o<l.parts.length;o++)x.push(z(l.parts[o]));c[l.id]={id:l.id,refs:1,parts:x}}}}function L(){var t=document.createElement("style");return t.type="text/css",h.appendChild(t),t}function z(t){var d,l,s=document.querySelector("style["+w+'~="'+t.id+'"]');if(s){if(M)return D;s.parentNode.removeChild(s)}if(p){var o=T++;s=v||(v=L()),d=I.bind(null,s,o,!1),l=I.bind(null,s,o,!0)}else s=L(),d=W.bind(null,s),l=function(){s.parentNode.removeChild(s)};return d(t),function(u){if(u){if(u.css===t.css&&u.media===t.media&&u.sourceMap===t.sourceMap)return;d(t=u)}else l()}}var Q=function(){var t=[];return function(d,l){return t[d]=l,t.filter(Boolean).join(`
`)}}();function I(t,d,l,s){var o=l?"":s.css;if(t.styleSheet)t.styleSheet.cssText=Q(d,o);else{var x=document.createTextNode(o),u=t.childNodes;u[d]&&t.removeChild(u[d]),u.length?t.insertBefore(x,u[d]):t.appendChild(x)}}function W(t,d){var l=d.css,s=d.media,o=d.sourceMap;if(s&&t.setAttribute("media",s),O.ssrId&&t.setAttribute(w,d.id),o&&(l+=`
/*# sourceURL=`+o.sources[0]+" */",l+=`
/*# sourceMappingURL=data:application/json;base64,`+btoa(unescape(encodeURIComponent(JSON.stringify(o))))+" */"),t.styleSheet)t.styleSheet.cssText=l;else{for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(document.createTextNode(l))}}}},H={};function S(e){var i=H[e];if(i!==void 0)return i.exports;var n=H[e]={id:e,exports:{}};return X[e](n,n.exports,S),n.exports}S.n=e=>{var i=e&&e.__esModule?()=>e.default:()=>e;return S.d(i,{a:i}),i},S.d=(e,i)=>{for(var n in i)S.o(i,n)&&!S.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:i[n]})},S.o=(e,i)=>Object.prototype.hasOwnProperty.call(e,i),S.r=e=>{typeof Symbol<"u"&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var U={};(()=>{"use strict";const e=Vue,i=(0,e.createStaticVNode)('<div class="headerDiv"><!-- Logo + Title --><div class="logoIcon"><!-- Icon --><svg width="100" height="100" viewBox="0 0 71 71" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_331_37336)"><path d="M30.1307 1.46438L8.83068 13.7563C5.45818 15.7087 3.37256 19.3031 3.37256 23.2081V47.8067C3.37256 51.6969 5.45818 55.306 8.83068 57.2585L30.1307 69.5504C33.5032 71.5029 37.6596 71.5029 41.0321 69.5504L62.3321 57.2585C65.7046 55.306 67.7903 51.7117 67.7903 47.8067V23.2081C67.7903 19.3179 65.7046 15.7087 62.3321 13.7563L41.0321 1.46438C37.6596 -0.488125 33.5032 -0.488125 30.1307 1.46438Z" fill="url(#paint0_linear_331_37336)"></path><path d="M54.1966 21.6843L38.2364 12.469C37.5116 12.0401 36.5354 11.833 35.5739 11.833C34.6124 11.833 33.651 12.0401 32.9114 12.469L16.9512 21.6843C15.4868 22.5274 14.2887 24.5982 14.2887 26.2845V44.7149C14.2887 46.4011 15.4868 48.472 16.9512 49.3151L32.9114 58.5303C33.6362 58.9593 34.6124 59.1663 35.5739 59.1663C36.5354 59.1663 37.4968 58.9593 38.2364 58.5303L54.1966 49.3151C55.661 48.472 56.8591 46.4011 56.8591 44.7149V26.2845C56.8591 24.5982 55.661 22.5274 54.1966 21.6843ZM36.0029 54.7141C36.0029 54.7141 35.7958 54.7584 35.5887 54.7584C35.3816 54.7584 35.2337 54.7288 35.1745 54.7141L19.1699 45.4693C19.0072 45.3213 18.8002 44.9515 18.7558 44.7445V26.2549C18.8002 26.0478 19.022 25.678 19.1699 25.5301L35.1745 16.2853C35.1745 16.2853 35.3816 16.2409 35.5887 16.2409C35.7958 16.2409 35.9437 16.2705 36.0029 16.2853L52.0075 25.5301C52.1702 25.678 52.3772 26.0478 52.4216 26.2549V42.6588L40.0262 35.4997V33.5472C40.0262 33.1626 39.8191 32.8224 39.4937 32.6301L36.1212 30.6776C35.9585 30.5888 35.7662 30.5297 35.5887 30.5297C35.4112 30.5297 35.2189 30.574 35.0562 30.6776L31.6837 32.6301C31.3583 32.8224 31.1512 33.1774 31.1512 33.5472V37.4374C31.1512 37.822 31.3583 38.1622 31.6837 38.3545L35.0562 40.307C35.2189 40.3957 35.4112 40.4549 35.5887 40.4549C35.7662 40.4549 35.9585 40.4105 36.1212 40.307L37.8074 39.3307L50.2029 46.4899L36.0029 54.6845V54.7141Z" fill="white"></path></g><defs><linearGradient id="paint0_linear_331_37336" x1="64.1515" y1="-5.31021" x2="10.5465" y2="71.2515" gradientUnits="userSpaceOnUse"><stop stop-color="#A7F8FF"></stop><stop offset="0.03" stop-color="#9DF1FF"></stop><stop offset="0.08" stop-color="#84E1FF"></stop><stop offset="0.15" stop-color="#5AC7FF"></stop><stop offset="0.22" stop-color="#21A2FF"></stop><stop offset="0.26" stop-color="#008DFF"></stop><stop offset="0.66" stop-color="#7F33FF"></stop><stop offset="0.99" stop-color="#39127D"></stop></linearGradient><clipPath id="clip0_331_37336"><rect width="71" height="71" fill="white"></rect></clipPath></defs></svg><!-- Text --><div class="titleDiv"><div class="titleHeader">Amazon Q inline code suggestions</div><div class="titleSubHeader"> An AI assistant that reimagines your experience across the entire development lifecycle </div></div></div></div>',1),n={class:"body"},a={class:"bodySubDiv"};function r(_,g,f,m,y,V){const E=(0,e.resolveComponent)("GenerateSuggestionTab");return(0,e.openBlock)(),(0,e.createElementBlock)("div",null,[(0,e.createCommentVNode)(" Header "),i,(0,e.createCommentVNode)(" Body "),(0,e.createElementVNode)("div",n,[(0,e.createCommentVNode)(" Functionality "),(0,e.createElementVNode)("div",a,[(0,e.createVNode)(E)])])])}const c={class:"generateSuggestionDiv"},h=(0,e.createElementVNode)("div",{class:"generateSuggestionHeaderDiv"},[(0,e.createElementVNode)("div",{class:"generateSuggestionHeader"},"Generate code suggestions with examples")],-1),v={class:"generateSuggestionTabRowLabel"},T={class:"generateSuggestionTabMachine"},M={key:0,class:"col2"},D={key:1,class:"col2"},O=(0,e.createElementVNode)("div",{class:"generateSuggestionTabMachineText"},"+",-1),w=(0,e.createElementVNode)("div",{class:"col2"},"C",-1),p=["onClick"],G={class:"generateSuggestionDescription"};function R(_,g,f,m,y,V){return(0,e.openBlock)(),(0,e.createElementBlock)("div",c,[h,(0,e.createCommentVNode)(" Tab "),(0,e.createElementVNode)("div",null,[((0,e.openBlock)(!0),(0,e.createElementBlock)(e.Fragment,null,(0,e.renderList)(_.tabs[_.activeTab].tableData,(E,P)=>((0,e.openBlock)(),(0,e.createElementBlock)("div",{class:"tableDivSub",key:P},[((0,e.openBlock)(!0),(0,e.createElementBlock)(e.Fragment,null,(0,e.renderList)([E.column1,E.column2,E.column3],(F,k)=>((0,e.openBlock)(),(0,e.createElementBlock)("div",{key:k},[(0,e.createElementVNode)("div",{class:(0,e.normalizeClass)(["generateSuggestionTabRow",k%2===1?"generateSuggestionTabMachineColorGroup1":""])},[(0,e.createElementVNode)("div",v,[k===0?((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:0},[(0,e.createTextVNode)(" Generate code suggestions as you type ")],64)):k===1?((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:1},[(0,e.createTextVNode)(" Generate code suggestions manually using "),(0,e.createElementVNode)("div",T,[_.osState==="Mac"?((0,e.openBlock)(),(0,e.createElementBlock)("div",M,"Option")):((0,e.openBlock)(),(0,e.createElementBlock)("div",D,"Alt")),O,w])],64)):((0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,{key:2},[(0,e.createTextVNode)(" Generate unit test cases ")],64))]),(0,e.createElementVNode)("button",{class:"tryExample",onClick:J=>_.onClick(F,_.tabs[_.activeTab].label)},"Try example",8,p)],2)]))),128))]))),128))]),(0,e.createElementVNode)("div",G,[(0,e.createTextVNode)(" Amazon Q inline suggestions supports 15 programming languages, including TypeScript, JavaScript, Python, Java, and C#. "),(0,e.createElementVNode)("a",{class:"generateSuggestionLearnMore",href:"https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-language-ide-support.html",onClick:g[0]||(g[0]=E=>_.emitUiClick("codewhisperer_GenerateSuggestions_LearnMore"))},"Learn more")])])}class L{static registerGlobalCommands(){const g=new Event("remount");window.addEventListener("message",f=>{const{command:m}=f.data;if(m==="$clear"){vscode.setState({});for(const y of this.messageListeners)this.removeListener(y);window.dispatchEvent(g)}})}static addListener(g){this.messageListeners.add(g),window.addEventListener("message",g)}static removeListener(g){this.messageListeners.delete(g),window.removeEventListener("message",g)}static sendRequest(g,f,m){const y=JSON.parse(JSON.stringify(m)),V=new Promise((E,P)=>{const F=J=>{const N=J.data;if(g===N.id)if(this.removeListener(F),window.clearTimeout(k),N.error===!0){const Z=JSON.parse(N.data);P(new Error(Z.message))}else N.event?(typeof m[0]!="function"&&P(new Error(`Expected frontend event handler to be a function: ${f}`)),E(this.registerEventHandler(f,m[0]))):E(N.data)},k=setTimeout(()=>{this.removeListener(F),P(new Error(`Timed out while waiting for response: id: ${g}, command: ${f}`))},3e5);this.addListener(F)});return vscode.postMessage({id:g,command:f,data:y}),V}static registerEventHandler(g,f){const m=y=>{const V=y.data;if(V.command===g){if(!V.event)throw new Error(`Expected backend handler to be an event emitter: ${g}`);f(V.data)}};return this.addListener(m),{dispose:()=>this.removeListener(m)}}static create(){return this.initialized||(this.initialized=!0,this.registerGlobalCommands()),new Proxy({},{set:()=>{throw new TypeError("Cannot set property to webview client")},get:(g,f)=>{if(typeof f!="string"){console.warn(`Tried to index webview client with non-string property: ${String(f)}`);return}if(f==="init"){const y=vscode.getState()??{};if(y.__once)return()=>Promise.resolve();vscode.setState(Object.assign(y,{__once:!0}))}const m=(this.counter++).toString();return(...y)=>this.sendRequest(m,f,y)}})}}L.counter=0,L.initialized=!1,L.messageListeners=new Set;const z=L.create(),W=(0,e.defineComponent)({name:"TelemetryClient",methods:{emitUiClick(_){z.emitUiClick(_)}}}),t=L.create(),d=(0,e.defineComponent)({name:"GenerateSuggestionTab",components:{},extends:W,data(){return{activeTab:parseInt(sessionStorage.getItem("activeTab")||"0"),osState:"",tabs:[{label:"Python",tableData:[{column1:["AmazonQ_generate_suggestion.py",`# TODO: place your cursor at the end of line 6 and press Enter to generate a suggestion.
# Tip: press tab to accept the suggestion.

fake_users = [
    { "name": "User 1", "id": "user1", "city": "San Francisco", "state": "CA" },
]`],column2:["AmazonQ_manual_invoke.py",`# TODO: Press either Option + C on MacOS or Alt + C on Windows on a new line.

# Function to upload a file to an S3 bucket.
`],column3:["Generate_unit_tests.py",`# TODO: Ask Amazon Q to write unit tests.

def sum(a, b):
    """
    Function to sum two numbers.

    Args:
    - a: First number.
    - b: Second number.

    Returns:
    - Sum of the two numbers.
    """
    return a + b

# Write a test case for the above function.
`]}]}]}},mounted(){this.showOS()},methods:{onClick(_,g){let f="autoTrigger";const m=_[0];m.startsWith("AmazonQ_generate_suggestion")?f="autoTrigger":m.startsWith("AmazonQ_manual_invoke")?f="manualTrigger":f="unitTest";const y="python";t.emitTryExampleClick(y,f),t.openFile([_[0],_[1]])},async showOS(){this.osState=await t.getOSType()},activeTabFunction(_){this.activeTab=_,sessionStorage.setItem("activeTab",_.toString())}}});var l=S(4872),s=S(7433);const x=(0,s.A)(d,[["render",R]]),u=(0,e.defineComponent)({name:"Getting_Started",components:{GenerateSuggestionTab:x},data(){return{bannerVisible:!0,active:parseInt(sessionStorage.getItem("active")||"0")}},mounted(){sessionStorage.setItem("active","1")},methods:{closeStatusBar(){this.bannerVisible=!1}}});var A=S(7592);const $=(0,s.A)(u,[["render",r]]);const b=()=>(0,e.createApp)($),B=b();B.mount("#vue-app"),window.addEventListener("remount",()=>{B.unmount(),b().mount("#vue-app")})})();var K=this;for(var j in U)K[j]=U[j];U.__esModule&&Object.defineProperty(K,"__esModule",{value:!0})})();
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
