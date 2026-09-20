import { tradeLoad,tradeLoadInitial,tradeLoadOutcomeErrors,TRADE_PROTOCOL } from './trade-load.ts';
import { environmentLoadInitial } from './environment-load.ts';
import { FLOOR_KINDS,type FloorKind } from '../../src/sim/flooring.ts';
import { addFilth,FILTH_KINDS,roomCleanliness } from '../../src/sim/filth.ts';
import { createMedicalRecord,reconcileMedicalDeath } from '../../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../../src/sim/injury-rules.ts';
import { reconcilePawnHealth } from '../../src/sim/health.ts';
import { exposeFoodPoisoning } from '../../src/sim/food-poisoning.ts';
import { startingPawn } from '../../src/sim/starting-pawns.ts';
import { advanceHumanCorpses } from '../../src/sim/human-corpses.ts';
import { initialGrave } from '../../src/sim/burial.ts';
import { footprintCells } from '../../src/sim/definitions.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import { refreshStock } from '../../src/sim/materials.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import type { Cell,Pawn,World } from '../../src/sim/types.ts';

export const HYGIENE_PROTOCOL=TRADE_PROTOCOL+' V89 HYGIENE extends only the 100-worker load. All 100 original colonists, 100 hares, two visitors, initial workshops, jobs and stocks remain. The four existing 3x3 heated rooms receive 36 prepared floor tiles covering all seven built floor variants, and six single-layer traces per room (dirt, trash, blood, ash, vomit and corpse bile). Four otherwise surplus researchers are prepared inside those rooms with Clean priority 1 and ordinary direct room-cleaning orders; the initial negotiator, first researcher/firefighters and every production role are unchanged. Two further surplus researchers are placed near two prepared empty graves outside the heater rooms and receive ordinary direct burial orders for two additional dead strangers; each corpse is physically materialized by the real death/corpse functions. These two retained dead records are not lost workers. Four other researchers (4% of the original roster) start with an explicit food-poisoning case; one starts a 450-Core-tick vomiting episode. Initial positions, supplied floors/traces, dead identities and clinical state are reported. No body, illness, floor or filth is claimed to arise naturally in preparation. The timed 650 ticks use the ordinary engine only; no observer, injection, accelerated cleaning or clinical timer runs during timing. Outcomes retain every TRADE/ENVIRONMENT oracle and require preserved floors, removal of all initial trace IDs with at least 24 fully cleaned traces recorded, both exact corpse IDs in their graves, and naturally decreased severity in the four original patients. New traces may remain; this does not claim that the whole map becomes clean or that a disease heals within this short interval. Historical profiles without HYGIENE are unchanged.';

export interface HygieneLoadInitial {
  trade:ReturnType<typeof tradeLoadInitial>;environment:ReturnType<typeof environmentLoadInitial>;
  floors:{index:number;floor:FloorKind}[];filthIds:number[];cleaned:number;
  cleaners:{id:number;original:Cell;prepared:Cell}[];
  burials:{actorId:number;original:Cell;prepared:Cell;bodyPawnId:number;corpseId:number;graveId:number;health:string}[];
  patients:{id:number;severity:number;preparedVomit:boolean}[];
  rooms:{cell:Cell;cleanliness:number|null}[];
}
const preparation=new WeakMap<World,HygieneLoadInitial>();
const key=(w:World,c:Cell)=>c.z*w.width+c.x;
function requireIdle(p:Pawn):void {
  if(p.moveCooldown||p.path.length||p.jobId!==null||p.haul||p.need||p.research||p.cooking||p.orders.active!==null||p.orders.queue.length)throw Error('Hygiene preparation would relocate an engaged worker');
}

/** Synthetic load only. Reuse the already isolated ENVIRONMENT thermal plots;
 * do not clear another rectangle or move any production obstacle. */
