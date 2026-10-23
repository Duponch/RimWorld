import type {WorldMapKind} from '../sim/world-map-state';
import type {PlanetState} from '../sim/planet-state';
import {planetGeography256} from '../sim/planet-geography-256';
import {createDensePlanetView,denseBiomeLabel,denseReliefLabel} from './planet-dense-view';
import {createLegacyPlanetView,legacyPlanetTileLabel} from './planet-legacy-view';
export interface PlanetOverlay {
  selected:number|null;
  route:readonly number[];
  previewRoute?:readonly number[];
  groupTile?:number;
  maps?:readonly {mapId:number;tile:number;label:string;kind:WorldMapKind;active:boolean}[];
  worldSites?:readonly {siteId:number;tile:number;label:string;kind:'item-stash'|'destroyed-settlement'|'peace-talks'}[];
  retiredCamps?:readonly {retiredMapId:number;tile:number;label:string}[];
  homeTile?:number;
  civilianTile?:number|null;
  settlements?:readonly {id:number;tile:number;name:string;factionId:number}[];
  groups?:readonly {groupId:number;tile:number;label:string;selected:boolean}[];
}
export interface PlanetView {
  setPlanet(planet:PlanetState|undefined):void;
  setOverlay(overlay:PlanetOverlay):void;
  setVisible(visible:boolean):void;
  focusTile(id:number):void;
  dispose():void;
}

/** Real immutable owner only: compact Planet3 is never expanded to a fake
 * legacy162 state, compared with JSON or walked on each snapshot. */
export function planetTileLabel(planet:PlanetState,id:number):string {
 if(planet.revision!==3)return legacyPlanetTileLabel(planet,id);
 const tile=planetGeography256(planet).surface.tiles[id];if(!Number.isSafeInteger(id)||!tile||tile.id!==id)throw Error('Case géographique absente.');
 const site=id===planet.homeTile?'Foyer':id===planet.civilianTile?'Comptoir civil':`Case ${id}`;
 return `${site} · ${denseBiomeLabel(tile.biome)} · ${denseReliefLabel(tile.hilliness)}`;
}
export function createPlanetView(host:HTMLElement,onSelect:(tileId:number)=>void,options:{landing?:boolean}={}):PlanetView {
 type Legacy={kind:'legacy';view:ReturnType<typeof createLegacyPlanetView>};
 type Dense={kind:'dense';view:ReturnType<typeof createDensePlanetView>;surface:ReturnType<typeof planetGeography256>['surface'];roads:ReturnType<typeof planetGeography256>['roads']};
 let current:Legacy|Dense|undefined,planet:PlanetState|undefined,visible=true,disposed=false,overlay:PlanetOverlay={selected:null,route:[]};
 const enriched=(next:PlanetOverlay):PlanetOverlay=>planet?.revision===3?{...next,homeTile:planet.homeTile,civilianTile:planet.civilianTile}:next;
 return {
  setPlanet(next){
   if(disposed)return;
   // Resolve ownership BEFORE disposing the accepted renderer. A malformed or
   // cold unadopted object cannot evict an already visible valid geography.
   const owner=next?.revision===3?planetGeography256(next):undefined;
   if(!next){current?.view.dispose();current=undefined;planet=undefined;overlay={selected:null,route:[]};return;}
   if(next.revision===3){
    if(!owner)throw Error('Géographie non adoptée.');
    if(current?.kind!=='dense'||current.surface!==owner.surface||current.roads!==owner.roads){current?.view.dispose();overlay={selected:null,route:[]};current={kind:'dense',view:createDensePlanetView(host,onSelect,{...options,roads:owner.roads}),surface:owner.surface,roads:owner.roads};}
    planet=next;current.view.setPlanet(owner.surface);
   }else{
    if(current?.kind!=='legacy'){current?.view.dispose();overlay={selected:null,route:[]};current={kind:'legacy',view:createLegacyPlanetView(host,onSelect,options)};}
    planet=next;current.view.setPlanet(next);
   }
   current.view.setOverlay(enriched(overlay));current.view.setVisible(visible);
  },
  setOverlay(next){current?.view.setOverlay(enriched(next));overlay=next;},
  setVisible(next){visible=next;current?.view.setVisible(next);},
  focusTile(id){current?.view.focusTile(id);},
  dispose(){if(disposed)return;disposed=true;current?.view.dispose();current=undefined;planet=undefined;},
 };
}
