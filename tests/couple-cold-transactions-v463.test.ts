import {beforeAll,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {registeredMap,flushRegisteredMap,registeredMapId} from '../src/sim/world-map-context.ts';
import {prepareGroupReform260,type GroupReformDraft260} from '../src/sim/group-reform-260.ts';
import {abandonRegisteredMap} from '../src/sim/world-map-authority.ts';
import {prepareMapRemoved259} from '../src/sim/world-pawn-map-removed-259.ts';
import {detachMapOwners} from '../src/sim/world-lost-owners.ts';
import {prepareCoupleRelease285} from '../src/sim/couple-release-285.ts';
import {coupleClockDraft285,coupleNormal285} from '../src/sim/couple-random-285.ts';
import {coupleBiologicalYears285,coupleCooldownCore285} from '../src/sim/couple-rules-285.ts';
import {bedSlotCell} from '../src/sim/bed-slots.ts';
import {claimLocalActorBed256} from '../src/sim/actor-bed-local-256.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {captureStandability} from '../src/sim/furniture-travel.ts';
import {terrainSupportsAffordance256} from '../src/sim/natural-terrain-runtime-256.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {clearQueuedOrders} from '../src/sim/player-orders.ts';
import {isAncientCasket256} from '../src/sim/ancient-casket-state-256.ts';
import type {Pawn,Structure,World} from '../src/sim/types.ts';

const source='tmp/test-runs/reform-v415-complete11-2026-10-17T22-21-45.321Z-20704/artifacts/reform-v415/07-existing-camp736-before-real-work-order-RAW-BEFORE-ADMISSION.json';
const sourceSHA='70dea3811dab70e7225cced4c715c8438b1d7aecec6aa173ac72eaa52115e699';
let baseline:string;

/** Reuse the real acquired Camp736 and its original humans7/8, stock and
 * global owners. The double bed/entered reciprocal stages are DECLARED cold
 * transaction preparation, not played construction or a natural opportunity.
 * No globe, person, journey, RNG seed, faction or current clock is replaced. */
beforeAll(()=>{
 const raw=readFileSync(source,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(sourceSHA);
 const root=deserializeCampaign(raw);if(!('pawns'in root))throw Error('Acquired loaded settlement required');
 const map=registeredMap(root,1)!;expect(root.tick).toBe(736);expect(root.schemaVersion).toBe(285);
 expect(root.worldMaps!.sites.find(s=>s.id===1)?.kind).toBe('camp');
 const a=map.pawns.find(p=>p.id===7)!,b=map.pawns.find(p=>p.id===8)!;expect([a.name,b.name]).toEqual(['Milo','Émile']);
 const occupied=new Set([...map.structures.flatMap(footprintCells),...map.resources,...map.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[])].map(c=>c.z*map.width+c.x));
 const stands=captureStandability(map);let bed:Structure|undefined;
 for(let z=2;z<map.height-3&&!bed;z++)for(let x=2;x<map.width-3&&!bed;x++){
  const candidate:Structure={id:map.nextId,kind:'double-bed',x,z,orientation:0,footprint:'standard',material:'wood',quality:'normal'};
  const cells=footprintCells(candidate);
  if(cells.every(c=>!occupied.has(c.z*map.width+c.x)&&stands(c)&&terrainSupportsAffordance256(map.tiles[c.z*map.width+c.x]!,'Medium',map)))bed=candidate;
 }
 if(!bed)throw Error('Actual Camp needs one free supported double-bed footprint');map.nextId++;map.structures.push(bed);
 map.relationships={links:[...(map.relationships?.links??[]).filter(l=>!(l.aId===Math.min(a.id,b.id)&&l.bId===Math.max(a.id,b.id))),{kind:'lover',aId:Math.min(a.id,b.id),bId:Math.max(a.id,b.id),recordedAt:map.tick}]};
 for(const [p,q,slot]of [[a,b,0],[b,a,1]]as const){
  expect(coupleBiologicalYears285(p)).toBeGreaterThanOrEqual(18);
  if(!releaseWork(map,p))throw Error('Actual original work/cargo release refused');clearQueuedOrders(map,p);
  claimLocalActorBed256(map,p,bed,slot);Object.assign(p,bedSlotCell(bed,slot),{state:'idle',need:null,path:[],moveCooldown:0,planCooldown:0,needCooldown:0});delete p.motion;
  p.coupleClock285=coupleClockDraft285(map.seed,p.id);
  p.coupleTask285={revision:1,otherId:q.id,initiatorId:a.id,bedId:bed.id,slot,enteredAtCore:map.tick*10,endsAtCore:map.tick*10+1000,roomRest:{nextAt:map.tick+500,applied:false}};
 }
 flushRegisteredMap(map);expect(validateWorld(root)).toEqual([]);baseline=serializeCampaign(root);
},120_000);

/** Reload the same admitted checkpoint through its real geography boundary.
 * A structuredClone alone cannot carry the private ownership witnesses. */
function fixture(){const loaded=deserializeCampaign(baseline);if(!('pawns'in loaded))throw Error('Loaded acquired settlement required');const root=loaded,map=registeredMap(root,1)!,a=map.pawns.find(p=>p.id===7)!,b=map.pawns.find(p=>p.id===8)!,bed=map.structures.find(s=>s.id===a.coupleTask285!.bedId)!;return {root,map,a,b,bed};}
type Fixture=ReturnType<typeof fixture>;
function draft(f:Fixture,people:Pawn[]):GroupReformDraft260 {
 const ids=new Set(people.map(p=>p.id));return {originMapId:1,memberIds:people.map(p=>p.id),sources:f.map.piles.filter(p=>p.owner.type==='inventory'&&ids.has(p.owner.pawnId)).map(p=>({pileId:p.id,quantity:p.quantity})),destination:f.root.worldMaps!.sites.find(s=>s.id===1)!.tile!};
}
function ready(f:Fixture,people:Pawn[]){const plan=prepareGroupReform260(f.map,draft(f,people));expect(plan.kind,plan.kind==='refused'?plan.reason:'').toBe('ready');if(plan.kind!=='ready')throw Error(plan.kind==='refused'?plan.reason:'Unexpected preview');return plan.plan;}
function expectedClock(f:Fixture,p:Pawn){const clock=coupleClockDraft285(f.map.seed,p.id,p.coupleClock285),span=coupleCooldownCore285(coupleBiologicalYears285(p)!,coupleNormal285(clock))!;clock.nextAllowedAtCore=f.map.tick*10+span;return clock;}
function finished(p:Pawn,q:Pawn,tick:number,clock:Pawn['coupleClock285']){expect(p.coupleTask285).toBeUndefined();expect(p.coupleMemories285).toEqual([{otherId:q.id,at:tick}]);expect(p.coupleClock285).toEqual(clock);}
function reload(root:World){flushRegisteredMap(registeredMap(root,root.worldMaps!.rootMapId!)!);const saved=serializeCampaign(root),copy=deserializeCampaign(saved);expect(serializeCampaign(copy)).toBe(saved);return copy;}

test('one real Reform departure closes both once, preserves the remaining bed use and keeps the Camp',()=>{
 const f=fixture(),rng=f.root.rng,nextId=f.root.nextId,room=f.b.coupleTask285!.roomRest,clocks=[expectedClock(f,f.a),expectedClock(f,f.b)],held=f.map.piles.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===f.a.id),before=JSON.stringify(f.root),plan=ready(f,[f.a]);
 expect(JSON.stringify(f.root)).toBe(before);expect(plan.commit().ok).toBe(true);
 expect(plan.record.state).toHaveProperty('members');if(!('members'in plan.record.state))throw Error('Actual away owner required');
 expect(plan.record.state.members).toContain(f.a);expect(f.map.pawns).not.toContain(f.a);expect(f.map.pawns).toContain(f.b);expect(f.root.worldMaps!.sites.some(s=>s.id===1)).toBe(true);
 finished(f.a,f.b,f.root.tick,clocks[0]);finished(f.b,f.a,f.root.tick,clocks[1]);expect(f.a.need).toBeNull();expect(f.b.need?.kind==='sleep'?f.b.need.roomRest:undefined).toBe(room);
 for(const p of held)expect(plan.record.state.items.find(i=>i.id===p.id)).toBe(p);
 expect([f.root.rng,f.root.nextId]).toEqual([rng,nextId]);const copied=reload(f.root);expect(copied.worldGroups!.groups.find(g=>g.state.id===plan.record.state.id)?.state).toEqual(plan.record.state);
},120_000);

