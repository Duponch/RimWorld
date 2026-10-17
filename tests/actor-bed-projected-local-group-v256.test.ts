import {legacyPlanet} from './helpers/legacy-fixture-guards.ts';
import {expect,test} from 'vitest';
import {applyCommand,stepWorld,validateWorld} from '../src/sim/index.ts';
import {validateProjectedActorBeds256} from '../src/sim/actor-bed-save-256.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {worldGroupContext} from '../src/sim/world-map-context.ts';
import {actualPlanetOrigin,onlyPlanetGroup} from './helpers/planet-cache-registry-v217.ts';
import {commercialCamp} from './helpers/commercial-v193.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import type {World} from '../src/sim/types.ts';
function projection(w:World){const shown=registeredMapPresentation(w);if(!shown||shown.campaignMap?.revision!==2)throw Error('Expected actual registered presentation');return {shown,metadata:shown.campaignMap};}
function localFormation(){
 const {world:w,foodId}=commercialCamp(16);stepWorld(w);
 expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
 const originMapId=actualPlanetOrigin(w),members=w.pawns.slice(0,2);
 expect(applyCommand(w,{type:'group-start',originMapId,memberIds:members.map(p=>p.id),destination:legacyPlanet(w).civilianTile,sources:[{pileId:foodId,quantity:4}]}).ok).toBe(true);
 expect(validateWorld(w)).toEqual([]);
 const row=onlyPlanetGroup(w),view=worldGroupContext(w,row.state.id,true);if(!view)throw Error('Missing actual formation view');
 return {w,members,view,...projection(w)};
}
test('local formation projection joins the same actual map Pawn at its confirmed map, without duplicating or moving it',()=>{
 const {w,members,view,shown,metadata}=localFormation(),before=structuredClone(w);
 expect(view.pawns).toBe(shown.pawns);expect(view.pawns).toContain(members[0]);
 expect(validateProjectedActorBeds256(shown,[{world:view,referencesOnly:false}],metadata.bedRefs!,metadata.activeMapId)).toEqual([]);
 expect(w).toEqual(before);
});
test('distinct originals with the same ID remain refused by the projection join',()=>{
 const {w,view,shown,metadata}=localFormation(),before=structuredClone(w);
 const distinct={...view,pawns:[structuredClone(view.pawns[0]!),...view.pawns.slice(1)]};
 expect(distinct.pawns[0]).not.toBe(shown.pawns[0]);expect(distinct.pawns[0]!.id).toBe(shown.pawns[0]!.id);
 expect(validateProjectedActorBeds256(shown,[{world:distinct,referencesOnly:false}],metadata.bedRefs!,metadata.activeMapId)).toEqual(['Invalid projected bed/actor owner join.']);
 expect(w).toEqual(before);
});
test('prepared actual away group keeps its home-bed reference without a local alias; simultaneous local ownership is refused',()=>{
 const {w,map,g,record,members}=reorganizationCamp256(),bed=map.structures.find(s=>s.kind==='bed');if(!bed)throw Error('Prepared actual home bed missing');
 const away=members[0]!;away.mapBed={revision:1,mapId:record.originMapId,bedId:bed.id};expect(away.bedId).toBe(null);
 expect(validateWorld(w)).toEqual([]);
 const {shown,metadata}=projection(w),view=worldGroupContext(w,g.id,true);if(!view)throw Error('Missing actual away owner view');
 const before=structuredClone(w);expect(view.pawns).toEqual([]);expect(g.members[0]).toBe(away);expect(shown.pawns).not.toContain(away);
 expect(validateProjectedActorBeds256(shown,[{world:view,referencesOnly:false}],metadata.bedRefs!,metadata.activeMapId)).toEqual([]);
 const contradictory={...shown,pawns:[...shown.pawns,away]};
 expect(validateProjectedActorBeds256(contradictory,[{world:view,referencesOnly:false}],metadata.bedRefs!,metadata.activeMapId)).toEqual(['Invalid projected bed/actor owner join.']);
 expect(w).toEqual(before);
});
