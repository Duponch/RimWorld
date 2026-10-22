import {expect,test} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {readAnimalTraining282} from '../src/sim/animal-training-282.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';

test('one original learns three Obedience and seven Haul lessons with real finite food, needs and cooldown, then physically deposits wood',()=>{
 const f=animalHaulingCamp459(),resume=process.env.V459_LOOP_RESUME,retained=resume?JSON.parse(readFileSync(resume+'/stage.json','utf8')):undefined;
 const w=resume?deserializeWorld(readFileSync(resume+'/diagnostic.json','utf8')):f.world;
 const a=w.wildlife!.animals.find(a=>a.id===f.animalId)!,p=w.pawns.find(p=>p.id===f.handlerId)!,folder='artifacts/animal-hauling-v459';
 const checkpoints:Record<string,{path:string;tick:number;sha256:string}>=retained?.checkpoints??{},attempts:unknown[]=retained?.attempts??[];
 const save=(name:string)=>{
  expect(validateWorld(w),name).toEqual([]);
  const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw)),name+' full reload').toBe(raw);
  writeTestFileSync(`${folder}/${name}.json`,raw);checkpoints[name]={path:testOutputPath(`${folder}/${name}.json`),tick:w.tick,sha256:createHash('sha256').update(raw).digest('hex')};
  if(name==='carrying'||name==='resumed-carrying'){
   const encoder=new SnapshotEncoder(),strict=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
   const packet=structuredClone(encoder.encode(w,0,0)),one=strict.adopt(structuredClone(packet)),two=resident.adopt(structuredClone(packet));
   expect(one.status,one.status==='resync'?one.reason:'actual cargo strict').toBe('applied');expect(two.status,two.status==='resync'?two.reason:'actual cargo resident').toBe('applied');
   if(one.status!=='applied'||two.status!=='applied')throw Error('Actual earned carry publication refused');
   expect(one.world).toEqual(two.world);const retainedOne=structuredClone(one.world),retainedTwo=structuredClone(two.world);
   const good=structuredClone(encoder.encode(w,0,0)),bad=structuredClone(good);
   bad.world.wildlife!.animals.find(q=>q.id===a.id)!.haul!.carryPileId=w.nextId-1;
   expect(strict.adopt(structuredClone(bad)).status).toBe('resync');expect(resident.adopt(bad).status).toBe('resync');
   expect(one.world).toEqual(retainedOne);expect(two.world).toEqual(retainedTwo);
   expect(strict.adopt(structuredClone(good)).status).toBe('applied');expect(resident.adopt(good).status).toBe('applied');
  }
 };
 let stage='before',lastAttempt:number|undefined=resume?a.training?.lastAttemptCore:undefined,sawCarry=false,learnedAt:number|undefined=resume?checkpoints.learned?.tick:undefined;
 try{
  if(!resume){save('before');expect(applyCommand(w,{type:'animal-training',animalId:a.id,skill:'haul',wanted:true})).toMatchObject({ok:true,affected:1});save('requested');}
  else {expect(retained.stage).toBe('attempt-10');expect(w.tick).toBe(22953);expect(attempts).toHaveLength(10);save('resumed-carrying');}
  for(let i=0;i<40000;i++){
   stepWorld(w);
   const t=p.animalHandling;
   if(t?.kind==='train'&&t.phase==='interact'&&t.progress>0&&!checkpoints['first-working'])save('first-working');
   if(t?.kind==='train'&&(t.step===2||t.step===4)&&t.progress>0&&!checkpoints['first-feed'])save('first-feed');
   if(a.training?.lastAttemptCore!==undefined&&a.training.lastAttemptCore!==lastAttempt){
    lastAttempt=a.training.lastAttemptCore;stage=`attempt-${attempts.length+1}`;
    attempts.push({tick:w.tick,attemptCore:lastAttempt,obedience:readAnimalTraining282(a,'obedience'),haul:readAnimalTraining282(a,'haul'),foodLeft:w.piles.filter(q=>q.item==='kibble').reduce((n,q)=>n+q.quantity,0),handlerXp:structuredClone(p.skills.animals),service:structuredClone(t)});
    save(stage);
   }
   if(readAnimalTraining282(a,'haul').steps===6&&!p.animalHandling&&!checkpoints['before-last-lesson'])save('before-last-lesson');
   if(readAnimalTraining282(a,'haul').learned&&learnedAt===undefined){learnedAt=w.tick;save('learned');}
   if(a.haul?.phase==='deliver'&&!sawCarry){sawCarry=true;save('carrying');}
   const wood=w.piles.filter(q=>q.item==='wood');
   if(learnedAt!==undefined&&wood.length&&wood.every(q=>{const owner=q.owner;return owner.type==='ground'&&w.stockpiles.some(s=>s.x===owner.x&&s.z===owner.z);})){stage='after';save('after');break;}
  }
  expect(stage,JSON.stringify({tick:w.tick,animal:a,handler:p})).toBe('after');
  expect(readAnimalTraining282(a,'obedience')).toMatchObject({steps:3,learned:true});
  expect(readAnimalTraining282(a,'haul')).toMatchObject({steps:7,learned:true});
  expect(attempts.length).toBeGreaterThanOrEqual(10);expect(sawCarry).toBe(true);expect(checkpoints['before-last-lesson']).toBeDefined();
  expect(w.piles.filter(q=>q.item==='wood').reduce((n,q)=>n+q.quantity,0)).toBe(20);
  expect(w.piles.filter(q=>q.item==='kibble').reduce((n,q)=>n+q.quantity,0)).toBeLessThan(120);
  expect(a.id).toBe(f.animalId);expect(a.startingPet).toBeUndefined();
  writeTestFileSync(`${folder}/manifest.json`,JSON.stringify({version:459,schemaVersion:282,checkpoints,attempts,learnedAt,toTick:w.tick,handlerId:p.id,animalId:a.id,woodId:f.woodId,preparation:f.preparation,...resume?{resumedFrom:resume,retainedXpLimit:'First report accidentally retained a skill object reference in its attempt list; those repeated XP values are final diagnostic values, not per-attempt measurements. Original full attempt checkpoints retain the authoritative skill states.'}:{},authority:'Node engine earned all lessons and physical transport using the finite BEFORE property. Native may resume before-last-lesson and earn its own final lesson and cargo; it must not claim a native zero-to-seven chain.'},null,2)+'\n');
 }finally{
  writeTestFileSync(`${folder}/diagnostic.json`,JSON.stringify(w));writeTestFileSync(`${folder}/stage.json`,JSON.stringify({stage,tick:w.tick,attempts,checkpoints})+'\n');
 }
},120000);
