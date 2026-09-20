import { isColonist } from '../../src/sim/affiliation.ts';
import { canDesignate } from '../../src/sim/engine.ts';
import { footprintCells } from '../../src/sim/definitions.ts';
import { cookingSpot } from '../../src/sim/cooking-bills.ts';
import { burialProposal } from '../../src/sim/burial.ts';
import { pawnBodyLocation } from '../../src/sim/human-corpses.ts';
import { candidateAccess } from '../../src/sim/candidate-access.ts';
import { blockedCells,workNeighbours } from '../../src/sim/pathfinding.ts';
import { canStandAt } from '../../src/sim/furniture-travel.ts';
import { captureCleanliness } from '../../src/sim/filth-room.ts';
import { medicalWorkRefusal } from '../../src/sim/health-rules.ts';
import { queryOrderOptions } from '../../src/sim/player-orders.ts';
import { environmentDecisions,type EnvironmentPlayerState } from './environment-player.ts';
import { prisonWoodDecisions } from './prison-player.ts';
import type { Decision } from './colony-player.ts';
import type { Cell,DesignateCommand,World,WorldEvent } from '../../src/sim/types.ts';

/** Player intentions only: never invent a casualty, filth, disease, ingredient,
 * weather or furniture. The published V88 colony already contains its dead. */
export interface HygienePlayerState {
  startTick:number;initialPeople:number[];initialBodies:number[];targetBodies:number[];
  environment:EnvironmentPlayerState;stationId:number;from:Cell;to:Cell;door:Cell;spot:Cell;
  graves:Cell[];floors:Cell[];milestones:Record<string,number>;
  initialCleaned:number;cleaned:number;mealsAfterKitchen:number;poisoningEpisodes:number;
  minimumLiving:number;lastObservedTick:number;buried:number[];kitchenCleanliness:number|null;
}
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
const distance=(a:Cell,b:Cell)=>(a.x-b.x)**2+(a.z-b.z)**2;
const living=(w:World)=>w.pawns.filter(p=>isColonist(p)&&p.state!=='dead');
const inside=(c:Cell,from:Cell,to:Cell)=>c.x>=from.x&&c.x<=to.x&&c.z>=from.z&&c.z<=to.z;
const buried=(w:World,id:number)=>w.piles.some(i=>i.humanCorpse?.pawnId===id&&i.owner.type==='grave');

/** A new room must not wall over the exterior service cell of an existing
 * doorway. The reached V88 freezer has its only door beside the new kitchen.
 * Derive the shared passage from visible buildings/plans, not casualty IDs. */
export function hygieneKitchenDoors(w:World,s:Pick<HygienePlayerState,'from'|'to'|'door'>):Cell[] {
  const doors=[{...s.door}];
  const neighbors=[...w.structures,...w.jobs].filter(q=>q.kind==='door'&&!inside(q,s.from,s.to));
  for(let z=s.from.z;z<=s.to.z;z++)for(let x=s.from.x;x<=s.to.x;x++){
    const c={x,z};if(!(x===s.from.x||x===s.to.x||z===s.from.z||z===s.to.z)||doors.some(d=>same(d,c)))continue;
    if(neighbors.some(d=>Math.abs(d.x-x)+Math.abs(d.z-z)===1))doors.push(c);
  }
  return doors;
}

/** Repair an already accepted bad room plan through ordinary cancellation or
 * deconstruction. No walls, refunds, patient positions or health are edited.
 * This runs before further construction; normal medical orders take over as
 * soon as the passage is physically open. */