test('both real Reform departures retain the same people and finite goods, retire the Camp and never double-finish',()=>{
 const f=fixture(),rng=f.root.rng,clocks=[expectedClock(f,f.a),expectedClock(f,f.b)],goods=f.map.piles.filter(p=>'pawnId'in p.owner&&[f.a.id,f.b.id].includes(p.owner.pawnId)),plan=ready(f,[f.a,f.b]);
 expect(plan.commit().ok).toBe(true);if(!('members'in plan.record.state))throw Error('Actual away owner required');expect(plan.record.state.members).toEqual([f.a,f.b]);
 for(const p of goods)expect(plan.record.state.items.find(i=>i.id===p.id)).toBe(p);
 finished(f.a,f.b,f.root.tick,clocks[0]);finished(f.b,f.a,f.root.tick,clocks[1]);expect(f.root.worldMaps!.sites.some(s=>s.id===1)).toBe(false);expect(f.root.rng).toBe(rng);
 const saved=serializeCampaign(f.root);expect(plan.commit().ok).toBe(false);expect(serializeCampaign(f.root)).toBe(saved);reload(f.root);
},120_000);

test('Reform then explicit abandonment of the remaining partner keeps its first finish and original physical owner',()=>{
 const f=fixture(),plan=ready(f,[f.a]);expect(plan.commit().ok).toBe(true);const clock=f.b.coupleClock285,memories=f.b.coupleMemories285,goods=f.map.piles.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===f.b.id);
 // A remaining living colonist really keeps the Camp; only this subsequent
 // explicit abandon has MapRemoved authority. No impossible auto-retire is invented.
 const result=abandonRegisteredMap(f.root,1,true);expect(result.ok,result.reason).toBe(true);
 const row=f.root.worldPawns!.owners.find(r=>r.actor.id===f.b.id)!;expect(row.actor).toBe(f.b);expect(f.b.coupleClock285).toEqual(clock);expect(f.b.coupleMemories285).toEqual(memories);expect(f.b.coupleMemories285).toHaveLength(1);
 for(const p of goods)expect(row.items.find(i=>i.id===p.id)).toBe(p);expect(f.root.worldPawns!.owners.some(r=>r.actor.id===f.a.id)).toBe(false);reload(f.root);
},120_000);

