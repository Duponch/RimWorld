import {describe,it,expect} from 'vitest';
import {animalShape256,animalShapeFamily256,cachedAnimalShape256} from '../src/render/animal-shape-v256.ts';
import {animalCore256} from '../src/sim/animal-core-v256.ts';
import {CORE_ANIMAL_BODIES_256} from '../src/sim/animal-anatomy-data-v256.ts';
import {animalPartId256} from '../src/sim/animal-anatomy-v256.ts';
import {animalLifeStage} from '../src/sim/animal-life.ts';
import {structureRoomMarketValue,structureRoomStandable} from '../src/sim/room-market-value.ts';
import {buildingLabels} from '../src/ui/building-labels.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import type {Structure} from '../src/sim/types.ts';

const insects=['megascarab','spelopede','megaspider'] as const;
describe('completed Hive reader and original resident-shape bindings',()=>{
 it('binds all six real legs and each visible detail to the actual insect anatomy',()=>{
  const silhouettes=new Set<string>();
  for(const species of insects){
   const shape=animalShape256(species),body=animalCore256(species).race.body,rows=CORE_ANIMAL_BODIES_256[body];
   const ids=new Set(rows.map(row=>animalPartId256(body,row.index))),legs=rows.filter(row=>row.defId==='InsectLeg');
   expect(animalShapeFamily256(species)).toBe('insect');expect(legs).toHaveLength(6);
   for(const row of legs){const rendered=shape.parts.filter(p=>p.bodyPart===animalPartId256(body,row.index));expect(rendered).toHaveLength(2);expect(rendered.every(p=>p.bone===1||p.bone===2)).toBe(true);}
   for(const p of shape.parts){expect(ids.has(p.bodyPart!)).toBe(true);expect([...p.size,...p.center,...p.pivot].every(Number.isFinite)).toBe(true);expect(p.size.every(n=>n>0)).toBe(true);}
   for(const ring of shape.rings)expect(ids.has(ring.part!)).toBe(true);
   silhouettes.add(JSON.stringify(shape));expect(cachedAnimalShape256(species)).toBe(cachedAnimalShape256(species));
  }
  expect(silhouettes.size).toBe(3);
 });
 it('maps real larva, juvenile and adult growth stages without changing absent historical growth',()=>{
  for(const species of insects){
   const a:WildAnimal={id:17,species,sex:'female',ageTicks:0,ageCoreRemainder:0,x:1,z:1,food:0,rest:1,state:'idle',path:[],nextDecision:1,growthTracker:{revision:1,value:0,nextCheckCore:240}};
   expect(animalLifeStage(a)).toBe('baby');a.growthTracker!.value=Math.fround(.5);expect(animalLifeStage(a)).toBe('juvenile');a.growthTracker!.value=1;expect(animalLifeStage(a)).toBe('adult');
  }
  const old:WildAnimal={id:18,species:'hare',sex:'male',ageTicks:0,x:1,z:1,food:0,rest:1,state:'idle',path:[],nextDecision:1};
  const before=JSON.stringify(old);expect(animalLifeStage(old)).toBe('baby');expect(JSON.stringify(old)).toBe(before);
 });
 it('uses explicit GlowPod value50, calculated Hive value0 and real health depreciation',()=>{
  const hive:Structure={id:21,kind:'insect-hive',x:1,z:1,orientation:0,footprint:'standard'},pod:Structure={...hive,id:22,kind:'glow-pod'};
  expect(structureRoomMarketValue(hive)).toBe(0);expect(structureRoomMarketValue(pod)).toBe(50);
  pod.damage=25;expect(structureRoomMarketValue(pod)).toBe(5);
  expect(structureRoomStandable(hive.kind)).toBe(false);expect(structureRoomStandable(pod.kind)).toBe(false);
  expect(buildingLabels[hive.kind]).toBe('Ruche souterraine');expect(buildingLabels[pod.kind]).toBe('Poche luminescente');
  expect(structureRoomMarketValue({id:23,kind:'ship-chunk',x:1,z:1,orientation:0,footprint:'standard'})).toBe(470);
 });
});
