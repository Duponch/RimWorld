import {expect,test} from 'vitest';
import {createHash} from 'node:crypto';
import {billPauseKitchen468} from './scenarios/bill-pause-v468.ts';
import {apparelReserveWorkshop455} from './scenarios/apparel-reserves-v455.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {countedProducts,billWanted} from '../src/sim/cooking-bills.ts';
import {createBillReserveCountReader289,reconcileBillReservePauses289,canResumeBillReserve289} from '../src/sim/bill-pause-289.ts';
import {queryCookingBillStatus} from '../src/sim/cooking-diagnostics.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import {isRecipeProduct} from '../src/sim/production-recipes.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';
import type {World,Command} from '../src/sim/types.ts';

function until(w:World,done:()=>boolean,limit=1800){for(let n=0;n<limit&&!done();n++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,pawns:w.pawns.map(p=>({id:p.id,state:p.state,need:p.need,cooking:p.cooking})),bills:w.structures.flatMap(s=>s.bills??[])})).toBe(true);}
const exact=(w:World)=>{expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);return raw;};
function groundMeal(w:World){const p=w.piles.find(p=>p.owner.type==='ground'&&isRecipeProduct('simple-meal',p.item));expect(p).toBeDefined();return p!;}
const rice=(w:World)=>w.piles.reduce((n,p)=>n+(p.item==='rice'?p.quantity:0),0);

test('finite kitchen reaches its target, keeps a real output, waits through an intermediate decline then restarts at the inclusive threshold for a second actual cycle',()=>{
  const f=billPauseKitchen468(),{w,pawn,station,bill,command}=f,folder='artifacts/bill-pause-v468';
  const checkpoints:Record<string,{path:string;tick:number;sha256:string}>={};let stage='before';
  const save=(name:string)=>{const raw=exact(w),path=testOutputPath(`${folder}/${name}.json`);writeTestFileSync(path,raw);checkpoints[name]={path,tick:w.tick,sha256:createHash('sha256').update(raw).digest('hex')};return raw;};
  try{
    expect(w.schemaVersion).toBe(289);save('before-play');expect(countedProducts(w,bill)).toBe(0);expect(rice(w)).toBe(140);
    stage='actual-work';until(w,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);save('actual-work');
    stage='acquired-pause-with-real-output';until(w,()=>bill.reservePause!.paused);
    expect(countedProducts(w,bill)).toBe(4);expect(pawn.cooking?.phase).toBe('output');expect(pawn.cooking?.productId).not.toBeNull();save('actual-output-and-pause');
    until(w,()=>!pawn.cooking&&countedProducts(w,bill)===4);expect(rice(w)).toBe(100);save('actual-target-stored');
    stage='first-real-ingestion';command({type:'order-consume',pawnId:pawn.id,pileId:groundMeal(w).id,queue:false});until(w,()=>pawn.orders.active!=='consume');
    expect(countedProducts(w,bill)).toBe(3);expect(bill.reservePause!.paused).toBe(true);expect(billWanted(w,bill)).toBe(false);
    const middle=save('actual-intermediate-pause'),copy=deserializeWorld(middle);stepWorld(w,24);stepWorld(copy,24);expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(pawn.cooking).toBeNull();expect(countedProducts(w,bill)).toBe(3);expect(rice(w)).toBe(100);
    stage='threshold-ingestion';command({type:'order-consume',pawnId:pawn.id,pileId:groundMeal(w).id,queue:false});until(w,()=>pawn.orders.active!=='consume');
    expect(countedProducts(w,bill)).toBe(2);expect(bill.reservePause!.paused).toBe(false);save('actual-threshold-released');
    stage='second-physical-cycle';until(w,()=>pawn.cooking?.phase==='work');save('actual-second-work');until(w,()=>bill.reservePause!.paused&&!pawn.cooking&&countedProducts(w,bill)===4);
    expect(rice(w)).toBe(80);save('actual-second-target');
    stage='manual-cycle';command({type:'order-consume',pawnId:pawn.id,pileId:groundMeal(w).id,queue:false});until(w,()=>pawn.orders.active!=='consume');expect(countedProducts(w,bill)).toBe(3);expect(canResumeBillReserve289(w,bill)).toBe(true);
    const policy={...bill.reservePause!};command({type:'bill-pause-resume',structureId:station.id,billId:bill.id});expect(bill.reservePause).toEqual({...policy,paused:false});
    until(w,()=>bill.reservePause!.paused&&!pawn.cooking&&countedProducts(w,bill)===4);expect(rice(w)).toBe(70);save('actual-manually-resumed-target');
    writeTestFileSync(`${folder}/report.json`,JSON.stringify({result:'passed',preparation:f.preparation,checkpoints,finalTick:w.tick,remainingRice:rice(w),commands:'Initial bill policy then three actual direct ingestion orders and one actual reserve-resume; no setter/reset after play.'},null,2));
  }catch(error){writeTestFileSync(`${folder}/failure.json`,JSON.stringify({stage,message:String(error),tick:w.tick,world:w,checkpoints},null,2));throw error;}
});

