import {legacyPlanet} from './helpers/legacy-fixture-guards.ts';
import {expect,test} from 'vitest';
import {readColonistAvailability,isLocallyControllableColonist,type ColonistAvailability} from '../src/ui/colonist-availability';
import {draftablePawns} from '../src/ui/drafting-controls';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {createScenarioWorld} from '../src/sim/new-game';
import {createStartingCandidateRoster,startingPartyFromRoster} from '../src/sim/starting-candidates';
import {generateStartingWorld,resolveStartingSite,startingSiteChoices} from '../src/sim/starting-world';
import {addMaterial} from '../src/sim/materials';
import {tryGroupDeparture} from '../src/sim/group-driver';
import {createMedicalRecord,addResolvedInjury,medicalStatus} from '../src/sim/injury-state';
import {reconcilePawnHealth} from '../src/sim/health';
import {BLOOD_UNIT} from '../src/sim/injury-rules';
import {createPrisonerState} from '../src/sim/prisoner-state';
import {enableVisitors} from '../src/sim/visitors';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotValidationContext} from '../src/bridge/snapshots';
import {createOwnedValidationGeometry} from '../src/sim/owned-validation-geometry';
import {PowerParentValidationCache} from '../src/sim/power-parent-validation';
import {medicalCamp,controlledInjury} from './scenarios/health';
import {commercialCamp} from './helpers/commercial-v193';
import type {Pawn,World} from '../src/sim/types';

// The one-adoption query context used by the closed MAIN consumer. Public
// mutable Worlds retain the RAW decoder; neither test grants them authority.
class AvailabilityQueryDecoder extends SnapshotDecoder {
  protected override createValidationContext(next:World):SnapshotValidationContext {
    const geometry=createOwnedValidationGeometry(next);
    return {powerParents:new PowerParentValidationCache(),geometry,resourceFacts:geometry.resourceFacts};
  }
}

function unavailable(w:World):Extract<ColonistAvailability,{kind:'unavailable'}>{
  const result=readColonistAvailability(w);expect(result.kind).toBe('unavailable');
  if(result.kind!=='unavailable')throw Error('Expected unavailable projection');return result;
}
function checkpoint(w:World):World {
  expect(validateWorld(w)).toEqual([]);
  const before=serializeWorld(w),projection=readColonistAvailability(w),resumed=deserializeWorld(before);
  expect(serializeWorld(w)).toBe(before);expect(resumed).toEqual(w);expect(readColonistAvailability(resumed)).toEqual(projection);
  const adopted=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
  expect(adopted.status,adopted.status==='resync'?adopted.reason:adopted.status).toBe('applied');if(adopted.status==='applied')expect(readColonistAvailability(adopted.world)).toEqual(projection);
  return resumed;
}
function until(w:World,ready:()=>boolean,limit=1200):void {
  for(let n=0;n<limit&&!ready();n++)stepWorld(w);
  expect(ready()).toBe(true);
}
const identity=(p:Pawn)=>({id:p.id,name:p.name});
function disableLocals(w:World):void {
  for(const p of w.pawns){controlledInjury(w,p,'left-leg',30000,'crush');controlledInjury(w,p,'right-leg',30000,'crush');}
  expect(w.pawns.every(p=>p.state==='downed')).toBe(true);
}

test('sleeping, cooking, ordinary work and pacifism retain local UI control and selection order',()=>{
  const w=medicalCamp(4,16),[sleeper,cook,worker,pacifist]=w.pawns;
  sleeper!.state='sleeping';cook!.state='working';worker!.state='moving';
  pacifist!.background={childhood:'quiet-child',adulthood:'medic'};
  // Availability is not idleness, skill coverage or a violent-order promise.
  for(const p of w.pawns)for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  const selection=w.pawns.slice().reverse();expect(draftablePawns(selection)).toEqual(selection);
  expect(readColonistAvailability(w)).toEqual({kind:'available',pawnIds:w.pawns.map(p=>p.id).sort((a,b)=>a-b)});
});

test('clinical death excludes a stale living state; legacy death does not acquire a timestamp',()=>{
  const w=medicalCamp(2,16),[clinical,legacy]=w.pawns;
  clinical!.health=createMedicalRecord(w.tick);clinical!.health.death={tick:w.tick,cause:'blood-loss'};
  legacy!.state='dead';delete legacy!.health;
  expect(isLocallyControllableColonist(clinical!)).toBe(false);expect(draftablePawns(w.pawns)).toEqual([]);
  expect(unavailable(w).deaths).toEqual([
    {...identity(clinical!),owner:'map',deathAt:w.tick},{...identity(legacy!),owner:'map'},
  ]);
});

