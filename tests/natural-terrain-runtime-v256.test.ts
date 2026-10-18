import {expect,test} from 'vitest';
import {adoptSiteClimate} from '../src/sim/site-climate';
import {crashlandedProfile} from '../src/sim/game-profile';
import {enableCassandraRaids} from '../src/sim/cassandra-raids';
import {adoptFluIncidents} from '../src/sim/flu-incidents';
import {adoptMiscIncidents} from '../src/sim/cassandra-misc';
import {resolveSite} from '../src/sim/site';
import {initializeWildFlora} from '../src/sim/wild-flora';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {terrainAvailable256,terrainSupportsAffordance256,terrainSupportsFloor256,terrainBridgeable256,terrainExtinguishesFire256,terrainHoldsSnow256,terrainAcceptsFilth256,terrainExtraDeterioration256,naturalPlantSubstrate256} from '../src/sim/natural-terrain-runtime-256.ts';
import {NATURAL_TERRAIN_BINDINGS_256} from '../src/sim/local-terrain-definitions-256.ts';
import {bridgeSupportsBuilding,validBridgeTile,validateBridgeTransport} from '../src/sim/bridge-rules.ts';
import {validMarshTile,validateMarshTransport,marshSupportsFootprint} from '../src/sim/marsh.ts';
import {removeBridge,finishBridge} from '../src/sim/bridge.ts';
import {canDesignateFloor} from '../src/sim/flooring.ts';
import {createWildPlantResource256} from '../src/sim/wild-plant-acquisition-v256.ts';
import {plantSubstrateAllowed256} from '../src/sim/plant-substrate-256.ts';
import {clearingDuration,plantWorkGrowthFactor256} from '../src/sim/gathering.ts';
import {constructionFinalWipesPlants,plantHarvestWorkCore} from '../src/sim/construction-plants.ts';
import {initializeSnowSurface,setSnowDepth} from '../src/sim/snow-surface.ts';
import {addFilth} from '../src/sim/filth.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {bridgeWorkshopV387} from './scenarios/bridge-v387.ts';
import type {World,Tile} from '../src/sim/types.ts';
const until=(w:World,done:()=>boolean,limit=3500)=>{for(let n=0;n<limit&&!done();n++)stepWorld(w);expect(done(), 'tick '+w.tick).toBe(true);};
const accept=(w:World,c:Parameters<typeof applyCommand>[1])=>expect(applyCommand(w,c).ok,JSON.stringify(c)).toBe(true);
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
const current={schemaVersion:256};

test('all actual terrain identities are versioned; old records keep their literal support after neutral migration',()=>{
 const old=new Set(['rich-soil','gravel','marsh','water-shallow']);
 for(const terrain of Object.values(NATURAL_TERRAIN_BINDINGS_256)){expect(terrainAvailable256(terrain,256)).toBe(true);expect(validMarshTile({terrain},255)).toBe(old.has(terrain));}
 expect(terrainSupportsAffordance256({terrain:'rough-stone'},'Diggable',{schemaVersion:255})).toBe(true);
 expect(terrainSupportsAffordance256({terrain:'rough-stone'},'Diggable',current)).toBe(true);
 expect(terrainSupportsAffordance256({terrain:'rough-stone'},'Diggable',{schemaVersion:256,site:{revision:3}})).toBe(false);
 expect(validBridgeTile({terrain:'mud',bridge:true},255)).toBe(false);expect(validBridgeTile({terrain:'mud',bridge:true},256)).toBe(true);
});

test('supports and Heavy floors use actual affordances and Stuff on every footprint',()=>{
 for(const [terrain,light,medium,heavy,diggable] of [['mud',false,false,false,false],['marshy-soil',true,false,false,true],['soft-sand',true,false,false,true],['sand',true,true,true,true],['ice',true,true,true,true],['river-chest-deep',false,false,false,false],['water-deep',false,false,false,false]] as const){
  for(const [need,expected] of [['Light',light],['Medium',medium],['Heavy',heavy],['Diggable',diggable]] as const)expect(terrainSupportsAffordance256({terrain},need,current),terrain+need).toBe(expected);
  expect(terrainSupportsFloor256({terrain},current)).toBe(heavy);
 }
 expect(bridgeSupportsBuilding({kind:'wall',material:'wood'})).toBe(true);expect(bridgeSupportsBuilding({kind:'wall',material:'steel'})).toBe(false);
 const tiles:Tile[]=[{terrain:'marshy-soil'},{terrain:'mud'}];
 expect(marshSupportsFootprint({tiles,width:2,...current},[{x:0,z:0},{x:1,z:0}],{kind:'bed',material:'wood'})).toBe(false);
 tiles[1]!.bridge=true;expect(marshSupportsFootprint({tiles,width:2,...current},[{x:0,z:0},{x:1,z:0}],{kind:'bed',material:'wood'})).toBe(true);
 expect(terrainSupportsFloor256(tiles[1]!,current)).toBe(false);
});

