import {describe,it,expect,vi,beforeEach} from 'vitest';
const hooks=vi.hoisted(()=>({resolve:vi.fn(),dense:vi.fn(),legacy:vi.fn()}));
vi.mock('../src/sim/planet-geography-256',()=>({planetGeography256:hooks.resolve}));
vi.mock('../src/ui/planet-dense-view',()=>({createDensePlanetView:hooks.dense,denseBiomeLabel:(id:string)=>id,denseReliefLabel:(id:string)=>id}));
vi.mock('../src/ui/planet-legacy-view',()=>({createLegacyPlanetView:hooks.legacy,legacyPlanetTileLabel:()=> 'legacy literal'}));
import {createPlanetView,planetTileLabel} from '../src/ui/planet-view';
const renderer=()=>({setPlanet:vi.fn(),setOverlay:vi.fn(),setVisible:vi.fn(),focusTile:vi.fn(),dispose:vi.fn()});
// These are facade/ownership-call oracles: its owner boundary is deliberately
// mocked, not a fake admitted Planet/World or a geographic generator test.
const compact=()=>JSON.parse('{"revision":3,"homeTile":7,"civilianTile":null,"nextGroupId":1}');
beforeEach(()=>{vi.clearAllMocks();hooks.dense.mockImplementation(renderer);hooks.legacy.mockImplementation(renderer);});
describe('campaign real-surface presentation boundary256',()=>{
 it('passes exactly the owner surface and real roads, without reading a massive tiles array on metadata snapshots',()=>{
  const tiles=new Proxy([],{get(){throw Error('Snapshot attempted a tile scan');}}),surface={tiles},roads=Object.freeze([]),owner={surface,roads};hooks.resolve.mockReturnValue(owner);
  const view=createPlanetView(({} as HTMLElement),()=>{});view.setPlanet(compact());view.setPlanet({...compact(),nextGroupId:2,civilianTile:9});
  expect(hooks.dense).toHaveBeenCalledTimes(1);expect(hooks.legacy).not.toHaveBeenCalled();expect(hooks.dense.mock.calls[0]![2].roads).toBe(roads);
  const target=hooks.dense.mock.results[0]!.value;expect(target.setPlanet.mock.calls.every((args:unknown[])=>args[0]===surface)).toBe(true);expect(target.setOverlay.mock.lastCall[0]).toMatchObject({civilianTile:9,homeTile:7});view.dispose();
 });
 it('keeps historical162 presentation separate, and rejects a cold/unowned compact object before disposing the accepted view',()=>{
  const view=createPlanetView(({} as HTMLElement),()=>{}),historical=JSON.parse('{"revision":2}');view.setPlanet(historical);const legacy=hooks.legacy.mock.results[0]!.value;
  expect(legacy.setPlanet).toHaveBeenCalledWith(historical);hooks.resolve.mockImplementation(()=>{throw Error('not adopted');});expect(()=>view.setPlanet(compact())).toThrow('not adopted');expect(legacy.dispose).not.toHaveBeenCalled();expect(planetTileLabel(historical,0)).toBe('legacy literal');view.dispose();
 });
 it('clears old routes/objects on actual surface replacement and keeps all confirmed overlay IDs/labels literal',()=>{
  const one={surface:{tiles:[]},roads:[]},two={surface:{tiles:[]},roads:[]};hooks.resolve.mockReturnValue(one);
  const view=createPlanetView(({} as HTMLElement),()=>{});view.setPlanet(compact());view.setOverlay({selected:4,route:[4,5],maps:[{mapId:0,tile:4,label:'<foyer>',kind:'settlement',active:true}],groups:[{groupId:21,tile:5,label:'Groupe21',selected:true}],settlements:[{id:3,factionId:2,tile:7,name:'<site>'}]});
  const first=hooks.dense.mock.results[0]!.value;expect(first.setOverlay.mock.lastCall[0].settlements[0].name).toBe('<site>');hooks.resolve.mockReturnValue(two);view.setPlanet(compact());expect(first.dispose).toHaveBeenCalledOnce();const second=hooks.dense.mock.results[1]!.value;expect(second.setOverlay.mock.lastCall[0]).toEqual({selected:null,route:[],homeTile:7,civilianTile:null});view.dispose();
 });
});
