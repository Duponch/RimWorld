import { expect,test } from 'vitest';
import { readMoodRiskAlerts } from '../src/ui/mood-risk-alerts';
import { readStatusAlerts,readInspectAlerts } from '../src/ui/status-alerts';
import { actorNotificationTarget,NotificationFocusCycle } from '../src/ui/notification-focus';
import { breakThresholds,type TraitId } from '../src/sim/traits';
import { createMedicalRecord } from '../src/sim/injury-state';
import { createPrisonerState } from '../src/sim/prisoner-state';
import type { World } from '../src/sim/types';
import { medicalCamp } from './scenarios/health';

function camp(count=1):World {
  const w=medicalCamp(count,16);
  for(const p of w.pawns){
    p.mood=65;p.state='idle';p.need=null;
    delete p.traits;delete p.mental;delete p.health;delete p.prisoner;delete p.visitor;delete p.faction;
  }
  return w;
}
const riskRows=(w:World)=>readStatusAlerts(w).filter(r=>r.key.startsWith('mood-risk-'));
const freeze=(value:unknown):void=>{
  if(value===null||typeof value!=='object'||Object.isFrozen(value))return;
  for(const child of Object.values(value))freeze(child);
  Object.freeze(value);
};

test.each([undefined,'steadfast','nervous'] as const)('strict current mood thresholds, including legacy traits: %s',trait=>{
  const w=camp(),p=w.pawns[0]!;if(trait)p.traits=[trait];
  const [minor,major,extreme]=breakThresholds(p);
  for(const [mood,expected] of [[minor,undefined],[minor-1e-8,'mineure'],[major,'mineure'],[major-1e-8,'majeure'],
    [extreme,'majeure'],[extreme-1e-8,'extrême']] as const){
    p.mood=mood;const rows=readMoodRiskAlerts(w);
    if(expected)expect(rows[0]?.text).toBe(`Risque de crise ${expected} · 1 colon`);
    else expect(rows).toEqual([]);
    expect(rows.length).toBeLessThanOrEqual(1);
  }
});

test('optimism and pessimism do not move the break boundary or replace current mood with a target',()=>{
  const w=camp(),p=w.pawns[0]!;
  for(const trait of ['optimist','pessimist'] satisfies TraitId[]){
    p.traits=[trait];p.mood=35;p.hunger=0;p.rest=0;
    expect(readMoodRiskAlerts(w)).toEqual([]);
    p.mood=34.999999;p.hunger=100;p.rest=100;
    expect(readMoodRiskAlerts(w)[0]?.key).toBe('mood-risk-minor');
  }
  // A needs/thoughts inspection would read these memories. The alert must not.
  Object.defineProperty(p,'memories',{get(){throw new Error('Do not calculate the mood target');}});
  expect(readMoodRiskAlerts(w)[0]?.text).toBe('Risque de crise mineure · 1 colon');
});

test('one extreme, two major and three minor people have exclusive counts and critical targets',()=>{
  const w=camp(6),[minor1,major1,minor2,major2,extreme,minor3]=w.pawns;
  for(const p of [minor1!,minor2!,minor3!])p.mood=30;
  for(const p of [major1!,major2!])p.mood=10;extreme!.mood=4;
  w.pawns.reverse();
  const rows=readMoodRiskAlerts(w);expect(rows).toHaveLength(1);
  const row=rows[0]!;expect(row).toMatchObject({key:'mood-risk-high',text:'Risque de crise extrême · 1 colon',tab:'needs'});
  expect(row.targets).toEqual([extreme!,major1!,major2!].map(p=>actorNotificationTarget(p.id)));
  expect(row.tooltip.rows).toEqual([
    {label:'Extrême · 1 colon',value:extreme!.name},
    {label:'Majeure · 2 colons',value:`${major1!.name}, ${major2!.name}`},
    {label:'Mineure · 3 colons',value:`${minor1!.name}, ${minor2!.name}, ${minor3!.name}`},
  ]);
  expect(row.tooltip.body).toContain('seuil personnel');expect(row.tooltip.body).toContain('aléatoire');
  expect(row.tooltip.body).toContain('empêchent son entrée immédiate');
});

