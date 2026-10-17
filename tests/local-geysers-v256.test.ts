import {expect,test} from 'vitest';
import {emptyGeographicLandscape256} from '../src/sim/generation';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import {generateLocalGeysers256,geyserCount256,type GeyserGenerationMap256,type GeyserGenerationContext256} from '../src/sim/local-geyser-generation-256';
import {validLocalGeyserState256,validLocalGeyserHeader256,registerGeyserIdentities256} from '../src/sim/local-geyser-save-256';
import {advanceLocalGeysers256,geyserAdjacentCells256,geyserFullCells256,geyserHasRoom256} from '../src/sim/local-geyser-runtime-256';
import {geyserBlocksPlantOrFloor256,type GeyserWorld256} from '../src/sim/local-geyser-state-256';
import {reconcileTemperature,thermalLayout} from '../src/sim/temperature';
import {setSnowDepth,initializeGeographicSnowSurface256} from '../src/sim/snow-surface';
import {mapObjectsAt,mapObjectExists} from '../src/ui/map-object-selection';
import {mapObjectActions} from '../src/ui/map-object-actions';
import {geyserInspection256} from '../src/ui/geyser-inspection-256';
import {geyserParts256} from '../src/render/GeyserLayer256';
/** Declared isolated physical-map fixtures. No generated geographic planet,
 * full-save legality or played acquisition is claimed by these source cases. */
