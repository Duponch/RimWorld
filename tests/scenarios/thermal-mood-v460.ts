import {passiveCoolingFixture} from './passive-cooling.ts';
import {createDeteriorationState} from '../../src/sim/deterioration-content.ts';

/** Declared small legacy-map fixture, not a natural climatic incident or paid
 * initial room. Only the new cooler is ordered and physically paid in play.
 * Warm air, a healthy builder, room/roof and finite75wood/10rice are prepared
 * once. There is no subsequent air/need/skill/RNG refill or forced outcome. */
export function thermalMoodCamp460(){
 const world=passiveCoolingFixture(),pawn=world.pawns[0]!;
 // The historical thermal fixture prepares tick2000; initialize this declared
 // BEFORE property's deterioration owner at that same opening frontier.
 world.deterioration=createDeteriorationState(world.seed,world.tick);
 pawn.name='Maëlys du refuge';pawn.mood=80;
 return {world,pawnId:pawn.id,coolerCell:{x:16,z:16},preparation:{
  map:'Existing32² legacy map, one prepared closed4×4 room/roof; not geographic generation or a voyage.',
  person:'One existing builder with initial hunger/rest/recreation and mood80; no runtime refill or mood setter after play starts.',
  property:'Prepared room and75wood/10rice before play. The passive cooler alone is ordered, supplied and constructed through the real engine.',
  air:'One initial35°C room; every later temperature comes from real thermal exchange and sources, no temperature override after play.',
  scope:'Situation hot→comfortable and progressive meter, paid physical cooling and same whole saved continuation; not a natural season or complete campaign.'
 }};
}
