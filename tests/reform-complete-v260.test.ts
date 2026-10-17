import {beforeAll,expect,test} from 'vitest';
import {preparedReform415,restored415,require415,checkpoint415,markReformTargeted415,sha415,type Reform415} from './helpers/reform-v260-fixture.ts';
import {previewGroupReform260,prepareGroupReform260,reformMemberReason260} from '../src/sim/group-reform-260.ts';
import {blockedCells,workNeighbours} from '../src/sim/pathfinding.ts';
import {candidateAccess} from '../src/sim/candidate-access.ts';
import {applyCommand,canDesignate,stepWorld} from '../src/sim/engine.ts';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {createCampPressureMechanoidRaid260} from '../src/sim/mechanoid-raids.ts';
import {campReformThreatReason260} from '../src/sim/camp-reform-threats-260.ts';

let fixture:Pick<Reform415,'raw'|'campMapId'|'homeMapId'|'memberIds'|'sources'|'destination'|'manifestPath'>;
beforeAll(()=>{const f=preparedReform415();fixture={raw:f.raw,campMapId:f.campMapId,homeMapId:f.homeMapId,memberIds:f.memberIds,sources:f.sources,destination:f.destination,manifestPath:f.manifestPath};},120_000);
const draft=()=>({originMapId:fixture.campMapId,memberIds:[...fixture.memberIds],sources:fixture.sources.map(p=>({...p})),destination:fixture.destination});

