import { expect, test, vi } from 'vitest';
import { applyCommand } from '../src/sim/engine.ts';
import { HUMAN_YEAR_TICKS } from '../src/sim/human-age.ts';
import { learnSkill, tickSkills } from '../src/sim/skills.ts';
import { completedCookingSkill } from '../src/sim/cooking-statistics.ts';
import { effectiveSkillLevel } from '../src/sim/work-types.ts';
import { socialImpact } from '../src/sim/social-state.ts';
import { exchangeSocial } from '../src/sim/social.ts';
import { tradeImprovement } from '../src/sim/trade-goods.ts';
import { plantWorkRate, plantHarvestYield } from '../src/sim/plant-skills.ts';
import { equipmentReason } from '../src/sim/equipment.ts';
import { considerAutomaticCombat } from '../src/sim/automatic-combat.ts';
import { advanceMelee } from '../src/sim/melee.ts';
import { startSocialFight } from '../src/sim/social-fight.ts';
import { shootingQueries } from '../src/sim/shooting.ts';
import { processCooking } from '../src/sim/cooking.ts';
import { applyExtinguish, firefightingTargets } from '../src/sim/firefighting.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import type { Pawn } from '../src/sim/types.ts';
import { medicalCamp } from './scenarios/health.ts';

function background(p:Pawn,adulthood:NonNullable<Pawn['background']>['adulthood'],childhood:NonNullable<Pawn['background']>['childhood']='settlement-child'):void {
  p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};p.background={childhood,...adulthood?{adulthood}:{}};delete p.health;
}

test('totally disabled skills keep raw levels and ignore positive and negative learning',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;background(p,undefined,'quiet-child');
  p.skills.melee={level:12,xp:3500,dailyXp:500,passion:2};p.skills.construction={level:12,xp:3500,dailyXp:500,passion:0};
  const before=structuredClone(p.skills.melee);
  learnSkill(p.skills.melee,100000,p);learnSkill(p.skills.melee,-100000,p);
  expect(p.skills.melee).toEqual(before);expect(effectiveSkillLevel(p,'melee',p.skills.melee.level)).toBe(0);
  w.tick=3000+(20-p.id%20)%20;p.skills.lastResetTick=w.tick;
  tickSkills(w,p);expect(p.skills.melee).toEqual(before);expect(p.skills.construction.xp).toBe(3100);
});

test('completion learning on a projected cooking record cannot bypass its biography',()=>{
  const p=medicalCamp().pawns[0]!;background(p,'merchant');p.skills.cooking={level:8,xp:500,dailyXp:200,passion:2};
  const before=structuredClone(p.skills.cooking);
  expect(completedCookingSkill(p,100)).toEqual(before);expect(p.skills.cooking).toEqual(before);
  delete p.skills.cooking;expect(completedCookingSkill(p,100)).toEqual({level:0,xp:0,dailyXp:0,passion:0});expect(p.skills.cooking).toBeUndefined();
});

test('Social incapacity keeps conversations and memories with effective level zero and no XP',()=>{
  const w=medicalCamp(2),[p,other]=w.pawns as [Pawn,Pawn];background(p,'hermit');delete other.health;
  p.skills.social={level:10,xp:500,dailyXp:0,passion:2};const before=structuredClone(p.skills.social);
  expect(socialImpact(p)).toBeCloseTo(.82);expect(tradeImprovement(p)).toBe(0);
  expect(exchangeSocial(w,p,other,'chitchat')).toBe(true);
  expect(p.social?.memories).toHaveLength(1);expect(other.social?.memories).toHaveLength(1);expect(p.skills.social).toEqual(before);
});

test('a still possible plant-stat consumer sees level zero without learning or erasing the raw record',()=>{
  const p=medicalCamp().pawns[0]!;background(p,'merchant');p.skills.plants={level:8,xp:500,dailyXp:100,passion:2};
  const before=structuredClone(p.skills.plants);
  expect(plantWorkRate(p)).toBe(.1);expect(plantHarvestYield(p)).toBe(.6);expect(p.skills.plants).toEqual(before);
});

test('forbidden forced production releases before work, fuel, XP, RNG or movement',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;background(p,'merchant');p.orders.active='cook';
  p.cooking={stationId:w.nextId++,billId:w.nextId++,spot:{x:p.x,z:p.z},actionCell:{x:p.x,z:p.z},ingredients:[],phase:'work',progress:100,productId:null,storageId:null};
  const task=structuredClone(p.cooking),rng=w.rng,skills=structuredClone(p.skills),release=vi.fn(()=>true),move=vi.fn(),workRate=vi.fn(()=>1);
  processCooking(w,p,{release,move,workRate,search:()=>null,event:()=>{}});
  expect(release).toHaveBeenCalledOnce();expect(move).not.toHaveBeenCalled();expect(workRate).not.toHaveBeenCalled();
  expect(p.cooking).toEqual(task);expect(p.skills).toEqual(skills);expect(w.rng).toBe(rng);
});

test('nonviolent people may mobilize and move but cannot attack, equip a weapon or start automatic combat',()=>{
  const w=medicalCamp(2),[p,enemy]=w.pawns as [Pawn,Pawn];background(p,undefined,'quiet-child');delete enemy.health;enemy.faction='outlaws';
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:{x:10,z:12},queue:false}).ok).toBe(true);
  const before=JSON.stringify(w);
  expect(applyCommand(w,{type:'melee',pawnIds:[p.id],targetId:enemy.id})).toMatchObject({ok:false,reason:expect.stringContaining('Incapacité')});
  expect(applyCommand(w,{type:'shoot',pawnIds:[p.id],targetId:enemy.id})).toMatchObject({ok:false,reason:expect.stringContaining('Incapacité')});
  expect(JSON.stringify(w)).toBe(before);
  addGroundMaterial(w,'weapon',1,{x:p.x,z:p.z},'revolver');const weapon=w.piles.at(-1)!;
  expect(equipmentReason(w,p,weapon,'equip')).toContain('Incapacité');weapon.owner={type:'equipment',pawnId:p.id};
  expect(equipmentReason(w,p,weapon,'drop')).toBeUndefined();
  p.path=[];p.draft!.target=null;const budget={remaining:8,pairs:32768};considerAutomaticCombat(w,p,budget);
  expect(p.melee).toBeUndefined();expect(p.shooting).toBeUndefined();expect(budget).toEqual({remaining:8,pairs:32768});
});

test('a nonviolent social-fight participant cannot deliver a hit or learn Melee',()=>{
  const w=medicalCamp(2),[p,other]=w.pawns as [Pawn,Pawn];background(p,undefined,'quiet-child');delete other.health;
  expect(startSocialFight(w,p,other)).toBe(true);const skills=structuredClone(p.skills.melee),otherHealth=JSON.stringify(other.health),rng=w.rng;
  advanceMelee(w,p,w.tick*10,()=>blockedCells(w,true),shootingQueries(w));
  expect(p.melee?.strike).toBeFalsy();expect(p.skills.melee).toEqual(skills);expect(JSON.stringify(other.health)).toBe(otherHealth);expect(w.rng).toBe(rng);
});

test('Firefighting incapacity is enforced even on a direct order and leaves its saved rank',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;background(p,undefined,'sheltered-child');p.priorities.firefight=1;const before=JSON.stringify(w);
  expect(applyExtinguish(w,{pawnId:p.id,fireId:999999})).toContain('Incapacité');expect(firefightingTargets(w,p)).toEqual([]);
  expect(JSON.stringify(w)).toBe(before);expect(p.priorities.firefight).toBe(1);
});
