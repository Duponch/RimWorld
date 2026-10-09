import {MEDICINES,isMedicine,medicineAllowed,type MedicineItem} from './medicine-rules.ts';
import {medicineClaims} from './medicine-logistics.ts';
import {reservedSource,refreshStock} from './materials.ts';
import {groundCapacity,groundPile,nearbyGround} from './ground-placement.ts';
import {adjacent,routeToJob,type Reachability} from './pathfinding.ts';
import {copyPileCondition} from './pile-condition.ts';
import type {SurgicalIngredient,SurgeryTask} from './surgery-state.ts';
import type {Cell,MaterialPile,Pawn,World} from './types.ts';
import type {NeedContext} from './needs.ts';

const near=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z||adjacent(a,b);
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;

/** One plan reserves every dose and its physical staging cell. Two small stacks
 * are valid; no synthetic medicine, hidden escrow or inventory owner is used. */
export function planImplantIngredients(w:World,doctor:Pawn,patient:Pawn,spot:Cell,reach:Reachability):{ingredients:SurgicalIngredient[];path:Cell[]}|undefined {
  const distance=(p:MaterialPile)=>p.owner.type==='ground'?(p.owner.x-patient.x)**2+(p.owner.z-patient.z)**2:Infinity;
  const sources=w.piles.filter(p=>p.owner.type==='ground'&&p.quantity>reservedSource(w,p.id)&&routeToJob(w,p.owner,reach,true));
  sources.sort((a,b)=>distance(a)-distance(b)||a.id-b.id);
  const wood=sources.find(p=>p.item==='wood');if(!wood)return;
  for(const item of (Object.keys(MEDICINES) as MedicineItem[]).sort((a,b)=>MEDICINES[b].potency-MEDICINES[a].potency)){
    if(!medicineAllowed(patient,item))continue;
    let needed=2;const selected:{pile:MaterialPile;quantity:number}[]=[{pile:wood,quantity:1}];
    for(const pile of sources){
      if(pile.item!==item||medicineClaims(w,pile.id)>=10)continue;
      const quantity=Math.min(needed,pile.quantity-reservedSource(w,pile.id));if(quantity<=0)continue;
      selected.push({pile,quantity});needed-=quantity;if(!needed)break;
    }
    if(needed)continue;
    const cells=nearbyGround(w,spot,2).filter(c=>!same(c,spot)),used=new Set<string>(),ingredients:SurgicalIngredient[]=[];
    for(const {pile,quantity} of selected){
      const cell=cells.find(c=>!used.has(`${c.x}:${c.z}`)&&!groundPile(w,c)&&groundCapacity(w,c,pile.item,doctor.id)>=quantity&&routeToJob(w,c,reach,true));
      if(!cell)break;
      used.add(`${cell.x}:${cell.z}`);
      ingredients.push({pileId:pile.id,item:pile.item as SurgicalIngredient['item'],quantity,stage:'source',cell:{...cell}});
    }
    if(ingredients.length!==selected.length)continue;
    const path=routeToJob(w,wood.owner as Cell,reach,true);if(path)return {ingredients,path};
  }
}

/** Shared runtime/save ownership check. Clinical eligibility and bedside
 * reservation remain the caller's responsibility. It performs no mutation. */
