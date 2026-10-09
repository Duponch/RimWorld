import { medicalCamp } from '../scenarios/health.ts';
import { fixturePower } from '../scenarios/power.ts';
import { MICROELECTRONICS_RESEARCH_COST } from '../../src/sim/research.ts';
import { addGroundMaterial } from '../../src/sim/materials.ts';
import { adoptOrbital,createOrbitalShip } from '../../src/sim/orbital.ts';
import type { OrbitalKind } from '../../src/sim/orbital-state.ts';
import type { Structure } from '../../src/sim/types.ts';

/** Prepared economy; the native construction path may remove the two devices. */
export function orbitalCamp(kind:OrbitalKind='bulk',size=32){
  const world=medicalCamp(2,size);world.resources=[];world.jobs=[];world.piles=[];world.structures=[];world.packed=[];delete world.orbital;
  world.research={points:0,project:null,microelectronics:{points:MICROELECTRONICS_RESEARCH_COST,completedAt:2900}};
  for(const p of world.pawns){delete p.health;delete p.background;delete p.traits;
    p.hunger=100;p.rest=100;p.mood=90;p.recreation.level=100;p.skills.social={level:8,xp:0,dailyXp:0,passion:1};p.skills.construction={level:8,xp:0,dailyXp:0,passion:1};p.priorities.build=1;}
  const negotiator=world.pawns[0]!;Object.assign(negotiator,{x:12,z:14});Object.assign(world.pawns[1]!,{x:9,z:13});
  const generator=fixturePower(world,'wood-generator',12,11);
  const console:Structure={id:world.nextId++,kind:'comms-console',x:15,z:13,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:generator.id}};
  const beacon:Structure={id:world.nextId++,kind:'orbital-beacon',x:12,z:15,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:generator.id}};
  world.structures.push(console,beacon);adoptOrbital(world);
  const ship=createOrbitalShip(world,kind);if(!ship)throw Error('Orbital fixture ship admission failed');
  addGroundMaterial(world,'silver',1500,{x:11,z:15},'silver');
  addGroundMaterial(world,'gold',25,{x:11,z:16},'gold');
  addGroundMaterial(world,'steel',160,{x:10,z:15},'steel');
  addGroundMaterial(world,'component',5,{x:10,z:17},'component');
  world.events=[];
  return {world,negotiatorId:negotiator.id,shipId:ship.id,consoleId:console.id,beaconId:beacon.id,generatorId:generator.id};
}
