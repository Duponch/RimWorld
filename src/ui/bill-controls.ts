import { ITEM_DEFINITIONS } from '../sim/items';
import { PRODUCTION_RECIPES, stationRecipes } from '../sim/production-recipes';
import { countedProducts } from '../sim/cooking-bills';
import { queryCookingBillStatus } from '../sim/cooking-diagnostics';
import type { BillSettings } from '../sim/cooking-types';
import type { Command, Structure, World } from '../sim/types';

export function billControls(station:Structure,send:(command:Command)=>void):HTMLElement {
  const root=document.createElement('section');root.className='bill-controls';
  const title=document.createElement('h3');title.textContent='Factures';root.append(title);
  for(const [index,recipe] of stationRecipes(station).entries()){const add=document.createElement('button');add.id=index===0?'add-cooking-bill':`add-bill-${recipe}`;add.textContent=`Ajouter : ${PRODUCTION_RECIPES[recipe].label.toLowerCase()}`;add.onclick=()=>send({type:'bill-add',structureId:station.id,recipe});root.append(add);}
  for(const bill of station.bills??[]) {
    const form=document.createElement('div');form.className='bill';form.dataset.bill=String(bill.id);
    const status=document.createElement('p');status.dataset.billStatus=String(bill.id);form.append(status);
    const reason=document.createElement('p');reason.dataset.billReason=String(bill.id);reason.className='muted';form.append(reason);
    const fields=new Map<string,HTMLInputElement|HTMLSelectElement>();
    const input=(key:string,label:string,type:string,value:string|boolean)=>{
      const row=document.createElement('label'),field=document.createElement('input');field.type=type;field.dataset.field=key;
      if(typeof value==='boolean')field.checked=value;else field.value=value;
      if(type==='number'){field.min='0';field.max=key==='radius'?'999':'9999';field.step='1';}
      row.append(label,field);fields.set(key,field);return row;
    };
    const select=(key:string,label:string,choices:readonly [string,string][],value:string)=>{
      const row=document.createElement('label'),field=document.createElement('select');field.dataset.field=key;
      for(const [v,text] of choices){const o=document.createElement('option');o.value=v;o.textContent=text;field.append(o);}field.value=value;
      row.append(label,field);fields.set(key,field);return row;
    };
    form.append(select('mode','Répéter',[['times','Faire X fois'],['until','Jusqu’à X en réserve'],['forever','Sans limite']],bill.mode),input('target',bill.recipe==='butcher-creature'?'X : dépouilles / viande en réserve':bill.recipe==='stone-blocks'?'X : opérations / blocs en réserve':'Quantité','number',String(bill.target)),input('suspended','Suspendre','checkbox',bill.suspended));
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Ingrédients et livraison';details.append(summary);
    details.append(...PRODUCTION_RECIPES[bill.recipe].inputs.map(i=>input(i,ITEM_DEFINITIONS[i].label,'checkbox',bill.filters[i]??false)),input('radius','Rayon depuis le poste','number',String(bill.radius)),select('destination','Produit',[['stockpile','Meilleure réserve'],['drop','Déposer au sol']],bill.destination));form.append(details);
    form.addEventListener('input',()=>{form.dataset.dirty='true';});
    const apply=document.createElement('button');apply.dataset.applyBill=String(bill.id);apply.textContent='Appliquer la facture';
    const field=(name:string)=>fields.get(name)!;
    apply.onclick=()=>{
      const settings:BillSettings={mode:field('mode').value as BillSettings['mode'],target:Number(field('target').value),suspended:(field('suspended') as HTMLInputElement).checked,filters:Object.fromEntries(PRODUCTION_RECIPES[bill.recipe].inputs.map(i=>[i,(field(i) as HTMLInputElement).checked])),radius:Number(field('radius').value),destination:field('destination').value as BillSettings['destination']};
      send({type:'bill-update',structureId:station.id,billId:bill.id,settings});
    };
    const actions=document.createElement('div');actions.className='bill-actions';actions.append(apply);
    for(const [text,direction] of [['↑',-1],['↓',1]] as const){const button=document.createElement('button');button.textContent=text;button.setAttribute('aria-label',direction===-1?'Monter la facture':'Descendre la facture');button.onclick=()=>send({type:'bill-move',structureId:station.id,billId:bill.id,direction});actions.append(button);}
    const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','Supprimer la facture');remove.onclick=()=>send({type:'bill-remove',structureId:station.id,billId:bill.id});actions.append(remove);form.append(actions);root.append(form);
  }
  return root;
}
export function updateBillControls(root:ParentNode,station:Structure,world:World):void {
  for(const bill of station.bills??[]) {
    const form=root.querySelector<HTMLElement>(`[data-bill="${bill.id}"]`);if(!form)continue;
    form.querySelector('[data-bill-status]')!.textContent=`${PRODUCTION_RECIPES[bill.recipe].label} · ${bill.suspended?'suspendue':bill.mode==='times'?`${bill.target} restant(s)`:bill.mode==='until'?`${countedProducts(world,bill)} / ${bill.target} ${bill.recipe==='butcher-creature'?'viande(s) stockée(s)':'stocké(s)/porté(s)'}`:'sans limite'}`;
    form.querySelector('[data-bill-reason]')!.textContent=queryCookingBillStatus(world,station,bill).reason;
    if(!form.dataset.dirty)(form.querySelector('[data-field="target"]') as HTMLInputElement).value=String(bill.target);
  }
}
