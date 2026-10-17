/** Original visual data bake. No World, clock, random stream or pigment. */
import {unpackRiverWater256,type StoredRiverWater256} from '../sim/river-water-owner-256';
import type {Terrain} from '../sim/types';
const f=Math.fround;
// GenAdjFast reads GenAdj.AdjacentCells, not AdjacentCellsAround.
const ADJACENT=[[0,1],[1,0],[0,-1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]] as const;
export function bakeRiverWater256(values:Float32Array,width:number,height:number,isRiver:(cell:number)=>boolean):Float32Array<ArrayBuffer> {
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<8||height<8||width>400||height>400||values.length!==width*height*2)throw Error('Invalid actual river render extents');
 const pixels=new Float32Array(width*height*2);
 for(let x=0;x<width;x++)for(let z=0;z<height;z++){
  if(!isRiver(z*width+x))continue;
  const source=(x*height+z)*2;let vx=values[source]!,vz=values[source+1]!,count=1;
  for(const [dx,dz] of ADJACENT){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=width||nz>=height)continue;
   // Core repeats the CENTRE IsRiver check: every in-bounds neighbour counts,
   // including dry zero entries. Never renormalize to wet neighbours only.
   const n=(nx*height+nz)*2;vx=f(vx+values[n]!);vz=f(vz+values[n+1]!);count++;
  }
  const target=(z*width+x)*2;pixels[target]=f(vx/count);pixels[target+1]=f(vz/count);
 }
 return pixels;
}
export interface RiverWaterVisualSource256 {
 readonly schemaVersion:number;readonly width:number;readonly height:number;readonly seed:number;
 readonly site?:{readonly revision:number;readonly tileId?:number;readonly mapSeed?:number};
 readonly planet?:{readonly revision:number};readonly riverWater?:StoredRiverWater256;
 readonly campaignMap?:{readonly revision?:number;readonly activeMapId?:number};
 readonly tiles:readonly {readonly terrain:Terrain}[];
}
/** Per-PaintedWater resident image state, not a transport certificate. Confirmed
 * map terrain is immutable during its creation-time WaterInfo bake. */
export class RiverWaterField256 {
 private owner:StoredRiverWater256|undefined;
 private mapKey='';
 width=1;height=1;data=new Float32Array(2);
 adopt(w:RiverWaterVisualSource256):boolean {
  const owner=w.schemaVersion===256&&w.site?.revision===3&&w.planet?.revision===3?w.riverWater:undefined;
  if(!owner)return this.clear();
  const key=JSON.stringify([w.seed,w.site?.tileId,w.site?.mapSeed,w.campaignMap?.revision===2?w.campaignMap.activeMapId:null,w.width,w.height]);
  if(owner===this.owner&&key===this.mapKey)return false;
  if(w.tiles.length!==w.width*w.height)throw Error('River render requires actual local terrain');
  const values=unpackRiverWater256(owner,w.width,w.height);
  const pixels=bakeRiverWater256(values,w.width,w.height,i=>{const t=w.tiles[i]!.terrain;return t==='river-shallow'||t==='river-chest-deep';});
  this.owner=owner;this.mapKey=key;this.width=w.width;this.height=w.height;this.data=pixels;return true;
 }
 clear():boolean {
  if(!this.owner)return false;
  this.owner=undefined;this.mapKey='';this.width=this.height=1;this.data=new Float32Array(2);return true;
 }
}
