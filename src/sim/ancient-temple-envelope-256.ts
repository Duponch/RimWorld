import {unpublishedAncientGeneration256} from './ancient-generation-frontier-256.ts';
import {resolveAncientTempleMonument256} from './ancient-monument-ruin-256.ts';
import {occupiedMonumentRect256,largestMonumentRect256,rectCells256,rectCenter256,thingAt256,floorAt256,monumentCells256,type MonumentBuildable256,type MonumentCatalogue256,type MonumentRect256} from './ancient-monument-plan-256.ts';
import {monumentRandomOrder256,type MonumentRandom256} from './ancient-monument-damage-256.ts';
import {ancientGenerationGround256,type AncientRect256} from './local-ancient-placement-256.ts';
import {commitActualAncientLayout256,type ActualAncientLayout256} from './local-ancient-commit-256.ts';
import {terrainSupportsAffordance256,terrainSupportsFloor256} from './natural-terrain-runtime-256.ts';
import {removedMineableTile256} from './local-mineable-owner-256.ts';
import {buildingSupportNeed256} from './bridge-rules.ts';
import {footprintCells} from './definitions.ts';
import {newDoorState} from './door-rules.ts';
import type {World,Structure,Cell} from './types.ts';

/** Source FindBiggestRect: three separately shuffled scans, strict area >
 * preserves the first equal-area candidate. Predicate observes the sketch,
 * including terrain beneath furniture; walls alone exclude interior cells. */
export function largestAncientTempleInterior256(rows:readonly MonumentBuildable256[],random:MonumentRandom256):MonumentRect256|null {
 if(!rows.length)return null;const outer=occupiedMonumentRect256(rows),copy=[...rows];let result:MonumentRect256|null=null,area=0;
 for(let pass=0;pass<3;pass++){const processed=new Set<string>();for(const cell of monumentRandomOrder256(rectCells256(outer),random)){
  const rect=largestMonumentRect256(cell,outer,processed,c=>!!floorAt256(copy,c.x,c.z)&&!thingAt256(copy,c.x,c.z).some(t=>t.kind==='wall'));
  if(!rect)continue;const next=(rect.maxX-rect.minX+1)*(rect.maxZ-rect.minZ+1);if(next>area){area=next;result=rect;}
 }}return result;
}

/** Actual Sketch suggested-roof rule: flood non-roof-holders inside the
 * occupied rectangle, discard every region touching its edge, then include
 * its eight adjacent roof holders. No roof-reach approximation or roof RNG. */
export function ancientTempleRoofCells256(rows:readonly MonumentBuildable256[]):Cell[]{
 if(!rows.length)return [];const outer=occupiedMonumentRect256(rows),copy=[...rows],seen=new Set<string>(),yielded=new Set<string>(),result:Cell[]=[];
 const key=(c:Cell)=>`${c.x},${c.z}`,inside=(c:Cell)=>c.x>=outer.minX&&c.x<=outer.maxX&&c.z>=outer.minZ&&c.z<=outer.maxZ;
 // XML DoorBase, Wall and Column hold roofs among these nine actual kinds.
 const holds=(c:Cell)=>thingAt256(copy,c.x,c.z).some(t=>t.kind==='wall'||t.kind==='door'||t.kind==='column');
 for(const start of rectCells256(outer)){if(seen.has(key(start))||holds(start))continue;const pending=[start],room:Cell[]=[];seen.add(key(start));let edge=false;
  while(pending.length){const c=pending.pop()!;room.push(c);edge ||= c.x===outer.minX||c.x===outer.maxX||c.z===outer.minZ||c.z===outer.maxZ;
   for(const [dx,dz] of [[-1,0],[0,-1],[1,0],[0,1]]){const q={x:c.x+dx!,z:c.z+dz!};if(inside(q)&&!seen.has(key(q))&&!holds(q)){seen.add(key(q));pending.push(q);}}
  }if(edge)continue;
  for(const c of room)for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const q={x:c.x+dx,z:c.z+dz};if(inside(q)&&!yielded.has(key(q))&&(dx===0&&dz===0||holds(q))){yielded.add(key(q));result.push(q);}}
 }return result;
}

function assertFreshTemple256(w:World):void {
 if(!unpublishedAncientGeneration256(w,true))throw Error('AncientTemple requires the actual unpublished phase750 map');
}
/** Normal Sketch Spawn with wipe=true and clearEdificeWhereFloor=true on the
 * real admitted fresh map. Natural Mineables are removed by their exact IDs,
 * never mined/refunded. Unsupported non-natural wipe owners refuse staging. */