test('true260 preview→command at same tick transfers originals, removes actual Camp, publishes marker and admits exact RAW/full/delta',()=>{
 expect(sha415(fixture.raw)).toBe('70dea3811dab70e7225cced4c715c8438b1d7aecec6aa173ac72eaa52115e699');
 const {root,camp,runtime}=restored415(fixture.raw),people=fixture.memberIds.map(id=>camp.pawns.find(p=>p.id===id)!);
 expect(root.tick).toBe(736);
 // The acquired Camp is unchanged. A real player designation and forced job
 // create the task owner before the ordinary engine starts its movement edge.
 const moving=people[0]!;expect(moving.id).toBe(7);expect(camp.piles.some(p=>p.owner.type==='inventory'&&p.owner.pawnId===moving.id)).toBe(true);
 checkpoint415(root,'07-existing-camp736-before-real-work-order');
 const access=candidateAccess(camp,moving,blockedCells(camp),new Set()),distance=(c:{x:number;z:number})=>Math.abs(c.x-moving.x)+Math.abs(c.z-moving.z);
 const tree=camp.resources.filter(r=>r.kind==='tree'&&distance(r)>=3).sort((a,b)=>distance(a)-distance(b)||a.id-b.id).find(r=>canDesignate(camp,{type:'designate',kind:'chop',targetId:r.id,x:r.x,z:r.z}).ok&&workNeighbours(r).some(c=>c.x>=0&&c.z>=0&&c.x<camp.width&&c.z<camp.height&&access.has(c.z*camp.width+c.x)));
 if(!tree)throw Error('Actual Camp736 has no existing visible reachable tree outside contact for this original holder; no replacement fixture');
 const designated=applyCommand(root,{type:'designate',kind:'chop',targetId:tree.id,x:tree.x,z:tree.z},runtime);expect(designated.ok,designated.reason).toBe(true);
 const job=camp.jobs.find(j=>j.kind==='chop'&&j.plantTarget?.resourceId===tree.id);if(!job)throw Error('True designation produced no actual tree job');
 const ordered=applyCommand(root,{type:'order-job',pawnId:moving.id,jobId:job.id,queue:false},runtime);expect(ordered.ok,ordered.reason).toBe(true);
 const preparationTick=root.tick,edge=()=>!!moving.motion&&moving.motion.end>root.tick&&moving.state==='moving'&&moving.jobId===job.id;
 for(let n=0;n<120&&!edge();n++)stepWorld(root,1,undefined,runtime);
 // Save the real state before any guard, including a bounded prerequisite failure.
 checkpoint415(root,'07-actual-worker-edge-or-bounded-refusal-before-reform');
 if(!edge())throw Error(`Actual ordered worker edge absent after${root.tick-preparationTick} real ticks; no task/path/motion repair`);
 expect(job.reservedBy).toBe(moving.id);expect(moving.orders.active).toBe(job.id);expect(validateWorld(root)).toEqual([]);
 const occupied={...moving.motion!.from},tick=root.tick,rng=root.rng,nextId=root.nextId,oldNextGroup=root.planet!.nextGroupId;
 const resident=structuredClone(registeredMap(root,fixture.homeMapId)!.pawns),piles=camp.piles.filter(p=>fixture.sources.some(l=>l.pileId===p.id)||['equipment','apparel'].includes(p.owner.type)&&'pawnId'in p.owner&&fixture.memberIds.includes(p.owner.pawnId)),beforeGoods=piles.map(p=>structuredClone(p));
 expect(moving.motion!.end).toBeGreaterThan(tick);expect(reformMemberReason260(camp,moving)).toBeUndefined();
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),full=structuredClone(encoder.encode(root,0,0));
 const initial=decoder.adopt(full);expect(initial.status).toBe('applied');if(initial.status==='applied')expect(initial.world).toEqual(campaignPresentation(root));
 const before=serializeCampaign(root),preview=previewGroupReform260(camp,draft());expect(preview.ok,preview.ok?'':preview.reason).toBe(true);expect(serializeCampaign(root)).toBe(before);if(!preview.ok)throw Error(preview.reason);
 if(camp.site?.revision!==3)throw Error('True geographic Camp site absent');
 expect(preview.route[0]).toBe(camp.site.tileId);expect(preview.route.at(-1)).toBe(fixture.destination);
 const result=applyCommand(root,{type:'group-reform',...draft(),quote:preview.quote},runtime);expect(result.ok,result.reason).toBe(true);
 expect([root.tick,root.rng,root.nextId]).toEqual([tick,rng,nextId]);expect(root.planet!.nextGroupId).toBe(oldNextGroup+1);
 const record=root.worldGroups!.groups.find(r=>r.state.id===oldNextGroup)!;expect(record.localMapId).toBeNull();const g=record.state;if(!('members'in g))throw Error('Reform yielded formation/unloading rather than true direct owner');
 expect(g.phase).toBe('travelling');expect(g.segment).toBeNull();expect(g.departedAt).toBe(tick);expect(g.lastPersonalTick).toBe(tick);expect(g.route).toEqual(preview.route);expect(g.reorganization?.birth).toEqual({kind:'reform',sourceMapId:fixture.campMapId,at:tick});
 expect(g.entry).toEqual(occupied);expect({x:moving.x,z:moving.z}).toEqual(occupied);expect(moving.motion).toBeUndefined();expect(moving.path).toEqual([]);expect(moving.moveCooldown).toBe(0);expect(moving.jobId).toBeNull();expect(moving.orders.active).toBeNull();expect(moving.orders.queue).toEqual([]);expect(job.reservedBy).toBeNull();expect(job.status).toBe('pending');
 for(const p of people){expect(g.members.find(q=>q.id===p.id)).toBe(p);expect(root.worldPawns!.owners.some(r=>r.actor.id===p.id)).toBe(false);expect(root.worldMaps!.sites.some(s=>registeredMap(root,s.id)!.pawns.some(q=>q.id===p.id))).toBe(false);}
 expect(g.items).toHaveLength(piles.length);for(const p of piles){expect(g.items.find(q=>q.id===p.id)).toBe(p);const source=fixture.sources.find(l=>l.pileId===p.id);if(source){expect(p.quantity).toBe(source.quantity);expect(p.owner.type).toBe('inventory');if(p.owner.type==='inventory')expect(fixture.memberIds).toContain(p.owner.pawnId);}else expect(p).toEqual(beforeGoods.find(q=>q.id===p.id));}
 expect(registeredMap(root,fixture.homeMapId)!.pawns).toEqual(resident);expect(root.worldMaps!.sites.map(s=>s.id)).toEqual([fixture.homeMapId]);expect(registeredMap(root,fixture.campMapId)).toBeUndefined();
 expect(root.worldMaps!.retired.find(r=>r.id===fixture.campMapId)).toMatchObject({kind:'camp',reason:'camp-empty',removedAt:tick,markerUntilCore:tick*10+1_800_000});
 const expected=structuredClone(campaignPresentation(root)),replacement=structuredClone(encoder.encode(root,0,0));expect(replacement.kind).toBe('checkpoint');const adopted=decoder.adopt(replacement);expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(expected);
 if(expected.campaignMap?.revision!==2)throw Error('True registered projection absent');expect(expected.campaignMap.retiredCamps).toContainEqual(expect.objectContaining({retiredMapId:fixture.campMapId,markerUntilCore:tick*10+1_800_000}));
 // Map replacement is correctly a full checkpoint. A real same-tick UI
 // selection mutation then exercises the existing changed delta/Decoder path.
 expect(applyCommand(root,{type:'group-select',groupId:null},runtime).ok).toBe(true);const unselected=structuredClone(campaignPresentation(root)),delta=structuredClone(encoder.encode(root,0,0));expect(delta.kind).toBe('delta');const changed=decoder.adopt(delta);expect(changed.status).toBe('applied');if(changed.status==='applied')expect(changed.world).toEqual(unselected);
 expect(applyCommand(root,{type:'group-select',groupId:oldNextGroup},runtime).ok).toBe(true);const selected=decoder.adopt(structuredClone(encoder.encode(root,0,0)));expect(selected.status).toBe('applied');if(selected.status==='applied')expect(selected.world).toEqual(expected);
 const newDecoder=new SnapshotDecoder(),fresh=newDecoder.adopt(structuredClone(new SnapshotEncoder().encode(root,0,0)));expect(fresh.status).toBe('applied');if(fresh.status==='applied')expect(fresh.world).toEqual(expected);
 expect(validateWorld(root)).toEqual([]);const raw=serializeCampaign(root),reloaded=deserializeCampaign(raw);require415(reloaded);expect(serializeCampaign(reloaded)).toBe(raw);expect(campaignPresentation(reloaded)).toEqual(expected);
 // A removed origin cannot be re-used to duplicate its people or finite Things.
 const repeat=applyCommand(root,{type:'group-reform',...draft(),quote:preview.quote},runtime);expect(repeat.ok).toBe(false);expect(serializeCampaign(root)).toBe(raw);
 checkpoint415(root,'08-complete-targeted-reform-passed');markReformTargeted415(fixture.manifestPath,raw);
},120_000);

