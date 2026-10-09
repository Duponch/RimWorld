import { isPowerActive } from './power-rules.ts';
import { empStructureActive } from './emp-state.ts';
import { siteStones } from './geology.ts';
import type { Cell,World } from './types.ts';

export type DeepResourceKind='steel'|'gold'|'silver'|'plasteel';
export interface DeepResourceCell {index:number;item:DeepResourceKind;count:number}
export interface DeepResourceState {adoptedAt:number;rng:number;discoveries:number;cells:DeepResourceCell[]}
export const DEEP_RESOURCES:Readonly<Record<DeepResourceKind,{weight:number;portion:number;min:number;max:number}>>=Object.freeze({
  steel:{weight:4,portion:45,min:20,max:30},gold:{weight:.5,portion:8,min:1,max:4},
  silver:{weight:.5,portion:70,min:2,max:10},plasteel:{weight:1,portion:10,min:2,max:10},
});
export function deepSeed(seed:number,salt:number):number {
  let n=(seed^salt)>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);
  return (n^(n>>>16))>>>0||1;
}
export function deepRandom(state:{rng:number}):number {
  let n=state.rng;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0||1;return state.rng/0x100000000;
}
export function adoptDeepResources(world:World):void {
  if(world.schemaVersion>=215&&!world.deepResources)world.deepResources={adoptedAt:world.tick,rng:deepSeed(world.seed,0x280d33f),discoveries:0,cells:[]};
}
export function deepResourceAt(world:Pick<World,'width'|'height'|'deepResources'>,cell:Cell):DeepResourceCell|undefined {
  if(cell.x<0||cell.z<0||cell.x>=world.width||cell.z>=world.height)return;
  const index=cell.z*world.width+cell.x,cells=world.deepResources?.cells;if(!cells)return;
  let low=0,high=cells.length-1;while(low<=high){const mid=(low+high)>>>1,c=cells[mid]!;
    if(c.index===index)return c;if(c.index<index)low=mid+1;else high=mid-1;}
}
/** Equal-distance offsets use a stable local x,z order, rather than relying on
 * the unspecified tie order of Core's List.Sort. The first21 have distance²≤5. */
export const DEEP_RADIAL:readonly Cell[]=Object.freeze(Array.from({length:121},(_,i)=>({x:i%11-5,z:Math.floor(i/11)-5}))
  .sort((a,b)=>a.x*a.x+a.z*a.z-b.x*b.x-b.z*b.z||a.x-b.x||a.z-b.z));
export function nextDeepResource(world:World,drill:Cell):({cell:Cell}&DeepResourceCell)|undefined {
  for(const offset of DEEP_RADIAL.slice(0,21)){
    const cell={x:drill.x+offset.x,z:drill.z+offset.z},resource=deepResourceAt(world,cell);
    if(resource)return {...resource,cell};
  }
}
export function deepRockItem(world:World,cell:Cell):`${import('./geology.ts').StoneKind}-chunk` {
  const tile=world.tiles[cell.z*world.width+cell.x],stones=world.site?.stones??siteStones(world.seed);
  const stone=tile?.stone??stones[deepSeed(world.seed,cell.z*world.width+cell.x)%stones.length]!;
  return `${stone}-chunk`;
}
export function deepScannerOverlayPowered(world:World):boolean {
  return world.schemaVersion>=215&&world.structures.some(s=>s.kind==='ground-scanner'&&isPowerActive(s)&&!empStructureActive(s,world.tick*10));
}
export function addDeepDeposit(world:World,item:DeepResourceKind,cells:readonly Cell[],count=300):number {
  if(world.schemaVersion<215||!world.deepResources||!Object.hasOwn(DEEP_RESOURCES,item)||!Number.isInteger(count)||count<1||count>300)return 0;
  const occupied=new Set(world.deepResources.cells.map(c=>c.index)),added:DeepResourceCell[]=[];
  for(const c of cells){const index=c.z*world.width+c.x;
    if(!Number.isInteger(c.x)||!Number.isInteger(c.z)||c.x<0||c.z<0||c.x>=world.width||c.z>=world.height||occupied.has(index))continue;
    occupied.add(index);added.push({index,item,count});
  }
  if(added.length)world.deepResources.cells=[...world.deepResources.cells,...added].sort((a,b)=>a.index-b.index);
  return added.length;
}
function canScatter(world:World,c:Cell):boolean {
  return c.x>=5&&c.z>=5&&c.x<world.width-5&&c.z<world.height-5&&world.tiles[c.z*world.width+c.x]?.terrain!=='water'&&!deepResourceAt(world,c);
}
/** Discovery uses the world's prospective private stream. Existing ore is never
 * overwritten; the clipped irregular lump may contain fewer than n cells. */
export function discoverDeepDeposit(world:World):boolean {
  const state=world.deepResources;if(!state||!Number.isSafeInteger(state.discoveries+1))return false;
  const centers:Cell[]=[];
  for(let z=10;z<world.height-10;z++)for(let x=10;x<world.width-10;x++)if(canScatter(world,{x,z}))centers.push({x,z});
  if(!centers.length)return false;
  const preview={rng:state.rng},center=centers[Math.floor(deepRandom(preview)*centers.length)]!;
  let choice=deepRandom(preview)*6,item:DeepResourceKind='plasteel';
  for(const kind of ['steel','gold','silver','plasteel'] as const){choice-=DEEP_RESOURCES[kind].weight;if(choice<0){item=kind;break;}}
  const def=DEEP_RESOURCES[item],n=def.min+Math.floor(deepRandom(preview)*(def.max-def.min+1));
  const lump=new Map<number,Cell>();
  for(const d of DEEP_RADIAL.slice(0,2*n)){const c={x:center.x+d.x,z:center.z+d.z};if(c.x>=0&&c.z>=0&&c.x<world.width&&c.z<world.height)lump.set(c.z*world.width+c.x,c);}
  while(lump.size>n){let minimum=5,edge:number[]=[];
    for(const [i,c] of lump){let neighbors=0;for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]])if(lump.has((c.z+dz!)*world.width+c.x+dx!))neighbors++;
      if(neighbors<minimum){minimum=neighbors;edge=[i];}else if(neighbors===minimum)edge.push(i);}
    lump.delete(edge[Math.floor(deepRandom(preview)*edge.length)]!);
  }
  const cells=[...lump.values()].filter(c=>canScatter(world,c));if(!cells.length)return false;
  addDeepDeposit(world,item,cells);state.rng=preview.rng;state.discoveries++;return true;
}
