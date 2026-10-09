import { expect,test } from 'vitest';
import { pasteCamp } from './helpers/nutrient-paste-v282.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { controlledInjury,medicalCamp } from './scenarios/health.ts';
import { fixturePower } from './scenarios/power.ts';
import { createPrisonerState } from '../src/sim/prisoner-state.ts';
import { pasteHoppers,pasteSpot,hopperAccepts,hopperFillWanted,planPasteRequest,pasteRequestValid,dispensePasteAtContact,reconcilePasteRequests,PASTE_COLLECT_TICKS,type PasteRequest } from '../src/sim/nutrient-paste.ts';
import { selectFood,selectFoodSource,foodSourceSearchGoals } from '../src/sim/food-selection.ts';
import { processNeeds,type NeedContext } from '../src/sim/needs.ts';
import { processEating,INGEST_TICKS } from '../src/sim/eating.ts';
import { feedingProposal,startFeeding,processFeeding } from '../src/sim/feeding.ts';
import { FEED_TICKS } from '../src/sim/feeding-rules.ts';
import { addMaterial,refreshStock,reservedSource,reservedSourcesByPile } from '../src/sim/materials.ts';
import { blockedCells,reachableCells,routeToCell } from '../src/sim/pathfinding.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { validNutrientPasteTransport } from '../src/sim/nutrient-paste-save.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { resolveUnarmoredMelee } from '../src/sim/melee-impact.ts';
import { applyMeleeStun } from '../src/sim/stun.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { NUTRIENT_PASTE_RESEARCH_COST } from '../src/sim/research.ts';
import type { Pawn,Structure,World } from '../src/sim/types.ts';

function camp(units=12){
  const f=pasteCamp(0),w=f.world,p=w.pawns[0]!,q=w.pawns[1]!,d=w.structures.find(s=>s.id===f.dispenserId)!,h=w.structures.find(s=>s.id===f.hopperId)!;
  if(units)addMaterial(w,'food',units,{type:'ground',x:h.x,z:h.z},'rice');
  return {...f,w,p,q,d,h};
}
const reach=(w:World,p:Pawn)=>reachableCells(w,p,blockedCells(w),new Set());
function context(w:World,p:Pawn):NeedContext{return {search:()=>reach(w,p),move:c=>{p.path=routeToCell(w,c,reach(w,p))??[];},release:()=>releaseWork(w,p),event:message=>w.events.push({tick:w.tick,type:'need',message})};}
const count=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
function contact(p:Pawn,r:PasteRequest){Object.assign(p,r.spot);p.path=[];p.moveCooldown=0;p.motion=null;}
function requestEat(w:World,p:Pawn,d:Structure){
  const paste=planPasteRequest(w,p,d);expect(paste).toBeDefined();if(!paste)throw Error('No paste source');
  p.need={kind:'eat',phase:'pickup',sourcePileId:null,carryPileId:null,quantity:1,progress:0,dining:null,paste};return paste;
}

test('cardinal footprint edges and rotated pickup cells define hopper links, not anchor distance or diagonals',()=>{
  for(const orientation of [0,1,2,3] as const){
    const {w,d}=camp(0);w.structures=w.structures.filter(s=>s.kind!=='hopper');d.orientation=orientation;
    const dirs=[[0,1],[1,0],[0,-1],[-1,0]] as const,a=dirs[orientation]!,b=dirs[(orientation+1)%4]!;
    const edge=fixtureBuilding(w,'hopper',d.x+2*b[0],d.z+2*b[1]);
    fixtureBuilding(w,'hopper',d.x+2*b[0]+3*a[0],d.z+2*b[1]+3*a[1]);
    fixtureBuilding(w,'hopper',d.x,d.z); // Invalid overlap cannot be mistaken for an edge.
    expect(pasteHoppers(w,d).map(s=>s.id)).toEqual([edge.id]);
    expect(pasteSpot(d)).toEqual({x:d.x+3*a[0],z:d.z+3*a[1]});
  }
});

