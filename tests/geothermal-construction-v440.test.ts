import {expect,test} from 'vitest';
import {miningCamp} from './scenarios/mining.ts';
import {applyCommand,canDesignate} from '../src/sim/engine.ts';
import {projectProgress,researchCost} from '../src/sim/research.ts';
import {footprintCells,footprintContains,STRUCTURE_DEFINITIONS} from '../src/sim/definitions.ts';
import {constructionRecipe,constructionSkillRequired,constructionSupplied,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {constructionCandidates} from '../src/sim/construction-planner.ts';
import {constructionSiteFree} from '../src/sim/construction-rules.ts';
import {geothermalPlacementRefusal264} from '../src/sim/geothermal-placement-264.ts';
import {blockedCells,reachableCells,routeToJob} from '../src/sim/pathfinding.ts';
import {canStandAt} from '../src/sim/furniture-travel.ts';
import {OCCUPANCY} from '../src/sim/occupancy.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {minifiable} from '../src/sim/furniture-rules.ts';
import {designateDeconstruction,deconstructionDuration} from '../src/sim/deconstruction-rules.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {structureMaxHp,structureFlammability} from '../src/sim/thing-damage-rules.ts';
import {structureBeauty} from '../src/sim/room-beauty.ts';
import {structureRoomMarketValue} from '../src/sim/room-market-value.ts';
import {RoomTopologyCache} from '../src/sim/room-topology.ts';
import {ThermalTopologyCache} from '../src/sim/thermal-topology.ts';
import {WindObstructionView} from '../src/sim/wind-rules.ts';
import {penRegion} from '../src/sim/animal-pens.ts';
import {initializeGeographicSnowSurface256} from '../src/sim/snow-surface.ts';
import {createGeothermalState264} from '../src/sim/geothermal-state-264.ts';
import type {Job,Structure,World} from '../src/sim/types.ts';

/** Declared isolated physical fixtures: the natural owner and paid frame may
 * be prepared here; this file does not claim a generated planet or played
 * acquisition. Engine/browser integration covers actual material delivery. */
function camp():World {
  const w=miningCamp();w.tiles=w.tiles.map(()=>({terrain:'soil-natural'}));
  w.site={revision:3,tileId:0,mapSeed:42,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','slate'],coastAngle:null,mutatorCode:0};
  w.climate={revision:4,tileId:0,adoptedAt:w.tick,calendarOrigin:1500,definition:{meanTemperature:0,latitude:45,longitude:0,rainfall:1000,amplitude:20}};
  w.geysers={revision:1,atTick:w.tick,items:[{id:w.nextId++,x:14,z:14,ticksUntilSpray:500,sprayTicksLeft:0}]};
  initializeGeographicSnowSurface256(w);
  w.research??={project:null,points:0};
  const progress=projectProgress(w.research,'geothermal-power');progress.points=researchCost('geothermal-power');progress.completedAt=w.tick;
  w.pawns[0]!.priorities.build=1;w.pawns[0]!.priorities.haul=2;
  return w;
}
const command={type:'designate' as const,kind:'geothermal-generator' as const,x:12,z:12,orientation:0 as const,material:'steel' as const};
function frame(w:World):Job {
  const j:Job={...command,id:w.nextId++,footprint:'standard',construction:'frame',progress:0,status:'pending',reservedBy:null,escrow:{wood:0,food:0}};
  w.jobs.push(j);return j;
}
function building(w:World):Structure {
  const s:Structure={id:w.nextId++,kind:command.kind,x:12,z:12,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
  w.structures.push(s);s.geothermal=createGeothermalState264(w,s);return s;
}
const quantity=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);

test('fixed6×6 geometry includes the far corner through construction, repair and removal payloads',()=>{
  const base={...command,footprint:'standard' as const},cells=footprintCells(base);
  expect(STRUCTURE_DEFINITIONS[command.kind]).toMatchObject({width:6,depth:6,blocksMovement:true});
  expect(cells).toHaveLength(36);expect(new Set(cells.map(c=>`${c.x}:${c.z}`)).size).toBe(36);
  for(const wrapper of [base,{...base,kind:'deconstruct' as const,deconstruction:{kind:command.kind}},{...base,kind:'fix-breakdown' as const,fixBreakdown:{kind:command.kind}},{...base,kind:'install' as const,furniture:{kind:command.kind}}]){
    expect(footprintCells(wrapper)).toEqual(cells);
    for(let z=10;z<=19;z++)for(let x=10;x<=19;x++)expect(footprintContains(wrapper,{x,z})).toBe(x>=12&&x<=17&&z>=12&&z<=17);
  }
  expect(constructionRecipe(base)).toEqual({ingredients:[{item:'steel',quantity:340},{item:'component',quantity:8}],work:1200,coreWork:12000});
  expect(constructionSkillRequired(command.kind)).toBe(8);
  expect(validConstructionMaterial(command.kind,'steel',264)).toBe(true);
  for(const material of [undefined,'wood','granite-blocks'])expect(validConstructionMaterial(command.kind,material,264)).toBe(false);
  expect(validConstructionMaterial(command.kind,'steel',263)).toBe(false);
});

test('only the exact natural anchor admits a plan, and every refused placement is atomic',()=>{
  const w=camp();expect(canDesignate(w,command)).toEqual({ok:true});
  for(const change of [{x:13},{z:13},{x:14,z:14},{orientation:1 as const},{x:-1},{x:28},{material:'wood' as const}]){
    const before=structuredClone(w);expect(applyCommand(w,{...command,...change}).ok).toBe(false);expect(w).toEqual(before);
  }
  const before=structuredClone(w);delete w.geysers;const missing=structuredClone(w);
  expect(applyCommand(w,command).ok).toBe(false);expect(w).toEqual(missing);w.geysers=before.geysers;
  expect(applyCommand(w,command).ok).toBe(true);const planned=structuredClone(w);
  expect(applyCommand(w,command).ok).toBe(false);expect(w).toEqual(planned);
});

test('Heavy applies to the farthest footprint cell and completed structures block all36 cells',()=>{
  const w=camp(),corner=17*w.width+17;
  for(const tile of [{terrain:'marsh' as const},{terrain:'water-shallow' as const,bridge:true as const},{terrain:'rock' as const,stone:'granite' as const}]){
    w.tiles[corner]=tile;const before=structuredClone(w);expect(applyCommand(w,command).ok).toBe(false);expect(w).toEqual(before);
  }
  w.tiles[corner]={terrain:'soil-natural'};const s=building(w),blocked=blockedCells(w);
  for(const c of footprintCells(s)){expect(blocked[c.z*w.width+c.x]).toBe(1);expect(canStandAt(w,c)).toBe(false);}
  expect(OCCUPANCY[s.kind]).toEqual({clearItems:true,items:false,zones:false,store:false});
  expect(new WindObstructionView(w).blocked({x:17,z:17})).toBe(true);
  expect(geothermalPlacementRefusal264(w,command)).toMatch(/ouvrage/);
});

test('frame admission requires every paid ingredient, Construction8 and a real exterior access',()=>{
  const w=camp(),j=frame(w),p=w.pawns[0]!;
  const candidates=()=>{const blocked=blockedCells(w),reach=reachableCells(w,p,blocked,new Set());return constructionCandidates(w,p,blocked,reach,{remaining:8,pairs:8},new Map([[j.id,{}]]));};
  addMaterial(w,'steel',340,{type:'job',jobId:j.id},'steel');
  expect(constructionSupplied(w,j)).toBe(false);expect(candidates()).toEqual([]);
  addMaterial(w,'component',7,{type:'job',jobId:j.id},'component');expect(candidates()).toEqual([]);
  addMaterial(w,'component',1,{type:'job',jobId:j.id},'component');
  expect(constructionSupplied(w,j)).toBe(true);p.skills.construction.level=7;expect(candidates()).toEqual([]);
  p.skills.construction.level=8;expect(candidates().map(c=>c.job?.id)).toEqual([j.id]);
  const path=routeToJob(w,j,reachableCells(w,p,blockedCells(w),new Set()));expect(path).not.toBeNull();
  const end=path!.at(-1)??p;expect(footprintContains(j,end)).toBe(false);expect(footprintCells(j).some(c=>Math.abs(c.x-end.x)+Math.abs(c.z-end.z)===1)).toBe(true);
});

test('completion revalidates the original owner, heavy terrain, plans and active actor edges',()=>{
  const w=camp(),j=frame(w),p=w.pawns[0]!;expect(constructionSiteFree(w,j,p.id)).toBe(true);
  w.geysers!.items[0]!.x++;expect(constructionSiteFree(w,j,p.id)).toBe(false);w.geysers!.items[0]!.x--;
  w.tiles[17*w.width+17]={terrain:'marsh'};expect(constructionSiteFree(w,j,p.id)).toBe(false);w.tiles[17*w.width+17]={terrain:'soil-natural'};
  const wall:Structure={id:w.nextId++,kind:'wall',x:17,z:17,orientation:0,footprint:'standard'};w.structures.push(wall);expect(constructionSiteFree(w,j,p.id)).toBe(false);w.structures.pop();
  w.jobs.push({...j,id:w.nextId++});expect(constructionSiteFree(w,j,p.id)).toBe(false);w.jobs.pop();
  const visitor={...structuredClone(p),id:w.nextId++,x:18,z:17,motion:{from:{x:18,z:17},to:{x:17,z:17},start:w.tick,end:w.tick+1}};w.pawns.push(visitor);
  expect(constructionSiteFree(w,j,p.id)).toBe(false);w.pawns.pop();expect(constructionSiteFree(w,j,p.id)).toBe(true);
});

test('the actual full volume separates room air in both geographic and legacy topology readers',()=>{
  for(const geographic of [true,false]){
    const w=camp(),s=building(w);if(!geographic)delete w.site;
    for(let z=10;z<=19;z++)for(let x=10;x<=19;x++)if(x===10||x===19||z===10||z===19)w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'});
    w.roofing={constructed:Array.from({length:64},(_,i)=>(11+Math.floor(i/8))*w.width+11+i%8),build:[],remove:[],cursor:0};
    const room=new RoomTopologyCache().read(w),layout=new ThermalTopologyCache().read(w);
    for(const c of footprintCells(s)){expect(room.at(c.x,c.z)?.kind).toBe('solid');expect(layout.rooms.every(r=>!r.cells.includes(c.z*w.width+c.x))).toBe(true);}
    expect(layout.rooms.reduce((sum,r)=>sum+r.cells.length,0)).toBe(28);
    const marker:Structure={id:w.nextId++,kind:'pen-marker',x:11,z:11,orientation:0,footprint:'standard',material:'wood'};w.structures.push(marker);
    const pen=penRegion(w,marker.id)!;expect(pen.closed).toBe(true);expect(pen.cells.size).toBe(28);expect(pen.cells.has(17*w.width+17)).toBe(false);
  }
});

test('fixed statistics and real removal salvage preserve the same natural geyser',()=>{
  const w=camp(),s=building(w),geyser=structuredClone(w.geysers);
  expect(structureMaxHp(s)).toBe(500);expect(structureFlammability(s)).toBe(.5);expect(structureBeauty(s)).toBe(-30);expect(structureRoomMarketValue(s)).toBe(945);
  expect(minifiable(s.kind)).toBe(false);const before=structuredClone(w);expect(applyCommand(w,{type:'designate',kind:'uninstall',x:17,z:17}).ok).toBe(false);expect(w).toEqual(before);
  designateDeconstruction(w,s);const j=w.jobs.find(j=>j.deconstruction?.structureId===s.id)!;expect(deconstructionDuration(j)).toBe(Math.ceil(3000/17));
  expect(finishDeconstruction(w,w.pawns[0]!,j)).toBe(true);expect(w.structures).not.toContain(s);expect(w.geysers).toEqual(geyser);
  expect(quantity(w,'steel')).toBe(170);expect(quantity(w,'component')).toBe(4);expect(w.deconstructed).toMatchObject({lostSteel:170,lostComponents:4});
  const destroyed=camp(),target=building(destroyed),natural=structuredClone(destroyed.geysers);
  expect(damageStructure(destroyed,target,500,'bullet')).toBe(true);expect(destroyed.geysers).toEqual(natural);
  expect(quantity(destroyed,'steel')).toBe(85);expect(quantity(destroyed,'component')).toBe(2);expect(destroyed.destroyed).toMatchObject({count:1,lost:{steel:255,component:6}});
});
