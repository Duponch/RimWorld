import { expect,test } from 'vitest';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { validatePawnRecordShape } from '../src/sim/pawn-record-save.ts';
import { validatePileRecordShape } from '../src/sim/material-record-save.ts';
import { validateGroupState } from '../src/sim/group-save.ts';
import { captureHumanOwners } from '../src/sim/human-owners.ts';
import { tryGroupDeparture } from '../src/sim/group-driver.ts';
import { validateQuests } from '../src/sim/quest-save.ts';
import { ensureCommercialPost } from '../src/sim/commercial-post.ts';
import { tryAddRelationship } from '../src/sim/relationship-runtime.ts';
import { validateRelationshipWorld } from '../src/sim/relationship-world-save.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { groundCapacity,nearbyGround } from '../src/sim/ground-placement.ts';
import { createMedicalRecord,addResolvedInjury,medicalStatus,medicalBleed } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { prisonDay } from '../src/sim/prisoner-state.ts';
import type { AwayGroup } from '../src/sim/group-capture.ts';
import type { Pawn,World } from '../src/sim/types.ts';

const raw=(value:unknown)=>value as Record<string,unknown>;
function checkpoint(w:World):World {
  expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));expect(resumed).toEqual(w);
  const adoption=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
  expect(adoption.status).toBe('applied');if(adoption.status==='applied')expect(adoption.world).toEqual(w);
  return resumed;
}
/** Corrupt a current payload, never a historical fixture. Refusal preserves the
 * previous world and revision; the next valid epoch can still replace it. */
function refuses(w:World,mutate:(bad:World)=>void,jsonReject=true):void {
  const bad=structuredClone(w);mutate(bad);
  expect(()=>validateWorld(bad)).not.toThrow();expect(validateWorld(bad).length).toBeGreaterThan(0);
  if(jsonReject)expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/Invalid save/);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  if(first.status!=='applied')throw Error(`Baseline refused: ${first.status}`);
  const retained=JSON.stringify(first.world),packet=structuredClone(encoder.encode(bad,0,1));
  const refusals:ReturnType<SnapshotDecoder['adopt']>[]=[];
  expect(()=>{refusals.push(decoder.adopt(packet));}).not.toThrow();expect(refusals[0]?.status).toBe('resync');
  expect(JSON.stringify(first.world)).toBe(retained);
  const next=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(next.status).toBe('applied');if(next.status==='applied')expect(next.world).toEqual(w);
}

function camp() {
  const w=createScenarioWorld(216,32,'crashlanded');
  for(const p of w.pawns){
    delete p.health;delete p.background;delete p.traits;
    p.hunger=95;p.rest=95;p.recreation.level=100;p.apparelAutomation=false;p.schedule.fill('work');
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  }
  checkpoint(w);return w;
}
function joined() {
  const w=camp();expect(applyCommand(w,{type:'enable-quests'}).ok).toBe(true);
  // A prospective offer is prepared at the current clock; answer and admission
  // are real producers. No old archive is regenerated or backdated.
  const q={id:1,offeredAt:w.tick,expiresAt:w.tick+1800,name:'Mira',profile:0 as const,
    joinDelay:60,raidDelay:250,status:'offered' as const};
  w.quests!.serial=1;w.quests!.entries=[q];
  expect(applyCommand(w,{type:'answer-quest',questId:1,accept:true}).ok).toBe(true);
  for(let i=0;i<65&&w.quests!.entries[0]!.arrivedAt===undefined;i++)stepWorld(w);
  const record=w.quests!.entries[0]!,p=w.pawns.find(p=>p.id===record.pawnId);
  if(!p)throw Error('Real quest admission missing');
  delete p.health;delete p.background;delete p.traits;p.hunger=95;p.rest=95;p.recreation.level=100;
  p.schedule.fill('work');p.apparelAutomation=false;
  for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  expect(p.originQuestId).toBe(record.id);checkpoint(w);return {w,p,record};
}
/** Only the final movement frontier is prepared. tryGroupDeparture performs
 * the actual atomic transfer of original people, items and departure baseline. */
