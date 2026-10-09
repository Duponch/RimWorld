import { expect,test } from 'vitest';
import { arrestCamp } from './helpers/arrest-v278.ts';
import { controlledInjury } from './scenarios/health.ts';
import { applyArrest,arrestReason,processArrest } from '../src/sim/arrest.ts';
import { arrestAcceptChance,arrestSuccessChance } from '../src/sim/arrest-rules.ts';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { groundCapacity,groundPile,nearbyGround } from '../src/sim/ground-placement.ts';
import { healthRandom } from '../src/sim/health.ts';
import { HUMAN_YEAR_TICKS,legacyHumanAge } from '../src/sim/human-age.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { resetMentalBreakForArrest } from '../src/sim/mental-state.ts';
import { startTravel } from '../src/sim/movement.ts';
import { blockedCells,reachableCells,routeToCell } from '../src/sim/pathfinding.ts';
import { processRescue,reconcileRescues } from '../src/sim/rescue.ts';
import { carrierOf,syncPatient } from '../src/sim/rescue-state.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import type { NeedContext } from '../src/sim/needs.ts';
import type { Pawn,World } from '../src/sim/types.ts';

function camp(){const f=arrestCamp(),w=f.world,a=w.pawns.find(p=>p.id===f.actorId)!,p=w.pawns.find(p=>p.id===f.patientId)!;return {...f,w,a,p};}
const reach=(w:World,a:Pawn)=>reachableCells(w,a,blockedCells(w),new Set());
function context(w:World,a:Pawn):NeedContext {
  return {search:goals=>reachableCells(w,a,blockedCells(w),new Set(),goals),move:target=>{a.path=routeToCell(w,target,reach(w,a))??[];},
    release:()=>releaseWork(w,a),event:message=>w.events.push({tick:w.tick,type:'command',message})};
}
function order(w:World,a:Pawn,p:Pawn){expect(applyArrest(w,{pawnId:a.id,patientId:p.id,queue:false})).toEqual({ok:true});}
function contact(w:World,a:Pawn,p:Pawn){a.x=p.x;a.z=p.z;a.path=[];a.motion=null;a.moveCooldown=0;processRescue(w,a,context(w,a));}
function pickup(w:World,a:Pawn,p:Pawn){order(w,a,p);contact(w,a,p);expect(a.rescue?.phase).toBe('carry');}
function until(w:World,done:()=>boolean,limit=1200){
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),JSON.stringify({tick:w.tick,p:w.pawns.map(p=>({id:p.id,state:p.state,rescue:p.rescue,prisoner:p.prisoner,path:p.path})),events:w.events.slice(-4)})).toBe(true);
}

test('adult arrest chance follows Social and normalized Manipulation, with automatic target exceptions',()=>{
  const {w,a,p}=camp();a.skills.social!.level=0;expect(arrestSuccessChance(a)).toBe(.6);
  a.skills.social!.level=5;expect(arrestSuccessChance(a)).toBeCloseTo(.975,12);
  a.skills.social!.level=6;expect(arrestSuccessChance(a)).toBe(1);
  a.skills.social!.level=12;controlledInjury(w,a,'left-shoulder',30000);
  // The destroyed shoulder and injury pain leave .44 Manipulation.
  expect(arrestSuccessChance(a)).toBeCloseTo(1.5*(.1+.9*.44/.95),12);
  a.background={childhood:'school-child',adulthood:'hermit'};expect(arrestSuccessChance(a)).toBe(.6);
  p.state='downed';expect(arrestAcceptChance(a,p)).toBe(1);p.state='idle';
  p.background={childhood:'quiet-child'};expect(arrestAcceptChance(a,p)).toBe(1);
});

test('admission is a forced free-adult crisis service and excludes hostility, provenance and previous schemas',()=>{
  const {w,a,p}=camp();a.priorities.warden=0;a.priorities.basic=0;expect(arrestReason(w,a,p)).toBeUndefined();
  p.mental!.crisis={kind:'berserk',age:0,target:null,waitUntil:w.tick,targetId:null,jobUntilCore:null};expect(arrestReason(w,a,p)).toBeDefined();
  p.mental!.crisis={kind:'sad-wander',age:0,target:null,waitUntil:w.tick};p.age={...legacyHumanAge(),biologicalTicks:17*HUMAN_YEAR_TICKS};expect(arrestReason(w,a,p)).toBeDefined();
  p.age=legacyHumanAge();p.surgeryRequest={part:'left-arm',requestedAt:w.tick};expect(arrestReason(w,a,p)).toBeDefined();delete p.surgeryRequest;
  a.draft={lastActiveTick:w.tick,target:null,queue:[]};expect(arrestReason(w,a,p)).toBeDefined();delete a.draft;
  w.schemaVersion=212 as World['schemaVersion'];expect(arrestReason(w,a,p)).toBeDefined();
});

