import { withoutResearch,withMigratedResearch } from './scenarios/legacy-skills';
import { withoutCare } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { applyCommand,createWorld,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { constructionSpeed, initialSkills, learnSkill, tickSkills, xpRequired } from '../src/sim/skills';
import { addMaterial,refreshStock } from '../src/sim/materials';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import type { World } from '../src/sim/types';

function site(level=8,passion:0|1|2=1) {
  const w=createWorld(42);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.piles=[];w.stockpiles=[];w.pawns=w.pawns.slice(0,1);w.tick=3000;
  const p=w.pawns[0]!;p.skills=initialSkills(level,passion,w.tick);p.x=10;p.z=10;p.hunger=100;p.rest=100;p.recreation.level=100;p.schedule.fill('anything');
  expect(applyCommand(w,{type:'designate',kind:'bed',material:'wood',x:11,z:10}).ok).toBe(true);
  const j=w.jobs[0]!;j.construction='frame';addMaterial(w,'wood',45,{type:'job',jobId:j.id});refreshStock(w);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:j.id,queue:false}).ok).toBe(true);
  return {w,p,j};
}

test('learning: independent XP thresholds, passion, soft cap, debt, mastery and midnight cadence',()=>{
  const totals=[1000,2000,3000,4000,5000,6000,7000,8000,9000,10000,12000,14000,16000,18000,20000,22000,24000,26000,28000,30000,30000];
  expect(totals.map((_,i)=>xpRequired(i)/1000)).toEqual(totals);
  for(const [passion,first,saturated] of [[0,875,175],[1,2500,500],[2,3750,750]] as const) {
    const s=initialSkills(8,passion).construction;learnSkill(s,2500);expect(s.xp).toBe(first);
    s.dailyXp=4000000;learnSkill(s,2500);expect(s.dailyXp).toBe(4000000+first);
    const before=s.xp;learnSkill(s,2500);expect(s.xp-before).toBe(saturated);
    learnSkill(s,-100);expect(s.xp).toBe(before+saturated-100); // decay ignores passion/saturation
  }
  const s=initialSkills(10).construction;s.xp=-999900;learnSkill(s,-100);
  expect(s).toMatchObject({level:9,xp:9000000,dailyXp:-100});
  const max=initialSkills(19,2).construction;max.xp=29999000;learnSkill(max,2500);expect(max).toMatchObject({level:20,xp:2750});
  max.xp=29998000;learnSkill(max,2500);expect(max.xp).toBe(29999000);
  const {w,p}=site(20);p.skills.construction.xp=1000000;p.skills.construction.dailyXp=4001000;
  const initial=p.skills.construction.xp;
  for(let t=3001;t<=3020;t++){w.tick=t;tickSkills(w,p);}expect(p.skills.construction.xp).toBe(initial-12000);
  delete p.priorityWork;w.tick=5999;const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<22;i++){w.tick++;tickSkills(w,p);copy.tick++;tickSkills(copy,copy.pawns[0]!);}
  expect(copy).toEqual(w);expect(p.skills.construction.dailyXp).toBe(-12000);expect(p.skills.lastResetTick).toBeGreaterThanOrEqual(6000);
  expect(validateWorld(w)).toEqual([]);
});

