import type {Pawn} from './types.ts';
import type {AwayGroup} from './group-capture.ts';
import {groupPawnInterval256} from './group-core-cadence-256.ts';
import {depletedHumanHunger,depletedHumanRest,BED_REST_PER_TICK} from './human-need-rates.ts';
import {pawnBody} from './health-rules.ts';
import {updateRecreation} from './recreation-rules.ts';
/** Like Need_Rest's lastRestTick/effectiveness: runtime only, not a second
 * cadence or a saved rest gain. A load starts with no future rest promised. */
export class GroupRestMarks256 {
 readonly #marks=new Map<number,{at:number;effectiveness:number}>();
 clear():void {this.#marks.clear();}
 remove(pawnId:number):void {this.#marks.delete(pawnId);}
 mark(p:Pick<Pawn,'id'|'state'|'health'>,coreTick:number,effectiveness:number):void {
  if(!Number.isSafeInteger(coreTick)||coreTick<0||!Number.isFinite(effectiveness)||effectiveness<=0)throw Error('Invalid caravan rest mark');
  if(p.state!=='dead'&&!p.health?.death)this.#marks.set(p.id,{at:coreTick,effectiveness});
 }
 /** Off-map human Thing.UpdateRateTicks=15 (GetCameraUpdateRate), even with
  * globe selected. Strict < is the real rest mark lifetime. */
 effectiveness(pawnId:number,coreTick:number):number|undefined {
  const m=this.#marks.get(pawnId);return m&&coreTick>=m.at&&coreTick<m.at+15?m.effectiveness:undefined;
 }
}
export interface GroupNeedMetersContext256 {
 coreTick:number;legacyFood:boolean;legacyRest:boolean;joyToleranceFall:number;restMarks:GroupRestMarks256;
}
/** WorldPawns-side meter phase, BEFORE MotionRuntime.stepCore at this same
 * Core tick. Needs150 is not delta gain from the caravan interval callback.
 * Reuses the existing personal scalar rates; no age/health/RNG owner here. */
export function advanceGroupNeedMeters256(group:AwayGroup,c:GroupNeedMetersContext256):void {
 for(const p of group.members){
  if(p.state==='dead'||p.health?.death||!groupPawnInterval256(p.id,c.coreTick,150,1))continue;
  const nextHunger=depletedHumanHunger(p,c.legacyFood);
  p.hunger=Math.max(0,p.hunger-(p.hunger-nextHunger)*15);
  const effectiveness=c.restMarks.effectiveness(p.id,c.coreTick);
  p.rest=effectiveness===undefined?Math.max(0,p.rest-(p.rest-depletedHumanRest(p.rest,c.legacyRest))*15):Math.min(100,p.rest+BED_REST_PER_TICK*effectiveness*15);
  updateRecreation(p,pawnBody(p),c.joyToleranceFall*15,15);
 }
}
