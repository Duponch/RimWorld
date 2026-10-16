import {medicalCamp} from './health.ts';
import {fixtureBuilding} from './deconstruction.ts';
import {addMaterial} from '../../src/sim/materials.ts';
import {applyCommand} from '../../src/sim/engine.ts';
import {serializeWorld} from '../../src/sim/serialization.ts';
import {RESEARCH_SCALE} from '../../src/sim/research.ts';
import type {Pawn} from '../../src/sim/types.ts';

/** Finite prepared camp, no research/cooking/hauling/eating step played. */
export function pemmicanWorkshopV389(size=32){
  const world=medicalCamp(1,size),pawn=world.pawns[0]!;world.piles=[];pawn.x=4;pawn.z=7;
  pawn.hunger=60;pawn.rest=pawn.recreation.level=100;pawn.apparelAutomation=false;pawn.schedule.fill('work');
  for(const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[key]=0;
  pawn.priorities.research=1;pawn.priorities.cook=2;
  pawn.skills.cooking={level:4,xp:0,dailyXp:0,passion:0};pawn.skills.intellectual={level:8,xp:0,dailyXp:0,passion:0};
  world.research={points:0,project:null,pemmican:{points:499*RESEARCH_SCALE}};
  world.foodPolicies[0]={...world.foodPolicies[0]!,allowed:['pemmican']};pawn.foodPolicyId=1;
  const fire=fixtureBuilding(world,'campfire',7,5),desk=fixtureBuilding(world,'research-bench',7,9);
  Object.assign(desk,{material:'wood'}); // Prepared finished bench; its material is explicit like a valid live building.
  addMaterial(world,'food',5,{type:'ground',x:5,z:4},'hare-meat');const meatId=world.piles.at(-1)!.id;
  addMaterial(world,'food',5,{type:'ground',x:5,z:6},'rice');const riceId=world.piles.at(-1)!.id;
  const storage={x:10,z:6};const placed=applyCommand(world,{type:'stockpile',...storage,enabled:true,filters:{wood:false,food:true}});if(!placed.ok)throw Error(placed.reason);
  fixtureBuilding(world,'wall',10,7);world.roofing={constructed:[storage.z*world.width+storage.x],build:[],remove:[],cursor:0};
  return {world,initial:serializeWorld(world),pawnId:pawn.id,stationId:fire.id,deskId:desk.id,meatId,riceId,storage,
    notice:'PRÉPARÉ32² : adulte sain, Cuisine4/Intelligence8, faim60, recherche499/500 et bureau fini, feu fini avec son combustible réel,5viandes+5riz, réserve couverte avec mur/toit préparés. Aucun dernier point, recette, production, rangement ou ingestion joué ; aucun stock naturel prétendu. Voyage non couvert.'};
}
