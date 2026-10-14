import { expect,test,vi } from 'vitest';
import * as backgrounds from '../src/sim/colonist-backgrounds';
import { createMedicalRecord } from '../src/sim/injury-state';
import { researchCost,type ResearchProject,type ResearchProgress } from '../src/sim/research';
import { structureMaxHp } from '../src/sim/thing-damage-rules';
import type { Job,Structure,World } from '../src/sim/types';
import { captureResearchStationIssues,readResearchReadiness } from '../src/ui/research-readiness';
import { researchProjects } from '../src/ui/research-projects';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction';

function camp(count=3):World {
  const w=deconstructionCamp(count);w.packed=[];w.research={project:null,points:0};
  for(const p of w.pawns){delete p.background;delete p.health;delete p.research;delete p.draft;p.state='idle';p.priorities.research=1;}
  return w;
}
function completed(w:World):void {
  w.research={project:null,points:0};
  for(const project of researchProjects){
    const progress:ResearchProgress={points:researchCost(project.id),completedAt:0};
    if(project.id==='complex-clothing')Object.assign(w.research,progress);
    else {
      const key=project.id.replace(/-([a-z])/g,(_,letter:string)=>letter.toUpperCase());
      (w.research as unknown as Record<string,unknown>)[key]=progress;
    }
  }
}
function remaining(w:World,...ids:ResearchProject[]):void {
  completed(w);
  for(const id of ids){const progress=researchProjects.find(p=>p.id===id)!.progress(w)!;delete progress.completedAt;progress.points=0;}
}
function retirement(w:World,id:number,kind:'deconstruct'|'uninstall'):void {
  const targetKind=w.structures.find(s=>s.id===id)!.kind;
  const job:Job={id:w.nextId++,kind,x:8,z:8,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},
    ...(kind==='deconstruct'?{deconstruction:{structureId:id,kind:targetKind}}:{furniture:{structureId:id,kind:targetKind}})};
  w.jobs.push(job);
}
function advanced(w:World,powered=true):Structure {
  const bench=fixtureBuilding(w,'hi-tech-research-bench',8,8);Object.assign(bench,{material:'steel',power:{on:powered,parentId:null}});
  return bench;
}
function analyzer(w:World,x=9,z=12,powered=true):Structure {
  const s=fixtureBuilding(w,'multi-analyzer',x,z);Object.assign(s,{power:{on:powered,parentId:null}});return s;
}
function freeze(value:unknown,seen=new WeakSet<object>()):void {
  if(!value||typeof value!=='object'||seen.has(value))return;
  seen.add(value);for(const child of Object.values(value))freeze(child,seen);Object.freeze(value);
}

