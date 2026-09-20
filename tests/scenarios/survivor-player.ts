import { isColonist } from '../../src/sim/affiliation.ts';
import { canDesignate, queryArea } from '../../src/sim/index.ts';
import { requiredMaterial } from '../../src/sim/construction-materials.ts';
import { footprintCells } from '../../src/sim/definitions.ts';
import { availableNutrition, type ItemId } from '../../src/sim/items.ts';
import { blockedCells } from '../../src/sim/pathfinding.ts';
import { harvestable, plantGrowth } from '../../src/sim/plants.ts';
import type { Cell, DesignateCommand, World, WorkType } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

type Rectangle={from:Cell;to:Cell};
const rect=(x:number,z:number,width:number,height:number):Rectangle=>({from:{x,z},to:{x:x+width-1,z:z+height-1}});
const inRect=(c:Cell,r:Rectangle)=>c.x>=r.from.x&&c.x<=r.to.x&&c.z>=r.from.z&&c.z<=r.to.z;
const cells=(r:Rectangle):Cell[]=>Array.from({length:(r.to.x-r.from.x+1)*(r.to.z-r.from.z+1)},(_,i)=>({x:r.from.x+i%(r.to.x-r.from.x+1),z:r.from.z+Math.floor(i/(r.to.x-r.from.x+1))}));
const at=(a:Cell,x:number,z:number):Cell=>({x:a.x+x,z:a.z+z});
function plan(a:Cell) {
  return {anchor:a,room:rect(a.x,a.z,5,5),storage:rect(a.x+7,a.z,6,4),field:rect(a.x+7,a.z+6,5,4),beds:[1,2,3].map(x=>at(a,x,1)),door:at(a,2,4),fire:at(a,5,4),table:at(a,6,1),seats:[at(a,5,1),at(a,5,2)],pin:at(a,5,6)};
}

/** The leftmost bed on the first row is a visible plan anchor after save/load.
 * Construction replaces job IDs with structure IDs, so identity order is not
 * spatial order. Planned, framed and finished beds all participate together.
 * The
 * initial search only reads terrain/plants/stock: no cleared tutorial square,
 * hidden state or world mutation is supplied by this player policy. */
export function survivorPlan(w:World):ReturnType<typeof plan> {
  if(w.scenario?.id!=='survivors'&&w.scenario?.id!=='crashlanded')throw Error('The survivor player requires the real Survivants scenario.');
  const bed=[...w.jobs,...w.structures].filter(s=>s.kind==='bed').sort((a,b)=>a.z-b.z||a.x-b.x)[0];
  if(bed)return plan({x:bed.x-1,z:bed.z-1});
  const start=w.scenario.landing,blocked=blockedCells(w),seen=new Uint8Array(blocked.length),queue=[start.z*w.width+start.x];seen[queue[0]!]=1;
  for(let i=0;i<queue.length;i++) {
    const n=queue[i]!,x=n%w.width,z=Math.floor(n/w.width);
    for(const j of [x>0?n-1:-1,x+1<w.width?n+1:-1,z>0?n-w.width:-1,z+1<w.height?n+w.width:-1])if(j>=0&&!blocked[j]&&!seen[j]){seen[j]=1;queue.push(j);}
  }
  const occupied=new Set(w.resources.map(r=>r.z*w.width+r.x));
  const rocks=new Set(w.resources.filter(r=>r.kind==='rock').map(r=>r.z*w.width+r.x));
  const ground=new Set(w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner.z*w.width+p.owner.x]:[]));
  const candidates=queue.map(i=>({x:i%w.width,z:Math.floor(i/w.width)})).filter(c=>Math.abs(c.x-start.x)<=32&&Math.abs(c.z-start.z)<=32&&c.x>0&&c.z>0&&c.x+13<w.width&&c.z+10<w.height)
    .sort((a,b)=>(a.x+2-start.x)**2+(a.z+2-start.z)**2-((b.x+2-start.x)**2+(b.z+2-start.z)**2)||a.z-b.z||a.x-b.x);
  for(const a of candidates) {
    const p=plan(a),land=cells(rect(a.x,a.z,13,10));
    if(land.some(c=>!seen[c.z*w.width+c.x]||rocks.has(c.z*w.width+c.x)))continue;
    if(cells(p.storage).some(c=>occupied.has(c.z*w.width+c.x)||ground.has(c.z*w.width+c.x)))continue;
    if(cells(p.field).some(c=>!['grass','soil'].includes(w.tiles[c.z*w.width+c.x]!.terrain)))continue;
    if([...p.beds.flatMap(c=>[c,at(c,0,1)]),p.fire,at(p.fire,0,-1),p.table,at(p.table,0,1),...p.seats,p.pin].some(c=>occupied.has(c.z*w.width+c.x)))continue;
    return p;
  }
  throw Error(`No ordinary camp layout found near landing ${JSON.stringify(start)} on seed ${w.seed}`);
}

