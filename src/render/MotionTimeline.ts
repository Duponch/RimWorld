import type { PawnTrack } from '../bridge/motion-tracks';
import type { TravelSegment } from '../sim/movement';

export const MOTION_BUFFER_MS = 400;

/** Fixed-rate playout with a 400 ms buffer (two publication intervals). Arrival jitter never restarts an edge.
 * Stops at confirmed time on starvation; never predicts through an obstacle. */
export class MotionTimeline {
  readonly tracks=new Map<number,TravelSegment[]>();
  tick=0;
  private latest=0;
  private rate=0;
  private speed=0;
  private previous=0;
  private ready=0;
  private changes:Array<{tick:number;rate:number;ready:number}>=[];
  adopt(tick:number,speed:number,tracks:PawnTrack[],now:number,reset=false):void {
    if(reset){this.tick=tick;this.latest=tick;this.previous=now;this.ready=now+MOTION_BUFFER_MS;this.tracks.clear();this.changes=[];this.speed=speed;this.rate=speed*10;}
    // Message delivery uses performance.now(), which can be later than the
    // timestamp of the next RAF callback. Only RAF advances the playhead.
    if(speed!==this.speed) {
      // Consume the old-rate portion first. Rebuffering every speed command
      // accumulated an unbounded delay, eventually beyond the 64-tick history.
      this.changes.push({tick,rate:speed*10,ready:speed>0?now+MOTION_BUFFER_MS:0});
      this.speed=speed;
    }
    this.latest=Math.max(this.latest,tick);
    for(const track of tracks)this.tracks.set(track.id,track.segments);
  }
  advance(now:number):number {
    let cursor=Math.max(this.previous,this.ready);this.previous=Math.max(this.previous,now);
    while(cursor<=now) {
      const change=this.changes[0];
      if(change&&this.tick>=change.tick) {
        this.changes.shift();this.rate=change.rate;this.ready=change.ready;cursor=Math.max(cursor,this.ready);continue;
      }
      if(!this.rate)break;
      const limit=Math.min(this.latest,change?.tick??Infinity),duration=(limit-this.tick)/this.rate*1000;
      if(duration>now-cursor){this.tick+=(now-cursor)*this.rate/1000;break;}
      this.tick=limit;cursor+=duration;
      if(!change||limit<change.tick)break;
    }
    return this.tick;
  }
  segment(id:number):TravelSegment|undefined {
    const segments=this.tracks.get(id);if(!segments?.length)return undefined;
    let current:TravelSegment|undefined;
    for(const segment of segments){if(segment.start>this.tick)break;current=segment;}
    return current;
  }
}
