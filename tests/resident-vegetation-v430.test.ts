import {expect,test} from 'vitest';
import {SnapshotDecoder} from '../src/bridge/snapshots';
import {ResidentVegetationAssembler} from '../src/bridge/resident-vegetation-assembler';
import {readPreparedNaturalFrame,collectPreparedNaturalChanges} from '../src/bridge/prepared-natural-frame';
import {residentPublication,readResidentWorkerMessage} from '../src/bridge/resident-protocol';
import {floraSize,isResidentCrop} from '../src/bridge/natural-appearance-values';
import {harvestable} from '../src/sim/plants';
import {plantLeafless} from '../src/sim/plant-life';
import {applyCommand} from '../src/sim/index';
import {prepareGroupScenario} from '../src/sim/group-scenario';
import {campaignOnlySummary} from '../src/sim/world-map-presentation';
import type {CampaignOnlyMessage} from '../src/bridge/protocol';
import type {World} from '../src/sim/types';
import {vegetationHarness,type VegetationEnvelope430} from './resident-vegetation-fixtures-v430';

function assertFrame(world:World){
 const frame=readPreparedNaturalFrame(world);expect(frame).toBeDefined();if(!frame)throw Error('Missing frame');
 expect(frame.tick).toBe(world.tick);expect(frame.naturalCount).toBe(world.resources.filter(r=>!isResidentCrop(r)).length);
 for(const r of world.resources){
  if(isResidentCrop(r)){expect(frame.lookup(r.id)).toBeUndefined();continue;}
  expect(frame.lookup(r.id)).toStrictEqual({size:floraSize(world,r),ripe:r.kind==='berries'&&harvestable(world,r),leafless:plantLeafless(world,r),harvestable:harvestable(world,r)});
 }
 return frame;
}

test('real publication agrees with public admission and literal appearance; silent same-tick growth and intentions keep numeric pages unchanged',()=>{
 const h=vegetationHarness(),strict=new SnapshotDecoder(),before=structuredClone(h.world),firstPacket=h.packet();
 const a=h.reader.adopt(firstPacket),oracle=strict.adopt(structuredClone(firstPacket));expect(a.status).toBe('applied');expect(oracle.status).toBe('applied');
 if(a.status!=='applied'||oracle.status!=='applied')throw Error('Initial stream refused');
 expect(a.world).toStrictEqual(oracle.world);expect(h.world).toStrictEqual(before);const first=assertFrame(a.world);
 // This legacy numerical fixture has no adopted snow state. A home-area edit
 // is a valid same-tick intention; adding snowClearArea alone is not a SAVE.
 h.world.resources[0]!.growth=.31;h.world.home=[0];
 const envelope=h.envelope();expect(envelope.natural.upsert).toEqual([]);const packet=h.unwrap(envelope),b=h.reader.adopt(packet),publicB=strict.adopt(structuredClone(packet));
 expect(b.status).toBe('applied');expect(publicB.status,publicB.status==='resync'?publicB.reason:undefined).toBe('applied');if(b.status!=='applied'||publicB.status!=='applied')throw Error('Delta refused');
 expect(b.world).toStrictEqual(publicB.world);expect(b.world.tick).toBe(a.world.tick);expect(b.world.resources).not.toBe(a.world.resources);
 const second=assertFrame(b.world);expect(collectPreparedNaturalChanges(first,second)).toEqual([]);
 expect(readPreparedNaturalFrame(structuredClone(b.world))).toBeUndefined();expect(Object.isFrozen(second.lookup(b.world.resources[0]!.id))).toBe(true);
});

test('skipped publications and later adoption retain the exact older frame beyond the resource journal window',()=>{
 const h=vegetationHarness(),a=h.send(),first=assertFrame(a),id=a.resources[0]!.id,old=first.lookup(id);
 let latest=a;
 for(let i=0;i<70;i++){h.world.resources[0]!.growth=i%2?.3:.95;latest=h.send();}
 const c=assertFrame(latest);expect(c.lookup(id)).toStrictEqual(old);expect(collectPreparedNaturalChanges(first,c)).toEqual([id]);
 h.world.resources[0]!.growth=.95;const d=h.send(),after=assertFrame(d);
 expect(after.lookup(id)!.ripe).toBe(true);expect(c.lookup(id)).toStrictEqual(old);expect(first.lookup(id)).toStrictEqual(old);
 expect(collectPreparedNaturalChanges(c,after)).toEqual([id]);
});