test('the order and approach preserve the running crisis and never roll acceptance',()=>{
  const {w,a,p,weaponId}=camp(),rng=w.rng,crisis=p.mental!.crisis;
  expect(applyArrest(w,{pawnId:a.id,patientId:p.id,queue:true}).ok).toBe(false);
  order(w,a,p);processArrest(w,a,context(w,a));
  expect(w.rng).toBe(rng);expect(p.mental!.crisis).toBe(crisis);expect(p.prisoner).toBeUndefined();
  expect(w.piles.find(i=>i.id===weaponId)!.owner).toEqual({type:'equipment',pawnId:p.id});
  expect(a.rescue).toMatchObject({arrest:true,phase:'approach',patientId:p.id});
});

test('successful pickup keeps identity, recruitment and clothing, grounds the same weapon and resets without reward',()=>{
  const {w,a,p,weaponId}=camp();p.recruitment={capturedAt:100,recruitedAt:200,fromFaction:'outlaws'};
  addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'cloth-shirt');
  const shirt=w.piles.find(i=>i.item==='cloth-shirt')!;shirt.apparel=newApparelState('cloth-shirt');refreshStock(w);
  p.mental!.below=[1800,900,150];p.mental!.cooldown=321;p.mental!.catharsis=[w.tick+100];
  const skills=p.skills,recruitment=p.recruitment,faction=p.faction,rng={rng:w.rng};healthRandom(rng);
  pickup(w,a,p);
  expect(w.rng).toBe(rng.rng);expect(w.pawns).toContain(p);expect(p.skills).toBe(skills);expect(p.recruitment).toBe(recruitment);expect(p.faction).toBe(faction);
  expect(p.prisoner).toMatchObject({capturedAt:w.tick,mode:'maintain'});expect(p.hostilityResponse).toBeUndefined();
  expect(p.mental).toEqual({below:[0,0,0],cooldown:321,catharsis:[w.tick+100]});
  expect(w.piles.find(i=>i.id===weaponId)!.owner.type).toBe('ground');expect(w.piles.find(i=>i.id===shirt.id)).toBe(shirt);
  expect(shirt.owner).toEqual({type:'apparel',pawnId:p.id});expect(carrierOf(w,p.id)).toBe(a);
  expect(validateWorld(w)).toEqual([]);
});

test('Violent-disabled targets accept at contact without consuming the chance stream',()=>{
  const {w,a,p}=camp();p.background={childhood:'quiet-child'};a.skills.social!.level=0;
  const rng=w.rng;pickup(w,a,p);expect(w.rng).toBe(rng);expect(p.prisoner).toBeDefined();
});

test('a refusal ends the one mandate and replaces an admitted non-hostile crisis with Berserk',()=>{
  const {w,a,p}=camp();a.skills.social!.level=0;
  // A fixed ordinary xorshift state whose first draw exceeds .6.
  w.rng=0xffffffff;const stream={rng:w.rng};
  while(healthRandom(stream)<.6)w.rng=stream.rng;
  const atContact={rng:w.rng};expect(healthRandom(atContact)).toBeGreaterThanOrEqual(.6);
  order(w,a,p);contact(w,a,p);
  expect(a.rescue).toBeUndefined();expect(a.orders.active).toBeNull();expect(p.prisoner).toBeUndefined();
  expect(p.mental!.crisis?.kind).toBe('berserk');expect(p.mental!.catharsis).toEqual([]);
  const after=w.rng,events=w.events.length;processArrest(w,a,context(w,a));
  expect(w.rng).toBe(after);expect(w.events).toHaveLength(events);
});

