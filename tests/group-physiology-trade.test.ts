import { expect,test } from 'vitest';
import { medicalCamp } from './scenarios/health.ts';
import { emptyGroupLedger } from '../src/sim/group-loading.ts';
import { captureGroupMass,type AwayGroup } from '../src/sim/group-capture.ts';
import { advanceGroupPersonal,type GroupPersonalContext } from '../src/sim/group-personal.ts';
import { advanceGroupIngestion } from '../src/sim/group-ingestion.ts';
import { advanceGroupCare,applyConsumedGroupMass,groupDoctorTendDue } from '../src/sim/group-care.ts';
import { advanceGroupJoy,groupJoyDue } from '../src/sim/group-joy.ts';
import { quoteGroupTrade,draftGroupTrade,type GroupTradeEnvironment } from '../src/sim/group-trade.ts';
import { bestGroupNegotiator } from '../src/sim/trade-negotiator.ts';
import { ensureCommercialPost,quoteCommercial,applyCommercialBuy } from '../src/sim/commercial-post.ts';
import { createMedicalRecord,addResolvedInjury,medicalBleed } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { HUMAN_YEAR_TICKS } from '../src/sim/human-age.ts';
import { COLONY_EXPECTATIONS } from '../src/sim/expectations.ts';
import { personalMoodThoughts } from '../src/sim/mood.ts';
import { initialRecreation } from '../src/sim/recreation-rules.ts';
import { validateRecreationRecordShape } from '../src/sim/recreation-save.ts';
import { DEEP_TALK_DURATION } from '../src/sim/social-state.ts';
import { TICKS_PER_DAY,SCHEMA_VERSION,type MaterialPile,type Pawn,type World } from '../src/sim/types.ts';

function away(count=2):{world:World;group:AwayGroup} {
  const world=medicalCamp(count+1,16),members=world.pawns.slice(0,count),ids=new Set(members.map(p=>p.id));
  for(const p of members){delete p.background;delete p.traits;delete p.health;p.hunger=80;p.rest=70;p.state='idle';p.path=[];p.moveCooldown=0;p.bedId=null;p.skills.social={level:0,xp:0,dailyXp:0,passion:0};p.recreation=initialRecreation(40);}
  const items=world.piles.filter(p=>'pawnId' in p.owner&&ids.has(p.owner.pawnId));
  world.piles=world.piles.filter(p=>!items.includes(p));world.pawns=world.pawns.filter(p=>!ids.has(p.id));
  const group:AwayGroup={id:1,phase:'at-site',members,items,startedAt:world.tick,departedAt:world.tick,lastPersonalTick:world.tick,
    destination:1,tile:1,route:[1],segment:null,paused:false,stop:{kind:'at-site'},entry:{x:0,z:0},ledger:emptyGroupLedger(),
    baseline:{food:0,silver:0,cargo:{cloth:0,'muffalo-wool':0},medicine:0,component:0}};
  world.group=group;return {world,group};
}
function add(world:World,group:AwayGroup,item:MaterialPile['item'],kind:MaterialPile['kind'],quantity:number,carrier=group.members[0]!):MaterialPile {
  const pile:MaterialPile={id:world.nextId++,item,kind,quantity,owner:{type:'inventory',pawnId:carrier.id}};group.items.push(pile);
  if(item==='survival-meal')group.baseline.food+=quantity;
  else if(item==='silver'||item==='medicine'||item==='component')group.baseline[item]+=quantity;
  else if(item==='cloth'||item==='muffalo-wool')group.baseline.cargo[item]+=quantity;
  return pile;
}
const random=(world:World)=>()=>{let n=world.rng;n^=n<<13;n^=n>>>17;n^=n<<5;world.rng=n>>>0;return world.rng/0x100000000;};
function personal(world:World,group:AwayGroup,resting=true):GroupPersonalContext {
  return {tick:world.tick,schemaVersion:SCHEMA_VERSION,seed:world.seed,legacyFood:false,legacyRest:false,resting,infectionChanceFactor:1,
    mood:{people:new Map([...world.pawns,...group.members].map(p=>[p.id,p])),expectation:COLONY_EXPECTATIONS[0],difficultyMood:0},
    joyToleranceFall:18/TICKS_PER_DAY,random:random(world),notice:()=>{}};
}
const dueTick=(p:Pawn)=>Array.from({length:125},(_,i)=>3000+i).find(t=>groupDoctorTendDue(p,t))!;
function tradeEnvironment(world:World,group:AwayGroup):GroupTradeEnvironment {
  const mass=captureGroupMass(group.members,group.items);if(!mass)throw Error('Missing actual group mass');
  return {tick:world.tick,nextId:world.nextId,version:SCHEMA_VERSION,siteTile:1,siteOpen:true,post:world.civilianPost,mass,pileCountElsewhere:world.piles.length};
}

