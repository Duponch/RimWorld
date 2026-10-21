import {expect,test} from 'vitest';
import {writeTestFileSync} from './test-output.ts';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {cookingSpot} from '../src/sim/cooking-bills.ts';
import {newBuildingFuel} from '../src/sim/fuel.ts';
import {LONG_BLADES_RESEARCH_COST,RESEARCH_SCALE,longBladesUnlocked270,researchCost,researchPrerequisite,researchStationUsable,needsHighTechBench} from '../src/sim/research.ts';
import {validLongBladesResearchTransport270} from '../src/sim/research-save.ts';
import {productionResearchUnlocked} from '../src/sim/machining.ts';
import {SCHEMA_VERSION,type Command,type Structure,type World} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const result=applyCommand(w,c);expect(result.ok,result.reason??JSON.stringify(c)).toBe(true);};
/** Declared32² workshop fixture at tick2000: simple desk, empty fueled forge,
 * Forge already learned, Intellectual20/Crafting5,100steel,20finished survival
 * meals and full needs. No LongBlades point, research contact, task, travel or
 * completion is prepared. Subsequent progress is produced only by the engine. */
function prepared(){
 const w=foodWorkstationCamp(),p=w.pawns[0]!;
 w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.recreation.level=100;p.priorities.research=1;
 p.skills.intellectual={level:20,xp:0,dailyXp:0,passion:0};p.skills.crafting={level:5,xp:0,dailyXp:0,passion:0};
 w.research={project:null,points:0,smithing:{points:researchCost('smithing'),completedAt:1000}};
 const desk:Structure={id:w.nextId++,kind:'research-bench',x:10,z:7,orientation:0,footprint:'standard',material:'wood'};
 const forge:Structure={id:w.nextId++,kind:'fueled-smithy',x:10,z:13,orientation:0,footprint:'standard',material:'steel',bills:[],fuel:newBuildingFuel('fueled-smithy')};
 w.structures.push(desk,forge);addGroundMaterial(w,'steel',100,{x:16,z:13});addGroundMaterial(w,'food',20,{x:3,z:5},'survival-meal');refreshStock(w);
 expect(w.schemaVersion).toBe(SCHEMA_VERSION);expect(validateWorld(w)).toEqual([]);return {w,p,desk,forge};
}

