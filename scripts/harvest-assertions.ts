interface HarvestPhase {
  action:string; starvedFrames?:number; controls:{delay:number|null}[];
  jumpCount:number; solidOccupancyCount:number; errors:string[];
  remainingJobs:number; initialJobs:number; removals:{play:number;tick:number}[];
}

/** A frame straddling confirmation already visibly changes speed. Requiring a
 * whole interval at the final rate measures settling one frame later instead.
 * A freeze, overshoot, unchanged rate or non-finite sample is never a response. */
export function visibleSpeedResponse(delta:number,dt:number,previousSpeed:number,speed:number):boolean {
  if(!Number.isFinite(delta)||!Number.isFinite(dt)||dt<=0||previousSpeed===speed)return false;
  const rate=delta/dt*100,low=Math.min(previousSpeed,speed),high=Math.max(previousSpeed,speed);
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
