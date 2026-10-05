import {expect,test,vi} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {urgentTreatment,treatmentTarget} from '../src/sim/care-rules.ts';
import * as orders from '../src/sim/player-orders.ts';
import {careCamp} from './scenarios/care.ts';
import {rescueCamp} from './scenarios/rescue.ts';
import {controlledInjury} from './scenarios/health.ts';
import {equipmentCamp} from './scenarios/equipment.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {survivorPlan} from './scenarios/survivor-player.ts';
import {crashlandedProfile} from '../src/sim/game-profile.ts';
import {enableCassandraRaids} from '../src/sim/cassandra-raids.ts';
import {adoptFluIncidents} from '../src/sim/flu-incidents.ts';
import {createRaidGroup} from '../src/sim/raid-spawn.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {damageUnarmoredPawnWithBullet} from '../src/sim/bullet-damage.ts';
import {medicalBleed,medicalPain} from '../src/sim/injury-state.ts';
import {pawnBody} from '../src/sim/health-rules.ts';
import {selfAllowedFood,selfFoodAccessible} from '../src/sim/prison-food.ts';
import {energyDecisionDue,energyDecisions,energyRecoveryDecisions,energyRetreatNeeded,type EnergyPlayerState} from './scenarios/energy-player.ts';
import type {Command,World} from '../src/sim/types.ts';

const notebook=(w:World):EnergyPlayerState=>({startTick:w.tick,origin:{x:5,z:5},stage:'construct',stageTick:w.tick,
  initialSteel:0,initialComponents:0,milestones:{},nightDrainTicks:0,previousBattery:0,electricMeals:0});
const valid=(w:World)=>expect(validateWorld(w),JSON.stringify({tick:w.tick,errors:validateWorld(w)})).toEqual([]);
const apply=(w:World,command:Command)=>{expect(applyCommand(w,command),JSON.stringify(command)).toMatchObject({ok:true});valid(w);};
const medicine=(w:World)=>w.piles.reduce((n,p)=>n+(p.item==='herbal-medicine'?p.quantity:0),0);

/** Existing clinical fixture: the patient reaches the real bed through the
 * ordinary giver while Doctor is disabled. The urgent wound is a new physical
 * incident; no lying posture, healing result or dose consumption is injected. */
function urgentPatientCamp() {
  const w=careCamp(),doctor=w.pawns[0]!,patient=w.pawns[1]!;
  apply(w,{type:'priority',pawnId:doctor.id,work:'doctor',value:0});
  for(let n=0;n<300&&patient.need?.phase!=='sleep';n++){stepWorld(w);valid(w);}
  expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:w.structures[0]!.id});
  controlledInjury(w,patient,'neck',6000,'cut');
  doctor.hunger=25;doctor.rest=80;
  addMaterial(w,'medicine',1,{type:'ground',x:doctor.x+1,z:doctor.z},'herbal-medicine');refreshStock(w);
  // The clinical fixture deliberately preserves historical dry care. Admit
  // the actual herbal dose through the player's policy before requesting it.
  apply(w,{type:'medical-care',pawnId:patient.id,care:'herbal'});
  apply(w,{type:'priority',pawnId:doctor.id,work:'doctor',value:1});
  expect(urgentTreatment(patient)).toBe(true);valid(w);
  return {w,doctor,patient};
}

