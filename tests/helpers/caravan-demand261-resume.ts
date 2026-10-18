import {readFileSync} from 'node:fs';
import {expect,vi} from 'vitest';
import {deserializeCampaign,serializeCampaign} from '../../src/sim/serialization.ts';
import {applyCommand,stepWorld} from '../../src/sim/engine.ts';
import {prepareGroupSplit,prepareGroupMerge} from '../../src/sim/group-reorganization.ts';
import {groupReorganizationBalance} from '../../src/sim/group-reorganization-balance.ts';
import * as calculation from '../../src/sim/caravan-incident-calculation-261.ts';
import * as demand from '../../src/sim/caravan-demand-capture-261.ts';
import * as health from '../../src/sim/health.ts';
import {writeTestFileSync,testOutputPath} from '../test-output.ts';
import {admitted261,away261,runtime261,sha261,totals261} from './caravan-encounter261-acquired.ts';
import type {World} from '../../src/sim/types.ts';
import type {EncounterGroup261} from '../../src/sim/caravan-encounter-state-261.ts';

export const DEMAND_INPUT_SHA261='7e3a8c0895cf7d2a41d429a07bfc3868eb511554227f6329b7af27838f9d2a3b';
export const DEMAND_NOTICE261='Prepared continuation of acquired actual01 tick999 RAW only. No Camp/Reform/route replay. Real group-split transfers3 from original36326 to original7, then real group-merge [child,source] conserves7/8,20meals,9wood,7silver. Actual stackLimit10 and real inventory receipts produce3+10+7, never a manual split/coalescence. Only Demand occurrence and bounded selector input tape are stimulated; real healthRandom advances, true producer creates pending/foreigners/owners. Not natural incident/MTBR evidence. Existing provisional NPC producer.';

export function demandCheckpoint261(root:World,label:string,extra:object={}){
 const path=testOutputPath(`artifacts/caravan261-demand-resume/${label}-RAW.json`) as string;
 writeTestFileSync(path,JSON.stringify(root));admitted261(root);
 const raw=serializeCampaign(root);writeTestFileSync(path,raw);
 writeTestFileSync(path.replace(/-RAW\.json$/,'-receipt.json'),JSON.stringify({path,sha256:sha261(raw),inputSHA256:DEMAND_INPUT_SHA261,tick:root.tick,rng:root.rng,nextId:root.nextId,notice:DEMAND_NOTICE261,...extra},null,2));
 return raw;
}

