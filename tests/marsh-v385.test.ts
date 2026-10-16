import {expect,test} from 'vitest';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {generateSiteWorld} from '../src/sim/site-generation.ts';
import {resolveSite} from '../src/sim/site.ts';
import {marshPatchValue} from '../src/sim/marsh-generation.ts';
import {MARSH_PATH_COST_CORE,MARSH_PERCEIVED_CORE,validateMarshTransport,validMarshTile} from '../src/sim/marsh.ts';
import {soilFertility,isGrowingTerrain} from '../src/sim/soil.ts';
import {blockedCells,reachableCells,routeToCell} from '../src/sim/pathfinding.ts';
import {furnitureDelay,terrainTravelDelay,navigationCosts} from '../src/sim/furniture-travel.ts';
import {startFire,attachPawnFire,advanceFires} from '../src/sim/fire.ts';
import {thermalLayout} from '../src/sim/temperature.ts';
import {terrainRetainsSnow} from '../src/sim/snow-surface.ts';
import {addFilth} from '../src/sim/filth.ts';
import {FireContent} from '../src/sim/fire-content.ts';
import {SCHEMA_VERSION,type World,type DesignateCommand} from '../src/sim/types.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {marshWorkshopV385} from './scenarios/marsh-v385.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';

const until=(w:World,done:()=>boolean,limit=1000)=>{for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),`tick ${w.tick}`).toBe(true);};

test('prospective tundra alone receives original lowland marsh, no old geography or ecology is reinterpreted',()=>{
  for(const biome of ['temperate-forest','boreal-forest','arid-shrubland','tundra'] as const){
    const site=resolveSite(42,{biome,hilliness:'flat'}),old=generateSiteWorld(42,128,128,site,245),current=generateSiteWorld(42,128,128,site,246);
    expect(old.tiles.some(t=>t.terrain==='marsh')).toBe(false);
    if(biome!=='tundra'){expect(current).toEqual(old);continue;}
    const wet=current.tiles.flatMap((t,i)=>t.terrain==='marsh'?[i]:[]);expect(wet.length).toBeGreaterThan(0);
    expect(current.tiles).toEqual(generateSiteWorld(42,128,128,site,246).tiles);expect(createScenarioWorld(42,128,'crashlanded',{biome:'tundra',hilliness:'flat'}).tiles).toEqual(current.tiles);expect(current.rng).toBe(old.rng);
    for(const i of wet){expect(['grass','rich-soil']).toContain(old.tiles[i]!.terrain);expect(marshPatchValue(42,i%128,Math.floor(i/128))).toBeGreaterThanOrEqual(.83);expect(current.resources.some(r=>r.z*128+r.x===i)).toBe(false);}
  }
});

test('marsh is walkable with30 physical Core and distinct180/18 perceived costs; real hauling preserves captured wet edges and identity',()=>{
  const {world:w,pawnId,marshCell,storage,sourceId}=marshWorkshopV385(),pawn=w.pawns.find(p=>p.id===pawnId)!,i=marshCell.z*w.width+marshCell.x;
  expect(MARSH_PATH_COST_CORE).toBe(30);expect(MARSH_PERCEIVED_CORE).toEqual({ordinary:180,drafted:18});expect(blockedCells(w)[i]).toBe(0);
  expect(terrainTravelDelay(w,i)).toBe(3);expect(furnitureDelay(w,{x:14,z:16},marshCell)).toBe(3);
  const ordinary=navigationCosts(w,pawn).costs!;expect(ordinary.get(i)).toBe(7000);
  expect(applyCommand(w,{type:'draft',pawnIds:[pawnId],enabled:true}).ok).toBe(true);expect(navigationCosts(w,pawn).costs!.get(i)).toBe(1600);
  const reach=reachableCells(w,pawn,blockedCells(w),new Set());expect(routeToCell(w,marshCell,reach)).not.toBeNull();
  expect(applyCommand(w,{type:'draft',pawnIds:[pawnId],enabled:false}).ok).toBe(true);
  until(w,()=>pawn.motion?.terrainDelay===3&&(pawn.motion.end>w.tick));
  const saved=deserializeWorld(serializeWorld(w)),captured=structuredClone(pawn.motion),at=w.tick;expect(captured!.terrainDelay).toBe(3);
  until(w,()=>pawn.haul?.phase==='deliver'&&pawn.haul.carryPileId!==null);
  const cargoId=pawn.haul!.carryPileId!;expect(cargoId).not.toBe(sourceId);expect(w.piles.some(p=>p.id===sourceId)).toBe(false);
  expect(w.piles.find(p=>p.id===cargoId)).toMatchObject({item:'wood',quantity:10,owner:{type:'pawn',pawnId}});
  until(w,()=>w.piles.some(p=>p.id===cargoId&&p.owner.type==='ground'&&p.owner.x===storage.x&&p.owner.z===storage.z));stepWorld(saved,w.tick-at);
  expect(serializeWorld(saved)).toBe(serializeWorld(w));expect(w.piles.find(p=>p.id===cargoId)).toMatchObject({item:'wood',quantity:10,owner:{type:'ground',...storage}});expect(w.tiles[i]!.terrain).toBe('marsh');expect(validateWorld(w)).toEqual([]);
});