test('Énergie libère la mobilisation au contrôle suivant et le secours porte la vraie personne jusqu’au lit',()=>{
  const w=rescueCamp(),doctor=w.pawns[0]!,patient=w.pawns[1]!,s=notebook(w);
  controlledInjury(w,patient,'neck',6000,'cut');doctor.hunger=25;
  apply(w,{type:'draft',pawnIds:[doctor.id],enabled:true});
  stepWorld(w);valid(w);const endedAt=w.tick;
  while(!energyDecisionDue(w)){expect(doctor.draft).toBeDefined();stepWorld(w);valid(w);}
  expect(w.tick-endedAt).toBeLessThan(20);expect(w.tick%250).not.toBe(0);
  const before=serializeWorld(w),decisions=energyDecisions(w,s);
  expect(serializeWorld(w)).toBe(before);expect(decisions).toHaveLength(1);
  expect(decisions[0]!.command).toEqual({type:'draft',pawnIds:[doctor.id],enabled:false});
  apply(w,decisions[0]!.command);expect(doctor.draft).toBeUndefined();
  // A command is now confirmed. The next recovery observation may admit its
  // actual service; it does not project a hypothetical undrafted World.
  const rescue=energyRecoveryDecisions(w);
  expect(rescue).toHaveLength(1);expect(rescue![0]!.command.type).toBe('order-rescue');
  apply(w,rescue![0]!.command);
  const originalId=patient.id,bed=w.structures[0]!;let carried=false;
  for(let n=0;n<400&&patient.need?.phase!=='sleep';n++){
    if(energyDecisionDue(w))expect(energyDecisions(w,s)).toEqual([]);
    stepWorld(w);valid(w);
    if(doctor.rescue?.phase==='carry'){
      carried=true;expect(patient.x).toBe(doctor.x);expect(patient.z).toBe(doctor.z);
      expect(patient.need).toBeNull();
    }
  }
  expect(carried).toBe(true);expect(patient.id).toBe(originalId);expect(w.pawns.filter(p=>p.id===originalId)).toHaveLength(1);
  expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:bed.id});
  expect({x:patient.x,z:patient.z}).toEqual({x:bed.x,z:bed.z});expect(doctor.rescue).toBeUndefined();
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,8);stepWorld(copy,8);
  expect(serializeWorld(copy)).toBe(serializeWorld(w));valid(w);
});

test('Énergie admet le médecin sous faim30, réserve la continuation engagée et consomme la vraie dose une seule fois',()=>{
  const {w,doctor,patient}=urgentPatientCamp(),s=notebook(w);
  expect(doctor.hunger).toBeLessThan(30);
  expect(orders.queryOrderOptions(w,doctor.id,patient).some(o=>o.enabled&&o.tendPatientId===patient.id)).toBe(true);
  const before=serializeWorld(w),decisions=energyDecisions(w,s);
  expect(serializeWorld(w)).toBe(before);expect(decisions).toHaveLength(1);
  expect(decisions[0]!.command).toEqual({type:'order-tend',pawnId:doctor.id,patientId:patient.id,queue:false});
  apply(w,decisions[0]!.command);expect(doctor.tend).toBeDefined();
  const initialMedicine=medicine(w),copy=deserializeWorld(serializeWorld(w)),query=vi.spyOn(orders,'queryOrderOptions');
  let pulses=0,progressed=false,pickedUp=false;
  try {
    for(let n=0;n<300&&doctor.tend;n++){
      if(energyDecisionDue(w)){
        const confirmed=serializeWorld(w);expect(energyDecisions(w,s)).toEqual([]);
        expect(serializeWorld(w)).toBe(confirmed);pulses++;
      }
      stepWorld(w);stepWorld(copy);valid(w);
      expect(serializeWorld(copy)).toBe(serializeWorld(w));
      progressed ||= (doctor.tend?.progress??0)>0;
      const carried=doctor.tend?.medicine?.carryPileId;
      if(carried!==null&&carried!==undefined){pickedUp=true;expect(w.piles.find(p=>p.id===carried)).toMatchObject({item:'herbal-medicine',quantity:1,owner:{type:'pawn',pawnId:doctor.id}});}
    }
    expect(query).not.toHaveBeenCalled();
  } finally {query.mockRestore();}
  expect(pulses).toBeGreaterThan(0);expect(progressed).toBe(true);expect(pickedUp).toBe(true);
  expect(doctor.tend).toBeUndefined();expect(treatmentTarget(patient)).toBeUndefined();
  expect(patient.health!.injuries.every(i=>i.tended!==undefined)).toBe(true);
  expect(doctor.skills.medicine.xp).toBeGreaterThan(0);expect(medicine(w)).toBe(initialMedicine-1);
  expect(patient.state).not.toBe('dead');expect(doctor.hunger).toBeGreaterThan(0);
  expect(energyRecoveryDecisions(w)).toBeUndefined();
  // Healing alone does not reserve the fast decision cadence or freeze the
  // construction branch: assisted feeding is only urgent at its real threshold.
  while(w.tick%250===0||w.tick%20===0){stepWorld(w);valid(w);}
  expect(energyDecisionDue(w)).toBe(false);
});

