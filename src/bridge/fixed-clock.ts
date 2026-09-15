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
    this.remainder+=elapsed*speed;
    const ticks=Math.min(15,Math.floor(this.remainder/100));
    this.remainder-=ticks*100;
    return ticks;
  }
}
