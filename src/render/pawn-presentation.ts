import { attribute, mix } from 'three/tsl';
import type { PawnLayer } from './PawnLayer';

/** Shared by body, cargo and selection. XZ follows the authoritative edge;
 * only vertical presentation climbs furniture in its first/last third. */
export function pawnPresentationPose(clock:Pick<PawnLayer,'travelTime'|'blend'>) {
  const travel=attribute('aTravel','vec2'),from=attribute('aFrom','vec4'),to=attribute('aTo','vec4');
  const alpha=travel.y.sub(travel.x).greaterThan(0).select(clock.travelTime.sub(travel.x).div(travel.y.sub(travel.x).max(.0001)).clamp(0,1),clock.blend);
  const pose=mix(from,to,alpha).toVar();
  const vertical=from.y.lessThan(to.y).select(alpha.mul(3).clamp(0,1),from.y.greaterThan(to.y).select(alpha.mul(3).sub(2).clamp(0,1),alpha));
  pose.y.assign(mix(from.y,to.y,vertical));return pose;
}
