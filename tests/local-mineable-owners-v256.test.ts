import {generateLocalRockFields256} from '../src/sim/local-rock-fields-256';
import {scatterLocalOres256} from '../src/sim/local-ore-scattering-256';
import {generateLocalTerrain256} from '../src/sim/local-terrain-fields-256';
import {LOCAL_BIOME_RULES_256} from '../src/sim/local-biome-rules-v256';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import {expect,test} from 'vitest';
import {createMineableGenerationRecorder256} from '../src/sim/local-mineable-generation-256';
import {removedMineableTile256,planVanishMineable256,vanishNaturalMineable256,type MineableTile256} from '../src/sim/local-mineable-owner-256';
import {validMineableTile256,validMineableOwner256,registerMineableIdentities256} from '../src/sim/local-mineable-save-256';
import {minedFloor} from '../src/sim/ore';
import type {StoneKind} from '../src/sim/geology';
import type {LocalOre256} from '../src/sim/local-ore-scattering-256';
import type {NaturalTerrainId256} from '../src/sim/local-terrain-definitions-256';
/** Isolated true generation fields/events; no World, timeline or seed replay. */
function fields(){return {edifices:new Uint8Array(64),stones:Array<StoneKind>(64).fill('granite'),ores:Array<LocalOre256|null>(64).fill(null),terrain:Array<NaturalTerrainId256>(64).fill('soil-natural')};}
const owner=()=>({id:17,def:'MineableSteel' as const,terrain:'rough-stone' as const});
const tile=():MineableTile256=>({terrain:'rock',stone:'granite',ore:'steel',mineable:owner(),miningDamage:80,miningYield:.1,fogged:true,snowDepth:.4,bridge:true,floor:'wood-planks'});
test('actual ordered replacement and later removal consume original IDs without reconstruction or reuse',()=>{
 const f=fields(),r=createMineableGenerationRecorder256(8,8,100);
 r.naturalSpawn(9,'granite');r.naturalSpawn(10,'granite');r.oreSpawn(9,'steel','granite');r.oreSpawn(9,'gold','granite');r.oreSpawn(11,'jade','granite');
 r.terrainDecided(9,'rough-stone');r.terrainDecided(10,'sand');r.terrainDecided(11,'rough-stone');r.vanish(10);r.vanish(11);f.edifices[9]=1;f.ores[9]='gold';f.terrain[9]='rough-stone';
 const result=r.finish(f);expect(result.nextId).toBe(105);expect([...result.owners]).toEqual([[9,{id:103,def:'MineableGold',terrain:'rough-stone'}]]);expect(()=>r.naturalSpawn(12,'granite')).toThrow(/event/);expect(()=>r.finish(f)).toThrow(/Incomplete/);
});
test('Terrain and each PostTerrain decision replace actual substrate, never the initial rock guess',()=>{
 const f=fields(),r=createMineableGenerationRecorder256(8,8,1);r.naturalSpawn(9,'granite');r.terrainDecided(9,'rough-stone');r.terrainDecided(9,'gravel');r.terrainDecided(9,'water-shallow');r.terrainDecided(9,'sand');f.edifices[9]=1;f.terrain[9]='sand';
 expect(r.finish(f).owners.get(9)).toEqual({id:1,def:'Granite',terrain:'sand'});
 const missing=createMineableGenerationRecorder256(8,8,1);missing.naturalSpawn(9,'granite');expect(()=>missing.finish(f)).toThrow(/substrate/);
});
test('missing spawn/removal events and mismatched terminal definitions refuse instead of synthesizing IDs',()=>{
 const f=fields(),r=createMineableGenerationRecorder256(8,8,5);f.edifices[9]=1;expect(()=>r.finish(f)).toThrow(/events/);
 const x=createMineableGenerationRecorder256(8,8,5);x.naturalSpawn(9,'granite');x.terrainDecided(9,'soil-natural');f.ores[9]='steel';expect(()=>x.finish(f)).toThrow(/definition/);expect(()=>x.vanish(10)).toThrow(/absent/);
 const exhausted=createMineableGenerationRecorder256(8,8,Number.MAX_SAFE_INTEGER);expect(()=>exhausted.naturalSpawn(9,'granite')).toThrow(/frontier/);expect(exhausted.finish(fields()).nextId).toBe(Number.MAX_SAFE_INTEGER);
});
test('true no-product Vanish removes exact original and keeps substrate, fog, snow, floor/bridge and neighbours',()=>{
 const original=tile(),tiles:Array<MineableTile256>=Array.from({length:64},()=>({terrain:'soil-natural'}));tiles[9]=original;
 const map={schemaVersion:256,site:{revision:3},width:8,height:8,tiles},before=structuredClone(map),plan=planVanishMineable256(map,9,17,true);
 expect(plan?.id).toBe(17);expect(map).toEqual(before);expect(vanishNaturalMineable256(map,9,17)).toBe(true);expect(map.tiles[9]).toEqual({terrain:'rough-stone',stone:'granite',fogged:true,snowDepth:.4,bridge:true,floor:'wood-planks'});expect(map.tiles[10]).toEqual(before.tiles[10]);
 expect(planVanishMineable256(map,9,17,true)).toBeNull();expect(()=>plan!.commit()).toThrow(/changed/);expect(planVanishMineable256({...map,schemaVersion:255},9,17,true)).toBeNull();
});
test('Vanish preflight rejects stale original and restores non-stone ground without leaving old ore or geology',()=>{
 const original=tile();original.mineable={id:17,def:'MineableSteel',terrain:'marshy-soil'};expect(removedMineableTile256(original,99)).toBeUndefined();
 expect(removedMineableTile256(original,17)).toEqual({terrain:'marshy-soil',fogged:true,snowDepth:.4,bridge:true,floor:'wood-planks'});
 const tiles:Array<MineableTile256>=Array.from({length:64},()=>({terrain:'soil-natural'}));tiles[9]=original;const map={schemaVersion:256,site:{revision:3},width:8,height:8,tiles},plan=planVanishMineable256(map,9,17,true)!;
 original.mineable.id=18;const changed=structuredClone(map);expect(()=>plan.commit()).toThrow(/changed/);expect(map).toEqual(changed);
});
test('legacy/undefined/getter/future fields refuse before migration and real def/stone/ore binding is strict',()=>{
 const t=tile();expect(validMineableTile256(t,256,true,18)).toBe(true);expect(validMineableTile256(t,255,false,18)).toBe(false);expect(validMineableTile256({terrain:'rock',mineable:undefined},255,false,18)).toBe(false);expect(validMineableTile256(t,256,false,18)).toBe(false);
 expect(validMineableTile256({terrain:'rock',stone:'granite'},256,true,18)).toBe(false);expect(validMineableTile256({...t,mineable:{...owner(),def:'Granite'}},256,true,18)).toBe(false);expect(validMineableTile256({...t,terrain:'sand'},256,true,18)).toBe(false);expect(validMineableOwner256({...owner(),extra:undefined},18)).toBe(false);expect(validMineableOwner256(owner(),17)).toBe(false);
 const g={terrain:'rock',stone:'granite'};Object.defineProperty(g,'mineable',{enumerable:true,get(){throw Error('Getter invoked');}});expect(validMineableTile256(g,256,true,18)).toBe(false);
});
test('namespace collisions are atomic, JSON persistence retains IDs and same-tick changed original is observable',()=>{
 const ids=new Set([1,17]),before=new Set(ids);expect(registerMineableIdentities256([owner()],ids)).toBe(false);expect(ids).toEqual(before);
 expect(registerMineableIdentities256([{...owner(),id:18}],ids)).toBe(true);expect(ids.has(18)).toBe(true);
 const t=tile(),saved=JSON.parse(JSON.stringify(t));expect(saved).toEqual(t);expect(validMineableTile256(saved,256,true,19)).toBe(true);saved.mineable.id=18;expect(saved).not.toEqual(t);expect(validMineableTile256(saved,256,true,19)).toBe(true);expect(t.mineable!.id).toBe(17);
});
test('ordinary paid mining uses the same exact substrate owner; historical minedFloor remains literal',()=>{
 const t=tile();t.mineable={id:17,def:'MineableSteel',terrain:'soil-natural'};
 expect(minedFloor(t)).toEqual({terrain:'soil-natural',fogged:true,snowDepth:.4,bridge:true,floor:'wood-planks'});
 expect(minedFloor({terrain:'rock',stone:'granite'})).toEqual({terrain:'rough-stone',stone:'granite'});
});

