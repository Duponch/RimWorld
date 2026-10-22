import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {emptyGroupLedger} from '../src/sim/group-loading.ts';
import type {AwayGroup} from '../src/sim/group-capture.ts';
import {advanceGroupPersonal,type GroupPersonalContext} from '../src/sim/group-personal.ts';
import {COLONY_EXPECTATIONS} from '../src/sim/expectations.ts';
import {legacyHumanAge} from '../src/sim/human-age.ts';
import {healthRandom} from '../src/sim/health.ts';
import {initialRecreation} from '../src/sim/recreation-rules.ts';
import {newApparelState} from '../src/sim/apparel-rules.ts';
import {MOOD_RISE_PER_HOUR,MOOD_FALL_PER_HOUR,moodTarget,personalMoodThoughts} from '../src/sim/mood.ts';
import {TICKS_PER_DAY,type MaterialPile,type World} from '../src/sim/types.ts';

/** Prepared away-owner kernel witness, as in group-physiology-trade. This
 * does not claim a formation, geographic route, played voyage or saved map. */
function preparedAway():{world:World;group:AwayGroup} {
  const world=medicalCamp(3,16),members=world.pawns.slice(0,2);
  for(const p of members){
    delete p.background;delete p.traits;delete p.health;
    p.age=legacyHumanAge();p.hunger=80;p.rest=70;p.mood=30;
    p.state='idle';p.path=[];p.moveCooldown=0;p.bedId=null;p.memories=[];
    p.recreation=initialRecreation(40);
  }
  world.pawns=world.pawns.filter(p=>!members.includes(p));
  const group:AwayGroup={id:1,phase:'at-site',members,items:[],startedAt:world.tick,departedAt:world.tick,lastPersonalTick:world.tick,
    destination:1,tile:1,route:[1],segment:null,paused:false,stop:{kind:'at-site'},entry:{x:0,z:0},ledger:emptyGroupLedger(),
    baseline:{food:0,silver:0,cargo:{cloth:0,'muffalo-wool':0},medicine:0,component:0}};
  world.group=group;return {world,group};
}
function personal(world:World,group:AwayGroup,air:number,resting=true,version=282){
  let draws=0;
  const context:GroupPersonalContext={tick:world.tick,schemaVersion:version,ambientTemperature259:air,seed:world.seed,
    legacyFood:false,legacyRest:false,resting,infectionChanceFactor:1,
    mood:{people:new Map([...world.pawns,...group.members].map(p=>[p.id,p])),expectation:COLONY_EXPECTATIONS.at(-1)!,difficultyMood:0},
    joyToleranceFall:18/TICKS_PER_DAY,random:()=>{draws++;return healthRandom(world);},notice:()=>{}};
  return {context,draws:()=>draws};
}
function thoughts(group:AwayGroup,c:GroupPersonalContext,air?:number){
  return personalMoodThoughts(group.members[0]!,{...c.mood,tick:c.tick,items:group.items,
    ...(air===undefined?{}:{ambientTemperature460:air})});
}
const thermal=(group:AwayGroup,c:GroupPersonalContext,air?:number)=>thoughts(group,c,air).filter(t=>t.id==='environment-cold'||t.id==='environment-hot');
function withoutMood(group:AwayGroup){
  const copy=structuredClone(group);for(const p of copy.members)p.mood=0;return copy;
}

test.each([{air:15,id:'environment-cold'},{air:27,id:'environment-hot'}])('current caravan air $air changes the target and real mood without a clinical dose or random draw',({air,id})=>{
  const coldOrHot=preparedAway(),comfortable=structuredClone(coldOrHot);
  comfortable.world.group=comfortable.group;
  for(const run of [coldOrHot,comfortable])run.world.tick++;
  const exposed=personal(coldOrHot.world,coldOrHot.group,air),neutral=personal(comfortable.world,comfortable.group,21);
  const rng=coldOrHot.world.rng,ledger=structuredClone(coldOrHot.group.ledger);
  expect(advanceGroupPersonal(coldOrHot.group,exposed.context)).toEqual({deceased:[],incapableIds:[]});
  expect(advanceGroupPersonal(comfortable.group,neutral.context)).toEqual({deceased:[],incapableIds:[]});
  expect(thermal(coldOrHot.group,exposed.context,air)).toMatchObject([{id,offset:-4,kind:'situation'}]);
  expect(moodTarget(thoughts(coldOrHot.group,exposed.context,air))).toBe(28);
  expect(moodTarget(thoughts(comfortable.group,neutral.context,21))).toBe(32);
  expect(coldOrHot.group.members[0]!.mood).toBeCloseTo(30-MOOD_FALL_PER_HOUR*24/TICKS_PER_DAY,12);
  expect(comfortable.group.members[0]!.mood).toBeCloseTo(30+MOOD_RISE_PER_HOUR*24/TICKS_PER_DAY,12);
  expect(withoutMood(coldOrHot.group)).toEqual(withoutMood(comfortable.group));
  expect(coldOrHot.group.members.every(p=>p.health===undefined)).toBe(true);
  expect(coldOrHot.group.ledger).toEqual(ledger);
  expect(coldOrHot.world.rng).toBe(rng);expect(comfortable.world.rng).toBe(rng);
  expect(exposed.draws()).toBe(0);expect(neutral.draws()).toBe(0);
});

