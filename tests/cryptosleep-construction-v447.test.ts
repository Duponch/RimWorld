import {expect,test} from 'vitest';
import {writeTestFileSync} from './test-output.ts';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';
import {fixturePower} from './scenarios/power.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {newPowerState,isElectrical} from '../src/sim/power-rules.ts';
import {CRYPTOSLEEP_RESEARCH_COST271,cryptosleepUnlocked271,researchCost,researchPrerequisite,researchStationUsable,needsHighTechBench} from '../src/sim/research.ts';
import {validCryptosleepResearchTransport271} from '../src/sim/research-save.ts';
import {constructionRecipe,constructionSkillRequired,constructionSupplied,deliveredMaterial,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {cryptosleepCells271,CRYPTOSLEEP_CONSTRUCTION_271} from '../src/sim/cryptosleep-content-271.ts';
import {cryptosleepInteraction271,isPlayerCasket271} from '../src/sim/cryptosleep-state-271.ts';
import {footprintCells,footprintContains} from '../src/sim/definitions.ts';
import {FURNITURE_TRAVEL} from '../src/sim/furniture-travel.ts';
import {BUILDING_SUPPORT} from '../src/sim/bridge-rules.ts';
import {minifiable} from '../src/sim/furniture-rules.ts';
import {structureMaxHp,structureFlammability} from '../src/sim/thing-damage-rules.ts';
import type {Command,Structure,World} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const r=applyCommand(w,c);expect(r.ok,r.reason??JSON.stringify(c)).toBe(true);};
const total=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const plan={type:'designate' as const,kind:'cryptosleep-casket' as const,x:21,z:16,orientation:0 as const,material:'steel' as const};
function until(w:World,done:()=>boolean,limit=12000,observe?:()=>void):void {
 for(let i=0;i<limit&&!done();i++){stepWorld(w);observe?.();}
 if(!done()||validateWorld(w).length)writeTestFileSync('tmp/cryptosleep-v447/construction-failure.json',JSON.stringify(w));
 expect(done(),JSON.stringify({tick:w.tick,pawn:w.pawns[0]!.state,research:w.research,task:w.pawns[0]!.research,jobs:w.jobs,power:w.structures.filter(s=>s.power).map(s=>({id:s.id,kind:s.kind,power:s.power,fuel:s.fuel}))})).toBe(true);
 expect(validateWorld(w)).toEqual([]);
}
const roundTrip=(w:World)=>{const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;};

/** Prepared32² single-human engineering workshop: advanced desk/analyzer,
 * simple desk and a real cardinal two-conduit network,75wood already loaded
 * plus150finite wood for physical autonomous refuels, prerequisites,
 * Intellectual20/Construction8 and Transport2,180steel/5uranium/4components/
 * 1advanced component and80finished meals. The grid earns its ordinary startup
 * ticks before research selection. No Cryptosleep point, casket plan, haul or
 * construction is prepared.
 * The rest of the playable casket chain is exercised by its separate tests. */
function prepared(){
 const w=foodWorkstationCamp(),p=w.pawns[0]!;
 w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.recreation.level=100;p.priorities.research=1;p.priorities.haul=2;
 p.skills.intellectual={level:20,xp:0,dailyXp:0,passion:0};p.skills.construction.level=8;
 w.research={project:null,points:0,smithing:{points:researchCost('smithing'),completedAt:1000},machining:{points:researchCost('machining'),completedAt:1001},microelectronics:{points:researchCost('microelectronics'),completedAt:1002},multiAnalyzer:{points:researchCost('multi-analyzer'),completedAt:1003}};
 const desk:Structure={id:w.nextId++,kind:'hi-tech-research-bench',x:10,z:7,orientation:0,footprint:'standard',material:'steel',power:newPowerState('hi-tech-research-bench')};
 const analyzer:Structure={id:w.nextId++,kind:'multi-analyzer',x:14,z:9,orientation:0,footprint:'standard',material:'steel',power:newPowerState('multi-analyzer')};
 const simple:Structure={id:w.nextId++,kind:'research-bench',x:10,z:13,orientation:0,footprint:'standard',material:'wood'};
 w.structures.push(desk,analyzer,simple);fixturePower(w,'wood-generator',5,7);
 // The generator occupies x5..6/z7..8. These cardinally joined conductors
 // extend its real network to within six cells of both consumer anchors.
 for(const x of [7,8])w.structures.push({id:w.nextId++,kind:'power-conduit',x,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('power-conduit')});
 addGroundMaterial(w,'wood',75,{x:3,z:7},'wood');addGroundMaterial(w,'wood',75,{x:4,z:7},'wood');
 for(const {item,quantity} of CRYPTOSLEEP_CONSTRUCTION_271.ingredients)addGroundMaterial(w,item,quantity,{x:25,z:16},item);
 addGroundMaterial(w,'food',80,{x:3,z:5},'survival-meal');refreshStock(w);
 until(w,()=>researchStationUsable(w,desk,'cryptosleep',analyzer.id),200);
 expect(desk.power!.parentId).not.toBeNull();expect(analyzer.power!.parentId).not.toBeNull();
 return {w,p,desk,analyzer,simple};
}

