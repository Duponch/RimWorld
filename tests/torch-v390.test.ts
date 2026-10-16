import {expect,test} from 'vitest';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {burnFuel,newBuildingFuel,fuelCapacity,fuelLimit,FUEL_UNIT_TICKS} from '../src/sim/fuel.ts';
import {constructionRecipe,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {structureMaxHp,structureFlammability,structureLeavesResources} from '../src/sim/thing-damage-rules.ts';
import {STRUCTURE_SHOT_FILL} from '../src/sim/combat-content.ts';
import {BUILDING_SUPPORT} from '../src/sim/bridge-rules.ts';
import {FURNITURE_TRAVEL} from '../src/sim/furniture-travel.ts';
import {minifiable} from '../src/sim/furniture-rules.ts';
import {canFlickDevice} from '../src/sim/power-flick.ts';
import {lightSources} from '../src/sim/light-sources.ts';
import {LightEnvironmentCache} from '../src/sim/light-environment.ts';
import {applyThermalSources} from '../src/sim/thermal-sources.ts';
import {reconcileTemperature} from '../src/sim/temperature.ts';
import {newWeatherState,weatherRainRate} from '../src/sim/weather.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {torchWorkshopV390} from './scenarios/torch-v390.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import type {Command,Structure,World} from '../src/sim/types.ts';
const accept=(w:World,c:Command)=>expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});
const until=(w:World,done:()=>boolean,limit=500)=>{for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),`tick ${w.tick}`).toBe(true);};
const advanceBurn=(w:World,n:number)=>{for(let i=0;i<n;i++){w.tick++;burnFuel(w);}};
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
function lamp(){const f=torchWorkshopV390(),w=f.world,s=w.structures.find(v=>v.id===f.preparedTorchId)!;s.fuel=newBuildingFuel('torch-lamp');return {...f,w,s,p:w.pawns[0]!};}

