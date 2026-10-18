import type {SettlementProximityOffset263} from '../sim/world-settlement-proximity-263';
export function settlementProximityText263(offsets:readonly SettlementProximityOffset263[]):string {
 return offsets.length?'La proximité d’autres établissements dégradera les relations tous les quinze jours : '+offsets.map(o=>`${o.name} (${o.goodwill})`).join(', ')+'.':'';
}
/** One ordinary user confirmation, with labels via textContent. The caller
 * revalidates its confirmed snapshot on acceptance and owns cancellation. */
export function confirmSettlementProximity263(host:HTMLElement,text:string,accept:()=>void):()=>void {
 const doc=host.ownerDocument,previous=doc.activeElement,panel=doc.createElement('dialog'),title=doc.createElement('h3'),body=doc.createElement('p'),cancel=doc.createElement('button'),confirm=doc.createElement('button');
 title.textContent='Confirmer l’installation';body.textContent=text;cancel.textContent='Annuler';confirm.textContent='S’installer';cancel.type=confirm.type='button';panel.setAttribute('aria-label','Proximité des établissements');panel.append(title,body,cancel,confirm);
 let closed=false;const close=()=>{if(closed)return;closed=true;panel.close();panel.remove();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};
 cancel.onclick=close;confirm.onclick=()=>{close();accept();};panel.addEventListener('cancel',e=>{e.preventDefault();close();});panel.addEventListener('keydown',e=>e.stopPropagation());host.append(panel);panel.showModal();cancel.focus();return close;
}
