import {expect,test} from 'vitest';
import {miningCamp} from './scenarios/mining.ts';
import {applyCommand,canDesignate} from '../src/sim/engine.ts';
import {SHIP_REACTOR_CONSTRUCTION_275,SHIP_REACTOR_PHYSICS_275,shipReactorCells275,shipReactorRect275} from '../src/sim/ship-reactor-content-275.ts';
import {shipReactorPlacementRefusal275} from '../src/sim/ship-reactor-placement-275.ts';
import {constructionRecipe,constructionSkillRequired,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {footprintCells,footprintContains} from '../src/sim/definitions.ts';
import {BUILDING_SUPPORT} from '../src/sim/bridge-rules.ts';
import {minifiable} from '../src/sim/furniture-rules.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {projectProgress,researchCost,researchPrerequisite,researchStationUsable,needsHighTechBench,needsResearchAnalyzer,readProjectProgress} from '../src/sim/research.ts';
import {validShipResearchTransport275} from '../src/sim/research-save.ts';
import {architectAvailabilityKey,architectCategoryAvailable,architectToolAvailable} from '../src/ui/architect-availability.ts';
import {researchProjects} from '../src/ui/research-projects.ts';
import {researchLinks} from '../src/ui/research-panel.ts';
import type {ResearchProject} from '../src/sim/research.ts';
import type {Structure,World} from '../src/sim/types.ts';

/** Isolated physical fixtures: flat discovered ground, completed industrial
 * prerequisites, actual bench/analyzer objects with declared power flags.
 * These tests cover admission/geometry only, not earned research, a built
 * network, played delivery, startup or victory. */
function prepared():World {
 const w=miningCamp();w.structures=[];w.jobs=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));
 w.roofing={constructed:[],build:[],remove:[],cursor:0};w.research={project:null,points:0};
 for(const id of ['smithing','machining','microelectronics','multi-analyzer','fabrication','advanced-fabrication'] as const)finish(w,id);
 return w;
}
function finish(w:World,id:ResearchProject):void {const p=projectProgress(w.research!,id);p.points=researchCost(id);p.completedAt=w.tick;}
const plan={type:'designate' as const,kind:'ship-reactor' as const,x:20,z:20,material:'steel' as const};

test('reactor pays four exact ingredients and rotates its native centered42-cell footprint without moving old shapes',()=>{
 expect(constructionRecipe(plan)).toEqual(SHIP_REACTOR_CONSTRUCTION_275);
 expect(SHIP_REACTOR_CONSTRUCTION_275).toEqual({ingredients:[{item:'steel',quantity:350},{item:'plasteel',quantity:280},{item:'uranium',quantity:70},{item:'advanced-component',quantity:8}],work:6500,coreWork:65000});
 expect(constructionSkillRequired(plan.kind)).toBe(8);expect(BUILDING_SUPPORT[plan.kind]).toBe('Heavy');expect(minifiable(plan.kind)).toBe(false);
 expect(SHIP_REACTOR_PHYSICS_275).toMatchObject({defaultOrientation:1,blocksMovement:true,maxHitPoints:500,flammability:0,powerWatts:1000,fuel:false,flick:false,breakdown:false});
 const expected=[{x:18,z:17,width:6,depth:7},{x:17,z:17,width:7,depth:6},{x:17,z:17,width:6,depth:7},{x:17,z:18,width:7,depth:6}];
 for(const orientation of [0,1,2,3] as const){
  const base={...plan,orientation,footprint:'standard' as const},cells=shipReactorCells275(base,orientation),rect=expected[orientation]!;
  expect(shipReactorRect275(base,orientation)).toEqual(rect);expect(new Set(cells.map(c=>`${c.x}:${c.z}`)).size).toBe(42);
  for(const wrapper of [base,{...base,kind:'deconstruct' as const,deconstruction:{kind:plan.kind}}]){
   expect(footprintCells(wrapper)).toEqual(cells);
   for(let z=16;z<=25;z++)for(let x=16;x<=25;x++)expect(footprintContains(wrapper,{x,z})).toBe(x>=rect.x&&x<rect.x+rect.width&&z>=rect.z&&z<rect.z+rect.depth);
  }
 }
 expect(footprintCells({...plan,footprint:'standard'})).toEqual(shipReactorCells275(plan,1));
 expect(validConstructionMaterial(plan.kind,'steel',275)).toBe(true);
 for(const version of [274,276])expect(validConstructionMaterial(plan.kind,'steel',version)).toBe(false);
 for(const material of [undefined,'wood','plasteel','granite-blocks'])expect(validConstructionMaterial(plan.kind,material,275)).toBe(false);
});