function restoreKitchenAccess(w:World,doors:readonly Cell[]):Decision[] {
  for(const cell of doors){
    const wallPlan=w.jobs.find(j=>j.kind==='wall'&&same(j,cell));
    if(wallPlan)return [{reason:'Annuler le mur prévu devant une porte existante pour conserver son unique passage.',command:{type:'cancel',...cell}}];
    const wall=w.structures.find(q=>q.kind==='wall'&&same(q,cell));if(!wall)continue;
    const removal=w.jobs.find(j=>j.kind==='deconstruct'&&j.deconstruction?.structureId===wall.id);
    if(!removal){
      const command:DesignateCommand={type:'designate',kind:'deconstruct',targetId:wall.id,...cell};
      if(canDesignate(w,command).ok)return [{reason:'Déconstruire le mur qui ferme le passage du réfrigérateur avant de reprendre la cuisine.',command}];
      return [];
    }
    if(removal.reservedBy!==null)return [];
    const builders=living(w).filter(p=>!medicalWorkRefusal(p)&&!p.draft&&!p.mental?.crisis&&!p.interruptedCargo&&!p.collapsePending&&!p.tend&&!p.feed&&!p.rescue&&!p.ward&&p.need?.kind!=='eat'&&p.hunger>5&&p.rest>5&&p.priorities.build>0)
      .sort((a,b)=>b.skills.construction.level-a.skills.construction.level||a.id-b.id);
    for(const actor of builders)if(queryOrderOptions(w,actor.id,removal).some(o=>o.enabled&&o.jobId===removal.id))return [{reason:'Ouvrir physiquement le passage obstrué en priorité ; les secours pourront alors atteindre le compagnon.',command:{type:'order-job',pawnId:actor.id,jobId:removal.id,queue:false}}];
    // The cooker occupies the opposite service cell of the blocked doorway.
    // If no builder can reach that wall's work contact, open one adjacent wall
    // from a genuinely reachable exterior contact first. Never tunnel via a
    // hypothetical navigation graph or remove either wall by state mutation.
    const neighbors=w.structures.filter(q=>q.kind==='wall'&&Math.abs(q.x-wall.x)+Math.abs(q.z-wall.z)===1);
    for(const actor of builders){const reach=candidateAccess(w,actor,blockedCells(w),new Set());
      for(const neighbor of neighbors){
        const opening=w.jobs.find(j=>j.kind==='deconstruct'&&j.deconstruction?.structureId===neighbor.id);
        if(opening){
          if(opening.reservedBy!==null)return [];
          if(queryOrderOptions(w,actor.id,opening).some(o=>o.enabled&&o.jobId===opening.id))return [{reason:'Dégager un contact de chantier réel à côté du mur inaccessible pour ouvrir le passage.',command:{type:'order-job',pawnId:actor.id,jobId:opening.id,queue:false}}];
        }else if(workNeighbours(neighbor).some(c=>canStandAt(w,c)&&reach.has(c.z*w.width+c.x))){
          const command:DesignateCommand={type:'designate',kind:'deconstruct',targetId:neighbor.id,x:neighbor.x,z:neighbor.z};
          if(canDesignate(w,command).ok)return [{reason:'Ouvrir une paroi voisine accessible : la cuisinière empêche le contact direct avec le mur fautif.',command}];
        }
      }
    }
    return [];
  }
  return [];
}

export function newHygienePlayer(w:World,environment:EnvironmentPlayerState):HygienePlayerState {
  const people=living(w),station=w.structures.find(s=>s.kind==='electric-stove'&&s.bills?.some(b=>b.recipe==='simple-meal'&&!b.suspended));
  if(people.length!==4||!station||station.orientation!==0)throw Error('The hygiene journey requires the published four-person V88 colony and its working north-facing electric stove.');
  const spot=cookingSpot(station),from={x:station.x-2,z:station.z-3},to={x:station.x+2,z:station.z+1},door={x:station.x,z:to.z};
  const bodies=w.pawns.filter(p=>p.state==='dead'&&p.health?.death&&p.body?.lostAt===undefined);
  if(bodies.length<3)throw Error('This continuation needs actual pre-existing casualties, never injected bodies.');
  const targetBodies=[...bodies].sort((a,b)=>distance(pawnBodyLocation(w,a)??a,spot)-distance(pawnBodyLocation(w,b)??b,spot)||a.id-b.id).slice(0,3).map(p=>p.id);
  const occupied=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.stockpiles,...w.resources,...w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[])].map(c=>c.z*w.width+c.x));
  for(const z of w.growingZones)for(const cell of z.cells)occupied.add(cell);
  const candidates:Cell[]=[];
  for(let z=Math.max(2,from.z-15);z<Math.min(w.height-3,to.z+16);z++)for(let x=Math.max(2,from.x-15);x<Math.min(w.width-2,to.x+16);x++)candidates.push({x,z});
  candidates.sort((a,b)=>distance(a,spot)-distance(b,spot)||a.z-b.z||a.x-b.x);
  const graves:Cell[]=[];
  for(const c of candidates){
    const cells=footprintCells({...c,kind:'grave',orientation:0});
    if(distance(c,spot)<36||cells.some(q=>inside(q,from,to)||occupied.has(q.z*w.width+q.x))||!canDesignate(w,{type:'designate',kind:'grave',...c,orientation:0}).ok)continue;
    graves.push(c);for(const q of cells)occupied.add(q.z*w.width+q.x);if(graves.length===3)break;
  }
  if(graves.length!==3)throw Error('No three ordinary diggable grave sites beside the reached colony; inspect terrain rather than modify it.');
  const floors:Cell[]=[];for(let z=from.z+1;z<to.z;z++)for(let x=from.x+1;x<to.x;x++)floors.push({x,z});
  return {startTick:w.tick,initialPeople:people.map(p=>p.id),initialBodies:bodies.map(p=>p.id),targetBodies,environment:structuredClone(environment),stationId:station.id,from,to,door,spot,graves,floors,milestones:{},initialCleaned:w.filth?.cleaned??0,cleaned:0,mealsAfterKitchen:0,poisoningEpisodes:0,minimumLiving:people.length,lastObservedTick:w.tick,buried:[],kitchenCleanliness:null};
}

