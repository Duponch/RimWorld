import { expect,test } from 'vitest';
import { createWorld,footprintCells } from '../src/sim/index.ts';
import { cookingSpot } from '../src/sim/cooking-bills.ts';
import { newCookingBill } from '../src/sim/cooking-bills.ts';
import { validateResearch } from '../src/sim/research-save.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { FABRICATION_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST,MULTI_ANALYZER_RESEARCH_COST,microelectronicsUnlocked,multiAnalyzerUnlocked,processResearch,researchProposal,researchRate,researchStationUsable,selectResearch } from '../src/sim/research.ts';
import { WorkEnvironmentCache } from '../src/sim/work-environment.ts';
import type { Structure,World } from '../src/sim/types.ts';

function fixture(count=1):World {
  const w=createWorld(419,32,32);w.structures=[];w.jobs=[];w.pawns=w.pawns.slice(0,count);w.tick=100;w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  for(const pawn of w.pawns){pawn.x=8;pawn.z=7;pawn.priorities.research=1;}
  w.research={project:null,points:0};
  return w;
}
function building(w:World,kind:Structure['kind'],x:number,z:number,orientation:Structure['orientation']=0):Structure {
  const s:Structure={id:w.nextId++,kind,x,z,orientation,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
  w.structures.push(s);return s;
}
function acquired(w:World,key:'microelectronics'|'multiAnalyzer'|'machining'|'smithing',cost:number):void {
  w.research![key]={points:cost,completedAt:0};
}

test('V123 project prerequisites and historical schema reject future progress',()=>{
  const w=fixture();
  expect(selectResearch(w,'multi-analyzer')).toMatchObject({ok:false});
  expect(selectResearch(w,'fabrication')).toMatchObject({ok:false});
  expect(selectResearch(w,'microelectronics')).toMatchObject({ok:true});
  expect(w.research?.microelectronics).toEqual({points:0});
  expect(validateResearch(w,122)).toContain('Invalid research project.');
  w.research!.microelectronics={points:MICROELECTRONICS_RESEARCH_COST,completedAt:0};w.research!.project=null;
  expect(microelectronicsUnlocked(w)).toBe(true);
  expect(selectResearch(w,'multi-analyzer')).toMatchObject({ok:false}); // hidden Machining prerequisite
  acquired(w,'smithing',700_000_000);acquired(w,'machining',1000_000_000);
  expect(selectResearch(w,'multi-analyzer')).toMatchObject({ok:true});
  expect(w.research?.multiAnalyzer).toEqual({points:0});
  expect(selectResearch(w,'fabrication')).toMatchObject({ok:false});
  w.research!.multiAnalyzer={points:MULTI_ANALYZER_RESEARCH_COST,completedAt:0};w.research!.project=null;
  expect(multiAnalyzerUnlocked(w)).toBe(true);
  expect(selectResearch(w,'fabrication')).toMatchObject({ok:true});
  expect(w.research?.fabrication).toEqual({points:0});
});

test('V123 stations require power and fabrication facility within occupied-cell radius',()=>{
  const w=fixture(),simple=building(w,'research-bench',8,8),advanced=building(w,'hi-tech-research-bench',14,8);
  expect(footprintCells(advanced)).toHaveLength(10);
  expect(researchStationUsable(w,simple,'microelectronics')).toBe(true);
  expect(researchStationUsable(w,simple,'multi-analyzer')).toBe(false);
  expect(researchStationUsable(w,advanced,'multi-analyzer')).toBe(true);
  advanced.power!.on=false;expect(researchStationUsable(w,advanced,'multi-analyzer')).toBe(false);advanced.power!.on=true;
  const far=building(w,'multi-analyzer',30,30);expect(researchStationUsable(w,advanced,'fabrication')).toBe(false);
  const near=building(w,'multi-analyzer',18,11);expect(footprintCells(near)).toHaveLength(4);
  expect(researchStationUsable(w,advanced,'fabrication',near.id)).toBe(true);
  expect(researchStationUsable(w,advanced,'fabrication',far.id)).toBe(false);
  near.power!.on=false;expect(researchStationUsable(w,advanced,'fabrication',near.id)).toBe(false);
});

test('V123 research pauses immediately when facility loses power, retaining exact points',()=>{
  const w=fixture(),pawn=w.pawns[0]!,desk=building(w,'hi-tech-research-bench',8,8),facility=building(w,'multi-analyzer',10,10);
  acquired(w,'microelectronics',MICROELECTRONICS_RESEARCH_COST);acquired(w,'smithing',700_000_000);acquired(w,'machining',1000_000_000);acquired(w,'multiAnalyzer',MULTI_ANALYZER_RESEARCH_COST);
  expect(selectResearch(w,'fabrication')).toMatchObject({ok:true});
  const spot=cookingSpot(desk);pawn.x=spot.x;pawn.z=spot.z;pawn.research={stationId:desk.id,facilityId:facility.id,spot,worked:0};
  processResearch(w,pawn,()=>undefined,()=>1_100_000,()=>undefined);
  expect(w.research!.fabrication!.points).toBe(1_100_000);
  expect(validateResearch(w,123)).toEqual([]);
  facility.power!.on=false;
  processResearch(w,pawn,()=>undefined,()=>1_000_000,()=>undefined);
  expect(pawn.research).toBeUndefined();expect(w.research!.fabrication!.points).toBe(1_100_000);
  expect(w.research!.fabrication!.points).toBeLessThan(FABRICATION_RESEARCH_COST);
});

test('V123 analyzer boosts another advanced research but its outage does not block it',()=>{
  const w=fixture(),pawn=w.pawns[0]!,desk=building(w,'hi-tech-research-bench',8,8),facility=building(w,'multi-analyzer',10,10);
  acquired(w,'smithing',700_000_000);acquired(w,'machining',1000_000_000);acquired(w,'microelectronics',MICROELECTRONICS_RESEARCH_COST);acquired(w,'multiAnalyzer',MULTI_ANALYZER_RESEARCH_COST);
  expect(selectResearch(w,'gunsmithing')).toMatchObject({ok:true});
  const spot=cookingSpot(desk);pawn.x=spot.x;pawn.z=spot.z;pawn.research={stationId:desk.id,facilityId:facility.id,spot,worked:0};
  processResearch(w,pawn,()=>undefined,()=>1_100_000,()=>undefined);
  expect(w.research!.gunsmithing!.points).toBe(1_100_000);
  facility.power!.on=false;
  processResearch(w,pawn,()=>undefined,()=>1_000_000,()=>undefined);
  expect(w.research!.gunsmithing!.points).toBe(2_100_000);
  expect(pawn.research).toBeDefined();
});

test('powered advanced bench uses Core 1.0 versus the simple bench 0.75',()=>{
  const w=fixture(),pawn=w.pawns[0]!,simple=building(w,'research-bench',8,8),advanced=building(w,'hi-tech-research-bench',12,8),environment=new WorkEnvironmentCache().read(w);
  expect(Math.abs(researchRate(pawn,advanced,environment,20,w)-researchRate(pawn,simple,environment,20,w)*4/3)).toBeLessThanOrEqual(1);
});

test('V123 save rejects component bills, workpieces and queued work before Fabrication',()=>{
  const w=fixture(),station=building(w,'fabrication-bench',12,12);
  station.bills=[newCookingBill(w.nextId++,'make-component')];
  expect(validateResearch(w,123)).toContain('Locked component production.');
  station.bills=[];
  w.piles.push({id:w.nextId++,item:'unfinished-component',kind:'unfinished',quantity:1,owner:{type:'ground',x:8,z:8},componentWork:{recipe:'make-component',authorId:w.pawns[0]!.id,progress:0,parts:[12]}});
  expect(validateResearch(w,123)).toContain('Locked component production.');
  w.piles=[];
  w.pawns[0]!.orders.queue.push({cooking:{recipe:'make-component'} as never});
  expect(validateResearch(w,123)).toContain('Locked component production.');
});

test('one analyzer supplies several desks while each desk remains exclusively reserved',()=>{
  const w=fixture(2),[first,second]=w.pawns,deskA=building(w,'hi-tech-research-bench',8,8),deskB=building(w,'hi-tech-research-bench',16,8);
  const analyzerA=building(w,'multi-analyzer',12,10),analyzerB=building(w,'multi-analyzer',20,10);
  acquired(w,'smithing',700_000_000);acquired(w,'machining',1000_000_000);acquired(w,'microelectronics',MICROELECTRONICS_RESEARCH_COST);acquired(w,'multiAnalyzer',MULTI_ANALYZER_RESEARCH_COST);
  expect(selectResearch(w,'fabrication')).toMatchObject({ok:true});
  const spotA=cookingSpot(deskA),spotB=cookingSpot(deskB);
  first!.x=spotA.x;first!.z=spotA.z;first!.state='working';first!.research={stationId:deskA.id,facilityId:analyzerA.id,spot:spotA,worked:0};
  second!.x=17;second!.z=7;
  const reach=reachableCells(w,second!,blockedCells(w),new Set());
  const proposal=researchProposal(w,second!,reach);
  expect(proposal?.task).toMatchObject({stationId:deskB.id,facilityId:analyzerA.id,spot:spotB});
  second!.x=spotB.x;second!.z=spotB.z;second!.state='working';second!.path=[];
  second!.research={...proposal!.task,facilityId:analyzerA.id};
  expect(validateResearch(w,123)).toEqual([]);
  second!.research=proposal!.task;
  expect(validateResearch(w,123)).toEqual([]);
});
