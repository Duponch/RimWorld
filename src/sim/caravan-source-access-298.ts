import type {MaterialPile,World} from './types.ts';
import {knownCell256} from './exploration-visibility-256.ts';
import {inHome} from './repairs.ts';
import {storageCells} from './shelf-storage.ts';

/** New player-selected sources only, never navigation or ongoing promises.
 * Formation overrides Forbid; the ordinary hauling policy remains separate. */
export function captureCaravanSourceAccess298(world:World,reform=false):(pile:MaterialPile)=>string|undefined {
 let stored:ReadonlySet<number>|undefined;
 return pile=>{
  const owner=pile.owner;
  if(owner.type!=='ground')return reform?undefined:'Choisissez un bien au sol.';
  if(!Number.isInteger(owner.x)||!Number.isInteger(owner.z)||owner.x<0||owner.z<0||owner.x>=world.width||owner.z>=world.height)return 'La source ne possède pas de cellule réelle.';
  const cell=owner.z*world.width+owner.x;
  if(!knownCell256(world,cell))return 'La source n’est pas dans une cellule découverte.';
  if(reform||inHome(world,cell))return;
  // One lazy positional view per synchronous admission, no storage policy,
  // per-pile map scan, persistent cache, or work on fine Core ticks.
  stored??=new Set(storageCells(world).map(c=>c.z*world.width+c.x));
  if(!stored.has(cell))return 'La source doit être dans la zone du foyer ou un stockage.';
 };
}