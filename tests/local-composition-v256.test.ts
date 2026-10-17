import {expect,test} from 'vitest';
import {composeLocalSurface256,type LocalCompositionInputs256} from '../src/sim/local-composition-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {localSurfaceMapSeed,surfaceNaturalRocks,type WorldSiteGeography,localGenerationStepSeed} from '../src/sim/world-site-geography.ts';
import {LOCAL_BIOME_RULES_256} from '../src/sim/local-biome-rules-v256.ts';
import {localCaveInitPlan256,generateLocalCaves256} from '../src/sim/local-caves-256.ts';
import {localRiverNoisePlan256} from '../src/sim/local-river-256.ts';
import {localCoastPlan256,createLocalCoastField256,coastalElevation256} from '../src/sim/local-coast-256.ts';
import {generateLocalSurfaceFields256} from '../src/sim/local-surface-fields-256.ts';
import {localMountainPlan256,createLocalMountainField256,mountainElevation256} from '../src/sim/local-mountain-256.ts';
// Prepared scalar geography, not an observed Core map or gameplay checkpoint.
function prepared(code=0,width=32,height=32):LocalCompositionInputs256 {
 const tileId=123,mapSeed=localSurfaceMapSeed(456,tileId),random=new WorldGenerationRandom(mapSeed);
 for(let i=0;i<7;i++)random.integerValue(); // explicit FIXTURE frontier, NOT a Core component draw-count claim
 const site:WorldSiteGeography={tileId,mapSeed,biome:'temperate-forest',hilliness:code&1?'mountainous':'flat',latitude:30,longitude:20,elevation:100,meanTemperature:12,rainfall:800,swampiness:0,waterCovered:false,hasBedrock:true,naturalRocks:surfaceNaturalRocks(tileId),coastAngle:code&8?90:null,rivers:code&4?[{neighbour:124,river:'river',width:6,riverDistance:10},{neighbour:122,river:'river',width:6,riverDistance:0}]:[],riverHeading:code&4?90:null,roads:[]};
 return {width,height,site,rules:LOCAL_BIOME_RULES_256['temperate-forest'],mutatorCode:code,lakeCoastAngle:null,init:{random,provenance:{revision:1,mapSeed,...random.state,source:'prepared fixture: seven explicit draws; unqualified Core Init'}},preventPatches:true};
}
test('actual dimensions and source objects remain literal; replay is exact with visible unresolved work',()=>{
 const a=prepared(0,40,32),before=structuredClone({site:a.site,rules:a.rules,provenance:a.init.provenance}),result=composeLocalSurface256(a),again=composeLocalSurface256(prepared(0,40,32));
 expect(result).toEqual(again);expect(result.elevation.length).toBe(1280);expect(result.caves.every(v=>v===0)).toBe(true);expect(result.random.initEnd.counter).toBe(7);
 expect({site:a.site,rules:a.rules,provenance:a.init.provenance}).toEqual(before);expect(result.frontier).toBe('post-terrain-before-flow-and-ore');expect(result.unresolved.oreScattering).toBe(true);
});

test('initial weather consumes the real outer post-mutator frontier without altering independent terrain steps',()=>{
 const bare=composeLocalSurface256(prepared(12,48,48));
 const input=prepared(12,48,48),result=composeLocalSurface256({...input,initialWeather:{tick:1234,runtimeSeed:91,gameInitDataPresent:false,outsideTemperature:15,rainfall:800,daysPassedSinceSettle:0,tutorial:false,forcedWeather:null,largeFire:false,preventRain:false,rainDisabledUntilCore:0,activeConditionCount:0}});
 expect(result.initialWeather).toBeDefined();expect(result.initialWeather!.outerAfterWeather.counter).toBe(result.random.initEnd.counter+4);
 expect(input.init.random.state).toEqual(result.initialWeather!.outerAfterWeather);
 expect(result.random).toEqual(bare.random);expect(result.terrain).toEqual(bare.terrain);expect(result.rocks).toEqual(bare.rocks);expect(result.elevation).toEqual(bare.elevation);
 expect(result.initialWeather!.weather.originTick).toBe(1234);expect(result.initialWeather!.weather.lastCoreTick).toBe(12340);
});

