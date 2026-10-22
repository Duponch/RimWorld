import {expect,test} from 'vitest';
import {miningCamp} from './scenarios/mining.ts';
import {projectProgress,researchCost,selectResearch,researchPrerequisite,readProjectProgress,needsHighTechBench,needsResearchAnalyzer,researchStationUsable,processResearch,shipCryptosleepUnlocked277,type ResearchProject} from '../src/sim/research.ts';
import {validShipResearchTransport275} from '../src/sim/research-save.ts';
import {validShipCasketResearchDomain277} from '../src/sim/ship-casket-research-277.ts';
import {architectToolAvailable,architectAvailabilityKey} from '../src/ui/architect-availability';
import {researchProjects} from '../src/ui/research-projects';
import {researchLinks} from '../src/ui/research-panel';
import {readResearchReadiness} from '../src/ui/research-readiness';
import {cookingSpot} from '../src/sim/cooking-bills.ts';
import type {World,Structure} from '../src/sim/types.ts';

function finish(w:World,id:ResearchProject){const p=projectProgress(w.research!,id);p.points=researchCost(id);p.completedAt=w.tick;}
/** Isolated declared knowledge and powered research furniture, not an earned
 * grid or completed new research. Actual service credits are checked below. */
function fixture(){
 const w=miningCamp();w.structures=[];w.jobs=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.research={project:null,points:0};
 for(const id of ['smithing','machining','microelectronics','multi-analyzer','fabrication','advanced-fabrication','ship-basics'] as const)finish(w,id);
 const desk:Structure={id:w.nextId++,kind:'hi-tech-research-bench',x:10,z:7,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
 const analyzer:Structure={id:w.nextId++,kind:'multi-analyzer',x:14,z:9,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};w.structures=[desk,analyzer];return {w,desk,analyzer};
}
test('ShipCryptosleep requires both ShipBasics and hidden Cryptosleep, and cold UI never initializes its record',()=>{
 const {w}=fixture(),before=structuredClone(w);expect(researchPrerequisite(w,'ship-cryptosleep')).toBe('Cryptosommeil');expect(selectResearch(w,'ship-cryptosleep').ok).toBe(false);expect(w).toEqual(before);
 const key=architectAvailabilityKey(w);finish(w,'cryptosleep');expect(selectResearch(w,'ship-cryptosleep').ok).toBe(true);expect(researchCost('ship-cryptosleep')).toBe(2_800_000_000);expect(architectToolAvailable(w,'ship-cryptosleep-casket')).toBe(false);
 const captured=structuredClone(w);readResearchReadiness(w,'ship-cryptosleep');expect(readProjectProgress(w.research!,'ship-reactor')).toBeUndefined();expect(w).toEqual(captured);
 expect(researchProjects.find(p=>p.id==='ship-cryptosleep')).toMatchObject({cost:2800});expect(researchLinks).toContainEqual(['cryptosleep','ship-cryptosleep']);expect(researchLinks).toContainEqual(['ship-basics','ship-cryptosleep']);
 finish(w,'ship-cryptosleep');w.research!.project=null;expect(shipCryptosleepUnlocked277(w)).toBe(true);expect(architectToolAvailable(w,'ship-cryptosleep-casket')).toBe(true);expect(architectAvailabilityKey(w)).not.toBe(key);expect(validShipResearchTransport275(w,277)).toBe(true);
});
test('the real contact service requires advanced desk/analyzer and credits the spatial project and completion event',()=>{
 const {w,desk,analyzer}=fixture();finish(w,'cryptosleep');expect(selectResearch(w,'ship-cryptosleep').ok).toBe(true);expect(needsHighTechBench('ship-cryptosleep')).toBe(true);expect(needsResearchAnalyzer('ship-cryptosleep')).toBe(true);
 expect(researchStationUsable(w,desk,'ship-cryptosleep',analyzer.id)).toBe(true);const p=w.pawns[0]!,spot=cookingSpot(desk);p.priorities.research=1;Object.assign(p,spot);p.research={stationId:desk.id,facilityId:analyzer.id,spot,worked:0};
 const events:string[]=[];analyzer.power!.on=false;processResearch(w,p,()=>{throw Error('Refuse before movement');},()=>{throw Error('No unpowered credit');},s=>events.push(s));expect(w.research!.shipCryptosleep!.points).toBe(0);expect(p.research).toBeUndefined();
 analyzer.power!.on=true;p.research={stationId:desk.id,facilityId:analyzer.id,spot,worked:0};w.research!.shipCryptosleep!.points=researchCost('ship-cryptosleep')-1000;
 processResearch(w,p,()=>{throw Error('Already at contact');},()=>500,s=>events.push(s));expect(shipCryptosleepUnlocked277(w)).toBe(false);
 processResearch(w,p,()=>{throw Error('Already at contact');},()=>500,s=>events.push(s));expect(shipCryptosleepUnlocked277(w)).toBe(true);expect(events).toEqual(['Recherche achevée : Caisson spatial de cryptosommeil. Construction sur poutre débloquée.']);expect(w.research!.project).toBeNull();
});
test('spatial research is closed before277/after277, including false, undefined, absent selected record and missing hidden prerequisite',()=>{
 const {w}=fixture();finish(w,'cryptosleep');for(const value of [undefined,false,{points:0}]){
  const state={...w.research,shipCryptosleep:value};for(const version of [276,278])expect(validShipCasketResearchDomain277(state,version,w.tick)).toBe(false);expect(validShipCasketResearchDomain277(state,277,w.tick)).toBe(value!==undefined&&value!==false);
 }
 expect(validShipCasketResearchDomain277({...w.research,project:'ship-cryptosleep'},277,w.tick)).toBe(false);
 const bad={...w.research,shipCryptosleep:{points:0}};delete bad.cryptosleep;expect(validShipCasketResearchDomain277(bad,277,w.tick)).toBe(false);
 for(const version of [276,278]){const copy=structuredClone(w);Object.assign(copy,{schemaVersion:version});expect(selectResearch(copy,'ship-cryptosleep').ok).toBe(false);expect(architectToolAvailable(copy,'ship-cryptosleep-casket')).toBe(false);}
 let reads=0;const getter={...w.research};Object.defineProperty(getter,'shipCryptosleep',{enumerable:true,get(){reads++;throw Error('Must not read accessor');}});expect(validShipCasketResearchDomain277(getter,277,w.tick)).toBe(false);expect(reads).toBe(0);
});
