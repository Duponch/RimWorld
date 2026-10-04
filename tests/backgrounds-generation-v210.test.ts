import { expect, test } from 'vitest';
import { advanceArrivals } from '../src/sim/arrivals.ts';
import { assignBackground, assignOfferedBackground, generateBackground, generatePawnBackground, previewBackgroundSkills } from '../src/sim/background-generation.ts';
import { BACKGROUND_ADULT_MIN_TICKS, BACKGROUND_SKILL_IDS, backgroundGains, backgroundSkillRefusal, validBackground, violentWorkRefusal } from '../src/sim/colonist-backgrounds.ts';
import { applyCommand, createWorld } from '../src/sim/engine.ts';
import { HUMAN_YEAR_TICKS, advanceHumanAge, initialHumanAilments, type HumanAge } from '../src/sim/human-age.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { advancePodRescues, resolveSelectedPodRescue } from '../src/sim/pod-rescue.ts';
import { advanceQuests } from '../src/sim/quests.ts';
import { createRaidGroup } from '../src/sim/raid-spawn.ts';
import { enableRaids } from '../src/sim/raids.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { startingSkills } from '../src/sim/skills.ts';
import { startingPawn } from '../src/sim/starting-pawns.ts';
import { backgroundArrivalWorld, backgroundQuestWorld } from './helpers/backgrounds-v210.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import { visitorTradeFixture } from './scenarios/visitors.ts';

const age=(ticks:number):HumanAge=>({biologicalTicks:ticks,chronologicalTicks:ticks});

test('prospective selection is deterministic, compatible at twenty and filters both fighter slots without consuming world RNG',()=>{
  const w=createWorld(210,32,32),before=structuredClone(w),childAge=age(BACKGROUND_ADULT_MIN_TICKS-1),adultAge=age(BACKGROUND_ADULT_MIN_TICKS);
  const childhoods=new Set(),adulthoods=new Set();
  for(let id=1;id<=96;id++){
    const child=generateBackground(w.seed,id,childAge),adult=generateBackground(w.seed,id,adultAge),fighter=generateBackground(w.seed,id,adultAge,true),negotiator=generateBackground(w.seed,id,adultAge,false,true);
    expect(child.adulthood).toBeUndefined();expect(adult.childhood).toBe(child.childhood);expect(adult.adulthood).toBeDefined();
    expect(generateBackground(w.seed,id,adultAge)).toEqual(adult);expect(validBackground(adult,191,adultAge)).toBe(true);
    expect(violentWorkRefusal({background:fighter})).toBeUndefined();
    expect(backgroundSkillRefusal({background:negotiator},'social')).toBeUndefined();
    childhoods.add(adult.childhood);adulthoods.add(adult.adulthood);
  }
  expect(childhoods.size).toBeGreaterThan(1);expect(adulthoods.size).toBeGreaterThan(1);expect(w).toEqual(before);
  expect(validBackground({childhood:'quiet-child',adulthood:'mercenary'},191,adultAge)).toBe(false);
  const p=w.pawns[0]!;p.age=childAge;assignBackground(p,{childhood:'school-child'});
  advanceHumanAge(w,p);expect(p.age.biologicalTicks).toBe(BACKGROUND_ADULT_MIN_TICKS);expect(p.background).toEqual({childhood:'school-child'});
});

test('birth gains add once, clamp levels and preserve XP/passions; offer preview is exact and cannot mutate its input',()=>{
  const p=startingPawn(21,'Création',12,12,1,55,210),background={childhood:'workshop-child',adulthood:'builder'} as const;
  p.skills.construction={level:18,xp:123,dailyXp:456,passion:2};
  const before=structuredClone(p.skills);assignBackground(p,background);
  expect(p.skills.construction).toEqual({level:20,xp:123,dailyXp:456,passion:2});
  expect(p.skills.crafting).toEqual({level:4,xp:0,dailyXp:0,passion:0});expect(p.skills.shooting).toEqual(before.shooting);
  expect(before.construction.level).toBe(18);const born=structuredClone(p);
  assignBackground(p,{childhood:'school-child',adulthood:'researcher'});generatePawnBackground(p,999);
  expect(p).toEqual(born);
  const offer={profile:2,background:{childhood:'quiet-child',adulthood:'medic'} as const},frozen=structuredClone(offer);
  const preview=previewBackgroundSkills(offer.profile,offer.background),newcomer=startingPawn(23,'Offre',0,12,offer.profile,55,210);
  assignBackground(newcomer,offer.background);expect(preview).toEqual(newcomer.skills);expect(offer).toEqual(frozen);
  preview.medicine.level=0;expect(newcomer.skills.medicine.level).toBe(12);expect(previewBackgroundSkills(offer.profile,offer.background).medicine.level).toBe(12);
  // A younger captured age must remove allocation-time old-age conditions.
  const allocated=startingPawn(24,'Âge capturé',0,14,0,55,210);
  allocated.health=createMedicalRecord(0);allocated.health.ageAilments=['bad-back','frail'];
  assignOfferedBackground(allocated,{age:age(18*HUMAN_YEAR_TICKS),background:{childhood:'school-child'}},210,0);
  expect(allocated.health.ageAilments).toBeUndefined();
});

