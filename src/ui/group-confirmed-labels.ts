import type {GroupPanelSnapshot} from './group-panel';
import {mapDisplayName} from './map-registry-adapter';
import {planetTileLabel} from './planet-view';

/** Presentation only. A modern local map's actual header supersedes the legacy
 * expedition/home fallback; an away group's location remains its own fact. */
export function groupPanelLocalOrigin(snapshot:GroupPanelSnapshot):{originTile:number;originLabel:string}|undefined {
 if(snapshot.group&&'members'in snapshot.group)return;
 const id=snapshot.originMapId,map=snapshot.campaign?.maps.find(m=>m.id===id)??snapshot.world.worldMaps?.sites.find(m=>m.id===id);
 if(map?.tile===null||map?.tile===undefined)return;
 return {originTile:map.tile,originLabel:mapDisplayName(map)};
}

/** The persisted intent is read separately from the editable next-order draft.
 * This reader never chooses an action, destination or new route. */
export function groupConfirmedArrivalText(snapshot:GroupPanelSnapshot):string {
 const group=snapshot.group;if(!group)return '';
 const record=snapshot.campaign?.groups.find(r=>r.id===group.id)??snapshot.world.worldGroups?.groups.find(r=>r.state.id===group.id);
 if(!record)return 'Ordre d’arrivée confirmé indisponible.';
 const arrival=record.arrival261,tile=arrival?.tile??group.destination;
 const where=snapshot.planet?planetTileLabel(snapshot.planet,tile):`case ${tile}`;
 if(!arrival)return `Ordre d’arrivée confirmé : s’arrêter sur la tuile de destination · ${where}.`;
 const action=arrival.action;let label:string;
 if(action.kind==='enter'){
  const map=snapshot.campaign?.maps.find(m=>m.id===action.mapId)??snapshot.world.worldMaps?.sites.find(m=>m.id===action.mapId);
  if(map)return `Ordre d’arrivée confirmé : entrer sur ${mapDisplayName(map)}.`;
  label=`entrer sur la carte ${action.mapId}`;
 }else if(action.kind==='trade'){
  const settlement=snapshot.world.worldFactions?.settlements.find(s=>s.id===action.settlementId);label=`faire du commerce avec ${settlement?.name??`l’établissement ${action.settlementId}`}`;
 }else if(action.kind==='attack-settlement'){
  const settlement=snapshot.world.worldFactions?.settlements.find(s=>s.id===action.settlementId);label=`attaquer ${settlement?.name??`l’établissement ${action.settlementId}`}`;
 }else label=`visiter le Site ${action.siteId}`;
 return `Ordre d’arrivée confirmé : ${label} · ${where}.`;
}
