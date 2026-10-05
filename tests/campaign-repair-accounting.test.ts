import {createRepairLedger,readRepairLedger,trackMaintenanceStep} from './scenarios/repair-conservation.ts';
import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {advanceBreakdownFix,triggerBreakdown} from '../src/sim/breakdowns.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {fixturePower} from './scenarios/power.ts';
import type {World} from '../src/sim/types.ts';

const componentStock=(w:World)=>w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0);
function repairCamp(){
  const world=deconstructionCamp(),pawn=world.pawns[0]!,building=fixturePower(world,'wood-generator',16,16);
  pawn.schedule.fill('work');pawn.priorities.haul=1;
  expect(applyCommand(world,{type:'area',action:'home',from:building,to:building}).ok).toBe(true);
  expect(triggerBreakdown(world,building.id)).toBe(true);
  return {world,pawn,building,job:world.jobs.find(j=>j.fixBreakdown?.structureId===building.id)!};
}

test('Campaign repair ledger follows real delivery and success across exact World/notebook continuation',()=>{
  const {world,pawn,building}=repairCamp(),ledger=createRepairLedger();
  addGroundMaterial(world,'component',1,{x:14,z:16},'component');
  expect(pawn.skills.construction.level).toBe(8);
  let copy:World|undefined,copyLedger:ReturnType<typeof createRepairLedger>|undefined,sawDelivery=false;
  for(let n=0;n<1200&&building.breakdown;n++){
    trackMaintenanceStep(world,ledger,()=>stepWorld(world));
    if(copy){const restored=copy;trackMaintenanceStep(restored,copyLedger!,()=>stepWorld(restored));expect(serializeWorld(restored)).toBe(serializeWorld(world));expect(copyLedger).toEqual(ledger);}
    expect(componentStock(world)+ledger.spent).toBe(1);expect(validateWorld(world)).toEqual([]);
    if(!copy&&world.piles.some(p=>p.item==='component'&&p.owner.type==='job')){
      sawDelivery=true;copy=deserializeWorld(serializeWorld(world));copyLedger=readRepairLedger(JSON.parse(JSON.stringify(ledger)));
    }
  }
  expect(sawDelivery).toBe(true);expect(copy).toBeDefined();
  expect(building.breakdown).toBeUndefined();expect(ledger).toEqual({revision:1,spent:1,successes:1,failures:0});
  expect(componentStock(world)).toBe(0);
},10000);

test('Incomplete work/refusal spends zero, failure spends exactly its delivered piece, and unrelated loss remains detectable',()=>{
  const {world,pawn,building,job}=repairCamp(),ledger=createRepairLedger(),before=serializeWorld(world);
  trackMaintenanceStep(world,ledger,()=>expect(advanceBreakdownFix(world,pawn,job)).toBeNull());
  expect(serializeWorld(world)).toBe(before);expect(ledger.spent).toBe(0);
  addGroundMaterial(world,'component',1,{x:14,z:16},'component');
  const piece=world.piles.find(p=>p.item==='component')!;piece.owner={type:'job',jobId:job.id};
  trackMaintenanceStep(world,ledger,()=>expect(advanceBreakdownFix(world,pawn,job)).toBeNull());
  expect(componentStock(world)).toBe(1);expect(job.progress).toBe(1);expect(ledger.spent).toBe(0);
  // A controlled branch of the existing V144 producer, without forcing its return.
  pawn.skills.construction.level=0;world.breakdown!.rng=12345;job.progress=99;
  const brokenAt=building.breakdown!.brokenAt;
  trackMaintenanceStep(world,ledger,()=>expect(advanceBreakdownFix(world,pawn,job)).toBe('failure'));
  expect(building.breakdown?.brokenAt).toBe(brokenAt);expect(componentStock(world)).toBe(0);
  expect(ledger).toEqual({revision:1,spent:1,successes:0,failures:1});
  addGroundMaterial(world,'component',3,{x:14,z:16},'component');
  const conserved=componentStock(world)+ledger.spent;
  trackMaintenanceStep(world,ledger,()=>{world.piles.find(p=>p.item==='component')!.quantity--;});
  expect(ledger.spent).toBe(1);expect(componentStock(world)+ledger.spent).toBe(conserved-1);
});

test('Repair checkpoint revisions reject absent, forged, fractional and inconsistent notebooks',()=>{
  const ledger={revision:1,spent:5,successes:3,failures:2};
  expect(readRepairLedger(JSON.parse(JSON.stringify(ledger)))).toEqual(ledger);
  for(const value of [undefined,{}, {...ledger,revision:0},{...ledger,spent:4},{...ledger,failures:.5},{...ledger,spent:-1},{...ledger,extra:0}])
    expect(()=>readRepairLedger(value)).toThrow();
});
