import type { TravelSegment } from '../sim/movement.ts';
import type { World } from '../sim/types.ts';
export interface PawnTrack { id:number; segments:TravelSegment[] }
export const MOTION_HISTORY_TICKS = 64;
/** Presentation history, never a simulation input or save field. Covers skipped snapshots. */
export class MotionRecorder {
  private readonly tracks=new Map<number,TravelSegment[]>();
  reset():void {this.tracks.clear();}
  capture(world:World):void {
    for(const pawn of world.pawns) {
      let track=this.tracks.get(pawn.id);if(!track){track=[];this.tracks.set(pawn.id,track);}
      const motion=pawn.motion;
      if(motion&&track.at(-1)?.start!==motion.start)track.push({...motion,from:{...motion.from},to:{...motion.to}});
      while(track.length>1&&track[1]!.end<world.tick-MOTION_HISTORY_TICKS)track.shift();
    }
  }
  snapshot():PawnTrack[] {return [...this.tracks].map(([id,segments])=>({id,segments}));}
}