test('Énergie attend un refus clinique réel sans forcer un ordre, une priorité ou une consommation',()=>{
  const {w,doctor,patient}=urgentPatientCamp();
  apply(w,{type:'priority',pawnId:doctor.id,work:'doctor',value:0});
  expect(orders.queryOrderOptions(w,doctor.id,patient).some(o=>o.enabled&&o.tendPatientId===patient.id)).toBe(false);
  const before=serializeWorld(w),quantity=medicine(w),rng=w.rng,nextId=w.nextId;
  expect(energyRecoveryDecisions(w)).toEqual([]);
  expect(serializeWorld(w)).toBe(before);expect(medicine(w)).toBe(quantity);
  expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(doctor.tend).toBeUndefined();
  // Changing the actual policy admits the service at the same real bed. The
  // pilot never manufactures a permissive projected actor to bypass the guard.
  apply(w,{type:'priority',pawnId:doctor.id,work:'doctor',value:1});
  const allowed=energyRecoveryDecisions(w);expect(allowed).toHaveLength(1);
  apply(w,allowed![0]!.command);expect(doctor.tend?.patientId).toBe(patient.id);
  expect(medicine(w)).toBe(quantity);expect(patient.health!.injuries.every(i=>i.tended===undefined)).toBe(true);
});

/** Prepared geometry/equipment only. The actual raid producer owns the enemy
 * and its equipment namespace; there is no injury, projectile or outcome here.
 * The legacy crashlanded revision is explicit, as in campaign-defense.test.ts. */