test('fixed raw-food hoppers refill at or below35% with a built adjacent dispenser, independently of power',()=>{
  const {w,d,h}=camp(26);expect(hopperFillWanted(w,h.id)).toBe(true);
  w.piles[0]!.quantity=27;expect(hopperFillWanted(w,h.id)).toBe(false);
  w.piles[0]!.quantity=26;d.power!.on=false;expect(hopperFillWanted(w,h.id)).toBe(true);
  w.structures=w.structures.filter(s=>s!==d);expect(hopperFillWanted(w,h.id)).toBe(false);
  for(const item of ['rice','potato','corn','berries','agave-fruit','milk','hare-meat','snow-hare-meat','deer-meat','gazelle-meat','muffalo-meat','dromedary-meat','red-fox-meat'] as const)expect(hopperAccepts(item)).toBe(true);
  for(const item of ['simple-meal','nutrient-paste-meal','medicine','hay','human-corpse'] as const)expect(hopperAccepts(item)).toBe(false);
});

test('five raw units refuse atomically; six mixed units become one fresh physical meal without cooking XP or RNG',()=>{
  const {w,p,d,h}=camp(5),before=structuredClone(w);expect(planPasteRequest(w,p,d)).toBeUndefined();expect(w).toEqual(before);
  const other=fixtureBuilding(w,'hopper',d.x+2,d.z);addMaterial(w,'food',1,{type:'ground',x:other.x,z:other.z},'milk');
  const r=planPasteRequest(w,p,d)!;expect(r.ingredients!.reduce((n,i)=>n+i.quantity,0)).toBe(6);
  const rng=w.rng,xp=structuredClone(p.skills),hunger=p.hunger;contact(p,r);
  const meal=dispensePasteAtContact(w,p,r)!;
  expect(meal).toMatchObject({kind:'food',item:'nutrient-paste-meal',quantity:1,owner:{type:'pawn',pawnId:p.id}});
  expect(count(w,'rice')+count(w,'milk')).toBe(0);expect(count(w,'nutrient-paste-meal')).toBe(1);
  expect(meal.foodPoison).toBeUndefined();expect(p.skills).toEqual(xp);expect(p.hunger).toBe(hunger);expect(w.rng).toBe(rng);
  expect(r.ingredients).toBeUndefined();expect(r.producedAt).toBe(w.tick);expect(dispensePasteAtContact(w,p,r)).toBeUndefined();
  expect(w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===h.x&&p.owner.z===h.z)).toBe(false);
});

test('six promised units appear in both reservation queries and exclude another source consumer',()=>{
  const {w,p,q,d}=camp(6),r=requestEat(w,p,d),id=r.ingredients![0]!.pileId;
  expect(reservedSource(w,id)).toBe(6);expect(reservedSourcesByPile(w).get(id)).toBe(6);
  expect(planPasteRequest(w,q,d)).toBeUndefined();expect(pasteRequestValid(w,p,r)).toBe(true);
  contact(p,r);processEating(w,p,context(w,p));expect(reservedSource(w,id)).toBe(0);expect(reservedSourcesByPile(w).get(id)??0).toBe(0);
});

test('power, policy, manipulation and exact input identity are revalidated before the first withdrawal',()=>{
  for(const invalidate of [
    (w:World,p:Pawn,d:Structure)=>{d.power!.on=false;},
    (w:World,p:Pawn)=>{p.foodPolicyId=4;},
    (w:World,p:Pawn)=>{controlledInjury(w,p,'left-arm',30000);controlledInjury(w,p,'right-arm',30000);},
    (w:World)=>{w.piles[0]!.owner={type:'ground',x:5,z:5};},
    (w:World)=>{w.piles[0]!.quantity=5;},
  ]){
    const {w,p,d}=camp(6),r=requestEat(w,p,d);contact(p,r);invalidate(w,p,d);
    const piles=structuredClone(w.piles),nextId=w.nextId;
    expect(dispensePasteAtContact(w,p,r)).toBeUndefined();expect(w.piles).toEqual(piles);expect(w.nextId).toBe(nextId);expect(r.producedAt).toBeUndefined();
  }
});