test('Bridgeable is independent of water: exact fire/snow/filth/deterioration properties',()=>{
 for(const terrain of ['mud','marshy-soil','river-shallow','river-chest-deep','ocean-shallow'] as const)expect(terrainBridgeable256(terrain,256)).toBe(true);
 for(const terrain of ['water-deep','ocean-deep'] as const)expect(terrainBridgeable256(terrain,256)).toBe(false);
 for(const terrain of ['marsh','water-shallow','water-deep','ocean-shallow','ocean-deep','river-shallow','river-chest-deep'] as const){expect(terrainExtinguishesFire256({terrain})).toBe(true);expect(terrainHoldsSnow256(terrain)).toBe(false);expect(terrainAcceptsFilth256({terrain})).toBe(false);expect(terrainExtraDeterioration256({terrain})).toBe(3);}
 for(const terrain of ['mud','marshy-soil'] as const){expect(terrainExtinguishesFire256({terrain})).toBe(false);expect(terrainHoldsSnow256(terrain)).toBe(true);expect(terrainAcceptsFilth256({terrain})).toBe(true);expect(terrainExtraDeterioration256({terrain})).toBe(0);}
 expect(terrainExtinguishesFire256({terrain:'river-shallow',bridge:true})).toBe(false);expect(terrainHoldsSnow256('river-shallow',true)).toBe(true);
});

test('bridge removal keeps real mud/marshy substrate, traces and snow; water reveals without them and refunds only six',()=>{
 for(const terrain of ['mud','marshy-soil','river-chest-deep'] as const){
  const {world:w,bridgeCell}=bridgeWorkshopV387(16),i=bridgeCell.z*w.width+bridgeCell.x;w.tiles[i]={terrain,bridge:true};w.piles=[];refreshStock(w);
  initializeSnowSurface(w);setSnowDepth(w,i,.4);expect(addFilth(w,bridgeCell,'blood')).toBe(true);
  expect(canDesignateFloor(w,{type:'designate',kind:'lay-floor',floor:'wood-planks',...bridgeCell}).ok).toBe(false);
  accept(w,{type:'designate',kind:'remove-bridge',...bridgeCell});const j=w.jobs.at(-1)!;expect(removeBridge(w,j)).toBe(true);
  expect(w.tiles[i]!.terrain).toBe(terrain);expect(w.tiles[i]!.bridge).toBeUndefined();expect(wood(w)).toBe(6);expect(w.deconstructed.lostWood).toBe(6);
  expect((w.tiles[i]!.snowDepth??0)>0).toBe(terrain!=='river-chest-deep');expect(w.filth!.items.some(f=>f.x===bridgeCell.x&&f.z===bridgeCell.z)).toBe(terrain!=='river-chest-deep');
 }
});

test('Cypress substrate is narrow and construction clearance is its own real build-bridge work, with exact reload continuation',()=>{
 const {world:w,bridgeCell,pawnId}=bridgeWorkshopV387(32),i=bridgeCell.z*w.width+bridgeCell.x;
 // Declared physical work fixture, not a claim of new Site3 generation.
 // Species observation requires a real legacy biome/clinical clock owner.
 w.scenario={id:'crashlanded',revision:6,landing:{...bridgeCell}};w.gameProfile=crashlandedProfile();enableCassandraRaids(w);adoptFluIncidents(w);adoptMiscIncidents(w);w.site=resolveSite(w.seed,{hilliness:'flat',biome:'temperate-forest'});adoptSiteClimate(w);w.tiles[i]={terrain:'mud'};
 const source=createWildPlantResource256(w,w.nextId++,bridgeCell.x,bridgeCell.z,'cypress',1,false)!;expect(source).toBeDefined();w.resources.push(source);if(w.site.revision!==2)throw Error('Expected declared biome fixture');initializeWildFlora(w,w.site);
 expect(plantSubstrateAllowed256('cypress',256,naturalPlantSubstrate256(w.tiles[i]!))).toBe(true);expect(plantSubstrateAllowed256('cypress',256,naturalPlantSubstrate256({terrain:'soil-natural'}))).toBe(false);
 expect(plantHarvestWorkCore(source)).toBe(1800);expect(clearingDuration(source)).toBe(180);expect(clearingDuration({...source,species:'pine'})).toBe(100);expect(plantWorkGrowthFactor256(w,source)).toBe(1);expect(plantWorkGrowthFactor256(w,{...source,growth:0})).toBe(Math.fround(3.3));expect(constructionFinalWipesPlants('build-bridge')).toBe(true);expect(validateMarshTransport(w)).toEqual([]);
 accept(w,{type:'designate',kind:'build-bridge',...bridgeCell});const job=w.jobs.at(-1)!;expect(finishBridge(w,job)).toBe(false);
 until(w,()=>job.clearance?.resourceId===source.id&&(job.clearance.progress??0)>0);expect(job.kind).toBe('build-bridge');expect(w.resources).toContain(source);expect(w.tiles[i]!.bridge).toBeUndefined();
 expect(job.reservedBy).toBe(pawnId);expect(validateBridgeTransport(w,255).length).toBeGreaterThan(0);expect(validateBridgeTransport(w,256)).toEqual([]);
 until(w,()=>!!job.clearance&&job.clearance.progress>=100);expect(job.clearance!.progress*10).toBeGreaterThanOrEqual(1000);expect(job.clearance!.progress*10).toBeLessThan(1800);expect(w.resources).toContain(source);expect(w.tiles[i]!.bridge).toBeUndefined();
 expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w)),at=w.tick;
 until(w,()=>w.tiles[i]!.bridge===true);stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(w.resources.some(r=>r.id===source.id)).toBe(false);
 expect(w.tiles[i]).toEqual({terrain:'mud',bridge:true});expect(w.piles.some(p=>p.owner.type==='job'&&p.owner.jobId===job.id)).toBe(false);expect(w.events.some(e=>e.message.includes('dégagé le chantier'))).toBe(true);expect(validateWorld(w)).toEqual([]);
});

