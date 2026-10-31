import {expect,test} from 'vitest';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {createShipCountdownCoordinator298} from '../src/bridge/ship-countdown-coordinator-298.ts';
import {continueShipCredits298} from '../src/sim/ship-escape-runtime-298.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import type {EscapeCampaign298} from '../src/sim/ship-escape-state-298.ts';
import type {World} from '../src/sim/types.ts';
import {declaredReadyShip298} from './helpers/declared-ready-ship298.ts';

/* NEW finality: publication/NUM conservation after a real diagnostic departure,
 * not a replay qualification of launch pacing. Reuses the exact admitted be8
 * helper, no source services or fake finalizer. Summary views are never Whole
 * owners; only the authoritative source is validated/serialized/reloaded. */
function actualArchive(){
 const f=declaredReadyShip298(),coordinator=createShipCountdownCoordinator298(f.world);
 try{
  const start=coordinator.start(f.world,f.computer.id);expect(start.ok,start.ok?'':start.reason).toBe(true);if(!start.ok)throw Error(start.reason);
  let result=coordinator.updateEligible(0,f.world,start.generation);
  for(let n=0;n<32&&result.kind==='waiting';n++)result=coordinator.updateEligible(.25,f.world,start.generation);
  expect(result.kind,result.kind==='failed'?result.reason:'Real archive prerequisite').toBe('departed');if(result.kind!=='departed')throw Error('No actual departure');
  expect(validateWorld(f.world)).toEqual([]);const raw=serializeWorld(f.world);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
  return {...f,departureId:result.departureId,raw};
 }finally{coordinator.cleanup();}
}
function noRaw(value:unknown):void {
 if(!value||typeof value!=='object'||ArrayBuffer.isView(value))return;
 for(const [key,next]of Object.entries(value)){expect(key).not.toBe('escapedShips298');noRaw(next);}
}
function applied(decoder:SnapshotDecoder,packet:SnapshotMessage<true>){
 const result=decoder.adopt(packet);expect(result.status,result.status==='resync'?result.reason:'').toBe('applied');if(result.status!=='applied')throw Error('Snapshot was not applied');
 noRaw(result.world);return result;
}
function hasSummary(value:object):void {expect(Object.hasOwn(value,'escapedShipsSummary298')).toBe(true);expect(Object.hasOwn(value,'escapedShips298')).toBe(false);}
type Data=Record<string,unknown>;
const summary=(value:object)=>(value as Data).escapedShipsSummary298 as Data;
const creditHumans=(value:object)=>(summary(value)?.credits as {humans:{id:number;name:string}[]}|null|undefined)?.humans;
/** Find the actual id/name/status knowledge record in its public container;
 * it is never treated as a Pawn or a substitute Summary/Whole owner. */
function referenceNode(value:unknown,id:number,name:string):Data|undefined {
 if(!value||typeof value!=='object')return;
 const values=Object.values(value),record=value as Data;if(!Array.isArray(value)&&record.id===id&&record.name===name&&record.status==='away')return record;
 for(const next of values){const found=referenceNode(next,id,name);if(found)return found;}
}
function knownCredit(world:World,id:number,name:string):void {
 expect(creditHumans(world),'Real credits must reference the actual escaped human by ID and name').toContainEqual({id,name});
 const known=referenceNode(world,id,name);
 expect(known,'Credit reference must already occur among campaign people').toBeDefined();expect(known?.status).toBe('away');
}

