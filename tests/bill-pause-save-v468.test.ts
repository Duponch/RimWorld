import {expect,test} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {validBillPauseBuilding289,validBillPauseHistoricalTransport289,validBillPauseWorld289} from '../src/sim/bill-pause-save-289.ts';
import {deserializeWorld,serializeWorld,validateWorld,validateCampaignSchema288} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {isSchema256Or257,isSchema283OrLater,isSchema287OrLater,isSchema288OrLater} from '../src/sim/schema-compatibility-257.ts';
import {validAnimalThermalRefugeField288} from '../src/sim/animal-thermal-refuge-save-288.ts';
import type {CookingBill} from '../src/sim/cooking-types.ts';
import type {Structure,World} from '../src/sim/types.ts';

const pause=(paused=true)=>({enabled:true,resumeAt:5,paused});
const first=(s:Structure):CookingBill=>s.bills![0]!;
function station(w:World):Structure {
 const s=fixtureBuilding(w,'campfire',4,4) as Structure;
 s.bills=[newCookingBill(w.nextId++,'simple-meal',w.schemaVersion)];first(s).mode='until';first(s).target=10;
 return s;
}
function envelopes(s:unknown):unknown[]{return [
 {structures:[s]}, {packed:[{building:s}]},
 {world:{schemaVersion:288},structures:{removed:[],upserted:[s]}},
 {dynamic:{structures:{removed:[],upserted:[s]}}},
 {summary:{worldMaps:{sites:[{map:{structures:[s],packed:[{building:s}]}}]}}},
 {secondarySite:{map:{packed:[{building:s}]}}},
 {campaignMap:{groups:[{state:{packed:[{building:s}]}}]}},
 {group:{packed:[{building:s}]}},
 {worldGroups:{groups:[{state:{packed:[{building:s}]}},{pending261:{packed:[{building:s}]}}],losses:[{packed:[{building:s}]}],animalLosses:[{packed:[{building:s}]}],abandonedPawns:[{packed:[{building:s}]}],abandonedContents:[{humans:[{packed:[{building:s}]}],animals:[{packed:[{building:s}]}]}]}},
 {worldPawns:{owners:[{actor:{id:1},packed:[{building:s}]}],heldCaskets259:[{casket:{cryptosleep:{packed:[{building:s}]}}}],heldPlayerCaskets271:[{casket:{cryptosleep:{packed:[{building:s}]}}}],heldShipCaskets277:[{casket:{shipCryptosleep277:{packed:[{building:s}]}}}]}},
 {worldFactions:{leaders:[{packed:[{building:s}]}]}},
 {structures:[{cryptosleep:{packed:[{building:s}]}},{shipCryptosleep277:{packed:[{building:s}]}}]},
 {visitors:{departed:[{pawn:{id:1},packed:[{building:s}]}]},podRescues:{departed:[{packed:[{building:s}]}]}},
 {groupLosses:[{packed:[{building:s}]}],animalLosses:[{packed:[{building:s}]}]},
];}

test('289 alone admits an explicit reserve memory; earlier absence remains literal and future290 is closed',()=>{
 const w=deconstructionCamp(2),s=station(w);
 for(const version of [1,256,283,287,288,289])expect(validBillPauseBuilding289(s,version)).toBe(true);
 first(s).reservePause=pause();
 expect(validBillPauseBuilding289(s,289)).toBe(true);
 for(const version of [1,256,283,287,288,290,NaN,289.5])expect(validBillPauseBuilding289(s,version)).toBe(false);
 const zero=structuredClone(s);first(zero).target=0;first(zero).reservePause={enabled:true,resumeAt:-1,paused:true};
 expect(validBillPauseBuilding289(zero,289)).toBe(true);
 first(zero).reservePause={enabled:false,resumeAt:9999,paused:false};expect(validBillPauseBuilding289(zero,289)).toBe(true);
});