test('paused and blocked-entry originals keep personal time, without stale map comfort or a duplicate same-tick pass',()=>{
  const {world,group}=away(),p=group.members[0]!,age=p.age!.biologicalTicks;
  world.tick=3020-p.id%20-1;group.lastPersonalTick=world.tick;
  p.background={childhood:'school-child',adulthood:'merchant'};
  p.skills.construction.level=10;p.skills.construction.xp=1000;
  p.skills.medicine.level=10;p.skills.medicine.xp=1000;
  const disabled=structuredClone(p.skills.construction);
  group.phase='awaiting-entry';group.paused=true;group.stop={kind:'awaiting-entry'};p.comfort=100;p.beauty=100;p.bedId=999;
  p.memories=[{kind:'ate-raw-food',expiresAt:world.tick+1}];
  world.tick++;const c=personal(world,group),hunger=p.hunger,rest=p.rest,joy=p.recreation.level;
  expect(advanceGroupPersonal(group,c)?.deceased).toEqual([]);
  expect(group.members[0]).toBe(p);expect(p.age!.biologicalTicks).toBe(age+1);
  expect(p.skills.construction).toEqual(disabled);expect(p.skills.medicine.xp).toBe(900);
  expect(p.hunger).toBeLessThan(hunger);expect(p.rest).toBeGreaterThan(rest);expect(p.recreation.level).toBeLessThan(joy);expect(p.memories).toEqual([]);
  const thoughts=personalMoodThoughts(p,{...c.mood,tick:world.tick,items:group.items});
  expect(thoughts.some(t=>/comfortable|environment|want.*sleep|shared-bedroom/.test(t.id))).toBe(false);
  const after=JSON.stringify(group),rng=world.rng;
  expect(advanceGroupPersonal(group,c)).toBeNull();expect(JSON.stringify(group)).toBe(after);expect(world.rng).toBe(rng);
});

test('birthday precedes clinical draws, accepts only its new current dossier, and resumes with the identical World RNG',()=>{
  const {world,group}=away(),fresh=group.members[0]!,injured=group.members[1]!;
  for(const p of group.members)p.age={biologicalTicks:60*HUMAN_YEAR_TICKS-1,chronologicalTicks:60*HUMAN_YEAR_TICKS-1};
  world.tick=6000+injured.id%60-1;group.lastPersonalTick=world.tick;
  injured.health=createMedicalRecord(world.tick);addResolvedInjury(injured.health,'left-hand','bruise',5000,()=>.999);
  const originalRecord=injured.health;
  const checkpoint=structuredClone({world,group}),notices:string[]=[],draws:number[]=[];
  world.tick++;const c=personal(world,group);c.random=()=>{draws.push(0);return 0;};c.notice=(_p,message)=>notices.push(message);
  advanceGroupPersonal(group,c);
  expect(notices).toHaveLength(4);expect(fresh.health?.ageAilments).toEqual(['bad-back','frail']);expect(fresh.health?.tick).toBe(world.tick);
  expect(fresh.health?.injuries).toEqual([]);expect(injured.health).toBe(originalRecord);expect(injured.health?.injuries[0]!.severity).toBe(4880);
  // Four birthday draws followed by one real healing choice; the new dossier owes no interval.
  expect(draws).toHaveLength(5);
  const a=checkpoint,b=structuredClone(checkpoint);
  for(let i=0;i<3;i++)for(const run of [a,b]){run.world.tick++;advanceGroupPersonal(run.group,personal(run.world,run.group));}
  expect(a.group).toEqual(b.group);expect(a.world.rng).toBe(b.world.rng);
});

