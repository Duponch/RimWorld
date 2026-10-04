import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld,addGroundMaterial } from '../src/sim/index.ts';
import { constructionRecipe,constructionSupplied,deliveredMaterial,requiredMaterial } from '../src/sim/construction-materials.ts';
import { cookingSpot } from '../src/sim/cooking-bills.ts';
import { fuelLimit,newBuildingFuel } from '../src/sim/fuel.ts';
import { advancePower } from '../src/sim/power.ts';
import { newPowerState,isPowerActive } from '../src/sim/power-rules.ts';
import { COMPLEX_FURNITURE_RESEARCH_COST,HOSPITAL_BED_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST,hospitalBedUnlocked,processResearch,researchStationUsable } from '../src/sim/research.ts';
import { structureMaxHp } from '../src/sim/thing-damage-rules.ts';
import type { Structure,World } from '../src/sim/types.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import { medicalCamp } from './scenarios/health.ts';

function parents(w:World):void {
  w.research={project:null,points:0,microelectronics:{points:MICROELECTRONICS_RESEARCH_COST,completedAt:0},complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0}};
}
function unlocked(w:World):void {parents(w);w.research!.hospitalBed={points:HOSPITAL_BED_RESEARCH_COST,completedAt:0};}
function until(w:World,done:()=>boolean,limit=2500):void {
  for(let i=0;i<limit&&!done();i++){stepWorld(w);if(i%100===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({state:p.state,job:p.jobId,haul:p.haul,path:p.path}))})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
function researchCamp():{w:World;desk:Structure;source:Structure} {
  const w=medicalCamp(),pawn=w.pawns[0]!;parents(w);pawn.priorities.research=1;
  // Prepared, connected and fueled equipment; research itself starts at zero.
  const source:Structure={id:w.nextId++,kind:'wood-generator',x:4,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('wood-generator'),fuel:{...newBuildingFuel('wood-generator'),ticks:fuelLimit('wood-generator')}};
  const desk:Structure={id:w.nextId++,kind:'hi-tech-research-bench',x:8,z:8,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:source.id}};
  w.structures.push(source,desk);advancePower(w);expect(isPowerActive(desk)).toBe(true);return {w,desk,source};
}
const pileQuantity=(w:World,item:'steel'|'component')=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);