test('an extreme title counts extreme people only, independently of the critical target count',()=>{
  const w=camp(4),[major1,extreme1,major2,extreme2]=w.pawns;
  major1!.mood=10;major2!.mood=10;extreme1!.mood=0;extreme2!.mood=4;
  const row=readMoodRiskAlerts(w)[0]!;
  expect(row.text).toBe('Risque de crise extrême · 2 colons');
  expect(row.targets).toEqual([extreme1!,extreme2!,major1!,major2!].map(p=>actorNotificationTarget(p.id)));
});

test('minor warnings return only after all higher risks improve, then disappear at the exact threshold',()=>{
  const w=camp(2),[major,minor]=w.pawns;major!.mood=10;minor!.mood=30;
  expect(riskRows(w).map(r=>r.key)).toEqual(['mood-risk-high']);
  major!.mood=35;const row=riskRows(w)[0]!;
  expect(row).toMatchObject({key:'mood-risk-minor',text:'Risque de crise mineure · 1 colon',tab:'needs'});
  expect(row.targets).toEqual([actorNotificationTarget(minor!.id)]);
  expect(row.tooltip?.rows?.slice(0,2)).toEqual([{label:'Extrême · 0 colon',value:'Aucun'},{label:'Majeure · 0 colon',value:'Aucun'}]);
  minor!.mood=35;expect(riskRows(w)).toEqual([]);
});

test('sleeping, cooldown, drafted pacifists and ordinary workers keep the preventive warning',()=>{
  const w=camp(4),[sleeper,recovering,pacifist,worker]=w.pawns;
  for(const p of w.pawns)p.mood=30;
  sleeper!.state='sleeping';sleeper!.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:sleeper!.x,z:sleeper!.z}};
  recovering!.mental={below:[0,0,0],cooldown:1500,catharsis:[]};
  pacifist!.background={childhood:'quiet-child',adulthood:'medic'};
  pacifist!.draft={lastActiveTick:w.tick,target:null,queue:[]};worker!.state='working';
  expect(readMoodRiskAlerts(w)[0]?.targets).toEqual(w.pawns.map(p=>actorNotificationTarget(p.id)));
  expect(readMoodRiskAlerts(w)[0]?.text).toBe('Risque de crise mineure · 4 colons');
});

type Exclusion='dead'|'clinical-death'|'downed'|'prisoner'|'visitor'|'foreign'|'crisis';
test.each(['dead','clinical-death','downed','prisoner','visitor','foreign','crisis'] satisfies Exclusion[])('no preventive warning for %s',reason=>{
  const w=camp(),p=w.pawns[0]!;p.mood=0;
  if(reason==='dead')p.state='dead';
  else if(reason==='clinical-death'){p.health=createMedicalRecord(w.tick);p.health.death={tick:w.tick,cause:'blood-loss'};}
  else if(reason==='downed')p.state='downed';
  else if(reason==='prisoner')p.prisoner=createPrisonerState(w,p);
  else if(reason==='visitor')p.visitor={group:1,role:'visitor',phase:'staying',goal:null,personalFoodIds:[]};
  else if(reason==='foreign')p.faction='outlanders';
  else p.mental={below:[2100,2100,2100],cooldown:0,catharsis:[],crisis:{kind:'sad-wander',age:0,target:null,waitUntil:w.tick}};
  expect(readMoodRiskAlerts(w)).toEqual([]);expect(riskRows(w)).toEqual([]);
});

test('active crises precede the preventive line, whose people never become inspection threats',()=>{
  const w=camp(3),[crisis,major,minor]=w.pawns;
  crisis!.mood=0;crisis!.mental={below:[2100,2100,2100],cooldown:0,catharsis:[],
    crisis:{kind:'berserk',age:0,target:null,waitUntil:w.tick,targetId:null,jobUntilCore:null}};
  major!.mood=10;minor!.mood=30;
  const rows=readStatusAlerts(w),index=rows.findIndex(r=>r.key==='mood-risk-high');
  expect(rows.findIndex(r=>r.key===`mental:${crisis!.id}`)).toBeLessThan(index);expect(index).toBeGreaterThanOrEqual(0);
  expect(rows[index]?.targets).toEqual([actorNotificationTarget(major!.id)]);
  expect(readInspectAlerts(w)['inspect-threat']?.targets).toEqual([actorNotificationTarget(crisis!.id)]);
  delete crisis!.mental;crisis!.mood=65;expect(readInspectAlerts(w)['inspect-threat']).toBeUndefined();
});

