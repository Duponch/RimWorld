import { withoutPawnSkills, withMigratedSkills } from './scenarios/legacy-skills';
import { expect, test } from 'vitest';
import { applyCommand, createWorld, stepWorld } from '../src/sim/engine';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization';
import { addGroundMaterial, refreshStock } from '../src/sim/materials';
import { gainRecreation, initialRecreation, recreationMood, updateRecreation } from '../src/sim/recreation-rules';
import { clearThrow, horseshoeCells, recreationSiteValid, recreationSpace } from '../src/sim/recreation-space';
import { processRecreation } from '../src/sim/recreation';

const fixture=()=>{
  const w=createWorld(42,32,32);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.jobs=[];w.structures=[];
  w.pawns.forEach((p,i)=>{Object.assign(p,{x:8+i*2,z:14,hunger:100,rest:100,priorities: {handle:0,clean:0,firefight:0,warden:0,basic:3,hunt:0,research:0, patient:0,bedrest:0,doctor:0,art:0,craft:2,mine:2,gather:0,build:0,haul:0,grow:0,cook:0}});p.schedule.fill('recreation');p.recreation=initialRecreation(10);});
  refreshStock(w);return w;
};

test('recreation rates, cap, boredom hysteresis, sleep freeze and schedule gates have explicit boundaries',()=>{
  const w=fixture(),p=w.pawns[0]!;
  for(const [level,loss,mood] of [[0,.01,-20],[.99,.01,-20],[1,.004,-10],[14.99,.004,-10],[15,.007,-5],[29.99,.007,-5],[30,.01,0],[70,.01,5],[85,.01,10]]) {
    p.recreation=initialRecreation(level!);updateRecreation(p);expect(p.recreation.level).toBeCloseTo(Math.max(0,level!-loss!),9);expect(recreationMood(level!)).toBe(mood);
  }
  p.recreation=initialRecreation(0);expect(gainRecreation(p.recreation,'solitary',100)).toBe(100);expect(p.recreation.tolerance.solitary).toBe(65);expect(p.recreation.bored.solitary).toBe(true);
  expect(gainRecreation(p.recreation,'solitary',100)).toBe(0);expect(p.recreation.tolerance.solitary).toBe(65);
  p.recreation.tolerance.solitary=30;p.state='sleeping';const before=structuredClone(p.recreation);updateRecreation(p);expect(p.recreation).toEqual(before);
  p.state='idle';updateRecreation(p);expect(p.recreation.bored.solitary).toBe(false);
  p.recreation.tolerance.solitary=50;p.recreation.level=0;gainRecreation(p.recreation,'solitary',1);expect(p.recreation.bored.solitary).toBe(true);
  let searches=0;const context={search:()=>{searches++;return null;},move:()=>{},release:()=>true,event:()=>{}};
  p.recreation=initialRecreation(0);w.tick=499;expect(processRecreation(w,p,context)).toBe(false);
  w.tick=500;p.schedule.fill('anything');p.recreation.level=35;expect(processRecreation(w,p,context)).toBe(false);
  p.schedule.fill('recreation');p.recreation.level=95;expect(processRecreation(w,p,context)).toBe(false);
  p.schedule.fill('work');p.recreation.level=0;expect(processRecreation(w,p,context)).toBe(false);expect(searches).toBe(0);
  p.schedule.fill('sleep');expect(processRecreation(w,p,context)).toBe(false);expect(processRecreation(w,p,context,true)).toBe(true);expect(searches).toBe(1);
});

