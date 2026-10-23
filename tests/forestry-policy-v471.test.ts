import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index';
import {TREE_SOWING_COST_291} from '../src/sim/forestry-content-291';
import {workProgress} from '../src/sim/work-progress';
import {forestryCamp471} from './scenarios/forestry-v471';

test('a declared near-complete research finishes by real bench work and its checkpoint resumes unchanged',()=>{
 const w=forestryCamp471(false),p=w.pawns[0]!;w.growingZones[0]!.allowSow=false;p.priorities.research=1;
 expect(applyCommand(w,{type:'research-project',project:'tree-sowing'}).ok).toBe(true);
 expect(w.research!.treeSowing291).toEqual({points:0});w.research!.treeSowing291!.points=TREE_SOWING_COST_291-1_000_000;
 let worked=false;
 for(let n=0;n<1000&&w.research!.treeSowing291!.completedAt===undefined;n++){
  stepWorld(w);
  if(w.research!.treeSowing291!.points>TREE_SOWING_COST_291-1_000_000){worked=true;expect(p.skills.intellectual?.xp??0).toBeGreaterThan(0);}
 }
 expect(worked).toBe(true);expect(w.research!.treeSowing291).toEqual({points:TREE_SOWING_COST_291,completedAt:w.tick});
 expect(w.research!.project).toBeNull();expect(w.resources).toEqual([]);expect(validateWorld(w)).toEqual([]);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
},30000);

test('forest policy refuses locked and foreign choices atomically but low Plants only blocks real admission',()=>{
 const w=forestryCamp471(false),id=w.growingZones[0]!.id;
 const before=serializeWorld(w);expect(applyCommand(w,{type:'growing-policy',zoneId:id,plant:'poplar',allowSow:true,allowCut:true}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 w.research!.treeSowing291={points:TREE_SOWING_COST_291,completedAt:w.tick};const known=serializeWorld(w);
 expect(applyCommand(w,{type:'growing-policy',zoneId:id,plant:'palm',allowSow:true,allowCut:true}).ok).toBe(false);expect(serializeWorld(w)).toBe(known);
 w.pawns[0]!.skills.plants!.level=5;expect(applyCommand(w,{type:'growing-policy',zoneId:id,plant:'poplar',allowSow:true,allowCut:true}).ok).toBe(true);
 stepWorld(w,120);expect(w.resources).toEqual([]);expect(w.jobs.some(j=>j.kind==='sow'&&j.reservedBy!==null)).toBe(false);
 expect(validateWorld(w)).toEqual([]);
});

test('changing a policy during real paid sowing cancels its engagement without granting an interrupted tree',()=>{
 const w=forestryCamp471(),p=w.pawns[0]!;
 for(let n=0;n<1000&&!w.jobs.some(j=>j.kind==='sow'&&workProgress(j)>0);n++)stepWorld(w);
 const job=w.jobs.find(j=>j.kind==='sow'&&workProgress(j)>0)!;expect(job).toBeDefined();const xp=p.skills.plants!.xp;
 expect(w.resources).toEqual([]);expect(applyCommand(w,{type:'growing-policy',zoneId:w.growingZones[0]!.id,allowSow:false,allowCut:true}).ok).toBe(true);
 expect(p.jobId).toBeNull();expect(w.jobs.some(j=>j.id===job.id)).toBe(false);expect(p.skills.plants!.xp).toBe(xp);
 stepWorld(w,40);expect(w.resources).toEqual([]);expect(validateWorld(w)).toEqual([]);
});
