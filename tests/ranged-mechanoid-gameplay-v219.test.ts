import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { advanceMechanoidCombat } from '../src/sim/mechanoid-combat.ts';
import { mechanoidGunAvailable,mechanoidRangedQueries } from '../src/sim/mechanoid-ranged.ts';
import { mechanoidRangedProfile } from '../src/sim/mechanoid-ranged-profile.ts';
import { damageMechanoidWithBullet,delayMechanoidImpact } from '../src/sim/mechanoid-impact.ts';
import { captureWorldShotGrid } from '../src/sim/combat-world.ts';
import { meleeTools } from '../src/sim/melee-statistics.ts';
import { strikeLivingTarget } from '../src/sim/living-melee.ts';
import { advanceMechanoidCorpses } from '../src/sim/mechanoid-corpse.ts';
import { advanceMechanoidRaid } from '../src/sim/mechanoid-raids.ts';
import { rangedMechanoidCamp,prepareRangedDecision } from './scenarios/ranged-mechanoid-v219.ts';

test.each(['lancer','pikeman'] as const)('%s aims at its actual post without a navigation search, emits on the shared Core clock and replays exactly',kind=>{
  const {w,m,victim}=rangedMechanoidCamp(kind),profile=mechanoidRangedProfile(kind)!,start=w.tick*10,nextId=w.nextId;
  expect(validateWorld(w)).toEqual([]);
  const budget=prepareRangedDecision(w,m,0);
  expect(budget.remaining).toBe(0);expect(budget.pairs).toBeLessThan(32768);
  expect(m.ranged?.order?.targetKey).toBe(`pawn:${victim.id}`);expect(m.path).toEqual([]);expect(m.motion).toBeUndefined();
  expect(m.ranged?.stance).toMatchObject({phase:'warmup',startedAtCore:start,lastAdvancedAtCore:start,remainingCore:profile.warmupCoreTicks});
  expect(w.nextId).toBe(nextId);expect(w.projectiles).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<30&&!w.projectiles?.length;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);}
  const shot=w.projectiles![0]!;
  expect(shot.emittedAtCore).toBe(start+profile.warmupCoreTicks);
  expect(shot).toMatchObject({weaponItem:`${kind}-gun`,quality:'normal',flight:{launcherKey:`mech:${m.id}`,equipmentKey:null,intendedKey:`pawn:${victim.id}`}});
  expect(m.ranged?.stance).toMatchObject({phase:'cooldown',startedAtCore:shot.emittedAtCore,lastAdvancedAtCore:w.tick*10,
    remainingCore:profile.cooldownCoreTicks-(w.tick*10-shot.emittedAtCore)});
  expect('skills' in m||'needs' in m||'equipment' in m).toBe(false);
  for(let i=0;i<4;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);}
});

test('a new firing post reports atomically without navigation quota, then traverses a real edge before aiming',()=>{
  const {w,m,victim}=rangedMechanoidCamp();Object.assign(victim,{x:90,z:48});Object.assign(w.pawns[1]!,{x:90,z:51});
  const before=structuredClone(w);prepareRangedDecision(w,m,0);expect(w).toEqual(before);
  const budget=prepareRangedDecision(w,m);expect(budget.remaining).toBe(0);
  expect(m.ranged?.order?.targetKey).toBe(`pawn:${victim.id}`);expect(m.ranged?.stance).toBeNull();
  expect(m.motion?.from).toEqual({x:44,z:48});expect(m.motion!.end).toBeGreaterThan(w.tick);expect(m.path.length).toBeGreaterThan(0);
  expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));let aimed=false;
  for(let i=0;i<100&&!aimed;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
    aimed=m.ranged?.stance?.phase==='warmup';if(aimed)expect(m.motion!.end).toBeLessThanOrEqual(m.ranged!.stance!.startedAtCore/10);}
  expect(aimed).toBe(true);expect(w.projectiles).toBeUndefined();
});

