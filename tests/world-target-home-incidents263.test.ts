import {test,expect} from 'vitest';
import {homeIncidentsBlocked261,tempMapTarget261} from '../src/sim/temp-map-incidents-261';
import {adoptMiscIncidents,advanceMiscIncidents} from '../src/sim/cassandra-misc';
import {adoptSmallIncidents,advanceSmallIncidents} from '../src/sim/cassandra-small';
import {adoptFluIncidents} from '../src/sim/flu-incidents';
import {validFluIncidents} from '../src/sim/flu-incidents-save';
import type {World} from '../src/sim/types';

// Pure incident-target/prospective-clock witnesses. These deliberately minimal
// objects are not generated maps, admitted saves or played campaign history.
function target(kind:'settlement'|'foreign-settlement'|'quest-site',destroyed=false,version=263):World {
 const row={id:0,kind,...kind==='foreign-settlement'?{target263:{kind,settlementId:1,factionId:2,...destroyed?{destroyedSiteId:3}:{}}}:{}};
 return {schemaVersion:version,tick:60001,seed:42,rng:29111,gameProfile:{},worldMaps:{rootMapId:0,sites:[row]}} as unknown as World;
}

for(const kind of ['foreign-settlement','quest-site'] as const)test(`Map_Misc ${kind} cannot acquire or consume home-only opportunities`,()=>{
 const world=Object.freeze(target(kind)),before=JSON.stringify(world);
 expect(homeIncidentsBlocked261(world)).toBe(true);expect(tempMapTarget261(world)).toBe(false);
 adoptMiscIncidents(world);advanceMiscIncidents(world);adoptSmallIncidents(world);advanceSmallIncidents(world);
 expect(world.miscIncidents).toBeUndefined();expect(world.smallIncidents).toBeUndefined();expect(JSON.stringify(world)).toBe(before);
});

test('DestroyedSettlement is a Home target before Settle; old262 keeps its literal behavior',()=>{
 expect(homeIncidentsBlocked261(target('foreign-settlement',true))).toBe(false);
 expect(homeIncidentsBlocked261(target('settlement'))).toBe(false);
 expect(homeIncidentsBlocked261(target('foreign-settlement',false,262))).toBe(false);
});

test('a due preexisting home-only calendar cannot draw or consume an opportunity on Map_Misc',()=>{
 const world=target('quest-site');
 world.miscIncidents=Object.freeze({profile:'cassandra-misc-v1',adoptedAt:0,rng:9123,nextCheck:60000,introDone:true,checks:0,opportunities:0,heatwaves:0});
 world.smallIncidents=Object.freeze({rng:9124,nextCheck:60000,introDone:true}) as NonNullable<World['smallIncidents']>;
 const before=JSON.stringify(world);Object.freeze(world);
 advanceMiscIncidents(world);advanceSmallIncidents(world);expect(JSON.stringify(world)).toBe(before);
});

test('MAIN target projection uses its actual selected map header without a TempIncident alias',()=>{
 const world=target('quest-site');delete world.worldMaps;
 world.campaignMap={revision:2,activeMapId:4,maps:[{id:4,kind:'quest-site'}]} as NonNullable<World['campaignMap']>;
 expect(homeIncidentsBlocked261(world)).toBe(true);expect(tempMapTarget261(world)).toBe(false);
});

test('a new Map_Misc still owns its strict prospective disease calendar, without old checks or campaign RNG draws',()=>{
 const world=target('quest-site'),rng=world.rng;
 adoptFluIncidents(world);expect(validFluIncidents(world,263)).toBe(true);
 expect(world.fluIncidents).toMatchObject({nextCheck:60100,checks:0,fluDraws:0,episodes:0,cases:0});
 const original=world.fluIncidents;adoptFluIncidents(world);expect(world.fluIncidents).toBe(original);expect(world.rng).toBe(rng);expect(world.tick).toBe(60001);
});