test('local detention, downing and crisis causes accumulate without turning a living person into a death',()=>{
  const w=medicalCamp(3,16),[detained,patient,crisis]=w.pawns;
  detained!.prisoner=createPrisonerState(w,detained!);detained!.state='downed';
  patient!.state='downed';
  crisis!.mental={below:[0,0,0],cooldown:0,catharsis:[],crisis:{kind:'sad-wander',age:0,target:null,waitUntil:w.tick}};
  expect(unavailable(w)).toEqual({kind:'unavailable',local:[
    {...identity(detained!),causes:['detained','downed']},{...identity(patient!),causes:['downed']},
    {...identity(crisis!),causes:['mental-crisis']},
  ],away:[],deaths:[]});
});

test('foreign patients and a map containing only foreign people are not active colonists',()=>{
  const w=medicalCamp(2,16);for(const p of w.pawns){p.faction='outlanders';p.prisoner=createPrisonerState(w,p);}
  expect(unavailable(w)).toEqual({kind:'unavailable',local:[],away:[],deaths:[]});
  const p=w.pawns[0]!;delete p.faction;expect(isLocallyControllableColonist(p)).toBe(false);
  expect(unavailable(w).local).toEqual([{...identity(p),causes:['detained']}]);
  delete p.prisoner;expect(readColonistAvailability(w)).toEqual({kind:'available',pawnIds:[p.id]});
});

test('an available team never traverses other owners and absence never reads possessions',()=>{
  const available=medicalCamp(1,16);
  Object.defineProperty(available,'scout',{get(){throw Error('Unexpected away scan');}});
  expect(readColonistAvailability(available)).toEqual({kind:'available',pawnIds:[available.pawns[0]!.id]});
  const empty=medicalCamp(0,16);
  for(const field of ['piles','packed'])Object.defineProperty(empty,field,{get(){throw Error('Unexpected Thing scan');}});
  expect(unavailable(empty)).toEqual({kind:'unavailable',local:[],away:[],deaths:[]});
});

test('archived full Pawns and identity-only departures never acquire an active affiliation or death',()=>{
  const w=medicalCamp(2,16),[visitor,pod]=w.pawns;w.pawns=[];
  // Even full frozen records are not a future return promise. Identity-only
  // archive shapes are irrelevant to this original-Pawn projection.
  visitor!.faction='outlanders';pod!.faction='outlanders';
  enableVisitors(w);w.visitors!.departed=[{group:1,pawn:visitor!,tick:w.tick,items:[]}];
  w.podRescues={profile:'civilian-pod-rescue-v1',serial:1,incidents:[],departed:[{incidentId:1,pawn:pod!,tick:w.tick,items:[]}]};
  w.raids={profile:'camp-raids-v1',rng:1,nextCheck:null,serial:1,completed:1,
    departed:[{group:1,pawnId:w.nextId++,name:'Archive sans affiliation',cell:{x:0,z:0},tick:w.tick,items:[]}]};
  Object.defineProperty(w.visitors!.departed[0]!,'items',{get(){throw Error('Unexpected archived possession scan');}});
  expect(unavailable(w)).toEqual({kind:'unavailable',local:[],away:[],deaths:[]});
  // A missing legacy faction must not reactivate a frozen archive through
  // affiliation's historical colony default.
  delete visitor!.faction;delete pod!.faction;
  expect(unavailable(w)).toEqual({kind:'unavailable',local:[],away:[],deaths:[]});
});

test.each(['scout-away','commercial-away'] as const)('a confirmed clinical death in a full %s record is never advertised as a living return',owner=>{
  const w=medicalCamp(1,16),p=w.pawns[0]!;w.pawns=[];
  p.health=createMedicalRecord(w.tick);p.health.bloodLoss=BLOOD_UNIT;p.health.death={tick:w.tick,cause:'blood-loss'};p.state='dead';
  if(owner==='scout-away')w.scout={phase:'awaiting-entry',pawn:p,items:[],foodPileId:w.nextId++,quantity:2,
    startedAt:w.tick,departedAt:w.tick,returnAt:w.tick+1500,consumed:0,entry:{x:0,z:3}};
  else w.commercialTrip={phase:'outbound',pawn:p,items:[],foodPileId:w.nextId++,foodQuantity:2,silverQuantity:0,
    startedAt:w.tick,departedAt:w.tick,arrivesAt:w.tick+750,consumed:0,silverPaid:0,bought:{medicine:0,component:0},entry:{x:0,z:3}};
  const before=JSON.stringify(w);
  expect(unavailable(w)).toEqual({kind:'unavailable',local:[],away:[],deaths:[{...identity(p),owner,deathAt:w.tick}]});
  expect(JSON.stringify(w)).toBe(before);
});

