import {expect,test} from 'vitest';
import {peaceDiplomat293,peaceNegotiationAbility293,draftPeaceSocialXp293,peaceBadOutcomeFactor293,peaceOutcomeWeights293,peaceOutcome293,peaceGoodwillRequest293} from '../src/sim/peace-talks-rules-293.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {xpRequired,XP_SCALE} from '../src/sim/skills.ts';
import {HUMAN_YEAR_TICKS} from '../src/sim/human-age.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import type {Pawn} from '../src/sim/types.ts';

function person(level=8):Pawn {
 const p=deconstructionCamp().pawns[0]!;
 delete p.background;delete p.worldAffiliation259;delete p.visitor;delete p.raid;delete p.podRescue;delete p.prisoner;delete p.mental;delete p.health;
 p.faction='colony';p.state='idle';p.skills.social={level,xp:0,dailyXp:0,passion:0};return p;
}

test('negotiation uses Social and float32 .4+.075L, separate from the trade price stat',()=>{
 for(const [level,expected] of [[0,Math.fround(.4)],[8,1],[20,Math.fround(1.9)]])expect(peaceNegotiationAbility293(person(level))).toBe(expected);
 const p=person(8),before=JSON.stringify(p);expect(peaceDiplomat293([p])).toEqual({pawn:p,ability:1});expect(JSON.stringify(p)).toBe(before);
});

test('allowed defects normalize capacities before weight; the minimum does not bar a mute diplomat',()=>{
 const p=person(20);p.health=createMedicalRecord();p.health.missing.push({part:'left-ear',bornAt:0});
 // Hearing .75 divided by .8; Talking1. A trade hearing defect .05 would
 // give a different result, so this checks the installed NegotiationAbility XML.
 const hearing=Math.fround(.75/Math.fround(1-Math.fround(.2))),weighted=Math.fround(1+Math.fround(Math.fround(.9)*Math.fround(hearing-1)));
 expect(peaceNegotiationAbility293(p)).toBe(Math.fround(Math.fround(1.9)*weighted));
 p.health.missing.push({part:'tongue',bornAt:0});
 expect(peaceNegotiationAbility293(p)).toBe(Math.fround(.4));expect(peaceDiplomat293([p])?.pawn).toBe(p);
});

test('first strict maximum is selected from original members, without trade age or sleeping exclusions',()=>{
 const a=person(8),b=person(8);b.id=a.id+1;b.state='sleeping';
 b.age={biologicalTicks:17*HUMAN_YEAR_TICKS,chronologicalTicks:17*HUMAN_YEAR_TICKS};
 expect(peaceDiplomat293([a,b])?.pawn).toBe(a);expect(peaceDiplomat293([b,a])?.pawn).toBe(b);
 b.skills.social!.level=12;expect(peaceDiplomat293([a,b])?.pawn).toBe(b);
});

test('owners, mental crisis and actual Social incapacity are rejected independently of the score',()=>{
 const good=person(1),base=person(20);
 const invalid:Pawn[]=[{...base,state:'dead'},{...base,state:'downed'},{...base,faction:'outlanders'},
  {...base,worldAffiliation259:{revision:1,factionId:1,hostFactionId:2,guestStatus:'Guest'}},
  {...base,background:{childhood:'sheltered-child',adulthood:'hermit'}},
  {...base,mental:{below:[0,0,0],cooldown:0,catharsis:[],crisis:{kind:'sad-wander',age:0,target:null,waitUntil:0}}}];
 for(const p of invalid){expect(peaceDiplomat293([p])?.pawn).toBeUndefined();expect(peaceDiplomat293([p,good])?.pawn).toBe(good);}
 expect(peaceDiplomat293([])).toBeUndefined();
});

