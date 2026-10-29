import {expect,test} from 'vitest';
import {registryCamp,command} from './helpers/world-maps-v255.ts';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {campaignOnlySummary} from '../src/sim/world-map-presentation.ts';
import {validCampaignSummary} from '../src/sim/world-map-projection-save.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {CampaignOnlyMessage} from '../src/bridge/protocol.ts';

// The existing helper's filename is historical; its factory now creates the
// CURRENT297 prepared camp. No schema/phase/budget is assigned by this test.
test('the real campaign-only transport admits current297 at phase0 and after seven played Core',()=>{
 for(const steps of [0,7]){
  const w=registryCamp();expect(w.schemaVersion).toBe(297);expect(effectiveCore297(w)).toBe(0);
  for(let i=0;i<steps;i++){const previous=effectiveCore297(w);expect(advanceWorldCore297(w).core).toBe(previous+1);}
  expect(w.phaseCore297).toBe(steps);expect(effectiveCore297(w)).toBe(steps);expect(validateWorld(w)).toEqual([]);
  const frontier={tick:w.tick,phase:w.phaseCore297,rng:w.rng,nextId:w.nextId};
  command(w,{type:'map-view',mapId:null});expect(w.worldMaps!.selectedMapId).toBeNull();
  expect({tick:w.tick,phase:w.phaseCore297,rng:w.rng,nextId:w.nextId}).toEqual(frontier);
  const before=serializeWorld(w),people=w.pawns.slice(),items=w.piles.slice(),maps=w.worldMaps!,budget=w.corePathBudget297;
  const summary=campaignOnlySummary(w);expect(summary.activeMapId).toBeNull();expect(summary.maps.every(m=>!m.selected)).toBe(true);expect(validCampaignSummary(summary)).toBe(true);
  const encoder=new SnapshotEncoder(),header=encoder.campaignHeader(true),encoded=encoder.encodeCampaignSummary(summary,true);
  const packet:CampaignOnlyMessage=structuredClone({type:'campaign-only',...header,stepMs:0,speed:0,summary:encoded.state,...encoded.geography?{geography:encoded.geography}:{},urgentThreats:{generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]}});
  const adopted=new SnapshotDecoder().adoptCampaignOnly(packet);
  expect(adopted.status,adopted.status==='resync'?adopted.reason:adopted.status).toBe('applied');
  if(adopted.status!=='applied')throw Error('Actual campaign-only publication refused');
  expect(adopted.summary.phaseCore297).toBe(steps);expect(adopted.summary.tick).toBe(frontier.tick);
  expect(w.worldMaps).toBe(maps);expect(w.corePathBudget297).toBe(budget);people.forEach((p,i)=>expect(w.pawns[i]).toBe(p));items.forEach((p,i)=>expect(w.piles[i]).toBe(p));
  expect(serializeWorld(w)).toBe(before);expect({tick:w.tick,phase:w.phaseCore297,rng:w.rng,nextId:w.nextId}).toEqual(frontier);
 }
},30000);