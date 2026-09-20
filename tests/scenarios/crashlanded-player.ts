import { isColonist } from '../../src/sim/affiliation.ts';
import { queryOrderOptions } from '../../src/sim/player-orders.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';
import { survivorDecisions } from './survivor-player.ts';

/** Same ordinary camp policy, with preparation using only the actual weapon
 * and vest. Responds to the raid letter, never to a hidden future deadline. */
export function crashlandedDecisions(w:World):Decision[] {
  const people=w.pawns.filter(p=>isColonist(p)&&p.state!=='dead'&&p.state!=='downed'&&!p.mental?.crisis);
  const defender=people.find(p=>w.piles.some(i=>i.owner.type==='equipment'&&i.owner.pawnId===p.id));
  if(w.raids?.active) {
    if(defender&&!defender.draft)return [{reason:'La lettre annonce une attaque : mobiliser la personne équipée du revolver.',command:{type:'draft',pawnIds:[defender.id],enabled:true}}];
    if(defender?.draft?.holdFire)return [{reason:'Autoriser le tir contre les assaillants qui approchent.',command:{type:'fire-at-will',pawnIds:[defender.id],enabled:true}}];
    return [];
  }
  const drafted=people.filter(p=>p.draft).map(p=>p.id);
  if(drafted.length)return [{reason:'L’assaut est terminé : reprendre les activités civiles et les soins.',command:{type:'draft',pawnIds:drafted,enabled:false}}];
  const out=survivorDecisions(w),candidate=defender??[...people].sort((a,b)=>b.skills.shooting.level-a.skills.shooting.level||a.id-b.id)[0];
  if(!candidate||candidate.equipmentTask||candidate.orders.active!==null||candidate.need||candidate.hunger<50||candidate.rest<40)return out;
  const wanted=defender?'flak-vest':'revolver';
  if(w.piles.some(i=>i.item===wanted&&(i.owner.type==='equipment'||i.owner.type==='apparel')&&i.owner.pawnId===candidate.id))return out;
  const item=w.piles.find(i=>i.item===wanted&&i.owner.type==='ground'&&queryOrderOptions(w,candidate.id,i.owner).some(o=>o.equipmentItemId===i.id&&o.enabled));
  if(item)out.push({reason: wanted==='revolver'?'Préparer la défense avec le revolver réellement fourni.':'Enfiler le gilet avant de reprendre le travail.',command:{type:'order-equipment',pawnId:candidate.id,itemId:item.id,action:wanted==='revolver'?'equip':'wear',queue:false}});
  return out;
}
