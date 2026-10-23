import {expect,test} from 'vitest';
import {validForestryHistoricalTransport291,validForestryResearch291,validSownResource291} from '../src/sim/forestry-save-291';
import {TREE_SOWING_COST_291,FORESTRY_SPECIES_291,isGrowingPlantInVersion291} from '../src/sim/forestry-content-291';
import {deserializeWorld,serializeWorld,validateCampaignSchema290,validateWorld} from '../src/sim/serialization';
import {validateWildFlora,advanceWildFlora} from '../src/sim/wild-flora';
import {validPlantLife} from '../src/sim/plant-life-save';
import {createPlantLife} from '../src/sim/plant-life';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler';
import {validOriginalTreeResource} from '../src/sim/tree-transfer-resource-save';
import {deconstructionCamp} from './scenarios/deconstruction';
import {treeTransferScene,preparedTreeWrapper} from './scenarios/tree-transfer-v349';
import {SCHEMA_VERSION,type Resource,type World} from '../src/sim/types';

const tree=(w:World):Resource=>{const r:Resource={id:w.nextId++,kind:'tree',species:'oak',amount:46,x:4,z:4,sown291:true,growth:.0001,growthTick:w.tick};r.plantLife=createPlantLife(w,r,true);return r;};
const envelopes=(resource:unknown)=>[
 {resources:[resource]}, {world:{resources:[resource]}}, {dynamic:{resources:{upserted:[resource],removed:[]}}},
 {worldMaps:{sites:[{map:{resources:[resource]}}]}}, {secondarySite:{map:{resources:[resource]}}},
 {worldGroups:{groups:[{state:{items:[{innerResource:resource}]}}],losses:[{items:[{innerResource:resource}]}],abandonedContents:[{humans:[{items:[{innerResource:resource}]}]}]}},
 {worldPawns:{owners:[{actor:{items:[{innerResource:resource}]}}],heldShipCaskets277:[{casket:{shipCryptosleep277:{items:[{innerResource:resource}]}}}]}},
 {startingArrival:{pods:[{items:[{innerResource:resource}]}]}}, {structures:[{cryptosleep:{items:[{innerResource:resource}]}},{shipCryptosleep277:{items:[{innerResource:resource}]}}]},
];

test('cultivated provenance is literal true only on the thirteen real tree species in291 and never inferred from birth',()=>{
 const w=deconstructionCamp(),r=tree(w);
 for(const species of FORESTRY_SPECIES_291)expect(validSownResource291({...r,species},291)).toBe(true);
 expect(validSownResource291(r,292)).toBe(true);expect(validSownResource291(r,293)).toBe(true);for(const version of [1,87,256,289,290,294,'291',NaN])expect(validSownResource291(r,version)).toBe(false);
 for(const value of [false,undefined,null,1,'true'])expect(validSownResource291({...r,sown291:value},291)).toBe(false);
 for(const patch of [{kind:'rice'},{species:'grass'},{species:undefined}])expect(validSownResource291({...r,...patch},291)).toBe(false);
 const old={...r};delete old.sown291;expect(validSownResource291(old,290)).toBe(true);expect(Object.hasOwn(old,'sown291')).toBe(false);
});

test('cultivated state refuses inherited and accessor fields without executing getters',()=>{
 const r=tree(deconstructionCamp());let reads=0;
 const getter={...r};Object.defineProperty(getter,'sown291',{enumerable:true,get(){reads++;throw Error('No getter');}});
 const hidden={...r};Object.defineProperty(hidden,'sown291',{value:true,enumerable:false});
 const inherited=Object.assign(Object.create({sown291:true}),{...r});delete inherited.sown291;
 for(const value of [getter,hidden,inherited])expect(validSownResource291(value,291)).toBe(false);
 expect(reads).toBe(0);
});

test('prospective choices and research preserve old seven crops while294 and old marked envelopes remain closed',()=>{
 expect(isGrowingPlantInVersion291('rice',290)).toBe(true);expect(isGrowingPlantInVersion291('oak',290)).toBe(false);
 expect(isGrowingPlantInVersion291('oak',291)).toBe(true);expect(isGrowingPlantInVersion291('rice',292)).toBe(true);expect(isGrowingPlantInVersion291('rice',293)).toBe(true);expect(isGrowingPlantInVersion291('rice',294)).toBe(false);
 const state={project:'tree-sowing',points:0,treeSowing291:{points:10}};
 expect(validForestryResearch291(state,291,10)).toBe(true);
 expect(validForestryResearch291(state,292,10)).toBe(true);expect(validForestryResearch291(state,293,10)).toBe(true);for(const version of [290,294,'291'])expect(validForestryResearch291(state,version,10)).toBe(false);
 for(const p of [{points:TREE_SOWING_COST_291},{points:TREE_SOWING_COST_291,completedAt:11},{points:0,completedAt:0},{points:'1'},{points:1,future:true}])expect(validForestryResearch291({...state,treeSowing291:p},291,10)).toBe(false);
 expect(validForestryResearch291({...state,project:null,treeSowing291:{points:TREE_SOWING_COST_291,completedAt:10}},291,10)).toBe(true);
 expect(validForestryResearch291({project:'tree-sowing',points:0},291,10)).toBe(false);
});

