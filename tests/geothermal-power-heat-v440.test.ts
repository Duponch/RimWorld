import {expect,test} from 'vitest';
import {emptyGeographicLandscape256} from '../src/sim/generation';
import {newPowerState,isFlickable,powerWatts,powerPotential} from '../src/sim/power-rules';
import {isPowerTransmitter} from '../src/sim/power-grid';
import {advancePower,reconcilePower} from '../src/sim/power';
import {PowerTopologyCache} from '../src/sim/power-topology';
import {validatePower} from '../src/sim/power-save';
import {applyEmpEffect,advanceEmp} from '../src/sim/emp-effects';
import {canBreakdownNow,triggerBreakdown,advanceBreakdownFix} from '../src/sim/breakdowns';
import {createGeothermalState264,validGeothermalState264,validGeothermalWorld264} from '../src/sim/geothermal-state-264';
import {advanceGeothermalGenerators264,geothermalAdjacentCells264} from '../src/sim/geothermal-runtime-264';
import {advanceLocalGeysers256,geyserFullCells256} from '../src/sim/local-geyser-runtime-256';
import {reconcileTemperature} from '../src/sim/temperature';
import {initializeGeographicSnowSurface256,setSnowDepth,snowDepthAt} from '../src/sim/snow-surface';
import {deconstructionCamp} from './scenarios/deconstruction';
import type {Structure,World} from '../src/sim/types';

/** Prepared isolated power/thermal owners, not a played acquisition or a full
 * save-legality fixture. Root's construction/save cases cover those borders. */
function prepared(room=false):{w:World;g:Structure} {
 const w=emptyGeographicLandscape256(42,32,32);w.tick=100;w.nextId=100;
 w.tiles=Array.from({length:1024},()=>({terrain:'soil-natural'}));
 w.site={revision:3,tileId:0,mapSeed:42,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','slate'],coastAngle:null,mutatorCode:0};
 w.climate={revision:4,tileId:0,adoptedAt:w.tick,calendarOrigin:1500,definition:{meanTemperature:0,latitude:45,longitude:0,rainfall:1000,amplitude:20}};
 initializeGeographicSnowSurface256(w);
 w.geysers={revision:1,atTick:w.tick,items:[{id:1,x:14,z:14,ticksUntilSpray:1,sprayTicksLeft:0}]};
 const g:Structure={id:10,kind:'geothermal-generator',x:12,z:12,orientation:0,footprint:'standard',material:'steel',power:newPowerState('geothermal-generator')};
 w.structures.push(g);g.geothermal=createGeothermalState264(w,g);
 if(room){
  let id=11;for(let z=10;z<=19;z++)for(let x=10;x<=19;x++)if(x===10||x===19||z===10||z===19)w.structures.push({id:id++,kind:'wall',x,z,orientation:0,footprint:'standard'});
  w.roofing={constructed:Array.from({length:64},(_,i)=>(11+Math.floor(i/8))*32+11+i%8),build:[],remove:[],cursor:0};
 }
 reconcileTemperature(w);return {w,g};
}
function stepSprayers(w:World,n=1):void {
 for(let i=0;i<n;i++){w.tick++;const layout=reconcileTemperature(w);advanceLocalGeysers256(w,layout);advanceGeothermalGenerators264(w,layout);}
}
function powerPart(w:World,kind:'battery'|'standing-lamp',x:number,z:number):Structure {
 const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'steel',power:newPowerState(kind)};
 if(kind==='battery')s.battery={stored:100_000};w.structures.push(s);return s;
}

test('constant 3600W is independent of night, roof and spray; no fuel or personal flick is introduced',()=>{
 const {w,g}=prepared();expect(isFlickable(g.kind)).toBe(false);expect(isPowerTransmitter(g.kind)).toBe(true);expect(g.fuel).toBeUndefined();
 for(const tick of [0,2000,4000,6000]){w.tick=tick;expect(powerWatts(g,w)).toBe(3600);}
 w.roofing={constructed:Array.from({length:36},(_,i)=>(12+Math.floor(i/6))*32+12+i%6),build:[],remove:[],cursor:0};
 g.geothermal!.ticksUntilSpray=0;g.geothermal!.sprayTicksLeft=300;expect(powerWatts(g,w)).toBe(3600);
 expect(validatePower(w,264)).toEqual([]);expect(validatePower(w,263).length).toBeGreaterThan(0);
 g.power!.switchOn=true;expect(validatePower(w,264).length).toBeGreaterThan(0);
});