test('builders: physical work, distinct speeds, no training in travel/clearance, switching worker and exact continuation',()=>{
  const slow=site(0,2),fast=site(20,0);
  for(const x of [slow,fast]){stepWorld(x.w,12);expect(validateWorld(x.w)).toEqual([]);}
  expect(fast.j.progress).toBeGreaterThan(slow.j.progress*5);
  expect(slow.p.skills.construction.xp).toBeGreaterThan(fast.p.skills.construction.xp); // passion != work speed
  const {w,p,j}=site();p.x=2;p.z=2;stepWorld(w,5);expect(p.skills.construction.xp).toBe(0);
  for(let i=0;i<150&&p.skills.construction.xp===0;i++)stepWorld(w);
  expect(p.skills.construction.xp).toBeGreaterThan(0);const copy=deserializeWorld(serializeWorld(w));
  stepWorld(w,100);stepWorld(copy,100);expect(copy).toEqual(w);expect(w.structures.some(s=>s.kind==='bed'&&s.x===j.x&&s.z===j.z)).toBe(true);
  expect(w.piles.filter(s=>s.owner.type==='job')).toEqual([]);expect(validateWorld(w)).toEqual([]);
  const earned=p.skills.construction.xp,bed=w.structures.find(s=>s.kind==='bed')!;
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:bed.x,z:bed.z}).ok).toBe(true);
  for(let i=0;i<150&&!w.packed.length;i++)stepWorld(w);
  expect(w.packed).toHaveLength(1);expect(p.skills.construction.xp).toBe(earned);
  expect(applyCommand(w,{type:'install',structureId:bed.id,x:11,z:10,orientation:0}).ok).toBe(true);
  for(let i=0;i<150&&!w.structures.some(s=>s.id===bed.id);i++)stepWorld(w);
  expect(p.skills.construction.xp).toBe(earned);
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:11,z:10}).ok).toBe(true);
  for(let i=0;i<150&&w.structures.some(s=>s.id===bed.id);i++)stepWorld(w);
  expect(w.structures.some(s=>s.id===bed.id)).toBe(false);expect(p.skills.construction.xp).toBeGreaterThan(earned);
  expect(validateWorld(w)).toEqual([]);
  const clear=site();clear.w.resources.push({id:clear.w.nextId++,x:11,z:10,kind:'tree',amount:10});
  // A new blueprint must be cleared and supplied physically, not a tree in a completed frame.
  clear.j.construction='blueprint';clear.w.piles=[];clear.j.escrow={wood:0,food:0};clear.j.clearance={resourceId:clear.w.resources[0]!.id,progress:0};refreshStock(clear.w);
  stepWorld(clear.w,3);expect(clear.p.skills.construction.xp).toBe(0);
  const idle=site();expect(applyCommand(idle.w,{type:'cancel',x:11,z:10}).ok).toBe(true);stepWorld(idle.w,10);expect(idle.p.skills.construction.xp).toBe(0);
});

test('skills persistence: strict V42 migration, invalid records, deep actor state and worker snapshots',()=>{
  const {w}=site(),old=JSON.parse(serializeWorld(w));(old.schemaVersion=42,withoutResearch(old));withoutCare(old);for(const p of old.pawns)delete p.priorities.doctor;
  for(const p of old.pawns)delete p.skills;
  const migrated=deserializeWorld(JSON.stringify(old));const expectedSkills=initialSkills(8,0);delete expectedSkills.cooking;expect(migrated.pawns[0]!.skills).toEqual(expectedSkills);
  expect(migrated.jobs).toEqual(w.jobs);expect(migrated.piles).toEqual(w.piles);expect(migrated.rng).toBe(w.rng);
  const late=structuredClone(old);late.tick=5900;delete late.pawns[0].priorityWork;
  const midnight=deserializeWorld(JSON.stringify(late)),person=midnight.pawns[0]!;
  learnSkill(person.skills.construction,2500);
  for(let tick=5901;tick<=6020;tick++){midnight.tick=tick;tickSkills(midnight,person);}
  expect(person.skills.construction.dailyXp).toBe(0);expect(person.skills.lastResetTick).toBeGreaterThanOrEqual(6000);
  expect(validateWorld(midnight)).toEqual([]);
  old.pawns[0].skills=initialSkills();expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/version 42/);
  for(const mutate of [(v:any)=>delete v.pawns[0].skills,(v:World)=>v.pawns[0]!.skills.construction.xp=-1000000,(v:World)=>v.pawns[0]!.skills.construction.level=21,(v:any)=>v.pawns[0].skills.construction.passion=3,(v:World)=>v.pawns[0]!.skills.lastResetTick=v.tick+1,(v:World)=>v.pawns[0]!.skills.construction.xp=.1]) {
    const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/skills/);
  }
  const generated=createWorld(42);expect(generated.pawns.map(constructionSpeed)).toEqual([1,1.175,.65]);
  const before=structuredClone(generated.pawns[1]!.skills);learnSkill(generated.pawns[0]!.skills.construction,2500);expect(generated.pawns[1]!.skills).toEqual(before);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();const first=structuredClone(encoder.encode(w,0,1));
  expect(decoder.adopt(first)).toBeTruthy();stepWorld(w,5);const next=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(next).toBeTruthy();expect(next.status).toBe('applied');if(next.status==='applied')expect(next.world.pawns[0]?.skills).toEqual(w.pawns[0]!.skills);
});
