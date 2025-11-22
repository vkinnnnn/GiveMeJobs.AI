(()=>{var J={6820:(e,c,n)=>{"use strict";n.r(c),n.d(c,{default:()=>j});var s=n(6758),d=n.n(s),f=n(935),_=n.n(f),y=n(4997),x=n(62),C=n.n(x),A=new URL(n(1821),n.b),T=new URL(n(6949),n.b),N=_()(d());N.i(y.A);var u=C()(A),O=C()(T);N.push([e.id,`/* Base styling sheet for standard tags and common classes */

/* Radio button */
input[type='radio'] {
    -webkit-appearance: none;
    display: inline-block;
    width: 16px;
    min-width: 16px;
    height: 16px;
    padding: 4px;
    border: 1px solid var(--vscode-settings-textInputForeground);
    background-clip: content-box;
    background-color: transparent;
    border-radius: 50%;
    margin: 0;
}
input[type='radio']:checked {
    background-color: var(--vscode-focusBorder);
    border: 1px solid var(--vscode-focusBorder);
}
input:focus:not(:focus-visible) {
    outline-color: transparent;
}

/* Checkbox */
/* TODO: use https://github.com/microsoft/vscode-webview-ui-toolkit */
input[type='checkbox'] {
    -webkit-appearance: none;
    display: inline-block;
    width: 16px;
    min-width: 16px;
    height: 16px;
    border: 1px solid var(--vscode-settings-checkboxBorder);
    border-radius: 20%;
    background-size: 16px;
    background-color: var(--vscode-settings-checkboxBackground);
    background-position: center;
    background-repeat: no-repeat;
    margin: 0;
}

body.vscode-dark input[type='checkbox']:checked {
    background-image: url(${u});
}

body.vscode-light input[type='checkbox']:checked {
    background-image: url(${O});
}

/* Placeholder */
::placeholder {
    color: var(--vscode-input-placeholderForeground);
}

/* Text/number input box */
input[type='text'],
input[type='password'],
input[type='number'] {
    color: var(--vscode-settings-textInputForeground);
    background: var(--vscode-settings-textInputBackground);
    border: 1px solid var(--vscode-settings-textInputBorder);
    padding: 4px 4px;
}
input[type='text'][data-invalid='true'],
input[type='password'][data-invalid='true'],
input[type='number'][data-invalid='true'] {
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-bottom: 0;
}
input:disabled {
    /* TODO: use VSC webcomponent library instead */
    filter: brightness(0.8);
}
.input-validation {
    color: var(--vscode-inputValidation-errorForeground);
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    padding: 4px 4px;
}

/* Select drop-down */
select {
    margin: 0px 0px;
    padding: 2px 0px;
    border-radius: 4px;
    border: 1px solid var(--vscode-settings-dropdownBorder);
    background: var(--vscode-settings-dropdownBackground);
    color: var(--vscode-settings-dropdownForeground);
}
select:invalid {
    color: var(--vscode-input-placeholderForeground);
}
option {
    color: var(--vscode-settings-dropdownForeground);
    background: var(--vscode-settings-dropdownBackground);
}

/* Header (for settings) (TODO: move to different sheet) */
.header {
    padding: 16px;
    display: flex;
    align-items: flex-start;
    flex-direction: row;
    flex-wrap: wrap;
}
/* The below selectors apply a tint depending on the theme: light for dark and dark for light */
/* \`backdrop-filter\` with a brightness offset of 0.2 would be better here but it causes some slight flickering */
body.vscode-dark .header {
    background-color: rgb(255, 255, 255, 0.05);
}
body.vscode-light .header {
    background-color: rgba(0, 0, 0, 0.05);
}

/* Buttons */
button,
.button-theme-primary {
    color: var(--vscode-button-foreground);
    background: var(--vscode-button-background);
    border: 1px solid var(--vscode-button-border);
    padding: 8px 12px;
}
button,
.button-theme-primary:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
    cursor: pointer;
}
.button-theme-secondary {
    color: var(--vscode-button-secondaryForeground);
    background: var(--vscode-button-secondaryBackground);
    border: 1px solid var(--vscode-button-border);
}
.button-theme-secondary:hover:not(:disabled) {
    background: var(--vscode-button-secondaryHoverBackground);
    cursor: pointer;
}
.button-theme-soft {
    color: var(--vscode-settings-textInputForeground);
    background: var(--vscode-settings-textInputBackground);
}
button:disabled {
    /* TODO: use VSC webcomponent library instead */
    filter: brightness(0.8);
    cursor: default;
}

/* Text area */
textarea {
    color: var(--vscode-settings-textInputForeground);
    background: var(--vscode-settings-textInputBackground);
    border: 1px solid var(--vscode-settings-textInputBorder);
}

/* Badge */
.badge {
    color: var(--vscode-activityBarBadge-foreground);
    background-color: var(--vscode-activityBarBadge-background);
    padding: 3px 8px;
    font-size: 0.75rem;
    border-radius: 16px;
    white-space: nowrap;
}

/* Labels */
.label-context {
    display: block;
    padding: 0 0 4px 0;
}
.option-label {
    display: block;
    /* max-width: 560px; */
    padding: 0 0 8px 0;
}

/* Layout */
.ml-0 {
    margin-left: 0px;
}
.ml-2 {
    margin-left: 2px;
}
.ml-4 {
    margin-left: 4px;
}
.ml-8 {
    margin-left: 8px;
}
.ml-16 {
    margin-left: 16px;
}
.mr-0 {
    margin-right: 0px;
}
.mr-2 {
    margin-right: 2px;
}
.mr-4 {
    margin-right: 4px;
}
.mr-8 {
    margin-right: 8px;
}
.mr-16 {
    margin-right: 16px;
}
.mt-0 {
    margin-top: 0px;
}
.mt-2 {
    margin-top: 2px;
}
.mt-4 {
    margin-top: 4px;
}
.mt-8 {
    margin-top: 8px;
}
.mt-16 {
    margin-top: 16px;
}
.mb-0 {
    margin-bottom: 0px;
}
.mb-2 {
    margin-bottom: 2px;
}
.mb-4 {
    margin-bottom: 4px;
}
.mb-8 {
    margin-bottom: 8px;
}
.mb-16 {
    margin-bottom: 16px;
}

/* Basic 16px icon class */
.icon {
    display: inline;
    height: 16px;
    width: 16px;
    background-repeat: no-repeat;
    background-position: center;
}

/* Misc. */
.no-spacing {
    margin: 0;
    padding: 0;
}
.no-wrap {
    white-space: nowrap;
}
.soft {
    color: var(--vscode-input-placeholderForeground);
}
.container {
    background: var(--vscode-menu-background);
}
.display-contents {
    display: contents;
}
.button-container {
    display: flex;
    align-items: flex-start;
    flex-direction: row;
    /* margin: 16px 0 0 0; */
    padding: 10px;
    position: sticky;
    top: 10px;
    justify-content: flex-end;
    border-bottom: 1px solid var(--vscode-menu-separatorBackground);
    /**
     * HACK: Using background-color alpha as a workaround because "opacity" affects children.
     * TODO: Is there a way to use alpha with var(--vscode-menu-background) ?
     */
    /* background-color: rgba(0, 0, 0, 0.1); */
}

.button-container h1 {
    margin: 0px;
}
`,""]);const j=N},4997:(e,c,n)=>{"use strict";n.d(c,{A:()=>N});var s=n(6758),d=n.n(s),f=n(935),_=n.n(f),y=n(62),x=n.n(y),C=new URL(n(6387),n.b),A=_()(d()),T=x()(C);A.push([e.id,`/* 
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. 
 * SPDX-License-Identifier: Apache-2.0 
 * 
 * This style sheet was generated using "scripts/generateIcons.ts". 
 */ 

@font-face {
  font-display: auto;
  font-family: "aws-toolkit-icons";
  font-style: normal;
  font-weight: 400;
  
  src: url(${T}) format("woff"); 
}

.icon {
  display: inline-block;
  font-family: "aws-toolkit-icons";
  font-weight: 400;
  font-style: normal;
  font-variant: normal;
  text-rendering: auto;
  line-height: 1;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
}

.icon-lg {
  font-size: 1.33333em;
  line-height: 0.75em;
  vertical-align: -0.0667em;
}

.icon-xs {
  font-size: 0.75em;
}

.icon-sm {
  font-size: 0.875em;
}

.icon-1x {
  font-size: 1em;
}

.icon-2x {
  font-size: 2em;
}

.icon-3x {
  font-size: 3em;
}

.icon-4x {
  font-size: 4em;
}

.icon-5x {
  font-size: 5em;
}

.icon-6x {
  font-size: 6em;
}

.icon-7x {
  font-size: 7em;
}

.icon-8x {
  font-size: 8em;
}

.icon-9x {
  font-size: 9em;
}

.icon-10x {
  font-size: 10em;
}

.icon-fw {
  text-align: center;
  width: 1.25em;
}

.icon-border {
  border: solid 0.08em #eee;
  border-radius: 0.1em;
  padding: 0.2em 0.25em 0.15em;
}

.icon-pull-left {
  float: left;
}

.icon-pull-right {
  float: right;
}

.icon.icon-pull-left {
  margin-right: 0.3em;
}

.icon.icon-pull-right {
  margin-left: 0.3em;
}


.icon-vscode-account::before {
  content: "\\eb99";
}

.icon-vscode-activate-breakpoints::before {
  content: "\\ea97";
}

.icon-vscode-add::before {
  content: "\\ea60";
}

.icon-vscode-archive::before {
  content: "\\ea98";
}

.icon-vscode-arrow-both::before {
  content: "\\ea99";
}

.icon-vscode-arrow-circle-down::before {
  content: "\\ebfc";
}

.icon-vscode-arrow-circle-left::before {
  content: "\\ebfd";
}

.icon-vscode-arrow-circle-right::before {
  content: "\\ebfe";
}

.icon-vscode-arrow-circle-up::before {
  content: "\\ebff";
}

.icon-vscode-arrow-down::before {
  content: "\\ea9a";
}

.icon-vscode-arrow-left::before {
  content: "\\ea9b";
}

.icon-vscode-arrow-right::before {
  content: "\\ea9c";
}

.icon-vscode-arrow-small-down::before {
  content: "\\ea9d";
}

.icon-vscode-arrow-small-left::before {
  content: "\\ea9e";
}

.icon-vscode-arrow-small-right::before {
  content: "\\ea9f";
}

.icon-vscode-arrow-small-up::before {
  content: "\\eaa0";
}

.icon-vscode-arrow-swap::before {
  content: "\\ebcb";
}

.icon-vscode-arrow-up::before {
  content: "\\eaa1";
}

.icon-vscode-azure::before {
  content: "\\ebd8";
}

.icon-vscode-azure-devops::before {
  content: "\\ebe8";
}

.icon-vscode-beaker::before {
  content: "\\ea79";
}

.icon-vscode-beaker-stop::before {
  content: "\\ebe1";
}

.icon-vscode-bell::before {
  content: "\\eaa2";
}

.icon-vscode-bell-dot::before {
  content: "\\eb9a";
}

.icon-vscode-bell-slash::before {
  content: "\\ec08";
}

.icon-vscode-bell-slash-dot::before {
  content: "\\ec09";
}

.icon-vscode-blank::before {
  content: "\\ec03";
}

.icon-vscode-bold::before {
  content: "\\eaa3";
}

.icon-vscode-book::before {
  content: "\\eaa4";
}

.icon-vscode-bookmark::before {
  content: "\\eaa5";
}

.icon-vscode-bracket-dot::before {
  content: "\\ebe5";
}

.icon-vscode-bracket-error::before {
  content: "\\ebe6";
}

.icon-vscode-briefcase::before {
  content: "\\eaac";
}

.icon-vscode-broadcast::before {
  content: "\\eaad";
}

.icon-vscode-browser::before {
  content: "\\eaae";
}

.icon-vscode-bug::before {
  content: "\\eaaf";
}

.icon-vscode-calendar::before {
  content: "\\eab0";
}

.icon-vscode-call-incoming::before {
  content: "\\eb92";
}

.icon-vscode-call-outgoing::before {
  content: "\\eb93";
}

.icon-vscode-case-sensitive::before {
  content: "\\eab1";
}

.icon-vscode-check::before {
  content: "\\eab2";
}

.icon-vscode-check-all::before {
  content: "\\ebb1";
}

.icon-vscode-checklist::before {
  content: "\\eab3";
}

.icon-vscode-chevron-down::before {
  content: "\\eab4";
}

.icon-vscode-chevron-left::before {
  content: "\\eab5";
}

.icon-vscode-chevron-right::before {
  content: "\\eab6";
}

.icon-vscode-chevron-up::before {
  content: "\\eab7";
}

.icon-vscode-chrome-close::before {
  content: "\\eab8";
}

.icon-vscode-chrome-maximize::before {
  content: "\\eab9";
}

.icon-vscode-chrome-minimize::before {
  content: "\\eaba";
}

.icon-vscode-chrome-restore::before {
  content: "\\eabb";
}

.icon-vscode-circle::before {
  content: "\\eabc";
}

.icon-vscode-circle-filled::before {
  content: "\\ea71";
}

.icon-vscode-circle-large::before {
  content: "\\ebb5";
}

.icon-vscode-circle-large-filled::before {
  content: "\\ebb4";
}

.icon-vscode-circle-slash::before {
  content: "\\eabd";
}

.icon-vscode-circle-small::before {
  content: "\\ec07";
}

.icon-vscode-circle-small-filled::before {
  content: "\\eb8a";
}

.icon-vscode-circuit-board::before {
  content: "\\eabe";
}

.icon-vscode-clear-all::before {
  content: "\\eabf";
}

.icon-vscode-clippy::before {
  content: "\\eac0";
}

.icon-vscode-close::before {
  content: "\\ea76";
}

.icon-vscode-close-all::before {
  content: "\\eac1";
}

.icon-vscode-cloud::before {
  content: "\\ebaa";
}

.icon-vscode-cloud-download::before {
  content: "\\eac2";
}

.icon-vscode-cloud-upload::before {
  content: "\\eac3";
}

.icon-vscode-code::before {
  content: "\\eac4";
}

.icon-vscode-collapse-all::before {
  content: "\\eac5";
}

.icon-vscode-color-mode::before {
  content: "\\eac6";
}

.icon-vscode-combine::before {
  content: "\\ebb6";
}

.icon-vscode-comment::before {
  content: "\\ea6b";
}

.icon-vscode-comment-discussion::before {
  content: "\\eac7";
}

.icon-vscode-comment-draft::before {
  content: "\\ec0e";
}

.icon-vscode-comment-unresolved::before {
  content: "\\ec0a";
}

.icon-vscode-compass::before {
  content: "\\ebd5";
}

.icon-vscode-compass-active::before {
  content: "\\ebd7";
}

.icon-vscode-compass-dot::before {
  content: "\\ebd6";
}

.icon-vscode-copy::before {
  content: "\\ebcc";
}

.icon-vscode-credit-card::before {
  content: "\\eac9";
}

.icon-vscode-dash::before {
  content: "\\eacc";
}

.icon-vscode-dashboard::before {
  content: "\\eacd";
}

.icon-vscode-database::before {
  content: "\\eace";
}

.icon-vscode-debug::before {
  content: "\\ead8";
}

.icon-vscode-debug-all::before {
  content: "\\ebdc";
}

.icon-vscode-debug-alt::before {
  content: "\\eb91";
}

.icon-vscode-debug-alt-small::before {
  content: "\\eba8";
}

.icon-vscode-debug-breakpoint-conditional::before {
  content: "\\eaa7";
}

.icon-vscode-debug-breakpoint-conditional-unverified::before {
  content: "\\eaa6";
}

.icon-vscode-debug-breakpoint-data::before {
  content: "\\eaa9";
}

.icon-vscode-debug-breakpoint-data-unverified::before {
  content: "\\eaa8";
}

.icon-vscode-debug-breakpoint-function::before {
  content: "\\eb88";
}

.icon-vscode-debug-breakpoint-function-unverified::before {
  content: "\\eb87";
}

.icon-vscode-debug-breakpoint-log::before {
  content: "\\eaab";
}

.icon-vscode-debug-breakpoint-log-unverified::before {
  content: "\\eaaa";
}

.icon-vscode-debug-breakpoint-unsupported::before {
  content: "\\eb8c";
}

.icon-vscode-debug-console::before {
  content: "\\eb9b";
}

.icon-vscode-debug-continue::before {
  content: "\\eacf";
}

.icon-vscode-debug-continue-small::before {
  content: "\\ebe0";
}

.icon-vscode-debug-coverage::before {
  content: "\\ebdd";
}

.icon-vscode-debug-disconnect::before {
  content: "\\ead0";
}

.icon-vscode-debug-line-by-line::before {
  content: "\\ebd0";
}

.icon-vscode-debug-pause::before {
  content: "\\ead1";
}

.icon-vscode-debug-rerun::before {
  content: "\\ebc0";
}

.icon-vscode-debug-restart::before {
  content: "\\ead2";
}

.icon-vscode-debug-restart-frame::before {
  content: "\\eb90";
}

.icon-vscode-debug-reverse-continue::before {
  content: "\\eb8e";
}

.icon-vscode-debug-stackframe::before {
  content: "\\eb8b";
}

.icon-vscode-debug-stackframe-active::before {
  content: "\\eb89";
}

.icon-vscode-debug-start::before {
  content: "\\ead3";
}

.icon-vscode-debug-step-back::before {
  content: "\\eb8f";
}

.icon-vscode-debug-step-into::before {
  content: "\\ead4";
}

.icon-vscode-debug-step-out::before {
  content: "\\ead5";
}

.icon-vscode-debug-step-over::before {
  content: "\\ead6";
}

.icon-vscode-debug-stop::before {
  content: "\\ead7";
}

.icon-vscode-desktop-download::before {
  content: "\\ea78";
}

.icon-vscode-device-camera::before {
  content: "\\eada";
}

.icon-vscode-device-camera-video::before {
  content: "\\ead9";
}

.icon-vscode-device-mobile::before {
  content: "\\eadb";
}

.icon-vscode-diff::before {
  content: "\\eae1";
}

.icon-vscode-diff-added::before {
  content: "\\eadc";
}

.icon-vscode-diff-ignored::before {
  content: "\\eadd";
}

.icon-vscode-diff-modified::before {
  content: "\\eade";
}

.icon-vscode-diff-removed::before {
  content: "\\eadf";
}

.icon-vscode-diff-renamed::before {
  content: "\\eae0";
}

.icon-vscode-discard::before {
  content: "\\eae2";
}

.icon-vscode-edit::before {
  content: "\\ea73";
}

.icon-vscode-editor-layout::before {
  content: "\\eae3";
}

.icon-vscode-ellipsis::before {
  content: "\\ea7c";
}

.icon-vscode-empty-window::before {
  content: "\\eae4";
}

.icon-vscode-error::before {
  content: "\\ea87";
}

.icon-vscode-error-small::before {
  content: "\\ebfb";
}

.icon-vscode-exclude::before {
  content: "\\eae5";
}

.icon-vscode-expand-all::before {
  content: "\\eb95";
}

.icon-vscode-export::before {
  content: "\\ebac";
}

.icon-vscode-extensions::before {
  content: "\\eae6";
}

.icon-vscode-eye::before {
  content: "\\ea70";
}

.icon-vscode-eye-closed::before {
  content: "\\eae7";
}

.icon-vscode-feedback::before {
  content: "\\eb96";
}

.icon-vscode-file::before {
  content: "\\ea7b";
}

.icon-vscode-file-binary::before {
  content: "\\eae8";
}

.icon-vscode-file-code::before {
  content: "\\eae9";
}

.icon-vscode-file-media::before {
  content: "\\eaea";
}

.icon-vscode-file-pdf::before {
  content: "\\eaeb";
}

.icon-vscode-file-submodule::before {
  content: "\\eaec";
}

.icon-vscode-file-symlink-directory::before {
  content: "\\eaed";
}

.icon-vscode-file-symlink-file::before {
  content: "\\eaee";
}

.icon-vscode-file-zip::before {
  content: "\\eaef";
}

.icon-vscode-files::before {
  content: "\\eaf0";
}

.icon-vscode-filter::before {
  content: "\\eaf1";
}

.icon-vscode-filter-filled::before {
  content: "\\ebce";
}

.icon-vscode-flame::before {
  content: "\\eaf2";
}

.icon-vscode-fold::before {
  content: "\\eaf5";
}

.icon-vscode-fold-down::before {
  content: "\\eaf3";
}

.icon-vscode-fold-up::before {
  content: "\\eaf4";
}

.icon-vscode-folder::before {
  content: "\\ea83";
}

.icon-vscode-folder-active::before {
  content: "\\eaf6";
}

.icon-vscode-folder-library::before {
  content: "\\ebdf";
}

.icon-vscode-folder-opened::before {
  content: "\\eaf7";
}

.icon-vscode-gear::before {
  content: "\\eaf8";
}

.icon-vscode-gift::before {
  content: "\\eaf9";
}

.icon-vscode-gist::before {
  content: "\\eafb";
}

.icon-vscode-gist-secret::before {
  content: "\\eafa";
}

.icon-vscode-git-commit::before {
  content: "\\eafc";
}

.icon-vscode-git-compare::before {
  content: "\\eafd";
}

.icon-vscode-git-merge::before {
  content: "\\eafe";
}

.icon-vscode-git-pull-request::before {
  content: "\\ea64";
}

.icon-vscode-git-pull-request-closed::before {
  content: "\\ebda";
}

.icon-vscode-git-pull-request-create::before {
  content: "\\ebbc";
}

.icon-vscode-git-pull-request-draft::before {
  content: "\\ebdb";
}

.icon-vscode-git-pull-request-go-to-changes::before {
  content: "\\ec0b";
}

.icon-vscode-git-pull-request-new-changes::before {
  content: "\\ec0c";
}

.icon-vscode-github::before {
  content: "\\ea84";
}

.icon-vscode-github-action::before {
  content: "\\eaff";
}

.icon-vscode-github-alt::before {
  content: "\\eb00";
}

.icon-vscode-github-inverted::before {
  content: "\\eba1";
}

.icon-vscode-globe::before {
  content: "\\eb01";
}

.icon-vscode-go-to-file::before {
  content: "\\ea94";
}

.icon-vscode-grabber::before {
  content: "\\eb02";
}

.icon-vscode-graph::before {
  content: "\\eb03";
}

.icon-vscode-graph-left::before {
  content: "\\ebad";
}

.icon-vscode-graph-line::before {
  content: "\\ebe2";
}

.icon-vscode-graph-scatter::before {
  content: "\\ebe3";
}

.icon-vscode-gripper::before {
  content: "\\eb04";
}

.icon-vscode-group-by-ref-type::before {
  content: "\\eb97";
}

.icon-vscode-heart::before {
  content: "\\eb05";
}

.icon-vscode-heart-filled::before {
  content: "\\ec04";
}

.icon-vscode-history::before {
  content: "\\ea82";
}

.icon-vscode-home::before {
  content: "\\eb06";
}

.icon-vscode-horizontal-rule::before {
  content: "\\eb07";
}

.icon-vscode-hubot::before {
  content: "\\eb08";
}

.icon-vscode-inbox::before {
  content: "\\eb09";
}

.icon-vscode-indent::before {
  content: "\\ebf9";
}

.icon-vscode-info::before {
  content: "\\ea74";
}

.icon-vscode-insert::before {
  content: "\\ec11";
}

.icon-vscode-inspect::before {
  content: "\\ebd1";
}

.icon-vscode-issue-draft::before {
  content: "\\ebd9";
}

.icon-vscode-issue-reopened::before {
  content: "\\eb0b";
}

.icon-vscode-issues::before {
  content: "\\eb0c";
}

.icon-vscode-italic::before {
  content: "\\eb0d";
}

.icon-vscode-jersey::before {
  content: "\\eb0e";
}

.icon-vscode-json::before {
  content: "\\eb0f";
}

.icon-vscode-kebab-vertical::before {
  content: "\\eb10";
}

.icon-vscode-key::before {
  content: "\\eb11";
}

.icon-vscode-law::before {
  content: "\\eb12";
}

.icon-vscode-layers::before {
  content: "\\ebd2";
}

.icon-vscode-layers-active::before {
  content: "\\ebd4";
}

.icon-vscode-layers-dot::before {
  content: "\\ebd3";
}

.icon-vscode-layout::before {
  content: "\\ebeb";
}

.icon-vscode-layout-activitybar-left::before {
  content: "\\ebec";
}

.icon-vscode-layout-activitybar-right::before {
  content: "\\ebed";
}

.icon-vscode-layout-centered::before {
  content: "\\ebf7";
}

.icon-vscode-layout-menubar::before {
  content: "\\ebf6";
}

.icon-vscode-layout-panel::before {
  content: "\\ebf2";
}

.icon-vscode-layout-panel-center::before {
  content: "\\ebef";
}

.icon-vscode-layout-panel-justify::before {
  content: "\\ebf0";
}

.icon-vscode-layout-panel-left::before {
  content: "\\ebee";
}

.icon-vscode-layout-panel-off::before {
  content: "\\ec01";
}

.icon-vscode-layout-panel-right::before {
  content: "\\ebf1";
}

.icon-vscode-layout-sidebar-left::before {
  content: "\\ebf3";
}

.icon-vscode-layout-sidebar-left-off::before {
  content: "\\ec02";
}

.icon-vscode-layout-sidebar-right::before {
  content: "\\ebf4";
}

.icon-vscode-layout-sidebar-right-off::before {
  content: "\\ec00";
}

.icon-vscode-layout-statusbar::before {
  content: "\\ebf5";
}

.icon-vscode-library::before {
  content: "\\eb9c";
}

.icon-vscode-lightbulb::before {
  content: "\\ea61";
}

.icon-vscode-lightbulb-autofix::before {
  content: "\\eb13";
}

.icon-vscode-link::before {
  content: "\\eb15";
}

.icon-vscode-link-external::before {
  content: "\\eb14";
}

.icon-vscode-list-filter::before {
  content: "\\eb83";
}

.icon-vscode-list-flat::before {
  content: "\\eb84";
}

.icon-vscode-list-ordered::before {
  content: "\\eb16";
}

.icon-vscode-list-selection::before {
  content: "\\eb85";
}

.icon-vscode-list-tree::before {
  content: "\\eb86";
}

.icon-vscode-list-unordered::before {
  content: "\\eb17";
}

.icon-vscode-live-share::before {
  content: "\\eb18";
}

.icon-vscode-loading::before {
  content: "\\eb19";
}

.icon-vscode-location::before {
  content: "\\eb1a";
}

.icon-vscode-lock::before {
  content: "\\ea75";
}

.icon-vscode-lock-small::before {
  content: "\\ebe7";
}

.icon-vscode-magnet::before {
  content: "\\ebae";
}

.icon-vscode-mail::before {
  content: "\\eb1c";
}

.icon-vscode-mail-read::before {
  content: "\\eb1b";
}

.icon-vscode-map::before {
  content: "\\ec05";
}

.icon-vscode-map-filled::before {
  content: "\\ec06";
}

.icon-vscode-markdown::before {
  content: "\\eb1d";
}

.icon-vscode-megaphone::before {
  content: "\\eb1e";
}

.icon-vscode-mention::before {
  content: "\\eb1f";
}

.icon-vscode-menu::before {
  content: "\\eb94";
}

.icon-vscode-merge::before {
  content: "\\ebab";
}

.icon-vscode-milestone::before {
  content: "\\eb20";
}

.icon-vscode-mirror::before {
  content: "\\ea69";
}

.icon-vscode-mortar-board::before {
  content: "\\eb21";
}

.icon-vscode-move::before {
  content: "\\eb22";
}

.icon-vscode-multiple-windows::before {
  content: "\\eb23";
}

.icon-vscode-mute::before {
  content: "\\eb24";
}

.icon-vscode-new-file::before {
  content: "\\ea7f";
}

.icon-vscode-new-folder::before {
  content: "\\ea80";
}

.icon-vscode-newline::before {
  content: "\\ebea";
}

.icon-vscode-no-newline::before {
  content: "\\eb25";
}

.icon-vscode-note::before {
  content: "\\eb26";
}

.icon-vscode-notebook::before {
  content: "\\ebaf";
}

.icon-vscode-notebook-template::before {
  content: "\\ebbf";
}

.icon-vscode-octoface::before {
  content: "\\eb27";
}

.icon-vscode-open-preview::before {
  content: "\\eb28";
}

.icon-vscode-organization::before {
  content: "\\ea7e";
}

.icon-vscode-output::before {
  content: "\\eb9d";
}

.icon-vscode-package::before {
  content: "\\eb29";
}

.icon-vscode-paintcan::before {
  content: "\\eb2a";
}

.icon-vscode-pass::before {
  content: "\\eba4";
}

.icon-vscode-pass-filled::before {
  content: "\\ebb3";
}

.icon-vscode-person::before {
  content: "\\ea67";
}

.icon-vscode-person-add::before {
  content: "\\ebcd";
}

.icon-vscode-pie-chart::before {
  content: "\\ebe4";
}

.icon-vscode-pin::before {
  content: "\\eb2b";
}

.icon-vscode-pinned::before {
  content: "\\eba0";
}

.icon-vscode-pinned-dirty::before {
  content: "\\ebb2";
}

.icon-vscode-play::before {
  content: "\\eb2c";
}

.icon-vscode-play-circle::before {
  content: "\\eba6";
}

.icon-vscode-plug::before {
  content: "\\eb2d";
}

.icon-vscode-preserve-case::before {
  content: "\\eb2e";
}

.icon-vscode-preview::before {
  content: "\\eb2f";
}

.icon-vscode-primitive-square::before {
  content: "\\ea72";
}

.icon-vscode-project::before {
  content: "\\eb30";
}

.icon-vscode-pulse::before {
  content: "\\eb31";
}

.icon-vscode-question::before {
  content: "\\eb32";
}

.icon-vscode-quote::before {
  content: "\\eb33";
}

.icon-vscode-radio-tower::before {
  content: "\\eb34";
}

.icon-vscode-reactions::before {
  content: "\\eb35";
}

.icon-vscode-record::before {
  content: "\\eba7";
}

.icon-vscode-record-keys::before {
  content: "\\ea65";
}

.icon-vscode-record-small::before {
  content: "\\ebfa";
}

.icon-vscode-redo::before {
  content: "\\ebb0";
}

.icon-vscode-references::before {
  content: "\\eb36";
}

.icon-vscode-refresh::before {
  content: "\\eb37";
}

.icon-vscode-regex::before {
  content: "\\eb38";
}

.icon-vscode-remote::before {
  content: "\\eb3a";
}

.icon-vscode-remote-explorer::before {
  content: "\\eb39";
}

.icon-vscode-remove::before {
  content: "\\eb3b";
}

.icon-vscode-replace::before {
  content: "\\eb3d";
}

.icon-vscode-replace-all::before {
  content: "\\eb3c";
}

.icon-vscode-reply::before {
  content: "\\ea7d";
}

.icon-vscode-repo::before {
  content: "\\ea62";
}

.icon-vscode-repo-clone::before {
  content: "\\eb3e";
}

.icon-vscode-repo-force-push::before {
  content: "\\eb3f";
}

.icon-vscode-repo-forked::before {
  content: "\\ea63";
}

.icon-vscode-repo-pull::before {
  content: "\\eb40";
}

.icon-vscode-repo-push::before {
  content: "\\eb41";
}

.icon-vscode-report::before {
  content: "\\eb42";
}

.icon-vscode-request-changes::before {
  content: "\\eb43";
}

.icon-vscode-rocket::before {
  content: "\\eb44";
}

.icon-vscode-root-folder::before {
  content: "\\eb46";
}

.icon-vscode-root-folder-opened::before {
  content: "\\eb45";
}

.icon-vscode-rss::before {
  content: "\\eb47";
}

.icon-vscode-ruby::before {
  content: "\\eb48";
}

.icon-vscode-run-above::before {
  content: "\\ebbd";
}

.icon-vscode-run-all::before {
  content: "\\eb9e";
}

.icon-vscode-run-below::before {
  content: "\\ebbe";
}

.icon-vscode-run-errors::before {
  content: "\\ebde";
}

.icon-vscode-save::before {
  content: "\\eb4b";
}

.icon-vscode-save-all::before {
  content: "\\eb49";
}

.icon-vscode-save-as::before {
  content: "\\eb4a";
}

.icon-vscode-screen-full::before {
  content: "\\eb4c";
}

.icon-vscode-screen-normal::before {
  content: "\\eb4d";
}

.icon-vscode-search::before {
  content: "\\ea6d";
}

.icon-vscode-search-fuzzy::before {
  content: "\\ec0d";
}

.icon-vscode-search-stop::before {
  content: "\\eb4e";
}

.icon-vscode-send::before {
  content: "\\ec0f";
}

.icon-vscode-server::before {
  content: "\\eb50";
}

.icon-vscode-server-environment::before {
  content: "\\eba3";
}

.icon-vscode-server-process::before {
  content: "\\eba2";
}

.icon-vscode-settings::before {
  content: "\\eb52";
}

.icon-vscode-settings-gear::before {
  content: "\\eb51";
}

.icon-vscode-shield::before {
  content: "\\eb53";
}

.icon-vscode-sign-in::before {
  content: "\\ea6f";
}

.icon-vscode-sign-out::before {
  content: "\\ea6e";
}

.icon-vscode-smiley::before {
  content: "\\eb54";
}

.icon-vscode-sort-precedence::before {
  content: "\\eb55";
}

.icon-vscode-source-control::before {
  content: "\\ea68";
}

.icon-vscode-sparkle::before {
  content: "\\ec10";
}

.icon-vscode-split-horizontal::before {
  content: "\\eb56";
}

.icon-vscode-split-vertical::before {
  content: "\\eb57";
}

.icon-vscode-squirrel::before {
  content: "\\eb58";
}

.icon-vscode-star-empty::before {
  content: "\\ea6a";
}

.icon-vscode-star-full::before {
  content: "\\eb59";
}

.icon-vscode-star-half::before {
  content: "\\eb5a";
}

.icon-vscode-stop-circle::before {
  content: "\\eba5";
}

.icon-vscode-symbol-array::before {
  content: "\\ea8a";
}

.icon-vscode-symbol-boolean::before {
  content: "\\ea8f";
}

.icon-vscode-symbol-class::before {
  content: "\\eb5b";
}

.icon-vscode-symbol-color::before {
  content: "\\eb5c";
}

.icon-vscode-symbol-constant::before {
  content: "\\eb5d";
}

.icon-vscode-symbol-enum::before {
  content: "\\ea95";
}

.icon-vscode-symbol-enum-member::before {
  content: "\\eb5e";
}

.icon-vscode-symbol-event::before {
  content: "\\ea86";
}

.icon-vscode-symbol-field::before {
  content: "\\eb5f";
}

.icon-vscode-symbol-file::before {
  content: "\\eb60";
}

.icon-vscode-symbol-interface::before {
  content: "\\eb61";
}

.icon-vscode-symbol-key::before {
  content: "\\ea93";
}

.icon-vscode-symbol-keyword::before {
  content: "\\eb62";
}

.icon-vscode-symbol-method::before {
  content: "\\ea8c";
}

.icon-vscode-symbol-misc::before {
  content: "\\eb63";
}

.icon-vscode-symbol-namespace::before {
  content: "\\ea8b";
}

.icon-vscode-symbol-numeric::before {
  content: "\\ea90";
}

.icon-vscode-symbol-operator::before {
  content: "\\eb64";
}

.icon-vscode-symbol-parameter::before {
  content: "\\ea92";
}

.icon-vscode-symbol-property::before {
  content: "\\eb65";
}

.icon-vscode-symbol-ruler::before {
  content: "\\ea96";
}

.icon-vscode-symbol-snippet::before {
  content: "\\eb66";
}

.icon-vscode-symbol-string::before {
  content: "\\eb8d";
}

.icon-vscode-symbol-structure::before {
  content: "\\ea91";
}

.icon-vscode-symbol-variable::before {
  content: "\\ea88";
}

.icon-vscode-sync::before {
  content: "\\ea77";
}

.icon-vscode-sync-ignored::before {
  content: "\\eb9f";
}

.icon-vscode-table::before {
  content: "\\ebb7";
}

.icon-vscode-tag::before {
  content: "\\ea66";
}

.icon-vscode-target::before {
  content: "\\ebf8";
}

.icon-vscode-tasklist::before {
  content: "\\eb67";
}

.icon-vscode-telescope::before {
  content: "\\eb68";
}

.icon-vscode-terminal::before {
  content: "\\ea85";
}

.icon-vscode-terminal-bash::before {
  content: "\\ebca";
}

.icon-vscode-terminal-cmd::before {
  content: "\\ebc4";
}

.icon-vscode-terminal-debian::before {
  content: "\\ebc5";
}

.icon-vscode-terminal-linux::before {
  content: "\\ebc6";
}

.icon-vscode-terminal-powershell::before {
  content: "\\ebc7";
}

.icon-vscode-terminal-tmux::before {
  content: "\\ebc8";
}

.icon-vscode-terminal-ubuntu::before {
  content: "\\ebc9";
}

.icon-vscode-text-size::before {
  content: "\\eb69";
}

.icon-vscode-three-bars::before {
  content: "\\eb6a";
}

.icon-vscode-thumbsdown::before {
  content: "\\eb6b";
}

.icon-vscode-thumbsup::before {
  content: "\\eb6c";
}

.icon-vscode-tools::before {
  content: "\\eb6d";
}

.icon-vscode-trash::before {
  content: "\\ea81";
}

.icon-vscode-triangle-down::before {
  content: "\\eb6e";
}

.icon-vscode-triangle-left::before {
  content: "\\eb6f";
}

.icon-vscode-triangle-right::before {
  content: "\\eb70";
}

.icon-vscode-triangle-up::before {
  content: "\\eb71";
}

.icon-vscode-twitter::before {
  content: "\\eb72";
}

.icon-vscode-type-hierarchy::before {
  content: "\\ebb9";
}

.icon-vscode-type-hierarchy-sub::before {
  content: "\\ebba";
}

.icon-vscode-type-hierarchy-super::before {
  content: "\\ebbb";
}

.icon-vscode-unfold::before {
  content: "\\eb73";
}

.icon-vscode-ungroup-by-ref-type::before {
  content: "\\eb98";
}

.icon-vscode-unlock::before {
  content: "\\eb74";
}

.icon-vscode-unmute::before {
  content: "\\eb75";
}

.icon-vscode-unverified::before {
  content: "\\eb76";
}

.icon-vscode-variable-group::before {
  content: "\\ebb8";
}

.icon-vscode-verified::before {
  content: "\\eb77";
}

.icon-vscode-verified-filled::before {
  content: "\\ebe9";
}

.icon-vscode-versions::before {
  content: "\\eb78";
}

.icon-vscode-vm::before {
  content: "\\ea7a";
}

.icon-vscode-vm-active::before {
  content: "\\eb79";
}

.icon-vscode-vm-connect::before {
  content: "\\eba9";
}

.icon-vscode-vm-outline::before {
  content: "\\eb7a";
}

.icon-vscode-vm-running::before {
  content: "\\eb7b";
}

.icon-vscode-wand::before {
  content: "\\ebcf";
}

.icon-vscode-warning::before {
  content: "\\ea6c";
}

.icon-vscode-watch::before {
  content: "\\eb7c";
}

.icon-vscode-whitespace::before {
  content: "\\eb7d";
}

.icon-vscode-whole-word::before {
  content: "\\eb7e";
}

.icon-vscode-window::before {
  content: "\\eb7f";
}

.icon-vscode-word-wrap::before {
  content: "\\eb80";
}

.icon-vscode-workspace-trusted::before {
  content: "\\ebc1";
}

.icon-vscode-workspace-unknown::before {
  content: "\\ebc3";
}

.icon-vscode-workspace-untrusted::before {
  content: "\\ebc2";
}

.icon-vscode-zoom-in::before {
  content: "\\eb81";
}

.icon-vscode-zoom-out::before {
  content: "\\eb82";
}

.icon-aws-amazonq-q-gradient::before {
  content: "\\f1aa";
}

.icon-aws-amazonq-q-squid-ink::before {
  content: "\\f1ab";
}

.icon-aws-amazonq-q-white::before {
  content: "\\f1ac";
}

.icon-aws-amazonq-severity-critical::before {
  content: "\\f1ad";
}

.icon-aws-amazonq-severity-high::before {
  content: "\\f1ae";
}

.icon-aws-amazonq-severity-info::before {
  content: "\\f1af";
}

.icon-aws-amazonq-severity-low::before {
  content: "\\f1b0";
}

.icon-aws-amazonq-severity-medium::before {
  content: "\\f1b1";
}

.icon-aws-amazonq-transform-arrow-dark::before {
  content: "\\f1b2";
}

.icon-aws-amazonq-transform-arrow-light::before {
  content: "\\f1b3";
}

.icon-aws-amazonq-transform-default-dark::before {
  content: "\\f1b4";
}

.icon-aws-amazonq-transform-default-light::before {
  content: "\\f1b5";
}

.icon-aws-amazonq-transform-dependencies-dark::before {
  content: "\\f1b6";
}

.icon-aws-amazonq-transform-dependencies-light::before {
  content: "\\f1b7";
}

.icon-aws-amazonq-transform-file-dark::before {
  content: "\\f1b8";
}

.icon-aws-amazonq-transform-file-light::before {
  content: "\\f1b9";
}

.icon-aws-amazonq-transform-logo::before {
  content: "\\f1ba";
}

.icon-aws-amazonq-transform-step-into-dark::before {
  content: "\\f1bb";
}

.icon-aws-amazonq-transform-step-into-light::before {
  content: "\\f1bc";
}

.icon-aws-amazonq-transform-variables-dark::before {
  content: "\\f1bd";
}

.icon-aws-amazonq-transform-variables-light::before {
  content: "\\f1be";
}

.icon-aws-applicationcomposer-icon::before {
  content: "\\f1bf";
}

.icon-aws-applicationcomposer-icon-dark::before {
  content: "\\f1c0";
}

.icon-aws-apprunner-service::before {
  content: "\\f1c1";
}

.icon-aws-cdk-logo::before {
  content: "\\f1c2";
}

.icon-aws-cloudformation-stack::before {
  content: "\\f1c3";
}

.icon-aws-cloudwatch-log-group::before {
  content: "\\f1c4";
}

.icon-aws-codecatalyst-logo::before {
  content: "\\f1c5";
}

.icon-aws-codewhisperer-icon-black::before {
  content: "\\f1c6";
}

.icon-aws-codewhisperer-icon-white::before {
  content: "\\f1c7";
}

.icon-aws-codewhisperer-learn::before {
  content: "\\f1c8";
}

.icon-aws-ecr-registry::before {
  content: "\\f1c9";
}

.icon-aws-ecs-cluster::before {
  content: "\\f1ca";
}

.icon-aws-ecs-container::before {
  content: "\\f1cb";
}

.icon-aws-ecs-service::before {
  content: "\\f1cc";
}

.icon-aws-generic-attach-file::before {
  content: "\\f1cd";
}

.icon-aws-iot-certificate::before {
  content: "\\f1ce";
}

.icon-aws-iot-policy::before {
  content: "\\f1cf";
}

.icon-aws-iot-thing::before {
  content: "\\f1d0";
}

.icon-aws-lambda-create-stack::before {
  content: "\\f1d1";
}

.icon-aws-lambda-create-stack-light::before {
  content: "\\f1d2";
}

.icon-aws-lambda-deployed-function::before {
  content: "\\f1d3";
}

.icon-aws-lambda-function::before {
  content: "\\f1d4";
}

.icon-aws-lambda-invoke-remotely::before {
  content: "\\f1d5";
}

.icon-aws-mynah-MynahIconBlack::before {
  content: "\\f1d6";
}

.icon-aws-mynah-MynahIconWhite::before {
  content: "\\f1d7";
}

.icon-aws-mynah-logo::before {
  content: "\\f1d8";
}

.icon-aws-redshift-cluster::before {
  content: "\\f1d9";
}

.icon-aws-redshift-cluster-connected::before {
  content: "\\f1da";
}

.icon-aws-redshift-database::before {
  content: "\\f1db";
}

.icon-aws-redshift-redshift-cluster-connected::before {
  content: "\\f1dc";
}

.icon-aws-redshift-schema::before {
  content: "\\f1dd";
}

.icon-aws-redshift-table::before {
  content: "\\f1de";
}

.icon-aws-s3-bucket::before {
  content: "\\f1df";
}

.icon-aws-s3-create-bucket::before {
  content: "\\f1e0";
}

.icon-aws-sagemaker-code-editor::before {
  content: "\\f1e1";
}

.icon-aws-sagemaker-jupyter-lab::before {
  content: "\\f1e2";
}

.icon-aws-sagemakerunifiedstudio-catalog::before {
  content: "\\f1e3";
}

.icon-aws-sagemakerunifiedstudio-spaces::before {
  content: "\\f1e4";
}

.icon-aws-sagemakerunifiedstudio-spaces-dark::before {
  content: "\\f1e5";
}

.icon-aws-sagemakerunifiedstudio-symbol-int::before {
  content: "\\f1e6";
}

.icon-aws-sagemakerunifiedstudio-table::before {
  content: "\\f1e7";
}

.icon-aws-schemas-registry::before {
  content: "\\f1e8";
}

.icon-aws-schemas-schema::before {
  content: "\\f1e9";
}

.icon-aws-stepfunctions-preview::before {
  content: "\\f1ea";
}

.icon-vscode-codicons-info::before {
  content: "\\f1eb";
}

.icon-vscode-codicons-pass::before {
  content: "\\f1ec";
}

.icon-vscode-codicons-play-circle::before {
  content: "\\f1ed";
}

.icon-vscode-codicons-stop-circle::before {
  content: "\\f1ee";
}`,""]);const N=A},3388:(e,c,n)=>{"use strict";n.r(c),n.d(c,{default:()=>x});var s=n(6758),d=n.n(s),f=n(935),_=n.n(f),y=_()(d());y.push([e.id,`html,
body {
    font-family: var(
        --markdown-font-family,
        -apple-system,
        BlinkMacSystemFont,
        'Segoe WPC',
        'Segoe UI',
        system-ui,
        'Ubuntu',
        'Droid Sans',
        sans-serif
    );
    font-size: var(--markdown-font-size, 14px);
    padding: 0 26px;
    line-height: var(--markdown-line-height, 22px);
    word-wrap: break-word;
}

body {
    padding-top: 1em;
}

/* Reset margin top for elements */
h1,
h2,
h3,
h4,
h5,
h6,
p,
ol,
ul,
pre {
    margin-top: 0;
}

h1,
h2,
h3,
h4,
h5,
h6 {
    font-weight: 600;
    margin-top: 24px;
    margin-bottom: 16px;
    line-height: 1.25;
}

/* Prevent \`sub\` and \`sup\` elements from affecting line height */
sub,
sup {
    line-height: 0;
}

ul ul:first-child,
ul ol:first-child,
ol ul:first-child,
ol ol:first-child {
    margin-bottom: 0;
}

img,
video {
    max-width: 100%;
    max-height: 100%;
}

a {
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

a:focus,
input:focus,
select:focus,
textarea:focus {
    outline: 1px solid -webkit-focus-ring-color;
    outline-offset: -1px;
}

p {
    margin-bottom: 16px;
}

li p {
    margin-bottom: 0.7em;
}

ul,
ol {
    margin-bottom: 0.7em;
}

hr {
    border: 0;
    height: 1px;
    border-bottom: 1px solid;
}

h1 {
    font-size: 2em;
    margin-top: 0;
}

h2 {
    font-size: 1.5em;
    padding-bottom: 0.3em;
    border-bottom-width: 1px;
    border-bottom-style: solid;
}

h3 {
    font-size: 1.25em;
}

h4 {
    font-size: 1em;
}

h5 {
    font-size: 0.875em;
}

h6 {
    font-size: 0.85em;
}

table {
    border-collapse: collapse;
    margin-bottom: 0.7em;
}

th {
    text-align: left;
    border-bottom: 1px solid;
}

th,
td {
    padding: 5px 10px;
}

table > tbody > tr + tr > td {
    border-top: 1px solid;
}

blockquote {
    margin: 0;
    padding: 2px 16px 0 10px;
    border-left-width: 5px;
    border-left-style: solid;
    border-radius: 2px;
}

code {
    font-family: var(
        --vscode-editor-font-family,
        'SF Mono',
        Monaco,
        Menlo,
        Consolas,
        'Ubuntu Mono',
        'Liberation Mono',
        'DejaVu Sans Mono',
        'Courier New',
        monospace
    );
    font-size: 1em;
    line-height: 1.357em;
}

body.wordWrap pre {
    white-space: pre-wrap;
}

pre:not(.hljs),
pre.hljs code > div {
    padding: 16px;
    border-radius: 3px;
    overflow: auto;
    margin-bottom: 0;
}

pre code {
    color: var(--vscode-editor-foreground);
    tab-size: 4;
}

pre {
    background-color: var(--vscode-textCodeBlock-background);
    border: 1px solid var(--vscode-widget-border);
    font-size: 12px;
    line-height: 1rem;
}

code[class^='language-'] {
    background-color: unset;
}

/* These styles are used to render code diff with markdown-it rendered output */
.hljs-addition {
    background-color: var(--vscode-diffEditor-insertedTextBackground, rgba(155, 185, 85, 0.2));
    color: var(--vscode-diffEditorOverview-insertedForeground, rgb(155, 185, 85));
    display: inline-block;
    width: 100%;
    margin: 0 -16px;
    padding: 0 16px;
}

.hljs-deletion {
    background-color: var(--vscode-diffEditor-removedTextBackground, rgba(255, 0, 0, 0.2));
    color: var(--vscode-diffEditorOverview-removedForeground, rgb(255, 0, 0));
    display: inline-block;
    width: 100%;
    margin: 0 -16px;
    padding: 0 16px;
}

.hljs-meta {
    background-color: var(--vscode-editorMarkerNavigationInfo-headerBackground);
    color: var(--vscode-editorOverviewRuler-selectionHighlightForeground);
    display: inline-block;
    width: 100%;
    margin: 0 -16px 4px -16px;
    padding: 4px 16px;
}

.hljs-meta * {
    color: unset !important;
}

.hljs-keyword,
.hljs-literal,
.hljs-symbol,
.hljs-name {
    color: #569cd6;
}
.hljs-link {
    color: #569cd6;
    text-decoration: underline;
}

.hljs-built_in,
.hljs-type {
    color: #4ec9b0;
}

.hljs-number,
.hljs-class {
    color: #b8d7a3;
}

.hljs-string,
.hljs-meta-string {
    color: #d69d85;
}

.hljs-regexp,
.hljs-template-tag {
    color: #9a5334;
}

.hljs-subst,
.hljs-function,
.hljs-title,
.hljs-params,
.hljs-formula {
    color: #dcdcdc;
}

.hljs-comment,
.hljs-quote {
    color: #57a64a;
    font-style: italic;
}

.hljs-doctag {
    color: #608b4e;
}

.hljs-meta-keyword,
.hljs-tag {
    color: #9b9b9b;
}

.hljs-variable,
.hljs-template-variable {
    color: #bd63c5;
}

.hljs-attr,
.hljs-attribute,
.hljs-builtin-name {
    color: #9cdcfe;
}

.hljs-section {
    color: gold;
}

.hljs-emphasis {
    font-style: italic;
}

.hljs-strong {
    font-weight: bold;
}

.hljs-bullet,
.hljs-selector-tag,
.hljs-selector-id,
.hljs-selector-class,
.hljs-selector-attr,
.hljs-selector-pseudo {
    color: #d7ba7d;
}

.vscode-light .hljs-function,
.vscode-light .hljs-params,
.vscode-light .hljs-number,
.vscode-light .hljs-class {
    color: inherit;
}

.vscode-light .hljs-comment,
.vscode-light .hljs-quote,
.vscode-light .hljs-number,
.vscode-light .hljs-class,
.vscode-light .hljs-variable {
    color: #008000;
}

.vscode-light .hljs-keyword,
.vscode-light .hljs-selector-tag,
.vscode-light .hljs-name,
.vscode-light .hljs-tag {
    color: #00f;
}

.vscode-light .hljs-built_in,
.vscode-light .hljs-builtin-name {
    color: #007acc;
}

.vscode-light .hljs-string,
.vscode-light .hljs-section,
.vscode-light .hljs-attribute,
.vscode-light .hljs-literal,
.vscode-light .hljs-template-tag,
.vscode-light .hljs-template-variable,
.vscode-light .hljs-type {
    color: #a31515;
}

.vscode-light .hljs-subst,
.vscode-light .hljs-selector-attr,
.vscode-light .hljs-selector-pseudo,
.vscode-light .hljs-meta-keyword {
    color: #2b91af;
}
.vscode-light .hljs-title,
.vscode-light .hljs-doctag {
    color: #808080;
}

.vscode-light .hljs-attr {
    color: #f00;
}

.vscode-light .hljs-symbol,
.vscode-light .hljs-bullet,
.vscode-light .hljs-link {
    color: #00b0e8;
}

.vscode-light .hljs-emphasis {
    font-style: italic;
}

.vscode-light .hljs-strong {
    font-weight: bold;
}

input[type='submit'] {
    background-color: var(--vscode-button-background);
    border: none;
    color: var(--vscode-button-foreground);
    padding: 6px 14px;
    cursor: pointer;
    border-radius: 5%;
}

input[type='submit']:hover {
    background-color: var(--vscode-button-hoverBackground);
}

.flex-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
}

.flex-container > div {
    flex: 33%;
}

@media screen and (max-width: 900px) {
    .flex-container > div {
        flex: 50%;
    }
}

@media screen and (max-width: 400px) {
    .flex-container {
        flex-direction: column;
    }
}

hr {
    border: unset;
    height: unset;
    border-bottom: 1px solid var(--vscode-menu-separatorBackground);
}

img.severity {
    height: 0.75em;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

.spinner {
    display: inline-block;
    animation: spin 1s infinite;
}

button.button-theme-primary,
button.button-theme-secondary {
    padding: 6px 14px;
    border-radius: 5px;
}

.code-diff-actions {
    width: 100%;
    height: 26px;
    background-color: var(--vscode-editorMarkerNavigationInfo-headerBackground);
    border-radius: 0 0 3px 3px;
    overflow: auto;
    display: flex;
    flex-direction: row-reverse;
}

.code-diff-action-button {
    font-size: 12px;
    padding: 1px 6.5px;
    margin: 1px 0;
    border-radius: 3px;
    color: currentColor;
    background-color: rgba(0, 0, 0, 0);
    transition: all 600ms cubic-bezier(0.25, 1, 0, 1);
    transform: translate3d(0, 0, 0) scale(1.00001);
    gap: calc(0.25rem * 1);
    filter: brightness(0.925);
    border: none;
}

.code-diff-action-button:hover {
    filter: brightness(1);
}

.code-diff-action-button:hover:after {
    transform: translate3d(0%, 0, 0);
    opacity: 0.15;
}

.code-diff-action-button::after {
    content: '';
    pointer-events: none;
    transition: all 600ms cubic-bezier(0.25, 1, 0, 1);
    opacity: 0;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    filter: brightness(1.35) saturate(0.75);
    border-radius: inherit;
    background-color: currentColor;
    transform: translate3d(-5%, 0, 0) scale(0.93);
}

.container-bottom {
    bottom: 0;
    justify-content: unset;
    border-top: 1px solid var(--vscode-menu-separatorBackground);
    border-bottom: none;
}

.button-container {
    padding: 10px 0;
    flex-wrap: wrap;
}

.button-container > button {
    white-space: nowrap;
    margin-bottom: 8px;
}

pre.center {
    display: flex;
    justify-content: center;
    padding-top: 16px;
}

pre.error {
    color: var(--vscode-diffEditorOverview-removedForeground);
    background-color: var(--vscode-diffEditor-removedTextBackground);
    white-space: initial;
}

a.cursor {
    cursor: pointer;
    text-decoration: none;
}

.dot-typing {
    position: relative;
    left: -9999px;
    width: 8px;
    height: 8px;
    border-radius: 5px;
    background-color: var(--vscode-editor-foreground);
    color: var(--vscode-editor-foreground);
    box-shadow:
        9984px 0 0 0 var(--vscode-editor-foreground),
        9999px 0 0 0 var(--vscode-editor-foreground),
        10014px 0 0 0 var(--vscode-editor-foreground);
    animation: dot-typing 1.5s infinite linear;
}

@keyframes dot-typing {
    0% {
        box-shadow:
            9984px 0 0 0 var(--vscode-editor-foreground),
            9999px 0 0 0 var(--vscode-editor-foreground),
            10014px 0 0 0 var(--vscode-editor-foreground);
    }
    16.667% {
        box-shadow:
            9984px -10px 0 0 var(--vscode-editor-foreground),
            9999px 0 0 0 var(--vscode-editor-foreground),
            10014px 0 0 0 var(--vscode-editor-foreground);
    }
    33.333% {
        box-shadow:
            9984px 0 0 0 var(--vscode-editor-foreground),
            9999px 0 0 0 var(--vscode-editor-foreground),
            10014px 0 0 0 var(--vscode-editor-foreground);
    }
    50% {
        box-shadow:
            9984px 0 0 0 var(--vscode-editor-foreground),
            9999px -10px 0 0 var(--vscode-editor-foreground),
            10014px 0 0 0 var(--vscode-editor-foreground);
    }
    66.667% {
        box-shadow:
            9984px 0 0 0 var(--vscode-editor-foreground),
            9999px 0 0 0 var(--vscode-editor-foreground),
            10014px 0 0 0 var(--vscode-editor-foreground);
    }
    83.333% {
        box-shadow:
            9984px 0 0 0 var(--vscode-editor-foreground),
            9999px 0 0 0 var(--vscode-editor-foreground),
            10014px -10px 0 0 var(--vscode-editor-foreground);
    }
    100% {
        box-shadow:
            9984px 0 0 0 var(--vscode-editor-foreground),
            9999px 0 0 0 var(--vscode-editor-foreground),
            10014px 0 0 0 var(--vscode-editor-foreground);
    }
}

.code-block pre {
    border-radius: 3px 3px 0 0;
}

.line-number {
    display: inline-block;
    color: var(--vscode-editorOverviewRuler-selectionHighlightForeground);
    width: 16px;
    margin-right: 24px;
    text-align: right;
}

.highlight {
    display: inline-block;
    background-color: var(--vscode-editorOverviewRuler-selectionHighlightForeground);
}

.reference-tracker {
    cursor: help;
}

.reference-tracker .tooltip {
    visibility: hidden;
    opacity: 0;
    transition:
        visibility 0s 0.1s,
        opacity 0.1s linear;
    position: absolute;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    border: 1px solid var(--vscode-menu-separatorBackground);
    border-radius: 5px;
    padding: 16px;
    margin-top: -80px;
    margin-left: 20px;
    cursor: default;
}

.reference-tracker:hover .tooltip {
    visibility: visible;
    opacity: 1;
    transition: opacity 0.1s linear;
}
`,""]);const x=y},935:e=>{"use strict";e.exports=function(c){var n=[];return n.toString=function(){return this.map(function(d){var f="",_=typeof d[5]<"u";return d[4]&&(f+="@supports (".concat(d[4],") {")),d[2]&&(f+="@media ".concat(d[2]," {")),_&&(f+="@layer".concat(d[5].length>0?" ".concat(d[5]):""," {")),f+=c(d),_&&(f+="}"),d[2]&&(f+="}"),d[4]&&(f+="}"),f}).join("")},n.i=function(d,f,_,y,x){typeof d=="string"&&(d=[[null,d,void 0]]);var C={};if(_)for(var A=0;A<this.length;A++){var T=this[A][0];T!=null&&(C[T]=!0)}for(var N=0;N<d.length;N++){var u=[].concat(d[N]);_&&C[u[0]]||(typeof x<"u"&&(typeof u[5]>"u"||(u[1]="@layer".concat(u[5].length>0?" ".concat(u[5]):""," {").concat(u[1],"}")),u[5]=x),f&&(u[2]&&(u[1]="@media ".concat(u[2]," {").concat(u[1],"}")),u[2]=f),y&&(u[4]?(u[1]="@supports (".concat(u[4],") {").concat(u[1],"}"),u[4]=y):u[4]="".concat(y)),n.push(u))}},n}},62:e=>{"use strict";e.exports=function(c,n){return n||(n={}),c&&(c=String(c.__esModule?c.default:c),/^['"].*['"]$/.test(c)&&(c=c.slice(1,-1)),n.hash&&(c+=n.hash),/["'() \t\n]|(%20)/.test(c)||n.needQuotes?'"'.concat(c.replace(/"/g,'\\"').replace(/\n/g,"\\n"),'"'):c)}},6758:e=>{"use strict";e.exports=function(c){return c[1]}},7433:(e,c)=>{"use strict";var n;n={value:!0},c.A=(s,d)=>{const f=s.__vccOpts||s;for(const[_,y]of d)f[_]=y;return f}},5928:(e,c,n)=>{var s=n(6820);s.__esModule&&(s=s.default),typeof s=="string"&&(s=[[e.id,s,""]]),s.locals&&(e.exports=s.locals);var d=n(611).A,f=d("522a28c2",s,!1,{})},4936:(e,c,n)=>{var s=n(3388);s.__esModule&&(s=s.default),typeof s=="string"&&(s=[[e.id,s,""]]),s.locals&&(e.exports=s.locals);var d=n(611).A,f=d("5dc00f6f",s,!1,{})},611:(e,c,n)=>{"use strict";n.d(c,{A:()=>O});function s(i,v){for(var b=[],l={},a=0;a<v.length;a++){var E=v[a],h=E[0],S=E[1],D=E[2],R=E[3],P={id:i+":"+a,css:S,media:D,sourceMap:R};l[h]?l[h].parts.push(P):b.push(l[h]={id:h,parts:[P]})}return b}var d=typeof document<"u";if(typeof DEBUG<"u"&&DEBUG&&!d)throw new Error("vue-style-loader cannot be used in a non-browser environment. Use { target: 'node' } in your Webpack config to indicate a server-rendering environment.");var f={},_=d&&(document.head||document.getElementsByTagName("head")[0]),y=null,x=0,C=!1,A=function(){},T=null,N="data-vue-ssr-id",u=typeof navigator<"u"&&/msie [6-9]\b/.test(navigator.userAgent.toLowerCase());function O(i,v,b,l){C=b,T=l||{};var a=s(i,v);return j(a),function(h){for(var S=[],D=0;D<a.length;D++){var R=a[D],P=f[R.id];P.refs--,S.push(P)}h?(a=s(i,h),j(a)):a=[];for(var D=0;D<S.length;D++){var P=S[D];if(P.refs===0){for(var M=0;M<P.parts.length;M++)P.parts[M]();delete f[P.id]}}}}function j(i){for(var v=0;v<i.length;v++){var b=i[v],l=f[b.id];if(l){l.refs++;for(var a=0;a<l.parts.length;a++)l.parts[a](b.parts[a]);for(;a<b.parts.length;a++)l.parts.push(F(b.parts[a]));l.parts.length>b.parts.length&&(l.parts.length=b.parts.length)}else{for(var E=[],a=0;a<b.parts.length;a++)E.push(F(b.parts[a]));f[b.id]={id:b.id,refs:1,parts:E}}}}function z(){var i=document.createElement("style");return i.type="text/css",_.appendChild(i),i}function F(i){var v,b,l=document.querySelector("style["+N+'~="'+i.id+'"]');if(l){if(C)return A;l.parentNode.removeChild(l)}if(u){var a=x++;l=y||(y=z()),v=G.bind(null,l,a,!1),b=G.bind(null,l,a,!0)}else l=z(),v=$.bind(null,l),b=function(){l.parentNode.removeChild(l)};return v(i),function(h){if(h){if(h.css===i.css&&h.media===i.media&&h.sourceMap===i.sourceMap)return;v(i=h)}else b()}}var Y=function(){var i=[];return function(v,b){return i[v]=b,i.filter(Boolean).join(`
`)}}();function G(i,v,b,l){var a=b?"":l.css;if(i.styleSheet)i.styleSheet.cssText=Y(v,a);else{var E=document.createTextNode(a),h=i.childNodes;h[v]&&i.removeChild(h[v]),h.length?i.insertBefore(E,h[v]):i.appendChild(E)}}function $(i,v){var b=v.css,l=v.media,a=v.sourceMap;if(l&&i.setAttribute("media",l),T.ssrId&&i.setAttribute(N,v.id),a&&(b+=`
/*# sourceURL=`+a.sources[0]+" */",b+=`
/*# sourceMappingURL=data:application/json;base64,`+btoa(unescape(encodeURIComponent(JSON.stringify(a))))+" */"),i.styleSheet)i.styleSheet.cssText=b;else{for(;i.firstChild;)i.removeChild(i.firstChild);i.appendChild(document.createTextNode(b))}}},1821:(e,c,n)=>{"use strict";e.exports=n.p+"985021a91e8b52a1ded8.svg"},6949:(e,c,n)=>{"use strict";e.exports=n.p+"fa4be6586daf9e8f1934.svg"},6387:(e,c,n)=>{"use strict";e.exports=n.p+"d711470a03aef31cfaed.woff?1763769545442"}},q={};function m(e){var c=q[e];if(c!==void 0)return c.exports;var n=q[e]={id:e,exports:{}};return J[e](n,n.exports,m),n.exports}m.m=J,m.n=e=>{var c=e&&e.__esModule?()=>e.default:()=>e;return m.d(c,{a:c}),c},m.d=(e,c)=>{for(var n in c)m.o(c,n)&&!m.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:c[n]})},m.g=function(){if(typeof globalThis=="object")return globalThis;try{return this||new Function("return this")()}catch{if(typeof window=="object")return window}}(),m.o=(e,c)=>Object.prototype.hasOwnProperty.call(e,c),m.r=e=>{typeof Symbol<"u"&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},(()=>{var e;m.g.importScripts&&(e=m.g.location+"");var c=m.g.document;if(!e&&c&&(c.currentScript&&c.currentScript.tagName.toUpperCase()==="SCRIPT"&&(e=c.currentScript.src),!e)){var n=c.getElementsByTagName("script");if(n.length)for(var s=n.length-1;s>-1&&(!e||!/^http(s?):/.test(e));)e=n[s--].src}if(!e)throw new Error("Automatic publicPath is not supported in this browser");e=e.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"),m.p=e+"../../../../"})(),(()=>{m.b=document.baseURI||self.location.href;var e={945:0}})();var I={};(()=>{"use strict";const e=Vue,c={id:"app"},n=(0,e.createElementVNode)("h1",null,"IAM Policy Checks",-1),s={key:0},y=[(0,e.createElementVNode)("h3",null,"Getting Started",-1),(0,e.createElementVNode)("p",null," Policy Checks requires Python 3.6+ and the respective Python CLI tools installed, based on the document type: ",-1),(0,e.createElementVNode)("ol",null,[(0,e.createElementVNode)("li",null,[(0,e.createElementVNode)("p",null,"Install Python 3.6+")]),(0,e.createElementVNode)("li",null,[(0,e.createElementVNode)("code",null," pip install cfn-policy-validator==0.0.36 ")]),(0,e.createElementVNode)("li",null,[(0,e.createElementVNode)("code",null," pip install tf-policy-validator==0.0.9 ")]),(0,e.createElementVNode)("li",null,[(0,e.createElementVNode)("p",null,"Provide IAM Roles Credentials")])],-1)],x={style:{"justify-content":"space-between"}},C={style:{display:"flex"}},A={style:{display:"block","margin-right":"25px"}},T=(0,e.createElementVNode)("label",{for:"select-document-type",style:{display:"block","margin-top":"5px","margin-bottom":"3px"}},"Select a Document Type",-1),j=[(0,e.createElementVNode)("option",{value:"CloudFormation"},"CloudFormation Template",-1),(0,e.createElementVNode)("option",{value:"Terraform Plan"},"Terraform Plan",-1),(0,e.createElementVNode)("option",{value:"JSON Policy Language"},"JSON Policy Language",-1)],z={key:0,style:{display:"block"}},F=(0,e.createElementVNode)("label",{for:"select-policy-type",style:{display:"block","margin-top":"5px","margin-bottom":"3px"}},"Policy Type",-1),$=[(0,e.createElementVNode)("option",{value:"Identity"},"Identity",-1),(0,e.createElementVNode)("option",{value:"Resource"},"Resource",-1)],i=(0,e.createElementVNode)("label",{for:"input-path",style:{display:"block",cursor:"not-allowed","margin-top":"15px",opacity:"0.4"}}," Open a file with the selected Document Type in the VS Code text editor to begin ",-1),v={key:1},b=(0,e.createElementVNode)("label",{for:"input-path",style:{display:"block","margin-top":"15px","margin-bottom":"3px"}},"CloudFormation Parameter File (Optional)",-1),l={key:2,style:{"margin-top":"15px"}},h=[(0,e.createElementVNode)("p",null," For Terraform Plans, generate terraform plan file and convert the plan files to machine-readable JSON files before running policy checks. ",-1),(0,e.createElementVNode)("ol",null,[(0,e.createElementVNode)("li",null,[(0,e.createElementVNode)("code",null,"$terraform init")]),(0,e.createElementVNode)("li",null,[(0,e.createElementVNode)("code",null,"$terraform plan -out tf.plan")]),(0,e.createElementVNode)("li",null,[(0,e.createElementVNode)("code",null,"$terraform show -json -no-color tf.plan > tf.json")]),(0,e.createTextVNode)(" - For TF 0.12 and prior, use command "),(0,e.createElementVNode)("code",null,"$terraform show tf.plan > tf.out"),(0,e.createElementVNode)("li",null,"View the converted JSON file in VS Code and run the desired policy check")],-1)],S=(0,e.createElementVNode)("hr",{style:{"margin-top":"25px"}},null,-1),D={class:"validate-container"},R=(0,e.createElementVNode)("h2",{style:{"border-bottom-style":"none"}},"Validate Policies",-1),P={style:{display:"grid"}},M=(0,e.createElementVNode)("p",null," Validate your policy against IAM policy grammar and AWS best practices. You can view policy validation check findings that include security warnings, errors, general warnings, and suggestions for your policy. These findings provide actionable recommendations that help you author policies that are functional and conform to security best practices. ",-1),ee={style:{display:"grid"}},oe=["disabled"],te={style:{"margin-top":"5px"}},ne=(0,e.createElementVNode)("hr",{style:{"margin-top":"25px"}},null,-1),ce={key:0,class:"custom-checks-container"},re=(0,e.createElementVNode)("h2",{style:{"border-bottom-style":"none"}},"Custom Policy Checks",-1),ie={style:{display:"block"}},se=(0,e.createElementVNode)("p",null," Validate your policy against your specified security standards using IAM Access Analyzer custom policy checks. You can check for new access against a reference policy, whether access is granted to a list of IAM actions and/or resource ARNs, or public access to supported resource types. ",-1),ae=(0,e.createElementVNode)("a",{href:"https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-custom-policy-checks.html"},"More about Custom Policy Checks",-1),de={style:{"justify-content":"space-between"}},le={style:{display:"flex"}},be={style:{display:"block","margin-right":"25px"}},fe=(0,e.createElementVNode)("label",{for:"select-check-type",style:{display:"block","margin-top":"15px","margin-bottom":"3px"}},"Select a Check Type",-1),ve=[(0,e.createElementVNode)("option",{value:"CheckAccessNotGranted"},"CheckAccessNotGranted",-1),(0,e.createElementVNode)("option",{value:"CheckNoNewAccess"},"CheckNoNewAccess",-1),(0,e.createElementVNode)("option",{value:"CheckNoPublicAccess"},"CheckNoPublicAccess",-1)],ue={key:0,style:{display:"block"}},pe=(0,e.createElementVNode)("label",{for:"select-reference-type",style:{display:"block","margin-top":"15px","margin-bottom":"3px"}},"Select a Reference Policy Type",-1),he=[(0,e.createElementVNode)("option",{value:"Identity"},"Identity",-1),(0,e.createElementVNode)("option",{value:"Resource"},"Resource",-1)],me={key:0},ge=(0,e.createElementVNode)("label",{for:"input-path",style:{display:"block","margin-bottom":"3px"}},"Provide a reference file containing a JSON Policy Document",-1),ye={key:0,style:{"margin-top":"5px"}},_e={style:{color:"var(--vscode-errorForeground)"}},ke=(0,e.createElementVNode)("label",{style:{"margin-bottom":"3px"}},"Enter a JSON Policy Document",-1),we={key:1},xe=(0,e.createElementVNode)("label",{for:"input-path",style:{display:"block","margin-bottom":"3px"}},[(0,e.createTextVNode)(" Provide a reference JSON file containing actions and/or resources. The file should be structured as follows: "),(0,e.createElementVNode)("code",null,'{"actions": ["action1", "action2", "action3"], "resources": ["resource1", "resource2", "resource3"]}')],-1),Ne={key:0,style:{"margin-top":"5px"}},Ee={style:{color:"var(--vscode-errorForeground)"}},Ce=(0,e.createElementVNode)("label",{style:{"margin-bottom":"3px"}},"Enter a comma-separated list of actions",-1),Ae=(0,e.createElementVNode)("label",{style:{"margin-bottom":"3px"}},"Enter a comma-separated list of resource ARNs",-1),Pe={style:{display:"grid"}},Te=(0,e.createElementVNode)("b",{style:{"margin-bottom":"5px"}},[(0,e.createTextVNode)("A charge is associated with each custom policy check. For more details about pricing, see "),(0,e.createElementVNode)("a",{href:"https://aws.amazon.com/iam/access-analyzer/pricing/"}," IAM Access Analyzer pricing "),(0,e.createTextVNode)(". ")],-1),De=["disabled"],Ve={style:{"margin-top":"5px"}};function Se(o,t,k,g,w,V){return(0,e.openBlock)(),(0,e.createElementBlock)("div",c,[(0,e.createElementVNode)("div",null,[n,o.initialData.pythonToolsInstalled?(0,e.createCommentVNode)("v-if",!0):((0,e.openBlock)(),(0,e.createElementBlock)("div",s,y)),(0,e.createElementVNode)("div",x,[(0,e.createElementVNode)("div",C,[(0,e.createElementVNode)("div",A,[T,(0,e.withDirectives)((0,e.createElementVNode)("select",{id:"select-document-type",onChange:t[0]||(t[0]=(...r)=>o.setDocumentType&&o.setDocumentType(...r)),"onUpdate:modelValue":t[1]||(t[1]=r=>o.documentType=r)},j,544),[[e.vModelSelect,o.documentType]])]),o.documentType=="JSON Policy Language"?((0,e.openBlock)(),(0,e.createElementBlock)("div",z,[F,(0,e.withDirectives)((0,e.createElementVNode)("select",{id:"select-policy-type",onChange:t[2]||(t[2]=(...r)=>o.setValidatePolicyType&&o.setValidatePolicyType(...r)),"onUpdate:modelValue":t[3]||(t[3]=r=>o.validatePolicyType=r)},$,544),[[e.vModelSelect,o.validatePolicyType]])])):(0,e.createCommentVNode)("v-if",!0)]),i,(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"text",style:{display:"flex",cursor:"not-allowed","box-sizing":"border-box",position:"relative",opacity:"0.4",width:"70%"},id:"input-path",placeholder:"Input policy file path",readOnly:"",disabled:"","onUpdate:modelValue":t[4]||(t[4]=r=>o.inputPath=r)},null,512),[[e.vModelText,o.inputPath]])]),o.documentType=="CloudFormation"?((0,e.openBlock)(),(0,e.createElementBlock)("div",v,[b,(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"text",style:{display:"flex","box-sizing":"border-box",position:"relative","margin-bottom":"10px",width:"70%"},id:"input-path",placeholder:"CloudFormation Parameter File Path",onChange:t[5]||(t[5]=(...r)=>o.setCfnParameterFilePath&&o.setCfnParameterFilePath(...r)),"onUpdate:modelValue":t[6]||(t[6]=r=>o.initialData.cfnParameterPath=r)},null,544),[[e.vModelText,o.initialData.cfnParameterPath]])])):(0,e.createCommentVNode)("v-if",!0),o.documentType=="Terraform Plan"?((0,e.openBlock)(),(0,e.createElementBlock)("div",l,h)):(0,e.createCommentVNode)("v-if",!0)]),S,(0,e.createElementVNode)("div",D,[R,(0,e.createElementVNode)("div",P,[M,(0,e.createElementVNode)("div",ee,[(0,e.createElementVNode)("div",null,[(0,e.createElementVNode)("button",{class:"button-theme-primary",onClick:t[7]||(t[7]=(...r)=>o.runValidator&&o.runValidator(...r)),disabled:o.validateButtonDisabled}," Run Policy Validation ",8,oe),(0,e.createElementVNode)("div",te,[(0,e.createElementVNode)("p",{style:(0,e.normalizeStyle)({color:o.validatePolicyResponseColor})},(0,e.toDisplayString)(o.validatePolicyResponse),5)])])])])]),ne,o.documentType!="JSON Policy Language"?((0,e.openBlock)(),(0,e.createElementBlock)("div",ce,[re,(0,e.createElementVNode)("div",ie,[se,ae,(0,e.createElementVNode)("div",de,[(0,e.createElementVNode)("div",le,[(0,e.createElementVNode)("div",be,[fe,(0,e.createElementVNode)("select",{id:"select-check-type",style:{"margin-bottom":"5px"},onChange:t[8]||(t[8]=(...r)=>o.setCheckType&&o.setCheckType(...r))},ve,32)]),(o.documentType=="CloudFormation"||o.documentType=="Terraform Plan")&&o.checkType=="CheckNoNewAccess"?((0,e.openBlock)(),(0,e.createElementBlock)("div",ue,[pe,(0,e.withDirectives)((0,e.createElementVNode)("select",{id:"select-reference-type",onChange:t[9]||(t[9]=(...r)=>o.setCheckNoNewAccessPolicyType&&o.setCheckNoNewAccessPolicyType(...r)),"onUpdate:modelValue":t[10]||(t[10]=r=>o.checkNoNewAccessPolicyType=r)},he,544),[[e.vModelSelect,o.checkNoNewAccessPolicyType]])])):(0,e.createCommentVNode)("v-if",!0)])]),o.checkType=="CheckNoNewAccess"?((0,e.openBlock)(),(0,e.createElementBlock)("div",me,[(0,e.createElementVNode)("div",null,[ge,(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"text",style:{display:"flex","box-sizing":"border-box",position:"relative","margin-bottom":"10px",width:"70%"},id:"input-path",placeholder:"Enter reference policy document",onChange:t[11]||(t[11]=(...r)=>o.setCheckNoNewAccessFilePath&&o.setCheckNoNewAccessFilePath(...r)),"onUpdate:modelValue":t[12]||(t[12]=r=>o.initialData.checkNoNewAccessFilePath=r)},null,544),[[e.vModelText,o.initialData.checkNoNewAccessFilePath]])]),o.initialData.customChecksFileErrorMessage?((0,e.openBlock)(),(0,e.createElementBlock)("div",ye,[(0,e.createElementVNode)("p",_e,(0,e.toDisplayString)(o.initialData.customChecksFileErrorMessage),1)])):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("div",null,[ke,(0,e.withDirectives)((0,e.createElementVNode)("textarea",{style:{width:"100%","margin-bottom":"10px","font-family":`-apple-system,
                                    BlinkMacSystemFont,
                                    Segoe UI,
                                    Roboto,
                                    Helvetica,
                                    Arial,
                                    sans-serif,
                                    Apple Color Emoji,
                                    Segoe UI Emoji,
                                    Segoe UI Symbol`},rows:"30","onUpdate:modelValue":t[13]||(t[13]=r=>o.initialData.checkNoNewAccessTextArea=r),onChange:t[14]||(t[14]=(...r)=>o.setCheckNoNewAccessTextArea&&o.setCheckNoNewAccessTextArea(...r)),placeholder:"Reference policy document"},null,544),[[e.vModelText,o.initialData.checkNoNewAccessTextArea]])])])):(0,e.createCommentVNode)("v-if",!0),o.checkType=="CheckAccessNotGranted"?((0,e.openBlock)(),(0,e.createElementBlock)("div",we,[(0,e.createElementVNode)("div",null,[xe,(0,e.withDirectives)((0,e.createElementVNode)("input",{type:"text",style:{display:"flex","box-sizing":"border-box",position:"relative","margin-bottom":"10px",width:"70%"},id:"input-path",placeholder:"File path to JSON file",onChange:t[15]||(t[15]=(...r)=>o.setCheckAccessNotGrantedFilePath&&o.setCheckAccessNotGrantedFilePath(...r)),"onUpdate:modelValue":t[16]||(t[16]=r=>o.initialData.checkAccessNotGrantedFilePath=r)},null,544),[[e.vModelText,o.initialData.checkAccessNotGrantedFilePath]])]),o.initialData.customChecksFileErrorMessage?((0,e.openBlock)(),(0,e.createElementBlock)("div",Ne,[(0,e.createElementVNode)("p",Ee,(0,e.toDisplayString)(o.initialData.customChecksFileErrorMessage),1)])):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("div",null,[Ce,(0,e.withDirectives)((0,e.createElementVNode)("textarea",{style:{width:"100%","margin-bottom":"10px","font-family":`-apple-system,
                                    BlinkMacSystemFont,
                                    Segoe UI,
                                    Roboto,
                                    Helvetica,
                                    Arial,
                                    sans-serif,
                                    Apple Color Emoji,
                                    Segoe UI Emoji,
                                    Segoe UI Symbol`},rows:"15",onChange:t[17]||(t[17]=(...r)=>o.setcheckAccessNotGrantedActionsTextArea&&o.setcheckAccessNotGrantedActionsTextArea(...r)),"onUpdate:modelValue":t[18]||(t[18]=r=>o.initialData.checkAccessNotGrantedActionsTextArea=r),placeholder:"List of actions"},null,544),[[e.vModelText,o.initialData.checkAccessNotGrantedActionsTextArea]])]),(0,e.createElementVNode)("div",null,[Ae,(0,e.withDirectives)((0,e.createElementVNode)("textarea",{style:{width:"100%","margin-bottom":"10px","font-family":`-apple-system,
                                    BlinkMacSystemFont,
                                    Segoe UI,
                                    Roboto,
                                    Helvetica,
                                    Arial,
                                    sans-serif,
                                    Apple Color Emoji,
                                    Segoe UI Emoji,
                                    Segoe UI Symbol`},rows:"15",onChange:t[19]||(t[19]=(...r)=>o.setcheckAccessNotGrantedResourcesTextArea&&o.setcheckAccessNotGrantedResourcesTextArea(...r)),"onUpdate:modelValue":t[20]||(t[20]=r=>o.initialData.checkAccessNotGrantedResourcesTextArea=r),placeholder:"List of resource ARNs"},null,544),[[e.vModelText,o.initialData.checkAccessNotGrantedResourcesTextArea]])])])):(0,e.createCommentVNode)("v-if",!0),(0,e.createElementVNode)("div",Pe,[Te,(0,e.createElementVNode)("div",null,[(0,e.createElementVNode)("button",{class:"button-theme-primary",style:{"margin-bottom":"5px"},onClick:t[21]||(t[21]=(...r)=>o.runCustomPolicyCheck&&o.runCustomPolicyCheck(...r)),disabled:o.customCheckButtonDisabled}," Run Custom Policy Check ",8,De),(0,e.createElementVNode)("div",Ve,[(0,e.createElementVNode)("p",{style:(0,e.normalizeStyle)({color:o.customPolicyCheckResponseColor})},(0,e.toDisplayString)(o.customPolicyCheckResponse),5)])])])])])):(0,e.createCommentVNode)("v-if",!0)])}class U{static registerGlobalCommands(){const t=new Event("remount");window.addEventListener("message",k=>{const{command:g}=k.data;if(g==="$clear"){vscode.setState({});for(const w of this.messageListeners)this.removeListener(w);window.dispatchEvent(t)}})}static addListener(t){this.messageListeners.add(t),window.addEventListener("message",t)}static removeListener(t){this.messageListeners.delete(t),window.removeEventListener("message",t)}static sendRequest(t,k,g){const w=JSON.parse(JSON.stringify(g)),V=new Promise((r,W)=>{const K=ze=>{const B=ze.data;if(t===B.id)if(this.removeListener(K),window.clearTimeout(Oe),B.error===!0){const Fe=JSON.parse(B.data);W(new Error(Fe.message))}else B.event?(typeof g[0]!="function"&&W(new Error(`Expected frontend event handler to be a function: ${k}`)),r(this.registerEventHandler(k,g[0]))):r(B.data)},Oe=setTimeout(()=>{this.removeListener(K),W(new Error(`Timed out while waiting for response: id: ${t}, command: ${k}`))},3e5);this.addListener(K)});return vscode.postMessage({id:t,command:k,data:w}),V}static registerEventHandler(t,k){const g=w=>{const V=w.data;if(V.command===t){if(!V.event)throw new Error(`Expected backend handler to be an event emitter: ${t}`);k(V.data)}};return this.addListener(g),{dispose:()=>this.removeListener(g)}}static create(){return this.initialized||(this.initialized=!0,this.registerGlobalCommands()),new Proxy({},{set:()=>{throw new TypeError("Cannot set property to webview client")},get:(t,k)=>{if(typeof k!="string"){console.warn(`Tried to index webview client with non-string property: ${String(k)}`);return}if(k==="init"){const w=vscode.getState()??{};if(w.__once)return()=>Promise.resolve();vscode.setState(Object.assign(w,{__once:!0}))}const g=(this.counter++).toString();return(...w)=>this.sendRequest(g,k,w)}})}}U.counter=0,U.initialized=!1,U.messageListeners=new Set;const L=new Set;window.addEventListener("remount",()=>L.clear());const je={created(){if(this.$data===void 0)return;const o=vscode.getState()??{};this.$options._count=(this.$options._count??0)+1;const t=this.id??`${this.name??`DEFAULT-${L.size}`}-${this.$options._count}`;if(this.$options._unid=t,L.has(t)){console.warn(`Component "${t}" already exists. State-saving functionality will be disabled.`);return}L.add(t);const k=o[t]??{};for(const g of Object.keys(this.$data))this.$data[g]=k[g]??this.$data[g];for(const g of Object.keys(this.$data))this.$watch(g,w=>{const V=vscode.getState()??{},r=Object.assign(V[t]??{},{[g]:w!==void 0?JSON.parse(JSON.stringify(w)):void 0});vscode.setState(Object.assign(V,{[t]:r}))},{deep:!0})}};var Ke=m(5928),Je=m(4936);const p=U.create(),Re=(0,e.defineComponent)({mixins:[je],data:()=>({documentType:"CloudFormation",validatePolicyType:"Identity",checkNoNewAccessPolicyType:"Identity",checkType:"CheckAccessNotGranted",initialData:{checkNoNewAccessFilePath:"",checkNoNewAccessTextArea:"",checkAccessNotGrantedFilePath:"",checkAccessNotGrantedActionsTextArea:"",checkAccessNotGrantedResourcesTextArea:"",customChecksFileErrorMessage:"",cfnParameterPath:"",pythonToolsInstalled:!1},inputPath:"",checkAccessNotGrantedPathPlaceholder:"List of actions file path",checkAccessNotGrantedActionsTextAreaPlaceholder:"Enter a list of actions",checkAccessNotGrantedResourcesTextAreaPlaceholder:"Enter a list of resource ARNs",validatePolicyResponse:"",validatePolicyResponseColor:"var(--vscode-errorForeground)",customPolicyCheckResponse:"",customPolicyCheckResponseColor:"var(--vscode-errorForeground)",validateButtonDisabled:!1,customCheckButtonDisabled:!1}),async created(){this.initialData=await p.init()??this.initialData,p.onChangeInputPath(o=>{this.inputPath=o}),p.onChangeCheckNoNewAccessFilePath(o=>{this.initialData.checkNoNewAccessFilePath=o,p.readCustomChecksFile(this.initialData.checkNoNewAccessFilePath).then(t=>{this.initialData.checkNoNewAccessTextArea=t}).catch(t=>console.log(t))}),p.onChangeCheckAccessNotGrantedFilePath(o=>{this.initialData.checkAccessNotGrantedFilePath=o,p.readCustomChecksJsonFile(this.initialData.checkAccessNotGrantedFilePath).then(t=>{this.initialData.checkAccessNotGrantedActionsTextArea=t.actions?t.actions.toString():"",this.initialData.checkAccessNotGrantedResourcesTextArea=t.resources?t.resources.toString():""}).catch(t=>console.log(t))}),p.onChangeCloudformationParameterFilePath(o=>{this.initialData.cfnParameterPath=o}),p.onValidatePolicyResponse(o=>{this.validatePolicyResponse=o[0],this.validatePolicyResponseColor=o[1]}),p.onCustomPolicyCheckResponse(o=>{this.customPolicyCheckResponse=o[0],this.customPolicyCheckResponseColor=o[1]}),p.onFileReadError(o=>{this.initialData.customChecksFileErrorMessage=o})},methods:{setDocumentType:function(o){p.emitUiClick("accessanalyzer_selectDocumentType"),this.documentType=o.target.value},setValidatePolicyType:function(o){p.emitUiClick("accessanalyzer_selectInputPolicyType"),this.validatePolicyType=o.target.value},setCheckNoNewAccessPolicyType:function(o){p.emitUiClick("accessanalyzer_selectReferencePolicyType"),this.checkNoNewAccessPolicyType=o.target.value},setCheckType:function(o){p.emitUiClick("accessanalyzer_selectCustomCheckType"),this.checkType=o.target.value},setCheckNoNewAccessFilePath:function(o){p.emitUiClick("accessanalyzer_selectCheckNoNewAccessFilePath"),this.initialData.checkNoNewAccessFilePath=o.target.value,p.readCustomChecksFile(this.initialData.checkNoNewAccessFilePath).then(t=>{this.initialData.checkNoNewAccessTextArea=t}).catch(t=>console.log(t))},setCheckNoNewAccessTextArea:function(o){this.initialData.checkNoNewAccessTextArea=o.target.value,this.initialData.checkNoNewAccessFilePath=""},setCheckAccessNotGrantedFilePath:function(o){p.emitUiClick("accessanalyzer_selectCheckAccessNotGrantedFilePath"),this.initialData.checkAccessNotGrantedFilePath=o.target.value,p.readCustomChecksJsonFile(this.initialData.checkAccessNotGrantedFilePath).then(t=>{this.initialData.checkAccessNotGrantedActionsTextArea=t.actions?t.actions.toString():"",this.initialData.checkAccessNotGrantedResourcesTextArea=t.resources?t.resources.toString():""}).catch(t=>console.log(t))},setcheckAccessNotGrantedActionsTextArea:function(o){this.initialData.checkAccessNotGrantedActionsTextArea=o.target.value,this.initialData.checkAccessNotGrantedFilePath=""},setcheckAccessNotGrantedResourcesTextArea:function(o){this.initialData.checkAccessNotGrantedResourcesTextArea=o.target.value,this.initialData.checkAccessNotGrantedFilePath=""},setCfnParameterFilePath:function(o){p.emitUiClick("accessanalyzer_selectCfnParameterFilePath"),this.initialData.cfnParameterPath=o.target.value},runValidator:async function(){this.validateButtonDisabled=!0,p.emitUiClick("accessanalyzer_runValidatePolicy"),await p.validatePolicy(this.documentType,this.validatePolicyType,this.initialData.cfnParameterPath),this.validateButtonDisabled=!1},runCustomPolicyCheck:async function(){this.customCheckButtonDisabled=!0,p.emitUiClick("accessanalyzer_runCustomPolicyCheck"),this.checkType=="CheckNoNewAccess"?await p.checkNoNewAccess(this.documentType,this.checkNoNewAccessPolicyType,this.initialData.checkNoNewAccessTextArea,this.initialData.cfnParameterPath):this.checkType=="CheckAccessNotGranted"?await p.checkAccessNotGranted(this.documentType,this.initialData.checkAccessNotGrantedActionsTextArea,this.initialData.checkAccessNotGrantedResourcesTextArea,this.initialData.cfnParameterPath):this.checkType=="CheckNoPublicAccess"&&await p.checkNoPublicAccess(this.documentType,this.initialData.cfnParameterPath),this.customCheckButtonDisabled=!1}},computed:{}});var Me=m(7433);const Be=(0,Me.A)(Re,[["render",Se]]);const Q=()=>(0,e.createApp)(Be),Z=Q();Z.mount("#vue-app"),window.addEventListener("remount",()=>{Z.unmount(),Q().mount("#vue-app")})})();var H=this;for(var X in I)H[X]=I[X];I.__esModule&&Object.defineProperty(H,"__esModule",{value:!0})})();
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
