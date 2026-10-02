interface HarvestPhase {
  action:string; starvedFrames?:number; controls:{delay:number|null}[];
  jumpCount:number; solidOccupancyCount:number; errors:string[];
  remainingJobs:number; initialJobs:number; removals:{play:number;tick:number}[];
}

interface PresentedFrame { at:number; play:number; speed:number }

export interface TravelFrameWitness {
  /** Position read from the shared pawn pose attributes at this RAF. */
  position:{x:number;z:number};
  /** The same frame's GPU aFrom/aTo and aTravel x/y, in local seconds. */
  from:{x:number;z:number};to:{x:number;z:number};start:number;end:number;time:number;
  /** Confirmed presentation time and its authoritative grid edge, in ticks. */
  play:number;
  segment:{from:{x:number;z:number};to:{x:number;z:number};start:number;end:number};
}

/** Prove that a raw >13 cells/s alarm is continuous travel on one unchanged
 * confirmed edge with bounded contact poses. This function is injected into
 * the browser probe via toString(), so every check is deliberately local. */
export function confirmedTravelExcess(previous:TravelFrameWitness,current:TravelFrameWitness,dt:number):boolean {
  const finite=(value:number)=>Number.isFinite(value);
  const cell=(value:{x:number;z:number}|null|undefined)=>!!value&&finite(value.x)&&finite(value.z);
  const witness=(value:TravelFrameWitness|null|undefined)=>!!value&&cell(value.position)&&cell(value.from)&&cell(value.to)
    &&finite(value.start)&&finite(value.end)&&finite(value.time)&&finite(value.play)
    &&value.segment&&cell(value.segment.from)&&cell(value.segment.to)
    &&finite(value.segment.start)&&finite(value.segment.end);
  if(!witness(previous)||!witness(current)||!finite(dt)||dt<=0||dt>=100)return false;
  const distance=Math.hypot(current.position.x-previous.position.x,current.position.z-previous.position.z);
  if(!(distance>dt*.013+.02))return false; // Preserve the original raw alarm.
  const a=previous.segment,b=current.segment;
  if(a.start!==b.start||a.end!==b.end||a.from.x!==b.from.x||a.from.z!==b.from.z||a.to.x!==b.to.x||a.to.z!==b.to.z
    ||previous.from.x!==current.from.x||previous.from.z!==current.from.z
    ||previous.to.x!==current.to.x||previous.to.z!==current.to.z
    ||previous.start!==current.start||previous.end!==current.end)return false;
  if(!Number.isInteger(a.from.x)||!Number.isInteger(a.from.z)||!Number.isInteger(a.to.x)||!Number.isInteger(a.to.z)
    ||Math.abs(a.to.x-a.from.x)+Math.abs(a.to.z-a.from.z)!==1||a.end<=a.start
    ||previous.end<=previous.start)return false;
  // Contact is presentation-only and must remain inside 0.30 map cell of
  // each authoritative endpoint; a distant but smoothly animated warp fails.
  if(Math.hypot(previous.from.x-a.from.x,previous.from.z-a.from.z)>.30
    ||Math.hypot(previous.to.x-a.to.x,previous.to.z-a.to.z)>.30)return false;
  const EPS_POSITION=.0002,EPS_ALPHA=.0002,EPS_SECONDS=.0001,EPS_TICKS=.0006;
  if(Math.abs((previous.end-previous.start)-(a.end-a.start)/6)>EPS_SECONDS)return false;
  for(const frame of [previous,current]){
    if(frame.play<a.start||frame.play>a.end||frame.time<frame.start||frame.time>frame.end)return false;
    const alphaTime=(frame.time-frame.start)/(frame.end-frame.start);
    const alphaPlay=(frame.play-a.start)/(a.end-a.start);
    if(Math.abs(alphaTime-alphaPlay)>EPS_ALPHA
      ||Math.hypot(frame.position.x-(frame.from.x+(frame.to.x-frame.from.x)*alphaTime),
        frame.position.z-(frame.from.z+(frame.to.z-frame.from.z)*alphaTime))>EPS_POSITION)return false;
  }
  const ticks=current.play-previous.play,seconds=current.time-previous.time;
  if(ticks<=0||seconds<=0||Math.abs(seconds-ticks/6)>EPS_SECONDS
    ||ticks>dt*.036+EPS_TICKS||seconds>dt*.006+EPS_SECONDS)return false;
  return true;
}

/** Detect a sustained absence of presented-tick progress, not merely two
 * successive 240 Hz images with the same tick after one second of play. */
export function presentationStarvations<T extends PresentedFrame>(frames:readonly T[]):{previous:T;current:T}[] {
  const stalls:{previous:T;current:T}[]=[];
  let anchor=frames[0],prior=frames[0],reported=false;
  for(let i=1;i<frames.length;i++) {
    const frame=frames[i]!;
    if(!anchor||!prior||frame.speed<=0||prior.speed<=0||frame.speed!==prior.speed||frame.play!==prior.play) {
      anchor=frame;reported=false;
    } else if(!reported&&frame.at-anchor.at>1000) {
      stalls.push({previous:anchor,current:frame});reported=true;
    }
    prior=frame;
  }
  return stalls;
}

/** A frame straddling confirmation already visibly changes speed. Requiring a
 * whole interval at the final rate measures settling one frame later instead.
 * A freeze, overshoot, unchanged rate or non-finite sample is never a response. */
export function visibleSpeedResponse(delta:number,dt:number,previousSpeed:number,speed:number):boolean {
  if(!Number.isFinite(delta)||!Number.isFinite(dt)||dt<=0||previousSpeed===speed)return false;
  // Independent reference rate: 6000 local ticks per 1000-second Core day.
  const rate=delta/dt*1000/6,low=Math.min(previousSpeed,speed),high=Math.max(previousSpeed,speed);
  return rate>=low-1e-6&&rate<=high+1e-6&&(rate-previousSpeed)*Math.sign(speed-previousSpeed)>1e-6;
}

/** User-visible acceptance, shared by the native runner and recorded controls.
 * Missing observations are not a pass. Timing budget is explicit, not inferred
 * from the renderer's buffer constants or the final simulation state. */
export function assertHarvestPhase(phase:HarvestPhase,verifySpeed=true,verifyActions=true,switches=true):void {
  if(verifySpeed&&(phase.starvedFrames!==0||switches&&phase.controls.length<3
    ||phase.controls.some(c=>c.delay===null||!Number.isFinite(c.delay)||c.delay<0||c.delay>100)))throw Error('Delayed speed controls: '+phase.action);
  if(verifyActions&&(phase.jumpCount||phase.solidOccupancyCount||phase.errors.length
    ||phase.remainingJobs>=phase.initialJobs||!phase.removals.length||phase.removals.some(r=>r.play<r.tick)))throw Error('Harvest presentation regression: '+phase.action);
}
