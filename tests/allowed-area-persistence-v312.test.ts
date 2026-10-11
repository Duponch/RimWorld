import { expect,test } from 'vitest';
import { medicalCamp } from './scenarios/health.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { applyAllowedAreaCommand } from '../src/sim/allowed-areas.ts';
import { validAllowedAreaTransport } from '../src/sim/allowed-area-save.ts';
import { startTravel } from '../src/sim/movement.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { herdCareCamp } from './helpers/veterinary-v277.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health.ts';
import { validAnimalRestTransport,validAnimalRescueShape } from '../src/sim/animal-rest-save.ts';
import { exitPodRescue } from '../src/sim/pod-rescue.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { captureHumanOwners,everyHumanPawnOwner,type HumanOwnerKind } from '../src/sim/human-owners.ts';
import { SCHEMA_VERSION,type Pawn,type World } from '../src/sim/types.ts';

const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function exact(w:World){
  expect(validAllowedAreaTransport(w,w.schemaVersion)).toBe(true);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);const result=checkpoint(w);expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
}
function refused(w:World,file=true){
  expect(validAllowedAreaTransport(w,w.schemaVersion)).toBe(false);expect(checkpoint(w).status).toBe('resync');
  if(file)expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
}
function prepared(returning=false){
  const w=medicalCamp(2),p=w.pawns[0]!,target={x:p.x+2,z:p.z};
  const area={id:w.nextId++,label:'Village',color:0x55b8a9,cells:[target.z*w.width+target.x]};
  w.allowedAreas=[area];p.allowedAreaId=area.id;
  if(returning){p.allowedAreaReturn={target};p.path=[{x:p.x+1,z:p.z},target];p.state='moving';}
  return {w,p,area,target};
}
function scout(){
  const f=prepared(),{w,p}=f;p.x=0;p.z=3;p.state='idle';p.path=[];p.moveCooldown=0;delete p.motion;
  addMaterial(w,'food',2,{type:'inventory',pawnId:p.id},'survival-meal');
  const food=w.piles.pop()!;w.pawns=w.pawns.filter(q=>q!==p);refreshStock(w);
  w.scout={phase:'travelling',pawn:p,items:[food],foodPileId:food.id,quantity:2,startedAt:w.tick,departedAt:w.tick,returnAt:w.tick+1500,consumed:0,entry:{x:0,z:3}};
  return f;
}
function allOriginalOwners(){
  const w=medicalCamp(7),[local,scoutPawn,commercial,group,loss,visitor,pod]=w.pawns as [Pawn,Pawn,Pawn,Pawn,Pawn,Pawn,Pawn];
  w.pawns=[local];
  w.scout={phase:'travelling',pawn:scoutPawn,items:[],foodPileId:w.nextId++,quantity:2,startedAt:w.tick,departedAt:w.tick,returnAt:w.tick+1500,consumed:0,entry:{x:0,z:3}};
  w.commercialTrip={phase:'outbound',pawn:commercial,items:[],foodPileId:w.nextId++,foodQuantity:2,silverQuantity:0,startedAt:w.tick,departedAt:w.tick,arrivesAt:w.tick+750,entry:{x:0,z:4},consumed:0,silverPaid:0,bought:{medicine:0,component:0}};
  w.group={id:1,phase:'travelling',members:[group],items:[],startedAt:w.tick,departedAt:w.tick,lastPersonalTick:w.tick,entry:{x:0,z:5},tile:0,destination:1,route:[],segment:null,paused:false,stop:null,
    baseline:{food:0,silver:0,medicine:0,component:0,cargo:{cloth:0,'muffalo-wool':0}},
    ledger:{foodLoaded:0,foodConsumed:0,medicineUsed:0,silverLoaded:0,silverPaid:0,silverEarned:0,cargoLoaded:{cloth:0,'muffalo-wool':0},sold:{cloth:0,'muffalo-wool':0},bought:{medicine:0,component:0}}};
  loss.state='dead';loss.health=createMedicalRecord(w.tick);loss.health.death={tick:w.tick,cause:'blood-loss'};
  w.groupLosses=[{groupId:1,tile:0,tick:w.tick,pawn:loss,items:[]}];
  const agenda={rng:1,cycle:0,last:w.tick,pending:[]};
  w.visitors={profile:'cassandra-visitors-v1',adoptedAt:w.tick,rng:1,serial:1,introAt:null,traveler:{...agenda},visitor:{...agenda},groups:[],departed:[{group:1,tick:w.tick,pawn:visitor,items:[]}]};
  w.podRescues={profile:'civilian-pod-rescue-v1',serial:1,incidents:[],departed:[{incidentId:1,tick:w.tick,pawn:pod,items:[]}]};
  w.raids={profile:'camp-raids-v1',rng:1,nextCheck:null,serial:1,completed:1,departed:[{group:1,pawnId:w.nextId++,name:'Identité seule',cell:{x:0,z:6},tick:w.tick,items:[]}]};
  return w;
}

