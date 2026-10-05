import { expect,test } from 'vitest';
import { stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { combatTarget,combatTargetKey,hostileCandidates,isPawnTarget,isAnimalTarget,isMechanoidTarget } from '../src/sim/combat-target.ts';
import { captureWorldProjectileTargets } from '../src/sim/projectile-world.ts';
import { captureProjectileBatch } from '../src/sim/projectile-batch.ts';
import { captureTurretTargets,turretCandidate } from '../src/sim/mini-turret.ts';
import { validMiniTurretShape } from '../src/sim/mini-turret-save.ts';
import { validWorldProjectile } from '../src/sim/projectile-save.ts';
import { advanceWorldCombat } from '../src/sim/combat-system.ts';
import { createBulletFlight } from '../src/sim/bullet-flight.ts';
import { registerWorldProjectile } from '../src/sim/projectile-system.ts';
import { projectileProfile } from '../src/sim/ranged-statistics.ts';
import { createMechaMedicalRecord,commitMechanoidImpact } from '../src/sim/mechanoid-health.ts';
import { addResolvedInjury } from '../src/sim/injury-state.ts';
import { advanceMechanoidCorpses } from '../src/sim/mechanoid-corpse.ts';
import { applyStructureExternalDamage } from '../src/sim/bomb-system.ts';
import { miniTurretExplosive } from '../src/sim/bomb-creation.ts';
import { itemShotFill } from '../src/sim/combat-content.ts';
import { shootingQueries,applyShootingCommand } from '../src/sim/shooting.ts';
import { processSentry,threatQueries } from '../src/sim/threats.ts';
import { firingCamp } from './scenarios/shooting.ts';
import { miniTurretCamp,campTurret,miniTurretQueries } from './scenarios/mini-turret-v212.ts';
import { fixtureMechanoid } from './scenarios/mechanoid-combat-v213.ts';

test('a true mechanical target shares projectile capture, turret acquisition and exact private-burst replay under its own key',()=>{
  const w=miniTurretCamp(),s=campTurret(w),m=fixtureMechanoid(w,20,32),key=`mech:${m.id}` as const;
  expect(combatTarget(w,m.id)).toBe(m);expect(combatTargetKey(m)).toBe(key);
  expect([isPawnTarget(m),isAnimalTarget(m),isMechanoidTarget(m)]).toEqual([false,false,true]);
  expect(hostileCandidates(w,w.pawns[0]!).map(combatTargetKey)).toContain(key);
  const scene=captureWorldProjectileTargets(w).scene(new Set([m.id]),.4),batched=captureProjectileBatch(w).refresh(w)(new Set([m.id]),.4);
  expect(scene.target(key)).toMatchObject({kind:'pawn',bodySize:1,standing:true,friendly:false});
  expect(scene.at(m)).toEqual(batched.at(m));expect(batched.at(m).filter(t=>t.key===key)).toHaveLength(1);
  expect(captureTurretTargets(w).target(key)).toBe(m);
  expect(turretCandidate(w,s,miniTurretQueries(w))).toMatchObject({target:m,key});
  const xp=w.pawns.map(p=>structuredClone(p.skills));
  for(let i=0;i<10&&!s.turret!.burst;i++)stepWorld(w);
  expect(s.turret!.burst?.targetKey).toBe(key);expect(w.projectiles?.some(p=>p.flight.intendedKey===key)).toBe(true);
  expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));
  stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(w.pawns.map(p=>p.skills)).toEqual(xp);
  expect(validMiniTurretShape({...s.turret,targetKey:key},193,w.tick*10,w.nextId)).toBe(false);
});

