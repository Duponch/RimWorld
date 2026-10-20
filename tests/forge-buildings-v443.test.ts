import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {addGroundMaterial} from '../src/sim/materials';
import {SMITHING_RESEARCH_COST,RESEARCH_SCALE,smithyConstructionUnlocked267} from '../src/sim/research';
import {validSmithyResearchTransport267} from '../src/sim/research-save';
import {constructionRecipe,constructionSupplied,constructionSkillRequired,deliveredMaterial} from '../src/sim/construction-materials';
import {footprintCells} from '../src/sim/definitions';
import {cookingSpot} from '../src/sim/cooking-bills';
import {newBuildingFuel,burnFuel,consumeCookingFuel,FUEL_UNIT_TICKS,fuelCapacity} from '../src/sim/fuel';
import {newPowerState,powerWatts,powerDemand,isFlickable} from '../src/sim/power-rules';
import {advancePower} from '../src/sim/power';
import {validatePower} from '../src/sim/power-save';
import {canBreakdownNow,triggerBreakdown} from '../src/sim/breakdowns';
import {reconcileTemperature} from '../src/sim/temperature';
import {applyThermalSources,applyCookingHeat} from '../src/sim/thermal-sources';
import {rainElectricalEligible} from '../src/sim/rain-electric';
import {canStandAt,furnitureDelay} from '../src/sim/furniture-travel';
import {bridgeSupportsBuilding} from '../src/sim/bridge-rules';
import {groupPackedMassGrams258} from '../src/sim/group-freight-mass-258';
import {structureMaxHp,structureFlammability} from '../src/sim/thing-damage-rules';
import {captureCleanliness} from '../src/sim/filth-room';
import {captureRoomQuality} from '../src/sim/room-quality';
import {WorkEnvironmentCache} from '../src/sim/work-environment';
import type {Command,Job,Structure,World} from '../src/sim/types';

const kinds=['fueled-smithy','electric-smithy'] as const;
function command(w:World,c:Command){const r=applyCommand(w,c);expect(r.ok,r.reason??JSON.stringify(c)).toBe(true);}
function until(w:World,done:()=>boolean,limit:number,observe?:()=>void){for(let i=0;i<limit&&!done();i++){stepWorld(w);observe?.();}expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({id:p.id,x:p.x,z:p.z,state:p.state,haul:p.haul})),events:w.events.slice(-2)})).toBe(true);}
const total=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const contact=(p:{x:number;z:number},j:Job)=>footprintCells(j).some(c=>Math.abs(c.x-p.x)+Math.abs(c.z-p.z)<=1);

/** Prepared small camp: healthy full-needs workers, one real research desk,
 * 699/700 learned points and exactly the finite building ingredients nearby.
 * No completed Forge research, building, delivery or work is prepared. */
