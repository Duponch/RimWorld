import {expect,test} from 'vitest';
import {harness} from './helpers/group-admission-v412';
import {writeTestFileSync} from './test-output';
import {COMPLEX_FURNITURE_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST,MULTI_ANALYZER_RESEARCH_COST,SMITHING_RESEARCH_COST,MACHINING_RESEARCH_COST} from '../src/sim/research';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction';
import {registryCamp,command,until} from './helpers/world-maps-v255';
import {adultAgeTicks} from '../src/sim/animal-life';
import {captureGroupMass,type PreparingGroup} from '../src/sim/group-capture';
import {emptyGroupLedger} from '../src/sim/group-loading';
import {newGroupFreight} from '../src/sim/group-freight';
import {previewGroupBedrollLoading256,commitGroupBedrollPickup256,validGroupBedrollLoading256,validGroupBedrollLoadingReferences256} from '../src/sim/group-bedroll-loading-256';
import {processGroupPackedDelivery258,pendingGroupPackedDeliveries258,reconcileGroupPackedHandoffs258,groupPackedReceiverSpace258} from '../src/sim/group-packed-animal-loading-258';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context';
import {serializeCampaign,deserializeCampaign,stepWorld,validateWorld} from '../src/sim/index';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';
import {newPowerState} from '../src/sim/power-rules';
import {addMaterial} from '../src/sim/materials';
import {cancelGroupPreparation} from '../src/sim/group-authority';
import type {WildAnimal} from '../src/sim/wildlife-state';
import type {World,Cell} from '../src/sim/types';
import type {NeedContext} from '../src/sim/needs';
import type {PackedFurniture} from '../src/sim/furniture-rules';
function animal(w:World,x=4,z=5):WildAnimal {return {id:w.nextId++,species:'muffalo',sex:'female',ageTicks:adultAgeTicks('muffalo'),x,z,food:1,rest:1,state:'idle',path:[],nextDecision:w.tick,domestic:{since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+6000,productFullness:0}};}
/** Declared finite minified payload, not an invented deconstruction history. */
function pack(w:World,kind:'double-bed'|'multi-analyzer',x=3,z=5):PackedFurniture {const b:PackedFurniture['building']=fixtureBuilding(w,kind,220,17);b.material=kind==='double-bed'?'wood':'steel';if(kind==='multi-analyzer')b.power=newPowerState(kind);w.structures=w.structures.filter(s=>s!==b);const p:PackedFurniture={building:b,owner:{type:'ground',x,z}};w.packed.push(p);return p;}
function local(kind:'double-bed'|'multi-analyzer'='double-bed'){
 const w=deconstructionCamp(2);w.piles=[];w.packed=[];w.structures=[];const a=animal(w);w.wildlife={profile:'temperate-hares-v1',rng:1,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};const item=pack(w,kind),mass=captureGroupMass(w.pawns,[],true,258,[],[a])!,preview=previewGroupBedrollLoading256(w,[item.building.id],w.pawns,mass,()=> 'reachable',[a]);expect(preview.kind).toBe('ready');if(preview.kind!=='ready')throw Error('Missing actual animal pack preview');
 const g:PreparingGroup={id:1,startedAt:w.tick,destination:1,phase:'loading',memberIds:w.pawns.map(p=>p.id),rendezvous:{x:3,z:4},meeting:[],manifest:[],cursor:0,exits:[],ledger:emptyGroupLedger(),freight:newGroupFreight(),travelPreparation:true,animalPreparation:{revision:1,lines:[{animalId:a.id,handlerId:w.pawns[1]!.id,mode:'lead',gathered:true}]},bedrollLoading:preview.preview.loading};w.group=g;const l=g.bedrollLoading!.manifest[0]!,p=w.pawns.find(p=>p.id===l.carrierId)!;Object.assign(p,{x:3,z:4,path:[],moveCooldown:0});delete p.motion;
 const moves:Cell[]=[],ctx:NeedContext={search:()=>null,move:c=>moves.push({x:c.x,z:c.z}),release:()=>true,event:()=>{}};return {w,a,item,g,l,p,ctx,moves};
}
test.each([['double-bed',50000],['multi-analyzer',60000]] as const)('%s uses actual overweight human pickup, edge/contact and25Coreticks before same-ID animal ownership', (kind,grams)=>{
 const f=local(kind),{w,a,item,g,l,p,ctx,moves}=f,id=item.building.id;expect(l.animalCarrierId).toBe(a.id);expect(groupPackedReceiverSpace258(w,g,a.id)).toBe(true);
 p.motion={from:{x:2,z:4},to:{x:3,z:4},start:w.tick,end:w.tick+1};expect(commitGroupBedrollPickup256(w,g,p)).toBe(false);delete p.motion;
 expect(commitGroupBedrollPickup256(w,g,p)).toBe(true);expect(item.owner).toEqual({type:'inventory',pawnId:p.id});expect(captureGroupMass(w.pawns,[],true,258,w.packed,[a])!.carriers.find(c=>c.pawnId===p.id)!.grams).toBe(grams);expect(pendingGroupPackedDeliveries258(g)).toBe(true);
 a.x=8;expect(processGroupPackedDelivery258(w,g,p,ctx)).toBe('handled');expect(moves.at(-1)).toEqual({x:a.x,z:a.z});expect(l.handoffReadyCore).toBeUndefined();a.x=4;a.z=4;
 expect(processGroupPackedDelivery258(w,g,p,ctx)).toBe('handled');const deadline=l.handoffReadyCore!;expect(deadline).toBe(w.tick*10+25);w.tick+=2;expect(processGroupPackedDelivery258(w,g,p,ctx)).toBe('handled');expect(item.owner).toEqual({type:'inventory',pawnId:p.id});w.tick++;expect(processGroupPackedDelivery258(w,g,p,ctx)).toBe('handled');expect(item.owner).toEqual({type:'inventory',pawnId:a.id});expect(item.building.id).toBe(id);expect(w.packed[0]).toBe(item);expect(item.building.x).toBe(220);expect(l.deliveredToAnimal).toBe(true);expect(l.handoffReadyCore).toBeUndefined();expect(pendingGroupPackedDeliveries258(g)).toBe(false);
});
/** Prepared contact checkpoint: recipient moved into touch before the old route ended. */
test('finished human edge discards only stale handler path at contact and still waits25Coreticks',()=>{
 const {w,a,item,g,l,p,ctx}=local(),id=item.building.id;expect(commitGroupBedrollPickup256(w,g,p)).toBe(true);a.x=4;a.z=4;
 const humanPath=[{x:3,z:5}],animalPath=[{x:4,z:5}];p.path=structuredClone(humanPath);a.path=structuredClone(animalPath);p.motion={from:{x:2,z:4},to:{x:3,z:4},start:w.tick,end:w.tick+1};p.moveCooldown=1;const edge=structuredClone(p.motion);
 expect(processGroupPackedDelivery258(w,g,p,ctx)).toBe('handled');expect(p.path).toEqual(humanPath);expect(p.motion).toEqual(edge);expect(a.path).toEqual(animalPath);expect(l.handoffReadyCore).toBeUndefined();
 w.tick++;p.moveCooldown=0;expect(processGroupPackedDelivery258(w,g,p,ctx)).toBe('handled');expect(p.path).toEqual([]);expect(p.motion).toEqual(edge);expect(a.path).toEqual(animalPath);expect(l.handoffReadyCore).toBeUndefined();expect(item.owner).toEqual({type:'inventory',pawnId:p.id});
 // Separate prepared checkpoint: the recipient has now finished its own route.
 a.path=[];expect(processGroupPackedDelivery258(w,g,p,ctx)).toBe('handled');expect(l.handoffReadyCore).toBe(w.tick*10+25);w.tick+=2;expect(processGroupPackedDelivery258(w,g,p,ctx)).toBe('handled');expect(item.owner).toEqual({type:'inventory',pawnId:p.id});w.tick++;expect(processGroupPackedDelivery258(w,g,p,ctx)).toBe('handled');expect(item.owner).toEqual({type:'inventory',pawnId:a.id});expect(item.building.id).toBe(id);expect(w.packed[0]).toBe(item);expect(l.deliveredToAnimal).toBe(true);
});
test('contact interruption restarts the whole wait; changed final capacity refuses with actual goods retained',()=>{
 const {w,a,item,g,l,p,ctx}=local();expect(commitGroupBedrollPickup256(w,g,p)).toBe(true);a.x=4;a.z=4;processGroupPackedDelivery258(w,g,p,ctx);const first=l.handoffReadyCore!;w.tick++;a.motion={from:{x:4,z:4},to:{x:4,z:5},start:w.tick,end:w.tick+2};reconcileGroupPackedHandoffs258(w,g);expect(l.handoffReadyCore).toBeUndefined();delete a.motion;processGroupPackedDelivery258(w,g,p,ctx);expect(l.handoffReadyCore).toBe(first+10);
 addMaterial(w,'steel',100,{type:'inventory',pawnId:a.id},'steel');w.tick+=3;expect(processGroupPackedDelivery258(w,g,p,ctx)).toBe('refused');expect(item.owner).toEqual({type:'inventory',pawnId:p.id});cancelGroupPreparation(w);expect(w.group).toBeUndefined();expect(w.packed[0]).toBe(item);expect(item.owner).toEqual({type:'inventory',pawnId:p.id});
});
test('RAW receipt grammar rejects old-schema privilege, false owner/recipient/time, and leaving before actual delivery',()=>{
 const {w,a,item,g,l,p,ctx}=local();expect(validGroupBedrollLoading256(g.bedrollLoading,w,g,258)).toBe(true);expect(validGroupBedrollLoading256(g.bedrollLoading,w,g,257)).toBe(false);expect(validGroupBedrollLoading256({...g.bedrollLoading,revision:1},w,g,258)).toBe(false);
 expect(commitGroupBedrollPickup256(w,g,p)).toBe(true);a.x=4;a.z=4;processGroupPackedDelivery258(w,g,p,ctx);expect(validGroupBedrollLoading256(g.bedrollLoading,w,g,258)).toBe(true);
 const bad=structuredClone(g.bedrollLoading!);bad.manifest[0]!.handoffReadyCore=bad.manifest[0]!.handoffReadyCore!+1;expect(validGroupBedrollLoadingReferences256(bad,w,g,258)).toBe(false);bad.manifest[0]!.handoffReadyCore=1000005;expect(validGroupBedrollLoadingReferences256(bad,w,g,258)).toBe(false);
 const owner=item.owner;item.owner={type:'inventory',pawnId:a.id};expect(validGroupBedrollLoading256(g.bedrollLoading,w,g,258)).toBe(false);item.owner=owner;g.phase='leaving';expect(validGroupBedrollLoading256(g.bedrollLoading,w,g,258)).toBe(false);g.phase='loading';
 a.state='downed';expect(processGroupPackedDelivery258(w,g,p,ctx)).toBe('refused');expect(item.owner).toEqual(owner);a.state='idle';l.animalCarrierId=p.id;expect(validGroupBedrollLoadingReferences256(g.bedrollLoading,w,g,258)).toBe(false);
});
/** One real resident campaign run, no simulated owner flips or prepared journey. */
test.each(['double-bed','multi-analyzer'] as const)('actual formation walks %s to its animal, RAW/full/delta preserve waiting and deterministic continuation',kind=>{
 const root=registryCamp(),map=registeredMap(root,root.worldMaps!.rootMapId!)!,a=animal(map,16,15),item=pack(map,kind,8,14);map.wildlife={profile:'temperate-hares-v1',rng:1,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};flushRegisteredMap(map);
 // Declared research accompanies these prepared finished goods; no research
 // chronology is claimed or bypassed by the new freight contract.
 root.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:root.tick},...kind==='multi-analyzer'?{smithing:{points:SMITHING_RESEARCH_COST,completedAt:root.tick},machining:{points:MACHINING_RESEARCH_COST,completedAt:root.tick},microelectronics:{points:MICROELECTRONICS_RESEARCH_COST,completedAt:root.tick},multiAnalyzer:{points:MULTI_ANALYZER_RESEARCH_COST,completedAt:root.tick}}:{}};
 const simulation=harness(root);simulation.command({type:'group-start',originMapId:root.worldMaps!.rootMapId!,memberIds:[map.pawns[1]!.id,map.pawns[0]!.id],animalIds:[a.id],sources:[],packedIds:[item.building.id],destination:52});const id=root.worldGroups!.selectedGroupId!;
 const group=(w:World)=>{const g=w.worldGroups!.groups.find(r=>r.state.id===id)?.state;if(!g||!('manifest'in g))throw Error('Actual preparation disappeared before its handoff');return g;};
 let carriedSteps=0;for(let i=0;i<1800&&group(root).bedrollLoading!.manifest[0]!.handoffReadyCore===undefined;i++){const l=group(root).bedrollLoading!.manifest[0]!;if(l.loaded&&!l.deliveredToAnimal){expect(group(root).phase).toBe('loading');if(map.pawns.find(p=>p.id===l.carrierId)!.motion)carriedSteps++;}simulation.step();}const g=group(root),l=g.bedrollLoading!.manifest[0]!;expect(l.handoffReadyCore).toBeDefined();expect(carriedSteps).toBeGreaterThan(0);expect(item.owner).toEqual({type:'inventory',pawnId:l.carrierId});
 writeTestFileSync(`artifacts/freight-v413/${kind}-actual-human-held.json`,JSON.stringify(root));expect(validateWorld(root)).toEqual([]);const raw=serializeCampaign(root),fork=deserializeCampaign(raw);expect(serializeCampaign(fork)).toBe(raw);if(!('pawns'in fork))throw Error('Actual loaded map missing');const resumed=harness(fork);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();let accepted=decoder.adopt(structuredClone(encoder.encode(root,0,0)));expect(accepted.status).toBe('applied');if(accepted.status!=='applied')throw Error('Actual full failed');expect(accepted.world).toEqual(campaignPresentation(root));
 command(root,{type:'group-select',groupId:null});command(fork,{type:'group-select',groupId:null});const packet=structuredClone(encoder.encode(root,0,0));expect(packet.kind).toBe('delta');accepted=decoder.adopt(packet);expect(accepted.status).toBe('applied');if(accepted.status!=='applied')throw Error('Actual delta failed');expect(accepted.world).toEqual(campaignPresentation(root));
 for(let i=0;i<10&&!l.deliveredToAnimal;i++){simulation.step();resumed.step();expect(serializeCampaign(fork)).toBe(serializeCampaign(root));}expect(l.deliveredToAnimal).toBe(true);expect(item.owner).toEqual({type:'inventory',pawnId:a.id});expect(validateWorld(root)).toEqual([]);
},30000);
