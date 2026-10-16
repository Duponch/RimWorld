import { isColonist } from '../sim/affiliation';
import { apparelLabel } from '../sim/apparel-rules';
import type { World } from '../sim/types';

/** Kept structural so this UI file can land alongside the central command
 * union without depending on edit order between the two integrations. */
export type ApparelPolicyAssignment={type:'apparel-policy-assign';pawnId:number;policyId:number;automatic:boolean};
export type ApparelClearForced={type:'apparel-clear-forced';pawnId:number};
export type ApparelAssignmentCommand=ApparelPolicyAssignment|ApparelClearForced;

/** One pass at confirmed snapshot adoption, never an inventory/task inference. */
export function forcedApparelByPawn(world:World):Map<number,string[]> {
  const result=new Map<number,string[]>();
  for(const piece of world.piles)if(piece.kind==='apparel'&&piece.owner.type==='apparel'&&piece.apparel?.forced===true){
    const labels=result.get(piece.owner.pawnId)??[];labels.push(apparelLabel(piece));result.set(piece.owner.pawnId,labels);
  }
  return result;
}

/** Keeps the assignment panel owned by the existing food-policy UI while
 * exposing apparel in the same colon-by-colon table. */
export function apparelAssignmentLayout(layout:string):string {
  return layout
    .replace('<th>Réaction hostile</th>','<th>Tenue</th><th>Auto.</th><th>Réaction hostile</th>')
    .replace('Choisissez les aliments autorisés pour chaque colon.','Choisissez les aliments et la tenue autorisés pour chaque colon.')
    .replace('Vêtements, drogues, et réaction Attaquer restent à développer.','Les règles détaillées des tenues et les drogues restent à développer.');
}

export function createApparelPolicyControls(root:HTMLElement,send:(command:ApparelAssignmentCommand)=>Promise<string|null>) {
  let world:World|undefined,pending=false,policySignature='';
  const rows=new Map<number,{policy:HTMLSelectElement;automatic:HTMLInputElement;clear:HTMLButtonElement}>();
  const feedback=()=>document.getElementById('assign-feedback')!;
  const policies=()=>world?.apparelPolicies??[];
  const fill=(select:HTMLSelectElement)=>select.replaceChildren(...policies().map(policy=>{
    const option=document.createElement('option');option.value=String(policy.id);option.textContent=policy.label;return option;
  }));
  async function commit(command:ApparelAssignmentCommand) {
    if(pending)return;pending=true;root.setAttribute('aria-busy','true');
    for(const controls of rows.values())controls.clear.disabled=true;
    try {const error=await send(command);feedback().textContent=error??'';if(!error&&world)update(world);}
    finally {pending=false;root.removeAttribute('aria-busy');if(world)update(world);}
  }
  function installRow(row:HTMLTableRowElement,pawnId:number,name:string) {
    const policyCell=document.createElement('td');policyCell.dataset.apparelPolicyCell=String(pawnId);
    const policy=document.createElement('select');policy.dataset.apparelPolicyPawn=String(pawnId);policy.setAttribute('aria-label',`Politique vestimentaire de ${name}`);policyCell.append(policy);
    const clear=document.createElement('button');clear.type='button';clear.dataset.apparelClearForcedPawn=String(pawnId);clear.textContent='Effacer le port forcé';clear.setAttribute('aria-label',`Effacer le port forcé de ${name}`);clear.hidden=true;clear.disabled=true;policyCell.append(clear);
    const automaticCell=document.createElement('td');automaticCell.dataset.apparelAutomationCell=String(pawnId);
    const automatic=document.createElement('input');automatic.type='checkbox';automatic.dataset.apparelAutomationPawn=String(pawnId);automatic.setAttribute('aria-label',`Remplacement automatique des vêtements de ${name}`);automatic.title='Autoriser ce colon à remplacer physiquement une tenue non conforme par une tenue disponible';automaticCell.append(automatic);
    const reactionCell=row.children[2]??null;row.insertBefore(policyCell,reactionCell);row.insertBefore(automaticCell,reactionCell);
    policy.onchange=()=>void commit({type:'apparel-policy-assign',pawnId,policyId:Number(policy.value),automatic:automatic.checked});
    automatic.onchange=()=>void commit({type:'apparel-policy-assign',pawnId,policyId:Number(policy.value),automatic:automatic.checked});
    clear.onclick=()=>{if(!clear.hidden&&!clear.disabled)void commit({type:'apparel-clear-forced',pawnId});};
    rows.set(pawnId,{policy,automatic,clear});
  }
  function update(next:World) {
    world=next;if(root.hidden)return;
    const currentIds=new Set(next.pawns.filter(isColonist).map(p=>p.id));
    for(const id of rows.keys())if(!currentIds.has(id))rows.delete(id);
    for(const pawn of next.pawns.filter(isColonist)) {
      const foodSelect=root.querySelector<HTMLSelectElement>(`[data-food-policy-pawn="${pawn.id}"]`),row=foodSelect?.closest('tr');
      if(!row)continue;
      let controls=rows.get(pawn.id);
      if(!controls||!row.contains(controls.policy)){installRow(row,pawn.id,pawn.name);controls=rows.get(pawn.id)!;policySignature='';}
    }
    const signature=JSON.stringify(policies().map(p=>[p.id,p.label]));
    if(signature!==policySignature){policySignature=signature;for(const controls of rows.values())fill(controls.policy);}
    const forced=forcedApparelByPawn(next);
    for(const pawn of next.pawns.filter(isColonist)){
      const controls=rows.get(pawn.id);if(!controls)continue;
      controls.policy.disabled=policies().length===0;controls.automatic.disabled=policies().length===0;controls.policy.value=String(pawn.apparelPolicyId??policies()[0]?.id??'');controls.automatic.checked=pawn.apparelAutomation??false;
      const labels=forced.get(pawn.id)??[];
      controls.clear.hidden=next.schemaVersion<90||pawn.state==='dead'||!!pawn.prisoner||!!pawn.visitor||labels.length===0;
      controls.clear.disabled=pending||controls.clear.hidden;
      const description=`Rendre ces vêtements à la politique, sans les retirer ni changer le réglage Auto : ${labels.join(', ')}`;
      if(controls.clear.dataset.forcedDescription!==description){controls.clear.dataset.forcedDescription=description;controls.clear.title=description;}
    }
  }
  return {update};
}
