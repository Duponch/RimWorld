import { advanceCoolers } from './cooler.ts';
import { heatwaveOffset } from './heatwave.ts';
import { applyThermalSources } from './thermal-sources.ts';
import { TICKS_PER_DAY, type Cell, type World } from './types.ts';
import { ThermalTopologyCache, type ThermalLayout } from './thermal-topology.ts';

export interface ThermalRegion {cells:number[];temperature:number}
export interface ThermalState {regions:ThermalRegion[]}
export function outdoorTemperature(input:number|Pick<World,'tick'|'heatwaves'>):number {const tick=typeof input==='number'?input:input.tick;return 21+7*Math.cos(2*Math.PI*(tick%TICKS_PER_DAY/TICKS_PER_DAY+.32))+heatwaveOffset(tick,typeof input==='number'?undefined:input.heatwaves);}
const contexts=new WeakMap<World,ThermalTopologyCache>();
export function thermalLayout(world:World):ThermalLayout {
  let cache=contexts.get(world);if(!cache){cache=new ThermalTopologyCache();contexts.set(world,cache);}return cache.read(world);
}
const sameCells=(a:number[],b:number[])=>a===b||a.length===b.length&&a.every((v,i)=>v===b[i]);

/** Cells, not a transient room ID, carry the thermal history across save/rebuild.
 * A split inherits its old air; merging mixes by overlapping air-cell volume. */
export function reconcileTemperature(world:World,layout=thermalLayout(world)):ThermalLayout {
  const old=world.thermal?.regions??[];
  if(old.length===layout.rooms.length&&old.every((r,i)=>sameCells(r.cells,layout.rooms[i]!.cells)))return layout;
  if(!layout.rooms.length){delete world.thermal;return layout;}
  const previous=new Map<number,number>();for(const r of old)for(const i of r.cells)previous.set(i,r.temperature);
  const outside=outdoorTemperature(world);
  world.thermal={regions:layout.rooms.map(r=>({cells:r.cells,temperature:r.cells.reduce((sum,i)=>sum+(previous.get(i)??outside),0)/r.cells.length}))};
  return layout;
}

export class TemperatureView {
  private temperatures?:Map<number,number>;
  private layout?:ThermalLayout;
  private regions:ThermalRegion[];
  readonly outside:number;
  constructor(world:World,layout?:ThermalLayout) {
    this.outside=outdoorTemperature(world);this.layout=layout;this.regions=world.thermal?.regions??[];
    if(!layout){this.temperatures=new Map();for(const r of this.regions)for(const i of r.cells)this.temperatures.set(i,r.temperature);}
  }
  at(world:Pick<World,'width'>,cell:Cell):number {const i=cell.z*world.width+cell.x;return this.layout?this.regions[this.layout.indices[i]!]?.temperature??this.outside:this.temperatures!.get(i)??this.outside;}
}

/** Ten Core ticks per local step. Deterministic mean wall exchange, thin roofs
 * and door conductance; no weather, thick roofs or radiation physics implied. */
export function advanceTemperature(world:World,layout:ThermalLayout):void {
  const regions=world.thermal?.regions;if(!regions?.length){advanceCoolers(world,layout,outdoorTemperature(world));return;}
  const outside=outdoorTemperature(world),previous=regions.map(r=>r.temperature);
  const air=(id:number)=>id>=0?previous[id]!:outside;
  for(let id=0;id<regions.length;id++) {
    const r=regions[id]!,shape=layout.rooms[id]!,difference=outside-r.temperature;
    if(shape.door)continue;
    const adjusted=Math.abs(difference)<100?difference:Math.sign(difference)*100+5*(difference-Math.sign(difference)*100);
    let change=adjusted*((1-shape.unroofed/r.cells.length)*.00005+shape.unroofed/r.cells.length*.0007)*10;
    for(const i of shape.equalize){const target=layout.indices[i]!;change+=((target===-2?(r.temperature+outside)/2:air(target))-r.temperature)*.00017*10/r.cells.length;}
    r.temperature=Math.max(-273.15,Math.min(1000,r.temperature+change));
  }
  for(const door of layout.doors) {
    const neighbors=door.neighbors;if(!neighbors.length)continue;
    const mean=neighbors.reduce((n,id)=>n+(id<0?outside:regions[id]!.temperature),0)/neighbors.length;
    const own=layout.indices[door.cell]!;if(own>=0)regions[own]!.temperature=mean;
    if(neighbors.length<2)continue;
    const open=world.structures.find(s=>s.id===door.id)!.door!.open,rate=10/(open?34:375);
    for(const id of neighbors)if(id>=0){const r=regions[id]!;r.temperature+=(mean-r.temperature)*Math.min(1,rate/r.cells.length);}
  }
  // Core also exchanges through walls for a doorway without an adjacent
  // ordinary air region. Apply after the portal mean so it cannot erase heat.
  for(let id=0;id<regions.length;id++)if(layout.rooms[id]!.isolatedDoor) {
    const r=regions[id]!,temperature=r.temperature;let change=0;
    for(const i of layout.rooms[id]!.equalize){const target=layout.indices[i]!;change+=((target===-2?(temperature+outside)/2:air(target))-temperature)*.00017*10;}
    r.temperature=Math.max(-273.15,Math.min(1000,temperature+change));
  }
  applyThermalSources(world,layout);
  advanceCoolers(world,layout,outside);
}
