import { footprintCells } from './definitions.ts';
import { resourceAt } from './farming.ts';
import { isRoofed } from './roof-rules.ts';
import { weatherWindFactor,weatherWindOffset } from './weather.ts';
import type { Cell,Orientation,Structure,StructureKind,World } from './types.ts';

export const WIND_RATED_OUTPUT=2300;
export const WIND_MAX_OUTPUT=3450;
const directions=[[0,1],[1,0],[0,-1],[-1,0]] as const;
/** Core blockWind, independently audited from movement, height and fill. */
export const WIND_BLOCKERS:ReadonlySet<StructureKind>=new Set(['wall','door','cooler','heater','wood-generator','wind-turbine','battery']);
export function windClearance(s:Cell&{orientation?:Orientation}):Cell[]{
  const d=directions[s.orientation??0]!,side=directions[((s.orientation??0)+1)%4]!,cells:Cell[]=[];
  for(let along=-6;along<=11;along++){
    if(along===0||along===1)continue;
    for(let across=-3;across<=3;across++)cells.push({x:s.x+d[0]*along+side[0]*across,z:s.z+d[1]*along+side[1]*across});
  }return cells;
}
/** Scoped to a single decision. Roofs/resources remain live; the building
 * footprint capture must not survive destruction or a construction finish. */
export class WindObstructionView {
  private readonly buildings=new Set<number>();
  private readonly world:World;
  constructor(world:World){this.world=world;for(const s of world.structures)if(WIND_BLOCKERS.has(s.kind))for(const c of footprintCells(s))this.buildings.add(c.z*world.width+c.x);}
  blocked(c:Cell):boolean {
    const w=this.world;if(c.x<0||c.z<0||c.x>=w.width||c.z>=w.height)return false;
    const i=c.z*w.width+c.x;
    return w.tiles[i]!.terrain==='rock'||isRoofed(w,i)||this.buildings.has(i)||resourceAt(w,i)?.kind==='tree';
  }
  cells(s:Structure):Cell[]{return windClearance(s).filter(c=>this.blocked(c));}
}
export const windObstructions=(w:World,s:Structure):Cell[]=>new WindObstructionView(w).cells(s);
function hash(n:number):number {n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0;}
function gradient(x:number,seed:number):number {
  const i=Math.floor(x),t=x-i,fade=t*t*t*(t*(t*6-15)+10),a=(hash(i^seed)&1)?t:-t,b=(hash((i+1)^seed)&1)?t-1:1-t;
  return a+(b-a)*fade;
}
/** Four-octave coherent gradient noise with the Core frequency, persistence,
 * lacunarity, scale/bias and clamps. Seeded implementation is independent of
 * Unity/LibNoise; no promise of their exact samples or cross-game RNG stream. */
export function baseWindIntensity(seed:number,elapsedCore:number):number {
  const phase=hash(seed^0x9e3779b9)/4294967296*1024;
  let x=elapsedCore*.00004+phase,amplitude=1,value=0;
  for(let octave=0;octave<4;octave++){value+=gradient(x,hash(seed+octave))*amplitude;x*=2;amplitude*=.5;}
  return Math.max(.04,Math.min(2,value*1.5+.5));
}
const intensityCache=new WeakMap<World,{seed:number;tick:number;origin:number;factor:number;offset:number;value:number}>();
export function windIntensity(w:World):number {
  const state=w.wind;if(!state)return 0;
  const factor=weatherWindFactor(w),offset=weatherWindOffset(w),cached=intensityCache.get(w);
  if(cached&&cached.seed===state.seed&&cached.tick===w.tick&&cached.origin===state.originTick&&cached.factor===factor&&cached.offset===offset)return cached.value;
  const base=baseWindIntensity(state.seed,(w.tick-state.originTick)*10),value=offset>0?offset+(base-.04)/(2-.04)*(2*factor-offset):base*factor;
  intensityCache.set(w,{seed:state.seed,tick:w.tick,origin:state.originTick,factor,offset,value});return value;
}
export function windPowerOutput(w:World,s:Structure,view?:WindObstructionView):number {
  if(s.kind!=='wind-turbine')return 0;
  const count=(view??new WindObstructionView(w)).cells(s).length;
  return WIND_RATED_OUTPUT*Math.min(1.5,windIntensity(w))*Math.max(0,1-count*.2);
}
