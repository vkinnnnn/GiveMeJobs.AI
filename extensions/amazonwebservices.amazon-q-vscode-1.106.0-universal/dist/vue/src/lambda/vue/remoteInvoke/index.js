(()=>{var q={4408:(e,i,d)=>{"use strict";d.r(i),d.d(i,{default:()=>_});var h=d(6758),u=d.n(h),m=d(935),k=d.n(m),C=k()(u());C.push([e.id,`/* Container and Layout */
.Icontainer[data-v-3f30c0a1] {
    margin-inline: auto;
    margin-top: 2rem;
    width: 100%;
    min-width: 650px;
}
h1[data-v-3f30c0a1] {
    text-align: left;
    margin-bottom: 20px;
}

/* Remove fixed width for divs to allow responsive behavior */
div[data-v-3f30c0a1] {
    width: 100%;
}

/* VSCode Settings Style Layout */
.vscode-setting-item[data-v-3f30c0a1] {
    margin-bottom: 10px;
    padding: 5px 0;
}
.setting-header[data-v-3f30c0a1] {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
}
.setting-title[data-v-3f30c0a1] {
    font-weight: 600;
    font-size: 14px;
    margin: 0;
}
.setting-body[data-v-3f30c0a1] {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}
.setting-description[data-v-3f30c0a1] {
    flex: 1;
}
.setting-description info-wrap[data-v-3f30c0a1],
.setting-description info[data-v-3f30c0a1] {
    display: block;
    margin-bottom: 4px;
}
.setting-description-full[data-v-3f30c0a1] {
    margin-bottom: 8px;
}
.setting-description-full info-wrap[data-v-3f30c0a1] {
    display: block;
    margin-bottom: 4px;
}
.setting-input-group-full[data-v-3f30c0a1] {
    display: flex;
    align-items: center;
    gap: 5px;
}
.setting-input[data-v-3f30c0a1] {
    flex-grow: 1;
    margin-right: 2px;
}

/* Form Layout Classes - Base grid layout shared by multiple classes */
.form-row[data-v-3f30c0a1],
.form-row-no-align[data-v-3f30c0a1] {
    display: grid;
    grid-template-columns: 150px 1fr;
    margin-bottom: 10px;
}
.form-row[data-v-3f30c0a1] {
    align-items: center;
}
.form-double-row[data-v-3f30c0a1] {
    display: grid;
    grid-template-rows: 20px 1fr;
    align-items: center;
}

/* Typography and Text Elements */
label[data-v-3f30c0a1] {
    font-weight: 500;
    font-size: 14px;
    margin-right: 10px;
}

/* Merge info and info-wrap as they share most properties */
info[data-v-3f30c0a1],
info-wrap[data-v-3f30c0a1] {
    color: var(--vscode-descriptionForeground);
    font-weight: 500;
    font-size: 13px;
    margin-right: 10px;
}
info[data-v-3f30c0a1] {
    text-wrap-mode: nowrap;
}

/* Form Elements */
span[data-v-3f30c0a1],
select[data-v-3f30c0a1] {
    display: block;
}
textarea[data-v-3f30c0a1] {
    color: var(--vscode-settings-textInputForeground);
    background: var(--vscode-settings-textInputBackground);
    border: 1px solid var(--vscode-settings-textInputBorder);
    width: 100%;
    box-sizing: border-box;
    resize: none;
}

/* Button Styles */
.button-theme-primary[data-v-3f30c0a1],
.button-theme-inline[data-v-3f30c0a1] {
    border: 1px solid var(--vscode-button-border);
}
.button-theme-primary[data-v-3f30c0a1] {
    padding: 8px 12px;
    color: var(--vscode-button-foreground);
    background: var(--vscode-button-background);
}
.button-theme-primary[data-v-3f30c0a1]:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
    cursor: pointer;
}
.button-theme-inline[data-v-3f30c0a1] {
    padding: 4px 6px;
    color: var(--vscode-button-secondaryForeground);
    background: var(--vscode-button-secondaryBackground);
}
.button-theme-inline[data-v-3f30c0a1]:hover:not(:disabled) {
    background: var(--vscode-button-secondaryHoverBackground);
    cursor: pointer;
}
button[data-v-3f30c0a1]:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Payload Section Styles */
.payload-button-group[data-v-3f30c0a1] {
    display: flex;
    gap: 5px;
    margin-bottom: 10px;
}
.payload-textarea[data-v-3f30c0a1] {
    width: 100%;
    min-height: 200px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    line-height: 1.5;
}

/* Collapsible Section */
.collapsible-section[data-v-3f30c0a1] {
    margin: 15px 0;
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
}
.collapsible-header[data-v-3f30c0a1],
.collapsible-content[data-v-3f30c0a1] {
    max-width: 96%;
}
.collapsible-header[data-v-3f30c0a1] {
    padding: 8px 12px;
    background-color: var(--vscode-sideBarSectionHeader-background);
    cursor: pointer;
    font-weight: 500;
}
.collapsible-content[data-v-3f30c0a1] {
    padding: 10px;
    border-top: 1px solid var(--vscode-widget-border);
}

/* Validation and Error Styles */
.input-error[data-v-3f30c0a1] {
    border: 1px solid var(--vscode-inputValidation-errorBorder) !important;
    background-color: var(--vscode-inputValidation-errorBackground) !important;
}
.error-message[data-v-3f30c0a1] {
    color: var(--vscode-inputValidation-errorForeground);
    font-size: 12px;
    margin-top: 4px;
    font-weight: 400;
    line-height: 1.2;
}

/* Checkbox and Status Styles */
.remote-debug-checkbox[data-v-3f30c0a1] {
    width: 18px !important;
    height: 18px !important;
    accent-color: var(--vscode-checkbox-foreground);
    border: 2px solid var(--vscode-checkbox-border) !important;
    border-radius: 3px !important;
    background-color: var(--vscode-checkbox-background) !important;
    cursor: pointer;
}
.remote-debug-checkbox[data-v-3f30c0a1]:checked {
    background-color: var(--vscode-checkbox-selectBackground) !important;
    border-color: var(--vscode-checkbox-selectBorder) !important;
}
.remote-debug-checkbox[data-v-3f30c0a1]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    border-color: var(--vscode-checkbox-border) !important;
    background-color: var(--vscode-input-background) !important;
}
.remote-debug-checkbox[data-v-3f30c0a1]:focus {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
}
`,""]);const _=C},935:e=>{"use strict";e.exports=function(i){var d=[];return d.toString=function(){return this.map(function(u){var m="",k=typeof u[5]<"u";return u[4]&&(m+="@supports (".concat(u[4],") {")),u[2]&&(m+="@media ".concat(u[2]," {")),k&&(m+="@layer".concat(u[5].length>0?" ".concat(u[5]):""," {")),m+=i(u),k&&(m+="}"),u[2]&&(m+="}"),u[4]&&(m+="}"),m}).join("")},d.i=function(u,m,k,C,_){typeof u=="string"&&(u=[[null,u,void 0]]);var x={};if(k)for(var P=0;P<this.length;P++){var L=this[P][0];L!=null&&(x[L]=!0)}for(var R=0;R<u.length;R++){var p=[].concat(u[R]);k&&x[p[0]]||(typeof _<"u"&&(typeof p[5]>"u"||(p[1]="@layer".concat(p[5].length>0?" ".concat(p[5]):""," {").concat(p[1],"}")),p[5]=_),m&&(p[2]&&(p[1]="@media ".concat(p[2]," {").concat(p[1],"}")),p[2]=m),C&&(p[4]?(p[1]="@supports (".concat(p[4],") {").concat(p[1],"}"),p[4]=C):p[4]="".concat(C)),d.push(p))}},d}},6758:e=>{"use strict";e.exports=function(i){return i[1]}},7433:(e,i)=>{"use strict";var d;d={value:!0},i.A=(h,u)=>{const m=h.__vccOpts||h;for(const[k,C]of u)m[k]=C;return m}},8692:(e,i,d)=>{var h=d(4408);h.__esModule&&(h=h.default),typeof h=="string"&&(h=[[e.id,h,""]]),h.locals&&(e.exports=h.locals);var u=d(611).A,m=u("ccd53888",h,!1,{})},611:(e,i,d)=>{"use strict";d.d(i,{A:()=>J});function h(n,c){for(var l=[],s={},r=0;r<c.length;r++){var D=c[r],v=D[0],B=D[1],E=D[2],F=D[3],S={id:n+":"+r,css:B,media:E,sourceMap:F};s[v]?s[v].parts.push(S):l.push(s[v]={id:v,parts:[S]})}return l}var u=typeof document<"u";if(typeof DEBUG<"u"&&DEBUG&&!u)throw new Error("vue-style-loader cannot be used in a non-browser environment. Use { target: 'node' } in your Webpack config to indicate a server-rendering environment.");var m={},k=u&&(document.head||document.getElementsByTagName("head")[0]),C=null,_=0,x=!1,P=function(){},L=null,R="data-vue-ssr-id",p=typeof navigator<"u"&&/msie [6-9]\b/.test(navigator.userAgent.toLowerCase());function J(n,c,l,s){x=l,L=s||{};var r=h(n,c);return O(r),function(v){for(var B=[],E=0;E<r.length;E++){var F=r[E],S=m[F.id];S.refs--,B.push(S)}v?(r=h(n,v),O(r)):r=[];for(var E=0;E<B.length;E++){var S=B[E];if(S.refs===0){for(var M=0;M<S.parts.length;M++)S.parts[M]();delete m[S.id]}}}}function O(n){for(var c=0;c<n.length;c++){var l=n[c],s=m[l.id];if(s){s.refs++;for(var r=0;r<s.parts.length;r++)s.parts[r](l.parts[r]);for(;r<l.parts.length;r++)s.parts.push($(l.parts[r]));s.parts.length>l.parts.length&&(s.parts.length=l.parts.length)}else{for(var D=[],r=0;r<l.parts.length;r++)D.push($(l.parts[r]));m[l.id]={id:l.id,refs:1,parts:D}}}}function I(){var n=document.createElement("style");return n.type="text/css",k.appendChild(n),n}function $(n){var c,l,s=document.querySelector("style["+R+'~="'+n.id+'"]');if(s){if(x)return P;s.parentNode.removeChild(s)}if(p){var r=_++;s=C||(C=I()),c=U.bind(null,s,r,!1),l=U.bind(null,s,r,!0)}else s=I(),c=K.bind(null,s),l=function(){s.parentNode.removeChild(s)};return c(n),function(v){if(v){if(v.css===n.css&&v.media===n.media&&v.sourceMap===n.sourceMap)return;c(n=v)}else l()}}var W=function(){var n=[];return function(c,l){return n[c]=l,n.filter(Boolean).join(`
`)}}();function U(n,c,l,s){var r=l?"":s.css;if(n.styleSheet)n.styleSheet.cssText=W(c,r);else{var D=document.createTextNode(r),v=n.childNodes;v[c]&&n.removeChild(v[c]),v.length?n.insertBefore(D,v[c]):n.appendChild(D)}}function K(n,c){var l=c.css,s=c.media,r=c.sourceMap;if(s&&n.setAttribute("media",s),L.ssrId&&n.setAttribute(R,c.id),r&&(l+=`
/*# sourceURL=`+r.sources[0]+" */",l+=`
/*# sourceMappingURL=data:application/json;base64,`+btoa(unescape(encodeURIComponent(JSON.stringify(r))))+" */"),n.styleSheet)n.styleSheet.cssText=l;else{for(;n.firstChild;)n.removeChild(n.firstChild);n.appendChild(document.createTextNode(l))}}}},Y={};function V(e){var i=Y[e];if(i!==void 0)return i.exports;var d=Y[e]={id:e,exports:{}};return q[e](d,d.exports,V),d.exports}V.n=e=>{var i=e&&e.__esModule?()=>e.default:()=>e;return V.d(i,{a:i}),i},V.d=(e,i)=>{for(var d in i)V.o(i,d)&&!V.o(e,d)&&Object.defineProperty(e,d,{enumerable:!0,get:i[d]})},V.o=(e,i)=>Object.prototype.hasOwnProperty.call(e,i),V.r=e=>{typeof Symbol<"u"&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var z={};(()=>{"use strict";const e=Vue,i=t=>((0,e.pushScopeId)("data-v-3f30c0a1"),t=t(),(0,e.popScopeId)(),t),d={class:"Icontainer"},h=i(()=>(0,e.createElementVNode)("div",null,[(0,e.createElementVNode)("h1",null,"Remote invoke configuration")],-1)),u={class:"form-row",style:{"justify-content":"flex-start",height:"28px","align-items":"center"}},m={class:"form-row",style:{"justify-content":"flex-start",height:"28px"}},k=i(()=>(0,e.createElementVNode)("label",null,"Resource ARN",-1)),C={class:"form-row"},_=i(()=>(0,e.createElementVNode)("label",null,"Region",-1)),x={key:0},P={class:"form-row"},L=i(()=>(0,e.createElementVNode)("label",null,"Runtime",-1)),R={class:"vscode-setting-item"},p={class:"setting-header"},J=i(()=>(0,e.createElementVNode)("label",{class:"setting-title"},"Remote debugging",-1)),O={class:"setting-body"},I=["disabled"],$={class:"setting-description"},W=i(()=>(0,e.createElementVNode)("a",{href:"https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/lambda-remote-debug.html"},"Learn more",-1)),U={key:0,class:"vscode-setting-item"},K=i(()=>(0,e.createElementVNode)("div",{class:"setting-header"},[(0,e.createElementVNode)("label",{class:"setting-title"},"Local root path")],-1)),n={class:"setting-description-full"},c=i(()=>(0,e.createElementVNode)("b",null,"open handler",-1)),l=i(()=>(0,e.createElementVNode)("b",null,"Browse",-1)),s=i(()=>(0,e.createElementVNode)("b",null,"Download",-1)),r=i(()=>(0,e.createElementVNode)("b",null,"Browse",-1)),D={class:"setting-input-group-full"},v=["disabled","title"],B={key:1,class:"collapsible-section"},E={key:0,class:"collapsible-content"},F={class:"form-row-no-align"},S=i(()=>(0,e.createElementVNode)("label",null,"Remote root path",-1)),M={class:"form-double-row"},ee={class:"form-row-no-align"},te=i(()=>(0,e.createElementVNode)("label",null,"Debug port",-1)),oe={class:"form-double-row"},ae=["placeholder","title"],ie={key:0,class:"error-message"},ne={key:0,class:"form-row"},re=i(()=>(0,e.createElementVNode)("label",{for:"shouldPublishVersionCheckbox"},"Publish version",-1)),se={style:{"align-items":"center"}},le={class:"form-row"},de=i(()=>(0,e.createElementVNode)("label",null,"Other debug params",-1)),ue={class:"form-double-row"},ce={key:0,class:"error-message"},ge={key:1,class:"form-row"},me=i(()=>(0,e.createElementVNode)("label",null,"Timeout override",-1)),pe={class:"form-double-row"},be={key:0,class:"error-message"},he={key:2,class:"form-row"},fe=i(()=>(0,e.createElementVNode)("label",null,"Layer override",-1)),ve={class:"form-double-row"},ye={key:0,class:"error-message"},De={key:3,class:"form-row"},we=i(()=>(0,e.createElementVNode)("label",{for:"sourceMapCheckbox"},"Source map",-1)),ke={style:{"align-items":"center"}},Ce={key:4,class:"form-row"},Se=i(()=>(0,e.createElementVNode)("label",null,"Skip files",-1)),Ne={key:5,class:"form-row"},Ee=i(()=>(0,e.createElementVNode)("label",null,"Out files",-1)),Ve={key:6,class:"form-row"},_e=i(()=>(0,e.createElementVNode)("label",{for:"justMyCodeCheckbox"},"Just my code",-1)),Te={style:{"align-items":"center"}},Re={key:7,class:"form-row"},xe=i(()=>(0,e.createElementVNode)("label",null,"Project name",-1)),Pe={class:"vscode-setting-item"},Le=i(()=>(0,e.createElementVNode)("div",{class:"setting-header"},[(0,e.createElementVNode)("label",{class:"setting-title"},"Payload")],-1)),Be={class:"setting-description-full"},Fe=i(()=>(0,e.createElementVNode)("b",null,"Load sample event",-1)),Me=i(()=>(0,e.createElementVNode)("b",null,"Load local file",-1)),Ae=i(()=>(0,e.createElementVNode)("b",null,"Load remote event",-1)),Oe=i(()=>(0,e.createElementVNode)("b",null,"Save as remote event",-1)),Ie={class:"payload-button-group"},$e=["rows"];function Ue(t,o,f,b,w,T){const y=(0,e.resolveComponent)("info"),N=(0,e.resolveComponent)("info-wrap");return(0,e.openBlock)(),(0,e.createElementBlock)("div",d,[h,(0,e.createElementVNode)("div",u,[(0,e.createElementVNode)("div",null,[(0,e.createElementVNode)("button",{class:"button-theme-primary",onClick:o[0]||(o[0]=(...a)=>t.sendInput&&t.sendInput(...a))},"Remote Invoke")]),(0,e.createElementVNode)("div",null,[(0,e.createVNode)(y,null,{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)("Function Name: "+(0,e.toDisplayString)(t.initialData.FunctionName),1)]),_:1})])]),(0,e.createElementVNode)("div",m,[k,(0,e.createVNode)(N,null,{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)((0,e.toDisplayString)(t.initialData.FunctionArn),1)]),_:1})]),(0,e.createElementVNode)("div",C,[_,(0,e.createVNode)(N,null,{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)((0,e.toDisplayString)(t.initialData.FunctionRegion)+" ",1),t.uiState.extraRegionInfo?((0,e.openBlock)(),(0,e.createElementBlock)("b",x,(0,e.toDisplayString)(t.uiState.extraRegionInfo),1)):(0,e.createCommentVNode)("v-if",!0)]),_:1})]),(0,e.createElementVNode)("div",P,[L,(0,e.createVNode)(y,null,{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)((0,e.toDisplayString)(t.initialData.Runtime),1)]),_:1})]),(0,e.createCommentVNode)(" Remote Debugging Configuration "),(0,e.createElementVNode)("div",null,[(0,e.createElementVNode)("div",R,[(0,e.createElementVNode)("div",p,[J,t.debugState.isDebugging?((0,e.openBlock)(),(0,e.createElementBlock)("button",{key:0,class:"button-theme-inline",onClick:o[1]||(o[1]=(...a)=>t.removeDebugSetup&&t.removeDebugSetup(...a)),style:{"margin-left":"10px"}}," Remove Debug Setup ")):(0,e.createCommentVNode)("v-if",!0),t.debugState.isDebugging&&t.debugState.showDebugTimer?((0,e.openBlock)(),(0,e.createBlock)(y,{key:1,style:{"margin-left":"10px"}},{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)("Auto remove after 60 second of inactive time")]),_:1})):(0,e.createCommentVNode)("v-if",!0)]),(0,e.createElementVNode)("div",O,[(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"checkbox",id:"attachDebugger","onUpdate:modelValue":o[2]||(o[2]=a=>t.debugState.remoteDebuggingEnabled=a),onChange:o[3]||(o[3]=(...a)=>t.debugPreCheck&&t.debugPreCheck(...a)),disabled:!t.initialData.runtimeSupportsRemoteDebug||!t.initialData.remoteDebugLayer||!t.initialData.LambdaFunctionNode?.configuration.SnapStart&&t.initialData.LambdaFunctionNode?.configuration.State!=="Active",class:"remote-debug-checkbox"},null,40,I),[[e.vModelCheckbox,t.debugState.remoteDebuggingEnabled]]),(0,e.createElementVNode)("div",$,[t.initialData.runtimeSupportsRemoteDebug&&t.initialData.remoteDebugLayer&&t.initialData.LambdaFunctionNode?.configuration.SnapStart?((0,e.openBlock)(),(0,e.createBlock)(N,{key:0},{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)(" Remote debugging is not recommended for production environments. The AWS Toolkit modifies your function by deploying it with an additional layer to enable remote debugging. Your local code breakpoints are then used to step through the remote function invocation. "),W]),_:1})):(0,e.createCommentVNode)("v-if",!0),!t.initialData.runtimeSupportsRemoteDebug&&!t.initialData.remoteDebugLayer?((0,e.openBlock)(),(0,e.createBlock)(y,{key:1,style:{color:"var(--vscode-errorForeground)"}},{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)(" Runtime "+(0,e.toDisplayString)(t.initialData.Runtime)+" and region "+(0,e.toDisplayString)(t.initialData.FunctionRegion)+" don't support remote debugging yet ",1)]),_:1})):t.initialData.runtimeSupportsRemoteDebug?t.initialData.remoteDebugLayer?!t.initialData.LambdaFunctionNode?.configuration.SnapStart&&t.initialData.LambdaFunctionNode?.configuration.State!=="Active"?((0,e.openBlock)(),(0,e.createBlock)(y,{key:4,style:{color:"var(--vscode-errorForeground)"}},{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)(" Doesn't support remote debugging yet ")]),_:1})):(0,e.createCommentVNode)("v-if",!0):((0,e.openBlock)(),(0,e.createBlock)(y,{key:3,style:{color:"var(--vscode-errorForeground)"}},{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)(" Region "+(0,e.toDisplayString)(t.initialData.FunctionRegion)+" doesn't support remote debugging yet ",1)]),_:1})):((0,e.openBlock)(),(0,e.createBlock)(y,{key:2,style:{color:"var(--vscode-errorForeground)"}},{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)(" Runtime "+(0,e.toDisplayString)(t.initialData.Runtime)+" doesn't support remote debugging ",1)]),_:1}))])])]),t.debugState.remoteDebuggingEnabled?((0,e.openBlock)(),(0,e.createElementBlock)("div",U,[K,(0,e.createElementVNode)("div",n,[t.debugState.handlerFileAvailable?((0,e.openBlock)(),(0,e.createBlock)(N,{key:0},{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)(" Your handler file has been located. You can now "),c,(0,e.createTextVNode)(" to set breakpoints in this file for debugging. ")]),_:1})):t.initialData.supportCodeDownload?((0,e.openBlock)(),(0,e.createBlock)(N,{key:1},{default:(0,e.withCtx)(()=>[l,(0,e.createTextVNode)(" to specify the absolute path to your local directory that contains the handler file for debugging. Or "),s,(0,e.createTextVNode)(" the handler file from your deployed function. ")]),_:1})):((0,e.openBlock)(),(0,e.createBlock)(N,{key:2},{default:(0,e.withCtx)(()=>[r,(0,e.createTextVNode)(" to specify the absolute path to your local directory that contains the handler file for debugging. ")]),_:1}))]),(0,e.createElementVNode)("div",D,[(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"text","onUpdate:modelValue":o[4]||(o[4]=a=>t.debugConfig.localRootPath=a),placeholder:"Enter local root path",title:"The path to your local project root directory containing the source code",onInput:o[5]||(o[5]=(...a)=>t.openHandlerWithDelay&&t.openHandlerWithDelay(...a)),class:"setting-input"},null,544),[[e.vModelText,t.debugConfig.localRootPath]]),(0,e.createElementVNode)("button",{onClick:o[6]||(o[6]=(...a)=>t.openHandler&&t.openHandler(...a)),class:"button-theme-inline",disabled:!t.debugState.handlerFileAvailable,title:t.debugState.handlerFileAvailable?"Open handler file":"Handler file not found. Please specify the correct local root path first."}," Open Handler ",8,v),(0,e.createElementVNode)("button",{onClick:o[7]||(o[7]=(...a)=>t.promptForFolderLocation&&t.promptForFolderLocation(...a)),class:"button-theme-inline"},"Browse"),t.initialData.supportCodeDownload?((0,e.openBlock)(),(0,e.createElementBlock)("button",{key:0,onClick:o[8]||(o[8]=(...a)=>t.downloadRemoteCode&&t.downloadRemoteCode(...a)),class:"button-theme-inline"}," Download ")):(0,e.createCommentVNode)("v-if",!0)])])):(0,e.createCommentVNode)("v-if",!0),(0,e.createCommentVNode)(" Collapsible Remote Debug Additional Configuration "),t.debugState.remoteDebuggingEnabled?((0,e.openBlock)(),(0,e.createElementBlock)("div",B,[(0,e.createElementVNode)("div",{class:"collapsible-header",onClick:o[9]||(o[9]=(...a)=>t.toggleCollapsible&&t.toggleCollapsible(...a))},[(0,e.createElementVNode)("span",null,(0,e.toDisplayString)(t.uiState.isCollapsed?"\u25B6":"\u25BC")+" Remote debug additional configuration",1)]),t.uiState.isCollapsed?(0,e.createCommentVNode)("v-if",!0):((0,e.openBlock)(),(0,e.createElementBlock)("div",E,[(0,e.createElementVNode)("div",F,[S,(0,e.createElementVNode)("div",M,[(0,e.createVNode)(y,{style:{"margin-bottom":"3px"}},{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)("Specify path to code directory on remote Lambda function.")]),_:1}),(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"text","onUpdate:modelValue":o[10]||(o[10]=a=>t.debugConfig.remoteRootPath=a),placeholder:"Default to /var/task, the directory of your deployed lambda code",title:"The path to the code on the remote Lambda function"},null,512),[[e.vModelText,t.debugConfig.remoteRootPath]])])]),(0,e.createElementVNode)("div",ee,[te,(0,e.createElementVNode)("div",oe,[(0,e.createVNode)(y,{style:{"margin-bottom":"3px"}},{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)("Specify the network port used for the debugger connection.")]),_:1}),(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"number","onUpdate:modelValue":o[11]||(o[11]=a=>t.debugConfig.debugPort=a),onInput:o[12]||(o[12]=(...a)=>t.onDebugPortChange&&t.onDebugPortChange(...a)),placeholder:t.initialData.isLambdaRemote?"Default to 9229, the debug port that will be used for remote debugging":"Default to a random debug port",title:t.initialData.isLambdaRemote?"The network port used for the debugger connection (default to 9229)":"The network port used for the debugger connection (default to a random port)",class:(0,e.normalizeClass)({"input-error":t.debugPortError!==""})},null,42,ae),[[e.vModelText,t.debugConfig.debugPort]]),t.debugPortError?((0,e.openBlock)(),(0,e.createElementBlock)("div",ie,(0,e.toDisplayString)(t.debugPortError),1)):(0,e.createCommentVNode)("v-if",!0)])]),t.initialData.isLambdaRemote?((0,e.openBlock)(),(0,e.createElementBlock)("div",ne,[re,(0,e.createElementVNode)("div",se,[(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"checkbox",style:{"margin-right":"5px","vertical-align":"middle"},id:"shouldPublishVersionCheckbox","onUpdate:modelValue":o[13]||(o[13]=a=>t.debugConfig.shouldPublishVersion=a)},null,512),[[e.vModelCheckbox,t.debugConfig.shouldPublishVersion]]),(0,e.createVNode)(y,null,{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)("Debug with version. If unchecked, Debug $Latest")]),_:1})])])):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("div",le,[de,(0,e.createElementVNode)("div",ue,[(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"text","onUpdate:modelValue":o[14]||(o[14]=a=>t.debugConfig.otherDebugParams=a),placeholder:'{"smartStep":true,"resolveSourceMapLocations":["out/**/*.js"]}',title:"Additional debug parameters specific to the runtime",class:(0,e.normalizeClass)({"input-error":t.otherDebugParamsError!==""})},null,2),[[e.vModelText,t.debugConfig.otherDebugParams]]),t.otherDebugParamsError?((0,e.openBlock)(),(0,e.createElementBlock)("div",ce,(0,e.toDisplayString)(t.otherDebugParamsError),1)):(0,e.createCommentVNode)("v-if",!0)])]),t.initialData.isLambdaRemote?((0,e.openBlock)(),(0,e.createElementBlock)("div",ge,[me,(0,e.createElementVNode)("div",pe,[(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"number","onUpdate:modelValue":o[15]||(o[15]=a=>t.debugConfig.lambdaTimeout=a),placeholder:"Default to 900 (seconds), the time you can debug before lambda timeout, ",title:"Specify timeout you want for remote debugging",class:(0,e.normalizeClass)({"input-error":t.lambdaTimeoutError!==""})},null,2),[[e.vModelText,t.debugConfig.lambdaTimeout]]),t.lambdaTimeoutError?((0,e.openBlock)(),(0,e.createElementBlock)("div",be,(0,e.toDisplayString)(t.lambdaTimeoutError),1)):(0,e.createCommentVNode)("v-if",!0)])])):(0,e.createCommentVNode)("v-if",!0),t.initialData.isLambdaRemote?((0,e.openBlock)(),(0,e.createElementBlock)("div",he,[fe,(0,e.createElementVNode)("div",ve,[(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"text","onUpdate:modelValue":o[16]||(o[16]=a=>t.initialData.remoteDebugLayer=a),placeholder:"Specify debug layer you want for remote debugging",title:"Specify debug layer you want for remote debugging",class:(0,e.normalizeClass)({"input-error":t.lambdaLayerError!==""})},null,2),[[e.vModelText,t.initialData.remoteDebugLayer]]),t.lambdaLayerError?((0,e.openBlock)(),(0,e.createElementBlock)("div",ye,(0,e.toDisplayString)(t.lambdaLayerError),1)):(0,e.createCommentVNode)("v-if",!0)])])):(0,e.createCommentVNode)("v-if",!0),(0,e.createCommentVNode)(" Node.js/JavaScript specific fields "),t.hasRuntimePrefix("nodejs")?((0,e.openBlock)(),(0,e.createElementBlock)("div",De,[we,(0,e.createElementVNode)("div",ke,[(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"checkbox",style:{"margin-right":"5px","vertical-align":"middle"},id:"sourceMapCheckbox","onUpdate:modelValue":o[17]||(o[17]=a=>t.runtimeSettings.sourceMapEnabled=a)},null,512),[[e.vModelCheckbox,t.runtimeSettings.sourceMapEnabled]]),(0,e.createVNode)(y,null,{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)("Enable source map support")]),_:1})])])):(0,e.createCommentVNode)("v-if",!0),t.hasRuntimePrefix("nodejs")?((0,e.openBlock)(),(0,e.createElementBlock)("div",Ce,[Se,(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"text","onUpdate:modelValue":o[18]||(o[18]=a=>t.runtimeSettings.skipFiles=a),placeholder:"Default to /var/runtime/node_modules/**/*.js,<node_internals>/**/*.js",title:"The files to skip debugging"},null,512),[[e.vModelText,t.runtimeSettings.skipFiles]])])):(0,e.createCommentVNode)("v-if",!0),t.hasRuntimePrefix("nodejs")?((0,e.openBlock)(),(0,e.createElementBlock)("div",Ne,[Ee,(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"text","onUpdate:modelValue":o[19]||(o[19]=a=>t.runtimeSettings.outFiles=a),placeholder:"./dist/*,./build/*,./.aws-sam/build/<functionName>/*",title:"outFiles to parse sourceMap"},null,512),[[e.vModelText,t.runtimeSettings.outFiles]])])):(0,e.createCommentVNode)("v-if",!0),(0,e.createCommentVNode)(" Python specific fields "),t.hasRuntimePrefix("python")?((0,e.openBlock)(),(0,e.createElementBlock)("div",Ve,[_e,(0,e.createElementVNode)("div",Te,[(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"checkbox",style:{"margin-right":"5px","vertical-align":"middle"},id:"justMyCodeCheckbox","onUpdate:modelValue":o[20]||(o[20]=a=>t.runtimeSettings.justMyCode=a)},null,512),[[e.vModelCheckbox,t.runtimeSettings.justMyCode]]),(0,e.createVNode)(y,null,{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)("restricts debugging to user-written code only(ignore system lib)")]),_:1})])])):(0,e.createCommentVNode)("v-if",!0),(0,e.createCommentVNode)(" Java specific fields "),t.hasRuntimePrefix("java")?((0,e.openBlock)(),(0,e.createElementBlock)("div",Re,[xe,(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"text","onUpdate:modelValue":o[21]||(o[21]=a=>t.runtimeSettings.projectName=a),placeholder:"YourJavaProjectName",title:"The name of the Java project for debugging"},null,512),[[e.vModelText,t.runtimeSettings.projectName]])])):(0,e.createCommentVNode)("v-if",!0)]))])):(0,e.createCommentVNode)("v-if",!0)]),(0,e.createCommentVNode)(" Payload Section "),(0,e.createElementVNode)("div",Pe,[Le,(0,e.createElementVNode)("div",Be,[(0,e.createVNode)(N,null,{default:(0,e.withCtx)(()=>[(0,e.createTextVNode)(" Enter the JSON payload for your Lambda function invocation. You can "),Fe,(0,e.createTextVNode)(" from AWS event templates, "),Me,(0,e.createTextVNode)(" from your computer ")]),_:1}),t.initialData.isLambdaRemote?((0,e.openBlock)(),(0,e.createBlock)(N,{key:0},{default:(0,e.withCtx)(()=>[Ae,(0,e.createTextVNode)(" from your saved test events. You can "),Oe,(0,e.createTextVNode)(" to save the event below for future use")]),_:1})):(0,e.createCommentVNode)("v-if",!0)]),(0,e.createElementVNode)("div",Ie,[(0,e.createElementVNode)("button",{onClick:o[22]||(o[22]=(...a)=>t.loadSampleEvent&&t.loadSampleEvent(...a)),class:"button-theme-inline"},"Load sample event"),(0,e.createElementVNode)("button",{onClick:o[23]||(o[23]=(...a)=>t.promptForFileLocation&&t.promptForFileLocation(...a)),class:"button-theme-inline"},"Load local file"),t.initialData.isLambdaRemote?((0,e.openBlock)(),(0,e.createElementBlock)("button",{key:0,onClick:o[24]||(o[24]=(...a)=>t.loadRemoteTestEvents&&t.loadRemoteTestEvents(...a)),class:"button-theme-inline"}," Load remote event ")):(0,e.createCommentVNode)("v-if",!0),t.initialData.isLambdaRemote?((0,e.openBlock)(),(0,e.createElementBlock)("button",{key:1,onClick:o[25]||(o[25]=(...a)=>t.saveEvent&&t.saveEvent(...a)),class:"button-theme-inline"}," Save as remote event ")):(0,e.createCommentVNode)("v-if",!0)]),(0,e.withDirectives)((0,e.createElementVNode)("textarea",{class:"payload-textarea",rows:t.textareaRows,"onUpdate:modelValue":o[26]||(o[26]=a=>t.payloadData.sampleText=a),placeholder:'{"key": "value"}'},null,8,$e),[[e.vModelText,t.payloadData.sampleText]])])])}class j{static registerGlobalCommands(){const o=new Event("remount");window.addEventListener("message",f=>{const{command:b}=f.data;if(b==="$clear"){vscode.setState({});for(const w of this.messageListeners)this.removeListener(w);window.dispatchEvent(o)}})}static addListener(o){this.messageListeners.add(o),window.addEventListener("message",o)}static removeListener(o){this.messageListeners.delete(o),window.removeEventListener("message",o)}static sendRequest(o,f,b){const w=JSON.parse(JSON.stringify(b)),T=new Promise((y,N)=>{const a=Ye=>{const A=Ye.data;if(o===A.id)if(this.removeListener(a),window.clearTimeout(Ke),A.error===!0){const Ge=JSON.parse(A.data);N(new Error(Ge.message))}else A.event?(typeof b[0]!="function"&&N(new Error(`Expected frontend event handler to be a function: ${f}`)),y(this.registerEventHandler(f,b[0]))):y(A.data)},Ke=setTimeout(()=>{this.removeListener(a),N(new Error(`Timed out while waiting for response: id: ${o}, command: ${f}`))},3e5);this.addListener(a)});return vscode.postMessage({id:o,command:f,data:w}),T}static registerEventHandler(o,f){const b=w=>{const T=w.data;if(T.command===o){if(!T.event)throw new Error(`Expected backend handler to be an event emitter: ${o}`);f(T.data)}};return this.addListener(b),{dispose:()=>this.removeListener(b)}}static create(){return this.initialized||(this.initialized=!0,this.registerGlobalCommands()),new Proxy({},{set:()=>{throw new TypeError("Cannot set property to webview client")},get:(o,f)=>{if(typeof f!="string"){console.warn(`Tried to index webview client with non-string property: ${String(f)}`);return}if(f==="init"){const w=vscode.getState()??{};if(w.__once)return()=>Promise.resolve();vscode.setState(Object.assign(w,{__once:!0}))}const b=(this.counter++).toString();return(...w)=>this.sendRequest(b,f,w)}})}}j.counter=0,j.initialized=!1,j.messageListeners=new Set;const H=new Set;window.addEventListener("remount",()=>H.clear());const je={created(){if(this.$data===void 0)return;const t=vscode.getState()??{};this.$options._count=(this.$options._count??0)+1;const o=this.id??`${this.name??`DEFAULT-${H.size}`}-${this.$options._count}`;if(this.$options._unid=o,H.has(o)){console.warn(`Component "${o}" already exists. State-saving functionality will be disabled.`);return}H.add(o);const f=t[o]??{};for(const b of Object.keys(this.$data))this.$data[b]=f[b]??this.$data[b];for(const b of Object.keys(this.$data))this.$watch(b,w=>{const T=vscode.getState()??{},y=Object.assign(T[o]??{},{[b]:w!==void 0?JSON.parse(JSON.stringify(w)):void 0});vscode.setState(Object.assign(T,{[o]:y}))},{deep:!0})}};const g=j.create(),He={FunctionName:"",FunctionArn:"",FunctionRegion:"",InputSamples:[],FunctionMap:[],TestEvents:[],FunctionStack:"",Source:"",LambdaFunctionNode:void 0,supportCodeDownload:!0,runtimeSupportsRemoteDebug:!0,remoteDebugLayer:"",isLambdaRemote:!0},ze=(0,e.defineComponent)({data(){return{initialData:{...He},debugConfig:{debugPort:void 0,localRootPath:"",remoteRootPath:"/var/task",shouldPublishVersion:!0,lambdaTimeout:900,otherDebugParams:""},debugState:{isDebugging:!1,debugTimer:void 0,debugTimeRemaining:60,showDebugTimer:!1,handlerFileAvailable:!1,remoteDebuggingEnabled:!1},runtimeSettings:{sourceMapEnabled:!0,skipFiles:"/var/runtime/node_modules/**/*.js,<node_internals>/**",justMyCode:!0,projectName:"",outFiles:void 0},uiState:{isCollapsed:!0,extraRegionInfo:""},payloadData:{sampleText:"{}"}}},async created(){this.initialData=await g.init()??this.initialData,this.debugConfig.localRootPath=this.initialData.LocalRootPath??"",g.onStateChange(async()=>{await this.syncStateFromWorkspace()}),await this.syncStateFromWorkspace()},computed:{textareaRows(){if(!this.payloadData.sampleText)return 5;const t=this.payloadData.sampleText.split(`
`).length;let o=0;for(const b of this.payloadData.sampleText.split(`
`))b.length>60&&(o+=Math.floor(b.length/60));const f=t+o;return Math.max(5,Math.min(50,f))},debugPortError(){if(this.debugConfig.debugPort!==null&&this.debugConfig.debugPort!==void 0){const t=Number(this.debugConfig.debugPort);if(isNaN(t)||t<1||t>65535)return"Debug port must be between 1 and 65535"}return""},otherDebugParamsError(){if(this.debugConfig.otherDebugParams&&this.debugConfig.otherDebugParams.trim()!=="")try{JSON.parse(this.debugConfig.otherDebugParams)}catch{return"Other Debug Params must be a valid JSON object"}return""},lambdaTimeoutError(){if(this.debugConfig.lambdaTimeout!==void 0){const t=Number(this.debugConfig.lambdaTimeout);if(isNaN(t)||t<1||t>900)return"Timeout override must be between 1 and 900 seconds"}return""},lambdaLayerError(){if(this.initialData.remoteDebugLayer&&this.initialData.remoteDebugLayer.trim()!==""){const t=this.initialData.remoteDebugLayer.trim();if(!/^arn:aws:lambda:[a-z0-9-]+:\d{12}:layer:[a-zA-Z0-9-_]+:\d+$/.test(t))return"Layer ARN must be in the format: arn:aws:lambda:<region>:<account-id>:layer:<layer-name>:<version>";const f=t.split(":");if(f.length>=4){const b=f[3];if(this.initialData.FunctionRegion&&b!==this.initialData.FunctionRegion)return`Layer region (${b}) must match function region (${this.initialData.FunctionRegion})`}}return""}},methods:{hasRuntimePrefix(t){return(this.initialData.Runtime||"").startsWith(t)},async syncStateFromWorkspace(){try{if(this.uiState.extraRegionInfo=this.initialData.isLambdaRemote?"":"(LocalStack running)",this.debugState.isDebugging=await g.isWebViewDebugging(),this.debugConfig.localRootPath=await g.getLocalPath(),this.debugState.handlerFileAvailable=await g.getHandlerAvailable(),this.debugState.isDebugging){const t=await g.getIsInvoking();this.clearDebugTimer(),this.debugState.isDebugging&&!t&&await this.startDebugTimer()}else this.clearDebugTimer()}catch(t){console.error("Failed to sync state from workspace:",t)}},async saveEvent(){this.initialData.FunctionArn&&this.initialData.FunctionRegion&&await g.saveRemoteTestEvent(this.initialData.FunctionArn,this.initialData.FunctionRegion,this.payloadData.sampleText)},async promptForFileLocation(){const t=await g.promptFile();t&&(this.payloadData.sampleText=t.sample)},async promptForFolderLocation(){const t=await g.promptFolder();t&&(this.debugConfig.localRootPath=t,this.debugState.handlerFileAvailable=await g.getHandlerAvailable())},async debugPreCheck(){this.debugState.remoteDebuggingEnabled?(this.debugState.remoteDebuggingEnabled=await g.debugPreCheck(),this.debugConfig.localRootPath=await g.getLocalPath(),this.debugState.handlerFileAvailable=await g.getHandlerAvailable()):(this.debugState.remoteDebuggingEnabled=!1,this.debugState.isDebugging&&await g.stopDebugging())},async sendInput(){if(this.debugState.remoteDebuggingEnabled){if(this.debugConfig.lambdaTimeout&&(this.debugConfig.lambdaTimeout>900||this.debugConfig.lambdaTimeout<0)&&(this.debugConfig.lambdaTimeout=900),this.debugConfig.debugPort&&(this.debugConfig.debugPort>65535||this.debugConfig.debugPort<=0)&&(this.debugConfig.debugPort=9229),this.debugState.remoteDebuggingEnabled&&!await g.checkReadyToInvoke())return;const t=this.initialData.isLambdaRemote?9229:void 0;if(!this.debugState.isDebugging&&(this.debugState.isDebugging=await g.startDebugging({functionArn:this.initialData.FunctionArn,functionName:this.initialData.FunctionName,port:this.debugConfig.debugPort??t,sourceMap:this.runtimeSettings.sourceMapEnabled,localRoot:this.debugConfig.localRootPath,shouldPublishVersion:this.debugConfig.shouldPublishVersion,remoteRoot:this.debugConfig.remoteRootPath!==""?this.debugConfig.remoteRootPath:"/var/task",skipFiles:(this.runtimeSettings.skipFiles!==""?this.runtimeSettings.skipFiles:"<node_internals>/**").split(","),justMyCode:this.runtimeSettings.justMyCode,projectName:this.runtimeSettings.projectName,otherDebugParams:this.debugConfig.otherDebugParams,layerArn:this.initialData.remoteDebugLayer,lambdaTimeout:this.debugConfig.lambdaTimeout??900,outFiles:this.runtimeSettings.outFiles?.split(","),isLambdaRemote:this.initialData.isLambdaRemote??!0}),!this.debugState.isDebugging))return;this.debugState.showDebugTimer=!1}await g.invokeLambda(this.payloadData.sampleText,this.initialData.Source,this.debugState.remoteDebuggingEnabled),await this.syncStateFromWorkspace()},async removeDebugSetup(){this.debugState.isDebugging=await g.stopDebugging()},async startDebugTimer(){this.debugState.debugTimeRemaining=await g.getDebugTimeRemaining(),!(this.debugState.debugTimeRemaining<=0)&&(this.debugState.showDebugTimer=!0,this.debugState.debugTimer=window.setInterval(()=>{this.debugState.debugTimeRemaining--,this.debugState.debugTimeRemaining<=0&&this.clearDebugTimer()},1e3))},clearDebugTimer(){this.debugState.debugTimer&&(window.clearInterval(this.debugState.debugTimer),this.debugState.debugTimeRemaining=0,this.debugState.debugTimer=void 0,this.debugState.showDebugTimer=!1)},toggleCollapsible(){this.uiState.isCollapsed=!this.uiState.isCollapsed},async openHandler(){await g.tryOpenHandlerFile()},async openHandlerWithDelay(){const t=this.debugConfig.localRootPath;await new Promise(o=>setTimeout(o,1e3)),t===this.debugConfig.localRootPath&&(await g.tryOpenHandlerFile(this.debugConfig.localRootPath),this.debugState.handlerFileAvailable=await g.getHandlerAvailable())},async downloadRemoteCode(){try{const t=await g.downloadRemoteCode();t&&(this.debugConfig.localRootPath=t,this.debugState.handlerFileAvailable=await g.getHandlerAvailable())}catch(t){console.error("Failed to download remote code:",t)}},loadSampleEvent(){g.getSamplePayload().then(t=>{!t||(this.payloadData.sampleText=JSON.stringify(JSON.parse(t),void 0,4))},t=>{console.error("client.getSamplePayload failed: %s",t.message)})},async loadRemoteTestEvents(){if(this.initialData.FunctionArn&&this.initialData.FunctionRegion){const t=await g.selectRemoteTestEvent(this.initialData.FunctionArn,this.initialData.FunctionRegion);t&&(this.payloadData.sampleText=JSON.stringify(JSON.parse(t),void 0,4))}},onDebugPortChange(t){const o=t.target.value;o===""?this.debugConfig.debugPort=void 0:this.debugConfig.debugPort=Number(o)}},mixins:[je]});var Ze=V(8692),Je=V(7433);const We=(0,Je.A)(ze,[["render",Ue],["__scopeId","data-v-3f30c0a1"]]);const Z=()=>(0,e.createApp)(We),Q=Z();Q.mount("#vue-app"),window.addEventListener("remount",()=>{Q.unmount(),Z().mount("#vue-app")})})();var G=this;for(var X in z)G[X]=z[X];z.__esModule&&Object.defineProperty(G,"__esModule",{value:!0})})();
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
