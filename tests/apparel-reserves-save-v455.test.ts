import {expect,test} from 'vitest';
import * as schemas from '../src/sim/schema-compatibility-257.ts';
import {validApparelReservesBuilding278,validApparelReservesHistoricalTransport278} from '../src/sim/apparel-reserves-save-278.ts';
import {newCookingBill,validBillSettings} from '../src/sim/cooking-bills.ts';
import {newApparelCountFilter278} from '../src/sim/apparel-count-278.ts';
import {CLOTHING_RESEARCH_COST} from '../src/sim/research.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {openGroupReorganization} from '../src/sim/group-reorganization-balance.ts';
import {deserializeCampaign,serializeCampaign,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {preparedMap} from './helpers/world-maps-v255.ts';
import type {CookingBill} from '../src/sim/cooking-types.ts';
import type {Structure,World} from '../src/sim/types.ts';

const DOMAINS=['installed','minified','caravan','inactive-map'] as const;
type Domain=typeof DOMAINS[number];
/** Prepared ownership/knowledge fixture only. No textile production, trip,
 * construction, minification, progress, dose, time or RNG acquisition is claimed. */
function owners455(){
 const {w,g}=reorganizationCamp256();w.research={project:null,points:CLOTHING_RESEARCH_COST,completedAt:w.tick};
 const bench=(x:number,z:number):Structure=>({id:w.nextId++,kind:'tailor-bench',x,z,orientation:0,footprint:'standard',material:'wood',bills:[newCookingBill(w.nextId++,'shirt',277)]});
 const installed=bench(5,5),minified=bench(6,6),cargo=bench(7,7);w.structures.push(installed);
 w.packed.push({building:minified,owner:{type:'ground',x:6,z:6}});
 g.packed=[{building:cargo,owner:{type:'inventory',pawnId:g.members[0]!.id}}];
 g.reorganization=openGroupReorganization(g,[],w.tick,g.reorganization!.memberOrigins);
 const inactive=preparedMap(w,52,'legacy-site',false),remote=bench(4,4);let placed=false;
 for(let z=2;z<inactive.height-2&&!placed;z++)for(let x=2;x<inactive.width-2&&!placed;x++){
  const cells=footprintCells({...remote,x,z});if(cells.every(c=>c.x>=0&&c.z>=0&&c.x<inactive.width&&c.z<inactive.height
   &&inactive.tiles[c.z*inactive.width+c.x]!.terrain==='grass'&&!inactive.resources.some(r=>r.x===c.x&&r.z===c.z)
   &&!inactive.structures.some(s=>footprintCells(s).some(p=>p.x===c.x&&p.z===c.z)))){Object.assign(remote,{x,z});placed=true;}
 }
 if(!placed)throw Error('No real inactive-map bench footprint');inactive.structures.push(remote);
 const ids:Record<Domain,number>={installed:installed.bills![0]!.id,minified:minified.bills![0]!.id,caravan:cargo.bills![0]!.id,'inactive-map':remote.bills![0]!.id};
 expect(validateWorld(w)).toEqual([]);return {w,ids};
}
function bill455(w:World,id:number):CookingBill {
 const buildings=[...w.structures,...w.packed.map(p=>p.building),...w.worldMaps!.sites.flatMap(s=>s.map?.structures??[]),
  ...w.worldGroups!.groups.flatMap(r=>'members'in r.state?(r.state.packed??[]).map(p=>p.building):[])];
 const bill=buildings.flatMap(s=>s.bills??[]).find(b=>b.id===id);if(!bill)throw Error('Missing original prepared bill');return bill;
}
const old455=(w:World):World=>{const old=structuredClone(w);Object.assign(old,{schemaVersion:277});return old;};
function public455(w:World){
 const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),strict=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const packet=structuredClone(encoder.encode(w,0,0)),a=strict.adopt(structuredClone(packet)),b=resident.adopt(structuredClone(packet));
 expect(a.status).toBe('applied');expect(b.status).toBe('applied');if(a.status!=='applied'||b.status!=='applied')throw Error('Valid original publication refused');
 expect(b.world).toEqual(a.world);return {encoder,strict,resident,packet,a,b};
}

test('278 extends every supported closed family while old capabilities and future279 stay distinct',()=>{
 for(const [name,family]of Object.entries(schemas)){
  expect(family(278),name).toBe(true);expect(family(279),name).toBe(false);expect(family('278'),name).toBe(false);expect(family(278.5),name).toBe(false);
  expect(family(277),name).toBe(name!=='isSchema278OrLater');
 }
 expect(schemas.isSchema277OrLater(276)).toBe(false);expect(schemas.isSchema271OrLater(270)).toBe(false);
});

