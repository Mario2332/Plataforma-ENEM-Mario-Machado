import{c as i,ad as p,$ as d}from"./index-C2B3IB_c.js";import{H as l}from"./vendor-firebase-BLqY7lrF.js";/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=i("ArrowDown",[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=i("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);async function w(){const e=d.currentUser;if(!e)throw new Error("Você precisa estar autenticado para acessar este recurso");try{await e.getIdToken(!0)}catch{throw new Error("Sessão expirada. Por favor, faça login novamente.")}return e}async function t(e,a,n=2){let s;for(let r=0;r<=n;r++)try{return await w(),(await l(p,e)(a)).data}catch(o){if(s=o,o.code==="functions/unauthenticated")throw new Error("Sessão expirada. Por favor, faça login novamente.");if(o.code==="functions/permission-denied")throw new Error("Você não tem permissão para realizar esta ação.");if(r===n)break;await new Promise(c=>setTimeout(c,Math.pow(2,r)*1e3))}const u=s?.message||"Erro desconhecido ao chamar função";throw new Error(u)}const g={getConteudos:async e=>t("getConteudosSimples",{materiaKey:e}),createTopico:async e=>t("createTopico",e),updateTopico:async e=>t("updateTopico",e),deleteTopico:async e=>t("deleteTopico",e)};export{y as A,f as a,g as m};