test('abandoning an entered pair closes at real detach and consumes only the existing global PassedToWorld stream',()=>{
 const f=fixture(),oracle=fixture(),clocks=[expectedClock(f,f.a),expectedClock(f,f.b)],goods=f.map.piles.filter(p=>'pawnId'in p.owner&&[f.a.id,f.b.id].includes(p.owner.pawnId)),rng=f.root.rng;
 // Counterfactual current owner graph: the real common release is already
 // committed. Its subsequent real abandon supplies only the global-RNG oracle,
 // not a claim that notification ordering or the whole campaigns are identical.
 prepareCoupleRelease285(oracle.map,new Set([oracle.a.id,oracle.b.id])).commit();expect(oracle.root.rng).toBe(rng);
 const expected=abandonRegisteredMap(oracle.root,1,true);expect(expected.ok,expected.reason).toBe(true);
 const plan=prepareMapRemoved259(f.root,f.map,1,false);expect(plan.ok,plan.ok?'':plan.reason).toBe(true);expect(f.root.rng).toBe(rng);expect(f.a.coupleTask285).toBeDefined();
 const actual=abandonRegisteredMap(f.root,1,true);expect(actual.ok,actual.reason).toBe(true);expect(f.root.rng).toBe(oracle.root.rng);
 for(const [p,q,c]of [[f.a,f.b,clocks[0]],[f.b,f.a,clocks[1]]]as const){const row=f.root.worldPawns!.owners.find(r=>r.actor.id===p.id)!;expect(row.actor).toBe(p);finished(p,q,f.root.tick,c);for(const item of goods.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===p.id))expect(row.items.find(i=>i.id===item.id)).toBe(item);}
 reload(f.root);
},120_000);

