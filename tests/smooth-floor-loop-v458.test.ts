import {expect,test} from 'vitest';
import {createHash} from 'node:crypto';
import {smoothFloorCamp458} from './scenarios/smooth-floor-v458.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {workProgress} from '../src/sim/work-progress.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';
import type {Command,World} from '../src/sim/types.ts';

const units=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const command=(w:World,c:Command)=>{const r=applyCommand(w,c);expect(r.ok,r.reason).toBe(true);};
function until(w:World,predicate:()=>boolean,limit=1000){for(let n=0;n<limit&&!predicate();n++)stepWorld(w);expect(predicate(),JSON.stringify({tick:w.tick,jobs:w.jobs,actors:w.pawns.map(p=>({id:p.id,x:p.x,z:p.z,state:p.state,path:p.path,job:p.jobId}))})).toBe(true);expect(validateWorld(w)).toEqual([]);}
function reload(w:World){const raw=serializeWorld(w),copy=deserializeWorld(raw);expect(serializeWorld(copy)).toBe(raw);return copy;}

test('two actual excavations feed rectangle smoothing, real abandonment/cancellation, exact work reload and a paid covering/removal that reveals the same stone',()=>{
 const f=smoothFloorCamp458(),w=f.world,p=w.pawns.find(p=>p.id===f.workerId)!,index=f.cell.z*w.width+f.cell.x,second=f.secondCell.z*w.width+f.secondCell.x;
 const folder='artifacts/smooth-floor-v458';let stage='preparation';
 const checkpoint=(name:string,raw:string)=>{writeTestFileSync(`${folder}/${name}.json`,raw);stage=name;};
 try{
 expect(validateWorld(w)).toEqual([]);const beforeRaw=serializeWorld(w),initialLedger=structuredClone(w.deconstructed);checkpoint('before',beforeRaw);
 command(w,{type:'area',action:'mine',from:f.cell,to:f.secondCell});until(w,()=>[index,second].every(i=>w.tiles[i]!.terrain==='rough-stone'),900);
 for(const i of [index,second])expect(w.tiles[i]).toMatchObject({terrain:'rough-stone',stone:'granite'});
 const minedRaw=serializeWorld(w),mineProducts=w.piles.filter(q=>q.kind==='chunk').map(q=>structuredClone(q));expect(p.skills.mining!.xp).toBeGreaterThan(0);checkpoint('mined',minedRaw);
 const designation=applyCommand(w,{type:'area',action:'smooth-floor',from:f.cell,to:{x:16,z:14}});expect(designation.ok,designation.reason).toBe(true);expect(designation).toMatchObject({affected:2,skipped:1});
 const first=w.jobs.find(j=>j.kind==='smooth-floor'&&j.x===f.cell.x)!,other=w.jobs.find(j=>j.kind==='smooth-floor'&&j.x===f.secondCell.x)!;
 command(w,{type:'order-job',pawnId:p.id,jobId:first.id,queue:false});until(w,()=>workProgress(first)>5);
 const xpBeforeAbandon=p.skills.construction.xp;command(w,{type:'draft',pawnIds:[p.id],enabled:true});
 expect(first.status).toBe('pending');expect(first.reservedBy).toBeNull();expect(first.progress).toBe(0);expect(first.workRemainder).toBeUndefined();expect(p.skills.construction.xp).toBe(xpBeforeAbandon);expect(w.tiles[index]!.terrain).toBe('rough-stone');
 command(w,{type:'cancel-job',jobId:other.id});expect(w.jobs).toContain(first);expect(w.jobs.some(j=>j.id===other.id)).toBe(false);const abandonedRaw=serializeWorld(w);reload(w);checkpoint('abandoned',abandonedRaw);
 command(w,{type:'draft',pawnIds:[p.id],enabled:false});command(w,{type:'order-job',pawnId:p.id,jobId:first.id,queue:false});until(w,()=>workProgress(first)>10);
 const workingRaw=serializeWorld(w),copy=reload(w),workAt=w.tick;checkpoint('working',workingRaw);
 until(w,()=>w.tiles[index]!.terrain==='smoothed-stone');stepWorld(copy,w.tick-workAt);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 expect(p.orders.active).not.toBe(first.id);expect(p.orders.queue).not.toContain(first.id);
 expect(w.tiles[index]).toMatchObject({terrain:'smoothed-stone',stone:'granite'});expect(w.tiles[second]!.terrain).toBe('rough-stone');expect(w.deconstructed).toEqual(initialLedger);
 for(const original of mineProducts)expect(w.piles.find(q=>q.id===original.id)).toEqual(original);
 expect(units(w,'wood')).toBe(6);expect(w.jobs.some(j=>j.kind==='smooth-floor')).toBe(false);const smoothedRaw=serializeWorld(w);checkpoint('smoothed',smoothedRaw);
 command(w,{type:'designate',kind:'lay-floor',floor:'wood-planks',...f.cell});until(w,()=>w.tiles[index]!.floor==='wood-planks');expect(units(w,'wood')).toBe(3);expect(w.tiles[index]!.terrain).toBe('smoothed-stone');const coveredRaw=serializeWorld(w);reload(w);checkpoint('covered',coveredRaw);
 command(w,{type:'designate',kind:'remove-floor',...f.cell});until(w,()=>w.tiles[index]!.floor===undefined);
 expect(w.tiles[index]).toMatchObject({terrain:'smoothed-stone',stone:'granite'});expect(units(w,'wood')+w.deconstructed.lostWood).toBe(6);expect(w.deconstructed.count).toBe(initialLedger.count+1);
 expect(units(w,'granite-blocks')).toBe(0);for(const original of mineProducts)expect(w.piles.find(q=>q.id===original.id)).toEqual(original);reload(w);
 const finalRaw=serializeWorld(w);checkpoint('after',finalRaw);
 writeTestFileSync(`${folder}/manifest.json`,JSON.stringify({version:458,schemaVersion:281,beforePath:testOutputPath(`${folder}/before.json`),beforeSha256:createHash('sha256').update(beforeRaw).digest('hex'),workingPath:testOutputPath(`${folder}/working.json`),afterPath:testOutputPath(`${folder}/after.json`),workerId:p.id,cell:f.cell,secondCell:f.secondCell,stone:f.stone,firstJobId:first.id,cancelledJobId:other.id,fromTick:JSON.parse(beforeRaw).tick,toTick:w.tick,initialWood:6,mineProductIds:mineProducts.map(q=>q.id),preparation:f.preparation,authority:'Node actions earned the two excavations and all subsequent work. Native control must import before.json, never the Node result, and play its own commands.'},null,2)+'\n');
 }finally{
  writeTestFileSync(`${folder}/diagnostic.json`,JSON.stringify(w));writeTestFileSync(`${folder}/stage.json`,JSON.stringify({stage,tick:w.tick,workerId:f.workerId,cell:f.cell,secondCell:f.secondCell})+'\n');
 }
});