test('minor targets and names are ordered by identity rather than snapshot order or alphabetical order',()=>{
  const w=camp(3),[a,b,c]=w.pawns;a!.name='Z';b!.name='A';c!.name='Z';
  for(const p of w.pawns)p.mood=30;const expected=w.pawns.map(p=>actorNotificationTarget(p.id));w.pawns.reverse();
  const row=readMoodRiskAlerts(w)[0]!;expect(row.targets).toEqual(expected);
  expect(row.tooltip.rows?.[2]).toEqual({label:'Mineure · 3 colons',value:'Z, A, Z'});
});

test('reading frozen confirmed Worlds and their replacement keeps RNG, clocks and absent mental state intact',()=>{
  const w=camp(3);w.pawns[0]!.mood=4;w.pawns[1]!.mood=30;
  w.pawns[1]!.mental={below:[150,0,0],cooldown:1499,catharsis:[w.tick-1]};
  const before=JSON.stringify(w),copy=structuredClone(w);freeze(w);freeze(copy);
  const expected=readMoodRiskAlerts(w);expect(readMoodRiskAlerts(copy)).toEqual(expected);
  expect(riskRows(w)).toEqual(expected);expect(riskRows(copy)).toEqual(expected);
  expect(JSON.stringify(w)).toBe(before);expect(JSON.stringify(copy)).toBe(before);
  expect(w.pawns[0]!.mental).toBeUndefined();expect(w.pawns[1]!.mental?.cooldown).toBe(1499);
  expect(w.pawns[1]!.mental?.catharsis).toEqual([w.tick-1]);
});

test('only the local pawn array is inspected; contained, away and archived owners are not traversed',()=>{
  const w=camp();w.pawns=[];
  for(const field of ['startingArrival','scout','commercialTrip','group','groupLosses','visitors','piles'] as const)
    Object.defineProperty(w,field,{get(){throw new Error(`Do not inspect ${field}`);}});
  expect(readMoodRiskAlerts(w)).toEqual([]);
});

test('the high focus cycle survives major/extreme changes and renames, skips departed IDs, and resets on replacement',()=>{
  const w=camp(3),[a,b,c]=w.pawns;a!.mood=10;b!.mood=10;c!.mood=4;
  const cycle=new NotificationFocusCycle();let row=readMoodRiskAlerts(w)[0]!;
  expect(cycle.next(row.key,row.targets)).toEqual(actorNotificationTarget(c!.id));
  row=readMoodRiskAlerts(structuredClone(w))[0]!;
  expect(cycle.next(row.key,row.targets)).toEqual(actorNotificationTarget(a!.id));
  a!.name='Autre nom';a!.mood=4;row=readMoodRiskAlerts(w)[0]!;
  expect(row.key).toBe('mood-risk-high');expect(row.tab).toBe('needs');
  expect(cycle.next(row.key,row.targets)).toEqual(actorNotificationTarget(c!.id));
  w.pawns=w.pawns.filter(p=>p!==c);row=readMoodRiskAlerts(w)[0]!;
  expect(cycle.next(row.key,row.targets)).toEqual(actorNotificationTarget(b!.id));
  a!.mood=10;row=readMoodRiskAlerts(w)[0]!;expect(row.text).toBe('Risque de crise majeure · 2 colons');
  expect(row.key).toBe('mood-risk-high');expect(cycle.next(row.key,row.targets)).toEqual(actorNotificationTarget(a!.id));
  cycle.reset();expect(cycle.next(row.key,row.targets)).toEqual(actorNotificationTarget(a!.id));
});
