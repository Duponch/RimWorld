import {expect,test} from 'vitest';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {removeEmptyCamps} from '../src/sim/world-map-authority.ts';
import {registeredMapPresentation,campaignOnlySummary} from '../src/sim/world-map-presentation.ts';
import {validRegisteredPresentation,validCampaignSummary} from '../src/sim/world-map-projection-save.ts';
import {retiredCampMarkerProjection256,validRetiredCampMarkerProjection256} from '../src/sim/retired-camp-markers-256.ts';
import {readPlanetObjects,readMapRegistryState,readJumpToEntries,retiredCampTileInfo256} from '../src/ui/map-registry-adapter.ts';
import {serializeCampaign} from '../src/sim/serialization.ts';
import {planetTileCount} from '../src/sim/planet-geography-256.ts';
import type {World} from '../src/sim/types.ts';
function metadata(world:World){if(world.campaignMap?.revision!==2)throw Error('Real registered projection missing');return world.campaignMap;}

/** Existing explicit prepared registry, not a played journey or new generator.
 * The empty Camp is an actual registered map; its true removal creates the
 * sole retired record used below. People/goods remain their original owners. */
function retired(){
 const w=registryCamp();w.schemaVersion=256;const camp=preparedMap(w,52,'camp',false),id=w.worldMaps!.sites.find(s=>s.tile===52)!.id;
 expect(camp.pawns).toEqual([]);removeEmptyCamps(w);
 const row=w.worldMaps!.retired.find(r=>r.id===id)!;expect(row).toBeDefined();expect(w.worldMaps!.sites.some(s=>s.id===id)).toBe(false);
 return {w,id,row};
}

test('actual retired Camp projects only scalar markers through local and globe-only confirmed views, without RAW change',()=>{
 const {w,id,row}=retired(),raw=serializeCampaign(w),local=registeredMapPresentation(w)!;
 const expected=[{retiredMapId:id,tile:52,removedAt:row.removedAt,markerUntilCore:row.markerUntilCore}];
 expect(metadata(local).retiredCamps).toEqual(expected);expect(validRegisteredPresentation(local)).toBe(true);
 const summary=campaignOnlySummary(w);expect(summary.retiredCamps).toEqual(expected);expect(validCampaignSummary(summary)).toBe(true);
 expect(summary).not.toHaveProperty('tiles');expect(expected[0]).not.toHaveProperty('map');expect(serializeCampaign(w)).toBe(raw);
 expect(retiredCampMarkerProjection256(w)).toEqual(retiredCampMarkerProjection256(w));expect(serializeCampaign(w)).toBe(raw);
});

test('visibility reads the confirmed clock and expires exactly at the existing marker deadline, leaving its RAW history intact',()=>{
 const {w,row}=retired(),reference=row,rawRow=JSON.stringify(row),end=row.markerUntilCore!;
 // Prepared read boundaries only; this does not play180000 local ticks or
 // claim that the unrelated clinical/owner clocks have advanced.
 w.tick=end/10-1;expect(retiredCampMarkerProjection256(w).retiredCamps).toHaveLength(1);
 w.tick=end/10;expect(retiredCampMarkerProjection256(w)).toEqual({});
 expect(w.worldMaps!.retired.find(r=>r.id===row.id)).toBe(reference);expect(JSON.stringify(row)).toBe(rawRow);
});

test('strict255 preserves absence and refuses future metadata, undefined, hidden fields, getters and extra grid data',()=>{
 const {w}=retired(),value=retiredCampMarkerProjection256(w),ids=new Set(w.worldMaps!.sites.map(m=>m.id)),tiles=new Set(w.worldMaps!.sites.flatMap(m=>m.tile===null?[]:[m.tile])),count=planetTileCount(w.planet!);
 const valid=(v:object,version=256)=>validRetiredCampMarkerProjection256(v,version,w.tick,w.nextId,count,ids,tiles);
 expect(valid({})).toBe(true);expect(valid({},255)).toBe(true);expect(valid(value)).toBe(true);expect(valid(value,255)).toBe(false);expect(valid({retiredCamps:undefined})).toBe(false);
 let reads=0;const accessor={};Object.defineProperty(accessor,'retiredCamps',{enumerable:true,get(){reads++;return value.retiredCamps;}});expect(valid(accessor)).toBe(false);expect(reads).toBe(0);
 const hidden={};Object.defineProperty(hidden,'retiredCamps',{enumerable:false,value:value.retiredCamps});expect(valid(hidden)).toBe(false);
 const future=structuredClone(value);Object.assign(future.retiredCamps![0]!,{tiles:[]});expect(valid(future)).toBe(false);
 const collision=structuredClone(value);collision.retiredCamps![0]!.retiredMapId=w.worldMaps!.rootMapId!;expect(valid(collision)).toBe(false);
});

test('local and mapless transport guards refuse a malformed marker before UI publication',()=>{
 const {w}=retired(),local=structuredClone(registeredMapPresentation(w)!),summary=structuredClone(campaignOnlySummary(w));
 metadata(local).retiredCamps![0]!.markerUntilCore++;expect(validRegisteredPresentation(local)).toBe(false);
 summary.retiredCamps![0]!.tile=planetTileCount(w.planet!);expect(validCampaignSummary(summary)).toBe(false);
});

test('globe selection describes the real marker but maps, jump-to targets and map actions never acquire a ghost Camp',()=>{
 const {w,id}=retired(),view=registeredMapPresentation(w)!,objects=readPlanetObjects(view);
 expect(objects.retiredCamps).toEqual([{retiredMapId:id,tile:52,label:'Camp abandonné · case 52'}]);expect(objects.maps!.some(m=>m.mapId===id)).toBe(false);
 expect(readMapRegistryState(view)!.maps.some(m=>m.id===id)).toBe(false);expect(readJumpToEntries(view).some(e=>e.kind==='map'&&e.id===id)).toBe(false);
 const info=retiredCampTileInfo256(objects.retiredCamps,52);expect(info).toContain('Camp abandonné');expect(info).toContain('Aucune carte locale');expect(info).toContain('30 jours');expect(info).not.toMatch(/Afficher|Entrer/);
 expect(retiredCampTileInfo256(objects.retiredCamps,51)).toBe('');expect(retiredCampTileInfo256(undefined,52)).toBe('');
});