test('recreation does not preempt an owned cleaning or burial reservation',()=>{
  const w=fixture();w.tick=2000;
  const cleaner=w.pawns[0]!,burier=w.pawns[1]!;
  cleaner.schedule.fill('recreation');cleaner.recreation=initialRecreation(0);
  cleaner.cleaning={targets:[101,102,103],forced:false,phase:'clean',progress:7};cleaner.state='working';
  burier.schedule.fill('recreation');burier.recreation=initialRecreation(0);
  burier.burial={bodyPawnId:w.pawns[2]!.id,graveId:104,phase:'carry',progress:9};burier.state='moving';
  const cleaning=structuredClone(cleaner.cleaning),burial=structuredClone(burier.burial);
  let searches=0;const context={search:()=>{searches++;return null;},move:()=>{},release:()=>true,event:()=>{}};
  expect(processRecreation(w,cleaner,context)).toBe(false);
  expect(processRecreation(w,burier,context)).toBe(false);
  expect(cleaner.recreation.task).toBeNull();expect(cleaner.cleaning).toEqual(cleaning);
  expect(burier.recreation.task).toBeNull();expect(burier.burial).toEqual(burial);
  expect(searches).toBe(0);
});

test('physical horseshoes: delivered construction, three reserved players, transit, interruption, occlusion and exact saves',()=>{
  const w=fixture(),builder=w.pawns[0]!;builder.priorities.build=1;builder.priorities.haul=1;
  addGroundMaterial(w,'wood',10,{x:8,z:13},'wood');expect(applyCommand(w,{type:'designate',kind:'horseshoes',x:10,z:10}).ok).toBe(true);
  for(let i=0;i<150&&!w.structures.length;i++)stepWorld(w);
  expect(w.structures).toHaveLength(1);expect(w.piles).toHaveLength(0);expect(w.jobs).toHaveLength(0);
  builder.priorities.build=0;builder.priorities.haul=0;w.tick=2000;
  for(const p of w.pawns){p.needCooldown=0;p.recreation=initialRecreation(10);p.recreation.tolerance.solitary=70;p.recreation.bored.solitary=true;}
  const fourth=structuredClone(w.pawns[2]!);fourth.id=w.nextId++;fourth.x=15;fourth.z=15;w.pawns.push(fourth);
  let movingSave='',playingSave='';
  for(let i=0;i<70;i++) {
    const levels=w.pawns.map(p=>p.recreation.level);stepWorld(w);
    expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
    expect(w.pawns.filter(p=>p.recreation.task)).toHaveLength(3);
    w.pawns.forEach((p,j)=>{if(p.recreation.task?.phase==='travel')expect(p.recreation.level).toBeLessThanOrEqual(levels[j]!);});
    if(!movingSave&&w.pawns.some(p=>p.moveCooldown>0))movingSave=serializeWorld(w);
    if(w.pawns.filter(p=>p.state==='recreating').length===3){playingSave=serializeWorld(w);break;}
  }
  expect(movingSave).not.toBe('');expect(playingSave).not.toBe('');
  const replay=deserializeWorld(movingSave);stepWorld(replay,w.tick-replay.tick);expect(replay).toEqual(w);
  const spots=w.pawns.flatMap(p=>p.recreation.task?[p.recreation.task.target]:[]);expect(new Set(spots.map(p=>`${p.x}:${p.z}`)).size).toBe(3);
  const corrupt=JSON.parse(playingSave);const users=corrupt.pawns.filter((p:any)=>p.recreation.task);users[1].recreation.task.target=users[0].recreation.task.target;
  expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow(/reservation|position/i);
  const active=w.pawns.find(p=>p.state==='recreating')!, level=active.recreation.level;
  expect(applyCommand(w,{type:'schedule-paint',pawnId:active.id,hours:[8],assignment:'work'}).ok).toBe(true);stepWorld(w);
  expect(active.recreation.task).toBeNull();expect(active.recreation.level).toBeLessThanOrEqual(level);
  const pin=w.structures[0]!;expect(horseshoeCells(pin)).toHaveLength(12);
  const target={x:15,z:10};expect(clearThrow(w,pin,target)).toBe(true);
  w.structures.push({id:w.nextId++,kind:'table',x:12,z:10,orientation:0,footprint:'standard'});expect(clearThrow(w,pin,target)).toBe(true);
  w.structures.at(-1)!.kind='wall';expect(clearThrow(w,pin,target)).toBe(false);
  const sites=horseshoeCells(pin),index=recreationSpace(w,sites);
  for(const site of sites)for(const activity of ['skygaze','horseshoes'] as const) {
    const task={activity,buildingId:activity==='horseshoes'?pin.id:null,target:site,phase:'travel' as const,elapsed:0};
    expect(recreationSiteValid(w,task,index)).toBe(recreationSiteValid(w,task));
  }
  const looseRock={x:10,z:15};addGroundMaterial(w,'chunk',1,looseRock,'granite-chunk');
  for(const activity of ['skygaze','horseshoes'] as const) {
    const task={activity,buildingId:activity==='horseshoes'?pin.id:null,target:looseRock,phase:'travel' as const,elapsed:0};
    expect(recreationSiteValid(w,task)).toBe(false);
    expect(recreationSiteValid(w,task,recreationSpace(w,sites))).toBe(false);
  }
  // Removing that obstacle must make a fresh decision usable again.
  w.piles=w.piles.filter(p=>p.kind!=='chunk');
  const clearSite={activity:'skygaze' as const,buildingId:null,target:looseRock,phase:'travel' as const,elapsed:0};
  expect(recreationSiteValid(w,clearSite,recreationSpace(w,sites))).toBe(true);
  const blocked=w.pawns.find(p=>p.recreation.task)!;blocked.recreation.task!.target=target;blocked.recreation.task!.phase='travel';blocked.recreation.task!.elapsed=0;blocked.state='moving';blocked.path=[];
  const blockedJoy=blocked.recreation.level;stepWorld(w);expect(blocked.recreation.task).toBeNull();expect(blocked.recreation.level).toBeLessThanOrEqual(blockedJoy);
  const resume=deserializeWorld(serializeWorld(w));stepWorld(w,500);stepWorld(resume,500);expect(resume).toEqual(w);expect(validateWorld(w)).toEqual([]);
});