test('ordinary casket has its own fixed paid recipe and rotated1×2 Medium physical footprint',()=>{
 expect(constructionRecipe(plan)).toEqual(CRYPTOSLEEP_CONSTRUCTION_271);expect(constructionSkillRequired(plan.kind)).toBe(8);
 expect(validConstructionMaterial(plan.kind,'steel',271)).toBe(true);
 for(const material of [undefined,'wood','plasteel'])expect(validConstructionMaterial(plan.kind,material,271)).toBe(false);
 expect(validConstructionMaterial(plan.kind,'steel',270)).toBe(false);
 expect(BUILDING_SUPPORT[plan.kind]).toBe('Medium');expect(FURNITURE_TRAVEL[plan.kind]).toEqual({delay:4.2,stand:false,repeat:true});
 expect(minifiable(plan.kind)).toBe(false);expect(isElectrical(plan.kind)).toBe(false);
 for(const orientation of [0,1,2,3] as const){
  const base={...plan,orientation,footprint:'standard' as const},cells=cryptosleepCells271(base,orientation);
  expect(cells).toHaveLength(2);expect(footprintCells(base)).toEqual(cells);
  for(const cell of cells)expect(footprintContains(base,cell)).toBe(true);
  expect(footprintContains(base,cryptosleepInteraction271(base))).toBe(false);
 }
});

test('Cryptosleep requires MultiAnalyzer and an advanced powered linked desk, with atomic locked commands',()=>{
 const {w,desk,analyzer,simple}=prepared();
 expect(CRYPTOSLEEP_RESEARCH_COST271).toBe(2_000_000_000);expect(needsHighTechBench('cryptosleep')).toBe(true);
 expect(researchStationUsable(w,simple,'cryptosleep')).toBe(false);
 const without=roundTrip(w);without.structures=without.structures.filter(s=>s.id!==analyzer.id);delete without.research!.multiAnalyzer;
 const before=serializeWorld(without);expect(researchPrerequisite(without,'cryptosleep')).toBe('Multi-analyseur');
 expect(applyCommand(without,{type:'research-project',project:'cryptosleep'}).ok).toBe(false);
 expect(applyCommand(without,plan).ok).toBe(false);expect(serializeWorld(without)).toBe(before);
 stepWorld(w);expect(researchStationUsable(w,desk,'cryptosleep',analyzer.id)).toBe(true);
 analyzer.power!.on=false;expect(researchStationUsable(w,desk,'cryptosleep',analyzer.id)).toBe(false);
 analyzer.power!.on=true;desk.power!.on=false;expect(researchStationUsable(w,desk,'cryptosleep',analyzer.id)).toBe(false);
});