export function hygieneDecisions(w:World,s:HygienePlayerState):Decision[] {
  const base=environmentDecisions(w,s.environment);
  if(w.raids?.active||living(w).some(p=>p.draft)||base.some(d=>['order-rescue','order-tend','order-feed'].includes(d.command.type)))return base;
  const doors=hygieneKitchenDoors(w,s),access=restoreKitchenAccess(w,doors);
  if(access.length)return access;
  if(doors.some(c=>w.structures.some(q=>q.kind==='wall'&&same(q,c))))return [];
  const out=[...base],people=living(w);
  // Keep food, agriculture and emergency care. The recruit receives sanitation
  // ahead of ordinary hauling; a direct burial remains a deliberate short order.
  const cleaner=people.find(p=>p.id===s.environment.prison.recruitId)??people.at(-1)!;
  for(const p of people){const value=p===cleaner?1:3;if(p.priorities.clean!==value)out.push({reason:'Activer Nettoyage dans le tableau Travail, avec un responsable distinct du cuisinier principal.',command:{type:'priority',pawnId:p.id,work:'clean',value}});}
  const designate=(command:DesignateCommand,reason:string)=>{if(canDesignate(w,command).ok)out.push({reason,command});};
  for(const c of s.graves)designate({type:'designate',kind:'grave',...c,orientation:0},'Creuser une sépulture réelle pour les morts déjà présents autour des lieux de vie.');
  // Re-direct an ordinary automatic burial if needed: a player's selected
  // nearby casualty has priority over filling the small cemetery from elsewhere.
  const missing=s.targetBodies.filter(id=>!buried(w,id)&&!w.pawns.some(p=>p.burial?.bodyPawnId===id));
  const porters=people.filter(p=>p.hunger>40&&p.rest>35&&!p.need&&!p.tend&&!p.rescue&&!p.feed&&!p.ward&&!p.firefighting&&!p.cleaning&&(p.orders.active===null||p.orders.active==='bury'));
  for(const id of missing){const body=w.pawns.find(p=>p.id===id)!;let ordered=false;
    for(const actor of porters){const reach=candidateAccess(w,actor,blockedCells(w),new Set());
      for(const c of s.graves){const g=w.structures.find(g=>g.kind==='grave'&&same(g,c));if(!g)continue;
        if(burialProposal(w,actor,body,reach,g.id)){out.push({reason:'Transporter la dépouille réellement présente près de la cuisine vers sa sépulture, sans déplacer ses possessions séparément.',command:{type:'order-bury',pawnId:actor.id,bodyPawnId:body.id,graveId:g.id}});ordered=true;break;}}
      if(ordered)break;
    }if(ordered)break;
  }
  for(let z=s.from.z;z<=s.to.z;z++)for(let x=s.from.x;x<=s.to.x;x++)if(x===s.from.x||x===s.to.x||z===s.from.z||z===s.to.z){
    const c={x,z};designate({type:'designate',kind:doors.some(d=>same(d,c))?'door':'wall',...c,material:'wood',orientation:0},'Enfermer le poste électrique existant dans une vraie petite cuisine en préservant les accès des pièces voisines.');
  }
  for(const c of s.floors)designate({type:'designate',kind:'lay-floor',...c,floor:'wood-planks'},'Poser un plancher avec du bois livré physiquement, sans modifier la terre sous-jacente.');
  const home=new Set(w.home),roof=new Set(w.roofing?.constructed),requested=new Set(w.roofing?.build);
  if(s.floors.some(c=>!home.has(c.z*w.width+c.x)))out.push({reason:'Inclure la cuisine et son sol dans le foyer nettoyé et protégé.',command:{type:'area',action:'home',from:s.from,to:s.to}});
  const perimeterReady=Array.from({length:25},(_,i)=>({x:s.from.x+i%5,z:s.from.z+Math.floor(i/5)})).filter(c=>c.x===s.from.x||c.x===s.to.x||c.z===s.from.z||c.z===s.to.z).every(c=>w.structures.some(b=>(doors.some(d=>same(d,c))?b.kind==='door':b.kind==='wall')&&same(b,c)));
  if(perimeterReady&&s.floors.some(c=>!roof.has(c.z*w.width+c.x)&&!requested.has(c.z*w.width+c.x)))out.push({reason:'Couvrir la cuisine après achèvement de ses vrais supports.',command:{type:'area',action:'build-roof',from:{x:s.from.x+1,z:s.from.z+1},to:{x:s.to.x-1,z:s.to.z-1}}});
  out.push(...prisonWoodDecisions(w,s.environment.prison.campAnchor,out));
  const result:Decision[]=[],keys=new Set<string>();
  for(const d of out){const c=d.command,key=c.type==='designate'?`${c.type}:${c.kind}:${c.x}:${c.z}`:c.type==='priority'?`${c.type}:${c.pawnId}:${c.work}`:undefined;if(key&&keys.has(key))continue;if(key)keys.add(key);result.push(d);}
  return result;
}

