import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {newShipCasketHolder277,shipCasketActor277,type ShipCasket277,type ShipCasketOccupant277} from '../src/sim/ship-casket-state-277.ts';
import {planShipCasketRemoval277,type ShipCasketRemoval277} from '../src/sim/ship-casket-removal-277.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {adultAgeTicks,animalNutritionMax} from '../src/sim/animal-life.ts';
import {createMechaMedicalRecord} from '../src/sim/mechanoid-health.ts';
import {actualMechanicalBirthFaction259} from '../src/sim/mechanoid-world-faction-259.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {advanceBombWick} from '../src/sim/bomb-system.ts';
import {validBombWaveShape,bombWaveRadius} from '../src/sim/bomb-state.ts';
import {validAncientCasketWickField256} from '../src/sim/ancient-casket-explosive-state-256.ts';
import {deconstructionDuration} from '../src/sim/deconstruction-rules.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {serializeWorld,deserializeWorld,deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {canStandAt} from '../src/sim/furniture-travel.ts';
import {terrainSupportsAffordance256} from '../src/sim/natural-terrain-runtime-256.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {refreshStock} from '../src/sim/materials.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import type {Mechanoid} from '../src/sim/mechanoid-state.ts';
import type {World,Cell} from '../src/sim/types.ts';

const ready=(plan:ShipCasketRemoval277)=>{expect(plan.ok,plan.ok?'Actual spatial removal prepared':plan.reason).toBe(true);if(!plan.ok)throw Error(plan.reason);return plan;};
const units=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
function preparedAnimal(w:World,at:Cell):WildAnimal {
 const a:WildAnimal={id:w.nextId++,species:'hare',sex:'female',x:at.x,z:at.z,ageTicks:adultAgeTicks('hare'),food:0,rest:1,state:'idle',path:[],nextDecision:w.tick};
 attachGeneratedAnimalGrowth256(a,w.tick*10,w.schemaVersion);a.food=animalNutritionMax(a)*.8;a.health=createAnimalMedicalRecord256(w,a);return a;
}
function preparedMech(w:World,at:Cell):Mechanoid {
 const faction=actualMechanicalBirthFaction259(w.worldFactions);
 return {id:w.nextId++,mechKind:'scyther',x:at.x,z:at.z,state:'idle',path:[],heading:0,moveCooldown:0,planCooldown:0,health:createMechaMedicalRecord(w.tick),...faction?{worldFaction259:faction}:{}};
}
/** Declared recovered structure/held owner for a destructive boundary. The
 * paid building and500Core admission are exercised by the engine scenario. */
function held(kind:ShipCasketOccupant277['kind']='human'){
 const w=deconstructionCamp(2),p=w.pawns.shift()!,helper=w.pawns[0]!;w.jobs=[];w.piles=[];w.packed=[];w.structures=[];w.stockpiles=[];delete w.arrivals;delete w.raids;
 for(const actor of [p,helper]){delete actor.background;delete actor.traits;delete actor.health;actor.hunger=100;actor.rest=100;actor.recreation.level=100;actor.schedule.fill('work');actor.bedId=null;for(const k of Object.keys(actor.priorities) as (keyof typeof actor.priorities)[])actor.priorities[k]=0;}
 Object.assign(p,{x:11,z:10,state:'idle',path:[],moveCooldown:0,jobId:null,haul:null,cooking:null,need:null});delete p.motion;
 w.wildlife={profile:'temperate-hares-v1',rng:1,animals:[],eatenPlants:0,eatenNutrition:0,eatenItems:0};w.mechanoids=[];
 const occupant:ShipCasketOccupant277=kind==='human'?{kind,pawn:p}:kind==='animal'?{kind,animal:preparedAnimal(w,p)}:{kind,mech:preparedMech(w,p)};
 const actor=shipCasketActor277({revision:1,heldAt:w.tick,occupant,items:[],packed:[]})!;actor.shipCryptosleepHeldAt277=w.tick;
 const c:ShipCasket277={id:w.nextId++,kind:'ship-cryptosleep-casket',x:10,z:10,orientation:2,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:{...newShipCasketHolder277(w.tick),occupant,items:kind==='mechanical'?[]:[{id:w.nextId++,kind:'wood',item:'wood',quantity:7,owner:{type:'inventory',pawnId:actor.id}}]}};
 w.structures.push(c);refreshStock(w);return {w,actor,occupant,helper,c};
}

