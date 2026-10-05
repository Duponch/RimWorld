import { readFileSync } from 'node:fs';
import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { isColonist } from '../src/sim/affiliation.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { recoverAnimalManhunter,startAnimalManhunter } from '../src/sim/animal-manhunter.ts';
import { queryOrderOptions } from '../src/sim/player-orders.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { damageBarrier,barrierMaxHp } from '../src/sim/barriers.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { enableCassandraRaids } from '../src/sim/cassandra-raids.ts';
import { adoptFluIncidents } from '../src/sim/flu-incidents.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { createRaidGroup } from '../src/sim/raid-spawn.ts';
import type { World } from '../src/sim/types.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';
import { crashlandedDecisions,crashlandedThreatActive } from './scenarios/crashlanded-player.ts';
import { prisonDecisions,type PrisonPlayerState } from './scenarios/prison-player.ts';
import { environmentDecisions,type EnvironmentPlayerState } from './scenarios/environment-player.ts';
import { rescueCamp } from './scenarios/rescue.ts';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction.ts';
import { energyDecisions } from './scenarios/energy-player.ts';

/** Only the player's notebook is prepared here. Threat and care branches must
 * return before unrelated extensions, without creating anything in World. */
function notebooks(w:World):{prison:PrisonPlayerState;environment:EnvironmentPlayerState}{
  const anchor={x:2,z:2},people=w.pawns.map(p=>p.id);
  const prison:PrisonPlayerState={startTick:w.tick,origin:anchor,campAnchor:anchor,initialColonists:w.pawns.filter(isColonist).map(p=>p.id),initialPeople:people,
    energy:{startTick:w.tick,origin:anchor,stage:'construct',stageTick:w.tick,initialSteel:0,initialComponents:0,milestones:{},nightDrainTicks:0,previousBattery:0,electricMeals:0},
    milestones:{},attempts:[],conversations:0,fedCaptive:0,recruitMeals:0,recruitWorkTicks:0,recruitSleepTicks:0};
  const environment:EnvironmentPlayerState={startTick:w.tick,initialPeople:people,prison,turbine:anchor,heaters:[],wire:[],field:{from:anchor,to:anchor},milestones:{},
    coldTicks:0,heatedTicks:0,windTicks:0,nightBatteryTicks:0,previousBattery:0,winterMeals:0,springHarvested:0,outdoorMin:0,outdoorMax:0,lowestFood:0};
  return {prison,environment};
}

test('inherited prison and environment pilots retain mobilisation and physical orders for a real public manhunter',()=>{
  const w=deserializeWorld(readFileSync('public/test-saves/v201/animal-en-rage.json','utf8'));
  stepWorld(w);expect(crashlandedThreatActive(w)).toBe(true);
  const {prison,environment}=notebooks(w),before=serializeWorld(w);
  const first=prisonDecisions(w,prison);
  expect(first.length).toBeGreaterThan(0);
  expect(first.every(d=>d.command.type==='draft'&&d.command.enabled)).toBe(true);
  expect(environmentDecisions(w,environment)).toEqual(first);
  expect(serializeWorld(w)).toBe(before);
  for(const d of first)expect(applyCommand(w,d.command).ok).toBe(true);
  const engaged=serializeWorld(w),physical=crashlandedDecisions(w);
  expect(physical.length).toBeGreaterThan(0);
  expect(physical.every(d=>['draft-move','shoot','fire-at-will'].includes(d.command.type))).toBe(true);
  expect(prisonDecisions(w,prison)).toEqual(physical);
  expect(environmentDecisions(w,environment)).toEqual(physical);
  expect(serializeWorld(w)).toBe(engaged);
  for(const d of physical)expect(applyCommand(w,d.command).ok,JSON.stringify(d)).toBe(true);
  expect(validateWorld(w)).toEqual([]);
});

