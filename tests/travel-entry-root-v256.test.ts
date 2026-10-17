import {expect,test} from 'vitest';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {tryGroupDeparture} from '../src/sim/group-driver.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {validateWorld} from '../src/sim/serialization.ts';
import {planetTile} from '../src/sim/planet-geography-256.ts';
import {groupDestinationValid} from '../src/sim/group-capture.ts';
import type {PreparingGroup} from '../src/sim/group-capture.ts';
/** Prepared original owners physically at their exit cells, not a replay or
 * a claimed loading/walking history. Exercise the actual departure commit. */
function preparing(modern:boolean){
 const f=reorganizationCamp256(false),map=registeredMap(f.w,f.record.originMapId)!;
 const origin=f.w.worldMaps!.sites.find(s=>s.id===f.record.originMapId)!.tile!;
 const destination=planetTile(f.w.planet!,origin)!.neighbours.find(t=>t!==f.w.planet!.civilianTile&&groupDestinationValid(f.w.planet!,t));if(destination===undefined)throw Error('Prepared planet lacks adjacent travel witness');
 f.members.forEach((p,i)=>{p.x=0;p.z=5+i;map.tiles[p.z*map.width]={terrain:'grass'};p.path=[];p.moveCooldown=0;delete p.motion;});
 map.pawns.push(...f.members);map.piles.push(...f.items);
 const g:PreparingGroup={id:f.g.id,startedAt:f.w.tick,destination,ledger:f.g.ledger,provisions:f.g.provisions,freight:f.g.freight,phase:'leaving',memberIds:f.members.map(p=>p.id),rendezvous:{x:0,z:5},meeting:f.members.map(p=>({pawnId:p.id,cell:{x:p.x,z:p.z}})),manifest:[],cursor:0,exits:f.members.map(p=>({pawnId:p.id,cell:{x:p.x,z:p.z}})),...(modern?{travelPreparation:true as const}:{})};
 f.record.state=g;f.record.localMapId=f.record.originMapId;flushRegisteredMap(map);return {...f,map,g};
}
test.each([false,true])('only an actual new formation contract opens Core travel at departure (modern=%s)',modern=>{
 const f=preparing(modern),ids=f.members.map(p=>p.id),next=f.w.nextId;
 expect(validateWorld(f.w)).toEqual([]);tryGroupDeparture(f.w);
 expect(f.record.localMapId).toBeNull();const departed=f.record.state;if(!('members'in departed))throw Error('Prepared actual departure did not commit');
 expect(departed.members).toEqual(f.members);expect(departed.members.map(p=>p.id)).toEqual(ids);expect(departed.members.every(p=>f.members.includes(p))).toBe(true);expect(f.w.nextId).toBe(next);
 expect(departed.travel!==undefined).toBe(modern);expect(departed.reorganization!==undefined).toBe(modern);expect('travelPreparation'in departed).toBe(false);expect(validateWorld(f.w)).toEqual([]);
});
test('missing real caravan runtime refuses before clock, needs, incidents, owners or RNG can advance',()=>{
 const f=reorganizationCamp256(),before=JSON.stringify(f.w);expect(()=>stepWorld(f.w,1)).toThrow(/confirmed Core runtime/);expect(JSON.stringify(f.w)).toBe(before);
});