test('adjacency, an unfinished travel edge and exhausted identity budget never dispense remotely',()=>{
  const {w,p,d}=camp(6),r=requestEat(w,p,d),raw=count(w,'rice');Object.assign(p,{x:r.spot.x-1,z:r.spot.z});
  expect(dispensePasteAtContact(w,p,r)).toBeUndefined();contact(p,r);p.moveCooldown=1;expect(dispensePasteAtContact(w,p,r)).toBeUndefined();
  p.moveCooldown=0;w.nextId=Number.MAX_SAFE_INTEGER;expect(dispensePasteAtContact(w,p,r)).toBeUndefined();expect(count(w,'rice')).toBe(raw);expect(count(w,'nutrient-paste-meal')).toBe(0);
});

test('pile-only selection remains intact while hungry humans compare a reachable dispenser with real piles',()=>{
  const {w,p,d}=camp(12),sources=w.piles.filter(p=>p.kind==='food'),r=reach(w,p);
  expect(selectFood(w,p,sources,r)?.id).toBe(sources[0]!.id);expect(selectFoodSource(w,p,sources,r)?.kind).toBe('paste');
  const goals=foodSourceSearchGoals(w,p,sources);expect([...goals]).toEqual([pasteSpot(d).z*w.width+pasteSpot(d).x]);
  addMaterial(w,'food',1,{type:'ground',x:p.x+1,z:p.z},'simple-meal');
  expect(selectFoodSource(w,p,w.piles,reach(w,p))?.kind).toBe('pile');
  d.power!.on=false;expect(selectFoodSource(w,p,sources,reach(w,p))?.kind).toBe('pile');
});

test('unreachable dispenser falls back to raw food and an unavailable search budget never reserves a source',()=>{
  const {w,p,d}=camp(12),spot=pasteSpot(d);for(const [dx,dz] of [[-1,0],[1,0],[0,1]] as const)fixtureBuilding(w,'wall',spot.x+dx,spot.z+dz);
  expect(selectFoodSource(w,p,w.piles,reach(w,p))?.kind).toBe('pile');
  p.hunger=20;const c=context(w,p);c.search=()=>null;processNeeds(w,p,c);expect(p.need).toBeNull();expect(count(w,'nutrient-paste-meal')).toBe(0);
});

test('ordinary hunger acquires a machine promise, dispenses at contact and waits five ticks before ordinary ingestion',()=>{
  const {w,p,d}=camp(12);p.hunger=20;const c=context(w,p);processNeeds(w,p,c);
  expect(p.need).toMatchObject({kind:'eat',phase:'pickup',sourcePileId:null,quantity:1});if(p.need?.kind!=='eat'||!p.need.paste)throw Error('No ordinary paste request');const r=p.need.paste;
  expect(p.path.at(-1)).toEqual(pasteSpot(d));expect(count(w,'nutrient-paste-meal')).toBe(0);contact(p,r);processEating(w,p,c);
  expect(p.need).toMatchObject({kind:'eat',phase:'collect',progress:0});expect(count(w,'rice')).toBe(6);expect(p.hunger).toBe(20);
  for(let i=1;i<PASTE_COLLECT_TICKS;i++){w.tick++;processEating(w,p,c);expect(p.need?.kind==='eat'&&p.need.phase).toBe('collect');expect(p.hunger).toBe(20);}
  w.tick++;processEating(w,p,c);expect(p.need?.kind==='eat'&&p.need.phase).toBe('ingest');
  for(let i=0;i<INGEST_TICKS;i++){w.tick++;processEating(w,p,c);}
  expect(p.need).toBeNull();expect(p.hunger).toBe(100);expect(count(w,'nutrient-paste-meal')).toBe(0);expect(p.memories.some(m=>m.kind==='ate-nutrient-paste')).toBe(true);
});

test('destruction before dispense releases the promise; destruction after dispense keeps actual cargo and never refunds raw stock',()=>{
  const before=camp(12);requestEat(before.w,before.p,before.d);before.w.structures=before.w.structures.filter(s=>s!==before.d);
  reconcilePasteRequests(before.w);expect(before.p.need).toBeNull();expect(count(before.w,'rice')).toBe(12);
  const {w,p,d}=camp(12),r=requestEat(w,p,d);contact(p,r);processEating(w,p,context(w,p));const meal=w.piles.find(p=>p.item==='nutrient-paste-meal')!;
  w.structures=w.structures.filter(s=>s!==d&&s.kind!=='hopper');reconcilePasteRequests(w);expect(p.need?.kind==='eat'&&p.need.phase).toBe('collect');
  expect(releaseWork(w,p)).toBe(true);expect(p.need).toBeNull();expect(w.piles.find(p=>p.id===meal.id)!.owner.type).toBe('ground');
  expect(count(w,'rice')).toBe(6);expect(count(w,'nutrient-paste-meal')).toBe(1);
});