function constructionCamp(){
 const w=deconstructionCamp(2),builder=w.pawns[0]!,researcher=w.pawns[1]!;
 w.jobs=[];w.structures=[];w.packed=[];w.stockpiles=[];w.growingZones=[];
 for(const p of w.pawns){for(const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[key]=0;
  p.hunger=p.rest=p.recreation.level=100;p.schedule.fill('work');p.motion=null;p.moveCooldown=0;p.skills.construction.level=8;p.skills.intellectual={level:8,xp:0,dailyXp:0,passion:0};}
 Object.assign(builder,{x:10,z:10});builder.priorities.build=1;builder.priorities.haul=2;researcher.priorities.research=1;
 const desk:Structure={id:w.nextId++,kind:'research-bench',x:8,z:8,orientation:0,footprint:'standard',material:'wood'};w.structures.push(desk);Object.assign(researcher,cookingSpot(desk));
 w.research={project:null,points:0,smithing:{points:SMITHING_RESEARCH_COST-RESEARCH_SCALE}};
 addGroundMaterial(w,'steel',200,{x:11,z:10},'steel');addGroundMaterial(w,'component',3,{x:12,z:10},'component');
 expect(validateWorld(w)).toEqual([]);return {w,researcherId:researcher.id};
}

test('paid Forge research and both paid physical construction chains preserve full saves',()=>{
 const {w,researcherId}=constructionCamp(),start=w.tick;
 const plans=kinds.map((kind,i)=>({type:'designate' as const,kind,x:12+i*5,z:13,orientation:i as 0|1,material:'steel' as const}));
 for(const plan of plans){const before=structuredClone(w);expect(applyCommand(w,plan).ok).toBe(false);expect(w).toEqual(before);}
 command(w,{type:'research-project',project:'smithing'});let researchedAtContact=false;
 until(w,()=>smithyConstructionUnlocked267(w),180,()=>{const p=w.pawns.find(p=>p.id===researcherId)!;researchedAtContact||=!!p.research&&p.research.worked>0&&p.x===p.research.spot.x&&p.z===p.research.spot.z;});
 expect(researchedAtContact).toBe(true);expect(w.research!.smithing!.completedAt).toBeGreaterThan(start);
 command(w,{type:'priority',pawnId:researcherId,work:'research',value:0});command(w,{type:'priority',pawnId:researcherId,work:'haul',value:1});command(w,{type:'priority',pawnId:researcherId,work:'build',value:2});
 for(const plan of plans){
  command(w,plan);const id=w.jobs.find(j=>j.kind===plan.kind)!.id;let moved=false,worked=false,delivered=false;
  const observe=()=>{const j=w.jobs.find(j=>j.id===id);if(!j)return;
   for(const p of w.pawns){if(p.haul?.destination.type==='job'&&p.haul.destination.jobId===id&&p.haul.phase==='deliver')moved=true;
    if(p.jobId===id&&p.state==='working'&&j.progress>0){expect(contact(p,j)).toBe(true);expect((p.motion?.end??0)<=w.tick).toBe(true);worked=true;}}
   if(constructionSupplied(w,j)){expect(deliveredMaterial(w,j,'steel')).toBe(100);expect(deliveredMaterial(w,j,'component')).toBe(plan.kind==='electric-smithy'?3:0);delivered=true;}};
  until(w,()=>{const j=w.jobs.find(j=>j.id===id);return !!j&&constructionSupplied(w,j)&&j.progress>0;},2400,observe);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  until(w,()=>w.structures.some(s=>s.kind===plan.kind&&s.x===plan.x&&s.z===plan.z),1000,observe);
  expect({moved,worked,delivered}).toEqual({moved:true,worked:true,delivered:true});
  const built=w.structures.filter(s=>s.kind===plan.kind&&s.x===plan.x&&s.z===plan.z);expect(built).toHaveLength(1);expect(w.jobs.some(j=>j.id===id)).toBe(false);
  const s=built[0]!;expect(structureMaxHp(s)).toBe(180);expect(structureFlammability(s)).toBe(1);
  if(s.kind==='fueled-smithy')expect(s.fuel).toEqual({ticks:0,burned:0,autoRefuel:true});else expect(s.power).toMatchObject({on:false,parentId:null});
 }
 expect([total(w,'steel'),total(w,'component')]).toEqual([0,0]);expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

/** Isolated service fixtures below do not claim a played acquisition. */
function bench(kind:typeof kinds[number],id=50):Structure{return {id,kind,x:12,z:12,orientation:0,footprint:'standard',material:'steel',bills:[],...(kind==='fueled-smithy'?{fuel:newBuildingFuel(kind)}:{power:newPowerState(kind)})};}
function isolated(){const w=deconstructionCamp();w.pawns=[];w.piles=[];w.structures=[];w.jobs=[];w.packed=[];w.tick=100;w.nextId=1000;return w;}
function enclosed(){const w=isolated();for(let z=9;z<=16;z++)for(let x=8;x<=16;x++)if(x===8||x===16||z===9||z===16)w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'});
 w.roofing={constructed:Array.from({length:42},(_,i)=>(10+Math.floor(i/7))*w.width+9+i%7),build:[],remove:[],cursor:0};return w;}

test('50 wood reserve is usage only at 80/day, with an exact final fractional tick',()=>{
 const w=isolated(),s=bench('fueled-smithy');s.fuel!.ticks=50*FUEL_UNIT_TICKS;w.structures=[s];
 const before=structuredClone(s.fuel);for(let i=0;i<6000;i++)burnFuel(w);expect(s.fuel).toEqual(before);
 let useful=0;for(let i=0;i<3750;i++)useful+=consumeCookingFuel(s);expect(useful).toBe(3750);expect(s.fuel).toEqual({ticks:0,burned:30000,autoRefuel:true});expect(consumeCookingFuel(s)).toBe(0);
 s.fuel!.ticks=3;expect(consumeCookingFuel(s)).toBe(3/8);expect(s.fuel!.ticks).toBe(0);expect(s.fuel!.burned).toBe(30003);
 s.fuel!.autoRefuel=false;expect(fuelCapacity(w,s.id)).toBe(0);expect(fuelCapacity(w,s.id,undefined,true)).toBe(50);
});

test('210W consumer uses real connection, switch and breakdown authorities',()=>{
 const w=isolated(),s=bench('electric-smithy'),g:Structure={id:49,kind:'wood-generator',x:12,z:14,orientation:0,footprint:'standard',material:'steel',power:newPowerState('wood-generator'),fuel:newBuildingFuel('wood-generator')};
 g.fuel!.ticks=600;w.structures=[g,s];expect(powerDemand(s)).toBe(210);expect(isFlickable(s.kind)).toBe(true);
 for(let i=0;i<35;i++){w.tick++;advancePower(w);}expect(s.power).toMatchObject({on:true,parentId:g.id});expect(powerWatts(s,w)).toBe(-210);expect(validatePower(w,267)).toEqual([]);expect(validatePower(w,266)).not.toEqual([]);
 expect(rainElectricalEligible(w,s)).toBe(true);w.roofing={constructed:[s.z*w.width+s.x],build:[],remove:[],cursor:0};expect(rainElectricalEligible(w,s)).toBe(false);
 s.power!.switchOn=false;expect(powerWatts(s,w)).toBe(0);s.power!.switchOn=true;expect(canBreakdownNow(s)).toBe(true);expect(triggerBreakdown(w,s.id)).toBe(true);expect(powerWatts(s,w)).toBe(0);
});

test('idle electric forge heats4/second while the fueled forge has no heat pusher or work heat',()=>{
 const w=enclosed(),s=bench('electric-smithy');w.structures.push(s);s.power!.on=true;
 const layout=reconcileTemperature(w),room=w.thermal!.regions.find(r=>r.cells.includes(s.z*w.width+s.x))!;room.temperature=20;
 for(let i=0;i<6;i++)applyThermalSources(w,layout);expect(room.temperature).toBeCloseTo(20+4/room.cells.length,12);
 for(const stop of ['switch','power','breakdown'] as const){s.power!.on=true;delete s.power!.switchOn;delete s.breakdown;if(stop==='switch')s.power!.switchOn=false;if(stop==='power')s.power!.on=false;if(stop==='breakdown')s.breakdown={brokenAt:w.tick};const before=room.temperature;applyThermalSources(w,layout);expect(room.temperature).toBe(before);}
 const f=bench('fueled-smithy');f.fuel!.ticks=30000;w.structures=w.structures.filter(x=>x!==s);w.structures.push(f);const before=room.temperature;applyThermalSources(w,layout);applyCookingHeat(w,f);expect(room.temperature).toBe(before);
 const outside=isolated();outside.structures=[s];delete s.breakdown;s.power!.on=true;delete s.power!.switchOn;const open=reconcileTemperature(outside);applyThermalSources(outside,open);expect(outside.thermal).toBeUndefined();
});

test('three-cell physical passage, contact, Medium support and minified20kg preserve every rotation',()=>{
 const w=isolated();for(const kind of kinds){const s=bench(kind);expect(constructionRecipe(s)).toEqual({ingredients:[{item:'steel',quantity:100},...(kind==='electric-smithy'?[{item:'component',quantity:3}]:[])],work:300,coreWork:3000});expect(constructionSkillRequired(kind)).toBe(kind==='fueled-smithy'?4:5);
  for(const orientation of [0,1,2,3] as const){s.orientation=orientation;w.structures=[s];const cells=footprintCells(s);expect(cells).toHaveLength(3);expect(canStandAt(w,cookingSpot(s))).toBe(true);for(const cell of cells)expect(canStandAt(w,cell)).toBe(false);expect(furnitureDelay(w,{x:6,z:6},s)).toBe(5);expect(bridgeSupportsBuilding(s)).toBe(false);}
  const p={building:s,owner:{type:'ground' as const,x:3,z:3}};expect(groupPackedMassGrams258(p,267)).toBe(20000);expect(groupPackedMassGrams258(p,266)).toBeUndefined();
 }
});

test('actual workshop and cleanliness readers agree without a fictitious cabinet bonus',()=>{
 const w=enclosed(),s=bench('fueled-smithy');w.structures.push(s);const point=cookingSpot(s),clean=captureCleanliness(w).room(point)!,quality=captureRoomQuality(w).room(point)!;
 const baseline=structuredClone(w);baseline.structures=baseline.structures.filter(x=>x.id!==s.id);const old=captureCleanliness(baseline).room(point)!;
 expect((clean.cleanliness-old.cleanliness)*clean.cells.size).toBeCloseTo(-3,12);expect(quality.cleanliness).toBe(clean.cleanliness);
 const env=new WorkEnvironmentCache().read(w);expect(env.room(point)!.role).toBe('workshop');expect(env.production(s,point)).toMatchObject({roomRole:1,station:1});
 expect(validSmithyResearchTransport267(w,267)).toBe(true);expect(validSmithyResearchTransport267(w,266)).toBe(false);
});
