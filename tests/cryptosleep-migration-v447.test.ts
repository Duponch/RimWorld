import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserializeCampaign,deserializeWorld,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {validCryptosleepHistoricalTransport271} from '../src/sim/catalogue-save-271.ts';
import {registryCamp} from './helpers/world-maps-v255.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';

const references=[['Les Forges','v432/les-forges-crash-test.json'],['Les Aulnes','v394/les-aulnes-integrees.json'],['Les Éclaircies','v419/les-eclaircies.json']] as const;
function payload(path:string){const text=readFileSync(new URL(`../public/test-saves/${path}`,import.meta.url),'utf8'),raw=JSON.parse(text);if(raw.format!=='lisiere-save')return text;const bytes=gunzipSync(Buffer.from(raw.payload,'base64'));expect(bytes.length).toBe(raw.uncompressedBytes);return bytes.toString('utf8');}
test.each(references)('%s: strict270 advances by number only, without casket, clinical anchor, memory offset or research',(label,path)=>{
 const migrated=deserializeWorld(payload(path)),old={...migrated,schemaVersion:270},text=JSON.stringify(old),copy=deserializeCampaign(text);
 expect(validateWorld(copy)).toEqual([]);expect(JSON.parse(serializeCampaign(copy)),label).toEqual({...old,schemaVersion:SCHEMA_VERSION});
 expect(copy.research?.cryptosleep).toBeUndefined();expect(JSON.stringify(old)).toBe(text);
},120000);

test('270 and public checkpoints reject future holder/clinical/memory fields in actual domains without altering the retained state',()=>{
 const w=registryCamp();Object.assign(w,{schemaVersion:270});const text=JSON.stringify(w);
 const mutations:readonly [string,(v:World)=>void][]=[
  ['suspended person',v=>{v.pawns[0]!.cryptosleepHeldAt271=v.tick;}],
  ['human clinical civil clock',v=>{Object.assign(v.pawns[0]!,{health:{tick:v.tick,civilTick271:v.tick,nextInjuryId:1,injuries:[],missing:[],bloodLoss:0}});}],
  ['meal memory correction',v=>{v.pawns[0]!.memories=[{kind:'ate-raw-food',expiresAt:v.tick+6000,suspendedTicks:1}];}],
  ['false research marker',v=>{Object.assign(v.research??={project:null,points:0},{cryptosleep:false});}],
  ['false holder marker',v=>{Object.assign(v.structures[0]!,{cryptosleep:false});}],
  ['retained holder envelope',v=>{Object.assign(v.worldPawns??={revision:1,atCore:v.tick*10,lastSuccessfulCore:0,currentRate:1,owners:[]},{heldPlayerCaskets271:[]});}],
  ['tree suspended clock',v=>{Object.assign(v.destroyed??={count:0,lost:{}},{suspendedTicks271:1});}],
 ];
 for(const [label,mutate]of mutations){
  const old=JSON.parse(text) as World,encoder=new SnapshotEncoder(),packet=structuredClone(encoder.encode(old,0,0)),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(packet));
  expect(first.status,label).toBe('applied');if(first.status!=='applied'||packet.kind!=='checkpoint')throw Error('Valid original270 checkpoint refused');const retained=structuredClone(first.world);
  mutate(old);const bad=JSON.stringify(old);expect(validCryptosleepHistoricalTransport271(old,270),label).toBe(false);expect(()=>deserializeCampaign(bad),label).toThrow();expect(JSON.stringify(old)).toBe(bad);
  mutate(packet.world);expect(new SnapshotDecoder().adopt(packet).status,label).toBe('resync');expect(first.world).toEqual(retained);
 }
 const future=JSON.parse(text);future.schemaVersion=SCHEMA_VERSION+1;expect(()=>deserializeCampaign(JSON.stringify(future))).toThrow();expect(validCryptosleepHistoricalTransport271(future,SCHEMA_VERSION+1)).toBe(false);
});