export function validImplantTaskRelations(w:World,doctor:Pawn,patient:Pawn|undefined,task:SurgeryTask):boolean {
  if(!patient||!task.implant||task.medicine)return false;
  const cargo=w.piles.filter(p=>p.owner.type==='pawn'&&p.owner.pawnId===doctor.id);
  if(task.phase==='work')return task.ingredients===undefined&&!!task.consumedMedicine&&medicineAllowed(patient,task.consumedMedicine)&&cargo.length===0;
  if(task.consumedMedicine!==undefined||!task.ingredients?.length)return false;
  let held=0,open=false;const cells=new Set<string>();let medicine:MedicineItem|undefined,wood=0,doses=0;
  for(const i of task.ingredients){
    const key=`${i.cell.x}:${i.cell.z}`;
    if(cells.has(key)||same(i.cell,task.spot)||Math.abs(i.cell.x-task.spot.x)+Math.abs(i.cell.z-task.spot.z)>2)return false;
    cells.add(key);
    if(i.item==='wood')wood+=i.quantity;
    else if(isMedicine(i.item)&&medicineAllowed(patient,i.item)){
      if(medicine&&medicine!==i.item)return false;medicine=i.item;doses+=i.quantity;
    }else return false;
    if(i.stage==='placed'){if(open)return false;}else {if(i.stage==='held'&&open)return false;open=true;}
    const pile=w.piles.find(p=>p.id===i.pileId);if(!pile||pile.item!==i.item||pile.quantity<i.quantity)return false;
    if(i.stage==='held'){
      held++;if(pile.owner.type!=='pawn'||pile.owner.pawnId!==doctor.id||pile.quantity!==i.quantity)return false;
    }else {
      if(pile.owner.type!=='ground'||i.stage==='placed'&&!same(pile.owner,i.cell)||reservedSource(w,pile.id)>pile.quantity)return false;
      if(i.stage==='source'&&isMedicine(i.item)&&medicineClaims(w,pile.id)>10)return false;
      if(i.stage==='source'&&(groundCapacity(w,i.cell,i.item,doctor.id)<i.quantity||groundPile(w,i.cell)))return false;
    }
  }
  return wood===1&&doses===2&&held<=1&&cargo.length===held
    &&(task.phase==='pickup'?held===0&&task.ingredients.some(i=>i.stage==='source'):task.phase==='approach'&&(held===1||task.ingredients.every(i=>i.stage==='placed')));
}

/** One existing carry owner at a time, with the same bounded split as cooking
 * and medical hauling. The provider handles conservative release on false. */
export function gatherImplantIngredient(w:World,doctor:Pawn,task:SurgeryTask,context:NeedContext):boolean {
  const ingredient=task.ingredients?.find(i=>i.stage!=='placed');if(!ingredient)return true;
  const pile=w.piles.find(p=>p.id===ingredient.pileId);if(!pile)return false;
  if(ingredient.stage==='source'){
    if(pile.owner.type!=='ground'||reservedSource(w,pile.id)>pile.quantity)return false;
    if(!near(doctor,pile.owner)){context.move(pile.owner,false);return true;}
    if(doctor.moveCooldown>0)return true;
    if(w.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===doctor.id))return false;
    if(pile.quantity===ingredient.quantity)pile.owner={type:'pawn',pawnId:doctor.id};
    else {
      if(w.piles.length>=32768||!Number.isSafeInteger(w.nextId+1))return false;
      const carried:MaterialPile={id:w.nextId++,item:pile.item,kind:pile.kind,quantity:ingredient.quantity,owner:{type:'pawn',pawnId:doctor.id},...copyPileCondition(pile)};
      pile.quantity-=ingredient.quantity;w.piles.push(carried);ingredient.pileId=carried.id;
    }
    ingredient.stage='held';task.phase='approach';doctor.path=[];doctor.state='moving';refreshStock(w);return true;
  }
  if(ingredient.stage!=='held'||pile.owner.type!=='pawn'||pile.owner.pawnId!==doctor.id)return false;
  if(!near(doctor,ingredient.cell)){context.move(ingredient.cell,false);return true;}
  if(doctor.moveCooldown>0)return true;
  if(groundPile(w,ingredient.cell)||groundCapacity(w,ingredient.cell,ingredient.item,doctor.id)<ingredient.quantity)return false;
  pile.owner={type:'ground',...ingredient.cell};ingredient.stage='placed';
  task.phase=task.ingredients!.some(i=>i.stage==='source')?'pickup':'approach';doctor.path=[];doctor.state='moving';refreshStock(w);return true;
}

/** Preflight the whole staged ledger before the anesthesia RNG or any removal. */
export function implantIngredientsReady(w:World,doctor:Pawn,patient:Pawn,task:SurgeryTask):MedicineItem|undefined {
  if(!validImplantTaskRelations(w,doctor,patient,task)||!task.ingredients?.every(i=>i.stage==='placed'))return;
  const medicine=task.ingredients.find(i=>isMedicine(i.item))?.item;
  return medicine&&isMedicine(medicine)?medicine:undefined;
}
export function consumeImplantIngredients(w:World,task:SurgeryTask):void {
  for(const i of task.ingredients!){
    const pile=w.piles.find(p=>p.id===i.pileId)!;pile.quantity-=i.quantity;
    if(!pile.quantity)w.piles.splice(w.piles.indexOf(pile),1);
  }
  delete task.ingredients;refreshStock(w);
}