/** Shared by the fast journey and the browser player. Five initial commands
 * establish plans, a real empty stockyard and a garden without clock/need edits. */
export function survivorDecisions(w:World):Decision[] {
  const p=survivorPlan(w),out:Decision[]=[],colonists=w.pawns.filter(isColonist);
  const designate=(kind:DesignateCommand['kind'],cell:Cell,reason:string)=>{
    const command:DesignateCommand={type:'designate',kind,x:cell.x,z:cell.z,...['bed','wall','door','campfire','table','stool','horseshoes'].includes(kind)?{material:'wood' as const,orientation:0 as const}:{}};
    if(canDesignate(w,command).ok)out.push({reason,command});
  };
  if(!w.stockpiles.length)out.push({reason:'Tracer une réserve assez grande pour les provisions réelles, sur un sol libre.',command:{type:'area',action:'stockpile',...p.storage,filters:{wood:true,food:true,steel:true,component:true,medicine:true,weapon:true,apparel:true},priority:2,capacity:75}});
  for(const c of p.beds)designate('bed',c,'Installer trois couchages près de l’arrivée naturelle.');
  if(!w.growingZones.length)out.push({reason:'Préparer un potager pendant que les rations initiales donnent de la marge.',command:{type:'area',action:'growing',...p.field}});
  // The paused UI can execute the first bounded batch before the longer policy.
  if(!w.jobs.some(j=>j.kind==='bed')&&!w.structures.some(s=>s.kind==='bed'))return out;

  const builder=colonists.reduce((best,pawn)=>pawn.skills.construction.level>best.skills.construction.level?pawn:best,colonists[0]!);
  const cook=colonists.reduce((best,pawn)=>(pawn.skills.cooking?.level??0)>(best.skills.cooking?.level??0)?pawn:best,colonists[0]!);
  for(const pawn of colonists)for(const [work,value] of Object.entries({build:pawn===builder?1:3,cook:pawn===cook?1:3,grow:pawn!==builder&&pawn!==cook?1:3,haul:2,gather:2}) as [WorkType,number][])if(pawn.priorities[work]!==value)out.push({reason:'Répartir construction, cuisine et potager selon les compétences visibles.',command:{type:'priority',pawnId:pawn.id,work,value}});
  if(w.structures.filter(s=>s.kind==='bed').length<3)return out;

  for(const c of cells(p.room))if(c.x===p.room.from.x||c.x===p.room.to.x||c.z===p.room.from.z||c.z===p.room.to.z)designate(c.x===p.door.x&&c.z===p.door.z?'door':'wall',c,'Fermer le petit dortoir en gardant une porte accessible.');
  designate('campfire',p.fire,'Préparer des repas à partir des premières récoltes.');
  designate('horseshoes',p.pin,'Ajouter un loisir construit près du camp.');
  if(w.structures.filter(s=>s.kind==='wall'&&inRect(s,p.room)).length===15&&w.structures.some(s=>s.kind==='door'&&inRect(s,p.room))) {
    const roofs=new Set(w.roofing?.build);
    if(cells(p.room).some(c=>!roofs.has(c.z*w.width+c.x)))out.push({reason:'Couvrir le dortoir une fois ses supports construits.',command:{type:'area',action:'build-roof',...p.room}});
    const home=new Set(w.home);if(cells(p.room).some(c=>!home.has(c.z*w.width+c.x)))out.push({reason:'Entretenir le dortoir et sa porte.',command:{type:'area',action:'home',...p.room}});
    designate('table',p.table,'Aménager un espace de repas après l’abri.');
    for(const c of p.seats)designate('stool',c,'Installer des sièges accessibles devant la table.');
  }
  // Replenishment follows real planned expenses; the 300 initial wood is kept.
  const wood=w.piles.filter(q=>q.item==='wood').reduce((n,q)=>n+q.quantity,0);
  if(wood<80&&!w.jobs.some(j=>j.kind==='chop')) {
    const trees=w.resources.filter(r=>r.kind==='tree'&&Math.hypot(r.x-p.anchor.x,r.z-p.anchor.z)<=25).sort((a,b)=>Math.hypot(a.x-p.anchor.x,a.z-p.anchor.z)-Math.hypot(b.x-p.anchor.x,b.z-p.anchor.z)||a.id-b.id);
    for(const r of trees.slice(0,6))designate('chop',r,'Reconstituer le bois dépensé dans le camp et son combustible.');
  }
  const fire=w.structures.find(s=>s.kind==='campfire'&&s.x===p.fire.x&&s.z===p.fire.z);
  if(fire&&!fire.bills?.length)out.push({reason:'Maintenir trois repas simples, sans gaspiller les ingrédients.',command:{type:'bill-add',structureId:fire.id,recipe:'simple-meal'}});
  const bill=fire?.bills?.[0];
  if(fire&&bill&&(bill.mode!=='until'||bill.target!==3))out.push({reason:'Cuisiner de petites quantités pendant la croissance du potager.',command:{type:'bill-update',structureId:fire.id,billId:bill.id,settings:{mode:'until',target:3,suspended:false,filters:{rice:true,berries:true,'hare-meat':true},radius:35,destination:'stockpile'}}});
  if(fire&&!w.jobs.some(j=>j.kind==='harvest')&&w.piles.filter(q=>q.item==='berries'||q.item==='rice').reduce((n,q)=>n+q.quantity,0)<20) {
    const berries=w.resources.filter(r=>r.kind==='berries'&&harvestable(w,r)&&Math.hypot(r.x-p.anchor.x,r.z-p.anchor.z)<35).sort((a,b)=>Math.hypot(a.x-p.anchor.x,a.z-p.anchor.z)-Math.hypot(b.x-p.anchor.x,b.z-p.anchor.z)||a.id-b.id);
    for(const r of berries.slice(0,2))designate('harvest',r,'Cueillir de quoi cuisiner pendant la croissance du potager.');
  }
  return out;
}

