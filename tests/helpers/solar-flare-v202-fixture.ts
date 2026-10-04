import assert from 'node:assert/strict';
import { createWorld,stepWorld } from '../../src/sim/engine.ts';
import { adoptWorldIncidents } from '../../src/sim/cassandra-world.ts';
import { crashlandedProfile } from '../../src/sim/game-profile.ts';
import { resolveSite } from '../../src/sim/site.ts';
import { enableCassandraRaids,consumeCassandraOpportunity } from '../../src/sim/cassandra-raids.ts';
import { newPowerState,isElectrical,isPowerActive } from '../../src/sim/power-rules.ts';
import { BATTERY_ENERGY_SCALE } from '../../src/sim/power-battery.ts';
import { BATTERIES_RESEARCH_COST,CLOTHING_RESEARCH_COST,AIR_CONDITIONING_COST } from '../../src/sim/research.ts';
import { newBuildingFuel,isFueledBuilding,WOOD_BURN_TICKS } from '../../src/sim/fuel.ts';
import { newCoolerState } from '../../src/sim/cooler.ts';
import { newDoorState } from '../../src/sim/door-rules.ts';
import { createMedicalRecord } from '../../src/sim/injury-state.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import { reconcilePower } from '../../src/sim/power.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import { stationRecipe } from '../../src/sim/production-recipes.ts';
import { initializeWildFlora } from '../../src/sim/wild-flora.ts';
import { adoptFluIncidents } from '../../src/sim/flu-incidents.ts';
import type { Pawn,Structure,StructureKind,World } from '../../src/sim/types.ts';

export const SOLAR_FLARE_CELLS={lamp:{x:13,z:14},ordinary:{x:9,z:8},cooler:{x:10,z:6},battery:{x:19,z:16},generator:{x:21,z:14},passive:{x:9,z:14},campfire:{x:5,z:16},stove:{x:3,z:22}} as const;
export const SOLAR_FLARE_FUTURE_RNG=2472303839;
export const SOLAR_FLARE_START=90100;

/** Prepared apparatus, charge and healthy actors. Forty genuine precondition
 * ticks establish ordinary startup; the future incident has not yet occurred. */
export function prepareSolarFlareDemo():World {
  const w=createWorld(202,32,32);w.tick=SOLAR_FLARE_START-41;w.gameProfile=crashlandedProfile();
  w.scenario={id:'crashlanded',revision:8,landing:{x:4,z:10}};
  w.site=resolveSite(w.seed,{hilliness:'flat',biome:'temperate-forest'});
  enableCassandraRaids(w);consumeCassandraOpportunity(w,w.raids!);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];w.jobs=[];w.packed=[];
  w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.events=[];
  assert.equal(w.site.revision,2);if(w.site.revision===2)initializeWildFlora(w,w.site);
  w.research={project:null,points:CLOTHING_RESEARCH_COST,completedAt:w.tick,
    airConditioning:{points:AIR_CONDITIONING_COST,completedAt:w.tick},batteries:{points:BATTERIES_RESEARCH_COST,completedAt:w.tick}};
  for(const [i,p] of w.pawns.entries()) {
    p.x=4;p.z=10+i*2;p.hunger=p.rest=100;p.recreation.level=100;p.health=createMedicalRecord(w.tick);
    p.schedule.fill('work');p.apparelAutomation=false;
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  }
  function add(kind:StructureKind,x:number,z:number,material:Structure['material']='steel'):Structure {
    const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material};
    if(isElectrical(kind))s.power=newPowerState(kind);
    if(isFueledBuilding(kind)){s.fuel=newBuildingFuel(kind);if(kind==='wood-generator'||kind==='fueled-stove')s.fuel.ticks=(kind==='wood-generator'?75:50)*WOOD_BURN_TICKS;}
    if(kind==='cooler'){s.cooler=newCoolerState();s.cooler.target=-5;}
    if(kind==='door')s.door=newDoorState(w.tick);
    if(stationRecipe(s))s.bills=[];
    w.structures.push(s);return s;
  }
  const roof:number[]=[];
  function room(x1:number,z1:number,x2:number,z2:number,doorX:number,withCooler=false):void {
    for(let z=z1;z<=z2;z++)for(let x=x1;x<=x2;x++) {
      if(x===x1||x===x2||z===z1||z===z2){
        if(withCooler&&x===10&&z===z1)add('cooler',x,z);
        else add(x===doorX&&z===z2?'door':'wall',x,z,'wood');
      }else roof.push(z*w.width+x);
    }
  }
  room(7,6,12,11,9,true);room(8,12,18,21,13);
  w.roofing={constructed:roof,build:[],remove:[],cursor:0};
  for(const x of [21,23,25])add('wood-generator',x,14);
  for(let x=15;x<=20;x++)add('power-conduit',x,15);
  for(let z=9;z<15;z++)add('power-conduit',15,z);
  const battery=add('battery',19,16);battery.battery={stored:400*BATTERY_ENERGY_SCALE};
  add('sun-lamp',13,14);add('standing-lamp',9,8);add('passive-cooler',9,14,'wood');
  add('campfire',5,16,'wood');add('fueled-stove',3,22);add('electric-tailor-bench',20,22);
  add('tailor-bench',9,24,'wood');add('research-bench',14,24,'wood');
  for(const x of [12,13,14])w.resources.push({id:w.nextId++,kind:'rice',x,z:16,amount:6,growth:.3,growthTick:w.tick});
  addGroundMaterial(w,'food',10,{x:9,z:9},'rice');addGroundMaterial(w,'food',6,{x:4,z:18},'survival-meal');
  addGroundMaterial(w,'wood',40,{x:4,z:20});addGroundMaterial(w,'textile',30,{x:4,z:24},'cloth');
  reconcilePower(w);adoptFluIncidents(w);adoptWorldIncidents(w);w.worldIncidents!.rng=SOLAR_FLARE_FUTURE_RNG;refreshStock(w);
  stepWorld(w,40);
  assert.equal(w.tick,SOLAR_FLARE_START-1);assert.equal(w.worldIncidents!.checks,0);assert.equal(w.worldIncidents!.active,undefined);
  assert.ok(isPowerActive(w.structures.find(s=>s.kind==='sun-lamp')!));
  assert.ok(w.resources.every(r=>r.growthLight==='artificial-full'));
  assert.deepEqual(validateWorld(w),[]);return w;
}
