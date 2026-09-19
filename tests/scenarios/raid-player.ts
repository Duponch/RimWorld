import { isColonist } from '../../src/sim/affiliation.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** Ordinary camp policy: rally on the letter, hold and defend, resume civilians
 * once the assault is resolved. Existing medical priorities own the aftermath. */
export function raidDefenseDecisions(w:World):Decision[] {
  const people=w.pawns.filter(p=>isColonist(p)&&p.state!=='dead'&&p.state!=='downed'&&!p.mental?.crisis);
  if(w.raids?.active){const ids=people.filter(p=>!p.draft).map(p=>p.id);return ids.length?[{reason:'Une attaque arrive : mobiliser les personnes valides et défendre le camp.',command:{type:'draft',pawnIds:ids,enabled:true}}]:[];}
  const ids=people.filter(p=>p.draft).map(p=>p.id);
  return ids.length?[{reason:'Assaut terminé : démobiliser pour soigner et reprendre les travaux.',command:{type:'draft',pawnIds:ids,enabled:false}}]:[];
}