for(const kind of ['human','animal','mechanical'] as const)test(`${kind}: KillFinalize retires the building and drops the same injured original and possessions, with no Open effects`,()=>{
 const {w,c,actor}=held(kind),items=[...c.shipCryptosleep277.items],before=JSON.stringify(w),plan=ready(planShipCasketRemoval277(w,c,'kill-finalize'));
 expect(JSON.stringify(w)).toBe(before);expect(plan.commit()).toBe(true);expect(plan.commit()).toBe(false);
 const found=kind==='human'?w.pawns.find(p=>p.id===actor.id):kind==='animal'?w.wildlife!.animals.find(a=>a.id===actor.id):w.mechanoids!.find(m=>m.id===actor.id);
 expect(found).toBe(actor);expect(w.structures.includes(c)).toBe(false);expect(actor.shipCryptosleepHeldAt277).toBeUndefined();expect(actor.health?.injuries.length).toBeGreaterThan(0);expect(actor.health?.death).toBeUndefined();expect(actor.health?.cryptosleepSickness).toBeUndefined();expect(w.bombWaves).toBeUndefined();
 if(kind==='mechanical'){expect(actor.health?.body).toBe('scyther');expect(actor.health?.injuries.every(i=>i.part.startsWith('scyther-'))).toBe(true);}else if(kind==='animal')expect(actor.health?.body).toBe('hare');else expect(actor.health?.body).toBeUndefined();
 for(const item of items)expect(w.piles.find(p=>p.id===item.id)).toBe(item);
 expect(w.filth?.items.some(f=>f.kind==='slime')).toBeFalsy();
 for(const [item,initial]of [['steel',120],['uranium',14],['component',3],['advanced-component',3]] as const)expect(units(w,item)+(w.destroyed?.lost[item]??0)).toBe(initial);
 expect(validateWorld(w)).toEqual([]);const text=serializeWorld(w);expect(serializeWorld(deserializeWorld(text))).toBe(text);
});

test('completed real deconstruction recovers all four spatial recipe terms and preserves each occupant without new lesions or a Flame wave',()=>{
 for(const kind of ['human','animal','mechanical'] as const){const {w,c,actor,helper}=held(kind);Object.assign(helper,{x:9,z:9,state:'working'});
  const health=structuredClone(actor.health),job={id:w.nextId++,kind:'deconstruct' as const,x:c.x,z:c.z,orientation:c.orientation,footprint:c.footprint,deconstruction:{structureId:c.id,kind:c.kind,material:c.material!},status:'active' as const,reservedBy:helper.id,progress:0,escrow:{wood:0,food:0}};job.progress=deconstructionDuration(job);w.jobs.push(job);helper.jobId=job.id;
  ready(planShipCasketRemoval277(w,c,'deconstruct'));expect(finishDeconstruction(w,helper,job)).toBe(true);expect(actor.health).toEqual(health);expect(actor.shipCryptosleepHeldAt277).toBeUndefined();expect(w.bombWaves).toBeUndefined();
  for(const [item,initial,loss]of [['steel',120,w.deconstructed.lostSteel],['uranium',14,w.deconstructed.lostUranium],['component',3,w.deconstructed.lostComponents],['advanced-component',3,w.deconstructed.lostAdvancedComponents271]] as const)expect(units(w,item)+(loss??0)).toBe(initial);
  expect(validateWorld(w)).toEqual([]);
 }
});

test('the spatial wick starts at40 remaining HP, persists one140–150Core deadline and detonates through the real bomb slot',()=>{
 const {w,c,actor}=held();expect(damageStructure(w,c,159,'bullet',w.rng,{core:0,rawAmount:159})).toBe(true);expect(c.casketWick).toBeUndefined();
 expect(damageStructure(w,c,1,'bullet',w.rng,{core:0,rawAmount:1})).toBe(true);const wick=structuredClone(c.casketWick)!;expect(wick.endCore).toBeGreaterThanOrEqual(140);expect(wick.endCore).toBeLessThanOrEqual(150);expect(validAncientCasketWickField256(c,277,0)).toBe(true);expect(validAncientCasketWickField256(c,276,0)).toBe(false);
 expect(validAncientCasketWickField256({...c,kind:'cryptosleep-casket'},277,0)).toBe(false);
 w.tick=Math.ceil(wick.endCore/10);expect(advanceBombWick(w,c,wick.endCore)).toBe(true);expect(w.pawns.find(p=>p.id===actor.id)).toBe(actor);const wave=w.bombWaves![0]!;
 expect(wave.casketExplosion?.ship277).toBe(true);expect(wave.casketExplosion?.player271).toBeUndefined();expect(bombWaveRadius(wave)).toBe(Math.fround(2.66));expect(validBombWaveShape(wave,277)).toBe(true);expect(validBombWaveShape(wave,276)).toBe(false);expect(validBombWaveShape({...wave,casketExplosion:{...wave.casketExplosion,player271:true}},277)).toBe(false);
});

