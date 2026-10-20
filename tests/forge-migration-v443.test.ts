import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserializeWorld,deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {newApparelState} from '../src/sim/apparel-rules.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {newBuildingFuel} from '../src/sim/fuel.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {ARMOR_STUFFS267,isSmithingApparel267} from '../src/sim/smithing-apparel-267.ts';
import {smithingWorkTotal267} from '../src/sim/smithing-content-267.ts';
import {validSmithingHistoricalTransport267} from '../src/sim/smithing-catalogue-save-267.ts';
import type {World,MaterialPile,Structure} from '../src/sim/types.ts';

const REFERENCES=[
 ['Les Forges','v432/les-forges-crash-test.json'],
 ['Les Aulnes','v394/les-aulnes-integrees.json'],
 ['Les Éclaircies','v419/les-eclaircies.json'],
] as const;
function publicPayload(path:string):string {
 const stored=readFileSync(new URL(`../public/test-saves/${path}`,import.meta.url),'utf8'),envelope=JSON.parse(stored) as Record<string,unknown>;
 if(envelope.format!=='lisiere-save')return stored;
 if(envelope.version!==1||envelope.codec!=='gzip-base64'||typeof envelope.payload!=='string')throw Error('Unexpected public envelope');
 const bytes=gunzipSync(Buffer.from(envelope.payload,'base64'));expect(bytes.length).toBe(envelope.uncompressedBytes);return bytes.toString('utf8');
}
type Legacy266=Omit<World,'schemaVersion'>&{schemaVersion:266};
function legacy(w:World):Legacy266 {Object.assign(w,{schemaVersion:266});return w as unknown as Legacy266;}

test.each(REFERENCES)('%s upgrades a strict complete266 witness to267 by version number only',(label,path)=>{
 // The public sources predate266. Their ordinary pre-existing migrations are
 // applied first; this is an explicit266 witness, never called a raw266 file.
 const admitted=deserializeWorld(publicPayload(path));expect(admitted.schemaVersion).toBe(267);
 const old=legacy(admitted),bytes=JSON.stringify(old),before=JSON.parse(bytes),loaded=deserializeCampaign(bytes);
 // The reader performs strict266 validation BEFORE the number changes;
 // validateWorld/serializeCampaign deliberately accept current267 only.
 expect(validateWorld(loaded)).toEqual([]);
 expect(loaded.schemaVersion).toBe(267);expect(JSON.parse(serializeCampaign(loaded)),label).toEqual({...before,schemaVersion:267});
 expect(JSON.stringify(old)).toBe(bytes);
 // This includes complete maps, all original/terminal actors and possessions,
 // research, policies, timers, histories, allocators and PRNG streams.
},120000);

/** Current small fixture with only its prospective new default permissions
 * explicitly excluded before declaring the historical control. No archive or
 * historical fixture is rewritten, and migration may add none of them back. */
function oldCamp(){
 const f=reorganizationCamp256();
 for(const policy of f.w.apparelPolicies!){Object.assign(policy,{allowedItems:policy.allowedItems.filter(i=>!isSmithingApparel267(i)),allowedMaterials:policy.allowedMaterials.filter(m=>!(ARMOR_STUFFS267 as readonly string[]).includes(m))});}
 addMaterial(f.w,'wood',1,{type:'ground',x:4,z:4},'wood');legacy(f.w);
 const bytes=JSON.stringify(f.w);expect(deserializeCampaign(bytes).schemaVersion).toBe(267);expect(JSON.stringify(f.w)).toBe(bytes);return f;
}
const plate=(w:World,owner:MaterialPile['owner']={type:'ground',x:3,z:3}):MaterialPile=>({id:w.nextId++,item:'steel-plate-armor',kind:'apparel',quantity:1,owner,apparel:newApparelState('steel-plate-armor')});
const work=(w:World)=>({recipe:'make-plate-armor' as const,material:'steel' as const,authorId:w.pawns[0]!.id,progress:100,parts:[{item:'steel' as const,quantity:75},{item:'steel' as const,quantity:75},{item:'steel' as const,quantity:20}]});
const smithy=(w:World):Structure=>({id:w.nextId++,kind:'fueled-smithy',x:3,z:6,orientation:0,footprint:'standard',material:'steel',fuel:newBuildingFuel('fueled-smithy'),bills:[]});

