import {isBedKind} from './bed-kinds.ts';
import {STRUCTURE_SHOT_FILL} from './combat-content.ts';
import type {ShotGrid} from './combat-space.ts';
import {captureWorldShotGrid} from './combat-world.ts';
import {footprintCells} from './definitions.ts';
import {isRoomDoor} from './door-rules.ts';
import type {World} from './types.ts';

interface OpaqueSource {readonly id:number;readonly fill:number;readonly openDoor:boolean}

/** Decision-local visibility capture for occupied furniture comfort.
 *
 * Only comfort calls this capture: clearShotSegment consumes blocksSight, never
 * coverAt. Current frames, resources and ground items all have fill <= .5 and
 * cannot defeat a full structure. Open doors still participate in the full
 * fill/ID contest before their effective opacity becomes zero. Natural rock
 * always wins. Every retained value is an owned primitive or derived array.
 *
 * All physical beds are included, not only today's users. A bedside table is
 * cardinal to the head. A dresser is within 6 of the two true footprint
 * centres; each current bed/dresser extends at most .5 from its centre. Thus
 * every eligible endpoint and its segment lie inside beds' bounds + 7.
 *
 * Caller owns the same synchronous lifetime as the old furniture shot capture:
 * discard after construction, deconstruction, mining or other sight mutation.
 * This is deliberately not a combat cover/acquisition surface.
 */
export function captureFurnitureSight(world:World):ShotGrid {
  const {width,height}=world;
  let minX=width,minZ=height,maxX=-1,maxZ=-1;
  for(const structure of world.structures)if(isBedKind(structure.kind)) {
    for(const cell of footprintCells(structure)) {
      minX=Math.min(minX,cell.x);minZ=Math.min(minZ,cell.z);
      maxX=Math.max(maxX,cell.x);maxZ=Math.max(maxZ,cell.z);
    }
  }
  const hasBeds=maxX>=minX&&maxZ>=minZ;
  minX=Math.max(0,minX-7);minZ=Math.max(0,minZ-7);
  maxX=Math.min(width-1,maxX+7);maxZ=Math.min(height-1,maxZ+7);
  const columns=hasBeds?maxX-minX+1:0,rows=hasBeds?maxZ-minZ+1:0;
  // Widely dispersed beds make the sparse Map less useful. Keep the existing
  // dense capture for broad windows, with the same fail-closed bounds.
  if(columns*rows>width*height/2)return captureWorldShotGrid(world,{minX,minZ,maxX,maxZ});
  const rocks=new Uint8Array(columns*rows),sources=new Map<number,OpaqueSource>();
  const valid=(x:number,z:number)=>hasBeds&&Number.isInteger(x)&&Number.isInteger(z)&&x>=minX&&z>=minZ&&x<=maxX&&z<=maxZ;
  const index=(x:number,z:number)=>(z-minZ)*columns+x-minX;
  for(let z=minZ;hasBeds&&z<=maxZ;z++)for(let x=minX;x<=maxX;x++) {
    if(world.tiles[z*width+x]!.terrain==='rock')rocks[index(x,z)]=1;
  }
  for(const structure of world.structures) {
    const fill=STRUCTURE_SHOT_FILL[structure.kind];
    if(fill<=.99)continue;
    let source:OpaqueSource|undefined;
    for(const cell of footprintCells(structure)) {
      if(!valid(cell.x,cell.z))continue;
      const key=index(cell.x,cell.z);
      if(rocks[key])continue;
      const previous=sources.get(key);
      if(previous&&(fill<previous.fill||fill===previous.fill&&structure.id>=previous.id))continue;
      source??=Object.freeze({id:structure.id,fill,openDoor:isRoomDoor(structure.kind)&&!!structure.door?.open});
      sources.set(key,source);
    }
  }
  return Object.freeze({width,height,
    blocksSight(x:number,z:number):boolean {
      if(!valid(x,z))return true;
      const key=index(x,z),source=sources.get(key);
      return rocks[key]===1||source!==undefined&&!source.openDoor;
    },
    coverAt:()=>undefined,
  });
}
