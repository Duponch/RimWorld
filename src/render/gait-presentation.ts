/** Cosmetic gait phase, measured in radians of ground actually presented.
 * Only segment changes touch this cache; the GPU evaluates the distance from
 * the segment's displayed start for every frame. No clock or simulation state
 * is advanced independently of the shared presentation playhead. */
export interface GaitSegment {
  start:number;
  end:number;
  fromX:number;
  fromZ:number;
  toX:number;
  toZ:number;
}

interface GaitState { segment:GaitSegment|null; phase:number }
const fullTurn=2*Math.PI;
const wrap=(phase:number):number=>((phase%fullTurn)+fullTurn)%fullTurn;
const same=(a:GaitSegment,b:GaitSegment):boolean=>
  a.start===b.start&&a.end===b.end&&a.fromX===b.fromX&&a.fromZ===b.fromZ&&a.toX===b.toX&&a.toZ===b.toZ;

export function gaitDistance(segment:GaitSegment,tick:number):number {
  const fraction=segment.end>segment.start
    ?Math.max(0,Math.min(1,(tick-segment.start)/(segment.end-segment.start)))
    :0;
  return Math.hypot(segment.toX-segment.fromX,segment.toZ-segment.fromZ)*fraction;
}

export class GaitPhaseTracker {
  private readonly tracks=new Map<number,GaitState>();
  clear():void {this.tracks.clear();}
  delete(id:number):void {this.tracks.delete(id);}
  /** Returns a phase at segment.start. The next segment is aligned to the
   * last pose actually shown, including a replaced/shortened travel piece. */
  begin(id:number,segment:GaitSegment,tick:number,radiansPerUnit:number):number {
    const previous=this.tracks.get(id);
    if(previous?.segment&&same(segment,previous.segment))
      return previous.phase;
    const oldPhase=previous?previous.phase+(previous.segment?gaitDistance(previous.segment,tick)*radiansPerUnit:0):0;
    const phase=wrap(oldPhase-gaitDistance(segment,tick)*radiansPerUnit);
    this.tracks.set(id,{segment,phase});
    return phase;
  }
  halt(id:number,tick:number,radiansPerUnit:number):void {
    const state=this.tracks.get(id);
    if(state?.segment){state.phase=wrap(state.phase+gaitDistance(state.segment,tick)*radiansPerUnit);state.segment=null;}
  }
}

export const HUMAN_GAIT_RADIANS_PER_UNIT=2*Math.PI/1.12;
export function animalGaitRadiansPerUnit(species:string):number {
  return species==='hare'||species==='snow-hare'?2*Math.PI/.78:2*Math.PI/1.08;
}