test.each(['refuse','throw'] as const)('late extra %s leaves frames and the base transaction intact, with an exact retry',mode=>{
 const h=vegetationHarness(),a=h.send(),first=assertFrame(a);h.world.resources[0]!.growth=.95;
 const packet=h.packet(),snapshot=structuredClone(packet);let rejected:World|undefined;
 const extra=(world:World)=>{rejected=world;if(mode==='throw')throw Error('late natural metadata');return false;};
 if(mode==='throw')expect(()=>h.reader.adopt(packet,extra)).toThrow('late natural metadata');else expect(h.reader.adopt(packet,extra).status).toBe('resync');
 expect(rejected).toBeDefined();expect(readPreparedNaturalFrame(rejected!)).toBeUndefined();expect(readPreparedNaturalFrame(a)).toBe(first);expect(packet).toStrictEqual(snapshot);
 const retry=h.reader.adopt(packet);expect(retry.status).toBe('applied');if(retry.status!=='applied')throw Error('Retry refused');assertFrame(retry.world);
 expect(h.reader.adopt(packet).status).toBe('stale');expect(first.lookup(a.resources[0]!.id)!.ripe).toBe(false);
});

test('sidecar metadata, sparse arrays, getter rows and missing physical births cannot advance an admitted frame',()=>{
 const h=vegetationHarness(),a=h.send(),first=assertFrame(a);h.world.resources[0]!.growth=.95;
 h.world.resources.push({id:h.world.nextId++,kind:'berries',x:4,z:2,amount:5,growth:.9,growthTick:h.world.tick});
 const good=h.envelope(),row=good.natural.upsert[0]!,born=h.world.resources.at(-1)!.id;
 const corruptions:((envelope:VegetationEnvelope430)=>void)[]=[
  envelope=>Object.assign(envelope.natural,{tick:envelope.natural.tick+1}),
  envelope=>Object.assign(envelope.natural,{baseRevision:0}),
  envelope=>Object.assign(envelope.natural,{upsert:[{...row,ordinal:999}]}),
  envelope=>Object.assign(envelope.natural,{upsert:[...envelope.natural.upsert,row]}),
  envelope=>Object.assign(envelope.natural,{upsert:envelope.natural.upsert.filter(r=>r.id!==born)}),
  envelope=>Object.assign(envelope.natural,{removed:[a.resources[1]!.id]}),
  envelope=>Object.assign(envelope.natural,{upsert:envelope.natural.upsert.map(r=>r.id===row.id?{...r,size:0}:r)}),
  envelope=>{delete (envelope.natural.upsert as unknown as unknown[])[0];},
 ];
 for(const corrupt of corruptions){const bad=structuredClone(good);corrupt(bad);expect(h.reader.adopt(h.unwrap(bad)).status).toBe('resync');expect(readPreparedNaturalFrame(a)).toBe(first);}
 let reads=0;const bad=structuredClone(good);Object.defineProperty(bad.natural.upsert[0]!,'size',{enumerable:true,get(){reads++;return .5;}});
 expect(h.reader.adopt(h.unwrap(bad)).status).toBe('resync');expect(reads).toBe(0);
 const accepted=h.reader.adopt(h.unwrap(good));expect(accepted.status).toBe('applied');if(accepted.status!=='applied')throw Error('Good retry refused');assertFrame(accepted.world);
});