/** One declared command choice on the saved actual world, never a seed search. */
export function actualDemandPaymentContinuation261(){
 const input=process.env.TRAVEL261_DEMAND_INPUT;
 if(!input||process.env.TRAVEL261_DEMAND_INPUT_SHA256!==DEMAND_INPUT_SHA261)throw Error('ROOT must supply exact acquired actual01 RAW02 path and SHA; no fallback');
 const bytes=readFileSync(input,'utf8');expect(sha261(bytes)).toBe(DEMAND_INPUT_SHA261);
 const root=deserializeCampaign(bytes);admitted261(root);expect(serializeCampaign(root)).toBe(bytes);
 expect([root.tick,root.rng,root.nextId,root.planet!.nextGroupId]).toEqual([999,2577741147,59526,3]);
 expect(root.worldGroups!.groups.map(r=>r.state.id)).toEqual([2]);
 const source=root.worldGroups!.groups[0]! as EncounterGroup261,g=away261(source),runtime=runtime261(root);
 expect([g.tile,g.phase]).toEqual([13323,'at-site']);expect(g.members.map(p=>p.id)).toEqual([7,8]);expect(source.pending261).toBeUndefined();expect(source.story261).toBeUndefined();
 expect(g.items.map(p=>[p.id,p.item,p.quantity,p.owner])).toEqual([
  [2308,'survival-meal',10,{type:'inventory',pawnId:7}],
  [36326,'survival-meal',10,{type:'inventory',pawnId:8}],
  [36331,'wood',9,{type:'inventory',pawnId:7}],
  [36332,'silver',7,{type:'inventory',pawnId:8}],
 ]);
 const people=g.members.slice(),goods=g.items.slice(),total=totals261(goods),initialForeignIds=root.worldPawns!.owners.map(r=>r.actor.id),before=serializeCampaign(root),childId=root.planet!.nextGroupId,fragmentId=root.nextId;
 const split={type:'group-split' as const,groupId:2,memberIds:[7],inventory:[{pileId:36326,quantity:3}]};
 const preview=prepareGroupSplit(root,split);expect(serializeCampaign(root)).toBe(before);
 if(preview.kind!=='ready')throw Error('True split refused: '+preview.reason);
 expect(preview.plan.receipts).toContainEqual({sourceId:36326,quantity:3,fromPawnId:8,toPawnId:7,fragmentId});
 expect(preview.plan.receipts.some(r=>r.sourceId===36326&&r.absorbedById!==undefined)).toBe(false);
 const splitResult=applyCommand(root,split,runtime);
 demandCheckpoint261(root,'01-after-actual-split-or-refusal',{command:split,result:splitResult,receipts:preview.plan.receipts});expect(splitResult.ok,splitResult.reason).toBe(true);
 const child=root.worldGroups!.groups.find(r=>r.state.id===childId)! as EncounterGroup261;
 expect(away261(child).items).toHaveLength(1);expect(away261(child).items[0]).toMatchObject({id:fragmentId,item:'survival-meal',quantity:3,owner:{type:'inventory',pawnId:7}});
 expect(away261(source).items.find(p=>p.id===36326)).toBe(goods.find(p=>p.id===36326));expect(away261(source).items.find(p=>p.id===36326)!.quantity).toBe(7);
 expect(totals261(root.worldGroups!.groups.flatMap(r=>away261(r as EncounterGroup261).items))).toEqual(total);
 const merge={type:'group-merge' as const,groupIds:[childId,2]},splitRaw=serializeCampaign(root),mergePreview=prepareGroupMerge(root,merge,runtime.motion);expect(serializeCampaign(root)).toBe(splitRaw);
 if(mergePreview.kind!=='ready')throw Error('True merge refused: '+mergePreview.reason);
 expect(mergePreview.plan.survivors).toEqual([childId]);const mergeResult=applyCommand(root,merge,runtime);
 demandCheckpoint261(root,'02-after-actual-merge-or-refusal',{command:merge,result:mergeResult});expect(mergeResult.ok,mergeResult.reason).toBe(true);
 expect(root.worldGroups!.groups).toHaveLength(1);const record=root.worldGroups!.groups[0]! as EncounterGroup261,merged=away261(record);
 expect(merged.id).toBe(childId);expect(merged.members).toEqual(people);for(const p of people)expect(merged.members).toContain(p);
 expect(merged.items.filter(p=>p.item==='survival-meal').map(p=>[p.id,p.quantity])).toEqual([[fragmentId,3],[2308,10],[36326,7]]);
 for(const p of goods)expect(merged.items).toContain(p);expect(totals261(merged.items)).toEqual(total);
 expect(merged.reorganization?.opening['survival-meal']).toBe(3);expect(merged.reorganization?.received['survival-meal']).toBe(17);expect(groupReorganizationBalance(merged,merged.reorganization!,root.worldGroups!.losses)).toBe(true);
 expect(root.tick).toBe(999);expect(root.nextId).toBe(fragmentId+1);expect(record.pending261).toBeUndefined();expect(record.story261).toBeUndefined();
 const baseline=demandCheckpoint261(root,'03-prepared-real-commands-before-producer',{split,merge,initialForeignIds}),rngBefore=root.rng;
 const gate=vi.spyOn(calculation,'caravanIncidentOccurs261').mockImplementation((_biome,incident)=>incident==='demand');
 const actualSelect=demand.selectCurrentDemand261,actualRandom=health.healthRandom,tape=[.9,0,0,0],witness:{before:number;after:number;drawsUsed:number;actualCalls:number;tape:number[]}[]=[];
 const selector=vi.spyOn(demand,'selectCurrentDemand261').mockImplementation((capture,random)=>{
  let cursor=0;const before=random.rng,randomSpy=vi.spyOn(health,'healthRandom').mockImplementation(state=>{const actual=actualRandom(state);return tape[cursor++]??actual;});
  try{const selected=actualSelect(capture,random);witness.push({before,after:random.rng,drawsUsed:selected.drawsUsed,actualCalls:cursor,tape:tape.slice()});return selected;}finally{randomSpy.mockRestore();}
 });
 try{stepWorld(root,12,undefined,runtime);}finally{selector.mockRestore();gate.mockRestore();}
 demandCheckpoint261(root,'04-real-demand-before-decision',{witness});
 const pending=record.pending261;if(pending?.kind!=='demand'||pending.decision!=='open')throw Error('True producer did not create the required open Demand; no retry');
 expect(root.tick).toBe(1000);expect(pending.atCore).toBe(10000);expect(root.rng).not.toBe(rngBefore);expect(witness).toHaveLength(1);expect(witness[0]!.drawsUsed).toBe(4);expect(witness[0]!.actualCalls).toBeGreaterThanOrEqual(4);expect(witness[0]!.after).not.toBe(witness[0]!.before);
 expect(pending.demands).toEqual([{kind:'pile',id:fragmentId,quantity:3},{kind:'pile',id:2308,quantity:9}]);
 for(const p of pending.people)expect(initialForeignIds).not.toContain(p.id);for(const p of people)expect(away261(record).members).toContain(p);
 expect(sha261(readFileSync(input,'utf8'))).toBe(DEMAND_INPUT_SHA261);
 return {root,runtime,record,pending,people,goods,input,fragmentId,baseline};
}
