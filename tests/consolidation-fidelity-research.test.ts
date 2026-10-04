import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/index.ts';
import { cookingSpot } from '../src/sim/cooking-bills.ts';
import { WorkEnvironmentCache } from '../src/sim/work-environment.ts';
import { nearbyResearchFacility,processResearch,researchRate,researchCleanlinessFactor,researchStationUsable } from '../src/sim/research.ts';
import { researchFacilityDistance,researchFacilityLinked } from '../src/sim/research-facilities.ts';
import { validateResearch } from '../src/sim/research-save.ts';
import { enclosedRoom } from './scenarios/cleanliness.ts';
import { ensureFilth } from '../src/sim/filth-rules.ts';
import { addFilth } from '../src/sim/filth.ts';
import { processCleaning } from '../src/sim/cleaning.ts';
import type { Structure,World } from '../src/sim/types.ts';

function camp():World {
  const w=createWorld(419,32,32);w.structures=[];w.jobs=[];w.resources=[];w.pawns=w.pawns.slice(0,2);w.tiles=w.tiles.map(()=>({terrain:'rough-stone'}));
  w.research={project:'fabrication',points:0,microelectronics:{points:3000_000_000,completedAt:0},smithing:{points:700_000_000,completedAt:0},machining:{points:1000_000_000,completedAt:0},multiAnalyzer:{points:4000_000_000,completedAt:0},fabrication:{points:123}};
  for(const p of w.pawns){p.priorities.research=1;p.state='working';p.path=[];p.jobId=null;p.need=null;p.orders={active:null,queue:[]};}
  return w;
}
function building(w:World,kind:Structure['kind'],x:number,z:number,orientation:0|1|2|3=0):Structure {
  const s:Structure={id:w.nextId++,kind,x,z,orientation,footprint:'standard',material:'steel',power:{on:true,parentId:null}};w.structures.push(s);return s;
}

test('Core range uses true centers, links share an analyzer, and walls require a real visible footprint',()=>{
  const w=camp(),desk=building(w,'hi-tech-research-bench',10,10),a=building(w,'multi-analyzer',17,10);
  expect(researchFacilityDistance(desk,a)).toBe(7.5);expect(researchFacilityLinked(w,desk,a)).toBe(true);
  a.x=18;expect(researchFacilityDistance(desk,a)).toBe(8.5);expect(researchFacilityLinked(w,desk,a)).toBe(false);
  a.x=17;
  for(let z=0;z<w.height;z++)w.structures.push({id:w.nextId++,kind:'wall',x:14,z,orientation:0,footprint:'standard',material:'wood'});
  expect(researchFacilityLinked(w,desk,a)).toBe(false);
  w.structures=w.structures.filter(s=>s.kind!=='wall');
  const b=building(w,'multi-analyzer',10,15),other=building(w,'hi-tech-research-bench',18,15);
  expect(nearbyResearchFacility(w,desk)?.id).toBe(b.id);
  expect(nearbyResearchFacility(w,other)?.id).toBe(a.id);
  b.power!.on=false;expect(nearbyResearchFacility(w,desk)).toBeUndefined();
  // An unpowered nearer linked analyzer still occupies this definition's one
  // slot; the farther active analyzer supplies no second simultaneous link.
});

test('two researchers progress at their exclusive desks with the same analyzer and preserve acquired points',()=>{
  const w=camp(),a=building(w,'hi-tech-research-bench',8,8),b=building(w,'hi-tech-research-bench',16,8),analyzer=building(w,'multi-analyzer',12,10);
  for(const [i,desk] of [a,b].entries()){const p=w.pawns[i]!,spot=cookingSpot(desk);Object.assign(p,spot);p.research={stationId:desk.id,facilityId:analyzer.id,spot,worked:0};}
  expect(validateResearch(w,190)).toEqual([]);
  for(const p of w.pawns)processResearch(w,p,()=>undefined,()=>100,()=>undefined);
  expect(w.research!.fabrication!.points).toBe(323);
  w.pawns[1]!.research!.stationId=a.id;w.pawns[1]!.research!.spot=cookingSpot(a);Object.assign(w.pawns[1]!,cookingSpot(a));
  expect(validateResearch(w,190)).toContain('Invalid research ownership.');
});

test('a durable interrupted link remains valid while work rechecks current range and visibility',()=>{
  const w=camp(),desk=building(w,'hi-tech-research-bench',8,8),analyzer=building(w,'multi-analyzer',12,10),p=w.pawns[0]!,spot=cookingSpot(desk);
  Object.assign(p,spot);p.research={stationId:desk.id,facilityId:analyzer.id,spot,worked:0};analyzer.x=28;
  expect(validateResearch(w,190)).toEqual([]);expect(researchStationUsable(w,desk,'fabrication',analyzer.id)).toBe(false);
  processResearch(w,p,()=>undefined,()=>100,()=>undefined);
  expect(p.research).toBeUndefined();expect(w.research!.fabrication!.points).toBe(123);
});