function depart(w:World,members:Pawn[]) {
  addMaterial(w,'food',members.length,{type:'inventory',pawnId:members[0]!.id},'survival-meal');
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  expect(applyCommand(w,{type:'group-start',memberIds:members.map(p=>p.id),destination:w.planet!.civilianTile,sources:[]}).ok).toBe(true);
  const g=w.group;if(!g||!('exits' in g))throw Error('Missing real group formation');
  g.phase='leaving';
  for(const exit of g.exits){
    const p=w.pawns.find(p=>p.id===exit.pawnId)!;if(!exit.cell)throw Error('Missing legal exit');
    p.x=exit.cell.x;p.z=exit.cell.z;p.state='idle';p.path=[];p.moveCooldown=0;p.planCooldown=0;delete p.motion;
  }
  tryGroupDeparture(w);
  const away=w.group;if(!away||!('members' in away))throw Error('Atomic original-owner departure missing');
  // Prepare a stationary site, not a claim that the geographic route was played.
  away.phase='at-site';away.tile=w.planet!.civilianTile;away.destination=away.tile;away.route=[away.tile];away.segment=null;away.stop={kind:'at-site'};
  checkpoint(w);return away;
}

test('shared raw record guards reject malformed JSON owner/mode/phase and dates without coercion or snapshot mutation',()=>{
  const w=camp(),p=w.pawns[0]!,shirt=w.piles.find(i=>i.owner.type==='apparel'&&i.owner.pawnId===p.id)!;
  const hostileConversion={toString:0,valueOf:0};
  const badPile=structuredClone(shirt);raw(badPile.owner).type=hostileConversion;
  expect(()=>validatePileRecordShape(raw(badPile),w,w.schemaVersion)).not.toThrow();
  expect(validatePileRecordShape(raw(badPile),w,w.schemaVersion).length).toBeGreaterThan(0);
  refuses(w,bad=>{raw(bad.piles.find(i=>i.id===shirt.id)!.owner).type=hostileConversion;});
  const prisoner={capturedAt:w.tick,initialResistance:7,resistance:7,mode:'maintain',rng:1,chatDay:prisonDay(w),chatCount:0};
  for(const patch of [{mode:hostileConversion},{mode:['maintain']},{capturedAt:hostileConversion},{lastChatTick:hostileConversion}]){
    const pawn=structuredClone(p);raw(pawn).prisoner={...prisoner,...patch};
    expect(()=>validatePawnRecordShape(raw(pawn),w,w.schemaVersion)).not.toThrow();
    expect(validatePawnRecordShape(raw(pawn),w,w.schemaVersion).length).toBeGreaterThan(0);
    refuses(w,bad=>{raw(bad.pawns[0]!).prisoner={...prisoner,...patch};});
  }
  const ward={kind:'chat',patientId:w.pawns[1]!.id,spot:{x:p.x,z:p.z},phase:hostileConversion,progress:0,rapports:0};
  const pawn=structuredClone(p);raw(pawn).ward=ward;
  expect(()=>validatePawnRecordShape(raw(pawn),w,w.schemaVersion)).not.toThrow();
  expect(validatePawnRecordShape(raw(pawn),w,w.schemaVersion).length).toBeGreaterThan(0);
  refuses(w,bad=>{raw(bad.pawns[0]!).ward=ward;});
});

