import { medicalCamp } from '../scenarios/health.ts';
import { refreshStock } from '../../src/sim/materials.ts';
import { createPlantLife } from '../../src/sim/plant-life.ts';
import { adoptSiteClimate } from '../../src/sim/site-climate.ts';
import type { Resource,World } from '../../src/sim/types.ts';

/** Neutral prepared field, not a claim of an elapsed natural growing season.
 * Sowing, movement, harvesting and medicine transfer are left to real actions. */
export function healrootCamp(size=16,count=1):World {
  const world=medicalCamp(count,size);
  world.resources=[];world.piles=[];world.jobs=[];world.structures=[];world.packed=[];
  world.stockpiles=[];world.growingZones=[];world.growingCursor=0;
  if(world.wildlife)world.wildlife.animals=[];
  for(const [i,pawn] of world.pawns.entries()){
    Object.assign(pawn,{x:4,z:4+i*2,hunger:100,rest:100,jobId:null,need:null,haul:null,cooking:null,path:[],planCooldown:0,state:'idle'});
    delete pawn.health;
    pawn.skills.plants={level:8,xp:0,dailyXp:0,passion:0};
    pawn.priorities.grow=1;pawn.priorities.gather=1;
  }
  refreshStock(world);return world;
}

/** An explicitly prepared maturity; callers proving acquisition must sow first. */
export function cultivatedHealroot(world:World,growth=1,x=5,z=4):Resource {
  const plant:Resource={id:world.nextId++,kind:'healroot',amount:1,x,z,growth,growthTick:world.tick};
  if(world.climate)plant.plantLife=createPlantLife(world,plant,true);
  world.resources=[...world.resources,plant];return plant;
}

export function climaticHealrootCamp(size=16,count=1):World {
  const world=healrootCamp(size,count);adoptSiteClimate(world);return world;
}
