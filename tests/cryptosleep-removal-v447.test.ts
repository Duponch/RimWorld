import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {newCryptosleepHolder271,type PlayerCasket271} from '../src/sim/cryptosleep-state-271.ts';
import {planCryptosleepRemoval271,cryptosleepDamageUntilDowned271,type CryptosleepRemoval271} from '../src/sim/cryptosleep-removal-271.ts';
import {createMedicalRecord,medicalStatus,addResolvedInjury} from '../src/sim/injury-state.ts';
import {healthRandom} from '../src/sim/health.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {advanceBombWick} from '../src/sim/bomb-system.ts';
import {validBombWaveShape,bombWaveRadius} from '../src/sim/bomb-state.ts';
import {validAncientCasketWickField256} from '../src/sim/ancient-casket-explosive-state-256.ts';
import {deconstructionDuration} from '../src/sim/deconstruction-rules.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {serializeWorld,deserializeWorld,deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {terrainSupportsAffordance256} from '../src/sim/natural-terrain-runtime-256.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import type {PackedFurniture} from '../src/sim/furniture-rules.ts';
import {refreshStock} from '../src/sim/materials.ts';
import type {World} from '../src/sim/types.ts';

/** Prepared recovered paid casket and one already-held original. Acquisition
 * and500Coreentry are covered by their real production/service scenarios. */
function held(){
 const w=deconstructionCamp(2),p=w.pawns.shift()!,helper=w.pawns[0]!;
 w.jobs=[];w.piles=[];w.packed=[];w.structures=[];w.stockpiles=[];delete w.wildlife;delete w.arrivals;delete w.raids;
 for(const actor of [p,helper]){delete actor.background;delete actor.traits;delete actor.health;actor.hunger=100;actor.rest=100;actor.recreation.level=100;actor.schedule.fill('work');actor.bedId=null;for(const k of Object.keys(actor.priorities) as (keyof typeof actor.priorities)[])actor.priorities[k]=0;}
 Object.assign(p,{x:11,z:10,state:'idle',path:[],moveCooldown:0,jobId:null,haul:null,cooking:null,need:null,cryptosleepHeldAt271:w.tick});delete p.motion;
 const c:PlayerCasket271={id:w.nextId++,kind:'cryptosleep-casket',x:10,z:10,orientation:0,footprint:'standard',material:'steel',cryptosleep:newCryptosleepHolder271(w.tick)};
 c.cryptosleep.human=p;c.cryptosleep.items=[{id:w.nextId++,kind:'wood',item:'wood',quantity:7,owner:{type:'inventory',pawnId:p.id}}];w.structures.push(c);refreshStock(w);expect(validateWorld(w)).toEqual([]);return {w,p,helper,c};
}
const count=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const ready=(plan:CryptosleepRemoval271)=>{expect(plan.ok,plan.ok?'Actual removal prepared':plan.reason).toBe(true);if(!plan.ok)throw Error(plan.reason);return plan;};

test('KillFinalize wounds the same original before placement and never applies Open sickness or slime',()=>{
 const {w,p,c}=held(),item=c.cryptosleep.items[0]!,plan=ready(planCryptosleepRemoval271(w,c,'kill-finalize'));
 expect(w.site).toBeUndefined(); // Actual historical map, never a fabricated Site3.
 expect(w.structures.includes(c)).toBe(true);expect(w.pawns.includes(p)).toBe(false);expect(p.health).toBeUndefined();expect(plan.commit()).toBe(true);expect(plan.commit()).toBe(false);
 expect(w.structures.includes(c)).toBe(false);expect(w.pawns.find(q=>q.id===p.id)).toBe(p);expect(w.piles.find(q=>q.id===item.id)).toBe(item);expect(p.cryptosleepHeldAt271).toBeUndefined();
 expect(p.health?.injuries.length).toBeGreaterThan(0);expect(p.state).toBe('downed');expect(p.health?.death).toBeUndefined();expect(p.health?.cryptosleepSickness).toBeUndefined();expect(p.filthFeet?.carried.some(f=>f.kind==='slime')).toBeFalsy();expect(w.bombWaves).toBeUndefined();
 for(const [id,initial]of [['steel',180],['uranium',5],['component',4],['advanced-component',1]] as const)expect(count(w,id)+(w.destroyed?.lost[id]??0)).toBe(initial);
 expect(validateWorld(w)).toEqual([]);const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
});

