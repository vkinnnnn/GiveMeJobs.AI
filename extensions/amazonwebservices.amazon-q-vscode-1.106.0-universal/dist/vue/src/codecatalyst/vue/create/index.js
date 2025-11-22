(()=>{var se={5810:(e,a,o)=>{"use strict";o.r(a),o.d(a,{default:()=>b});var n=o(6758),i=o.n(n),d=o(935),g=o.n(d),h=g()(i());h.push([e.id,`
#compute-grid[data-v-6c191c15] {
    display: grid;
    justify-content: left;
    grid-template-areas:
        'size vpc'
        'timeout volume';
    gap: 16px 24px;
}
#edit-compute-settings[data-v-6c191c15] {
    margin-top: 16px;
}
`,""]);const b=h},1147:(e,a,o)=>{"use strict";o.r(a),o.d(a,{default:()=>b});var n=o(6758),i=o.n(n),d=o(935),g=o.n(d),h=g()(i());h.push([e.id,`
html {
    overflow-y: scroll;
}
body {
    padding-right: 12px;
    max-width: 700px;
}
`,""]);const b=h},2482:(e,a,o)=>{"use strict";o.r(a),o.d(a,{default:()=>b});var n=o(6758),i=o.n(n),d=o(935),g=o.n(d),h=g()(i());h.push([e.id,`
#configure-header[data-v-3bb2cf6f] {
    padding: 16px 0 0 0;
    background-color: var(--vscode-editor-background);
    z-index: 1;
    position: relative;
}
#alias-input[data-v-3bb2cf6f] {
    min-width: 300px;
}
#submit-buttons[data-v-3bb2cf6f] {
    display: flex;
    justify-content: end;
    column-gap: 16px;
}
`,""]);const b=h},5662:(e,a,o)=>{"use strict";o.r(a),o.d(a,{default:()=>b});var n=o(6758),i=o.n(n),d=o(935),g=o.n(d),h=g()(i());h.push([e.id,`
.picker {
    min-width: 300px;
    width: 100%;
    box-sizing: border-box;
}
.source-pickers {
    margin-top: 16px;
    display: flex;
    flex-flow: wrap;
    column-gap: 16px;
}
.modes {
    display: flex;
    column-gap: 16px;
}
.flex-sizing {
    flex: 1;
}
.mode-container {
    display: flex;
    flex: 1;
    border: 1px solid gray;
    padding: 8px;
    max-width: calc((1 / 3 * 100%) - (2 / 3 * 32px));
    align-items: center;
}
.config-item {
    display: inline;
    margin-left: 8px;
}
.mode-container[data-disabled='false'] {
    border: 1px solid var(--vscode-focusBorder);
}
body.vscode-dark .mode-container[data-disabled='true'] .config-item {
    filter: brightness(0.8);
}
body.vscode-light .mode-container[data-disabled='true'] .config-item {
    filter: brightness(1.2);
}
#repository-url {
    min-width: 300px;
}
#branch-input {
    min-width: 300px;
    width: 100%;
    box-sizing: border-box;
}
.project-button {
    background-color: transparent;
    padding-left: 0;
    padding-right: 0;
    font-weight: bold;
}
.edit-icon {
    color: #0078d7;
}
`,""]);const b=h},163:(e,a,o)=>{"use strict";o.r(a),o.d(a,{default:()=>b});var n=o(6758),i=o.n(n),d=o(935),g=o.n(d),h=g()(i());h.push([e.id,`
.preload-transition[data-v-3f832b9c] {
    transition: none !important;
}
.settings-title[data-v-3f832b9c] {
    font-size: calc(1.1 * var(--vscode-font-size)); /* TODO: make this configurable */
    font-weight: bold;
    margin: 0;
    padding: 0;
}
.sub-pane[data-v-3f832b9c] {
    transition:
        max-height 0.5s,
        padding 0.5s;
    padding: 1rem;
    overflow: hidden;
}
[data-v-3f832b9c] .sub-pane div:first-child {
    margin-top: 0;
}
.collapse-leave-from[data-v-3f832b9c] {
    max-height: var(--max-height);
}
.collapse-leave-active[data-v-3f832b9c] {
    transition:
        max-height 0.5s,
        visibility 0.5s,
        padding 0.5s;
    visibility: hidden;
    padding: 0 1rem;
    max-height: 0;
}
.collapse-enter-active[data-v-3f832b9c] {
    transition:
        max-height 0.5s,
        padding 0.5s;
    max-height: 0;
    padding: 0 1rem;
}
.collapse-enter-to[data-v-3f832b9c] {
    max-height: var(--max-height);
    padding: 1rem;
}
.collapse-button[data-v-3f832b9c] {
    display: none;
}
input[type='checkbox'] ~ label .collapse-button[data-v-3f832b9c] {
    display: inline-block;
    width: 24px;
    height: 24px;
    margin: -4px 0 0 0;
    padding: 0;
    font-size: 2em;
    opacity: 0.8;
    color: var(--vscode-foreground);
    transition: transform 0.5s;
    transform: rotate(180deg);
    text-align: right;
}
input[type='checkbox']:checked ~ label .collapse-button[data-v-3f832b9c] {
    transform: rotate(90deg);
}
.settings-panel[data-v-3f832b9c] {
    background: var(--vscode-menu-background);
    margin: 16px 0;
}
.panel-header[data-v-3f832b9c] {
    display: flex;
    align-items: center;
    width: 100%;
}
`,""]);const b=h},935:e=>{"use strict";e.exports=function(a){var o=[];return o.toString=function(){return this.map(function(i){var d="",g=typeof i[5]<"u";return i[4]&&(d+="@supports (".concat(i[4],") {")),i[2]&&(d+="@media ".concat(i[2]," {")),g&&(d+="@layer".concat(i[5].length>0?" ".concat(i[5]):""," {")),d+=a(i),g&&(d+="}"),i[2]&&(d+="}"),i[4]&&(d+="}"),d}).join("")},o.i=function(i,d,g,h,b){typeof i=="string"&&(i=[[null,i,void 0]]);var M={};if(g)for(var O=0;O<this.length;O++){var k=this[O][0];k!=null&&(M[k]=!0)}for(var w=0;w<i.length;w++){var f=[].concat(i[w]);g&&M[f[0]]||(typeof b<"u"&&(typeof f[5]>"u"||(f[1]="@layer".concat(f[5].length>0?" ".concat(f[5]):""," {").concat(f[1],"}")),f[5]=b),d&&(f[2]&&(f[1]="@media ".concat(f[2]," {").concat(f[1],"}")),f[2]=d),h&&(f[4]?(f[1]="@supports (".concat(f[4],") {").concat(f[1],"}"),f[4]=h):f[4]="".concat(h)),o.push(f))}},o}},6758:e=>{"use strict";e.exports=function(a){return a[1]}},7433:(e,a)=>{"use strict";var o;o={value:!0},a.A=(n,i)=>{const d=n.__vccOpts||n;for(const[g,h]of i)d[g]=h;return d}},3470:(e,a,o)=>{var n=o(5810);n.__esModule&&(n=n.default),typeof n=="string"&&(n=[[e.id,n,""]]),n.locals&&(e.exports=n.locals);var i=o(611).A,d=i("816894a6",n,!1,{})},5740:(e,a,o)=>{var n=o(1147);n.__esModule&&(n=n.default),typeof n=="string"&&(n=[[e.id,n,""]]),n.locals&&(e.exports=n.locals);var i=o(611).A,d=i("d43e02ce",n,!1,{})},6518:(e,a,o)=>{var n=o(2482);n.__esModule&&(n=n.default),typeof n=="string"&&(n=[[e.id,n,""]]),n.locals&&(e.exports=n.locals);var i=o(611).A,d=i("ecde1922",n,!1,{})},3426:(e,a,o)=>{var n=o(5662);n.__esModule&&(n=n.default),typeof n=="string"&&(n=[[e.id,n,""]]),n.locals&&(e.exports=n.locals);var i=o(611).A,d=i("1a19c2a8",n,!1,{})},2671:(e,a,o)=>{var n=o(163);n.__esModule&&(n=n.default),typeof n=="string"&&(n=[[e.id,n,""]]),n.locals&&(e.exports=n.locals);var i=o(611).A,d=i("48160952",n,!1,{})},611:(e,a,o)=>{"use strict";o.d(a,{A:()=>H});function n(r,m){for(var c=[],u={},l=0;l<m.length;l++){var N=m[l],v=N[0],C=N[1],B=N[2],z=N[3],P={id:r+":"+l,css:C,media:B,sourceMap:z};u[v]?u[v].parts.push(P):c.push(u[v]={id:v,parts:[P]})}return c}var i=typeof document<"u";if(typeof DEBUG<"u"&&DEBUG&&!i)throw new Error("vue-style-loader cannot be used in a non-browser environment. Use { target: 'node' } in your Webpack config to indicate a server-rendering environment.");var d={},g=i&&(document.head||document.getElementsByTagName("head")[0]),h=null,b=0,M=!1,O=function(){},k=null,w="data-vue-ssr-id",f=typeof navigator<"u"&&/msie [6-9]\b/.test(navigator.userAgent.toLowerCase());function H(r,m,c,u){M=c,k=u||{};var l=n(r,m);return R(l),function(v){for(var C=[],B=0;B<l.length;B++){var z=l[B],P=d[z.id];P.refs--,C.push(P)}v?(l=n(r,v),R(l)):l=[];for(var B=0;B<C.length;B++){var P=C[B];if(P.refs===0){for(var W=0;W<P.parts.length;W++)P.parts[W]();delete d[P.id]}}}}function R(r){for(var m=0;m<r.length;m++){var c=r[m],u=d[c.id];if(u){u.refs++;for(var l=0;l<u.parts.length;l++)u.parts[l](c.parts[l]);for(;l<c.parts.length;l++)u.parts.push(I(c.parts[l]));u.parts.length>c.parts.length&&(u.parts.length=c.parts.length)}else{for(var N=[],l=0;l<c.parts.length;l++)N.push(I(c.parts[l]));d[c.id]={id:c.id,refs:1,parts:N}}}}function j(){var r=document.createElement("style");return r.type="text/css",g.appendChild(r),r}function I(r){var m,c,u=document.querySelector("style["+w+'~="'+r.id+'"]');if(u){if(M)return O;u.parentNode.removeChild(u)}if(f){var l=b++;u=h||(h=j()),m=U.bind(null,u,l,!1),c=U.bind(null,u,l,!0)}else u=j(),m=T.bind(null,u),c=function(){u.parentNode.removeChild(u)};return m(r),function(v){if(v){if(v.css===r.css&&v.media===r.media&&v.sourceMap===r.sourceMap)return;m(r=v)}else c()}}var X=function(){var r=[];return function(m,c){return r[m]=c,r.filter(Boolean).join(`
`)}}();function U(r,m,c,u){var l=c?"":u.css;if(r.styleSheet)r.styleSheet.cssText=X(m,l);else{var N=document.createTextNode(l),v=r.childNodes;v[m]&&r.removeChild(v[m]),v.length?r.insertBefore(N,v[m]):r.appendChild(N)}}function T(r,m){var c=m.css,u=m.media,l=m.sourceMap;if(u&&r.setAttribute("media",u),k.ssrId&&r.setAttribute(w,m.id),l&&(c+=`
/*# sourceURL=`+l.sources[0]+" */",c+=`
/*# sourceMappingURL=data:application/json;base64,`+btoa(unescape(encodeURIComponent(JSON.stringify(l))))+" */"),r.styleSheet)r.styleSheet.cssText=c;else{for(;r.firstChild;)r.removeChild(r.firstChild);r.appendChild(document.createTextNode(c))}}}},J={};function S(e){var a=J[e];if(a!==void 0)return a.exports;var o=J[e]={id:e,exports:{}};return se[e](o,o.exports,S),o.exports}S.n=e=>{var a=e&&e.__esModule?()=>e.default:()=>e;return S.d(a,{a}),a},S.d=(e,a)=>{for(var o in a)S.o(a,o)&&!S.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:a[o]})},S.o=(e,a)=>Object.prototype.hasOwnProperty.call(e,a),S.r=e=>{typeof Symbol<"u"&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var F={};(()=>{"use strict";const e=Vue,a=t=>((0,e.pushScopeId)("data-v-3bb2cf6f"),t=t(),(0,e.popScopeId)(),t),o=a(()=>(0,e.createElementVNode)("div",{id:"configure-header"},[(0,e.createElementVNode)("h1",null,"Create a CodeCatalyst Dev Environment"),(0,e.createCommentVNode)("TODO: add link"),(0,e.createElementVNode)("span",{style:{"font-size":"0.95em"}},[(0,e.createTextVNode)(" Create an on-demand AWS instance to work on your code in the cloud. "),(0,e.createElementVNode)("a",{href:"https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/codecatalyst-devenvironment.html"}," Learn more about CodeCatalyst Dev Environments. ")])],-1)),n=a(()=>(0,e.createElementVNode)("label",{class:"options-label soft mb-8",style:{display:"block"},for:"alias-input"},"Alias",-1)),i={id:"submit-buttons",class:"mb-16"},d=["disabled"],g=["disabled"];function h(t,s,_,y,E,V){const p=(0,e.resolveComponent)("source-panel"),$=(0,e.resolveComponent)("settings-panel"),A=(0,e.resolveComponent)("compute-panel");return(0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,null,[o,(0,e.createVNode)($,{id:"source-panel",title:"Source Code"},{default:(0,e.withCtx)(()=>[(0,e.createVNode)(p,{modelValue:t.source,"onUpdate:modelValue":s[0]||(s[0]=D=>t.source=D)},null,8,["modelValue"])]),_:1}),(0,e.createVNode)($,{id:"alias-panel",title:"Alias",description:"Enter an alias to identify the Dev Environment. (Optional but recommended)"},{default:(0,e.withCtx)(()=>[n,(0,e.withDirectives)((0,e.createElementVNode)("input",{id:"alias-input",type:"text","onUpdate:modelValue":s[1]||(s[1]=D=>t.alias=D)},null,512),[[e.vModelText,t.alias]])]),_:1}),(0,e.createVNode)($,{id:"configuration-panel",title:"Dev Environment Configuration",description:"All settings except Storage can be changed in settings after creation."},{default:(0,e.withCtx)(()=>[(0,e.createVNode)(A,{modelValue:t.compute,"onUpdate:modelValue":s[2]||(s[2]=D=>t.compute=D),mode:"create",onEditSettings:t.editCompute},null,8,["modelValue","onEditSettings"])]),_:1}),(0,e.createElementVNode)("div",i,[(0,e.createElementVNode)("button",{class:"button-theme-secondary",onClick:s[3]||(s[3]=(...D)=>t.cancel&&t.cancel(...D)),disabled:t.creating},"Cancel",8,d),(0,e.createElementVNode)("button",{onClick:s[4]||(s[4]=(...D)=>t.submit&&t.submit(...D)),disabled:!t.canCreate},(0,e.toDisplayString)(t.creating?"Creating...":"Create Dev Environment"),9,g)])],64)}const b=t=>((0,e.pushScopeId)("data-v-6c191c15"),t=t(),(0,e.popScopeId)(),t),M={id:"compute-grid"},O={id:"size",style:{"grid-area":"size"}},k=b(()=>(0,e.createElementVNode)("span",{class:"label-context soft"},"Compute",-1)),w=b(()=>(0,e.createElementVNode)("br",null,null,-1)),f={id:"timeout",style:{"grid-area":"timeout"}},H=b(()=>(0,e.createElementVNode)("span",{class:"label-context soft"},"Timeout",-1)),R={id:"volume",style:{"grid-area":"volume"}},j=b(()=>(0,e.createElementVNode)("span",{class:"label-context soft"},"Storage",-1)),I={key:0,class:"mt-0 mb-0"},X={key:1};function U(t,s,_,y,E,V){return(0,e.openBlock)(),(0,e.createElementBlock)("div",null,[(0,e.createElementVNode)("div",M,[(0,e.createElementVNode)("div",O,[(0,e.createElementVNode)("div",null,[k,(0,e.createElementVNode)("b",null,(0,e.toDisplayString)(t.instance.name),1),w,(0,e.createTextVNode)(" "+(0,e.toDisplayString)(t.instance.specs),1)]),(0,e.createElementVNode)("button",{type:"button",id:"edit-size",class:"button-theme-secondary mt-8",onClick:s[0]||(s[0]=p=>t.$emit("editSettings","instanceType"))}," Edit Compute ")]),(0,e.createElementVNode)("div",f,[(0,e.createElementVNode)("div",null,[H,(0,e.createElementVNode)("b",null,(0,e.toDisplayString)(t.timeout),1)]),(0,e.createElementVNode)("button",{type:"button",id:"edit-timeout",class:"button-theme-secondary mt-8",onClick:s[1]||(s[1]=p=>t.$emit("editSettings","inactivityTimeoutMinutes"))}," Edit Timeout ")]),(0,e.createElementVNode)("div",R,[j,(0,e.createElementVNode)("b",null,(0,e.toDisplayString)(t.storage),1),t.mode==="update"?((0,e.openBlock)(),(0,e.createElementBlock)("p",I,(0,e.toDisplayString)(t.readonlyText),1)):((0,e.openBlock)(),(0,e.createElementBlock)("div",X,[(0,e.createElementVNode)("button",{type:"button",id:"edit-storage",class:"button-theme-secondary mt-8",onClick:s[2]||(s[2]=p=>t.$emit("editSettings","persistentStorage"))}," Edit Storage Size ")]))])])])}class T{static registerGlobalCommands(){const s=new Event("remount");window.addEventListener("message",_=>{const{command:y}=_.data;if(y==="$clear"){vscode.setState({});for(const E of this.messageListeners)this.removeListener(E);window.dispatchEvent(s)}})}static addListener(s){this.messageListeners.add(s),window.addEventListener("message",s)}static removeListener(s){this.messageListeners.delete(s),window.removeEventListener("message",s)}static sendRequest(s,_,y){const E=JSON.parse(JSON.stringify(y)),V=new Promise((p,$)=>{const A=et=>{const L=et.data;if(s===L.id)if(this.removeListener(A),window.clearTimeout(D),L.error===!0){const tt=JSON.parse(L.data);$(new Error(tt.message))}else L.event?(typeof y[0]!="function"&&$(new Error(`Expected frontend event handler to be a function: ${_}`)),p(this.registerEventHandler(_,y[0]))):p(L.data)},D=setTimeout(()=>{this.removeListener(A),$(new Error(`Timed out while waiting for response: id: ${s}, command: ${_}`))},3e5);this.addListener(A)});return vscode.postMessage({id:s,command:_,data:E}),V}static registerEventHandler(s,_){const y=E=>{const V=E.data;if(V.command===s){if(!V.event)throw new Error(`Expected backend handler to be an event emitter: ${s}`);_(V.data)}};return this.addListener(y),{dispose:()=>this.removeListener(y)}}static create(){return this.initialized||(this.initialized=!0,this.registerGlobalCommands()),new Proxy({},{set:()=>{throw new TypeError("Cannot set property to webview client")},get:(s,_)=>{if(typeof _!="string"){console.warn(`Tried to index webview client with non-string property: ${String(_)}`);return}if(_==="init"){const E=vscode.getState()??{};if(E.__once)return()=>Promise.resolve();vscode.setState(Object.assign(E,{__once:!0}))}const y=(this.counter++).toString();return(...E)=>this.sendRequest(y,_,E)}})}}T.counter=0,T.initialized=!1,T.messageListeners=new Set;const r=new Set;window.addEventListener("remount",()=>r.clear());const c={created(){if(this.$data===void 0)return;const t=vscode.getState()??{};this.$options._count=(this.$options._count??0)+1;const s=this.id??`${this.name??`DEFAULT-${r.size}`}-${this.$options._count}`;if(this.$options._unid=s,r.has(s)){console.warn(`Component "${s}" already exists. State-saving functionality will be disabled.`);return}r.add(s);const _=t[s]??{};for(const y of Object.keys(this.$data))this.$data[y]=_[y]??this.$data[y];for(const y of Object.keys(this.$data))this.$watch(y,E=>{const V=vscode.getState()??{},p=Object.assign(V[s]??{},{[y]:E!==void 0?JSON.parse(JSON.stringify(E)):void 0});vscode.setState(Object.assign(V,{[s]:p}))},{deep:!0})}};function u(t){return class{constructor(s={}){Object.assign(this,t,s)}}}function l(t){return Object}const N=T.create(),v={inactivityTimeoutMinutes:15,instanceType:"dev.standard1.small",persistentStorage:{sizeInGiB:16}},C=u(v),B=(0,e.defineComponent)({name:"compute-panel",props:{modelValue:{type:l(C),default:new C},mode:{type:String,default:"update"}},data(){return{changed:{},readonlyText:"Can't be changed after creation.",descriptions:{},originalData:void 0}},mixins:[c],created(){N.getAllInstanceDescriptions().then(t=>this.descriptions=t)},watch:{model(t){if(!(t===void 0||this.originalData===void 0))for(const[s,_]of Object.entries(t))this.changed[s]=this.originalData[s]!==_},modelValue(){this.originalData??=this.modelValue}},methods:{getNeedsRestartText(t){return this.mode==="update"&&this.changed[t]?" (needs restart)":""}},computed:{model(){return this.modelValue},instance(){const t=this.model.instanceType,s=this.descriptions[t]?{...this.descriptions[t]}:{name:"",specs:""},_=this.getNeedsRestartText("instanceType")||(t===v.instanceType?" (default)":"");return s.name=`${s.name}${_}`,s},timeout(){const t=this.model.inactivityTimeoutMinutes,s=`${t} minutes`,_=this.getNeedsRestartText("inactivityTimeoutMinutes")||(t===v.inactivityTimeoutMinutes?" (default)":"");return`${s}${_}`},storage(){const t=this.model.persistentStorage.sizeInGiB,s=`${t} GB`,_=t===v.persistentStorage.sizeInGiB?" (default)":"";return`${s}${_}`}},emits:{editSettings:t=>t!==void 0}});var z=S(3470),P=S(7433);const oe=(0,P.A)(B,[["render",U],["__scopeId","data-v-6c191c15"]]),ne={class:"modes mb-16"},ae=["data-disabled"],ie=(0,e.createElementVNode)("span",{class:"ml-8 option-label",style:{padding:"0px"}},"Use an existing CodeCatalyst repository",-1),re=["data-disabled"],de=(0,e.createElementVNode)("span",{class:"ml-8 option-label",style:{padding:"0px"}},"Create an empty Dev Environment",-1),le={key:0,class:"source-pickers"},ce={class:"modes flex-sizing mt-16"},ue={class:"flex-sizing mt-8"},_e=(0,e.createElementVNode)("label",{class:"option-label soft"},"Space",-1),pe=(0,e.createElementVNode)("span",{class:"icon icon-lg icon-vscode-edit edit-icon"},null,-1),me={class:"flex-sizing mt-8"},he=(0,e.createElementVNode)("label",{class:"option-label soft"},"Project",-1),fe=["disabled"],ve=(0,e.createElementVNode)("span",{class:"icon icon-lg icon-vscode-edit edit-icon"},null,-1),ge={class:"modes flex-sizing mt-16"},ye={class:"flex-sizing"},be=(0,e.createElementVNode)("label",{class:"options-label soft mb-8",style:{display:"block"},for:"branch-picker"},"Branch",-1),Ee=["disabled"],Pe={disabled:"",value:void 0},Se=["value"],Ne={class:"flex-sizing"},Ve=(0,e.createElementVNode)("label",{class:"options-label soft mb-8",style:{display:"block"},for:"branch-input"},"Create Branch - Optional for CodeCatalyst Repos",-1),Ce=["placeholder","disabled"],Be={key:0,class:"input-validation"},De={key:1,class:"source-pickers"},we={class:"modes flex-sizing mt-16"},Te={class:"flex-sizing mt-8"},Me=(0,e.createElementVNode)("label",{class:"option-label soft"},"Space",-1),Oe=(0,e.createElementVNode)("span",{class:"icon icon-lg icon-vscode-edit edit-icon"},null,-1),ke={class:"flex-sizing mt-8"},$e=(0,e.createElementVNode)("label",{class:"option-label soft"},"Project",-1),xe=["disabled"],Ae=(0,e.createElementVNode)("span",{class:"icon icon-lg icon-vscode-edit edit-icon"},null,-1);function Le(t,s,_,y,E,V){return(0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,null,[(0,e.createElementVNode)("div",ne,[(0,e.createElementVNode)("label",{class:"mode-container","data-disabled":t.model.type!=="linked"},[(0,e.withDirectives)((0,e.createElementVNode)("input",{class:"radio",type:"radio",name:"mode",id:"from-code-catalyst","onUpdate:modelValue":s[0]||(s[0]=p=>t.model.type=p),value:"linked"},null,512),[[e.vModelRadio,t.model.type]]),ie],8,ae),(0,e.createElementVNode)("label",{class:"mode-container","data-disabled":t.model.type!=="none"},[(0,e.withDirectives)((0,e.createElementVNode)("input",{class:"radio",type:"radio",name:"mode",id:"from-none","onUpdate:modelValue":s[1]||(s[1]=p=>t.model.type=p),value:"none"},null,512),[[e.vModelRadio,t.model.type]]),de],8,re)]),t.model.type==="linked"?((0,e.openBlock)(),(0,e.createElementBlock)("div",le,[(0,e.createElementVNode)("div",ce,[(0,e.createElementVNode)("span",ue,[_e,(0,e.createElementVNode)("button",{class:"project-button",onClick:s[2]||(s[2]=p=>t.quickPickSpace())},[(0,e.createTextVNode)((0,e.toDisplayString)(t.selectedSpaceName)+" ",1),pe])]),(0,e.createElementVNode)("span",me,[he,(0,e.createElementVNode)("button",{class:"project-button",onClick:s[3]||(s[3]=p=>t.quickPickProject()),disabled:!t.isSpaceSelected},[(0,e.createTextVNode)((0,e.toDisplayString)(t.selectedProjectName)+" ",1),ve],8,fe)])]),(0,e.createElementVNode)("div",ge,[(0,e.createCommentVNode)(" Existing branch "),(0,e.createElementVNode)("span",ye,[be,(0,e.withDirectives)((0,e.createElementVNode)("select",{id:"branch-picker",class:"picker",disabled:!t.model.selectedProject,"onUpdate:modelValue":s[4]||(s[4]=p=>t.model.selectedBranch=p),onInput:s[5]||(s[5]=(...p)=>t.update&&t.update(...p))},[(0,e.createElementVNode)("option",Pe,(0,e.toDisplayString)(t.branchPlaceholder),1),((0,e.openBlock)(!0),(0,e.createElementBlock)(e.Fragment,null,(0,e.renderList)(t.availableBranches,p=>((0,e.openBlock)(),(0,e.createElementBlock)("option",{key:p.id,value:p},(0,e.toDisplayString)(t.branchName(p)),9,Se))),128))],40,Ee),[[e.vModelSelect,t.model.selectedBranch]])]),(0,e.createCommentVNode)(" New Branch "),(0,e.createElementVNode)("span",Ne,[Ve,(0,e.withDirectives)((0,e.createElementVNode)("input",{id:"branch-input",type:"text",placeholder:t.newBranchNamePlaceholder,disabled:!t.newBranchNameAllowed,"onUpdate:modelValue":s[6]||(s[6]=p=>t.model.newBranch=p),onInput:s[7]||(s[7]=(...p)=>t.update&&t.update(...p))},null,40,Ce),[[e.vModelText,t.model.newBranch]]),t.branchError?((0,e.openBlock)(),(0,e.createElementBlock)("div",Be,(0,e.toDisplayString)(t.branchError),1)):(0,e.createCommentVNode)("v-if",!0)])])])):(0,e.createCommentVNode)("v-if",!0),t.model.type==="none"?((0,e.openBlock)(),(0,e.createElementBlock)("div",De,[(0,e.createElementVNode)("div",we,[(0,e.createElementVNode)("span",Te,[Me,(0,e.createElementVNode)("button",{class:"project-button",onClick:s[8]||(s[8]=p=>t.quickPickSpace())},[(0,e.createTextVNode)((0,e.toDisplayString)(t.selectedSpaceName)+" ",1),Oe])]),(0,e.createElementVNode)("span",ke,[$e,(0,e.createElementVNode)("button",{class:"project-button",onClick:s[9]||(s[9]=p=>t.quickPickProject()),disabled:!t.isSpaceSelected},[(0,e.createTextVNode)((0,e.toDisplayString)(t.selectedProjectName)+" ",1),Ae],8,xe)])])])):(0,e.createCommentVNode)("v-if",!0)],64)}const K=T.create();function Z(t){return t.type==="linked"?!!t.selectedProject&&!!t.selectedBranch&&!t.branchError:t.type==="none"?!!t.selectedProject:!1}const G=u({type:"linked"}),Re=(0,e.defineComponent)({name:"source-code",props:{modelValue:{type:l(G),default:new G}},data(){return{projects:[],branches:{},loadingProjects:!1,loadingBranches:{},newBranchNameAllowed:!1,newBranchNamePlaceholder:"Select branch first..."}},async created(){this.loadingProjects=!0},watch:{async"model.selectedProject"(t){this.useFirstBranch(),t&&!this.branches[t.name]&&(this.loadingBranches[t.name]=!0,this.branches[t.name]??=await K.getBranches(t).finally(()=>{this.loadingBranches[t.name]=!1}),this.useFirstBranch())},async"model.selectedBranch"(t){if(this.model.type!=="linked"||t===void 0){this.newBranchNameAllowed=!1,this.newBranchNamePlaceholder="";return}this.newBranchNameAllowed=!1,this.newBranchNamePlaceholder="Loading...";const s=this.model.newBranch;this.$emit("update:modelValue",{...this.model,newBranch:void 0}),await K.isThirdPartyRepo({spaceName:t.org.name,projectName:t.project.name,sourceRepositoryName:t.repo.name})?(this.newBranchNamePlaceholder="Not Applicable for Linked Repo",this.newBranchNameAllowed=!1,this.$emit("update:modelValue",{...this.model,newBranch:void 0})):(this.newBranchNamePlaceholder="branch-name",this.newBranchNameAllowed=!0,this.$emit("update:modelValue",{...this.model,newBranch:s}))}},computed:{model(){return this.modelValue},loading(){return this.model.type!=="linked"||!this.model.selectedProject?!1:this.loadingBranches[this.model.selectedProject.name]??!1},branchPlaceholder(){return this.loading?"Loading...":(this.availableBranches?.length??0)===0?"No branches found":"Select a branch"},availableBranches(){return this.model.type!=="linked"||!this.model.selectedProject?[]:this.branches[this.model.selectedProject.name]},branchError(){if(this.model.type!=="linked"||!this.model.newBranch)return;const t=this.model.newBranch;if(!!t&&this.availableBranches?.find(s=>s.name===`refs/heads/${t}`)!==void 0)return"Branch already exists"},isSpaceSelected(){return!!this.model.selectedSpace},isProjectSelected(){return!!this.model.selectedProject},selectedSpaceName(){return this.model.selectedSpace===void 0?"Not Selected":this.model.selectedSpace.name},selectedProjectName(){return this.model.selectedProject===void 0?"Not Selected":this.model.selectedProject.name}},methods:{update(){this.model.branchError=this.branchError,this.$emit("update:modelValue",this.model)},branchName(t){return`${t.repo.name} / ${t.name.replace("refs/heads/","")}`},useFirstBranch(){this.model.type==="linked"&&(Object.assign(this.model,{selectedBranch:this.availableBranches?.[0]}),this.update())},async quickPickSpace(){const t=await K.quickPickSpace();t!==void 0&&this.$emit("update:modelValue",{...this.modelValue,selectedSpace:t,selectedProject:void 0})},async quickPickProject(){const t=this.modelValue.selectedSpace;if(t===void 0)return;const s=await K.quickPickProject(t.name);s!==void 0&&this.$emit("update:modelValue",{...this.modelValue,selectedProject:s})}},emits:{"update:modelValue":t=>!0}});var st=S(3426);const je=(0,P.A)(Re,[["render",Le]]),nt=t=>(_pushScopeId("data-v-3f832b9c"),t=t(),_popScopeId(),t),Ie=["id"],Ue={class:"header"},ze=["id"],We=["for"],Ke={class:"preload-transition collapse-button icon icon-vscode-chevron-up",ref:"icon"},Fe={class:"settings-title"},He={class:"soft no-spacing mt-8"},Xe={ref:"subPane",class:"sub-pane"};function Ge(t,s,_,y,E,V){return(0,e.openBlock)(),(0,e.createElementBlock)("div",{id:t.id,class:"settings-panel"},[(0,e.createElementVNode)("div",Ue,[t.collapseable||t.startCollapsed?(0,e.withDirectives)(((0,e.openBlock)(),(0,e.createElementBlock)("input",{key:0,id:t.buttonId,style:{display:"none"},type:"checkbox","onUpdate:modelValue":s[0]||(s[0]=p=>t.collapsed=p)},null,8,ze)),[[e.vModelCheckbox,t.collapsed]]):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("label",{for:t.buttonId,class:"panel-header"},[(0,e.createElementVNode)("i",Ke,null,512),(0,e.createElementVNode)("span",Fe,(0,e.toDisplayString)(t.title),1)],8,We),(0,e.createElementVNode)("p",He,(0,e.toDisplayString)(t.description),1)]),(0,e.createVNode)(e.Transition,{onEnter:t.updateHeight,onBeforeLeave:t.updateHeight,name:t.collapseable||t.startCollapsed?"collapse":"",persisted:""},{default:(0,e.withCtx)(()=>[(0,e.withDirectives)((0,e.createElementVNode)("div",Xe,[(0,e.renderSlot)(t.$slots,"default",{},void 0,!0)],512),[[e.vShow,!t.collapsed]])]),_:3},8,["onEnter","onBeforeLeave","name"])],8,Ie)}let q=0;const Je=(0,e.defineComponent)({name:"settings-panel",props:{id:String,startCollapsed:Boolean,collapseable:Boolean,title:String,description:String},data(){return q+=1,{collapsed:this.$props.startCollapsed??!1,buttonId:`settings-panel-button-${q}`,lastHeight:void 0}},mixins:[c],methods:{updateHeight(t){t.style&&(this.lastHeight=t.scrollHeight,t.style.setProperty("--max-height",`${this.lastHeight}px`))}},mounted(){this.subPane=this.$refs.subPane,this.lastHeight=this.collapsed?this.lastHeight:this.subPane?.scrollHeight??this.lastHeight,this.$nextTick(()=>{setTimeout(()=>{this.$refs.icon?.classList.remove("preload-transition")},100)})}});var at=S(2671);const Qe=(0,P.A)(Je,[["render",Ge],["__scopeId","data-v-3f832b9c"]]),x=T.create(),Ye={source:new G,compute:new C,creating:!1,alias:""},Ze=(0,e.defineComponent)({name:"create",components:{settingsPanel:Qe,computePanel:oe,sourcePanel:je},mixins:[c],data(){return Ye},computed:{canCreate(){return!this.creating&&Z(this.source)}},created(){},watch:{"source.selectedProject"(){this.compute=new C}},methods:{async editCompute(t){const s={...this.compute,alias:this.alias},_=await x.editSetting(s,t,this.source.selectedProject?.org);t!=="alias"?this.compute=new C(_):_.alias!==void 0&&(this.alias=_.alias)},async submit(){if(!(!this.canCreate||!Z(this.source))){this.creating=!0;try{const t={...this.compute,alias:this.alias};await x.submit(t,this.source),x.close()}catch(t){t.message.match(/cancelled/i)||x.showLogsMessage(`Failed to create Dev Environment: ${t.message}`)}finally{this.creating=!1}}},cancel(){x.close()}}});var rt=S(5740),dt=S(6518);const qe=(0,P.A)(Ze,[["render",h],["__scopeId","data-v-3bb2cf6f"]]);const ee=()=>(0,e.createApp)(qe),te=ee();te.mount("#vue-app"),window.addEventListener("remount",()=>{te.unmount(),ee().mount("#vue-app")})})();var Q=this;for(var Y in F)Q[Y]=F[Y];F.__esModule&&Object.defineProperty(Q,"__esModule",{value:!0})})();
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