test('raw ingredients disappearing after their actor ran are reconciled without minting or releasing other reserved food',()=>{
  const {w,p,d}=camp(6);requestEat(w,p,d);w.piles=[];refreshStock(w);reconcilePasteRequests(w);
  expect(p.need).toBeNull();expect(count(w,'nutrient-paste-meal')).toBe(0);
});

test('a prison dispenser is reserved for its room: free colonists decline it, captive residents and their supplier may use it',()=>{
  const {w,p,q,d}=camp(12);
  for(let z=10;z<=18;z++)for(let x=11;x<=18;x++)if(z===10||z===18||x===11||x===18)fixtureBuilding(w,'wall',x,z);
  const bed:Structure=fixtureBuilding(w,'bed',16,16);Object.assign(bed,{prisoner:true});Object.assign(q,{x:14,z:17});q.prisoner=createPrisonerState(w,q);q.foodPolicyId=4;
  expect(planPasteRequest(w,p,d)).toBeUndefined();expect(planPasteRequest(w,q,d)).toBeDefined();
  q.foodPolicyId=1;expect(planPasteRequest(w,p,d,q)).toBeDefined();
});

test('a doctor carries a dispensed meal to the actual bedside and feeds it for75ticks without Medicine XP',()=>{
  const {w,p,q,d}=camp(12);p.priorities.doctor=1;q.hunger=20;controlledInjury(w,q,'left-leg',30000);controlledInjury(w,q,'right-leg',30000);
  const bed:Structure=fixtureBuilding(w,'bed',q.x,q.z);Object.assign(bed,{medical:true});q.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:q.x,z:q.z}};
  const proposal=feedingProposal(w,p,q,reach(w,p));expect(proposal?.task.paste).toBeDefined();if(!proposal)throw Error('No patient meal');startFeeding(p,proposal);
  contact(p,proposal.task.paste!);const xp=p.skills.medicine.xp,c=context(w,p);processFeeding(w,p,c);expect(p.feed?.phase).toBe('collect');expect(q.hunger).toBe(20);
  w.tick+=PASTE_COLLECT_TICKS;processFeeding(w,p,c);expect(p.feed?.phase).toBe('deliver');expect(count(w,'nutrient-paste-meal')).toBe(1);
  Object.assign(p,proposal.task.spot);p.path=[];for(let i=0;i<FEED_TICKS;i++)processFeeding(w,p,c);
  expect(p.feed).toBeUndefined();expect(q.hunger).toBe(100);expect(p.skills.medicine.xp).toBe(xp);expect(count(w,'rice')).toBe(6);expect(count(w,'nutrient-paste-meal')).toBe(0);
});

test('pickup and collect retain exact promises and physical ownership on saved worlds',()=>{
  const {w,p,d}=camp(12),r=requestEat(w,p,d);p.path=routeToCell(w,r.spot,reach(w,p))!;p.state='moving';
  const before=deserializeWorld(serializeWorld(w));expect(before).toEqual(w);
  contact(p,r);processEating(w,p,context(w,p));const after=deserializeWorld(serializeWorld(w));expect(after).toEqual(w);
  const ap=after.pawns.find(a=>a.id===p.id)!;w.tick+=5;after.tick+=5;processEating(w,p,context(w,p));processEating(after,ap,context(after,ap));expect(after).toEqual(w);
});

