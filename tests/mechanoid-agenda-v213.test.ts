import {expect,test} from 'vitest';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {createMechanoidRaid,advanceMechanoidRaid,chooseMechanoidOpportunity,chooseMechanoidComposition,mechFactionCommonality,mechMaxPawnCost} from '../src/sim/mechanoid-raids.ts';
import {validateMechanoidRaids} from '../src/sim/mechanoid-raid-save.ts';
import {createMechaMedicalRecord,commitMechanoidImpact} from '../src/sim/mechanoid-health.ts';
import {addResolvedInjury} from '../src/sim/injury-state.ts';
import {TICKS_PER_DAY} from '../src/sim/types.ts';
function camp(count=4){
 const w=createScenarioWorld(42,32,'crashlanded');w.tick=1;w.resources=[];w.structures=[];w.jobs=[];w.piles=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));delete w.wildlife;
 const g=createMechanoidRaid(w,{budget:count*150,roster:Array.from({length:count},()=> 'scyther' as const)},{rng:50},Array.from({length:count},(_,i)=>({x:0,z:8+i*2})))!;expect(g).not.toBeNull();return {w,g};
}
test('Core cost, faction curve and silent group tickets retain their distinct bounds',()=>{
 expect([300,700,1400,2800,4000].map(mechFactionCommonality)).toEqual([0,1,1.8,2.2,2.6]);
 expect(mechMaxPawnCost(110)).toBe(132);expect(mechMaxPawnCost(400)).toBe(200);expect(mechMaxPawnCost(900)).toBe(300);
 let served=false,absent=false;for(let seed=1;seed<1000;seed++){
  const choice=chooseMechanoidComposition(600,{rng:(Math.imul(seed,2654435761)>>>0)||1});if(choice){served=true;expect(choice.roster).toEqual(['scyther','scyther','scyther','scyther']);}else absent=true;
 }
 expect(served&&absent).toBe(true);
 const {w}=camp(1);for(const [tick,points] of [[45*TICKS_PER_DAY-1,700],[45*TICKS_PER_DAY,300]] as const){w.tick=tick;const random={rng:50};expect(chooseMechanoidOpportunity(w,points,random)).toBeUndefined();expect(random.rng).toBe(50);}
});
test('stage deadline is strict and only cumulative real losses reach the thirty-percent trigger',()=>{
 const {w,g}=camp();const end=g.stage.activatedAtCore+g.stage.delayCore;
 advanceMechanoidRaid(w,end);expect(g.phase).toBe('staging');advanceMechanoidRaid(w,end+1);expect(g.phase).toBe('assault');
 const second=camp();const actor=second.w.mechanoids![0]!,nonfatal=createMechaMedicalRecord(second.w.tick);
 addResolvedInjury(nonfatal,'scyther-thorax','crack',1000,()=>.99);expect(commitMechanoidImpact(second.w,actor,nonfatal,{rng:second.w.rng},second.w.tick*10)).toBe(true);
 advanceMechanoidRaid(second.w);expect(second.g.phase).toBe('staging');expect(second.g.lost).toEqual([]);
 for(let i=0;i<2;i++){
  const m=second.w.mechanoids![i]!,record=createMechaMedicalRecord(second.w.tick);addResolvedInjury(record,'scyther-reactor','crack',27000,()=>.99);
  expect(commitMechanoidImpact(second.w,m,record,{rng:second.w.rng},second.w.tick*10)).toBe(true);advanceMechanoidRaid(second.w);
  expect(second.g.phase).toBe(i===0?'staging':'assault');
 }
});
test('lost historical identity cannot reuse a present human owner and failures do not adopt IDs or PRNG',()=>{
 const {w,g}=camp(),removed=g.members[0]!;w.mechanoids=w.mechanoids!.filter(m=>m.id!==removed);g.members[0]=w.pawns[0]!.id;g.lost=[w.pawns[0]!.id];
 expect(validateMechanoidRaids(w)).toContain('Mechanical historical identity reused by another owner.');
 const fresh=createScenarioWorld(42,32,'crashlanded');fresh.nextId=Number.MAX_SAFE_INTEGER;const before=structuredClone(fresh),random={rng:50};
 expect(createMechanoidRaid(fresh,{budget:150,roster:['scyther']},random,[{x:0,z:8}])).toBeNull();expect(fresh).toEqual(before);expect(random.rng).toBe(50);
});
test('empty group resolves once while surviving mechanical assault never borrows colony-down or pirate retreat',()=>{
 const {w,g}=camp(1);for(const p of w.pawns)p.state='dead';g.phase='assault';advanceMechanoidRaid(w);expect(w.raids!.mechActive).toBe(g);
 const m=w.mechanoids![0]!,record=createMechaMedicalRecord(w.tick);addResolvedInjury(record,'scyther-reactor','crack',27000,()=>.99);
 expect(commitMechanoidImpact(w,m,record,{rng:w.rng},w.tick*10)).toBe(true);advanceMechanoidRaid(w);advanceMechanoidRaid(w);
 expect(w.raids!.completed).toBe(1);expect(w.raids!.mechActive).toBeUndefined();expect(w.raids!.last?.reason).toBe('defended');
});
