import {expect,test} from 'vitest';
import {packRiverWater256} from '../src/sim/river-water-owner-256.ts';
import {prepareRiverWaterSnapshot256} from '../src/bridge/river-water-transport-256.ts';

// Adapter-only headers, not a fabricated World/Planet or an integration claim.
function inlandConfirmed() {
 const owner=packRiverWater256(new Float32Array(128),8,8);
 const header={schemaVersion:256,seed:123,width:8,height:8,planet:{revision:3},site:{revision:3,tileId:7,mapSeed:123,biome:'boreal-forest',hilliness:'flat',river:'creek',stones:['granite','slate'],coastAngle:null as number|null,mutatorCode:0},campaignMap:{revision:2,activeMapId:4}};
 const checkpoint={kind:'checkpoint' as const,epoch:2,revision:1,previousEpoch:0,previousRevision:0};
 expect(prepareRiverWaterSnapshot256({...header,riverWater:owner},256,undefined,checkpoint)).toEqual({ok:true,inherited:false,owner});
 return {owner,header,confirmed:{...header,riverWater:owner},meta:{kind:'delta' as const,epoch:2,revision:2,baseRevision:1,previousEpoch:2,previousRevision:1}};
}

test('an inland Site3 keeps its exact admitted river owner through contiguous null-to-null omission',()=>{
 const {owner,header,confirmed,meta}=inlandConfirmed();
 const inherited=prepareRiverWaterSnapshot256(structuredClone(header),256,confirmed,meta);
 expect(inherited).toEqual({ok:true,inherited:true,owner});
 if(inherited.ok)expect(inherited.owner).toBe(owner);
});

test('an inland-to-coastal header change cannot inherit omitted river water',()=>{
 const {header,confirmed,meta}=inlandConfirmed();
 expect(prepareRiverWaterSnapshot256({...header,site:{...header.site,coastAngle:0}},256,confirmed,meta)).toEqual({ok:false});
});
