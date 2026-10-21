import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserializeCampaign,deserializeWorld,serializeCampaign,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {validProstheticHistoricalTransport273} from '../src/sim/catalogue-save-273.ts';
import {validProstheticWorkShape273} from '../src/sim/prosthetic-work-save-273.ts';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {researchCost} from '../src/sim/research.ts';
import {PROSTHETIC_ITEMS_273} from '../src/sim/prosthetic-content-273.ts';
import {isSchema272OrLater} from '../src/sim/schema-compatibility-257.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {SCHEMA_VERSION,type World,type MaterialPile} from '../src/sim/types.ts';

const refs=[['Les Forges','v432/les-forges-crash-test.json'],['Les Aulnes','v394/les-aulnes-integrees.json'],['Les Éclaircies','v419/les-eclaircies.json']] as const;
function payload(path:string){const text=readFileSync(new URL(`../public/test-saves/${path}`,import.meta.url),'utf8'),envelope=JSON.parse(text);if(envelope.format!=='lisiere-save')return text;const bytes=gunzipSync(Buffer.from(envelope.payload,'base64'));expect(bytes.length).toBe(envelope.uncompressedBytes);return bytes.toString('utf8');}
const historical=(w:World)=>JSON.stringify({...w,schemaVersion:272});
const work=(w:World):MaterialPile=>({id:w.nextId++,item:'unfinished-prosthetic',kind:'unfinished',quantity:1,owner:{type:'ground',x:5,z:5},prostheticWork273:{recipe:'make-prosthetic-leg',authorId:w.pawns[0]!.id,progress:100,parts:[{item:'steel',quantity:40},{item:'component',quantity:4}]}});

test('273 research and storage transport stay sparse, closed and prospective',()=>{
 expect(isSchema272OrLater(272)).toBe(true);expect(isSchema272OrLater(273)).toBe(true);
 for(const v of [271,277,'273',NaN])expect(isSchema272OrLater(v)).toBe(false);
 const w=registryCamp();expect(applyCommand(w,{type:'stockpile',enabled:true,x:4,z:4,filters:{wood:true,food:true}}).ok).toBe(true);
 const encoder=new SnapshotEncoder(),first=structuredClone(encoder.encode(w,0,0));expect(new SnapshotDecoder().adopt(structuredClone(first)).status).toBe('applied');if(first.kind!=='checkpoint')throw Error('Missing checkpoint');
 for(const change of [
  (v:World)=>Object.assign(v.research??={project:null,points:0},{prosthetics:{points:1}}),
  (v:World)=>Object.assign(v.stockpiles[0]!.filters,{prosthesis:1}),
 ]){const packet=structuredClone(first);change(packet.world);expect(new SnapshotDecoder().adopt(packet).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(packet.world))).toThrow();}
});

test.each(refs)('%s: reconstructed strict272 witness advances by number alone, without surgery, prosthetic, knowledge or RNG',(label,path)=>{
 const w=deserializeWorld(payload(path)),text=historical(w),before=JSON.parse(text),copy=deserializeCampaign(text);
 expect(copy.schemaVersion).toBe(SCHEMA_VERSION);expect(validateWorld(copy)).toEqual([]);expect(JSON.parse(serializeCampaign(copy)),label).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(copy.research?.prosthetics).toBeUndefined();expect(historical(w)).toBe(text);
},120000);

test('272 refuses new physical and clinical catalogue markers even false, on real owners and same-tick public envelopes',()=>{
 const {w,g}=reorganizationCamp256();expect(applyCommand(w,{type:'stockpile',enabled:true,x:4,z:4,filters:{wood:true,food:true}}).ok).toBe(true);const control=historical(w);
 expect(JSON.parse(serializeCampaign(deserializeCampaign(control)))).toEqual({...JSON.parse(control),schemaVersion:SCHEMA_VERSION});
 const cases:readonly (readonly [string,(v:World)=>void])[]=[
  ...PROSTHETIC_ITEMS_273.map(item=>[item,(v:World)=>v.piles.push({id:v.nextId++,kind:'prosthesis',item,quantity:1,owner:{type:'ground',x:4,z:4}})] as const),
  ['paid prosthetic work',v=>v.piles.push(work(v))],
  ['recipe',v=>{v.structures[0]!.bills=[newCookingBill(v.nextId++,'make-prosthetic-leg')];}],
  ['false research marker',v=>{Object.assign(v.research??={project:null,points:0},{prosthetics:false});}],
  ['false item filter',v=>{(v.stockpiles[0]!.items??={})['prosthetic-arm']=false;}],
  ['false category filter',v=>{v.stockpiles[0]!.filters.prosthesis=false;}],
  ['implanted industrial root',v=>{const p=v.pawns[0]!;p.health??={tick:v.tick,nextInjuryId:1,injuries:[],missing:[],bloodLoss:0};Object.assign(p.health,{artificialParts:[{part:'left-shoulder',kind:'prosthetic-arm',installedAt:p.health.tick}]});}],
  ['false extraction intent',v=>{Object.assign(v.pawns[0]!,{surgeryRequest:{part:'left-leg',requestedAt:v.tick,removeArtificial273:false}});}],
  ['fire loss catalogue',v=>{Object.assign(v,{fires:{ledger:{items:{'prosthetic-leg':1}}}});}],
  ['away original possession',v=>{const row=(v.worldGroups?.groups??(v.campaignMap?.revision===2?v.campaignMap.groups:[])).find(r=>r.state.id===g.id)!.state;if(!('members'in row))throw Error('Missing actual away owner');row.items.push({id:v.nextId++,item:'prosthetic-arm',kind:'prosthesis',quantity:1,owner:{type:'inventory',pawnId:row.members[0]!.id}});}],
 ];
 for(const [label,mutate]of cases){
  const bad=JSON.parse(control) as World;mutate(bad);const text=JSON.stringify(bad);expect(validProstheticHistoricalTransport273(bad,272),label).toBe(false);expect(()=>deserializeCampaign(text),label).toThrow();expect(JSON.stringify(bad)).toBe(text);expect(historical(w)).toBe(control);
  const old=JSON.parse(control) as World,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),checkpoint=structuredClone(encoder.encode(old,0,0)),first=decoder.adopt(structuredClone(checkpoint));expect(first.status,label).toBe('applied');if(first.status!=='applied'||checkpoint.kind!=='checkpoint')throw Error('Valid272 checkpoint refused');const retained=structuredClone(first.world);
  mutate(checkpoint.world);expect(new SnapshotDecoder().adopt(checkpoint).status,label).toBe('resync');expect(first.world).toEqual(retained);
  mutate(old);const delta=structuredClone(encoder.encode(old,0,0));expect(delta.kind).toBe('delta');expect(decoder.adopt(delta).status,label).toBe('resync');expect(first.world).toEqual(retained);
 }
 const future=JSON.parse(control);future.schemaVersion=277;expect(()=>deserializeCampaign(JSON.stringify(future))).toThrow();expect(validProstheticHistoricalTransport273(future,277)).toBe(false);
},120000);

