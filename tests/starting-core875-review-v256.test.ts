import {expect,test} from 'vitest';
import {startingPawn} from '../src/sim/starting-pawns';
import {createMedicalRecord} from '../src/sim/injury-state';
import {addCryptosleepSickness256} from '../src/sim/cryptosleep-sickness-256';
import {validCryptosleepSicknessWorldTransport256} from '../src/sim/cryptosleep-sickness-save-256';
import {validCoreStartingArrivalShape256} from '../src/sim/starting-pod-save-256';
import {validCoreStartingArrivalTransition256} from '../src/sim/starting-pod-transition-256';
import {CORE_STARTING_ARRIVAL_PROFILE_256,type CoreStartingArrivalPending256} from '../src/sim/starting-pod-state-256';
import type {World} from '../src/sim/types';
/** Small shape/transition guard inputs only. These are NOT admitted playable
 * Worlds; the actual250 helper separately exercises RAW/MAIN/motor owners. */
function pending(tick=0):CoreStartingArrivalPending256 {
 return {profile:CORE_STARTING_ARRIVAL_PROFILE_256,phase:'incoming',start:0,landAt:20,openAt:32,personalTick:0,atCore:tick*10,openedCells:[],
 pods:[0,1,2].map(i=>({id:20+i,skyfallerId:30+i,cell:{x:20+i,z:20},pawn:startingPawn(i+1,'Original '+i,20+i,20,0,65,712,0,256),items:[],animals:[],order:[{kind:'human' as const,id:i+1}],phase:'incoming' as const,fallCore:200,remainingCore:200-tick*10,ageCore:0,roofHit:false}))};
}
function guardView(tick=0):World {
 return {schemaVersion:256,tick,width:250,height:250,nextId:100,pawns:[],piles:[],structures:[],startingArrival:pending(tick),site:{revision:3},planet:{revision:3},climate:{revision:4}} as unknown as World;
}
test('real PostMap sickness is admitted only inside the explicit new held owner at clock0',()=>{
 const w=guardView(),a=w.startingArrival!;if(a.phase==='opened')throw Error('Expected holder');const p=a.pods[0]!.pawn;
 p.health=createMedicalRecord(0);addCryptosleepSickness256(p.health,{integer:()=>8000,integerValue:()=>-17},256);
 const original=p.health;expect(validCryptosleepSicknessWorldTransport256(w,256)).toBe(true);expect(p.health).toBe(original);
 expect(validCryptosleepSicknessWorldTransport256(w,255)).toBe(false);
 const old=structuredClone(w);Object.assign(old.startingArrival!,{profile:'arriving-crashlanded-v1'});expect(validCryptosleepSicknessWorldTransport256(old,256)).toBe(false);
 const forged=structuredClone(w);if(forged.startingArrival?.phase!=='opened')Object.assign(forged.startingArrival!,{personalTick:1});expect(validCryptosleepSicknessWorldTransport256(forged,256)).toBe(false);
 expect(p.health.cryptosleepSickness?.remainingCore).toBe(8000);
});
test('holder header binds remaining time/roof state/landed age to elapsed Core, preserving explicit stalled roof',()=>{
 const fresh=pending();expect(validCoreStartingArrivalShape256(fresh,256,{tick:0,width:250,height:250})).toBe(true);
 const early=structuredClone(fresh);Object.assign(early.pods[0]!,{phase:'landed',remainingCore:0,roofHit:true,ageCore:111});expect(validCoreStartingArrivalShape256(early,256,{tick:0,width:250,height:250})).toBe(false);
 const elapsed=pending(1);expect(validCoreStartingArrivalShape256(elapsed,256,{tick:1,width:250,height:250})).toBe(true);elapsed.pods[0]!.remainingCore=191;expect(validCoreStartingArrivalShape256(elapsed,256,{tick:1,width:250,height:250})).toBe(false);
 const stall=pending(19);for(const pod of stall.pods)pod.roofHit=true;Object.assign(stall.pods[0]!,{remainingCore:0,roofHit:false});expect(validCoreStartingArrivalShape256(stall,256,{tick:19,width:250,height:250})).toBe(true);
 expect(validCoreStartingArrivalShape256(stall,255,{tick:19,width:250,height:250})).toBe(false);
});
test('direct release binds exact removed anchors and actual local humans, including duplicate fallback anchors',()=>{
 const before=guardView(31),a=before.startingArrival!;if(a.phase==='opened')throw Error('Expected pending');a.phase='landed';for(const p of a.pods)Object.assign(p,{phase:'landed',remainingCore:0,roofHit:true,ageCore:110});
 a.pods[1]!.cell={...a.pods[0]!.cell};const after=structuredClone(before);after.tick=32;
 after.pawns=a.pods.map(p=>structuredClone(p.pawn));after.startingArrival={profile:CORE_STARTING_ARRIVAL_PROFILE_256,phase:'opened',start:0,landAt:20,openAt:32,openedAt:32,cells:a.pods.map(p=>({...p.cell}))};
 expect(validCoreStartingArrivalTransition256(before,after)).toBe(true);
 const wrong=structuredClone(after);if(wrong.startingArrival?.phase==='opened')wrong.startingArrival.cells[0]!.x++;expect(validCoreStartingArrivalTransition256(before,wrong)).toBe(false);
 const vanished=structuredClone(after);vanished.pawns.shift();expect(validCoreStartingArrivalTransition256(before,vanished)).toBe(false);
 const sameTick=structuredClone(after);sameTick.tick=31;expect(validCoreStartingArrivalTransition256(before,sameTick)).toBe(false);
 const stalled=structuredClone(before);if(stalled.startingArrival?.phase!=='opened')Object.assign(stalled.startingArrival!.pods[0]!,{phase:'incoming',remainingCore:0,ageCore:0,roofHit:false});expect(validCoreStartingArrivalTransition256(stalled,after)).toBe(false);
 const partial=structuredClone(before);partial.tick=32;if(partial.startingArrival?.profile===CORE_STARTING_ARRIVAL_PROFILE_256&&partial.startingArrival.phase!=='opened'){partial.startingArrival.pods.shift();partial.startingArrival.openedCells.push({x:99,z:99});partial.pawns=[structuredClone(a.pods[0]!.pawn)];}expect(validCoreStartingArrivalTransition256(before,partial)).toBe(false);
});