test('an immutable remaining recipient refuses Reform before either person, item, task or RNG changes',()=>{
 const f=fixture();Object.preventExtensions(f.b);const before=JSON.stringify(f.root),people=f.map.pawns,clock=f.a.coupleClock285,goods=f.map.piles;
 expect(prepareGroupReform260(f.map,draft(f,[f.a])).kind).toBe('refused');expect(JSON.stringify(f.root)).toBe(before);expect(f.map.pawns).toBe(people);expect(f.map.piles).toBe(goods);expect(f.a.coupleClock285).toBe(clock);expect(f.a.coupleTask285).toBeDefined();
},120_000);

test('same-value partner replacement invalidates a prepared real Reform without changing the replacement or original',()=>{
 const f=fixture(),plan=ready(f,[f.a]),index=f.map.pawns.indexOf(f.b),replacement=structuredClone(f.b);f.map.pawns[index]=replacement;flushRegisteredMap(f.map);const before=JSON.stringify(f.root),rng=f.root.rng;
 expect(plan.commit().ok).toBe(false);expect(JSON.stringify(f.root)).toBe(before);expect(f.map.pawns[index]).toBe(replacement);expect(f.root.rng).toBe(rng);expect(f.a.coupleTask285).toBeDefined();expect(f.b.coupleMemories285).toBeUndefined();
},120_000);

test('a changed real bed geometry invalidates the prepared exit before its acquired room observation can be consumed',()=>{
 const f=fixture();f.a.coupleTask285!.roomRest!.applied=true;f.b.coupleTask285!.roomRest!.applied=true;
 const plan=ready(f,[f.a]);f.bed.orientation=1;flushRegisteredMap(f.map);const before=JSON.stringify(f.root),rng=f.root.rng;
 expect(plan.commit().ok).toBe(false);expect(JSON.stringify(f.root)).toBe(before);expect(f.root.rng).toBe(rng);expect(f.a.coupleTask285).toBeDefined();expect(f.b.coupleTask285).toBeDefined();
},120_000);

test('actual occupied caskets require their permit and the existing unsupported insect transfer refuses without affecting the other-map pair',()=>{
 const f=fixture(),home=registeredMap(f.root,0)!,holder=home.structures.find(isAncientCasket256);if(!holder)throw Error('Acquired home must retain its real occupied ancient casket');
 const people=holder.casket.humans.slice(),items=holder.casket.items.slice(),tasks=[f.a.coupleTask285,f.b.coupleTask285],clocks=[f.a.coupleClock285,f.b.coupleClock285],before=serializeCampaign(f.root),tile=f.root.worldMaps!.sites.find(s=>s.id===0)!.tile!;
 expect(()=>detachMapOwners(home,0,tile)).toThrow(/casket/);expect(serializeCampaign(f.root)).toBe(before);expect(f.a.coupleTask285).toBe(tasks[0]);expect(f.b.coupleTask285).toBe(tasks[1]);
 // This source's existing holders are on map0, the real pair on map1. Do not
 // invent a casket transfer or another person merely to merge the two fixtures.
 // This acquired home also owns real insects. The existing prospective
 // off-map thermal frontier refuses them; never remove animals to force green.
 const result=abandonRegisteredMap(f.root,0,true);expect(result.ok).toBe(false);expect(result.reason).toBe('Actual off-map Insectoid HypothermicSlowdown is not represented');
 expect(serializeCampaign(f.root)).toBe(before);expect(home.structures).toContain(holder);
 for(const [i,p]of people.entries())expect(holder.casket.humans[i]).toBe(p);for(const [i,p]of items.entries())expect(holder.casket.items[i]).toBe(p);
 expect(f.a.coupleTask285).toBe(tasks[0]);expect(f.b.coupleTask285).toBe(tasks[1]);expect(f.a.coupleClock285).toBe(clocks[0]);expect(f.b.coupleClock285).toBe(clocks[1]);expect(f.a.coupleMemories285).toBeUndefined();expect(f.b.coupleMemories285).toBeUndefined();reload(f.root);
},120_000);