test('real rock/ore/Terrain hooks allocate in true emitted order and add zero generation RNG draws',()=>{
 const n=16*16,elevation=new Float32Array(n).fill(.8),caves=new Float32Array(n),recorder=createMineableGenerationRecorder256(16,16,50),natural:number[]=[],oreEvents:number[]=[];
 const rocks=generateLocalRockFields256({mapSeed:8,width:16,height:16,naturalRocks:['granite','slate'],waterCovered:false,elevation,caves,onNaturalSpawn(cell,stone){natural.push(cell);recorder.naturalSpawn(cell,stone);}});
 expect(natural).toEqual(Array.from({length:n},(_,i)=>i));
 const input={width:16,height:16,hilliness:1 as const,waterCovered:false,naturalEdifices:rocks.edifices,caves,usedRectCells:new Set<number>(),isStartingMap:true,mapInitializing:true,tutorial:false,forcedOre:'steel' as const,forcedSize:3,count:1},aRng=new WorldGenerationRandom(18),bRng=new WorldGenerationRandom(18);
 const a=scatterLocalOres256({...input,onOreSpawn(cell,ore){oreEvents.push(cell);recorder.oreSpawn(cell,ore,rocks.stones[cell]!);}},aRng),b=scatterLocalOres256(input,bRng);
 expect(a).toEqual(b);expect(aRng.state).toEqual(bRng.state);expect(oreEvents).toEqual(a.placements.map(p=>p.cell));expect(oreEvents).toHaveLength(3);
 const ground=generateLocalTerrain256({mapSeed:8,width:16,height:16,rules:LOCAL_BIOME_RULES_256['temperate-forest'],elevation,fertility:new Float32Array(n).fill(.5),rockEdifices:a.edifices,caves,onTerrainDecided:(cell,terrain)=>recorder.terrainDecided(cell,terrain)});
 const result=recorder.finish({edifices:a.edifices,stones:rocks.stones,ores:a.ores,terrain:ground.terrain});expect(result.nextId).toBe(50+n+3);
 for(let i=0;i<oreEvents.length;i++)expect(result.owners.get(oreEvents[i]!)?.id).toBe(50+n+i);
});