test('all delivered supports and ordinary conduit/floors refuse atomically, growing is excluded while ground storage remains legal',()=>{
  const {world:w,marshCell}=marshWorkshopV385();expect(soilFertility('marsh')).toBe(0);expect(isGrowingTerrain('marsh')).toBe(false);
  for(const kind of ['wall','power-conduit','crafting-spot','butcher-spot','sleeping-spot','animal-sleeping-spot'] as const){
    const before=serializeWorld(w),command:DesignateCommand={type:'designate',kind,...marshCell,...kind==='wall'?{material:'wood' as const}:{}};
    expect(applyCommand(w,command).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  }
  const before=serializeWorld(w);expect(applyCommand(w,{type:'designate',kind:'lay-floor',floor:'wood-planks',...marshCell}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,{type:'area',action:'growing',from:marshCell,to:marshCell}).affected??0).toBe(0);expect(w.growingZones).toEqual([]);
  expect(applyCommand(w,{type:'stockpile',enabled:true,...marshCell,filters:{wood:true,food:false}}).ok).toBe(true);
  const bad=structuredClone(w);bad.structures.push({id:bad.nextId++,kind:'power-conduit',...marshCell,orientation:0,footprint:'standard',material:'steel'});expect(validateMarshTransport(bad)).toContain('Building lacks support on marsh.');
});

test('wet ground has no fire fuel even with wood, extinguishes an attached fire at the existing pulse and rejects snow/floor',()=>{
  const {world:w,pawnId,marshCell}=marshWorkshopV385(),pawn=w.pawns.find(p=>p.id===pawnId)!;
  expect(terrainRetainsSnow('marsh')).toBe(false);expect(validMarshTile({terrain:'marsh'},245)).toBe(false);expect(validMarshTile({terrain:'marsh'},246)).toBe(true);
  expect(validMarshTile({terrain:'marsh',snowDepth:.1},246)).toBe(false);expect(validMarshTile({terrain:'marsh',floor:'wood-planks'},246)).toBe(false);
  const before=serializeWorld(w);expect(new FireContent(w).fuel(marshCell)).toBe(0);expect(startFire(w,marshCell)).toBe(false);expect(serializeWorld(w)).toBe(before);
  // Rejected wet deposits may initialise the independent filth domain and try
  // neighbours. No filth, item, ID or main simulation draw may be created.
  const mainRng=w.rng,nextId=w.nextId;expect(addFilth(w,marshCell,'blood')).toBe(false);expect(w.filth!.items).toEqual([]);expect(w.nextId).toBe(nextId);expect(w.rng).toBe(mainRng);
  // Subsystem witness: explicit attached fire and fixed person, not a played
  // natural ignition or movement. The existing complex fire pulse owns removal.
  pawn.x=marshCell.x;pawn.z=marshCell.z;expect(attachPawnFire(w,pawnId)).toBe(true);const count=w.fires!.items.length;expect(count).toBe(1);
  w.tick=15;advanceFires(w,{rainRate:0},thermalLayout(w));expect(w.fires!.items).toEqual([]);expect(pawn.burning).toBeUndefined();expect(w.piles.find(p=>p.item==='wood')!.quantity).toBe(10);
});

test('245 migration is literal on both maps and refuses future wet cells or malformed local authority before bump246',()=>{
  const {w}=preparedCassandraExpedition();(w as {schemaVersion:number}).schemaVersion=245;const old=JSON.parse(JSON.stringify(w));
  expect(deserializeWorld(JSON.stringify(w))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  for(const side of ['home','secondary'] as const){
    const future=structuredClone(w),map=side==='home'?future:future.secondarySite!.map;map.tiles[0]={terrain:'marsh'};expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/version245/);
    const malformed=structuredClone(w),local=side==='home'?malformed:malformed.secondarySite!.map;local.tiles=[];expect(()=>deserializeWorld(JSON.stringify(malformed))).toThrow(/version245/);
  }
});

test('confirmed checkpoint/delta preserves real marsh and rejects older envelopes or new unsupported footprints without adoption',()=>{
  const {world:w,marshCell}=marshWorkshopV385(),i=marshCell.z*w.width+marshCell.x,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');
  // A transport witness at the same tick; this is not a terrain-changing command.
  w.tiles[10*w.width+10]={terrain:'marsh'};const packet=structuredClone(encoder.encode(w,0,0));expect(packet.kind).toBe('delta');const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Expected marsh delta');expect(adopted.world.tiles[i]!.terrain).toBe('marsh');
  const old=structuredClone(new SnapshotEncoder().encode(w,0,0));(old.world as {schemaVersion:number}).schemaVersion=245;expect(new SnapshotDecoder().adopt(old).status).toBe('resync');
  const illegal=structuredClone(w);illegal.structures.push({id:illegal.nextId++,kind:'wall',...marshCell,orientation:0,footprint:'standard',material:'wood'});
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(illegal,0,0))).status).toBe('resync');
});

test('wet perception follows the terrain/object maximum and historical pre-farming views have no optional-field crash',()=>{
  const {world:w,pawnId,marshCell}=marshWorkshopV385(),pawn=w.pawns.find(p=>p.id===pawnId)!,chunkCell={x:marshCell.x+1,z:marshCell.z},i=chunkCell.z*w.width+chunkCell.x;
  // A neighbouring wet cell owns one real chunk; no mixed ground slot.
  addGroundMaterial(w,'chunk',1,chunkCell,'granite-chunk');expect(furnitureDelay(w,marshCell,chunkCell)).toBe(4.2);
  expect(navigationCosts(w,pawn).costs!.get(i)).toBe(7400);expect(navigationCosts(w,pawn).floors.get(i)).toBe(7000);
  expect(applyCommand(w,{type:'draft',pawnIds:[pawnId],enabled:true}).ok).toBe(true);expect(navigationCosts(w,pawn).costs!.get(i)).toBe(2000);expect(navigationCosts(w,pawn).floors.get(i)).toBe(1600);
  const historical=structuredClone(w);historical.tiles=historical.tiles.map(()=>({terrain:'grass'}));delete (historical as Partial<World>).growingZones;
  expect(validateMarshTransport(historical,7)).toEqual([]);
});