test('266 refuses future goods, recipes, work markers, policy Stuff and packed targets before migration, without touching the caller',()=>{
 const {w,g}=oldCamp(),control=JSON.stringify(w),neutral=deserializeCampaign(control);
 expect(JSON.parse(serializeCampaign(neutral))).toEqual({...JSON.parse(control),schemaVersion:267});
 for(const [label,mutate] of [
  ['finished local apparel',(v:World)=>{v.piles.push(plate(v));}],
  ['actual away possession',(v:World)=>{const row=v.worldGroups!.groups.find(r=>r.state.id===g.id)!.state;if(!('members'in row))throw Error('Away owner missing');row.items.push(plate(v,{type:'inventory',pawnId:row.members[0]!.id}));}],
  ['future work marker on ordinary wood',(v:World)=>{Object.assign(v.piles.find(p=>p.item==='wood')!,{smithingWork:work(v)});}],
  ['unfinished identity',(v:World)=>{v.piles.push({id:v.nextId++,item:'unfinished-plate-armor',kind:'unfinished',quantity:1,owner:{type:'ground',x:5,z:5},smithingWork:work(v)});}],
  ['new recipe on existing station',(v:World)=>{v.structures[0]!.bills=[newCookingBill(v.nextId++,'make-simple-helmet')];}],
  ['new smelting recipe',(v:World)=>{v.structures[0]!.bills=[newCookingBill(v.nextId++,'smelt-apparel')];}],
  ['future policy item',(v:World)=>{Object.assign(v.apparelPolicies![0]!,{allowedItems:[...v.apparelPolicies![0]!.allowedItems,'wood-plate-armor']});}],
  ['future policy Stuff',(v:World)=>{Object.assign(v.apparelPolicies![0]!,{allowedMaterials:[...v.apparelPolicies![0]!.allowedMaterials,'steel']});}],
  ['new minified target',(v:World)=>{v.packed.push({building:smithy(v),owner:{type:'ground',x:3,z:6}});}],
 ] as const){
  const bad=JSON.parse(control) as World;mutate(bad);const bytes=JSON.stringify(bad);
  expect(validSmithingHistoricalTransport267(bad,266),label).toBe(false);expect(()=>deserializeCampaign(bytes),label).toThrow();expect(JSON.stringify(bad),label).toBe(bytes);expect(JSON.stringify(w)).toBe(control);
 }
 const ownUndefined=JSON.parse(control) as World;Object.assign(ownUndefined.piles.find(p=>p.item==='wood')!,{smithingWork:undefined});
 expect(validSmithingHistoricalTransport267(ownUndefined,266)).toBe(false);expect(Object.hasOwn(ownUndefined.piles.find(p=>p.item==='wood')!,'smithingWork')).toBe(true);
});

test('266 rejects future content in the actual inactive map and in public full envelopes',()=>{
 const {w}=oldCamp();
 // Restore current only to prepare an ordinary second map through the shared
 // helper, then retain that exact campaign as a266 historical control.
 Object.assign(w,{schemaVersion:267});preparedMap(w,52,'legacy-site',false);legacy(w);
 const control=JSON.stringify(w),bad=JSON.parse(control) as World,inactive=bad.worldMaps!.sites.find(s=>s.map)!.map!;
 expect(JSON.parse(serializeCampaign(deserializeCampaign(control)))).toEqual({...JSON.parse(control),schemaVersion:267});
 inactive.piles.push(plate(bad,{type:'ground',x:3,z:3}));const bytes=JSON.stringify(bad);
 expect(()=>deserializeCampaign(bytes)).toThrow();expect(JSON.stringify(bad)).toBe(bytes);expect(JSON.stringify(w)).toBe(control);
 const encoder=new SnapshotEncoder(),packet=structuredClone(encoder.encode(w,0,0));expect(new SnapshotDecoder().adopt(packet).status).toBe('applied');
 const forged=structuredClone(packet);if(forged.kind!=='checkpoint')throw Error('Expected full historical checkpoint');forged.world.piles.push(plate(forged.world));expect(new SnapshotDecoder().adopt(forged).status).toBe('resync');
});

test('267 strictly validates complete work receipts and same-tick public deltas, keeping the previously adopted instance unchanged after corruption',()=>{
 const w=registryCamp();w.piles.push(plate(w));
 const unfinished:MaterialPile={id:w.nextId++,item:'unfinished-plate-armor',kind:'unfinished',quantity:1,owner:{type:'ground',x:5,z:5},smithingWork:work(w)};w.piles.push(unfinished);
 expect(validateWorld(w)).toEqual([]);const saved=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(saved))).toBe(saved);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),full=structuredClone(encoder.encode(w,0,0)),first=decoder.adopt(full);
 expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Valid267 work checkpoint refused');const retained=structuredClone(first.world);
 unfinished.smithingWork!.progress++;const tick=w.tick,delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');expect(w.tick).toBe(tick);
 for(const [label,mutate] of [
  ['mixed materials',(p:MaterialPile)=>{p.smithingWork!.parts[0]!.item='gold';}],
  ['missing physical receipt',(p:MaterialPile)=>{p.smithingWork!.parts.pop();}],
  ['NaN progress',(p:MaterialPile)=>{p.smithingWork!.progress=NaN;}],
  ['excess work',(p:MaterialPile)=>{p.smithingWork!.progress=smithingWorkTotal267('make-plate-armor','steel')+1;}],
  ['wrong product family',(p:MaterialPile)=>{p.item='unfinished-simple-helmet';}],
  ['own undefined work',(p:MaterialPile)=>{Object.assign(p,{smithingWork:undefined});}],
 ] as const){
  const forged=structuredClone(delta);if(forged.kind!=='delta'||!forged.piles)throw Error('Expected actual same-tick pile delta');
  const target=forged.piles.upserted.find(p=>p.id===unfinished.id);if(!target)throw Error('Changed workpiece missing from public delta');mutate(target);
  expect(decoder.adopt(forged).status,label).toBe('resync');expect(first.world,label).toEqual(retained);
  const bad=deserializeWorld(saved),raw=bad.piles.find(p=>p.id===unfinished.id)!;mutate(raw);const bytes=JSON.stringify(bad);
  expect(()=>deserializeCampaign(bytes),label).toThrow();expect(JSON.stringify(bad),label).toBe(bytes);
 }
 const next=decoder.adopt(delta);expect(next.status).toBe('applied');if(next.status==='applied')expect(next.world.piles.find(p=>p.id===unfinished.id)!.smithingWork).toEqual(unfinished.smithingWork);
 expect(first.world).toEqual(retained);
});
