import {newCampfireFuel} from '../../src/sim/fuel.ts';
import {serializeWorld} from '../../src/sim/serialization.ts';
import {deconstructionCamp} from './deconstruction.ts';
import {COMPLEX_FURNITURE_RESEARCH_COST} from '../../src/sim/research.ts';
import {addGroundMaterial} from '../../src/sim/materials.ts';
import {newVentState} from '../../src/sim/vent.ts';
import {reconcileTemperature} from '../../src/sim/temperature.ts';
import type {World} from '../../src/sim/types.ts';

/** Explicit prepared workshop, no performed construction or delivered steel.
 * Suitable for the ordinary commands and a short UI trip, not a played winter. */
export function ventWorkshopV383(){
  const w=deconstructionCamp(1,32),pawn=w.pawns[0]!;
  w.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0}};
  pawn.schedule.fill('work');pawn.priorities.build=1;pawn.priorities.basic=1;pawn.priorities.haul=2;
  addGroundMaterial(w,'steel',30,{x:10,z:14},'steel');
  return {w,pawnId:pawn.id,site:{x:15,z:16,orientation:0 as const},source:{x:10,z:14},notice:'PRÉPARÉ : chantier libre, recherche Mobilier complexe et30acier au sol ; aucune construction, prise, ouverture ou chauffe jouée.'};
}
/** Pure thermal witness: two enclosed rooms of8 and16 cells, a prebuilt open
 * vent in their partition. Walls/roof/vent are declared, not acquired here. */
export function ventRoomWitnessV383():World{
  const {w}=ventWorkshopV383();w.piles=[];
  const wall=(x:number,z:number)=>w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard',material:'steel'});
  for(let x=2;x<=10;x++){wall(x,2);wall(x,7);}
  for(let z=3;z<7;z++){wall(2,z);wall(10,z);if(z!==4)wall(5,z);}
  w.structures.push({id:w.nextId++,kind:'vent',x:5,z:4,orientation:1,footprint:'standard',material:'steel',vent:newVentState()});
  const cells:number[]=[];for(let z=3;z<7;z++)for(let x=3;x<10;x++)cells.push(z*w.width+x);
  w.roofing={constructed:cells,build:[],remove:[],cursor:0};reconcileTemperature(w);return w;
}

/** UI preparation only: finite fire, walls/roof and knowledge are declared.
 * The shared wall contains an EMPTY gap; actual steel delivery/building must
 * close it. The fire recreates a gradient after the two regions are split. */
export function preparedVentNativeV383(){
  const {w,pawnId}=ventWorkshopV383();w.piles=[];
  const wall=(x:number,z:number)=>w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard',material:'steel'});
  for(let x=12;x<=19;x++){wall(x,10);wall(x,20);}
  for(let z=11;z<20;z++){wall(12,z);wall(19,z);}
  for(let x=13;x<19;x++)if(x!==16)wall(x,15);
  const fireId=w.nextId++;w.structures.push({id:fireId,kind:'campfire',x:14,z:12,orientation:0,footprint:'standard',material:'wood',fuel:newCampfireFuel(),bills:[]});
  const roof:number[]=[];for(let z=11;z<20;z++)for(let x=13;x<19;x++)roof.push(z*w.width+x);
  w.roofing={constructed:roof,build:[],remove:[],cursor:0};
  const pawn=w.pawns.find(p=>p.id===pawnId)!;pawn.x=14;pawn.z=17;pawn.priorities.basic=0;
  addGroundMaterial(w,'steel',30,{x:14,z:18},'steel');reconcileTemperature(w);
  const ventCell={x:16,z:15},orientation=0 as const;
  return {world:w,initial:serializeWorld(w),pawnId,ventCell,orientation,faceCells:[{x:16,z:16},{x:16,z:14}] as const,
    thermalPoints:[{x:14,z:12},{x:14,z:18}] as const,source:{x:14,z:18},fireId,
    notice:'PRÉPARÉ : deux zones murées/toit avec ouverture vide, un feu de camp fini chargé et Mobilier complexe ; exactement30acier au sol. Aucune livraison, construction, commutation ou chauffe jouée. Basic0 pour conserver la demande visible.'};
}