test('prepared capsules are arriving through actual impact/opening and preserve identities across adoption',()=>{
  const choice={version:1 as const,seed:333,tile:startingSiteChoices(generateStartingWorld(333))[0]!},site=resolveStartingSite(choice);
  const team=startingPartyFromRoster(337,createStartingCandidateRoster(337));
  const w=createScenarioWorld(site.seed,32,'crashlanded',site.site,team,choice),arrival=w.startingArrival;
  if(!arrival||arrival.phase==='opened')throw Error('Expected initial custody');
  const originals=arrival.pods.map(p=>p.pawn),ids=originals.map(p=>p.id).sort((a,b)=>a-b);
  expect(readColonistAvailability(w)).toEqual({kind:'arriving',pawnIds:ids});checkpoint(w);
  stepWorld(w,15);expect(readColonistAvailability(w)).toEqual({kind:'arriving',pawnIds:ids});checkpoint(w);
  stepWorld(w,12);expect(readColonistAvailability(w)).toEqual({kind:'available',pawnIds:ids});
  for(const p of originals)expect(w.pawns.find(q=>q.id===p.id)).toBe(p);checkpoint(w);
});

test('scout preparation is only a reference; a real departure, blocked entry and return keep one original identity',()=>{
  const {world:w,pawnId,foodId}=commercialCamp(),p=w.pawns.find(p=>p.id===pawnId)!;
  expect(applyCommand(w,{type:'scout-start',pawnId,pileId:foodId,quantity:2}).ok).toBe(true);
  expect(readColonistAvailability(w)).toEqual({kind:'available',pawnIds:w.pawns.map(q=>q.id).sort((a,b)=>a-b)});
  const blockedPreparation=structuredClone(w);disableLocals(blockedPreparation);
  expect(unavailable(blockedPreparation).local).toHaveLength(w.pawns.length);expect(unavailable(blockedPreparation).away).toEqual([]);
  until(w,()=>w.scout?.phase==='travelling');
  if(!w.scout||!('pawn' in w.scout))throw Error('Expected original scout owner');expect(w.scout.pawn).toBe(p);
  disableLocals(w);expect(unavailable(w).away).toEqual([{...identity(p),owner:'scout-away',phase:'travelling'}]);checkpoint(w);
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(x===0||z===0||x===w.width-1||z===w.height-1)w.tiles[z*w.width+x]={terrain:'rock'};
  until(w,()=>w.scout?.phase==='awaiting-entry',1600);
  expect(unavailable(w).away).toEqual([{...identity(p),owner:'scout-away',phase:'awaiting-entry'}]);checkpoint(w);
  const s=w.scout;if(!s||!('pawn' in s))throw Error('Expected blocked scout');w.tiles[s.entry.z*w.width+s.entry.x]={terrain:'grass'};
  until(w,()=>!w.scout,30);expect(w.pawns.find(q=>q.id===p.id)).toBe(p);
  expect(readColonistAvailability(w)).toEqual({kind:'available',pawnIds:[p.id]});checkpoint(w);
});

test('commerce uses its real outside owner through the visit and its map reference after returning',()=>{
  const {world:w,pawnId,foodId}=commercialCamp(),p=w.pawns.find(p=>p.id===pawnId)!;
  expect(applyCommand(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:100}).ok).toBe(true);
  const blockedPreparation=structuredClone(w);disableLocals(blockedPreparation);
  expect(unavailable(blockedPreparation).local).toHaveLength(w.pawns.length);expect(unavailable(blockedPreparation).away).toEqual([]);
  expect(readColonistAvailability(w).kind).toBe('available');until(w,()=>w.commercialTrip?.phase==='outbound');
  disableLocals(w);expect(unavailable(w).away).toEqual([{...identity(p),owner:'commercial-away',phase:'outbound'}]);checkpoint(w);
  until(w,()=>w.commercialTrip?.phase==='at-post',800);
  expect(unavailable(w).away).toEqual([{...identity(p),owner:'commercial-away',phase:'at-post'}]);checkpoint(w);
  expect(applyCommand(w,{type:'commercial-return'}).ok).toBe(true);
  expect(unavailable(w).away[0]?.phase).toBe('returning');until(w,()=>w.commercialTrip?.phase==='unloading',800);
  expect(w.pawns.find(q=>q.id===p.id)).toBe(p);expect(readColonistAvailability(w)).toEqual({kind:'available',pawnIds:[p.id]});checkpoint(w);
});

