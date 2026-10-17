import { generateStartingWorld,localSeedForTile,parseWorldSeed,startingSiteChoices,startingTileClimate } from '../sim/starting-world';
import type { LegacyPlanetState } from '../sim/planet-state';
import { HILLINESS_LABELS,resolveSite } from '../sim/site';
import { STONE_LABELS } from '../sim/geology';
import { automaticStartDay,seasonalAmplitude } from '../sim/site-climate';
import { DEFAULT_MAP_SIZE } from '../sim/map-config';
import { createPlanetView } from './planet-view';
import { setTooltip } from './tooltip';
import './front-world.css';

function node<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string,className=''):HTMLElementTagNameMap[K]{
  const n=document.createElement(tag);n.className=className;if(text!==undefined)n.textContent=text;return n;
}
function button(text:string,handler:()=>void):HTMLButtonElement {const b=node('button',text);b.type='button';b.addEventListener('click',handler);return b;}
const BIOMES={'temperate-forest':'Forêt tempérée','boreal-forest':'Forêt boréale','arid-shrubland':'Broussailles arides',tundra:'Toundra',ocean:'Océan'} as const;

export function createWorldParameters(options:{seed:string;onSeed:(seed:string)=>void;onRandom:()=>string;onError:(message:string)=>void}):{element:HTMLElement;validate():number|undefined;dispose():void}{
  const root=node('div',undefined,'front-world-parameters');
  const parameters=node('section',undefined,'front-world-fields');
  const input=node('input');input.id='front-seed';input.type='text';input.maxLength=64;input.autocomplete='off';input.spellcheck=false;input.value=options.seed;
  const label=node('label','Graine');label.htmlFor=input.id;parameters.append(label,input);
  const random=button('Aléatoire',()=>{try{input.value=options.onRandom();input.removeAttribute('aria-invalid');}catch{options.onError('La génération aléatoire est indisponible. Vous pouvez saisir une graine.');}});
  random.id='front-random-seed';parameters.append(node('span'),random);
  input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');options.onSeed(input.value);});
  const coverage=node('select');coverage.id='front-world-coverage';coverage.disabled=true;coverage.setAttribute('aria-label','Couverture de la planète');
  for(const n of [30,50,100])coverage.append(new Option(`${n} %`,String(n)));coverage.value='100';
  parameters.append(node('span','Couverture de la planète'),coverage);
  for(const [id,text,left,right] of [['rainfall','Précipitations','Faibles','Élevées'],['temperature','Température','Basse','Élevée'],['population','Population','Faible','Élevée']]){
    const label=node('label',text);label.htmlFor=`front-world-${id}`;
    const field=node('div',undefined,'front-world-range');const slider=node('input');slider.type='range';slider.id=label.htmlFor;slider.min='0';slider.max='6';slider.value='3';slider.disabled=true;
    field.append(node('span',left),node('span','Normales'),node('span',right),slider);parameters.append(label,field);
  }
  let dialog:HTMLDialogElement|undefined;
  const edit=button('Modifier…',()=>{
    if(dialog)return;
    const panel=node('dialog',undefined,'front-world-advanced');dialog=panel;panel.setAttribute('aria-labelledby','front-advanced-title');
    const heading=node('h2','Paramètres avancés');heading.id='front-advanced-title';panel.append(heading,node('h3','Taille de la carte'));
    const sizes=node('fieldset');sizes.append(node('legend','Nombre de cases'));
    for(const size of [200,225,250,275,300,325]){
      const row=node('label',undefined,'front-radio'),radio=node('input');radio.type='radio';radio.name='front-map-size';radio.checked=size===DEFAULT_MAP_SIZE;radio.disabled=size!==DEFAULT_MAP_SIZE;row.append(radio,node('span',`${size} × ${size}`));sizes.append(row);
    }
    panel.append(sizes,node('p','La carte standard reste 250 × 250. Les autres tailles de ce parcours seront ouvertes après validation des budgets correspondants.','front-small'));
    const season=node('label','Saison de départ'),select=node('select');select.setAttribute('aria-label','Saison de départ');select.append(new Option('Automatique','auto'));select.disabled=true;season.append(select);panel.append(season);
    const close=()=>{panel.close();panel.remove();dialog=undefined;edit.focus();};
    panel.append(button('Fermer',close));panel.addEventListener('keydown',event=>event.stopPropagation());panel.addEventListener('cancel',event=>{event.preventDefault();close();});
    root.append(panel);panel.showModal();
  });
  parameters.append(node('span','Paramètres avancés'),edit);
  const factions=node('section',undefined,'front-world-factions');factions.append(node('h2','Factions'));
  const faction=node('div','Comptoir civil','front-faction-row');faction.append(node('span','1'));factions.append(faction,node('p','Un comptoir réel est généré pour les caravanes. Le catalogue des factions et leurs réglages restent à développer.','front-small'));
  root.append(parameters,factions,node('p','Notre globe original comprend 162 cases et quatre biomes terrestres. Couverture, climat global et population restent fixes ; les cases choisies déterminent réellement le terrain et son climat local.','front-world-limit front-small'));
  return {element:root,validate(){const seed=parseWorldSeed(input.value);if(seed===undefined){input.setAttribute('aria-invalid','true');options.onError('Saisissez une graine de 1 à 64 caractères.');input.focus();}return seed;},dispose(){if(dialog){dialog.close();dialog.remove();dialog=undefined;}}};
}