test('strict290 migration changes only the number and offers no tree research choice birth or cultivated origin',()=>{
 const w=deconstructionCamp(),old=JSON.parse(serializeWorld(w));old.schemaVersion=290;
 const before=JSON.stringify(old);expect(validateCampaignSchema290(old)).toEqual([]);
 const loaded=deserializeWorld(before);expect(JSON.parse(serializeWorld(loaded))).toEqual({...old,schemaVersion:SCHEMA_VERSION});expect(JSON.stringify(old)).toBe(before);
 expect(loaded.research?.treeSowing291).toBeUndefined();expect(loaded.resources.some(r=>Object.hasOwn(r,'sown291'))).toBe(false);
 old.research={project:'tree-sowing',points:0,treeSowing291:{points:0}};
 expect(validateCampaignSchema290(old).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/forestry/i);
});

test('RAW sparse map caravan archive and casket custody fence the same original without mutation or terrain reads',()=>{
 const r=tree(deconstructionCamp());
 for(const raw of envelopes(r)){
  const before=JSON.stringify(raw);expect(validForestryHistoricalTransport291(raw,291)).toBe(true);expect(validForestryHistoricalTransport291(raw,290)).toBe(false);expect(JSON.stringify(raw)).toBe(before);
 }
 let reads=0;const raw={resources:[r]};Object.defineProperty(raw,'tiles',{get(){reads++;throw Error('No terrain');}});
 expect(validForestryHistoricalTransport291(raw,291)).toBe(true);expect(reads).toBe(0);
 expect(validForestryHistoricalTransport291({pawns:[r]},291)).toBe(false);
 const loop:{world?:unknown}={};loop.world=loop;expect(validForestryHistoricalTransport291(loop,291)).toBe(false);
});

test('forest zone and research records cannot cross290 even through retained or sparse envelopes',()=>{
 const zone={id:1,plant:'oak',cells:[4],allowSow:true,allowCut:true};
 for(const raw of [{growingZones:[zone]},{dynamic:{growingZones:[zone]}},{worldMaps:{sites:[{map:{growingZones:[zone]}}]}}]){
  expect(validForestryHistoricalTransport291(raw,290)).toBe(false);expect(validForestryHistoricalTransport291(raw,291)).toBe(true);
 }
 const progress={research:{project:null,points:0,treeSowing291:{points:1}}};expect(validForestryHistoricalTransport291(progress,290)).toBe(false);expect(validForestryHistoricalTransport291(progress,291)).toBe(true);
 expect(validForestryHistoricalTransport291({worldPawns:{owners:[{treeSowing291:{points:1}}]}},291)).toBe(false);
});

test('legacy map without a flora owner admits only newly marked trees in291 without inventing a flora owner',()=>{
 const w=deconstructionCamp();delete w.climate;delete w.flora;w.resources=[tree(w)];
 expect(validPlantLife(w.resources[0]!,291,w)).toBe(true);expect(validateWildFlora(w,291)).toBe(true);
 expect(validateWildFlora(w,290)).toBe(false);delete w.resources[0]!.sown291;expect(validateWildFlora(w,291)).toBe(false);
 expect(w.flora).toBeUndefined();
});

test('legacy flora quota counts wild trees but never increases its capacity for a new cultivated tree',()=>{
 const w=treeTransferScene('oak',.1),r=w.resources[0]!;r.sown291=true;r.plantLife!.bornAt=r.plantLife!.since;const flora=w.flora;if(!flora||flora.revision!==1)throw Error('Expected the actual legacy flora owner');flora.capacity=0;
 expect(validateWildFlora(w,291)).toBe(true);expect(validateWildFlora(w,290)).toBe(false);
 const before=JSON.stringify(w);flora.nextCheck=w.tick;const capacity=flora.capacity;advanceWildFlora(w);
 expect(flora.capacity).toBe(capacity);expect(w.resources).toHaveLength(1);expect(w.resources[0]).toBe(r);
 expect(before).toContain('sown291');delete r.sown291;expect(validateWildFlora(w,291)).toBe(false);
});