function energyRaidCamp(armedEnemy=false,cornerEntry=false,illDefender=false) {
  const w=equipmentCamp(3),[ada,noe,mina]=w.pawns;
  w.resources=[];w.jobs=[];w.structures=[];w.piles=[];
  // Authored exposure branch starts at seed42 before any tick or contact:
  // its first risk roll is below Adventure's .75. No post-ingestion remapping
  // or population-frequency claim; every existing combat case keeps81733.
  w.rng=illDefender?42:81733;
  w.scenario={id:'crashlanded',revision:1,landing:{x:16,z:16}};
  w.gameProfile=crashlandedProfile();enableCassandraRaids(w);adoptFluIncidents(w);
  fixtureBuilding(w,'bed',cornerEntry?28:8,cornerEntry?5:6,2);const camp=survivorPlan(w,true);
  for(let dz=0;dz<5;dz++)for(let dx=0;dx<5;dx++)if(!dx||!dz||dx===4||dz===4){
    // The corner border door admits the authored raid, but its two cardinal
    // neighbours are walls. A second real bottom door connects the interior
    // to the ordinary outside component when that border endpoint clears.
    const door=dz===4&&(dx===2||cornerEntry&&dx===4),building=fixtureBuilding(w,door?'door':'wall',camp.anchor.x+dx,camp.anchor.z+dz);
    if(door)Object.assign(building,{material:'wood',door:newDoorState(w.tick)});
  }
  Object.assign(ada!,{name:'Ada',x:4,z:10});Object.assign(noe!,{name:'Noé',x:cornerEntry?25:14,z:cornerEntry?7:10});
  Object.assign(mina!,{name:'Mina',x:camp.anchor.x+2,z:camp.anchor.z+3});
  for(const p of [ada!,noe!])addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');
  if(illDefender){
    // Announced contaminated food is the only prepared exposure. The real
    // need/ingestion pipeline consumes it and creates the clinical condition
    // before the actual raid/person/combat order is produced. The prepared
    // profile/calendars and their real difficulty factor remain unchanged.
    noe!.hunger=25;
    addMaterial(w,'food',1,{type:'ground',x:noe!.x,z:noe!.z},'simple-meal');
    const food=w.piles.find(p=>p.item==='simple-meal')!;
    food.foodPoison={fraction:1,cause:'filthy-kitchen'};refreshStock(w);valid(w);
    const exposure=()=>JSON.stringify({tick:w.tick,rng:w.rng,hunger:noe!.hunger,state:noe!.state,need:noe!.need,
      orders:noe!.orders,allowed:selfAllowedFood(w,noe!),food:w.piles.find(p=>p.id===food.id)??null});
    expect(selfAllowedFood(w,noe!).includes('simple-meal'),exposure()).toBe(true);
    expect(selfFoodAccessible(w,noe!,food),exposure()).toBe(true);expect(noe!.orders.active,exposure()).toBeNull();
    // Observe the completed meal instead of blindly waiting for disease: a
    // refused source, uncompleted ingestion and a genuine missed risk differ.
    for(let n=0;n<100&&w.piles.some(p=>p.id===food.id);n++){stepWorld(w);valid(w);}
    expect(w.piles.some(p=>p.id===food.id),exposure()).toBe(false);
    expect(noe!.health?.foodPoisoning,exposure()).toBeDefined();
    expect(noe!.health!.injuries).toEqual([]);expect(noe!.hunger).toBeGreaterThan(25);
    stepWorld(w);valid(w);
  }
  apply(w,{type:'draft',pawnIds:[ada!.id,noe!.id,mina!.id],enabled:true});
  apply(w,{type:'fire-at-will',pawnIds:[ada!.id,noe!.id,mina!.id],enabled:false});
  const raid=createRaidGroup(w,{count:1,sites:[{x:w.width-1,z:cornerEntry?camp.anchor.z+4:0}],random:{rng:w.raids!.rng}});
  expect(raid).not.toBeNull();const enemy=w.pawns.find(p=>p.id===raid!.members[0])!;
  if(armedEnemy)addMaterial(w,'weapon',1,{type:'equipment',pawnId:enemy.id},'revolver');refreshStock(w);
  const s={...notebook(w),origin:{x:18,z:18}};valid(w);
  return {w,ada:ada!,noe:noe!,mina:mina!,enemy,camp,s};
}
function moveFor(w:World,s:EnergyPlayerState,id:number) {
  for(const {command} of energyDecisions(w,s))if(command.type==='draft-move'&&command.pawnIds.includes(id))return command;
}
const interior=(cell:{x:number;z:number},anchor:{x:number;z:number})=>cell.x>anchor.x&&cell.x<anchor.x+4&&cell.z>anchor.z&&cell.z<anchor.z+4;

test('Énergie abrite le défenseur réellement intoxiqué avant le raid sans attendre une première blessure',()=>{
  const {w,ada,noe,camp,s}=energyRaidCamp(false,false,true);
  expect(noe.health!.foodPoisoning!.bornAt).toBeLessThan(w.raids!.active!.startedAt);
  expect(noe.health!.injuries).toEqual([]);expect(noe.health!.bloodLoss).toBe(0);
  expect(medicalBleed(noe.health!)).toBe(0);expect(medicalPain(noe.health!)).toBeCloseTo(.2);
  expect(pawnBody(noe).capacities.consciousness).toBeLessThan(.75);
  expect(noe.state).not.toBe('downed');expect(energyRetreatNeeded(noe)).toBe(true);
  expect(energyRetreatNeeded(ada)).toBe(false);
  const before=serializeWorld(w),rng=w.rng,nextId=w.nextId,retreat=moveFor(w,s,noe.id);
  expect(serializeWorld(w)).toBe(before);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
  expect(retreat).toBeDefined();expect(interior(retreat!.target,camp.anchor)).toBe(true);
  expect(moveFor(w,s,ada.id)?.target).toEqual(camp.pin);
  apply(w,retreat!);expect(noe.draft!.target).toEqual(retreat!.target);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,4);stepWorld(copy,4);
  valid(w);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  expect(noe.health!.injuries).toEqual([]);expect(noe.state).not.toBe('downed');
});