test('both ship projects require real advanced bench and analyzer, preserve their own progress and close old/future formats',()=>{
 const w=prepared(),desk:Structure={id:w.nextId++,kind:'hi-tech-research-bench',x:10,z:7,orientation:0,footprint:'standard',material:'steel',power:newPowerState('hi-tech-research-bench')};
 const analyzer:Structure={id:w.nextId++,kind:'multi-analyzer',x:14,z:9,orientation:0,footprint:'standard',material:'steel',power:newPowerState('multi-analyzer')};
 const simple:Structure={id:w.nextId++,kind:'research-bench',x:10,z:13,orientation:0,footprint:'standard',material:'wood'};w.structures.push(desk,analyzer,simple);
 desk.power!.on=true;analyzer.power!.on=true;
 expect(researchCost('ship-basics')).toBe(4_000_000_000);expect(researchCost('ship-reactor')).toBe(6_000_000_000);
 expect(researchPrerequisite(w,'ship-basics')).toBeUndefined();expect(researchPrerequisite(w,'ship-reactor')).toBe('Construction de vaisseau');
 for(const id of ['ship-basics','ship-reactor'] as const){
  expect(needsHighTechBench(id)).toBe(true);expect(needsResearchAnalyzer(id)).toBe(true);
  expect(researchStationUsable(w,simple,id)).toBe(false);expect(researchStationUsable(w,desk,id,analyzer.id)).toBe(true);
  analyzer.power!.on=false;expect(researchStationUsable(w,desk,id)).toBe(false);analyzer.power!.on=true;
  desk.power!.on=false;expect(researchStationUsable(w,desk,id)).toBe(false);desk.power!.on=true;
 }
 const before=structuredClone(w);expect(applyCommand(w,{type:'research-project',project:'ship-reactor'}).ok).toBe(false);expect(w).toEqual(before);
 expect(applyCommand(w,{type:'research-project',project:'ship-basics'}).ok).toBe(true);expect(readProjectProgress(w.research!,'ship-basics')).toEqual({points:0});
 expect(validShipResearchTransport275(w,275)).toBe(true);expect(validShipResearchTransport275(w,274)).toBe(false);expect(validShipResearchTransport275(w,276)).toBe(false);
 expect(applyCommand(w,{type:'research-project',project:null}).ok).toBe(true);finish(w,'ship-basics');
 expect(applyCommand(w,{type:'research-project',project:'ship-reactor'}).ok).toBe(true);expect(w.research!.shipBasics!.points).toBe(4_000_000_000);expect(w.research!.shipReactor).toEqual({points:0});
 const corrupt=structuredClone(w);corrupt.research!.shipReactor!.points=6_000_000_000;expect(validShipResearchTransport275(corrupt,275)).toBe(false);
 delete corrupt.research!.shipReactor;expect(validShipResearchTransport275(corrupt,275)).toBe(false);
});

test('every orientation checks its farthest cell for Heavy terrain and natural or built roof before an atomic designation',()=>{
 for(const orientation of [0,1,2,3] as const){
  const w=prepared();finish(w,'ship-basics');finish(w,'ship-reactor');
  const command={...plan,orientation};expect(shipReactorPlacementRefusal275(w,command)).toBeUndefined();expect(canDesignate(w,command)).toEqual({ok:true});
  const cell=shipReactorCells275(command,orientation).at(-1)!,index=cell.z*w.width+cell.x;
  for(const tile of [{terrain:'marsh' as const},{terrain:'water-shallow' as const,bridge:true as const}]){
   w.tiles[index]=tile;const before=structuredClone(w);expect(applyCommand(w,command).ok).toBe(false);expect(w).toEqual(before);
  }
  w.tiles[index]={terrain:'grass'};
  for(const roof of ['constructed','thin','thick'] as const){
   w.roofing={constructed:roof==='constructed'?[index]:[],build:[],remove:[],cursor:0,...(roof!=='constructed'?{natural:{thin:roof==='thin'?[index]:[],thick:roof==='thick'?[index]:[]}}:{})};
   const before=structuredClone(w);expect(shipReactorPlacementRefusal275(w,command)).toMatch(/toit/);expect(applyCommand(w,command).ok).toBe(false);expect(w).toEqual(before);
  }
 }
 const w=prepared();finish(w,'ship-basics');finish(w,'ship-reactor');expect(applyCommand(w,plan).ok).toBe(true);
 expect(w.jobs.find(j=>j.kind==='ship-reactor')).toMatchObject({orientation:1,material:'steel',construction:'blueprint'});
 const before=structuredClone(w);expect(applyCommand(w,plan).ok).toBe(false);expect(w).toEqual(before);
});

test('ShipBasics reveals the Ship category and only ShipReactor unlocks its real paid tool',()=>{
 const w=prepared(),key=architectAvailabilityKey(w);
 expect(architectCategoryAvailable(w,'ship')).toBe(false);expect(architectToolAvailable(w,'ship-reactor')).toBe(false);
 finish(w,'ship-basics');expect(architectCategoryAvailable(w,'ship')).toBe(true);expect(architectToolAvailable(w,'ship-reactor')).toBe(false);expect(architectAvailabilityKey(w)).not.toBe(key);
 finish(w,'ship-reactor');expect(architectToolAvailable(w,'ship-reactor')).toBe(true);
 expect(researchProjects.filter(p=>p.id==='ship-basics'||p.id==='ship-reactor').map(p=>p.cost)).toEqual([4000,6000]);
 expect(researchLinks).toContainEqual(['advanced-fabrication','ship-basics']);expect(researchLinks).toContainEqual(['ship-basics','ship-reactor']);
 Object.assign(w,{schemaVersion:274});expect(architectCategoryAvailable(w,'ship')).toBe(false);expect(architectToolAvailable(w,'ship-reactor')).toBe(false);
});
