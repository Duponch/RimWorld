import {expect,test} from 'vitest';
import {validAncientShrineWarnings256,validAncientShrineWarningEnvelope256,validAncientShrineWarningCampaignRaw256,registerAncientShrineWarningIds256} from '../src/sim/ancient-shrine-warning-save-256.ts';
import {validUrgentThreatSnapshot} from '../src/bridge/urgent-threats.ts';
import {urgentThreatLabel} from '../src/ui/urgent-threat-feedback.ts';
const pending=()=>({revision:1 as const,pairs:[{triggerId:7,actionId:8,rect:{minX:2,minZ:2,maxX:8,maxZ:8},center:{x:5,z:5},triggerAlive:true,actionAlive:true}]});
const raw=()=>({schemaVersion:256,tick:9,nextId:12,width:20,height:20,site:{revision:3},ancientShrineWarnings:pending()});
test('two true Thing IDs are distinct; strict255 and inherited/undefined/accessor metadata cannot migrate into a warning',()=>{
 expect(validAncientShrineWarningEnvelope256(raw(),256,9,12)).toBe(true);expect(validAncientShrineWarningEnvelope256(raw(),255,9,12)).toBe(false);
 const unknown={width:20,height:20,site:{revision:3},ancientShrineWarnings:undefined};expect(validAncientShrineWarningEnvelope256(unknown,256,9,12)).toBe(false);expect(validAncientShrineWarningEnvelope256(Object.create(raw()),256,9,12)).toBe(false);
 let reads=0;const getter={width:20,height:20,site:{revision:3}};Object.defineProperty(getter,'ancientShrineWarnings',{enumerable:true,get(){reads++;throw Error('read');}});expect(validAncientShrineWarningEnvelope256(getter,256,9,12)).toBe(false);expect(reads).toBe(0);
 const s=pending();s.pairs[0]!.actionId=7;expect(validAncientShrineWarnings256(s,20,20,9,12)).toBe(false);
});
test('unfog destroys trigger only; a sent letter has consumed both Things and retains its actual subject/tick',()=>{
 const orphan=pending();orphan.pairs[0]!.triggerAlive=false;expect(validAncientShrineWarnings256(orphan,20,20,9,12)).toBe(true);
 const delivered={revision:1,pairs:[{...orphan.pairs[0]!,actionAlive:false,letter:{tick:9,pawnId:10}}]};expect(validAncientShrineWarnings256(delivered,20,20,9,12)).toBe(true);
 expect(validAncientShrineWarnings256({...delivered,pairs:[{...delivered.pairs[0]!,triggerAlive:true}]},20,20,9,12)).toBe(false);
 expect(validAncientShrineWarnings256({...delivered,pairs:[{...delivered.pairs[0]!,letter:{tick:10,pawnId:10}}]},20,20,9,12)).toBe(false);
});
test('RAW sees the original inactive map descriptor before projection and historical future state is refused',()=>{
 const root={schemaVersion:256,tick:9,nextId:12,worldMaps:{sites:[{id:0,map:raw()}]}};expect(validAncientShrineWarningCampaignRaw256(root,256)).toBe(true);expect(validAncientShrineWarningCampaignRaw256(root,255)).toBe(false);
 let reads=0;Object.defineProperty(root.worldMaps.sites[0]!.map,'ancientShrineWarnings',{enumerable:true,get(){reads++;throw Error('read');}});expect(validAncientShrineWarningCampaignRaw256(root,256)).toBe(false);expect(reads).toBe(0);
});
test('global Thing registration is atomic on collision; destroyed trigger provenance creates no duplicate owner',()=>{
 const s=pending(),occupied=new Set([8]);expect(registerAncientShrineWarningIds256(s,occupied)).toBe(false);expect([...occupied]).toEqual([8]);
 s.pairs[0]!.triggerAlive=false;const next=new Set([7]);expect(registerAncientShrineWarningIds256(s,next)).toBe(true);expect([...next]).toEqual([7,8]);
});
test('ThreatBig receipt has its own kind and source-specific text, without synthetic assailants',()=>{
 const row={site:'home' as const,kind:'ancient-shrine' as const,totalArrivals:1,lastTick:9,lastCount:1,actorId:10};expect(validUrgentThreatSnapshot({generation:1,pauseRevision:1,serial:1,urgentHeld:true,rows:[row]},9,0)).toBe(true);
 const label=urgentThreatLabel({...row,delta:1});expect(label).toContain('Danger ancien');expect(label).not.toMatch(/Raid|assaillant/);
});
