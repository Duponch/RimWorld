import { naturalLight } from './environment.ts';
import { calendarTick } from './calendar.ts';
import { LocalLightCache } from './local-light.ts';
import { RoomTopologyCache, type RoomTopology } from './room-topology.ts';
import type { Cell, World } from './types.ts';

export const lightSpeedFactor = (glow:number):number => .8 + .2 * Math.min(1, Math.max(0, glow) / .3);
export type LightReader = () => LightEnvironment;

/** A synchronous decision snapshot; movement does not need furniture roles. */
export class LightEnvironment {
  readonly topology:RoomTopology;
  readonly roofs:ReadonlySet<number>;
  readonly artificial:Float32Array;
  readonly sky:number;
  constructor(topology:RoomTopology,roofs:ReadonlySet<number>,artificial:Float32Array,sky:number) {
    this.topology=topology;this.roofs=roofs;this.artificial=artificial;this.sky=sky;
  }
  lightAt(cell:Cell):number {
    if(!this.topology.at(cell.x,cell.z))return 0;
    const index=cell.z*this.topology.width+cell.x;
    return Math.max(this.roofs.has(index)?0:this.sky,this.artificial[index]??0);
  }
  speedAt(cell:Cell):number {return lightSpeedFactor(this.lightAt(cell));}
}

/** Caller owned. Sharing is allowed only until a source/roof/barrier mutation. */
export class LightEnvironmentCache {
  private readonly topology=new RoomTopologyCache();
  readonly localLight=new LocalLightCache();
  read(world:World):LightEnvironment {
    const topology=this.topology.read(world);
    return new LightEnvironment(topology,new Set(world.roofing?.constructed??[]),this.localLight.read(world,topology),naturalLight(calendarTick(world)));
  }
}
