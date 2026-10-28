import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {applyCommand,advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {registeredMap,registeredMapForValidation,flushRegisteredMap,sharedCampaignData} from '../src/sim/world-map-context.ts';
import type {Command,Pawn,World} from '../src/sim/types.ts';

/** Prepared public fixture only: no manual phase/tick, path or budget assignment.
 * Every budget debit below comes from processDraft's genuine queued transition.
 * This is an Engine/save regression, not Native or performance evidence. */
function scene():World {
 const w=deconstructionCamp(10,48);w.growingZones=[];w.stockpiles=[];
 for(const [i,p]of w.pawns.entries()){
  Object.assign(p,{x:3,z:3+i*4,hunger:70,rest:80,needCooldown:20});
  p.schedule.fill('anything');p.recreation.level=100;
  for(const key of Object.keys(p.priorities)as(keyof Pawn['priorities'])[])p.priorities[key]=0;
 }
 expect(w.tick).toBe(0);expect(w.phaseCore297).toBe(0);return w;
}
function command(w:World,c:Command){const result=applyCommand(w,c);expect(result.ok,result.reason??c.type).toBe(true);}
function step(w:World){const previous=effectiveCore297(w),result=advanceWorldCore297(w);expect(result.core).toBe(previous+1);expect(effectiveCore297(w)).toBe(previous+1);}
function through(w:World,target:number){expect(target-effectiveCore297(w)).toBeLessThanOrEqual(200);while(effectiveCore297(w)<target)step(w);expect(effectiveCore297(w)).toBe(target);}
function queueOne(w:World,p:Pawn){command(w,{type:'draft-move',pawnIds:[p.id],target:{x:4,z:p.z},queue:false});command(w,{type:'draft-move',pawnIds:[p.id],target:{x:14,z:p.z},queue:true});expect(p.draft!.queue).toEqual([{x:14,z:p.z}]);expect(p.motion).toBeDefined();}
function localAliases(w:World){const id=w.worldMaps!.rootMapId!,view=registeredMap(w,id)!;flushRegisteredMap(view);expect(view.corePathBudget297).toBe(w.corePathBudget297);expect(registeredMapForValidation(w,id)!.corePathBudget297).toBe(w.corePathBudget297);expect('corePathBudget297'in sharedCampaignData(w)).toBe(false);expect(view.phaseCore297).toBe(w.phaseCore297);}
function physical(w:World){return {core:effectiveCore297(w),tick:w.tick,phase:w.phaseCore297,rng:w.rng,budget:structuredClone(w.corePathBudget297),pawns:w.pawns.map(p=>({id:p.id,x:p.x,z:p.z,path:structuredClone(p.path),motion:structuredClone(p.motion),cooldown:p.moveCooldown,plan:p.planCooldown,draft:structuredClone(p.draft)}))};}

test('real queued searches exhaust the local budget before phase7; reload cannot grant fresh automatic credits',()=>{
 const w=scene(),pawns=w.pawns;
 command(w,{type:'draft',pawnIds:pawns.map(p=>p.id),enabled:true});
 // Capture one REAL cardinal edge solely to align a bounded scenario. StopDead
 // is an actual button at the same unplayed frontier; no duration is injected.
 const probe=pawns[0]!;command(w,{type:'draft-move',pawnIds:[probe.id],target:{x:4,z:probe.z},queue:false});
 const firstDuration=Math.ceil(probe.motion!.end*10)-effectiveCore297(w);expect(firstDuration).toBeGreaterThanOrEqual(12);expect(firstDuration).toBeLessThan(120);
 command(w,{type:'draft-stop',pawnIds:[probe.id]});expect(probe.motion).toBeUndefined();expect(probe.x).toBe(3);
 const start=(4-firstDuration%10+10)%10;through(w,start);
 for(const p of pawns.slice(0,8))queueOne(w,p);
 const arrival=Math.ceil(pawns[0]!.motion!.end*10);expect(arrival%10).toBe(4);
 expect(pawns.slice(0,8).every(p=>Math.ceil(p.motion!.end*10)===arrival)).toBe(true);
 through(w,start+5);for(const p of pawns.slice(8))queueOne(w,p);
 expect(pawns.slice(8).every(p=>Math.ceil(p.motion!.end*10)===arrival+5)).toBe(true);
 const forkCore=arrival+3;through(w,forkCore);
 expect(w.phaseCore297).toBe(7);expect(pawns.slice(0,8).every(p=>p.draft!.queue.length===0&&p.draft!.target?.x===14)).toBe(true);
 expect(pawns.slice(8).every(p=>p.draft!.queue.length===1&&p.draft!.target?.x===4)).toBe(true);
 expect(w.corePathBudget297).toEqual({tick:w.tick,remaining:0,pairs:32768});localAliases(w);
 expect(validateWorld(w)).toEqual([]);
 const rng=w.rng,raw=serializeWorld(w),reloaded=deserializeWorld(raw);
 expect(w.rng).toBe(rng);expect(serializeWorld(reloaded)).toBe(raw);expect(physical(reloaded)).toEqual(physical(w));localAliases(reloaded);
 // Missing the actual intermediate-phase owner is a refusal, never a reset8.
 const missing=JSON.parse(raw);delete missing.corePathBudget297;expect(()=>deserializeWorld(JSON.stringify(missing))).toThrow();
 // NO player input after the fork. The late two actors naturally arrive at
 // phase9, when the genuinely exhausted owner must defer their queued search.
 for(let n=0;n<3;n++){
  step(w);step(reloaded);expect(physical(reloaded)).toEqual(physical(w));localAliases(w);localAliases(reloaded);
  expect(serializeWorld(reloaded)).toBe(serializeWorld(w));
  if(w.phaseCore297===9){expect(w.corePathBudget297!.remaining).toBe(0);expect(w.pawns.slice(8).every(p=>p.draft!.queue.length===1&&p.path.length===0)).toBe(true);}
 }
 expect(w.phaseCore297).toBe(0);expect(w.corePathBudget297!.remaining).toBe(6);expect(w.pawns.slice(8).every(p=>p.draft!.queue.length===0&&p.draft!.target?.x===14)).toBe(true);
 // Span several subsequent real macro resets and automatic path continuations.
 for(let n=0;n<80;n++){step(w);step(reloaded);expect(physical(reloaded)).toEqual(physical(w));}
 expect(validateWorld(w)).toEqual([]);expect(validateWorld(reloaded)).toEqual([]);expect(serializeWorld(reloaded)).toBe(serializeWorld(w));
});
