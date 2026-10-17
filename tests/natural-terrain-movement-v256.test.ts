import {expect,test} from 'vitest';
import {soilFertility} from '../src/sim/soil.ts';
import {naturalTerrainWalkable256} from '../src/sim/natural-terrain-movement-256.ts';
import {emptyLandscape} from '../src/sim/generation.ts';
import {blockedCells} from '../src/sim/pathfinding.ts';
import {terrainTravelDelay,navigationCosts} from '../src/sim/furniture-travel.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';

test('Core natural terrain identities keep ordinary Soil distinct from old70percent soil and expose their actual fertility/support passability',()=>{
 expect(soilFertility('soil')).toBe(.7);expect(soilFertility('soil-natural')).toBe(1);expect(soilFertility('mossy-soil')).toBe(1);expect(soilFertility('marshy-soil')).toBe(1);
 expect(soilFertility('sand')).toBe(.1);expect(soilFertility('mud')).toBe(0);expect(soilFertility('riverbank')).toBe(1.4);
 for(const id of ['water-deep','ocean-deep','water','rock'])expect(naturalTerrainWalkable256(id)).toBe(false);
 for(const id of ['grass','soil','water-shallow','river-shallow','river-chest-deep','marsh','mud','marshy-soil','sand','ice','rough-stone'])expect(naturalTerrainWalkable256(id)).toBe(true);
});

test('a declared8x8 real empty-landscape fixture separates physical movement, route perception and finished bridge/floor overrides',()=>{
 const w=emptyLandscape(44,8,8);w.tiles=Array.from({length:64},()=>({terrain:'grass'}));
 w.tiles[1]={terrain:'river-chest-deep'};w.tiles[2]={terrain:'water-deep'};w.tiles[3]={terrain:'ocean-shallow'};w.tiles[4]={terrain:'marshy-soil'};w.tiles[5]={terrain:'mud'};w.tiles[6]={terrain:'soil-natural'};
 const pawn=startingPawn(w.nextId++,'Test',0,0,0,50,w.seed);w.pawns.push(pawn);
 const blocked=blockedCells(w);expect(blocked[1]).toBe(0);expect(blocked[2]).toBe(1);expect(blocked[3]).toBe(0);
 expect(terrainTravelDelay(w,1)).toBe(4.2);expect(terrainTravelDelay(w,3)).toBe(3);expect(terrainTravelDelay(w,4)).toBe(1.4);expect(terrainTravelDelay(w,5)).toBe(1.4);expect(terrainTravelDelay(w,6)).toBe(.2);
 const civilian=navigationCosts(w,pawn).costs!;expect(civilian.get(1)).toBe(7400);expect(civilian.get(3)).toBe(7000);expect(civilian.get(4)).toBe(467);
 pawn.draft={lastActiveTick:w.tick,target:null,queue:[]};const drafted=navigationCosts(w,pawn).costs!;expect(drafted.get(1)).toBe(2000);expect(drafted.get(3)).toBe(1600);expect(drafted.get(4)).toBe(467);expect(terrainTravelDelay(w,1)).toBe(4.2);
 const captured=JSON.stringify(pawn.motion);w.tiles[1]!.bridge=true;expect(terrainTravelDelay(w,1)).toBe(0);expect(navigationCosts(w,pawn).costs?.get(1)).toBeUndefined();expect(JSON.stringify(pawn.motion)).toBe(captured);
 w.tiles[6]!.floor='wood-planks';expect(terrainTravelDelay(w,6)).toBe(0);
});
