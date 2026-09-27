import {ingredientPlaceFree} from './cooking-bills.ts';
import {groundCapacity,planGroundPlacement} from './ground-placement.ts';
import {healthRandom} from './health.ts';
import {addMaterial,refreshStock} from './materials.ts';
import {isCookingOrder} from './order-types.ts';
import {productionWorkTotal} from './production-recipes.ts';
import {releaseAssignments} from './work-release.ts';
import type {Cell,CommandResult,MaterialPile,Pawn,World} from './types.ts';

export interface ComponentWork {
  recipe:'make-component';
  authorId:number;
  progress:number;
  /** One part per incorporated steel source, preserving cancellation rounding. */
  parts:number[];
  billId?:number;
}

const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER):boolean=>Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;

/** A single authored workpiece owns the 12 physical steel once work begins. */
export function beginComponentWork(world:World,pawn:Pawn):MaterialPile|null {
  const task=pawn.cooking;
  if(task?.recipe!=='make-component')return null;
  if(task.ingredients.length===1&&task.ingredients[0]?.item==='unfinished-component'){
    const ingredient=task.ingredients[0]!,existing=world.piles.find(p=>p.id===ingredient.pileId);
    if(ingredient.quantity!==1||ingredient.stage!=='placed'||existing?.item!=='unfinished-component'||existing.owner.type!=='ground'||!existing.componentWork||existing.componentWork.authorId!==pawn.id||existing.componentWork.billId!==undefined&&existing.componentWork.billId!==task.billId)return null;
    existing.componentWork.billId=task.billId;return existing;
  }
  const used=new Map<number,number>();
  for(const ingredient of task.ingredients){
    if(ingredient.item!=='steel'||ingredient.stage!=='placed'||!integer(ingredient.quantity,1,12))return null;
    const pile=world.piles.find(p=>p.id===ingredient.pileId);
    if(pile?.item!=='steel'||pile.owner.type!=='ground'||pile.owner.x!==ingredient.cell.x||pile.owner.z!==ingredient.cell.z)return null;
    used.set(pile.id,(used.get(pile.id)??0)+ingredient.quantity);
  }
  if(!used.size||[...used.values()].reduce((sum,n)=>sum+n,0)!==12||[...used].some(([id,n])=>world.piles.find(p=>p.id===id)!.quantity<n))return null;
  const remaining=world.piles.map(p=>used.has(p.id)?{...p,quantity:p.quantity-used.get(p.id)!}:p).filter(p=>p.quantity>0);
  if(remaining.length>=32768||!Number.isSafeInteger(world.nextId+1))return null;
  const shadow={...world,piles:remaining},spot=task.spot;
  const cells:Cell[]=[{x:spot.x,z:spot.z+1},{x:spot.x+1,z:spot.z},{x:spot.x-1,z:spot.z},{x:spot.x,z:spot.z-1}];
  const cell=cells.find(c=>ingredientPlaceFree(shadow,c,spot,'make-component')&&groundCapacity(shadow,c,'unfinished-component',pawn.id)>=1);
  if(!cell)return null;
  const piece:MaterialPile={id:world.nextId++,item:'unfinished-component',kind:'unfinished',quantity:1,owner:{type:'ground',...cell},componentWork:{recipe:'make-component',authorId:pawn.id,progress:0,parts:[...used.values()],billId:task.billId}};
  world.piles=[...remaining,piece];
  task.ingredients=[{pileId:piece.id,item:'unfinished-component',quantity:1,stage:'placed',cell:{...cell}}];
  refreshStock(world);return piece;
}

/** Plan refunds and identities before touching the workpiece, jobs or RNG. */
export function cancelComponentWork(world:World,itemId:number):CommandResult {
  const piece=world.piles.find(p=>p.id===itemId);
  if(piece?.item!=='unfinished-component'||!piece.componentWork||piece.owner.type!=='ground')return {ok:false,code:'missing-target',reason:'Composant inachevé introuvable au sol.'};
  const random={rng:world.rng};let refund=0;
  for(const part of piece.componentWork.parts){const raw=part*.75,whole=Math.floor(raw);refund+=whole+(raw>whole&&healthRandom(random)<raw-whole?1:0);}
  const shadow={...world,piles:world.piles.filter(p=>p!==piece)},placements=planGroundPlacement(shadow,refund,piece.owner,'steel');
  if(!placements||shadow.piles.length+placements.length>32768||!Number.isSafeInteger(world.nextId+placements.length))return {ok:false,code:'occupied',reason:'Aucune place pour conserver l’acier récupéré.'};
  for(const pawn of world.pawns){
    if(pawn.cooking?.ingredients.some(i=>i.pileId===itemId)||pawn.haul?.sourcePileId===itemId)releaseAssignments(world,pawn);
    pawn.orders.queue=pawn.orders.queue.filter(o=>typeof o==='number'||(isCookingOrder(o)?!o.cooking.ingredients.some(i=>i.pileId===itemId):o.sourcePileId!==itemId));
  }
  world.piles=shadow.piles;
  for(const placement of placements)addMaterial(world,'steel',placement.quantity,{type:'ground',...placement.cell},'steel');
  world.rng=random.rng;return {ok:true};
}

export function detachMissingComponentBills(world:World):void {
  if(!world.piles.some(p=>p.componentWork?.billId))return;
  const bills=new Set([...world.structures,...world.packed.map(p=>p.building)].flatMap(s=>s.bills?.map(b=>b.id)??[]));
  for(const pile of world.piles)if(pile.componentWork?.billId&&!bills.has(pile.componentWork.billId))delete pile.componentWork.billId;
}

export function validComponentWorkShape(p:Record<string,unknown>,version:number):boolean {
  if(p.item!=='unfinished-component')return p.componentWork===undefined;
  const work=p.componentWork,owner=p.owner;
  if(version<123||p.kind!=='unfinished'||p.quantity!==1||!record(owner)||!['ground','pawn'].includes(String(owner.type))||!record(work))return false;
  return work.recipe==='make-component'&&Object.keys(work).every(k=>['recipe','authorId','progress','parts','billId'].includes(k))
    &&integer(work.authorId,1)&&integer(work.progress,0,productionWorkTotal('make-component'))&&(work.billId===undefined||integer(work.billId,1))
    &&Array.isArray(work.parts)&&work.parts.length>=1&&work.parts.length<=12&&work.parts.every(n=>integer(n,1,12))&&work.parts.reduce((sum:number,n:number)=>sum+n,0)===12;
}

export function validateComponentWorks(world:World,version:number):string[] {
  const errors:string[]=[],bound=new Set<number>();
  for(const pile of world.piles){
    if(pile.item!=='unfinished-component'&&pile.componentWork===undefined)continue;
    if(!validComponentWorkShape(pile as unknown as Record<string,unknown>,version)){errors.push('Invalid unfinished component.');continue;}
    const work=pile.componentWork!;
    if(!world.pawns.some(p=>p.id===work.authorId))errors.push('Missing unfinished component author.');
    if(work.billId!==undefined){
      if(bound.has(work.billId)||![...world.structures,...world.packed.map(p=>p.building)].some(s=>s.bills?.some(b=>b.id===work.billId&&b.recipe==='make-component')))errors.push('Invalid unfinished component bound bill.');
      bound.add(work.billId);
    }
  }
  return errors;
}
