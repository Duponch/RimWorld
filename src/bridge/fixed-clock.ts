import { LOCAL_TICKS_PER_SECOND } from './clock-rate';

/** Real-time accumulator owned by the bridge, never by a saved World.
 * advance retains its standalone legacy policy; the responsive runtime uses
 * reserve/consume and explicitly cancels unplayed wall-time on speed changes. */
export class FixedClock {
  private previous=0;
  private remainder=0;
  private reserved=0;
  reset(now:number):void {this.previous=now;this.remainder=0;this.reserved=0;}
  advance(now:number,speed:number):number {
    if(this.reserved!==0)throw Error('Cannot mix legacy advance with an active reservation.');
    const elapsed=Math.min(250,Math.max(0,now-this.previous));
    this.previous=Math.max(this.previous,now);
    if(!speed)return 0;
    // Keep thousandths of a tick, avoiding repeated division by 166.666... ms.
    this.remainder+=elapsed*speed*LOCAL_TICKS_PER_SECOND;
    const ticks=Math.min(15,Math.floor(this.remainder/1000));
    this.remainder-=ticks*1000;
    return ticks;
  }
  /** Sample ONCE per logical batch. These credits are not committed ticks. */
  reserve(now:number,speed:number):number {
    if(this.reserved!==0)throw Error('A clock reservation is already active.');
    if(!Number.isFinite(now)||!Number.isFinite(speed)||speed<0)throw Error('Invalid clock reservation.');
    const elapsed=Math.min(250,Math.max(0,now-this.previous));
    const next=speed?this.remainder+elapsed*speed*LOCAL_TICKS_PER_SECOND:this.remainder;
    if(!Number.isFinite(next))throw Error('Clock reservation overflow.');
    this.previous=Math.max(this.previous,now);
    if(!speed)return 0;
    this.remainder=next;
    this.reserved=Math.min(15,Math.floor(this.remainder/1000));
    return this.reserved;
  }
  /** Debit exactly the next tick immediately before actual simulation work. */
  consume():boolean {
    if(this.reserved===0)return false;
    this.remainder-=1000;this.reserved--;return true;
  }
  /** New explicit human speed policy: discard unplayed whole credits, retain
   * only the already-sampled phase and acquire no old-speed wall interval. */
  cancelUnplayed(now:number):void {
    if(!Number.isFinite(now)||!Number.isFinite(this.remainder))throw Error('Invalid clock cancellation.');
    this.previous=Math.max(this.previous,now);this.remainder%=1000;this.reserved=0;
  }
}
