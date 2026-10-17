import {expect,test} from 'vitest';
import {portableLocalRoadAngular256 as angle} from '../src/sim/local-road-angular-256.ts';
import {validLocalRoadInfoEnvelope256,validLocalRoadInfoCampaignRaw256} from '../src/sim/local-road-info-256.ts';

test('portable yaw preserves axes, quadrants, circular difference and finite input without claiming native float traces',()=>{
 for(const [yaw,x,z] of [[0,0,1],[90,1,0],[180,0,-1],[270,-1,0]] as const){const v=angle.horizontal(yaw);expect(v[0]).toBeCloseTo(x,6);expect(v[1]).toBe(0);expect(v[2]).toBeCloseTo(z,6);expect(angle.angleDifference(angle.flatAngle(v[0],v[2]),yaw)).toBeLessThan(.0001);}
 expect(angle.flatAngle(0,0)).toBe(0);expect(angle.angleDifference(359,1)).toBe(2);expect(angle.angleDifference(1,359)).toBe(2);expect(angle.flatAngle(-1,1)).toBeCloseTo(315,5);
 expect(()=>angle.horizontal(NaN)).toThrow();expect(()=>angle.flatAngle(Infinity,0)).toThrow();
});

test('RoadInfo retains generated edge order, permits a genuinely empty step and refuses malformed or non-edge cells',()=>{
 const raw={width:250,height:250,site:{revision:3},roadInfo:{revision:1,edgeCells:[249,0,62500-1,250]}};
 expect(validLocalRoadInfoEnvelope256(raw,256)).toBe(true);expect(validLocalRoadInfoEnvelope256(JSON.parse(JSON.stringify(raw)),256)).toBe(true);
 for(const cells of [[0,0],[251],[-1],[62500],[NaN]]){const bad={...raw,roadInfo:{revision:1,edgeCells:cells}};expect(validLocalRoadInfoEnvelope256(bad,256)).toBe(false);}
 expect(validLocalRoadInfoEnvelope256({...raw,roadInfo:{revision:1,edgeCells:[]}},256)).toBe(true);
 expect(validLocalRoadInfoEnvelope256({...raw,roadInfo:{revision:1,edgeCells:[],extra:1}},256)).toBe(false);
 expect(validLocalRoadInfoEnvelope256({...raw,roadInfo:undefined},256)).toBe(false);
 expect(validLocalRoadInfoEnvelope256({width:250,height:250,site:{revision:3}},256)).toBe(false);
});

test('original inactive RAW road namespaces and historical fields reject before projection or getter execution',()=>{
 const old={width:250,height:250,site:{revision:1}},future={...old,roadInfo:{revision:1,edgeCells:[]}};
 expect(validLocalRoadInfoCampaignRaw256(old,255)).toBe(true);expect(validLocalRoadInfoCampaignRaw256(future,255)).toBe(false);expect(validLocalRoadInfoCampaignRaw256({...old,roadInfo:undefined},255)).toBe(false);
 expect(validLocalRoadInfoCampaignRaw256({...old,secondarySite:{map:future}},255)).toBe(false);
 expect(validLocalRoadInfoCampaignRaw256({...old,worldMaps:{sites:[{map:future}]}},255)).toBe(false);
 let reads=0;const bad={...old};Object.defineProperty(bad,'roadInfo',{enumerable:true,get(){reads++;return undefined;}});expect(validLocalRoadInfoCampaignRaw256(bad,255)).toBe(false);expect(reads).toBe(0);
});