test('strict277 migrates every original map and minified/caravan bill by number alone without offering reserve filters',()=>{
 const {w,ids}=owners455(),before=old455(w),text=JSON.stringify(before),after=deserializeCampaign(text);
 expect(validateWorld(after)).toEqual([]);expect(JSON.parse(serializeCampaign(after))).toEqual({...before,schemaVersion:278});
 expect(JSON.stringify(before)).toBe(text);expect(after.tick).toBe(before.tick);expect(after.rng).toBe(before.rng);expect(after.nextId).toBe(before.nextId);
 for(const id of Object.values(ids))expect(Object.hasOwn(bill455(after as World,id),'apparelCount')).toBe(false);
 const oldBill=bill455(before,ids.installed);expect(validBillSettings(oldBill,'shirt',277)).toBe(true);expect(validBillSettings(oldBill,'shirt',278)).toBe(true);
});

test.each(DOMAINS)('277 refuses future reserve settings in the original %s owner before migration',domain=>{
 const {w,ids}=owners455(),before=old455(w),text=JSON.stringify(before),bad=structuredClone(before);
 bill455(bad,ids[domain]).apparelCount=newApparelCountFilter278();const changed=JSON.stringify(bad);
 expect(validApparelReservesHistoricalTransport278(bad,277)).toBe(false);expect(()=>deserializeCampaign(changed)).toThrow();
 expect(JSON.stringify(bad)).toBe(changed);expect(JSON.stringify(before)).toBe(text);
});

test('historical sparse and retained namespaces reject own false/undefined and inherited/accessor markers without reading terrain or getters',()=>{
 const filter=newApparelCountFilter278();
 for(const value of [filter,undefined,false,null])for(const raw of [
  {structures:[{bills:[{recipe:'shirt',apparelCount:value}]}]},
  {world:{schemaVersion:277},structures:{removed:[],upserted:[{bills:[{recipe:'shirt',apparelCount:value}]}]}},
  {worldPawns:{owners:[{packed:[{building:{bills:[{recipe:'shirt',apparelCount:value}]}}]}]}},
  {worldGroups:{abandonedContents:[{humans:[{packed:[{building:{bills:[{recipe:'shirt',apparelCount:value}]}}]}]}]}},
 ]){expect(validApparelReservesHistoricalTransport278(raw,277)).toBe(false);expect(validApparelReservesHistoricalTransport278(raw,278)).toBe(true);expect(validApparelReservesHistoricalTransport278(raw,279)).toBe(false);}
 let reads=0;const terrain={structures:[{kind:'wall'}]};Object.defineProperty(terrain,'tiles',{enumerable:true,get(){reads++;throw Error('Terrain must not be read');}});
 expect(validApparelReservesHistoricalTransport278(terrain,277)).toBe(true);
 const getter=newCookingBill(1,'shirt',277);Object.defineProperty(getter,'apparelCount',{enumerable:true,get(){reads++;throw Error('Filter must not be read');}});
 const inherited=Object.assign(Object.create({apparelCount:filter}),newCookingBill(1,'shirt',277));
 for(const bill of [getter,inherited]){expect(validApparelReservesHistoricalTransport278({structures:[{bills:[bill]}]},277)).toBe(false);expect(validApparelReservesBuilding278({bills:[bill]},278)).toBe(false);expect(validBillSettings(bill,'shirt',277)).toBe(false);expect(validBillSettings(bill,'shirt',278)).toBe(false);}
 expect(reads).toBe(0);
});