test.each([15,27])('only the current person wearing the actual shirt protects against air %s',air=>{
  const base=preparedAway();
  const shirt:MaterialPile={id:base.world.nextId++,kind:'apparel',item:'cloth-shirt',quantity:1,
    owner:{type:'apparel',pawnId:base.group.members[0]!.id},apparel:newApparelState('cloth-shirt')};
  base.group.items.push(shirt);
  const worn=base,carried=structuredClone(base),otherWearer=structuredClone(base);
  carried.group.items[0]!.owner={type:'inventory',pawnId:carried.group.members[0]!.id};
  otherWearer.group.items[0]!.owner={type:'apparel',pawnId:otherWearer.group.members[1]!.id};
  for(const run of [worn,carried,otherWearer]){
    run.world.group=run.group;run.world.tick++;
    const items=structuredClone(run.group.items),rng=run.world.rng,c=personal(run.world,run.group,air);
    advanceGroupPersonal(run.group,c.context);
    const protectedPerson=run===worn;
    expect(moodTarget(thoughts(run.group,c.context,air))).toBe(protectedPerson?32:28);
    expect(thermal(run.group,c.context,air)).toHaveLength(protectedPerson?0:1);
    expect(run.group.members[0]!.mood).toBeCloseTo(30+(protectedPerson?MOOD_RISE_PER_HOUR:-MOOD_FALL_PER_HOUR)*24/TICKS_PER_DAY,12);
    expect(run.group.items).toEqual(items);expect(run.group.members.every(p=>p.health===undefined)).toBe(true);
    expect(run.world.rng).toBe(rng);expect(c.draws()).toBe(0);
  }
});

test('ordinary caravan rest keeps the thermal mood integration active, just as stationary wakeful travel',()=>{
  const resting=preparedAway(),awake=structuredClone(resting);awake.world.group=awake.group;
  for(const run of [resting,awake])run.world.tick++;
  const restContext=personal(resting.world,resting.group,15,true),awakeContext=personal(awake.world,awake.group,15,false);
  advanceGroupPersonal(resting.group,restContext.context);advanceGroupPersonal(awake.group,awakeContext.context);
  expect(resting.group.members[0]!.state).toBe('resting');expect(awake.group.members[0]!.state).toBe('idle');
  expect(resting.group.members[0]!.rest).toBeGreaterThan(70);expect(awake.group.members[0]!.rest).toBeLessThan(70);
  expect(resting.group.members[0]!.mood).toBeLessThan(30);
  expect(resting.group.members[0]!.mood).toBe(awake.group.members[0]!.mood);
  expect(resting.world.rng).toBe(awake.world.rng);expect(restContext.draws()).toBe(awakeContext.draws());
  expect(resting.group.members.map(p=>p.health)).toEqual(awake.group.members.map(p=>p.health));
});

test('the current cold tile never borrows old room comfort, beauty or a former bed',()=>{
  const luxurious=preparedAway(),ugly=structuredClone(luxurious);ugly.world.group=ugly.group;
  for(const run of [luxurious,ugly]){
    const p=run.group.members[0]!;p.comfort=run===luxurious?100:0;p.beauty=run===luxurious?100:0;p.bedId=999;
    run.world.tick++;
    const c=personal(run.world,run.group,15),rng=run.world.rng;
    advanceGroupPersonal(run.group,c.context);
    expect(thoughts(run.group,c.context,15).filter(t=>t.id.includes('comfort')||t.id.endsWith('environment'))).toEqual([]);
    expect(thermal(run.group,c.context,15)).toMatchObject([{id:'environment-cold',offset:-4}]);
    expect(moodTarget(thoughts(run.group,c.context,15))).toBe(28);
    expect(run.world.rng).toBe(rng);expect(c.draws()).toBe(0);
  }
  expect(luxurious.group.members[0]!.mood).toBe(ugly.group.members[0]!.mood);
});

test('a duplicate same-tick caravan pass changes no person, possession, clinical clock or RNG',()=>{
  const {world,group}=preparedAway();world.tick++;
  const c=personal(world,group,27);advanceGroupPersonal(group,c.context);
  const state=structuredClone(group),rng=world.rng,draws=c.draws(),person=group.members[0];
  expect(advanceGroupPersonal(group,c.context)).toBeNull();
  expect(group).toEqual(state);expect(group.members[0]).toBe(person);
  expect(world.rng).toBe(rng);expect(c.draws()).toBe(draws);
});

test.each([15,27])('historical281 keeps its personal mood in air %s without acquiring the new situation',air=>{
  const historical=preparedAway(),neutral=structuredClone(historical);neutral.world.group=neutral.group;
  for(const run of [historical,neutral])run.world.tick++;
  const before=personal(historical.world,historical.group,air,true,281),control=personal(neutral.world,neutral.group,21,true,281);
  advanceGroupPersonal(historical.group,before.context);advanceGroupPersonal(neutral.group,control.context);
  expect(historical.group).toEqual(neutral.group);
  expect(historical.group.members[0]!.mood).toBeCloseTo(30+MOOD_RISE_PER_HOUR*24/TICKS_PER_DAY,12);
  expect(thermal(historical.group,before.context)).toEqual([]);
  expect(moodTarget(thoughts(historical.group,before.context))).toBe(32);
  expect(historical.world.rng).toBe(neutral.world.rng);expect(before.draws()).toBe(0);expect(control.draws()).toBe(0);
});
