import {expect,test} from 'vitest';
import {nextColdSeverity} from '../src/sim/cold-rules';
import {nextHeatSeverity} from '../src/sim/heat-severity';
import {advanceOffmapThermal259,offmapThermalRange259,WORLD_PAWN_NO_HOLDER_TEMPERATURE_259} from '../src/sim/offmap-thermal-259';
import {worldPawnActiveBoundary256} from '../src/sim/world-pawn-life-256';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256';
import {createMedicalRecord} from '../src/sim/injury-state';
import {newApparelState} from '../src/sim/apparel-rules';
import {comfortableTemperature} from '../src/sim/heat-rules';
import type {Pawn,MaterialPile,World} from '../src/sim/types';
import type {WildAnimal} from '../src/sim/wildlife-state';
import type {WorldPawnOwner256} from '../src/sim/world-pawn-state-256';
/** Prepared pure API records only, not acquired actors/clinical histories. */
test('off-map cold adds exposure then decays only a hediff present before the call; local historical kernel is unchanged',()=>{
 expect(nextColdSeverity(0,-14,16,true)).toBe(1290000);
 expect(nextColdSeverity(1290000,-14,16,true)).toBe(1080000);
 expect(nextColdSeverity(400000000,-14,16,true)).toBe(390455170);
 expect(nextColdSeverity(1500000,-14,16,true)).toBe(1290000);
 expect(nextColdSeverity(1500000,21,16,true)).toBe(0);
 expect(nextColdSeverity(999900000,-1000,16,true)).toBe(1000000000);
 expect(nextColdSeverity(400000000,-14,16)).toBe(401290000);
 expect(nextColdSeverity(400000000,16,16)).toBe(400000000);
});
test('actual apparel and animal stats supply ranges; unproven original/insectoid profiles are named refusals',()=>{
 const p={id:7} as Pawn,items:MaterialPile[]=[{id:100,kind:'apparel',item:'cloth-tribalwear',quantity:1,owner:{type:'apparel',pawnId:7},apparel:newApparelState('cloth-tribalwear')}];
 expect(offmapThermalRange259(p,items)).toEqual(comfortableTemperature({piles:items} as World,p));
 expect(offmapThermalRange259({species:'cat'} as WildAnimal,[])).toEqual(expect.objectContaining({min:expect.any(Number),max:expect.any(Number)}));
 expect(offmapThermalRange259({species:'hare'} as WildAnimal,[])).toMatch(/not proven/);
 expect(offmapThermalRange259({species:'megascarab'} as WildAnimal,[])).toMatch(/Insectoid HypothermicSlowdown/);
 expect(WORLD_PAWN_NO_HOLDER_TEMPERATURE_259).toBe(21);
});
test('one existing Core hash60 call, no date rewrite, no off-cadence work, and259 alone closes the active thermal boundary',()=>{
 const id=7,due=Array.from({length:6},(_,n)=>(n+1)*10).find(core=>groupPawnInterval256(id,core,60,10))!,off=due===60?10:due+10;
 const p={id,state:'idle',health:{...createMedicalRecord(due/10),hypothermia:400000000,heatstroke:200000000}} as Pawn;
 const range=offmapThermalRange259(p,[]);if(typeof range==='string')throw Error(range);
 advanceOffmapThermal259(p,[],due,-14,()=>{throw Error('Existing medical original must be retained');});
 expect(p.health!.tick).toBe(due/10);expect(p.health!.hypothermia).toBe(390455170);expect(p.health!.heatstroke).toBe(nextHeatSeverity(200000000,-14,range.max));
 const before=JSON.stringify(p);advanceOffmapThermal259(p,[],off,-200,()=>{throw Error('No off-cadence record');});expect(JSON.stringify(p)).toBe(before);
 const row={kind:'human',actor:p,clockCore:due,mode:'active',items:[],packed:[]} as unknown as WorldPawnOwner256;
 expect(worldPawnActiveBoundary256(row,258)).toMatch(/thermal/);expect(worldPawnActiveBoundary256(row,259)).toBeNull();
});
