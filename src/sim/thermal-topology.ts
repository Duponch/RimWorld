import type { World } from './types.ts';

export interface ThermalRoom {cells:number[];unroofed:number;equalize:number[];door?:boolean;isolatedDoor?:boolean}
export interface ThermalDoor {id:number;cell:number;neighbors:number[]}
export interface ThermalLayout {rooms:ThermalRoom[];doors:ThermalDoor[];indices:Int32Array}
const directions=[[1,0],[-1,0],[0,1],[0,-1]] as const;

/** Only covered components can retain air. A connected witness with 3*unroofed
 * >= ALL roof cells proves outdoor temperature without exploring the whole map.
 * Every cell used by that proof (including barriers) is rechecked on each read.
 * Unvisited mutations cannot invalidate it; no tick/array-identity shortcut. */
export class ThermalTopologyCache {
  private layout?:ThermalLayout;
  private key='';
  private checks=new Map<number,number>();
  read(world:World):ThermalLayout {
    const roofs=new Set(world.roofing?.constructed??[]),doors=world.structures.filter(s=>s.kind==='door');
    const key=[world.width,world.height,...roofs,'doors',...doors.map(s=>s.id+'@'+s.x+':'+s.z)].join(',');
    const buildings=new Map(world.structures.filter(s=>s.kind==='wall'||s.kind==='cooler'||s.kind==='door').map(s=>[s.z*world.width+s.x,s.kind==='door'?2:1]));
    const kind=(i:number)=>buildings.get(i)??(world.tiles[i]!.terrain==='rock'?1:0);
    if(this.layout&&key===this.key&&[...this.checks].every(([i,k])=>kind(i)===k))return this.layout;
    const checks=new Map<number,number>();
    const read=(i:number)=>{const k=kind(i);checks.set(i,k);return k;};
    const indexAt=(x:number,z:number)=>x<0||z<0||x>=world.width||z>=world.height?undefined:z*world.width+x;
    const neighbors=(i:number)=>directions.flatMap(([dx,dz])=>{const n=indexAt(i%world.width+dx,Math.floor(i/world.width)+dz);return n===undefined?[]:[n];});
    const visited=new Set<number>(),rooms:ThermalRoom[]=[];
    for(const root of roofs) {
      const rootKind=read(root);
      if(rootKind===2){rooms.push({cells:[root],unroofed:0,equalize:[],door:true,isolatedDoor:!neighbors(root).some(i=>read(i)===0)});continue;}
      if(rootKind||visited.has(root))continue;
      const cells:number[]=[],seen=new Set([root]),queue=[root];let unroofed=0,outdoor=false;
      for(let head=0;head<queue.length;head++) {
        const i=queue[head]!;cells.push(i);visited.add(i);if(!roofs.has(i))unroofed++;
        const x=i%world.width,z=Math.floor(i/world.width);
        if(!x||!z||x===world.width-1||z===world.height-1||unroofed*3>=roofs.size){outdoor=true;break;}
        for(const next of neighbors(i))if(read(next)===0&&!seen.has(next)){seen.add(next);queue.push(next);}
      }
      if(!outdoor&&unroofed*4<cells.length)rooms.push({cells:cells.sort((a,b)=>a-b),unroofed,equalize:[]});
    }
    rooms.sort((a,b)=>a.cells[0]!-b.cells[0]!);
    const indices=new Int32Array(world.width*world.height);indices.fill(-1);
    rooms.forEach((r,id)=>r.cells.forEach(i=>indices[i]=id));
    for(let id=0;id<rooms.length;id++)if(!rooms[id]!.door||rooms[id]!.isolatedDoor)for(const i of rooms[id]!.cells) {
      const x=i%world.width,z=Math.floor(i/world.width);
      for(const [dx,dz] of directions) {
        const near=indexAt(x+dx,z+dz),far=indexAt(x+2*dx,z+2*dz);
        if(near===undefined||far===undefined||indices[near]===id||indices[far]===id)continue;
        const nearKind=read(near);
        if(nearKind===0||nearKind===2&&neighbors(near).some(n=>read(n)===0&&indices[n]!==id))continue;
        if(neighbors(far).some(n=>indices[n]===id))continue;
        if(read(far)===1)indices[far]=-2;
        rooms[id]!.equalize.push(far);
      }
    }
    const portals=doors.map(s=>({id:s.id,cell:s.z*world.width+s.x,neighbors:[...new Set(neighbors(s.z*world.width+s.x).filter(i=>read(i)!==1).map(i=>indices[i]!))]}));
    this.key=key;this.checks=checks;return this.layout={rooms,doors:portals,indices};
  }
}
