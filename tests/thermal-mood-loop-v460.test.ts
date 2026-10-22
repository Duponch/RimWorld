import {expect,test} from 'vitest';
import {createHash} from 'node:crypto';
import {thermalMoodCamp460} from './scenarios/thermal-mood-v460.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {moodThoughts,moodTarget} from '../src/sim/mood.ts';
import {temperatureAt} from '../src/sim/temperature.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';

test('a paid physical cooler removes a current hot thought without setting mood, and its whole acquired work and relief reload',()=>{
 const f=thermalMoodCamp460(),w=f.world,p=w.pawns.find(q=>q.id===f.pawnId)!,folder='artifacts/thermal-mood-v460';
 const checkpoints:Record<string,{path:string;tick:number;sha256:string}>={};let stage='before';
 const thermal=()=>moodThoughts(w,p).filter(t=>t.id==='environment-hot'||t.id==='environment-cold');
 const save=(name:string)=>{
  writeTestFileSync(`${folder}/${name}-diagnostic.json`,JSON.stringify(w));
  expect(validateWorld(w),name).toEqual([]);const raw=serializeWorld(w);
  expect(serializeWorld(deserializeWorld(raw)),name+' whole reload').toBe(raw);
  writeTestFileSync(`${folder}/${name}.json`,raw);checkpoints[name]={path:testOutputPath(`${folder}/${name}.json`),tick:w.tick,sha256:createHash('sha256').update(raw).digest('hex')};
 };
 try{
  save('before');expect(temperatureAt(w,p)).toBe(35);expect(thermal()).toMatchObject([{id:'environment-hot',offset:-4}]);expect(p.health?.heatstroke??0).toBe(0);
  const moodBefore=p.mood;expect(applyCommand(w,{type:'designate',kind:'passive-cooler',material:'wood',...f.coolerCell}).ok).toBe(true);expect(p.mood).toBe(moodBefore);save('ordered');
  stage='paid-work';for(let i=0;i<1200&&!w.jobs.some(j=>j.kind==='passive-cooler'&&j.construction==='frame'&&j.progress>0);i++)stepWorld(w);
  expect(w.jobs.some(j=>j.kind==='passive-cooler'&&j.construction==='frame'&&j.progress>0),JSON.stringify({tick:w.tick,jobs:w.jobs,pawn:p})).toBe(true);
  expect(w.structures.some(s=>s.kind==='passive-cooler')).toBe(false);save('actual-work');
  stage='cooling';for(let i=0;i<1200&&!w.structures.some(s=>s.kind==='passive-cooler');i++)stepWorld(w);
  const cooler=w.structures.find(s=>s.kind==='passive-cooler');expect(cooler).toBeDefined();expect(cooler!.fuel!.ticks).toBeGreaterThan(0);save('built');
  for(let i=0;i<1200&&thermal().some(t=>t.id==='environment-hot');i++)stepWorld(w);
  expect(thermal()).toEqual([]);expect(temperatureAt(w,p)).toBeLessThanOrEqual(26);expect(temperatureAt(w,p)).toBeGreaterThanOrEqual(16);
  expect(p.mood).toBeLessThan(moodBefore);expect(p.mood).not.toBe(moodTarget(moodThoughts(w,p)));
  expect(w.jobs.filter(j=>j.kind==='passive-cooler')).toHaveLength(0);expect(w.piles.filter(q=>q.item==='wood').reduce((n,q)=>n+q.quantity,0)).toBe(25);
  stage='relieved';save('relieved');
  const encoder=new SnapshotEncoder(),strict=new SnapshotDecoder(),resident=new ResidentPresentationAssembler(),packet=encoder.encode(w,0,0);
  const a=strict.adopt(structuredClone(packet)),b=resident.adopt(structuredClone(packet));expect(a.status).toBe('applied');expect(b.status).toBe('applied');
  if(a.status!=='applied'||b.status!=='applied')throw Error('Actual cooling publication refused');expect(a.world).toEqual(b.world);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,20);stepWorld(resumed,20);expect(resumed).toEqual(w);save('continued');
  writeTestFileSync(`${folder}/manifest.json`,JSON.stringify({version:460,schemaVersion:w.schemaVersion,checkpoints,pawnId:p.id,coolerId:cooler!.id,preparation:f.preparation,final:{tick:w.tick,temperature:temperatureAt(w,p),mood:p.mood,target:moodTarget(moodThoughts(w,p))}},null,2)+'\n');
 }finally{writeTestFileSync(`${folder}/diagnostic.json`,JSON.stringify(w));writeTestFileSync(`${folder}/stage.json`,JSON.stringify({stage,tick:w.tick,checkpoints})+'\n');}
},30000);
