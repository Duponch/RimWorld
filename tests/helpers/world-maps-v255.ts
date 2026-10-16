import {expect} from 'vitest';
import {prepareGroupScenario} from '../../src/sim/group-scenario.ts';
import {applyCommand,stepWorld,validateWorld} from '../../src/sim/index.ts';
import type {World,Command} from '../../src/sim/types.ts';
import type {CampaignState,WorldMapKind} from '../../src/sim/world-map-state.ts';
import {registeredMap,flushRegisteredMap} from '../../src/sim/world-map-context.ts';
import {draftSite} from '../../src/sim/secondary-site.ts';
import {captureStandability} from '../../src/sim/furniture-travel.ts';
export function command(root:CampaignState,c:Command):void {const r=applyCommand(root as World,c);expect(r.ok,r.reason??JSON.stringify(c)).toBe(true);}
/** Declared preparation; no trip, map entry, loading or tick is already played. */
export function registryCamp():World {const w=prepareGroupScenario();command(w,{type:'planet-adopt'});expect(validateWorld(w)).toEqual([]);return w;}
/** A declared second-map fixture, not proof of a played map entry. */
export function preparedMap(root:World,tile=52,kind:WorldMapKind='legacy-site',movePerson=true):World {const source=registeredMap(root,root.worldMaps!.rootMapId!)!,draft=draftSite(source,tile);if(!draft)throw Error('Fixed prepared tile unavailable');const id=root.worldMaps!.nextMapId++;root.nextId=draft.nextId;root.worldMaps!.sites.push({id,tile,kind,createdAt:root.tick,visit:null,map:draft.site.map});const map=registeredMap(root,id)!;
 if(movePerson){const pawn=source.pawns.pop()!;const stand=captureStandability(map);let cell:{x:number;z:number}|undefined;for(let z=0;z<map.height&&!cell;z++)for(let x=0;x<map.width;x++)if(stand({x,z})){cell={x,z};break;}if(!cell)throw Error('Prepared terrain has no real standing cell');Object.assign(pawn,cell);pawn.bedId=null;delete pawn.bedSlot;delete pawn.allowedAreaId;map.pawns.push(pawn);const held=source.piles.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===pawn.id);source.piles=source.piles.filter(p=>!held.includes(p));map.piles.push(...held);}
 flushRegisteredMap(source);flushRegisteredMap(map);return map;}
export function until(root:CampaignState,predicate:()=>boolean,limit=9000):void {for(let i=0;i<limit&&!predicate();i++)stepWorld(root);expect(predicate(),JSON.stringify({tick:root.tick,groups:root.worldGroups?.groups.map(g=>({id:g.state.id,phase:g.state.phase})),events:root.worldGroups?.events.slice(-3)})).toBe(true);}
export function startOne(root:World,destination=52,quantity=8):{id:number;person:World['pawns'][number]} {const map=registeredMap(root,root.worldMaps!.selectedMapId!)!,person=map.pawns[0]!,food=map.piles.find(p=>p.item==='survival-meal'&&p.owner.type==='ground'&&p.quantity>=quantity)!;if(!food)throw Error('Declared actual rations missing');command(root,{type:'group-start',originMapId:root.worldMaps!.selectedMapId!,memberIds:[person.id],sources:[{pileId:food.id,quantity}],destination});return {id:root.worldGroups!.selectedGroupId!,person};}
/** Build an explicitly historical254 shape BEFORE its validation baseline. */
export function legacy254(root:World):Record<string,unknown> {const raw=JSON.parse(JSON.stringify(root)) as Record<string,any>,maps=raw.worldMaps,groups=raw.worldGroups;if(maps.sites.length>2||maps.rootMapId!==0||groups.posts.length||groups.groups.length||groups.losses.length)throw Error('Fixture is not the empty legacy two-map domain');const other=maps.sites.find((m:any)=>m.id!==0);if(other)raw.secondarySite={revision:1,tile:other.tile,createdAt:other.createdAt,selected:maps.selectedMapId===other.id,map:other.map,visit:other.visit};delete raw.worldMaps;delete raw.worldGroups;raw.schemaVersion=254;return raw;}