test('a physically available rescue waits for the animal threat and resumes after recovery and demobilisation',()=>{
  const w=rescueCamp(),doctor=w.pawns[0]!,patient=w.pawns[1]!,{prison,environment}=notebooks(w);
  expect(patient.state).toBe('downed');
  expect(queryOrderOptions(w,doctor.id,patient).some(o=>o.enabled&&o.rescuePatientId===patient.id)).toBe(true);
  expect(prisonDecisions(w,prison).some(d=>d.command.type==='order-rescue')).toBe(true);
  const animal:WildAnimal={id:w.nextId++,species:'hare',sex:'male',ageTicks:adultAgeTicks('hare'),x:20,z:20,food:.15,rest:.7,state:'idle',path:[],nextDecision:w.tick};
  w.wildlife={profile:'temperate-hares-v1',rng:811,animals:[animal],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  expect(startAnimalManhunter(w,animal)).toBe(true);
  const first=prisonDecisions(w,prison);
  expect(first.length).toBeGreaterThan(0);
  expect(first.every(d=>d.command.type==='draft'&&d.command.enabled)).toBe(true);
  expect(environmentDecisions(w,environment)).toEqual(first);
  for(const d of first)expect(applyCommand(w,d.command).ok).toBe(true);
  expect(doctor.rescue).toBeUndefined();
  recoverAnimalManhunter(w,animal);
  const release=prisonDecisions(w,prison);
  expect(release).toHaveLength(1);expect(release[0]!.command).toEqual({type:'draft',pawnIds:[doctor.id],enabled:false});
  for(const d of release)expect(applyCommand(w,d.command).ok).toBe(true);
  const care=prisonDecisions(w,prison);
  expect(care).toHaveLength(1);expect(care[0]!.command).toEqual({type:'order-rescue',pawnId:doctor.id,patientId:patient.id,queue:false});
  const position={x:patient.x,z:patient.z};
  expect(applyCommand(w,care[0]!.command).ok).toBe(true);
  expect(doctor.rescue?.patientId).toBe(patient.id);expect({x:patient.x,z:patient.z}).toEqual(position);
  expect(validateWorld(w)).toEqual([]);
});

test('energy raid policy rechecks real enclosures after a breach and retains ordinary refuge and rally orders',()=>{
  const w=deconstructionCamp(3);
  w.scenario={id:'crashlanded',revision:1,landing:{x:16,z:16}};
  w.gameProfile=crashlandedProfile();
  enableCassandraRaids(w);
  adoptFluIncidents(w);
  const {prison}=notebooks(w),s=prison.energy;
  const room=(x:number,z:number)=>{
    for(let dz=0;dz<5;dz++)for(let dx=0;dx<5;dx++)if(dx===0||dz===0||dx===4||dz===4){
      const building=fixtureBuilding(w,dx===4&&dz===2?'door':'wall',x+dx,z+dz);
      if(building.kind==='door')Object.assign(building,{material:'wood',door:newDoorState(w.tick)});
    }
  };
  room(12,10);room(s.origin.x,s.origin.z);room(s.origin.x,s.origin.z+7);
  for(let i=0;i<3;i++){
    fixtureBuilding(w,'bed',13+i,12,2);
    Object.assign(w.pawns[i]!,{x:13+i,z:13});
  }
  const defender=w.pawns[0]!,civilians=w.pawns.slice(1);
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:defender.id},'revolver');
  expect(createRaidGroup(w,{count:1,sites:[{x:0,z:16}],random:{rng:811}})).not.toBeNull();
  expect(applyCommand(w,{type:'draft',pawnIds:[defender.id,...civilians.map(p=>p.id)],enabled:true}).ok).toBe(true);
  expect(validateWorld(w)).toEqual([]);
  const before=serializeWorld(w),intact=energyDecisions(w,s);
  expect(serializeWorld(w)).toBe(before);
  const targets=(decisions:ReturnType<typeof energyDecisions>,ids:number[])=>decisions.flatMap(d=>d.command.type==='draft-move'&&d.command.pawnIds.some(id=>ids.includes(id))?[d.command.target]:[]);
  // The former cell-rank oracle moved already safe civilians toward occupied
  // cells. V217 retains their real positions, then selects free reachable cells
  // only when this shelter ceases to be admissible.
  expect(targets(intact,civilians.map(p=>p.id))).toEqual([]);
  expect(civilians.map(p=>({x:p.x,z:p.z}))).toEqual([{x:14,z:13},{x:15,z:13}]);
  expect(targets(intact,[defender.id])).toEqual([{x:17,z:16}]);
  for(const d of intact)expect(applyCommand(w,d.command).ok,JSON.stringify(d)).toBe(true);
  expect(civilians.every(p=>p.draft?.target===null)).toBe(true);
  expect(defender.draft!.target).toEqual({x:17,z:16});
  const admissibleRefuges=(decisions:ReturnType<typeof energyDecisions>,anchor:{x:number;z:number})=>{
    const cells=targets(decisions,civilians.map(p=>p.id));expect(cells).toHaveLength(2);
    expect(new Set(cells.map(c=>c.z*w.width+c.x)).size).toBe(2);
    for(const cell of cells){
      expect(cell.x>anchor.x&&cell.x<anchor.x+4&&cell.z>anchor.z&&cell.z<anchor.z+4).toBe(true);
      expect(w.pawns.some(p=>p.state!=='dead'&&p.x===cell.x&&p.z===cell.z)).toBe(false);
    }
    return cells;
  };
  const wall=w.structures.find(q=>q.kind==='wall'&&q.x===12&&q.z===13)!;
  expect(damageBarrier(w,wall,barrierMaxHp(wall))).toBe(true);
  const reached=serializeWorld(w),evacuate=energyDecisions(w,s);
  expect(serializeWorld(w)).toBe(reached);
  const first=admissibleRefuges(evacuate,s.origin);
  for(const d of evacuate)expect(applyCommand(w,d.command).ok,JSON.stringify(d)).toBe(true);
  expect(civilians.map(p=>p.draft!.target)).toEqual(first);expect(validateWorld(w)).toEqual([]);
  const door=w.structures.find(q=>q.kind==='door'&&q.x===6&&q.z===4)!;
  expect(applyCommand(w,{type:'door-policy',structureId:door.id,setting:'holdOpen',value:true}).ok).toBe(true);
  const opened=serializeWorld(w),reconsider=energyDecisions(w,s);
  expect(serializeWorld(w)).toBe(opened);
  const second=admissibleRefuges(reconsider,{x:s.origin.x,z:s.origin.z+7});
  for(const d of reconsider)expect(applyCommand(w,d.command).ok,JSON.stringify(d)).toBe(true);
  expect(civilians.map(p=>p.draft!.target)).toEqual(second);
  expect(validateWorld(w)).toEqual([]);
});
