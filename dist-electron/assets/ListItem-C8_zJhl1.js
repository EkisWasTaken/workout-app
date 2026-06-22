import{i as a,e as i,bB as y,bC as D,g as d,f as l,j as v,k as s,u as B,p as I,o as b,aT as L,aU as E,q as M,v as O,cG as H,aI as T,b$ as N,ap as V}from"./index-CK7CDABy.js";const K=a([i("list",`
 --n-merged-border-color: var(--n-border-color);
 --n-merged-color: var(--n-color);
 --n-merged-color-hover: var(--n-color-hover);
 margin: 0;
 font-size: var(--n-font-size);
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 padding: 0;
 list-style-type: none;
 color: var(--n-text-color);
 background-color: var(--n-merged-color);
 `,[d("show-divider",[i("list-item",[a("&:not(:last-child)",[l("divider",`
 background-color: var(--n-merged-border-color);
 `)])])]),d("clickable",[i("list-item",`
 cursor: pointer;
 `)]),d("bordered",`
 border: 1px solid var(--n-merged-border-color);
 border-radius: var(--n-border-radius);
 `),d("hoverable",[i("list-item",`
 border-radius: var(--n-border-radius);
 `,[a("&:hover",`
 background-color: var(--n-merged-color-hover);
 `,[l("divider",`
 background-color: transparent;
 `)])])]),d("bordered, hoverable",[i("list-item",`
 padding: 12px 20px;
 `),l("header, footer",`
 padding: 12px 20px;
 `)]),l("header, footer",`
 padding: 12px 0;
 box-sizing: border-box;
 transition: border-color .3s var(--n-bezier);
 `,[a("&:not(:last-child)",`
 border-bottom: 1px solid var(--n-merged-border-color);
 `)]),i("list-item",`
 position: relative;
 padding: 12px 0; 
 box-sizing: border-box;
 display: flex;
 flex-wrap: nowrap;
 align-items: center;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[l("prefix",`
 margin-right: 20px;
 flex: 0;
 `),l("suffix",`
 margin-left: 20px;
 flex: 0;
 `),l("main",`
 flex: 1;
 `),l("divider",`
 height: 1px;
 position: absolute;
 bottom: 0;
 left: 0;
 right: 0;
 background-color: transparent;
 transition: background-color .3s var(--n-bezier);
 pointer-events: none;
 `)])]),y(i("list",`
 --n-merged-color-hover: var(--n-color-hover-modal);
 --n-merged-color: var(--n-color-modal);
 --n-merged-border-color: var(--n-border-color-modal);
 `)),D(i("list",`
 --n-merged-color-hover: var(--n-color-hover-popover);
 --n-merged-color: var(--n-color-popover);
 --n-merged-border-color: var(--n-border-color-popover);
 `))]),S=Object.assign(Object.assign({},b.props),{size:{type:String,default:"medium"},bordered:Boolean,clickable:Boolean,hoverable:Boolean,showDivider:{type:Boolean,default:!0}}),m=T("n-list"),G=v({name:"List",props:S,slots:Object,setup(e){const{mergedClsPrefixRef:r,inlineThemeDisabled:o,mergedRtlRef:n}=B(e),h=I("List",n,r),p=b("List","-list",K,H,e,r);L(m,{showDividerRef:E(e,"showDivider"),mergedClsPrefixRef:r});const c=M(()=>{const{common:{cubicBezierEaseInOut:u},self:{fontSize:f,textColor:g,color:x,colorModal:C,colorPopover:z,borderColor:$,borderColorModal:R,borderColorPopover:k,borderRadius:_,colorHover:w,colorHoverModal:P,colorHoverPopover:j}}=p.value;return{"--n-font-size":f,"--n-bezier":u,"--n-text-color":g,"--n-color":x,"--n-border-radius":_,"--n-border-color":$,"--n-border-color-modal":R,"--n-border-color-popover":k,"--n-color-modal":C,"--n-color-popover":z,"--n-color-hover":w,"--n-color-hover-modal":P,"--n-color-hover-popover":j}}),t=o?O("list",void 0,c,e):void 0;return{mergedClsPrefix:r,rtlEnabled:h,cssVars:o?void 0:c,themeClass:t==null?void 0:t.themeClass,onRender:t==null?void 0:t.onRender}},render(){var e;const{$slots:r,mergedClsPrefix:o,onRender:n}=this;return n==null||n(),s("ul",{class:[`${o}-list`,this.rtlEnabled&&`${o}-list--rtl`,this.bordered&&`${o}-list--bordered`,this.showDivider&&`${o}-list--show-divider`,this.hoverable&&`${o}-list--hoverable`,this.clickable&&`${o}-list--clickable`,this.themeClass],style:this.cssVars},r.header?s("div",{class:`${o}-list__header`},r.header()):null,(e=r.default)===null||e===void 0?void 0:e.call(r),r.footer?s("div",{class:`${o}-list__footer`},r.footer()):null)}}),U=v({name:"ListItem",slots:Object,setup(){const e=V(m,null);return e||N("list-item","`n-list-item` must be placed in `n-list`."),{showDivider:e.showDividerRef,mergedClsPrefix:e.mergedClsPrefixRef}},render(){const{$slots:e,mergedClsPrefix:r}=this;return s("li",{class:`${r}-list-item`},e.prefix?s("div",{class:`${r}-list-item__prefix`},e.prefix()):null,e.default?s("div",{class:`${r}-list-item__main`},e):null,e.suffix?s("div",{class:`${r}-list-item__suffix`},e.suffix()):null,this.showDivider&&s("div",{class:`${r}-list-item__divider`}))}});export{G as N,U as a};
