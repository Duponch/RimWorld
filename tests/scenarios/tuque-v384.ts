import {applyCommand} from '../../src/sim/engine.ts';
import {serializeWorld} from '../../src/sim/serialization.ts';
import {addGroundMaterial} from '../../src/sim/materials.ts';
import {CLOTHING_RESEARCH_COST} from '../../src/sim/research.ts';
import {deconstructionCamp} from './deconstruction.ts';
import type {Structure,Pawn} from '../../src/sim/types.ts';
/** Prepared finished manual bench, completed research and20 wool. No garment,
 * work, movement, haul or acquired textile is credited before player actions. */
export function tuqueWorkshopV384(){
  const world=deconstructionCamp(1,32),pawn=world.pawns[0]!;
  world.research={project:null,points:CLOTHING_RESEARCH_COST,completedAt:0};
  pawn.x=8;pawn.z=10;pawn.hunger=pawn.rest=pawn.recreation.level=100;pawn.schedule.fill('work');pawn.apparelAutomation=false;
  for(const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[key]=0;
  pawn.priorities.craft=1;pawn.priorities.haul=2;pawn.skills.crafting={level:8,xp:0,dailyXp:0,passion:1};
  const bench:Structure={id:world.nextId++,kind:'tailor-bench',x:10,z:10,orientation:0,footprint:'standard',material:'wood',bills:[]};world.structures.push(bench);
  addGroundMaterial(world,'textile',20,{x:8,z:12},'muffalo-wool');
  const storage={x:15,z:12};const result=applyCommand(world,{type:'stockpile',...storage,enabled:true,filters:{wood:false,food:false,apparel:true}});if(!result.ok)throw Error(result.reason);
  return {world,initial:serializeWorld(world),pawnId:pawn.id,benchId:bench.id,storage,material:'muffalo-wool' as const,product:'muffalo-wool-tuque' as const};
}