test('Énergie replie Noé encore mobile après un impact du moteur, conserve un défenseur sain et atteint le vrai abri sans relancer son arête',()=>{
  const {w,ada,noe,enemy,camp,s}=energyRaidCamp(true);
  expect(noe.health?.injuries??[]).toEqual([]);
  // The raid driver must acquire its actual target and establish the firing
  // post before starting a shot. No tactical mandate, aim or impact is injected.
  expect(enemy.shooting).toBeUndefined();expect(enemy.tactics).toBeUndefined();valid(w);
  let emitted=false,impacted=false;
  for(let n=0;n<80&&!energyRetreatNeeded(noe);n++){
    stepWorld(w);valid(w);
    emitted ||= (w.projectiles??[]).some(p=>p.flight.launcherKey===`pawn:${enemy.id}`);
    impacted ||= (w.projectiles??[]).some(p=>p.arrival?.targetKey===`pawn:${noe.id}`&&p.arrival.effect==='pawn');
    expect(w.pawns.filter(p=>p===ada||p===noe).every(p=>p.state!=='dead'&&p.state!=='downed')).toBe(true);
  }
  expect(emitted).toBe(true);expect(impacted).toBe(true);
  expect(noe.health!.injuries.some(i=>i.kind==='gunshot')).toBe(true);
  expect(energyRetreatNeeded(noe)).toBe(true);expect(energyRetreatNeeded(ada)).toBe(false);
  const injuredAt=w.tick;
  while(!energyDecisionDue(w)){
    stepWorld(w);valid(w);
    expect(noe.state).not.toBe('downed');expect(noe.state).not.toBe('dead');
  }
  expect(w.tick-injuredAt).toBeLessThan(20);
  const before=serializeWorld(w),rng=w.rng,nextId=w.nextId,retreat=moveFor(w,s,noe.id),defence=moveFor(w,s,ada.id);
  expect(serializeWorld(w)).toBe(before);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
  expect(retreat).toBeDefined();expect(interior(retreat!.target,camp.anchor)).toBe(true);
  expect(retreat!.target).not.toEqual(camp.pin);expect(defence?.target).toEqual(camp.pin);
  expect(energyRecoveryDecisions(w)).toBeUndefined(); // Doctors still wait for the real end of the raid.
  apply(w,retreat!);expect(noe.draft!.target).toEqual(retreat!.target);
  const copy=deserializeWorld(serializeWorld(w));let travelled=false;
  for(let n=0;n<100&&(noe.x!==retreat!.target.x||noe.z!==retreat!.target.z||(noe.motion?.end??0)>w.tick);n++){
    const confirmed=serializeWorld(w),motion=noe.motion,lastActiveTick=noe.draft!.lastActiveTick;
    expect(moveFor(w,s,noe.id)).toBeUndefined();expect(serializeWorld(w)).toBe(confirmed);
    expect(noe.motion).toBe(motion);expect(noe.draft!.lastActiveTick).toBe(lastActiveTick);
    stepWorld(w);stepWorld(copy);valid(w);expect(serializeWorld(copy)).toBe(serializeWorld(w));
    travelled ||= !!noe.motion;
    expect(noe.state).not.toBe('downed');expect(noe.state).not.toBe('dead');
  }
  expect(travelled).toBe(true);expect({x:noe.x,z:noe.z}).toEqual(retreat!.target);
  expect(w.pawns.find(p=>p.id===noe.id)).toBe(noe);
  expect((noe.motion?.end??0)<=w.tick).toBe(true);expect(noe.draft).toBeDefined();
  expect(w.raids!.active).toBeDefined();expect(noe.tend).toBeUndefined();
});

