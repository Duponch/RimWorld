import type { Group } from 'three/webgpu';
import type { World } from '../sim/types';
import type { BoxBatches } from './BoxBatches';
import { miniTurretTopParts } from './mini-turret-parts';

/** Allocated only after the first installed turret. One global, plain metal
 * batch reuses the furniture pipeline; no per-turret GPU owner or shader. */
export class MiniTurretLayer {
  private signature='';
  private resident=false;
  update(world:World,group:Group,batches:BoxBatches,reset=false):boolean {
    if(reset){this.signature='';this.resident=false;}
    const parts=miniTurretTopParts(world);
    if(!parts.length&&!this.resident)return false;
    const signature=JSON.stringify(parts);if(signature===this.signature)return false;
    this.signature=signature;this.resident=true;batches.set(group,'turret-top',parts);return true;
  }
}
