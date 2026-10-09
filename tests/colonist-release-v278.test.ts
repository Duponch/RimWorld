import {expect,test} from 'vitest';
import {recruitmentUiFixture} from './scenarios/prison-camp.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {applyDraftCommand} from '../src/sim/drafting.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {releaseProposal,startPrisonerRelease} from '../src/sim/prisoner-release.ts';
import {prisonRoom} from '../src/sim/prison-space.ts';
import {adoptPrisonBreaks,prisonBreakMtbDays} from '../src/sim/prison-break.ts';
import {exitPrisoner} from '../src/sim/prisoner-exit.ts';
import {injurePawn} from '../src/sim/health.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';

function fixture(){
  const f=recruitmentUiFixture(),w=f.world,a=w.pawns.find(p=>p.id===f.actorId)!,p=w.pawns.find(p=>p.id===f.patientId)!;
  p.faction='colony';p.name='Colon détenu';p.prisoner!.mode='maintain';a.priorities.warden=1;
  return {w,a,p};
}

test('a detained colonist keeps membership but cannot receive tactical or civil orders',()=>{
  const {w,p}=fixture(),before=structuredClone(w);expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(false);
  expect(applyDraftCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(false);
  expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'build',value:1}).ok).toBe(false);
  expect(applyCommand(w,{type:'clear-orders',pawnId:p.id}).ok).toBe(false);
  expect(w).toEqual(before);
  expect(applyCommand(w,{type:'medical-care',pawnId:p.id,care:'herbal'}).ok).toBe(true);
  expect(p.medicalCare).toBe('herbal');
});

test('membership and past recruitment survive detention without inventing a second recruitment',()=>{
  const {w,p}=fixture();p.recruitment={capturedAt:w.tick-10,recruitedAt:w.tick-5,fromFaction:'outlaws'};
  const before=structuredClone(w);
  for(const mode of ['reduce','recruit'] as const)expect(applyCommand(w,{type:'prisoner-mode',patientId:p.id,mode}).ok).toBe(false);
  expect(w).toEqual(before);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('an existing real bereavement memory remains with its colony owner during detention',()=>{
  const {w,p}=fixture(),status=p.prisoner!;delete p.prisoner;p.bedId=null;
  const friend=w.pawns.find(q=>q!==p&&q.name==='Médecin témoin')!;
  p.social??={rng:1,memories:[]};p.social.memories.push({otherId:friend.id,kind:'deep-talk',at:w.tick,offset:20});
  injurePawn(w,friend,'heart','bruise',15000);expect(p.bereavement).toHaveLength(1);
  const memory=structuredClone(p.bereavement);p.prisoner=status;
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(p.bereavement).toEqual(memory);
});

test('local release needs a reachable cell outside prison, even when no border can be reached',()=>{
  const {w,a,p}=fixture();p.prisoner!.mode='release';
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(!x||!z||x===w.width-1||z===w.height-1)w.tiles[z*w.width+x]!.terrain='water';
  const before=structuredClone(w),proposal=releaseProposal(w,a,p,reachableCells(w,a,blockedCells(w),new Set()));
  expect(proposal).toBeDefined();expect(proposal!.task.release!.drop).toEqual(proposal!.task.release!.exit);
  expect(prisonRoom(w,proposal!.task.release!.drop)).toBeUndefined();expect(w).toEqual(before);
});

test('release physically carries the same person out and restores freedom after an exact carry replay',()=>{
  const {w,a,p}=fixture();p.prisoner!.mode='release';
  const id=p.id,skills=structuredClone(p.skills),recruitment={capturedAt:w.tick-10,recruitedAt:w.tick-5,fromFaction:'outlaws' as const};
  p.recruitment=recruitment;
  const proposal=releaseProposal(w,a,p,reachableCells(w,a,blockedCells(w),new Set()))!;
  startPrisonerRelease(a,proposal);
  for(let i=0;i<400&&a.rescue?.phase!=='carry';i++)stepWorld(w);
  expect(a.rescue?.phase).toBe('carry');expect(p.prisoner).toBeDefined();expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<400&&p.prisoner;i++){stepWorld(w);stepWorld(copy);}
  expect(p.prisoner).toBeUndefined();expect(copy).toEqual(w);expect(w.pawns.find(q=>q.id===id)).toBe(p);
  expect(p.faction).toBe('colony');expect(p.recruitment).toEqual(recruitment);expect(p.skills).toEqual(skills);
  expect(prisonRoom(w,p)).toBeUndefined();expect(w.prisonDepartures??[]).toEqual([]);expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'draft',pawnIds:[id],enabled:true}).ok).toBe(true);
});

test('local detention does not create a revolt or export a truncated colony person',()=>{
  const {w,p}=fixture(),before=structuredClone(w);adoptPrisonBreaks(w);
  expect(prisonBreakMtbDays(w,p)).toBe(-1);expect(p.prisoner!.breakout).toBeUndefined();expect(w).toEqual(before);
  p.prisoner!.escape={x:0,z:0};p.x=0;p.z=0;p.motion=null;p.moveCooldown=0;p.path=[];
  expect(exitPrisoner(w,p)).toBe(false);expect(w.pawns).toContain(p);expect(w.prisonDepartures??[]).toEqual([]);
  expect(validateWorld(w).length).toBeGreaterThan(0);
});