export function prepareAncientTempleLayout256(w:World,rect:AncientRect256,rows:readonly MonumentBuildable256[]):ActualAncientLayout256 {
 assertFreshTemple256(w);const center=rectCenter256(rect),layout:ActualAncientLayout256={fromNextId:w.nextId,nextId:w.nextId,structures:[],floors:[],roofs:[],vanishMineables:[]},removed=new Set<number>(),occupied=new Set<number>();
 const inMap=(c:Cell)=>Number.isInteger(c.x)&&Number.isInteger(c.z)&&c.x>=0&&c.z>=0&&c.x<w.width&&c.z<w.height;
 const existing=new Set(w.structures.flatMap(b=>footprintCells(b).map(c=>c.z*w.width+c.x)));
 const stagedTile=(c:Cell)=>{const t=w.tiles[c.z*w.width+c.x]!;return removed.has(c.z*w.width+c.x)?ancientGenerationGround256(t):t;};
 const stageNatural=(c:Cell)=>{const cell=c.z*w.width+c.x,t=w.tiles[cell]!;if(t.mineable){if(!removedMineableTile256(t,t.mineable.id))throw Error('Temple wipe encountered an invalid original Mineable owner');if(!removed.has(cell)){removed.add(cell);layout.vanishMineables.push({cell,expectedId:t.mineable.id});}}};
 // Core clears the layerable floor edifices before floor/thing Spawn order.
 for(const b of rows)if(b.type==='floor'){const c={x:b.x+center.x,z:b.z+center.z};if(!inMap(c))continue;if(existing.has(c.z*w.width+c.x))throw Error('Temple floor wipe requires the real generated edifice transaction');stageNatural(c);}
 for(const b of rows.filter(b=>b.type==='floor')){
  const c={x:b.x+center.x,z:b.z+center.z};if(!inMap(c))continue;const cell=c.z*w.width+c.x,t=stagedTile(c);
  if(t.terrain!=='rock'&&!t.collapsedRock&&!t.bridge&&terrainSupportsFloor256(t,w))layout.floors.push({cell,floor:b.kind});
 }
 for(const b of rows)if(b.type==='thing'){
  const c={x:center.x+b.x,z:center.z+b.z},cells=monumentCells256({...b,...c});if(cells.some(p=>!inMap(p)))continue;
  if(cells.some(p=>existing.has(p.z*w.width+p.x)))throw Error('Temple Thing wipe requires the real generated edifice transaction');
  const original:Structure={id:layout.nextId,kind:b.kind,...c,orientation:b.kind==='door'?0:b.orientation,footprint:'standard',material:b.material,factionId:null,
   ...(['table','table-square','sarcophagus'].includes(b.kind)?{quality:'normal' as const}:{}),...(b.kind==='sarcophagus'?{grave:{colonists:true,strangers:false}}:{}),...(b.kind==='door'?{door:newDoorState(w.tick)}:{})};
  const need=buildingSupportNeed256(original);if(!need||cells.some(p=>{const t=ancientGenerationGround256(w.tiles[p.z*w.width+p.x]!);return occupied.has(p.z*w.width+p.x)||t.terrain==='rock'||t.collapsedRock||!terrainSupportsAffordance256(t,need,w);}))continue;
  for(const p of cells)stageNatural(p);if(!Number.isSafeInteger(layout.nextId+1))throw Error('Temple Thing identity exhausted');layout.nextId++;layout.structures.push(original);for(const p of cells)occupied.add(p.z*w.width+p.x);
 }
 layout.roofs=ancientTempleRoofCells256(rows).map(c=>({x:c.x+center.x,z:c.z+center.z})).filter(inMap).map(c=>c.z*w.width+c.x);return layout;
}

/** This commits a real room, not ScatterShrines completion. The caller must
 * still resolve its exact interior contents, owners and warning producers.
 * Any later dependency failure discards the whole unpublished candidate. */
export function spawnAncientTempleEnvelope256(w:World,rect:AncientRect256,catalogue:MonumentCatalogue256,random:MonumentRandom256){
 assertFreshTemple256(w);const rows=resolveAncientTempleMonument256(rect.maxX-rect.minX+1,rect.maxZ-rect.minZ+1,catalogue,random);
 return spawnResolvedAncientTempleEnvelope256(w,rect,rows,random);
}
/** The actual already resolved sketch is committed once; useful at a yielded
 * preparation boundary. No rewind or second Monument resolution is required. */
export function spawnResolvedAncientTempleEnvelope256(w:World,rect:AncientRect256,rows:readonly MonumentBuildable256[],random:MonumentRandom256){
 const layout=prepareAncientTempleLayout256(w,rect,rows);
 const committed=commitActualAncientLayout256(w,layout,true);if(!committed.ok)throw Error(`Actual AncientTemple layout refused: ${committed.reason}`);
 const center=rectCenter256(rect),inner=largestAncientTempleInterior256(rows,random),walls=rows.filter(b=>b.type==='thing'&&b.kind==='wall');
 const moved=(r:MonumentRect256)=>({minX:r.minX+center.x,minZ:r.minZ+center.z,maxX:r.maxX+center.x,maxZ:r.maxZ+center.z});
 return {rows,committed,interior:inner?moved(inner):null,wallBounds:walls.length?moved({minX:Math.min(...walls.map(c=>c.x)),maxX:Math.max(...walls.map(c=>c.x)),minZ:Math.min(...walls.map(c=>c.z)),maxZ:Math.max(...walls.map(c=>c.z))}):null};
}
