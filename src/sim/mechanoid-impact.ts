import type { ArmorCategory } from './armor.ts';
import type { ImpactProtection } from './apparel-protection.ts';
import { SCYTHER_DEFINITION } from './mechanoid-definition.ts';
import { commitMechanoidImpact } from './mechanoid-health.ts';
import { createMedicalRecord } from './injury-state.ts';
import { medicalModel } from './body-model.ts';
import { healthRandom } from './health.ts';
import { resolveUnarmoredBullet,validateUnarmoredBullet,type UnarmoredBullet,type BulletImpactResult } from './bullet-impact.ts';
import { resolveBombImpact,type BombImpactResult } from './bomb-impact.ts';
import { BOMB_AMOUNT,BOMB_AP } from './bomb-state.ts';
import { mergeSlowIntervals,travelEnd } from './travel-timing.ts';
import type { Mechanoid } from './mechanoid-state.ts';
import type { World } from './types.ts';

/** Natural mechanical armor has no garment or durability transaction. */
export function mechanoidProtection(category:ArmorCategory,penetration:number,random:()=>number):ImpactProtection {
  if(!Number.isFinite(penetration)||penetration<0)throw new RangeError('Invalid mechanical penetration');
  return (_part,amount)=>{
    const draw=()=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError('Invalid mechanical armor random');return n;};
    const effective=Math.max(0,SCYTHER_DEFINITION.armor[category]-penetration),roll=draw();
    if(roll<effective/2)return {amount:0,converted:false};
    if(roll<effective){const half=amount/2;return {amount:Math.floor(half)+Number(draw()<half%1),converted:category==='sharp'};}
    return {amount,converted:false};
  };
}
const impactRecord=(w:World,m:Mechanoid)=>({...structuredClone(m.health??createMedicalRecord(w.tick)),body:'scyther' as const,tick:w.tick});
function owner(w:World,m:Mechanoid,core:number):void {
  if(w.schemaVersion<194||!w.mechanoids?.includes(m))throw new RangeError('Invalid mechanical impact owner');
  if(!Number.isSafeInteger(core)||core<Math.max(0,(w.tick-1)*10)||core>w.tick*10)throw new RangeError('Invalid mechanical impact clock');
}
export function damageMechanoidWithBullet(w:World,m:Mechanoid,hit:UnarmoredBullet,core:number,penetration=0):BulletImpactResult|null {
  owner(w,m,core);const record=impactRecord(w,m);validateUnarmoredBullet(hit,medicalModel(record));
  if(m.state==='dead'||record.death||!hit.damage)return null;
  const random={rng:w.rng},draw=()=>healthRandom(random);
  const impact=resolveUnarmoredBullet(record,hit,draw,mechanoidProtection('sharp',penetration,draw));
  if(impact.selected&&!commitMechanoidImpact(w,m,impact.record,random,core))throw new Error('Mechanical Bullet transaction refused');
  return impact;
}
export function damageMechanoidWithBomb(w:World,m:Mechanoid,core:number,amount=BOMB_AMOUNT):BombImpactResult|null {
  owner(w,m,core);const record=impactRecord(w,m),hit={damage:amount};validateUnarmoredBullet(hit,medicalModel(record));
  if(m.state==='dead'||record.death||!amount)return null;
  const random={rng:w.rng},draw=()=>healthRandom(random);
  const impact=resolveBombImpact(record,hit,draw,mechanoidProtection('sharp',BOMB_AP,draw));
  if(!commitMechanoidImpact(w,m,impact.record,random,core))throw new Error('Mechanical Bomb transaction refused');
  if(impact.layers.some(l=>l.severity>0))delayMechanoidImpact(w,m,core);
  return impact;
}
/** Preserve the captured edge and elapsed fraction; no biological disturbance. */
export function delayMechanoidImpact(w:World,m:Mechanoid,core:number,stun=false,stoppingPower=1):void {
  owner(w,m,core);if(m.state==='dead'||m.state==='downed')return;
  if(stoppingPower+.001>=1){const previous=m.stagger;m.stagger={sinceCore:previous&&previous.untilCore>=core?previous.sinceCore:core,untilCore:Math.max(previous?.untilCore??0,core+95)};}
  if(stun){const previous=m.stun;m.stun={sinceCore:previous&&previous.untilCore>=core?previous.sinceCore:core,untilCore:Math.max(previous?.untilCore??0,core+45)};}
  const motion=m.motion;if(!motion||motion.end<=core/10)return;
  const next={...motion};
  if(m.stagger)next.stagger=mergeSlowIntervals([...(motion.stagger??[]),{start:Math.max(motion.start,core/10),end:m.stagger.untilCore/10}]);
  if(m.stun)next.stuns=mergeSlowIntervals([...(motion.stuns??[]),{start:Math.max(motion.start,core/10),end:m.stun.untilCore/10}]);
  next.end=travelEnd(next);m.motion=next;m.moveCooldown=Math.max(0,next.end-w.tick);
}
