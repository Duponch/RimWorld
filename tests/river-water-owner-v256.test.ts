import {expect,test} from 'vitest';
import {packRiverWater256,unpackRiverWater256,validStoredRiverWater256,validRiverWaterEnvelope256,validRiverWaterCampaignRaw256,freezeAdmittedRiverWater256} from '../src/sim/river-water-owner-256.ts';
import {prepareRiverWaterSnapshot256} from '../src/bridge/river-water-transport-256.ts';
test('a real-size x-major float32 column roundtrips all bits including negative zero without a live alias',()=>{
 const width=250,height=250,values=new Float32Array(width*height*2);values[(17*height+29)*2]=Math.fround(-.3125);values[(17*height+29)*2+1]=Math.fround(1.75);values[0]=-0;
 const owner=packRiverWater256(values,width,height),restored=unpackRiverWater256(JSON.parse(JSON.stringify(owner)),width,height);
 expect(owner.values).toHaveLength(125000);expect(Object.is(restored[0],-0)).toBe(true);expect(restored[(17*height+29)*2]).toBe(-.3125);expect(restored[(17*height+29)*2+1]).toBe(1.75);
 expect(Array.from(new Uint32Array(restored.buffer))).toEqual(Array.from(new Uint32Array(values.buffer)));values[0]=1;expect(owner.values[0]).toBe(0x80000000);restored[0]=2;expect(owner.values[0]).toBe(0x80000000);
});
test('cold RAW guards refuse future fields on either original map, nonfinite words, holes, getters and wrong extents',()=>{
 // These are domain-guard headers, never a fabricated World or Planet owner.
 const owner=packRiverWater256(new Float32Array(8*8*2),8,8),header={schemaVersion:256,width:8,height:8,site:{revision:3},planet:{revision:3},riverWater:owner};expect(validRiverWaterEnvelope256(header,256)).toBe(true);expect(validRiverWaterEnvelope256(header,255)).toBe(false);expect(validRiverWaterEnvelope256({...header,planet:{revision:2}},256)).toBe(false);expect(validRiverWaterEnvelope256({width:8,height:8,riverWater:undefined},255)).toBe(false);
 const poison=structuredClone(owner);(poison.values as number[])[0]=0x7fc00000;expect(validStoredRiverWater256(poison,8,8)).toBe(false);expect(validStoredRiverWater256(owner,8,9)).toBe(false);
 const sparse=structuredClone(owner);delete (sparse.values as number[])[1];expect(validStoredRiverWater256(sparse,8,8)).toBe(false);
 let reads=0;const getter=Object.defineProperty({...owner},'values',{enumerable:true,get(){reads++;return owner.values;}});expect(validStoredRiverWater256(getter,8,8)).toBe(false);expect(reads).toBe(0);
 expect(validRiverWaterCampaignRaw256({width:8,height:8,secondarySite:{map:header}},255)).toBe(false);expect(validRiverWaterCampaignRaw256({width:8,height:8,worldMaps:{sites:[{id:0},{id:1,map:header}]}},255)).toBe(false);
 const {planet,...local}=header;expect(validRiverWaterCampaignRaw256({width:8,height:8,planet,worldMaps:{sites:[{id:0},{id:1,map:local}]}},256)).toBe(true);
});
test('transport headers inherit only the exact confirmed frozen owner under contiguous same-map omission',()=>{
 // Isolated adapter inputs only. No actual-world/Planet3 admission is claimed.
 const original=structuredClone(packRiverWater256(new Float32Array(128),8,8));
 const header={schemaVersion:256,seed:123,width:8,height:8,planet:{revision:3},site:{revision:3,tileId:7,mapSeed:123,biome:'boreal-forest',hilliness:'flat',river:'creek',stones:['granite','slate'],coastAngle:0,mutatorCode:0},campaignMap:{revision:2,activeMapId:4}},checkpoint={kind:'checkpoint' as const,epoch:2,revision:1,previousEpoch:0,previousRevision:0};
 const cold=prepareRiverWaterSnapshot256({...header,riverWater:original},256,undefined,checkpoint);expect(cold.ok).toBe(true);freezeAdmittedRiverWater256(original);
 const confirmed={...header,riverWater:original},meta={kind:'delta' as const,epoch:2,revision:2,baseRevision:1,previousEpoch:2,previousRevision:1};
 const inherited=prepareRiverWaterSnapshot256(structuredClone(header),256,confirmed,meta);expect(inherited).toEqual({ok:true,inherited:true,owner:original});if(inherited.ok)expect(inherited.owner).toBe(original);
 expect(prepareRiverWaterSnapshot256({...header,seed:124},256,confirmed,meta).ok).toBe(false);expect(prepareRiverWaterSnapshot256({...header,campaignMap:{revision:2,activeMapId:5}},256,confirmed,meta).ok).toBe(false);expect(prepareRiverWaterSnapshot256(header,256,confirmed,{...meta,baseRevision:0}).ok).toBe(false);expect(prepareRiverWaterSnapshot256(header,256,confirmed,{...meta,epoch:3}).ok).toBe(false);
 expect(prepareRiverWaterSnapshot256({...header,riverWater:undefined},256,confirmed,meta).ok).toBe(false);expect(prepareRiverWaterSnapshot256({...header,planet:{revision:2}},256,confirmed,meta).ok).toBe(false);
 const full=prepareRiverWaterSnapshot256(header,256,confirmed,{...checkpoint,epoch:3});expect(full).toEqual({ok:true,inherited:false});
 const equivalent=structuredClone(original),explicit=prepareRiverWaterSnapshot256({...header,riverWater:equivalent},256,confirmed,meta);expect(explicit).toEqual({ok:true,inherited:false,owner:equivalent});if(explicit.ok)expect(explicit.owner).not.toBe(original);
});
