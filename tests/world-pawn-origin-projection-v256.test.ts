import {test,expect} from 'vitest';
import {validWorldPawnOriginProjection256} from '../src/sim/world-pawn-origin-projection-256.ts';
const proof={mapId:1,tile:7,removedAt:100},valid=(value:object,tick=100,version=256)=>validWorldPawnOriginProjection256(value,version,tick,50,100,new Set([0]));
test('retired physical origin survives exact marker expiry without becoming a marker or playable map',()=>{
 // Scalar clock-boundary oracle only, not a thirty-day played campaign.
 const expiry=proof.removedAt+180000;expect(valid({worldPawnOrigins:[proof]},expiry-1)).toBe(true);expect(valid({worldPawnOrigins:[proof]},expiry)).toBe(true);expect(valid({worldPawnOrigins:[proof]},expiry+1)).toBe(true);
 expect(valid({worldPawnOrigins:[{...proof,terrain:[]}]})).toBe(false);expect(valid({worldPawnOrigins:[{...proof,actions:{view:true}}]})).toBe(false);
});
test('old255 rejects every future origin field before reading an accessor',()=>{
 expect(valid({},100,255)).toBe(true);expect(valid({worldPawnOrigins:[proof]},100,255)).toBe(false);
 expect(valid({worldPawnOrigins:undefined})).toBe(false);let reads=0;const getter=Object.defineProperty({},'worldPawnOrigins',{enumerable:true,get(){reads++;throw Error('Unexpected future metadata reader');}});
 expect(valid(getter,100,255)).toBe(false);expect(valid(getter)).toBe(false);expect(reads).toBe(0);expect(valid(Object.create({worldPawnOrigins:[proof]}))).toBe(false);expect(valid(Object.defineProperty({},'worldPawnOrigins',{value:[proof]}))).toBe(false);
});
test('map identity, scalar domains and removal frontier refuse forged geometry/provenance shapes',()=>{
 expect(valid({worldPawnOrigins:[proof,proof]})).toBe(false);expect(valid({worldPawnOrigins:[{...proof,mapId:0}]})).toBe(false);
 expect(valid({worldPawnOrigins:[{...proof,tile:100}]})).toBe(false);expect(valid({worldPawnOrigins:[{...proof,removedAt:101}]})).toBe(false);
 expect(valid({worldPawnOrigins:[{...proof,removedAt:99.5}]})).toBe(false);expect(valid({worldPawnOrigins:[{...proof,mapId:-1}]})).toBe(false);
 // A later live map may reuse the old tile after the marker expired. The
 // foreign key is the old map ID, not a claim to exclude that tile forever.
 expect(validWorldPawnOriginProjection256({worldPawnOrigins:[proof]},256,180100,50,100,new Set([0,2]))).toBe(true);
});
