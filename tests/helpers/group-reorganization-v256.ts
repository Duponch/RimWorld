import {applyAllowedAreaCommand} from '../../src/sim/allowed-areas.ts';
import {rememberMapAreaDeparture} from '../../src/sim/pawn-map-areas.ts';
import {expect} from 'vitest';
import {registryCamp} from './world-maps-v255.ts';
import {registeredMap,flushRegisteredMap} from '../../src/sim/world-map-context.ts';
import {emptyGroupLedger} from '../../src/sim/group-loading.ts';
import {newGroupProvisions} from '../../src/sim/group-provisions.ts';
import {newGroupFreight} from '../../src/sim/group-freight.ts';
import {newGroupForageRevision256} from '../../src/sim/group-forage-state-256.ts';
import {openGroupReorganization,groupInventoryVector} from '../../src/sim/group-reorganization-balance.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {GroupMotionRuntime,type GroupMotionGeometry} from '../../src/sim/group-motion-runtime.ts';
import {validateWorld} from '../../src/sim/index.ts';
import type {World} from '../../src/sim/types.ts';
import type {WorldGroupRecord} from '../../src/sim/world-map-state.ts';
import type {AwayGroup} from '../../src/sim/group-capture.ts';
/** Prepared physical owners only: no claimed loading, trip, health treatment,
 * elapsed tick or acquisition history. Commands under test perform the real
 * transactions; arrays below contain the actual prepared people's originals. */
export function reorganizationCamp256(prospective=true,originArea=false){
 const w=registryCamp(),map=registeredMap(w,w.worldMaps!.rootMapId!)!;expect(w.schemaVersion).toBe(256);
 if(originArea){expect(applyAllowedAreaCommand(map,{type:'allowed-area-create',label:'Original area'})?.ok).toBe(true);expect(applyAllowedAreaCommand(map,{type:'assign-allowed-area',pawnId:map.pawns[0]!.id,areaId:map.allowedAreas![0]!.id})?.ok).toBe(true);}
 const members=map.pawns.slice(0,2);for(const p of members)rememberMapAreaDeparture(map,p);
 // Prepared inventory is created while its true carrier is still locally
 // owned; the same original then joins the prepared away container below.
 addMaterial(map,'food',4,{type:'inventory',pawnId:members[0]!.id},'survival-meal');
 map.pawns=map.pawns.filter(p=>!members.includes(p));const ids=new Set(members.map(p=>p.id));
 for(const p of members){p.jobId=null;p.haul=null;p.cooking=null;p.need=null;p.bedId=null;delete p.bedSlot;p.path=[];p.moveCooldown=0;p.planCooldown=0;p.state='idle';p.orders={active:null,queue:[]};p.recreation.task=null;delete p.motion;}
 const items=map.piles.filter(p=>'pawnId'in p.owner&&ids.has(p.owner.pawnId));map.piles=map.piles.filter(p=>!items.includes(p));refreshStock(map);
 const context={seed:map.seed,width:map.width,height:map.height,...map.climate?{climate:map.climate}:{},...map.site?{site:map.site}:{},...map.scenario?{scenario:map.scenario}:{}},q=groupInventoryVector(items),id=w.planet!.nextGroupId++;
 const g:AwayGroup={id,startedAt:w.tick,destination:w.planet!.homeTile,ledger:emptyGroupLedger(),provisions:newGroupProvisions(),freight:newGroupFreight(),phase:'awaiting-entry',members,items,departedAt:w.tick,lastPersonalTick:w.tick,baseline:{food:q['survival-meal']??0,pemmican:q.pemmican??0,silver:q.silver??0,cargo:{cloth:q.cloth??0,'muffalo-wool':q['muffalo-wool']??0},medicine:q.medicine??0,component:q.component??0,freight:{wood:q.wood??0,steel:q.steel??0}},entry:{x:members[0]!.x,z:members[0]!.z},tile:w.planet!.homeTile,route:[w.planet!.homeTile],segment:null,paused:false,stop:{kind:'awaiting-entry'},...prospective?{travel:{revision:1,tickDelta:0,forage:newGroupForageRevision256(items)}}:{}};
 const record:WorldGroupRecord={originMapId:w.worldMaps!.rootMapId!,localMapId:null,context,state:g};w.worldGroups!.groups.push(record);w.worldGroups!.selectedGroupId=id;
 if(prospective)g.reorganization=openGroupReorganization(g,[],w.tick,members.map(p=>({pawnId:p.id,originMapId:record.originMapId,context})));
 flushRegisteredMap(map);expect(validateWorld(w)).toEqual([]);return {w,map,g,record,members,items};
}
export const testMotionGeometry:GroupMotionGeometry={center:tile=>[tile,0,0],averageTileSize:1,tangent:(_center,p)=>[0,p[0],p[1]],regularPolygonVertex:(n,i)=>[Math.cos(2*Math.PI*i/n),Math.sin(2*Math.PI*i/n)],collisionAngle:id=>id%360};
export function preparedMotion(w:World){const motion=new GroupMotionRuntime(testMotionGeometry);motion.bootstrap(w.worldGroups!.groups.flatMap(r=>'members'in r.state?[{id:r.state.id,tile:r.state.tile,destination:r.state.destination,moving:r.state.phase==='travelling',segment:r.state.segment,nextPassable:true,...r.state.travel?{travel:r.state.travel}:{}}]:[]));return motion;}