test('V357 a blueprint and packed bureau are not a constructed research station',()=>{
  const w=camp();w.jobs.push({id:w.nextId++,kind:'research-bench',x:8,z:8,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},construction:'blueprint'});
  // A packed building cannot supply a Structure on this map.
  w.packed.push({building:{id:w.nextId++,kind:'research-bench',x:9,z:9,orientation:0,footprint:'standard'},owner:{type:'ground',x:9,z:9}});
  expect(readResearchReadiness(w)).toMatchObject({benchIds:[],needProject:false,stationIssue:undefined});
  expect(readResearchReadiness(w,'complex-clothing').stationIssue).toBe('bench');
});
test('V357 project choice depends on physical equipment and availability, even with no local people',()=>{
  const w=camp(0),b=fixtureBuilding(w,'research-bench',8,8),v=readResearchReadiness(w);
  expect(v.benchIds).toEqual([b.id]);expect(v.localIds).toEqual([]);expect(v.needProject).toBe(true);expect(v.availableCount).toBeGreaterThan(0);
});
test('V357 destroyed and retiring structures do not provide usable advice or a project alert',()=>{
  for(const kind of ['destroyed','deconstruct','uninstall'] as const){
    const w=camp(),b=fixtureBuilding(w,'research-bench',8,8);
    if(kind==='destroyed')Object.assign(b,{damage:structureMaxHp(b)});else retirement(w,b.id,kind);
    expect(readResearchReadiness(w,'complex-clothing')).toMatchObject({benchIds:[],needProject:false,stationIssue:'bench'});
  }
});
test('V357 inspecting another project does not turn an active project into a missing choice',()=>{
  const w=camp();fixtureBuilding(w,'research-bench',8,8);w.research!.project='complex-clothing';
  expect(readResearchReadiness(w,'fabrication')).toMatchObject({activeProject:'complex-clothing',needProject:false,stationIssue:'advanced-bench'});
  expect(w.research!.project).toBe('complex-clothing');
});
test('V357 completion of every delivered project removes the project-choice alert',()=>{
  const w=camp();fixtureBuilding(w,'research-bench',8,8);completed(w);
  expect(readResearchReadiness(w)).toMatchObject({remainingCount:0,availableCount:0,needProject:false});
});
test('V357 an unfinished project with unfinished prerequisites is distinct from an available project',()=>{
  const w=camp();fixtureBuilding(w,'research-bench',8,8);remaining(w,'machining','smithing');
  expect(readResearchReadiness(w)).toMatchObject({remainingCount:2,availableCount:1,needProject:true});
  w.research!.smithing!.completedAt=0;
  expect(readResearchReadiness(w)).toMatchObject({remainingCount:1,availableCount:1});
});
test('V357 direct historical schemas preserve the exact explicit selection gates',()=>{
  const gates:[ResearchProject,number][]=[['biofuel-refining',218],['nutrient-paste',217],['deep-drilling',215],['ground-scanner',215],
    ['sterile-materials',211],['vitals-monitor',211],['drug-production',206],['medicine-production',206],['hydroponics',203],['gun-turrets',193],
    ['tube-television',190],['packaged-survival-meals',188],['hospital-bed',187],['autodoors',143]];
  for(const [id,schema] of gates){
    const w=camp();fixtureBuilding(w,'research-bench',8,8);remaining(w,id);
    if(id==='vitals-monitor'){advanced(w);analyzer(w);}
    w.schemaVersion=(schema-1) as World['schemaVersion'];
    expect(readResearchReadiness(w).remainingCount,id).toBe(0);
    w.schemaVersion=schema as World['schemaVersion'];
    expect(readResearchReadiness(w),id).toMatchObject({remainingCount:1,availableCount:1,needProject:true});
  }
});
test('V357 the special vitals selection requires its actual powered, linked equipment',()=>{
  const w=camp();remaining(w,'vitals-monitor');
  expect(readResearchReadiness(w)).toMatchObject({remainingCount:1,availableCount:0,needProject:false});
  const b=advanced(w);analyzer(w);
  expect(readResearchReadiness(w,'vitals-monitor')).toMatchObject({availableCount:1,needProject:true,stationIssue:undefined,benchIds:[b.id]});
  b.power!.on=false;
  expect(readResearchReadiness(w,'vitals-monitor')).toMatchObject({availableCount:0,stationIssue:'power'});
});
test('V357 special selection keeps engine admission separate from a retiring workstation',()=>{
  const w=camp();remaining(w,'vitals-monitor');const b=advanced(w);analyzer(w);retirement(w,b.id,'uninstall');
  const v=readResearchReadiness(w,'vitals-monitor');
  expect(v).toMatchObject({remainingCount:1,availableCount:1,benchIds:[],needProject:false,stationIssue:'advanced-bench'});
  const capture=captureResearchStationIssues(w);expect(capture.vitalsMonitorAvailable).toBe(true);
  expect(readResearchReadiness(w,'vitals-monitor',capture)).toEqual(v);
});
test('V357 the nearest linked analyzer is chosen before power and a farther one is not a fallback',()=>{
  const w=camp();remaining(w,'vitals-monitor');advanced(w);analyzer(w,9,10,false);analyzer(w,9,14,true);
  expect(readResearchReadiness(w,'vitals-monitor')).toMatchObject({availableCount:0,stationIssue:'analyzer'});
});
test('V357 ordinary selection does not demand a powered station before it can be chosen',()=>{
  const w=camp();remaining(w,'complex-clothing');advanced(w,false);
  expect(readResearchReadiness(w,'complex-clothing')).toMatchObject({availableCount:1,needProject:true,stationIssue:'power'});
  fixtureBuilding(w,'research-bench',15,15);
  expect(readResearchReadiness(w,'complex-clothing').stationIssue).toBeUndefined();
});
test('V357 an advanced project distinguishes missing advanced hardware, power and analyzer',()=>{
  const w=camp();fixtureBuilding(w,'research-bench',8,8);
  expect(readResearchReadiness(w,'fabrication').stationIssue).toBe('advanced-bench');
  const b=advanced(w,false);expect(readResearchReadiness(w,'fabrication').stationIssue).toBe('power');
  b.power!.on=true;expect(readResearchReadiness(w,'fabrication').stationIssue).toBe('analyzer');
  analyzer(w);expect(readResearchReadiness(w,'fabrication').stationIssue).toBeUndefined();
});
test('V357 only free living local colonists count, never foreign roles or absent original people',()=>{
  const w=camp(7),[free,foreign,prisoner,visitor,raid,pod,dead]=w.pawns;
  foreign!.faction='outlanders';Object.assign(prisoner!,{prisoner:{capturedAt:0,initialResistance:1,resistance:1,mode:'maintain',chatDay:0,chatCount:0,rng:1}});
  Object.assign(visitor!,{visitor:{}});Object.assign(raid!,{raid:{}});Object.assign(pod!,{podRescue:{}});dead!.state='dead';
  expect(readResearchReadiness(w).localIds).toEqual([free!.id]);
  w.pawns=w.pawns.filter(p=>p!==free);
  expect(readResearchReadiness(w).localIds).toEqual([]);
});
test('V357 zero intellectual skill is capable while a zero player priority is unassigned',()=>{
  const w=camp(2),[a,b]=w.pawns;delete a!.skills.intellectual;b!.priorities.research=0;
  expect(readResearchReadiness(w)).toMatchObject({capableIds:[a!.id,b!.id],assignedIds:[a!.id]});
  a!.background={childhood:'quiet-child',adulthood:'medic'};
  expect(readResearchReadiness(w).assignedIds).toEqual([a!.id]);
});
test('V357 a background-provider refusal is not mistaken for an enabled research assignment',()=>{
  const w=camp(2),[a,b]=w.pawns,original=backgrounds.backgroundWorkRefusal;
  // The current authored backgrounds do not disable intellectual work. Exercise
  // the shared provider boundary explicitly, without inventing a save biography.
  const spy=vi.spyOn(backgrounds,'backgroundWorkRefusal').mockImplementation((p,work)=>p===a&&work==='research'?'Recherche impossible.':original(p,work));
  try{expect(readResearchReadiness(w)).toMatchObject({localIds:[a!.id,b!.id],capableIds:[b!.id],assignedIds:[b!.id]});}
  finally{spy.mockRestore();}
});
test('V357 sleep and draft preserve the assignment without claiming an active research task',()=>{
  const w=camp(2),[a,b]=w.pawns;a!.state='sleeping';b!.draft={lastActiveTick:w.tick,target:null,queue:[]};
  const v=readResearchReadiness(w);expect(v.assignedIds).toEqual([a!.id,b!.id]);expect(v.medicallyUnavailableIds).toEqual([]);expect(v.engagedIds).toEqual([]);
});
test('V357 downed and absent manipulation are medical facts distinct from work assignment',()=>{
  const w=camp(3),[a,b,c]=w.pawns;a!.state='downed';b!.health=createMedicalRecord(w.tick);
  b!.health.missing=[{part:'left-arm',bornAt:w.tick},{part:'right-arm',bornAt:w.tick}];
  const v=readResearchReadiness(w);expect(v.capableIds).toEqual([a!.id,b!.id,c!.id]);expect(v.assignedIds).toEqual(v.capableIds);
  expect(v.medicallyUnavailableIds).toEqual([a!.id,b!.id]);expect(v.engagedIds).toEqual([]);
});
test('V357 active tasks distinguish real approach and work and do not infer another person will start',()=>{
  const w=camp(),b=fixtureBuilding(w,'research-bench',8,8),second=fixtureBuilding(w,'research-bench',15,15),[a,c,idle]=w.pawns;w.research!.project='complex-clothing';
  a!.state='moving';a!.research={stationId:b.id,spot:{x:8,z:7},worked:0};
  c!.state='working';c!.x=15;c!.z=14;c!.research={stationId:second.id,spot:{x:15,z:14},worked:5};
  const v=readResearchReadiness(w);expect(v.engagedIds).toEqual([a!.id,c!.id]);expect(v.movingIds).toEqual([a!.id]);expect(v.workingIds).toEqual([c!.id]);expect(v.engagedIds).not.toContain(idle!.id);
  c!.research.stationId=w.nextId+100;expect(readResearchReadiness(w).workingIds).toEqual([]);
});
test('V357 repeated reads cannot initialize research, alter custody or mutate a frozen world',()=>{
  const w=camp();fixtureBuilding(w,'research-bench',8,8);delete w.research;
  const before=JSON.stringify(w);freeze(w);
  for(let i=0;i<3;i++){readResearchReadiness(w,'complex-clothing');captureResearchStationIssues(w);}
  expect(JSON.stringify(w)).toBe(before);expect(w.research).toBeUndefined();
});
test('V357 the panel capture agrees with a fresh reader and mutable snapshots are read afresh',()=>{
  const w=camp(),b=advanced(w,false);const capture=captureResearchStationIssues(w);
  expect(readResearchReadiness(w,'complex-clothing',capture)).toEqual(readResearchReadiness(w,'complex-clothing'));
  expect(readResearchReadiness(w,'complex-clothing').stationIssue).toBe('power');
  b.power!.on=true;w.pawns.reverse();
  expect(readResearchReadiness(w,'complex-clothing').stationIssue).toBeUndefined();
  expect(readResearchReadiness(w).localIds).toEqual(w.pawns.map(p=>p.id).sort((a,c)=>a-c));
});