test('cold pause settings preserve the already admitted work, cargo, physical edge and queue',()=>{
  const {w,pawn,station,bill,command}=billPauseKitchen468(false);until(w,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  const capture=()=>JSON.stringify({task:pawn.cooking,orders:pawn.orders,path:pawn.path,motion:pawn.motion,piles:w.piles,rng:w.rng,tick:w.tick,nextId:w.nextId});
  const before=capture();command({type:'bill-pause-policy',structureId:station.id,billId:bill.id,policy:{enabled:true,resumeAt:2}});expect(capture()).toBe(before);
  command({type:'bill-pause-policy',structureId:station.id,billId:bill.id,policy:{enabled:false,resumeAt:2}});expect(capture()).toBe(before);exact(w);
});

test('invalid or forged pause commands are atomic and do not invoke policy getters',()=>{
  const {w,station,bill}=billPauseKitchen468(),base={type:'bill-pause-policy',structureId:station.id,billId:bill.id};
  for(const policy of [undefined,null,{enabled:true,resumeAt:4},{enabled:true,resumeAt:-1},{enabled:true,resumeAt:1.5},{enabled:true,resumeAt:2,paused:true}]){
    const before=serializeWorld(w);expect(applyCommand(w,{...base,policy} as Command).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  }
  let reads=0;const bad={...base};Object.defineProperty(bad,'policy',{enumerable:true,get(){reads++;throw Error('No policy getter');}});const before=serializeWorld(w);
  expect(applyCommand(w,bad as Command).ok).toBe(false);expect(reads).toBe(0);expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,{type:'bill-pause-resume',structureId:station.id,billId:bill.id})).toMatchObject({ok:false});expect(serializeWorld(w)).toBe(before);
});

test('wanted, diagnostics and manual planning reads never acquire or release reserve memory',()=>{
  const {w,pawn,station,bill}=billPauseKitchen468();const before=serializeWorld(w);
  for(let i=0;i<4;i++){billWanted(w,bill);queryCookingBillStatus(w,station,bill);planCookingOrder(w,pawn,station.id);canResumeBillReserve289(w,bill);}
  expect(serializeWorld(w)).toBe(before);expect(bill.reservePause!.paused).toBe(false);
});

test('suspension preserves acquired memory, hidden modes clear it, and the same minified original does not count a map reserve',()=>{
  const {w,station,bill}=billPauseKitchen468();bill.reservePause!.paused=true;bill.suspended=true;
  reconcileBillReservePauses289(w);expect(bill.reservePause!.paused).toBe(true);
  bill.mode='forever';reconcileBillReservePauses289(w);expect(bill.reservePause!.paused).toBe(false);
  bill.mode='until';bill.suspended=false;bill.reservePause!.paused=true;
  w.structures=w.structures.filter(s=>s!==station);w.packed.push({building:station,owner:{type:'ground',x:station.x,z:station.z}});
  reconcileBillReservePauses289(w);expect(bill.reservePause!.paused).toBe(true);
  w.packed=w.packed.filter(p=>p.building!==station);w.structures.push(station);reconcileBillReservePauses289(w);expect(bill.reservePause!.paused).toBe(false);
});

test('the reserve reuses usable-apparel and equipped counters with a fresh cache for each pass',()=>{
  const {w,bill,old}=apparelReserveWorkshop455();bill.target=1;bill.reservePause={enabled:true,resumeAt:0,paused:false};
  const read=createBillReserveCountReader289(w);expect(read(bill)).toBe(countedProducts(w,bill));expect(read({...bill,id:bill.id+1})).toBe(0);
  expect(bill.apparelCount).toBeDefined();bill.apparelCount!.includeEquipped=true;bill.apparelCount!.hpMin=0;expect(old.owner.type).toBe('apparel');
  expect(createBillReserveCountReader289(w)(bill)).toBe(1);reconcileBillReservePauses289(w);expect(bill.reservePause.paused).toBe(true);
  bill.apparelCount!.hpMin=51;reconcileBillReservePauses289(w);expect(bill.reservePause.paused).toBe(false);expect(old.apparel!.hitPoints).toBe(50);
});