test.each(['scout','group'] as const)('quest provenance follows the actual %s original and rejects forged IDs/references',kind=>{
  const {w,p,record}=joined(),shirt=w.piles.find(i=>i.owner.type==='apparel'&&i.owner.pawnId===p.id)!;
  expect(captureHumanOwners(w).byId.get(p.id)?.kind).toBe('map');
  if(kind==='group')depart(w,[p,w.pawns.find(q=>q.id!==p.id)!]);
  else {
    const cell=nearbyGround(w,p).find(c=>Math.abs(c.x-p.x)+Math.abs(c.z-p.z)<=1&&groundCapacity(w,c,'survival-meal')>=2);
    if(!cell)throw Error('Quest arrival has no physical adjacent ration cell');
    addMaterial(w,'food',2,{type:'ground',...cell},'survival-meal');
    const food=w.piles.find(i=>i.item==='survival-meal'&&i.owner.type==='ground'&&i.owner.x===cell.x&&i.owner.z===cell.z)!;
    expect(applyCommand(w,{type:'scout-start',pawnId:p.id,pileId:food.id,quantity:2}).ok).toBe(true);
    for(let i=0;i<140&&w.scout?.phase!=='travelling';i++)stepWorld(w);
    if(!w.scout||!('pawn' in w.scout))throw Error('Actual scout departure missing');
    expect(w.scout.pawn).toBe(p);expect(w.scout.items).toContain(shirt);
  }
  const owners=captureHumanOwners(w),slot=owners.byId.get(p.id)!;
  expect(slot.kind).toBe(kind==='group'?'group-away':'scout-away');expect(slot.pawn).toBe(p);expect(slot.items).toContain(shirt);
  expect(owners.slots.filter(s=>s.id===p.id)).toHaveLength(1);expect(w.pawns).not.toContain(p);
  expect(validateQuests(w,w.schemaVersion)).toEqual([]);const twin=checkpoint(w);
  stepWorld(w,3);stepWorld(twin,3);expect(w).toEqual(twin);checkpoint(w);
  refuses(w,bad=>{const owner=captureHumanOwners(bad).byId.get(p.id)!.pawn!;owner.originQuestId=record.id+1;});
  refuses(w,bad=>{bad.quests!.entries[0]!.pawnId=shirt.id;});
  const badDate=structuredClone(w);raw(badDate.quests!.entries[0]!).arrivedAt={toString:0,valueOf:0};
  expect(()=>validateQuests(badDate,badDate.schemaVersion)).not.toThrow();expect(validateQuests(badDate,badDate.schemaVersion).length).toBeGreaterThan(0);
});

test('group namespace counts every original occurrence and exact baseline quantity independently of contact receipts',()=>{
  const w=camp(),members=w.pawns.slice(0,2),g=depart(w,members);
  expect(g.ledger.foodLoaded).toBe(0);expect(g.baseline.food).toBe(2);
  expect(ensureCommercialPost(w)).toBe(true);checkpoint(w);
  const food=g.items.find(i=>i.item==='survival-meal')!,shirt=g.items.find(i=>i.owner.type==='apparel')!,postId=w.civilianPost!.stock[0]!.id;
  const mutations:((bad:World)=>void)[]=[
    bad=>{bad.pawns.push((bad.group as AwayGroup).members[0]!);},
    bad=>{(bad.group as AwayGroup).items.push(structuredClone((bad.group as AwayGroup).items.find(i=>i.id===shirt.id)!));},
    bad=>{(bad.group as AwayGroup).items.find(i=>i.id===shirt.id)!.id=postId;},
    bad=>{(bad.group as AwayGroup).items.find(i=>i.id===food.id)!.quantity++;},
    bad=>{(bad.group as AwayGroup).baseline.food--;},
    bad=>{(bad.group as AwayGroup).members[0]!.social={rng:1,memories:[{otherId:postId,kind:'chitchat',at:bad.tick,offset:1}]};},
  ];
  for(const mutate of mutations)refuses(w,mutate);
  // JSON omits own undefined properties. In-memory and structured transport
  // must still reject the foreign passive field without pretending it survives JSON.
  refuses(w,bad=>{raw((bad.group as AwayGroup).members[0]!).shooting=undefined;},false);
  const bad=structuredClone(w);(bad.group as AwayGroup).items.find(i=>i.id===food.id)!.quantity++;
  expect(validateGroupState(bad,bad.schemaVersion)).toContain('Invalid group baseline conservation.');
  const before=JSON.stringify(w);captureHumanOwners(w);expect(JSON.stringify(w)).toBe(before);
});