test('a real archive publishes only a read summary, then retains its source/cache across checkpoint and ordinary credit deltas',()=>{
 const f=actualArchive(),w=f.world,encoder=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder();
 const source=registeredMapPresentation(w);expect(source).toBeDefined();
 const checkpoint=structuredClone(encoder.encode(w,0,0));expect(checkpoint.kind).toBe('checkpoint');noRaw(checkpoint);hasSummary(checkpoint.world);
 const first=applied(decoder,checkpoint);expect(first.replaced).toBe(true);knownCredit(first.world,f.actor.id,f.actor.name);expect(first.world.pawns.some(p=>p.id===f.actor.id)).toBe(false);const frozen=JSON.stringify(first.world);
 const unchanged=structuredClone(encoder.encode(w,0,0));expect(unchanged.kind).toBe('delta');if(unchanged.kind!=='delta')throw Error('Source cache was reset');
 expect(unchanged.epoch).toBe(checkpoint.epoch);expect(unchanged.baseRevision).toBe(checkpoint.revision);expect(unchanged.resources).toBeUndefined();expect(unchanged.piles).toBeUndefined();expect(unchanged.tiles).toBeUndefined();noRaw(unchanged);hasSummary(unchanged.world);
 expect(registeredMapPresentation(w)).toBe(source);
 const second=applied(decoder,unchanged);expect(second.replaced).toBe(false);knownCredit(second.world,f.actor.id,f.actor.name);expect(second.world).not.toBe(first.world);expect(second.world.tiles).toBe(first.world.tiles);expect(second.world.resources).toBe(first.world.resources);expect(second.world.piles).toBe(first.world.piles);
 expect(JSON.stringify(first.world)).toBe(frozen);
 expect(continueShipCredits298(w,f.departureId).ok).toBe(true);expect((w as EscapeCampaign298).escapedShips298!.credits).toBeNull();
 const closed=structuredClone(encoder.encode(w,0,0));expect(closed.kind).toBe('delta');if(closed.kind!=='delta')throw Error('Credit change reset the source');
 expect(closed.epoch).toBe(checkpoint.epoch);expect(closed.baseRevision).toBe(unchanged.revision);expect(registeredMapPresentation(w)).toBe(source);noRaw(closed);hasSummary(closed.world);
 const third=applied(decoder,closed);expect(third.replaced).toBe(false);expect(summary(third.world)?.credits).toBeNull();expect(third.world.tiles).toBe(second.world.tiles);expect(JSON.stringify(first.world)).toBe(frozen);
 expect(validateWorld(w)).toEqual([]);const text=serializeWorld(w);expect(serializeWorld(deserializeWorld(text))).toBe(text);
});

test('a forged credit name or injected RAW is refused atomically and the correct checkpoint/delta remains admissible',()=>{
 const f=actualArchive(),w=f.world,encoder=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder();
 const raw=(w as EscapeCampaign298).escapedShips298!;expect(raw.departures).toHaveLength(1);
 const checkpoint=structuredClone(encoder.encode(w,0,0)),badCheckpoint=structuredClone(checkpoint);
 Object.defineProperty(badCheckpoint.world,'escapedShips298',{value:structuredClone(raw),enumerable:true,writable:true,configurable:true});
 expect(decoder.adopt(badCheckpoint).status).toBe('resync');const first=applied(decoder,checkpoint),frozen=JSON.stringify(first.world),tiles=first.world.tiles,resources=first.world.resources,piles=first.world.piles;knownCredit(first.world,f.actor.id,f.actor.name);
 const correct=structuredClone(encoder.encode(w,0,0));expect(correct.kind).toBe('delta');if(correct.kind!=='delta')throw Error('Missing real delta');noRaw(correct);hasSummary(correct.world);
 const wrongName=structuredClone(correct),credit=creditHumans(wrongName.world)?.find(p=>p.id===f.actor.id);expect(credit).toBeDefined();if(!credit)throw Error('Missing real credit reference');
 credit.name=f.actor.name+' (autre)';
 const rejectedName=decoder.adopt(wrongName);expect(rejectedName.status).toBe('resync');if(rejectedName.status==='resync')expect(rejectedName.reason).toBe('Registre de campagne ou carte affichée invalide.');
 expect(JSON.stringify(first.world)).toBe(frozen);
 const invalid=structuredClone(correct);Object.defineProperty(invalid.world,'escapedShips298',{value:structuredClone(raw),enumerable:true,writable:true,configurable:true});
 expect(decoder.adopt(invalid).status).toBe('resync');expect(JSON.stringify(first.world)).toBe(frozen);expect(first.world.tiles).toBe(tiles);expect(first.world.resources).toBe(resources);expect(first.world.piles).toBe(piles);
 const next=applied(decoder,correct);expect(next.replaced).toBe(false);knownCredit(next.world,f.actor.id,f.actor.name);expect(next.world.tiles).toBe(tiles);expect(next.world.resources).toBe(resources);expect(next.world.piles).toBe(piles);
 expect(JSON.stringify(first.world)).toBe(frozen);expect(serializeWorld(w)).toBe(f.raw);
});