test('clinical death expires passive memories at the frozen loss frontier without consuming or deleting possessions',()=>{
  const {world,group}=away(),p=group.members[0]!,other=group.members[1]!;
  world.tick=6*TICKS_PER_DAY+p.id%6-1;group.lastPersonalTick=world.tick;
  p.health=createMedicalRecord(world.tick);addResolvedInjury(p.health,'left-hand','cut',6000,()=>.999);p.health.bloodLoss=BLOOD_UNIT-1;
  expect(medicalBleed(p.health)).toBeGreaterThanOrEqual(.1);
  p.memories=[{kind:'ate-raw-food',expiresAt:world.tick+1}];
  p.social={rng:1,memories:[{otherId:other.id,kind:'deep-talk',at:world.tick+1-DEEP_TALK_DURATION,offset:1}]};
  p.mental={below:[0,0,0],cooldown:0,catharsis:[world.tick+1]};
  const carried=add(world,group,'silver','silver',20,p),items=JSON.stringify(group.items),skills=structuredClone(p.skills);
  world.tick++;const result=advanceGroupPersonal(group,personal(world,group));
  expect(result?.deceased).toEqual([p]);expect(p.state).toBe('dead');expect(p.health!.death?.tick).toBe(world.tick);expect(p.health!.tick).toBe(world.tick);
  expect(p.memories).toEqual([]);expect(p.social.memories).toEqual([]);expect(p.mental.catharsis).toEqual([]);expect(p.skills).toEqual(skills);
  expect(JSON.stringify(group.items)).toBe(items);expect(group.items).toContain(carried);expect(group.ledger).toEqual(emptyGroupLedger());
});

test('a final ration comes from the actual other carrier and its exact mass delta, with atomic policy refusal',()=>{
  const {world,group}=away(),eater=group.members[0]!,carrier=group.members[1]!;
  eater.hunger=23;carrier.hunger=80;const meal=add(world,group,'survival-meal','food',1,carrier),mass=captureGroupMass(group.members,group.items)!,notices:string[]=[];
  const c={tick:world.tick,schemaVersion:SCHEMA_VERSION,foodPolicies:world.foodPolicies,foodPoisonFactor:1,random:random(world),notice:(_p:Pawn,message:string)=>notices.push(message)};
  const result=advanceGroupIngestion(group,c),remaining=applyConsumedGroupMass(mass,[result]);
  expect(eater.hunger).toBe(100);expect(group.items).not.toContain(meal);expect(group.ledger.foodConsumed).toBe(1);
  expect(result).toEqual({massRemovedGrams:300,removed:[{pawnId:carrier.id,grams:300}]});expect(remaining.grams).toBe(mass.grams-300);
  expect(remaining.carriers.find(p=>p.pawnId===eater.id)?.grams).toBe(mass.carriers.find(p=>p.pawnId===eater.id)?.grams);expect(notices).toEqual(['Le groupe a consommé sa dernière ration.']);
  eater.hunger=23;add(world,group,'survival-meal','food',1,carrier);const before=JSON.stringify(group),rng=world.rng;
  advanceGroupIngestion(group,{...c,foodPolicies:[{id:eater.foodPolicyId,name:'Sans ration',allowed:[]} ]});
  expect(JSON.stringify(group)).toBe(before);expect(world.rng).toBe(rng);
});

