import {test,expect} from 'vitest';
import {validStationaryRetreat263} from '../src/sim/group-save';
import {brandCampaignContext,brandGroupProjection} from '../src/sim/world-map-context';
import {validGroupEncounterFields261} from '../src/sim/caravan-registry-save-261';
import {worldPawnOriginProjection256} from '../src/sim/world-pawn-origin-projection-256';
import {groupWorld} from '../src/sim/world-map-authority';
import type {World} from '../src/sim/types';
import type {CampaignState,WorldGroupRecord,WorldMapRecord} from '../src/sim/world-map-state';
import type {GroupState} from '../src/sim/group-state';

// Pure owner/transport linkage witnesses, deliberately NOT generated Worlds,
// admitted saves, map cells, actors, played exits or replacement campaign data.
function witness(kind='foreign-settlement',version=263){
 const context={},origin={pawnId:7,originMapId:1,context,enteredAtAbsCore:2838070};
 const g={id:2,phase:'stationary',admission:{revision:2},originTile:21678,travel:{revision:1},reorganization:{memberOrigins:[origin]},members:[{id:7}]} as unknown as GroupState;
 const record={originMapId:1,localMapId:null,context,state:g,encounters261:{revision:1},retreat261:{revision:1,autoJoinable:true}} as WorldGroupRecord;
 const source={id:1,tile:21678,kind} as WorldMapRecord;
 const root={schemaVersion:version,worldMaps:{sites:[source],retired:[]},worldGroups:{groups:[record]}} as unknown as CampaignState;
 const view={schemaVersion:version,group:g} as World;brandCampaignContext(view,root,1,record);
 return {g,record,source,root,view};
}
for(const kind of ['foreign-settlement','quest-site','battlefield'])test(`actual linked263 ${kind} escape receipt admits stationary without false birth`,()=>{
 const x=witness(kind);expect(validStationaryRetreat263(x.view,x.g)).toBe(true);
 expect('birth'in (x.g as Extract<GroupState,{members:unknown}>).reorganization!).toBe(false);
});
test('copies, absent binding, wrong source, missing owner or flags stay refused',()=>{
 for(const edit of [
  (x:ReturnType<typeof witness>)=>{x.record.state=structuredClone(x.g);},
  (x:ReturnType<typeof witness>)=>{brandCampaignContext(x.view,x.root,1,{...x.record});},
  (x:ReturnType<typeof witness>)=>{x.source.kind='camp';},
  (x:ReturnType<typeof witness>)=>{x.record.localMapId=1;},
  (x:ReturnType<typeof witness>)=>{x.record.originMapId=3;},
  (x:ReturnType<typeof witness>)=>{delete x.record.retreat261;},
  (x:ReturnType<typeof witness>)=>{x.record.retreat261={revision:1};},
  (x:ReturnType<typeof witness>)=>{delete x.record.encounters261;},
  (x:ReturnType<typeof witness>)=>{delete (x.g as Extract<GroupState,{members:unknown}>).reorganization!.memberOrigins[0]!.enteredAtAbsCore;},
 ]){const x=witness();edit(x);expect(validStationaryRetreat263(x.view,x.g)).toBe(false);}
 const x=witness();expect(validStationaryRetreat263({...x.view},x.g)).toBe(false);
});
test('all older versions keep the historical stationary birth rule',()=>{
 for(const version of [256,259,260,261,262]){const x=witness('foreign-settlement',version);expect(validStationaryRetreat263(x.view,x.g)).toBe(false);}
});
test('retired raw source remains an authentic record, not a replacement kind',()=>{
 const x=witness();x.root.worldMaps!.sites=[];x.root.worldMaps!.retired=[{...x.source,removedAt:6808,reason:'abandon'}];
 expect(validStationaryRetreat263(x.view,x.g)).toBe(true);x.root.worldMaps!.retired[0]!.kind='settlement';expect(validStationaryRetreat263(x.view,x.g)).toBe(false);
});
function projection(){
 const x=witness(),row={id:2,originMapId:1,localMapId:null,context:x.record.context,state:x.g,originTile:21678,retreat261:x.record.retreat261,encounters261:x.record.encounters261};
 const view={schemaVersion:263,group:x.g,campaignMap:{revision:2,groups:[row],maps:[x.source]}} as unknown as World;
 brandGroupProjection(view,{...x.record},21678);return {...x,row,view};
}
test('transport receipt is bound to the original row, state, source and origin scalar',()=>{
 const x=projection();expect(validStationaryRetreat263(x.view,x.g)).toBe(true);
 const metadata=x.view.campaignMap;if(metadata?.revision!==2)throw Error('The actual revision2 projection is required');
 metadata.maps=[];expect(validStationaryRetreat263(x.view,x.g)).toBe(false);
 metadata.worldPawnOrigins=[{mapId:1,tile:21678,removedAt:6808}];expect(validStationaryRetreat263(x.view,x.g)).toBe(true);
 x.row.state=structuredClone(x.g);expect(validStationaryRetreat263(x.view,x.g)).toBe(false);
 const y=projection();y.row.retreat261={revision:1,autoJoinable:true};expect(validStationaryRetreat263(y.view,y.g)).toBe(false);
 const z=projection();z.source.kind='camp';expect(validStationaryRetreat263(z.view,z.g)).toBe(false);
});
test('public group facade retains the same263 transport receipt without private SIM access',()=>{
 const x=projection();Object.assign(x.view,{planet:{revision:3},pawns:[],piles:[],packed:[],jobs:[],resources:[],structures:[],stockpiles:[],tiles:[],campaignPeople:[],groupLosses:[]});
 Object.assign(x.view.campaignMap!,{campaignSeed:1,mapSize:{width:325,height:325},activeMapId:0,groupLosses:[],people:[]});
 const view=groupWorld(x.view,2)!;expect(validStationaryRetreat263(view,x.g)).toBe(true);
});
test('retired source proof is emitted from actual263 retired rows even with zero foreign NPC owners',()=>{
 const x=witness();Object.assign(x.root,{worldPawns:{owners:[]},worldGroups:{groups:[x.record],lostMemories:[]}});Object.assign(x.root.worldMaps!,{sites:[],retired:[{id:1,tile:21678,kind:'foreign-settlement',createdAt:6806,removedAt:6808,reason:'abandon'}]});
 expect(worldPawnOriginProjection256(x.root)).toEqual({worldPawnOrigins:[{mapId:1,tile:21678,removedAt:6808}]});
 Object.assign(x.root,{schemaVersion:262});expect(worldPawnOriginProjection256(x.root)).toEqual({});
});
test('the already existing retreat receipt still has closed keys and required autoJoinable after exit',()=>{
 const x=witness(),c={version:263,atCore:68070,tileCount:90000,factionIds:new Set<number>(),mapIds:new Set([0,1]),settlements:[]};
 expect(validGroupEncounterFields261(x.record as unknown as Record<string,unknown>,c,87991)).toBe(true);
 x.record.retreat261={revision:1};expect(validGroupEncounterFields261(x.record as unknown as Record<string,unknown>,c,87991)).toBe(false);
});
