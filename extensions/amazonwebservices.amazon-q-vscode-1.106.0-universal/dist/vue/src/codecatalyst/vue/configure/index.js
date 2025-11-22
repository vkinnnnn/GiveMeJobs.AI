(()=>{var ie={5810:(e,o,n)=>{"use strict";n.r(o),n.d(o,{default:()=>b});var a=n(6758),i=n.n(a),c=n(935),y=n.n(c),f=y()(i());f.push([e.id,`
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
`,""]);const b=f},7386:(e,o,n)=>{"use strict";n.r(o),n.d(o,{default:()=>b});var a=n(6758),i=n.n(a),c=n(935),y=n.n(c),f=y()(i());f.push([e.id,`
html[data-v-7b766e1c] {
    overflow-y: scroll;
}
body[data-v-7b766e1c] {
    padding-right: 12px;
}
#configure-header[data-v-7b766e1c] {
    padding: 16px 0 0 0;
    background-color: none;
    position: relative;
}
.notification[data-v-7b766e1c] {
    color: var(--vscode-notifications-foreground);
    background-color: var(--vscode-notifications-background);
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin: 16px 0;
    padding: 12px;
    box-shadow: 2px 2px 8px #111111;
    position: sticky;
}
#notification-span[data-v-7b766e1c] {
    display: flex;
    justify-content: left;
    align-items: inherit;
    width: 100%;
    flex-grow: 0;
}
#restart-button[data-v-7b766e1c] {
    font-size: small;
    width: 100px;
    flex-grow: 1;
}
#info-notification-icon[data-v-7b766e1c] {
    color: var(--vscode-notificationsInfoIcon-foreground);
}
.slide-down-enter-active[data-v-7b766e1c] {
    transition: all 0.4s ease-in-out;
}
.slide-down-leave-active[data-v-7b766e1c] {
    transition: none;
}
.slide-down-enter-from[data-v-7b766e1c] {
    margin-bottom: -70px;
    transform: translateY(-70px);
    top: -70px;
}
.slide-down-enter-to[data-v-7b766e1c] {
    margin-bottom: 0px;
    top: 16px;
}
#restart-notification[data-v-7b766e1c] {
    z-index: 1;
    top: 16px;
}
`,""]);const b=f},215:(e,o,n)=>{"use strict";n.r(o),n.d(o,{default:()=>b});var a=n(6758),i=n.n(a),c=n(935),y=n.n(c),f=y()(i());f.push([e.id,`
#summary-grid[data-v-1cf5742c] {
    display: grid;
    justify-content: left;
    grid-template-areas:
        'alias branch'
        'status project';
    gap: 16px 160px;
}
#edit-compute-settings[data-v-1cf5742c] {
    margin-top: 16px;
}

/* TODO: darker green for light-theme ??? */
#status[data-connected='true'][data-v-1cf5742c] {
    color: var(--vscode-testing-iconPassed);
}
#connected-icon[data-v-1cf5742c] {
    padding: 4px;
    vertical-align: -0.2em;
}
#stop-icon[data-v-1cf5742c] {
    color: var(--vscode-debugIcon-stopForeground);
    margin-right: 5px;
    vertical-align: -0.2em;
}
`,""]);const b=f},163:(e,o,n)=>{"use strict";n.r(o),n.d(o,{default:()=>b});var a=n(6758),i=n.n(a),c=n(935),y=n.n(c),f=y()(i());f.push([e.id,`
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
`,""]);const b=f},935:e=>{"use strict";e.exports=function(o){var n=[];return n.toString=function(){return this.map(function(i){var c="",y=typeof i[5]<"u";return i[4]&&(c+="@supports (".concat(i[4],") {")),i[2]&&(c+="@media ".concat(i[2]," {")),y&&(c+="@layer".concat(i[5].length>0?" ".concat(i[5]):""," {")),c+=o(i),y&&(c+="}"),i[2]&&(c+="}"),i[4]&&(c+="}"),c}).join("")},n.i=function(i,c,y,f,b){typeof i=="string"&&(i=[[null,i,void 0]]);var V={};if(y)for(var M=0;M<this.length;M++){var $=this[M][0];$!=null&&(V[$]=!0)}for(var O=0;O<i.length;O++){var v=[].concat(i[O]);y&&V[v[0]]||(typeof b<"u"&&(typeof v[5]>"u"||(v[1]="@layer".concat(v[5].length>0?" ".concat(v[5]):""," {").concat(v[1],"}")),v[5]=b),c&&(v[2]&&(v[1]="@media ".concat(v[2]," {").concat(v[1],"}")),v[2]=c),f&&(v[4]?(v[1]="@supports (".concat(v[4],") {").concat(v[1],"}"),v[4]=f):v[4]="".concat(f)),n.push(v))}},n}},6758:e=>{"use strict";e.exports=function(o){return o[1]}},7433:(e,o)=>{"use strict";var n;n={value:!0},o.A=(a,i)=>{const c=a.__vccOpts||a;for(const[y,f]of i)c[y]=f;return c}},3470:(e,o,n)=>{var a=n(5810);a.__esModule&&(a=a.default),typeof a=="string"&&(a=[[e.id,a,""]]),a.locals&&(e.exports=a.locals);var i=n(611).A,c=i("816894a6",a,!1,{})},6990:(e,o,n)=>{var a=n(7386);a.__esModule&&(a=a.default),typeof a=="string"&&(a=[[e.id,a,""]]),a.locals&&(e.exports=a.locals);var i=n(611).A,c=i("c344926e",a,!1,{})},675:(e,o,n)=>{var a=n(215);a.__esModule&&(a=a.default),typeof a=="string"&&(a=[[e.id,a,""]]),a.locals&&(e.exports=a.locals);var i=n(611).A,c=i("7c5c4db1",a,!1,{})},2671:(e,o,n)=>{var a=n(163);a.__esModule&&(a=a.default),typeof a=="string"&&(a=[[e.id,a,""]]),a.locals&&(e.exports=a.locals);var i=n(611).A,c=i("48160952",a,!1,{})},611:(e,o,n)=>{"use strict";n.d(o,{A:()=>J});function a(r,p){for(var _=[],l={},d=0;d<p.length;d++){var S=p[d],h=S[0],C=S[1],P=S[2],L=S[3],N={id:r+":"+d,css:C,media:P,sourceMap:L};l[h]?l[h].parts.push(N):_.push(l[h]={id:h,parts:[N]})}return _}var i=typeof document<"u";if(typeof DEBUG<"u"&&DEBUG&&!i)throw new Error("vue-style-loader cannot be used in a non-browser environment. Use { target: 'node' } in your Webpack config to indicate a server-rendering environment.");var c={},y=i&&(document.head||document.getElementsByTagName("head")[0]),f=null,b=0,V=!1,M=function(){},$=null,O="data-vue-ssr-id",v=typeof navigator<"u"&&/msie [6-9]\b/.test(navigator.userAgent.toLowerCase());function J(r,p,_,l){V=_,$=l||{};var d=a(r,p);return j(d),function(h){for(var C=[],P=0;P<d.length;P++){var L=d[P],N=c[L.id];N.refs--,C.push(N)}h?(d=a(r,h),j(d)):d=[];for(var P=0;P<C.length;P++){var N=C[P];if(N.refs===0){for(var B=0;B<N.parts.length;B++)N.parts[B]();delete c[N.id]}}}}function j(r){for(var p=0;p<r.length;p++){var _=r[p],l=c[_.id];if(l){l.refs++;for(var d=0;d<l.parts.length;d++)l.parts[d](_.parts[d]);for(;d<_.parts.length;d++)l.parts.push(K(_.parts[d]));l.parts.length>_.parts.length&&(l.parts.length=_.parts.length)}else{for(var S=[],d=0;d<_.parts.length;d++)S.push(K(_.parts[d]));c[_.id]={id:_.id,refs:1,parts:S}}}}function W(){var r=document.createElement("style");return r.type="text/css",y.appendChild(r),r}function K(r){var p,_,l=document.querySelector("style["+O+'~="'+r.id+'"]');if(l){if(V)return M;l.parentNode.removeChild(l)}if(v){var d=b++;l=f||(f=W()),p=H.bind(null,l,d,!1),_=H.bind(null,l,d,!0)}else l=W(),p=Q.bind(null,l),_=function(){l.parentNode.removeChild(l)};return p(r),function(h){if(h){if(h.css===r.css&&h.media===r.media&&h.sourceMap===r.sourceMap)return;p(r=h)}else _()}}var Y=function(){var r=[];return function(p,_){return r[p]=_,r.filter(Boolean).join(`
`)}}();function H(r,p,_,l){var d=_?"":l.css;if(r.styleSheet)r.styleSheet.cssText=Y(p,d);else{var S=document.createTextNode(d),h=r.childNodes;h[p]&&r.removeChild(h[p]),h.length?r.insertBefore(S,h[p]):r.appendChild(S)}}function Q(r,p){var _=p.css,l=p.media,d=p.sourceMap;if(l&&r.setAttribute("media",l),$.ssrId&&r.setAttribute(O,p.id),d&&(_+=`
/*# sourceURL=`+d.sources[0]+" */",_+=`
/*# sourceMappingURL=data:application/json;base64,`+btoa(unescape(encodeURIComponent(JSON.stringify(d))))+" */"),r.styleSheet)r.styleSheet.cssText=_;else{for(;r.firstChild;)r.removeChild(r.firstChild);r.appendChild(document.createTextNode(_))}}}},ee={};function D(e){var o=ee[e];if(o!==void 0)return o.exports;var n=ee[e]={id:e,exports:{}};return ie[e](n,n.exports,D),n.exports}D.n=e=>{var o=e&&e.__esModule?()=>e.default:()=>e;return D.d(o,{a:o}),o},D.d=(e,o)=>{for(var n in o)D.o(o,n)&&!D.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:o[n]})},D.o=(e,o)=>Object.prototype.hasOwnProperty.call(e,o),D.r=e=>{typeof Symbol<"u"&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var X={};(()=>{"use strict";const e=Vue,o=t=>((0,e.pushScopeId)("data-v-7b766e1c"),t=t(),(0,e.popScopeId)(),t),n={id:"configure-header"},a={style:{display:"inline"}},i=o(()=>(0,e.createElementVNode)("br",null,null,-1)),c={key:0,id:"restart-notification",class:"notification"},y=o(()=>(0,e.createElementVNode)("span",{id:"notification-span"},[(0,e.createElementVNode)("span",{id:"info-notification-icon",class:"icon icon-lg icon-vscode-info mr-8"}),(0,e.createElementVNode)("span",null,"Restart your Dev Environment to update with changes.")],-1)),f=["disabled"];function b(t,s,u,m,E,T){const g=(0,e.resolveComponent)("summary-panel"),x=(0,e.resolveComponent)("settings-panel"),k=(0,e.resolveComponent)("devfile-panel"),q=(0,e.resolveComponent)("compute-panel");return(0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,null,[(0,e.createElementVNode)("div",n,[(0,e.createElementVNode)("h2",a,"Settings for "+(0,e.toDisplayString)(t.devenvName),1),i]),(0,e.createVNode)(e.Transition,{name:"slide-down"},{default:(0,e.withCtx)(()=>[t.canRestart?((0,e.openBlock)(),(0,e.createElementBlock)("div",c,[y,(0,e.createElementVNode)("button",{id:"restart-button",type:"button",class:"button-theme-primary ml-16",disabled:t.restarting,onClick:s[0]||(s[0]=A=>t.restart())},(0,e.toDisplayString)(t.restarting?"Restarting...":"Restart"),9,f)])):(0,e.createCommentVNode)("v-if",!0)]),_:1}),(0,e.createVNode)(x,{id:"summary-panel",title:"Details"},{default:(0,e.withCtx)(()=>[(0,e.createVNode)(g,{modelValue:t.details,"onUpdate:modelValue":s[1]||(s[1]=A=>t.details=A),onEditSettings:t.editCompute},null,8,["modelValue","onEditSettings"])]),_:1}),(0,e.createVNode)(x,{id:"dev-file-panel",title:"Devfile",description:`Contains the definition to build your application libraries and toolchain. You can change the currently 
        configured definition file.`},{default:(0,e.withCtx)(()=>[(0,e.createVNode)(k,{"file-path":t.definitionFilePath},null,8,["file-path"])]),_:1}),(0,e.createVNode)(x,{id:"compute-settings-panel",title:"Dev Environment Configuration",description:"All settings except Storage can be changed after creation."},{default:(0,e.withCtx)(()=>[(0,e.createVNode)(q,{modelValue:t.compute,"onUpdate:modelValue":s[2]||(s[2]=A=>t.compute=A),type:"configure",onEditSettings:t.editCompute},null,8,["modelValue","onEditSettings"])]),_:1})],64)}const V=t=>((0,e.pushScopeId)("data-v-1cf5742c"),t=t(),(0,e.popScopeId)(),t),M={id:"summary-grid"},$={id:"alias",style:{"grid-area":"alias"}},O=V(()=>(0,e.createElementVNode)("span",{class:"label-context soft"},"Alias",-1)),v={key:0,class:"mb-8",style:{display:"block"}},J=["disabled"],j={key:0,id:"branch",style:{"grid-area":"branch"}},W=V(()=>(0,e.createElementVNode)("span",{class:"label-context soft"},"Branch",-1)),K={class:"mb-8",style:{display:"block"}},Y={id:"project",style:{"grid-area":"project"}},H=V(()=>(0,e.createElementVNode)("span",{class:"label-context soft"},"Project",-1)),Q=["data-connected"],r=V(()=>(0,e.createElementVNode)("span",{class:"label-context soft"},"Status",-1)),p={key:0,id:"connected-icon",class:"icon icon-lg icon-vscode-pass"},_=["innerHTML"],l=["disabled"],d=V(()=>(0,e.createElementVNode)("span",{id:"stop-icon",class:"icon icon-lg icon-vscode-stop-circle"},null,-1)),S=["disabled"];function h(t,s,u,m,E,T){return(0,e.openBlock)(),(0,e.createElementBlock)("div",null,[(0,e.createElementVNode)("div",M,[(0,e.createElementVNode)("div",$,[O,t.summary.alias?((0,e.openBlock)(),(0,e.createElementBlock)("b",v,(0,e.toDisplayString)(t.summary.alias),1)):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("button",{id:"edit-alias",class:"button-theme-secondary",type:"button",disabled:!t.isConnected,onClick:s[0]||(s[0]=g=>t.$emit("editSettings","alias"))},(0,e.toDisplayString)(t.summary.alias?"Edit Alias":"Add Alias"),9,J)]),(0,e.createCommentVNode)("TODO: render something here if branch is missing"),t.branchName?((0,e.openBlock)(),(0,e.createElementBlock)("div",j,[W,(0,e.createElementVNode)("b",K,(0,e.toDisplayString)(t.branchName),1),(0,e.createElementVNode)("button",{class:"button-theme-secondary",onClick:s[1]||(s[1]=(...g)=>t.openBranch&&t.openBranch(...g))},[(0,e.createCommentVNode)("TODO: support 3P links?"),(0,e.createTextVNode)(" Open Branch in CodeCatalyst ")])])):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("div",Y,[H,(0,e.createElementVNode)("b",null,(0,e.toDisplayString)(t.summary.project.name),1)]),(0,e.createElementVNode)("div",{id:"status",style:{"grid-area":"status"},"data-connected":t.isConnected},[r,(0,e.createElementVNode)("b",null,[t.isConnected?((0,e.openBlock)(),(0,e.createElementBlock)("span",p)):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("span",{innerHTML:t.isConnected?"Connected":t.status},null,8,_)])],8,Q)]),(0,e.createElementVNode)("button",{id:"toggle-state",class:"button-theme-secondary mt-8",type:"button",disabled:!t.isConnected,onClick:s[2]||(s[2]=(...g)=>t.stopDevEnv&&t.stopDevEnv(...g))},[d,(0,e.createTextVNode)("Stop ")],8,l),(0,e.createCommentVNode)("TODO: add generic 'delete thing' prompt then enable this"),(0,e.withDirectives)((0,e.createElementVNode)("button",{id:"delete-devenv",class:"button-theme-secondary ml-8 mt-8",type:"button",disabled:!t.isConnected,onClick:s[3]||(s[3]=(...g)=>t.deleteDevEnv&&t.deleteDevEnv(...g))}," Delete Dev Environment ",8,S),[[e.vShow,!1]])])}class C{static registerGlobalCommands(){const s=new Event("remount");window.addEventListener("message",u=>{const{command:m}=u.data;if(m==="$clear"){vscode.setState({});for(const E of this.messageListeners)this.removeListener(E);window.dispatchEvent(s)}})}static addListener(s){this.messageListeners.add(s),window.addEventListener("message",s)}static removeListener(s){this.messageListeners.delete(s),window.removeEventListener("message",s)}static sendRequest(s,u,m){const E=JSON.parse(JSON.stringify(m)),T=new Promise((g,x)=>{const k=A=>{const U=A.data;if(s===U.id)if(this.removeListener(k),window.clearTimeout(q),U.error===!0){const Ke=JSON.parse(U.data);x(new Error(Ke.message))}else U.event?(typeof m[0]!="function"&&x(new Error(`Expected frontend event handler to be a function: ${u}`)),g(this.registerEventHandler(u,m[0]))):g(U.data)},q=setTimeout(()=>{this.removeListener(k),x(new Error(`Timed out while waiting for response: id: ${s}, command: ${u}`))},3e5);this.addListener(k)});return vscode.postMessage({id:s,command:u,data:E}),T}static registerEventHandler(s,u){const m=E=>{const T=E.data;if(T.command===s){if(!T.event)throw new Error(`Expected backend handler to be an event emitter: ${s}`);u(T.data)}};return this.addListener(m),{dispose:()=>this.removeListener(m)}}static create(){return this.initialized||(this.initialized=!0,this.registerGlobalCommands()),new Proxy({},{set:()=>{throw new TypeError("Cannot set property to webview client")},get:(s,u)=>{if(typeof u!="string"){console.warn(`Tried to index webview client with non-string property: ${String(u)}`);return}if(u==="init"){const E=vscode.getState()??{};if(E.__once)return()=>Promise.resolve();vscode.setState(Object.assign(E,{__once:!0}))}const m=(this.counter++).toString();return(...E)=>this.sendRequest(m,u,E)}})}}C.counter=0,C.initialized=!1,C.messageListeners=new Set;function P(t){return class{constructor(s={}){Object.assign(this,t,s)}}}function L(t){return Object}const N=C.create(),B=P({org:{name:""},project:{name:""},repositories:[],status:"",id:""}),re=(0,e.defineComponent)({name:"devenv-summary",props:{modelValue:{type:L(B),required:!0}},emits:{editSettings:t=>t!==void 0,"update:modelValue":t=>t!==void 0},computed:{status(){return this.summary.status.charAt(0).concat(this.summary.status.slice(1).toLowerCase())},isConnected(){return this.summary.status==="RUNNING"},summary(){return this.modelValue},branchName(){return this.summary.repositories[0]?.branchName}},methods:{update(t,s){this.$emit("update:modelValue",{...this.modelValue,[t]:s})},async stopDevEnv(){try{this.update("status","STOPPING"),await N.stopDevEnv(this.summary)}catch{this.update("status","RUNNING")}},async deleteDevEnv(){try{this.update("status","DELETING"),await N.deleteDevEnv(this.summary)}catch{this.update("status","RUNNING")}},async openBranch(){return N.openBranch()}}});var He=D(675),R=D(7433);const de=(0,R.A)(re,[["render",h],["__scopeId","data-v-1cf5742c"]]),z=t=>((0,e.pushScopeId)("data-v-6c191c15"),t=t(),(0,e.popScopeId)(),t),ce={id:"compute-grid"},le={id:"size",style:{"grid-area":"size"}},_e=z(()=>(0,e.createElementVNode)("span",{class:"label-context soft"},"Compute",-1)),ue=z(()=>(0,e.createElementVNode)("br",null,null,-1)),pe={id:"timeout",style:{"grid-area":"timeout"}},me=z(()=>(0,e.createElementVNode)("span",{class:"label-context soft"},"Timeout",-1)),ve={id:"volume",style:{"grid-area":"volume"}},fe=z(()=>(0,e.createElementVNode)("span",{class:"label-context soft"},"Storage",-1)),he={key:0,class:"mt-0 mb-0"},ge={key:1};function ye(t,s,u,m,E,T){return(0,e.openBlock)(),(0,e.createElementBlock)("div",null,[(0,e.createElementVNode)("div",ce,[(0,e.createElementVNode)("div",le,[(0,e.createElementVNode)("div",null,[_e,(0,e.createElementVNode)("b",null,(0,e.toDisplayString)(t.instance.name),1),ue,(0,e.createTextVNode)(" "+(0,e.toDisplayString)(t.instance.specs),1)]),(0,e.createElementVNode)("button",{type:"button",id:"edit-size",class:"button-theme-secondary mt-8",onClick:s[0]||(s[0]=g=>t.$emit("editSettings","instanceType"))}," Edit Compute ")]),(0,e.createElementVNode)("div",pe,[(0,e.createElementVNode)("div",null,[me,(0,e.createElementVNode)("b",null,(0,e.toDisplayString)(t.timeout),1)]),(0,e.createElementVNode)("button",{type:"button",id:"edit-timeout",class:"button-theme-secondary mt-8",onClick:s[1]||(s[1]=g=>t.$emit("editSettings","inactivityTimeoutMinutes"))}," Edit Timeout ")]),(0,e.createElementVNode)("div",ve,[fe,(0,e.createElementVNode)("b",null,(0,e.toDisplayString)(t.storage),1),t.mode==="update"?((0,e.openBlock)(),(0,e.createElementBlock)("p",he,(0,e.toDisplayString)(t.readonlyText),1)):((0,e.openBlock)(),(0,e.createElementBlock)("div",ge,[(0,e.createElementVNode)("button",{type:"button",id:"edit-storage",class:"button-theme-secondary mt-8",onClick:s[2]||(s[2]=g=>t.$emit("editSettings","persistentStorage"))}," Edit Storage Size ")]))])])])}const G=new Set;window.addEventListener("remount",()=>G.clear());const Z={created(){if(this.$data===void 0)return;const t=vscode.getState()??{};this.$options._count=(this.$options._count??0)+1;const s=this.id??`${this.name??`DEFAULT-${G.size}`}-${this.$options._count}`;if(this.$options._unid=s,G.has(s)){console.warn(`Component "${s}" already exists. State-saving functionality will be disabled.`);return}G.add(s);const u=t[s]??{};for(const m of Object.keys(this.$data))this.$data[m]=u[m]??this.$data[m];for(const m of Object.keys(this.$data))this.$watch(m,E=>{const T=vscode.getState()??{},g=Object.assign(T[s]??{},{[m]:E!==void 0?JSON.parse(JSON.stringify(E)):void 0});vscode.setState(Object.assign(T,{[s]:g}))},{deep:!0})}},Ee=C.create(),F={inactivityTimeoutMinutes:15,instanceType:"dev.standard1.small",persistentStorage:{sizeInGiB:16}},I=P(F),be=(0,e.defineComponent)({name:"compute-panel",props:{modelValue:{type:L(I),default:new I},mode:{type:String,default:"update"}},data(){return{changed:{},readonlyText:"Can't be changed after creation.",descriptions:{},originalData:void 0}},mixins:[Z],created(){Ee.getAllInstanceDescriptions().then(t=>this.descriptions=t)},watch:{model(t){if(!(t===void 0||this.originalData===void 0))for(const[s,u]of Object.entries(t))this.changed[s]=this.originalData[s]!==u},modelValue(){this.originalData??=this.modelValue}},methods:{getNeedsRestartText(t){return this.mode==="update"&&this.changed[t]?" (needs restart)":""}},computed:{model(){return this.modelValue},instance(){const t=this.model.instanceType,s=this.descriptions[t]?{...this.descriptions[t]}:{name:"",specs:""},u=this.getNeedsRestartText("instanceType")||(t===F.instanceType?" (default)":"");return s.name=`${s.name}${u}`,s},timeout(){const t=this.model.inactivityTimeoutMinutes,s=`${t} minutes`,u=this.getNeedsRestartText("inactivityTimeoutMinutes")||(t===F.inactivityTimeoutMinutes?" (default)":"");return`${s}${u}`},storage(){const t=this.model.persistentStorage.sizeInGiB,s=`${t} GB`,u=t===F.persistentStorage.sizeInGiB?" (default)":"";return`${s}${u}`}},emits:{editSettings:t=>t!==void 0}});var Fe=D(3470);const Se=(0,R.A)(be,[["render",ye],["__scopeId","data-v-6c191c15"]]),Je=t=>(_pushScopeId("data-v-3f832b9c"),t=t(),_popScopeId(),t),Ne=["id"],De={class:"header"},Ce=["id"],Te=["for"],Pe={class:"preload-transition collapse-button icon icon-vscode-chevron-up",ref:"icon"},Ve={class:"settings-title"},Oe={class:"soft no-spacing mt-8"},we={ref:"subPane",class:"sub-pane"};function Me(t,s,u,m,E,T){return(0,e.openBlock)(),(0,e.createElementBlock)("div",{id:t.id,class:"settings-panel"},[(0,e.createElementVNode)("div",De,[t.collapseable||t.startCollapsed?(0,e.withDirectives)(((0,e.openBlock)(),(0,e.createElementBlock)("input",{key:0,id:t.buttonId,style:{display:"none"},type:"checkbox","onUpdate:modelValue":s[0]||(s[0]=g=>t.collapsed=g)},null,8,Ce)),[[e.vModelCheckbox,t.collapsed]]):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("label",{for:t.buttonId,class:"panel-header"},[(0,e.createElementVNode)("i",Pe,null,512),(0,e.createElementVNode)("span",Ve,(0,e.toDisplayString)(t.title),1)],8,Te),(0,e.createElementVNode)("p",Oe,(0,e.toDisplayString)(t.description),1)]),(0,e.createVNode)(e.Transition,{onEnter:t.updateHeight,onBeforeLeave:t.updateHeight,name:t.collapseable||t.startCollapsed?"collapse":"",persisted:""},{default:(0,e.withCtx)(()=>[(0,e.withDirectives)((0,e.createElementVNode)("div",we,[(0,e.renderSlot)(t.$slots,"default",{},void 0,!0)],512),[[e.vShow,!t.collapsed]])]),_:3},8,["onEnter","onBeforeLeave","name"])],8,Ne)}let ne=0;const $e=(0,e.defineComponent)({name:"settings-panel",props:{id:String,startCollapsed:Boolean,collapseable:Boolean,title:String,description:String},data(){return ne+=1,{collapsed:this.$props.startCollapsed??!1,buttonId:`settings-panel-button-${ne}`,lastHeight:void 0}},mixins:[Z],methods:{updateHeight(t){t.style&&(this.lastHeight=t.scrollHeight,t.style.setProperty("--max-height",`${this.lastHeight}px`))}},mounted(){this.subPane=this.$refs.subPane,this.lastHeight=this.collapsed?this.lastHeight:this.subPane?.scrollHeight??this.lastHeight,this.$nextTick(()=>{setTimeout(()=>{this.$refs.icon?.classList.remove("preload-transition")},100)})}});var Ye=D(2671);const Be=(0,R.A)($e,[["render",Me],["__scopeId","data-v-3f832b9c"]]),xe={id:"location"},Le=(0,e.createElementVNode)("span",{class:"label-context soft"},"Location:",-1);function Ae(t,s,u,m,E,T){return(0,e.openBlock)(),(0,e.createElementBlock)(e.Fragment,null,[(0,e.createElementVNode)("div",xe,[Le,(0,e.createElementVNode)("b",null,(0,e.toDisplayString)(t.filePath),1)]),(0,e.createElementVNode)("button",{id:"preview-devfile",class:"button-theme-secondary no-wrap mt-8",type:"button",style:{"grid-area":"button"},onClick:s[0]||(s[0]=(...g)=>t.preview&&t.preview(...g))}," Open in Editor ")],64)}const Re=C.create(),Ie=(0,e.defineComponent)({name:"devfile",props:{filePath:String},methods:{preview(){Re.openDevfile()}}}),ke=(0,R.A)(Ie,[["render",Ae]]),w=C.create(),Ue={details:new B,definitionFilePath:"",devenvUrl:"",devfileStatus:"STABLE",compute:new I,restarting:!1,needsRestart:!1,branchUrl:""},je=(0,e.defineComponent)({name:"configure",components:{settingsPanel:Be,devfilePanel:ke,computePanel:Se,summaryPanel:de},mixins:[Z],data(){return Ue},computed:{devenvName(){const t=this.details.alias,s=this.details.repositories[0]?.branchName;return t??s??this.details.id},canRestart(){return(this.needsRestart||this.devfileStatus==="CHANGED")&&this.details.status==="RUNNING"}},created(){w.init().then(t=>{this.details=t?new B(t):this.details,this.compute=t?new I(t):this.compute}),w.onDidChangeDevfile(t=>{this.devfileStatus=t.status??this.devfileStatus}),this.definitionFilePath||w.getDevfileLocation().then(t=>this.definitionFilePath=t)},methods:{async editCompute(t){const s=this.compute[t],u={...this.compute,alias:this.details.alias},m=await w.editSetting(u,t);t!=="alias"?(this.needsRestart=this.needsRestart||s!==m[t],this.compute=new I(m)):m.alias&&(this.details.alias=m.alias,await w.updateDevEnv(this.details,{alias:this.details.alias}))},async restart(){this.restarting=!0;try{if(this.devfileStatus==="CHANGED"&&!this.needsRestart)return await w.updateDevfile(this.definitionFilePath);const t=await w.updateDevEnv(this.details,{instanceType:this.compute.instanceType,inactivityTimeoutMinutes:this.compute.inactivityTimeoutMinutes});this.restarting=!!t}catch{this.restarting=!1,w.showLogsMessage("Unable to update the dev Environment. View the logs for more information")}}}});var qe=D(6990);const We=(0,R.A)(je,[["render",b],["__scopeId","data-v-7b766e1c"]]);const ae=()=>(0,e.createApp)(We),oe=ae();oe.mount("#vue-app"),window.addEventListener("remount",()=>{oe.unmount(),ae().mount("#vue-app")})})();var te=this;for(var se in X)te[se]=X[se];X.__esModule&&Object.defineProperty(te,"__esModule",{value:!0})})();
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