test.each(['RAW','MAIN'] as const)('%s: a real orbital-only commercial visit registers each owner once and rejects aliases atomically',mode=>{
  const {world:w,pawnId,foodId}=commercialCamp();
  expect(applyCommand(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:100}).ok).toBe(true);
  until(w,()=>w.commercialTrip?.phase==='outbound');disableLocals(w);
  until(w,()=>w.commercialTrip?.phase==='at-post',800);
  const visit=w.commercialTrip;if(visit?.phase!=='at-post')throw Error('Expected real commercial visit');
  // This exercises strict orbital identity admission without the separate
  // relationship branch, including the prospective runtime orbital adoption.
  expect(w.orbital).toBeDefined();expect(w.civilianPost!.stock.length).toBeGreaterThan(0);
  for(const field of ['planet','relationships','group','groupLosses'] as const)expect(Object.hasOwn(w,field)).toBe(false);
  for(const p of [...w.pawns,visit.pawn]){
    expect(Object.hasOwn(p,'romanceMemories')).toBe(false);expect(Object.hasOwn(p,'familyBereavement')).toBe(false);
  }
  expect(validateWorld(w)).toEqual([]);
  const encoder=new SnapshotEncoder(),decoder=mode==='RAW'?new SnapshotDecoder():new AvailabilityQueryDecoder();
  const initial=structuredClone(encoder.encode(w,0,1)),initialBefore=structuredClone(initial),first=decoder.adopt(initial);
  expect(first.status,first.status==='resync'?first.reason:first.status).toBe('applied');
  if(first.status!=='applied')throw Error('Expected initial commercial checkpoint');
  const held=first.world,heldBefore=structuredClone(held),projection=readColonistAvailability(held);
  expect(initial).toEqual(initialBefore);expect(projection).toEqual(readColonistAvailability(w));
  const good=structuredClone(encoder.encode(w,0,1,true));expect(good.kind).toBe('checkpoint');
  const mutations:((candidate:World)=>void)[]=[
    c=>{const t=c.commercialTrip!;if('pawn' in t)c.civilianPost!.stock[0]!.id=t.pawn.id;},
    c=>{const t=c.commercialTrip!;if('items' in t)c.civilianPost!.stock[0]!.id=t.items[0]!.id;},
    c=>{c.civilianPost!.stock[0]!.id=c.pawns[0]!.id;},
    c=>{const t=c.commercialTrip!;if('items' in t)t.items[0]!.id=c.civilianPost!.stock[0]!.id;},
    c=>{const t=c.commercialTrip!;if('items' in t)t.items[0]!.id=c.pawns[0]!.id;},
    c=>{const t=c.commercialTrip!;if('items' in t)t.items[1]!.id=t.items[0]!.id;},
  ];
  expect(visit.items.length).toBeGreaterThanOrEqual(2);
  for(const mutate of mutations){
    const bad=structuredClone(good);mutate(bad.world as World);const badBefore=structuredClone(bad);
    expect(decoder.adopt(bad).status).toBe('resync');
    expect(bad).toEqual(badBefore);expect(held).toEqual(heldBefore);expect(readColonistAvailability(held)).toEqual(projection);
  }
  const goodBefore=structuredClone(good),recovered=decoder.adopt(good);
  expect(recovered.status,recovered.status==='resync'?recovered.reason:recovered.status).toBe('applied');
  if(recovered.status!=='applied')throw Error('Expected recovery at the same refused revision');
  expect(recovered.world).toEqual(w);expect(readColonistAvailability(recovered.world)).toEqual(projection);
  expect(good).toEqual(goodBefore);expect(held).toEqual(heldBefore);
});