test('research reads real floors and filth, Core room curve, outside factors, capacities and 9/35 temperatures',()=>{
  expect([-5,-2.5,0,1].map(researchCleanlinessFactor)).toEqual([.75,.85,1,1.15]);
  const w=camp(),room=enclosedRoom(w,{x:3,z:3},12),simple=building(w,'research-bench',8,8),advanced=building(w,'hi-tech-research-bench',8,10),p=w.pawns[0]!;
  w.roofing={build:[],remove:[],cursor:0,constructed:room.cells};
  for(const i of room.cells)w.tiles[i]={terrain:'rough-stone',floor:'wood-planks'};
  Object.assign(p,{x:8,z:7});const cache=new WorkEnvironmentCache(),clean=cache.read(w),normal=researchRate(p,advanced,clean,20,w);
  expect(Math.abs(normal-researchRate(p,simple,clean,20,w)*4/3)).toBeLessThanOrEqual(1);
  expect(researchRate(p,advanced,clean,8.99,w)).toBeCloseTo(normal*.7,0);
  expect(researchRate(p,advanced,clean,9,w)).toBe(normal);expect(researchRate(p,advanced,clean,35,w)).toBe(normal);
  expect(researchRate(p,advanced,clean,35.01,w)).toBeCloseTo(normal*.7,0);
  const filth=ensureFilth(w);expect(addFilth(w,{x:7,z:7},'ash')).toBe(true);
  expect(researchRate(p,advanced,cache.read(w),20,w)).toBeLessThan(normal);
  filth.items=[];for(const i of room.cells)w.tiles[i]!.floor='steel-tile';
  expect(researchRate(p,advanced,cache.read(w),20,w)).toBeGreaterThan(normal);
  const outside=building(w,'hi-tech-research-bench',25,25),env=cache.read(w),out=researchRate(p,outside,env,20,w);
  expect(out).toBeCloseTo(normal*.75*.75,0);
});

test('the same decision environment observes physical filth deposit and cleaning within the same tick',()=>{
  const w=camp(),room=enclosedRoom(w,{x:3,z:3},12),desk=building(w,'hi-tech-research-bench',8,8),p=w.pawns[0]!,cleaner=w.pawns[1]!;
  w.roofing={build:[],remove:[],cursor:0,constructed:room.cells};
  for(const i of room.cells)w.tiles[i]={terrain:'rough-stone',floor:'wood-planks'};
  Object.assign(p,{x:8,z:7});const environment=new WorkEnvironmentCache().read(w),tick=w.tick;
  const clean=researchRate(p,desk,environment,20,w);
  expect(addFilth(w,{x:7,z:7},'ash')).toBe(true);
  const dirty=researchRate(p,desk,environment,20,w);expect(dirty).toBeLessThan(clean);
  const trace=w.filth!.items[0]!;w.home=[...new Set([...(w.home??[]),trace.z*w.width+trace.x])];Object.assign(cleaner,{x:trace.x,z:trace.z});cleaner.priorities.clean=1;
  cleaner.cleaning={targets:[trace.id],forced:true,phase:'clean',progress:70};
  expect(processCleaning(w,cleaner,{search:()=>null,move:()=>undefined,release:()=>true,event:()=>undefined})).toBe(true);
  expect(w.filth!.items).toHaveLength(0);expect(w.filth!.cleaned).toBe(1);expect(w.tick).toBe(tick);
  expect(researchRate(p,desk,environment,20,w)).toBe(clean);
});

test('an engaged task cannot keep an older analyzer after a nearer unpowered installation takes its Core slot',()=>{
  const w=camp(),desk=building(w,'hi-tech-research-bench',8,8),original=building(w,'multi-analyzer',14,10),p=w.pawns[0]!,spot=cookingSpot(desk);
  Object.assign(p,spot);p.research={stationId:desk.id,facilityId:original.id,spot,worked:17};
  expect(researchStationUsable(w,desk,'fabrication',original.id)).toBe(true);
  const nearer=building(w,'multi-analyzer',10,12);nearer.power!.on=false;
  expect(validateResearch(w,190)).toEqual([]);expect(nearbyResearchFacility(w,desk)).toBeUndefined();
  expect(researchStationUsable(w,desk,'fabrication',original.id)).toBe(false);
  processResearch(w,p,()=>undefined,()=>100,()=>undefined);
  expect(p.research).toBeUndefined();expect(w.research!.fabrication!.points).toBe(123);
  nearer.power!.on=true;expect(nearbyResearchFacility(w,desk)?.id).toBe(nearer.id);
  expect(researchStationUsable(w,desk,'fabrication',original.id)).toBe(false);
  expect(researchStationUsable(w,desk,'fabrication',nearer.id)).toBe(true);
});