test('a survivable Blunt impact can pause collect beyond five ticks, save the real meal and resume without another withdrawal',()=>{
  const {w,p,d}=camp(12);delete w.wildlife;p.hunger=20;
  const r=requestEat(w,p,d);contact(p,r);processEating(w,p,context(w,p));const mealId=p.need?.kind==='eat'?p.need.carryPileId:null;
  stepWorld(w,3);expect(p.need?.kind==='eat'&&p.need.phase).toBe('collect');
  // A controlled anatomical strike uses the real damage resolver and stun
  // producer; no StunState or held-meal owner is fabricated for the checkpoint.
  const impact=resolveUnarmoredMelee(p.health??createMedicalRecord(w.tick),{damage:2,kind:'blunt',part:'head'},()=>.01);
  expect(impact.stun).toBe(true);expect(impact.layers.length).toBeGreaterThan(0);p.health=impact.record;reconcilePawnHealth(w,p,undefined,true);
  applyMeleeStun(w,p,w.tick*10);expect(p.state).not.toBe('downed');stepWorld(w,3);
  expect(w.tick-r.producedAt!).toBe(6);expect(p.need?.kind==='eat'&&p.need.phase).toBe('collect');expect(p.stun!.untilCore).toBeGreaterThan(w.tick*10);
  expect(w.piles.find(i=>i.id===mealId)).toMatchObject({item:'nutrient-paste-meal',quantity:1,owner:{type:'pawn',pawnId:p.id}});
  expect(validateWorld(w)).toEqual([]);const restored=deserializeWorld(serializeWorld(w));expect(restored).toEqual(w);
  const received=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,6)));
  expect(received.status).toBe('applied');if(received.status==='applied')expect(received.world).toEqual(w);
  stepWorld(w,2);stepWorld(restored,2);expect(restored).toEqual(w);expect(p.need?.kind==='eat'&&p.need.phase).toBe('ingest');
  expect(count(w,'rice')).toBe(6);expect(count(w,'nutrient-paste-meal')).toBe(1);expect(p.need?.kind==='eat'&&p.need.carryPileId).toBe(mealId);
});

test('two paste suppliers reserve distinct machines and bedsides, and files/Decoder refuse a forged shared bedside for distinct patients',()=>{
  const w=medicalCamp(4),[a,b,p,q]=w.pawns;w.structures=[];w.piles=[];w.jobs=[];w.packed=[];w.stockpiles=[];w.resources=[];delete w.wildlife;
  for(const pawn of w.pawns){delete pawn.background;delete pawn.traits;}
  w.research={points:0,project:null,nutrientPaste:{points:NUTRIENT_PASTE_RESEARCH_COST,completedAt:2900}};
  Object.assign(a!,{x:14,z:20});Object.assign(b!,{x:20,z:20});Object.assign(p!,{x:15,z:21,hunger:20});Object.assign(q!,{x:17,z:21,hunger:20});
  const dispensers:Structure[]=[];
  for(const x of [14,20]){
    const g=fixturePower(w,'wood-generator',x-3,11),d:Structure={id:w.nextId++,kind:'nutrient-paste-dispenser',x,z:13,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:g.id}};
    const h:Structure={id:w.nextId++,kind:'hopper',x:x-2,z:13,orientation:0,footprint:'standard',material:'steel'};w.structures.push(d,h);dispensers.push(d);
    addMaterial(w,'food',6,{type:'ground',x:h.x,z:h.z},'rice');
  }
  for(const patient of [p!,q!]){controlledInjury(w,patient,'left-leg',30000);controlledInjury(w,patient,'right-leg',30000);const bed:Structure=fixtureBuilding(w,'bed',patient.x,patient.z);bed.medical=true;patient.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:patient.x,z:patient.z}};}
  a!.priorities.doctor=1;b!.priorities.doctor=1;const shared={x:16,z:21};
  const first=feedingProposal(w,a!,p!,reach(w,a!));expect(first?.task.paste?.dispenserId).toBe(dispensers[0]!.id);if(!first)throw Error('No first supplier');first.task.spot=shared;startFeeding(a!,first);
  const second=feedingProposal(w,b!,q!,reach(w,b!));expect(second?.task.paste?.dispenserId).toBe(dispensers[1]!.id);if(!second)throw Error('No second supplier');expect(second.task.spot).not.toEqual(shared);startFeeding(b!,second);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const lawful=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));expect(lawful.status).toBe('applied');
  b!.feed!.spot={...shared};expect(validNutrientPasteTransport(w,217)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
  const forged=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));expect(forged.status).toBe('resync');
});
