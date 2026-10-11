import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/index';
import {actorNotificationTarget,objectNotificationTarget,NotificationFocusCycle,personNotificationTarget,pileNotificationTarget} from '../src/ui/notification-focus';
import {raidNotificationTargets} from '../src/ui/raids';
import {fixtureBuilding} from './scenarios/deconstruction';
import {scytherCamp} from './scenarios/scyther-v213';
import {createMechaMedicalRecord} from '../src/sim/mechanoid-health';

test('V319 cycles keep independent cursors across confirmed replacement snapshots',()=>{
  const cycle=new NotificationFocusCycle(),targets=[1,2,3].map(actorNotificationTarget);
  expect(cycle.next('cold',targets)).toEqual(targets[0]);expect(cycle.next('bleed',targets)).toEqual(targets[0]);
  expect(cycle.next('cold',structuredClone(targets))).toEqual(targets[1]);expect(cycle.next('cold',targets)).toEqual(targets[2]);expect(cycle.next('cold',targets)).toEqual(targets[0]);
});
test('V319 removing the last focused member chooses its surviving successor, additions do not restart the ring',()=>{
  const cycle=new NotificationFocusCycle(),targets=[1,2,3,4].map(actorNotificationTarget);
  cycle.next('cold',targets);cycle.next('cold',targets);
  expect(cycle.next('cold',[targets[0]!,targets[2]!,targets[3]!,actorNotificationTarget(5)])).toEqual(targets[2]);
  expect(cycle.next('cold',[targets[0]!,targets[3]!,actorNotificationTarget(5)])).toEqual(targets[3]);
});
test('V319 duplicate targets are visited once and removal of the entire old cohort starts the real new cohort',()=>{
  const cycle=new NotificationFocusCycle(),first=actorNotificationTarget(1),second=actorNotificationTarget(2);
  expect(cycle.next('fire',[first,first,second])).toEqual(first);expect(cycle.next('fire',[first,first,second])).toEqual(second);
  expect(cycle.next('fire',[])).toBeUndefined();expect(cycle.next('fire',[actorNotificationTarget(9)])).toEqual(actorNotificationTarget(9));
});
test('V319 reset starts every cursor afresh after a different colony is loaded',()=>{
  const cycle=new NotificationFocusCycle(),targets=[1,2].map(actorNotificationTarget);cycle.next('cold',targets);cycle.next('cold',targets);cycle.reset();
  expect(cycle.next('cold',targets)).toEqual(targets[0]);
});
test('V319 a dead human targets their physical loose pile and keeps their logical identity',()=>{
  const w=createWorld(319,32,32),p=w.pawns[0]!;p.state='dead';p.body={observedAt:w.tick,pileId:w.nextId++};
  const pile={id:p.body.pileId!,kind:'corpse' as const,item:'human-corpse' as const,quantity:1,owner:{type:'ground' as const,x:8,z:9},humanCorpse:{pawnId:p.id}};w.piles.push(pile);
  expect(personNotificationTarget(w,p.id)).toEqual(objectNotificationTarget('pile',pile.id,pile.owner,`actor:${p.id}`));
  expect(personNotificationTarget(w,p.id)?.key).toBe(actorNotificationTarget(p.id).key);
});
test('V319 carried and buried bodies focus the actual carrier and grave, never the obsolete actor cell',()=>{
  const w=createWorld(319,32,32),p=w.pawns[0]!,carrier=w.pawns[1]!;p.state='dead';p.body={observedAt:w.tick,pileId:w.nextId++};
  const pile={id:p.body.pileId!,kind:'corpse' as const,item:'human-corpse' as const,quantity:1,owner:{type:'pawn' as const,pawnId:carrier.id},humanCorpse:{pawnId:p.id}};w.piles.push(pile);
  expect(personNotificationTarget(w,p.id)).toEqual({...actorNotificationTarget(carrier.id),key:`actor:${p.id}`});
  const grave=fixtureBuilding(w,'grave',12,13);w.piles[w.piles.findIndex(i=>i.id===pile.id)]= {...pile,owner:{type:'grave',graveId:grave.id}};
  expect(personNotificationTarget(w,p.id)).toEqual(objectNotificationTarget('structure',grave.id,grave,`actor:${p.id}`));
});
test('V319 missing/consumed bodies cannot target stale positions and dead actors awaiting deposition stay locatable',()=>{
  const w=createWorld(319,32,32),p=w.pawns[0]!;p.state='dead';
  expect(personNotificationTarget(w,p.id)).toEqual(actorNotificationTarget(p.id));
  p.body={observedAt:w.tick,pileId:w.nextId++};expect(personNotificationTarget(w,p.id)).toBeUndefined();
  p.body={observedAt:w.tick,lostAt:w.tick};expect(personNotificationTarget(w,p.id)).toBeUndefined();
});
test('V319 unknown carrier/grave owners and inventory owners do not fabricate a map location',()=>{
  const w=createWorld(319,32,32),pile=w.piles[0]!;
  expect(pileNotificationTarget(w,{...pile,owner:{type:'pawn',pawnId:999999}})).toBeUndefined();
  expect(pileNotificationTarget(w,{...pile,owner:{type:'grave',graveId:999999}})).toBeUndefined();
  expect(pileNotificationTarget(w,{...pile,owner:{type:'inventory',pawnId:w.pawns[0]!.id}})).toBeUndefined();
});
test('V319 Assaut terminé retains the downed exact group and excludes previous or escaped raiders',()=>{
  const w=createWorld(319,32,32),first=w.pawns[0]!,other=w.pawns[1]!;first.raid={group:7,exiting:false,goal:null};first.state='downed';other.raid={group:6,exiting:false,goal:null};
  w.raids={profile:'camp-raids-v1',rng:1,nextCheck:100,serial:7,completed:1,departed:[],last:{id:7,tick:w.tick,reason:'defended',killed:0,downed:1,escaped:1}};
  expect(raidNotificationTargets(w)).toEqual([actorNotificationTarget(first.id)]);
  w.pawns=w.pawns.filter(p=>p.id!==first.id);expect(raidNotificationTargets(w)).toEqual([]);
});
test('V319 completed human raid focuses the original loose corpse, then safely disappears on loss',()=>{
  const w=createWorld(319,32,32),p=w.pawns[0]!;p.state='dead';p.raid={group:7,exiting:false,goal:null};p.body={observedAt:w.tick,pileId:w.nextId++};
  w.piles.push({id:p.body.pileId!,kind:'corpse',item:'human-corpse',quantity:1,owner:{type:'ground',x:8,z:9},humanCorpse:{pawnId:p.id}});
  w.raids={profile:'camp-raids-v1',rng:1,nextCheck:100,serial:7,completed:1,departed:[],last:{id:7,tick:w.tick,reason:'defended',killed:1,downed:0,escaped:0}};
  expect(raidNotificationTargets(w)[0]).toMatchObject({kind:'object',object:{kind:'pile',id:p.body.pileId},cell:{x:8,z:9}});
  p.body.lostAt=w.tick;expect(raidNotificationTargets(w)).toEqual([]);
});
test('V319 an observed mechanical group follows original IDs into carcasses without borrowing unrelated bodies',()=>{
  const {world:w,actor}=scytherCamp(),id=actor.id;actor.raid={group:4,goal:null};actor.state='downed';
  w.raids={profile:'cassandra-raids-v1',rng:1,nextCheck:null,serial:4,completed:0,departed:[],mechActive:{id:4,startedAt:0,members:[id],lost:[],phase:'assault',stage:{point:{x:8,z:8},activatedAtCore:0,delayCore:0},composition:{budget:100,roster:['scyther']}}};
  expect(raidNotificationTargets(w)).toEqual([actorNotificationTarget(id)]);
  delete w.raids.mechActive;w.raids.last={id:4,tick:w.tick,reason:'defended',mechanoid:true,killed:1,downed:0,escaped:0};w.mechanoids=[];
  w.piles.push({id,kind:'mech-corpse',item:'scyther-corpse',quantity:1,owner:{type:'ground',x:9,z:9},mechCorpse:{mechKind:'scyther',health:createMechaMedicalRecord(w.tick)}});
  expect(raidNotificationTargets(w,{id:4,mechanical:true,members:[id]})[0]).toMatchObject({kind:'object',object:{kind:'pile',id},cell:{x:9,z:9}});
  expect(raidNotificationTargets(w)).toEqual([]);expect(raidNotificationTargets(w,{id:3,mechanical:true,members:[id]})).toEqual([]);
});
