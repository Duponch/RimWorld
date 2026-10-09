import { expect,test } from 'vitest';
import { cleanlinessCamp,enclosedRoom } from './scenarios/cleanliness';
import { queryOrderOptions,orderReadiness } from '../src/sim/player-orders';
import { createPrisonerState } from '../src/sim/prisoner-state';
import { prisonerInteractionModes,prisonerReleaseInspection } from '../src/ui/prisoner-inspection';
import { tacticalPawns } from '../src/ui/order-menu';
import { HUMAN_YEAR_TICKS } from '../src/sim/human-age';
import type { Job,World } from '../src/sim/types';

function fixture(){
  const world=cleanlinessCamp(2),[actor,patient]=world.pawns;
  Object.assign(actor!,{x:13,z:16,faction:'colony',name:'Lou'});Object.assign(patient!,{x:15,z:16,faction:'colony',name:'Iris'});
  for(const p of world.pawns){delete p.background;delete p.draft;delete p.health;p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};}
  actor!.skills.social={level:0,xp:0,dailyXp:0,passion:0};
  patient!.mental={below:[0,0,0],cooldown:0,catharsis:[],crisis:{kind:'sad-wander',age:0,target:null,waitUntil:0}};
  enclosedRoom(world,{x:8,z:8});
  const bed={id:world.nextId++,kind:'bed' as const,x:10,z:10,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,quality:'normal' as const,prisoner:true as const};world.structures.push(bed);
  return {world,actor:actor!,patient:patient!,bed};
}
const options=(f:ReturnType<typeof fixture>,queue=false)=>queryOrderOptions(f.world,f.actor.id,f.patient,queue);

test('query offers a real arrest target with adult chance and leaves the world untouched',()=>{
  const f=fixture(),before=structuredClone(f.world),option=options(f).find(o=>o.arrestPatientId===f.patient.id)!;
  expect(option).toMatchObject({jobId:0,arrestPatientId:f.patient.id,enabled:true});expect(option.label).toContain('Arrêter Iris');expect(option.label).toContain('60 %');expect(f.world).toEqual(before);
  f.actor.skills.social!.level=5;expect(options(f).find(o=>o.arrestPatientId===f.patient.id)!.label).toContain('97,5 %');
});

test('queue, mobilized actor and missing prison expose refusals rather than a promised arrest',()=>{
  const f=fixture();expect(options(f,true).find(o=>o.arrestPatientId===f.patient.id)).toMatchObject({enabled:false,reason:expect.stringMatching(/file/)});
  f.actor.draft={lastActiveTick:f.world.tick,target:null,queue:[]};expect(options(f).find(o=>o.arrestPatientId===f.patient.id)?.enabled).toBe(false);delete f.actor.draft;
  f.world.structures=f.world.structures.filter(s=>s!==f.bed);const option=options(f).find(o=>o.arrestPatientId===f.patient.id)!;expect(option.enabled).toBe(false);expect(option.reason).toMatch(/prison/);
});

test('berserk is an explicitly refused target and ordinary calm colonists are not arrest options',()=>{
  const f=fixture();f.patient.mental!.crisis={kind:'berserk',age:0,target:null,waitUntil:0,targetId:null,jobUntilCore:null};
  expect(options(f).find(o=>o.arrestPatientId===f.patient.id)?.enabled).toBe(false);
  delete f.patient.mental!.crisis;expect(options(f).some(o=>o.arrestPatientId===f.patient.id)).toBe(false);
  f.world.schemaVersion=212 as World['schemaVersion'];f.patient.mental!.crisis={kind:'sad-wander',age:0,target:null,waitUntil:0};expect(options(f).some(o=>o.arrestPatientId!==undefined)).toBe(false);
});

test('colony membership cannot give a detained person work, transport, equipment or tactical menu options',()=>{
  const f=fixture();delete f.patient.mental!.crisis;f.patient.prisoner=createPrisonerState(f.world,f.patient);
  const job:Job={id:f.world.nextId++,kind:'chop',x:f.patient.x,z:f.patient.z,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};f.world.jobs.push(job);
  expect(queryOrderOptions(f.world,f.patient.id,f.patient)).toEqual([]);expect(orderReadiness(f.world,f.patient,job)).toContain('colon libre');expect(orderReadiness(f.world,f.patient,job,true)).toContain('colon libre');
  expect(tacticalPawns(f.world,new Set([f.patient.id]))).toEqual([]);
});

test('a detained colonist offers only maintenance or local release, with no recruitment requirement',()=>{
  const f=fixture();f.patient.prisoner=createPrisonerState(f.world,f.patient);f.patient.prisoner.mode='release';delete f.patient.mental!.crisis;
  expect(prisonerInteractionModes(f.world,f.patient)).toEqual(['maintain','release']);
  const before=structuredClone(f.world),waiting=prisonerReleaseInspection(f.world,f.patient)!;expect(waiting.status).toContain('Attend la prise en charge');expect(waiting.hint).toContain('reste sur cette carte');expect(waiting.hint).toContain('commandes libres après le dépôt');expect(f.world).toEqual(before);
  f.actor.rescue={patientId:f.patient.id,bedId:0,phase:'carry',release:{drop:{x:13,z:13},exit:{x:13,z:13}}};
  expect(prisonerReleaseInspection(f.world,f.patient)!.status).toContain('Lou porte le colon hors de la cellule');
  f.patient.state='downed';delete f.actor.rescue;expect(prisonerReleaseInspection(f.world,f.patient)!.status).toContain('Attend de pouvoir se relever');
});

test('foreign prisoner release keeps the border-departure description and recruitment options',()=>{
  const f=fixture();f.patient.faction='outlaws';f.patient.prisoner=createPrisonerState(f.world,f.patient);f.patient.prisoner.mode='release';delete f.patient.mental!.crisis;
  expect(prisonerInteractionModes(f.world,f.patient)).toContain('recruit');expect(prisonerReleaseInspection(f.world,f.patient)!.hint).not.toContain('reste sur cette carte');
  f.patient.prisoner.releasedAt=f.world.tick;expect(prisonerReleaseInspection(f.world,f.patient)!.status).toContain('Quitte la carte');
});