test('all2000points earned from zero then finite four-material haul/frame/build conserve the same world through reload',()=>{
 const {w,p,desk,analyzer}=prepared(),start=w.tick;
 const before=serializeWorld(w);expect(applyCommand(w,plan).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 command(w,{type:'research-project',project:'cryptosleep'});expect(w.research!.cryptosleep).toEqual({points:0});
 stepWorld(w);expect(w.research!.cryptosleep!.points).toBe(0);
 let contact=false;
 until(w,()=>w.research!.cryptosleep!.points>=CRYPTOSLEEP_RESEARCH_COST271*.98,45000,()=>{
  if(p.research?.worked){contact=true;expect(p.research.stationId).toBe(desk.id);expect(p.research.facilityId).toBe(analyzer.id);expect(p.x).toBe(p.research.spot.x);expect(p.z).toBe(p.research.spot.z);expect(p.moveCooldown).toBe(0);}
 });
 expect(contact).toBe(true);expect(cryptosleepUnlocked271(w)).toBe(false);
 command(w,{type:'research-project',project:null});const earned=w.research!.cryptosleep!.points;
 const ready=roundTrip(w);
 writeTestFileSync('tmp/cryptosleep-v447/research-ready.json',serializeWorld(w));
 writeTestFileSync('tmp/cryptosleep-v447/research-ready.meta.json',JSON.stringify({prepared:'Advanced desk/analyzer, two cardinal conduits and ordinary powered startup;75wood loaded plus150finite wood with Transport2 for physical autonomous refuels; prerequisites, Intellectual20/Construction8, four finite ingredients and80survival meals. All Cryptosleep points earned from zero at contact.',startTick:start,tick:w.tick,points:earned,cost:CRYPTOSLEEP_RESEARCH_COST271,pawnId:p.id,deskId:desk.id,analyzerId:analyzer.id},null,2));
 for(const state of [w,ready])command(state,{type:'research-project',project:'cryptosleep'});
 until(w,()=>cryptosleepUnlocked271(w),4000);stepWorld(ready,w.tick-ready.tick);expect(serializeWorld(ready)).toBe(serializeWorld(w));
 expect(w.research!.cryptosleep).toEqual({points:CRYPTOSLEEP_RESEARCH_COST271,completedAt:w.tick});
 const finished=roundTrip(w);expect(validCryptosleepResearchTransport271(w,271)).toBe(true);
 for(const state of [w,finished]){
  command(state,{type:'priority',pawnId:p.id,work:'research',value:0});
  command(state,{type:'priority',pawnId:p.id,work:'build',value:1});
  command(state,{type:'priority',pawnId:p.id,work:'haul',value:2});command(state,plan);
 }
 const jobId=w.jobs.find(j=>j.kind===plan.kind)!.id,carried=new Set<string>();let partial=false;
 until(w,()=>{const j=w.jobs.find(j=>j.id===jobId);return !!j&&j.construction==='frame'&&constructionSupplied(w,j);},12000,()=>{
  if(p.haul?.destination.type==='job'&&p.haul.destination.jobId===jobId&&p.haul.phase==='deliver'){
   const held=w.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id);if(held)carried.add(held.item);
  }
  const j=w.jobs.find(j=>j.id===jobId);if(j&&deliveredMaterial(w,j,'steel')>0&&!constructionSupplied(w,j))partial=true;
 });
 stepWorld(finished,w.tick-finished.tick);expect(serializeWorld(finished)).toBe(serializeWorld(w));
 expect(partial).toBe(true);expect([...carried].sort()).toEqual(['advanced-component','component','steel','uranium']);
 const frame=w.jobs.find(j=>j.id===jobId)!;
 for(const {item,quantity} of CRYPTOSLEEP_CONSTRUCTION_271.ingredients)expect(deliveredMaterial(w,frame,item)).toBe(quantity);
 const paid=roundTrip(w),cancelled=roundTrip(w);
 command(cancelled,{type:'area',action:'cancel',from:{x:plan.x,z:plan.z},to:{x:plan.x,z:plan.z}});
 expect(cancelled.jobs.some(j=>j.id===jobId)).toBe(false);
 for(const {item,quantity} of CRYPTOSLEEP_CONSTRUCTION_271.ingredients)expect(total(cancelled,item)).toBe(quantity);
 roundTrip(cancelled);
 until(w,()=>w.structures.some(s=>s.kind===plan.kind),4000);stepWorld(paid,w.tick-paid.tick);expect(serializeWorld(paid)).toBe(serializeWorld(w));
 const casket=w.structures.find(isPlayerCasket271)!;
 expect(casket).toMatchObject({kind:plan.kind,material:'steel',cryptosleep:{revision:1,human:null,items:[],heldAt:w.tick}});
 expect(casket.power).toBeUndefined();expect(casket.quality).toBeUndefined();expect(casket.fuel).toBeUndefined();
 expect(structureMaxHp(casket)).toBe(250);expect(structureFlammability(casket)).toBe(.5);
 expect(w.jobs.some(j=>j.id===jobId)).toBe(false);
 for(const {item} of CRYPTOSLEEP_CONSTRUCTION_271.ingredients)expect(total(w,item)).toBe(0);
 roundTrip(w);writeTestFileSync('tmp/cryptosleep-v447/constructed.json',serializeWorld(w));
 writeTestFileSync('tmp/cryptosleep-v447/constructed.meta.json',JSON.stringify({tick:w.tick,casketId:casket.id,pawnId:p.id,ingredients:CRYPTOSLEEP_CONSTRUCTION_271.ingredients,wholeWorldReload:true,emptyBuildingOnly:true},null,2));
},180000);
