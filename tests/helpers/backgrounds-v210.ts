import { advanceArrivals, enableArrivals } from '../../src/sim/arrivals.ts';
import { assignBackground } from '../../src/sim/background-generation.ts';
import { enableCassandraRaids, INTRO_RAID_TICK } from '../../src/sim/cassandra-raids.ts';
import { adoptFluIncidents } from '../../src/sim/flu-incidents.ts';
import { crashlandedProfile } from '../../src/sim/game-profile.ts';
import { injurePawn } from '../../src/sim/health.ts';
import { HUMAN_YEAR_TICKS } from '../../src/sim/human-age.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import { addMaterial, refreshStock } from '../../src/sim/materials.ts';
import { advanceQuests, enableQuests } from '../../src/sim/quests.ts';
import { advanceRaids } from '../../src/sim/raids.ts';
import { deconstructionCamp } from '../scenarios/deconstruction.ts';
import { medicalCamp } from '../scenarios/health.ts';

/** Prepared calendar boundary; the ordinary producer creates the actual offer. */
export function backgroundArrivalWorld() {
  const world=deconstructionCamp(2);
  enableArrivals(world);world.tick=world.arrivals!.nextCheck;advanceArrivals(world);
  if(!world.arrivals!.pending)throw new Error('Expected the prepared arrival opportunity to produce an offer.');
  return world;
}

/** Reuses the V183 boundary: the real introductory raid is resolved before the
 * first real quest opportunity. No invented quest state or admission exists. */
export function backgroundQuestWorld() {
  const world=deconstructionCamp(3);
  world.scenario={id:'crashlanded',revision:1,landing:{x:16,z:16}};
  world.gameProfile=crashlandedProfile();enableCassandraRaids(world);adoptFluIncidents(world);enableQuests(world);
  world.tick=INTRO_RAID_TICK;advanceRaids(world);
  const raider=world.pawns.find(p=>p.id===world.raids!.active?.members[0]);
  if(!raider)throw new Error('Expected the introductory raid.');
  injurePawn(world,raider,'brain','crush',99000);advanceRaids(world);
  world.tick=world.quests!.nextCheck;advanceQuests(world);
  if(world.quests!.entries[0]?.status!=='offered')throw new Error('Expected the prepared quest opportunity to produce an offer.');
  return world;
}

/** Native UI fixture using the existing healthy camp and an unfinished physical
 * frame. Names are deliberately literal text. No work/refusal/admission is
 * already performed, and this fixture does not add a public scenario. */
export function backgroundNativeFixture() {
  const world=medicalCamp(2),restricted=world.pawns[0]!,builder=world.pawns[1]!;
  for(const p of world.pawns){p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};delete p.health;}
  restricted.name='<b>Prudent</b> & calme';restricted.x=10;restricted.z=12;restricted.priorities.build=2;
  builder.name='Bâtisseuse capable';builder.x=18;builder.z=12;builder.priorities.build=1;
  assignBackground(restricted,{childhood:'quiet-child',adulthood:'merchant'});
  assignBackground(builder,{childhood:'workshop-child',adulthood:'builder'});
  if(!applyCommand(world,{type:'designate',kind:'bed',material:'wood',x:21,z:12}).ok)throw new Error('Expected an admissible bed frame.');
  const job=world.jobs.at(-1)!;job.construction='frame';addMaterial(world,'wood',45,{type:'job',jobId:job.id});refreshStock(world);
  enableArrivals(world);world.tick=world.arrivals!.nextCheck;advanceArrivals(world);
  const offer=world.arrivals!.pending;if(!offer)throw new Error('Expected the arrival preview fixture.');
  offer.name='<i>Voyageuse</i> & libre';
  return {world,restrictedId:restricted.id,builderId:builder.id,jobId:job.id};
}
