import {expect,test} from 'vitest';
import type {World} from '../src/sim/types';
import type {CampaignOnlyMessage} from '../src/bridge/protocol';
import {readSnapshotChanges,readSnapshotResourceStructure,readSnapshotStructureChanges} from '../src/bridge/snapshot-changes';
import {applyCommand} from '../src/sim/index';
import {prepareGroupScenario} from '../src/sim/group-scenario';
import {campaignOnlySummary} from '../src/sim/world-map-presentation';
import {registeredMapPresentation} from '../src/sim/world-map-presentation';
import {initialNativeWorldPawns256,type WorldPawnOwner256} from '../src/sim/world-pawn-state-256';
import {passNativeWorldPawnOrder256,removeNativeWorldPawnOrder256} from '../src/sim/native-world-pawn-order-256';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256';
import {fixture,harness} from './resident-presentation-fixtures-v427';

function noWitness(from:World,to:World){
 expect(readSnapshotChanges(from,to)).toBeUndefined();
 expect(readSnapshotStructureChanges(from,to)).toBeUndefined();
 expect(readSnapshotResourceStructure(from,to)).toBeUndefined();
}

test.each(['refuse','throw'] as const)('late extra %s preserves the prior version and all journals, then permits the exact retry',mode=>{
 const world=fixture();world.structures=[{id:world.nextId++,kind:'wall',x:6,z:6,orientation:0,footprint:'standard',material:'wood'}];
 const h=harness(world),first=h.send(),before=structuredClone(first);
 world.resources[0]!.growth=.5;world.tiles[1]={terrain:'soil',floor:'wood-planks'};world.structures[0]!.damage=1;
 const packet=h.packet();let rejected:World|undefined;
 const extra=(candidate:World)=>{rejected=candidate;if(mode==='throw')throw Error('late metadata exception');return false;};
 if(mode==='throw')expect(()=>h.reader.adopt(packet,extra)).toThrow('late metadata exception');
 else expect(h.reader.adopt(packet,extra).status).toBe('resync');
 expect(rejected).toBeDefined();noWitness(first,rejected!);expect(first).toStrictEqual(before);
 expect(readSnapshotChanges(first,first)).toEqual({resourceIndices:[],tileIndices:[]});
 const result=h.reader.adopt(packet);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Exact retry refused');
 expect(result.world.resources[0]!.growth).toBe(.5);expect(result.world.tiles[1]!.floor).toBe('wood-planks');expect(result.world.structures[0]!.damage).toBe(1);
 expect(readSnapshotChanges(first,result.world)).toEqual({resourceIndices:[0],tileIndices:[1]});
 expect(readSnapshotStructureChanges(first,result.world)).toEqual({structureIndices:[0],tileIndices:[1]});
 expect(readSnapshotResourceStructure(first,result.world)?.edges).toHaveLength(1);
 expect(first).toStrictEqual(before);expect(h.reader.adopt(packet).status).toBe('stale');
});

test('a refused checkpoint cannot reset an admitted journal; its accepted retry begins the new generation',()=>{
 const h=harness(),first=h.send();h.world.resources[0]!.growth=.4;const middle=h.send(),before=structuredClone(middle);
 const changes=readSnapshotChanges(first,middle),structures=readSnapshotStructureChanges(first,middle),resources=readSnapshotResourceStructure(first,middle);
 h.world.resources[1]!.growth=.5;const checkpoint=h.packet(true);let rejected:World|undefined;
 expect(checkpoint.kind).toBe('checkpoint');expect(h.reader.adopt(checkpoint,candidate=>{rejected=candidate;return false;}).status).toBe('resync');
 noWitness(middle,rejected!);expect(readSnapshotChanges(first,middle)).toEqual(changes);
 expect(readSnapshotStructureChanges(first,middle)).toEqual(structures);expect(readSnapshotResourceStructure(first,middle)).toEqual(resources);
 const retry=h.reader.adopt(checkpoint);expect(retry.status).toBe('applied');if(retry.status!=='applied')throw Error('Checkpoint retry refused');
 noWitness(first,retry.world);h.world.resources[0]!.growth=.6;const next=h.send();
 expect(readSnapshotChanges(retry.world,next)).toEqual({resourceIndices:[0],tileIndices:[]});expect(middle).toStrictEqual(before);
});