/** Call after every step; events belong to that actual step, not a manufactured
 * completion count. The bounded room read is only needed at observation points. */
export function observeHygiene(w:World,s:HygienePlayerState,events:readonly WorldEvent[]=w.events,kitchenCooks:readonly string[]=[]):void {
  s.minimumLiving=Math.min(s.minimumLiving,living(w).length);
  for(const event of events)if(event.tick>s.lastObservedTick){
    if(event.message.includes('a cuisiné 1 repas simple')&&s.milestones.kitchen!==undefined&&kitchenCooks.some(name=>event.message.startsWith(`${name} a cuisiné `)))s.mealsAfterKitchen++;
    if(event.message.includes('souffre d’une intoxication alimentaire'))s.poisoningEpisodes++;
  }
  s.lastObservedTick=w.tick;s.cleaned=(w.filth?.cleaned??0)-s.initialCleaned;
  s.buried=s.initialBodies.filter(id=>buried(w,id));
  if(s.targetBodies.every(id=>buried(w,id)))s.milestones.buried??=w.tick;
  if(s.floors.every(c=>w.tiles[c.z*w.width+c.x]!.floor==='wood-planks'))s.milestones.floored??=w.tick;
  if(s.cleaned>=3)s.milestones.cleaned??=w.tick;
  if(w.tick%100===0||s.milestones.kitchen===undefined&&s.milestones.floored!==undefined){
    const room=captureCleanliness(w).room(s.spot);s.kitchenCleanliness=room?.cleanliness??null;
    if(room&&room.covered===room.cells.size&&s.milestones.floored!==undefined)s.milestones.kitchen??=w.tick;
  }
  if(s.mealsAfterKitchen>=3)s.milestones.meals??=w.tick;
}
export function hygieneJourneyComplete(s:HygienePlayerState):boolean {return ['buried','floored','kitchen','cleaned','meals'].every(k=>s.milestones[k]!==undefined)&&s.minimumLiving===s.initialPeople.length;}
export function hygienePlayerSummary(w:World,s:HygienePlayerState){return {tick:w.tick,elapsedDays:(w.tick-s.startTick)/6000,milestones:{...s.milestones},targetBodies:s.targetBodies,buried:s.buried,cleaned:s.cleaned,mealsAfterKitchen:s.mealsAfterKitchen,poisoningEpisodes:s.poisoningEpisodes,kitchenCleanliness:s.kitchenCleanliness,minimumLiving:s.minimumLiving,
  bodies:w.pawns.filter(p=>s.targetBodies.includes(p.id)).map(p=>({id:p.id,name:p.name,body:p.body,location:pawnBodyLocation(w,p)})),
  graves:w.structures.filter(g=>g.kind==='grave'&&s.graves.some(c=>same(c,g))).map(g=>({id:g.id,x:g.x,z:g.z,grave:g.grave})),people:living(w).map(p=>({id:p.id,hunger:p.hunger,rest:p.rest,state:p.state,burial:p.burial,cleaning:p.cleaning,foodPoisoning:p.health?.foodPoisoning})),jobs:w.jobs.filter(j=>j.kind==='grave'||j.kind==='lay-floor'||inside(j,s.from,s.to)).map(j=>({id:j.id,kind:j.kind,x:j.x,z:j.z,progress:j.progress,reservedBy:j.reservedBy}))};}
