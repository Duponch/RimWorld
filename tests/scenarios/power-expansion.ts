import { foodWorkstationCamp } from './food-workstations';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import { RESEARCH_SCALE } from '../../src/sim/research';
import type { World } from '../../src/sim/types';

/** Controlled construction checkpoint. Stock and near-complete research are
 * explicit preparations; the long colony pilot supplies its own economy. */
export function powerExpansionFixture(): World {
  const world=foodWorkstationCamp(); world.tick=1000;
  const researcher=world.pawns[0]!; Object.assign(researcher,{x:13,z:18,name:'Électricienne'});
  researcher.priorities.basic=1; researcher.priorities.build=2; researcher.priorities.haul=3; researcher.priorities.research=1;
  researcher.skills.intellectual={level:10,xp:0,dailyXp:0,passion:1};
  const builder=structuredClone(researcher); builder.id=world.nextId++; builder.name='Bâtisseur'; builder.x=12; builder.z=18;
  builder.priorities.research=0; builder.priorities.build=1; world.pawns.push(builder);
  world.structures.push({id:world.nextId++,kind:'research-bench',material:'wood',x:16,z:18,orientation:0,footprint:'standard'},
    {id:world.nextId++,kind:'wall',material:'wood',x:6,z:10,orientation:0,footprint:'standard'});
  world.research={project:null,points:0,batteries:{points:400*RESEARCH_SCALE-100_000},solarPower:{points:600*RESEARCH_SCALE-100_000}};
  for(const x of [11,12,13,14])addGroundMaterial(world,'steel',75,{x,z:16},'steel');
  addGroundMaterial(world,'component',8,{x:15,z:16},'component');
  addGroundMaterial(world,'wood',10,{x:16,z:16},'wood');
  addGroundMaterial(world,'food',8,{x:17,z:16},'survival-meal');
  refreshStock(world);return world;
}
