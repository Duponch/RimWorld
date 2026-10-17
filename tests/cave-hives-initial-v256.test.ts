import {describe,it,expect} from 'vitest';
import {caveHivePlacement256} from '../src/sim/cave-hive-placement-256.ts';
import {constructHiveInsect256} from '../src/sim/cave-insect-constructor-256.ts';
import {CAVE_INSECT_DATA_256,CAVE_INSECT_BODIES_256} from '../src/sim/cave-insect-data-256.ts';
import {validCaveHiveBuilding256,validHiveInsectField256,validDetachedHiveInsect256,validHiveLordHeader256} from '../src/sim/cave-hive-save-256.ts';
import {initialWorldGoodwill256} from '../src/sim/world-faction-catalog.ts';
const random=()=>{const calls:string[]=[];return {calls,value:()=>{calls.push('value');return .25;},integer:(a:number,_b:number)=>{calls.push('integer');return a;},float:(a:number,b:number)=>{calls.push('float');return Math.fround((Math.fround(a)+Math.fround(b))/2);}};};
const placement=(allowCaveHives=true,insectFactionId:number|null=7,cave=1)=>({width:40,height:40,elevation:new Float32Array(1600).fill(1),caves:new Float32Array(1600).fill(cave),allowCaveHives,insectFactionId,hasFactionThing:()=>false,available:(_cell:number)=>true});
describe('prospective CaveHives initial owner; runtime not activated',()=>{
 it('disabled/faction-absent gates spend no draw, zero caves still RoundRandom once',()=>{
  for(const args of [placement(false),placement(true,null)]){const r=random();expect(caveHivePlacement256(args,r).next().done).toBe(true);expect(r.calls).toEqual([]);}
  const r=random();expect(caveHivePlacement256(placement(true,7,0),r).next().done).toBe(true);expect(r.calls).toEqual(['value']);
 });
 it('requires the actual commit between the two selected placements',()=>{
  const r=random(),p=placement(),committed=new Set<number>();let afterFirst=0;p.available=cell=>{if(committed.size)afterFirst++;return !committed.has(cell);};
  const g=caveHivePlacement256(p,r),a=g.next();expect(a.done).toBe(false);if(a.done)throw Error('First placement missing');committed.add(a.value);
  const b=g.next(a.value);expect(b.done).toBe(false);if(b.done)throw Error('Second placement missing');expect(b.value).not.toBe(a.value);expect(afterFirst).toBeGreaterThan(0);expect(g.next(b.value).done).toBe(true);
  const rejected=caveHivePlacement256(placement(),random());expect(rejected.next().done).toBe(false);expect(()=>rejected.next()).toThrow('real committed');
 });
 it('constructs the actual fixed adult kinds with their native anatomy and no initial clinical reroll',()=>{
  for(const species of ['megascarab','spelopede','megaspider'] as const){const r=random(),out=constructHiveInsect256({species,id:21,cell:{x:12,z:14},tick:19,random:r,unspawnedAnimals:[]});expect(out.status).toBe('ready');if(out.status!=='ready')throw Error(out.reason);
   const fact=CAVE_INSECT_DATA_256[species],core=Math.trunc(Math.fround(Math.fround(fact.lifeStages.at(-1)!.minAgeYears)*3600000));expect(out.animal.ageTicks*10+(out.animal.ageCoreRemainder??0)).toBe(core);
   expect(out.animal.growthTracker).toEqual({revision:1,value:1,nextCheckCore:430});expect(out.animal.health).toBeUndefined();expect(out.animal.hive).toBeUndefined();expect(out.animal.id).toBe(21);expect(out.animal.x).toBe(12);
   expect(r.calls).toEqual(['value','float','float','value','value','integer','float','float','value']);expect(CAVE_INSECT_BODIES_256[fact.race.body].length).toBeGreaterThan(19);
   expect(JSON.parse(JSON.stringify(out.animal))).toEqual(out.animal);
   const refused=random();expect(constructHiveInsect256({species,id:22,cell:{x:12,z:14},tick:19,random:refused,unspawnedAnimals:[out.animal]}).status).toBe('blocked');expect(refused.calls).toHaveLength(0);
  }
 });
 it('keeps GlowPod age=-1, exact rare ID phase and historical/future field refusals',()=>{
  const pod={id:31,kind:'glow-pod',x:2,z:3,orientation:0,footprint:'standard',factionId:7,glowPod:{revision:1,madeAtCore:0,ageCore:-1}},h={width:32,height:32,tick:0,nextId:40};
  expect(validCaveHiveBuilding256(pod,256,h)).toBe(true);expect(validCaveHiveBuilding256(pod,255,h)).toBe(false);expect(validCaveHiveBuilding256({...pod,glowPod:{...pod.glowPod,ageCore:0}},256,h)).toBe(false);
  expect(validCaveHiveBuilding256({...pod,glowPod:{...pod.glowPod,ageCore:249}},256,{...h,tick:4})).toBe(true);expect(validCaveHiveBuilding256({...pod,glowPod:{...pod.glowPod,ageCore:249}},256,{...h,tick:3})).toBe(false);
  expect(validCaveHiveBuilding256({kind:'wall',caveHive:undefined},255,h)).toBe(false);
 });
 it('bounds exact Lord/membership references and detached originals without creating owners',()=>{
  const animal={species:'megascarab',hive:{factionId:7,lordId:null,spawnerId:null}};expect(validHiveInsectField256(animal,256,50)).toBe(true);expect(validDetachedHiveInsect256(animal,256,50)).toBe(true);expect(validDetachedHiveInsect256({...animal,hive:{...animal.hive,lordId:30}},256,50)).toBe(false);
  expect(validHiveInsectField256(animal,255,50)).toBe(false);expect(validHiveInsectField256({species:'hare',hive:undefined},256,50)).toBe(false);
  const lord={id:30,factionId:7,aggressive:false,phase:'defend-expand',lastHarmCore:0,memberIds:[21],assignedHives:[{pawnId:21,hiveId:20}]};expect(validHiveLordHeader256({hiveLords:[lord]},256,50,0)).toBe(true);expect(validHiveLordHeader256({hiveLords:[{...lord,id:0}]},256,50,0)).toBe(true);expect(validHiveLordHeader256({hiveLords:[{...lord,id:1000}]},256,50,0)).toBe(true);expect(validHiveLordHeader256({hiveLords:[lord,lord]},256,50,0)).toBe(false);expect(validHiveLordHeader256({hiveLords:undefined},256,50,0)).toBe(false);
 });
 it('distinguishes Core present-empty Insect exceptions from absent civil exceptions',()=>{
  expect(initialWorldGoodwill256('Insect','PlayerColony')).toBe(-100);expect(initialWorldGoodwill256('Insect','OutlanderCivil')).toBe(-100);expect(initialWorldGoodwill256('Insect','Ancients')).toBe(-100);expect(initialWorldGoodwill256('OutlanderCivil','PlayerColony')).toBe(0);
 });
});
