import {test,expect} from 'vitest';
import {registryCamp} from './helpers/world-maps-v255.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {registeredMap} from '../src/sim/world-map-context.ts';
import {captureActorBeds256,claimLocalActorBed256,forgetLocalBedOwners256,
 actualBedOwners256,localBedClaimAvailable256} from '../src/sim/actor-bed-local-256.ts';
import type {World,Structure} from '../src/sim/types.ts';
/** Prepared existing bed/owner metadata only. No claimed construction,
 * minification, map entry, treatment or journey has already been played. */
function bed(w:World,map:World):Structure {
 const b:Structure={id:w.nextId++,kind:'bed',x:3,z:3,orientation:0,footprint:'standard',material:'wood',quality:'normal'};
 map.structures.push(b);return b;
}
test('actual local attribution replaces a historical alias without enriching the displaced owner',()=>{
 const w=registryCamp(),map=registeredMap(w,w.worldMaps!.rootMapId!)!,p=map.pawns[0]!,q=map.pawns[1]!,b=bed(w,map);
 q.bedId=b.id;delete q.mapBed;const qBefore=JSON.stringify(q.health);
 const input=JSON.stringify([p.mapBed,q.mapBed,p.bedId,q.bedId]);
 const capture=captureActorBeds256(w);
 expect(JSON.stringify([p.mapBed,q.mapBed,p.bedId,q.bedId])).toBe(input);
 expect(actualBedOwners256(capture,b.id)).toContain(q);
 claimLocalActorBed256(map,p,b);
 expect(p.mapBed).toEqual({revision:1,mapId:w.worldMaps!.rootMapId,bedId:b.id});
 expect(p.bedId).toBe(b.id);expect(q.bedId).toBe(null);expect(q.mapBed).toBeUndefined();
 expect(JSON.stringify(q.health)).toBe(qBefore);
});
test('an actual away owner blocks automatic acquisition, then an explicit real replacement displaces it',()=>{
 const {w,map,members}=reorganizationCamp256(),p=map.pawns[0]!,away=members[0]!,b=bed(w,map);
 away.mapBed={revision:1,mapId:w.worldMaps!.rootMapId!,bedId:b.id};away.bedId=null;
 const capture=captureActorBeds256(w);
 expect(capture.actors).toContain(away);expect(capture.localMapFor(away)).toBe(null);
 expect(localBedClaimAvailable256(map,b,p,undefined,capture)).toBe(false);
 claimLocalActorBed256(map,p,b);
 expect(away.mapBed).toBeUndefined();expect(away.bedId).toBe(null);
 expect(p.mapBed!.bedId).toBe(b.id);
});
test('real packed originals contribute null-map references and distinct originals cannot share the bed identity',()=>{
 const {w,map,g,members}=reorganizationCamp256(),b=bed(w,map),a=members[0]!;
 map.structures=map.structures.filter(s=>s!==b);
 const pack={building:b,owner:{type:'inventory' as const,pawnId:a.id}};
 g.packed=[...(g.packed??[]),pack];
 a.mapBed={revision:1,mapId:null,bedId:b.id};a.bedId=null;
 const capture=captureActorBeds256(w);
 expect(capture.refs.filter(ref=>ref.id===b.id)).toEqual([{id:b.id,mapId:null,animal:false,slots:1}]);
 expect(capture.actors.filter(p=>p===a)).toHaveLength(1);
 map.structures.push({...b});
 expect(()=>captureActorBeds256(w)).toThrow(/identity|owners/);
});
test('global role release clears only that real bed claim, preserving actor clinical/inventory state',()=>{
 const {w,map,members}=reorganizationCamp256(),a=members[0]!,b=bed(w,map),other=bed(w,map),p=map.pawns[0]!;
 a.mapBed={revision:1,mapId:w.worldMaps!.rootMapId!,bedId:b.id};a.bedId=null;
 claimLocalActorBed256(map,p,other);
 const before=JSON.stringify([a.health,a.rest,a.hunger,members.map(p=>p.id)]);
 const captured=captureActorBeds256(w);forgetLocalBedOwners256(map,b.id,captured);
 expect(a.mapBed).toBeUndefined();expect(p.mapBed!.bedId).toBe(other.id);
 expect(JSON.stringify([a.health,a.rest,a.hunger,members.map(p=>p.id)])).toBe(before);
});
test('foreign/nonlocal actor and malformed true double-slot claims refuse before any alias write',()=>{
 const {w,map,members}=reorganizationCamp256(),b=bed(w,map),away=members[0]!,p=map.pawns[0]!;
 const old=JSON.stringify([away.mapBed,away.bedId,p.mapBed,p.bedId]);
 expect(()=>claimLocalActorBed256(map,away,b)).toThrow(/actual local actor/);
 const double:Structure={...b,id:w.nextId++,kind:'double-bed'};map.structures.push(double);
 expect(()=>claimLocalActorBed256(map,p,double)).toThrow(/Invalid actual local bed claim/);
 expect(JSON.stringify([away.mapBed,away.bedId,p.mapBed,p.bedId])).toBe(old);
});