test('223 definitions, assignment and genuine return route preserve all state through file and Decoder',()=>{
  for(const returning of [false,true]){const {w}=prepared(returning),before=structuredClone(w);exact(w);expect(w).toEqual(before);}
});
test('222 migration is number-only with no areas, assignments, return or random draw invented',()=>{
  const w=medicalCamp(2);w.schemaVersion=222 as World['schemaVersion'];const before=structuredClone(w);
  expect(deserializeWorld(JSON.stringify(w))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(w).toEqual(before);
});

test('light human predicate visits the same original Pawn domains as complete capture, including explicit losses',()=>{
  const w=allOriginalOwners(),visited:{pawn:Pawn;kind:HumanOwnerKind}[]=[];
  expect(everyHumanPawnOwner(w,(pawn,kind)=>{visited.push({pawn,kind});return true;})).toBe(true);
  const full=captureHumanOwners(w).pawnOwners;
  expect(visited.map(s=>s.kind)).toEqual(['map','scout-away','commercial-away','group-away','group-loss','visitor-departure','pod-departure']);
  expect(visited).toHaveLength(full.length);for(let i=0;i<full.length;i++){expect(visited[i]!.pawn).toBe(full[i]!.pawn);expect(visited[i]!.kind).toBe(full[i]!.kind);}
  const explicit={losses:[]},withoutLoss:Pawn[]=[];
  everyHumanPawnOwner(w,p=>{withoutLoss.push(p);return true;},explicit);
  expect(withoutLoss).toEqual(captureHumanOwners(w,explicit).pawnOwners.map(s=>s.pawn));
  let calls=0;expect(everyHumanPawnOwner(w,()=>{calls++;return false;})).toBe(false);expect(calls).toBe(1);
});

test('absent-area guard reads no possessions and refuses own prospective fields on every original domain',()=>{
  const w=allOriginalOwners(),originals=captureHumanOwners(w).pawnOwners.map(s=>s.pawn!);
  const unread=()=>{throw Error('Possession container was read.');};
  Object.defineProperty(w,'piles',{get:unread});Object.defineProperty(w,'packed',{get:unread});
  for(const owner of [w.scout,w.commercialTrip,w.group,...w.groupLosses!,...w.visitors!.departed,...w.podRescues!.departed]){
    Object.defineProperty(owner!,'items',{get:unread});Object.defineProperty(owner!,'packed',{get:unread});
  }
  for(const version of [222,223]){
    expect(validAllowedAreaTransport(w,version)).toBe(true);
    for(const pawn of originals)for(const field of ['allowedAreaId','allowedAreaReturn'] as const){
      Object.assign(pawn,{[field]:undefined});expect(validAllowedAreaTransport(w,version)).toBe(false);delete pawn[field];
    }
  }
  Object.assign(w,{allowedAreas:undefined});expect(validAllowedAreaTransport(w,223)).toBe(false);
});
test.each(['areas','assignment','return','undefined-areas','undefined-assignment','undefined-return'] as const)('222 rejects prospective %s before migration',kind=>{
  const {w,p}=prepared();delete w.allowedAreas;delete p.allowedAreaId;w.schemaVersion=222 as World['schemaVersion'];
  if(kind==='areas')w.allowedAreas=[];if(kind==='assignment')p.allowedAreaId=w.nextId-1;
  if(kind==='return')p.allowedAreaReturn={target:{x:p.x,z:p.z}};
  if(kind==='undefined-areas')Object.assign(w,{allowedAreas:undefined});if(kind==='undefined-assignment')Object.assign(p,{allowedAreaId:undefined});if(kind==='undefined-return')Object.assign(p,{allowedAreaReturn:undefined});
  refused(w,!kind.startsWith('undefined'));
});
test('malformed areas and references are rejected identically by file and Decoder',()=>{
  const changes:((f:ReturnType<typeof prepared>)=>void)[]=[
    f=>{f.area.label=' Village';},f=>{f.area.label='';},f=>{f.area.label='e\u0301';},f=>{f.area.label='x'.repeat(65);},
    f=>{f.area.color=-1;},f=>{f.area.color=0x1000000;},f=>{f.area.color=1.5;},f=>Object.assign(f.area,{future:true}),
    f=>{f.area.cells=[10,10];},f=>{f.area.cells=[11,10];},f=>{f.area.cells=[-1];},f=>{f.area.cells=[f.w.width*f.w.height];},
    f=>{f.area.cells=[1.5];},f=>{f.area.cells=Array(1) as number[];},f=>{f.p.allowedAreaId=f.w.nextId;},
    f=>{f.area.id=f.p.id;},f=>{f.w.allowedAreas!.push({...f.area,cells:[]});},
    f=>{f.w.allowedAreas=Array.from({length:11},(_,i)=>({...f.area,id:f.w.nextId+i,cells:[]}));f.w.nextId+=11;},
  ];
  for(const change of changes){const f=prepared();change(f);refused(f.w);}
});
test('return cannot own another task, combat recovery, cargo, ineffective policy or wrong destination',()=>{
  const changes:((f:ReturnType<typeof prepared>)=>void)[]=[
    f=>{f.area.cells=[];},f=>{delete f.p.allowedAreaId;},f=>Object.assign(f.p.allowedAreaReturn!,{areaId:f.area.id}),
    f=>{f.p.allowedAreaReturn!.target={x:0,z:0};},f=>{f.p.path=[{x:0,z:0}];},f=>{f.p.path=[];},
    f=>{f.p.draft={lastActiveTick:f.w.tick,target:null,queue:[]};},f=>{f.p.state='downed';},
    f=>{f.p.need={kind:'sleep',phase:'travel',bedId:null,target:{...f.target}};},
    f=>{f.p.shooting={order:null,stance:{phase:'cooldown',startedAtCore:f.w.tick*10,endsAtCore:f.w.tick*10+45}};},
    f=>{addMaterial(f.w,'steel',1,{type:'pawn',pawnId:f.p.id},'steel');},
  ];
  for(const change of changes){const f=prepared(true);change(f);refused(f.w);}
  const f=prepared(true);f.p.shooting={order:null,stance:null};f.p.melee={order:null,strike:null};
  // The area guard excludes actual engagements; historical combat shape guards
  // separately require these optional containers to be absent when neutral.
  expect(validAllowedAreaTransport(f.w,223)).toBe(true);
  delete f.p.shooting;delete f.p.melee;exact(f.w);
});
test('last engaged return edge survives exact reload, without a remaining path or artificial movement delay',()=>{
  const f=prepared(true);f.p.x=f.target.x-1;f.p.path=[];expect(startTravel(f.w,f.p,f.target)).toBe(true);
  const edge=structuredClone(f.p.motion),rng=f.w.rng;exact(f.w);expect(f.p.motion).toEqual(edge);expect(f.w.rng).toBe(rng);
});

test('return guard distinguishes neutral tactics and social memory from actual engagements',()=>{
  const f=prepared(true),other=f.w.pawns[1]!;
  f.p.social={rng:1,memories:[{otherId:other.id,kind:'chitchat',at:f.w.tick,offset:.66}],last:{otherId:other.id,kind:'chitchat',tick:f.w.tick,initiated:true}};
  exact(f.w);
  // The area guard is structural. Historical tactical admission separately
  // limits mandates to non-colonists, so this neutral container is guard-only.
  f.p.tactics={targetId:null,post:null,reviewAtCore:0};
  const before=structuredClone(f.w);expect(validAllowedAreaTransport(f.w,223)).toBe(true);expect(f.w).toEqual(before);
  f.p.tactics.targetId=other.id;expect(validAllowedAreaTransport(f.w,223)).toBe(false);
  f.p.tactics.targetId=null;f.p.tactics.post={...f.target};expect(validAllowedAreaTransport(f.w,223)).toBe(false);
  delete f.p.tactics;
  f.p.social.fight={opponentId:other.id,startedAt:f.w.tick};other.social={rng:2,memories:[],fight:{opponentId:f.p.id,startedAt:f.w.tick}};
  refused(f.w);
});
test('away original retains assignment; return is forbidden, and delete clears its actual reference',()=>{
  const f=scout();exact(f.w);const original=f.p;
  f.p.allowedAreaReturn={target:{...f.target}};refused(f.w);delete f.p.allowedAreaReturn;
  expect(applyAllowedAreaCommand(f.w,{type:'allowed-area-delete',areaId:f.area.id})?.ok).toBe(true);
  expect(f.w.scout&&'pawn' in f.w.scout&&f.w.scout.pawn).toBe(original);expect(Object.hasOwn(original,'allowedAreaId')).toBe(false);expect(Object.hasOwn(f.w,'allowedAreas')).toBe(false);exact(f.w);
});
test('222 away assignment and return fields are prospective even when undefined',()=>{
  for(const field of ['allowedAreaId','allowedAreaReturn'] as const){const f=scout();delete f.w.allowedAreas;delete f.p.allowedAreaId;f.w.schemaVersion=222 as World['schemaVersion'];Object.assign(f.p,{[field]:undefined});refused(f.w,false);}
});
test('frozen pod archive resolves its retained assignment in the real definitions and delete edits only that reference',()=>{
  const {w,p,area,target}=prepared();p.faction='outlanders';p.podRescue={incidentId:1,admittedAt:w.tick};p.health=createMedicalRecord(w.tick);
  delete p.apparelPolicyId;delete p.apparelAutomation;delete p.nextApparelCheckAt;p.x=0;p.z=5;
  w.podRescues={profile:'civilian-pod-rescue-v1',serial:1,incidents:[{id:1,start:0,openedAt:10,pawnId:p.id}],departed:[]};
  expect(exitPodRescue(w,p)).toBe(true);const archive=w.podRescues.departed[0]!,before=structuredClone(archive);exact(w);
  archive.pawn.allowedAreaReturn={target};refused(w);delete archive.pawn.allowedAreaReturn;
  const old=structuredClone(w);old.schemaVersion=222 as World['schemaVersion'];delete old.allowedAreas;refused(old);
  expect(applyAllowedAreaCommand(w,{type:'allowed-area-delete',areaId:area.id})?.ok).toBe(true);
  delete before.pawn.allowedAreaId;expect(archive).toEqual(before);expect(Object.hasOwn(w,'allowedAreas')).toBe(false);exact(w);
});
test('223 animal direct rescue marker persists; 221/222 reject its presence, including undefined',()=>{
  const {world:w}=herdCareCamp('hare'),a=w.wildlife!.animals[0]!,p=w.pawns[0]!;a.health!.bloodLoss=Math.round(BLOOD_UNIT*.7);reconcileAnimalHealth(w,a);
  const spot={id:w.nextId++,kind:'animal-sleeping-spot' as const,x:p.x-2,z:p.z,orientation:0 as const,footprint:'standard' as const};
  w.structures.push(spot);a.domestic!.bedId=spot.id;p.animalRescue={animalId:a.id,spotId:spot.id,phase:'approach',forced:true};p.state='moving';
  expect(validAnimalRestTransport(w,223)).toBe(true);exact(w);
  for(const version of [221,222])for(const forced of [true,undefined,false,null]){
    const t={animalId:a.id,spotId:spot.id,phase:'approach',forced};expect(validAnimalRescueShape(t,version)).toBe(false);
    const old=structuredClone(w);old.schemaVersion=version as World['schemaVersion'];Object.assign(old.pawns[0]!.animalRescue!,{forced});
    expect(validAnimalRestTransport(old,version)).toBe(false);expect(checkpoint(old).status).toBe('resync');if(forced!==undefined)expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
  }
  for(const forced of [undefined,false,null])expect(validAnimalRescueShape({animalId:a.id,spotId:spot.id,phase:'approach',forced},223)).toBe(false);
});