test('inactive original temporary map retains its predecessor when future item/filter markers are refused',()=>{
 const w=registryCamp(),map=preparedMap(w,52,'legacy-site',false),control=historical(w);expect(validateWorld(w)).toEqual([]);
 map.piles.push({id:w.nextId++,item:'prosthetic-leg',kind:'prosthesis',quantity:1,owner:{type:'ground',x:4,z:4}});
 const bad=historical(w);expect(validProstheticHistoricalTransport273(JSON.parse(bad),272)).toBe(false);expect(()=>deserializeCampaign(bad)).toThrow();expect(JSON.parse(serializeCampaign(deserializeCampaign(control)))).toEqual({...JSON.parse(control),schemaVersion:SCHEMA_VERSION});
});

test('273 admits paid receipts and finished physical item through matching same-tick full/delta while forged receipts stay transactional',()=>{
 const w=registryCamp();w.research??={project:null,points:0};w.research.smithing={points:researchCost('smithing'),completedAt:w.tick};w.research.machining={points:researchCost('machining'),completedAt:w.tick};w.research.prosthetics={points:researchCost('prosthetics'),completedAt:w.tick};
 const encoder=new SnapshotEncoder(),strict=new SnapshotDecoder(),resident=new ResidentPresentationAssembler(),first=structuredClone(encoder.encode(w,0,0));const a=strict.adopt(structuredClone(first)),b=resident.adopt(first);expect(a.status).toBe('applied');expect(b.status).toBe('applied');if(a.status!=='applied'||b.status!=='applied')throw Error('Valid273 checkpoint refused');const before=structuredClone(a.world);
 const q=work(w);w.piles.push(q);expect(validateWorld(w)).toEqual([]);const saved=serializeWorld(w),delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 for(const [label,mutate]of [
  ['missing component',(p:MaterialPile)=>p.prostheticWork273!.parts[1]!.quantity=3],
  ['foreign material',(p:MaterialPile)=>Object.assign(p.prostheticWork273!.parts[1]!,{item:'wood'})],
  ['unearned progress',(p:MaterialPile)=>p.prostheticWork273!.progress=15_000_001],
  ['foreign identity',(p:MaterialPile)=>Object.assign(p,{item:'unfinished-component'})],
 ] as const){const bad=structuredClone(delta);if(bad.kind!=='delta'||!bad.piles)throw Error('Expected real pile delta');mutate(bad.piles.upserted.find(p=>p.id===q.id)!);expect(strict.adopt(bad).status,label).toBe('resync');expect(a.world).toEqual(before);const raw=JSON.parse(saved) as World;mutate(raw.piles.find(p=>p.id===q.id)!);expect(()=>deserializeCampaign(JSON.stringify(raw)),label).toThrow();}
 const accepted=strict.adopt(structuredClone(delta)),displayed=resident.adopt(delta);expect(accepted.status).toBe('applied');expect(displayed.status).toBe('applied');if(accepted.status==='applied'&&displayed.status==='applied')expect(displayed.world).toEqual(accepted.world);
 expect(validProstheticWorkShape273(q as unknown as Record<string,unknown>,273)).toBe(true);expect(validProstheticWorkShape273(q as unknown as Record<string,unknown>,272)).toBe(false);
 w.piles=w.piles.filter(p=>p.id!==q.id);const product:MaterialPile={id:w.nextId++,item:'prosthetic-leg',kind:'prosthesis',quantity:1,owner:{type:'ground',x:5,z:5}};w.piles.push(product);const finished=structuredClone(encoder.encode(w,0,0)),c=strict.adopt(structuredClone(finished)),d=resident.adopt(finished);expect(c.status).toBe('applied');expect(d.status).toBe('applied');if(c.status==='applied'&&d.status==='applied')expect(d.world).toEqual(c.world);expect(a.world).toEqual(before);expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
});
