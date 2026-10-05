import { expect,test } from 'vitest';
import { startBerserk,startMurderousRage } from '../src/sim/mental-break.ts';
import { finishMentalBreak } from '../src/sim/mental-state.ts';
import { strikeLivingTarget } from '../src/sim/living-melee.ts';
import { meleeHitChance,meleeDodgeChance,type MeleeTool } from '../src/sim/melee-statistics.ts';
import { healthRandom } from '../src/sim/health.ts';
import { considerAutomaticCombat,considerMeleeRetaliation } from '../src/sim/automatic-combat.ts';
import { meleeThreatTarget,retaliationPermission } from '../src/sim/combat-target.ts';
import { considerFlee,processFlee,threatQueries } from '../src/sim/threats.ts';
import { startSocialFight } from '../src/sim/social-fight.ts';
import { advanceMelee } from '../src/sim/melee.ts';
import { shootingQueries } from '../src/sim/shooting.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { hostileTo } from '../src/sim/affiliation.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';
import { orderTrade } from '../src/sim/trade-contact.ts';
import { applyCleanRoom } from '../src/sim/cleaning.ts';
import { addFilth } from '../src/sim/filth.ts';
import { applyExtinguish } from '../src/sim/firefighting.ts';
import { visitorTradeFixture } from './scenarios/visitors.ts';
import { enclosedRoom } from './scenarios/cleanliness.ts';
import { woodFire } from './scenarios/fire.ts';
import { makeCrisisPacifist,mentalCrisesCamp } from './helpers/mental-crises-v211.ts';

const fist:MeleeTool={id:'left-fist',damage:8.2,penetration:.123,kind:'blunt',cooldownCore:120,weight:1};
function attempt(outcome:'miss'|'dodge'='miss'){
  const w=mentalCrisesCamp(),attacker=w.pawns[0]!,victim=w.pawns[1]!,witness=w.pawns[2]!;
  victim.x=attacker.x+1;victim.skills.melee.level=20;attacker.skills.melee.level=0;
  expect(startMurderousRage(w,attacker)).toBe(true);const c=attacker.mental!.crisis!;if(c.kind!=='murderous-rage')throw new Error('Expected Murder.');c.targetId=victim.id;
  attacker.melee={order:{auto:'mental',targetId:victim.id,startedDowned:false},strike:null};
  // Select a fixture seed from the independent hit/dodge admission intervals.
  // No attempt or health/RNG state is pre-applied to the actual world.
  let rng=1;
  for(;rng<10000;rng++){const stream={rng},hit=healthRandom(stream),dodge=healthRandom(stream);
    if(outcome==='miss'?hit>=meleeHitChance(0):hit<meleeHitChance(0)&&dodge<meleeDodgeChance(20))break;
  }
  expect(rng).toBeLessThan(10000);strikeLivingTarget(w,attacker,victim,fist,w.tick*10,{rng});
  expect(attacker.melee!.strike!.outcome).toBe(outcome);expect(victim.health?.injuries??[]).toEqual([]);
  return {w,attacker,victim,witness};
}

