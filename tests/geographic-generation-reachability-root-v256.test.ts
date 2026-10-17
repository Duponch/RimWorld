import {test,expect} from 'vitest';
import {captureGeographicGenerationReachability256} from '../src/sim/geographic-generation-reachability-256.ts';
import type {ActualStartMap256} from '../src/sim/actual-local-districts-256.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
/** Declared real physical fields. No World cast, simulated scenario or fake
 * canReach callback is used to validate the independent reachability gate. */
function physical():ActualStartMap256{return {schemaVersion:256,site:{revision:3},width:24,height:12,
 tiles:Array.from({length:288},()=>({terrain:'soil-natural'})),structures:[],jobs:[],resources:[],piles:[],packed:[]};}
test('road admission distinguishes closed regions from the real dry cell predicate; completed bridge is the top terrain',()=>{
 const map=physical();for(let z=0;z<12;z++)map.tiles[z*24+12]={terrain:'water-shallow'};
 let r=captureGeographicGenerationReachability256(map);expect(r.canReach(6*24+6,6*24+18,'closed')).toBe(true);expect(r.canReach(6*24+6,6*24+18,'closed-dry')).toBe(false);
 expect(r.canReachMapEdgeNoPassClosedDoorsOrWater(6*24+6)).toBe(true);
 map.tiles[6*24+12]!.bridge=true;r=captureGeographicGenerationReachability256(map);expect(r.canReach(6*24+6,6*24+18,'closed-dry')).toBe(true);
});
test('real full mineables separate ordinary regions while the destroyable cell flood reaches through them',()=>{
 const map=physical();for(let z=0;z<12;z++)map.tiles[z*24+12]={terrain:'rock',stone:'granite'};
 const r=captureGeographicGenerationReachability256(map);expect(r.canReach(6*24+6,6*24+18,'closed')).toBe(false);expect(r.canReach(6*24+6,6*24+18,'destroy')).toBe(true);
 expect(r.canReach(6*24+12,6*24+12,'closed-dry')).toBe(true);expect(r.canReach(-1,0,'destroy')).toBe(false);
});
test('fresh closed portals block the region traversal; an unmodelled live free-passage request is refused explicitly',()=>{
 const map=physical();for(let z=3;z<=9;z++)for(let x=4;x<=10;x++)if(x===4||x===10||z===3||z===9)map.tiles[z*24+x]={terrain:'rock',stone:'granite'};
 map.tiles[6*24+4]={terrain:'soil-natural'};const door={id:1,kind:'door' as const,x:4,z:6,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,door:newDoorState(0)};map.structures.push(door);
 const r=captureGeographicGenerationReachability256(map);expect(r.canReachMapEdgeNoPassClosedDoorsOrWater(6*24+7)).toBe(false);expect(r.canReach(6*24+7,6*24+2,'closed')).toBe(false);expect(r.canReach(6*24+7,6*24+2,'destroy')).toBe(true);
 door.door.open=true;expect(()=>captureGeographicGenerationReachability256(map)).toThrow(/fresh closed door/);
});