test('completed deconstruction returns all four recipe terms and releases the same occupant without gratuitous wounds or Open effects',()=>{
 const {w,p,helper,c}=held();Object.assign(helper,{x:9,z:10,state:'working'});
 const job={id:w.nextId++,kind:'deconstruct' as const,x:c.x,z:c.z,orientation:c.orientation,footprint:c.footprint,deconstruction:{structureId:c.id,kind:c.kind,material:c.material!},status:'active' as const,reservedBy:helper.id,progress:0,escrow:{wood:0,food:0}};
 job.progress=deconstructionDuration(job);w.jobs.push(job);helper.jobId=job.id;
 ready(planCryptosleepRemoval271(w,c,'deconstruct'));expect(finishDeconstruction(w,helper,job)).toBe(true);expect(w.pawns.find(q=>q.id===p.id)).toBe(p);expect(p.state).toBe('idle');expect(p.health).toBeUndefined();expect(w.structures.includes(c)).toBe(false);expect(w.bombWaves).toBeUndefined();
 expect(count(w,'steel')+(w.deconstructed.lostSteel??0)).toBe(180);expect(count(w,'uranium')+(w.deconstructed.lostUranium??0)).toBe(5);expect(count(w,'component')+(w.deconstructed.lostComponents??0)).toBe(4);expect(count(w,'advanced-component')+(w.deconstructed.lostAdvancedComponents271??0)).toBe(1);
 expect(validateWorld(w)).toEqual([]);
});

test('an already downed patient receives no extra DamageUntilDowned draw or lesion',()=>{
 const health=createMedicalRecord(23);addResolvedInjury(health,'left-leg','cut',30000,()=>.999999);addResolvedInjury(health,'right-leg','cut',30000,()=>.999999);expect(medicalStatus(health)).toBe('downed');
 const before=structuredClone(health),result=cryptosleepDamageUntilDowned271(health,()=>{throw Error('Already downed must not draw');});expect(result.attempts).toBe(0);expect(result.record).toEqual(before);expect(health).toEqual(before);
});

test('damage downing is bounded, non-mutating at preparation and deterministic on the existing gameplay stream',()=>{
 const health=createMedicalRecord(19),a={rng:88191},b={rng:88191},before=structuredClone(health),one=cryptosleepDamageUntilDowned271(health,()=>healthRandom(a)),two=cryptosleepDamageUntilDowned271(health,()=>healthRandom(b));
 expect(one).toEqual(two);expect(a.rng).toBe(b.rng);expect(one.attempts).toBeGreaterThan(0);expect(one.attempts).toBeLessThanOrEqual(300);expect(one.record.injuries.length).toBeGreaterThan(0);expect(one.record.death).toBeUndefined();expect(medicalStatus(one.record)).toBe('downed');expect(health).toEqual(before);
});