for(const outcome of ['miss','dodge'] as const)test(`a real ${outcome} creates a personal threat and one Attack retaliation between allies`,()=>{
  const {w,attacker,victim,witness}=attempt(outcome);victim.hostilityResponse='attack';
  expect(victim.meleeThreat).toEqual({attackerId:attacker.id,atCore:w.tick*10});expect(witness.meleeThreat).toBeUndefined();
  expect(hostileTo(victim,attacker)).toBe(false);expect(threatQueries(w).hostiles(witness)).toEqual([]);
  expect(considerMeleeRetaliation(w,victim,{remaining:8,pairs:32768})).toBe(true);
  expect(victim.melee!.order).toMatchObject({auto:'retaliation',targetId:attacker.id,untilCore:w.tick*10+200});expect(validateWorld(w)).toEqual([]);
  expect(advanceMelee(w,victim,w.tick*10,()=>blockedCells(w,true),shootingQueries(w))).toBe(true);
  expect(victim.melee?.strike?.targetId).toBe(attacker.id);expect(victim.melee?.order).toBeNull();expect(hostileTo(victim,attacker)).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('Flee escapes its personal Murder threat while Ignoring and witnesses stay neutral',()=>{
  const {w,attacker,victim,witness}=attempt();delete victim.hostilityResponse;
  const context=threatQueries(w);considerFlee(w,victim,context);expect(victim.flee).toBeDefined();
  processFlee(w,victim,context,()=>blockedCells(w),{remaining:8,pairs:32768},()=>new LightEnvironmentCache().read(w));
  expect(victim.moveCooldown).toBeGreaterThan(0);expect(victim.motion).toBeDefined();expect(victim.melee).toBeUndefined();
  expect(hostileTo(attacker,witness)).toBe(false);expect(context.nearby(witness)).toEqual([]);expect(validateWorld(w)).toEqual([]);
  const ignored=attempt();considerAutomaticCombat(ignored.w,ignored.victim,{remaining:8,pairs:32768});considerFlee(ignored.w,ignored.victim,threatQueries(ignored.w));
  expect(ignored.victim.melee).toBeUndefined();expect(ignored.victim.flee).toBeUndefined();expect(ignored.witness.meleeThreat).toBeUndefined();
});

test('retaliation respects voluntary violence, drafted and queued control, LOS, distance and real expiry',()=>{
  for(const guard of ['pacifist','draft','queued','crisis','sleep'] as const){
    const {w,victim}=attempt();victim.hostilityResponse='attack';
    if(guard==='pacifist')makeCrisisPacifist(victim);
    if(guard==='draft')expect(applyCommand(w,{type:'draft',pawnIds:[victim.id],enabled:true}).ok).toBe(true);
    if(guard==='queued'){
      victim.priorities.gather=1;
      for(const [i,x] of [20,21].entries()){
        w.resources.push({id:w.nextId++,kind:'tree',x,z:20,amount:12});
        expect(applyCommand(w,{type:'designate',kind:'chop',x,z:20}).ok).toBe(true);
        const accepted=applyCommand(w,{type:'order-job',pawnId:victim.id,jobId:w.jobs.at(-1)!.id,queue:i===1});
        expect(accepted.ok,'reason' in accepted?accepted.reason:undefined).toBe(true);
      }
      expect(victim.orders.queue).toHaveLength(1);
    }
    if(guard==='crisis')expect(startMurderousRage(w,victim)).toBe(true);
    if(guard==='sleep'){victim.state='sleeping';victim.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:victim.x,z:victim.z}};}
    const before=JSON.stringify(w);expect(considerMeleeRetaliation(w,victim,{remaining:8,pairs:32768})).toBe(false);expect(JSON.stringify(w)).toBe(before);
    if(guard!=='sleep')expect(retaliationPermission(victim)).toBe(false);
  }
  const {w,attacker,victim}=attempt();expect(meleeThreatTarget(w,victim)).toBe(attacker);
  victim.meleeThreat!.atCore=w.tick*10-401;expect(meleeThreatTarget(w,victim)).toBeUndefined();victim.meleeThreat!.atCore=w.tick*10;
  attacker.x=victim.x-4;expect(meleeThreatTarget(w,victim)).toBeUndefined();attacker.x=victim.x-3;
  const wall={id:w.nextId++,kind:'wall' as const,x:victim.x-1,z:victim.z,orientation:0 as const,footprint:'standard' as const,material:'wood' as const};w.structures.push(wall);
  expect(meleeThreatTarget(w,victim)).toBeUndefined();w.structures=[];
  expect(meleeThreatTarget(w,victim)).toBe(attacker);attacker.state='sleeping';expect(meleeThreatTarget(w,victim)).toBeUndefined();
});