test('a real minor impact keeps aim, stun suspends its remaining Core clock, and a repeated passage cannot double tick',()=>{
  const {w,m}=rangedMechanoidCamp();prepareRangedDecision(w,m);
  for(let i=0;i<3;i++)stepWorld(w);
  const start=m.ranged!.stance!.startedAtCore,remaining=m.ranged!.stance!.remainingCore,core=w.tick*10;
  const impact=damageMechanoidWithBullet(w,m,{damage:1,part:'lancer-brain'},core,1);
  expect(impact?.selected).toBe('lancer-brain');expect(m.health?.body).toBe('lancer');
  expect(m.ranged?.stance).toMatchObject({phase:'warmup',remainingCore:remaining});
  delayMechanoidImpact(w,m,core,true);expect(m.stun?.untilCore).toBe(core+45);expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<3;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
    expect(m.ranged?.stance).toMatchObject({phase:'warmup',remainingCore:remaining,lastAdvancedAtCore:w.tick*10});}
  const once=structuredClone(w);advanceMechanoidCombat(w,m,w.tick*10);expect(w).toEqual(once);
  for(let i=0;i<20&&!w.projectiles?.length;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);}
  expect(w.projectiles![0]!.emittedAtCore).toBe(start+102+44);
});

test('an adjacent person alone does not disable the gun, but their actual missed melee attempt produces the threat',()=>{
  // Initial authored branch seed, before admission/contact: its first hit roll
  // is .85486, above this neutral human's melee accuracy. No outcome is patched.
  const {w,m,victim}=rangedMechanoidCamp('lancer',81733);victim.x=m.x+1;victim.z=m.z;delete victim.background;
  const q=()=>mechanoidRangedQueries(w,()=>captureWorldShotGrid(w));
  expect(mechanoidGunAvailable(w,m,w.tick*10,q())).toBe(true);
  expect(applyCommand(w,{type:'draft',pawnIds:[victim.id],enabled:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'melee',pawnIds:[victim.id],targetId:m.id}).ok).toBe(true);
  const tool=meleeTools(w,victim)[0]!;strikeLivingTarget(w,victim,m,tool,w.tick*10,{rng:w.rng});
  expect(victim.melee?.strike?.outcome).toBe('miss');expect(m.health).toBeUndefined();
  expect(m.meleeThreat).toEqual({attackerId:victim.id,atCore:w.tick*10});
  expect(mechanoidGunAvailable(w,m,w.tick*10,q())).toBe(false);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test.each(['lancer','pikeman'] as const)('%s keeps an emitted bullet and physical cooldown through death, then becomes its own carcass',kind=>{
  const {w,m}=rangedMechanoidCamp(kind);prepareRangedDecision(w,m);
  for(let i=0;i<30&&!w.projectiles?.length;i++)stepWorld(w);
  const bullet=w.projectiles![0]!,id=m.id,core=w.tick*10;
  expect(bullet.arrival).toBeNull();
  damageMechanoidWithBullet(w,m,{damage:100,part:`${kind}-brain`},core,3);
  expect(m.state).toBe('dead');expect(m.ranged?.order).toBeNull();expect(m.ranged?.stance?.phase).toBe('cooldown');
  const death=structuredClone(m.health),remaining=m.ranged!.stance!.remainingCore;
  // Direct clinical contact is completed by the real agenda producer before
  // publication, as in the V213 death preparation. A one-member group has now
  // lost its entire roster; no raw phase or result is forged for the checkpoint.
  expect(advanceMechanoidRaid(w,core)).toBe(true);expect(w.raids!.mechActive).toBeUndefined();
  advanceMechanoidCorpses(w);expect(w.mechanoids).toContain(m);expect(w.piles.some(p=>p.id===id)).toBe(false);
  expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));let elapsed=0;
  for(;elapsed<30&&!w.piles.some(p=>p.id===id);elapsed++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);}
  expect(elapsed*10).toBeGreaterThanOrEqual(remaining);expect(bullet.arrival).not.toBeNull();
  expect(w.mechanoids?.some(actor=>actor.id===id)).toBe(false);
  expect(w.piles.find(p=>p.id===id)).toMatchObject({item:`${kind}-corpse`,quantity:1,mechCorpse:{mechKind:kind,health:death}});
});
