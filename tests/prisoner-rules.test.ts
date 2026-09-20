import { expect,test } from 'vitest';
import { generateWorld } from '../src/sim/generation.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { createPrisonerState,prisonDay,prisonerChatReady,prisonerNegotiation,prisonerResistanceReduction,recordPrisonerChat } from '../src/sim/prisoner-state.ts';
import { addSocialMemory,expireSocialMemories,memoryOffset,opinionOf,socialSeed } from '../src/sim/social-state.ts';
import { validateSocial } from '../src/sim/social-save.ts';
import { TICKS_PER_DAY } from '../src/sim/types.ts';

test('capture resistance is a deterministic initial profile and does not overwrite a person',()=>{
  const w=generateWorld(42,32,32),p=w.pawns[0]!,before=structuredClone(p);
  const a=createPrisonerState(w,p),b=createPrisonerState(w,p);expect(a).toEqual(b);expect(p).toEqual(before);
  expect(a).toMatchObject({mode:'maintain',chatCount:0,capturedAt:w.tick});expect(Number.isInteger(a.initialResistance)).toBe(true);
  expect(a.initialResistance).toBeGreaterThanOrEqual(7);expect(a.initialResistance).toBeLessThanOrEqual(12);expect(a.resistance).toBe(a.initialResistance);
  expect(a.rng).toBeGreaterThan(0);expect(a.lastChatTick).toBeUndefined();
});

test('visits respect strict spacing, two per civil day, and mode after resistance zero',()=>{
  const w=generateWorld(42,32,32),p=w.pawns[0]!;w.gameProfile=crashlandedProfile();w.tick=2000;p.prisoner=createPrisonerState(w,p);
  expect(prisonDay(w)).toBe(0);expect(prisonerChatReady(w,p)).toBe(false);p.prisoner.mode='recruit';expect(prisonerChatReady(w,p)).toBe(true);
  recordPrisonerChat(w,p);w.tick=3000;expect(prisonerChatReady(w,p)).toBe(false);w.tick=3001;expect(prisonerChatReady(w,p)).toBe(true);
  recordPrisonerChat(w,p);w.tick=4499;expect(prisonDay(w)).toBe(0);expect(prisonerChatReady(w,p)).toBe(false);
  w.tick=4500;expect(prisonDay(w)).toBe(1);expect(prisonerChatReady(w,p)).toBe(true);recordPrisonerChat(w,p);expect(p.prisoner.chatCount).toBe(1);
  w.tick+=1001;p.prisoner.resistance=0;p.prisoner.mode='reduce';expect(prisonerChatReady(w,p)).toBe(false);p.prisoner.mode='recruit';expect(prisonerChatReady(w,p)).toBe(true);
  p.prisoner.escape={x:0,z:1};expect(prisonerChatReady(w,p)).toBe(false);
});

test('negotiation uses actual skill, immediate mood and directed rapport with its own expiry',()=>{
  const w=generateWorld(42,32,32),[a,p]=w.pawns;p!.faction='outlaws';p!.prisoner=createPrisonerState(w,p!);
  for(const pawn of [a!,p!]){delete pawn.health;delete pawn.traits;delete pawn.social;delete pawn.mental;delete pawn.deniedJoining;pawn.memories=[];pawn.hunger=60;pawn.rest=60;pawn.comfort=50;pawn.recreation.level=50;pawn.state='idle';}
  w.piles=[];for(const [level,ability] of [[0,.4],[8,1],[20,1.9]]){a!.skills.social={level:level!,xp:0,dailyXp:0,passion:0};expect(prisonerNegotiation(a!)).toBeCloseTo(ability!,12);}
  // Existing mood base32 + fixed camp expectations30 gives an instant62%.
  a!.skills.social!.level=8;p!.mood=0;expect(prisonerResistanceReduction(w,a!,p!)).toBeCloseTo(1.12,12);
  p!.mood=100;expect(prisonerResistanceReduction(w,a!,p!)).toBeCloseTo(1.12,12);
  p!.social={rng:socialSeed(w.seed,p!.id),memories:[]};for(let i=0;i<51;i++)addSocialMemory(p!.social,a!.id,'rapport',w.tick,1);
  expect(p!.social.memories).toHaveLength(50);expect(opinionOf(p!,a!.id,w.tick)).toBe(100);expect(opinionOf(a!,p!.id,w.tick)).toBe(0);
  expect(prisonerResistanceReduction(w,a!,p!)).toBeCloseTo(1.68,12);
  expect(validateSocial(w,86)).toEqual([]);expect(validateSocial(w,85).length).toBeGreaterThan(0);
  const memory=p!.social.memories[0]!;expect(memoryOffset(memory,14*TICKS_PER_DAY)).toBeCloseTo(2);expect(memoryOffset(memory,17*TICKS_PER_DAY)).toBeCloseTo(1);
  expireSocialMemories(p!,20*TICKS_PER_DAY);expect(p!.social.memories).toEqual([]);
});
