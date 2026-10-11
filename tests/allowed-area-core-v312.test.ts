import { expect,test } from 'vitest';
import { allowedAreaAllows,allowedAreaEffective,allowedAreaReason,captureAllowedArea,releaseAllowedAreaReturn } from '../src/sim/allowed-area-state.ts';
import { medicalCamp } from './scenarios/health.ts';

function camp(){const w=medicalCamp(2,32),p=w.pawns[0]!;const id=w.nextId++;w.allowedAreas=[{id,label:'Village',color:0x123456,cells:[p.z*w.width+p.x]}];p.allowedAreaId=id;return {w,p,id};}
test('membership is captured by cells identity and dimensions; empty and missing assignment are unlimited',()=>{
  const {w,p}=camp(),policy=captureAllowedArea(w,p)!;
  expect(captureAllowedArea(w,p)).toBe(policy);expect(allowedAreaAllows(w,p,p,policy)).toBe(true);
  expect(captureAllowedArea({...w,width:33},p)).not.toBe(policy);expect(captureAllowedArea(w,p)!.has(p.z*w.width+p.x)).toBe(true);
  const outside={x:p.x+1,z:p.z};expect(allowedAreaReason(w,p,outside)).toContain('Hors zone autorisée « Village »');
  w.allowedAreas![0]!.cells=[outside.z*w.width+outside.x];const next=captureAllowedArea(w,p)!;
  expect(next).not.toBe(policy);expect(policy.has(p.z*w.width+p.x)).toBe(true);expect(next.has(p.z*w.width+p.x)).toBe(false);
  w.allowedAreas![0]!.cells=[];expect(captureAllowedArea(w,p)).toBeUndefined();expect(allowedAreaAllows(w,p,outside)).toBe(true);
  delete p.allowedAreaId;expect(captureAllowedArea(w,p)).toBeUndefined();
});
test('draft, mental crisis and actual preparation exempt policy; group/commercial unloading restores it',()=>{
  const {w,p}=camp();p.draft={target:null,queue:[],lastActiveTick:w.tick};expect(captureAllowedArea(w,p)).toBeUndefined();delete p.draft;
  p.mental={below:[0,0,0],cooldown:0,catharsis:[],crisis:{kind:'sad-wander',age:0,target:null,waitUntil:0}};expect(captureAllowedArea(w,p)).toBeUndefined();delete p.mental;
  // Effectiveness reads the existing owner phases, not a broad on-map membership helper.
  w.group={phase:'unloading',id:w.nextId++,startedAt:w.tick,destination:1,memberIds:[p.id],pendingPileIds:[],ledger:{foodLoaded:0,foodConsumed:0,medicineUsed:0,silverLoaded:0,silverPaid:0,silverEarned:0,cargoLoaded:{cloth:0,'muffalo-wool':0},sold:{cloth:0,'muffalo-wool':0},bought:{medicine:0,component:0}}};
  expect(allowedAreaEffective(w,p)).toBe(true);
  w.commercialTrip={phase:'unloading',pawnId:p.id,startedAt:w.tick,pendingPileIds:[]};expect(allowedAreaEffective(w,p)).toBe(true);
  w.scout={phase:'loading',pawnId:p.id,sourcePileId:1,quantity:2,startedAt:w.tick};expect(captureAllowedArea(w,p)).toBeUndefined();delete w.scout;
  w.commercialTrip={phase:'loading',pawnId:p.id,startedAt:w.tick,foodQuantity:2,silverQuantity:0,manifest:[],cursor:0};expect(captureAllowedArea(w,p)).toBeUndefined();
  expect(p.allowedAreaId).toBe(w.allowedAreas![0]!.id);
});
test('pure release preserves an engaged edge and a subsequent owner path',()=>{
  const {w,p}=camp(),target={x:p.x+1,z:p.z};p.allowedAreaReturn={target};p.path=[target];p.state='moving';
  const motion={from:{x:p.x,z:p.z},to:target,start:w.tick,end:w.tick+3};p.motion=motion;
  releaseAllowedAreaReturn(p);expect(p.allowedAreaReturn).toBeUndefined();expect(p.path).toEqual([]);expect(p.motion).toBe(motion);expect(p.state).toBe('idle');
  p.allowedAreaReturn={target};p.need={kind:'sleep',phase:'travel',bedId:null,target};p.path=[target];
  releaseAllowedAreaReturn(p);expect(p.path).toEqual([target]);expect(p.motion).toBe(motion);
});