test('RAW and checkpoint/delta keep actual terrain; old envelope and same-tick unsupported object refuse before adoption',()=>{
 const {world:w}=bridgeWorkshopV387(16);const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status,JSON.stringify(first)).toBe('applied');
 const index=3*w.width+3;w.tiles[index]={terrain:'river-chest-deep'};const packet=structuredClone(encoder.encode(w,0,0));expect(packet.kind).toBe('delta');const next=decoder.adopt(packet);expect(next.status,JSON.stringify(next)).toBe('applied');if(next.status!=='applied')throw Error('Expected current terrain delta');expect(next.world.tiles[index]).toEqual(w.tiles[index]);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
 const old=JSON.parse(raw);old.schemaVersion=255;expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
 const oldPacket=structuredClone(new SnapshotEncoder().encode(w,0,0));Object.assign(oldPacket.world,{schemaVersion:255});expect(new SnapshotDecoder().adopt(oldPacket).status).toBe('resync');
 const frozen=JSON.stringify(next.world);w.structures.push({id:w.nextId++,kind:'wall',material:'wood',x:3,z:3,orientation:0,footprint:'standard'});
 const unsupported=structuredClone(encoder.encode(w,0,0));expect(unsupported.kind).toBe('delta');expect(decoder.adopt(unsupported).status).toBe('resync');expect(JSON.stringify(next.world)).toBe(frozen);
});

test('substrate scratch replaces the whole DTO and ordered tags without sharing public results',()=>{
 const scratch={fertility:-1,terrainDefId:'stale',tags:['stale','extra']},tags=scratch.tags;
 const rows:[Tile,number,string,string[]][]=[
  [{terrain:'soil-natural'},1,'Soil',['Soil']],[{terrain:'rich-soil'},1.4,'SoilRich',['Soil']],
  [{terrain:'gravel'},.7,'Gravel',['Soil']],[{terrain:'mossy-soil'},1,'MossyTerrain',['Soil']],
  [{terrain:'marshy-soil'},1,'MarshyTerrain',['Soil']],[{terrain:'riverbank'},1.4,'Riverbank',['Soil']],
  [{terrain:'mud'},0,'Mud',['Mud']],[{terrain:'marsh'},0,'Marsh',['Water','WaterMarshy']],
  [{terrain:'ice'},0,'Ice',['Ice']],[{terrain:'river-shallow'},0,'WaterMovingShallow',['Water','River','WaterFreshShallow','WaterFreshShallowMoving']],
  [{terrain:'river-chest-deep'},0,'WaterMovingChestDeep',['Water','River']],
  [{terrain:'water-shallow'},0,'WaterShallow',['Water','WaterFreshShallow','WaterFreshShallowStill']],
  [{terrain:'ocean-shallow'},0,'WaterOceanShallow',['Water','Ocean']],[{terrain:'ocean-deep'},0,'WaterOceanDeep',['Water','Ocean']],
  [{terrain:'water-deep'},0,'WaterDeep',['Water']],[{terrain:'packed-dirt'},0,'PackedDirt',['Road']],
  [{terrain:'rough-stone',stone:'granite'},0,'Granite_Rough',[]],[{terrain:'rough-stone'},0,'rough-stone',[]],
  [{terrain:'sand'},.1,'Sand',[]],[{terrain:'soft-sand'},0,'SoftSand',[]],
  [{terrain:'grass'},1,'grass',[]],[{terrain:'soil'},.7,'soil',[]],[{terrain:'water'},0,'water',[]],[{terrain:'rock'},0,'rock',[]],
 ];
 for(const [tile,fertility,terrainDefId,expectedTags] of rows)for(const surface of [{},{bridge:true},{floor:'wood-planks'}] as const){
  const input={...tile,...surface},copy=structuredClone(input),layered='bridge'in surface||'floor'in surface;
  const expected={fertility:layered?0:fertility,terrainDefId,tags:layered?[]:expectedTags};
  const publicResult=naturalPlantSubstrate256(input),publicCopy=structuredClone(publicResult);
  expect(naturalPlantSubstrate256(input,scratch)).toBe(scratch);expect(scratch.tags).toBe(tags);expect(scratch).toEqual(expected);
  expect(publicResult).toEqual(expected);expect(publicResult).not.toBe(scratch);expect(publicResult.tags).not.toBe(tags);
  expect(Object.keys(publicResult)).toEqual(['fertility','terrainDefId','tags']);
  naturalPlantSubstrate256({terrain:'river-shallow'},scratch);expect(publicResult).toEqual(publicCopy);
  const independent=naturalPlantSubstrate256(input);expect(independent).not.toBe(publicResult);expect(independent.tags).not.toBe(publicResult.tags);
  expect(input).toEqual(copy);
 }
});