test('actual direct trade, cleaning and extinguish jobs survive a personal threat without RNG or retaliation',()=>{
  for(const forced of ['trade','clean','fire'] as const){
    const fixture=forced==='trade'?visitorTradeFixture(2):undefined,w=fixture?.world??mentalCrisesCamp(2),attacker=w.pawns[0]!,victim=w.pawns[1]!;
    victim.x=attacker.x+1;victim.z=attacker.z;victim.hostilityResponse='attack';attacker.skills.melee.level=0;
    if(forced==='clean'){
      const room=enclosedRoom(w,{x:9,z:10});w.home=[...room.cells].sort((a,b)=>a-b);victim.priorities.clean=1;
      expect(addFilth(w,{x:11,z:13},'blood')).toBe(true);
    }
    expect(startMurderousRage(w,attacker)).toBe(true);const c=attacker.mental!.crisis!;if(c.kind!=='murderous-rage')throw new Error('Expected Murder.');c.targetId=victim.id;
    attacker.melee={order:{auto:'mental',targetId:victim.id,startedDowned:false},strike:null};strikeLivingTarget(w,attacker,victim,fist,w.tick*10,{rng:0x12345678});
    expect(victim.meleeThreat?.attackerId).toBe(attacker.id);
    if(forced==='trade'){const accepted=orderTrade(w,victim.id,fixture!.traderId);expect(accepted.ok,'reason' in accepted?accepted.reason:undefined).toBe(true);}
    if(forced==='clean')expect(applyCleanRoom(w,{type:'clean-room',pawnId:victim.id,x:11,z:12})).toBeNull();
    if(forced==='fire')expect(applyExtinguish(w,{pawnId:victim.id,fireId:woodFire(w,{x:victim.x+2,z:victim.z})})).toBeNull();
    expect(victim.orders.active).toBeNull();expect(retaliationPermission(victim)).toBe(false);const before=JSON.stringify(w);
    expect(considerMeleeRetaliation(w,victim,{remaining:8,pairs:32768})).toBe(false);expect(JSON.stringify(w)).toBe(before);expect(victim.melee).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  }
});

test('a social duel never creates the new personal threat and historical schema191 emits no future field',()=>{
  const social=mentalCrisesCamp(2),a=social.pawns[0]!,b=social.pawns[1]!;b.x=a.x+1;expect(startSocialFight(social,a,b)).toBe(true);
  strikeLivingTarget(social,a,b,fist,social.tick*10,{rng:0x12345678});expect(b.meleeThreat).toBeUndefined();
  const old=mentalCrisesCamp(2),p=old.pawns[0]!,victim=old.pawns[1]!;(old as {schemaVersion:number}).schemaVersion=191;victim.x=p.x+1;p.melee={order:null,strike:null};
  strikeLivingTarget(old,p,victim,fist,old.tick*10,{rng:0x12345678});expect(victim.meleeThreat).toBeUndefined();
});

test('a domestic animal real counterattack permits private human retaliation and exact saved continuation',()=>{
  const w=mentalCrisesCamp(1),p=w.pawns[0]!;p.hostilityResponse='attack';p.skills.melee.level=0;
  const animal:WildAnimal={id:w.nextId++,species:'hare' as const,sex:'female' as const,ageTicks:adultAgeTicks('hare'),x:p.x+1,z:p.z,food:.2,rest:90,state:'idle' as const,path:[],nextDecision:w.tick,
    domestic:{since:w.tick,care:'dry' as const,tameness:1,nextDecay:w.tick+6000}};
  w.wildlife={profile:'temperate-hares-v1',rng:42,animals:[animal],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  expect(startBerserk(w,p)).toBe(true);
  for(let i=0;i<90&&!p.melee?.order;i++)stepWorld(w);
  expect(p.melee?.order).toMatchObject({auto:'mental',targetId:animal.id});
  // The first real human attempt misses, provoking the animal without injury.
  // The next draw after tool selection must lie outside level-zero hit chance.
  let rng=1;for(;rng<10000;rng++){const stream={rng};healthRandom(stream);if(healthRandom(stream)>=meleeHitChance(0))break;}
  expect(rng).toBeLessThan(10000);w.rng=rng;stepWorld(w);
  expect(p.melee?.strike?.outcome).toBe('miss');
  // The animal also owns its already captured edge; retaliation begins only
  // after its real motion permits the counterattack.
  for(let i=0;i<12&&!animal.strike;i++)stepWorld(w);
  expect(animal.strike?.targetId).toBe(p.id);expect(p.meleeThreat?.attackerId).toBe(animal.id);
  finishMentalBreak(w,p);
  for(let i=0;i<35&&p.melee?.order?.auto!=='retaliation';i++)stepWorld(w);
  expect(p.melee?.order).toMatchObject({auto:'retaliation',targetId:animal.id});expect(validateWorld(w)).toEqual([]);
  const peer=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(peer);expect(peer).toEqual(w);
  expect(p.melee?.strike?.targetId).toBe(animal.id);expect(p.melee?.order).toBeNull();expect(validateWorld(w)).toEqual([]);
  const before=JSON.stringify(w);expect(applyCommand(w,{type:'melee',pawnIds:[p.id],targetId:animal.id}).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
});
