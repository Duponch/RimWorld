import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {validCorePathBudget297} from '../src/sim/core-path-budget-297.ts';
import {worldPawnsPhysicalCore297} from '../src/sim/world-pawn-physical-clock-297.ts';
import {registeredMaps,registeredMapId} from '../src/sim/world-map-context.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {World} from '../src/sim/types.ts';

// CWD/public follows the repository fixture pattern and Root's isolated public
// junction. No import.meta-relative path into tmp, no real campaign94de used.
const PATH='public/test-saves/v419/les-eclaircies.json';
const PIN='49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f';
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
function wholeEqual(actual:string,expected:string,label:string):void {
 const equal=actual===expected;
 // Compare every byte, but keep a failure from printing two14MB snapshots.
 expect(equal,equal?label:label+' bytes='+actual.length+'/'+expected.length+' SHA='+hash(actual)+'/'+hash(expected)).toBe(true);
}
function budgetFacts(w:World){return registeredMaps(w).map(map=>{
 expect(validCorePathBudget297(map,297,map.tick,map.phaseCore297!)).toBe(true);
 return {mapId:registeredMapId(map)??w.worldMaps!.rootMapId,tick:map.tick,phase:map.phaseCore297,budget:structuredClone(map.corePathBudget297)};
});}
function physicalFacts(w:World){return {
 core:effectiveCore297(w),tick:w.tick,phase:w.phaseCore297,rng:w.rng,nextId:w.nextId,budgets:budgetFacts(w),
 worldPawns:w.worldPawns?{atCore:w.worldPawns.atCore,physical:worldPawnsPhysicalCore297(w.worldPawns,297),lastSuccessfulCore:w.worldPawns.lastSuccessfulCore,currentRate:w.worldPawns.currentRate,owners:w.worldPawns.owners.map(row=>({id:row.actor.id,kind:row.kind,mode:row.mode,clockCore:row.clockCore,physicalClockCore297:row.physicalClockCore297,heldAtCore259:row.heldAtCore259,heldGoodsCore297:row.heldGoodsCore297}))}:null,
 maps:registeredMaps(w).map(map=>({id:registeredMapId(map),pawns:map.pawns.map(p=>({id:p.id,x:p.x,z:p.z,path:structuredClone(p.path),motion:structuredClone(p.motion),moveCooldown:p.moveCooldown,state:p.state,jobId:p.jobId,draft:structuredClone(p.draft)}))})),
};}
function one(w:World,expectedCore:number){const before=effectiveCore297(w),result=advanceWorldCore297(w);expect(result.core).toBe(before+1);expect(result.core).toBe(expectedCore);expect(effectiveCore297(w)).toBe(expectedCore);expect(result.localTickCompleted).toBe(expectedCore%10===0);return result.localTickCompleted?1:0;}

test('public V419 Les Éclaircies migrates through the real297 API and preserves registered-map continuation across a phase7 save',()=>{
 const bytes=readFileSync(PATH);expect(bytes.length).toBe(14557884);expect(hash(bytes)).toBe(PIN);
 const text=bytes.toString('utf8');expect(text.startsWith('{"schemaVersion":263,')).toBe(true);
 // No generated/quiet substitute, actor preparation, command, RNG, clock,
 // budget or route assignment. The historical source is admitted unchanged.
 const w=deserializeWorld(text);expect(w.schemaVersion).toBe(297);expect(w.tick).toBe(1730);expect(w.phaseCore297).toBe(0);expect(w.rng).toBe(1799634800);expect(w.nextId).toBe(37953);
 expect([w.width,w.height]).toEqual([250,250]);expect(w.pawns.map(p=>p.id)).toEqual([8,9,7]);expect(w.worldMaps!.rootMapId).toBe(0);expect(registeredMaps(w)).toHaveLength(1);expect(w.worldPawns).toBeDefined();expect(w.worldPawns!.owners).toHaveLength(5);expect(validateWorld(w)).toEqual([]);
 const start=effectiveCore297(w);expect(start).toBe(17300);budgetFacts(w);
 let firstMacros=0;for(let n=1;n<=7;n++)firstMacros+=one(w,start+n);
 expect(firstMacros).toBe(0);expect(w.tick).toBe(1730);expect(w.phaseCore297).toBe(7);expect(effectiveCore297(w)).toBe(17307);
 expect(w.worldPawns!.atCore).toBe(17300);expect(worldPawnsPhysicalCore297(w.worldPawns!,297)).toBe(17307);expect(validateWorld(w)).toEqual([]);
 const beforeRead=physicalFacts(w),checkpoint=serializeWorld(w);expect(physicalFacts(w)).toEqual(beforeRead);
 const loaded=deserializeWorld(checkpoint);expect(loaded.phaseCore297).toBe(7);expect(effectiveCore297(loaded)).toBe(17307);expect(physicalFacts(loaded)).toEqual(beforeRead);expect(validateWorld(loaded)).toEqual([]);
 wholeEqual(serializeWorld(loaded),checkpoint,'phase7 full World roundtrip');wholeEqual(JSON.stringify(loaded.worldPawns),JSON.stringify(w.worldPawns),'phase7 RootWorldPawns exact');
 // Both authoritative branches now receive only the same23 real Core credits.
 // No player input is introduced on either side of this fork.
 let liveMacros=0,reloadMacros=0;
 for(let n=1;n<=23;n++){
  liveMacros+=one(w,start+7+n);reloadMacros+=one(loaded,start+7+n);
  expect(physicalFacts(loaded)).toEqual(physicalFacts(w));
 }
 expect([firstMacros,liveMacros,reloadMacros]).toEqual([0,3,3]);
 expect(w.tick).toBe(1733);expect(loaded.tick).toBe(1733);expect(w.phaseCore297).toBe(0);expect(loaded.phaseCore297).toBe(0);expect(effectiveCore297(w)-start).toBe(30);expect(effectiveCore297(loaded)-start).toBe(30);
 expect(w.worldPawns!.atCore).toBe(17330);expect(worldPawnsPhysicalCore297(w.worldPawns!,297)).toBe(17330);
 expect(validateWorld(w)).toEqual([]);expect(validateWorld(loaded)).toEqual([]);expect(loaded.rng).toBe(w.rng);
 wholeEqual(JSON.stringify(loaded.worldPawns),JSON.stringify(w.worldPawns),'continued RootWorldPawns exact');wholeEqual(serializeWorld(loaded),serializeWorld(w),'continued entire World exact');
 const after=readFileSync(PATH);expect(after.equals(bytes)).toBe(true);expect(hash(after)).toBe(PIN);
},120000);
