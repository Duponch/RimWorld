import {travelPieces,neutralTravelDuration,type TravelSegment} from './travel-timing.ts';
/** Read the already captured cost, including a zero-progress stun interval.
 * Called on player retargets only, never in the per-frame actor loop. */
export function noPaidTravel297(m:TravelSegment,now:number):boolean {
 let progress=0;
 for(const s of travelPieces(m)){
  if(s.start>now)break;
  const from=s.fromFraction??0,to=s.toFraction??1;
  const ratio=s.end===s.start?1:Math.max(0,Math.min(1,(now-s.start)/(s.end-s.start)));
  progress=from+(to-from)*ratio;
 }
 return progress*neutralTravelDuration(m)*10<=.001;
}
