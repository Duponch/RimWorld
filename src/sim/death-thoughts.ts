import { factionOf,factionRelation,isColonist,distanceSquared } from './affiliation.ts';
import { captureHumanOwners,type HumanOwnershipCapture,type HumanOwnerSlot } from './human-owners.ts';
import { captureWorldShotGrid } from './combat-world.ts';
import { clearShotSegment,type ShotGrid } from './combat-space.ts';
import { pawnBody } from './health-rules.ts';
import { relationshipIndex } from './relationship-runtime.ts';
import { DEATH_THOUGHT_RULES,deathThoughtDuration } from './death-thoughts-rules.ts';
import type { DeathThoughtKind } from './death-thoughts-state.ts';
import type { MoodThought } from './mood.ts';
import type { Pawn,World } from './types.ts';

export function expireDeathThoughts(pawn:Pawn,tick:number):void {
  if(!pawn.deathThoughts?.some(m=>m.at+deathThoughtDuration(m.kind)<=tick))return;
  pawn.deathThoughts=pawn.deathThoughts.filter(m=>m.at+deathThoughtDuration(m.kind)>tick);
  if(!pawn.deathThoughts.length)delete pawn.deathThoughts;
}
/** Event memories do not renew; observations renew the same physical person's
 * body even when its retained body has since become a materialized corpse. */
export function rememberDeathThought(pawn:Pawn,kind:DeathThoughtKind,otherId:number,tick:number,renew=false):void {
  expireDeathThoughts(pawn,tick);
  const existing=pawn.deathThoughts?.find(m=>m.kind===kind&&m.otherId===otherId);
  if(existing){if(renew)existing.at=tick;return;}
  const memories=pawn.deathThoughts??=[],same=memories.filter(m=>m.kind===kind);
  if(same.length>=DEATH_THOUGHT_RULES[kind].limit){
    const oldest=same.reduce((a,b)=>a.at<b.at||a.at===b.at&&a.otherId<b.otherId?a:b);
    memories.splice(memories.indexOf(oldest),1);
  }
  memories.push({kind,otherId,at:tick});
}
export function deathObserverAwake(pawn:Pawn):boolean {
  if(pawn.state==='dead'||pawn.state==='sleeping'||pawn.medicalSleep)return false;
  const body=pawnBody(pawn);return body.canBeAwake&&body.capacities.sight>0;
}
export const deathThoughtObserver=(pawn:Pawn):boolean=>isColonist(pawn)&&!pawn.prisoner&&!pawn.visitor&&pawn.state!=='dead';

/** Called only at the genuine clinical death transition. No migration, body
 * placement or load manufactures a past event. Same-caravan witnesses use the
 * existing group identity; map witnesses use the existing opaque-cell LOS. */
export function notifyDeathThoughts(world:World,deceased:Pawn,capture?:HumanOwnershipCapture):void {
  if(world.schemaVersion<209||deceased.state!=='dead'||deceased.health?.death?.tick!==world.tick||deceased.health.death.cause==='execution')return;
  const owners=capture??captureHumanOwners(world),victim=owners.byId.get(deceased.id);
  if(victim?.pawn!==deceased)return;
  let grid:ShotGrid|undefined;
  const witnessed=(slot:HumanOwnerSlot,p:Pawn):boolean=>{
    if(!deathObserverAwake(p))return false;
    if(victim.groupId!==undefined)return slot.groupId===victim.groupId;
    if(victim.kind!=='map'||slot.kind!=='map'||distanceSquared(p,deceased)>=12**2)return false;
    grid??=captureWorldShotGrid(world,{minX:deceased.x-12,minZ:deceased.z-12,maxX:deceased.x+12,maxZ:deceased.z+12});
    return clearShotSegment(grid,deceased,p);
  };
  const family=relationshipIndex(world);
  for(const slot of [...owners.local,...owners.away]){
    const p=slot.pawn!;if(p===deceased||!deathThoughtObserver(p)||p.social?.fight?.opponentId===deceased.id)continue;
    const bloodlust=p.traits?.includes('bloodlust');
    if(witnessed(slot,p)){
      if(bloodlust)rememberDeathThought(p,'witnessed-bloodlust-death',deceased.id,world.tick);
      else {
        if(factionOf(p)===factionOf(deceased)&&!deceased.visitor)rememberDeathThought(p,'witnessed-ally-death',deceased.id,world.tick);
        else if(factionRelation(factionOf(p),factionOf(deceased))!=='hostile'||deceased.visitor)rememberDeathThought(p,'witnessed-outsider-death',deceased.id,world.tick);
        if(family.knownBloodRelated(p.id,deceased.id))rememberDeathThought(p,'witnessed-family-death',deceased.id,world.tick);
      }
    }else if(!bloodlust&&isColonist(deceased)&&!deceased.prisoner&&!deceased.visitor)rememberDeathThought(p,'colonist-died',deceased.id,world.tick);
  }
}

export function deathThoughtsAt(pawn:Pawn,tick:number,_people?:Pick<ReadonlyMap<number,{readonly name:string}>,'get'>):MoodThought[] {
  if(pawn.state==='dead')return [];
  const groups=new Map<DeathThoughtKind,{count:number;expiresAt:number}>();
  for(const m of pawn.deathThoughts??[]){
    const expiresAt=m.at+deathThoughtDuration(m.kind);if(expiresAt<=tick)continue;
    const g=groups.get(m.kind);if(g){g.count++;g.expiresAt=Math.min(g.expiresAt,expiresAt);}else groups.set(m.kind,{count:1,expiresAt});
  }
  return [...groups].map<MoodThought>(([kind,g])=>{
    const r=DEATH_THOUGHT_RULES[kind];return {id:`death-${kind}`,label:`${r.label}${g.count>1?` ×${g.count}`:''}`,offset:r.offset*(1-r.stackMultiplier**g.count)/(1-r.stackMultiplier),kind:'memory',description:r.description,expiresAt:g.expiresAt};
  });
}