test('LongBlades costs400 after Forge and refuses its project or sword bill atomically before prerequisites',()=>{
 const {w,desk,forge}=prepared();delete w.research!.smithing;
 expect(LONG_BLADES_RESEARCH_COST).toBe(400_000_000);expect(researchCost('long-blades')).toBe(400*RESEARCH_SCALE);
 expect(needsHighTechBench('long-blades')).toBe(false);expect(researchStationUsable(w,desk,'long-blades')).toBe(true);
 expect(researchPrerequisite(w,'long-blades')).toBe('Forge');expect(productionResearchUnlocked(w,'make-longsword')).toBe(false);
 const before=serializeWorld(w);
 expect(applyCommand(w,{type:'research-project',project:'long-blades'}).ok).toBe(false);
 expect(applyCommand(w,{type:'bill-add',structureId:forge.id,recipe:'make-longsword'}).ok).toBe(false);
 expect(serializeWorld(w)).toBe(before);expect(w.research!.longBlades).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('all400 points require real desk work from zero, pause at an earned98%, then finish and replay the whole world exactly',()=>{
 const {w,p,desk,forge}=prepared(),start=w.tick,spot=cookingSpot(desk),xp=p.skills.intellectual!.xp;
 expect(w.research!.longBlades).toBeUndefined();expect(researchPrerequisite(w,'long-blades')).toBeUndefined();
 command(w,{type:'research-project',project:'long-blades'});expect(w.research!.longBlades).toEqual({points:0});
 const initial=serializeWorld(w),replay=deserializeWorld(initial);expect(serializeWorld(replay)).toBe(initial);
 const tick=()=>{stepWorld(w);stepWorld(replay);};
 tick();expect(w.research!.longBlades!.points).toBe(0);expect(p.skills.intellectual!.xp).toBe(xp);
 expect(p.research?.stationId).toBe(desk.id);expect({x:p.x,z:p.z}).not.toEqual(spot);
 let worked=false,releasedBursts=0;
 for(let i=0;i<12000&&w.research!.longBlades!.points<LONG_BLADES_RESEARCH_COST*.98;i++){
  const before=w.research!.longBlades!.points,workedBefore=p.research?.worked;tick();
  if(w.research!.longBlades!.points>before){
   worked=true;expect({x:p.x,z:p.z}).toEqual(spot);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);expect(p.moveCooldown).toBe(0);
   // The existing service releases its seat after each 400-tick burst,
   // including the final earned point of that burst. Contact remains real.
   if(p.research)expect(p.state).toBe('working');
   else {expect(workedBefore).toBe(399);expect(p.state).toBe('idle');releasedBursts++;}
  }
 }
 expect(worked).toBe(true);expect(releasedBursts).toBeGreaterThan(0);expect(p.skills.intellectual!.xp).toBeGreaterThan(xp);
 const progress=w.research!.longBlades!.points;expect(progress).toBeGreaterThanOrEqual(392_000_000);expect(progress).toBeLessThan(400_000_000);
 expect(longBladesUnlocked270(w)).toBe(false);expect(productionResearchUnlocked(w,'make-longsword')).toBe(false);
 for(const state of [w,replay])command(state,{type:'research-project',project:null});
 expect(serializeWorld(replay)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
 // A real paused checkpoint lets the native UI select and complete the last
 // earned2%, then expose the sword bill on the existing forge.
 const checkpoint=serializeWorld(w),resumed=deserializeWorld(checkpoint);expect(serializeWorld(resumed)).toBe(checkpoint);
 writeTestFileSync('artifacts/long-blades-ready-v446.json',checkpoint);
 writeTestFileSync('artifacts/long-blades-ready-v446.meta.json',JSON.stringify({prepared:'32², tick2000 clocks aligned, simple desk, empty fueled forge, Forge research, Intellectual20/Crafting5,100steel,20finished survival meals. LongBlades earned from zero by real desk work.',tick:w.tick,startTick:start,progress,cost:400_000_000,project:null,pawnId:p.id,deskId:desk.id,forgeId:forge.id,desk:{x:desk.x,z:desk.z},forge:{x:forge.x,z:forge.z},worker:{x:p.x,z:p.z}},null,2));
 for(let i=0;i<5;i++){tick();stepWorld(resumed);}
 expect(w.research!.longBlades!.points).toBe(progress);expect(p.research).toBeUndefined();expect(serializeWorld(resumed)).toBe(serializeWorld(w));
 for(const state of [w,replay,resumed])command(state,{type:'research-project',project:'long-blades'});
 for(let i=0;i<3000&&!longBladesUnlocked270(w);i++){tick();stepWorld(resumed);}
 expect(longBladesUnlocked270(w)).toBe(true);expect(serializeWorld(replay)).toBe(serializeWorld(w));expect(serializeWorld(resumed)).toBe(serializeWorld(w));
 expect(w.research!.longBlades).toEqual({points:400_000_000,completedAt:w.tick});expect(w.tick).toBeGreaterThan(start);
 expect(w.research!.project).toBeNull();expect(p.research).toBeUndefined();expect(productionResearchUnlocked(w,'make-longsword')).toBe(true);
 expect(w.events.filter(e=>e.message.startsWith('Recherche achevée : Lames longues.'))).toHaveLength(1);
 expect(w.piles.some(q=>q.item.endsWith('-longsword')||q.item==='unfinished-longsword')).toBe(false);
 for(const state of [w,replay,resumed])command(state,{type:'bill-add',structureId:forge.id,recipe:'make-longsword'});
 expect(forge.bills).toHaveLength(1);expect(forge.bills![0]!.recipe).toBe('make-longsword');expect(serializeWorld(replay)).toBe(serializeWorld(w));expect(serializeWorld(resumed)).toBe(serializeWorld(w));
 expect(validateWorld(w)).toEqual([]);const complete=serializeWorld(w);expect(serializeWorld(deserializeWorld(complete))).toBe(complete);
 writeTestFileSync('artifacts/long-blades-final-v446.json',complete);
 writeTestFileSync('artifacts/long-blades-final-v446.meta.json',JSON.stringify({startTick:start,completedAt:w.research!.longBlades!.completedAt,tick:w.tick,pawnId:p.id,deskId:desk.id,forgeId:forge.id,billId:forge.bills![0]!.id,points:w.research!.longBlades!.points,wholeWorldReplay:true,checkpoint98Replay:true},null,2));
},120000);

test('research envelopes reject false progress, premature completion and missing Forge transactionally',()=>{
 const {w}=prepared();command(w,{type:'research-project',project:'long-blades'});const text=serializeWorld(w);
 for(const mutate of [
  (v:World)=>{Object.assign(v.research!,{longBlades:false});},
  (v:World)=>{v.research!.longBlades={points:400_000_000};},
  (v:World)=>{v.research!.longBlades={points:399_000_000,completedAt:v.tick};},
  (v:World)=>{delete v.research!.smithing;},
 ]){
  const bad=JSON.parse(text) as World;mutate(bad);expect(validLongBladesResearchTransport270(bad,SCHEMA_VERSION)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();expect(serializeWorld(w)).toBe(text);
 }
});