function physical(width=96):GeyserGenerationMap256{return {schemaVersion:256,site:{revision:3},width,height:width,tick:1792,nextId:1,tiles:Array.from({length:width*width},()=>({terrain:'soil-natural'})),structures:[],resources:[],piles:[],packed:[],jobs:[],roofing:{constructed:[],build:[],remove:[],cursor:0}};}
const context=():GeyserGenerationContext256=>({waterCovered:false,biomeFactor:1,mutatorFactors:[],layoutRects:[],usedRects:[],ancientCaskets:[],mapInitializing:true,planEdificeRemoval:()=>{throw Error('No actual edifice requested in this fixture');}});
function phase(tick=1792):GeyserWorld256{
 const w:GeyserWorld256=emptyGeographicLandscape256(42,32,32);w.tick=tick;w.tiles=Array.from({length:1024},()=>({terrain:'soil-natural'}));w.nextId=100;
 w.site={revision:3,tileId:0,mapSeed:42,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','slate'],coastAngle:null,mutatorCode:0};
 w.climate={revision:4,tileId:0,adoptedAt:tick,calendarOrigin:1500,definition:{meanTemperature:0,latitude:45,longitude:0,rainfall:1000,amplitude:20}};
 initializeGeographicSnowSurface256(w);w.geysers={revision:1,atTick:tick,items:[{id:1,x:14,z:14,ticksUntilSpray:1,sprayTicksLeft:0}]};return w;
}
test('count uses width squared, Core rate and product; water skip consumes no stream or old history',()=>{
 expect(geyserCount256(250,1,1,[])).toBe(6);expect(geyserCount256(250,.7,1,[])).toBe(4);expect(geyserCount256(250,1,0,[])).toBe(0);
 const map=physical(),rng=new WorldGenerationRandom(19),before=structuredClone(map),c=context();c.waterCovered=true;
 const result=generateLocalGeysers256(map,c,rng);expect(result.requested).toBe(0);expect(rng.state.counter).toBe(0);expect(map).toEqual({...before,geysers:{revision:1,atTick:1792,items:[]}});expect(()=>generateLocalGeysers256(map,c,rng)).toThrow(/fresh/);
});
test('real scatter is deterministic; all accepted nine-by-nine substrates, spacing and identities are preserved',()=>{
 const a=physical(192),b=physical(192),ra=new WorldGenerationRandom(328),rb=new WorldGenerationRandom(328),pa=generateLocalGeysers256(a,context(),ra),pb=generateLocalGeysers256(b,context(),rb);
 expect(pa).toEqual(pb);expect(a).toEqual(b);expect(pa.requested).toBeGreaterThan(0);expect(pa.placements.length).toBeGreaterThanOrEqual(2);
 expect(a.nextId).toBe(1+pa.placements.length);expect(validLocalGeyserState256(a.geysers,192,192,1792,a.nextId)).toBe(true);
 for(const plan of pa.placements){expect(plan.clearCells).toHaveLength(30);expect(plan.geyser.x).toBeGreaterThanOrEqual(14);expect(plan.geyser.z).toBeGreaterThanOrEqual(14);expect(plan.geyser.ticksUntilSpray).toBe(500);for(const other of pa.placements)if(other!==plan)expect((other.geyser.x-plan.geyser.x)**2+(other.geyser.z-plan.geyser.z)**2).toBeGreaterThan(625);}
});
test('no Heavy or roads never become a dry accepted substitute; failed search retains actual terrain',()=>{
 const map=physical(),before=structuredClone(map.tiles);for(const t of map.tiles)t.terrain='water-shallow';const wet=structuredClone(map.tiles);
 const r=generateLocalGeysers256(map,context(),new WorldGenerationRandom(2));expect(r.exhausted).toBe(true);expect(map.tiles).toEqual(wet);expect(map.geysers!.items).toEqual([]);expect(map.tiles).not.toEqual(before);
 const road=physical();for(const t of road.tiles)t.terrain='packed-dirt';expect(generateLocalGeysers256(road,context(),new WorldGenerationRandom(2)).exhausted).toBe(true);expect(road.geysers!.items).toEqual([]);
});
test('strict old/future headers, own undefined, getters, duplicate real identities and impossible timers refuse',()=>{
 const state={revision:1,atTick:1792,items:[{id:8,x:14,z:14,ticksUntilSpray:500,sprayTicksLeft:0}]};
 const occupied=new Set([8]),copy=new Set(occupied);expect(registerGeyserIdentities256({revision:1,atTick:1792,items:[{id:8,x:14,z:14,ticksUntilSpray:500,sprayTicksLeft:0}]},occupied)).toBe(false);expect(occupied).toEqual(copy);
 expect(validLocalGeyserHeader256({geysers:state},256,32,32,1792,9,true)).toBe(true);
 expect(validLocalGeyserHeader256({geysers:undefined},255,32,32,1792,9,false)).toBe(false);expect(validLocalGeyserHeader256({geysers:state},256,32,32,1792,9,false)).toBe(false);
 const getter={};Object.defineProperty(getter,'geysers',{enumerable:true,get(){throw Error('Guard invoked getter');}});expect(validLocalGeyserHeader256(getter,256,32,32,1792,9,true)).toBe(false);
 expect(validLocalGeyserState256({...state,items:[...state.items,...state.items]},32,32,1792,9)).toBe(false);
 expect(validLocalGeyserState256({...state,items:[{...state.items[0]!,sprayTicksLeft:10}]},32,32,1792,9)).toBe(false);expect(validLocalGeyserState256(state,32,32,1791,9)).toBe(false);expect(validLocalGeyserState256(state,NaN,32,1792,9)).toBe(false);
});
test('nonzero camp phase, same tick and reload retain exact timers/RNG; discontinuity refuses before changes',()=>{
 const w=phase(),layout=reconcileTemperature(w),before=structuredClone(w);advanceLocalGeysers256(w,layout);expect(w).toEqual(before);
 w.tick++;advanceLocalGeysers256(w,layout);expect(w.geysers!.items[0]!.sprayTicksLeft).toBeGreaterThanOrEqual(191);expect(w.geysers!.atTick).toBe(w.tick);
 const restored:GeyserWorld256=structuredClone(w);for(let i=0;i<70;i++){w.tick++;restored.tick++;advanceLocalGeysers256(w,reconcileTemperature(w));advanceLocalGeysers256(restored,reconcileTemperature(restored));}expect(restored).toEqual(w);
 w.tick+=2;const jumped=structuredClone(w);expect(()=>advanceLocalGeysers256(w,thermalLayout(w))).toThrow(/one real/);expect(w).toEqual(jumped);
});
test('spray melts existing snow under roof too, preserves unrelated owners and adds heat to true room volume',()=>{
 const w=phase();let id=10;for(let z=12;z<=17;z++)for(let x=12;x<=17;x++)if(x===12||x===17||z===12||z===17)w.structures.push({id:id++,kind:'wall',x,z,orientation:0,footprint:'standard'});
 w.roofing={constructed:Array.from({length:16},(_,i)=>(13+Math.floor(i/4))*32+13+i%4),build:[],remove:[],cursor:0};
 const layout=reconcileTemperature(w);expect(layout.rooms).toHaveLength(1);const t=w.thermal!.regions[0]!.temperature;
 for(let z=13;z<=16;z++)for(let x=13;x<=16;x++)setSnowDepth(w,z*32+x,.5);
 const unrelated=structuredClone({piles:w.piles,resources:w.resources,structures:w.structures});
 for(let n=0;n<3;n++){w.tick++;advanceLocalGeysers256(w,layout);}
 expect(w.thermal!.regions[0]!.temperature).toBeGreaterThan(t);expect(w.tiles[14*32+14]!.snowDepth).toBeLessThan(.5);expect({piles:w.piles,resources:w.resources,structures:w.structures}).toEqual(unrelated);
});
test('room eligibility distinguishes water/outdoor air from real Full footprint; adjacency has twelve unique cells',()=>{
 const w=phase();w.structures.push({id:10,kind:'nutrient-paste-dispenser',x:14,z:14,orientation:0,footprint:'standard'});w.tiles[0]!.terrain='water-deep';w.tiles[1]={terrain:'soil-natural',collapsedRock:{id:11,terrain:'soil-natural'}};
 const full=geyserFullCells256(w);expect(geyserHasRoom256(w,14*32+14,full)).toBe(false);expect(geyserHasRoom256(w,0,full)).toBe(true);expect(geyserHasRoom256(w,1,full)).toBe(false);
 const border=geyserAdjacentCells256(32,32,{x:14,z:14});expect(border).toHaveLength(12);expect(new Set(border).size).toBe(12);
 w.geysers!.items[0]!.ticksUntilSpray=0;w.geysers!.items[0]!.sprayTicksLeft=100;w.tick++;advanceLocalGeysers256(w,reconcileTemperature(w));expect(w.thermal).toBeUndefined();
});
test('read-only natural selection uses real two-by-two identity, reveals no fogged owner, has no fake claim/build action',()=>{
 const w=phase();expect(mapObjectsAt(w,{x:15,z:15})).toContainEqual({kind:'geyser',id:1});expect(mapObjectActions(w,{kind:'geyser',id:1})).toEqual([]);expect(geyserInspection256(w,1)!.description).toContain('Traversable');
 expect(geyserBlocksPlantOrFloor256(w,{x:15,z:15})).toBe(true);const initial=structuredClone(w.geysers);expect(geyserParts256(w.geysers!.items)).toHaveLength(9);expect(w.geysers).toEqual(initial);
 w.exploration={revision:1};for(const i of [14*32+14,14*32+15,15*32+14,15*32+15])w.tiles[i]!.fogged=true;
 expect(mapObjectExists(w,{kind:'geyser',id:1})).toBe(false);expect(geyserInspection256(w,1)).toBeUndefined();delete w.tiles[15*32+15]!.fogged;expect(mapObjectExists(w,{kind:'geyser',id:1})).toBe(true);
});