test('full footprint transmits to storage and a real consumer; breakdown and EMP retain the same network',()=>{
 const {w,g}=prepared(),store=powerPart(w,'battery',18,12),lamp=powerPart(w,'standing-lamp',20,12);
 const cache=new PowerTopologyCache(),topology=cache.read(w);expect(topology.groups).toContainEqual([g.id,store.id]);
 reconcilePower(w);expect(lamp.power!.parentId).not.toBeNull();lamp.power!.on=true;
 const parent=lamp.power!.parentId,before=store.battery!.stored;w.tick++;advancePower(w);expect(store.battery!.stored).toBe(before+10*(3600-30)-100);
 expect(applyEmpEffect(w,g,50,w.tick*10)).toBe(true);expect(powerWatts(g,w)).toBe(0);expect(g.power!.on).toBe(true);
 expect(cache.read(w)).toBe(topology);expect(lamp.power!.parentId).toBe(parent);
 for(let i=0;i<150;i++){w.tick++;advancePower(w);advanceEmp(w);}
 expect(powerWatts(g,w)).toBe(3600);expect(g.emp).toBeUndefined();expect(lamp.power!.parentId).toBe(parent);
 expect(canBreakdownNow(g)).toBe(true);g.power!.on=false;expect(canBreakdownNow(g)).toBe(false);g.power!.on=true;
 expect(triggerBreakdown(w,g.id)).toBe(true);expect(powerWatts(g,w)).toBe(0);expect(powerPotential(g,w)).toBe(3600);expect(cache.read(w)).toBe(topology);
});

test('solar electrical condition sheds consumers and forbids charging while retaining generator production',()=>{
 const {w,g}=prepared(),store=powerPart(w,'battery',18,12),lamp=powerPart(w,'standing-lamp',20,12);
 reconcilePower(w);lamp.power!.on=true;
 w.worldIncidents={profile:'cassandra-world-v1',adoptedAt:0,rng:202,nextCheck:90100,checks:0,opportunities:1,flares:1,lastStart:100,lastEndCore:10000,active:{start:100,endCore:10000}};
 const energy=store.battery!.stored;for(let i=0;i<2;i++){w.tick++;advancePower(w);}
 expect(lamp.power!.on).toBe(false);expect(store.battery!.stored).toBe(energy-200);expect(g.power!.on).toBe(true);expect(powerWatts(g,w)).toBe(3600);
});

test('prepared contact repair waits all 1000 Core ticks and spends one actual delivered component',()=>{
 const {w,g}=prepared(),pawn=deconstructionCamp().pawns[0]!;pawn.id=2;pawn.x=11;pawn.z=12;pawn.path=[];pawn.skills.construction.level=8;w.pawns=[pawn];w.home=[12*32+12];
 expect(triggerBreakdown(w,g.id)).toBe(true);const job=w.jobs.find(j=>j.fixBreakdown?.structureId===g.id)!;expect(job).toBeDefined();
 job.reservedBy=pawn.id;pawn.jobId=job.id;
 const component={id:w.nextId++,kind:'component' as const,item:'component' as const,quantity:1,owner:{type:'job' as const,jobId:job.id}};w.piles.push(component);
 for(let i=0;i<99;i++)expect(advanceBreakdownFix(w,pawn,job)).toBeNull();
 expect(g.breakdown).toBeDefined();expect(w.piles).toContain(component);expect(advanceBreakdownFix(w,pawn,job)).toBe('success');
 expect(g.breakdown).toBeUndefined();expect(w.piles).not.toContain(component);expect(w.structures).toContain(g);
 for(let i=0;i<20;i++){w.tick++;advancePower(w);}expect(powerWatts(g,w)).toBe(3600);
});

test('500-Core first wait freezes the same natural phase and suppresses its snow callback until removal',()=>{
 const {w,g}=prepared(),snowCells=[14*32+11,15*32+11,14*32+18,15*32+18];for(const cell of snowCells)setSnowDepth(w,cell,.5);const natural=structuredClone(w.geysers!.items[0]);
 stepSprayers(w,49);expect(g.geothermal).toMatchObject({ticksUntilSpray:10,sprayTicksLeft:0});
 stepSprayers(w);expect(g.geothermal!.sprayTicksLeft).toBeGreaterThanOrEqual(200);expect(g.geothermal!.sprayTicksLeft).toBeLessThanOrEqual(500);
 expect(w.geysers!.items[0]).toEqual(natural);expect(snowCells.map(cell=>snowDepthAt(w,cell))).toEqual([.5,.5,.5,.5]);
 const sameOwner=w.geysers!.items[0];w.structures=w.structures.filter(s=>s!==g);stepSprayers(w);
 expect(w.geysers!.items[0]).toBe(sameOwner);expect(sameOwner!.id).toBe(natural!.id);expect(sameOwner!.sprayTicksLeft).toBeGreaterThan(0);expect(snowCells.reduce((sum,cell)=>sum+snowDepthAt(w,cell),0)).toBeLessThan(2);
});

