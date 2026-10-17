import {test,expect} from 'vitest';
import {registryCamp} from './helpers/world-maps-v255.ts';
import {terrainAvailable256,terrainSupportsAffordance256,naturalPlantSubstrate256,terrainSupportsFloor256} from '../src/sim/natural-terrain-runtime-256.ts';
import {naturalTerrainCosts256} from '../src/sim/natural-terrain-movement-256.ts';
import {FLOOR_DEFINITIONS,floorAvailable,isBuildableFloor,removeFloor} from '../src/sim/flooring.ts';
import {applyCommand} from '../src/sim/engine.ts';
test('packed dirt retains distinct fertility, support and physical route cost, refusing old formats',()=>{
 const t={terrain:'packed-dirt' as const},w={schemaVersion:256};expect(terrainAvailable256(t.terrain,255)).toBe(false);expect(terrainAvailable256(t.terrain,256)).toBe(true);
 expect(naturalTerrainCosts256(t.terrain)?.pathCostCore).toBe(1);expect(naturalPlantSubstrate256(t)).toEqual({fertility:0,terrainDefId:'PackedDirt',tags:['Road']});
 expect(terrainSupportsAffordance256(t,'Heavy',w)).toBe(true);expect(terrainSupportsAffordance256(t,'Diggable',w)).toBe(true);expect(terrainSupportsAffordance256(t,'GrowSoil',w)).toBe(false);expect(terrainSupportsAffordance256(t,'Bridgeable',w)).toBe(false);
});
test('road surfaces have distinct admission and no invented research or salvage',()=>{
 expect(floorAvailable('granite-flagstone',255)).toBe(false);expect(floorAvailable('broken-asphalt',255)).toBe(false);
 const flag=FLOOR_DEFINITIONS['granite-flagstone'];expect(flag).toMatchObject({quantity:4,coreWork:500,salvage:0,research:null});
 expect(isBuildableFloor('broken-asphalt')).toBe(false);const tile={terrain:'water-shallow' as const,floor:'broken-asphalt' as const};
 expect(terrainSupportsFloor256(tile,{schemaVersion:256})).toBe(true);expect(terrainSupportsAffordance256(tile,'Heavy',{schemaVersion:256})).toBe(true);
 expect(terrainSupportsAffordance256({terrain:tile.terrain},'Heavy',{schemaVersion:256})).toBe(false);
});
test('real flagstone removal keeps its substrate and returns zero of its four blocks without an RNG draw',()=>{
 const w=registryCamp();const index=w.tiles.findIndex((t,i)=>t.terrain==='grass'&&!w.structures.some(s=>s.x===i%w.width&&s.z===Math.floor(i/w.width))&&!w.resources.some(r=>r.x===i%w.width&&r.z===Math.floor(i/w.width)));expect(index).toBeGreaterThanOrEqual(0);
 const x=index%w.width,z=Math.floor(index/w.width),tile=w.tiles[index]!;tile.floor='granite-flagstone';
 expect(applyCommand(w,{type:'designate',kind:'remove-floor',x,z})).toEqual({ok:true});const j=w.jobs.find(j=>j.kind==='remove-floor'&&j.x===x&&j.z===z)!;expect(j).toBeDefined();
 const rng=w.rng,next=w.nextId,piles=structuredClone(w.piles);expect(removeFloor(w,j)).toBe(true);expect(tile.floor).toBeUndefined();expect(tile.terrain).toBe('grass');expect(w.rng).toBe(rng);expect(w.nextId).toBe(next);expect(w.piles).toEqual(piles);
});
