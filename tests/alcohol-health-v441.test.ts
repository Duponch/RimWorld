import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health';
import {fixtureBuilding} from './scenarios/deconstruction';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {addMaterial,refreshStock} from '../src/sim/materials';
import {createMedicalRecord,assessMedical,medicalStatus} from '../src/sim/injury-state';
import {advanceMedical} from '../src/sim/injury-evolution';
import {ingestAlcoholDose265,advanceAlcoholCore265} from '../src/sim/alcohol-clinical-265';
import {alcoholInspection265,alcoholThoughts265,alcoholWithdrawal265} from '../src/sim/alcohol-rules-265';
import {validAlcoholHeader265,validAlcoholWorld265} from '../src/sim/alcohol-state-265';
import {initialDrugPolicies265,drugPolicyFor265,applyDrugPolicyCommand265,validBeerPolicy265} from '../src/sim/alcohol-policy-265';
import {processAutomaticAlcohol265} from '../src/sim/alcohol-ingestion-265';
import {advanceGroupAlcohol265} from '../src/sim/alcohol-caravan-265';
import {tryApplyAnimalAgeCondition256} from '../src/sim/animal-birthday-application-256';
import {animalClinicalRandom256} from '../src/sim/animal-condition-medical-frontier-256';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256';
import {FOOD_ITEMS} from '../src/sim/food-policy';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {registeredMapPresentation} from '../src/sim/world-map-presentation';
import type {NeedContext} from '../src/sim/needs';
import type {MedicalContext} from '../src/sim/injury-types';
import type {World} from '../src/sim/types';

// Prepared isolated clinical/physical scenes, never a claim of a naturally
// brewed supply or an executed test campaign. Root runs this file separately.
const f=Math.fround,noRisk=()=>.999999;
const context:MedicalContext={phase:7,posture:'standing',starving:false,alcoholOwner:{id:7,spawned:false,awake:true}};
function scene(quantity=3){const w=medicalCamp(),p=w.pawns[0]!;Object.assign(p,{x:3,z:5,hunger:80,rest:80});w.piles=[];addMaterial(w,'beer',quantity,{type:'ground',x:12,z:5},'beer');refreshStock(w);return {w,p,source:w.piles[0]!};}
function until(w:World,done:()=>boolean,max=500){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done()).toBe(true);}
function roundTrip(w:World){
 expect(validateWorld(w)).toEqual([]);
 const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);
 // A snapshot owns the selected public map projection, whereas the full save
 // above owns the complete RAW campaign, including its map/group registries.
 const publicWorld=w.worldMaps?registeredMapPresentation(w):w;
 if(!publicWorld)throw Error('Prepared alcohol scene has no selected actual map');
 const expected=structuredClone(publicWorld),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const packet=decoder.adopt(structuredClone(encoder.encode(w,0,0,true)));
 expect(packet.status).toBe('applied');if(packet.status==='applied')expect(packet.world).toEqual(expected);
 return copy;
}

test('265 exact four Beer policy entries, strict bounds and immutable implicit Social',()=>{
 const policies=initialDrugPolicies265();expect(policies.map(p=>[p.beer.allowedForAddiction,p.beer.allowedForJoy,p.beer.allowScheduled,p.beer.takeToInventory])).toEqual([[false,true,false,0],[true,false,false,0],[true,true,false,0],[false,true,true,1]]);
 const {w,p}=scene();delete w.drugPolicies;delete w.nextDrugPolicyId;const before=serializeWorld(w);expect(drugPolicyFor265(w,p).name).toBe('Drogues sociales');expect(serializeWorld(w)).toBe(before);
 expect(validBeerPolicy265({...policies[0]!.beer,takeToInventory:4})).toBe(false);expect(validBeerPolicy265({...policies[0]!.beer,daysFrequency:0})).toBe(false);
 expect(applyDrugPolicyCommand265(w,{type:'drug-policy-create',name:'Copie',copyFromId:1})).toBeNull();expect(w.drugPolicies).toHaveLength(2);expect(w.nextDrugPolicyId).toBe(3);
});

test('beer and hops never join human nutrition policies',()=>{
 expect((FOOD_ITEMS as readonly string[])).not.toContain('beer');expect((FOOD_ITEMS as readonly string[])).not.toContain('hops');
});

test('no beer gives automatic provider a literal no-op, without a search, cooldown or random draw',()=>{
 const {w,p}=scene();w.piles=[];p.schedule.fill('recreation');p.recreation.level=0;p.needCooldown=0;const before=serializeWorld(w);
 const fail=()=>{throw Error('No beer must never search or release');};
 const c:NeedContext={search:fail,release:fail,move:fail,event:fail};expect(processAutomaticAlcohol265(w,p,c)).toBe(false);expect(serializeWorld(w)).toBe(before);
});