test('skygazing requires arrival; unavailable or boring activities give no joy; V14 migration preserves existing state',()=>{
  const w=fixture();w.tick=2000;w.pawns=w.pawns.slice(0,1);const p=w.pawns[0]!;let travel='';
  for(let i=0;i<50&&p.state!=='recreating';i++){const before=p.recreation.level;stepWorld(w);if(p.recreation.task?.phase==='travel'){expect(p.recreation.level).toBeLessThanOrEqual(before);travel ||= serializeWorld(w);}}
  expect(p.recreation.task).toMatchObject({activity:'skygaze',phase:'active',buildingId:null});expect(travel).not.toBe('');
  expect(recreationSiteValid(w,p.recreation.task!)).toBe(true);const saved=deserializeWorld(travel);stepWorld(saved,w.tick-saved.tick);expect(saved).toEqual(w);
  const invalid=JSON.parse(serializeWorld(w));invalid.pawns[0].recreation.tolerance.solitary=Infinity;expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/recreation/i);
  p.recreation.task=null;p.path=[];p.state='idle';p.schedule.fill('anything');p.recreation.level=10;p.recreation.bored={solitary:true,dexterity:true};p.recreation.tolerance={solitary:80,dexterity:80};
  const level=p.recreation.level;stepWorld(w,100);expect(p.recreation.task).toBeNull();expect(p.recreation.level).toBeLessThan(level);
  const old=fixture();old.pawns.forEach(p=>p.schedule.fill('anything'));const raw=JSON.parse(serializeWorld(old));(raw.schemaVersion=14,withoutPawnSkills(raw));for(const a of raw.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete raw.deconstructed;delete raw.packed;for(const pawn of raw.pawns)delete pawn.orders;raw.pawns.forEach((p:any)=>delete p.recreation);
  const migrated=deserializeWorld(JSON.stringify(raw));expect(migrated).toEqual(withMigratedSkills({...old,pawns:old.pawns.map(p=>({...p,recreation:initialRecreation()}))}));
  const corruptOld=structuredClone(raw);corruptOld.pawns[0].path=[{x:31,z:31}];expect(()=>deserializeWorld(JSON.stringify(corruptOld))).toThrow(/version 14|path/i);
});