test('caravan tending uses one actual dose, per-injury variation, no local job XP, and respects NoCare before dry treatment',()=>{
  const {world,group}=away(3),doctor=group.members[0]!,patient=group.members[1]!,carrier=group.members[2]!;
  for(const p of group.members)p.skills.medicine.level=0;doctor.skills.medicine.level=8;patient.medicalCare='industrial';
  world.tick=dueTick(doctor);group.lastPersonalTick=world.tick;
  patient.health=createMedicalRecord(world.tick);addResolvedInjury(patient.health,'left-hand','bruise',3000,()=>.999);addResolvedInjury(patient.health,'right-hand','bruise',3000,()=>.999);
  const dose=add(world,group,'medicine','medicine',2,carrier),mass=captureGroupMass(group.members,group.items)!,xp=structuredClone(doctor.skills.medicine);
  const values=[.1,.9];let draws=0;
  const result=advanceGroupCare(group,{tick:world.tick,random:()=>values[draws++]!});
  expect(patient.health.injuries.map(i=>i.tended)).toEqual([800,1000]);expect(draws).toBe(2);expect(doctor.skills.medicine).toEqual(xp);
  expect(dose.quantity).toBe(1);expect(group.ledger.medicineUsed).toBe(1);expect(result).toEqual({massRemovedGrams:500,removed:[{pawnId:carrier.id,grams:500}]});expect(applyConsumedGroupMass(mass,[result]).grams).toBe(mass.grams-500);
  addResolvedInjury(patient.health,'left-foot','bruise',1000,()=>.999);patient.medicalCare='none';const before=JSON.stringify(group);
  advanceGroupCare(group,{tick:world.tick,random:()=>{throw Error('NoCare drew quality');}});expect(JSON.stringify(group)).toBe(before);
});

test('stationary joy requires actual companions and the safe 1250-Core frontier, without social memories',()=>{
  const {world,group}=away(),p=group.members[0]!,other=group.members[1]!;
  world.tick=dueTick(p);group.lastPersonalTick=world.tick;
  for(const owner of group.members){owner.recreation=initialRecreation(40);owner.recreation.tolerance.solitary=60;owner.recreation.bored.solitary=true;}
  other.state='downed';let draws=0;
  advanceGroupJoy(group,{tick:world.tick,stationary:true,random:()=>{draws++;return .5;}});expect(p.recreation.level).toBe(40);expect(draws).toBe(0);
  other.state='idle';const social=JSON.stringify(p.social);
  advanceGroupJoy(group,{tick:world.tick,stationary:true,random:()=>{draws++;return .5;}});expect(p.recreation.level).toBe(45);expect(p.recreation.tolerance.social).toBe(3.25);expect(JSON.stringify(p.social)).toBe(social);
  const after=JSON.stringify(group);advanceGroupJoy(group,{tick:world.tick,stationary:false,random:()=>{throw Error('Moving joy drew');}});expect(JSON.stringify(group)).toBe(after);
  const tick=Number.MAX_SAFE_INTEGER-10,expected=Number((BigInt(tick)*10n+BigInt(p.id))%1250n)<10;
  expect(groupJoyDue(p,tick)).toBe(expected);expect(groupDoctorTendDue(p,tick)).toBe(expected);
  expect(validateRecreationRecordShape(p as unknown as Record<string,unknown>,SCHEMA_VERSION,world.tick)).toEqual([]);
});

test('real best negotiation and sale→buy drafts conserve all inventories/post funds without replacing human owners',()=>{
  const {world,group}=away(),buyer=group.members[0]!,negotiator=group.members[1]!;
  negotiator.skills.social!.level=10;const cloth=add(world,group,'cloth','textile',75,buyer);cloth.damage=7;
  expect(ensureCommercialPost(world)).toBe(true);expect(bestGroupNegotiator(group.members)).toBe(negotiator);
  const total=(item:string)=>[...group.items,...world.civilianPost!.stock].filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
  const totals={cloth:total('cloth'),silver:total('silver'),medicine:total('medicine')},rng=world.rng,privateRng=world.civilianPost!.rng;
  const lines=[{pileId:cloth.id,quantity:60}],q=quoteGroupTrade(group,tradeEnvironment(world,group),'sell',lines);if(!q.ok)throw Error(q.reason);
  const before=JSON.stringify({group,post:world.civilianPost}),draft=draftGroupTrade(group,tradeEnvironment(world,group),'sell',lines,q.signature);expect(draft).not.toBeNull();
  expect(JSON.stringify({group,post:world.civilianPost})).toBe(before);expect(draft!.group.members[0]).toBe(buyer);expect(draft!.group.members[1]).toBe(negotiator);
  Object.assign(group,draft!.group);world.civilianPost=draft!.post;world.nextId=draft!.nextId;
  expect(group.items.find(p=>p.id===cloth.id)).toMatchObject({quantity:15,damage:7});expect(world.civilianPost.stock.find(p=>p.item==='cloth')).toMatchObject({quantity:60,damage:7});
  const buy=[{pileId:world.civilianPost.stock.find(p=>p.item==='medicine')!.id,quantity:1}],bq=quoteGroupTrade(group,tradeEnvironment(world,group),'buy',buy);if(!bq.ok)throw Error(bq.reason);
  const bd=draftGroupTrade(group,tradeEnvironment(world,group),'buy',buy,bq.signature)!;Object.assign(group,bd.group);world.civilianPost=bd.post;world.nextId=bd.nextId;
  expect(group.ledger.silverEarned).toBe(q.totalSilver);expect(group.ledger.silverPaid).toBe(bq.totalSilver);expect(group.ledger.sold.cloth).toBe(60);expect(group.ledger.bought.medicine).toBe(1);
  expect(total('cloth')).toBe(totals.cloth);expect(total('silver')).toBe(totals.silver);expect(total('medicine')).toBe(totals.medicine);expect(world.rng).toBe(rng);expect(world.civilianPost.rng).toBe(privateRng);
  expect(captureGroupMass(group.members,group.items)?.grams).toBe(bq.mass.grams);
});

