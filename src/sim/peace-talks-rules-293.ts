import {isColonist} from './affiliation.ts';
import {backgroundSkillRefusal} from './colonist-backgrounds.ts';
import {pawnBody} from './health-rules.ts';
import {effectiveSkillLevel} from './work-types.ts';
import {XP_SCALE,xpRequired,type SkillRecord} from './skills.ts';
import type {Pawn} from './types.ts';
import type {PeaceTalksOutcome293} from './peace-talks-state-293.ts';
import type {WorldFactionRelationKind256} from './world-faction-catalog.ts';

const f=Math.fround;
const unit=(v:number)=>{if(!Number.isFinite(v)||v<0||v>=1)throw Error('PeaceTalks requires one draw in [0,1)');return v;};
/** Core GetFactor allowedDefect is a clamped inverse lerp, before the
 * worker's weight. These are NegotiationAbility capacities, not trade price. */
function weightedCapacity(capacity:number,defect:number):number {
 const c=f(capacity),normalized=c<1?f(Math.max(0,Math.min(1,f(c/f(1-f(defect)))))):c;
 return f(1+f(f(.9)*f(Math.min(1,normalized)-1)));
}
export function peaceNegotiationAbility293(pawn:Pawn):number {
 const c=pawnBody(pawn).capacities,level=effectiveSkillLevel(pawn,'social',pawn.skills.social?.level??0);
 let value=f(f(.4)+f(f(.075)*level));
 value=f(value*weightedCapacity(c.talking,.05));value=f(value*weightedCapacity(c.hearing,.20));
 return Math.max(f(.4),value);
}
/** Members are the original owners of the arriving player caravan. No trade
 * age18, awake-state, manipulation, speech/hearing minimum or draft gate. */
export function peaceDiplomat293(members:readonly Pawn[]):{pawn:Pawn;ability:number}|undefined {
 let best:{pawn:Pawn;ability:number}|undefined;
 for(const pawn of members){
  const affiliation=pawn.worldAffiliation259;
  if(!isColonist(pawn)||pawn.prisoner||pawn.visitor||pawn.raid||pawn.podRescue||affiliation&&(affiliation.hostFactionId!==null||affiliation.guestStatus==='Prisoner')||pawn.state==='dead'||pawn.state==='downed'||pawn.health?.death||pawn.mental?.crisis||backgroundSkillRefusal(pawn,'social')||!pawnBody(pawn).canBeAwake)continue;
  const ability=peaceNegotiationAbility293(pawn);
  if(!best||ability>best.ability)best={pawn,ability};
 }
 return best;
}
/** Learn(6000,direct:true): passion remains; global rate, daily saturation and
 * dailyXp do not participate. Draft only: caller commits the same real Pawn. */
export function draftPeaceSocialXp293(pawn:Pawn):{skill:SkillRecord;credited:number} {
 const original=pawn.skills.social??{level:0,xp:0,dailyXp:0,passion:0 as const},skill={...original};
 if(backgroundSkillRefusal(pawn,'social'))return {skill,credited:0};
 const requested=6000*XP_SCALE*[.35,1,1.5][skill.passion]!,beforeLevel=skill.level,beforeXp=skill.xp;
 skill.xp+=requested;
 while(skill.level<20&&skill.xp>=xpRequired(skill.level)){skill.xp-=xpRequired(skill.level);skill.level++;}
 if(skill.level===20)skill.xp=Math.min(skill.xp,xpRequired(20)-XP_SCALE);
 let credited=skill.xp-beforeXp;for(let level=beforeLevel;level<skill.level;level++)credited+=xpRequired(level);
 return {skill,credited:Math.max(0,credited/XP_SCALE)};
}
export function peaceBadOutcomeFactor293(ability:number):number {
 if(!Number.isFinite(ability)||ability<0)throw Error('Invalid PeaceTalks ability');
 const a=f(ability);if(a<=0)return 4;if(a>=f(1.5))return f(.4);
 const x=a<=1?0:1,y=a<=1?4:1,endX=a<=1?1:f(1.5),endY=a<=1?1:f(.4),t=f(f(a-x)/f(endX-x));
 return f(y+f(f(endY-y)*t));
}
export function peaceOutcomeWeights293(ability:number):readonly [number,number,number,number,number] {
 const factor=peaceBadOutcomeFactor293(ability);
 return [f(f(.05)*factor),f(f(.1)*factor),f(.2),f(f(.55)/factor),f(f(.1)/factor)];
}
export function peaceOutcome293(ability:number,draw:number):PeaceTalksOutcome293 {
 const weights=peaceOutcomeWeights293(ability),outcomes=['disaster','backfire','flounder','success','triumph'] as const;
 let sum=0;for(const weight of weights)sum=f(sum+weight);
 let remaining=f(unit(draw)*sum);
 for(let i=0;i<weights.length;i++){if(remaining<weights[i]!)return outcomes[i]!;remaining=f(remaining-weights[i]!);}
 return 'triumph';
}
/** Inclusive IntRange draw. Disaster forces hostility relative to the real
 * current relation, even if diplomacy changed after the offer was born. */
export function peaceGoodwillRequest293(outcome:PeaceTalksOutcome293,draw:number,goodwill:number,kind:WorldFactionRelationKind256):number {
 const u=unit(draw),range=outcome==='disaster'?[-50,-40]:outcome==='backfire'?[-20,-10]:outcome==='success'?[60,70]:outcome==='triumph'?[100,110]:[0,0];
 const requested=range[0]!+Math.floor(u*(range[1]!-range[0]!+1));
 return outcome==='disaster'?Math.min(requested,kind==='hostile'?0:-75-goodwill):requested;
}
