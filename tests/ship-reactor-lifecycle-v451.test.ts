import {expect,test} from 'vitest';
import type {World} from '../src/sim/types.ts';
import {SHIP_REACTOR_STARTUP_CORE_275,shipReactorEndCore275,validShipReactorState275,validShipReactorField275,validShipReactorCommand275,type ShipReactor275} from '../src/sim/ship-reactor-state-275.ts';
import {validShipReactorBuilding275,validShipReactorWorld275,validShipReactorContinuation275,validShipReactorHistoricalTransport275} from '../src/sim/ship-reactor-save-275.ts';
import {readShipReactorStart275,prepareShipReactorStart275,applyShipReactorCommand275,advanceShipReactors275} from '../src/sim/ship-reactor-runtime-275.ts';

/** Declared local component/transaction contexts. No earned construction,
 * full campaign validation, elapsed defence or victory is claimed here. */
function context(){
 return {schemaVersion:275,tick:100,width:32,height:32,nextId:10,rng:451,structures:[],jobs:[],packed:[],pawns:[],piles:[],events:[]} as unknown as World;
}
function reactor(w:World,x=8,z=8,orientation:0|1|2|3=0):ShipReactor275 {
 const s:ShipReactor275={id:w.nextId++,kind:'ship-reactor',x,z,orientation,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
 w.structures.push(s);return s;
}
function start(w:World,id:number){const quote=readShipReactorStart275(w,id);expect(quote.ok).toBe(true);if(!quote.ok)throw Error(quote.reason);return applyShipReactorCommand275(w,{type:'ship-reactor-start',reactorId:id,reactorIds:quote.reactorIds});}

test('cardinal components activate original reactors only, with no colonist, job, power or RNG requirement',()=>{
 const w=context(),a=reactor(w,8,8,1),b=reactor(w,14,8),c=reactor(w,20,8),diagonal=reactor(w,26,15);
 // E anchor a spans x5..11,z5..10; b starts x12. The diagonal
 // touches c only at a corner and is not part of this component.
 a.power!.on=false;
 const before=structuredClone(w),quote=readShipReactorStart275(w,a.id);expect(w).toEqual(before);
 expect(quote).toEqual({ok:true,reactorIds:[a.id,b.id,c.id]});
 expect(start(w,a.id)).toEqual({ok:true,affected:3});
 for(const s of [a,b,c]){expect(w.structures).toContain(s);expect(s.shipReactor275).toEqual({state:'starting',startCore:1000,endCore:841000});}
 expect(Object.hasOwn(diagonal,'shipReactor275')).toBe(false);expect(w.jobs).toEqual([]);expect(w.pawns).toEqual([]);expect(w.rng).toBe(before.rng);expect(w.nextId).toBe(before.nextId);expect(a.power!.on).toBe(false);
 expect(validShipReactorWorld275(w)).toBe(true);
});

test('a previously started reactor remains a bridge and can start only newly connected hibernating parts',()=>{
 const w=context(),a=reactor(w),b=reactor(w,14,8);expect(start(w,a.id).ok).toBe(true);
 const aState=a.shipReactor275,bState=b.shipReactor275,saved=structuredClone(aState);
 w.tick++;const c=reactor(w,20,8);
 expect(readShipReactorStart275(w,a.id)).toEqual({ok:true,reactorIds:[c.id]});expect(start(w,a.id)).toEqual({ok:true,affected:1});
 expect(a.shipReactor275).toBe(aState);expect(b.shipReactor275).toBe(bState);expect(aState).toEqual(saved);expect(c.shipReactor275!.startCore).toBe(1010);
 const after=structuredClone(w);expect(startWithoutPreview(w,a.id,[a.id,b.id,c.id]).ok).toBe(false);expect(w).toEqual(after);
});
function startWithoutPreview(w:World,id:number,ids:number[]){return applyShipReactorCommand275(w,{type:'ship-reactor-start',reactorId:id,reactorIds:ids});}

test('confirmation cannot silently expand after topology changes and plan seals actual object identities',()=>{
 const w=context(),a=reactor(w),b=reactor(w,14,8),quote=readShipReactorStart275(w,a.id);if(!quote.ok)throw Error(quote.reason);
 const plan=prepareShipReactorStart275(w,a.id,quote.reactorIds);if(!plan.ok)throw Error(plan.reason);
 reactor(w,20,8);const changed=structuredClone(w);expect(startWithoutPreview(w,a.id,quote.reactorIds).ok).toBe(false);expect(plan.commit()).toBe(false);expect(w).toEqual(changed);
 w.structures.pop();const fresh=prepareShipReactorStart275(w,a.id);if(!fresh.ok)throw Error(fresh.reason);
 w.structures[1]=structuredClone(b);expect(fresh.current()).toBe(false);expect(fresh.commit()).toBe(false);expect(a.shipReactor275).toBeUndefined();
 const nested=prepareShipReactorStart275(w,a.id);if(!nested.ok)throw Error(nested.reason);a.power={...a.power!};expect(nested.current()).toBe(false);expect(nested.commit()).toBe(false);
});

test('a frozen participant or changed clock prevents every prepared write and successful plans are single use',()=>{
 const w=context(),a=reactor(w),b=reactor(w,14,8),plan=prepareShipReactorStart275(w,a.id);if(!plan.ok)throw Error(plan.reason);
 Object.freeze(b);expect(plan.commit()).toBe(false);expect(Object.hasOwn(a,'shipReactor275')).toBe(false);expect(Object.hasOwn(b,'shipReactor275')).toBe(false);
 const one=context(),s=reactor(one),old=prepareShipReactorStart275(one,s.id);if(!old.ok)throw Error(old.reason);one.tick++;expect(old.commit()).toBe(false);
 const fresh=prepareShipReactorStart275(one,s.id);if(!fresh.ok)throw Error(fresh.reason);expect(fresh.commit()).toBe(true);const done=structuredClone(one);expect(fresh.commit()).toBe(false);expect(one).toEqual(done);
});

test('the exact end boundary is still starting and completion occurs once after it, surviving a cold local state copy',()=>{
 const w=context(),a=reactor(w);expect(start(w,a.id).ok).toBe(true);const original=a.shipReactor275!,dates={startCore:original.startCore,endCore:original.endCore};
 w.tick=original.endCore/10;expect(advanceShipReactors275(w)).toEqual({completed:0,starting:true,completedReactorIds:[]});expect(validShipReactorWorld275(w)).toBe(true);
 const reloaded=JSON.parse(JSON.stringify(w)) as World;expect(validShipReactorWorld275(reloaded)).toBe(true);
 w.tick++;reloaded.tick++;expect(advanceShipReactors275(w)).toEqual({completed:1,starting:false,completedReactorIds:[a.id]});expect(advanceShipReactors275(reloaded).completed).toBe(1);expect(reloaded).toEqual(w);
 expect(a.shipReactor275).toBe(original);expect(a.shipReactor275).toEqual({state:'running',...dates});expect(advanceShipReactors275(w).completed).toBe(0);
 expect(readShipReactorStart275(w,a.id).ok).toBe(false);
});

test('native Float32 end dates differ from naive integer addition at long campaign clocks',()=>{
 expect(shipReactorEndCore275(0)).toBe(SHIP_REACTOR_STARTUP_CORE_275);
 expect(shipReactorEndCore275(16777210)).toBe(17617210);
 expect(shipReactorEndCore275(16777230)).toBe(17617230);
 // Float32 spacing reaches four ticks here, so the native end differs by2.
 expect(shipReactorEndCore275(33554430)).toBe(34394432);
 const state={state:'starting',startCore:33554430,endCore:34394432};expect(validShipReactorState275(state,33554430)).toBe(true);
 expect(validShipReactorState275({...state,endCore:34394430},33554430)).toBe(false);
 expect(shipReactorEndCore275(2147483640)).toBeUndefined();expect(shipReactorEndCore275(-1)).toBeUndefined();
});

test('closed component/building guards reject malformed, future, foreign and minified owners without invoking accessors',()=>{
 const w=context(),s=reactor(w),now=w.tick*10;expect(validShipReactorBuilding275(s,275,w,now)).toBe(true);
 for(const version of [274,276])expect(validShipReactorBuilding275(s,version,w,now)).toBe(false);
 const mutations=[{...s,shipReactor275:undefined},{...s,quality:'normal'},{...s,fuel:{ticks:1}},{...s,power:{on:true,parentId:null,extra:1}},{...s,x:0},{...s,factionId:null},{...s,factionId:undefined}];
 for(const v of mutations)expect(validShipReactorBuilding275(v,275,w,now)).toBe(false);
 let reads=0;const bad={...s};Object.defineProperty(bad,'shipReactor275',{enumerable:true,get(){reads++;throw Error('Must not read');}});expect(validShipReactorBuilding275(bad,275,w,now)).toBe(false);expect(reads).toBe(0);
 expect(validShipReactorField275({kind:'wall',shipReactor275:undefined},275,now)).toBe(false);
 expect(validShipReactorField275({kind:'ship-reactor'},275,now,'job')).toBe(true);expect(validShipReactorField275({structureId:s.id},275,now,'job')).toBe(true);
 expect(validShipReactorField275({structureId:s.id,shipReactor275:undefined},275,now,'job')).toBe(false);
 w.packed.push({building:s,owner:{type:'ground',x:8,z:8}});expect(validShipReactorWorld275(w)).toBe(false);
});

test('the startup command requires a dense sorted exact confirmed list and the closed275 capability',()=>{
 const c={type:'ship-reactor-start',reactorId:10,reactorIds:[10,11]};expect(validShipReactorCommand275(c,275,20)).toBe(true);
 for(const v of [274,276])expect(validShipReactorCommand275(c,v,20)).toBe(false);
 for(const ids of [[],[11,10],[10,10],[10,,11],[20]])expect(validShipReactorCommand275({...c,reactorIds:ids},275,20)).toBe(false);
 expect(validShipReactorCommand275({...c,extra:undefined},275,20)).toBe(false);
 let reads=0;const ids=[10,11];Object.defineProperty(ids,'0',{enumerable:true,get(){reads++;throw Error('No getter');}});expect(validShipReactorCommand275({...c,reactorIds:ids},275,20)).toBe(false);expect(reads).toBe(0);
});

test('delta continuation allows skipped warmup but rejects clock/date/state regression and equal-ID conversion',()=>{
 const before=context(),a=reactor(before),next=structuredClone(before);expect(start(next,a.id).ok).toBe(true);
 expect(validShipReactorContinuation275(before,next)).toBe(true);
 const delayed=structuredClone(next);delayed.tick=delayed.structures[0]!.shipReactor275!.endCore/10+1;advanceShipReactors275(delayed);expect(validShipReactorContinuation275(before,delayed)).toBe(true);
 const changed=structuredClone(delayed);delete changed.structures[0]!.shipReactor275;expect(validShipReactorContinuation275(delayed,changed)).toBe(false);
 const earlier=structuredClone(next);earlier.structures[0]!.shipReactor275!.startCore-=10;earlier.structures[0]!.shipReactor275!.endCore-=10;expect(validShipReactorContinuation275(before,earlier)).toBe(false);
 const redate=structuredClone(next);redate.tick++;redate.structures[0]!.shipReactor275!.startCore+=10;redate.structures[0]!.shipReactor275!.endCore+=10;expect(validShipReactorContinuation275(next,redate)).toBe(false);
 const converted=structuredClone(delayed);converted.structures[0]!.kind='wall';delete converted.structures[0]!.shipReactor275;expect(validShipReactorContinuation275(delayed,converted)).toBe(false);
 const removed={...delayed,structures:[]};expect(validShipReactorContinuation275(delayed,removed)).toBe(true);
});

test('historical transport rejects future reactor/research markers in inactive, retained and sparse packet owners',()=>{
 const entries=[{structures:[{kind:'ship-reactor'}]},{research:{progress:{'ship-basics':0}}},{research:{shipBasics:{points:0}}},{worldMaps:{sites:[{map:{jobs:[{kind:'ship-reactor'}]}}]}},
  {shipReactorThreats275:undefined},{world:{schemaVersion:274,shipReactorThreats275:undefined}},
  {worldMaps:{sites:[{map:{shipReactorThreats275:{revision:1}}}]}},
  {worldGroups:{abandonedContents:[{humans:[{packed:[{building:{kind:'wall',shipReactor275:undefined}}]}]}]}},
  {world:{schemaVersion:274},structures:{removed:[],upserted:[{kind:'wall',shipReactor275:undefined}]}}];
 for(const entry of entries){expect(validShipReactorHistoricalTransport275(entry,274)).toBe(false);expect(validShipReactorHistoricalTransport275(entry,275)).toBe(true);expect(validShipReactorHistoricalTransport275(entry,276)).toBe(false);}
 expect(validShipReactorHistoricalTransport275({structures:[{kind:'wall'}],research:{progress:{machining:0}}},274)).toBe(true);
 let reads=0;const getter={};Object.defineProperty(getter,'structures',{enumerable:true,get(){reads++;throw Error('No getter');}});expect(validShipReactorHistoricalTransport275(getter,274)).toBe(false);expect(reads).toBe(0);
});

test('ordinary frames without reactors continue without changing either original collection, while future versions and prospective fields refuse',()=>{
 const previous=context();previous.structures.push({id:previous.nextId++,kind:'wall',x:2,z:2,orientation:0,footprint:'standard',material:'wood'});
 const next=structuredClone(previous);next.tick++;const oldArray=previous.structures,newArray=next.structures,oldValue=structuredClone(previous),newValue=structuredClone(next);
 expect(validShipReactorContinuation275(previous,next)).toBe(true);expect(previous.structures).toBe(oldArray);expect(next.structures).toBe(newArray);expect(previous).toEqual(oldValue);expect(next).toEqual(newValue);
 Object.assign(next.structures[0]!,{shipReactor275:undefined});expect(validShipReactorContinuation275(previous,next)).toBe(false);
 delete next.structures[0]!.shipReactor275;Object.assign(next,{schemaVersion:276});expect(validShipReactorContinuation275(previous,next)).toBe(false);
});

test('removed reactors no longer advance and ordinary damage preserves the existing startup dates',()=>{
 const w=context(),s=reactor(w);expect(start(w,s.id).ok).toBe(true);const state=s.shipReactor275!;s.damage=1;expect(validShipReactorWorld275(w)).toBe(true);
 const before=structuredClone(state);w.structures=[];w.tick=state.endCore/10+1;expect(advanceShipReactors275(w)).toEqual({completed:0,starting:false,completedReactorIds:[]});expect(state).toEqual(before);
});