test('actual group care, clinical death and frozen possessions preserve quest/family/social clocks through later ticks and replay',()=>{
  const {w,p}=joined(),sibling=w.pawns.find(q=>q.id!==p.id)!;
  expect(tryAddRelationship(w,{kind:'sibling',aId:Math.min(p.id,sibling.id),bId:Math.max(p.id,sibling.id),recordedAt:w.tick})).toBe(true);
  addMaterial(w,'medicine',1,{type:'inventory',pawnId:sibling.id},'medicine');
  const medicine=w.piles.find(i=>i.item==='medicine'&&i.owner.type==='inventory'&&i.owner.pawnId===sibling.id)!;
  const g=depart(w,[p,sibling]);
  p.health=createMedicalRecord(w.tick);addResolvedInjury(p.health,'left-hand','cut',1000,()=>.999999);p.medicalCare='industrial';
  checkpoint(w);
  for(let i=0;i<125&&g.ledger.medicineUsed===0;i++)stepWorld(w);
  expect(g.ledger.medicineUsed).toBe(1);expect(g.items.some(i=>i.id===medicine.id)).toBe(false);
  expect(p.health.injuries[0]!.tended).toBeDefined();checkpoint(w);
  // A fresh real bleed is lethal at the next six-tick clinical phase. The
  // terminal keeps a memory that will expire only after its frozen death clock.
  p.health=createMedicalRecord(w.tick);addResolvedInjury(p.health,'right-hand','cut',6000,()=>.999999);p.health.bloodLoss=BLOOD_UNIT-1;p.medicalCare='none';
  expect(medicalBleed(p.health)).toBeGreaterThanOrEqual(.1);
  p.memories=[{kind:'ate-without-table',expiresAt:w.tick+7}];
  const status=medicalStatus(p.health);p.state=status==='mobile'?'idle':status;
  checkpoint(w);
  for(let i=0;i<6&&!w.groupLosses?.some(l=>l.pawn.id===p.id);i++)stepWorld(w);
  const loss=w.groupLosses?.find(l=>l.pawn.id===p.id);if(!loss)throw Error('Real terminal transfer missing');
  expect(loss.pawn).toBe(p);expect(loss.tick).toBe(p.health.death!.tick);
  expect(sibling.familyBereavement).toContainEqual({otherId:p.id,kind:'sibling-died',at:loss.tick});
  const terminal=JSON.stringify(loss),slot=captureHumanOwners(w).byId.get(p.id)!;
  expect(slot).toMatchObject({kind:'group-loss',status:'dead',validationTick:loss.tick,deathAt:loss.tick});
  expect(validateQuests(w,w.schemaVersion)).toEqual([]);const twin=checkpoint(w);
  stepWorld(w,10);stepWorld(twin,10);expect(w).toEqual(twin);expect(JSON.stringify(loss)).toBe(terminal);
  expect(loss.pawn.memories[0]!.expiresAt).toBeLessThanOrEqual(w.tick);checkpoint(w);
  refuses(w,bad=>{bad.groupLosses![0]!.tick++;});
  refuses(w,bad=>{bad.groupLosses![0]!.pawn.originQuestId=2;});
  refuses(w,bad=>{bad.relationships!.links.find(l=>l.kind==='sibling'&&[l.aId,l.bId].includes(p.id))!.recordedAt=loss.tick+1;});
  const late=structuredClone(w);late.relationships!.links.find(l=>l.kind==='sibling'&&[l.aId,l.bId].includes(p.id))!.recordedAt=loss.tick+1;
  expect(validateRelationshipWorld(late,late.schemaVersion)).toContain('Invalid family bereavement memory.');
});