test('new camp starters record useful authored pasts while the neutral world factory remains historical and unchanged',()=>{
  const neutral=createWorld(42,32,32);expect(neutral.pawns.every(p=>p.background===undefined)).toBe(true);
  const initial=createScenarioWorld(42,32,'camp');
  expect(initial.pawns.map(p=>p.background?.childhood)).toEqual(['workshop-child','field-child','school-child']);
  const builder=initial.pawns[0]!;expect(builder.skills.construction.level).toBe(8+3+(builder.background!.adulthood==='builder'?4:0));
  expect(initial.pawns.slice(0,2).every(p=>!violentWorkRefusal(p))).toBe(true);
  const saved=serializeWorld(initial);expect(deserializeWorld(saved)).toEqual(initial);expect(serializeWorld(initial)).toBe(saved);expect(validateWorld(initial)).toEqual([]);
});

test('real visitor, pod and raid producers apply gains after their own zero or fighter baselines, with private selection',()=>{
  const {world:visitors}=visitorTradeFixture();
  expect(visitors.pawns.some(p=>p.visitor?.role==='trader')).toBe(true);
  for(const p of visitors.pawns.filter(p=>p.visitor)){
    expect(p.background).toBeDefined();const gains=backgroundGains(p.background!);
    for(const key of BACKGROUND_SKILL_IDS)expect(p.skills[key]?.level??0).toBe(gains[key]??0);
    if(p.visitor!.role==='trader')expect(backgroundSkillRefusal(p,'social')).toBeUndefined();
  }
  expect(validateWorld(visitors)).toEqual([]);
  const pod=deconstructionCamp(1),rng=pod.rng;
  expect(resolveSelectedPodRescue(pod,210)).toBe(true);pod.tick=pod.podRescues!.pending!.openAt;advancePodRescues(pod);
  const patient=pod.pawns.find(p=>p.podRescue)!;expect(patient.background).toBeDefined();
  const gains=backgroundGains(patient.background!);for(const key of BACKGROUND_SKILL_IDS)expect(patient.skills[key]?.level??0).toBe(gains[key]??0);
  expect(pod.rng).toBe(rng);expect(validateWorld(pod)).toEqual([]);
  const raid=deconstructionCamp(1);enableRaids(raid);const random={rng:raid.raids!.rng};
  expect(createRaidGroup(raid,{count:1,sites:[{x:0,z:12}],random})).not.toBeNull();
  for(const p of raid.pawns.filter(p=>p.raid)){
    const gain=backgroundGains(p.background!);expect(violentWorkRefusal(p)).toBeUndefined();
    expect(p.skills.shooting.level).toBe(4+(gain.shooting??0));expect(p.skills.melee.level).toBe(4+(gain.melee??0));
  }
  expect(validateWorld(raid)).toEqual([]);
});

test('arrival and quest admissions retain the advertised age, past and preview despite intervening real allocations',()=>{
  const arrivals=backgroundArrivalWorld(),offer=structuredClone(arrivals.arrivals!.pending!);
  expect(offer.background).toBeDefined();expect(offer.age).toBeDefined();
  addGroundMaterial(arrivals,'wood',1,{x:2,z:2});const admittedId=arrivals.nextId;
  expect(applyCommand(arrivals,{type:'answer-arrival',offerId:offer.id,accept:true}).ok).toBe(true);
  const newcomer=arrivals.pawns.find(p=>p.id===admittedId)!;
  expect(newcomer.age).toEqual(offer.age);expect(newcomer.background).toEqual(offer.background);
  expect(newcomer.skills).toEqual(previewBackgroundSkills(offer.profile,offer.background!));
  expect(newcomer.health?.ageAilments??[]).toEqual(initialHumanAilments(arrivals.seed,newcomer.id,offer.age!));
  const joined=structuredClone(newcomer);advanceArrivals(arrivals);expect(newcomer).toEqual(joined);expect(validateWorld(arrivals)).toEqual([]);
  const quests=backgroundQuestWorld(),q=structuredClone(quests.quests!.entries[0]!);
  expect(q.age).toBeDefined();expect(q.background).toBeDefined();
  expect(applyCommand(quests,{type:'answer-quest',questId:q.id,accept:true}).ok).toBe(true);
  addGroundMaterial(quests,'wood',1,{x:2,z:2});const questPawnId=quests.nextId;
  quests.tick=q.offeredAt+q.joinDelay;advanceQuests(quests);const refugee=quests.pawns.find(p=>p.id===questPawnId)!;
  expect(refugee.originQuestId).toBe(q.id);expect(refugee.age).toEqual(q.age);expect(refugee.background).toEqual(q.background);
  expect(refugee.skills).toEqual(previewBackgroundSkills(q.profile,q.background!));
  expect(refugee.health?.ageAilments??[]).toEqual(initialHumanAilments(quests.seed,refugee.id,q.age!));expect(validateWorld(quests)).toEqual([]);
  const historical=startingPawn(99,'Ancien profil',1,1,0,55,42);assignOfferedBackground(historical,{},42,0);
  expect(historical.background).toBeUndefined();expect(historical.skills).toEqual(startingSkills(0));
});
