import {prepareGroupScenario} from '../../src/sim/group-scenario.ts';
import {createMedicalRecord} from '../../src/sim/injury-state.ts';
import {generatePlanet,planetHomeInput} from '../../src/sim/planet-generation.ts';
import {applyCommand,stepWorld} from '../../src/sim/engine.ts';
import {groupMemberChoices} from '../../src/sim/group-authority.ts';
import {secondaryContext} from '../../src/sim/secondary-site-context.ts';
import {serializeWorld} from '../../src/sim/serialization.ts';
import type {Command,World} from '../../src/sim/types.ts';

export function nativeV377Fixture(){
  const initial=prepareGroupScenario();
  for(const pawn of initial.pawns)pawn.health=createMedicalRecord(initial.tick);
  // Read-only draft determines a fixed neighbouring tile. The actual globe
  // is adopted through its player button during the full native scenario.
  const draft=generatePlanet(initial.seed,planetHomeInput(initial),initial.tick,1);
  // Fixed warm neighbour52: transport/work fixture, not winter survival.
  const tile=52;if(!draft.tiles[draft.homeTile]!.neighbours.includes(tile))throw Error('Le voisin fixe52 doit rester adjacent.');
  return {initial,tile,memberIds:initial.pawns.slice(0,2).map(p=>p.id),residentId:initial.pawns[2]!.id,
    notice:'Préparation32² V216, voisin tempéré52 fixe : trois personnes originales saines, foyer et stocks finis au sol. Aucun globe adopté, formation, prise, départ, voyage, entrée ou travail sur le second site acquis.'};
}

/** CPU preparation only, opt-in and named separately by the native test.
 * Executes the same real commands/ticks; never marks these transitions as UI
 * evidence. ROOT can also supply a saved complete checkpoint instead. */
export function preparedV377LocalCheckpoint(){
  const f=nativeV377Fixture(),w=f.initial;
  const command=(c:Command)=>{const r=applyCommand(w,c);if(!r.ok)throw Error(r.reason??'Commande préparatoire refusée.');};
  const until=(done:()=>boolean,max=12000)=>{let n=0;while(!done()&&n++<max)stepWorld(w);if(!done())throw Error('Préparation CPU locale bornée interrompue : '+w.tick);};
  command({type:'planet-adopt'});
  until(()=>f.memberIds.every(id=>groupMemberChoices(w).some(c=>c.pawn.id===id&&c.ok)));
  let left=8;const sources:{pileId:number;quantity:number}[]=[];
  for(const p of w.piles)if(left&&p.owner.type==='ground'&&p.item==='survival-meal'&&!p.foodPoison){const quantity=Math.min(left,4,p.quantity);sources.push({pileId:p.id,quantity});left-=quantity;}
  if(left)throw Error('La préparation manque de provisions finies.');
  command({type:'group-start',memberIds:f.memberIds,destination:f.tile,sources});
  until(()=>w.group?.phase==='at-site');command({type:'secondary-enter'});
  until(()=>!secondaryContext(w)!.group);
  return {...f,initial:w,notice:'CHECKPOINT LOCAL PRÉPARÉ : formation, prises, voyage et entrée réellement exécutés par le moteur CPU avant le navigateur. Le parcours natif commence sur le second site et ne revendique pas cet aller comme preuve UI.',serialized:serializeWorld(w)};
}
