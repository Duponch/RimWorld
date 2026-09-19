import { healthRandom } from './health.ts';
import { releaseAssignments } from './work-release.ts';
import { isCookingOrder } from './order-types.ts';
import { groundCapacity,planGroundPlacement } from './ground-placement.ts';
import { addGroundMaterial,refreshStock } from './materials.ts';
import { ingredientPlaceFree } from './cooking-bills.ts';
import { productionWorkTotal,isTailoring,unfinishedItem,PRODUCTION_RECIPES } from './production-recipes.ts';
import type { Cell,CommandResult,MaterialPile,Pawn,World } from './types.ts';

export interface UnfinishedState { recipe:'tribalwear'|'shirt';authorId:number;progress:number;cloth:60|45;parts:number[];billId?:number }
export interface TailoringLedger {completed:number;cancelled:number;lostCloth:number}
export function detachMissingBills(world:World):void {
  if(!world.piles.some(p=>p.unfinished?.billId))return;
  const bills=new Set([...world.structures,...world.packed.map(p=>p.building)].flatMap(s=>s.bills?.map(b=>b.id)??[]));
  for(const p of world.piles)if(p.unfinished?.billId&&!bills.has(p.unfinished.billId))delete p.unfinished.billId;
}
/** Consume staged ingredients only after proving a physical place for the work.
 * The unfinished object, not a cancelled task, owns progress and material. */
export function beginUnfinished(world:World,pawn:Pawn):MaterialPile|null {
  const task=pawn.cooking!,recipe=task.recipe as 'tribalwear'|'shirt',item=unfinishedItem(recipe),units=PRODUCTION_RECIPES[recipe].units,existing=task.ingredients.length===1?world.piles.find(p=>p.id===task.ingredients[0]!.pileId&&p.unfinished):undefined;
  if(existing){if(existing.unfinished!.authorId!==pawn.id)return null;existing.unfinished!.billId=task.billId;return existing;}
  const used=new Map<number,number>();for(const i of task.ingredients)used.set(i.pileId,(used.get(i.pileId)??0)+i.quantity);
  const piles=world.piles.map(p=>used.has(p.id)?{...p,quantity:p.quantity-used.get(p.id)!}:p).filter(p=>p.quantity>0),shadow={...world,piles};
  if(piles.length>=32768||!Number.isSafeInteger(world.nextId+1))return null;
  const s=task.spot,cells:Cell[]=[{x:s.x,z:s.z+1},{x:s.x+1,z:s.z},{x:s.x-1,z:s.z},{x:s.x,z:s.z-1}];
  const cell=cells.find(c=>ingredientPlaceFree(shadow,c,s,recipe)&&groundCapacity(shadow,c,item,pawn.id)>=1);
  if(!cell)return null;
  const pile:MaterialPile={id:world.nextId++,item,kind:'unfinished',quantity:1,owner:{type:'ground',...cell},unfinished:{recipe,authorId:pawn.id,progress:0,cloth:units,parts:[...used.values()],billId:task.billId}};
  world.piles=[...piles,pile];task.ingredients=[{pileId:pile.id,item,quantity:1,stage:'placed',cell:{...cell}}];refreshStock(world);return pile;
}
export function cancelUnfinished(world:World,itemId:number):CommandResult {
  const pile=world.piles.find(p=>p.id===itemId);
  if(!pile?.unfinished||pile.owner.type!=='ground')return {ok:false,code:'missing-target',reason:'Ouvrage inachevé introuvable au sol.'};
  const random={rng:world.rng};let refund=0;
  for(const n of pile.unfinished.parts){const raw=n*.75,whole=Math.floor(raw);refund+=whole+(raw>whole&&healthRandom(random)<raw-whole?1:0);}
  const shadow={...world,piles:world.piles.filter(p=>p!==pile)},placements=planGroundPlacement(shadow,refund,pile.owner,'cloth');
  if(!placements||shadow.piles.length+placements.length>32768||!Number.isSafeInteger(world.nextId+placements.length))return {ok:false,code:'occupied',reason:'Aucune place pour conserver le tissu récupéré.'};
  if(!Number.isSafeInteger((world.tailoring?.cancelled??0)+1)||!Number.isSafeInteger((world.tailoring?.lostCloth??0)+pile.unfinished.cloth-refund))return {ok:false,code:'invalid-command',reason:'Limite du bilan textile atteinte.'};
  // A ground unfinished work has no companion carried ingredients. Cancel only
  // tasks referring to it; unrelated current jobs survive removal from a queue.
  for(const pawn of world.pawns){
    if(pawn.cooking?.ingredients.some(i=>i.pileId===itemId)||pawn.haul?.sourcePileId===itemId)releaseAssignments(world,pawn);
    pawn.orders.queue=pawn.orders.queue.filter(o=>typeof o==='number'||(isCookingOrder(o)?!o.cooking.ingredients.some(i=>i.pileId===itemId):o.sourcePileId!==itemId));
  }
  world.piles=shadow.piles;addGroundMaterial(world,'textile',refund,pile.owner,'cloth');world.rng=random.rng;
  const ledger=world.tailoring??={completed:0,cancelled:0,lostCloth:0};ledger.cancelled++;ledger.lostCloth+=pile.unfinished.cloth-refund;return {ok:true};
}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):boolean=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function validUnfinishedShape(p:Record<string,unknown>,version:number):boolean {
  if(p.kind!=='unfinished')return p.unfinished===undefined;
  const u=p.unfinished;
  return version>=72&&(p.item==='unfinished-tribalwear'||version>=73&&p.item==='unfinished-shirt')&&p.quantity===1&&record(p.owner)&&['ground','pawn'].includes(String(p.owner.type))&&record(u)
    &&Object.keys(u).every(k=>['recipe','authorId','progress','cloth','parts','billId'].includes(k))&&isTailoring(u.recipe)&&(version>=73||u.recipe==='tribalwear')&&p.item===unfinishedItem(u.recipe)&&u.cloth===PRODUCTION_RECIPES[u.recipe].units&&int(u.authorId,1)
    &&Array.isArray(u.parts)&&u.parts.length>0&&u.parts.length<=60&&u.parts.every(n=>int(n,1,60))&&u.parts.reduce((a:number,b:number)=>a+b,0)===u.cloth
    &&int(u.progress,0,productionWorkTotal(u.recipe as 'tribalwear'|'shirt'))&&(u.billId===undefined||int(u.billId,1));
}
export function validateUnfinished(world:World,version:number):string[] {
  const errors:string[]=[],ledger=world.tailoring;
  if(ledger!==undefined&&(version<72||!record(ledger)||Object.keys(ledger).some(k=>!['completed','cancelled','lostCloth'].includes(k))||!int(ledger.completed)||!int(ledger.cancelled)||!int(ledger.lostCloth)||ledger.lostCloth>ledger.cancelled*60))errors.push('Invalid textile ledger.');
  const bills=new Set<number>();
  for(const p of world.piles)if(p.unfinished){const u=p.unfinished;
    if(!world.pawns.some(a=>a.id===u.authorId))errors.push('Missing unfinished author.');
    if(u.billId!==undefined){
      if(bills.has(u.billId)||![...world.structures,...world.packed.map(p=>p.building)].some(s=>s.bills?.some(b=>b.id===u.billId&&b.recipe===u.recipe)))errors.push('Invalid unfinished bound bill.');
      bills.add(u.billId);
    }
  }return errors;
}