test.each([[0,2100],[1,6000],[2,9000]] as const)('direct XP retains passion %i but ignores trait and daily saturation', (passion,expected)=>{
 const p=person(0);p.traits=['fast-learner'];p.skills.social={level:0,xp:0,dailyXp:9000*XP_SCALE,passion};
 const before=JSON.stringify(p),draft=draftPeaceSocialXp293(p);
 expect(draft.credited).toBe(expected);expect(draft.skill.dailyXp).toBe(9000*XP_SCALE);
 let total=draft.skill.xp;for(let level=0;level<draft.skill.level;level++)total+=xpRequired(level);
 expect(total).toBe(expected*XP_SCALE);expect(JSON.stringify(p)).toBe(before);expect(draft.skill).not.toBe(p.skills.social);
});

test('direct XP records actual credit at cap and preserves debt/ordinary level thresholds',()=>{
 const p=person(20);p.skills.social!.xp=xpRequired(20)-1500;p.skills.social!.passion=2;
 const draft=draftPeaceSocialXp293(p);expect(draft.credited).toBe(.5);expect(draft.skill.xp).toBe(xpRequired(20)-XP_SCALE);
 p.skills.social={level:1,xp:-500*XP_SCALE,dailyXp:123,passion:0};
 const debt=draftPeaceSocialXp293(p);expect(debt.credited).toBe(2100);expect(debt.skill.level).toBe(1);expect(debt.skill.xp).toBe(1600*XP_SCALE);expect(debt.skill.dailyXp).toBe(123);
});

test('sparse Social is drafted prospectively and disabled Social never acquires XP',()=>{
 const p=person();delete p.skills.social;const before=JSON.stringify(p),draft=draftPeaceSocialXp293(p);
 expect(draft.credited).toBe(2100);expect(JSON.stringify(p)).toBe(before);expect(Object.hasOwn(p.skills,'social')).toBe(false);
 p.background={childhood:'sheltered-child',adulthood:'hermit'};expect(draftPeaceSocialXp293(p).credited).toBe(0);
});

test('unfavourable factor endpoints keep all five weighted outcomes, not five fixed percentages',()=>{
 expect(peaceBadOutcomeFactor293(0)).toBe(4);expect(peaceBadOutcomeFactor293(1)).toBe(1);expect(peaceBadOutcomeFactor293(1.5)).toBe(Math.fround(.4));expect(peaceBadOutcomeFactor293(2)).toBe(Math.fround(.4));
 const weights=peaceOutcomeWeights293(1);let cumulative=0,total=weights.reduce((n,w)=>n+w,0);
 for(const [i,outcome] of ['disaster','backfire','flounder','success','triumph'].entries()){
  expect(peaceOutcome293(1,(cumulative+weights[i]!/2)/total)).toBe(outcome);cumulative+=weights[i]!;
 }
 expect(peaceOutcome293(.4,0)).toBe('disaster');expect(peaceOutcome293(1.9,1-Number.EPSILON)).toBe('triumph');
 for(const invalid of [-1,1,NaN,Infinity])expect(()=>peaceOutcome293(1,invalid)).toThrow();
});

test('inclusive goodwill ranges and Disaster current hostility are distinct from birth eligibility',()=>{
 for(const [outcome,min,max] of [['backfire',-20,-10],['success',60,70],['triumph',100,110],['flounder',0,0]] as const){
  expect(peaceGoodwillRequest293(outcome,0,-80,'hostile')).toBe(min);expect(peaceGoodwillRequest293(outcome,1-Number.EPSILON,-80,'hostile')).toBe(max);
 }
 expect(peaceGoodwillRequest293('disaster',0,-80,'hostile')).toBe(-50);
 expect(peaceGoodwillRequest293('disaster',1-Number.EPSILON,-80,'hostile')).toBe(-40);
 expect(peaceGoodwillRequest293('disaster',0,50,'neutral')).toBe(-125);
 expect(peaceGoodwillRequest293('disaster',0,100,'ally')).toBe(-175);
 expect(peaceGoodwillRequest293('disaster',0,-30,'neutral')).toBe(-50);
});
