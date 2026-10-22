import {expect,test} from 'vitest';
import {medicalCamp,controlledInjury} from './scenarios/health.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {thermalMoodStage460,thermalMoodThoughts460} from '../src/sim/thermal-mood-v460.ts';
import {moodThoughts,personalMoodThoughts,moodTarget,moodFrozen,updateMood} from '../src/sim/mood.ts';
import {moodInspectionView} from '../src/ui/mood-inspection.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {comfortableTemperature} from '../src/sim/heat-rules.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {reconcilePawnHealth} from '../src/sim/health.ts';
import {pawnBody} from '../src/sim/health-rules.ts';
import {reconcileTemperature,temperatureAt} from '../src/sim/temperature.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {MaterialPile,Pawn,Structure,World} from '../src/sim/types.ts';
import type {ApparelItem} from '../src/sim/apparel-rules.ts';

const thermal=<T extends {id:string}>(rows:readonly T[]):T[]=>rows.filter(t=>t.id==='environment-cold'||t.id==='environment-hot');

/** Declared32² read/clinical fixture, not played construction, generation or
 * natural weather. The existing colony has a physically enclosed roofed room
 * and its actual thermal region; its air is prepared explicitly per case.
 * No seed search, cosmetic body, fake temperature reader or RNG reset. */
function room(airTemperature=21){
 const w=medicalCamp(2,32),p=w.pawns[0]!,other=w.pawns[1]!;
 Object.assign(p,{x:6,z:6,hunger:80,rest:80,comfort:50,beauty:50,mood:83.25});p.recreation.level=50;p.apparelAutomation=false;
 delete p.health;delete p.traits;delete p.background;w.piles=[];w.resources=[];
 for(let z=4;z<=9;z++)for(let x=4;x<=9;x++)if(x===4||x===9||z===4||z===9)fixtureBuilding(w,'wall',x,z);
 const roof:number[]=[];for(let z=5;z<=8;z++)for(let x=5;x<=8;x++)roof.push(z*w.width+x);
 w.roofing={constructed:roof,build:[],remove:[],cursor:0};reconcileTemperature(w);
 const air=w.thermal?.regions.find(r=>r.cells.includes(p.z*w.width+p.x));if(!air)throw Error('The actual prepared room must own its thermal air');
 air.temperature=airTemperature;return {w,p,other,air};
}
function garment(w:World,p:Pawn,item:ApparelItem,owner:MaterialPile['owner']={type:'apparel',pawnId:p.id}){
 const id=w.nextId;addMaterial(w,'apparel',1,owner,item);const piece=w.piles.find(i=>i.id===id);if(!piece?.apparel)throw Error('Actual apparel producer expected');return piece;
}
const currentThermal=(w:World,p:Pawn)=>thermal(moodThoughts(w,p));
const noAirRead=()=>{throw Error('This owner must not sample map air');};

test('the two situation workers have exact0/10/20/30 boundaries, one stage per family and no memory or mutable inputs',()=>{
 const range={min:16,max:26},before=JSON.stringify(range);
 // These offsets and strict boundaries are the independently read Core
 // worker/XML rules, not an implementation-derived expected-stage helper.
 for(const [gap,stage,offset] of [[-.001,-1,0],[0,-1,0],[.001,0,-4],[9.999,0,-4],[10,1,-8],[19.999,1,-8],[20,2,-12],[29.999,2,-12],[30,3,-16],[80,3,-16]] as const){
  expect(thermalMoodStage460(gap),`gap ${gap}`).toBe(stage);
  for(const [air,id] of [[16-gap,'environment-cold'],[26+gap,'environment-hot']] as const){
   const rows=thermalMoodThoughts460(air,range);expect(rows,`${id}, gap ${gap}`).toHaveLength(stage<0?0:1);
   if(stage>=0){expect(rows[0]).toMatchObject({id,offset,kind:'situation'});expect(rows[0]!.expiresAt).toBeUndefined();expect(Object.isFrozen(rows[0])).toBe(true);}
  }
 }
 expect(thermalMoodThoughts460(21,range)).toEqual([]);expect(JSON.stringify(range)).toBe(before);
});

