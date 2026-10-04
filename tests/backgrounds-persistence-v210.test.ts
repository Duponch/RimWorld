import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { assignBackground, previewBackgroundSkills } from '../src/sim/background-generation.ts';
import { BACKGROUND_ADULT_MIN_TICKS } from '../src/sim/colonist-backgrounds.ts';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { HUMAN_YEAR_TICKS } from '../src/sim/human-age.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { advanceQuests } from '../src/sim/quests.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { startingSkills } from '../src/sim/skills.ts';
import { SCHEMA_VERSION, type Pawn, type World } from '../src/sim/types.ts';
import { visitorGroupDanger } from '../src/sim/visitors.ts';
import { backgroundArrivalWorld, backgroundQuestWorld } from './helpers/backgrounds-v210.ts';
import { commercialCamp } from './helpers/commercial-v193.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import { medicalCamp } from './scenarios/health.ts';
import { visitorTradeFixture } from './scenarios/visitors.ts';

function until(w:World,done:()=>boolean,limit=700):void {
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),`Missing background persistence boundary at tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);
}
/** A former version owns no invented biographies or offered age pair. */
function legacy190(source:World):World {
  const old=structuredClone(source);(old as {schemaVersion:number}).schemaVersion=190;
  const remove=(p:Pawn)=>{delete p.background;};
  old.pawns.forEach(remove);
  if(old.scout&&'pawn' in old.scout)remove(old.scout.pawn);
  if(old.commercialTrip&&'pawn' in old.commercialTrip)remove(old.commercialTrip.pawn);
  for(const d of old.visitors?.departed??[])remove(d.pawn);
  for(const d of old.podRescues?.departed??[])remove(d.pawn);
  if(old.arrivals?.pending){delete old.arrivals.pending.background;delete old.arrivals.pending.age;}
  for(const q of old.quests?.entries??[]){delete q.background;delete q.age;}
  return old;
}
function expectNeutralMigration(source:World):World {
  const old=legacy190(source),saved=JSON.stringify(old),expected=structuredClone(old);
  (expected as {schemaVersion:number}).schemaVersion=191;
  const restored=deserializeWorld(saved);expect(restored).toEqual(expected);expect(JSON.stringify(old)).toBe(saved);
  expect(validateWorld(restored)).toEqual([]);return restored;
}

test('strict190 migration changes only the schema through offers, original off-map owners, RNG streams and frozen departures',()=>{
  expect(SCHEMA_VERSION).toBe(191);
  const arrival=backgroundArrivalWorld(),quest=backgroundQuestWorld();
  expectNeutralMigration(arrival);expectNeutralMigration(quest);
  const scout=medicalCamp(2),p=scout.pawns[0]!;
  addGroundMaterial(scout,'food',2,{x:p.x,z:p.z+1},'survival-meal');const food=scout.piles.find(i=>i.item==='survival-meal')!;
  expect(applyCommand(scout,{type:'scout-start',pawnId:p.id,pileId:food.id,quantity:2}).ok).toBe(true);
  until(scout,()=>!!scout.scout&&'pawn' in scout.scout);
  const {world:commercial,pawnId,foodId}=commercialCamp();
  expect(applyCommand(commercial,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:600}).ok).toBe(true);
  until(commercial,()=>!!commercial.commercialTrip&&'pawn' in commercial.commercialTrip);
  for(const w of [scout,commercial]){
    const migrated=expectNeutralMigration(w),owner=migrated.scout&&'pawn' in migrated.scout?migrated.scout.pawn:migrated.commercialTrip&&'pawn' in migrated.commercialTrip?migrated.commercialTrip.pawn:undefined;
    expect(owner).toBeDefined();expect(owner!.background).toBeUndefined();
    const copy=deserializeWorld(serializeWorld(migrated));stepWorld(migrated,3);stepWorld(copy,3);expect(copy).toEqual(migrated);
  }
  const {world:visitors,traderId}=visitorTradeFixture();visitorGroupDanger(visitors,visitors.pawns.find(p=>p.id===traderId)!,'hostile');
  until(visitors,()=>!visitors.pawns.some(p=>p.id===traderId),3500);
  const old=legacy190(visitors),archive=JSON.stringify(old.visitors!.departed),migrated=expectNeutralMigration(old);
  expect(JSON.stringify(migrated.visitors!.departed)).toBe(archive);stepWorld(migrated,3);expect(JSON.stringify(migrated.visitors!.departed)).toBe(archive);
  const invalid=legacy190(arrival);invalid.pawns[0]!.id=0;expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/version 190/);
});

test('190 refuses future pasts before migration; current records reject unknown slots, incompatible careers and adult age below twenty',()=>{
  const source=backgroundArrivalWorld(),base=serializeWorld(source);
  const cases:Array<(w:World)=>void>=[
    w=>{Object.assign(w.pawns[0]!,{background:{childhood:'future-child'}});},
    w=>{Object.assign(w.pawns[0]!,{background:{childhood:'builder'}});},
    w=>{Object.assign(w.pawns[0]!,{background:{childhood:'school-child',adulthood:'school-child'}});},
    w=>{Object.assign(w.pawns[0]!,{background:{childhood:'school-child',extra:true}});},
    w=>{Object.assign(w.pawns[0]!,{age:null,background:{childhood:'school-child',adulthood:'researcher'}});},
    w=>{delete w.pawns[0]!.age;w.pawns[0]!.background={childhood:'school-child'};},
    w=>{w.pawns[0]!.background={childhood:'quiet-child',adulthood:'mercenary'};},
    w=>{w.pawns[0]!.age={biologicalTicks:BACKGROUND_ADULT_MIN_TICKS-1,chronologicalTicks:BACKGROUND_ADULT_MIN_TICKS};w.pawns[0]!.background={childhood:'school-child',adulthood:'researcher'};},
    w=>{delete w.arrivals!.pending!.age;},
    w=>{delete w.arrivals!.pending!.background;},
  ];
  for(const mutate of cases){const bad=JSON.parse(base) as World;mutate(bad);const frozen=JSON.stringify(bad);expect(()=>validateWorld(bad)).not.toThrow();expect(validateWorld(bad).length).toBeGreaterThan(0);expect(()=>deserializeWorld(frozen)).toThrow();expect(JSON.stringify(bad)).toBe(frozen);}
  const old=legacy190(source);old.pawns[0]!.background={childhood:'school-child'};
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/version 190/);
  const futureOffer=legacy190(source);Object.assign(futureOffer.arrivals!.pending!,source.arrivals!.pending!);
  expect(()=>deserializeWorld(JSON.stringify(futureOffer))).toThrow(/version 190/);
  const quest=backgroundQuestWorld(),q=quest.quests!.entries[0]!;delete q.age;
  expect(()=>deserializeWorld(JSON.stringify(quest))).toThrow();expect(serializeWorld(source)).toBe(base);
});

test('current profiles survive exact reload without gains, whereas migrated arrival and quest offers admit their former baseline',()=>{
  const current=deconstructionCamp(2),p=current.pawns[0]!;
  p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};
  assignBackground(p,{childhood:'workshop-child',adulthood:'builder'});
  p.skills.construction.xp=765432;p.skills.construction.dailyXp=765432;
  const saved=serializeWorld(current),loaded=deserializeWorld(saved);expect(loaded).toEqual(current);expect(serializeWorld(loaded)).toBe(saved);
  const arrival=expectNeutralMigration(backgroundArrivalWorld()),offer=structuredClone(arrival.arrivals!.pending!);
  expect(applyCommand(arrival,{type:'answer-arrival',offerId:offer.id,accept:true}).ok).toBe(true);
  const newcomer=arrival.pawns.at(-1)!;expect(newcomer.background).toBeUndefined();expect(newcomer.skills).toEqual(startingSkills(offer.profile));
  const quest=expectNeutralMigration(backgroundQuestWorld()),q=structuredClone(quest.quests!.entries[0]!);
  expect(applyCommand(quest,{type:'answer-quest',questId:q.id,accept:true}).ok).toBe(true);quest.tick=q.offeredAt+q.joinDelay;advanceQuests(quest);
  const refugee=quest.pawns.find(p=>p.originQuestId===q.id)!;expect(refugee.background).toBeUndefined();expect(refugee.skills).toEqual(startingSkills(q.profile));
  expect(validateWorld(arrival)).toEqual([]);expect(validateWorld(quest)).toEqual([]);
  const advertised=backgroundArrivalWorld(),captured=structuredClone(advertised.arrivals!.pending!);
  const resumed=deserializeWorld(serializeWorld(advertised));expect(resumed.arrivals!.pending).toEqual(captured);
  expect(applyCommand(resumed,{type:'answer-arrival',offerId:captured.id,accept:true}).ok).toBe(true);
  expect(resumed.pawns.at(-1)!.skills).toEqual(previewBackgroundSkills(captured.profile,captured.background!));
});

test('worker checkpoint and delta keep pasts exact and reject corrupted profiles atomically before adopting a new frame',()=>{
  const w=backgroundArrivalWorld();assignBackground(w.pawns[0]!,{childhood:'school-child'});
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=structuredClone(encoder.encode(w,0,6,true)),first=decoder.adopt(checkpoint);
  if(first.status!=='applied')throw new Error('Valid background checkpoint rejected.');const frozen=structuredClone(first.world);
  stepWorld(w);const delta=structuredClone(encoder.encode(w,0,6));
  const bad=structuredClone(delta);Object.assign(bad.world.pawns[0]!,{background:{childhood:'unknown'}});
  expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(frozen);
  const badOffer=structuredClone(delta);delete badOffer.world.arrivals!.pending!.age;
  expect(decoder.adopt(badOffer).status).toBe('resync');expect(first.world).toEqual(frozen);
  const resumed=decoder.adopt(delta);expect(resumed.status).toBe('applied');if(resumed.status==='applied')expect(resumed.world).toEqual(w);
  expect(first.world).toEqual(frozen);
});
