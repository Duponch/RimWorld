import { describe,expect,test } from 'vitest';
import { medicalCamp } from './scenarios/health.ts';
import { advanceSocial,exchangeSocial,negativeInteractionFactor,passiveSocialWeights,socialFightChance } from '../src/sim/social.ts';
import { startSocialFight } from '../src/sim/social-fight.ts';
import { cancelMelee } from '../src/sim/melee-state.ts';
import { addFightAftermath,addSocialMemory,expireSocialMemories,insultMoodMemories,opinionCauses,opinionOf,socialImpact,socialSeed,type SocialState } from '../src/sim/social-state.ts';
import { validateSocial } from '../src/sim/social-save.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { TICKS_PER_DAY } from '../src/sim/types.ts';

describe('V125 negative social interactions',()=>{
  test('slight and insult are directed, give no Social XP, and insult mood is fixed despite speaker impact',()=>{
    const world=medicalCamp(2),[speaker,victim]=world.pawns;
    speaker!.skills.social={level:20,xp:0,dailyXp:0,passion:0};
    // A collapse prevents a physical fight, while still allowing an actual exchange.
    speaker!.collapsePending=true;
    const rng=world.rng,impact=socialImpact(speaker!);
    expect(exchangeSocial(world,speaker!,victim!,'slight')).toBe(true);
    expect(speaker!.social?.memories).toEqual([]);
    expect(victim!.social?.memories).toMatchObject([{otherId:speaker!.id,kind:'slight',offset:-5*impact}]);
    expect(opinionOf(victim!,speaker!.id,world.tick)).toBeLessThan(0);
    expect(insultMoodMemories(victim!,world.tick)).toEqual([]);
    expect(speaker!.skills.social.xp).toBe(0);
    world.tick+=12;
    expect(exchangeSocial(world,speaker!,victim!,'insult')).toBe(true);
    expect(victim!.social!.memories.at(-1)).toMatchObject({otherId:speaker!.id,kind:'insult',offset:-15*impact});
    expect(insultMoodMemories(victim!,world.tick)).toEqual([{otherId:speaker!.id,count:1,offset:-5,expiresAt:world.tick+2*TICKS_PER_DAY}]);
    expect(speaker!.social?.memories).toEqual([]);
    expect(speaker!.skills.social.xp).toBe(0);
    expect(world.rng).toBe(rng);
    expect(validateSocial(world,125)).toEqual([]);
  });

  test('opinion curves affect content weights while keeping chitchat weight and one total attempt',()=>{
    const world=medicalCamp(2),[speaker,victim]=world.pawns;
    const neutral=passiveSocialWeights(world,speaker!,victim!);
    expect(neutral.chitchat).toBe(1);
    expect(neutral.slight).toBeCloseTo(.02*negativeInteractionFactor(world,speaker!,victim!));
    expect(neutral.insult).toBeCloseTo(.007*negativeInteractionFactor(world,speaker!,victim!));
    expect(neutral.slight/neutral.insult).toBeCloseTo(20/7);
    speaker!.social={rng:socialSeed(world.seed,speaker!.id),memories:[]};
    addSocialMemory(speaker!.social,victim!.id,'insult',world.tick,1);
    const offended=passiveSocialWeights(world,speaker!,victim!);
    expect(offended.slight).toBeGreaterThan(neutral.slight);
    speaker!.social.memories=[];addSocialMemory(speaker!.social,victim!.id,'deep-talk',world.tick,1);
    const friendly=passiveSocialWeights(world,speaker!,victim!);
    expect(friendly.slight).toBeLessThan(neutral.slight);
    expect(friendly.chitchat).toBe(1);
  });

  test('negative opinion and insult mood use separate lifetimes and capped stacks',()=>{
    const world=medicalCamp(2),[speaker,victim]=world.pawns;
    const state:SocialState={rng:1,memories:[]};victim!.social=state;
    for(let i=0;i<11;i++)addSocialMemory(state,speaker!.id,'insult',world.tick+i,1);
    world.tick+=10;
    expect(state.memories).toHaveLength(10);
    expect(opinionCauses(victim!,speaker!.id,world.tick).find(c=>c.kind==='insult')?.count).toBe(10);
    expect(opinionOf(victim!,speaker!.id,world.tick)).toBeLessThan(0);
    const mood=insultMoodMemories(victim!,world.tick);
    expect(mood).toHaveLength(1);expect(mood[0]!.count).toBe(10);
    expect(mood[0]!.offset).toBeCloseTo(-5*(1-.9**10)/.1);
    world.tick+=2*TICKS_PER_DAY;
    expect(insultMoodMemories(victim!,world.tick)).toEqual([]);
    expect(opinionOf(victim!,speaker!.id,world.tick)).toBeLessThan(0);
    world.tick+=18*TICKS_PER_DAY;
    expireSocialMemories(victim!,world.tick);
    expect(state.memories).toEqual([]);
    expect(opinionOf(victim!,speaker!.id,world.tick)).toBe(0);
  });

  test('each insult mood occurrence expires at its own two-day boundary',()=>{
    const world=medicalCamp(2),[speaker,victim]=world.pawns;
    victim!.social={rng:1,memories:[]};
    addSocialMemory(victim!.social,speaker!.id,'insult',world.tick,1);
    world.tick+=TICKS_PER_DAY;
    addSocialMemory(victim!.social,speaker!.id,'insult',world.tick,1);
    expect(insultMoodMemories(victim!,world.tick)[0]).toMatchObject({count:2,offset:-9.5,expiresAt:world.tick+2*TICKS_PER_DAY});
    world.tick+=TICKS_PER_DAY;
    expect(insultMoodMemories(victim!,world.tick)[0]).toMatchObject({count:1,offset:-5,expiresAt:world.tick+TICKS_PER_DAY});
    expect(opinionOf(victim!,speaker!.id,world.tick)).toBeLessThan(0);
    world.tick+=TICKS_PER_DAY;
    expect(insultMoodMemories(victim!,world.tick)).toEqual([]);
  });

  test('strict old schema rejects every V125 field, current schema validates exact replay and fight reciprocity',()=>{
    const world=medicalCamp(2),[a,b]=world.pawns;
    a!.social={rng:socialSeed(world.seed,a!.id),memories:[]};
    addSocialMemory(a!.social,b!.id,'slight',world.tick,1);
    expect(validateSocial(world,124)).toContain('Invalid social memory.');
    expect(validateSocial(world,125)).toEqual([]);
    expect(validateWorld(world)).toEqual([]);
    const saved=serializeWorld(world),loaded=deserializeWorld(saved);
    expect(loaded).toEqual(world);
    const reciprocal={opponentId:b!.id,startedAt:world.tick};
    a!.social.fight=reciprocal;
    expect(validateSocial(world,125)).toContain('Non-reciprocal social fight.');
    b!.social={rng:socialSeed(world.seed,b!.id),memories:[],fight:{opponentId:a!.id,startedAt:world.tick}};
    expect(validateSocial(world,125)).toEqual([]);
    expect(validateSocial(world,124)).toContain('Invalid social state.');
    b!.social!.fight!.startedAt++;
    expect(validateSocial(world,125)).toContain('Invalid social fight.');
  });

  test('fight chance reads the victim opinion after the insult and aftermath uses independent persisted streams',()=>{
    const world=medicalCamp(2),[a,b]=world.pawns;
    const neutral=socialFightChance(world,b!,a!,'insult');
    b!.social={rng:1,memories:[]};
    addSocialMemory(b!.social,a!.id,'insult',world.tick,1);
    expect(socialFightChance(world,b!,a!,'insult')).toBeGreaterThan(neutral);
    a!.social={rng:1,memories:[]};
    const copy=structuredClone(world);
    addFightAftermath(world,a!,b!);
    addFightAftermath(copy,copy.pawns[0]!,copy.pawns[1]!);
    expect(copy).toEqual(world);
    expect(a!.social.memories.at(-1)?.kind).toMatch(/^fight-/);
    expect(b!.social.memories.at(-1)?.kind).toMatch(/^fight-/);
    expect(validateSocial(world,125)).toEqual([]);
  });

  test('a reciprocal fight saves mid-combat and cancellation reconciles both markers on the next social pass',()=>{
    const world=medicalCamp(2),[a,b]=world.pawns;
    expect(startSocialFight(world,a!,b!)).toBe(true);
    expect(a!.social?.fight).toEqual({opponentId:b!.id,startedAt:world.tick});
    expect(b!.social?.fight).toEqual({opponentId:a!.id,startedAt:world.tick});
    expect(validateWorld(world)).toEqual([]);
    const resumed=deserializeWorld(serializeWorld(world));
    expect(resumed).toEqual(world);
    cancelMelee(resumed.pawns[0]!);
    expect(validateWorld(resumed)).toEqual([]);
    resumed.tick++;
    advanceSocial(resumed);
    expect(resumed.pawns.every(p=>p.social?.fight===undefined)).toBe(true);
    expect(resumed.pawns.every(p=>p.melee?.order?.auto!=='social')).toBe(true);
    expect(resumed.pawns.map(p=>p.social?.memories.filter(m=>m.kind.startsWith('fight-')).length)).toEqual([1,1]);
    resumed.tick++;advanceSocial(resumed);
    expect(resumed.pawns.map(p=>p.social?.memories.filter(m=>m.kind.startsWith('fight-')).length)).toEqual([1,1]);
    expect(validateWorld(resumed)).toEqual([]);
  });
});
