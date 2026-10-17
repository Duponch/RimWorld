import {preparedV377LocalCheckpoint} from './secondary-site-v377';
import {secondaryContext,flushSecondaryContext} from '../../src/sim/secondary-site-context';
import {groupMemberChoices} from '../../src/sim/group-authority';
import {blockedCells} from '../../src/sim/pathfinding';
import {captureStandability} from '../../src/sim/furniture-travel';
import {candidateAccess} from '../../src/sim/candidate-access';
import {addMaterial,refreshStock} from '../../src/sim/materials';
import {serializeWorld,validateWorld} from '../../src/sim/serialization';
import type {Cell} from '../../src/sim/types';

/** Prepared local workshop only. The inherited outward route runs via the
 * real engine before the browser; it supplies no UI proof of that route.
 * No existing campaign/person is healed, no freight transfer has been played. */
export function groupFreightWorkshopV401(){
 const f=preparedV377LocalCheckpoint(),world=f.initial,local=secondaryContext(world)!;
 if(Number(world.schemaVersion)!==253||!world.secondarySite?.selected||local.group)throw Error('Adopt253 and prepare the real local V377 checkpoint first.');
 const choices=groupMemberChoices(local);
 for(const id of f.memberIds){const choice=choices.find(c=>c.pawn.id===id);if(!choice?.ok)throw Error('Prepared carrier unavailable: '+id+' '+choice?.reason);}
 const origin=local.pawns.find(p=>p.id===f.memberIds[0])!,blocked=blockedCells(local),stand=captureStandability(local),query=candidateAccess(local,origin,blocked,new Set(),true);
 const occupied=new Set([...local.resources,...local.structures,...local.pawns,...local.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[])].map(c=>c.z*local.width+c.x));
 const distance=(c:Cell)=>Math.abs(c.x-origin.x)+Math.abs(c.z-origin.z),cells:Cell[]=[];
 for(let z=0;z<local.height;z++)for(let x=0;x<local.width;x++){
  const key=z*local.width+x,c={x,z};if(!occupied.has(key)&&stand(c)&&query.has(key)&&distance(c)>=2&&distance(c)<=14)cells.push(c);
 }
 cells.sort((a,b)=>distance(a)-distance(b)||a.z-b.z||a.x-b.x);
 const woodCell=cells.find(c=>distance(c)<=4),steelCell=[...cells].reverse().find(c=>distance(c)>=10);
 const foodCell=cells.find(c=>c!==woodCell&&c!==steelCell&&distance(c)>=4);
 if(!woodCell||!steelCell||!foodCell)throw Error('The prepared real site has no declared accessible source cells.');
 // Finite authored dotation before import, not a claimed harvest/mining receipt.
 addMaterial(local,'wood',12,{type:'ground',...woodCell},'wood');const woodId=local.piles.at(-1)!.id;
 addMaterial(local,'steel',4,{type:'ground',...steelCell},'steel');const steelId=local.piles.at(-1)!.id;
 addMaterial(local,'food',4,{type:'ground',...foodCell},'survival-meal');const foodId=local.piles.at(-1)!.id;
 refreshStock(local);flushSecondaryContext(world);
 const issues=validateWorld(world);if(issues.length)throw Error('Prepared freight input invalid: '+issues.join('; '));
 return {world,initial:serializeWorld(world),memberIds:f.memberIds,residentId:f.residentId,tile:f.tile,woodId,steelId,foodId,woodCell,steelCell,
  woodQuantity:7,steelQuantity:4,foodQuantity:4,
  notice:f.notice+' DOTATION FINIE avant import : 12 bois et 4 acier au sol, 4 rations supplémentaires, cellules accessibles retenues par les lecteurs existants ; retour prévu : 7 bois (partiel), 4 acier (entier) et 4 rations. Aucun chargement/retour/dépôt de fret joué ; aucune guérison ou modification après import.'};
}
