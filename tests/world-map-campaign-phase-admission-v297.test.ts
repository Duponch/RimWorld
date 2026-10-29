import {expect,test} from 'vitest';
import {registryCamp,command} from './helpers/world-maps-v255.ts';
import {serializeWorld} from '../src/sim/serialization.ts';
import {campaignOnlySummary} from '../src/sim/world-map-presentation.ts';
import {validCampaignSummary} from '../src/sim/world-map-projection-save.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {CampaignOnlyMessage} from '../src/bridge/protocol.ts';
import type {CampaignSummary} from '../src/sim/world-map-state.ts';

test('campaign-only phase faults refuse before reads/adoption and never grant a local budget or consume a revision',()=>{
 const w=registryCamp();expect(w.schemaVersion).toBe(297);command(w,{type:'map-view',mapId:null});
 const raw=serializeWorld(w),summary=campaignOnlySummary(w);expect(validCampaignSummary(summary)).toBe(true);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const packet=(checkpoint=false):CampaignOnlyMessage=>{const header=encoder.campaignHeader(checkpoint),encoded=encoder.encodeCampaignSummary(summary,checkpoint);return structuredClone({type:'campaign-only',...header,stepMs:0,speed:0,summary:encoded.state,...encoded.geography?{geography:encoded.geography}:{},urgentThreats:{generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]}});};
 expect(decoder.adoptCampaignOnly(packet(true)).status).toBe('applied');const warm=packet();
 const faults:[string,(s:CampaignSummary)=>void][]=[
  ['missing',s=>{delete s.phaseCore297;}],
  ['undefined',s=>{Object.defineProperty(s,'phaseCore297',{value:undefined,enumerable:true});}],
  ['negative',s=>{s.phaseCore297=-1;}],['fraction',s=>{s.phaseCore297=.5;}],['ten',s=>{s.phaseCore297=10;}],
  ['hidden',s=>{Object.defineProperty(s,'phaseCore297',{value:0,enumerable:false});}],
  ['budget-owner',s=>{Object.defineProperty(s,'corePathBudget297',{value:{tick:s.tick,remaining:8,pairs:32768},enumerable:true});}],
 ];
 for(const [name,fault]of faults){
  const semantic={...summary},transport={...warm,summary:{...warm.summary}};fault(semantic);fault(transport.summary);
  expect(validCampaignSummary(semantic),name).toBe(false);expect(decoder.adoptCampaignOnly(transport).status,name).toBe('resync');
 }
 let reads=0;const semanticGetter=Object.defineProperty({...summary},'phaseCore297',{enumerable:true,get(){reads++;return 0;}}),transportGetter={...warm,summary:Object.defineProperty({...warm.summary},'phaseCore297',{enumerable:true,get(){reads++;return 0;}})};
 expect(validCampaignSummary(semanticGetter)).toBe(false);expect(decoder.adoptCampaignOnly(transportGetter).status).toBe('resync');expect(reads).toBe(0);
 const accepted=decoder.adoptCampaignOnly(warm);expect(accepted.status,accepted.status==='resync'?accepted.reason:accepted.status).toBe('applied');
 expect(serializeWorld(w)).toBe(raw);
},30000);