test('Énergie ne replie pas une petite plaie mais interrompt un vrai tir blessé sans effacer sa récupération ou son projectile',()=>{
  const {w,noe,enemy,camp,s}=energyRaidCamp();
  damageUnarmoredPawnWithBullet(w,noe,{damage:1,part:'left-little-toe'});valid(w);
  expect(medicalBleed(noe.health!)).toBeCloseTo(.06);expect(medicalPain(noe.health!)).toBeLessThan(.25);
  expect(energyRetreatNeeded(noe)).toBe(false);expect(moveFor(w,s,noe.id)?.target).toEqual(camp.pin);
  apply(w,{type:'shoot',pawnIds:[noe.id],targetId:enemy.id});stepWorld(w,2);valid(w);
  expect(noe.shooting!.stance!.phase).toBe('cooldown');
  const recovery=structuredClone(noe.shooting!.stance),bullet=w.projectiles!.find(p=>p.flight.launcherKey===`pawn:${noe.id}`)!.id;
  // Localized damage through the real transaction/clinical clock, not a raw
  // health object. This second case isolates the pending recovery boundary.
  damageUnarmoredPawnWithBullet(w,noe,{damage:11.6,part:'left-leg'});valid(w);
  expect(noe.state).not.toBe('downed');expect(energyRetreatNeeded(noe)).toBe(true);
  const retreat=moveFor(w,s,noe.id)!;expect(interior(retreat.target,camp.anchor)).toBe(true);apply(w,retreat);
  expect(noe.shooting!.order).toBeNull();expect(noe.shooting!.stance).toEqual(recovery);
  expect(w.projectiles!.some(p=>p.id===bullet)).toBe(true);
  const copy=deserializeWorld(serializeWorld(w));
  while(w.tick*10<recovery!.endsAtCore){
    const confirmed=serializeWorld(w);expect(moveFor(w,s,noe.id)).toBeUndefined();expect(serializeWorld(w)).toBe(confirmed);
    expect(noe.shooting!.stance!.endsAtCore).toBe(recovery!.endsAtCore);
    stepWorld(w);stepWorld(copy);valid(w);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  }
  expect(noe.shooting).toBeUndefined();expect(noe.draft!.target).toEqual(retreat.target);
  expect(noe.state).not.toBe('downed');
});

test('Énergie ne transforme ni une pièce percée ni un abri d’un autre composant en destination de repli admissible',()=>{
  for(const obstruction of ['breach','disconnected'] as const){
    const {w,noe,camp,s}=energyRaidCamp();
    damageUnarmoredPawnWithBullet(w,noe,{damage:11.6,part:'left-leg'});
    if(obstruction==='breach')w.structures=w.structures.filter(q=>!(q.kind==='wall'&&q.x===camp.anchor.x+4&&q.z===camp.anchor.z+2));
    else for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(dx||dz)w.tiles[(noe.z+dz)*w.width+noe.x+dx]={terrain:'rock'};
    valid(w);const before=serializeWorld(w);
    expect(energyRetreatNeeded(noe)).toBe(true);expect(moveFor(w,s,noe.id),obstruction).toBeUndefined();
    expect(serializeWorld(w)).toBe(before);expect(noe.draft!.target).toBeNull();expect(noe.state).not.toBe('downed');
  }
});