test('packed tree retains cultivated origin with the same inner identity independently of destination knowledge',()=>{
 const {w,pile,source}=preparedTreeWrapper('oak',.8);source.sown291=true;source.plantLife!.bornAt=source.plantLife!.since;
 expect(validOriginalTreeResource(source,w,291,pile.plantPack.packedAt)).toBe(true);expect(validOriginalTreeResource(source,w,290,pile.plantPack.packedAt)).toBe(false);
 const before=JSON.stringify(pile);expect(validForestryHistoricalTransport291({worldPawns:{owners:[{items:[pile]}]}},291)).toBe(true);expect(JSON.stringify(pile)).toBe(before);
 expect(pile.innerResource).toBe(source);expect(w.research?.treeSowing291).toBeUndefined();
});

test('current RAW and full public resident snapshots conserve marked trees without teaching the owner',()=>{
 const w=treeTransferScene('oak',.5);w.resources[0]!.sown291=true;w.resources[0]!.plantLife!.bornAt=w.resources[0]!.plantLife!.since;
 expect(validateWorld(w)).toEqual([]);const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
 const packet=structuredClone(new SnapshotEncoder().encode(w,0,0));
 for(const receiver of [new SnapshotDecoder(),new ResidentPresentationAssembler()]){
  const result=receiver.adopt(structuredClone(packet));expect(result.status).toBe('applied');
  if(result.status==='applied')expect(result.world.resources[0]!.sown291).toBe(true);
 }
 expect(w.research?.treeSowing291).toBeUndefined();
});

test('malformed checkpoint provenance refuses before commit and the same valid publication can still be adopted',()=>{
 const w=treeTransferScene('oak',.5),encoder=new SnapshotEncoder(),receivers=[new SnapshotDecoder(),new ResidentPresentationAssembler()];
 const opening=structuredClone(encoder.encode(w,0,0));for(const receiver of receivers)expect(receiver.adopt(structuredClone(opening)).status).toBe('applied');
 w.resources=[{...w.resources[0]!,sown291:true,plantLife:{...w.resources[0]!.plantLife!,bornAt:w.resources[0]!.plantLife!.since}}];const valid=structuredClone(encoder.encode(w,0,0,true)),bad=structuredClone(valid);
 if(bad.kind!=='checkpoint')throw Error('Expected a full checkpoint');Object.assign(bad.world.resources[0]!,{sown291:false});
 for(const receiver of receivers){expect(receiver.adopt(structuredClone(bad)).status).toBe('resync');expect(receiver.adopt(structuredClone(valid)).status).toBe('applied');}
});

test('same-object provenance changes publish a real base upsert and survive delta adoption',()=>{
 const w=treeTransferScene('oak',.5),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const source=w.resources[0]!;source.plantLife!.bornAt=source.plantLife!.since;
 const opening=structuredClone(encoder.encode(w,0,0));expect(decoder.adopt(structuredClone(opening)).status).toBe('applied');expect(resident.adopt(structuredClone(opening)).status).toBe('applied');
 source.sown291=true;
 const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 if(delta.kind!=='delta')throw Error('Expected delta');expect(delta.resources?.upserted.some(r=>r.id===source.id&&r.sown291===true)).toBe(true);
 for(const receiver of [decoder,resident]){const result=receiver.adopt(structuredClone(delta));expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world.resources[0]!.sown291).toBe(true);}
});

test('new supported family keeps predecessor content and numeric lower bounds while294 stays closed',async()=>{
 const {isSchema256Or257,isSchema288OrLater,isSchema289OrLater}=await import('../src/sim/schema-compatibility-257');
 for(const guard of [isSchema256Or257,isSchema288OrLater,isSchema289OrLater]){expect(guard(291)).toBe(true);expect(guard(292)).toBe(true);expect(guard(293)).toBe(true);expect(guard(294)).toBe(false);expect(guard('291')).toBe(false);}
 expect(isSchema288OrLater(287)).toBe(false);expect(isSchema289OrLater(288)).toBe(false);
 const {validCoveredInFirefoamField290}=await import('../src/sim/firefoam-actor-state-290');
 for(const version of [290,291,292,293])expect(validCoveredInFirefoamField290({coveredInFirefoam290:{remainingCore:900}},version)).toBe(true);
 expect(validCoveredInFirefoamField290({coveredInFirefoam290:{remainingCore:900}},294)).toBe(false);
});
