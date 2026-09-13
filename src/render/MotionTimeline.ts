import type { PawnTrack } from '../bridge/motion-tracks';
import type { TravelSegment } from '../sim/movement';

/** Fixed-rate playout with a 250 ms buffer. Arrival jitter never restarts an edge.
 * Stops at confirmed time on starvation; never predicts through an obstacle. */
export class MotionTimeline {
  readonly tracks=new Map<number,TravelSegment[]>();
  tick=0;
  private latest=0;
  private rate=0;
  private speed=0;
  private previous=0;
  private ready=0;
  adopt(tick:number,speed:number,tracks:PawnTrack[],now:number,reset=false):void {
    if(reset){this.tick=tick;this.latest=tick;this.previous=now;this.ready=now+250;this.tracks.clear();this.speed=speed;this.rate=speed*10;}
    // Message delivery uses performance.now(), which can be later than the
    // timestamp of the next RAF callback. Only RAF advances the playhead.
    if(speed!==this.speed) {
      // Pause drains only confirmed movement; resume buffers without jumping the actor.
      if(speed>0){this.rate=speed*10;this.ready=now+250;}
      this.speed=speed;
    }
    this.latest=Math.max(this.latest,tick);
    for(const track of tracks)this.tracks.set(track.id,track.segments);
  }
  advance(now:number):number {
    const elapsed=Math.max(0,now-Math.max(this.previous,this.ready));this.previous=Math.max(this.previous,now);
    this.tick=Math.min(this.latest,this.tick+elapsed*this.rate/1000);
    if(this.speed===0&&this.tick>=this.latest)this.rate=0;
    return this.tick;
  }
  segment(id:number):TravelSegment|undefined {
    const segments=this.tracks.get(id);if(!segments?.length)return undefined;
    for(const segment of segments)if(segment.end>this.tick)return segment;
    return segments.at(-1);
  }
}
