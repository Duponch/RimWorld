import type { World } from '../sim/types';
import { PresentationChanges } from '../bridge/presentation-changes';

/** Decoded snapshots are immutable and share terrain/resource arrays. Scene
 * changes wait for the actors' confirmed clock. No simulation mutation. */
export class PresentationQueue {
  private pending:World[]=[];
  private phases=new PresentationChanges();
  private inspected:World|undefined;
  private changed=false;
  private lastApplied=-Infinity;
  clear():void {this.pending=[];this.phases=new PresentationChanges();this.inspected=undefined;this.lastApplied=-Infinity;}
  get size():number {return this.pending.length;}
  push(world:World):void {
    if(this.pending.at(-1)?.tick===world.tick)this.pending[this.pending.length-1]=world;
    else this.pending.push(world);
  }
  take(tick:number,now?:number):World|undefined {
    let index=-1;
    while(this.pending[index+1]&&this.pending[index+1]!.tick<=tick)index++;
    if(index<0)return;
    const world=this.pending[index]!;
    if(now!==undefined) {
      if(world!==this.inspected){this.inspected=world;this.changed=this.phases.capture(world);}
      // Movement consumes every confirmed track independently. Continuous
      // scene values need only 5 Hz; discrete phases remain tick-exact. Keep
      // the last world queued, so even the final paused edit is eventually drawn.
      if(!this.changed&&now-this.lastApplied<200)return;
      this.lastApplied=now;
    }
    this.pending.splice(0,index+1);
    return world;
  }
}