test('one actual dose uses old tolerance for both effects and cannot addict below the old threshold',()=>{
 const h=createMedicalRecord();h.alcohol={bornAt:0,high:0,tolerance:f(.2499),hangover:0,lastDoseTick:0,dosesToday:1};
 const old=h.alcohol.tolerance,effect=f(1-f(f(.75)*old));let draws=0;
 ingestAlcoholDose265(h,1,0,()=>{draws++;return 0;});expect(draws).toBe(1);expect(h.alcohol.addiction).toBeUndefined();expect(h.alcohol.high).toBe(f(f(.15)*effect));expect(h.alcohol.tolerance).toBe(f(old+f(f(.016)*effect)));
 ingestAlcoholDose265(h,1,0,()=>0);expect(h.alcohol.addiction).toEqual({severity:f(.5),need:1});
 ingestAlcoholDose265(h,1,0,noRisk);expect(h.alcohol.addiction?.severity).toBe(f(f(.5)+f(.2)));
});

test('blackout is physiological downing, uncapped high remains serializable, and withdrawal hurts mood and capacities',()=>{
 const h=createMedicalRecord();for(let i=0;i<10;i++)ingestAlcoholDose265(h,1,0,noRisk);
 expect(h.alcohol!.high).toBeGreaterThan(1);expect(validAlcoholHeader265(h,265)).toBe(true);expect(validAlcoholHeader265(h,264)).toBe(false);expect(medicalStatus(h)).toBe('downed');expect(assessMedical(h).capacities.consciousness).toBe(.1);
 h.alcohol!.high=0;h.alcohol!.addiction={severity:f(.5),need:0};expect(alcoholWithdrawal265(h.alcohol)).toBe(true);const body=assessMedical(h);expect(body.capacities.moving).toBeLessThan(.7);expect(body.capacities.manipulation).toBeLessThan(.6);
 const {p}=scene();p.health=h;expect(alcoholThoughts265(p).find(t=>t.id==='alcohol-withdrawal')?.offset).toBe(-35);expect(alcoholInspection265(p).join(' ')).toContain('Sevrage');
});

test('hashed medical phases and hangover continue identically through split intervals with no fabricated spatial episode',()=>{
 const a=createMedicalRecord();ingestAlcoholDose265(a,1,0,noRisk);a.alcohol!.high=f(.8);const b=structuredClone(a);
 advanceMedical(a,6400,context,noRisk);for(let n=0;n<6400;n++)advanceMedical(b,1,context,noRisk);expect(b).toEqual(a);expect(a.alcohol!.high).toBeLessThan(.003);expect(a.alcohol!.hangover).toBeGreaterThan(0);expect(a.alcohol!.vomit).toBeUndefined();expect(a.alcohol!.vomitRequestedAt).toBeUndefined();
 advanceMedical(a,1000,context,noRisk);expect(a.alcohol!.hangover).toBe(0);
});

test('addiction recovers after abstinence on the original clinical record and stops producing withdrawal',()=>{
 const h=createMedicalRecord();ingestAlcoholDose265(h,1,0,noRisk);h.alcohol!.addiction={severity:f(.01),need:0};advanceMedical(h,2000,context,noRisk);expect(h.alcohol!.addiction).toBeUndefined();expect(alcoholWithdrawal265(h.alcohol)).toBe(false);
});

test('a primary liver carcinoma uses the existing growing/tendable real-part producer without spreading to a random organ',()=>{
 const h=createMedicalRecord();const result=tryApplyAnimalAgeCondition256(h,'Carcinoma',animalClinicalRandom256(()=>.5),undefined,['liver']);expect(result.status).toBe('applied');expect(h.animalAgeConditions!.cases[0]).toMatchObject({kind:'Carcinoma',part:'liver',severity:f(.3),growth:{mode:1},tend:{ticksLeft:-1}});
 const {p}=scene();p.health=h;expect(assessMedical(h).capacities.bloodFiltration).toBeLessThan(1);
});

test('actual tolerance risk applies cirrhosis and liver cancer, while unspawned clinical trials never request a map job',()=>{
 const h=createMedicalRecord(5);ingestAlcoholDose265(h,1,5,noRisk);h.alcohol!.tolerance=f(.8);h.alcohol!.high=f(.95);let at=0;for(let core=41;core<=50;core++)if(groupPawnInterval256(7,core,60,1))at=core;
 // Seek one true owned hash boundary, never force an unowned future Core tick.
 if(!at){for(let local=6;local<20&&!at;local++){h.tick=local;for(let core=(local-1)*10+1;core<=local*10;core++)if(groupPawnInterval256(7,core,60,1)){at=core;break;}}}
 expect(at).toBeGreaterThan(0);advanceAlcoholCore265(h,at,{id:7,spawned:false,awake:true},()=>0);expect(h.alcohol!.cirrhosis).toBe(true);expect(h.animalAgeConditions!.cases.some(c=>c.kind==='Carcinoma'&&c.part==='liver')).toBe(true);expect(h.alcohol!.brainDamage).toBe(true);expect(h.alcohol!.bingeRequestedAt).toBeUndefined();expect(h.alcohol!.vomitRequestedAt).toBeUndefined();
});

