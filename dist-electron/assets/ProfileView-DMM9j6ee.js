import{ap as Ve,aq as hr,M as Ot,ar as mr,e as C,i as W,f as Z,j as ne,k as c,u as at,as as pr,at as ve,au as ke,av as Ue,aw as ht,ax as Se,ay as _e,az as Ae,aA as He,aB as Te,aC as er,aD as wt,aE as xt,aF as kt,w as z,q as I,aG as We,aH as Ge,aI as qt,am as tr,aJ as et,aK as St,aL as Rt,aM as Ct,aN as _t,aO as gr,g as te,aP as rr,ac as nr,aQ as vr,aR as br,o as Pe,aS as yr,aT as gt,aU as qe,t as ce,v as Mt,aV as wr,aW as xr,aX as ot,Y as be,aY as kr,aZ as ar,a_ as Tt,a$ as Sr,aj as vt,l as Rr,b0 as Vt,b1 as Cr,a3 as ir,b2 as _r,C as xe,D as ue,F as Q,b3 as Ar,T as F,P as E,Q as A,a9 as Ye,O as zt,H as Dt,ao as Ze,X as ge,V as bt,K as Fe,U as Pr,$ as Nt,a8 as Lt,J as $r,ad as Er,ab as Fr,b4 as st,_ as Ir}from"./index-CK7CDABy.js";import{s as lt}from"./stravaBridge-2wTHl2Gf.js";import{B as Or,V as qr,a as Mr,u as At,b as jt,g as or}from"./get-CuAD0VPT.js";import{N as mt,u as Ur}from"./use-message-DNpmWyuk.js";import{u as Tr,N as Le,a as Vr}from"./Space-uHY8npo9.js";import{u as zr}from"./use-compitable-Bkip92PQ.js";import{N as Dr,a as Nr,b as Lr}from"./Spin-CGIKCOk1.js";function jr(t,e,r){var n;const a=Ve(t,null);if(a===null)return;const i=(n=hr())===null||n===void 0?void 0:n.proxy;Ot(r,o),o(r.value),mr(()=>{o(void 0,r.value)});function o(f,d){if(!a)return;const p=a[e];d!==void 0&&s(p,d),f!==void 0&&l(p,f)}function s(f,d){f[d]||(f[d]=[]),f[d].splice(f[d].findIndex(p=>p===i),1)}function l(f,d){f[d]||(f[d]=[]),~f[d].findIndex(p=>p===i)||f[d].push(i)}}const Br=C("input-group",`
 display: inline-flex;
 width: 100%;
 flex-wrap: nowrap;
 vertical-align: bottom;
`,[W(">",[C("input",[W("&:not(:last-child)",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `),W("&:not(:first-child)",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 margin-left: -1px!important;
 `)]),C("button",[W("&:not(:last-child)",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `,[Z("state-border, border",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `)]),W("&:not(:first-child)",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `,[Z("state-border, border",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `)])]),W("*",[W("&:not(:last-child)",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `,[W(">",[C("input",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `),C("base-selection",[C("base-selection-label",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `),C("base-selection-tags",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `),Z("box-shadow, border, state-border",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `)])])]),W("&:not(:first-child)",`
 margin-left: -1px!important;
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `,[W(">",[C("input",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `),C("base-selection",[C("base-selection-label",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `),C("base-selection-tags",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `),Z("box-shadow, border, state-border",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `)])])])])])]),Hr={},Wr=ne({name:"InputGroup",props:Hr,setup(t){const{mergedClsPrefixRef:e}=at(t);return pr("-input-group",Br,e),{mergedClsPrefix:e}},render(){const{mergedClsPrefix:t}=this;return c("div",{class:`${t}-input-group`},this.$slots)}});function Gr(t,e){switch(t[0]){case"hex":return e?"#000000FF":"#000000";case"rgb":return e?"rgba(0, 0, 0, 1)":"rgb(0, 0, 0)";case"hsl":return e?"hsla(0, 0%, 0%, 1)":"hsl(0, 0%, 0%)";case"hsv":return e?"hsva(0, 0%, 0%, 1)":"hsv(0, 0%, 0%)"}return"#000000"}function rt(t){return t===null?null:/^ *#/.test(t)?"hex":t.includes("rgb")?"rgb":t.includes("hsl")?"hsl":t.includes("hsv")?"hsv":null}function Kr(t,e=[255,255,255],r="AA"){const[n,a,i,o]=ve(ke(t));if(o===1){const S=dt([n,a,i]),m=dt(e);return(Math.max(S,m)+.05)/(Math.min(S,m)+.05)>=(r==="AA"?4.5:7)}const s=Math.round(n*o+e[0]*(1-o)),l=Math.round(a*o+e[1]*(1-o)),f=Math.round(i*o+e[2]*(1-o)),d=dt([s,l,f]),p=dt(e);return(Math.max(d,p)+.05)/(Math.min(d,p)+.05)>=(r==="AA"?4.5:7)}function dt(t){const[e,r,n]=t.map(a=>(a/=255,a<=.03928?a/12.92:Math.pow((a+.055)/1.055,2.4)));return .2126*e+.7152*r+.0722*n}function Yr(t){return t=Math.round(t),t>=360?359:t<0?0:t}function Zr(t){return t=Math.round(t*100)/100,t>1?1:t<0?0:t}const Xr={rgb:{hex(t){return Ae(ve(t))},hsl(t){const[e,r,n,a]=ve(t);return ke([...kt(e,r,n),a])},hsv(t){const[e,r,n,a]=ve(t);return Te([...xt(e,r,n),a])}},hex:{rgb(t){return Se(ve(t))},hsl(t){const[e,r,n,a]=ve(t);return ke([...kt(e,r,n),a])},hsv(t){const[e,r,n,a]=ve(t);return Te([...xt(e,r,n),a])}},hsl:{hex(t){const[e,r,n,a]=He(t);return Ae([...wt(e,r,n),a])},rgb(t){const[e,r,n,a]=He(t);return Se([...wt(e,r,n),a])},hsv(t){const[e,r,n,a]=He(t);return Te([...er(e,r,n),a])}},hsv:{hex(t){const[e,r,n,a]=Ue(t);return Ae([..._e(e,r,n),a])},rgb(t){const[e,r,n,a]=Ue(t);return Se([..._e(e,r,n),a])},hsl(t){const[e,r,n,a]=Ue(t);return ke([...ht(e,r,n),a])}}};function sr(t,e,r){return r=r||rt(t),r?r===e?t:Xr[r][e](t):null}const Xe="12px",Jr=12,Ie="6px",Qr=ne({name:"AlphaSlider",props:{clsPrefix:{type:String,required:!0},rgba:{type:Array,default:null},alpha:{type:Number,default:0},onUpdateAlpha:{type:Function,required:!0},onComplete:Function},setup(t){const e=z(null);function r(i){!e.value||!t.rgba||(We("mousemove",document,n),We("mouseup",document,a),n(i))}function n(i){const{value:o}=e;if(!o)return;const{width:s,left:l}=o.getBoundingClientRect(),f=(i.clientX-l)/(s-Jr);t.onUpdateAlpha(Zr(f))}function a(){var i;Ge("mousemove",document,n),Ge("mouseup",document,a),(i=t.onComplete)===null||i===void 0||i.call(t)}return{railRef:e,railBackgroundImage:I(()=>{const{rgba:i}=t;return i?`linear-gradient(to right, rgba(${i[0]}, ${i[1]}, ${i[2]}, 0) 0%, rgba(${i[0]}, ${i[1]}, ${i[2]}, 1) 100%)`:""}),handleMouseDown:r}},render(){const{clsPrefix:t}=this;return c("div",{class:`${t}-color-picker-slider`,ref:"railRef",style:{height:Xe,borderRadius:Ie},onMousedown:this.handleMouseDown},c("div",{style:{borderRadius:Ie,position:"absolute",left:0,right:0,top:0,bottom:0,overflow:"hidden"}},c("div",{class:`${t}-color-picker-checkboard`}),c("div",{class:`${t}-color-picker-slider__image`,style:{backgroundImage:this.railBackgroundImage}})),this.rgba&&c("div",{style:{position:"absolute",left:Ie,right:Ie,top:0,bottom:0}},c("div",{class:`${t}-color-picker-handle`,style:{left:`calc(${this.alpha*100}% - ${Ie})`,borderRadius:Ie,width:Xe,height:Xe}},c("div",{class:`${t}-color-picker-handle__fill`,style:{backgroundColor:Se(this.rgba),borderRadius:Ie,width:Xe,height:Xe}}))))}}),Ut=qt("n-color-picker");function en(t){return/^\d{1,3}\.?\d*$/.test(t.trim())?Math.max(0,Math.min(Number.parseInt(t),255)):!1}function tn(t){return/^\d{1,3}\.?\d*$/.test(t.trim())?Math.max(0,Math.min(Number.parseInt(t),360)):!1}function rn(t){return/^\d{1,3}\.?\d*$/.test(t.trim())?Math.max(0,Math.min(Number.parseInt(t),100)):!1}function nn(t){const e=t.trim();return/^#[0-9a-fA-F]+$/.test(e)?[4,5,7,9].includes(e.length):!1}function an(t){return/^\d{1,3}\.?\d*%$/.test(t.trim())?Math.max(0,Math.min(Number.parseInt(t)/100,100)):!1}const on={paddingSmall:"0 4px"},Bt=ne({name:"ColorInputUnit",props:{label:{type:String,required:!0},value:{type:[Number,String],default:null},showAlpha:Boolean,onUpdateValue:{type:Function,required:!0}},setup(t){const e=z(""),{themeRef:r}=Ve(Ut,null);tr(()=>{e.value=n()});function n(){const{value:o}=t;if(o===null)return"";const{label:s}=t;return s==="HEX"?o:s==="A"?`${Math.floor(o*100)}%`:String(Math.floor(o))}function a(o){e.value=o}function i(o){let s,l;switch(t.label){case"HEX":l=nn(o),l&&t.onUpdateValue(o),e.value=n();break;case"H":s=tn(o),s===!1?e.value=n():t.onUpdateValue(s);break;case"S":case"L":case"V":s=rn(o),s===!1?e.value=n():t.onUpdateValue(s);break;case"A":s=an(o),s===!1?e.value=n():t.onUpdateValue(s);break;case"R":case"G":case"B":s=en(o),s===!1?e.value=n():t.onUpdateValue(s);break}}return{mergedTheme:r,inputValue:e,handleInputChange:i,handleInputUpdateValue:a}},render(){const{mergedTheme:t}=this;return c(mt,{size:"small",placeholder:this.label,theme:t.peers.Input,themeOverrides:t.peerOverrides.Input,builtinThemeOverrides:on,value:this.inputValue,onUpdateValue:this.handleInputUpdateValue,onChange:this.handleInputChange,style:this.label==="A"?"flex-grow: 1.25;":""})}}),sn=ne({name:"ColorInput",props:{clsPrefix:{type:String,required:!0},mode:{type:String,required:!0},modes:{type:Array,required:!0},showAlpha:{type:Boolean,required:!0},value:{type:String,default:null},valueArr:{type:Array,default:null},onUpdateValue:{type:Function,required:!0},onUpdateMode:{type:Function,required:!0}},setup(t){return{handleUnitUpdateValue(e,r){const{showAlpha:n}=t;if(t.mode==="hex"){t.onUpdateValue((n?Ae:et)(r));return}let a;switch(t.valueArr===null?a=[0,0,0,0]:a=Array.from(t.valueArr),t.mode){case"hsv":a[e]=r,t.onUpdateValue((n?Te:Ct)(a));break;case"rgb":a[e]=r,t.onUpdateValue((n?Se:Rt)(a));break;case"hsl":a[e]=r,t.onUpdateValue((n?ke:St)(a));break}}}},render(){const{clsPrefix:t,modes:e}=this;return c("div",{class:`${t}-color-picker-input`},c("div",{class:`${t}-color-picker-input__mode`,onClick:this.onUpdateMode,style:{cursor:e.length===1?"":"pointer"}},this.mode.toUpperCase()+(this.showAlpha?"A":"")),c(Wr,null,{default:()=>{const{mode:r,valueArr:n,showAlpha:a}=this;if(r==="hex"){let i=null;try{i=n===null?null:(a?Ae:et)(n)}catch{}return c(Bt,{label:"HEX",showAlpha:a,value:i,onUpdateValue:o=>{this.handleUnitUpdateValue(0,o)}})}return(r+(a?"a":"")).split("").map((i,o)=>c(Bt,{label:i.toUpperCase(),value:n===null?null:n[o],onUpdateValue:s=>{this.handleUnitUpdateValue(o,s)}}))}}))}});function ln(t,e){if(e==="hsv"){const[r,n,a,i]=Ue(t);return Se([..._e(r,n,a),i])}return t}function dn(t){const e=document.createElement("canvas").getContext("2d");return e?(e.fillStyle=t,e.fillStyle):"#000000"}const un=ne({name:"ColorPickerSwatches",props:{clsPrefix:{type:String,required:!0},mode:{type:String,required:!0},swatches:{type:Array,required:!0},onUpdateColor:{type:Function,required:!0}},setup(t){const e=I(()=>t.swatches.map(i=>{const o=rt(i);return{value:i,mode:o,legalValue:ln(i,o)}}));function r(i){const{mode:o}=t;let{value:s,mode:l}=i;return l||(l="hex",/^[a-zA-Z]+$/.test(s)?s=dn(s):(_t("color-picker",`color ${s} in swatches is invalid.`),s="#000000")),l===o?s:sr(s,o,l)}function n(i){t.onUpdateColor(r(i))}function a(i,o){i.key==="Enter"&&n(o)}return{parsedSwatchesRef:e,handleSwatchSelect:n,handleSwatchKeyDown:a}},render(){const{clsPrefix:t}=this;return c("div",{class:`${t}-color-picker-swatches`},this.parsedSwatchesRef.map(e=>c("div",{class:`${t}-color-picker-swatch`,tabindex:0,onClick:()=>{this.handleSwatchSelect(e)},onKeydown:r=>{this.handleSwatchKeyDown(r,e)}},c("div",{class:`${t}-color-picker-swatch__fill`,style:{background:e.legalValue}}))))}}),cn=ne({name:"ColorPickerTrigger",slots:Object,props:{clsPrefix:{type:String,required:!0},value:{type:String,default:null},hsla:{type:Array,default:null},disabled:Boolean,onClick:Function},setup(t){const{colorPickerSlots:e,renderLabelRef:r}=Ve(Ut,null);return()=>{const{hsla:n,value:a,clsPrefix:i,onClick:o,disabled:s}=t,l=e.label||r.value;return c("div",{class:[`${i}-color-picker-trigger`,s&&`${i}-color-picker-trigger--disabled`],onClick:s?void 0:o},c("div",{class:`${i}-color-picker-trigger__fill`},c("div",{class:`${i}-color-picker-checkboard`}),c("div",{style:{position:"absolute",left:0,right:0,top:0,bottom:0,backgroundColor:n?ke(n):""}}),a&&n?c("div",{class:`${i}-color-picker-trigger__value`,style:{color:Kr(n)?"white":"black"}},l?l(a):a):null))}}}),fn=ne({name:"ColorPreview",props:{clsPrefix:{type:String,required:!0},mode:{type:String,required:!0},color:{type:String,default:null,validator:t=>{const e=rt(t);return!!(!t||e&&e!=="hsv")}},onUpdateColor:{type:Function,required:!0}},setup(t){function e(r){var n;const a=r.target.value;(n=t.onUpdateColor)===null||n===void 0||n.call(t,sr(a.toUpperCase(),t.mode,"hex")),r.stopPropagation()}return{handleChange:e}},render(){const{clsPrefix:t}=this;return c("div",{class:`${t}-color-picker-preview__preview`},c("span",{class:`${t}-color-picker-preview__fill`,style:{background:this.color||"#000000"}}),c("input",{class:`${t}-color-picker-preview__input`,type:"color",value:this.color,onChange:this.handleChange}))}}),je="12px",hn=12,Oe="6px",mn=6,pn="linear-gradient(90deg,red,#ff0 16.66%,#0f0 33.33%,#0ff 50%,#00f 66.66%,#f0f 83.33%,red)",gn=ne({name:"HueSlider",props:{clsPrefix:{type:String,required:!0},hue:{type:Number,required:!0},onUpdateHue:{type:Function,required:!0},onComplete:Function},setup(t){const e=z(null);function r(i){e.value&&(We("mousemove",document,n),We("mouseup",document,a),n(i))}function n(i){const{value:o}=e;if(!o)return;const{width:s,left:l}=o.getBoundingClientRect(),f=Yr((i.clientX-l-mn)/(s-hn)*360);t.onUpdateHue(f)}function a(){var i;Ge("mousemove",document,n),Ge("mouseup",document,a),(i=t.onComplete)===null||i===void 0||i.call(t)}return{railRef:e,handleMouseDown:r}},render(){const{clsPrefix:t}=this;return c("div",{class:`${t}-color-picker-slider`,style:{height:je,borderRadius:Oe}},c("div",{ref:"railRef",style:{boxShadow:"inset 0 0 2px 0 rgba(0, 0, 0, .24)",boxSizing:"border-box",backgroundImage:pn,height:je,borderRadius:Oe,position:"relative"},onMousedown:this.handleMouseDown},c("div",{style:{position:"absolute",left:Oe,right:Oe,top:0,bottom:0}},c("div",{class:`${t}-color-picker-handle`,style:{left:`calc((${this.hue}%) / 359 * 100 - ${Oe})`,borderRadius:Oe,width:je,height:je}},c("div",{class:`${t}-color-picker-handle__fill`,style:{backgroundColor:`hsl(${this.hue}, 100%, 50%)`,borderRadius:Oe,width:je,height:je}})))))}}),ut="12px",ct="6px",vn=ne({name:"Pallete",props:{clsPrefix:{type:String,required:!0},rgba:{type:Array,default:null},displayedHue:{type:Number,required:!0},displayedSv:{type:Array,required:!0},onUpdateSV:{type:Function,required:!0},onComplete:Function},setup(t){const e=z(null);function r(i){e.value&&(We("mousemove",document,n),We("mouseup",document,a),n(i))}function n(i){const{value:o}=e;if(!o)return;const{width:s,height:l,left:f,bottom:d}=o.getBoundingClientRect(),p=(d-i.clientY)/l,w=(i.clientX-f)/s,S=100*(w>1?1:w<0?0:w),m=100*(p>1?1:p<0?0:p);t.onUpdateSV(S,m)}function a(){var i;Ge("mousemove",document,n),Ge("mouseup",document,a),(i=t.onComplete)===null||i===void 0||i.call(t)}return{palleteRef:e,handleColor:I(()=>{const{rgba:i}=t;return i?`rgb(${i[0]}, ${i[1]}, ${i[2]})`:""}),handleMouseDown:r}},render(){const{clsPrefix:t}=this;return c("div",{class:`${t}-color-picker-pallete`,onMousedown:this.handleMouseDown,ref:"palleteRef"},c("div",{class:`${t}-color-picker-pallete__layer`,style:{backgroundImage:`linear-gradient(90deg, white, hsl(${this.displayedHue}, 100%, 50%))`}}),c("div",{class:`${t}-color-picker-pallete__layer ${t}-color-picker-pallete__layer--shadowed`,style:{backgroundImage:"linear-gradient(180deg, rgba(0, 0, 0, 0%), rgba(0, 0, 0, 100%))"}}),this.rgba&&c("div",{class:`${t}-color-picker-handle`,style:{width:ut,height:ut,borderRadius:ct,left:`calc(${this.displayedSv[0]}% - ${ct})`,bottom:`calc(${this.displayedSv[1]}% - ${ct})`}},c("div",{class:`${t}-color-picker-handle__fill`,style:{backgroundColor:this.handleColor,borderRadius:ct,width:ut,height:ut}})))}}),bn=W([C("color-picker",`
 display: inline-block;
 box-sizing: border-box;
 height: var(--n-height);
 font-size: var(--n-font-size);
 width: 100%;
 position: relative;
 `),C("color-picker-panel",`
 margin: 4px 0;
 width: 240px;
 font-size: var(--n-panel-font-size);
 color: var(--n-text-color);
 background-color: var(--n-color);
 transition:
 box-shadow .3s var(--n-bezier),
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 border-radius: var(--n-border-radius);
 box-shadow: var(--n-box-shadow);
 `,[gr(),C("input",`
 text-align: center;
 `)]),C("color-picker-checkboard",`
 background: white; 
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `,[W("&::after",`
 background-image: linear-gradient(45deg, #DDD 25%, #0000 25%), linear-gradient(-45deg, #DDD 25%, #0000 25%), linear-gradient(45deg, #0000 75%, #DDD 75%), linear-gradient(-45deg, #0000 75%, #DDD 75%);
 background-size: 12px 12px;
 background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
 background-repeat: repeat;
 content: "";
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `)]),C("color-picker-slider",`
 margin-bottom: 8px;
 position: relative;
 box-sizing: border-box;
 `,[Z("image",`
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `),W("&::after",`
 content: "";
 position: absolute;
 border-radius: inherit;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 box-shadow: inset 0 0 2px 0 rgba(0, 0, 0, .24);
 pointer-events: none;
 `)]),C("color-picker-handle",`
 z-index: 1;
 box-shadow: 0 0 2px 0 rgba(0, 0, 0, .45);
 position: absolute;
 background-color: white;
 overflow: hidden;
 `,[Z("fill",`
 box-sizing: border-box;
 border: 2px solid white;
 `)]),C("color-picker-pallete",`
 height: 180px;
 position: relative;
 margin-bottom: 8px;
 cursor: crosshair;
 `,[Z("layer",`
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `,[te("shadowed",`
 box-shadow: inset 0 0 2px 0 rgba(0, 0, 0, .24);
 `)])]),C("color-picker-preview",`
 display: flex;
 `,[Z("sliders",`
 flex: 1 0 auto;
 `),Z("preview",`
 position: relative;
 height: 30px;
 width: 30px;
 margin: 0 0 8px 6px;
 border-radius: 50%;
 box-shadow: rgba(0, 0, 0, .15) 0px 0px 0px 1px inset;
 overflow: hidden;
 `),Z("fill",`
 display: block;
 width: 30px;
 height: 30px;
 `),Z("input",`
 position: absolute;
 top: 0;
 left: 0;
 width: 30px;
 height: 30px;
 opacity: 0;
 z-index: 1;
 `)]),C("color-picker-input",`
 display: flex;
 align-items: center;
 `,[C("input",`
 flex-grow: 1;
 flex-basis: 0;
 `),Z("mode",`
 width: 72px;
 text-align: center;
 `)]),C("color-picker-control",`
 padding: 12px;
 `),C("color-picker-action",`
 display: flex;
 margin-top: -4px;
 border-top: 1px solid var(--n-divider-color);
 padding: 8px 12px;
 justify-content: flex-end;
 `,[C("button","margin-left: 8px;")]),C("color-picker-trigger",`
 border: var(--n-border);
 height: 100%;
 box-sizing: border-box;
 border-radius: var(--n-border-radius);
 transition: border-color .3s var(--n-bezier);
 cursor: pointer;
 `,[Z("value",`
 white-space: nowrap;
 position: relative;
 `),Z("fill",`
 border-radius: var(--n-border-radius);
 position: absolute;
 display: flex;
 align-items: center;
 justify-content: center;
 left: 4px;
 right: 4px;
 top: 4px;
 bottom: 4px;
 `),te("disabled","cursor: not-allowed"),C("color-picker-checkboard",`
 border-radius: var(--n-border-radius);
 `,[W("&::after",`
 --n-block-size: calc((var(--n-height) - 8px) / 3);
 background-size: calc(var(--n-block-size) * 2) calc(var(--n-block-size) * 2);
 background-position: 0 0, 0 var(--n-block-size), var(--n-block-size) calc(-1 * var(--n-block-size)), calc(-1 * var(--n-block-size)) 0px; 
 `)])]),C("color-picker-swatches",`
 display: grid;
 grid-gap: 8px;
 flex-wrap: wrap;
 position: relative;
 grid-template-columns: repeat(auto-fill, 18px);
 margin-top: 10px;
 `,[C("color-picker-swatch",`
 width: 18px;
 height: 18px;
 background-image: linear-gradient(45deg, #DDD 25%, #0000 25%), linear-gradient(-45deg, #DDD 25%, #0000 25%), linear-gradient(45deg, #0000 75%, #DDD 75%), linear-gradient(-45deg, #0000 75%, #DDD 75%);
 background-size: 8px 8px;
 background-position: 0px 0, 0px 4px, 4px -4px, -4px 0px;
 background-repeat: repeat;
 `,[Z("fill",`
 position: relative;
 width: 100%;
 height: 100%;
 border-radius: 3px;
 box-shadow: rgba(0, 0, 0, .15) 0px 0px 0px 1px inset;
 cursor: pointer;
 `),W("&:focus",`
 outline: none;
 `,[Z("fill",[W("&::after",`
 position: absolute;
 top: 0;
 right: 0;
 bottom: 0;
 left: 0;
 background: inherit;
 filter: blur(2px);
 content: "";
 `)])])])])]),yn=Object.assign(Object.assign({},Pe.props),{value:String,show:{type:Boolean,default:void 0},defaultShow:Boolean,defaultValue:String,modes:{type:Array,default:()=>["rgb","hex","hsl"]},placement:{type:String,default:"bottom-start"},to:At.propTo,showAlpha:{type:Boolean,default:!0},showPreview:Boolean,swatches:Array,disabled:{type:Boolean,default:void 0},actions:{type:Array,default:null},internalActions:Array,size:String,renderLabel:Function,onComplete:Function,onConfirm:Function,onClear:Function,"onUpdate:show":[Function,Array],onUpdateShow:[Function,Array],"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array]}),wn=ne({name:"ColorPicker",props:yn,slots:Object,setup(t,{slots:e}){const r=z(null);let n=null;const a=br(t),{mergedSizeRef:i,mergedDisabledRef:o}=a,{localeRef:s}=Tr("global"),{mergedClsPrefixRef:l,namespaceRef:f,inlineThemeDisabled:d}=at(t),p=Pe("ColorPicker","-color-picker",bn,yr,t,l);gt(Ut,{themeRef:p,renderLabelRef:qe(t,"renderLabel"),colorPickerSlots:e});const w=z(t.defaultShow),S=jt(qe(t,"show"),w);function m(u){const{onUpdateShow:M,"onUpdate:show":H}=t;M&&ot(M,u),H&&ot(H,u),w.value=u}const{defaultValue:v}=t,k=z(v===void 0?Gr(t.modes,t.showAlpha):v),h=jt(qe(t,"value"),k),U=z([h.value]),b=z(0),$=I(()=>rt(h.value)),{modes:G}=t,T=z(rt(h.value)||G[0]||"rgb");function ae(){const{modes:u}=t,{value:M}=T,H=u.findIndex(Y=>Y===M);~H?T.value=u[(H+1)%u.length]:T.value="rgb"}let N,y,g,R,_,O,x,V;const K=I(()=>{const{value:u}=h;if(!u)return null;switch($.value){case"hsv":return Ue(u);case"hsl":return[N,y,g,V]=He(u),[...er(N,y,g),V];case"rgb":case"hex":return[_,O,x,V]=ve(u),[...xt(_,O,x),V]}}),j=I(()=>{const{value:u}=h;if(!u)return null;switch($.value){case"rgb":case"hex":return ve(u);case"hsv":return[N,y,R,V]=Ue(u),[..._e(N,y,R),V];case"hsl":return[N,y,g,V]=He(u),[...wt(N,y,g),V]}}),ie=I(()=>{const{value:u}=h;if(!u)return null;switch($.value){case"hsl":return He(u);case"hsv":return[N,y,R,V]=Ue(u),[...ht(N,y,R),V];case"rgb":case"hex":return[_,O,x,V]=ve(u),[...kt(_,O,x),V]}}),ye=I(()=>{switch(T.value){case"rgb":case"hex":return j.value;case"hsv":return K.value;case"hsl":return ie.value}}),le=z(0),fe=z(1),he=z([0,0]);function me(u,M){const{value:H}=K,Y=le.value,X=H?H[3]:1;he.value=[u,M];const{showAlpha:B}=t;switch(T.value){case"hsv":q((B?Te:Ct)([Y,u,M,X]),"cursor");break;case"hsl":q((B?ke:St)([...ht(Y,u,M),X]),"cursor");break;case"rgb":q((B?Se:Rt)([..._e(Y,u,M),X]),"cursor");break;case"hex":q((B?Ae:et)([..._e(Y,u,M),X]),"cursor");break}}function pe(u){le.value=u;const{value:M}=K;if(!M)return;const[,H,Y,X]=M,{showAlpha:B}=t;switch(T.value){case"hsv":q((B?Te:Ct)([u,H,Y,X]),"cursor");break;case"rgb":q((B?Se:Rt)([..._e(u,H,Y),X]),"cursor");break;case"hex":q((B?Ae:et)([..._e(u,H,Y),X]),"cursor");break;case"hsl":q((B?ke:St)([...ht(u,H,Y),X]),"cursor");break}}function ze(u){switch(T.value){case"hsv":[N,y,R]=K.value,q(Te([N,y,R,u]),"cursor");break;case"rgb":[_,O,x]=j.value,q(Se([_,O,x,u]),"cursor");break;case"hex":[_,O,x]=j.value,q(Ae([_,O,x,u]),"cursor");break;case"hsl":[N,y,g]=ie.value,q(ke([N,y,g,u]),"cursor");break}fe.value=u}function q(u,M){M==="cursor"?n=u:n=null;const{nTriggerFormChange:H,nTriggerFormInput:Y}=a,{onUpdateValue:X,"onUpdate:value":B}=t;X&&ot(X,u),B&&ot(B,u),H(),Y(),k.value=u}function Re(u){q(u,"input"),kr(de)}function de(u=!0){const{value:M}=h;if(M){const{nTriggerFormChange:H,nTriggerFormInput:Y}=a,{onComplete:X}=t;X&&X(M);const{value:B}=U,{value:oe}=b;u&&(B.splice(oe+1,B.length,M),b.value=oe+1),H(),Y()}}function De(){const{value:u}=b;u-1<0||(q(U.value[u-1],"input"),de(!1),b.value=u-1)}function $e(){const{value:u}=b;u<0||u+1>=U.value.length||(q(U.value[u+1],"input"),de(!1),b.value=u+1)}function Ne(){q(null,"input");const{onClear:u}=t;u&&u(),m(!1)}function D(){const{value:u}=h,{onConfirm:M}=t;M&&M(u),m(!1)}const ee=I(()=>b.value>=1),L=I(()=>{const{value:u}=U;return u.length>1&&b.value<u.length-1});Ot(S,u=>{u||(U.value=[h.value],b.value=0)}),tr(()=>{if(!(n&&n===h.value)){const{value:u}=K;u&&(le.value=u[0],fe.value=u[3],he.value=[u[1],u[2]])}n=null});const Ce=I(()=>{const{value:u}=i,{common:{cubicBezierEaseInOut:M},self:{textColor:H,color:Y,panelFontSize:X,boxShadow:B,border:oe,borderRadius:re,dividerColor:Ee,[ce("height",u)]:cr,[ce("fontSize",u)]:fr}}=p.value;return{"--n-bezier":M,"--n-text-color":H,"--n-color":Y,"--n-panel-font-size":X,"--n-font-size":fr,"--n-box-shadow":B,"--n-border":oe,"--n-border-radius":re,"--n-height":cr,"--n-divider-color":Ee}}),we=d?Mt("color-picker",I(()=>i.value[0]),Ce,t):void 0;function ur(){var u;const{value:M}=j,{value:H}=le,{internalActions:Y,modes:X,actions:B}=t,{value:oe}=p,{value:re}=l;return c("div",{class:[`${re}-color-picker-panel`,we==null?void 0:we.themeClass.value],onDragstart:Ee=>{Ee.preventDefault()},style:d?void 0:Ce.value},c("div",{class:`${re}-color-picker-control`},c(vn,{clsPrefix:re,rgba:M,displayedHue:H,displayedSv:he.value,onUpdateSV:me,onComplete:de}),c("div",{class:`${re}-color-picker-preview`},c("div",{class:`${re}-color-picker-preview__sliders`},c(gn,{clsPrefix:re,hue:H,onUpdateHue:pe,onComplete:de}),t.showAlpha?c(Qr,{clsPrefix:re,rgba:M,alpha:fe.value,onUpdateAlpha:ze,onComplete:de}):null),t.showPreview?c(fn,{clsPrefix:re,mode:T.value,color:j.value&&et(j.value),onUpdateColor:Ee=>{q(Ee,"input")}}):null),c(sn,{clsPrefix:re,showAlpha:t.showAlpha,mode:T.value,modes:X,onUpdateMode:ae,value:h.value,valueArr:ye.value,onUpdateValue:Re}),((u=t.swatches)===null||u===void 0?void 0:u.length)&&c(un,{clsPrefix:re,mode:T.value,swatches:t.swatches,onUpdateColor:Ee=>{q(Ee,"input")}})),B!=null&&B.length?c("div",{class:`${re}-color-picker-action`},B.includes("confirm")&&c(be,{size:"small",onClick:D,theme:oe.peers.Button,themeOverrides:oe.peerOverrides.Button},{default:()=>s.value.confirm}),B.includes("clear")&&c(be,{size:"small",onClick:Ne,disabled:!h.value,theme:oe.peers.Button,themeOverrides:oe.peerOverrides.Button},{default:()=>s.value.clear})):null,e.action?c("div",{class:`${re}-color-picker-action`},{default:e.action}):Y?c("div",{class:`${re}-color-picker-action`},Y.includes("undo")&&c(be,{size:"small",onClick:De,disabled:!ee.value,theme:oe.peers.Button,themeOverrides:oe.peerOverrides.Button},{default:()=>s.value.undo}),Y.includes("redo")&&c(be,{size:"small",onClick:$e,disabled:!L.value,theme:oe.peers.Button,themeOverrides:oe.peerOverrides.Button},{default:()=>s.value.redo})):null)}return{mergedClsPrefix:l,namespace:f,selfRef:r,hsla:ie,rgba:j,mergedShow:S,mergedDisabled:o,isMounted:wr(),adjustedTo:At(t),mergedValue:h,handleTriggerClick(){m(!0)},handleClickOutside(u){var M;!((M=r.value)===null||M===void 0)&&M.contains(xr(u))||m(!1)},renderPanel:ur,cssVars:d?void 0:Ce,themeClass:we==null?void 0:we.themeClass,onRender:we==null?void 0:we.onRender}},render(){const{mergedClsPrefix:t,onRender:e}=this;return e==null||e(),c("div",{class:[this.themeClass,`${t}-color-picker`],ref:"selfRef",style:this.cssVars},c(Or,null,{default:()=>[c(qr,null,{default:()=>c(cn,{clsPrefix:t,value:this.mergedValue,hsla:this.hsla,disabled:this.mergedDisabled,onClick:this.handleTriggerClick})}),c(Mr,{placement:this.placement,show:this.mergedShow,containerClass:this.namespace,teleportDisabled:this.adjustedTo===At.tdkey,to:this.adjustedTo},{default:()=>c(rr,{name:"fade-in-scale-up-transition",appear:this.isMounted},{default:()=>this.mergedShow?nr(this.renderPanel(),[[vr,this.handleClickOutside,void 0,{capture:!0}]]):null})})]}))}}),it=qt("n-form"),lr=qt("n-form-item-insts"),xn=C("form",[te("inline",`
 width: 100%;
 display: inline-flex;
 align-items: flex-start;
 align-content: space-around;
 `,[C("form-item",{width:"auto",marginRight:"18px"},[W("&:last-child",{marginRight:0})])])]);var kn=function(t,e,r,n){function a(i){return i instanceof r?i:new r(function(o){o(i)})}return new(r||(r=Promise))(function(i,o){function s(d){try{f(n.next(d))}catch(p){o(p)}}function l(d){try{f(n.throw(d))}catch(p){o(p)}}function f(d){d.done?i(d.value):a(d.value).then(s,l)}f((n=n.apply(t,e||[])).next())})};const Sn=Object.assign(Object.assign({},Pe.props),{inline:Boolean,labelWidth:[Number,String],labelAlign:String,labelPlacement:{type:String,default:"top"},model:{type:Object,default:()=>{}},rules:Object,disabled:Boolean,size:String,showRequireMark:{type:Boolean,default:void 0},requireMarkPlacement:String,showFeedback:{type:Boolean,default:!0},onSubmit:{type:Function,default:t=>{t.preventDefault()}},showLabel:{type:Boolean,default:void 0},validateMessages:Object}),Rn=ne({name:"Form",props:Sn,setup(t){const{mergedClsPrefixRef:e}=at(t);Pe("Form","-form",xn,ar,t,e);const r={},n=z(void 0),a=l=>{const f=n.value;(f===void 0||l>=f)&&(n.value=l)};function i(l){return kn(this,arguments,void 0,function*(f,d=()=>!0){return yield new Promise((p,w)=>{const S=[];for(const m of Tt(r)){const v=r[m];for(const k of v)k.path&&S.push(k.internalValidate(null,d))}Promise.all(S).then(m=>{const v=m.some(U=>!U.valid),k=[],h=[];m.forEach(U=>{var b,$;!((b=U.errors)===null||b===void 0)&&b.length&&k.push(U.errors),!(($=U.warnings)===null||$===void 0)&&$.length&&h.push(U.warnings)}),f&&f(k.length?k:void 0,{warnings:h.length?h:void 0}),v?w(k.length?k:void 0):p({warnings:h.length?h:void 0})})})})}function o(){for(const l of Tt(r)){const f=r[l];for(const d of f)d.restoreValidation()}}return gt(it,{props:t,maxChildLabelWidthRef:n,deriveMaxChildLabelWidth:a}),gt(lr,{formItems:r}),Object.assign({validate:i,restoreValidation:o},{mergedClsPrefix:e})},render(){const{mergedClsPrefix:t}=this;return c("form",{class:[`${t}-form`,this.inline&&`${t}-form--inline`],onSubmit:this.onSubmit},this.$slots)}});function Me(){return Me=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var r=arguments[e];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(t[n]=r[n])}return t},Me.apply(this,arguments)}function Cn(t,e){t.prototype=Object.create(e.prototype),t.prototype.constructor=t,nt(t,e)}function Pt(t){return Pt=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(r){return r.__proto__||Object.getPrototypeOf(r)},Pt(t)}function nt(t,e){return nt=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(n,a){return n.__proto__=a,n},nt(t,e)}function _n(){if(typeof Reflect>"u"||!Reflect.construct||Reflect.construct.sham)return!1;if(typeof Proxy=="function")return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){})),!0}catch{return!1}}function pt(t,e,r){return _n()?pt=Reflect.construct.bind():pt=function(a,i,o){var s=[null];s.push.apply(s,i);var l=Function.bind.apply(a,s),f=new l;return o&&nt(f,o.prototype),f},pt.apply(null,arguments)}function An(t){return Function.toString.call(t).indexOf("[native code]")!==-1}function $t(t){var e=typeof Map=="function"?new Map:void 0;return $t=function(n){if(n===null||!An(n))return n;if(typeof n!="function")throw new TypeError("Super expression must either be null or a function");if(typeof e<"u"){if(e.has(n))return e.get(n);e.set(n,a)}function a(){return pt(n,arguments,Pt(this).constructor)}return a.prototype=Object.create(n.prototype,{constructor:{value:a,enumerable:!1,writable:!0,configurable:!0}}),nt(a,n)},$t(t)}var Pn=/%[sdj%]/g,$n=function(){};function Et(t){if(!t||!t.length)return null;var e={};return t.forEach(function(r){var n=r.field;e[n]=e[n]||[],e[n].push(r)}),e}function se(t){for(var e=arguments.length,r=new Array(e>1?e-1:0),n=1;n<e;n++)r[n-1]=arguments[n];var a=0,i=r.length;if(typeof t=="function")return t.apply(null,r);if(typeof t=="string"){var o=t.replace(Pn,function(s){if(s==="%%")return"%";if(a>=i)return s;switch(s){case"%s":return String(r[a++]);case"%d":return Number(r[a++]);case"%j":try{return JSON.stringify(r[a++])}catch{return"[Circular]"}break;default:return s}});return o}return t}function En(t){return t==="string"||t==="url"||t==="hex"||t==="email"||t==="date"||t==="pattern"}function J(t,e){return!!(t==null||e==="array"&&Array.isArray(t)&&!t.length||En(e)&&typeof t=="string"&&!t)}function Fn(t,e,r){var n=[],a=0,i=t.length;function o(s){n.push.apply(n,s||[]),a++,a===i&&r(n)}t.forEach(function(s){e(s,o)})}function Ht(t,e,r){var n=0,a=t.length;function i(o){if(o&&o.length){r(o);return}var s=n;n=n+1,s<a?e(t[s],i):r([])}i([])}function In(t){var e=[];return Object.keys(t).forEach(function(r){e.push.apply(e,t[r]||[])}),e}var Wt=function(t){Cn(e,t);function e(r,n){var a;return a=t.call(this,"Async Validation Error")||this,a.errors=r,a.fields=n,a}return e}($t(Error));function On(t,e,r,n,a){if(e.first){var i=new Promise(function(w,S){var m=function(h){return n(h),h.length?S(new Wt(h,Et(h))):w(a)},v=In(t);Ht(v,r,m)});return i.catch(function(w){return w}),i}var o=e.firstFields===!0?Object.keys(t):e.firstFields||[],s=Object.keys(t),l=s.length,f=0,d=[],p=new Promise(function(w,S){var m=function(k){if(d.push.apply(d,k),f++,f===l)return n(d),d.length?S(new Wt(d,Et(d))):w(a)};s.length||(n(d),w(a)),s.forEach(function(v){var k=t[v];o.indexOf(v)!==-1?Ht(k,r,m):Fn(k,r,m)})});return p.catch(function(w){return w}),p}function qn(t){return!!(t&&t.message!==void 0)}function Mn(t,e){for(var r=t,n=0;n<e.length;n++){if(r==null)return r;r=r[e[n]]}return r}function Gt(t,e){return function(r){var n;return t.fullFields?n=Mn(e,t.fullFields):n=e[r.field||t.fullField],qn(r)?(r.field=r.field||t.fullField,r.fieldValue=n,r):{message:typeof r=="function"?r():r,fieldValue:n,field:r.field||t.fullField}}}function Kt(t,e){if(e){for(var r in e)if(e.hasOwnProperty(r)){var n=e[r];typeof n=="object"&&typeof t[r]=="object"?t[r]=Me({},t[r],n):t[r]=n}}return t}var dr=function(e,r,n,a,i,o){e.required&&(!n.hasOwnProperty(e.field)||J(r,o||e.type))&&a.push(se(i.messages.required,e.fullField))},Un=function(e,r,n,a,i){(/^\s+$/.test(r)||r==="")&&a.push(se(i.messages.whitespace,e.fullField))},ft,Tn=function(){if(ft)return ft;var t="[a-fA-F\\d:]",e=function($){return $&&$.includeBoundaries?"(?:(?<=\\s|^)(?="+t+")|(?<="+t+")(?=\\s|$))":""},r="(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}",n="[a-fA-F\\d]{1,4}",a=(`
(?:
(?:`+n+":){7}(?:"+n+`|:)|                                    // 1:2:3:4:5:6:7::  1:2:3:4:5:6:7:8
(?:`+n+":){6}(?:"+r+"|:"+n+`|:)|                             // 1:2:3:4:5:6::    1:2:3:4:5:6::8   1:2:3:4:5:6::8  1:2:3:4:5:6::1.2.3.4
(?:`+n+":){5}(?::"+r+"|(?::"+n+`){1,2}|:)|                   // 1:2:3:4:5::      1:2:3:4:5::7:8   1:2:3:4:5::8    1:2:3:4:5::7:1.2.3.4
(?:`+n+":){4}(?:(?::"+n+"){0,1}:"+r+"|(?::"+n+`){1,3}|:)| // 1:2:3:4::        1:2:3:4::6:7:8   1:2:3:4::8      1:2:3:4::6:7:1.2.3.4
(?:`+n+":){3}(?:(?::"+n+"){0,2}:"+r+"|(?::"+n+`){1,4}|:)| // 1:2:3::          1:2:3::5:6:7:8   1:2:3::8        1:2:3::5:6:7:1.2.3.4
(?:`+n+":){2}(?:(?::"+n+"){0,3}:"+r+"|(?::"+n+`){1,5}|:)| // 1:2::            1:2::4:5:6:7:8   1:2::8          1:2::4:5:6:7:1.2.3.4
(?:`+n+":){1}(?:(?::"+n+"){0,4}:"+r+"|(?::"+n+`){1,6}|:)| // 1::              1::3:4:5:6:7:8   1::8            1::3:4:5:6:7:1.2.3.4
(?::(?:(?::`+n+"){0,5}:"+r+"|(?::"+n+`){1,7}|:))             // ::2:3:4:5:6:7:8  ::2:3:4:5:6:7:8  ::8             ::1.2.3.4
)(?:%[0-9a-zA-Z]{1,})?                                             // %eth0            %1
`).replace(/\s*\/\/.*$/gm,"").replace(/\n/g,"").trim(),i=new RegExp("(?:^"+r+"$)|(?:^"+a+"$)"),o=new RegExp("^"+r+"$"),s=new RegExp("^"+a+"$"),l=function($){return $&&$.exact?i:new RegExp("(?:"+e($)+r+e($)+")|(?:"+e($)+a+e($)+")","g")};l.v4=function(b){return b&&b.exact?o:new RegExp(""+e(b)+r+e(b),"g")},l.v6=function(b){return b&&b.exact?s:new RegExp(""+e(b)+a+e(b),"g")};var f="(?:(?:[a-z]+:)?//)",d="(?:\\S+(?::\\S*)?@)?",p=l.v4().source,w=l.v6().source,S="(?:(?:[a-z\\u00a1-\\uffff0-9][-_]*)*[a-z\\u00a1-\\uffff0-9]+)",m="(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*",v="(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))",k="(?::\\d{2,5})?",h='(?:[/?#][^\\s"]*)?',U="(?:"+f+"|www\\.)"+d+"(?:localhost|"+p+"|"+w+"|"+S+m+v+")"+k+h;return ft=new RegExp("(?:^"+U+"$)","i"),ft},Yt={email:/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+\.)+[a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}))$/,hex:/^#?([a-f0-9]{6}|[a-f0-9]{3})$/i},Qe={integer:function(e){return Qe.number(e)&&parseInt(e,10)===e},float:function(e){return Qe.number(e)&&!Qe.integer(e)},array:function(e){return Array.isArray(e)},regexp:function(e){if(e instanceof RegExp)return!0;try{return!!new RegExp(e)}catch{return!1}},date:function(e){return typeof e.getTime=="function"&&typeof e.getMonth=="function"&&typeof e.getYear=="function"&&!isNaN(e.getTime())},number:function(e){return isNaN(e)?!1:typeof e=="number"},object:function(e){return typeof e=="object"&&!Qe.array(e)},method:function(e){return typeof e=="function"},email:function(e){return typeof e=="string"&&e.length<=320&&!!e.match(Yt.email)},url:function(e){return typeof e=="string"&&e.length<=2048&&!!e.match(Tn())},hex:function(e){return typeof e=="string"&&!!e.match(Yt.hex)}},Vn=function(e,r,n,a,i){if(e.required&&r===void 0){dr(e,r,n,a,i);return}var o=["integer","float","array","regexp","object","method","email","number","date","url","hex"],s=e.type;o.indexOf(s)>-1?Qe[s](r)||a.push(se(i.messages.types[s],e.fullField,e.type)):s&&typeof r!==e.type&&a.push(se(i.messages.types[s],e.fullField,e.type))},zn=function(e,r,n,a,i){var o=typeof e.len=="number",s=typeof e.min=="number",l=typeof e.max=="number",f=/[\uD800-\uDBFF][\uDC00-\uDFFF]/g,d=r,p=null,w=typeof r=="number",S=typeof r=="string",m=Array.isArray(r);if(w?p="number":S?p="string":m&&(p="array"),!p)return!1;m&&(d=r.length),S&&(d=r.replace(f,"_").length),o?d!==e.len&&a.push(se(i.messages[p].len,e.fullField,e.len)):s&&!l&&d<e.min?a.push(se(i.messages[p].min,e.fullField,e.min)):l&&!s&&d>e.max?a.push(se(i.messages[p].max,e.fullField,e.max)):s&&l&&(d<e.min||d>e.max)&&a.push(se(i.messages[p].range,e.fullField,e.min,e.max))},Be="enum",Dn=function(e,r,n,a,i){e[Be]=Array.isArray(e[Be])?e[Be]:[],e[Be].indexOf(r)===-1&&a.push(se(i.messages[Be],e.fullField,e[Be].join(", ")))},Nn=function(e,r,n,a,i){if(e.pattern){if(e.pattern instanceof RegExp)e.pattern.lastIndex=0,e.pattern.test(r)||a.push(se(i.messages.pattern.mismatch,e.fullField,r,e.pattern));else if(typeof e.pattern=="string"){var o=new RegExp(e.pattern);o.test(r)||a.push(se(i.messages.pattern.mismatch,e.fullField,r,e.pattern))}}},P={required:dr,whitespace:Un,type:Vn,range:zn,enum:Dn,pattern:Nn},Ln=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(J(r,"string")&&!e.required)return n();P.required(e,r,a,o,i,"string"),J(r,"string")||(P.type(e,r,a,o,i),P.range(e,r,a,o,i),P.pattern(e,r,a,o,i),e.whitespace===!0&&P.whitespace(e,r,a,o,i))}n(o)},jn=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(J(r)&&!e.required)return n();P.required(e,r,a,o,i),r!==void 0&&P.type(e,r,a,o,i)}n(o)},Bn=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(r===""&&(r=void 0),J(r)&&!e.required)return n();P.required(e,r,a,o,i),r!==void 0&&(P.type(e,r,a,o,i),P.range(e,r,a,o,i))}n(o)},Hn=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(J(r)&&!e.required)return n();P.required(e,r,a,o,i),r!==void 0&&P.type(e,r,a,o,i)}n(o)},Wn=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(J(r)&&!e.required)return n();P.required(e,r,a,o,i),J(r)||P.type(e,r,a,o,i)}n(o)},Gn=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(J(r)&&!e.required)return n();P.required(e,r,a,o,i),r!==void 0&&(P.type(e,r,a,o,i),P.range(e,r,a,o,i))}n(o)},Kn=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(J(r)&&!e.required)return n();P.required(e,r,a,o,i),r!==void 0&&(P.type(e,r,a,o,i),P.range(e,r,a,o,i))}n(o)},Yn=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(r==null&&!e.required)return n();P.required(e,r,a,o,i,"array"),r!=null&&(P.type(e,r,a,o,i),P.range(e,r,a,o,i))}n(o)},Zn=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(J(r)&&!e.required)return n();P.required(e,r,a,o,i),r!==void 0&&P.type(e,r,a,o,i)}n(o)},Xn="enum",Jn=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(J(r)&&!e.required)return n();P.required(e,r,a,o,i),r!==void 0&&P[Xn](e,r,a,o,i)}n(o)},Qn=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(J(r,"string")&&!e.required)return n();P.required(e,r,a,o,i),J(r,"string")||P.pattern(e,r,a,o,i)}n(o)},ea=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(J(r,"date")&&!e.required)return n();if(P.required(e,r,a,o,i),!J(r,"date")){var l;r instanceof Date?l=r:l=new Date(r),P.type(e,l,a,o,i),l&&P.range(e,l.getTime(),a,o,i)}}n(o)},ta=function(e,r,n,a,i){var o=[],s=Array.isArray(r)?"array":typeof r;P.required(e,r,a,o,i,s),n(o)},yt=function(e,r,n,a,i){var o=e.type,s=[],l=e.required||!e.required&&a.hasOwnProperty(e.field);if(l){if(J(r,o)&&!e.required)return n();P.required(e,r,a,s,i,o),J(r,o)||P.type(e,r,a,s,i)}n(s)},ra=function(e,r,n,a,i){var o=[],s=e.required||!e.required&&a.hasOwnProperty(e.field);if(s){if(J(r)&&!e.required)return n();P.required(e,r,a,o,i)}n(o)},tt={string:Ln,method:jn,number:Bn,boolean:Hn,regexp:Wn,integer:Gn,float:Kn,array:Yn,object:Zn,enum:Jn,pattern:Qn,date:ea,url:yt,hex:yt,email:yt,required:ta,any:ra};function Ft(){return{default:"Validation error on field %s",required:"%s is required",enum:"%s must be one of %s",whitespace:"%s cannot be empty",date:{format:"%s date %s is invalid for format %s",parse:"%s date could not be parsed, %s is invalid ",invalid:"%s date %s is invalid"},types:{string:"%s is not a %s",method:"%s is not a %s (function)",array:"%s is not an %s",object:"%s is not an %s",number:"%s is not a %s",date:"%s is not a %s",boolean:"%s is not a %s",integer:"%s is not an %s",float:"%s is not a %s",regexp:"%s is not a valid %s",email:"%s is not a valid %s",url:"%s is not a valid %s",hex:"%s is not a valid %s"},string:{len:"%s must be exactly %s characters",min:"%s must be at least %s characters",max:"%s cannot be longer than %s characters",range:"%s must be between %s and %s characters"},number:{len:"%s must equal %s",min:"%s cannot be less than %s",max:"%s cannot be greater than %s",range:"%s must be between %s and %s"},array:{len:"%s must be exactly %s in length",min:"%s cannot be less than %s in length",max:"%s cannot be greater than %s in length",range:"%s must be between %s and %s in length"},pattern:{mismatch:"%s value %s does not match pattern %s"},clone:function(){var e=JSON.parse(JSON.stringify(this));return e.clone=this.clone,e}}}var It=Ft(),Ke=function(){function t(r){this.rules=null,this._messages=It,this.define(r)}var e=t.prototype;return e.define=function(n){var a=this;if(!n)throw new Error("Cannot configure a schema with no rules");if(typeof n!="object"||Array.isArray(n))throw new Error("Rules must be an object");this.rules={},Object.keys(n).forEach(function(i){var o=n[i];a.rules[i]=Array.isArray(o)?o:[o]})},e.messages=function(n){return n&&(this._messages=Kt(Ft(),n)),this._messages},e.validate=function(n,a,i){var o=this;a===void 0&&(a={}),i===void 0&&(i=function(){});var s=n,l=a,f=i;if(typeof l=="function"&&(f=l,l={}),!this.rules||Object.keys(this.rules).length===0)return f&&f(null,s),Promise.resolve(s);function d(v){var k=[],h={};function U($){if(Array.isArray($)){var G;k=(G=k).concat.apply(G,$)}else k.push($)}for(var b=0;b<v.length;b++)U(v[b]);k.length?(h=Et(k),f(k,h)):f(null,s)}if(l.messages){var p=this.messages();p===It&&(p=Ft()),Kt(p,l.messages),l.messages=p}else l.messages=this.messages();var w={},S=l.keys||Object.keys(this.rules);S.forEach(function(v){var k=o.rules[v],h=s[v];k.forEach(function(U){var b=U;typeof b.transform=="function"&&(s===n&&(s=Me({},s)),h=s[v]=b.transform(h)),typeof b=="function"?b={validator:b}:b=Me({},b),b.validator=o.getValidationMethod(b),b.validator&&(b.field=v,b.fullField=b.fullField||v,b.type=o.getType(b),w[v]=w[v]||[],w[v].push({rule:b,value:h,source:s,field:v}))})});var m={};return On(w,l,function(v,k){var h=v.rule,U=(h.type==="object"||h.type==="array")&&(typeof h.fields=="object"||typeof h.defaultField=="object");U=U&&(h.required||!h.required&&v.value),h.field=v.field;function b(T,ae){return Me({},ae,{fullField:h.fullField+"."+T,fullFields:h.fullFields?[].concat(h.fullFields,[T]):[T]})}function $(T){T===void 0&&(T=[]);var ae=Array.isArray(T)?T:[T];!l.suppressWarning&&ae.length&&t.warning("async-validator:",ae),ae.length&&h.message!==void 0&&(ae=[].concat(h.message));var N=ae.map(Gt(h,s));if(l.first&&N.length)return m[h.field]=1,k(N);if(!U)k(N);else{if(h.required&&!v.value)return h.message!==void 0?N=[].concat(h.message).map(Gt(h,s)):l.error&&(N=[l.error(h,se(l.messages.required,h.field))]),k(N);var y={};h.defaultField&&Object.keys(v.value).map(function(_){y[_]=h.defaultField}),y=Me({},y,v.rule.fields);var g={};Object.keys(y).forEach(function(_){var O=y[_],x=Array.isArray(O)?O:[O];g[_]=x.map(b.bind(null,_))});var R=new t(g);R.messages(l.messages),v.rule.options&&(v.rule.options.messages=l.messages,v.rule.options.error=l.error),R.validate(v.value,v.rule.options||l,function(_){var O=[];N&&N.length&&O.push.apply(O,N),_&&_.length&&O.push.apply(O,_),k(O.length?O:null)})}}var G;if(h.asyncValidator)G=h.asyncValidator(h,v.value,$,v.source,l);else if(h.validator){try{G=h.validator(h,v.value,$,v.source,l)}catch(T){console.error==null||console.error(T),l.suppressValidatorError||setTimeout(function(){throw T},0),$(T.message)}G===!0?$():G===!1?$(typeof h.message=="function"?h.message(h.fullField||h.field):h.message||(h.fullField||h.field)+" fails"):G instanceof Array?$(G):G instanceof Error&&$(G.message)}G&&G.then&&G.then(function(){return $()},function(T){return $(T)})},function(v){d(v)},s)},e.getType=function(n){if(n.type===void 0&&n.pattern instanceof RegExp&&(n.type="pattern"),typeof n.validator!="function"&&n.type&&!tt.hasOwnProperty(n.type))throw new Error(se("Unknown rule type %s",n.type));return n.type||"string"},e.getValidationMethod=function(n){if(typeof n.validator=="function")return n.validator;var a=Object.keys(n),i=a.indexOf("message");return i!==-1&&a.splice(i,1),a.length===1&&a[0]==="required"?tt.required:tt[this.getType(n)]||void 0},t}();Ke.register=function(e,r){if(typeof r!="function")throw new Error("Cannot register a validator by type, validator is not a function");tt[e]=r};Ke.warning=$n;Ke.messages=It;Ke.validators=tt;const{cubicBezierEaseInOut:Zt}=Sr;function na({name:t="fade-down",fromOffset:e="-4px",enterDuration:r=".3s",leaveDuration:n=".3s",enterCubicBezier:a=Zt,leaveCubicBezier:i=Zt}={}){return[W(`&.${t}-transition-enter-from, &.${t}-transition-leave-to`,{opacity:0,transform:`translateY(${e})`}),W(`&.${t}-transition-enter-to, &.${t}-transition-leave-from`,{opacity:1,transform:"translateY(0)"}),W(`&.${t}-transition-leave-active`,{transition:`opacity ${n} ${i}, transform ${n} ${i}`}),W(`&.${t}-transition-enter-active`,{transition:`opacity ${r} ${a}, transform ${r} ${a}`})]}const aa=C("form-item",`
 display: grid;
 line-height: var(--n-line-height);
`,[C("form-item-label",`
 grid-area: label;
 align-items: center;
 line-height: 1.25;
 text-align: var(--n-label-text-align);
 font-size: var(--n-label-font-size);
 min-height: var(--n-label-height);
 padding: var(--n-label-padding);
 color: var(--n-label-text-color);
 transition: color .3s var(--n-bezier);
 box-sizing: border-box;
 font-weight: var(--n-label-font-weight);
 `,[Z("asterisk",`
 white-space: nowrap;
 user-select: none;
 -webkit-user-select: none;
 color: var(--n-asterisk-color);
 transition: color .3s var(--n-bezier);
 `),Z("asterisk-placeholder",`
 grid-area: mark;
 user-select: none;
 -webkit-user-select: none;
 visibility: hidden; 
 `)]),C("form-item-blank",`
 grid-area: blank;
 min-height: var(--n-blank-height);
 `),te("auto-label-width",[C("form-item-label","white-space: nowrap;")]),te("left-labelled",`
 grid-template-areas:
 "label blank"
 "label feedback";
 grid-template-columns: auto minmax(0, 1fr);
 grid-template-rows: auto 1fr;
 align-items: flex-start;
 `,[C("form-item-label",`
 display: grid;
 grid-template-columns: 1fr auto;
 min-height: var(--n-blank-height);
 height: auto;
 box-sizing: border-box;
 flex-shrink: 0;
 flex-grow: 0;
 `,[te("reverse-columns-space",`
 grid-template-columns: auto 1fr;
 `),te("left-mark",`
 grid-template-areas:
 "mark text"
 ". text";
 `),te("right-mark",`
 grid-template-areas: 
 "text mark"
 "text .";
 `),te("right-hanging-mark",`
 grid-template-areas: 
 "text mark"
 "text .";
 `),Z("text",`
 grid-area: text; 
 `),Z("asterisk",`
 grid-area: mark; 
 align-self: end;
 `)])]),te("top-labelled",`
 grid-template-areas:
 "label"
 "blank"
 "feedback";
 grid-template-rows: minmax(var(--n-label-height), auto) 1fr;
 grid-template-columns: minmax(0, 100%);
 `,[te("no-label",`
 grid-template-areas:
 "blank"
 "feedback";
 grid-template-rows: 1fr;
 `),C("form-item-label",`
 display: flex;
 align-items: flex-start;
 justify-content: var(--n-label-text-align);
 `)]),C("form-item-blank",`
 box-sizing: border-box;
 display: flex;
 align-items: center;
 position: relative;
 `),C("form-item-feedback-wrapper",`
 grid-area: feedback;
 box-sizing: border-box;
 min-height: var(--n-feedback-height);
 font-size: var(--n-feedback-font-size);
 line-height: 1.25;
 transform-origin: top left;
 `,[W("&:not(:empty)",`
 padding: var(--n-feedback-padding);
 `),C("form-item-feedback",{transition:"color .3s var(--n-bezier)",color:"var(--n-feedback-text-color)"},[te("warning",{color:"var(--n-feedback-text-color-warning)"}),te("error",{color:"var(--n-feedback-text-color-error)"}),na({fromOffset:"-3px",enterDuration:".3s",leaveDuration:".2s"})])])]);function ia(t){const e=Ve(it,null);return{mergedSize:I(()=>t.size!==void 0?t.size:(e==null?void 0:e.props.size)!==void 0?e.props.size:"medium")}}function oa(t){const e=Ve(it,null),r=I(()=>{const{labelPlacement:m}=t;return m!==void 0?m:e!=null&&e.props.labelPlacement?e.props.labelPlacement:"top"}),n=I(()=>r.value==="left"&&(t.labelWidth==="auto"||(e==null?void 0:e.props.labelWidth)==="auto")),a=I(()=>{if(r.value==="top")return;const{labelWidth:m}=t;if(m!==void 0&&m!=="auto")return vt(m);if(n.value){const v=e==null?void 0:e.maxChildLabelWidthRef.value;return v!==void 0?vt(v):void 0}if((e==null?void 0:e.props.labelWidth)!==void 0)return vt(e.props.labelWidth)}),i=I(()=>{const{labelAlign:m}=t;if(m)return m;if(e!=null&&e.props.labelAlign)return e.props.labelAlign}),o=I(()=>{var m;return[(m=t.labelProps)===null||m===void 0?void 0:m.style,t.labelStyle,{width:a.value}]}),s=I(()=>{const{showRequireMark:m}=t;return m!==void 0?m:e==null?void 0:e.props.showRequireMark}),l=I(()=>{const{requireMarkPlacement:m}=t;return m!==void 0?m:(e==null?void 0:e.props.requireMarkPlacement)||"right"}),f=z(!1),d=z(!1),p=I(()=>{const{validationStatus:m}=t;if(m!==void 0)return m;if(f.value)return"error";if(d.value)return"warning"}),w=I(()=>{const{showFeedback:m}=t;return m!==void 0?m:(e==null?void 0:e.props.showFeedback)!==void 0?e.props.showFeedback:!0}),S=I(()=>{const{showLabel:m}=t;return m!==void 0?m:(e==null?void 0:e.props.showLabel)!==void 0?e.props.showLabel:!0});return{validationErrored:f,validationWarned:d,mergedLabelStyle:o,mergedLabelPlacement:r,mergedLabelAlign:i,mergedShowRequireMark:s,mergedRequireMarkPlacement:l,mergedValidationStatus:p,mergedShowFeedback:w,mergedShowLabel:S,isAutoLabelWidth:n}}function sa(t){const e=Ve(it,null),r=I(()=>{const{rulePath:o}=t;if(o!==void 0)return o;const{path:s}=t;if(s!==void 0)return s}),n=I(()=>{const o=[],{rule:s}=t;if(s!==void 0&&(Array.isArray(s)?o.push(...s):o.push(s)),e){const{rules:l}=e.props,{value:f}=r;if(l!==void 0&&f!==void 0){const d=or(l,f);d!==void 0&&(Array.isArray(d)?o.push(...d):o.push(d))}}return o}),a=I(()=>n.value.some(o=>o.required)),i=I(()=>a.value||t.required);return{mergedRules:n,mergedRequired:i}}var Xt=function(t,e,r,n){function a(i){return i instanceof r?i:new r(function(o){o(i)})}return new(r||(r=Promise))(function(i,o){function s(d){try{f(n.next(d))}catch(p){o(p)}}function l(d){try{f(n.throw(d))}catch(p){o(p)}}function f(d){d.done?i(d.value):a(d.value).then(s,l)}f((n=n.apply(t,e||[])).next())})};const la=Object.assign(Object.assign({},Pe.props),{label:String,labelWidth:[Number,String],labelStyle:[String,Object],labelAlign:String,labelPlacement:String,path:String,first:Boolean,rulePath:String,required:Boolean,showRequireMark:{type:Boolean,default:void 0},requireMarkPlacement:String,showFeedback:{type:Boolean,default:void 0},rule:[Object,Array],size:String,ignorePathChange:Boolean,validationStatus:String,feedback:String,feedbackClass:String,feedbackStyle:[String,Object],showLabel:{type:Boolean,default:void 0},labelProps:Object,contentClass:String,contentStyle:[String,Object]});function Jt(t,e){return(...r)=>{try{const n=t(...r);return!e&&(typeof n=="boolean"||n instanceof Error||Array.isArray(n))||n!=null&&n.then?n:(n===void 0||_t("form-item/validate",`You return a ${typeof n} typed value in the validator method, which is not recommended. Please use ${e?"`Promise`":"`boolean`, `Error` or `Promise`"} typed value instead.`),!0)}catch(n){_t("form-item/validate","An error is catched in the validation, so the validation won't be done. Your callback in `validate` method of `n-form` or `n-form-item` won't be called in this validation."),console.error(n);return}}}const Je=ne({name:"FormItem",props:la,setup(t){jr(lr,"formItems",qe(t,"path"));const{mergedClsPrefixRef:e,inlineThemeDisabled:r}=at(t),n=Ve(it,null),a=ia(t),i=oa(t),{validationErrored:o,validationWarned:s}=i,{mergedRequired:l,mergedRules:f}=sa(t),{mergedSize:d}=a,{mergedLabelPlacement:p,mergedLabelAlign:w,mergedRequireMarkPlacement:S}=i,m=z([]),v=z(Vt()),k=n?qe(n.props,"disabled"):z(!1),h=Pe("Form","-form-item",aa,ar,t,e);Ot(qe(t,"path"),()=>{t.ignorePathChange||U()});function U(){m.value=[],o.value=!1,s.value=!1,t.feedback&&(v.value=Vt())}const b=(...x)=>Xt(this,[...x],void 0,function*(V=null,K=()=>!0,j={suppressWarning:!0}){const{path:ie}=t;j?j.first||(j.first=t.first):j={};const{value:ye}=f,le=n?or(n.props.model,ie||""):void 0,fe={},he={},me=(V?ye.filter(D=>Array.isArray(D.trigger)?D.trigger.includes(V):D.trigger===V):ye).filter(K).map((D,ee)=>{const L=Object.assign({},D);if(L.validator&&(L.validator=Jt(L.validator,!1)),L.asyncValidator&&(L.asyncValidator=Jt(L.asyncValidator,!0)),L.renderMessage){const Ce=`__renderMessage__${ee}`;he[Ce]=L.message,L.message=Ce,fe[Ce]=L.renderMessage}return L}),pe=me.filter(D=>D.level!=="warning"),ze=me.filter(D=>D.level==="warning"),q={valid:!0,errors:void 0,warnings:void 0};if(!me.length)return q;const Re=ie??"__n_no_path__",de=new Ke({[Re]:pe}),De=new Ke({[Re]:ze}),{validateMessages:$e}=(n==null?void 0:n.props)||{};$e&&(de.messages($e),De.messages($e));const Ne=D=>{m.value=D.map(ee=>{const L=(ee==null?void 0:ee.message)||"";return{key:L,render:()=>L.startsWith("__renderMessage__")?fe[L]():L}}),D.forEach(ee=>{var L;!((L=ee.message)===null||L===void 0)&&L.startsWith("__renderMessage__")&&(ee.message=he[ee.message])})};if(pe.length){const D=yield new Promise(ee=>{de.validate({[Re]:le},j,ee)});D!=null&&D.length&&(q.valid=!1,q.errors=D,Ne(D))}if(ze.length&&!q.errors){const D=yield new Promise(ee=>{De.validate({[Re]:le},j,ee)});D!=null&&D.length&&(Ne(D),q.warnings=D)}return!q.errors&&!q.warnings?U():(o.value=!!q.errors,s.value=!!q.warnings),q});function $(){b("blur")}function G(){b("change")}function T(){b("focus")}function ae(){b("input")}function N(x,V){return Xt(this,void 0,void 0,function*(){let K,j,ie,ye;return typeof x=="string"?(K=x,j=V):x!==null&&typeof x=="object"&&(K=x.trigger,j=x.callback,ie=x.shouldRuleBeApplied,ye=x.options),yield new Promise((le,fe)=>{b(K,ie,ye).then(({valid:he,errors:me,warnings:pe})=>{he?(j&&j(void 0,{warnings:pe}),le({warnings:pe})):(j&&j(me,{warnings:pe}),fe(me))})})})}gt(Cr,{path:qe(t,"path"),disabled:k,mergedSize:a.mergedSize,mergedValidationStatus:i.mergedValidationStatus,restoreValidation:U,handleContentBlur:$,handleContentChange:G,handleContentFocus:T,handleContentInput:ae});const y={validate:N,restoreValidation:U,internalValidate:b},g=z(null);ir(()=>{if(!i.isAutoLabelWidth.value)return;const x=g.value;if(x!==null){const V=x.style.whiteSpace;x.style.whiteSpace="nowrap",x.style.width="",n==null||n.deriveMaxChildLabelWidth(Number(getComputedStyle(x).width.slice(0,-2))),x.style.whiteSpace=V}});const R=I(()=>{var x;const{value:V}=d,{value:K}=p,j=K==="top"?"vertical":"horizontal",{common:{cubicBezierEaseInOut:ie},self:{labelTextColor:ye,asteriskColor:le,lineHeight:fe,feedbackTextColor:he,feedbackTextColorWarning:me,feedbackTextColorError:pe,feedbackPadding:ze,labelFontWeight:q,[ce("labelHeight",V)]:Re,[ce("blankHeight",V)]:de,[ce("feedbackFontSize",V)]:De,[ce("feedbackHeight",V)]:$e,[ce("labelPadding",j)]:Ne,[ce("labelTextAlign",j)]:D,[ce(ce("labelFontSize",K),V)]:ee}}=h.value;let L=(x=w.value)!==null&&x!==void 0?x:D;return K==="top"&&(L=L==="right"?"flex-end":"flex-start"),{"--n-bezier":ie,"--n-line-height":fe,"--n-blank-height":de,"--n-label-font-size":ee,"--n-label-text-align":L,"--n-label-height":Re,"--n-label-padding":Ne,"--n-label-font-weight":q,"--n-asterisk-color":le,"--n-label-text-color":ye,"--n-feedback-padding":ze,"--n-feedback-font-size":De,"--n-feedback-height":$e,"--n-feedback-text-color":he,"--n-feedback-text-color-warning":me,"--n-feedback-text-color-error":pe}}),_=r?Mt("form-item",I(()=>{var x;return`${d.value[0]}${p.value[0]}${((x=w.value)===null||x===void 0?void 0:x[0])||""}`}),R,t):void 0,O=I(()=>p.value==="left"&&S.value==="left"&&w.value==="left");return Object.assign(Object.assign(Object.assign(Object.assign({labelElementRef:g,mergedClsPrefix:e,mergedRequired:l,feedbackId:v,renderExplains:m,reverseColSpace:O},i),a),y),{cssVars:r?void 0:R,themeClass:_==null?void 0:_.themeClass,onRender:_==null?void 0:_.onRender})},render(){const{$slots:t,mergedClsPrefix:e,mergedShowLabel:r,mergedShowRequireMark:n,mergedRequireMarkPlacement:a,onRender:i}=this,o=n!==void 0?n:this.mergedRequired;i==null||i();const s=()=>{const l=this.$slots.label?this.$slots.label():this.label;if(!l)return null;const f=c("span",{class:`${e}-form-item-label__text`},l),d=o?c("span",{class:`${e}-form-item-label__asterisk`},a!=="left"?" *":"* "):a==="right-hanging"&&c("span",{class:`${e}-form-item-label__asterisk-placeholder`}," *"),{labelProps:p}=this;return c("label",Object.assign({},p,{class:[p==null?void 0:p.class,`${e}-form-item-label`,`${e}-form-item-label--${a}-mark`,this.reverseColSpace&&`${e}-form-item-label--reverse-columns-space`],style:this.mergedLabelStyle,ref:"labelElementRef"}),a==="left"?[d,f]:[f,d])};return c("div",{class:[`${e}-form-item`,this.themeClass,`${e}-form-item--${this.mergedSize}-size`,`${e}-form-item--${this.mergedLabelPlacement}-labelled`,this.isAutoLabelWidth&&`${e}-form-item--auto-label-width`,!r&&`${e}-form-item--no-label`],style:this.cssVars},r&&s(),c("div",{class:[`${e}-form-item-blank`,this.contentClass,this.mergedValidationStatus&&`${e}-form-item-blank--${this.mergedValidationStatus}`],style:this.contentStyle},t),this.mergedShowFeedback?c("div",{key:this.feedbackId,style:this.feedbackStyle,class:[`${e}-form-item-feedback-wrapper`,this.feedbackClass]},c(rr,{name:"fade-down-transition",mode:"out-in"},{default:()=>{const{mergedValidationStatus:l}=this;return Rr(t.feedback,f=>{var d;const{feedback:p}=this,w=f||p?c("div",{key:"__feedback__",class:`${e}-form-item-feedback__line`},f||p):this.renderExplains.length?(d=this.renderExplains)===null||d===void 0?void 0:d.map(({key:S,render:m})=>c("div",{key:S,class:`${e}-form-item-feedback__line`},m())):null;return w?l==="warning"?c("div",{key:"controlled-warning",class:`${e}-form-item-feedback ${e}-form-item-feedback--warning`},w):l==="error"?c("div",{key:"controlled-error",class:`${e}-form-item-feedback ${e}-form-item-feedback--error`},w):l==="success"?c("div",{key:"controlled-success",class:`${e}-form-item-feedback ${e}-form-item-feedback--success`},w):c("div",{key:"controlled-default",class:`${e}-form-item-feedback`},w):null})}})):null)}}),da=C("text",`
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
`,[te("strong",`
 font-weight: var(--n-font-weight-strong);
 `),te("italic",{fontStyle:"italic"}),te("underline",{textDecoration:"underline"}),te("code",`
 line-height: 1.4;
 display: inline-block;
 font-family: var(--n-font-famliy-mono);
 transition: 
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 box-sizing: border-box;
 padding: .05em .35em 0 .35em;
 border-radius: var(--n-code-border-radius);
 font-size: .9em;
 color: var(--n-code-text-color);
 background-color: var(--n-code-color);
 border: var(--n-code-border);
 `)]),ua=Object.assign(Object.assign({},Pe.props),{code:Boolean,type:{type:String,default:"default"},delete:Boolean,strong:Boolean,italic:Boolean,underline:Boolean,depth:[String,Number],tag:String,as:{type:String,validator:()=>!0,default:void 0}}),ca=ne({name:"Text",props:ua,setup(t){const{mergedClsPrefixRef:e,inlineThemeDisabled:r}=at(t),n=Pe("Typography","-text",da,_r,t,e),a=I(()=>{const{depth:o,type:s}=t,l=s==="default"?o===void 0?"textColor":`textColor${o}Depth`:ce("textColor",s),{common:{fontWeightStrong:f,fontFamilyMono:d,cubicBezierEaseInOut:p},self:{codeTextColor:w,codeBorderRadius:S,codeColor:m,codeBorder:v,[l]:k}}=n.value;return{"--n-bezier":p,"--n-text-color":k,"--n-font-weight-strong":f,"--n-font-famliy-mono":d,"--n-code-border-radius":S,"--n-code-text-color":w,"--n-code-color":m,"--n-code-border":v}}),i=r?Mt("text",I(()=>`${t.type[0]}${t.depth||""}`),a,t):void 0;return{mergedClsPrefix:e,compitableTag:zr(t,["as","tag"]),cssVars:r?void 0:a,themeClass:i==null?void 0:i.themeClass,onRender:i==null?void 0:i.onRender}},render(){var t,e,r;const{mergedClsPrefix:n}=this;(t=this.onRender)===null||t===void 0||t.call(this);const a=[`${n}-text`,this.themeClass,{[`${n}-text--code`]:this.code,[`${n}-text--delete`]:this.delete,[`${n}-text--strong`]:this.strong,[`${n}-text--italic`]:this.italic,[`${n}-text--underline`]:this.underline}],i=(r=(e=this.$slots).default)===null||r===void 0?void 0:r.call(e);return this.code?c("code",{class:a,style:this.cssVars},this.delete?c("del",null,i):i):this.delete?c("del",{class:a,style:this.cssVars},i):c(this.compitableTag||"span",{class:a,style:this.cssVars},i)}}),fa={xmlns:"http://www.w3.org/2000/svg","xmlns:xlink":"http://www.w3.org/1999/xlink",viewBox:"0 0 384 512"},Qt=ne({name:"Strava",render:function(e,r){return ue(),xe("svg",fa,r[0]||(r[0]=[Q("path",{d:"M158.4 0L7 292h89.2l62.2-116.1L220.1 292h88.5zm150.2 292l-43.9 88.2l-44.6-88.2h-67.6l112.2 220l111.5-220z",fill:"currentColor"},null,-1)]))}}),ha={class:"profile-view-wrapper"},ma={class:"profile-content"},pa={class:"uplink-item"},ga={class:"uplink-header"},va={class:"uplink-info"},ba={class:"strava-button-line-tag-group"},ya={class:"color-picker-item"},wa={class:"color-label"},xa={key:1,class:"ascii-spinner"},ka={key:0,class:"race-goals-list"},Sa={class:"race-goal-info"},Ra={class:"goal-date"},Ca={key:1,class:"status-text"},_a={key:0,class:"migration-log"},Aa=ne({__name:"ProfileView",setup(t){const e=Ur(),r=z(""),n=z(""),a=z(!1),i=z(!1),o=z([]),s=z({name:"",date:""}),l=async()=>{try{o.value=await Ye.getRaceGoals()}catch(y){console.error("Failed to fetch race goals:",y)}},f=async()=>{if(!(!s.value.name||!s.value.date))try{await Ye.addRaceGoal(s.value),s.value={name:"",date:""},await l(),window.dispatchEvent(new CustomEvent("race-goals-updated")),e.success("RACE_GOAL_COMMITTED")}catch{e.error("WRITE_ERROR")}},d=async y=>{try{await Ye.deleteRaceGoal(y),await l(),window.dispatchEvent(new CustomEvent("race-goals-updated")),e.success("GOAL_PURGED")}catch{e.error("DELETE_ERROR")}},p=I(()=>!!(window&&window.db)),w=z(!1),S=z(""),m=async()=>{if(window.db){w.value=!0,S.value="INITIALIZING_MIGRATION...";try{S.value="EXTRACTING_LOCAL_WORKOUTS...";const y=await window.db.getWorkouts();if(y.length>0){S.value=`PUSHING ${y.length} WORKOUTS TO CLOUD...`;const O=y.map(({id:V,...K})=>K),{error:x}=await st.from("workouts").upsert(O);if(x)throw x}S.value="EXTRACTING_LOCAL_BIOMETRICS...";const g=await window.db.getDailyWeights();if(g.length>0){S.value=`PUSHING ${g.length} WEIGHT RECORDS TO CLOUD...`;const O=g.map(({id:V,...K})=>K),{error:x}=await st.from("daily_weights").upsert(O,{onConflict:"date"});if(x)throw x}S.value="SYNCING_INTERFACE_SCHEMAS...";const R=await window.db.getWorkoutTypeColors();if(R.length>0){const{error:O}=await st.from("workout_type_colors").upsert(R);if(O)throw O}S.value="SYNCING_RACE_STRATEGY...";const _=await window.db.getRaceGoals();if(_.length>0){S.value=`PUSHING ${_.length} RACE GOALS TO CLOUD...`;const O=_.map(({id:V,...K})=>K),{error:x}=await st.from("race_goals").upsert(O);if(x)throw x}S.value="MIGRATION_SEQUENCE_COMPLETE",e.success("ALL_DATA_SYNCED_TO_CLOUD")}catch(y){console.error("Migration failed:",y),S.value=`CRITICAL_FAILURE: ${y.message}`,e.error("MIGRATION_FAILED")}finally{w.value=!1}}},v=["gym","running","bike","rest","other"],k=z({gym:"#3f88c5",running:"#00b33c",bike:"#fb8c00",rest:"#757575",other:"#FFA726"}),h=async()=>{try{const y=localStorage.getItem("userName");y&&(r.value=y);const g=localStorage.getItem("goalWeight");g&&(n.value=g)}catch(y){console.error("Failed to load profile",y)}},U=()=>{try{localStorage.setItem("userName",r.value),n.value!==""&&localStorage.setItem("goalWeight",n.value),e.success("LOCAL_IDENTITY_COMMITTED")}catch{e.error("WRITE_ERROR")}},b=async()=>{try{a.value=await lt.isStravaConnected(),console.log("Profile: Strava status updated ->",a.value)}catch(y){console.error("Error checking Strava connection:",y)}},$=async()=>{i.value=!0;try{await lt.getAuthUrl()}catch{e.error("API_UNAVAILABLE"),i.value=!1}},G=async(y,g)=>{console.log("Profile: Auth callback intercepted:",g);try{const _=new URLSearchParams(new URL(g).search).get("code");_&&(await lt.exchangeCodeForToken(_),await b(),e.success("UPLINK_ESTABLISHED_SUCCESSFULLY"))}catch(R){e.error("HANDSHAKE_FAILED"),console.error("Strava Auth Error:",R)}finally{i.value=!1}},T=async()=>{try{const y=await Ye.getWorkoutTypeColors();if(y&&Array.isArray(y)){const g={};v.forEach(R=>{const _=y.find(O=>O.type===R);g[R]=_?_.color:k.value[R]}),k.value=g}}catch(y){console.error("Error fetching colors:",y)}},ae=async()=>{try{for(const y of v)await Ye.setWorkoutTypeColor({type:y,color:k.value[y]});window.dispatchEvent(new CustomEvent("colors-updated")),e.success("GLOBAL_THEME_UPDATED")}catch(y){e.error("SYNC_ERROR"),console.error("Save Error:",y)}},N=async()=>{const g=new URLSearchParams(window.location.search).get("code");if(g){i.value=!0;try{await lt.exchangeCodeForToken(g),window.history.replaceState({},document.title,window.location.pathname),await b(),e.success("UPLINK_ESTABLISHED_SUCCESSFULLY")}catch(R){console.error("Web OAuth Error:",R),e.error("HANDSHAKE_FAILED")}finally{i.value=!1}}};return ir(()=>{h(),N(),b(),T(),l(),window.ipcRenderer&&window.ipcRenderer.on("strava-auth-callback",G)}),Ar(()=>{window.ipcRenderer&&window.ipcRenderer.off("strava-auth-callback",G)}),(y,g)=>(ue(),xe("div",ha,[Q("div",ma,[g[16]||(g[16]=Q("h1",{class:"page-title"},"Profile & settings",-1)),F(A(Le),{vertical:"",size:"large",style:{width:"100%"}},{default:E(()=>[F(A(Ze),{bordered:"",class:"settings-card"},{header:E(()=>[...g[4]||(g[4]=[Q("span",{class:"card-title"},"Preferences",-1)])]),default:E(()=>[F(A(Le),{vertical:""},{default:E(()=>[F(A(Je),{label:"Your name"},{default:E(()=>[F(A(mt),{value:r.value,"onUpdate:value":g[0]||(g[0]=R=>r.value=R),placeholder:"Enter your name"},null,8,["value"])]),_:1}),F(A(Je),{label:"Goal body weight (kg)"},{default:E(()=>[F(A(mt),{value:n.value,"onUpdate:value":g[1]||(g[1]=R=>n.value=R),type:"text",placeholder:"e.g. 75.5"},null,8,["value"])]),_:1}),F(A(be),{onClick:U,type:"primary"},{default:E(()=>[...g[5]||(g[5]=[ge("Save profile",-1)])]),_:1})]),_:1})]),_:1}),F(A(Ze),{bordered:"",class:"settings-card"},{header:E(()=>[...g[6]||(g[6]=[Q("span",{class:"card-title"},"Integrations",-1)])]),default:E(()=>[F(A(Dr),{show:i.value},{default:E(()=>[F(A(Le),{vertical:""},{default:E(()=>[Q("div",pa,[Q("div",ga,[Q("div",va,[F(A(bt),{color:"#fc5100",component:A(Qt)},null,8,["component"]),g[7]||(g[7]=ge(" Strava ",-1))]),F(A(Vr),{type:a.value?"success":"error",round:""},{default:E(()=>[ge(Fe(a.value?"Connected":"Not connected"),1)]),_:1},8,["type"])]),Q("div",ba,[F(A(be),{onClick:$,type:a.value?"default":"primary"},{icon:E(()=>[F(A(bt),{color:"#fc5100",component:A(Qt)},null,8,["component"])]),default:E(()=>[ge(" "+Fe(a.value?"Reconnect":"Connect Strava"),1)]),_:1},8,["type"]),Q("div",{class:Pr(["status-text",{"text-success":a.value}])},Fe(a.value?"Sync ready":"Awaiting authorization"),3)])])]),_:1})]),_:1},8,["show"])]),_:1}),F(A(Ze),{bordered:"",class:"settings-card"},{header:E(()=>[...g[8]||(g[8]=[Q("span",{class:"card-title"},"Sport colors",-1)])]),default:E(()=>[Object.keys(k.value).length>0?(ue(),zt(A(Le),{key:0,vertical:""},{default:E(()=>[F(A(Nr),{cols:2,"x-gap":20,"y-gap":12},{default:E(()=>[(ue(),xe(Nt,null,Lt(v,R=>F(A(Lr),{key:R},{default:E(()=>[Q("div",ya,[Q("span",wa,Fe(R),1),F(A(wn),{value:k.value[R],"onUpdate:value":_=>k.value[R]=_,modes:["hex"],"show-alpha":!1},null,8,["value","onUpdate:value"])])]),_:2},1024)),64))]),_:1}),F(A(be),{onClick:ae,type:"primary"},{default:E(()=>[...g[9]||(g[9]=[ge("Save colors",-1)])]),_:1})]),_:1})):(ue(),xe("div",xa,"Loading"))]),_:1}),F(A(Ze),{bordered:"",class:"settings-card"},{header:E(()=>[...g[10]||(g[10]=[Q("span",{class:"card-title"},"Race goals",-1)])]),default:E(()=>[F(A(Le),{vertical:""},{default:E(()=>[F(A(Rn),{model:s.value,inline:"",onSubmit:$r(f,["prevent"])},{default:E(()=>[F(A(Je),{label:"Event name"},{default:E(()=>[F(A(mt),{value:s.value.name,"onUpdate:value":g[2]||(g[2]=R=>s.value.name=R),placeholder:"e.g. Oslo Marathon"},null,8,["value"])]),_:1}),F(A(Je),{label:"Date"},{default:E(()=>[nr(Q("input",{"onUpdate:modelValue":g[3]||(g[3]=R=>s.value.date=R),type:"date",class:"date-input"},null,512),[[Er,s.value.date]])]),_:1}),F(A(Je),null,{default:E(()=>[F(A(be),{onClick:f,type:"primary",disabled:!s.value.name||!s.value.date},{default:E(()=>[...g[11]||(g[11]=[ge(" Add goal ",-1)])]),_:1},8,["disabled"])]),_:1})]),_:1},8,["model"]),o.value.length>0?(ue(),xe("div",ka,[(ue(!0),xe(Nt,null,Lt(o.value,R=>(ue(),xe("div",{key:R.id,class:"race-goal-item"},[Q("div",Sa,[F(A(bt),{component:A(Fr)},null,8,["component"]),ge(" "+Fe(R.name)+" ",1),Q("span",Ra,Fe(R.date),1)]),F(A(be),{onClick:_=>d(R.id),size:"small",type:"error",ghost:""},{default:E(()=>[...g[12]||(g[12]=[ge(" Delete ",-1)])]),_:1},8,["onClick"])]))),128))])):(ue(),xe("div",Ca,"No race goals yet."))]),_:1})]),_:1}),p.value?(ue(),zt(A(Ze),{key:0,bordered:"",class:"settings-card"},{header:E(()=>[...g[13]||(g[13]=[Q("span",{class:"card-title"},"Cloud sync",-1)])]),default:E(()=>[F(A(Le),{vertical:""},{default:E(()=>[F(A(ca),{depth:"3",class:"migration-note"},{default:E(()=>[...g[14]||(g[14]=[ge(" Detected local data. Push your local workouts, weights, and settings to your Supabase cloud instance. ",-1)])]),_:1}),F(A(be),{onClick:m,loading:w.value,type:"warning",ghost:""},{default:E(()=>[...g[15]||(g[15]=[ge(" Migrate data to cloud ",-1)])]),_:1},8,["loading"]),S.value?(ue(),xe("div",_a,Fe(S.value),1)):Dt("",!0)]),_:1})]),_:1})):Dt("",!0)]),_:1})])]))}}),Ma=Ir(Aa,[["__scopeId","data-v-9c1a6315"]]);export{Ma as default};
