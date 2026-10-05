import assert from 'node:assert/strict';
import { test } from 'vitest';
import { equipmentCamp } from './scenarios/equipment.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { survivorPlan } from './scenarios/survivor-player.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { startAnimalManhunter } from '../src/sim/animal-manhunter.ts';
import { meleeContact } from '../src/sim/melee-space.ts';
import { shotPlan,shootingQueries } from '../src/sim/shooting.ts';
import { clearShotSegment } from '../src/sim/combat-space.ts';
import { captureWorldShotGrid } from '../src/sim/combat-world.ts';
import { considerAutomaticCombat as productDecision } from '../src/sim/automatic-combat.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { enableCassandraRaids } from '../src/sim/cassandra-raids.ts';
import { adoptFluIncidents } from '../src/sim/flu-incidents.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { violentWorkRefusal } from '../src/sim/colonist-backgrounds.ts';
import { TICKS_PER_DAY } from '../src/sim/types.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';
import { crashlandedDecisions as productPilot } from './scenarios/crashlanded-player.ts';

/** Same contact boundary as the failed campaign checkpoint:
 * 128,127 -> 129,128 contact, translated onto a bounded existing test camp.
 * It does not change/revive any person in the failed campaign checkpoint. */
function contactCamp() {
  const w=equipmentCamp(1),p=w.pawns[0]!;
  w.resources=[];w.jobs=[];w.structures=[];w.piles=[];
  Object.assign(p,{x:8,z:8});
  const a:WildAnimal={id:w.nextId++,species:'hare',sex:'female',ageTicks:adultAgeTicks('hare'),
    x:9,z:9,food:.2,rest:.8,state:'idle',path:[],nextDecision:w.tick};
  w.wildlife={profile:'temperate-hares-v1',rng:811,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');
  fixtureBuilding(w,'wall',9,8);
  assert.equal(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok,true);
  assert.equal(applyCommand(w,{type:'fire-at-will',pawnIds:[p.id],enabled:false}).ok,true);
  assert.equal(startAnimalManhunter(w,a),true);a.manhunter!.targetId=p.id;
  assert.deepEqual(validateWorld(w),[]);
  return {w,p,a};
}

function productContactProof() {
  const {w,p,a}=contactCamp();
  assert.equal(meleeContact(w,p,a),true);
  assert.equal(clearShotSegment(captureWorldShotGrid(w),p,a),false);
  assert.equal('reason' in shotPlan(w,p,a.id,shootingQueries(w)),true);
  const rng=w.rng;
  productDecision(w,p,{remaining:4,pairs:32768});
  assert.equal(p.melee?.order?.auto,'draft');
  assert.equal(p.melee?.order?.targetId,a.id);
  assert.equal(p.draft?.holdFire,true);
  assert.equal(w.rng,rng,'acquiring melee does not roll damage early');
  assert.deepEqual(validateWorld(w),[]);
  const copy=deserializeWorld(serializeWorld(w));
  let attempted=false;
  for(let n=0;n<24&&!attempted;n++) {
    stepWorld(w);stepWorld(copy);
    assert.deepEqual(validateWorld(w),[]);
    assert.equal(serializeWorld(copy),serializeWorld(w));
    attempted=p.lastAttack?.targetId===a.id;
  }
  assert.equal(attempted,true,'actual melee producer must attempt the attack, hit or miss');

  const both=contactCamp();fixtureBuilding(both.w,'wall',8,9);
  assert.equal(meleeContact(both.w,both.p,both.a),false);
  const bothBefore=serializeWorld(both.w);
  productDecision(both.w,both.p,{remaining:4,pairs:32768});
  assert.equal(both.p.melee,undefined);assert.equal(serializeWorld(both.w),bothBefore);

  const distant=contactCamp();distant.a.x=11;distant.a.z=8;
  distant.w.piles=distant.w.piles.filter(i=>i.owner.type!=='equipment');
  assert.equal(applyCommand(distant.w,{type:'draft',pawnIds:[distant.p.id],enabled:false}).ok,true);
  assert.equal(applyCommand(distant.w,{type:'hostility-response',pawnId:distant.p.id,response:'attack'}).ok,true);
  assert.equal(meleeContact(distant.w,distant.p,distant.a),false);
  assert.equal(clearShotSegment(captureWorldShotGrid(distant.w),distant.p,distant.a),false);
  const distantRng=distant.w.rng;
  productDecision(distant.w,distant.p,{remaining:4,pairs:32768});
  assert.equal(distant.p.melee,undefined);assert.deepEqual(distant.p.path,[]);
  assert.equal(distant.w.rng,distantRng);assert.equal(distant.p.planCooldown,4);

  const peaceful=contactCamp();delete peaceful.a.manhunter;
  productDecision(peaceful.w,peaceful.p,{remaining:4,pairs:32768});
  assert.equal(peaceful.p.melee,undefined,'wildlife alone does not establish hostility');
}

function pilotCamp(pacifist=false) {
  const w=equipmentCamp(2),p=w.pawns[0]!;
  w.resources=[];w.jobs=[];w.structures=[];w.piles=[];
  w.scenario={id:'crashlanded',revision:1,landing:{x:16,z:16}};
  w.gameProfile=crashlandedProfile();enableCassandraRaids(w);adoptFluIncidents(w);
  fixtureBuilding(w,'bed',8,6,2);
  const camp=survivorPlan(w,true);
  for(let dz=0;dz<5;dz++)for(let dx=0;dx<5;dx++)if(!dx||!dz||dx===4||dz===4) {
    const door=dx===2&&dz===4;
    const s=fixtureBuilding(w,door?'door':'wall',camp.anchor.x+dx,camp.anchor.z+dz);
    if(door)Object.assign(s,{material:'wood',door:newDoorState(w.tick)});
  }
  Object.assign(p,camp.pin);Object.assign(w.pawns[1]!,{x:camp.anchor.x+2,z:camp.anchor.z+3});
  const a:WildAnimal={id:w.nextId++,species:'hare',sex:'female',ageTicks:adultAgeTicks('hare'),
    x:p.x+1,z:p.z+1,food:.2,rest:.8,state:'idle',path:[],nextDecision:w.tick};
  w.wildlife={profile:'temperate-hares-v1',rng:811,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  fixtureBuilding(w,'wall',p.x+1,p.z);
  if(pacifist) {
    p.background={childhood:'quiet-child',adulthood:'medic'};
    p.age={biologicalTicks:30*60*TICKS_PER_DAY,chronologicalTicks:30*60*TICKS_PER_DAY};
  }else addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');
  assert.equal(applyCommand(w,{type:'draft',pawnIds:w.pawns.map(actor=>actor.id),enabled:true}).ok,true);
  assert.equal(startAnimalManhunter(w,a),true);a.manhunter!.targetId=p.id;
  assert.deepEqual(validateWorld(w),[]);
  return {w,p,a};
}

/** Independent pilot oracle. Never used to make the product proof green. */
function explicitPilotProof() {
  const {w,p,a}=pilotCamp();const before=serializeWorld(w);
  const decisions=productPilot(w);
  assert.equal(serializeWorld(w),before,'player decision is read only');
  const melee=decisions.find(d=>d.command.type==='melee'&&d.command.targetId===a.id);
  assert.ok(melee,'an explicit admissible contact order is proposed');
  assert.equal(applyCommand(w,melee.command).ok,true);
  assert.equal(p.melee?.order?.targetId,a.id);assert.equal(p.melee?.order?.auto,undefined);
  assert.deepEqual(validateWorld(w),[]);
  const pacifist=pilotCamp(true),peaceBefore=serializeWorld(pacifist.w);
  assert.ok(violentWorkRefusal(pacifist.p));
  const refusal=applyCommand(pacifist.w,{type:'melee',pawnIds:[pacifist.p.id],targetId:pacifist.a.id});
  assert.equal(refusal.ok,false);assert.equal(serializeWorld(pacifist.w),peaceBefore);
  const flee=productPilot(pacifist.w);
  assert.equal(flee.some(d=>d.command.type==='melee'||d.command.type==='shoot'),false);
  const move=flee.find(d=>d.command.type==='draft-move'&&d.command.pawnIds.includes(pacifist.p.id));
  assert.ok(move,'pacifist has a physical refuge order rather than an illegal attack');
  assert.equal(applyCommand(pacifist.w,move.command).ok,true);
  assert.deepEqual(validateWorld(pacifist.w),[]);
}

test('campaign defence: real diagonal melee with one free flank, safe continuation and remote LOS guards',productContactProof);
test('campaign pilot: contact animal order is physical; pacifist attack refused and refuge move accepted',explicitPilotProof);
