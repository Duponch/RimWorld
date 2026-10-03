import { isAdmittedGuest } from '../sim/affiliation';
import type { Command,Pawn,World } from '../sim/types';

export function createPodRescueInspection(root:HTMLElement,current:()=>Pawn|undefined,send:(command:Command)=>void):void {
  const label=document.createElement('label');label.textContent='Régime du naufragé ';
  const select=document.createElement('select');select.id='pod-food-policy';select.setAttribute('aria-label','Régime du naufragé');
  select.addEventListener('change',()=>{const p=current();if(p&&isAdmittedGuest(p))send({type:'food-policy-assign',pawnId:p.id,policyId:Number(select.value)});});
  label.append(select);root.append(label);
}
export function updatePodRescueInspection(root:HTMLElement,w:World,p:Pawn):void {
  const select=root.querySelector<HTMLSelectElement>('#pod-food-policy');if(!select)return;
  const signature=JSON.stringify(w.foodPolicies.map(policy=>[policy.id,policy.name]));
  if(select.dataset.signature!==signature){select.dataset.signature=signature;select.replaceChildren(...w.foodPolicies.map(policy=>new Option(policy.name,String(policy.id))));}
  select.value=String(p.foodPolicyId);select.disabled=p.state==='dead'||!isAdmittedGuest(p);
}