test('fatal external damage retires and releases contents before a radius2.66Flame wave; new provenance is closed to older saves',()=>{
 const {w,p,c}=held();ready(planCryptosleepRemoval271(w,c,'kill-finalize',{core:0}));expect(damageStructure(w,c,250,'bullet',w.rng,{core:0,rawAmount:250})).toBe(true);expect(w.pawns.find(q=>q.id===p.id)).toBe(p);expect(w.structures.includes(c)).toBe(false);
 const wave=w.bombWaves?.[0];expect(wave).toBeDefined();expect(wave?.casketExplosion?.player271).toBe(true);expect(wave?.casketExplosion?.ignoredThingKeys).not.toContain(`pawn:${p.id}`);expect(wave?.nextCell).toBe(0);expect(wave?.damagedThingKeys).toEqual([]);expect(bombWaveRadius(wave!)).toBe(Math.fround(2.66));expect(validBombWaveShape(wave,271)).toBe(true);expect(validBombWaveShape(wave,270)).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('low HP retains one persistent140–150Core wick while occupied and its expiry uses the same destructive lane',()=>{
 const {w,p,c}=held();expect(damageStructure(w,c,200,'bullet',w.rng,{core:0,rawAmount:200})).toBe(true);const wick=structuredClone(c.casketWick!);expect(wick.endCore-wick.startedAtCore).toBeGreaterThanOrEqual(140);expect(wick.endCore-wick.startedAtCore).toBeLessThanOrEqual(150);expect(c.cryptosleep.human).toBe(p);
 expect(validAncientCasketWickField256(c,271,0)).toBe(true);expect(validAncientCasketWickField256(c,270,0)).toBe(false);expect(validAncientCasketWickField256(c,272,0)).toBe(true);expect(validAncientCasketWickField256(c,274,0)).toBe(false);
 expect(damageStructure(w,c,1,'bullet',w.rng,{core:0,rawAmount:1})).toBe(true);expect(c.casketWick).toEqual(wick);w.tick=Math.ceil(wick.endCore/10);ready(planCryptosleepRemoval271(w,c,'kill-finalize',{core:wick.endCore}));expect(advanceBombWick(w,c,wick.endCore)).toBe(true);expect(w.structures.includes(c)).toBe(false);expect(w.pawns.find(q=>q.id===p.id)).toBe(p);expect(w.bombWaves?.[0]?.startedAtCore).toBe(wick.endCore);
});

test('a stale removal plan cannot retire a moved casket or consume owner clocks, possessions and stream',()=>{
 const {w,p,c}=held(),plan=ready(planCryptosleepRemoval271(w,c,'kill-finalize'));c.x++;const before=serializeWorld(w);expect(plan.commit()).toBe(false);expect(serializeWorld(w)).toBe(before);expect(c.cryptosleep.human).toBe(p);expect(p.health).toBeUndefined();
});

test.each(['human','items','packed'] as const)('equal-value replacement of held%s invalidates the original removal plan',field=>{
 const {w,p,c}=held(),plan=ready(planCryptosleepRemoval271(w,c,'kill-finalize'));
 if(field==='human')c.cryptosleep.human=structuredClone(p);else if(field==='items')c.cryptosleep.items=c.cryptosleep.items.map(i=>structuredClone(i));else c.cryptosleep.packed=c.cryptosleep.packed.slice();
 const before=serializeWorld(w);expect(plan.commit()).toBe(false);expect(serializeWorld(w)).toBe(before);expect(w.pawns.some(q=>q.id===p.id)).toBe(false);
});

test('real registered campaign Vanish preserves the same destroyed WorldPawn identity, destroys possessions exactly and reloads without inventing a corpse',()=>{
 const path='tmp/test-runs/caravan-owners-v414-departure-expiry01-2026-10-17T19-08-08.417Z-26072/artifacts/caravan-owners-v259/actual259-paused2905-before-abandon-refusal.json',raw=readFileSync(path,'utf8');
 expect(createHash('sha256').update(raw).digest('hex')).toBe('5ff387667bb3933d4b3957c65dd9516c4c3470e13d3c888b2a917878f9778525');
 const root=deserializeCampaign(raw);if(!('pawns'in root))throw Error('Actual loaded campaign required');const map=registeredMap(root,0)!,p=map.pawns.find(q=>q.id===8)!;
 // Owner-boundary preparation on the acquired campaign, with one recovered
 // casket and a finite personal wood stack/packed bed; no new globe or trip.
 const occupied=new Set([...map.structures.flatMap(footprintCells),...map.resources].map(v=>v.z*map.width+v.x));let origin:{x:number;z:number}|undefined;
 for(let z=1;z<map.height-4&&!origin;z++)for(let x=1;x<map.width-4&&!origin;x++)if(Array.from({length:16},(_,i)=>({x:x+i%4,z:z+Math.floor(i/4)})).every(c=>!occupied.has(c.z*map.width+c.x)&&!['rock','water'].includes(map.tiles[c.z*map.width+c.x]!.terrain)&&terrainSupportsAffordance256(map.tiles[c.z*map.width+c.x]!,'Medium',map)))origin={x,z};
 if(!origin)throw Error('Actual supported casket fixture floor unavailable');if(!releaseWork(map,p))throw Error('Actual prepared colonist cargo did not release');delete p.motion;p.path=[];p.moveCooldown=0;p.cryptosleepHeldAt271=map.tick;
 const items=map.piles.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===p.id&&['inventory','equipment','apparel'].includes(i.owner.type)),personalWood={id:map.nextId++,kind:'wood' as const,item:'wood' as const,quantity:7,owner:{type:'inventory' as const,pawnId:p.id}};items.push(personalWood);
 const existingPacks=map.packed.filter(i=>i.owner.type==='inventory'&&i.owner.pawnId===p.id);expect(existingPacks).toEqual([]);
 const bill=newCookingBill(map.nextId++,'simple-meal'),shelfCell=map.nextId++,packed:PackedFurniture[]=[
  {building:{id:map.nextId++,kind:'bed',...origin,orientation:0,footprint:'standard',material:'wood',quality:'normal'},owner:{type:'inventory',pawnId:p.id}},
  {building:{id:map.nextId++,kind:'fueled-stove',...origin,orientation:0,footprint:'standard',material:'steel',fuel:{ticks:173,burned:11,autoRefuel:true},bills:[bill]},owner:{type:'inventory',pawnId:p.id}},
  {building:{id:map.nextId++,kind:'battery',...origin,orientation:0,footprint:'standard',material:'steel',battery:{stored:4321,half:true},power:{on:false,parentId:null}},owner:{type:'inventory',pawnId:p.id}},
  {building:{id:map.nextId++,kind:'fermenting-barrel',...origin,orientation:0,footprint:'standard',material:'wood',fermentation:{wort:9,progress:1,ruin:0}},owner:{type:'inventory',pawnId:p.id}},
  {building:{id:map.nextId++,kind:'small-shelf',...origin,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([shelfCell])},owner:{type:'inventory',pawnId:p.id}},
 ];
 const c:PlayerCasket271={id:map.nextId++,kind:'cryptosleep-casket',...origin,orientation:0,footprint:'standard',material:'steel',cryptosleep:{...newCryptosleepHolder271(map.tick),human:p,items,packed}};
 map.pawns=map.pawns.filter(q=>q!==p);map.piles=map.piles.filter(i=>!items.includes(i));map.packed=map.packed.filter(i=>!packed.includes(i));map.structures=[...map.structures,c];refreshStock(map);flushRegisteredMap(map);expect(validateWorld(root)).toEqual([]);
 // The same acquired geographic map also exercises native ranked Near at
 // preparation, without replacing the terminal Vanish outcome under test.
 expect(map.site?.revision).toBe(3);const nearBefore=JSON.stringify([c,map.rng,map.nextId]);ready(planCryptosleepRemoval271(map,c,'kill-finalize'));expect(JSON.stringify([c,map.rng,map.nextId])).toBe(nearBefore);
 const previousItems={...map.destroyed?.items},previousLoss={...map.destroyed?.lost},previousFuelLost=map.destroyed?.fuelTicksLost??0,previousFuelBurned=map.destroyed?.fuelTicksBurned??0,previousEnergy=map.destroyed?.batteryEnergyLost??0,losses=new Map<string,number>();for(const item of items)losses.set(item.item,(losses.get(item.item)??0)+item.quantity);
 const plan=ready(planCryptosleepRemoval271(map,c,'vanish'));expect(plan.commit()).toBe(true);flushRegisteredMap(map);
 const row=root.worldPawns!.owners.find(r=>r.actor.id===p.id)!;expect(row.kind).toBe('human');expect(row.actor).toBe(p);expect(row.destroyed).toBe(true);expect(row.mode).toBe('dead');expect(row.actor.health?.death).toBeUndefined();expect(row.items).toEqual([]);expect(row.packed).toEqual([]);expect(p.cryptosleepHeldAt271).toBeUndefined();expect(p.bedId).toBeNull();expect(p.mapBed).toBeUndefined();
 expect(map.structures.includes(c)).toBe(false);expect(map.pawns.some(q=>q.id===p.id)).toBe(false);expect(map.piles.some(i=>items.some(j=>j.id===i.id))).toBe(false);expect(map.packed.some(i=>packed.some(j=>j.building.id===i.building.id))).toBe(false);expect(map.piles.some(i=>i.humanCorpse?.pawnId===p.id)).toBe(false);
 for(const [item,quantity]of losses)expect((map.destroyed?.items?.[item as keyof typeof previousItems]??0)-(previousItems[item as keyof typeof previousItems]??0)).toBe(quantity);
 for(const [item,quantity]of [['wood',85],['steel',160],['component',2],['beer',9]] as const)expect((map.destroyed?.lost[item]??0)-(previousLoss[item]??0)).toBe(quantity);
 expect((map.destroyed?.fuelTicksLost??0)-previousFuelLost).toBe(173);expect((map.destroyed?.fuelTicksBurned??0)-previousFuelBurned).toBe(11);expect((map.destroyed?.batteryEnergyLost??0)-previousEnergy).toBe(4321.5);
 const retainedThings=root.worldPawns!.owners.flatMap(r=>[r.actor.id,...r.items.map(i=>i.id),...r.packed.flatMap(b=>[b.building.id,...b.building.bills?.map(bill=>bill.id)??[],...b.building.shelf?.cells??[]])]);expect(retainedThings).not.toContain(bill.id);expect(retainedThings).not.toContain(shelfCell);
 expect(validateWorld(root)).toEqual([]);const saved=serializeCampaign(root);expect(serializeCampaign(deserializeCampaign(saved))).toBe(saved);
});
