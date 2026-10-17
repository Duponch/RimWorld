/** Primitive mask captured only from the accepted presentation snapshot. */
import {explorationEnabled256,foggedCell256,type ExplorationMap256} from '../sim/exploration-state-256';
export class ExplorationField256 {
 width=1;height=1;enabled=false;data=new Uint8Array([255,0,0,255]);revision=0;
 /** Component ranges for Three Texture.addUpdateRange; empty means no upload. */
 ranges:{start:number;count:number}[]=[];
 adopt(world:ExplorationMap256,reset:boolean,changed:readonly number[]|null):boolean {
  const enabled=explorationEnabled256(world),resize=this.width!==world.width||this.height!==world.height;
  const full=reset||resize||this.enabled!==enabled||changed===null;
  this.ranges=[];
  if(resize){this.width=world.width;this.height=world.height;this.data=new Uint8Array(world.width*world.height*4);}
  const write=(i:number)=>{const at=i*4,value=enabled&&foggedCell256(world,i)?0:255;if(!full&&this.data[at]===value)return;this.data[at]=value;this.data[at+3]=255;this.ranges.push({start:at,count:4});};
  if(full){for(let i=0;i<world.tiles.length;i++)write(i);this.ranges=Array.from({length:this.height},(_,z)=>({start:z*this.width*4,count:this.width*4}));}
  else for(const i of changed??[])write(i);
  this.enabled=enabled;if(!this.ranges.length)return false;
  // Sparse adjacent texels are coalesced within a row (WebGL upload contract), with no per-frame work or new index.
  const ranges=this.ranges.sort((a,b)=>a.start-b.start),out:typeof ranges=[];
  for(const r of ranges){const previous=out[out.length-1];if(previous&&Math.floor(previous.start/(this.width*4))===Math.floor(r.start/(this.width*4))&&previous.start+previous.count>=r.start)previous.count=Math.max(previous.start+previous.count,r.start+r.count)-previous.start;else out.push({...r});}
  this.ranges=out;this.revision++;return true;
 }
 known(x:number,z:number):boolean {return !this.enabled||x<0||z<0||x>=this.width||z>=this.height||this.data[(z*this.width+x)*4]===255;}
}