test('membership removals, ID return and crop transitions are exact; omissions and explicit reorder retain a numeric reset',()=>{
 const h=vegetationHarness(),a=h.send(),first=assertFrame(a),resource={...h.world.resources[0]!},id=resource.id;
 h.world.resources.splice(0,1);const removal=h.envelope(),bad=structuredClone(removal);Object.assign(bad.natural,{removed:[]});
 expect(h.reader.adopt(h.unwrap(bad)).status).toBe('resync');const removed=h.reader.adopt(h.unwrap(removal));expect(removed.status).toBe('applied');if(removed.status!=='applied')throw Error('Removal refused');
 const absent=assertFrame(removed.world);expect(absent.lookup(id)).toBeUndefined();expect(collectPreparedNaturalChanges(first,absent)).toContain(id);
 h.world.resources.push(resource);const back=h.send(),returned=assertFrame(back);expect(returned.lookup(id)).toStrictEqual(first.lookup(id));expect(collectPreparedNaturalChanges(first,returned)).toContain(id);
 h.world.resources[h.world.resources.length-1]={id,kind:'rice',x:resource.x,z:resource.z,amount:resource.amount,growth:.3,growthTick:h.world.tick};
 const cropFrame=assertFrame(h.send());expect(cropFrame.lookup(id)).toBeUndefined();
 h.world.resources[h.world.resources.length-1]={...resource};const natural=assertFrame(h.send());expect(natural.lookup(id)).toBeDefined();
 h.world.resources.reverse();const reordered=assertFrame(h.send());expect(collectPreparedNaturalChanges(natural,reordered)).toBeUndefined();
});

test('v2 is a closed lane and complete checkpoints replace the domain without putting presentation fields in public packets',()=>{
 const h=vegetationHarness(),envelope=h.envelope(),packet=h.unwrap(envelope),fresh=new ResidentVegetationAssembler();
 expect(Object.keys(envelope).sort()).toEqual(['natural','publication','type','version']);expect(Object.hasOwn(packet,'natural')).toBe(false);expect(Object.hasOwn(packet,'trusted')).toBe(false);
 expect(()=>readResidentWorkerMessage(packet)).toThrow();for(const version of [1,3])expect(()=>readResidentWorkerMessage({...envelope,version})).toThrow();
 expect(fresh.adopt(structuredClone(packet)).status).toBe('resync');expect(new SnapshotDecoder().adopt(structuredClone(packet)).status).toBe('applied');
 const accepted=fresh.adopt(packet);expect(accepted.status).toBe('applied');if(accepted.status!=='applied')throw Error('Initial frame refused');const a=assertFrame(accepted.world);
 const checkpoint=h.envelope(true),next=fresh.adopt(h.unwrap(checkpoint));expect(next.status).toBe('applied');if(next.status!=='applied')throw Error('Checkpoint refused');
 expect(collectPreparedNaturalChanges(a,assertFrame(next.world))).toBeUndefined();expect(a.lookup(accepted.world.resources[0]!.id)).toBeDefined();
});

test('real campaign-only admission requires its null sidecar and the return creates a fresh full frame',()=>{
 const world=prepareGroupScenario();expect(applyCommand(world,{type:'planet-adopt'}).ok).toBe(true);
 const h=vegetationHarness(world),a=h.send(),first=assertFrame(a);expect(applyCommand(world,{type:'map-view',mapId:null}).ok).toBe(true);
 const header=h.encoder.campaignHeader(),encoded=h.encoder.encodeCampaignSummary(campaignOnlySummary(world));
 const only={type:'campaign-only',...header,summary:encoded.state,...encoded.geography?{geography:encoded.geography}:{},stepMs:0,speed:0,
  urgentThreats:{generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]}} as CampaignOnlyMessage;
 expect(h.reader.adoptCampaignOnly(only).status).toBe('resync');
 const decoded=readResidentWorkerMessage(structuredClone(residentPublication(only)));if(decoded.type!=='campaign-only')throw Error('Mapless expected');
 expect(h.reader.adoptCampaignOnly(decoded,()=>false).status).toBe('resync');expect(readPreparedNaturalFrame(a)).toBe(first);
 expect(h.reader.adoptCampaignOnly(decoded).status).toBe('applied');h.producer.clear();
 expect(applyCommand(world,{type:'map-view',mapId:world.worldMaps!.rootMapId!}).ok).toBe(true);
 const back=assertFrame(h.send());expect(collectPreparedNaturalChanges(first,back)).toBeUndefined();
});
