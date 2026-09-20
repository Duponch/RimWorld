import { footprintCells } from './definitions.ts';
import { structureFlammability,pileFlammability,resourceFlammability } from './thing-damage-rules.ts';
import { firePosition } from './fire-rules.ts';
import { FLOOR_DEFINITIONS } from './flooring.ts';
import type { Cell,MaterialPile,Resource,Structure,World } from './types.ts';
export type FireTarget={kind:'structure';value:Structure}|{kind:'pile';value:MaterialPile}|{kind:'resource';value:Resource};
const index=(world:World,c:Cell)=>c.z*world.width+c.x;
/** One synchronous fire batch, discarded after any destruction. No full tile scan. */
export class FireContent {
  private contents=new Map<number,FireTarget[]>();
  private solids=new Set<number>();
  readonly world:World;
  constructor(world:World){
    this.world=world;
    const add=(c:Cell,t:FireTarget)=>{const key=index(world,c),list=this.contents.get(key);if(list)list.push(t);else this.contents.set(key,[t]);};
    for(const r of world.resources)if(r.kind!=='rock')add(r,{kind:'resource',value:r});
    for(const p of world.piles)if(p.owner.type==='ground')add(p.owner,{kind:'pile',value:p});
    for(const s of world.structures)for(const c of footprintCells(s)){add(c,{kind:'structure',value:s});if(['wall','door','cooler'].includes(s.kind))this.solids.add(index(world,c));}
    for(const p of world.packed)if(p.owner.type==='ground')add(p.owner,{kind:'structure',value:p.building});
  }
  inside(c:Cell):boolean{return Number.isInteger(c.x)&&Number.isInteger(c.z)&&c.x>=0&&c.z>=0&&c.x<this.world.width&&c.z<this.world.height;}
  solid(c:Cell):boolean{return !this.inside(c)||this.world.tiles[index(this.world,c)]!.terrain==='rock'||this.solids.has(index(this.world,c));}
  allTargets(c:Cell):FireTarget[]{return this.inside(c)?this.contents.get(index(this.world,c))??[]:[];}
  targets(c:Cell):FireTarget[]{
    if(!this.inside(c)||['water','rock'].includes(this.world.tiles[index(this.world,c)]!.terrain))return [];
    const list=this.contents.get(index(this.world,c))??[];
    // Full edifices shield other content, including the separate conduit layer.
    const full=list.find(t=>t.kind==='structure'&&['wall','door','cooler'].includes(t.value.kind));
    return (full?[full]:list).filter(t=>targetFlammability(t)>=.01);
  }
  chance(c:Cell):number {
    if(!this.inside(c)||this.world.fires?.items.some(f=>firePosition(this.world,f)?.x===c.x&&firePosition(this.world,f)?.z===c.z))return 0;
    return this.fuel(c);
  }
  floorFuel(c:Cell):number {const floor=this.inside(c)&&!this.solids.has(index(this.world,c))&&this.world.tiles[index(this.world,c)]!.floor;return floor?FLOOR_DEFINITIONS[floor].flammability:0;}
  fuel(c:Cell):number{return this.targets(c).reduce((max,t)=>Math.max(max,targetFlammability(t)),this.floorFuel(c));}
  line(a:Cell,b:Cell):boolean {
    // Short exact grid traversal. Target may itself be a burning solid.
    let x=a.x,z=a.z;const dx=Math.abs(b.x-x),dz=Math.abs(b.z-z),sx=Math.sign(b.x-x),sz=Math.sign(b.z-z);let err=dx-dz;
    while(x!==b.x||z!==b.z){const oldX=x,oldZ=z,e=err*2;if(e>-dz){err-=dz;x+=sx;}if(e<dx){err+=dx;z+=sz;}
      if(x!==oldX&&z!==oldZ&&this.solid({x,z:oldZ})&&this.solid({x:oldX,z}))return false;
      if((x!==b.x||z!==b.z)&&this.solid({x,z}))return false;
    }return true;
  }
}
export const targetFlammability=(t:FireTarget)=>t.kind==='structure'?structureFlammability(t.value):t.kind==='resource'?resourceFlammability(t.value):pileFlammability(t.value);
