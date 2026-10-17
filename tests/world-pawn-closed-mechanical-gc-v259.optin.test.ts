import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization';
import {actualWorldPawnGCReader259} from '../src/sim/world-pawn-mechanical-gc-259';
import {captureMechanicalWorldPawnFacts259} from '../src/sim/world-pawn-mechanical-capture-259';
import {stepWorldPawnGC256} from '../src/sim/world-pawn-gc-256';
import {registeredMap} from '../src/sim/world-map-context';
import {actualPlayerOwner259} from '../src/sim/world-affiliation-259';
import {actual259,require259,transport259} from './helpers/fresh-caravan-owners-v259';
const enabled=process.env.ELSEWHERE_RUN_CLOSED_MECHANICAL259==='1';
/** FUTURE exact checkpoint from the existing true fresh259/camp producer run,
 * after real MapRemoved, at Core(next15000-10), or before a due pass finished.
 * Prepared by world-pawn-mechanical-prepare-v259.optin.test.ts from the exact
 * fresh Camp checkpoint. Neither entry nor output has been acquired here.
 * No actor/header/faction is grafted to make the entry. Reuse one globe. */
function future(){
 const path=process.env.ELSEWHERE_CLOSED_MECHANICAL259_CHECKPOINT,sha=process.env.ELSEWHERE_CLOSED_MECHANICAL259_CHECKPOINT_SHA256;
 if(!path||!sha||!/^[a-f0-9]{64}$/.test(sha))throw Error('A future acquired exact producer checkpoint and its SHA256 are required');
 const raw=readFileSync(path,'utf8');if(createHash('sha256').update(raw).digest('hex')!==sha)throw Error('Future mechanical checkpoint SHA256 mismatch');
 const root=deserializeCampaign(raw);require259(root);const state=root.worldPawns!;
 const beforeDue=state.atCore%15000===14990&&state.lastSuccessfulCore>=Math.floor(state.atCore/15000)*15000;
 const pending=state.atCore>=15000&&state.lastSuccessfulCore<Math.floor(state.atCore/15000)*15000;
 if(state.currentRate!==1||!(beforeDue||pending)||!state.owners.some(r=>r.kind==='human'))throw Error('Exact real pre-GC15000 frontier or pending pass at rate1 with retained humans is required');
 const gcCore=beforeDue?state.atCore+10:state.atCore;
 const reader=actualWorldPawnGCReader259(root),row=state.owners.find(r=>r.kind==='mechanical'&&!r.keepForever&&reader.facts(r).keep.length===0&&reader.facts(r).unknown.length===0);
 if(!row||row.kind!=='mechanical'||row.originMapId===null||!root.worldMaps!.retired.some(m=>m.id===row.originMapId))throw Error('A true unkept MapRemoved mechanical original is required');
 return {root,state,row,gcCore};
}
describe.skipIf(!enabled)('closed mechanical259 actual producer continuation',()=>{
 it('records only the present real colonist at its true PassToWorld, without enriching loaded owners',()=>{
  const {root,state,row}=future(),path=process.env.ELSEWHERE_CLOSED_MECHANICAL259_SOURCE_CHECKPOINT,sha=process.env.ELSEWHERE_CLOSED_MECHANICAL259_SOURCE_SHA256;
  if(!path||!sha)throw Error('Exact acquired pre-removal Camp source and SHA256 required');
  const raw=readFileSync(path,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(sha);const before=deserializeCampaign(raw);require259(before);
  expect(before.tick).toBe(root.tick);const map=registeredMap(before,row.originMapId!)!;
  const colonists=map.pawns.filter(p=>actualPlayerOwner259(p,before.worldFactions!.playerFactionId)&&!p.visitor&&!p.prisoner&&!p.podRescue&&!p.raid);if(!colonists.length)throw Error('Actual pre-removal free colonists required');
  // Compare both acquired sides of the real MapRemoved. The only remaining
  // colony cannot legally be abandoned without an actual caravan or other map.
  for(const p of colonists){expect(before.worldPawns!.owners.some(r=>r.actor.id===p.id)).toBe(false);const rows=state.owners.filter(r=>r.actor.id===p.id);expect(rows).toHaveLength(1);expect(rows[0]!.everColonist).toBe(true);}
  for(const old of before.worldPawns!.owners){const current=state.owners.find(r=>r.actor.id===old.actor.id)!;expect(current).toBeDefined();expect(Object.hasOwn(current,'everColonist')).toBe(Object.hasOwn(old,'everColonist'));expect(current.everColonist).toBe(old.everColonist);}
 });
 it('captures a feasible real candidate, preserves literal historical absence, and cancels an actual-reader pass on a new pertinent reference',()=>{
  const {root,state,row,gcCore}=future(),capture=captureMechanicalWorldPawnFacts259(root);
  expect(capture.facts(row)).toMatchObject({keep:[],unknown:[],relatedIds:[],memoryIds:[]});expect(capture.current()).toBe(true);
  // Prepared NEGATIVE admission branch only: deletion is deliberate corruption
  // after the exact baseline. No engine progression/history is claimed here.
  const copy=deserializeCampaign(serializeCampaign(root));require259(copy);const old=copy.worldPawns!.owners.find(r=>r.actor.id===row.actor.id)!;if(old.kind!=='mechanical')throw Error('Kind lost');delete old.actor.worldFaction259;
  expect(captureMechanicalWorldPawnFacts259(copy).facts(old).unknown.length).toBeGreaterThan(0);expect(old.actor).not.toHaveProperty('worldFaction259');
  const reader=actualWorldPawnGCReader259(root),owners=state.owners.slice(),payloads=owners.map(r=>JSON.stringify(r)),rng=root.rng,rate=state.currentRate,last=state.lastSuccessfulCore;
  // Scheduling API complement only: opening its actual-reader generator at
  // gcCore does not advance biological clocks or claim an engine tick. The
  // separate case below crosses this frontier through the real campaign loop.
  stepWorldPawnGC256(state,gcCore,reader,1);expect(state.owners).toEqual(owners);expect(state.lastSuccessfulCore).toBe(last);
  // Prepared incoming-reference fault, not a played human/mechanical relation.
  // The real reader must refuse discard even when the full save would reject
  // this namespace. This tests cancellation, never a fabricated Keep oracle.
  const human=owners.find(r=>r.kind==='human')!;root.relationships??={links:[]};root.relationships.links.push({kind:'parent',aId:human.actor.id,bId:row.actor.id,recordedAt:root.tick});
  for(let n=0;n<owners.length*2+4&&state.currentRate===rate;n++)expect(()=>stepWorldPawnGC256(state,gcCore,reader,1)).not.toThrow();
  expect(state.currentRate).toBe(Math.min(rate*2,16777216));expect(state.lastSuccessfulCore).toBe(last);expect(state.owners).toEqual(owners);expect(owners.map(r=>JSON.stringify(r))).toEqual(payloads);expect(root.rng).toBe(rng);expect(state.discardedMechanical259?.some(r=>r.id===row.actor.id)??false).toBe(false);
  expect(actualWorldPawnGCReader259(root).facts(row).keep).toContain('actual-human-relationship');
 });
 it('runs the real campaign GC and Destroy/Discard receipt, then preserves RAW/full/delta and deterministic continuation',()=>{
  const {root,state,row}=future(),original=row.actor,id=original.id,beforeHealth=JSON.stringify(original.health),humans=state.owners.filter(r=>r.kind==='human').map(r=>({row:r,ever:Object.hasOwn(r,'everColonist'),value:r.everColonist})),run=actual259(root);
  const limit=Math.min(2000,state.owners.length*2+20);run.until(()=>!state.owners.some(r=>r.actor.id===id),limit);
  expect(state.owners.some(r=>r.actor===original)).toBe(false);expect(row.destroyed).toBe(true);expect(JSON.stringify(original.health)).toBe(beforeHealth);
  const receipt=state.discardedMechanical259?.filter(r=>r.id===id);expect(receipt).toHaveLength(1);expect(receipt![0]).toEqual({id,mechKind:original.mechKind,factionId:row.factionId,originMapId:row.originMapId,enteredAtAbsCore:row.enteredAtAbsCore,discardedAtCore:root.tick*10});
  for(const h of humans){expect(state.owners).toContain(h.row);expect(Object.hasOwn(h.row,'everColonist')).toBe(h.ever);expect(h.row.everColonist).toBe(h.value);}
  const raw=serializeCampaign(root);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);transport259(run,'actual-closed-mechanical-GC');expect(state.discardedMechanical259?.filter(r=>r.id===id)).toHaveLength(1);
 });
});
