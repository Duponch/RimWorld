import { LOCAL_TICKS_PER_SECOND } from './clock-rate';

/** Real-time accumulator owned by the bridge, never by a saved World.
 * Call advance at the old speed before applying a speed command. */
export class FixedClock {
  private previous=0;
  private remainder=0;
  reset(now:number):void {this.previous=now;this.remainder=0;}
  advance(now:number,speed:number):number {
    const elapsed=Math.min(250,Math.max(0,now-this.previous));
    this.previous=Math.max(this.previous,now);
    if(!speed)return 0;
    // Keep thousandths of a tick, avoiding repeated division by 166.666... ms.
    this.remainder+=elapsed*speed*LOCAL_TICKS_PER_SECOND;
    const ticks=Math.min(15,Math.floor(this.remainder/1000));
    this.remainder-=ticks*1000;
    return ticks;
  }
}
