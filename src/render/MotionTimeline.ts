import type { PawnTrack } from '../bridge/motion-tracks';
import { LOCAL_TICKS_PER_SECOND } from '../bridge/clock-rate';
import type { PresentationSegment as TravelSegment } from '../sim/travel-timing';

export const MOTION_BUFFER_TICKS = 4;

/** Confirmed-time playout. Running speed changes affect the next frame without
 * moving the playhead or inserting a new wait. No prediction on starvation. */
export class MotionTimeline {
  readonly tracks=new Map<number,TravelSegment[]>();
  tick=0;
  private latest=0;
  private rate=0;
  private frameRate=0;
  private readonly rateChanges:{at:number;rate:number}[]=[];
  private speed=0;
  private previous=0;
  private ready=Infinity;
  private buffering=true;
  adopt(tick:number,speed:number,tracks:PawnTrack[],now:number,reset=false):void {
    if(reset){this.tick=tick;this.latest=tick;this.previous=now;this.ready=Infinity;this.buffering=true;this.tracks.clear();this.speed=speed;this.rate=speed*LOCAL_TICKS_PER_SECOND;this.frameRate=this.rate;this.rateChanges.length=0;}
    // Only RAF advances the playhead. A delivery timestamp can be later than
    // the next frame timestamp; changing rate here never consumes that time.
    if(speed!==this.speed) {
      if(speed>0){
        if(this.rate===0){this.buffering=true;this.ready=Infinity;}
        this.rate=speed*LOCAL_TICKS_PER_SECOND;
        this.rateChanges.push({at:now,rate:this.rate});
      }
      this.speed=speed;
    }
    this.latest=Math.max(this.latest,tick);
    // Buffer once at start/fully drained resume, in simulation ticks rather
    // than wall time. At 6x this needs ~111 ms; positive rate changes do not refill.
    if(this.buffering&&(this.latest-this.tick>=MOTION_BUFFER_TICKS||speed===0&&this.latest>this.tick)) {
      this.buffering=false;this.ready=now;
    }
    for(const track of tracks)this.tracks.set(track.id,track.segments);
  }
  advance(now:number):number {
    let start=Math.max(this.previous,this.ready),delta=0,consumed=0;
    // Acknowledgement can arrive between frames or after the timestamp of the
    // pending RAF. Never apply a new speed retroactively to the whole interval:
    // repeated asymmetric changes would consume the confirmed buffer.
    for(const change of this.rateChanges){
      if(change.at>now)break;
      delta+=Math.max(0,change.at-start)*this.frameRate/1000;
      start=Math.max(start,change.at);this.frameRate=change.rate;consumed++;
    }
    if(consumed)this.rateChanges.splice(0,consumed);
    delta+=Math.max(0,now-start)*this.frameRate/1000;
    this.previous=Math.max(this.previous,now);
    this.tick=Math.min(this.latest,this.tick+delta);
    // Drain only confirmed time on pause so paused edits can be displayed.
    if(this.speed===0&&this.tick>=this.latest)this.rate=this.frameRate=0;
    return this.tick;
  }
  segment(id:number):TravelSegment|undefined {
    const segments=this.tracks.get(id);if(!segments?.length)return undefined;
    let current:TravelSegment|undefined;
    for(const segment of segments){if(segment.start>this.tick)break;current=segment;}
    return current;
  }
}