test('invalid scalar state, unsupported recipes, ownundefined and forged fields are refused without repairing memory',()=>{
 const w=deconstructionCamp(2),s=station(w);first(s).reservePause=pause();
 for(const value of [undefined,null,false,[],{}, {...pause(),enabled:1},{...pause(),paused:0},{...pause(),resumeAt:-2},{...pause(),resumeAt:10000},{...pause(),resumeAt:.5},{...pause(),resumeAt:NaN},{...pause(),future290:true}]){
  const copy=structuredClone(s);Object.defineProperty(first(copy),'reservePause',{value,enumerable:true});
  expect(validBillPauseBuilding289(copy,289)).toBe(false);
 }
 for(const recipe of ['smelt-weapon','smelt-apparel','cremate-corpse','burn-apparel','__proto__','future-recipe']){
  const copy=structuredClone(s);Object.assign(first(copy),{recipe});expect(validBillPauseBuilding289(copy,289)).toBe(false);
 }
 const before=JSON.stringify(s);expect(validBillPauseBuilding289(s,289)).toBe(true);expect(JSON.stringify(s)).toBe(before);
});

test('reserve descriptors and inherited state fail with zero getter calls',()=>{
 let reads=0;const w=deconstructionCamp(2),s=station(w);
 const getter=structuredClone(s);Object.defineProperty(first(getter),'reservePause',{enumerable:true,get(){reads++;throw Error('No pause getter');}});
 const state=pause();Object.defineProperty(state,'paused',{enumerable:true,get(){reads++;throw Error('No paused getter');}});
 const hidden=structuredClone(s);Object.defineProperty(first(hidden),'reservePause',{value:pause(),enumerable:false});
 const inherited=Object.assign(Object.create({reservePause:pause()}),first(s));
 const symbol={...pause(),[Symbol('extra')]:true};
 for(const candidate of [getter,hidden,{...s,bills:[{...first(s),reservePause:state}]},{...s,bills:[inherited]},{...s,bills:[{...first(s),reservePause:symbol}]}])expect(validBillPauseBuilding289(candidate,289)).toBe(false);
 const recipeGetter=structuredClone(s);first(recipeGetter).reservePause=pause();Object.defineProperty(first(recipeGetter),'recipe',{enumerable:true,get(){reads++;throw Error('No recipe getter');}});
 expect(validBillPauseBuilding289(recipeGetter,289)).toBe(false);expect(reads).toBe(0);
});

test('historical, current and sparse transports fence all real custody lanes without mutation',()=>{
 const record={bills:[{recipe:'simple-meal',reservePause:pause()}]};
 for(const raw of envelopes(record)){
  const before=JSON.stringify(raw);
  for(const version of [1,256,283,287,288,290])expect(validBillPauseHistoricalTransport289(raw,version)).toBe(false);
  expect(validBillPauseHistoricalTransport289(raw,289)).toBe(true);expect(JSON.stringify(raw)).toBe(before);
 }
 const bad={bills:[{recipe:'simple-meal',reservePause:{...pause(),resumeAt:-2}}]};
 for(const raw of envelopes(bad))expect(validBillPauseHistoricalTransport289(raw,289)).toBe(false);
});

test('custody accessors and loops are refused while terrain and personal physiology are never read',()=>{
 const w=deconstructionCamp(2),s=station(w);first(s).reservePause=pause();let reads=0;
 for(const key of ['tiles','resources','pawns','planet'] as const)Object.defineProperty(w,key,{enumerable:true,configurable:true,get(){reads++;throw Error(`No ${key}`);}});
 expect(validBillPauseWorld289(w)).toBe(true);expect(reads).toBe(0);
 const bad={};Object.defineProperty(bad,'packed',{enumerable:true,get(){reads++;throw Error('No packed getter');}});
 expect(validBillPauseHistoricalTransport289({group:bad},289)).toBe(false);
 const schema={};Object.defineProperty(schema,'schemaVersion',{enumerable:true,get(){reads++;throw Error('No schema getter');}});
 expect(validBillPauseWorld289(schema)).toBe(false);
 const loop:{world?:unknown}={};loop.world=loop;expect(validBillPauseHistoricalTransport289(loop,289)).toBe(false);expect(reads).toBe(0);
});

test('registered maps retain the same installed and packed memories without touching map grids',()=>{
 const root=registryCamp(),remote=preparedMap(root),s=station(remote);first(s).reservePause=pause();
 const cargo=structuredClone(s);cargo.id=root.nextId++;first(cargo).id=root.nextId++;
 remote.packed.push({building:cargo,owner:{type:'inventory',pawnId:remote.pawns[0]!.id}});flushRegisteredMap(remote);
 const record=root.worldMaps!.sites.find(row=>row.map?.structures.some(b=>b.id===s.id))!.map!;
 let reads=0;for(const key of ['tiles','resources','home','roofing','snow','thermal'] as const)Object.defineProperty(record,key,{enumerable:true,configurable:true,get(){reads++;throw Error(`No ${key}`);}});
 expect(validBillPauseWorld289(root)).toBe(true);first(cargo).reservePause!.resumeAt=-2;
 expect(validBillPauseWorld289(root)).toBe(false);expect(reads).toBe(0);
});

