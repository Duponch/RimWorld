import {invalidateTerrainJournal} from './terrain-mutation-journal.ts';
import {unpublishedAncientGeneration256} from './ancient-generation-frontier-256.ts';
import {isAncientGeneratedFloor256,type AncientGeneratedFloor256} from './ancient-generated-floor-state-256.ts';
import {terrainSupportsAffordance256} from './natural-terrain-runtime-256.ts';
import {isNaturalTerrain256} from './local-terrain-definitions-256.ts';
import type {AncientRect256} from './local-ancient-placement-256.ts';
import type {Tile,World} from './types.ts';

/** The explicit Shrine FloorFill branch: floorDef supplied, no skip chance,
 * no support-only gate and no filth producer. It sets terrain underneath
 * existing things, rather than wiping an edifice or granting materials.
 * Call only on the real unpublished phase750 map, between resolver actions.
 * This entry requires the actual Shrine scatter's Heavy-ground admission;
 * that is a caller frontier, NOT a gate invented for FloorFill itself.
 * A real foundation plus underGrid needs a wider representation and is
 * refused BEFORE mutation; the current Shrine scatter rejects that terrain. */
export function spawnGeneratedAncientFloor256(w:World,rect:AncientRect256,floor:AncientGeneratedFloor256):void {
 if(!unpublishedAncientGeneration256(w,true)||!isAncientGeneratedFloor256(floor))throw Error('Ancient FloorFill requires the actual unpublished phase750 Site3 map');
 if(![rect.minX,rect.minZ,rect.maxX,rect.maxZ].every(Number.isSafeInteger)||rect.minX<0||rect.minZ<0||rect.maxX>=w.width||rect.maxZ>=w.height||rect.minX>rect.maxX||rect.minZ>rect.maxZ)throw Error('Ancient FloorFill rectangle leaves its actual map');
 const changes:{cell:number;source:Tile;next:Tile}[]=[];
 // CellRect enumeration: z outside, x inside. No RNG or identity allocation.
 for(let z=rect.minZ;z<=rect.maxZ;z++)for(let x=rect.minX;x<=rect.maxX;x++){
  const cell=z*w.width+x,source=w.tiles[cell];
  if(!source||source.bridge||source.collapsedRock)throw Error('Ancient FloorFill foundation/collapsed substrate is not represented at this creation frontier');
  const ground=source.mineable?{...source,terrain:source.mineable.terrain,floor:undefined}: {...source,floor:undefined};
  if(!isNaturalTerrain256(ground.terrain)&&ground.terrain!=='packed-dirt')throw Error('Ancient Shrine floor requires its actual resolved geographic substrate');
  if(!terrainSupportsAffordance256(ground,'Heavy',w))throw Error('Ancient Shrine floor requires the scatter-admitted actual Heavy substrate');
  const next:Tile={...source,floor};
  // The real walkable Heavy substrate is retained across both floor writes.
  // No Mineable/Thing is wiped, and its original owner remains identical.
  changes.push({cell,source,next});
 }
 for(const row of changes)w.tiles[row.cell]=row.next;if(changes.length)invalidateTerrainJournal(w.tiles);
}
