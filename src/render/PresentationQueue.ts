import type { World } from '../sim/types';

/** Decoded snapshots are immutable and share terrain/resource arrays. Scene
 * changes wait for the actors' confirmed clock. No simulation mutation. */
export class PresentationQueue {
  private pending:World[]=[];
  clear():void {this.pending=[];}
  get size():number {return this.pending.length;}
  push(world:World):void {
    if(this.pending.at(-1)?.tick===world.tick)this.pending[this.pending.length-1]=world;
    else this.pending.push(world);
  }
  take(tick:number):World|undefined {
    let world:World|undefined;
    while(this.pending[0]&&this.pending[0].tick<=tick)world=this.pending.shift();
    return world;
  }
}