test('a real born Camp mechanical threat refuses preview and command atomically',()=>{
 const {root,camp,runtime}=restored415(fixture.raw);
 // Isolated branch fixture using this Camp's actual dedicated producer.
 // A human raid would contradict its pressure-only calendar in260.
 const threat=createCampPressureMechanoidRaid260(camp,450,{rng:0x12345678});expect(threat).not.toBeNull();flushRegisteredMap(camp);
 expect(campReformThreatReason260(camp)).toBeDefined();expect(validateWorld(root)).toEqual([]);const before=serializeCampaign(root);
 expect(previewGroupReform260(camp,draft()).ok).toBe(false);expect(applyCommand(root,{type:'group-reform',...draft(),quote:'reform260:stale-threat'},runtime).ok).toBe(false);expect(serializeCampaign(root)).toBe(before);
});

test('a changed clinical fact invalidates the shown quote without moving anyone or minting stock',()=>{
 const {root,camp,runtime}=restored415(fixture.raw),preview=previewGroupReform260(camp,draft());if(!preview.ok)throw Error(preview.reason);
 // Fault injection on a detached test branch, never a browser/world repair.
 camp.pawns.find(p=>p.id===fixture.memberIds[0])!.hunger-=1;flushRegisteredMap(camp);const before=serializeCampaign(root);
 expect(applyCommand(root,{type:'group-reform',...draft(),quote:preview.quote},runtime).ok).toBe(false);expect(serializeCampaign(root)).toBe(before);expect(validateWorld(root)).toEqual([]);
});

test('same-ID replacement is not the sealed original; commit refuses before retirement or any departure',()=>{
 const {root,camp}=restored415(fixture.raw),ready=prepareGroupReform260(camp,draft());if(ready.kind!=='ready')throw Error(ready.kind==='refused'?ready.reason:'Unexpected preview');
 const index=camp.pawns.findIndex(p=>p.id===fixture.memberIds[0]),original=camp.pawns[index]!;camp.pawns[index]=structuredClone(original);flushRegisteredMap(camp);const before=serializeCampaign(root);
 expect(camp.pawns[index]).not.toBe(original);expect(ready.plan.commit().ok).toBe(false);expect(serializeCampaign(root)).toBe(before);expect(root.worldMaps!.sites.some(s=>s.id===fixture.campMapId)).toBe(true);expect(root.worldGroups!.groups).toHaveLength(0);expect(validateWorld(root)).toEqual([]);
});
