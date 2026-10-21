import {expect,test} from 'vitest';
import {miningCamp} from './scenarios/mining.ts';
import {selectResearch,projectProgress,researchCost,researchPrerequisite,researchStationUsable,needsHighTechBench,needsResearchAnalyzer,readProjectProgress,processResearch,shipEngineUnlocked276,type ResearchProject} from '../src/sim/research.ts';
import {validShipResearchTransport275} from '../src/sim/research-save.ts';
import {validShipEngineResearchDomain276} from '../src/sim/ship-engine-research-276.ts';
import {architectAvailabilityKey,architectCategoryAvailable,architectToolAvailable} from '../src/ui/architect-availability';
import {researchProjects} from '../src/ui/research-projects';
import {researchLinks} from '../src/ui/research-panel';
import {readResearchReadiness} from '../src/ui/research-readiness';
import {cookingSpot} from '../src/sim/cooking-bills.ts';
import type {World,Structure} from '../src/sim/types.ts';

/** Isolated research/inspection fixture. Industrial knowledge and actual
 * powered desk/analyzer flags are declared preparation, not earned power or
 * a campaign. No hull object, research completion or final state is invented. */
function fixture(){
 const w=miningCamp();w.structures=[];w.jobs=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.research={project:null,points:0};
 for(const id of ['smithing','machining','microelectronics','multi-analyzer','fabrication','advanced-fabrication'] as const)finish(w,id);
 const desk:Structure={id:w.nextId++,kind:'hi-tech-research-bench',x:10,z:7,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
 const analyzer:Structure={id:w.nextId++,kind:'multi-analyzer',x:14,z:9,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
 const simple:Structure={id:w.nextId++,kind:'research-bench',x:10,z:13,orientation:0,footprint:'standard',material:'wood'};
 w.structures=[desk,analyzer,simple];return {w,desk,analyzer,simple};
}
function finish(w:World,id:ResearchProject){const p=projectProgress(w.research!,id);p.points=researchCost(id);p.completedAt=w.tick;}
test('ShipBasics opens the paid beam and research-engine chain before the independent reactor research',()=>{
 const {w}=fixture(),before=structuredClone(w),key=architectAvailabilityKey(w);
 expect(selectResearch(w,'ship-engine').ok).toBe(false);expect(w).toEqual(before);expect(researchPrerequisite(w,'ship-engine')).toBe('Construction de vaisseau');
 expect(architectCategoryAvailable(w,'ship')).toBe(false);finish(w,'ship-basics');
 expect(architectCategoryAvailable(w,'ship')).toBe(true);expect(architectToolAvailable(w,'ship-beam')).toBe(true);expect(architectToolAvailable(w,'ship-engine')).toBe(false);expect(architectToolAvailable(w,'ship-reactor')).toBe(false);
 expect(architectAvailabilityKey(w)).not.toBe(key);expect(researchCost('ship-engine')).toBe(6_000_000_000);expect(selectResearch(w,'ship-engine').ok).toBe(true);
 expect(readProjectProgress(w.research!,'ship-engine')).toEqual({points:0});expect(validShipResearchTransport275(w,276)).toBe(true);
 expect(researchProjects.find(p=>p.id==='ship-engine')).toMatchObject({cost:6000,prefix:'ship-engine'});expect(researchLinks).toContainEqual(['ship-basics','ship-engine']);
 const checkpoint=structuredClone(w);readResearchReadiness(w,'ship-engine');readProjectProgress(w.research!,'ship-reactor');expect(w).toEqual(checkpoint);
});
test('real desk and analyzer are required by the motor service and its own completion event',()=>{
 const {w,desk,analyzer,simple}=fixture();finish(w,'ship-basics');expect(selectResearch(w,'ship-engine').ok).toBe(true);
 expect(needsHighTechBench('ship-engine')).toBe(true);expect(needsResearchAnalyzer('ship-engine')).toBe(true);expect(researchStationUsable(w,simple,'ship-engine')).toBe(false);
 expect(researchStationUsable(w,desk,'ship-engine',analyzer.id)).toBe(true);
 const p=w.pawns[0]!,spot=cookingSpot(desk);p.priorities.research=1;Object.assign(p,spot);p.research={stationId:desk.id,facilityId:analyzer.id,spot,worked:0};
 const events:string[]=[];analyzer.power!.on=false;
 processResearch(w,p,()=>{throw Error('Power refusal before any motion');},()=>{throw Error('Unpowered analyzer gives no points');},text=>events.push(text));
 expect(w.research!.shipEngine!.points).toBe(0);expect(p.research).toBeUndefined();
 // Declared near-finish fixture; the two actual service calls still perform
 // contact work, credit the right project and emit its real completion event.
 analyzer.power!.on=true;p.research={stationId:desk.id,facilityId:analyzer.id,spot,worked:0};w.research!.shipEngine!.points=researchCost('ship-engine')-1000;
 processResearch(w,p,()=>{throw Error('At the actual service cell');},()=>500,text=>events.push(text));expect(shipEngineUnlocked276(w)).toBe(false);
 processResearch(w,p,()=>{throw Error('At the actual service cell');},()=>500,text=>events.push(text));
 expect(shipEngineUnlocked276(w)).toBe(true);expect(w.research!.project).toBeNull();expect(events).toEqual(['Recherche achevée : Moteur Johnson–Tanaka. Construction extérieure débloquée.']);
 expect(architectToolAvailable(w,'ship-engine')).toBe(true);expect(architectToolAvailable(w,'ship-reactor')).toBe(false);expect(validShipResearchTransport275(w,276)).toBe(true);
});
test('prospective motor namespace is closed on275 and277, including false and undefined records',()=>{
 const {w}=fixture();finish(w,'ship-basics');expect(validShipResearchTransport275(w,275)).toBe(true);
 for(const value of [undefined,false,{points:0}]){
  const state={...w.research,shipEngine:value};
  expect(validShipEngineResearchDomain276(state,275,w.tick)).toBe(false);expect(validShipEngineResearchDomain276(state,277,w.tick)).toBe(false);
  expect(validShipEngineResearchDomain276(state,276,w.tick)).toBe(value!==undefined&&value!==false);
 }
 expect(validShipEngineResearchDomain276({...w.research,project:'ship-engine'},276,w.tick)).toBe(false);
 const old=structuredClone(w);Object.assign(old,{schemaVersion:275});expect(selectResearch(old,'ship-engine').ok).toBe(false);expect(architectToolAvailable(old,'ship-beam')).toBe(false);
 const future=structuredClone(w);Object.assign(future,{schemaVersion:277});expect(selectResearch(future,'ship-engine').ok).toBe(false);expect(architectToolAvailable(future,'ship-engine')).toBe(false);
 let reads=0;const getter={...w.research};Object.defineProperty(getter,'shipEngine',{enumerable:true,get(){reads++;throw Error('Forbidden getter');}});
 expect(validShipEngineResearchDomain276(getter,276,w.tick)).toBe(false);expect(reads).toBe(0);
});