test('278 persists explicit filters on installed, minified, caravan and inactive-map originals with exact RAW/public continuation',()=>{
 const {w,ids}=owners455();
 for(const [i,id]of Object.values(ids).entries())bill455(w,id).apparelCount={hpMin:51+i,hpMax:100,qualityMin:'normal',qualityMax:'legendary',includeEquipped:i%2===0};
 expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w),copy=deserializeCampaign(raw);expect(serializeCampaign(copy)).toBe(raw);
 const p=public455(w),retained=structuredClone(p.a.world),shown=structuredClone(p.b.world);
 bill455(w,ids.installed).apparelCount!.includeEquipped=false;bill455(w,ids.minified).apparelCount!.hpMin=65;
 const delta=structuredClone(p.encoder.encode(w,0,0));expect(delta.kind).toBe('delta');expect(Object.hasOwn(delta,'structures')).toBe(true);
 const a=p.strict.adopt(structuredClone(delta)),b=p.resident.adopt(structuredClone(delta));expect(a.status).toBe('applied');expect(b.status).toBe('applied');
 if(a.status!=='applied'||b.status!=='applied')throw Error('Valid reserve delta refused');expect(b.world).toEqual(a.world);
 expect(a.world.structures.find(s=>s.bills?.some(q=>q.id===ids.installed))!.bills![0]!.apparelCount?.includeEquipped).toBe(false);
 expect(a.world.packed.find(q=>q.building.bills?.some(b=>b.id===ids.minified))!.building.bills![0]!.apparelCount?.hpMin).toBe(65);
 expect(p.a.world).toEqual(retained);expect(p.b.world).toEqual(shown);expect(serializeCampaign(deserializeCampaign(serializeWorld(w)))).toBe(serializeWorld(w));
});

test.each(['installed','minified'] as const)('277 checkpoint and same-tick %s delta reject the future field atomically',domain=>{
 const {w,ids}=owners455(),before=old455(w),p=public455(before),retained=structuredClone(p.a.world),shown=structuredClone(p.b.world);
 const full=structuredClone(p.packet);if(full.kind!=='checkpoint')throw Error('Expected checkpoint');
 const mutate=(v:World)=>{const b=domain==='installed'?v.structures.flatMap(s=>s.bills??[]).find(b=>b.id===ids.installed):v.packed.flatMap(p=>p.building.bills??[]).find(b=>b.id===ids.minified);if(!b)throw Error('Missing wire bill');b.apparelCount=newApparelCountFilter278();};
 mutate(full.world);expect(new SnapshotDecoder().adopt(structuredClone(full)).status).toBe('resync');expect(new ResidentPresentationAssembler().adopt(full).status).toBe('resync');
 mutate(before);const delta=structuredClone(p.encoder.encode(before,0,0));expect(delta.kind).toBe('delta');expect(delta.world.tick).toBe(p.a.world.tick);
 expect(p.strict.adopt(structuredClone(delta)).status).toBe('resync');expect(p.resident.adopt(delta).status).toBe('resync');expect(p.a.world).toEqual(retained);expect(p.b.world).toEqual(shown);
});

test('malformed278 reserve domains and wrong recipes are refused by RAW/checkpoint/delta without changing retained worlds',()=>{
 for(const value of [null,false,{...newApparelCountFilter278(),hpMin:101},{...newApparelCountFilter278(),qualityMin:'legendary',qualityMax:'awful'},{...newApparelCountFilter278(),includeEquipped:0},{...newApparelCountFilter278(),unknown:false}]){
  const {w,ids}=owners455(),p=public455(w),retained=structuredClone(p.a.world),shown=structuredClone(p.b.world);
  bill455(w,ids.installed).apparelCount=value as never;expect(validateWorld(w).length).toBeGreaterThan(0);expect(()=>deserializeCampaign(serializeWorld(w))).toThrow();
  const full=structuredClone(p.packet);if(full.kind!=='checkpoint')throw Error('Expected checkpoint');full.world.structures.find(s=>s.bills?.some(b=>b.id===ids.installed))!.bills![0]!.apparelCount=value as never;
  expect(new SnapshotDecoder().adopt(structuredClone(full)).status).toBe('resync');expect(new ResidentPresentationAssembler().adopt(full).status).toBe('resync');
  const delta=structuredClone(p.encoder.encode(w,0,0));expect(p.strict.adopt(structuredClone(delta)).status).toBe('resync');expect(p.resident.adopt(delta).status).toBe('resync');expect(p.a.world).toEqual(retained);expect(p.b.world).toEqual(shown);
 }
 const wrong={...newCookingBill(1,'simple-meal',277),apparelCount:newApparelCountFilter278()};
 expect(validApparelReservesBuilding278({bills:[wrong]},278)).toBe(false);expect(validBillSettings(wrong,'simple-meal',278)).toBe(false);
});

test('future279 stays closed at RAW and both public checkpoint boundaries',()=>{
 const {w}=owners455(),p=public455(w),future={...w,schemaVersion:279};expect(()=>deserializeCampaign(JSON.stringify(future))).toThrow();
 const packet=structuredClone(p.packet);Object.assign(packet.world,{schemaVersion:279});
 expect(new SnapshotDecoder().adopt(structuredClone(packet)).status).toBe('resync');expect(new ResidentPresentationAssembler().adopt(packet).status).toBe('resync');
});