test.each(['ordinary','off','broken','emp'] as const)('actual 6x6 sprayer heats adjacent room volume exactly once per20Core while %s',mode=>{
 const {w,g}=prepared(true),room=w.thermal!.regions[0]!;expect(room.cells).toHaveLength(28);
 const adjacent=geothermalAdjacentCells264(32,32,g);expect(adjacent).toHaveLength(28);expect(new Set(adjacent).size).toBe(28);
 expect(adjacent.every(c=>room.cells.includes(c))).toBe(true);expect(geyserFullCells256(w).has(14*32+14)).toBe(true);
 if(mode==='off')g.power!.on=false;if(mode==='broken')g.breakdown={brokenAt:w.tick};if(mode==='emp')expect(applyEmpEffect(w,g,50,w.tick*10)).toBe(true);
 g.geothermal!.ticksUntilSpray=0;g.geothermal!.sprayTicksLeft=100;
 const before=room.temperature,natural=structuredClone(w.geysers!.items[0]);stepSprayers(w,2);
 expect(room.temperature).toBe(Math.fround(before+Math.fround(40/28)));expect(g.geothermal!.sprayTicksLeft).toBe(80);expect(w.geysers!.items[0]).toEqual(natural);
});

test('no fake outdoor room is created; interval continuation is exact and discontinuity rejects atomically',()=>{
 const {w,g}=prepared();g.geothermal!.ticksUntilSpray=0;g.geothermal!.sprayTicksLeft=30;const peer:World=JSON.parse(JSON.stringify(w));
 stepSprayers(w,230);stepSprayers(peer,230);expect(peer).toEqual(w);expect(w.thermal).toBeUndefined();
 const phase=g.geothermal!,snapshot=structuredClone(w),layout=reconcileTemperature(w);advanceGeothermalGenerators264(w,layout);expect(w).toEqual(snapshot);
 w.tick+=2;const jumped=structuredClone(w);expect(()=>advanceGeothermalGenerators264(w,layout)).toThrow(/one real/);expect(w).toEqual(jumped);expect(phase.atTick).toBe(snapshot.tick);
});

test('a completed spray draws the next 500–2000-Core wait without changing a stopped power owner',()=>{
 const {w,g}=prepared();g.power!.on=false;g.geothermal!.ticksUntilSpray=0;g.geothermal!.sprayTicksLeft=10;
 stepSprayers(w);expect(g.geothermal!.sprayTicksLeft).toBe(0);expect(g.geothermal!.ticksUntilSpray).toBeGreaterThanOrEqual(500);expect(g.geothermal!.ticksUntilSpray).toBeLessThanOrEqual(2000);expect(g.power!.on).toBe(false);
});

test('strict prospective phase, exact geyser identity, fixed ownership and old-schema content are guarded',()=>{
 const {w,g}=prepared(),phase=g.geothermal!;expect(validGeothermalState264(phase,w.tick,w.nextId)).toBe(true);expect(validGeothermalWorld264(w,264)).toBe(true);expect(validGeothermalWorld264(w,263)).toBe(false);
 for(const changed of [{...phase,extra:1},{...phase,atTick:w.tick-1},{...phase,geyserId:0},{...phase,ticksUntilSpray:0},{...phase,sprayTicksLeft:10}])expect(validGeothermalState264(changed,w.tick,w.nextId)).toBe(false);
 const getter={...phase};Object.defineProperty(getter,'ticksUntilSpray',{enumerable:true,get(){throw Error('Guard invoked getter');}});expect(validGeothermalState264(getter,w.tick,w.nextId)).toBe(false);
 g.x++;expect(validGeothermalWorld264(w,264)).toBe(false);g.x--;g.geothermal!.geyserId=2;expect(validGeothermalWorld264(w,264)).toBe(false);g.geothermal!.geyserId=1;
 w.structures.push({...g,id:11,geothermal:{...phase}});expect(validGeothermalWorld264(w,264)).toBe(false);w.structures.pop();
 w.structures=[];w.packed=[{building:g,owner:{type:'ground',x:12,z:12}}];expect(validGeothermalWorld264(w,264)).toBe(false);
});
