import {deconstructionCamp} from './scenarios/deconstruction';
import {mapCellDetails} from '../src/ui/map-cell-details';
import {mapHoverLines} from '../src/ui/map-hover-readout';
import type {Tile} from '../src/sim/types';
import {describe,it,expect} from 'vitest';
import {DIORAMA_DECOR_PROFILES,DIORAMA_DECOR_LIMITS,createDioramaDecor,type DioramaBiome} from '../src/render/diorama-decor';
import {createDioramaGeometry} from '../src/render/diorama-geometry';
import {NATURAL_TERRAIN_BINDINGS_256,NATURAL_TERRAIN_DEFINITIONS_256} from '../src/sim/local-terrain-definitions-256';
import {TERRAIN_LABELS,terrainInspection,terrainAffordanceNote,terrainSurfaceWalkable,terrainSurfaceLabel,bridgeTerrainNote} from '../src/ui/terrain-inspection';
const context={schemaVersion:256,site:{revision:3}};
describe('twelve original biome scenes and actual terrain facts256',()=>{
 it('has explicit finite bounded paper profiles for every land biome, without a temperate fallback',()=>{
  expect(Object.keys(DIORAMA_DECOR_PROFILES)).toHaveLength(12);
  for(const biome of Object.keys(DIORAMA_DECOR_PROFILES) as DioramaBiome[]){const decor=createDioramaDecor({seed:13,biome,side:'north',wallLength:256,span:250});expect(decor.cutouts.length).toBeLessThanOrEqual(DIORAMA_DECOR_LIMITS.cutouts);expect(decor.triangleBudget).toBeLessThanOrEqual(DIORAMA_DECOR_LIMITS.triangles);for(const cutout of decor.cutouts)expect(cutout.outline.flat().every(Number.isFinite)).toBe(true);}
 });
 it('keeps extreme desert and both ice profiles devoid of forest, and gives swamps/tropics original separate silhouettes',()=>{
  for(const biome of ['extreme-desert','ice-sheet','sea-ice'] as const){expect(DIORAMA_DECOR_PROFILES[biome].floraCount).toBe(0);const decor=createDioramaDecor({seed:77,biome,side:'west',wallLength:256,span:250});expect(decor.cutouts.some(c=>['oak','pine','birch','trunk','palm','teak'].includes(c.kind))).toBe(false);}
  expect(DIORAMA_DECOR_PROFILES['tropical-rainforest'].species).toContain('teak');expect(DIORAMA_DECOR_PROFILES['temperate-swamp'].species).toContain('willow');
  const scene=createDioramaGeometry(250,250,77,'sea-ice');expect(scene.parts.length).toBeGreaterThan(0);for(const part of scene.parts)part.geometry.dispose();
 });
 it('labels all17 actual terrain definitions and distinguishes deep-water refusal from slow shallow/river passage',()=>{
  expect(Object.values(NATURAL_TERRAIN_BINDINGS_256)).toHaveLength(17);for(const terrain of Object.values(NATURAL_TERRAIN_BINDINGS_256))expect(TERRAIN_LABELS[terrain]).toBeTruthy();
  for(const terrain of ['water-deep','ocean-deep'] as const){expect(terrainSurfaceWalkable({terrain},context)).toBe(false);expect(terrainInspection({terrain},context)).toContain('Passage impossible');}
  expect(terrainSurfaceWalkable({terrain:'river-chest-deep'},context)).toBe(true);expect(terrainAffordanceNote({terrain:'river-chest-deep'},context)).toContain('+4.2');
 });
 it('reads real light/heavy/bridge/culture affordances and preserves terrain below an actual bridge',()=>{
  expect(terrainAffordanceNote({terrain:'marshy-soil'},context)).toContain('Support lÃ©ger uniquement');expect(terrainAffordanceNote({terrain:'soil-natural'},context)).toContain('lourd');
  expect(terrainAffordanceNote({terrain:'sand'},context)).toContain('Sol de culture absent');const bridge={terrain:'mud' as const,bridge:true as const};
  expect(terrainSurfaceLabel(bridge)).toContain('boue');expect(terrainInspection(bridge,context)).toContain('FertilitÃ© : 0 %');expect(bridgeTerrainNote(bridge)).toContain('+1.4');expect(bridge.terrain).toBe('mud');expect(NATURAL_TERRAIN_DEFINITIONS_256.mud.fertility).toBe(0);
  expect(terrainInspection({terrain:'soil'})).toContain('70 %');expect(terrainSurfaceLabel({terrain:'water'})).toBe('Eau infranchissable');
 });
});


it('a real bridge above fertile marshy ground reports zero fertility in both detailed and hover readers',()=>{
 const w=deconstructionCamp(),cell={x:16,z:16},index=cell.z*w.width+cell.x;Object.assign(w,{schemaVersion:256});
 w.tiles[index]={terrain:'marshy-soil',bridge:true};
 expect(mapCellDetails(w,cell,.5)!.rows.find(row=>row.label==='Fertilité')?.value).toBe('0 %');
 expect(mapHoverLines(w,cell,.5)[0]).toContain('fertilité 0 %');expect(w.tiles[index]!.terrain).toBe('marshy-soil');
});

it('the actual impassable collapsed rock takes precedence over preserved bridge/floor, without erasing either',()=>{
 const cases:Tile[]=[
  {terrain:'rock',bridge:true,collapsedRock:{id:7,terrain:'marshy-soil'}},
  {terrain:'rock',floor:'wood-planks',collapsedRock:{id:8,terrain:'grass'}},
 ];
 for(const tile of cases){const before=JSON.stringify(tile);
  expect(terrainSurfaceLabel(tile)).toBe('Roche effondrée infranchissable');
  expect(terrainSurfaceWalkable(tile,context)).toBe(false);expect(terrainAffordanceNote(tile,context)).toContain('Passage impossible');
  expect(terrainInspection(tile,context)).toContain('Fertilité : 0 %');expect(terrainInspection(tile,context)).toContain(tile.bridge?'Pont en bois conservé':'Revêtement conservé');
  expect(JSON.stringify(tile)).toBe(before);
 }
});