test('substrate scratch keeps unknown and historical profile results and malformed stone read order',()=>{
 const scratch={fertility:0,terrainDefId:'',tags:[] as string[]};
 for(const version of [255,256,263])for(const tile of [{terrain:'mud'},{terrain:'soil-natural'},{terrain:'marsh',bridge:true}] as const){
  for(const species of ['cypress',undefined,'not-a-real-species']){
   const expected=plantSubstrateAllowed256(species,version,naturalPlantSubstrate256(tile));
   expect(plantSubstrateAllowed256(species,version,naturalPlantSubstrate256(tile,scratch))).toBe(expected);
   if(species!=='cypress'||version<256)expect(expected).toBeUndefined();
  }
 }
 expect(plantSubstrateAllowed256('cypress',256,naturalPlantSubstrate256({terrain:'mud'},scratch))).toBe(true);
 expect(plantSubstrateAllowed256('cypress',256,naturalPlantSubstrate256({terrain:'soil-natural'},scratch))).toBe(false);
 for(const stone of [123,[],{}])for(const target of [undefined,scratch]){
  const reads:string[]=[],tile=Object.defineProperties({},Object.fromEntries(['terrain','stone','floor','bridge'].map(key=>[key,{enumerable:true,get(){reads.push(key);return key==='terrain'?'grass':key==='stone'?stone:undefined;}}]))) as Tile;
  expect(()=>naturalPlantSubstrate256(tile,target)).toThrow(TypeError);expect(reads).toEqual(['terrain','stone','stone']);
 }
});

test('marsh plant scratch retains first-error order, complete support scans and input values',()=>{
 // Declared narrow guard fixture; no gameplay history or generated population claimed.
 const {world:w}=bridgeWorkshopV387(16);w.structures=[];w.jobs=[];w.growingZones=[];
 w.tiles=w.tiles.map(()=>({terrain:'soil-natural'}));w.tiles[0]={terrain:'mud'};
 const good={id:w.nextId++,kind:'tree' as const,species:'cypress' as const,x:0,z:0,amount:1};
 const invalid={...good,id:w.nextId++,x:1},outside={...good,id:w.nextId++,x:0,z:w.height};
 w.resources=[good,invalid,outside];
 const check=(expected:string[])=>{const before=structuredClone(w);expect(validateMarshTransport(w,w.schemaVersion,[])).toEqual(expected);expect(w).toEqual(before);};
 w.structures=[{id:w.nextId++,kind:'wall',material:'wood',x:0,z:0,orientation:0,footprint:'standard'}];
 check(['Building lacks actual terrain support.']);w.structures=[];
 check(['Plant violates its actual substrate profile.']);w.resources=[good,outside,invalid];
 check(['Plant outside terrain.']);w.resources=[good];
 w.growingZones=[{id:w.nextId++,cells:[0],plant:'rice',allowSow:true,allowCut:true}];check(['Growing zone on infertile terrain.']);
 w.growingZones[0]!.cells=[1];check([]);
 w.tiles[0]={terrain:'marsh',bridge:true};check(['Plant rooted in incompatible water.']);
 w.tiles[0]={terrain:'mud',floor:'wood-planks'};check(['Plant violates its actual substrate profile.']);
});
