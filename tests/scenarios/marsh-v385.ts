import {applyCommand} from '../../src/sim/engine.ts';
import {addGroundMaterial} from '../../src/sim/materials.ts';
import {serializeWorld} from '../../src/sim/serialization.ts';
import {deconstructionCamp} from './deconstruction.ts';
import type {Pawn} from '../../src/sim/types.ts';
/** Prepared32² physical witness: original wet rectangle,10wood in its centre,
 * dry storage and one adult. No natural terrain generation or hauled output
 * is credited by this preparation. No terrain mutation occurs during play. */
export function marshWorkshopV385(){
  const world=deconstructionCamp(1,32),pawn=world.pawns[0]!;
  for(let z=12;z<=20;z++)for(let x=13;x<=18;x++)world.tiles[z*world.width+x]={terrain:'marsh'};
  pawn.x=9;pawn.z=16;pawn.hunger=pawn.rest=pawn.recreation.level=100;pawn.schedule.fill('work');pawn.apparelAutomation=false;
  for(const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[key]=0;
  pawn.priorities.haul=1;
  const marshCell={x:15,z:16},storage={x:8,z:16},dryCell={x:9,z:15};
  addGroundMaterial(world,'wood',10,marshCell,'wood');const sourceId=world.piles.at(-1)!.id;
  const accepted=applyCommand(world,{type:'stockpile',...storage,enabled:true,filters:{wood:true,food:false}});if(!accepted.ok)throw Error(accepted.reason);
  return {world,initial:serializeWorld(world),pawnId:pawn.id,marshCell,storage,dryCell,sourceId,
    notice:'PRÉPARÉ : rectangle de marais statique,10bois au centre, réserve sèche, adulte sain. Traversée/prise/dépôt restent à jouer.'};
}