test('hospital research refuses each missing parent without creating progress or an unfinished project',()=>{
  const w=medicalCamp();w.research={project:null,points:0};
  const before=serializeWorld(w);expect(applyCommand(w,{type:'research-project',project:'hospital-bed'}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  w.research.microelectronics={points:MICROELECTRONICS_RESEARCH_COST,completedAt:0};
  const oneParent=serializeWorld(w);expect(applyCommand(w,{type:'research-project',project:'hospital-bed'}).ok).toBe(false);expect(serializeWorld(w)).toBe(oneParent);
  parents(w);delete w.research!.microelectronics;
  expect(applyCommand(w,{type:'research-project',project:'hospital-bed'}).ok).toBe(false);
  parents(w);expect(applyCommand(w,{type:'research-project',project:'hospital-bed'}).ok).toBe(true);
  expect(w.research!.hospitalBed).toEqual({points:0});expect(HOSPITAL_BED_RESEARCH_COST).toBe(1_200_000_000);
});

test('hospital research walks to a powered advanced desk without analyzer; no contact, simple desk and outage give no points or XP',()=>{
  const {w,desk}=researchCamp(),pawn=w.pawns[0]!,spot=cookingSpot(desk);
  expect(w.structures.some(s=>s.kind==='multi-analyzer')).toBe(false);
  expect(applyCommand(w,{type:'research-project',project:'hospital-bed'}).ok).toBe(true);
  expect(researchStationUsable(w,desk,'hospital-bed')).toBe(true);
  const simple:Structure={id:w.nextId++,kind:'research-bench',x:18,z:8,orientation:0,footprint:'standard',material:'wood'};
  w.structures.push(simple);expect(researchStationUsable(w,simple,'hospital-bed')).toBe(false);
  const xp=pawn.skills.intellectual?.dailyXp??0;
  stepWorld(w);expect(w.research!.hospitalBed!.points).toBe(0);expect(pawn.skills.intellectual?.dailyXp??0).toBe(xp);
  expect(pawn.research?.stationId).toBe(desk.id);expect(pawn.research?.facilityId).toBeUndefined();
  until(w,()=>w.research!.hospitalBed!.points>0,500);
  expect({x:pawn.x,z:pawn.z}).toEqual(spot);expect(pawn.state).toBe('working');expect(pawn.skills.intellectual!.dailyXp).toBeGreaterThan(xp);
  const moving=deserializeWorld(serializeWorld(w));stepWorld(w,7);stepWorld(moving,7);expect(moving).toEqual(w);
  const points=w.research!.hospitalBed!.points,workedXp=pawn.skills.intellectual!.dailyXp;
  desk.power!.switchOn=false;processResearch(w,pawn,()=>{throw Error('outage should release service');},()=>1_000_000,()=>undefined);
  expect(w.research!.hospitalBed!.points).toBe(points);expect(pawn.skills.intellectual!.dailyXp).toBe(workedXp);expect(pawn.research).toBeUndefined();
  // An invalid ordinary-desk service must also fail before consuming work.
  pawn.research={stationId:simple.id,spot:cookingSpot(simple),worked:0};
  processResearch(w,pawn,()=>undefined,()=>1_000_000,()=>undefined);
  expect(w.research!.hospitalBed!.points).toBe(points);expect(pawn.research).toBeUndefined();
});

test('prepared final research boundary completes only through actual work, unlocks construction and survives exact continuation',()=>{
  const {w,desk}=researchCamp(),pawn=w.pawns[0]!;
  expect(applyCommand(w,{type:'research-project',project:'hospital-bed'}).ok).toBe(true);
  // This is a prepared completion boundary, not a 1200-point natural campaign.
  w.research!.hospitalBed!.points=HOSPITAL_BED_RESEARCH_COST-1;
  stepWorld(w);expect(hospitalBedUnlocked(w)).toBe(false);
  const copy=deserializeWorld(serializeWorld(w));until(w,()=>hospitalBedUnlocked(w),500);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  expect(w.research!.hospitalBed).toEqual({points:HOSPITAL_BED_RESEARCH_COST,completedAt:w.tick});expect(w.research!.project).toBeNull();
  expect(pawn.research).toBeUndefined();expect(w.structures).toContain(desk);
  expect(applyCommand(w,{type:'designate',kind:'hospital-bed',x:20,z:16}).ok).toBe(true);
});

test('hospital recipe rejects locked research and incompatible materials; physical deliveries cannot finish with four components or Construction 7',()=>{
  const w=deconstructionCamp(2);parents(w);
  const before=serializeWorld(w);expect(applyCommand(w,{type:'designate',kind:'hospital-bed',x:17,z:16}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  unlocked(w);
  for(const material of ['wood','granite-blocks'] as const)expect(applyCommand(w,{type:'designate',kind:'hospital-bed',material,x:17,z:16}).ok).toBe(false);
  expect(constructionRecipe({kind:'hospital-bed',material:'steel'})).toEqual({ingredients:[{item:'steel',quantity:120},{item:'component',quantity:5}],work:280,coreWork:2800});
  for(const pawn of w.pawns){pawn.priorities.build=1;pawn.priorities.haul=1;pawn.skills.construction.level=7;}
  addGroundMaterial(w,'steel',120,{x:10,z:16},'steel');addGroundMaterial(w,'component',4,{x:10,z:18},'component');
  expect(applyCommand(w,{type:'designate',kind:'hospital-bed',x:17,z:16}).ok).toBe(true);const job=w.jobs[0]!;
  expect(job.material).toBe('steel');
  until(w,()=>deliveredMaterial(w,job,'steel')===120&&deliveredMaterial(w,job,'component')===4);
  expect(constructionSupplied(w,job)).toBe(false);expect(job.progress).toBe(0);expect(w.structures).toEqual([]);
  addGroundMaterial(w,'component',1,{x:10,z:18},'component');until(w,()=>constructionSupplied(w,job));
  stepWorld(w,25);expect(job.progress).toBe(0);expect(w.structures).toEqual([]);
  for(const pawn of w.pawns)pawn.skills.construction.level=8;
  until(w,()=>job.progress>30&&job.progress<280);const inProgress=serializeWorld(w),rng=w.rng,copy=deserializeWorld(inProgress);
  expect(pileQuantity(w,'steel')).toBe(120);expect(pileQuantity(w,'component')).toBe(5);
  until(w,()=>w.structures.length===1);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  const bed=w.structures[0]!;expect(bed).toMatchObject({kind:'hospital-bed',material:'steel',medical:true});expect(bed.quality).toBeDefined();expect(structureMaxHp(bed)).toBe(150);
  expect(w.rng).not.toBe(rng);expect(pileQuantity(w,'steel')).toBe(0);expect(pileQuantity(w,'component')).toBe(0);
  expect(requiredMaterial(bed,'steel')).toBe(120);expect(requiredMaterial(bed,'component')).toBe(5);
  const final=deserializeWorld(serializeWorld(w));expect(final).toEqual(w);expect(final.structures[0]!.quality).toBe(bed.quality);
});

test('completed hospital repairs physically without ingredients or rerolled quality; deconstruction returns bounded steel and components',()=>{
  const w=deconstructionCamp();unlocked(w);const pawn=w.pawns[0]!;pawn.skills.construction.level=8;
  addGroundMaterial(w,'steel',120,{x:10,z:16},'steel');addGroundMaterial(w,'component',5,{x:10,z:18},'component');
  expect(applyCommand(w,{type:'designate',kind:'hospital-bed',x:17,z:16}).ok).toBe(true);until(w,()=>w.structures.length===1);
  const bed=w.structures[0]!,quality=bed.quality;bed.damage=5;
  expect(applyCommand(w,{type:'area',action:'home',from:bed,to:bed}).ok).toBe(true);
  expect(bed.damage).toBe(5);until(w,()=>pawn.state==='working'&&!!w.jobs.find(j=>j.repair));
  const copy=deserializeWorld(serializeWorld(w));until(w,()=>bed.damage===undefined);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  expect(bed.quality).toBe(quality);expect(pileQuantity(w,'steel')).toBe(0);expect(pileQuantity(w,'component')).toBe(0);
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:bed.x,z:bed.z}).ok).toBe(true);
  until(w,()=>!w.structures.length);
  expect(pileQuantity(w,'steel')).toBe(60);expect([2,3]).toContain(pileQuantity(w,'component'));
  expect(pileQuantity(w,'steel')+(w.deconstructed.lostSteel??0)).toBe(120);
  expect(pileQuantity(w,'component')+(w.deconstructed.lostComponents??0)).toBe(5);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
