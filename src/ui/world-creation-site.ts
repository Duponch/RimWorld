import {worldCreationCalendarFacts262} from './world-creation-calendar-262';
import type {GeographicCreationSeason262} from '../sim/geographic-creation-options-262';
import {canPlaceWorldSettlement} from '../sim/world-settlement-placement';
import {describeWorldSite} from '../sim/world-site-geography';
import {worldBiomeCanSettle} from '../sim/world-biome-properties';
import {createDensePlanetView,denseBiomeLabel,denseReliefLabel} from './planet-dense-view';
import type {WorldCreationPreview256} from './world-creation-contract';
import './front-world.css';
const riverNames:Record<string,string>={'huge-river':'Fleuve','large-river':'Grande rivière',river:'Rivière',creek:'Ruisseau'};
const roadNames:Record<string,string>={'dirt-path':'Sentier','dirt-road':'Route en terre','stone-road':'Route pavée','ancient-asphalt-road':'Ancienne route asphaltée','ancient-asphalt-highway':'Ancienne autoroute'};
const rockNames:Record<string,string>={granite:'Granite',limestone:'Calcaire',marble:'Marbre',slate:'Ardoise',sandstone:'Grès'};
/** No local map/World/PRNG. Every geographic fact comes from the immutable
 * owner already accepted on Main; final admission is still worker-confirmed. */
export function createWorldCreationSite256(options:{preview:WorldCreationPreview256;choices:{size:number;season:GeographicCreationSeason262};selected:number|null;onSelected:(id:number)=>void;onError:(message:string)=>void}){
 const doc=document,node=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const root=node('div'),info=node('section'),globe=node('div'),heading=node('h2'),facts=node('dl'),reason=node('p');root.className='front-landing-layout';info.className='front-landing-info';globe.className='front-landing-globe';facts.className='front-map-facts';facts.id='front-site-facts';reason.className='front-site-reason';reason.setAttribute('role','status');info.append(heading,facts,reason);root.append(info,globe);
 const {surface,roads}=options.preview.geography,occupied=new Set(options.preview.settlements.map(s=>s.tile)),admission={settlementTiles:occupied};
 const eligible=Uint32Array.from(surface.tiles.filter(t=>canPlaceWorldSettlement(surface.tiles,t.id,admission)).map(t=>t.id));
 let selected=options.selected,dialog:HTMLDialogElement|undefined;
 const view=createDensePlanetView(globe,id=>choose(id),{landing:true,roads,settlements:options.preview.settlements});view.setPlanet(surface);
 const allowed=(id:number)=>Number.isSafeInteger(id)&&canPlaceWorldSettlement(surface.tiles,id,admission);
 function fact(label:string,value:string){const row=node('div');row.append(node('dt',label),node('dd',value));facts.append(row);}
 function describe(){
  facts.replaceChildren();view.setOverlay({selected,route:[]});const tile=selected===null?undefined:surface.tiles[selected];
  if(!tile){heading.textContent='Choisir un lieu de départ';reason.textContent='Sélectionnez une case sur le globe.';return;}
  const site=describeWorldSite(surface,roads,tile.id);heading.textContent=denseBiomeLabel(tile.biome);fact('Case',String(tile.id));fact('Coordonnées',`${site.latitude.toFixed(2)}° / ${site.longitude.toFixed(2)}°`);fact('Relief',denseReliefLabel(site.hilliness));fact('Altitude',`${Math.round(site.elevation)} m`);fact('Température moyenne',`${site.meanTemperature.toFixed(1)} °C`);fact('Précipitations',`${Math.round(site.rainfall)} mm/an`);
  fact('Roches naturelles',site.hasBedrock?site.naturalRocks.map(r=>rockNames[r]??r).join(', '):'Aucune roche de sous-sol');fact('Côte océanique',site.coastAngle===null?'Non':'Oui');fact('Cours d’eau',site.rivers.length?[...new Set(site.rivers.map(r=>riverNames[r.river]??r.river))].join(', '):'Aucun');fact('Routes',site.roads.length?[...new Set(site.roads.map(r=>roadNames[r.road]??r.road))].join(', '):'Aucune');fact('Voisins',tile.neighbours.join(', '));fact('Taille de la carte',`${options.choices.size} × ${options.choices.size}`);const calendar=worldCreationCalendarFacts262(tile,options.choices.season);fact('Saison choisie',calendar.choice);fact('Date de départ',calendar.date);fact('Cycle saisonnier',calendar.seasonalRange+' · hors cycle journalier et incidents');
  const settlement=options.preview.settlements.find(s=>s.tile===tile.id);if(settlement)fact('Implantation',settlement.name);
  reason.textContent=allowed(tile.id)?'':!worldBiomeCanSettle(tile.biome)?'Ce lieu est couvert d’eau.':tile.hilliness==='impassable'?'Ces montagnes sont infranchissables.':occupied.has(tile.id)?'Ce lieu est déjà occupé.':'Ce lieu est adjacent à une implantation.';reason.classList.toggle('front-error',!allowed(tile.id));
 }
 function choose(id:number){if(!Number.isSafeInteger(id)||!surface.tiles[id])return;selected=id;options.onSelected(id);describe();}
 const random=node('button','Lieu aléatoire');random.type='button';random.id='front-random-site';random.disabled=!eligible.length;random.onclick=()=>{try{if(!eligible.length)return;const limit=Math.floor(0x100000000/eligible.length)*eligible.length;let draw:number;do{draw=crypto.getRandomValues(new Uint32Array(1))[0]!;}while(draw>=limit);const id=eligible[draw%eligible.length]!;choose(id);view.focusTile(id);}catch{options.onError('Le choix aléatoire est indisponible. Sélectionnez une case sur le globe.');}};
 const factions=node('button','Factions');factions.type='button';factions.onclick=()=>{if(dialog)return;const panel=node('dialog');dialog=panel;panel.className='front-world-advanced';panel.setAttribute('aria-label','Factions du monde');panel.append(node('h2','Factions du monde'));const list=node('ul');for(const f of options.preview.factions.filter(f=>!f.hidden)){const row=node('li',f.name),count=options.preview.settlements.filter(s=>s.factionId===f.id).length;row.append(node('span',` · ${count} implantation${count===1?'':'s'}`));list.append(row);}panel.append(list);const close=()=>{panel.close();panel.remove();dialog=undefined;factions.focus();},button=node('button','Fermer');button.type='button';button.onclick=close;panel.append(button);panel.addEventListener('cancel',event=>{event.preventDefault();close();});panel.addEventListener('keydown',event=>event.stopPropagation());root.append(panel);panel.showModal();};
 const explanation=node('p','La sélection ne génère pas de carte locale. Confirmer valide ce lieu avant le choix des personnages.');explanation.className='front-small';globe.append(random,factions,explanation);describe();if(selected!==null)view.focusTile(selected);
 return {element:root,canContinue:()=>selected!==null&&allowed(selected),validate(){if(selected===null||!allowed(selected)){options.onError('Sélectionnez un lieu de départ disponible.');return;}return selected;},dispose(){dialog?.close();dialog?.remove();view.dispose();}};
}