test('strict288 migration changes only the number and never adds reserve settings or pause memory',()=>{
 const w=deconstructionCamp(2),s=station(w),old=JSON.parse(serializeWorld(w));old.schemaVersion=288;
 expect(validateCampaignSchema288(old)).toEqual([]);
 const saved=JSON.stringify(old),copy=deserializeWorld(saved);
 expect(JSON.parse(serializeWorld(copy))).toEqual({...old,schemaVersion:289});
 expect(Object.hasOwn(first(copy.structures.find(b=>b.id===s.id)!),'reservePause')).toBe(false);
 expect(JSON.stringify(old)).toBe(saved);
 old.structures.find((b:Structure)=>b.id===s.id).bills[0].reservePause=pause();
 expect(validateCampaignSchema288(old).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/pause/i);
});

test('current RAW roundtrip preserves acquired pause independently of manual suspension and stock',()=>{
 const w=deconstructionCamp(2),s=station(w);first(s).reservePause=pause();first(s).suspended=true;
 expect(validateWorld(w)).toEqual([]);const saved=serializeWorld(w),copy=deserializeWorld(saved);
 expect(serializeWorld(copy)).toBe(saved);expect(first(copy.structures.find(b=>b.id===s.id)!).reservePause).toEqual(pause());
});

test.each([false,true])('pause-only same-object publication survives public and resident transport, malformed state refuses atomically (checkpoint=%s)',checkpoint=>{
 const w=deconstructionCamp(2),s=station(w),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 first(s).reservePause=pause(false);
 const opening=structuredClone(encoder.encode(w,0,0));expect(decoder.adopt(structuredClone(opening)).status).toBe('applied');expect(resident.adopt(structuredClone(opening)).status).toBe('applied');
 first(s).reservePause!.paused=true;const good=structuredClone(encoder.encode(w,0,0,checkpoint)),bad=structuredClone(good);
 const buildings='structures'in bad?bad.structures!.upserted:bad.world.structures;first(buildings.find(b=>b.id===s.id)!).reservePause!.resumeAt=-2;
 expect(decoder.adopt(structuredClone(bad)).status).toBe('resync');expect(resident.adopt(structuredClone(bad)).status).toBe('resync');
 const a=decoder.adopt(structuredClone(good)),b=resident.adopt(structuredClone(good));expect(a.status).toBe('applied');expect(b.status).toBe('applied');
 if(a.status!=='applied'||b.status!=='applied')throw Error('Valid pause publication refused');
 expect(first(a.world.structures.find(p=>p.id===s.id)!).reservePause).toEqual(pause());expect(b.world).toEqual(a.world);
});

test('new family preserves old capability lower bounds and rejects numeric strings and future290',()=>{
 for(const fn of [isSchema256Or257,isSchema283OrLater,isSchema287OrLater,isSchema288OrLater]){
  expect(fn(289)).toBe(true);expect(fn(290)).toBe(false);expect(fn('289')).toBe(false);
 }
 expect(isSchema256Or257('262')).toBe(false);expect(isSchema256Or257('263')).toBe(false);
 expect(isSchema283OrLater(282)).toBe(false);expect(isSchema287OrLater(286)).toBe(false);expect(isSchema288OrLater(287)).toBe(false);
 const task={mapId:0,target:{x:3,z:4},phase:'travel',startedAtCore:20};
 expect(validAnimalThermalRefugeField288({animalThermalRefuge288:task},288,2,32,32,true)).toBe(true);
 expect(validAnimalThermalRefugeField288({animalThermalRefuge288:task},289,2,32,32,true)).toBe(true);
 expect(validAnimalThermalRefugeField288({animalThermalRefuge288:task},287,2,32,32,true)).toBe(false);
 expect(validAnimalThermalRefugeField288({animalThermalRefuge288:task},290,2,32,32,true)).toBe(false);
});
