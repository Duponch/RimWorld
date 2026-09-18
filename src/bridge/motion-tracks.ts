import { travelPieces,type PresentationSegment } from '../sim/travel-timing.ts';
import type { World } from '../sim/types.ts';
export interface PawnTrack { id:number; segments:PresentationSegment[] }
export const MOTION_HISTORY_TICKS = 64;
/** Presentation history, never a simulation input or save field. Covers skipped snapshots. */
export class MotionRecorder {
  private readonly tracks=new Map<number,PresentationSegment[]>();
  reset():void {this.tracks.clear();}
  capture(world:World):void {
    for(const pawn of world.pawns) {
      let track=this.tracks.get(pawn.id);if(!track){track=[];this.tracks.set(pawn.id,track);}
      const motion=pawn.motion;
      const last=track.at(-1),edgeStart=last?.edgeStart??last?.start;
      if(motion&&(edgeStart!==motion.start||last?.end!==motion.end)) {
        if(edgeStart===motion.start){track=track.filter(s=>(s.edgeStart??s.start)!==motion.start);this.tracks.set(pawn.id,track);}
        if(motion.stagger||motion.stuns)for(const s of travelPieces(motion))track.push({...s,from:{...s.from},to:{...s.to}});
        else track.push({...motion,from:{...motion.from},to:{...motion.to}});
      }
      while(track.length>1&&track[1]!.end<world.tick-MOTION_HISTORY_TICKS)track.shift();
    }
  }
  snapshot():PawnTrack[] {return [...this.tracks].map(([id,segments])=>({id,segments}));}
}