test('new-game Clear is a real Init call with no weather draw after the actual mutators',()=>{
 const input=prepared(15,48,48),result=composeLocalSurface256({...input,initialWeather:{tick:0,runtimeSeed:91,gameInitDataPresent:true,outsideTemperature:-90,rainfall:800,daysPassedSinceSettle:0,tutorial:false,forcedWeather:null,largeFire:false,preventRain:false,rainDisabledUntilCore:0,activeConditionCount:0}});
 expect(result.initialWeather!.outerAfterWeather).toEqual(result.random.initEnd);expect(input.init.random.state).toEqual(result.random.initEnd);
 expect(result.initialWeather!.weather).toMatchObject({current:'clear',previous:'clear',ageCore:0,durationCore:10000});
});
test('all actual Init plans share the supplied nonzero frontier before any independent step starts',()=>{
 const input=prepared(15,96,96),reference=new WorldGenerationRandom(input.site.mapSeed);for(let i=0;i<7;i++)reference.integerValue();
 const caves=localCaveInitPlan256(reference),river=localRiverNoisePlan256(96,96,reference),coast=localCoastPlan256(96,96,90,reference),result=composeLocalSurface256(input);
 expect(result.plans.init).toEqual({caves,river,coast});expect(result.random.initEnd).toEqual(reference.state);expect(reference.state.counter).toBe(17);
 // Two cave-terrain seeds precede the river-node seed in the SAME later stream.
 const later=new WorldGenerationRandom(localGenerationStepSeed(input.site.mapSeed,562343345,0));const waterSeed=later.integerValue(),gravelSeed=later.integerValue(),nodeSeed=later.integerValue();
 expect(result.plans.caveTerrain).toEqual({revision:1,waterSeed,gravelSeed});expect(result.plans.river!.seed).toBe(nodeSeed);expect(result.random.postTerrain).toEqual(later.state);
 const coastField=createLocalCoastField256(coast);for(let z=0;z<96;z++)for(let x=0;x<96;x++)if(coastField(x,z)<Math.fround(.4))expect(result.terrain[z*96+x]).toBe('ocean-deep');expect(result.unresolved.riverFlowLookup).toBe(true);
});
test('real mountain then cave carve share PostElevation; subsequent coast does not retroactively dry caves',()=>{
 const input=prepared(11,96,96),expected=generateLocalSurfaceFields256({mapSeed:input.site.mapSeed,hilliness:input.site.hilliness,waterCovered:false},96,96),init=new WorldGenerationRandom(input.site.mapSeed);for(let i=0;i<7;i++)init.integerValue();
 const cavePlan=localCaveInitPlan256(init),coastPlan=localCoastPlan256(96,96,90,init),stream=new WorldGenerationRandom(localGenerationStepSeed(input.site.mapSeed,1239847543,0)),mountainPlan=localMountainPlan256(96,96,90,null,stream),mountain=createLocalMountainField256(mountainPlan);
 for(let z=0;z<96;z++)for(let x=0;x<96;x++){const cell=z*96+x;expected.elevation[cell]=mountainElevation256(expected.elevation[cell]!,mountain(x,z),false);}
 const caves=generateLocalCaves256({width:96,height:96,elevation:expected.elevation,plan:cavePlan},stream),coast=createLocalCoastField256(coastPlan);
 for(let z=0;z<96;z++)for(let x=0;x<96;x++){const cell=z*96+x;expected.elevation[cell]=coastalElevation256(expected.elevation[cell]!,coast(x,z));}
 const actual=composeLocalSurface256(input);expect(actual.caves).toEqual(caves);expect(actual.elevation).toEqual(expected.elevation);expect(actual.random.postElevation).toEqual(stream.state);expect(actual.fertility).toEqual(expected.fertility);
});
test('missing or mismatched Init/geography is refused before consuming that caller stream',()=>{
 const a=prepared(0),counter=a.init.random.state.counter;
 expect(()=>composeLocalSurface256({...a,init:{...a.init,provenance:{...a.init.provenance,counter:0}}})).toThrow();expect(a.init.random.state.counter).toBe(counter);
 expect(()=>composeLocalSurface256({...a,width:7})).toThrow();expect(a.init.random.state.counter).toBe(counter);
 expect(()=>composeLocalSurface256({...a,mutatorCode:16})).toThrow();expect(a.init.random.state.counter).toBe(counter);
 expect(()=>composeLocalSurface256({...a,mutatorCode:8})).toThrow();expect(a.init.random.state.counter).toBe(counter);
});
test('real definition context scatters minerals in RocksFromGrid before terrain and preserves its independent step stream',()=>{
 const input=prepared(1,96,96),result=composeLocalSurface256({...input,definitionContext:{isStartingMap:true,mapInitializing:true,tutorial:false,usedRectCells:new Set()}});
 expect(result.deposits).toBeDefined();expect(result.deposits!.requested).toBeGreaterThan(0);expect(result.deposits!.placements.length).toBeGreaterThan(0);
 expect(result.random.ores!.seed).toBe(localGenerationStepSeed(input.site.mapSeed,1182952823,0)>>>0);expect(result.random.ores!.counter).toBeGreaterThan(0);
 for(let cell=0;cell<96*96;cell++)if(result.deposits!.ores[cell]!==null)expect(result.rocks.edifices[cell]).toBe(1);
 expect(result.unresolved.oreScattering).toBe(false);expect(result.frontier).toBe('post-terrain-before-flow-and-definition-steps');
 const without=composeLocalSurface256(prepared(1,96,96));expect(result.random.postElevation).toEqual(without.random.postElevation);expect(result.random.initEnd).toEqual(without.random.initEnd);
});