test('a full physical floor postpones the contact before RNG, status and equipment change',()=>{
  const {w,a,p,weaponId}=camp();order(w,a,p);a.x=p.x;a.z=p.z;a.path=[];
  for(const c of nearbyGround(w,p))if(!groundPile(w,c)&&groundCapacity(w,c,'revolver',p.id)>0)
    w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',...c}});
  const rng=w.rng;processRescue(w,a,context(w,a));
  expect(w.rng).toBe(rng);expect(a.rescue?.phase).toBe('approach');expect(p.prisoner).toBeUndefined();
  expect(w.piles.find(i=>i.id===weaponId)!.owner).toEqual({type:'equipment',pawnId:p.id});
  const obstruction=groundPile(w,p)!;w.piles.splice(w.piles.indexOf(obstruction),1);processRescue(w,a,context(w,a));
  expect(a.rescue?.phase).toBe('carry');expect(w.piles.find(i=>i.id===weaponId)!.owner).toEqual({type:'ground',x:p.x,z:p.z});
});

test('contact waits for the actual edge and stun, while a recovered crisis cancels before pickup',()=>{
  const {w,a,p}=camp();order(w,a,p);a.x=p.x;a.z=p.z;a.path=[];
  p.motion={from:{x:p.x-1,z:p.z},to:{x:p.x,z:p.z},start:w.tick,end:w.tick+2};p.moveCooldown=2;
  const rng=w.rng;processRescue(w,a,context(w,a));expect(p.prisoner).toBeUndefined();expect(w.rng).toBe(rng);
  p.motion=null;p.moveCooldown=0;p.stun={sinceCore:w.tick*10,untilCore:w.tick*10+45};
  processRescue(w,a,context(w,a));expect(p.prisoner).toBeUndefined();expect(w.rng).toBe(rng);
  delete p.stun;resetMentalBreakForArrest(p);reconcileRescues(w);
  expect(a.rescue).toBeUndefined();expect(p.prisoner).toBeUndefined();expect(w.rng).toBe(rng);
});

test('care claims exclude a second guard, and interruption after pickup conserves the arrested body and edge',()=>{
  const {w,a,p}=camp(),other=w.pawns[1]!;
  other.ward={kind:'chat',patientId:p.id,spot:{x:other.x,z:other.z},phase:'approach',progress:0,rapports:0};
  expect(arrestReason(w,a,p)).toBeDefined();delete other.ward;pickup(w,a,p);
  expect(arrestReason(w,other,p)).toBeDefined();
  const next=a.path[0]!;expect(startTravel(w,a,next)).toBe(true);a.path.shift();syncPatient(w,a);
  const edge=structuredClone(p.motion),position={x:p.x,z:p.z},cooldown=p.moveCooldown,prisoner=p.prisoner;
  expect(releaseWork(w,a)).toBe(true);expect(a.rescue).toBeUndefined();expect(p.prisoner).toBe(prisoner);
  expect({x:p.x,z:p.z}).toEqual(position);expect(p.motion).toEqual(edge);expect(p.moveCooldown).toBe(cooldown);expect(p.faction).toBe('colony');
});

test('the real loop picks up once, resumes in carry, deposits and returns the same colon free inside the map',()=>{
  const {w,a,p,bedId,weaponId}=camp();
  expect(applyCommand(w,{type:'order-arrest',pawnId:a.id,patientId:p.id,queue:false})).toEqual({ok:true});
  until(w,()=>a.rescue?.phase==='carry'&&a.moveCooldown>0);expect(validateWorld(w)).toEqual([]);
  const capturedAt=p.prisoner!.capturedAt,restored=deserializeWorld(serializeWorld(w));
  stepWorld(w,5);stepWorld(restored,5);expect(serializeWorld(restored)).toBe(serializeWorld(w));
  until(w,()=>!a.rescue);expect(p.prisoner!.capturedAt).toBe(capturedAt);expect(p.bedId).toBe(bedId);
  expect(w.events.filter(e=>e.message.includes('arrête')&&e.message.includes(p.name))).toHaveLength(1);
  expect(applyCommand(w,{type:'prisoner-mode',patientId:p.id,mode:'release'})).toEqual({ok:true});
  until(w,()=>!p.prisoner);expect(w.pawns).toContain(p);expect(p.faction).toBe('colony');
  expect(p.x>0&&p.z>0&&p.x<w.width-1&&p.z<w.height-1).toBe(true);expect(w.prisonDepartures??[]).toEqual([]);
  expect(w.piles.find(i=>i.id===weaponId)!.owner.type).toBe('ground');expect(validateWorld(w)).toEqual([]);
});