test('direct drinking reserves one real beer, walks, splits, waits and resumes exactly, with no meal or table thought',()=>{
 const {w,p,source}=scene();const seat=fixtureBuilding(w,'stool',14,5);const rng=w.rng,memories=structuredClone(p.memories);
 expect(applyCommand(w,{type:'order-consume',pawnId:p.id,pileId:source.id,queue:false}).ok).toBe(true);expect(p.need).toMatchObject({kind:'eat',alcoholReason:'ordered',quantity:1,phase:'pickup'});expect(p.health?.alcohol).toBeUndefined();expect(w.rng).toBe(rng);
 until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest');expect(p.need).toMatchObject({dining:{seatId:seat.id,tableId:null}});expect(source.quantity).toBe(2);expect(p.health?.alcohol).toBeUndefined();
 const replay=roundTrip(w);stepWorld(w,8);stepWorld(replay,8);expect(replay).toEqual(w);until(w,()=>!!p.health?.alcohol);expect(p.memories).toEqual(memories);expect(w.piles.filter(q=>q.item==='beer').reduce((n,q)=>n+q.quantity,0)).toBe(2);expect(p.recreation.tolerance.chemical).toBeGreaterThan(0);roundTrip(w);
});

test('cancelling a held beer returns the same unit without alcohol, and future fields never enter264',()=>{
 const {w,p,source}=scene();expect(applyCommand(w,{type:'order-consume',pawnId:p.id,pileId:source.id,queue:false}).ok).toBe(true);until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest');const held=w.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id)!;
 expect(validAlcoholWorld265(w,264)).toBe(false);expect(applyCommand(w,{type:'clear-orders',pawnId:p.id}).ok).toBe(true);expect(w.piles.find(q=>q.id===held.id)?.owner.type).toBe('ground');expect(p.health?.alcohol).toBeUndefined();expect(w.piles.reduce((n,q)=>n+q.quantity,0)).toBe(3);roundTrip(w);
});

test('inventory policy moves three real beers at contact without a drink, then addiction consumes one of the owned units',()=>{
 const {w,p}=scene(5);w.drugPolicies=initialDrugPolicies265();w.nextDrugPolicyId=5;p.drugPolicyId=4;Object.assign(w.drugPolicies[3]!.beer,{allowScheduled:false,allowedForJoy:false,allowedForAddiction:true,takeToInventory:3});
 until(w,()=>w.piles.some(q=>q.item==='beer'&&q.quantity===3&&q.owner.type==='inventory'&&q.owner.pawnId===p.id));expect(p.health?.alcohol).toBeUndefined();expect(w.piles.filter(q=>q.item==='beer').reduce((n,q)=>n+q.quantity,0)).toBe(5);roundTrip(w);
 p.health??=createMedicalRecord(w.tick);ingestAlcoholDose265(p.health,1,w.tick,noRisk);p.health.alcohol!.addiction={severity:f(.5),need:0};const doseAt=p.health.alcohol!.lastDoseTick;
 until(w,()=>p.health!.alcohol!.lastDoseTick>doseAt);expect(w.piles.filter(q=>q.item==='beer').reduce((n,q)=>n+q.quantity,0)).toBe(4);expect(p.health.alcohol!.addiction!.need).toBeGreaterThan(0);roundTrip(w);
});

test('caravan drinking shares another true carrier inventory and debits that carrier mass plus the existing effects ledger',()=>{
 const w=medicalCamp(2),p=w.pawns[0]!,carrier=w.pawns[1]!;let tick=w.tick;for(;tick<w.tick+20;tick++)if(groupPawnInterval256(p.id,tick*10,150,10))break;expect(tick).toBeLessThan(w.tick+20);
 p.drugPolicyId=2;p.health=createMedicalRecord(tick);ingestAlcoholDose265(p.health,1,tick,noRisk);p.health.alcohol!.addiction={severity:f(.5),need:0};
 // Isolated admitted-owner port fixture; Root's caravan test owns complete
 // departure/reformation/receipt validation around this kernel.
 const source={id:w.nextId++,kind:'beer' as const,item:'beer' as const,quantity:2,owner:{type:'inventory' as const,pawnId:carrier.id}};
 const group={id:40,members:[p,carrier],items:[source],lastPersonalTick:tick,reorganization:{inventoryEffects:{}}} as unknown as Parameters<typeof advanceGroupAlcohol265>[0];
 const result=advanceGroupAlcohol265(group,{tick,schemaVersion:265,drugPolicies:initialDrugPolicies265(),onlyPerson256:p,resting:false,core256:{tick:tick*10,delta:10},random:noRisk,notice:()=>{}});
 expect(result).toEqual({massRemovedGrams:300,removed:[{pawnId:carrier.id,grams:300}]});expect(source.quantity).toBe(1);expect(source.owner.pawnId).toBe(carrier.id);expect(group.reorganization!.inventoryEffects!.beer).toBe(-1);expect(p.health.alcohol!.addiction!.need).toBeGreaterThan(0);
});
