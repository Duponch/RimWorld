import {applyCommand} from '../../src/sim/engine.ts';
import {addGroundMaterial} from '../../src/sim/materials.ts';
import {serializeWorld} from '../../src/sim/serialization.ts';
import {deconstructionCamp} from './deconstruction.ts';
import type {Pawn} from '../../src/sim/types.ts';
/** Prepared 250² witness, not a generated natural colony. No work is played. */
export function bridgeWorkshopV387(size=250){
  const world=deconstructionCamp(1,size),pawn=world.pawns[0]!,cx=Math.floor(size/2),cz=Math.floor(size/2);
  for(let z=0;z<size;z++)world.tiles[z*size+cx]={terrain:'marsh'};
  pawn.x=cx-5;pawn.z=cz;pawn.hunger=pawn.rest=pawn.recreation.level=100;pawn.schedule.fill('work');pawn.apparelAutomation=false;
  for(const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[key]=0;
  pawn.priorities.build=1;
  const bridgeCell={x:cx,z:cz},woodCell={x:cx-2,z:cz},cargoCell={x:cx+4,z:cz},storage={x:cx-4,z:cz};
  addGroundMaterial(world,'wood',12,woodCell,'wood');const woodId=world.piles.at(-1)!.id;
  addGroundMaterial(world,'wood',10,cargoCell,'wood');const cargoId=world.piles.at(-1)!.id;
  const result=applyCommand(world,{type:'stockpile',...storage,enabled:true,filters:{wood:true,food:false}});if(!result.ok)throw Error(result.reason);
  return {world,initial:serializeWorld(world),pawnId:pawn.id,bridgeCell,woodCell,woodId,cargoCell,cargoId,storage,
    bankWest:{x:cx-1,z:cz},bankEast:{x:cx+1,z:cz},
    notice:'PRÉPARÉ : carte250² nue, bande de marais, adulte sain,12bois de chantier et10bois de cargaison distincts. Construction, transport, passage et retrait restent à jouer.'};
}