test('real room air changes the current mood thought and UI target immediately without moving the mood gauge or writing the World',()=>{
 const {w,p,air}=room(11),mood=p.mood,before=JSON.stringify(w),rng=w.rng;
 expect(temperatureAt(w,p)).toBe(11);expect(currentThermal(w,p)).toEqual([expect.objectContaining({id:'environment-cold',label:'Un peu froid',offset:-4})]);
 const first=moodInspectionView(w,p),cold=first.thoughts.find(t=>t.id==='environment-cold')!;
 expect(cold).toMatchObject({label:'Un peu froid',offset:-4,display:'-4'});expect(cold.tooltip).toContain('hypothermie');
 expect(first.target).toBe(moodTarget(moodThoughts(w,p)));expect(first.current).toBe(mood);expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);
 air.temperature=36;const hotBefore=JSON.stringify(w),hot=moodInspectionView(w,p);
 expect(thermal(hot.thoughts)).toEqual([expect.objectContaining({id:'environment-hot',label:'Chaud',offset:-8,display:'-8'})]);
 expect(hot.thoughts.some(t=>t.id==='environment-cold')).toBe(false);expect(hot.current).toBe(mood);expect(JSON.stringify(w)).toBe(hotBefore);
 const targetWithoutHeat=moodTarget(moodThoughts(w,p).filter(t=>t.id!=='environment-hot'));expect(hot.target).toBe(targetWithoutHeat-8);
 updateMood(w,p);expect(p.mood).toBeCloseTo(mood-.032,10);expect(p.mood).not.toBe(hot.target);
 air.temperature=21;expect(currentThermal(w,p)).toEqual([]);expect(p.health).toBeUndefined();expect(p.memories).toEqual([]);expect(w.rng).toBe(rng);
});

test('only the same physical garments actually worn by this person insulate, with quality, additive layers and no hit-point insulation penalty',()=>{
 const {w,p,other,air}=room(-18),parka=garment(w,p,'cloth-parka',{type:'ground',x:7,z:6});
 expect(currentThermal(w,p)).toEqual([expect.objectContaining({id:'environment-cold',offset:-16})]);
 parka.owner={type:'apparel',pawnId:other.id};expect(currentThermal(w,p)[0]?.offset).toBe(-16);
 // Prepared ownership changes exercise public mutable reads of the original
 // item, not a claim that this unit test played wearing/removal commands.
 parka.owner={type:'apparel',pawnId:p.id};expect(comfortableTemperature(w,p)).toEqual({min:-20,max:26});expect(currentThermal(w,p)).toEqual([]);
 parka.apparel!.quality='awful';expect(currentThermal(w,p)).toEqual([expect.objectContaining({offset:-4})]);
 parka.apparel!.hitPoints=1;expect(currentThermal(w,p)[0]?.offset).toBe(-4);expect(moodThoughts(w,p).some(t=>t.id==='tattered-apparel')).toBe(true);
 parka.apparel!.quality='legendary';expect(currentThermal(w,p)).toEqual([]);
 parka.apparel!.quality='normal';air.temperature=-30;expect(currentThermal(w,p)[0]?.offset).toBe(-8);
 const hat=garment(w,p,'muffalo-wool-tuque');expect(hat.owner).toEqual({type:'apparel',pawnId:p.id});expect(comfortableTemperature(w,p).min).toBe(-34);expect(currentThermal(w,p)).toEqual([]);
 parka.owner={type:'ground',x:7,z:6};hat.owner={type:'ground',x:8,z:6};air.temperature=41;
 expect(currentThermal(w,p)[0]?.offset).toBe(-8);const duster=garment(w,p,'cloth-duster');expect(comfortableTemperature(w,p).max).toBeCloseTo(41.3,10);expect(currentThermal(w,p)).toEqual([]);
 duster.owner={type:'ground',x:7,z:7};expect(currentThermal(w,p)[0]?.offset).toBe(-8);
});

test('awake medical rest and a genuinely conscious person downed by leg injuries still sense air and integrate mood',()=>{
 const {w,p}=room(56);const bed:Structure=fixtureBuilding(w,'bed',p.x,p.z);bed.medical=true;
 p.state='resting';p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:bed.x,z:bed.z},medical:'patient'};
 expect(moodFrozen(p)).toBe(false);expect(currentThermal(w,p)[0]?.offset).toBe(-16);const mood=p.mood;updateMood(w,p);expect(p.mood).toBeLessThan(mood);
 p.need=null;p.state='idle';controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);
 expect(p.state).toBe('downed');expect(pawnBody(p).canBeAwake).toBe(true);expect(moodFrozen(p)).toBe(false);expect(currentThermal(w,p)[0]?.offset).toBe(-16);
 const before=p.mood;updateMood(w,p);expect(p.mood).toBeLessThan(before);
});

test('sleep and lost awareness freeze integration while the situation reader and UI still describe the actual environment',()=>{
 const {w,p}=room(-14),bed=fixtureBuilding(w,'bed',p.x,p.z);p.state='sleeping';p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:bed.x,z:bed.z}};
 let before=JSON.stringify(w);expect(currentThermal(w,p)[0]?.offset).toBe(-16);expect(thermal(moodInspectionView(w,p).thoughts)[0]?.offset).toBe(-16);expect(JSON.stringify(w)).toBe(before);
 expect(moodFrozen(p)).toBe(true);updateMood(w,p,undefined,undefined,noAirRead);expect(JSON.stringify(w)).toBe(before);
 p.state='resting';p.medicalSleep=true;before=JSON.stringify(w);expect(currentThermal(w,p)[0]?.offset).toBe(-16);updateMood(w,p,undefined,undefined,noAirRead);expect(JSON.stringify(w)).toBe(before);
 delete p.medicalSleep;p.need=null;p.health=createMedicalRecord(w.tick);p.health.heatstroke=700_000_000;reconcilePawnHealth(w,p);
 expect(p.state).toBe('downed');expect(pawnBody(p).canBeAwake).toBe(false);expect(moodFrozen(p)).toBe(true);
 before=JSON.stringify(w);expect(currentThermal(w,p)[0]?.offset).toBe(-16);updateMood(w,p,undefined,undefined,noAirRead);expect(JSON.stringify(w)).toBe(before);
});