function departedGroup(){
  const w=createScenarioWorld(337,32,'crashlanded');
  for(const p of w.pawns){delete p.health;delete p.background;delete p.traits;p.hunger=95;p.rest=95;p.recreation.level=100;p.apparelAutomation=false;p.schedule.fill('work');
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;}
  // Admission and departure both require a capable resident. Incapacitate
  // that resident only after the original travellers actually leave.
  const originals=w.pawns.slice(0,2);addMaterial(w,'food',originals.length,{type:'inventory',pawnId:originals[0]!.id},'survival-meal');
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  expect(applyCommand(w,{type:'group-start',memberIds:originals.map(p=>p.id),destination:legacyPlanet(w).civilianTile,sources:[]}).ok).toBe(true);
  expect(readColonistAvailability(w)).toEqual({kind:'available',pawnIds:w.pawns.map(p=>p.id).sort((a,b)=>a-b)});
  const blockedPreparation=structuredClone(w);disableLocals(blockedPreparation);
  expect(unavailable(blockedPreparation).local).toHaveLength(w.pawns.length);expect(unavailable(blockedPreparation).away).toEqual([]);
  const forming=w.group;if(!forming||!('exits' in forming))throw Error('Expected real group intent');forming.phase='leaving';
  // Prepare only the final movement frontier; the actual producer transfers
  // original actors and possessions, not a copied off-map test roster.
  for(const exit of forming.exits){const p=w.pawns.find(p=>p.id===exit.pawnId)!;if(!exit.cell)throw Error('Expected legal exit');
    p.x=exit.cell.x;p.z=exit.cell.z;p.state='idle';p.path=[];p.moveCooldown=0;p.planCooldown=0;delete p.motion;}
  tryGroupDeparture(w);const group=w.group;if(!group||!('members' in group))throw Error('Expected atomic departure');
  group.phase='at-site';group.tile=legacyPlanet(w).civilianTile;group.destination=group.tile;group.route=[group.tile];group.segment=null;group.stop={kind:'at-site'};
  disableLocals(w);
  return {w,group,originals};
}

test('group formation references become real original owners, including a stopped living traveller',()=>{
  const {w,group,originals}=departedGroup();
  for(const p of originals)expect(group.members.find(q=>q.id===p.id)).toBe(p);
  expect(unavailable(w).away).toEqual(originals.map(p=>({...identity(p),owner:'group-away',phase:'at-site'})));checkpoint(w);
  expect(applyCommand(w,{type:'group-pause',paused:true}).ok).toBe(true);
  expect(group.stop).toEqual({kind:'at-site'});
  expect(unavailable(w).away).toHaveLength(originals.length);expect(unavailable(w).deaths).toEqual([]);checkpoint(w);
});

test('actual group entry transfers originals back to map; unloading contains references only',()=>{
  const {w,group,originals}=departedGroup();
  // Prepare the arrival frontier; this is not certification of a played route.
  group.phase='awaiting-entry';group.tile=legacyPlanet(w).homeTile;group.destination=group.tile;
  group.route=[group.tile];group.stop={kind:'awaiting-entry'};
  expect(unavailable(w).away.map(p=>p.phase)).toEqual(originals.map(()=>'awaiting-entry'));checkpoint(w);
  stepWorld(w);expect(w.group?.phase).toBe('unloading');
  for(const p of originals)expect(w.pawns.find(q=>q.id===p.id)).toBe(p);
  expect(readColonistAvailability(w)).toEqual({kind:'available',pawnIds:originals.map(p=>p.id).sort((a,b)=>a-b)});checkpoint(w);
  const blockedUnload=structuredClone(w);disableLocals(blockedUnload);
  expect(unavailable(blockedUnload).local).toHaveLength(w.pawns.length);expect(unavailable(blockedUnload).away).toEqual([]);
});

test('a real clinical loss transfers the original from living group to terminal without ending the other travellers',()=>{
  const {w,group,originals}=departedGroup(),p=originals[0]!;
  p.health=createMedicalRecord(w.tick);addResolvedInjury(p.health,'right-hand','cut',6000,()=>.999999);
  p.health.bloodLoss=BLOOD_UNIT-1;p.medicalCare='none';const status=medicalStatus(p.health);p.state=status==='mobile'?'idle':status;
  until(w,()=>!!w.groupLosses?.some(loss=>loss.pawn.id===p.id),6);
  const loss=w.groupLosses!.find(l=>l.pawn.id===p.id)!;expect(loss.pawn).toBe(p);expect(group.members).not.toContain(p);
  const view=unavailable(w);expect(view.deaths).toEqual([{...identity(p),owner:'group-loss',deathAt:p.health.death!.tick}]);
  expect(view.away.map(q=>q.id)).toEqual(originals.slice(1).map(q=>q.id));checkpoint(w);
});

test('real local clinical death remains an explanation and exportable checkpoint, not a defeat flag',()=>{
  const w=medicalCamp(1,16),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);
  addResolvedInjury(p.health,'head','crush',50000,()=>.999999);reconcilePawnHealth(w,p);
  expect(p.state).toBe('dead');const before=serializeWorld(w),view=unavailable(w);
  expect(view).toEqual({kind:'unavailable',local:[],away:[],deaths:[{...identity(p),owner:'map',deathAt:w.tick}]});
  expect(serializeWorld(w)).toBe(before);checkpoint(w);
});
