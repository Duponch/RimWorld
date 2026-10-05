import {expect} from 'vitest';
import {applyCommand,stepWorld} from '../../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {triggerBreakdown} from '../../src/sim/breakdowns.ts';
import {addGroundMaterial} from '../../src/sim/materials.ts';
import {deconstructionCamp} from './deconstruction.ts';
import {fixturePower} from './power.ts';
import type {World,Pawn} from '../../src/sim/types.ts';
import type * as Wood from './wood-conservation.ts';
import type * as Repair from './repair-conservation.ts';

/** Both test entry points import their two probes, in opposite orders, before
 * this engine consumer. File isolation gives each order a fresh module graph;
 * no resetModules, global unmock or inferred component credit repairs a miss. */
export function instrumentationOrderProof(wood:typeof Wood,repair:typeof Repair):void {
  const w=deconstructionCamp(2),builder=w.pawns[0]!,gatherer=w.pawns[1]!;
  builder.schedule.fill('work');builder.priorities.haul=1;
  gatherer.schedule.fill('work');
  for(const work of Object.keys(gatherer.priorities) as (keyof Pawn['priorities'])[])gatherer.priorities[work]=0;
  gatherer.priorities.gather=1;
  const generator=fixturePower(w,'wood-generator',16,16),tree={id:w.nextId++,kind:'tree' as const,x:8,z:14,amount:12};
  w.resources.push(tree);
  addGroundMaterial(w,'component',1,{x:14,z:16},'component');
  expect(applyCommand(w,{type:'area',action:'home',from:generator,to:generator}).ok).toBe(true);
  expect(triggerBreakdown(w,generator.id)).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'chop',x:tree.x,z:tree.z}).ok).toBe(true);
  expect(validateWorld(w)).toEqual([]);
  const woodLedger=wood.createWoodLedger(),repairLedger=repair.createRepairLedger(),initialWood=wood.conservedWood(w,woodLedger);
  const componentStock=(v:World)=>v.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0);
  let restored:World|undefined,restoredWood:ReturnType<typeof wood.createWoodLedger>|undefined,restoredRepair:ReturnType<typeof repair.createRepairLedger>|undefined;
  let delivered=false,worked=false;
  for(let n=0;n<600&&(repairLedger.spent===0||w.resources.some(r=>r.id===tree.id));n++){
    repair.trackMaintenanceStep(w,repairLedger,()=>wood.trackWoodStep(w,woodLedger,()=>stepWorld(w)));
    expect(componentStock(w)+repairLedger.spent).toBe(1);
    expect(wood.conservedWood(w,woodLedger)).toBeCloseTo(initialWood,7);
    expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
    worked ||= w.jobs.some(j=>j.kind==='fix-breakdown'&&j.progress>0);
    if(restored){
      const c=restored;
      repair.trackMaintenanceStep(c,restoredRepair!,()=>wood.trackWoodStep(c,restoredWood!,()=>stepWorld(c)));
      expect(serializeWorld(c)).toBe(serializeWorld(w));
      expect(restoredRepair).toEqual(repairLedger);expect(restoredWood).toEqual(woodLedger);
    } else if(w.piles.some(p=>p.item==='component'&&p.owner.type==='job')){
      delivered=true;restored=deserializeWorld(serializeWorld(w));
      restoredWood=wood.readWoodLedger(JSON.parse(JSON.stringify(woodLedger)));
      restoredRepair=repair.readRepairLedger(JSON.parse(JSON.stringify(repairLedger)));
    }
  }
  expect(delivered).toBe(true);expect(worked).toBe(true);expect(restored).toBeDefined();
  expect(repairLedger.spent).toBe(1);expect(repairLedger.successes+repairLedger.failures).toBe(1);
  expect(componentStock(w)).toBe(0);
  expect(w.resources.some(r=>r.id===tree.id)).toBe(false);
  expect(woodLedger.nominalRemoved).toBe(12);expect(woodLedger.produced).toBeGreaterThan(0);
  expect(w.structures.find(s=>s.id===generator.id)).toBe(generator);
  expect(!!generator.breakdown).toBe(repairLedger.failures===1);
}