test('a real upper-floor completion retires a coexisting smoothing mandate without changing its substrate or inventing recovery',()=>{
 const f=smoothFloorCamp458(),w=f.world,index=f.cell.z*w.width+f.cell.x;
 command(w,{type:'designate',kind:'mine',...f.cell});until(w,()=>w.tiles[index]!.terrain==='rough-stone',900);
 command(w,{type:'designate',kind:'lay-floor',floor:'wood-planks',...f.cell});const covering=w.jobs.find(j=>j.kind==='lay-floor')!;
 until(w,()=>workProgress(covering)>0);expect(w.tiles[index]!.floor).toBeUndefined();
 // The ordinary builder has really delivered and started the floor. A new
 // smoothing mandate may coexist, then the actual top-terrain commit retires it.
 command(w,{type:'designate',kind:'smooth-floor',...f.cell});const smooth=w.jobs.find(j=>j.kind==='smooth-floor')!;
 const p=w.pawns.find(p=>p.id===f.workerId)!;expect(p.jobId).toBe(covering.id);
 until(w,()=>w.tiles[index]!.floor==='wood-planks');expect(w.jobs).not.toContain(smooth);expect(p.orders.active).not.toBe(smooth.id);expect(p.orders.queue).not.toContain(smooth.id);
 expect(w.tiles[index]!.terrain).toBe('rough-stone');expect(units(w,'wood')).toBe(3);expect(w.deconstructed.count).toBe(0);reload(w);
});