test('Énergie refuse la porte et son ancien endpoint puis conserve le trajet admis quand le premier abri redevient libre',()=>{
  // The authored room reaches the map border. createRaidGroup admits its real
  // raider at that border door; no actor is teleported after admission and no
  // segment, tactical mandate, wound or outcome is injected into the raider.
  const {w,noe,enemy,camp,s}=energyRaidCamp(false,true),door={x:camp.anchor.x+4,z:camp.anchor.z+4};
  for(let dz=0;dz<5;dz++)for(let dx=0;dx<5;dx++)if(!dx||!dz||dx===4||dz===4){
    const passage=dx===4&&dz===2,building=fixtureBuilding(w,passage?'door':'wall',s.origin.x+dx,s.origin.z+dz);
    if(passage)Object.assign(building,{material:'wood',door:newDoorState(w.tick)});
  }
  damageUnarmoredPawnWithBullet(w,noe,{damage:11.6,part:'left-leg'});valid(w);
  expect({x:enemy.x,z:enemy.z}).toEqual(door);expect(energyRetreatNeeded(noe)).toBe(true);
  let before=serializeWorld(w),retreat=moveFor(w,s,noe.id);
  expect(serializeWorld(w)).toBe(before);expect(retreat).toBeDefined();expect(interior(retreat!.target,s.origin)).toBe(true);
  // The actual raid driver leaves the border door along a physical edge. Its
  // destination is already outside, but its old endpoint still owns the door.
  stepWorld(w);valid(w);const edge=enemy.motion!;
  expect(edge.from).toEqual(door);expect(edge.end).toBeGreaterThan(w.tick);
  expect(enemy.x<camp.anchor.x||enemy.x>camp.anchor.x+4||enemy.z<camp.anchor.z||enemy.z>camp.anchor.z+4).toBe(true);
  before=serializeWorld(w);retreat=moveFor(w,s,noe.id);
  expect(serializeWorld(w)).toBe(before);expect(retreat).toBeDefined();expect(interior(retreat!.target,s.origin)).toBe(true);
  apply(w,retreat!);expect(enemy.motion).toBe(edge);expect(noe.draft!.target).toEqual(retreat!.target);
  const copy=deserializeWorld(serializeWorld(w));let heldTicks=0;
  for(let n=0;n<20&&w.tick<edge.end;n++){
    before=serializeWorld(w);const motion=noe.motion,lastActiveTick=noe.draft!.lastActiveTick;
    expect(moveFor(w,s,noe.id)).toBeUndefined();expect(serializeWorld(w)).toBe(before);
    expect(noe.motion).toBe(motion);expect(noe.draft!.lastActiveTick).toBe(lastActiveTick);
    stepWorld(w);stepWorld(copy);valid(w);expect(serializeWorld(copy)).toBe(serializeWorld(w));heldTicks++;
    expect(noe.state).not.toBe('downed');expect(noe.state).not.toBe('dead');
  }
  expect(heldTicks).toBeGreaterThan(0);expect(w.tick).toBeGreaterThanOrEqual(edge.end);
  expect(interior(noe,s.origin)).toBe(false);expect(noe.draft!.target).toEqual(retreat!.target);
  // The same physical first room is admissible again after the raider's old
  // endpoint has cleared. A real stop on a separate fork removes only that
  // accepted retreat; the pilot then proposes and admits the first refuge.
  const stopped=deserializeWorld(serializeWorld(w));
  apply(stopped,{type:'draft-stop',pawnIds:[noe.id]});
  const firstAgain=moveFor(stopped,s,noe.id);
  const reopened=JSON.stringify({tick:w.tick,camp:camp.anchor,firstAgain,
    enemy:{x:enemy.x,z:enemy.z,state:enemy.state,motion:enemy.motion},
    actor:{x:noe.x,z:noe.z,draft:noe.draft,motion:noe.motion},
    doors:w.structures.filter(p=>p.kind==='door').map(p=>({x:p.x,z:p.z,door:p.door}))});
  expect(firstAgain,reopened).toBeDefined();expect(interior(firstAgain!.target,camp.anchor),reopened).toBe(true);
  apply(stopped,firstAgain!);expect(stopped.pawns.find(p=>p.id===noe.id)!.draft!.target).toEqual(firstAgain!.target);
  // Retain the actual accepted destination globally, even though the primary
  // room is earlier in the room list. Preview cannot renew its edge/path or
  // recovery. Both unchanged live branches advance only through stepWorld.
  let travelling=false;
  for(let n=0;n<6;n++){
    before=serializeWorld(w);
    const motion=noe.motion,path=noe.path,lastActiveTick=noe.draft!.lastActiveTick,
      shotRecovery=noe.shooting?.stance,strikeRecovery=noe.melee?.strike;
    expect(moveFor(w,s,noe.id)).toBeUndefined();expect(serializeWorld(w)).toBe(before);
    expect(noe.motion).toBe(motion);expect(noe.path).toBe(path);expect(noe.draft!.lastActiveTick).toBe(lastActiveTick);
    expect(noe.shooting?.stance).toBe(shotRecovery);expect(noe.melee?.strike).toBe(strikeRecovery);
    expect(noe.draft!.target).toEqual(retreat!.target);
    travelling ||= !!noe.motion&&noe.motion.end>w.tick;
    stepWorld(w);stepWorld(copy);valid(w);expect(serializeWorld(copy)).toBe(serializeWorld(w));
    expect(noe.state).not.toBe('downed');expect(noe.state).not.toBe('dead');
  }
  expect(travelling).toBe(true);expect(noe.draft!.target).toEqual(retreat!.target);
});