test('real human and sentry shooting accept the mechanical identity; an emitted Bullet reaches its anatomical owner',()=>{
  const w=firingCamp(),shooter=w.pawns[0]!,m=fixtureMechanoid(w,14,12),key=`mech:${m.id}` as const;
  expect(applyShootingCommand(w,{type:'shoot',pawnIds:[shooter.id],targetId:m.id}).ok).toBe(true);
  expect(shooter.shooting?.order?.targetId).toBe(m.id);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  // Ballistic emission is explicitly prepared here to isolate guaranteed real
  // clinical dispatch from the producer's separate accuracy/cover lottery.
  delete shooter.shooting;const profile=projectileProfile('revolver','normal')!,core=w.tick*10;
  const flight=createBulletFlight({launcherKey:`pawn:${shooter.id}`,equipmentKey:null,intendedKey:key,usedKey:key,flags:1,preventFriendlyFire:false,
    origin:{x:shooter.x+.5,z:shooter.z+.5},destination:{x:m.x+.5,z:m.z+.5},speedPerCoreTick:profile.projectileTilesPerCoreTick});
  const bullet=registerWorldProjectile(w,flight,'normal',{friendlyPawnIds:[],friendlyFireFactor:1});
  expect(validWorldProjectile(bullet,w,193)).toBe(false);expect(validWorldProjectile(bullet,w,194)).toBe(true);
  const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<4&&!bullet.arrival;i++){w.tick++;copy.tick++;advanceWorldCombat(w);advanceWorldCombat(copy);expect(copy).toEqual(w);}
  expect(bullet.emittedAtCore).toBe(core);expect(bullet.arrival).toMatchObject({effect:'mech',targetKey:key});expect(m.health).toBeDefined();
  expect(validateWorld(w)).toEqual([]);
  const sentry=firingCamp(),p=sentry.pawns[0]!;delete p.draft;p.faction='outlanders';
  for(const human of sentry.pawns.slice(1)){delete human.draft;human.faction='outlanders';}
  const target=fixtureMechanoid(sentry,14,12);processSentry(sentry,p,threatQueries(sentry));
  expect(p.shooting?.order?.targetId).toBe(target.id);expect(p.shooting?.stance?.phase).toBe('aim');expect(validateWorld(sentry)).toEqual([]);
});

test('Bomb damages a mechanically produced carcass by the Core Corpse factor while its logical fill remains zero',()=>{
  const w=miniTurretCamp(),s=campTurret(w);s.turret!.holdFire=true;
  while(!miniTurretExplosive(s.id))s.id=w.nextId++;
  const m=fixtureMechanoid(w,s.x+2,s.z),record=createMechaMedicalRecord(w.tick);
  addResolvedInjury(record,'scyther-reactor','crack',27000,()=>{throw new Error('Solid injury needs no biological draw');});
  expect(commitMechanoidImpact(w,m,record,{rng:w.rng},w.tick*10)).toBe(true);advanceMechanoidCorpses(w);
  const corpse=w.piles.find(p=>p.id===m.id)!;expect(corpse.item).toBe('scyther-corpse');expect(itemShotFill(corpse.item)).toBe(0);
  expect(applyStructureExternalDamage(w,s,100,100,'bullet',w.rng,w.tick*10)).toBe(true);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  expect(corpse.damage).toBe(25);expect(validateWorld(w)).toEqual([]);
});

test('schemas190 and193 without mechanical owners preserve candidates, captures, human aim, emission and arrival replay exactly',()=>{
  for(const version of [190,193]){
    const current=firingCamp();current.pawns[1]!.faction='outlaws';
    // Authentic V190 has no V210 background. Both baselines use its neutral
    // absence so this comparison isolates the mechanical extension only.
    for(const p of current.pawns)delete p.background;
    const old=structuredClone(current);Object.assign(old,{schemaVersion:version});
    expect(current.mechanoids).toBeUndefined();expect(old.mechanoids).toBeUndefined();
    const keys=(w:typeof current)=>hostileCandidates(w,w.pawns[0]!).map(combatTargetKey);
    expect(keys(current)).toEqual(keys(old));
    const captures=(w:typeof current)=>captureWorldProjectileTargets(w).scene(new Set(),1).at(w.pawns[1]!);
    expect(captures(current)).toEqual(captures(old));
    const command={type:'shoot' as const,pawnIds:[current.pawns[0]!.id],targetId:current.pawns[1]!.id};
    expect(applyShootingCommand(current,command)).toEqual(applyShootingCommand(old,command));
    let arrived=false,emitted=false;
    for(let i=0;i<6;i++){
      current.tick++;old.tick++;advanceWorldCombat(current);advanceWorldCombat(old);
      expect({...old,schemaVersion:current.schemaVersion}).toEqual(current);
      emitted||=!!current.projectiles?.length;arrived||=!!current.projectiles?.some(p=>p.arrival!==null);
    }
    expect(emitted).toBe(true);expect(arrived).toBe(true);
    expect(shootingQueries(current).targets().anchor(`pawn:${current.pawns[1]!.id}`)).toEqual(shootingQueries(old).targets().anchor(`pawn:${old.pawns[1]!.id}`));
  }
});
