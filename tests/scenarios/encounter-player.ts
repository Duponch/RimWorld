import { meleeContact } from '../../src/sim/melee-space.ts';
import { isColonist,activeThreat,distanceSquared } from '../../src/sim/affiliation.ts';
import { equippedWeapon } from '../../src/sim/equipment-rules.ts';
import { captureWorldShotGrid } from '../../src/sim/combat-world.ts';
import { findShotLine } from '../../src/sim/combat-space.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** Companion to the camp pilot: defend a casualty, then restore civilian care.
 * Bounded encounter policy, not a general tactical oracle or a damage injector. */
export function encounterDecisions(world:World):Decision[] {
  const threats=world.pawns.filter(p=>!isColonist(p)&&activeThreat(p));
  if(!threats.length){const ids=world.pawns.filter(p=>isColonist(p)&&p.draft).map(p=>p.id);return ids.length?[{reason:'Menace neutralisée : rendre leur autonomie aux survivants.',command:{type:'draft',pawnIds:ids,enabled:false}}]:[];}
  if(!world.pawns.some(p=>isColonist(p)&&p.state==='downed'))return [];
  const grid=captureWorldShotGrid(world);
  for(const p of world.pawns.filter(p=>isColonist(p)&&activeThreat(p)&&equippedWeapon(world,p)&&!p.shooting&&!p.melee)) {
    const adjacent=threats.find(t=>meleeContact(world,p,t));
    if(adjacent&&p.draft)return [{reason:'La menace est au contact : frapper plutôt que tenter un tir impossible.',command:{type:'melee',pawnIds:[p.id],targetId:adjacent.id}}];
    const target=threats.filter(t=>distanceSquared(p,t)>=4&&findShotLine(grid,p,{cell:t,leans:true},25.9).ok).sort((a,b)=>distanceSquared(p,a)-distanceSquared(p,b)||a.id-b.id)[0];if(!target)continue;
    if(!p.draft)return [{reason:'Mobiliser la réserve armée pour protéger le blessé.',command:{type:'draft',pawnIds:[p.id],enabled:true}}];
    if(p.draft.holdFire)return [{reason:'Autoriser la défense automatique avant le secours du blessé.',command:{type:'fire-at-will',pawnIds:[p.id],enabled:true}}];
    return []; // Hold position: the combat controller selects a visible hostile.
  }
  return [];
}