export function survivorSummary(w:World) {
  const p=survivorPlan(w),storage=new Set(w.stockpiles.map(s=>s.z*w.width+s.x)),roof=new Set(w.roofing?.constructed);
  const amount=(item:ItemId,stored=false)=>w.piles.reduce((n,q)=>n+(q.item===item&&(!stored||q.owner.type==='ground'&&storage.has(q.owner.z*w.width+q.owner.x))?q.quantity:0),0);
  const metal=(item:'steel'|'component')=>amount(item)+w.structures.reduce((n,s)=>n+requiredMaterial(s,item),0)+w.packed.reduce((n,s)=>n+requiredMaterial(s.building,item),0)+(w.destroyed?.lost[item]??0)+(item==='steel'?w.deconstructed.lostSteel??0:w.deconstructed.lostComponents??0);
  return {tick:w.tick,scenario:w.scenario,anchor:p.anchor,beds:w.structures.filter(s=>s.kind==='bed').length,shelteredBeds:w.structures.filter(s=>s.kind==='bed'&&footprintCells(s).every(c=>roof.has(c.z*w.width+c.x))).length,walls:w.structures.filter(s=>s.kind==='wall'&&inRect(s,p.room)).length,doors:w.structures.filter(s=>s.kind==='door'&&inRect(s,p.room)).length,roofs:roof.size,
    stockCells:w.stockpiles.length,stored:{wood:amount('wood',true),steel:amount('steel',true),component:amount('component',true),medicine:amount('medicine',true),'survival-meal':amount('survival-meal',true),'simple-meal':amount('simple-meal',true)},materials:{steel:metal('steel'),component:metal('component')},
    food:{survival:amount('survival-meal'),simple:amount('simple-meal'),rice:amount('rice'),berries:amount('berries'),nutrition:availableNutrition(w)},crops:w.resources.filter(r=>r.kind==='rice').map(r=>({id:r.id,growth:plantGrowth(w,r)})),growingCells:w.growingZones.reduce((n,z)=>n+z.cells.length,0),pending:w.jobs.length,pawns:w.pawns.map(q=>({id:q.id,name:q.name,state:q.state,hunger:q.hunger,rest:q.rest,mood:q.mood,bed:q.bedId})),wildlife:w.wildlife?.animals.length??0,arrivals:w.arrivals?.pending??null,raid:w.raids?.active??null};
}

/** A preparation contract for both runners, not a substitute for their play. */
export function survivorInitialAreas(w:World):boolean {
  return survivorDecisions(w).every(d=>{if(d.command.type!=='area')return true;const q=queryArea(w,d.command);return q.ok&&q.skipped===0;});
}
