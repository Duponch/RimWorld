import {afterEach,expect,test,vi} from 'vitest';
import {createGroupPanel,type GroupPanelAdapters,type GroupPanelFacts} from '../src/ui/group-panel';
import {createScenarioWorld} from '../src/sim/new-game';
import {generatePlanet,planetHomeInput} from '../src/sim/planet-generation';
import type {TravelWarning,GroupTravelEstimate} from '../src/sim/group-travel-estimate';
import {preparationDOM,preparationFind} from './helpers/group-preparation-dom';
vi.mock('../src/ui/planet-view',()=>({createPlanetView:()=>({setPlanet(){},setOverlay(){},setVisible(){},focusTile(){},dispose(){}}),planetTileLabel:()=> 'Case choisie'}));
afterEach(()=>vi.unstubAllGlobals());
/** UI-only projection fixtures. No fake stock, travel transition or historical
 * save is used as evidence for the calculation/authority tests in the other file. */
function setup(){
 const host=preparationDOM(),world=createScenarioWorld(214,32);world.planet=generatePlanet(world.seed,planetHomeInput(world),world.tick);
 const actions=Object.fromEntries((['adopt','start','cancel','pause','route','return','buy','sell','unload'] as const).map(k=>[k,{ok:true}])) as GroupPanelFacts['actions'];
 const facts:GroupPanelFacts={originTile:world.planet.homeTile,originLabel:'Foyer',maximumSources:64,mass:null,confirmedRoute:[],actions,trade:null,candidates:world.pawns.map(pawn=>({pawn,ok:true})),sources:[]};
 let warnings:TravelWarning[]=['short-food'],refusal:string|undefined;
 const estimate=():GroupTravelEstimate=>({ok:true,foodDays:1,rotDays:600,nutrition:1.6,forageNutritionPerDay:0,warnings,durationCore:5000,operations:1});
 const adapters:GroupPanelAdapters={capture:()=>facts,previewPlan:vi.fn<GroupPanelAdapters['previewPlan']>((_s,_f,draft)=>{if(refusal)return {ok:false as const,reason:refusal};if(draft.destination===undefined)throw Error('La prévisualisation UI exige une destination réellement choisie.');return {ok:true as const,route:[world.planet!.homeTile,draft.destination],mass:{grams:0,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[]},carriers:[],provisions:estimate()};}),previewRoute:()=>({ok:false,reason:'Aucune caravane hors carte.'}),quoteTrade:()=>({ok:false,reason:'Aucun échange.'}),send:vi.fn(async()=>{})};
 const panel=createGroupPanel(host as unknown as HTMLElement,adapters),snapshot={world,planet:world.planet,losses:[],originMapId:0};panel.update(snapshot);
 const check=preparationFind(host,'groupMember').children[0]!.children[0]!;check.checked=true;check.fire('change');preparationFind(host,'groupPreview').fire('click');
 return {host,panel,snapshot,adapters,setWarnings:(next:TravelWarning[])=>{warnings=next;},refuse:(reason:string)=>{refusal=reason;}};
}
test('warnings cancel without submitting and confirmation revalidates the current authority',()=>{
 const f=setup();
 // Dataset action values are explicit; choose the start button, not adopt.
 const start=f.host.querySelectorAll('*').find(n=>n.dataset.groupAction==='start')!;start.fire('click');expect(preparationFind(f.host,'groupDepartureNotice').open).toBe(true);expect(f.adapters.send).not.toHaveBeenCalled();
 preparationFind(f.host,'groupDepartureCancel').fire('click');expect(f.adapters.send).not.toHaveBeenCalled();
 start.fire('click');f.refuse('La pile réelle a été réservée depuis la vérification.');preparationFind(f.host,'groupDepartureConfirm').fire('click');expect(f.adapters.send).not.toHaveBeenCalled();expect(f.host.textContent).toContain('La pile réelle a été réservée');f.panel.dispose();
});
test('a changed warning requires a fresh confirmation, then one command contains no planner queue or preview state',()=>{
 const f=setup(),start=f.host.querySelectorAll('*').find(n=>n.dataset.groupAction==='start')!;start.fire('click');f.setWarnings(['no-food']);preparationFind(f.host,'groupDepartureConfirm').fire('click');expect(f.adapters.send).not.toHaveBeenCalled();expect(preparationFind(f.host,'groupDepartureNotice').textContent).toContain('presque aucune');
 preparationFind(f.host,'groupDepartureConfirm').fire('click');expect(f.adapters.send).toHaveBeenCalledTimes(1);expect(f.adapters.send).toHaveBeenCalledWith({type:'group-start',originMapId:0,memberIds:[f.snapshot.world.pawns[0]!.id],destination:f.snapshot.planet.civilianTile,sources:[],animalIds:[],packedIds:[]});f.panel.dispose();
});
test('snapshot refresh only renders a dated estimate and never reruns the food calculation or route query',()=>{
 const f=setup(),count=vi.mocked(f.adapters.previewPlan).mock.calls.length;f.panel.update(f.snapshot);f.panel.update(f.snapshot);expect(f.adapters.previewPlan).toHaveBeenCalledTimes(count);expect(preparationFind(f.host,'groupProvisions').textContent).toContain('Autonomie estimée');expect(f.adapters.send).not.toHaveBeenCalled();f.panel.dispose();
});
