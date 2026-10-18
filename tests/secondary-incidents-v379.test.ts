import {legacyCampaignMap} from './helpers/legacy-fixture-guards.ts';
import {createDeteriorationState} from '../src/sim/deterioration-content.ts';
import {expect,test} from 'vitest';
import {preparedCassandraExpedition,incidentCommand} from './scenarios/secondary-incidents-v379.ts';
import {adoptSecondaryIncidents} from '../src/sim/secondary-incidents.ts';
import {secondaryContext,flushSecondaryContext} from '../src/sim/secondary-site-context.ts';
import {campaignPresentation,validCampaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {CASSANDRA_CYCLE_START,CASSANDRA_CYCLE_TICKS,validCassandraAgenda} from '../src/sim/cassandra-raids.ts';
import {VISITOR_FLOWS,VISITOR_YEAR} from '../src/sim/visitor-state.ts';
import {advanceVisitors} from '../src/sim/visitors.ts';
import {advanceRaids} from '../src/sim/raids.ts';
import {raidEntries} from '../src/sim/raid-space.ts';
import {createRaidGroup} from '../src/sim/raid-spawn.ts';
import {createMechanoidRaid,chooseMechanoidOpportunity} from '../src/sim/mechanoid-raids.ts';
import {validateRaids} from '../src/sim/raid-save.ts';
import {validateVisitors} from '../src/sim/visitor-save.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {PresentationChanges} from '../src/bridge/presentation-changes.ts';
import {readStatusAlerts} from '../src/ui/status-alerts.ts';
import {TICKS_PER_DAY,SCHEMA_VERSION,type World} from '../src/sim/types.ts';

const snapshot=(w:World)=>{const packet=structuredClone(new SnapshotEncoder().encode(campaignPresentation(w),0,0,true));if(packet.kind!=='checkpoint')throw Error('Expected full checkpoint');return packet;};
const replay=(w:World)=>{const restored=deserializeWorld(serializeWorld(w));stepWorld(w,7);stepWorld(restored,7);expect(serializeWorld(restored)).toBe(serializeWorld(w));};
function preparedRaid(w:World){
  const sites=raidEntries(w,379,1);expect(sites).not.toBeNull();
  const raid=createRaidGroup(w,{count:1,sites:sites!,random:{rng:w.raids!.rng}});expect(raid).not.toBeNull();return raid!;
}

test('V379 real Cassandra entry adopts no secondary intro, preserves common authority and resumes exact calendars',()=>{
  const {w,local}=preparedCassandraExpedition(),home=JSON.stringify(w.raids),rng=w.rng,nextId=w.nextId;
  expect(local.raids!.profile).toBe('cassandra-raids-v1');expect(local.raids!.cassandra!.cycle).toBe(0);
  expect(local.raids!.cassandra!.pending.every(t=>t>=CASSANDRA_CYCLE_START&&t>w.tick)).toBe(true);
  expect(local.visitors!.introAt).toBeNull();expect(local.visitors!.adoptedAt).toBe(w.secondarySite!.createdAt+1);
  const saved=JSON.stringify([local.raids,local.visitors]);adoptSecondaryIncidents(local);adoptSecondaryIncidents(w);
  expect(JSON.stringify([local.raids,local.visitors])).toBe(saved);expect(JSON.stringify(w.raids)).toBe(home);
  expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(local.raids!.mechanoid!.ranged).toBeDefined();
  expect(validateWorld(w)).toEqual([]);replay(w);
});

test.each([100,1_000_000])('V379 late day%s adoption jumps directly past begun windows without simulation RNG/actor draws',day=>{
  const {w,local}=preparedCassandraExpedition();w.tick=day*TICKS_PER_DAY;
  delete local.raids;delete local.visitors;const identity={nextId:w.nextId,rng:w.rng,pawns:local.pawns.map(p=>p.id)};
  adoptSecondaryIncidents(local);const a=local.raids!.cassandra!;
  const start=CASSANDRA_CYCLE_START+a.cycle*CASSANDRA_CYCLE_TICKS;
  expect(start).toBeGreaterThan(w.tick);expect(validCassandraAgenda(a,w.tick,242)).toBe(true);
  for(const kind of ['traveler','visitor','exotic'] as const){
    const agenda=local.visitors![kind]!;
    expect(VISITOR_FLOWS[kind].minimum+agenda.cycle*VISITOR_YEAR).toBeGreaterThan(w.tick);
    expect(agenda.pending.every(t=>t>w.tick)).toBe(true);
  }
  expect(local.visitors!.introAt).toBeNull();expect(validateVisitors(local,242,new Set())).toEqual([]);
  expect({nextId:w.nextId,rng:w.rng,pawns:local.pawns.map(p=>p.id)}).toEqual(identity);
  // Focused calendar clock jump only; this case does not claim a valid played
  // million-day colony or migrate/replay the other independent calendars.
});

test('V379 strict241 validates both real maps, migrates neutrally and adopts only when play resumes',()=>{
  const {w}=preparedCassandraExpedition(),old=JSON.parse(serializeWorld(w));old.schemaVersion=241;
  delete old.secondarySite.map.raids;delete old.secondarySite.map.visitors;delete old.deterioration;delete old.secondarySite.map.deterioration;
  // Genuine241 policies predate pemmican248 and tuques245; keep recon241.
  for(const policy of old.foodPolicies)policy.allowed=policy.allowed.filter((id:string)=>id!=='pemmican');
  for(const policy of old.apparelPolicies)policy.allowedItems=policy.allowedItems.filter((id:string)=>id!=='cloth-tuque'&&id!=='muffalo-wool-tuque');
  const restored=deserializeWorld(JSON.stringify(old));expect(restored).toEqual({...old,schemaVersion:SCHEMA_VERSION,deterioration:createDeteriorationState(old.seed,old.tick),secondarySite:{...old.secondarySite,map:{...old.secondarySite.map,deterioration:createDeteriorationState(old.secondarySite.map.seed,old.tick)}}});
  expect(restored.secondarySite!.map.raids).toBeUndefined();expect(restored.secondarySite!.map.visitors).toBeUndefined();
  for(const map of ['home','secondary'] as const){
    const bad=structuredClone(old),target=map==='home'?bad:bad.secondarySite.map;
    target.tiles[0]={terrain:'future-incident-terrain'};expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const future=structuredClone(old);future.campaignMap={incidents:[]};expect(()=>deserializeWorld(JSON.stringify(future))).toThrow();
  const oldHome=JSON.stringify(restored.raids);stepWorld(restored);
  expect(secondaryContext(restored)!.raids?.profile).toBe('cassandra-raids-v1');expect(JSON.stringify(restored.raids)).toBe(oldHome);
  expect(validateWorld(restored)).toEqual([]);replay(restored);
});

test('V379 real raid admissions share IDs, stay physical on their maps, publish bounded remote alerts and switch epochs',()=>{
  const {w,local}=preparedCassandraExpedition();const remote=preparedRaid(local),home=preparedRaid(w);flushSecondaryContext(w);
  const all=[...w.pawns,...local.pawns,...w.piles,...local.piles].map(p=>p.id);expect(new Set(all).size).toBe(all.length);
  expect(w.pawns.some(p=>remote.members.includes(p.id))).toBe(false);expect(local.pawns.some(p=>home.members.includes(p.id))).toBe(false);
  expect(validateWorld(w)).toEqual([]);incidentCommand(w,{type:'secondary-view',site:'home'});
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),packet=structuredClone(encoder.encode(campaignPresentation(w),0,0,true));
  if(packet.kind!=='checkpoint')throw Error('Expected full checkpoint');
  expect(decoder.adopt(packet).status).toBe('applied');expect(packet.world.pawns.some(p=>p.id===remote.members[0])).toBe(false);
  const incident=legacyCampaignMap(packet.world).incidents!.find(i=>i.kind==='raid')!;
  expect(incident).toEqual({site:'secondary',kind:'raid',count:1,actorId:remote.members[0]});
  expect(Object.keys(incident).sort()).toEqual(['actorId','count','kind','site']);expect(packet.world.secondarySite).toBeUndefined();
  expect(readStatusAlerts(packet.world).find(r=>r.key===`campaign:secondary:raid:${remote.members[0]}`)).toMatchObject({targets:[],campaign:{site:'secondary',actorId:remote.members[0]}});
  incidentCommand(w,{type:'secondary-view',site:'secondary'});
  const second=structuredClone(encoder.encode(campaignPresentation(w),0,0,true));expect(second.epoch).toBeGreaterThan(packet.epoch);
  const adopted=decoder.adopt(second);expect(adopted.status).toBe('applied');if(adopted.status==='applied'){expect(adopted.replaced).toBe(true);expect(adopted.world.pawns.some(p=>p.id===incident.actorId)).toBe(true);}
  replay(w);
});

test('V379 failed entry is atomic; empty-map real opportunities are consumed without people or possessions',()=>{
  const {w,local}=preparedCassandraExpedition(),before=serializeWorld(w),id=w.nextId,rng=w.rng;
  expect(createRaidGroup(local,{count:1,sites:[{x:16,z:16}],random:{rng:379}})).toBeNull();expect(serializeWorld(w)).toBe(before);
  expect(createMechanoidRaid(local,{budget:150,roster:['scyther']},{rng:379},[{x:16,z:16}])).toBeNull();expect(w.nextId).toBe(id);expect(w.rng).toBe(rng);
  const due=local.raids!.cassandra!.pending[0]!;w.tick=due;local.pawns=[];local.piles=[];
  const pending=JSON.stringify(local.raids!.cassandra!.pending),visitor=local.visitors!,opportunity=visitor.visitor;if(!opportunity)throw Error('Actual visitor opportunity required');const visitorDue=opportunity.pending[0]!;
  advanceRaids(local);expect(JSON.stringify(local.raids!.cassandra!.pending)).not.toBe(pending);expect(local.raids!.serial).toBe(0);
  w.tick=visitorDue;advanceVisitors(local);expect(opportunity.pending[0]).toBeGreaterThan(visitorDue);expect(visitor.serial).toBe(0);
  expect(local.pawns).toHaveLength(0);expect(local.piles).toHaveLength(0);expect(w.nextId).toBe(id);
  // Isolated incident admissions, no claim that deleting expedition owners
  // or jumping independent clocks forms a valid saved campaign.
});

test('V379 a genuine future secondary raid opportunity uses local defenders and admits owned actors only there',()=>{
  const {w,local}=preparedCassandraExpedition(),home=w.pawns.map(p=>p.id),next=w.nextId,rng=w.rng;
  w.tick=local.raids!.cassandra!.pending[0]!;advanceRaids(local);
  const raid=local.raids!.active;expect(raid).toBeDefined();expect(raid!.composition).toBeDefined();
  expect(raid!.members.length).toBeGreaterThan(0);expect(raid!.members.every(id=>id>=next&&local.pawns.some(p=>p.id===id))).toBe(true);
  expect(w.pawns.map(p=>p.id)).toEqual(home);expect(w.rng).toBe(rng);expect(w.nextId).toBeGreaterThan(next);
  expect(validateRaids(local,242,new Set())).toEqual([]);
  // Isolated calendar opportunity; independent home/climate clocks were not
  // replayed by this explicit time jump and no complete save is claimed here.
});

test('V379 visitors and mechanical producers retain local admissions and common IDs',()=>{
  const {w,local}=preparedCassandraExpedition(),v=local.visitors!,opportunity=v.visitor;if(!opportunity)throw Error('Actual visitor opportunity required');const due=opportunity.pending[0]!;
  w.tick=due;const before=w.nextId;advanceVisitors(local);expect(v.serial).toBeGreaterThan(0);
  const guests=local.pawns.filter(p=>p.visitor);expect(guests.length).toBeGreaterThan(0);expect(guests.every(p=>p.id>=before&&!w.pawns.some(q=>q.id===p.id))).toBe(true);
  expect(validateVisitors(local,242,new Set())).toEqual([]);
  // Mechanical faction admission still owns J45 and points>300. This explicit
  // producer fixture proves entry/identity, not a natural mechanical draw.
  const random={rng:379};w.tick=44*TICKS_PER_DAY;expect(chooseMechanoidOpportunity(local,1000,random)).toBeUndefined();
  w.tick=45*TICKS_PER_DAY;expect(chooseMechanoidOpportunity(local,300,random)).toBeUndefined();
  const sites=raidEntries(local,379,1);expect(sites).not.toBeNull();
  const next=w.nextId,machine=createMechanoidRaid(local,{budget:150,roster:['scyther']},{rng:379},sites!);expect(machine).not.toBeNull();
  expect(machine!.members).toEqual([next]);expect(w.nextId).toBe(next+1);expect(local.mechanoids!.some(m=>m.id===next)).toBe(true);expect(w.mechanoids?.some(m=>m.id===next)??false).toBe(false);
  // The raid agenda is intentionally restored prospectively for this isolated
  // clock-jump guard; no complete-world save is asserted by this case.
  local.raids!.cassandra!.pending=[w.tick+100];local.raids!.cassandra!.cycle=Math.floor((w.tick-CASSANDRA_CYCLE_START)/CASSANDRA_CYCLE_TICKS);
  expect(validateRaids(local,242,new Set())).toEqual([]);
});

test('V379 remote transport rejects future format on241, extra data, duplicate kinds and active-map actor aliases',()=>{
  const {w,local}=preparedCassandraExpedition();preparedRaid(local);flushSecondaryContext(w);incidentCommand(w,{type:'secondary-view',site:'home'});
  const packet=snapshot(w);expect(validCampaignPresentation(packet.world)).toBe(true);
  const values=[
    (p:World)=>{legacyCampaignMap(p).incidents![0]!.count=0;},
    (p:World)=>{legacyCampaignMap(p).incidents![0]!.site='home';},
    (p:World)=>{legacyCampaignMap(p).incidents![0]!.actorId=p.pawns[0]!.id;},
    (p:World)=>{legacyCampaignMap(p).incidents!.push({...legacyCampaignMap(p).incidents![0]!});},
    (p:World)=>{Object.assign(legacyCampaignMap(p).incidents![0]!,{tiles:[]});},
    (p:World)=>{(p as {schemaVersion:number}).schemaVersion=241;},
  ];
  for(const corrupt of values){const bad=structuredClone(packet);corrupt(bad.world);expect(validCampaignPresentation(bad.world)).toBe(false);expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');}
});

test('V379 an off-map admission requests a discrete publication at its own tick even when the visible map has no new event',()=>{
  const {w,local}=preparedCassandraExpedition();incidentCommand(w,{type:'secondary-view',site:'home'});
  const changes=new PresentationChanges(),tick=w.tick,events=JSON.stringify(w.events);
  expect(changes.capture(campaignPresentation(w))).toBe(true);expect(changes.capture(campaignPresentation(w))).toBe(false);
  preparedRaid(local);flushSecondaryContext(w);
  expect(w.tick).toBe(tick);expect(JSON.stringify(w.events)).toBe(events);
  expect(changes.capture(campaignPresentation(w))).toBe(true);expect(changes.capture(campaignPresentation(w))).toBe(false);
});