test('shared individual/group purchase kernel preserves price/output and refuses stale owner, closed site and final identity exhaustion atomically',()=>{
  const setup=away(1),{world,group}=setup,p=group.members[0]!;
  add(world,group,'survival-meal','food',3);add(world,group,'silver','silver',500);expect(ensureCommercialPost(world)).toBe(true);
  const single=structuredClone(world);delete single.group;
  const owner=single.pawns.find(p=>p.id===group.members[0]!.id)??structuredClone(p),items=structuredClone(group.items),food=items.find(p=>p.item==='survival-meal')!;
  single.commercialTrip={phase:'at-post',pawn:owner,items,foodPileId:food.id,foodQuantity:3,silverQuantity:500,startedAt:world.tick-750,departedAt:world.tick-750,entry:{x:0,z:0},consumed:0,silverPaid:0,bought:{medicine:0,component:0},arrivedAt:world.tick,decisionUntil:world.tick+250};
  const lines=[{pileId:world.civilianPost!.stock.find(p=>p.item==='medicine')!.id,quantity:2}],groupQuote=quoteGroupTrade(group,tradeEnvironment(world,group),'buy',lines),individualQuote=quoteCommercial(single,lines);
  if(!groupQuote.ok||!individualQuote.ok)throw Error('Real purchase unavailable');
  expect(groupQuote.totalSilver).toBe(individualQuote.totalSilver);expect(groupQuote.mass).toEqual(individualQuote.mass);
  const successful=draftGroupTrade(group,tradeEnvironment(world,group),'buy',lines,groupQuote.signature)!;
  expect(applyCommercialBuy(single,{type:'commercial-buy',lines,quote:individualQuote.signature}).ok).toBe(true);
  if(!single.commercialTrip||single.commercialTrip.phase!=='at-post')throw Error('Missing individual owner');
  expect(successful.group.items).toEqual(single.commercialTrip.items);expect(successful.post).toEqual(single.civilianPost);
  const changes=[()=>{p.skills.social!.level++;},()=>{group.ledger.foodConsumed++;},()=>{world.civilianPost!.stock[0]!.quantity--;},()=>{world.nextId=Number.MAX_SAFE_INTEGER;}];
  for(const change of changes){const copy=structuredClone({group,world});change();const before=JSON.stringify({group,world});expect(draftGroupTrade(group,tradeEnvironment(world,group),'buy',lines,groupQuote.signature)).toBeNull();expect(JSON.stringify({group,world})).toBe(before);Object.assign(group,copy.group);Object.assign(world,copy.world);world.group=group;}
  const closed=tradeEnvironment(world,group);closed.siteOpen=false;expect(quoteGroupTrade(group,closed,'buy',lines).ok).toBe(false);
  for(const member of group.members)member.background={childhood:'settlement-child',adulthood:'hermit'};
  const before=JSON.stringify({group,world});expect(quoteGroupTrade(group,tradeEnvironment(world,group),'buy',lines).ok).toBe(false);expect(JSON.stringify({group,world})).toBe(before);
});