test('fixed wood recipe, Light support, 75 HP and no package, switch or resource salvage',()=>{
 const {w,s}=lamp();expect(constructionRecipe(s)).toEqual({ingredients:[{item:'wood',quantity:20}],work:10,coreWork:100});
 expect(fuelLimit(s.kind)).toBe(12000);expect(s.fuel).toEqual({ticks:12000,burned:0,autoRefuel:true,burnRemainder:0});
 expect(structureMaxHp(s)).toBe(75);expect(structureFlammability(s)).toBe(0);expect(structureLeavesResources(s)).toBe(false);
 expect(BUILDING_SUPPORT[s.kind]).toBe('Light');expect(STRUCTURE_SHOT_FILL[s.kind]).toBe(.15);expect(FURNITURE_TRAVEL[s.kind]).toEqual({delay:1.4,stand:false,repeat:false});
 expect(minifiable(s.kind)).toBe(false);expect(canFlickDevice(s)).toBe(false);
 expect(validConstructionMaterial(s.kind,'wood',248)).toBe(false);expect(validConstructionMaterial(s.kind,'wood',249)).toBe(true);expect(validConstructionMaterial(s.kind,'steel',249)).toBe(false);
 for(const c of [{type:'power-flick',structureId:s.id,on:false},{type:'designate',kind:'uninstall',x:s.x,z:s.z},{type:'designate',kind:'torch-lamp',x:10,z:10,material:'steel'},{type:'designate',kind:'torch-lamp',x:10,z:10,orientation:1}] as Command[]){const before=serializeWorld(w);expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
});

test('one fifth dry and nineteen fifths wet preserve the same remainder across roof/rain boundaries and empty reserve has no debt',()=>{
 const {w,s}=lamp();advanceBurn(w,4);expect(s.fuel).toMatchObject({ticks:12000,burned:0,burnRemainder:4});
 advanceBurn(w,1);expect(s.fuel).toMatchObject({ticks:11999,burned:1,burnRemainder:0});
 w.weather={...newWeatherState(w.seed,w.tick),current:'rain',previous:'clear',ageCore:1600};expect(weatherRainRate(w)).toBe(.4);advanceBurn(w,1);expect(s.fuel!.burnRemainder).toBe(1);
 w.weather.ageCore=1601;advanceBurn(w,1);expect(s.fuel).toMatchObject({burned:5,burnRemainder:0});
 w.weather={...newWeatherState(w.seed,w.tick),current:'snow-hard',previous:'snow-hard',ageCore:4000};expect(weatherRainRate(w)).toBe(1);
 w.roofing={constructed:[s.z*w.width+s.x],build:[],remove:[],cursor:0};advanceBurn(w,3);expect(s.fuel!.burnRemainder).toBe(3);
 w.roofing!.constructed=[];advanceBurn(w,1);expect(s.fuel).toMatchObject({burned:9,burnRemainder:2});
 s.fuel!.ticks=1;w.tick++;expect(burnFuel(w)).toBe(true);expect(s.fuel).toMatchObject({ticks:0,burned:10,burnRemainder:0});advanceBurn(w,10);expect(s.fuel!.burnRemainder).toBe(0);
 // Recharge changes only the integral reserve; no previous overdraw survives.
 s.fuel!.ticks=600;w.weather.current=w.weather.previous='clear';advanceBurn(w,4);expect(s.fuel).toMatchObject({ticks:600,burnRemainder:4});
 const dry=lamp();advanceBurn(dry.w,6000);expect(dry.s.fuel).toMatchObject({ticks:10800,burned:1200,burnRemainder:0});
 const wet=lamp();wet.w.weather={...newWeatherState(wet.w.seed,wet.w.tick),current:'rain',previous:'rain',ageCore:4000};advanceBurn(wet.w,3000);expect(wet.s.fuel).toMatchObject({ticks:600,burned:11400,burnRemainder:0});
});

test('construction takes the actual twenty wood, resumes an active frame and initializes its paid full reserve once',()=>{
 const f=torchWorkshopV390(),w=f.world;w.structures=[];
 accept(w,{type:'designate',kind:'torch-lamp',...f.torchCell});
 until(w,()=>w.jobs.some(j=>j.kind==='torch-lamp'&&j.construction==='frame'&&j.progress>0));
 const job=w.jobs.find(j=>j.kind==='torch-lamp')!;expect(job.material).toBe('wood');expect(w.piles.filter(p=>p.owner.type==='job'&&p.owner.jobId===job.id).reduce((n,p)=>n+p.quantity,0)).toBe(20);
 const copy=deserializeWorld(serializeWorld(w)),at=w.tick;until(w,()=>w.structures.some(s=>s.kind==='torch-lamp'));stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 const s=w.structures.find(s=>s.kind==='torch-lamp')!;expect(s.fuel!.ticks+s.fuel!.burned).toBe(12000);expect(wood(w)).toBe(10);expect(w.piles.some(p=>p.owner.type==='job'&&p.owner.jobId===job.id)).toBe(false);expect(s.power).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('forced real refill keeps reserve empty through pickup/travel/contact work, consumes held wood once and resumes exactly',()=>{
 const {w,s,p}=lamp();w.piles=w.piles.filter(v=>v.owner.type!=='ground'||v.owner.x===15);s.fuel={...s.fuel!,ticks:1,burnRemainder:4,autoRefuel:false};p.priorities.haul=1;p.priorities.build=0;
 stepWorld(w);expect(s.fuel!.ticks).toBe(0);expect(lightSources(w).some(v=>v.cell===s.z*w.width+s.x)).toBe(false);
 expect(fuelCapacity(w,s.id,undefined,true)).toBe(20);accept(w,{type:'order-haul',pawnId:p.id,target:{type:'fuel',structureId:s.id},queue:false});
 until(w,()=>p.haul?.phase==='deliver');const carryId=p.haul!.carryPileId!;expect(w.piles.find(v=>v.id===carryId)).toMatchObject({item:'wood',quantity:10,owner:{type:'pawn',pawnId:p.id}});expect(s.fuel!.ticks).toBe(0);
 until(w,()=>!!p.haul?.serviceProgress);expect(s.fuel!.ticks).toBe(0);expect(Math.abs(p.x-s.x)+Math.abs(p.z-s.z)).toBeLessThanOrEqual(1);
 const copy=deserializeWorld(serializeWorld(w)),at=w.tick;until(w,()=>!p.haul&&s.fuel!.ticks>0);stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 expect(s.fuel!.ticks+s.fuel!.burned).toBe(6001);expect(s.fuel!.autoRefuel).toBe(false);expect(w.piles.some(v=>v.id===carryId)).toBe(false);expect(wood(w)).toBe(0);expect(validateWorld(w)).toEqual([]);
 // Whole-item capacity never eats a fractional overflow.
 s.fuel!.ticks=12000-599;expect(fuelCapacity(w,s.id,undefined,true)).toBe(0);
});

test('same-tick light adoption and heat stop at empty, heat clamps at 23 rather than replacing a winter heater',()=>{
 const {w,s}=lamp();const cache=new LightEnvironmentCache(),cell={x:16,z:7};
 w.roofing={constructed:[cell.z*w.width+cell.x],build:[],remove:[],cursor:0};expect(lightSources(w)).toContainEqual({cell:s.z*w.width+s.x,radius:10,red:184,green:136,blue:83});
 const lit=cache.read(w).speedAt(cell);s.fuel!.ticks=0;s.fuel!.burnRemainder=0;expect(cache.read(w).speedAt(cell)).toBeLessThan(lit);
 // An explicit one-room enclosure; only thermal source is stepped, no ambient leakage hidden in this oracle.
 w.structures=[s];for(let z=5;z<=9;z++)for(let x=15;x<=19;x++)if(x===15||x===19||z===5||z===9)fixtureBuilding(w,'wall',x,z);
 w.roofing!.constructed=[];for(let z=6;z<=8;z++)for(let x=16;x<=18;x++)w.roofing!.constructed.push(z*w.width+x);
 const layout=reconcileTemperature(w);expect(w.thermal!.regions).toHaveLength(1);const room=w.thermal!.regions[0]!;room.temperature=5;s.fuel!.ticks=600;
 applyThermalSources(w,layout);expect(room.temperature).toBeCloseTo(5+3.5/6/room.cells.length);
 room.temperature=22.99;applyThermalSources(w,layout);expect(room.temperature).toBe(23);room.temperature=25;applyThermalSources(w,layout);expect(room.temperature).toBe(25);
 s.fuel!.ticks=0;room.temperature=5;applyThermalSources(w,layout);expect(room.temperature).toBe(5);
});

test('deconstruction and fatal damage remove full or empty torches without material or remaining fuel restitution',()=>{
 for(const fuel of [0,1,12000]){
  const {w,s}=lamp();s.fuel!.ticks=fuel;s.fuel!.autoRefuel=false;const before=wood(w);accept(w,{type:'designate',kind:'deconstruct',x:s.x,z:s.z});
  until(w,()=>!w.structures.some(v=>v.id===s.id));expect(wood(w)).toBe(before);expect(w.deconstructed.fuelTicks).toBe(fuel);expect(w.deconstructed.lostWood).toBe(20);expect(validateWorld(w)).toEqual([]);
  const fatal=lamp();fatal.s.fuel!.ticks=fuel;const quantity=wood(fatal.w);expect(damageStructure(fatal.w,fatal.s,75,'bullet')).toBe(true);expect(wood(fatal.w)).toBe(quantity);expect(fatal.w.destroyed!.lost.wood).toBe(20);expect(lightSources(fatal.w)).toEqual([]);expect(validateWorld(fatal.w)).toEqual([]);
 }
});
