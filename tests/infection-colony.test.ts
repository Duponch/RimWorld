import { writeFileSync } from 'node:fs';
import { expect,onTestFailed,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { INFECTION_UNIT } from '../src/sim/infection-rules.ts';
import { infectionNextTendCore } from '../src/sim/infection-state.ts';
import { infectionPercent } from '../src/ui/infection-inspection.ts';
import { infectionCamp,infectionDecisions,infectionSummary } from './scenarios/infection-player.ts';
import type { World } from '../src/sim/types.ts';

test('infection inspection never labels rounded immunity as actually won',()=>{
  expect(infectionPercent(INFECTION_UNIT-1)).toBe('99.9 %');
  expect(infectionPercent(INFECTION_UNIT)).toBe('100.0 %');
  expect(infectionPercent(1_000_000)).toBe('0.1 %');
});

test('real encounter, delayed infection, repeated physical care, immunity and convalescence',()=>{
  const version=process.env.VALIDATION_VERSION??'v81',seed=11;
  let w=infectionCamp(seed);const start=w.tick,patientId=w.pawns[0]!.id,enemyId=w.pawns[3]!.id;
  const initial=infectionSummary(w),milestones:Record<string,number>={},journal:{tick:number;reason:string;command:unknown}[]=[],
    observations:ReturnType<typeof infectionSummary>[]=[],care:{tick:number;id:number;quality:number;expiresAtCore:number}[]=[],
    checkpointPaths:Record<string,string>={},ledger={medicine:0,food:0,patientMeals:0,patientBedRest:0,doctorSleep:0};
  const seenTends=new Set<string>();let sawRisk=false,sawRealGunshot=false;
  expect(w.pawns.every(p=>!p.health)).toBe(true);expect(validateWorld(w)).toEqual([]);
  const checkpoint=(name:string)=>{
    if(checkpointPaths[name])return;
    const file=`tmp/infection-${name}-${version}.json`;writeFileSync(file,serializeWorld(w));checkpointPaths[name]=file;
  };
  onTestFailed(()=>writeFileSync(`tmp/infection-failed-${version}.json`,JSON.stringify({world:serializeWorld(w),initial,milestones,journal,care,ledger,checkpointPaths,final:infectionSummary(w)},null,2)));
  const mark=(name:string,yes:boolean)=>{if(yes&&milestones[name]===undefined)milestones[name]=w.tick;};
  const advance=(state:World)=>{
    if(state.tick%10===0)for(const d of infectionDecisions(state))expect(applyCommand(state,d.command),JSON.stringify({tick:state.tick,d})).toMatchObject({ok:true});
    stepWorld(state);
  };
  const observe=()=>{
    const summary=infectionSummary(w);observations.push(summary);
    const context=JSON.stringify({tick:w.tick,milestones,ledger,patient:summary.pawns[0]});
    expect(validateWorld(w),context).toEqual([]);
    expect(summary.medicine+ledger.medicine,context).toBe(initial.medicine);
    expect(summary.food+ledger.food,context).toBe(initial.food);
    expect(w.pawns.slice(0,3).every(p=>p.state!=='dead'&&p.hunger>0),context).toBe(true);
    expect(w.pawns.find(p=>p.id===enemyId),context).toBeDefined();
  };
  while(w.tick<start+30000) {
    const before=w.pawns[0]!,active=before.health?.infections?.cases[0];
    if(active?.tend&&before.health!.infections!.immunity<INFECTION_UNIT&&w.tick*10<infectionNextTendCore(active)&&infectionNextTendCore(active)-w.tick*10<=100)checkpoint('renewal');
    if(w.tick%10===0)for(const d of infectionDecisions(w)) {
      expect(applyCommand(w,d.command),JSON.stringify({tick:w.tick,d})).toMatchObject({ok:true});journal.push({tick:w.tick,...d});
    }
    stepWorld(w);const p=w.pawns[0]!,doctor=w.pawns[2]!,state=p.health?.infections;
    sawRisk ||= !!p.health?.injuries.some(i=>i.infection);sawRealGunshot ||= !!p.health?.injuries.some(i=>i.kind==='gunshot');
    mark('wounded',!!p.health?.injuries.length);mark('downed',p.state==='downed');
    mark('rescued',p.need?.kind==='sleep'&&p.need.bedId!==null);
    if(p.need?.kind==='sleep'&&p.need.bedId!==null)ledger.patientBedRest++;
    if(doctor.state==='sleeping')ledger.doctorSleep++;
    for(const e of w.events)if(e.tick===w.tick) {
      if(e.message.includes(' a traité ')&&e.message.endsWith('avec Médicaments.'))ledger.medicine++;
      const meal=e.message.match(/a mangé une portion \((\d+) ×/);
      if(meal){ledger.food+=Number(meal[1]);if(e.message.startsWith(`${p.name} a mangé`))ledger.patientMeals++;}
    }
    if(state?.cases.length) {
      mark('infection',true);checkpoint('declaration');
      for(const c of state.cases)if(c.tend&&!seenTends.has(`${c.id}:${c.tend.expiresAtCore}`)) {
        seenTends.add(`${c.id}:${c.tend.expiresAtCore}`);care.push({tick:w.tick,id:c.id,...c.tend});
        mark('firstInfectionCare',true);if(care.filter(x=>x.id===c.id).length>=2)mark('repeatedInfectionCare',true);
      }
      if(state.immunity===INFECTION_UNIT){mark('immune',true);checkpoint('immune');}
      if(state.immunity===INFECTION_UNIT&&state.cases.every(c=>c.severity<=10_000_000))checkpoint('near-recovery');
    } else if(milestones.infection!==undefined){mark('recovered',true);checkpoint('recovered');}
    if(w.tick%250===0)observe();
    if(w.tick%6000===0) {
      const saved=serializeWorld(w),a=structuredClone(w),b=deserializeWorld(saved);
      for(let t=0;t<80;t++){advance(a);advance(b);}expect(serializeWorld(a)).toBe(serializeWorld(b));
      const c=deserializeWorld(serializeWorld(a));advance(a);advance(c);expect(serializeWorld(c)).toBe(serializeWorld(a));
    }
    if(milestones.recovered!==undefined)break;
  }
  observe();const final=infectionSummary(w),context=JSON.stringify({milestones,care,ledger,final});
  writeFileSync(`artifacts/infection-colony-${version}.json`,JSON.stringify({seed,start,initial,milestones,care,ledger,journal,observations,checkpointPaths,final,provenance:'Prepared clinic, initially healthy combatants, actual hostile shots and unchanged natural infection rolls.'},null,2));
  expect(sawRisk&&sawRealGunshot,context).toBe(true);
  for(const key of ['wounded','downed','rescued','infection','firstInfectionCare','repeatedInfectionCare','immune','recovered'])expect(milestones[key],context).toBeGreaterThan(start);
  expect(milestones.infection!-milestones.wounded!,context).toBeGreaterThanOrEqual(1500);
  expect(milestones.recovered!,context).toBeGreaterThan(milestones.immune!);
  expect(care.filter(c=>c.id===care[0]!.id).length,context).toBeGreaterThanOrEqual(2);
  expect(ledger.patientMeals,context).toBeGreaterThanOrEqual(2);expect(ledger.patientBedRest,context).toBeGreaterThan(500);expect(ledger.doctorSleep,context).toBeGreaterThan(0);
  expect(final.medicine,context).toBeGreaterThan(0);expect(final.pawns[2]!.medicalXp,context).toBeGreaterThan(initial.pawns[2]!.medicalXp);
  expect(final.pawns[0]!.infection?.cases,context).toEqual([]);expect(final.pawns[0]!.infection?.immunity,context).toBeGreaterThan(0);
  expect(w.pawns.find(p=>p.id===patientId)!.state,context).not.toBe('dead');
},120000);
