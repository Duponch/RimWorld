import {test,expect} from 'vitest';
import {registryCamp} from './helpers/world-maps-v255.ts';
import {createGroupCampaignGeometry256,groupPlanetTangent256,groupRegularPolygon256,actualFinalPushDestination256} from '../src/sim/group-campaign-geometry-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
test('actual caravan tangent is orthogonal, preserves offset and switches basis at the polar threshold',()=>{
 expect(groupPlanetTangent256([0,0,100],[2,3])).toEqual([3,2,0]);
 expect(groupPlanetTangent256([0,100,0],[2,3])).toEqual([2,0,3]);
 const root=[35,40,86] as const,offset=groupPlanetTangent256(root,[2,3]);
 expect(offset.reduce((v,c,i)=>v+c*root[i]!,0)).toBeCloseTo(0,4);
 expect(Math.hypot(...offset)).toBeCloseTo(Math.sqrt(13),5);
});
test('one standing caravan has no artificial offset; actual ID isolates its collision stream',()=>{
 expect(groupRegularPolygon256(1,0)).toEqual([0,0]);expect(groupRegularPolygon256(2,0)[0]).toBeCloseTo(-1,6);expect(groupRegularPolygon256(2,1)[0]).toBeCloseTo(1,6);
 const w=registryCamp(),before=JSON.stringify(w),g=createGroupCampaignGeometry256(w);
 expect(g.center(w.planet!.homeTile)).toBe(w.planet!.revision===3?undefined:w.planet!.tiles[w.planet!.homeTile]!.center);
 expect(g.collisionAngle(19)).toBe(new WorldGenerationRandom(19).float(0,360));expect(g.averageTileSize).toBeGreaterThan(0);expect(JSON.stringify(w)).toBe(before);
 expect(()=>g.passable({...w},w.planet!.homeTile)).toThrow();
});
test('final push requires a real non-caravan object; expired temporary marker no longer qualifies',()=>{
 const w=registryCamp(),home=w.worldMaps!.sites[0]!.tile!,unused=w.planet!.revision===3?0:w.planet!.tiles.find(t=>t.biome!=='ocean'&&!w.worldMaps!.sites.some(m=>m.tile===t.id)&&t.id!==w.planet!.civilianTile)!.id;
 expect(actualFinalPushDestination256(w,home)).toBe(true);expect(actualFinalPushDestination256(w,unused)).toBe(false);
 w.worldMaps!.retired.push({id:w.worldMaps!.nextMapId++,tile:unused,kind:'camp',createdAt:0,removedAt:0,reason:'camp-empty',markerUntilCore:w.tick*10+1});
 expect(actualFinalPushDestination256(w,unused)).toBe(true);w.worldMaps!.retired.at(-1)!.markerUntilCore=w.tick*10;
 expect(actualFinalPushDestination256(w,unused)).toBe(false);
});
