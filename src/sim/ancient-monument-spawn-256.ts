import {unpublishedAncientGeneration256} from './ancient-generation-frontier-256.ts';
import {resolveMonumentRuin256} from './ancient-monument-ruin-256.ts';
import {monumentCells256,monumentRect256,rectCenter256,type MonumentCatalogue256,type MonumentBuildable256} from './ancient-monument-plan-256.ts';
import {commitActualAncientLayout256,type ActualAncientLayout256} from './local-ancient-commit-256.ts';
import {terrainSupportsAffordance256,terrainSupportsFloor256} from './natural-terrain-runtime-256.ts';
import {buildingSupportNeed256} from './bridge-rules.ts';
import {footprintCells} from './definitions.ts';
import {newDoorState} from './door-rules.ts';
import {NATURAL_MINEABLE_DEFS_256,actualMineableDef256} from './local-mineable-owner-256.ts';
import {scatterAncient750256,type AncientRect256,type AncientPlacementContext256} from './local-ancient-placement-256.ts';
import {CORE_MONUMENT_CATALOGUE_256} from './ancient-monument-plan-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {MonumentRandom256} from './ancient-monument-damage-256.ts';
import type {World,Structure} from './types.ts';
/** ROOT orchestration supplies its one already selected step stream. Common
 * Camp and Base_Player both call this; it never calls the Shrine generator. */
export function generateMonumentRuins750256(w:World,context:AncientPlacementContext256,random:WorldGenerationRandom,catalogue:MonumentCatalogue256=CORE_MONUMENT_CATALOGUE_256) {
 return scatterAncient750256(w,'ruins',context,random,(rect,same)=>spawnMonumentRuin256(w,rect,catalogue,same));
}
/** Normal Spawn on the fresh actual map. Failed entities are skipped by their
 * actual support/blocker checks; they are never replaced with another draw. */
export function spawnMonumentRuin256(w:World,rect:AncientRect256,catalogue:MonumentCatalogue256,random:MonumentRandom256):'committed'|'scatter-noop' {
 if(!unpublishedAncientGeneration256(w,true))throw Error('MonumentRuin requires its actual unpublished Site3 generation frontier');
 return spawnResolvedMonumentRuin256(w,rect,resolveMonumentRuin256(rect.maxX-rect.minX+1,rect.maxZ-rect.minZ+1,catalogue,random));
}
/** The SAME actual750 Spawn/commit, factored from resolution so the caller can
 * assert an already resolved nonzero door rotation without another RNG run. */
export function spawnResolvedMonumentRuin256(w:World,rect:AncientRect256,rows:readonly MonumentBuildable256[]):'committed'|'scatter-noop' {
 if(!unpublishedAncientGeneration256(w,true))throw Error('MonumentRuin requires its actual unpublished Site3 generation frontier');
 const center=rectCenter256(rect),fromNextId=w.nextId,layout:ActualAncientLayout256={fromNextId,nextId:fromNextId,structures:[],floors:[],roofs:[],vanishMineables:[]};
 const natural=new Set<string>(Object.values(NATURAL_MINEABLE_DEFS_256)),inMap=(x:number,z:number)=>x>=0&&z>=0&&x<w.width&&z<w.height;
 const hasNatural=(x:number,z:number)=>inMap(x,z)&&w.tiles[z*w.width+x]!.terrain==='rock'&&natural.has(actualMineableDef256(w.tiles[z*w.width+x]!)??'');
 const spawnGate=(b:MonumentBuildable256,x:number,z:number)=>{const r=monumentRect256(b);for(let dx=r.minX-1;dx<=r.maxX+1;dx++)for(let dz=r.minZ-1;dz<=r.maxZ+1;dz++){if(dx!==r.minX-1&&dx!==r.maxX+1&&dz!==r.minZ-1&&dz!==r.maxZ+1)continue;if(inMap(x+dx,z+dz)&&!hasNatural(x+dx,z+dz))return true;}return false;};
 const occupied=new Set(w.structures.flatMap(s=>footprintCells(s).map(p=>p.z*w.width+p.x)));
 // Stable SpawnOrder=1 floors, then SpawnOrder=2 things. No ancient roof is
 // constructed by RuinsSimple's buildRoofsInstantly=false.
 for(const b of [...rows.filter(b=>b.type==='floor'),...rows.filter(b=>b.type==='thing')]){
  const x=center.x+b.x,z=center.z+b.z;if(!spawnGate(b,x,z))continue;
  if(b.type==='floor'){
   if(!inMap(x,z))continue;const cell=z*w.width+x,t=w.tiles[cell]!;if(t.terrain==='rock'||t.collapsedRock||t.bridge||!terrainSupportsFloor256(t,w)||w.structures.some(s=>s.kind==='wall'&&footprintCells(s).some(p=>p.x===x&&p.z===z)))continue;layout.floors.push({cell,floor:b.kind});continue;
  }
  const original:Structure={id:layout.nextId,kind:b.kind,x,z,orientation:b.kind==='door'?0:b.orientation,footprint:'standard',material:b.material,factionId:null,...(['table','table-square','sarcophagus'].includes(b.kind)?{quality:'normal' as const}:{}),...(b.kind==='sarcophagus'?{grave:{colonists:true,strangers:false}}:{}),...(b.kind==='door'?{door:newDoorState(w.tick)}:{}),...(b.hitPoints<b.maxHitPoints?{damage:b.maxHitPoints-b.hitPoints}:{})};
  const need=buildingSupportNeed256(original),cells=monumentCells256({...b,x,z});if(!need||cells.some(p=>!inMap(p.x,p.z)||occupied.has(p.z*w.width+p.x)||w.tiles[p.z*w.width+p.x]!.terrain==='rock'||w.tiles[p.z*w.width+p.x]!.collapsedRock||!terrainSupportsAffordance256(w.tiles[p.z*w.width+p.x]!,need,w)||w.resources.some(r=>r.x===p.x&&r.z===p.z)))continue;
  if(!Number.isSafeInteger(layout.nextId+1))throw Error('Actual ancient identity space exhausted');layout.nextId++;layout.structures.push(original);for(const p of cells)occupied.add(p.z*w.width+p.x);
 }
 if(!layout.structures.length&&!layout.floors.length)return 'scatter-noop';
 const result=commitActualAncientLayout256(w,layout,true);if(!result.ok)throw Error(`Actual MonumentRuin commit refused: ${result.reason}`);return 'committed';
}
