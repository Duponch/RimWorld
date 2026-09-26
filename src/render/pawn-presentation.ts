import { attribute, mix } from 'three/tsl';
import type { PawnLayer } from './PawnLayer';
import { TURN_SECONDS } from './turn-presentation';

/** Shared by body, cargo and selection. XZ follows the authoritative edge;
 * only vertical presentation climbs furniture in its first/last third. */
export function pawnPresentationPose(clock:Pick<PawnLayer,'travelTime'|'blend'>) {
  const travel=attribute('aTravel','vec4'),from=attribute('aFrom','vec4'),to=attribute('aTo','vec4');
  const alpha=travel.y.sub(travel.x).greaterThan(0).select(clock.travelTime.sub(travel.x).div(travel.y.sub(travel.x).max(.0001)).clamp(0,1),clock.blend);
  const pose=mix(from,to,alpha).toVar();
  // Facing completes quickly even when a traversed edge lasts several ticks.
  // The same pose node is shared by bodies, cargo and selection markers.
  const turnAlpha=clock.travelTime.sub(travel.x).div(TURN_SECONDS).clamp(0,1);
  pose.w.assign(mix(from.w,to.w,travel.y.greaterThan(travel.x).select(turnAlpha,clock.blend)));
  const distance=mix(travel.z,travel.w,alpha);
  const vertical=from.y.lessThan(to.y).select(distance.mul(3).clamp(0,1),from.y.greaterThan(to.y).select(distance.mul(3).sub(2).clamp(0,1),distance));
  pose.y.assign(mix(from.y,to.y,vertical));return pose;
}