test('a real campaign-only view refuses atomically, then resets local bases on the real return checkpoint',()=>{
 // Existing 32-square prepared single-colony scenario; no extra map, voyage,
 // simulation loop or generation of a geographic globe is introduced here.
 const world=prepareGroupScenario();expect(applyCommand(world,{type:'planet-adopt'}).ok).toBe(true);
 const h=harness(world),firstPacket=h.packet(),first=h.reader.adopt(firstPacket);expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Initial map refused');
 const before=structuredClone(first.world);expect(applyCommand(world,{type:'map-view',mapId:null}).ok).toBe(true);
 // Existing campaign envelopes allow a signed civil clock. This is a prepared
 // transport boundary, with the elapsed simulation tick still nonnegative.
 world.worldMaps!.calendarOrigin=-1000-world.tick;
 const summary=campaignOnlySummary(world),header=h.encoder.campaignHeader(),encoded=h.encoder.encodeCampaignSummary(summary);
 expect(summary.civilTick).toBe(-1000);
 const only=structuredClone({type:'campaign-only',...header,summary:encoded.state,...encoded.geography?{geography:encoded.geography}:{},stepMs:0,speed:0,
  urgentThreats:{generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]}}) as CampaignOnlyMessage;
 let rejected:World|undefined;
 expect(h.reader.adoptCampaignOnly(only,candidate=>{rejected=candidate;return false;}).status).toBe('resync');noWitness(first.world,rejected!);
 expect(()=>h.reader.adoptCampaignOnly(only,()=>{throw Error('late globe metadata');})).toThrow('late globe metadata');
 const adopted=h.reader.adoptCampaignOnly(only);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Exact campaign retry refused');
 expect(adopted.summary).toStrictEqual(summary);expect(adopted.summary.activeMapId).toBeNull();
 expect(h.reader.adopt(firstPacket).status).toBe('stale');
 expect(applyCommand(world,{type:'map-view',mapId:world.worldMaps!.rootMapId!}).ok).toBe(true);
 const backPacket=h.packet();expect(backPacket.kind).toBe('checkpoint');const back=h.reader.adopt(backPacket);
 expect(back.status).toBe('applied');if(back.status!=='applied')throw Error('Return checkpoint refused');
 expect(back.replaced).toBe(true);expect(back.world).toStrictEqual(registeredMapPresentation(world));
 noWitness(first.world,back.world);expect(first.world).toStrictEqual(before);
});

test('complete dynamic replacement removes absent optional intentions without resurrecting the previous World fields',()=>{
 const world=fixture();world.home=[18];world.snowClearArea=[19];world.allowedAreas=[{id:world.nextId++,label:'A',color:0x123456,cells:[20]}];
 const h=harness(world),first=h.send(),before=structuredClone(first);
 delete world.home;delete world.snowClearArea;delete world.allowedAreas;
 const next=h.send();expect(next.tick).toBe(first.tick);
 for(const key of ['home','snowClearArea','allowedAreas'] as const){expect(Object.hasOwn(next,key)).toBe(false);expect(next[key]).toBeUndefined();}
 expect(first).toStrictEqual(before);expect(first.home).toEqual([18]);expect(first.snowClearArea).toEqual([19]);expect(first.allowedAreas).toHaveLength(1);
});

test('native slot holes and free order survive transport freezing, while a rewritten birth cannot consume a valid revision',()=>{
 // Prepared native-order component fixture, not a claim of a naturally born
 // campaign. Its actual set constructor/transitions bind unique physical rows.
 const world=fixture(),ids=[world.nextId++,world.nextId++,world.nextId++],state=initialNativeWorldPawns256({atCore:0,atAbsCore:7200000,firstThingId:ids[0]!});
 const owner=(id:number):Extract<WorldPawnOwner256,{kind:'animal'}>=>{
  const actor={id,species:'hare' as const,sex:'female' as const,ageTicks:1000000,x:1,z:1,food:.1,rest:.8,state:'idle' as const,path:[],nextDecision:1};
  attachGeneratedAnimalGrowth256(actor,0,256);
  return {kind:'animal',actor,factionId:null,originMapId:0,context:{seed:world.seed,width:world.width,height:world.height},clockCore:0,enteredAtAbsCore:7200000,mode:'active',items:[],packed:[]};
 };
 for(const id of ids){state.owners.push(owner(id));state.nativeOrder=passNativeWorldPawnOrder256(state.nativeOrder!,id,false);}
 state.nativeOrder=removeNativeWorldPawnOrder256(state.nativeOrder!,ids[1]!);state.owners=state.owners.filter(row=>row.actor.id!==ids[1]);world.worldPawns=state;
 const h=harness(world),first=h.send(),original=structuredClone(first.worldPawns),order=first.worldPawns!.nativeOrder!;
 expect(order.alive.slots).toEqual([ids[0],null,ids[2]]);expect(order.alive.free).toEqual([1]);
 expect(Object.isFrozen(order)).toBe(true);expect(Object.isFrozen(order.alive.slots)).toBe(true);expect(Object.isFrozen(order.alive.free)).toBe(true);
 const good=h.packet(),bad=structuredClone(good);Object.assign(bad.world.worldPawns!.nativeOrder!.birth,{atAbsCore:7200001});
 expect(h.reader.adopt(bad).status).toBe('resync');expect(first.worldPawns).toStrictEqual(original);
 const accepted=h.reader.adopt(good);expect(accepted.status).toBe('applied');if(accepted.status!=='applied')throw Error('Native-order retry refused');
 expect(accepted.world.worldPawns!.nativeOrder).toStrictEqual(order);expect(first.worldPawns).toStrictEqual(original);
});

test('expired bounded journal history falls back without rewriting old versions or losing the newest edge',()=>{
 const h=harness(),first=h.send(),before=structuredClone(first);let previous=first,latest=first;
 for(let i=0;i<66;i++){previous=latest;h.world.resources[0]!.growth=.4+i/1000;latest=h.send();}
 noWitness(first,latest);expect(first).toStrictEqual(before);
 expect(readSnapshotChanges(previous,latest)).toEqual({resourceIndices:[0],tileIndices:[]});
 expect(readSnapshotStructureChanges(previous,latest)).toEqual({structureIndices:[],tileIndices:[]});
 expect(readSnapshotResourceStructure(previous,latest)?.edges).toHaveLength(1);expect(latest.resources[0]!.growth).toBe(.4+65/1000);
});
