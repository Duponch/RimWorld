import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { cookingSpot } from '../src/sim/cooking-bills.ts';
import { TUBE_TELEVISION_RESEARCH_COST,needsHighTechBench,researchCost,researchPrerequisite,researchStationUsable,tubeTelevisionUnlocked } from '../src/sim/research.ts';
import type { World } from '../src/sim/types.ts';
import { prepareTelevisionDemo,TELEVISION_CELLS } from '../scripts/create-television-v208-test-save.ts';

function start(w:World):void {
  expect(applyCommand(w,{type:'research-project',project:'tube-television'})).toMatchObject({ok:true});
  expect(applyCommand(w,{type:'priority',pawnId:w.pawns[0]!.id,work:'research',value:1})).toMatchObject({ok:true});
}
function until(w:World,done:()=>boolean,limit=300):void {
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),`TV research boundary missing at tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);
}

test('missing actual ComplexFurniture atomically refuses CRT research without creating progress',()=>{
  const w=prepareTelevisionDemo();delete w.research!.tubeTelevision;delete w.research!.complexFurniture;
  expect(validateWorld(w)).toEqual([]);expect(researchPrerequisite(w,'tube-television')).toBe('Mobilier complexe');
  const before=serializeWorld(w);
  expect(applyCommand(w,{type:'research-project',project:'tube-television'})).toMatchObject({ok:false});
  expect(serializeWorld(w)).toBe(before);expect(w.research!.tubeTelevision).toBeUndefined();expect(w.research!.project).toBeNull();
});

test('CRT costs fixed1000points on a simple desk and completes its prepared final two points only through physical research, pause and exact replay',()=>{
  const w=prepareTelevisionDemo(),p=w.pawns[0]!,desk=w.structures.find(s=>s.kind==='research-bench')!,spot=cookingSpot(desk);
  const progress=w.research!.tubeTelevision!,initial=progress.points,piles=w.piles.map(i=>({id:i.id,item:i.item,quantity:i.quantity,owner:structuredClone(i.owner)}));
  expect(TUBE_TELEVISION_RESEARCH_COST).toBe(1_000_000_000);expect(researchCost('tube-television')).toBe(1_000_000_000);
  expect(initial).toBe(998_000_000);expect(needsHighTechBench('tube-television')).toBe(false);
  expect(researchStationUsable(w,desk,'tube-television')).toBe(true);expect(researchPrerequisite(w,'tube-television')).toBeUndefined();
  expect(w.structures.some(s=>s.kind==='hi-tech-research-bench'||s.kind==='multi-analyzer')).toBe(false);
  start(w);const xp=p.skills.intellectual!.xp;stepWorld(w);
  expect(progress.points).toBe(initial);expect(p.skills.intellectual!.xp).toBe(xp);expect({x:p.x,z:p.z}).not.toEqual(spot);expect(p.research?.stationId).toBe(desk.id);
  const travelling=deserializeWorld(serializeWorld(w));stepWorld(w,2);stepWorld(travelling,2);expect(travelling).toEqual(w);
  until(w,()=>progress.points>initial);expect({x:p.x,z:p.z}).toEqual(spot);expect(p.state).toBe('working');expect(p.skills.intellectual!.xp).toBeGreaterThan(xp);
  const paused=progress.points;expect(applyCommand(w,{type:'research-project',project:null})).toMatchObject({ok:true});
  stepWorld(w,5);expect(progress.points).toBe(paused);expect(p.research).toBeUndefined();
  const suspended=deserializeWorld(serializeWorld(w));expect(suspended).toEqual(w);
  start(w);start(suspended);until(w,()=>tubeTelevisionUnlocked(w));stepWorld(suspended,w.tick-suspended.tick);
  expect(suspended).toEqual(w);expect(progress).toEqual({points:1_000_000_000,completedAt:w.tick});expect(w.research!.project).toBeNull();
  expect(w.pawns.every(pawn=>pawn.research===undefined)).toBe(true);expect(w.events.filter(e=>e.message.startsWith('Recherche achevée : Télévision cathodique'))).toHaveLength(1);
  expect(w.structures.some(s=>s.kind==='tube-television')).toBe(false);expect(w.jobs).toEqual([]);
  expect(w.piles.map(i=>({id:i.id,item:i.item,quantity:i.quantity,owner:i.owner}))).toEqual(piles);
});

test('CRT construction is atomically locked before research and opens only after actual desk completion',()=>{
  const w=prepareTelevisionDemo(),command={type:'designate',kind:'tube-television',...TELEVISION_CELLS.television,orientation:0} as const;
  const before=serializeWorld(w);expect(applyCommand(w,command)).toMatchObject({ok:false});expect(serializeWorld(w)).toBe(before);
  expect(w.jobs).toEqual([]);start(w);until(w,()=>tubeTelevisionUnlocked(w));
  expect(applyCommand(w,command)).toMatchObject({ok:true});
  expect(w.jobs).toHaveLength(1);expect(w.jobs[0]).toMatchObject({kind:'tube-television',construction:'blueprint',material:'steel',progress:0,escrow:{wood:0,food:0}});
  expect(w.structures.some(s=>s.kind==='tube-television')).toBe(false);expect(validateWorld(w)).toEqual([]);
});