test('held owner records ignore injected current air and dead actors expose no thermal thought or newly sampled map temperature',()=>{
 const {w,p}=room(86);
 // Detached owner projections test the exact held branch without inventing a
 // fake map, a complete holder campaign or an acquisition/entry history.
 for(const marker of ['cryptosleepHeldAt271','shipCryptosleepHeldAt277'] as const){
  const held:Pawn={...p,[marker]:w.tick},before=JSON.stringify(held),worldBefore=JSON.stringify(w);
  expect(thermal(moodThoughts(w,held,undefined,noAirRead))).toEqual([]);
  expect(thermal(personalMoodThoughts(held,{tick:w.tick,people:new Map(),items:w.piles,difficultyMood:0,ambientTemperature460:-200}))).toEqual([]);
  expect(moodFrozen(held)).toBe(true);updateMood(w,held,undefined,undefined,noAirRead);expect(JSON.stringify(held)).toBe(before);expect(JSON.stringify(w)).toBe(worldBefore);
 }
 controlledInjury(w,p,'heart',15000);expect(p.state).toBe('dead');const before=JSON.stringify(w);
 expect(moodThoughts(w,p,undefined,noAirRead)).toEqual([]);expect(moodInspectionView(w,p).thoughts).toEqual([]);expect(moodInspectionView(w,p).thresholds).toEqual([]);
 updateMood(w,p,undefined,undefined,noAirRead);expect(JSON.stringify(w)).toBe(before);
});

test('residual hypothermia or heatstroke does not invent a current sensation at comfortable air, and removing a sensation consumes no treatment',()=>{
 const {w,p,air}=room(21);p.health=createMedicalRecord(w.tick);p.health.hypothermia=350_000_000;p.health.heatstroke=200_000_000;
 const medical=JSON.stringify(p.health),before=JSON.stringify(w),memories=JSON.stringify(p.memories);
 expect(currentThermal(w,p)).toEqual([]);expect(thermal(moodInspectionView(w,p).thoughts)).toEqual([]);expect(JSON.stringify(w)).toBe(before);
 air.temperature=6;expect(currentThermal(w,p)).toEqual([expect.objectContaining({id:'environment-cold',offset:-8})]);
 air.temperature=46;expect(currentThermal(w,p)).toEqual([expect.objectContaining({id:'environment-hot',offset:-12})]);
 air.temperature=21;expect(currentThermal(w,p)).toEqual([]);expect(JSON.stringify(p.health)).toBe(medical);expect(JSON.stringify(p.memories)).toBe(memories);
 expect(w.piles.some(i=>i.kind==='medicine')).toBe(false);
});

test('old schemas retain their old thoughts, current live callbacks match real air, and repeated current reads preserve the entire save and every RNG',()=>{
 const {w,p,air}=room(46);garment(w,p,'cloth-shirt');
 expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w),json=JSON.stringify(w),rng=w.rng;
 let reads=0;const read=()=>{reads++;return temperatureAt(w,p);};
 const direct=moodThoughts(w,p),injected=moodThoughts(w,p,undefined,read);expect(injected).toEqual(direct);expect(reads).toBe(1);
 for(let i=0;i<3;i++){moodThoughts(w,p);moodInspectionView(w,p);}
 expect(serializeWorld(w)).toBe(raw);expect(JSON.stringify(w)).toBe(json);expect(w.rng).toBe(rng);expect(w.schemaVersion).toBe(282);
 const copy=deserializeWorld(raw);expect(serializeWorld(copy)).toBe(raw);expect(moodInspectionView(copy,copy.pawns.find(x=>x.id===p.id)!)).toEqual(moodInspectionView(w,p));
 for(const version of [74,271,281,283]){
  const historical={...w,schemaVersion:version} as unknown as World,before=JSON.stringify(historical);
  expect(thermal(moodThoughts(historical,p,undefined,noAirRead))).toEqual([]);expect(thermal(moodInspectionView(historical,p).thoughts)).toEqual([]);expect(JSON.stringify(historical)).toBe(before);
 }
 air.temperature=21;const fresh=JSON.stringify(w);expect(currentThermal(w,p)).toEqual([]);expect(JSON.stringify(w)).toBe(fresh);
});
