import {afterEach,expect,test,vi} from 'vitest';
import {createGroupRoutePlanner,type GroupPlannerContext} from '../src/ui/group-route-planner';
import {createGroupPanel,type GroupPanelAdapters,type GroupPanelFacts} from '../src/ui/group-panel';
import type {GroupItineraryResult} from '../src/sim/group-travel-estimate';
import type {GroupMassView} from '../src/sim/group-panel-state';
import {createScenarioWorld} from '../src/sim/new-game';
import {generatePlanet,planetHomeInput} from '../src/sim/planet-generation';
import {preparationDOM,preparationFind} from './helpers/group-preparation-dom';
const globe=vi.hoisted(()=>({choose:undefined as ((tile:number)=>void)|undefined}));
vi.mock('../src/ui/planet-view',()=>({createPlanetView:(_host:unknown,choose:(tile:number)=>void)=>{globe.choose=choose;return {setPlanet(){},setOverlay(){},setVisible(){},focusTile(){},dispose(){}};},planetTileLabel:()=> 'Case'}));
afterEach(()=>vi.unstubAllGlobals());
const result=(points:readonly number[]):GroupItineraryResult=>({ok:true,points:[...points],route:[...points],arrivals:points.map((tile,i)=>({tile,elapsedCore:i*3464})),waypointCore:points.map((_,i)=>i*3464),durationCore:Math.max(0,points.length-1)*3464});
test('generic planner starts empty, removes its freely chosen origin and never accepts a destination even through a forged hidden click',async()=>{
 const host=preparationDOM(),accepted=vi.fn(),query=vi.fn(()=>{throw Error('Generic mode must never request a mass');}),queryGeneric=vi.fn(result),context:GroupPlannerContext={mode:'generic',tick:0,key:'generic'};
 const planner=createGroupRoutePlanner(host as unknown as HTMLElement,{current:()=>context,pause:async()=>{},blocked:()=>undefined,query,queryGeneric,label:String,accept:accepted,overlay:()=>{},lock:()=>{}});
 preparationFind(host,'groupPlannerOpen').fire('click');await Promise.resolve();await Promise.resolve();expect(queryGeneric).toHaveBeenLastCalledWith([]);expect(planner.active).toBe(true);
 planner.choose(7);planner.choose(8);expect(host.textContent).toContain('fondée sur une vitesse moyenne');expect(host.textContent).not.toContain('Core');expect(preparationFind(host,'groupPlannerAccept').hidden).toBe(true);preparationFind(host,'groupPlannerAccept').fire('click');expect(accepted).not.toHaveBeenCalled();
 preparationFind(host,'groupPlannerRemove').fire('click');expect(queryGeneric).toHaveBeenLastCalledWith([8]);preparationFind(host,'groupPlannerRemove').fire('click');expect(queryGeneric).toHaveBeenLastCalledWith([]);expect(query).not.toHaveBeenCalled();planner.dispose();
});
test('generic plan closes on resumed confirmed time and does not recalculate during unchanged snapshot updates',async()=>{
 const host=preparationDOM(),context:GroupPlannerContext={mode:'generic',tick:0,key:'generic'},queryGeneric=vi.fn(result),accepted=vi.fn();
 // Like actual GroupPanel.current(), each confirmed read is a fresh scalar
 // snapshot. Mutating a shared object would also rewrite the held witness.
 const planner=createGroupRoutePlanner(host as unknown as HTMLElement,{current:()=>({...context}),pause:async()=>{},blocked:()=>undefined,query:()=>{throw Error('No mass exists');},queryGeneric,label:String,accept:accepted,overlay:()=>{},lock:()=>{}});
 preparationFind(host,'groupPlannerOpen').fire('click');await Promise.resolve();await Promise.resolve();planner.choose(7);const calls=queryGeneric.mock.calls.length;planner.update();planner.update();expect(queryGeneric).toHaveBeenCalledTimes(calls);context.tick++;planner.update();expect(planner.active).toBe(false);expect(queryGeneric).toHaveBeenCalledTimes(calls);expect(accepted).not.toHaveBeenCalled();planner.dispose();
});
test('real mode still sends its exact mass to the original query and accepts only the first destination',async()=>{
 const host=preparationDOM(),mass={grams:1357,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[]},context:GroupPlannerContext={tick:0,key:'actual',origin:2,mass},query=vi.fn((points:readonly number[],_mass:GroupMassView)=>result(points)),accepted=vi.fn(),generic=vi.fn(()=>{throw Error('Actual mass must not use generic speed');});
 const planner=createGroupRoutePlanner(host as unknown as HTMLElement,{current:()=>context,pause:async()=>{},blocked:()=>undefined,query,queryGeneric:generic,label:String,accept:accepted,overlay:()=>{},lock:()=>{}});
 preparationFind(host,'groupPlannerOpen').fire('click');await Promise.resolve();await Promise.resolve();planner.choose(3);planner.choose(4);expect(query.mock.calls.at(-1)![1]).toBe(mass);expect(preparationFind(host,'groupPlannerAccept').hidden).toBe(false);preparationFind(host,'groupPlannerAccept').fire('click');expect(accepted).toHaveBeenCalledWith(3);expect(generic).not.toHaveBeenCalled();planner.dispose();
});
test('actual World panel opens generic planning with no group, no selected formation and mass null; all gestures remain command-free',async()=>{
 const host=preparationDOM(),world=createScenarioWorld(214,32);world.planet=generatePlanet(world.seed,planetHomeInput(world),world.tick);
 const actions=Object.fromEntries((['adopt','start','cancel','pause','route','return','buy','sell','unload'] as const).map(k=>[k,{ok:false,reason:'No confirmed formation'}])) as GroupPanelFacts['actions'];
 const facts:GroupPanelFacts={originTile:world.planet.homeTile,originLabel:'Foyer',maximumSources:64,mass:null,confirmedRoute:[],actions,trade:null,candidates:world.pawns.map(pawn=>({pawn,ok:true})),sources:[]};
 const adapters:GroupPanelAdapters={capture:()=>facts,previewPlan:()=>({ok:false,reason:'No formation'}),previewRoute:()=>({ok:false,reason:'No caravan'}),previewWaypoints:vi.fn(()=>{throw Error('No actual mass');}),previewGenericWaypoints:vi.fn((_snapshot,points)=>result(points)),quoteTrade:()=>({ok:false,reason:'No trade'}),pauseForReorganization:vi.fn(async()=>{}),send:vi.fn(async()=>{})};
 const panel=createGroupPanel(host as unknown as HTMLElement,adapters);panel.update({world,planet:world.planet,losses:[],originMapId:0});const before=JSON.stringify(world),open=preparationFind(host,'groupPlannerOpen');expect(open.disabled).toBe(false);open.fire('click');await Promise.resolve();await Promise.resolve();globe.choose!(7);globe.choose!(8);preparationFind(host,'groupPlannerAccept').fire('click');preparationFind(host,'groupPlannerCancel').fire('click');expect(adapters.previewGenericWaypoints).toHaveBeenCalled();expect(adapters.previewWaypoints).not.toHaveBeenCalled();expect(adapters.send).not.toHaveBeenCalled();expect(JSON.stringify(world)).toBe(before);panel.dispose();
});