export function createStartingSiteConfiguration(options:{planet:LegacyPlanetState;selected:number|null;onSelected:(id:number)=>void;onError:(message:string)=>void}):{element:HTMLElement;validate():number|undefined;dispose():void}{
  const root=node('div',undefined,'front-landing-layout'),info=node('section',undefined,'front-landing-info'),globe=node('div',undefined,'front-landing-globe');
  const eligible=new Set(startingSiteChoices(options.planet));let selected=options.selected;
  const facts=node('dl',undefined,'front-map-facts');facts.id='front-site-facts';const reason=node('p',undefined,'front-site-reason');reason.setAttribute('role','status');
  const heading=node('h2','Choisir un lieu de départ');info.append(heading,facts,reason);
  const tips=node('p','Tournez le globe par glissement ou avec les flèches. Cliquez sur une case ; la molette rapproche le globe.','front-small');
  const view=createPlanetView(globe,id=>{selected=id;options.onSelected(id);describe();},{landing:true});view.setPlanet(options.planet);
  function fact(label:string,value:string):void {const row=node('div');row.append(node('dt',label),node('dd',value));facts.append(row);}
  function describe():void{
    facts.replaceChildren();view.setOverlay({selected,route:[]});
    const tile=selected===null?undefined:options.planet.tiles[selected];
    if(!tile){heading.textContent='Choisir un lieu de départ';reason.textContent='Choisissez un terrain sur le globe.';return;}
    heading.textContent=BIOMES[tile.biome];const climate=startingTileClimate(tile),amplitude=seasonalAmplitude(climate.latitude);
    fact('Case',String(tile.id));fact('Coordonnées',`${climate.latitude.toFixed(2)}° / ${climate.longitude.toFixed(2)}°`);
    fact('Relief',tile.hilliness==='mountainous'?'Montagnes':HILLINESS_LABELS[tile.hilliness]);
    if(tile.biome==='tundra')fact('Survie','Végétation rare, froid et neige au sol. Réserves, vêtements chauds, chauffage et accès à déneiger.');
    fact('Température moyenne',`${tile.meanTemperature.toFixed(1)} °C`);fact('Plage saisonnière',`${(tile.meanTemperature-amplitude).toFixed(1)} à ${(tile.meanTemperature+amplitude).toFixed(1)} °C`);fact('Précipitations',`${Math.round(tile.rainfall)} mm/an`);
    if(tile.biome!=='ocean'&&tile.hilliness!=='mountainous'){
      const seed=localSeedForTile(options.planet.generationSeed,tile.id),site=resolveSite(seed,{biome:tile.biome,hilliness:tile.hilliness});fact('Roches locales',site.stones.map(s=>STONE_LABELS[s]).join(', '));fact('Rivière','Aucune');fact('Taille',`${DEFAULT_MAP_SIZE} × ${DEFAULT_MAP_SIZE}`);fact('Saison de départ',`Automatique · jour ${automaticStartDay(climate.latitude,climate.meanTemperature)+1} de l’année`);
    }
    reason.textContent=eligible.has(tile.id)?'':tile.biome==='ocean'?'Ce lieu est dans l’océan.':tile.id===options.planet.civilianTile?'Ce lieu est déjà occupé par le comptoir civil.':tile.hilliness==='mountainous'?'Les cartes montagneuses ne sont pas encore disponibles.':'Ce lieu n’a pas de trajet terrestre vers le comptoir civil.';
    reason.classList.toggle('front-error',!!reason.textContent);
  }
  const random=button('Aléatoire',()=>{
    try{const draw=crypto.getRandomValues(new Uint32Array(1))[0]!;selected=[...eligible][draw%eligible.size]!;options.onSelected(selected);describe();view.focusTile(selected);}catch{options.onError('Le choix aléatoire est indisponible. Choisissez une case sur le globe.');}
  });
  random.id='front-random-site';setTooltip(random,{title:'Lieu de départ aléatoire',body:'Choisit une case terrestre réellement accessible parmi les terrains pris en charge.'});
  globe.append(random,tips);root.append(info,globe);describe();if(selected!==null)view.focusTile(selected);
  return {element:root,validate(){if(selected===null||!eligible.has(selected)){options.onError('Choisissez un lieu de départ terrestre disponible.');return undefined;}return selected;},dispose(){view.dispose();}};
}

/** Generation shared with the Worker. No map or colony is allocated for a menu. */
export {generateStartingWorld};
