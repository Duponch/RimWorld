import { encounterCamp } from './encounter.ts';
import { fixtureBuilding } from './deconstruction.ts';
import { applyCommand } from '../../src/sim/engine.ts';

/** A sleeping colonist near an awake exposed ally. The enemy fires normally;
 * no timer, wound, impact or reaction is injected into the running simulation. */
export function nightEncounter(){
  const w=encounterCamp(),p=w.pawns[0],ally=w.pawns[1];
  applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false});
  const bed=fixtureBuilding(w,'bed',6,10);p.bedId=bed.id;p.rest=10;p.schedule.fill('sleep');
  p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:6,z:10}};p.state='sleeping';
  Object.assign(ally,{x:8,z:11});ally.hostilityResponse='ignore';
  return w;
}