export function hygieneLoad(count:number):World {
  const w=tradeLoad(count),trade=tradeLoadInitial(w),environment=environmentLoadInitial(w);
  if(environment.thermalPatches.length!==4)throw Error('Hygiene load requires the four 100-worker thermal plots');
  const initial:HygieneLoadInitial={trade,environment,floors:[],filthIds:[],cleaned:w.filth?.cleaned??0,cleaners:[],burials:[],patients:[],rooms:[]},home=new Set(w.home);
  const occupied=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.resources,...w.pawns,...w.wildlife?.animals??[],...w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[])].map(c=>key(w,c)));
  const free=(c:Cell)=>w.tiles[key(w,c)]?.terrain==='grass'&&!occupied.has(key(w,c));
  const relocate=(p:Pawn,c:Cell)=>{requireIdle(p);if(!free(c))throw Error('Hygiene preparation overlaps an existing occupant');const original={x:p.x,z:p.z};occupied.delete(key(w,p));p.x=c.x;p.z=c.z;occupied.add(key(w,c));return original;};
  for(const [n,patch] of environment.thermalPatches.entries()){
    const {x,z}=patch.origin,cells:Cell[]=[];
    for(let dz=9;dz<=11;dz++)for(let dx=15;dx<=17;dx++){
      const cell={x:x+dx,z:z+dz},index=key(w,cell),floor=FLOOR_KINDS[(n*9+cells.length)%FLOOR_KINDS.length]!;
      if(w.tiles[index]!.floor)throw Error('Hygiene preparation would replace a floor');
      w.tiles[index]!.floor=floor;initial.floors.push({index,floor});cells.push(cell);home.add(index);
    }
    const usable=cells.filter(free),cleaner=w.pawns[9+n*6]!,prepared=usable[0]!;
    if(usable.length<7)throw Error('Hygiene room lacks clean physical service cells');
    const original=relocate(cleaner,prepared);cleaner.priorities.clean=1;cleaner.priorities.research=3;
    initial.cleaners.push({id:cleaner.id,original,prepared:{...prepared}});
    for(const [i,kind] of FILTH_KINDS.entries()){
      const c=usable[i+1]!;
      if(!addFilth(w,c,kind))throw Error('Prepared room trace was rejected');
      initial.filthIds.push(w.filth!.items.find(f=>f.kind===kind&&f.x===c.x&&f.z===c.z)!.id);
    }
    initial.rooms.push({cell:{...prepared},cleanliness:roomCleanliness(w,prepared)});
    if(n>=2)continue;
    const grave={id:w.nextId++,kind:'grave' as const,x:x+20,z:z+9,orientation:0 as const,footprint:'standard' as const,grave:initialGrave()};
    for(const c of footprintCells(grave)){if(!free(c))throw Error('Prepared grave overlaps an existing occupant');occupied.add(key(w,c));home.add(key(w,c));}
    w.structures.push(grave);
    const actor=w.pawns[57+n*6]!,actorCell={x:x+20,z:z+13},actorOriginal=relocate(actor,actorCell);actor.priorities.haul=1;actor.priorities.research=3;
    const bodyCell={x:x+21,z:z+12};if(!free(bodyCell))throw Error('Prepared corpse overlaps an existing occupant');
    const body=startingPawn(w.nextId++,'Dépouille témoin '+(n+1),bodyCell.x,bodyCell.z,0,100);body.faction='outlanders';body.foodPolicyId=w.foodPolicies[0]!.id;
    for(const k of Object.keys(body.priorities) as (keyof typeof body.priorities)[])body.priorities[k]=0;
    w.pawns.push(body);occupied.add(key(w,body));body.health=createMedicalRecord(w.tick);body.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(body.health);reconcilePawnHealth(w,body);advanceHumanCorpses(w);
    if(body.body?.pileId===undefined)throw Error('Prepared dead stranger did not produce a physical corpse');
    initial.burials.push({actorId:actor.id,original:actorOriginal,prepared:actorCell,bodyPawnId:body.id,corpseId:body.body.pileId,graveId:grave.id,health:JSON.stringify(body.health)});
  }
  w.home=[...home].sort((a,b)=>a-b);
  for(const c of initial.cleaners){const result=applyCommand(w,{type:'clean-room',pawnId:c.id,...c.prepared});if(!result.ok)throw Error(`Prepared room-cleaning order: ${result.reason}`);}
  for(const b of initial.burials){const result=applyCommand(w,{type:'order-bury',pawnId:b.actorId,bodyPawnId:b.bodyPawnId,graveId:b.graveId});if(!result.ok)throw Error(`Prepared burial order: ${result.reason}`);}
  for(let n=0;n<4;n++){
    const p=w.pawns[33+n*6]!;requireIdle(p);p.health??=createMedicalRecord(w.tick);
    if(p.health.foodPoisoning)throw Error('Hygiene preparation would replace an illness');
    p.health.foodPoisoning=exposeFoodPoisoning(undefined,'filthy-kitchen','simple-meal',w.tick);
    if(n===0)p.health.foodPoisoning.vomit={remainingCore:450,cell:{x:p.x,z:p.z}};
    initial.patients.push({id:p.id,severity:p.health.foodPoisoning.severity,preparedVomit:n===0});
  }
  refreshStock(w);const errors=validateWorld(w);if(errors.length)throw Error(`Invalid hygiene load: ${errors.join('; ')}`);
  preparation.set(w,initial);return w;
}
export function hygieneLoadInitial(w:World):HygieneLoadInitial {const initial=preparation.get(w);if(!initial)throw Error('Hygiene load must be captured from its prepared world');return structuredClone(initial);}
export function hygieneLoadSummary(w:World,initial:HygieneLoadInitial){
  return {initial,cleanedTraces:(w.filth?.cleaned??0)-initial.cleaned,remainingInitialTraceIds:initial.filthIds.filter(id=>w.filth?.items.some(f=>f.id===id)),activeTraces:w.filth?.items.length??0,
    changedFloors:initial.floors.filter(f=>w.tiles[f.index]?.floor!==f.floor),rooms:initial.rooms.map(r=>({...r,initialCleanliness:r.cleanliness,cleanliness:roomCleanliness(w,r.cell)})),
    burials:initial.burials.map(b=>{const body=w.pawns.find(p=>p.id===b.bodyPawnId),pile=w.piles.find(p=>p.id===b.corpseId),grave=w.structures.find(s=>s.id===b.graveId);return {bodyPawnId:b.bodyPawnId,corpseId:b.corpseId,graveId:b.graveId,bodyPresent:body?.state==='dead'&&body.body?.pileId===b.corpseId,healthUnchanged:JSON.stringify(body?.health)===b.health,pileCount:w.piles.filter(p=>p.humanCorpse?.pawnId===b.bodyPawnId).length,buried:grave?.grave?.corpseId===b.corpseId&&pile?.owner.type==='grave'&&pile.owner.graveId===b.graveId};}),
    patients:initial.patients.map(p=>{const now=w.pawns.find(v=>v.id===p.id);return {...p,initialSeverity:p.severity,severity:now?.health?.foodPoisoning?.severity??0,present:!!now,state:now?.state,vomiting:!!now?.health?.foodPoisoning?.vomit};})};
}
export function hygieneLoadOutcomeErrors(w:World,crops:readonly number[],initial:HygieneLoadInitial):string[]{
  const errors=tradeLoadOutcomeErrors(w,crops,initial.trade,initial.environment),s=hygieneLoadSummary(w,initial);
  if(s.changedFloors.length)errors.push('Prepared hygiene floors changed or disappeared');
  if(s.remainingInitialTraceIds.length||s.cleanedTraces<initial.filthIds.length)errors.push('Prepared room traces were not all physically cleaned');
  if(s.burials.some(b=>!b.bodyPresent||!b.healthUnchanged||b.pileCount!==1||!b.buried))errors.push('Prepared corpse identity, medical state or exact grave deposition failed');
  if(s.patients.some(p=>!p.present||p.state==='dead'||p.state==='downed'||p.severity>=p.initialSeverity))errors.push('Prepared food-poisoning cases failed natural clinical progression');
  return errors;
}
