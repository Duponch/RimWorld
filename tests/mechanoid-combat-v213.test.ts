import { expect,test } from 'vitest';
import { stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { advanceMechanoidCombat,processMechanoidCombat,mechanoidCombatBatch,mechanoidMeleeTools } from '../src/sim/mechanoid-combat.ts';
import { mechaMeleeHitChance } from '../src/sim/melee-statistics.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { clearShotSegment } from '../src/sim/combat-space.ts';
import { captureWorldShotGrid } from '../src/sim/combat-world.ts';
import { structureMaxHp } from '../src/sim/thing-damage-rules.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { mechanoidCombatCamp } from './scenarios/mechanoid-combat-v213.ts';

test('a real staging defender walks, attempts contact and recovers on the shared Core clock with exact replay and no skill owner',()=>{
  const {w,m,victim}=mechanoidCombatCamp(),skills=()=>w.pawns.map(p=>Object.entries(p.skills).map(([name,s])=>({name,level:s.level,xp:s.xp}))),xp=skills(),light=new LightEnvironmentCache();
  const before=JSON.stringify(w),empty={remaining:0,pairs:32768};
  processMechanoidCombat(w,m,()=>blockedCells(w),empty,()=>light.read(w));expect(JSON.stringify(w)).toBe(before);
  processMechanoidCombat(w,m,()=>blockedCells(w),{remaining:1,pairs:32768},()=>light.read(w));
  expect(m.melee?.order).toMatchObject({targetId:victim.id,startedDowned:false});
  expect(m.melee!.order!.jobUntilCore).toBeGreaterThanOrEqual(w.tick*10+360);
  expect(m.melee!.order!.jobUntilCore).toBeLessThanOrEqual(w.tick*10+480);
  expect(m.motion?.from).toEqual({x:44,z:48});expect(m.motion!.end).toBeGreaterThan(w.tick);
  expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));let attempted=false,injured=false;
  for(let i=0;i<80&&!injured;i++){
    stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
    if(m.melee?.strike){attempted=true;expect(m.melee.strike.untilCore-m.melee.strike.atCore).toBe(120);
      expect(victim.meleeThreat?.attackerId).toBe(m.id);expect(m.motion!.end).toBeLessThanOrEqual(m.melee.strike.atCore/10);}
    injured=!!victim.health?.injuries.length;
  }
  expect(attempted).toBe(true);expect(injured).toBe(true);
  // Ordinary forgetting remains active. Mechanical contact grants no positive
  // XP to these idle humans and does not create a skill owner on the attacker.
  for(const [i,records] of skills().entries())for(const [j,record] of records.entries()){
    expect(record.name).toBe(xp[i]![j]!.name);expect(record.level).toBe(xp[i]![j]!.level);expect(record.xp??0).toBeLessThanOrEqual(xp[i]![j]!.xp??0);
  }
  expect('skills' in m).toBe(false);expect('faction' in m).toBe(false);expect('needs' in m).toBe(false);
  expect(mechaMeleeHitChance()).toBeCloseTo(.62);expect(mechanoidMeleeTools(m).filter(t=>t.weight>0).map(t=>t.id)).toEqual(['left-blade-cut','left-blade-stab','right-blade-cut','right-blade-stab']);
});

test('one navigation budget handles an inaccessible LOS candidate and the real return to staging instead of starving its fallback',()=>{
  const {w,m,victim}=mechanoidCombatCamp();Object.assign(m,{x:10,z:48});w.raids!.mechActive!.stage.point={x:8,z:48};
  Object.assign(victim,{x:26,z:48});Object.assign(w.pawns[1]!,{x:26,z:50});
  // Water prevents all crossings but remains transparent to this LOS query.
  for(let z=0;z<w.height;z++)w.tiles[z*w.width+20]={terrain:'water'};
  expect(clearShotSegment(captureWorldShotGrid(w),m,victim)).toBe(true);
  const rng=w.rng,budget={remaining:1,pairs:32768},light=new LightEnvironmentCache();
  processMechanoidCombat(w,m,()=>blockedCells(w),budget,()=>light.read(w),mechanoidCombatBatch(w));
  expect(budget.remaining).toBe(0);expect(w.rng).toBe(rng);expect(m.melee).toBeUndefined();
  expect(m.raid?.goal).toEqual({x:8,z:48});expect(m.motion?.from).toEqual({x:10,z:48});expect(m.x).toBe(9);
  expect(validateWorld(w)).toEqual([]);
});

test('expiring a mechanical chase clears its intention during an edge or recovery while preserving physical owners',()=>{
  const {w,m,victim}=mechanoidCombatCamp(),health=structuredClone(victim.health),light=new LightEnvironmentCache();
  processMechanoidCombat(w,m,()=>blockedCells(w),{remaining:1,pairs:32768},()=>light.read(w));
  const edge=structuredClone(m.motion);m.melee!.order!.jobUntilCore=w.tick*10+1;
  advanceMechanoidCombat(w,m,w.tick*10+1);expect(m.motion).toEqual(edge);expect(m.path).toEqual([]);expect(m.melee).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const other=mechanoidCombatCamp(),otherHealth=structuredClone(other.victim.health),core=other.w.tick*10;
  other.m.melee={order:{targetId:other.victim.id,startedDowned:false,jobUntilCore:core+1},
    strike:{targetId:other.victim.id,atCore:core,untilCore:core+120,tool:'left-blade-cut',outcome:'miss'}};
  const strike=structuredClone(other.m.melee.strike);advanceMechanoidCombat(other.w,other.m,core+1);
  expect(other.m.melee).toEqual({order:null,strike});expect(validateWorld(other.w)).toEqual([]);
  expect(victim.health).toEqual(health);expect(other.victim.health).toEqual(otherHealth);
});

test('the assault route approaches an actual barrier and commits contact damage with ordinary recovery',()=>{
  const {w,m,victim}=mechanoidCombatCamp();Object.assign(m,{x:10,z:48});Object.assign(victim,{x:26,z:48});Object.assign(w.pawns[1]!,{x:26,z:50});
  const group=w.raids!.mechActive!;
  for(let z=0;z<w.height;z++)fixtureBuilding(w,'wall',20,z);
  // Let the real strict staging timer enter assault. The intact barrier prevents
  // opportunistic contact before that transition; no timestamp is retrodated.
  while(w.tick*10<=group.stage.activatedAtCore+group.stage.delayCore)stepWorld(w);
  expect(group.phase).toBe('assault');
  const before=new Map(w.structures.map(s=>[s.id,structureMaxHp(s)-(s.damage??0)]));let hit=false;
  for(let i=0;i<60&&!hit;i++){stepWorld(w);hit=w.structures.some(s=>structureMaxHp(s)-(s.damage??0)<before.get(s.id)!);expect(validateWorld(w)).toEqual([]);}
  expect(hit).toBe(true);expect(m.melee?.strike?.structure).toBeDefined();expect(m.melee!.strike!.outcome).toBe('hit');
  expect(m.melee!.strike!.untilCore-m.melee!.strike!.atCore).toBe(120);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
