import{c as l,r as o,j as e}from"./index-JBlMBNKT.js";import{I as c}from"./ImageWithFallback-lK74HBlX.js";import{S as d}from"./StarRating-Dbx71ots.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],m=l("chevron-down",i);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],u=l("chevron-up",x);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]],p=l("message-square",h);function N({review:s}){const[t,n]=o.useState(!1),r=a=>new Date(a).toLocaleDateString("es-MX",{year:"numeric",month:"short",day:"numeric"});return e.jsxs("div",{className:"bg-card rounded-2xl border border-border p-4",children:[e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx(c,{src:s.reviewerAvatarUrl,alt:s.reviewerName,className:"w-10 h-10 rounded-full object-cover flex-shrink-0"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("p",{className:"text-sm font-semibold text-foreground",children:s.reviewerName}),e.jsx("span",{className:"text-xs text-muted-foreground",children:r(s.date)})]}),e.jsxs("div",{className:"flex items-center gap-1 mt-0.5",children:[e.jsx(d,{value:s.rating,size:"xs"}),e.jsxs("span",{className:"text-xs font-semibold text-foreground",children:[s.rating,".0"]})]})]})]}),e.jsx("p",{className:"text-sm text-foreground mt-3 leading-relaxed",children:s.comment}),e.jsx("div",{className:"flex gap-4 mt-2",children:[{label:"Puntualidad",value:s.punctualityRating},{label:"Calidad",value:s.qualityRating},{label:"Comunicación",value:s.communicationRating}].map(a=>e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsxs("span",{className:"text-[10px] text-muted-foreground",children:[a.label,":"]}),e.jsxs("span",{className:"text-[10px] font-semibold text-foreground",children:[a.value,"/5"]})]},a.label))}),s.workerReply&&e.jsxs("div",{className:"mt-3",children:[e.jsxs("button",{onClick:()=>n(!t),className:"flex items-center gap-1 text-xs text-[#1A56DB]",children:[e.jsx(p,{className:"w-3.5 h-3.5"}),"Respuesta del trabajador",t?e.jsx(u,{className:"w-3.5 h-3.5"}):e.jsx(m,{className:"w-3.5 h-3.5"})]}),t&&e.jsx("div",{className:"mt-2 bg-secondary rounded-xl p-3",children:e.jsx("p",{className:"text-xs text-foreground leading-relaxed",children:s.workerReply})})]})]})}export{N as R};
