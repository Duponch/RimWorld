import type { PawnTrack } from '../bridge/motion-tracks';
import type { TravelSegment } from '../sim/movement';

export const MOTION_BUFFER_TICKS = 4;

/** Confirmed-time playout. Running speed changes affect the next frame without
 * moving the playhead or inserting a new wait. No prediction on starvation. */
export class MotionTimeline {
  readonly tracks=new Map<number,TravelSegment[]>();
  tick=0;
  private latest=0;
  private rate=0;
  private speed=0;
  private previous=0;
  private ready=Infinity;
  private buffering=true;
  adopt(tick:number,speed:number,tracks:PawnTrack[],now:number,reset=false):void {
    if(reset){this.tick=tick;this.latest=tick;this.previous=now;this.ready=Infinity;this.buffering=true;this.tracks.clear();this.speed=speed;this.rate=speed*10;}
    // Only RAF advances the playhead. A delivery timestamp can be later than
    // the next frame timestamp; changing rate here never consumes that time.
    if(speed!==this.speed) {
      if(speed>0){
        if(this.rate===0){this.buffering=true;this.ready=Infinity;}
        this.rate=speed*10;
      }
      this.speed=speed;
    }
    this.latest=Math.max(this.latest,tick);
    // Buffer once at start/fully drained resume, in simulation ticks rather
    // than wall time. At 6x this needs ~67 ms, not another fixed 400 ms.
    if(this.buffering&&(this.latest-this.tick>=MOTION_BUFFER_TICKS||speed===0&&this.latest>this.tick)) {
      this.buffering=false;this.ready=now;
    }
    for(const track of tracks)this.tracks.set(track.id,track.segments);
  }
  advance(now:number):number {
    const elapsed=Math.max(0,now-Math.max(this.previous,this.ready));
    this.previous=Math.max(this.previous,now);
    this.tick=Math.min(this.latest,this.tick+elapsed*this.rate/1000);
    // Drain only confirmed time on pause so paused edits can be displayed.
    if(this.speed===0&&this.tick>=this.latest)this.rate=0;
    return this.tick;
  }
  segment(id:number):TravelSegment|undefined {
    const segments=this.tracks.get(id);if(!segments?.length)return undefined;
    let current:TravelSegment|undefined;
    for(const segment of segments){if(segment.start>this.tick)break;current=segment;}
    return current;
  }
}