test.each(['occupant','items','packed'] as const)('equal-value replacement of the original %s invalidates a prepared spatial removal',field=>{
 const {w,c}=held(),plan=ready(planShipCasketRemoval277(w,c,'kill-finalize'));
 if(field==='occupant')c.shipCryptosleep277.occupant=structuredClone(c.shipCryptosleep277.occupant);else if(field==='items')c.shipCryptosleep277.items=c.shipCryptosleep277.items.map(p=>structuredClone(p));else c.shipCryptosleep277.packed=c.shipCryptosleep277.packed.slice();
 const before=JSON.stringify(w);expect(plan.commit()).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('a literal old local world without a born WorldPawn registry refuses unplaceable terminal loss and retains its exact original',()=>{
 const {w,c,actor}=held(),before=JSON.stringify(w),plan=planShipCasketRemoval277(w,c,'vanish');expect(plan.ok).toBe(false);if(plan.ok)throw Error('Historical terminal owner must not be fabricated');expect(plan.reason).toMatch(/WorldPawn frontier/);expect(JSON.stringify(w)).toBe(before);expect(c.shipCryptosleep277.occupant?.kind).toBe('human');expect(shipCasketActor277(c.shipCryptosleep277)).toBe(actor);
});

for(const kind of ['human','animal','mechanical'] as const)test(`${kind}: acquired registered campaign Vanish retains the same terminal WorldPawn and exact losses, with no invented death/corpse and exact reload`,()=>{
 const raw=readFileSync('tmp/test-runs/caravan-owners-v414-departure-expiry01-2026-10-17T19-08-08.417Z-26072/artifacts/caravan-owners-v259/actual259-paused2905-before-abandon-refusal.json','utf8');
 expect(createHash('sha256').update(raw).digest('hex')).toBe('5ff387667bb3933d4b3957c65dd9516c4c3470e13d3c888b2a917878f9778525');const root=deserializeCampaign(raw);if(!('pawns'in root))throw Error('Actual registered campaign required');const w=registeredMap(root,0)!;
 // Recovered spatial casket and an already-held living owner are DECLARED
 // fixture preparation on the acquired geography, not a newly played trip.
 const busy=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.resources,...w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[]),...w.packed.flatMap(p=>p.owner.type==='ground'?[p.owner]:[]),...w.stockpiles].map(c=>c.z*w.width+c.x));let origin:Cell|undefined;
 for(let z=1;z<w.height-4&&!origin;z++)for(let x=1;x<w.width-4&&!origin;x++)if(Array.from({length:16},(_,i)=>({x:x+i%4,z:z+Math.floor(i/4)})).every(c=>!busy.has(c.z*w.width+c.x)&&canStandAt(w,c)&&terrainSupportsAffordance256(w.tiles[c.z*w.width+c.x]!,'Heavy',w)))origin={x:x+1,z:z+2};if(!origin)throw Error('Actual supported fixture floor unavailable');
 const person=w.pawns.find(p=>p.id===8)!;const occupant:ShipCasketOccupant277=kind==='human'?{kind,pawn:person}:kind==='animal'?{kind,animal:preparedAnimal(w,origin)}:{kind,mech:preparedMech(w,origin)};
 const actor=shipCasketActor277({revision:1,heldAt:w.tick,occupant,items:[],packed:[]})!;
 if(occupant.kind==='human'){if(!releaseWork(w,person))throw Error('Actual work cargo cannot release');delete person.motion;person.path=[];person.moveCooldown=0;w.pawns=w.pawns.filter(p=>p!==person);}
 actor.shipCryptosleepHeldAt277=w.tick;const items=w.piles.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===actor.id&&['inventory','equipment','apparel'].includes(p.owner.type));if(kind!=='mechanical')items.push({id:w.nextId++,kind:'wood',item:'wood',quantity:7,owner:{type:'inventory',pawnId:actor.id}});
 const c:ShipCasket277={id:w.nextId++,kind:'ship-cryptosleep-casket',...origin,orientation:2,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:{revision:1,heldAt:w.tick,occupant,items,packed:[]}};w.piles=w.piles.filter(p=>!items.includes(p));w.structures.push(c);refreshStock(w);flushRegisteredMap(w);expect(validateWorld(root)).toEqual([]);
 const priorWood=w.destroyed?.items?.wood??0,priorDestroyed=w.destroyed,destroyedBefore=JSON.stringify(w.destroyed),affiliation=occupant.kind==='human'?structuredClone(occupant.pawn.worldAffiliation259):undefined;
 expect(ready(planShipCasketRemoval277(w,c,'vanish')).commit()).toBe(true);flushRegisteredMap(w);const row=root.worldPawns!.owners.find(r=>r.actor.id===actor.id)!;
 expect(row.kind).toBe(kind);expect(row.actor).toBe(actor);expect(row.destroyed).toBe(true);expect(row.mode).toBe('dead');expect(actor.health?.death).toBeUndefined();expect(actor.shipCryptosleepHeldAt277).toBeUndefined();expect(row.items).toEqual([]);expect(row.packed).toEqual([]);expect(w.structures.includes(c)).toBe(false);expect(w.piles.some(p=>p.humanCorpse?.pawnId===actor.id)).toBe(false);
 if(row.kind==='human')expect(row.actor.worldAffiliation259).toEqual(affiliation);if(kind!=='mechanical')expect((w.destroyed?.items?.wood??0)-priorWood).toBe(7);
 else{expect(w.destroyed).toBe(priorDestroyed);expect(JSON.stringify(w.destroyed)).toBe(destroyedBefore);}
 expect(validateWorld(root)).toEqual([]);const saved=serializeCampaign(root);expect(serializeCampaign(deserializeCampaign(saved))).toBe(saved);
});
