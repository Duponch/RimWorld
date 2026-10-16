import {medicalCamp} from './health.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {newShelfStorage} from '../../src/sim/shelf-storage.ts';
import {createDeteriorationState} from '../../src/sim/deterioration-content.ts';
import {serializeWorld} from '../../src/sim/serialization.ts';
import type {Pawn,Structure} from '../../src/sim/types.ts';
/** Finite declared stock and shelf, prospective exposure phase and private seed.
 * No exposure hit, hauling, protection or simulation tick has been played. */
export function deteriorationWorkshopV396(size=32,quantity=50){
 const world=medicalCamp(1,size),pawn=world.pawns[0]!;
 if(world.fires)world.fires.clockCore=world.tick*10;
 world.deterioration={...createDeteriorationState(world.seed,world.tick),rng:1,lastTick:world.tick-24};
 world.piles=[];pawn.x=4;pawn.z=7;pawn.hunger=pawn.rest=pawn.recreation.level=100;
 pawn.apparelAutomation=false;pawn.schedule.fill('work');pawn.planCooldown=0;
 for(const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[key]=0;
 addMaterial(world,'textile',quantity,{type:'ground',x:6,z:5},'cloth');const pileId=world.piles.at(-1)!.id;
 const shelf:Structure={id:world.nextId++,kind:'small-shelf',x:13,z:5,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([world.nextId++])};
 shelf.shelf!.settings.items={cloth:true};world.structures.push(shelf);refreshStock(world);
 return {world,initial:serializeWorld(world),pawnId:pawn.id,pileId,shelfId:shelf.id,shelfCell:{x:shelf.x,z:shelf.z},
  notice:`PRÉPARÉ : ${quantity} tissus finis au sol sec et étagère finie déclarés, Transport désactivé ; calendrier prospectif à24/25 et RNG privé1 pour observer le premier vrai essai. Aucun dommage, mouvement, rangement ou protection joué ; aucun état modifié après import.`};
}
