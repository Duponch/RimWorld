interface HarvestPhase {
  action:string; starvedFrames?:number; controls:{delay:number|null}[];
  jumpCount:number; solidOccupancyCount:number; errors:string[];
  remainingJobs:number; initialJobs:number; removals:{play:number;tick:number}[];
}

interface PresentedFrame { at:number; play:number; speed:number }

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
