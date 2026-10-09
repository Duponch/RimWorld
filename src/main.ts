import { isBedKind } from './sim/bed-kinds';
import { bedRestEffectiveness } from './sim/furniture-stats';
import { mentalCrisisView } from './sim/mental-presentation';
import { bedHealPerDay,bedImmunityFactor,bedTendOffset,bedSurgeryFactor } from './sim/hospital-medical-stats';
import {vitalsMonitorInspection} from './ui/vitals-monitor-inspection';
import { createCommercialUI } from './ui/commercial-panel';
import {appearanceOf} from './sim/pawn-appearance';
import {humanLimbVisualMask} from './render/human-anatomy-presentation';
import {portraitDataUrl,portraitExpressionOf} from './ui/pawn-portrait';
import {updatePawnAppearanceInspection} from './ui/pawn-appearance-inspection';
import {pawnBaseColor} from './render/pawn-appearance-shape';
import { createColonyEconomyUI } from './ui/colony-economy';
import {QUALITY_LABELS} from './sim/equipment-rules';
import {structureBeauty} from './sim/room-beauty';
import { floraDefinition } from './sim/biome-flora';
import { updateBurialControls } from './ui/burial-controls';
import { updateHygieneControls } from './ui/hygiene-controls';
import { isBuildableFloor } from './sim/flooring';
import { createOrbitalTradeUI } from './ui/orbital-trade-panel';
import { createTradeUI } from './ui/trade-panel';
import { climateDateLabel,climateControls } from './ui/climate-inspection';
import { WEATHER } from './sim/weather-definitions';
import { perceivedWeather, weatherRainRate } from './sim/weather';
import { windIntensity } from './sim/wind-rules';
import { firePosition } from './sim/fire-rules';
import { calendarTick } from './sim/calendar';
import { GameSession, SAVE_KEY, PREVIOUS_KEY } from './ui/game-session';
import { BrowserSaveRepository } from './ui/save-repository';
import { fetchTestColonies, readSaveFile, readTestColony } from './ui/test-colonies';
import { createFrontMenu } from './ui/front-menu';
import type { PawnTrack } from './bridge/motion-tracks';
import { SCENARIOS, type ScenarioId } from './sim/scenario-definitions';
import { INFECTION_UNIT,infectionStage } from './sim/infection-rules';
import { FLU_UNIT,fluStage } from './sim/flu-rules';
import { IMMUNE_DISEASE_UNIT,immuneDiseaseStage } from './sim/immune-diseases-rules';
import { IMMUNE_DISEASE_KINDS } from './sim/immune-diseases-types';
import { corpseStage } from './sim/corpses';
import { updateAnimalsPanel } from './ui/animals-panel';
import { updateWildlifePanel } from './ui/wildlife-panel';
import { createHeatwaveUI } from './ui/heatwave';
import { createWeatherConditionUI, weatherConditionLabel } from './ui/weather-inspection';
import { createShortCircuitUI } from './ui/short-circuit';
import { createFlashstormUI } from './ui/flashstorm';
import { createSolarFlareUI } from './ui/solar-flare';
import { updateResearchPanel } from './ui/research-panel';
import { createScoutUI } from './ui/scout-panel';
import { createGroupPanel } from './ui/group-panel';
import { createGroupAdapters, readGroupPanelSnapshot } from './ui/group-adapter';
import { createQuestUI } from './ui/quests';
import { mountStorageItemControls,readStorageItemControls,mountStorageConditionControls,readStorageConditionControls } from './ui/storage-item-controls';
import './ui/storage-item-controls.css';
import { updateUnfinishedInspection } from './ui/unfinished-inspection';
import { createSocialInspection,updateSocialInspection } from './ui/social-inspection';
import { createJournalInspection,updateJournalInspection } from './ui/journal-inspection';
import { createRaidUI } from './ui/raids';
import { barrierHp,barrierMaxHp,isBarrier } from './sim/barriers';
import { resourceMaxHp, structureMaxHp } from './sim/thing-damage-rules';
import { rockMaxHP } from './sim/mining-rules';
import { createArrivalUI } from './ui/arrivals';
import { createMoodInspection,updateMoodInspection } from './ui/mood-inspection';
import { isColonist,activeThreat } from './sim/affiliation';
import { prisonBreakActive } from './sim/prison-break-state';
import { ShootingControls } from './ui/shooting-controls';
const shootingControls=new ShootingControls();
import { createDraftControls,updateDraftControls,toggleDraft,draftLabel } from './ui/drafting-controls';
import { apparelProjection,apparelAppearance } from './render/character-apparel';
import { createEquipmentInspection,updateEquipmentInspection } from './ui/equipment-inspection';
import { equipmentProjection,equipmentDescription } from './render/character-equipment';
import { bedControls,updateBedControls } from './ui/bed-controls.ts';
import { medicalBleed } from './sim/injury-state';
import { createHealthInspection,updateHealthInspection } from './ui/health-inspection';
import { createPrisonerInspection,updatePrisonerInspection } from './ui/prisoner-inspection';
import { createSkillsInspection, updateSkillsInspection, updateWorkSkills } from './ui/skills-inspection';
import { BACKGROUND_SKILL_IDS, backgroundSkillRefusal } from './sim/colonist-backgrounds';
import { BACKGROUND_SKILL_LABELS, backgroundSummary, backgroundRestrictionRows, updateBackgroundWorkControl } from './ui/background-inspection';
import { updateCoolerControls } from './ui/cooler-controls';
import { powerInspection } from './ui/power-inspection';
import { televisionInspection } from './ui/television-inspection';
import { updatePowerControls } from './ui/power-controls';
import { buildingLabels } from './ui/building-labels';
import { outdoorTemperature } from './sim/temperature';
import { SnapshotHud } from './ui/snapshot-hud';
import { isRoofArea } from './sim/roof-rules';
import { stationRecipe } from './sim/production-recipes';
import { RoomInspection } from './ui/room-inspection';
import { constructionControls, constructionDeliveryLabel, structureFootprintLabel } from './ui/construction-controls';
import { constructionRecipe } from './sim/construction-materials';
import { rockInspection } from './ui/geology-inspection';
import { doorControls, updateDoorControls } from './ui/door-controls';
import { penControls, updatePenControls } from './ui/pen-controls';
import { furnitureControls, updateFurnitureControls } from './ui/furniture-controls';
import { furnitureObject, furnitureIntentAt } from './sim/furniture-rules';
import { fireControls, updateFireControls } from './ui/fire-controls';
import { PawnSelection } from './ui/pawn-selection';
import { createAnimalInspector, updateAnimalInspector } from './ui/animal-inspector';
import { createMechanoidInspector, updateMechanoidInspector } from './ui/mechanoid-inspection';
import { mechanoidView } from './sim/mechanoid-presentation';
import './ui/animal-inspector.css';
import { animalSpecies } from './sim/animal-species';
import { OrderMenu } from './ui/order-menu';
import type { SelectionGesture } from './render/PawnSelectionInput';
import { createScheduleControls } from './ui/schedule-controls';
import { createFoodPolicyControls } from './ui/food-policy-controls';
import { createApparelPolicyControls } from './ui/apparel-policy-controls';
import { billControls, updateBillControls } from './ui/bill-controls';
import { growingControls } from './ui/growing-controls';
import { plantInspection, growingTemperatureInspection } from './ui/plant-inspection';
import { BIOME_LABELS,HILLINESS_LABELS } from './sim/site';
import { choppable,harvestable,isPlant,PLANT_DEFINITIONS } from './sim/plants';
import './style.css';
import './ui/colonist-inspector.css';
import './ui/visual-identity.css';
import './ui/cell-inspector.css';
import './ui/inspection-dossiers.css';
import './ui/journal-inspection.css';
import { presentCellDescription, type CellHealth } from './ui/cell-inspector';
import { mapObjectExists,nextMapObject,type MapObjectSelection } from './ui/map-object-selection';
import { MapHoverLightCache,mapHoverLines } from './ui/map-hover-readout';
import { mapCellDetails } from './ui/map-cell-details';
import './ui/map-details.css';
import './ui/cursors.css';
import { installVisualIdentity, type UiIcon } from './ui/visual-identity';
import { installArchitectIcons } from './ui/architect-icons';
import { syncToolCursor } from './ui/tool-cursors';
import { mountColonistInspector, updateColonistInspector, colonistInspectorState, type ColonistInspectorState } from './ui/colonist-inspector';
import { installTooltips, dismissTooltip, setTooltip } from './ui/tooltip';
import { pawnNeedsMarkup, updatePawnInspection } from './ui/pawn-inspection';
import { openObjectInformation } from './ui/object-information';
import { itemInformation } from './ui/item-information';
import { healthCapacityRows } from './ui/health-inspection';
import { ITEM_DEFINITIONS, availableNutrition } from './sim/items';
import { foodFreshnessLabel } from './ui/food-freshness';
import { updateFoodStocks } from './ui/food-stocks';
import { SimulationClient } from './bridge/SimulationClient';
import { AudioDirector } from './audio/AudioDirector';
import { MusicDirector, type MusicMood } from './audio/MusicDirector';
import { ambientCameraGain, FoliageAmbience } from './audio/ambience';
import { createNearbyFireCollector, createNearbyMachineCollector, runningMachineAudioSource } from './audio/continuous';
import { listenerPose, type AudioCamera } from './audio/spatial';
import { ColonyRenderer } from './render/ColonyRenderer';
import type { JobKind, Pawn, World, WorkType, Orientation, AreaAction, Cell, Command } from './sim/types';
import { TICKS_PER_DAY } from './sim/types';
import { DEFAULT_MAP_SIZE, MAP_SIZE_PRESETS } from './sim/map-config';
import { footprintCells, queryJobStatus, queryPawnStatus } from './sim/index';
import { gameLayout, storageSettings, toolDefinitions, workColumns } from './ui/layout';
import type { ArchitectCategory, Panel, Tool } from './ui/layout';
import { updateMiniTurretControls } from './ui/mini-turret-controls';
import { miniTurretView,turretSeconds } from './sim/mini-turret-presentation';

import { updateRecreationInspection } from './ui/recreation-inspection';
import { gatherSpotControls, updateGatherSpotControls } from './ui/gather-spot-controls';
const jobLabels: Record<JobKind, string> = { 'orbital-beacon':'Construction de la balise orbitale','comms-console':'Construction de la console de communication', 'deep-drill':'Construction de foreuse profonde','ground-scanner':'Construction du scanner souterrain', 'vitals-monitor':'Construction du moniteur vital', 'drug-lab':'Construction du laboratoire de chimie', 'hydroponics-basin':'Construction du bac hydroponique', 'mini-turret':'Construction de mini-tourelle automatique', 'tube-television':'Construction de télévision cathodique', sandbags: 'sacs de sable', fence:'Clôture','fence-gate':'Portillon',autodoor:'Porte automatique','pen-marker':'Marqueur d’enclos', 'art-bench':'Atelier de sculpture','small-sculpture':'Petite sculpture','large-sculpture':'Grande sculpture', 'machining-table':'Atelier d’usinage','fabrication-bench':'Établi de fabrication','hi-tech-research-bench':'Bureau de recherche haute technologie','multi-analyzer':'Multi-analyseur', grave:'Creuser une tombe','lay-floor':'Pose de sol','remove-floor':'Retrait de sol', heater:'Radiateur','wind-turbine':'Éolienne',flick:'Actionner un interrupteur', 'power-conduit':'Construction du câble', 'power-switch':'Construction de l’interrupteur', battery:'Construction de la batterie', 'solar-generator':'Construction du générateur solaire', 'fueled-stove':'Cuisinière à bois','electric-stove':'Cuisinière électrique','butcher-table':'Table de boucherie', 'butcher-spot':'Emplacement de boucherie', cooler:'Climatiseur', 'research-bench':'Bureau de recherche','tailor-bench':'Établi de tailleur','electric-tailor-bench':'Établi de tailleur électrique', 'crafting-spot':'Emplacement d’artisanat', repair:'Réparation', 'fix-breakdown':'Remplacement du composant', 'wood-generator':'Construction du générateur à bois', 'sun-lamp':'Construction de la lampe horticole', 'standing-lamp':'Construction de la lampe', 'passive-cooler':'Construction du refroidisseur passif', 'build-roof':'Pose de toit', 'remove-roof':'Retrait de toit', door:'Construction de la porte', stonecutter:'Construction de la table de taille', mine:'Minage', uninstall:'Désinstallation',install:'Réinstallation', deconstruct: 'Déconstruction', chop: 'Abattage', harvest: 'Récolte', cut: 'Coupe de plante', sow: 'Semis', wall: 'Construction du mur', bed: 'Construction du lit', 'hospital-bed':'Construction du lit d’hôpital', table: 'Construction de la table','table-square':'Construction de la table carrée','table-long':'Construction de la table longue', stool: 'Construction du tabouret','dining-chair':'Construction de la chaise',armchair:'Construction du fauteuil','end-table':'Construction de la table de chevet',dresser:'Construction de la commode','flower-pot':'Construction du pot de fleurs', horseshoes: 'Construction du piquet de fers à cheval', 'chess-table': 'Construction de la table d’échecs', campfire: 'Construction du feu de camp' };
const stateLabels: Record<Pawn['state'], string> = { resting:'Au lit pour soins', downed:'À terre', dead:'Décédé', idle: 'Disponible', moving: 'En chemin', working: 'Au travail', sleeping: 'Se repose', hungry: 'Cherche à manger', eating: 'Mange', recreating: 'Se divertit' };
const rotatableTools=new Set<Tool>(['comms-console','deep-drill','ground-scanner','vitals-monitor','drug-lab','hydroponics-basin','tube-television','art-bench','machining-table','hi-tech-research-bench','fabrication-bench','grave','wind-turbine','battery','fueled-stove','electric-stove','butcher-table','install','bed','hospital-bed','table','table-square','table-long','dining-chair','armchair','end-table','dresser','campfire','stonecutter','butcher-spot','crafting-spot','research-bench','tailor-bench','electric-tailor-bench','cooler']);
const resourceLabels = { 'wild-plant':'Plante sauvage', healroot:'Racine médicinale', potato:'Plant de pommes de terre',corn:'Plant de maïs', tree: 'Arbre', berries: 'Buisson de baies', rock: 'Pierre au sol', rice: 'Plant de riz', cotton: 'Cotonnier' };
const params = new URLSearchParams(location.search);
const diagnosticStart = params.has('scenario');
document.querySelector<HTMLDivElement>('#app')!.innerHTML = gameLayout();
mountStorageItemControls(document.getElementById('stockpile-items')!);
mountStorageConditionControls(document.getElementById('stockpile-items')!);
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const client = new SimulationClient();
const audio = new AudioDirector();
const music = new MusicDirector();
let snapshot: World | undefined;
let selectedPawn: number | undefined;
let colonistInspector: ColonistInspectorState | undefined;
let selectedCell: { x: number; z: number } | undefined;
let selectedObject:MapObjectSelection|undefined;
let hoveredCell:Cell|null=null;
let lastHoverReadAt=0,lastHoverCopy='';
let altInspectorHeld=false,lastAltReadAt=0,lastAltCopy='',mapPointerX=0,mapPointerY=0;
const mapHoverLight=new MapHoverLightCache();
let lastAudioSourceFocus={x:Infinity,z:Infinity};
let lastAudioSourceHeight=NaN;
let lastAudioCamera:AudioCamera|undefined;
const foliageAmbience = new FoliageAmbience();
function syncAudioSources(world: World,camera=lastAudioCamera): void {
  if (!soundEnabled) { audio.setContinuousSources([]); return; }
  // Rebuild on a snapshot or meaningful listener movement, never per image.
  // A low perspective view can place the ear far from the orbit target.
  const listener=camera?listenerPose(camera):undefined;
  const pose=listener??renderer?.audioFocus??{x:world.width/2,z:world.height/2};
  const focus={x:pose.x,z:pose.z};
  lastAudioSourceFocus=focus;
  lastAudioSourceHeight=listener?.y??NaN;
  const weatherCameraGain=camera?ambientCameraGain(camera):1;
  const nearby=createNearbyFireCollector(focus);
  const machinery=createNearbyMachineCollector(focus);
  for(const fire of world.fires?.items??[])if(fire.attachedPawnId===undefined&&fire.attachedAnimalId===undefined)
    nearby.add(`fire:${fire.id}`,fire.x,fire.z,Math.max(.2,Math.min(1,fire.size)));
  for(const structure of world.structures){
    if(structure.kind==='campfire'&&structure.fuel?.ticks)
      nearby.add(`campfire:${structure.id}`,structure.x,structure.z,.48);
    if(structure.kind==='wood-generator'||structure.kind==='wind-turbine'){
      const machine=runningMachineAudioSource(structure);
      if(machine)machinery.add(machine.id,machine.kind,machine.x,machine.z,machine.gain);
    }
  }
  const sources=[...nearby.sources(),...machinery.sources()];
  const weather=perceivedWeather(world);
  if(weather==='rain'||weather==='rainy-thunderstorm'||weather==='foggy-rain') {
    const gain=Math.min(1,Math.max(0,weatherRainRate(world)));
    if(gain>.05)sources.push({id:'weather:rain',kind:'weather.rain',x:focus.x,z:focus.z,gain:gain*weatherCameraGain});
  }
  // One foliage loop follows wind and nearby canopy, using a snapshot census.
  const wind=Math.max(0,Math.min(1,windIntensity(world)/2));
  const rustle=wind*weatherCameraGain*foliageAmbience.gain(focus.x,focus.z);
  if(rustle>.001)sources.push({id:'weather:wind',kind:'weather.wind',x:focus.x,z:focus.z,gain:rustle});
  audio.setContinuousSources(sources);
}
let lastStatusAlertsSignature='';
let lastColonyHistorySignature='';
let installationId:number|undefined;
let currentTool: Tool = 'select';
let currentPanel: Panel = null;
const scoutUI=createScoutUI(el('scout-content'),c=>void attempt(()=>client.command(c)));
const commercialUI=createCommercialUI(el('commercial-content'),async command=>{
  const result=await client.command(command);
  if(['commercial-start','commercial-return','commercial-unload'].includes(command.type)&&currentSpeed===0)await client.setSpeed(1);
  return result;
});
type WorldTab='group'|'individual';
let worldTab:WorldTab='individual';
const groupUI=createGroupPanel(el('group-content'),createGroupAdapters({
  blocked:groupCommandsBlocked,
  send:async command=>{const result=await client.command(command);renderState();return result;},
  inspectPresentPawn:id=>{if(snapshot?.pawns.some(p=>p.id===id))selectPawn(id);},
}));
function groupCommandsBlocked():string|undefined {
  if(simulationStopped)return 'La simulation est arrêtée. Chargez ou créez une colonie pour reprendre.';
  if(graphicsFault||graphicsRecovering)return 'Recréez l’affichage avant de commander le groupe.';
  if(replacingWorld||session.busy)return 'Une opération de partie est en cours.';
  if(!snapshot||frontMenu.isOpen())return 'Ouvrez la colonie avant de commander le groupe.';
  if(waitingRequests.size)return [...waitingRequests.values()].join(' ');
  return undefined;
}
function refreshWorldPanels(world:World):void {
  const group=worldTab==='group';
  el('group-content').hidden=!group;el('individual-world-content').hidden=group;
  el('world-panel').classList.toggle('world-group-active',group);
  groupUI.setVisible(currentPanel==='world'&&group);
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-world-tab]')){
    const active=button.dataset.worldTab===worldTab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
  }
  if(group)groupUI.update(readGroupPanelSnapshot(world));else{scoutUI.update(world);commercialUI.update(world);}
}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-world-tab]')){
  button.addEventListener('click',()=>{worldTab=button.dataset.worldTab as WorldTab;if(snapshot)refreshWorldPanels(snapshot);});
  button.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();worldTab=event.key==='Home'?'group':event.key==='End'?'individual':worldTab==='group'?'individual':'group';
    if(snapshot)refreshWorldPanels(snapshot);el<HTMLButtonElement>(`world-tab-${worldTab}`).focus();
  });
}
let lastCommercialArrivalKey:string|undefined;
let currentCategory: ArchitectCategory = 'orders';
let placementOrientation: Orientation = 0;
let currentSpeed = 1, lastSpeed = 1, stepMs = 0;
let wallCutaway = false, foliageVisible = true, replacingWorld = false;
let simulationStopped = false, graphicsFault = false, graphicsRecovering = false;
let presentationPreparation: Promise<void> | undefined;
let graphicsMessage = '', incidentPanel: HTMLElement | undefined;
const waitingRequests = new Map<number, string>();
let renderer: ColonyRenderer | undefined;
const TEXTURE_PREFERENCE_KEY = 'lisiere.presentation.textures.v1';
const GROUND_GRASS_PREFERENCE_KEY = 'lisiere.presentation.ground-grass.v1';
const SOUND_ENABLED_PREFERENCE_KEY = 'lisiere.audio.effects.enabled.v1';
const SOUND_VOLUME_PREFERENCE_KEY = 'lisiere.audio.effects.volume.v1';
const MUSIC_ENABLED_PREFERENCE_KEY = 'lisiere.audio.music.enabled.v1';
const MUSIC_VOLUME_PREFERENCE_KEY = 'lisiere.audio.music.volume.v1';
let texturesEnabled = true;
let groundGrassEnabled = true;
let soundEnabled = true;
let soundVolume = 0.75;
let musicEnabled = true;
let musicVolume = 0.5;
let audioUnlockWarningShown = false;
try {
  texturesEnabled = localStorage.getItem(TEXTURE_PREFERENCE_KEY) !== 'false';
  groundGrassEnabled = localStorage.getItem(GROUND_GRASS_PREFERENCE_KEY) !== 'false';
  soundEnabled = localStorage.getItem(SOUND_ENABLED_PREFERENCE_KEY) !== 'false';
  const storedVolume = Number(localStorage.getItem(SOUND_VOLUME_PREFERENCE_KEY));
  if (localStorage.getItem(SOUND_VOLUME_PREFERENCE_KEY) !== null && Number.isFinite(storedVolume)) soundVolume = Math.max(0, Math.min(1, storedVolume));
  musicEnabled = localStorage.getItem(MUSIC_ENABLED_PREFERENCE_KEY) !== 'false';
  const storedMusicVolume = Number(localStorage.getItem(MUSIC_VOLUME_PREFERENCE_KEY));
  if (localStorage.getItem(MUSIC_VOLUME_PREFERENCE_KEY) !== null && Number.isFinite(storedMusicVolume)) musicVolume = Math.max(0, Math.min(1, storedMusicVolume));
} catch { /* The defaults remain active when browser storage is unavailable. */ }
audio.setVolume(soundVolume);
audio.setMuted(!soundEnabled);
music.setVolume(musicVolume);
music.setEnabled(musicEnabled);
music.setHidden(document.hidden);
audio.setHidden(document.hidden);
function unlockAudioFromGesture(): void {
  if (!soundEnabled || !audio.needsUnlock) return;
  void audio.unlock().then(() => { audioUnlockWarningShown = false; }).catch(error => {
    if (audioUnlockWarningShown) return;
    audioUnlockWarningShown = true;
    const assetFailure = error instanceof Error && (error.message.includes('MP3') || error.message.includes('Audio manifest'));
    notify(assetFailure ? 'Le chargement des bruitages a échoué. Ouvrez Options → Son et cliquez sur « Essayer le son » pour réessayer.' : 'Le navigateur a bloqué le son. Cliquez à nouveau dans le jeu ou réactivez les effets sonores.', true);
  });
}
function setSoundEnabled(enabled: boolean): boolean {
  soundEnabled = enabled;
  el<HTMLInputElement>('sound-enabled').checked = enabled;
  audio.setMuted(!enabled);
  if (enabled) {
    if (snapshot) { foliageAmbience.adopt(snapshot,true); syncAudioSources(snapshot); }
    unlockAudioFromGesture();
  }
  else audio.reset();
  try { localStorage.setItem(SOUND_ENABLED_PREFERENCE_KEY, String(enabled)); return true; }
  catch { return false; }
}
function setSoundVolume(volume: number): boolean {
  soundVolume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0.75));
  el<HTMLInputElement>('sound-volume').value = String(Math.round(soundVolume * 100));
  audio.setVolume(soundVolume);
  try { localStorage.setItem(SOUND_VOLUME_PREFERENCE_KEY, String(soundVolume)); return true; }
  catch { return false; }
}
function setMusicEnabled(enabled: boolean): boolean {
  musicEnabled = enabled;
  el<HTMLInputElement>('music-enabled').checked = enabled;
  music.setEnabled(enabled);
  try { localStorage.setItem(MUSIC_ENABLED_PREFERENCE_KEY, String(enabled)); return true; }
  catch { return false; }
}
function setMusicVolume(volume: number): boolean {
  musicVolume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0.5));
  el<HTMLInputElement>('music-volume').value = String(Math.round(musicVolume * 100));
  music.setVolume(musicVolume);
  try { localStorage.setItem(MUSIC_VOLUME_PREFERENCE_KEY, String(musicVolume)); return true; }
  catch { return false; }
}
function musicMood(world: World): MusicMood {
  if (world.pawns.some(pawn => (pawn.faction === 'outlaws' && !pawn.prisoner || prisonBreakActive(pawn)) && activeThreat(pawn))
    || world.wildlife?.animals.some(animal=>animal.manhunter&&animal.state!=='dead'&&animal.state!=='downed')) return 'tension';
  const hour = 24 * (calendarTick(world) % TICKS_PER_DAY) / TICKS_PER_DAY;
  return hour >= 6 && hour < 20 ? 'day' : 'night';
}
const textureToggle = el<HTMLInputElement>('textures-enabled');
textureToggle.checked = texturesEnabled;
function setTexturesEnabled(enabled: boolean): boolean {
  texturesEnabled = enabled;
  textureToggle.checked = enabled;
  renderer?.setTexturesEnabled(enabled);
  try { localStorage.setItem(TEXTURE_PREFERENCE_KEY, String(enabled)); return true; }
  catch { return false; }
}
const groundGrassToggle = el<HTMLInputElement>('ground-grass-enabled');
groundGrassToggle.checked = groundGrassEnabled;
function setGroundGrassEnabled(enabled: boolean): boolean {
  groundGrassEnabled = enabled;
  groundGrassToggle.checked = enabled;
  renderer?.setGroundGrassEnabled(enabled);
  try { localStorage.setItem(GROUND_GRASS_PREFERENCE_KEY, String(enabled)); return true; }
  catch { return false; }
}
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let pawnSignature = '';
const colonistButtons = new Map<number, HTMLButtonElement>();
const selection=new PawnSelection();
const roomInspection = new RoomInspection();
const orderMenu=new OrderMenu(client,notify);
const snapshotHud=new SnapshotHud(()=>renderState());
let latestMotion: PawnTrack[] | undefined;
let menuResumeSpeed: number | undefined;
let menuTransition: Promise<unknown> = Promise.resolve();
const shell = document.querySelector<HTMLElement>('.game-shell')!;
const inspectorSizeObserver=new ResizeObserver(()=>shell.style.setProperty('--hover-inspector-height',`${el('inspector').hidden?0:el('inspector').getBoundingClientRect().height}px`));
inspectorSizeObserver.observe(el('inspector'));
installVisualIdentity(document.querySelector<HTMLElement>('#app')!);
installTooltips(document.body);
installArchitectIcons(document.querySelector<HTMLElement>('#app')!);
// Suppress browser chrome without cancelling the game's own order-menu handler.
document.querySelector('#app')!.addEventListener('contextmenu', event => event.preventDefault());
const saveRepository = new BrowserSaveRepository(() => localStorage, () => globalThis.indexedDB,
  status => { if (status.message) notify(status.message, true); });
const session = new GameSession(client, saveRepository, prepareWorld, () => {
  simulationStopped = false; menuResumeSpeed = undefined; frontMenu.setHasGame(true);
  groupUI.resetForReplacement();
  if(snapshot){worldTab=snapshot.scout||snapshot.commercialTrip?'individual':snapshot.planet||snapshot.group?'group':'individual';refreshWorldPanels(snapshot);}
  updateIncident(); syncStorageButtons();
});
const frontHost = document.createElement('div'); document.querySelector('#app')!.append(frontHost);
// The measured counter remains visible over both the colony and the menu.
document.querySelector('#app')!.append(el('fps-counter'));
const frontMenu = createFrontMenu(frontHost, {
  getSaves: () => session.saves(),
  getTexturesEnabled: () => texturesEnabled,
  onTexturesEnabledChange: setTexturesEnabled,
  getGroundGrassEnabled: () => groundGrassEnabled,
  onGroundGrassEnabledChange: setGroundGrassEnabled,
  getSoundEnabled: () => soundEnabled,
  onSoundEnabledChange: setSoundEnabled,
  getSoundVolume: () => soundVolume,
  onSoundVolumeChange: setSoundVolume,
  onTestSound: () => audio.playPreview(),
  getMusicEnabled: () => musicEnabled,
  onMusicEnabledChange: setMusicEnabled,
  getMusicVolume: () => musicVolume,
  onMusicVolumeChange: setMusicVolume,
  onStart: async draft => replaceColony(() => session.create(draft.seed, draft.size, 'crashlanded',draft.site)),
  onLoad: async key => replaceColony(() => session.load(key)),
  getTestColonies: fetchTestColonies,
  onLoadTest: async save => replaceColony(() => session.loadExternal(() => readTestColony(save))),
  onImport: async file => replaceColony(() => session.loadExternal(() => readSaveFile(file))),
  onResume: async () => {
    if (simulationStopped || waitingRequests.size > 0) throw new Error('Chargez une colonie validée pour reprendre.');
    await prepareWorld();
    if (simulationStopped || waitingRequests.size > 0) throw new Error('Chargez une colonie validée pour reprendre.');
    frontMenu.hide(); syncStorageButtons();
    const speed = menuResumeSpeed ?? 0; menuResumeSpeed = undefined;
    await changeSpeed(speed);
  },
});
async function pauseForMenu(): Promise<void> {
  renderer?.cancelDesignation(); orderMenu.close();
  await menuTransition;
  if (snapshot && menuResumeSpeed === undefined) {
    const speed = currentSpeed;
    await client.setSpeed(0); menuResumeSpeed = speed;
  }
}
async function openFront(page: 'home' | 'create' | 'load'): Promise<void> {
  if (session.busy || replacingWorld) return;
  await pauseForMenu();
  frontMenu.setHasGame(session.hasWorld);
  if (page === 'create') frontMenu.showCreation();
  else if (page === 'load') frontMenu.showLoad();
  else frontMenu.showHome(session.hasWorld);
  setPanel(null); syncStorageButtons();
}
async function switchPanel(panel: Panel, preserveTool = false): Promise<void> {
  if (panel === 'menu') await pauseForMenu();
  setPanel(panel, preserveTool);
}
async function replaceColony(action: () => Promise<void>): Promise<void> {
  client.restartForReplacement();
  lastCommercialArrivalKey=undefined;
  replacingWorld = true; syncStorageButtons();
  try {
    await action(); menuResumeSpeed = undefined; updateIncident();
    if (simulationStopped) throw new Error('La simulation s’est arrêtée pendant la préparation de l’affichage. Chargez une colonie validée pour reprendre.');
    clearSelection(); setPanel(null); frontMenu.hide();
    if (snapshot?.pawns[0]) renderer?.focusPawn(snapshot.pawns[0].id);
  } finally { replacingWorld = false; syncStorageButtons(); }
}


function notify(message: string, error = false) {
  el('notice').textContent = message;
  el('notice').classList.toggle('error', error);
  el('notice').hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { el('notice').hidden = true; }, error ? 8000 : 4000);
}
async function attempt(action: () => Promise<unknown>) {
  try { await action(); } catch (error) { audio.playInterface('ui.reject'); notify(error instanceof Error ? error.message : String(error), true); }
}
const scheduleUI = createScheduleControls(el('schedule-panel'), command => attempt(async () => {
  await client.command(command); renderState();
}));
const foodPolicyUI = createFoodPolicyControls(el('assign-panel'), async command => {
  try { await client.command(command); renderState(); return null; }
  catch(error) {return error instanceof Error ? error.message : String(error);}
});
const apparelPolicyUI = createApparelPolicyControls(el('assign-panel'), async command => {
  try { await client.command(command); renderState(); return null; }
  catch(error) {return error instanceof Error ? error.message : String(error);}
});
const constructionUI = constructionControls(() => applyTool(currentTool));
function setCategory(category: ArchitectCategory) {
  currentCategory = category;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-category]')) button.classList.toggle('active', button.dataset.category === category);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tool-category]')) button.hidden = button.dataset.toolCategory !== category;
}
function selectedColonyIds():number[]{return snapshot?.pawns.filter(p=>selection.ids.has(p.id)&&isColonist(p)&&!p.prisoner).map(p=>p.id)??[];}
function renderWildlife(world:World){updateWildlifePanel(el('wildlife-content'),world,id=>selectPawn(id),()=>void attempt(async()=>{await client.command({type:'enable-wildlife'});renderState();}),[...selection.ids],id=>void attempt(async()=>{await client.command({type:'shoot',pawnIds:selectedColonyIds(),targetId:id});renderState();}),id=>void attempt(async()=>{await client.command({type:'melee',pawnIds:selectedColonyIds(),targetId:id});renderState();}),(id,enabled)=>void attempt(async()=>{await client.command({type:'hunt',animalId:id,enabled});renderState();}),(id,enabled)=>void attempt(async()=>{await client.command({type:'tame',animalId:id,enabled});renderState();}));}
function setPanel(panel: Panel, preserveTool = false) {
  dismissTooltip();
  // Every exit path (tabs, map, portraits and shortcuts) releases this pause.
  if (currentPanel === 'menu' && panel !== 'menu' && menuResumeSpeed !== undefined && !replacingWorld && !frontMenu.isOpen()) {
    const speed = menuResumeSpeed; menuResumeSpeed = undefined;
    menuTransition = client.setSpeed(speed);
    void attempt(() => menuTransition);
  }
  orderMenu.close();
  currentPanel = panel;
  syncStorageButtons();
  scheduleUI.cancel();
  for (const name of ['architect', 'work', 'schedule', 'assign', 'history', 'menu', 'research', 'wildlife', 'animals', 'world', 'quests'] as const) el(`${name}-panel`).hidden = panel !== name;
  groupUI.setVisible(panel==='world'&&worldTab==='group');
  if(panel==='world'&&snapshot)refreshWorldPanels(snapshot);
  if(panel==='animals'&&snapshot)updateAnimalsPanel(el('animals-content'),snapshot,id=>selectPawn(id));
  if(panel==='wildlife'&&snapshot)renderWildlife(snapshot);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel]:not(:disabled)')) {
    const active = button.dataset.panel === panel;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  if (panel === 'schedule' && snapshot) scheduleUI.update(snapshot);
  if (panel === 'assign' && snapshot) {foodPolicyUI.update(snapshot);apparelPolicyUI.update(snapshot);}
  if (panel === 'research' && snapshot) updateResearchPanel(el('research-content'),snapshot,c=>void attempt(()=>client.command(c)));
  el('inspector').hidden = panel !== null || (!selection.ids.size && !selectedCell);
  if (panel !== 'architect' && !preserveTool) applyTool('select');
  if (panel === null && snapshot) {
    const cell = selectedCell ?? snapshot.pawns.find(p => p.id === selectedPawn);
    if (cell) roomInspection.update(el('inspector'), snapshot, cell);
  }
  if (panel === 'work' && snapshot) updateWorkPanel(snapshot,carriedPatientsOf(snapshot));
}
function applyTool(tool: Tool) {
  shootingControls.cancel();
  if(tool!=='install'){installationId=undefined;renderer?.setFurniturePlacement(undefined);}
  currentTool = tool;
  syncToolCursor(el('viewport'), tool);
  renderer?.setFloorSelection(isBuildableFloor(tool)?tool:undefined);renderer?.setTool(isBuildableFloor(tool)?'lay-floor':tool);
  renderer?.setRoofAreasVisible(isRoofArea(tool));
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tool]')) {
    const active = button.dataset.tool === tool;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  el('tool-instruction').textContent = constructionUI.update(tool, toolDefinitions.find(item => item.id === tool)?.hint??'Choisissez le nouvel emplacement du meuble. Q/E : rotation. Échap : annuler.');
  renderer?.setConstructionMaterial(constructionUI.material(tool));
  el('placement-controls').hidden = !rotatableTools.has(tool);
  el('storage-options').hidden = tool !== 'stockpile';
}
function setTool(tool: Tool) {
  const definition = toolDefinitions.find(item => item.id === tool)!;
  setCategory(definition.category);
  setPanel('architect');
  applyTool(tool);
}
function selectPawn(id: number) {
  selectPawns({ids:[id],additive:false,toggle:false},true);
}
function updateMapHover(force=false):void {
  const readout=el('map-hover-readout');
  if(!snapshot||!hoveredCell){readout.hidden=true;readout.replaceChildren();lastHoverCopy='';updateMapCellDetails(true);return;}
  const now=performance.now();
  if(!force&&now-lastHoverReadAt<250)return;
  lastHoverReadAt=now;
  const lines=mapHoverLines(snapshot,hoveredCell,mapHoverLight.lightAt(snapshot,hoveredCell,now));
  const copy=lines.join('\n');
  if(copy!==lastHoverCopy){readout.replaceChildren(...lines.map(line=>{const span=document.createElement('span');span.textContent=line;return span;}));lastHoverCopy=copy;}
  readout.hidden=!lines.length;
  updateMapCellDetails(force);
}
function positionMapCellDetails():void {
  const panel=el('map-cell-details');if(panel.hidden)return;
  const bounds=shell.getBoundingClientRect();
  const x=mapPointerX-bounds.left,y=mapPointerY-bounds.top;
  panel.style.left=`${Math.max(8,Math.min(bounds.width-panel.offsetWidth-8,x+26))}px`;
  panel.style.top=`${Math.max(8,Math.min(bounds.height-panel.offsetHeight-8,y+26))}px`;
}
function updateMapCellDetails(force=false):void {
  const panel=el('map-cell-details');
  if(!altInspectorHeld||!snapshot||!hoveredCell||frontMenu.isOpen()||replacingWorld
    ||document.elementFromPoint(mapPointerX,mapPointerY)!==document.querySelector('#viewport canvas')){
    panel.hidden=true;lastAltCopy='';return;
  }
  const now=performance.now();if(!force&&now-lastAltReadAt<160)return;
  lastAltReadAt=now;
  const details=mapCellDetails(snapshot,hoveredCell,mapHoverLight.lightAt(snapshot,hoveredCell,now));
  if(!details){panel.hidden=true;lastAltCopy='';return;}
  const copy=JSON.stringify(details);
  if(copy!==lastAltCopy){
    const heading=document.createElement('div');heading.className='map-cell-detail-heading';heading.textContent=details.heading;
    const things=details.things.map(value=>{const node=document.createElement('div');node.className='map-cell-detail-thing';node.textContent=value;return node;});
    const rows=details.rows.map(({label,value})=>{const node=document.createElement('div');node.className='map-cell-detail-row';const name=document.createElement('span');name.textContent=label;const datum=document.createElement('strong');datum.textContent=value;node.append(name,datum);return node;});
    panel.replaceChildren(heading,...things,...rows);lastAltCopy=copy;
  }
  panel.hidden=false;positionMapCellDetails();
}
function selectPawns(gesture:SelectionGesture,focus=false) {
  if(!snapshot||replacingWorld||frontMenu.isOpen())return;
  shootingControls.cancel();
  selection.apply(gesture,new Set([...snapshot.pawns.map(p=>p.id),...(snapshot.wildlife?.animals??[]).map(a=>a.id),...(snapshot.mechanoids??[]).map(m=>m.id)]));
  selectedPawn=selection.single;selectedCell=undefined;
  selectedObject=undefined;renderer?.setSelectedObject(undefined);
  renderer?.setSelectedPawns(selection.ids);
  setPanel(null);
  if(focus&&selectedPawn!==undefined)renderer?.focusPawn(selectedPawn);
  rebuildInspector(); renderState();
}
function pickCell(x: number, z: number) {
  if (!snapshot || replacingWorld || frontMenu.isOpen()) return;
  if(shootingControls.active){
    const target=shootingControls.mode==='melee'?snapshot.structures.find(s=>isBarrier(s)&&s.x===x&&s.z===z):undefined;
    shootingControls.cancel();if(target)void attempt(async()=>{await client.command({type:'melee',pawnIds:selectedColonyIds(),targetId:target.id,structure:true});renderState();});else renderState();return;
  }
  if (currentTool !== 'select') {
    const tool = currentTool;
    void attempt(() => {
      if(isBuildableFloor(tool))return client.command({type:'area',action:'lay-floor',floor:tool,from:{x,z},to:{x,z}});
      if(tool==='remove-floor')return client.command({type:'area',action:'remove-floor',from:{x,z},to:{x,z}});
      if(tool==='install'){if(installationId===undefined)throw new Error('Sélectionnez un meuble à installer.');return client.command({type:'install',structureId:installationId,x,z,orientation:['sun-lamp','standing-lamp','small-sculpture','large-sculpture'].includes(furnitureObject(snapshot!,installationId)?.kind??'')?0:placementOrientation}).then(()=>{applyTool('select');setPanel(null);});}
      if (tool==='home'||tool==='remove-home'||isRoofArea(tool) || tool === 'haul-chunks' || tool === 'growing' || tool === 'remove-growing') return client.command({type:'area',action:tool,from:{x,z},to:{x,z}});
      if (tool === 'stockpile') return client.command({ type: 'stockpile', x, z, enabled: true, ...readStorageSettings('stockpile') });
      if (tool === 'remove-stockpile') return client.command({ type: 'stockpile', x, z, enabled: false });
      const objects = tool==='deconstruct'||tool==='uninstall' ? snapshot?.structures.filter(s=>footprintCells(s).some(c=>c.x===x&&c.z===z))??[] : [];
      const target = objects.find(s=>s.kind!=='power-conduit')??objects[0];
      return client.command(tool === 'cancel' ? { type: 'cancel', x, z } : { type: 'designate', kind: tool as JobKind, ...(target?{targetId:target.id}:{}), orientation: tool==='mini-turret'||tool==='sandbags'||tool==='solar-generator'||tool==='power-conduit'||tool==='power-switch'||tool==='wood-generator'||tool==='sun-lamp'||tool==='standing-lamp'||tool==='door'||tool==='autodoor'||tool==='passive-cooler'?0:placementOrientation, x, z, ...(constructionUI.material(tool) ? {material:constructionUI.material(tool)} : {}) });
    });
    return;
  }
  const cell={x,z},object=nextMapObject(snapshot,cell,selectedCell?.x===x&&selectedCell.z===z?selectedObject:undefined);
  if(!object){clearSelection();return;}
  selection.clear();renderer?.setSelectedPawns(selection.ids);
  selectedPawn = undefined; selectedCell = cell;selectedObject=object;renderer?.setSelectedObject(object);
  setPanel(null); rebuildInspector(); renderState();
}
function designateArea(action: AreaAction, from: Cell, to: Cell) {
  if (!snapshot || replacingWorld || frontMenu.isOpen()) return;
  void attempt(async () => {
    const response = await client.command({ type: 'area', action, from, to, ...(action==='lay-floor'&&isBuildableFloor(currentTool)?{floor:currentTool}:{}), ...(action === 'stockpile' ? readStorageSettings('stockpile') : {}) });
    const result = JSON.parse(response!) as { affected: number; skipped: number };
    const label = action==='lay-floor'||action==='remove-floor'?'ordre(s) de sol créé(s)':action==='home'||action==='remove-home'?'case(s) de foyer modifiée(s)':isRoofArea(action) ? 'case(s) de zone de toiture modifiée(s)' : action === 'growing' ? 'case(s) de culture créée(s)' : action === 'remove-growing' ? 'case(s) de culture retirée(s)' : action === 'cancel' ? 'ordre(s) annulé(s)' : action === 'remove-stockpile' ? 'case(s) de réserve retirée(s)' : action === 'stockpile' ? 'case(s) de réserve créée(s)' : 'ordre(s) de collecte créé(s)';
    notify(`${result.affected} ${label}${result.skipped ? ` · ${result.skipped} case(s) ignorée(s)` : ''}.`);
  });
}
function clearSelection() {
  selection.clear();renderer?.setSelectedPawns(selection.ids);orderMenu.close();
  selectedPawn = undefined; selectedCell = undefined;selectedObject=undefined;renderer?.setSelectedObject(undefined);
  rebuildInspector();renderState();
}
function readStorageSettings(prefix: string) {
  const capacity = Number(el<HTMLInputElement>(`${prefix}-capacity`).value);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > ITEM_DEFINITIONS.silver.stackLimit) throw new Error(`La capacité doit être un entier entre 1 et ${ITEM_DEFINITIONS.silver.stackLimit}.`);
  const conditions=readStorageConditionControls(el(`${prefix}-items`));
  return {
    filters: { 'mech-corpse':el<HTMLInputElement>(`${prefix}-mech-corpse`).checked, silver:el<HTMLInputElement>(`${prefix}-silver`).checked, corpse:el<HTMLInputElement>(`${prefix}-corpse`).checked, unfinished:el<HTMLInputElement>(`${prefix}-unfinished`).checked, textile:el<HTMLInputElement>(`${prefix}-textile`).checked, apparel:el<HTMLInputElement>(`${prefix}-apparel`).checked, weapon:el<HTMLInputElement>(`${prefix}-weapon`).checked, medicine:el<HTMLInputElement>(`${prefix}-medicine`).checked, neutroamine:el<HTMLInputElement>(`${prefix}-neutroamine`).checked, component: el<HTMLInputElement>(`${prefix}-component`).checked, 'advanced-component':el<HTMLInputElement>(`${prefix}-advanced-component`).checked, blocks: el<HTMLInputElement>(`${prefix}-blocks`).checked, steel: el<HTMLInputElement>(`${prefix}-steel`).checked, gold:el<HTMLInputElement>(`${prefix}-gold`).checked, plasteel:el<HTMLInputElement>(`${prefix}-plasteel`).checked, chunk: el<HTMLInputElement>(`${prefix}-chunk`).checked, wood: el<HTMLInputElement>(`${prefix}-wood`).checked, food: el<HTMLInputElement>(`${prefix}-food`).checked, furniture: el<HTMLInputElement>(`${prefix}-furniture`).checked },
    items:readStorageItemControls(el(`${prefix}-items`)),
    quality:conditions.quality,hitPoints:conditions.hitPoints,
    priority: Number(el<HTMLSelectElement>(`${prefix}-priority`).value), capacity,
  };
}
function rotatePlacement(direction = 1) {
  placementOrientation = ((placementOrientation + direction + 4) % 4) as Orientation;
  renderer?.setPlacementRotation(placementOrientation);
  el('placement-orientation').textContent = `${placementOrientation * 90}°`;
}
function rebuildInspector() {
  dismissTooltip();
  const panel = el('inspector');
  panel.hidden = currentPanel !== null || (!selection.ids.size && !selectedCell);
  panel.classList.remove('colonist-inspector-host','animal-inspector-host','mechanoid-inspector-host','cell-inspector-host');
  delete panel.dataset.colonistInspectorPawn;
  delete panel.dataset.colonistInspectorTab;
  delete panel.dataset.mechanoidId;
  if(selection.ids.size>1) {
    panel.innerHTML='<div class="panel-heading"><h2 id="group-title"></h2><button id="inspect-close" aria-label="Fermer l’inspection">×</button></div><div id="group-members"></div><p class="muted">Choisissez un individu pour consulter son dossier.</p>';
    for(const id of selection.ids) {
      const button=document.createElement('button');button.dataset.groupPawn=String(id);button.onclick=()=>selectPawn(id);el('group-members').append(button);
    }
  } else if(selectedPawn!==undefined&&snapshot?.wildlife?.animals.some(a=>a.id===selectedPawn)) {
    createAnimalInspector(panel,{onTame:(animalId,enabled)=>void attempt(async()=>{await client.command({type:'tame',animalId,enabled});renderState();}),onCarePolicy:(animalId,care)=>void attempt(async()=>{await client.command({type:'animal-care-policy',animalId,care});renderState();}),onHunt:(animalId,enabled)=>void attempt(async()=>{await client.command({type:'hunt',animalId,enabled});renderState();}),onClose:clearSelection});
  } else if(selectedPawn!==undefined&&snapshot?.mechanoids?.some(m=>m.id===selectedPawn)) {
    const current=()=>{const actor=snapshot?.mechanoids?.find(m=>m.id===selectedPawn);return snapshot&&actor?{world:snapshot,actor}:undefined;};
    createMechanoidInspector(panel,current,clearSelection);
  } else if (selectedPawn !== undefined && snapshot?.pawns.some(p=>p.id===selectedPawn)) {
    const inspected=snapshot.pawns.find(p=>p.id===selectedPawn)!;
    const managed=isColonist(inspected)&&!inspected.prisoner;
    const current=()=>{const pawn=snapshot?.pawns.find(p=>p.id===selectedPawn);return snapshot&&pawn?{world:snapshot,pawn}:undefined;};
    const send=(command:Command)=>void attempt(()=>client.command(command));
    panel.innerHTML = `<div class="panel-heading"><h2 id="selected-name"></h2><button id="selected-information" aria-label="Informations sur le personnage">i</button><button id="inspect-close" aria-label="Fermer l’inspection">×</button></div><p id="selected-action"></p>${pawnNeedsMarkup()}${managed?'<button class="secondary-action" id="manage-work">Gérer le travail</button>':''}`;
    el('selected-information').onclick=()=>{const state=current();if(!state)return;
      const pawn=state.pawn;
      openObjectInformation({title:pawn.name,description:actionLabel(pawn,carriedPatientsOf(state.world)),rows:[
        {category:'Passé',label:'Profil',value:backgroundSummary(pawn),description:'Enfance et activité adulte enregistrées. Bio présente leurs récits et effets initiaux.'},
        ...backgroundRestrictionRows(pawn).map(row=>({category:'Incapacités',label:row.label,value:'Indisponible',description:row.reason})),
        ...healthCapacityRows(pawn).map(row=>({...row,category:'Capacités',description:'Capacité actuelle du personnage. Les détails anatomiques et facteurs actifs se consultent dans Santé.'})),
        ...BACKGROUND_SKILL_IDS.flatMap(skill=>{const value=pawn.skills[skill];if(!value)return [];
          const refusal=backgroundSkillRefusal(pawn,skill);
          return [{category:'Compétences',label:BACKGROUND_SKILL_LABELS[skill],value:refusal?`Indisponible (niveau enregistré ${value.level} / 20)`:`${value.level} / 20`,description:refusal??'Niveau actuel. Bio expose l’expérience et les effets sur les travaux.'}];}),
      ]});};
    setTooltip(el('selected-information'),{title:'Informations',body:'Afficher les statistiques disponibles du personnage.'});
    createMoodInspection(panel);
    createSocialInspection(panel,renderState);
    createJournalInspection(panel);
    createSkillsInspection(panel);
    createEquipmentInspection(panel,current,send);
    createHealthInspection(panel,()=>current()?.pawn,send,managed,managed?{request:(pawnId,part)=>send({type:'surgery-request',pawnId,part}),cancel:pawnId=>send({type:'surgery-cancel',pawnId}),install:(pawnId,part,implant)=>send({type:'surgery-install',pawnId,part,implant})}:undefined);
    if(inspected.prisoner)createPrisonerInspection(panel,current,send);
    if(managed){
      el('manage-work').onclick = () => setPanel('work');
      const orders=document.createElement('p');orders.id='selected-orders';panel.append(orders);
      const cancel=document.createElement('button');cancel.id='clear-orders';cancel.textContent='Annuler les ordres directs';
      cancel.onclick=()=>{if(selectedPawn!==undefined)send({type:'clear-orders',pawnId:selectedPawn});};panel.append(cancel);
      setTooltip(el('manage-work'),{title:'Travail',body:'Ouvrir les priorités de travail de la colonie.'});
      setTooltip(cancel,{title:'Annuler les ordres',body:'Interrompre les ordres directs de ce colon et lui rendre son autonomie.'});
    }
  } else if (selectedCell) {
    panel.classList.add('cell-inspector-host');
    panel.innerHTML = `<div class="cell-summary"><div class="cell-card"><div class="panel-heading cell-heading"><span class="cell-illustration ui-icon" aria-hidden="true"></span><h2 id="cell-title"></h2><button id="inspect-close" aria-label="Fermer l’inspection">×</button></div><div id="cell-description"></div><p id="cell-materials"></p><p id="cell-job"></p></div><div class="cell-actions" role="group" aria-label="Commandes de l’objet"><button id="weapon-permission" class="secondary-action" hidden></button><button id="cell-chop" class="secondary-action" hidden>Couper du bois</button><button id="cell-harvest" class="secondary-action" hidden>Récolter</button><button id="cell-cut" class="secondary-action" hidden>Déraciner</button><button id="cell-deconstruct" class="secondary-action" hidden>Déconstruire</button><button id="cell-cancel" class="secondary-action" hidden>Annuler cet ordre</button></div></div><div id="cell-storage" hidden><p id="cell-storage-quantity"></p>${storageSettings('selected-stockpile')}<button id="update-stockpile" class="secondary-action">Appliquer les réglages</button><button id="delete-stockpile" class="secondary-action">Retirer cette réserve</button></div>`;
    const storage = selectedObject?.kind==='stockpile'?snapshot?.stockpiles.find(item => item.id===selectedObject!.id):undefined;
    mountStorageItemControls(el('selected-stockpile-items'),storage?.items);
    mountStorageConditionControls(el('selected-stockpile-items'),storage);
    if (storage) {
      el<HTMLInputElement>('selected-stockpile-silver').checked=storage.filters.silver??false;
      el<HTMLInputElement>('selected-stockpile-corpse').checked=storage.filters.corpse??false;
      el<HTMLInputElement>('selected-stockpile-mech-corpse').checked=storage.filters['mech-corpse']??false;
      el<HTMLInputElement>('selected-stockpile-unfinished').checked=storage.filters.unfinished??false;
      el<HTMLInputElement>('selected-stockpile-textile').checked = storage.filters.textile??false;
      el<HTMLInputElement>('selected-stockpile-wood').checked = storage.filters.wood;
      el<HTMLInputElement>('selected-stockpile-food').checked = storage.filters.food;
      el<HTMLInputElement>('selected-stockpile-furniture').checked = storage.filters.furniture??false;
      el<HTMLInputElement>('selected-stockpile-blocks').checked = storage.filters.blocks??false;
      el<HTMLInputElement>('selected-stockpile-apparel').checked=storage.filters.apparel??false;
      el<HTMLInputElement>('selected-stockpile-weapon').checked=storage.filters.weapon??false;
      el<HTMLInputElement>('selected-stockpile-medicine').checked=storage.filters.medicine??false;
      el<HTMLInputElement>('selected-stockpile-neutroamine').checked=storage.filters.neutroamine??false;
      el<HTMLInputElement>('selected-stockpile-component').checked = storage.filters.component??false;
      el<HTMLInputElement>('selected-stockpile-advanced-component').checked = storage.filters['advanced-component']??false;
      el<HTMLInputElement>('selected-stockpile-steel').checked = storage.filters.steel??false;
      el<HTMLInputElement>('selected-stockpile-gold').checked = storage.filters.gold??false;
      el<HTMLInputElement>('selected-stockpile-plasteel').checked = storage.filters.plasteel??false;
      el<HTMLInputElement>('selected-stockpile-chunk').checked = storage.filters.chunk??false;
      el<HTMLSelectElement>('selected-stockpile-priority').value = String(storage.priority);
      el<HTMLInputElement>('selected-stockpile-capacity').value = String(storage.capacity);
    }
    el('update-stockpile').onclick = () => { if (selectedCell) { const cell = { ...selectedCell }; void attempt(async () => { await client.command({ type: 'stockpile', ...cell, enabled: true, ...readStorageSettings('selected-stockpile') }); notify('Réserve mise à jour.'); }); } };
    el('delete-stockpile').onclick = () => { if (selectedCell) { const cell = { ...selectedCell }; void attempt(async () => { await client.command({ type: 'stockpile', ...cell, enabled: false }); rebuildInspector(); renderState(); }); } };
    el('cell-deconstruct').onclick=()=>{if(selectedCell)void attempt(()=>client.command({type:'designate',kind:'deconstruct',...selectedCell!}));};
    el('cell-cancel').onclick=()=>{if(selectedCell)void attempt(()=>client.command({type:'cancel',...selectedCell!}));};
    if(selectedObject?.kind==='structure'){
      const console=snapshot?.structures.find(s=>s.id===selectedObject!.id&&s.kind==='comms-console');
      if(console){const button=document.createElement('button');button.dataset.orbitalOpen=String(console.id);button.textContent='Appeler un vaisseau';button.onclick=()=>orbitalUI.open(console.id);panel.querySelector('.cell-actions')?.append(button);}
      doorControls(panel,()=>snapshot,()=>selectedCell,c=>void attempt(()=>client.command(c)));
      penControls(panel,()=>snapshot,()=>selectedCell,c=>void attempt(()=>client.command(c)));
      gatherSpotControls(panel,(structureId,enabled)=>attempt(async()=>{await client.command({type:'gather-spot',structureId,enabled});renderState();}));
      bedControls(panel,()=>snapshot,()=>selectedCell,c=>void attempt(()=>client.command(c)));
    }
    if(selectedObject?.kind==='structure'||selectedObject?.kind==='packed'){
      furnitureControls(panel,()=>snapshot,()=>selectedCell,()=>selectedObject?.id,c=>void attempt(()=>client.command(c)),id=>{const object=furnitureObject(snapshot!,id);if(!object)return;setPanel('architect');applyTool('install');installationId=id;placementOrientation=object.orientation;renderer?.setPlacementRotation(placementOrientation);renderer?.setFurniturePlacement(object);});
      panel.querySelector('.cell-actions')?.append(...panel.querySelectorAll('#cell-uninstall, #cell-install'));
    }
    const fire=selectedObject?.kind==='structure'?snapshot?.structures.find(s=>s.id===selectedObject!.id&&(stationRecipe(s)!==null||s.kind==='passive-cooler'||s.kind==='wood-generator')):undefined;
    if(fire) {
      const send=(command:Command)=>void attempt(async()=>{await client.command(command);rebuildInspector();renderState();});
      if(fire.fuel)panel.append(fireControls(fire,send));if(stationRecipe(fire))panel.append(billControls(fire,send));
    }
    const zone = selectedObject?.kind==='growing'?snapshot?.growingZones.find(z=>z.id===selectedObject!.id):selectedObject?.kind==='structure'?snapshot?.growingZones.find(z=>z.basinId===selectedObject!.id):undefined;
    if (zone) panel.append(growingControls(zone, command => void attempt(async () => { await client.command(command); rebuildInspector(); renderState(); })));
  } else panel.replaceChildren();
  if(selectedCell&&selectedObject){
    const heading=panel.querySelector('.cell-heading');
    if(heading){const info=document.createElement('button');info.id='cell-information';info.textContent='i';info.setAttribute('aria-label','Informations sur l’objet');
      info.onclick=()=>{if(!snapshot||!selectedObject)return;const pile=selectedObject.kind==='pile'?snapshot.piles.find(p=>p.id===selectedObject!.id):undefined;
        if(pile){openObjectInformation(itemInformation(pile));return;}
        const rows=[...panel.querySelectorAll<HTMLElement>('.cell-facts>p')].map(line=>({category:'Propriétés',label:line.querySelector('span')?.textContent?.replace(/\s*:\s*$/,'')??'État',value:line.querySelector('strong')?.textContent??line.textContent??'',description:line.textContent??''}));
        const health=panel.querySelector('.cell-health-caption strong');if(health)rows.unshift({category:'Propriétés',label:'Points de vie',value:health.textContent??'',description:'État réel de cet objet.'});
        openObjectInformation({title:panel.querySelector('#cell-title')?.textContent??'Objet',description:panel.querySelector('#cell-description')?.textContent??'',rows});};
      setTooltip(info,{title:'Informations',body:'Afficher les propriétés de cet objet et rechercher une statistique.'});heading.querySelector('#inspect-close')?.before(info);}
  }
  if(selection.ids.size&&snapshot?.pawns.some(p=>selection.ids.has(p.id)&&isColonist(p))){createDraftControls(panel,()=>snapshot?.pawns.filter(p=>selection.ids.has(p.id)&&isColonist(p)&&!p.prisoner)??[],c=>void attempt(async()=>{await client.command(c);renderState();}));shootingControls.create(panel,()=>snapshot?.pawns.filter(p=>selection.ids.has(p.id)&&isColonist(p)&&!p.prisoner)??[],()=>renderState());}
  const inspected = snapshot?.pawns.find(p => p.id === selectedPawn);
  if (inspected && selection.ids.size <= 1) {
    colonistInspector = colonistInspectorState(colonistInspector, inspected.id, !!inspected.prisoner);
    mountColonistInspector(panel, { ...colonistInspector, prisoner: !!inspected.prisoner, onTabChange: tab => {
      colonistInspector = { pawnId: inspected.id, activeTab: tab }; renderState();
    } });
  }
  const close = document.getElementById('inspect-close');
  if (close) close.onclick = clearSelection;
}
function carriedPatientsOf(world: World): ReadonlySet<number> {
  const patients = new Set<number>();
  for (const pawn of world.pawns) if (pawn.rescue?.phase === 'carry') patients.add(pawn.rescue.patientId);
  return patients;
}
function actionLabel(pawn: Pawn, carriedPatients: ReadonlySet<number>) {
  if(pawn.health?.foodPoisoning?.vomit&&pawn.state!=='dead')return 'Vomit';
  if(pawn.cleaning)return pawn.cleaning.phase==='clean'?'Nettoie':'Rejoint des traces à nettoyer';
  if(pawn.burial)return pawn.burial.phase==='bury'?'Inhume une dépouille':pawn.burial.phase==='carry'?'Transporte une dépouille vers une tombe':'Va chercher une dépouille';
  if(pawn.burning)return pawn.burning.phase==='panic'?'En feu · panique':'Éteint les flammes sur lui';
  if(pawn.firefighting)return pawn.firefighting.phase==='approach'?'Rejoint un incendie':'Éteint un incendie';
  if(prisonBreakActive(pawn))return pawn.melee?.strike?'Révolte · récupération après attaque':pawn.melee?'Révolte · force le passage':'Révolte · cherche à s’échapper';
  if(pawn.bombRefuge||pawn.prisoner)return queryPawnStatus(snapshot!,pawn).reason;
  if(pawn.mental?.crisis)return queryPawnStatus(snapshot!,pawn).reason;
  if(pawn.flee)return pawn.path.length||pawn.moveCooldown>0?'Fuit une menace':'Reste à couvert après la fuite';
  if(pawn.stun)return 'Étourdi';
  if(pawn.melee)return pawn.melee.strike?'Mêlée · récupération':pawn.path.length?'Mêlée · approche':'Mêlée · au contact';
  if(pawn.faction==='outlaws'&&pawn.tactics&&activeThreat(pawn)&&pawn.state==='moving')return 'Hors-la-loi · rejoint sa position de combat';
  if(pawn.faction==='outlaws'&&activeThreat(pawn))return pawn.shooting?.stance?.phase==='aim'?'Hors-la-loi · vise':pawn.shooting?'Hors-la-loi · récupération après tir':'Hors-la-loi · surveille les alentours';
  if(pawn.draft)return draftLabel(pawn);
  if(pawn.shooting)return pawn.shooting.stance?.phase==='cooldown'?'Récupération après tir':pawn.shooting.stance?.phase==='aim'?'Riposte · vise':'Riposte · rejoint sa position';
  if(pawn.equipmentTask)return ({equip:'Va équiper son arme',drop:'Dépose son arme',wear:pawn.state==='working'?'Enfile un vêtement':'Va chercher un vêtement',remove:'Retire un vêtement'})[pawn.equipmentTask.action];
  if(pawn.ward||pawn.prisoner||pawn.feed||pawn.tend||pawn.surgery||pawn.state==='resting'||pawn.rescue||carriedPatients.has(pawn.id))return queryPawnStatus(snapshot!,pawn).reason;
  if(pawn.state==='downed'||pawn.state==='dead')return stateLabels[pawn.state];
  if(pawn.interruptedCargo)return pawn.state==='sleeping'?'Se repose · cargaison à déposer':'Cargaison à déposer · sol proche encombré';
  if(pawn.animalHandling)return ({tame:'Apprivoisement',maintain:'Entretien de la familiarité',lead:'Conduit un animal vers son enclos',milk:'Trait un dromadaire',shear:'Tond un mufalo'})[pawn.animalHandling.kind];
  if(pawn.animalCare)return 'Soins vétérinaires';
  if(pawn.cooking)return queryPawnStatus(snapshot!,pawn).reason;
  if (pawn.need) return queryPawnStatus(snapshot!, pawn).reason;
  if(pawn.recreation.task)return queryPawnStatus(snapshot!,pawn).reason;
  if(pawn.orbitalTrade)return pawn.orbitalTrade.phase==='ready'?'Commerce orbital · au contact de la console':'Commerce orbital · rejoint la console';
  if(pawn.visitor)return pawn.visitor.phase==='leaving'?'Visiteur · quitte la carte':pawn.visitor.phase==='arriving'?'Visiteur · rejoint la colonie':pawn.visitor.role==='trader'?'Marchand · séjourne dans la colonie':'Visiteur · séjourne dans la colonie';
  if(pawn.haul?.destination.type==='fuel'||pawn.haul?.destination.type==='turret')return queryPawnStatus(snapshot!,pawn).reason;
  if (pawn.haul) {
    const destination = pawn.haul.destination.type === 'job' ? 'chantier' : pawn.haul.destination.type === 'aside' ? 'bord du champ' : 'réserve';
    const carried = snapshot?.piles.find(pile => pile.id === pawn.haul!.carryPileId);
    return pawn.haul.phase === 'pickup' ? `Prélèvement · ${pawn.haul.quantity} unités pour ${destination}`
      : `Livraison · ${carried?.quantity ?? pawn.haul.quantity} ${carried ? ITEM_DEFINITIONS[carried.item].label : 'unités'} → ${destination}`;
  }
  const job = snapshot?.jobs.find(item => item.id === pawn.jobId);
  return job ? `${stateLabels[pawn.state]} · ${jobLabels[job.kind].toLocaleLowerCase('fr')}` : stateLabels[pawn.state];
}
function rebuildPawns(world: World) {
  colonistButtons.clear();
  el('colonists').replaceChildren(...world.pawns.filter(isColonist).map((pawn, index) => {
    const button = document.createElement('button');
    button.className = 'colonist'; button.dataset.pawn = String(pawn.id);
    button.innerHTML = `<span class="portrait portrait-generated"><span class="portrait-head"></span><span class="portrait-body"></span><span class="portrait-vest"></span><span class="pawn-symbol"></span></span><strong></strong><span class="pawn-mood"><i></i></span>`;
    button.onclick = event => selectPawns({ids:[pawn.id],additive:event.shiftKey,toggle:event.shiftKey},!event.shiftKey);
    colonistButtons.set(pawn.id, button);
    return button;
  }));
  el('work-rows').replaceChildren(...world.pawns.filter(p=>isColonist(p)&&!p.prisoner).map(pawn => {
    const row = document.createElement('tr'); row.dataset.worker = String(pawn.id);
    const name = document.createElement('th'); name.scope = 'row'; name.textContent = pawn.name; row.append(name);
    for (const {id: work, label} of workColumns) {
      const cell = document.createElement('td'), select = document.createElement('select');
      select.dataset.work = work; select.dataset.owner = String(pawn.id);
      select.setAttribute('aria-label', `Priorité ${label} ${pawn.name}`);
      for (let value = 0; value <= 4; value++) { const option = document.createElement('option'); option.value = String(value); option.textContent = String(value); select.append(option); }
      select.onchange = () => { void attempt(async () => { try { await client.command({ type: 'priority', pawnId: pawn.id, work, value: Number(select.value) }); } finally { renderState(); } }); };
      cell.append(select); row.append(cell);
    }
    const activity = document.createElement('td'); activity.className = 'work-activity'; row.append(activity); return row;
  }));
}
function updateWorkPanel(world: World, carriedPatients: ReadonlySet<number>): void {
  for (const pawn of world.pawns.filter(isColonist)) {
    const row = document.querySelector<HTMLElement>(`[data-worker="${pawn.id}"]`);
    if (!row) continue;
    updateWorkSkills(row,pawn);
    row.querySelector('.work-activity')!.textContent = actionLabel(pawn, carriedPatients);
    for (const select of row.querySelectorAll<HTMLSelectElement>('select')) {
      const work=select.dataset.work as WorkType;select.value=String(pawn.priorities[work]);
      updateBackgroundWorkControl(select,pawn,work);
    }
  }
}
function renderState() {
  if (!snapshot) return;
  const world = snapshot;
  const colonists = world.pawns.filter(isColonist);
  const living = colonists.filter(pawn => pawn.state !== 'dead');
  const colonistIds = new Set(colonists.map(pawn => pawn.id));
  const selectedColonists = colonists.filter(pawn => selection.ids.has(pawn.id) && !pawn.prisoner);
  const carriedPatients = carriedPatientsOf(world);
  if(currentPanel==='animals')updateAnimalsPanel(el('animals-content'),world,id=>selectPawn(id));
  if(currentPanel==='wildlife')renderWildlife(world);
  if(currentPanel==='research')updateResearchPanel(el('research-content'),world,c=>void attempt(()=>client.command(c)));
  if(currentPanel==='world')refreshWorldPanels(world);
  if(world.commercialTrip?.phase==='at-post'){
    const t=world.commercialTrip,key=[world.seed,t.pawn.id,t.departedAt,t.arrivedAt].join(':');
    if(key!==lastCommercialArrivalKey){
      lastCommercialArrivalKey=key;
      worldTab='individual';
      if(currentSpeed!==0)void client.setSpeed(0);
      if(currentPanel!=='menu')setPanel('world');
    }
  }
  if(currentPanel==='schedule')scheduleUI.update(world);
  if(currentPanel==='assign'){foodPolicyUI.update(world);apparelPolicyUI.update(world);}
  const totals = {blocks:0,medicine:0,silver:0,component:0,cloth:0,steel:0,gold:0,plasteel:0,'advanced-component':0,carried:0,delivered:0};
  for (const pile of world.piles) {
    const owner = pile.owner;
    if (owner.type === 'job') totals.delivered += pile.quantity;
    const colony = owner.type === 'ground' || ('pawnId' in owner && colonistIds.has(owner.pawnId));
    if (!colony) continue;
    if (pile.kind === 'blocks') totals.blocks += pile.quantity;
    if (pile.kind === 'medicine') totals.medicine += pile.quantity;
    if (pile.item === 'silver') totals.silver += pile.quantity;
    if (pile.item === 'component') totals.component += pile.quantity;
    if (pile.item === 'cloth') totals.cloth += pile.quantity;
    if (pile.item === 'steel') totals.steel += pile.quantity;
    if (pile.item === 'gold' || pile.item === 'plasteel' || pile.item === 'advanced-component') totals[pile.item] += pile.quantity;
    if (owner.type === 'pawn') totals.carried += pile.quantity;
  }
  el('blocks').textContent=String(totals.blocks);
  el('medicine').textContent=String(totals.medicine);
  el('silver').textContent=String(totals.silver);
  el('component').textContent=String(totals.component);
  el('cloth').textContent=String(totals.cloth);el('cloth-stock').hidden=totals.cloth===0;
  el('steel').textContent=String(totals.steel);
  for(const item of ['gold','plasteel','advanced-component'] as const){el(item).textContent=String(totals[item]);el(`${item}-stock`).hidden=totals[item]===0;}
  el('wood').textContent = String(world.stock.wood); const nutrition = availableNutrition(world);el('food').textContent = nutrition.toFixed(1); updateFoodStocks(el('food-items'), world);
  const carried = totals.carried, delivered = totals.delivered;
  el('material-status').textContent = `${carried} portées · ${delivered} au chantier`;
  el('scenario-current').textContent=(world.scenario?SCENARIOS[world.scenario.id].label:'Partie historique · départ non renseigné')+(world.site?` · ${BIOME_LABELS[world.site.biome]} · ${HILLINESS_LABELS[world.site.hilliness]}`:'');
  el('biome-current').textContent=world.site?BIOME_LABELS[world.site.biome]:'Site historique';
  el('population').textContent = String(living.length); el('map-size').textContent = `${world.width} × ${world.height}`;
  el('outdoor-temperature').textContent = `Extérieur : ${outdoorTemperature(world).toFixed(1)} °C`;
  el('day').textContent = climateDateLabel(world);
  el('weather').textContent=[world.weather?WEATHER[perceivedWeather(world)].label:'',weatherConditionLabel(world)].filter(Boolean).join(' · ');
  const climateKey=world.climate?`${world.climate.adoptedAt}:${Math.floor(world.tick/TICKS_PER_DAY)}`:'historical';
  const climateRoot=el('climate-options');if(climateRoot.dataset.key!==climateKey){climateRoot.dataset.key=climateKey;climateRoot.replaceChildren(climateControls(world,c=>void attempt(()=>client.command(c))));}
  const hour = 24 * (calendarTick(world) % TICKS_PER_DAY) / TICKS_PER_DAY;
  el('clock').textContent = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;
  el('pause-banner').hidden = currentSpeed !== 0;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-speed]')) {
    const active = Number(button.dataset.speed) === currentSpeed;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  }
  const signature = JSON.stringify(colonists.map(pawn => [pawn.id, pawn.name, !!pawn.prisoner]));
  if (signature !== pawnSignature) { pawnSignature = signature; rebuildPawns(world); }
  const equipment=equipmentProjection(world),apparel=apparelProjection(world);
  for (const pawn of colonists) {
    const button = colonistButtons.get(pawn.id)!;
    button.classList.toggle('selected', selection.ids.has(pawn.id));button.dataset.drafted=String(!!pawn.draft);
    button.setAttribute('aria-pressed', String(selection.ids.has(pawn.id)));
    button.querySelector('strong')!.textContent = pawn.name; button.title = `${pawn.name} · ${actionLabel(pawn,carriedPatients)} · ${equipmentDescription(equipment.get(pawn.id),pawn)}`;button.dataset.equipment=equipment.get(pawn.id)?.item??'';
    const rawLook=apparelAppearance(apparel.get(pawn.id)),look={...rawLook,color:rawLook.color??pawnBaseColor(pawn.id)};button.dataset.apparel=look.signature;
    const portrait=button.querySelector<HTMLElement>('.portrait-head')!,url=portraitDataUrl(appearanceOf(pawn,world.seed),look,equipment.get(pawn.id)?.item,portraitExpressionOf(pawn),humanLimbVisualMask(pawn));
    if(portrait.dataset.source!==url){portrait.dataset.source=url;portrait.style.setProperty('--pawn-portrait',`url("${url}")`);}button.title+=` · ${look.description}`;
    (button.querySelector('.portrait-body') as HTMLElement).style.background=look.color!==undefined?`#${look.color.toString(16)}`:'';
    (button.querySelector('.portrait-vest') as HTMLElement).hidden=!look.vest;
    const symbol=button.querySelector<HTMLElement>('.pawn-symbol')!;
    const crisis=mentalCrisisView(world,pawn,s=>buildingLabels[s.kind]);
    symbol.textContent = pawn.state==='dead'?'†':pawn.state==='downed'?'!':crisis?crisis.symbol:pawn.state === 'sleeping' ? 'Z' : pawn.state === 'hungry' ? '!' : '';
    symbol.setAttribute('aria-label',crisis?`${crisis.label}${crisis.target?` · cible : ${crisis.target.label}`:''}`:'');
    button.dataset.mentalCrisis=crisis?.kind??'';
    symbol.dataset.state = pawn.state==='dead'?'dead':pawn.state==='sleeping'?'sleep':'';
    (button.querySelector('i') as HTMLElement).style.width = `${pawn.state==='dead'?0:pawn.mood}%`;
  }
  if (currentPanel === 'work') updateWorkPanel(world,carriedPatients);
  updateDraftControls(el('inspector'),selectedColonists);
  shootingControls.update(el('inspector'),selectedColonists);
  if(selection.ids.size>1) {
    el('group-title').textContent=`${selection.ids.size} individus sélectionnés`;
    for(const button of el('group-members').querySelectorAll<HTMLButtonElement>('button')) {
      const pawn=world.pawns.find(p=>p.id===Number(button.dataset.groupPawn));
      const animal=world.wildlife?.animals.find(a=>a.id===Number(button.dataset.groupPawn));
      const mech=world.mechanoids?.find(m=>m.id===Number(button.dataset.groupPawn));
      const mechView=mech?mechanoidView(world,mech):undefined;
      button.textContent=pawn?`${pawn.name} · ${actionLabel(pawn,carriedPatients)}`:animal?`${animalSpecies(animal.species).label} ${animal.id}`:mechView?`${mechView.label} · ${mechView.action}`:'Individu absent';
    }
  } else if (selectedPawn !== undefined) {
    const pawn = world.pawns.find(item => item.id === selectedPawn);
    if(pawn){const look=apparelAppearance(apparel.get(pawn.id));updatePawnAppearanceInspection(el('inspector'),world,pawn,{...look,color:look.color??pawnBaseColor(pawn.id)},equipment.get(pawn.id)?.item);}
    if (!pawn) {const actor=world.mechanoids?.find(m=>m.id===selectedPawn);if(actor)updateMechanoidInspector(el('inspector'),{world,actor});else if(!updateAnimalInspector(el('inspector'),world,selectedPawn))clearSelection();}
    else if(pawn.prisoner){
      el('selected-name').textContent=pawn.name;el('selected-action').textContent=actionLabel(pawn,carriedPatients);
      updatePrisonerInspection(el('inspector'),world,pawn);
    }
    else if(!isColonist(pawn)){el('selected-name').textContent=pawn.name;el('selected-action').textContent=actionLabel(pawn,carriedPatients);}
    else {
      el('selected-name').textContent = pawn.name; el('selected-action').textContent = actionLabel(pawn,carriedPatients);
      el('selected-orders').textContent=`${pawn.orders.active!==null?'Travail imposé · ':''}${pawn.orders.queue.length} ordre(s) en file${pawn.priorityWork?` · Priorité case ${pawn.priorityWork.cell.x}, ${pawn.priorityWork.cell.z}`:''}`;
      el<HTMLButtonElement>('clear-orders').disabled=pawn.orders.active===null&&!pawn.orders.queue.length&&!pawn.priorityWork;
    }
    if(pawn){
      updatePawnInspection(el('inspector'),world,pawn,c=>void attempt(()=>client.command(c)));
      updateEquipmentInspection(el('inspector'),world,pawn);updateSkillsInspection(el('inspector'),pawn,world);updateHealthInspection(el('inspector'),pawn,world);
      updateRecreationInspection(el('inspector'),pawn,world);
      roomInspection.update(el('inspector'), world, pawn);
      updateMoodInspection(el('inspector'),world,pawn);
      updateSocialInspection(el('inspector'),world,pawn);
      updateJournalInspection(el('inspector'),world,pawn);
      setTooltip(el('selected-action'),{title:'Activité',body:queryPawnStatus(world,pawn).reason});
    }
  } else if (selectedCell) {
    const { x, z } = selectedCell;
    if (x >= world.width || z >= world.height || !selectedObject || !mapObjectExists(world,selectedObject)) clearSelection();
    else {
      const resource = selectedObject.kind==='resource'?world.resources.find(item=>item.id===selectedObject!.id):undefined;
      const structure = selectedObject.kind==='structure'?world.structures.find(item=>item.id===selectedObject!.id):undefined;
      const job = selectedObject.kind==='job'?world.jobs.find(item=>item.id===selectedObject!.id):structure||selectedObject.kind==='packed'?world.jobs.find(item=>item.furniture?.structureId===selectedObject!.id):undefined;
      const storage = selectedObject.kind==='stockpile'?world.stockpiles.find(item=>item.id===selectedObject!.id):undefined;
      const pile = selectedObject.kind==='pile'?world.piles.find(item=>item.id===selectedObject!.id):undefined;
      const piles = pile?[pile]:[];
      const packed=selectedObject.kind==='packed'?world.packed.find(p=>p.building.id===selectedObject!.id&&p.owner.type==='ground'):undefined;
      if(structure||packed)updateFurnitureControls(el('inspector'),world,selectedCell,selectedObject.id);
      updateGatherSpotControls(el('inspector'),structure);
      if(structure){updateDoorControls(el('inspector'),world,selectedCell);updatePenControls(el('inspector'),world,selectedCell);roomInspection.update(el('inspector'), world, selectedCell);}
      const zone=selectedObject.kind==='growing'?world.growingZones.find(z=>z.id===selectedObject!.id):undefined;
      el('cell-title').textContent = packed ? `Meuble emballé · ${buildingLabels[packed.building.kind]}` : pile ? ITEM_DEFINITIONS[pile.item].label : structure ? buildingLabels[structure.kind] : resource ? (floraDefinition(resource)?.label??resourceLabels[resource.kind]) : job ? `${job.construction==='blueprint'?'Plan · ':job.construction==='frame'?'Cadre · ':''}${jobLabels[job.kind]}` : zone ? 'Zone de culture' : storage ? 'Réserve' : 'Massif rocheux';
      let cellDescription = resource ? (isPlant(resource)||resource.kind==='tree') ? plantInspection(world,resource) : `Quantité : ${resource.amount}` : pile ? `Quantité : ${pile.quantity}${pile.kind==='food'?` · ${foodFreshnessLabel(pile,world.tick)}`:pile.kind==='corpse'?` · ${{fresh:'Fraîche',rotting:'Pourrie (impropre à la boucherie)',desiccated:'Desséchée'}[corpseStage(pile,world.tick)]}`:''}` : structure ? `${structureFootprintLabel(structure)} cases` : job ? queryJobStatus(world,job).reason??'' : zone ? `Culture : ${PLANT_DEFINITIONS[zone.plant].label} · ${zone.cells.length} cases${growingTemperatureInspection(world,selectedCell)}` : storage ? `Capacité : ${storage.capacity}` : '';
      let cellHealth:CellHealth|undefined;
      const inspectedBuilding=packed?.building??structure;
      if(inspectedBuilding){
        const maximum=structureMaxHp(inspectedBuilding),current=maximum-(inspectedBuilding.damage??0);
        if(maximum>0)cellHealth={current,maximum,label:'Résistance',valueText:`${current}/${maximum} PV`};
      }
      if(resource&&(isPlant(resource)||resource.kind==='tree')){
        const maximum=resourceMaxHp(resource);
        cellHealth={current:maximum-(resource.damage??0),maximum,label:'État'};
        cellDescription=cellDescription.replace(/ · État \d+\/\d+/, '');
      }
      if(structure?.kind==='sandbags')cellDescription+=' · Couvert 55 % (selon la direction du tir) · Traversée ralentie, sans arrêt sur cette case';
      if(structure&&isBarrier(structure)){
        const current=barrierHp(structure),maximum=barrierMaxHp(structure);
        cellHealth={current,maximum,label:'Résistance',valueText:`${current}/${maximum} PV`};
        cellDescription+=` · ${world.home?.includes(z*world.width+x)?'Zone de foyer':'Hors zone de foyer (réparation désactivée)'}`;
      }
      const building = packed?.building ?? structure;
      if (building && building.kind !== 'grave' && building.kind !== 'butcher-spot' && building.kind !== 'crafting-spot' && building.kind !== 'campfire' && building.kind !== 'passive-cooler') el('cell-title').textContent += ` · ${ITEM_DEFINITIONS[building.material ?? 'wood'].label}${building.material === undefined ? ' (ancien)' : ''}`;
      const rock = selectedObject.kind==='rock'||resource?.kind==='rock'?rockInspection(world.tiles[z * world.width + x]!, resource):null;
      if (rock) {
        el('cell-title').textContent = rock.title; cellDescription = rock.description;
        if(selectedObject.kind==='rock'){
          const tile=world.tiles[z*world.width+x]!,maximum=rockMaxHP(tile);
          cellHealth={current:maximum-(tile.miningDamage??0),maximum,label:'Résistance'};
          cellDescription=cellDescription.replace(/^(?:Roche : )?\d+ \/ \d+ PV\. ?/, '');
        }
      }
      const weapon=piles.find(p=>p.kind==='weapon'||p.kind==='apparel'),permission=el<HTMLButtonElement>('weapon-permission');permission.hidden=!weapon;
      if(weapon){const forbidden=!!(weapon.weapon??weapon.apparel)?.forbidden;permission.textContent=forbidden?'Autoriser cet objet':'Interdire cet objet';permission.onclick=()=>void attempt(()=>client.command({type:weapon.kind==='apparel'?'apparel-permission':'weapon-permission',itemId:weapon.id,allowed:forbidden}));}
      const plantOrder=(kind:'chop'|'harvest'|'cut')=>{if(resource)void attempt(()=>client.command({type:'designate',kind,x:resource.x,z:resource.z}));};
      const chop=el<HTMLButtonElement>('cell-chop'),harvest=el<HTMLButtonElement>('cell-harvest'),cut=el<HTMLButtonElement>('cell-cut');
      chop.hidden=!resource||!choppable(world,resource);harvest.hidden=!resource||!harvestable(world,resource);cut.hidden=!resource||!isPlant(resource);
      cut.textContent=resource?.blight?'Couper ce plant malade':resource?.kind==='tree'?'Déraciner':'Couper les plantes';
      let cutBlight=el('inspector').querySelector<HTMLButtonElement>('#cell-cut-blighted');
      if(!cutBlight){cutBlight=document.createElement('button');cutBlight.id='cell-cut-blighted';cutBlight.className='secondary-action';cutBlight.textContent='Couper tous les plants malades';cut.after(cutBlight);}
      cutBlight.hidden=!resource?.blight;
      cutBlight.onclick=()=>void attempt(()=>client.command({type:'cut-blighted-crops'}));
      chop.onclick=()=>plantOrder('chop');harvest.onclick=()=>plantOrder('harvest');cut.onclick=()=>plantOrder('cut');
      el('cell-materials').textContent = '';
      updateUnfinishedInspection(el('inspector'),world,pile?.unfinished||pile?.gunWork||pile?.artWork||pile?.flakWork||pile?.componentWork?pile:undefined,c=>void attempt(()=>client.command(c)));
      el('cell-job').textContent = job ? `${queryJobStatus(world, job).reason ?? 'En cours'}${constructionDeliveryLabel(world,job) ? ` · Livré : ${constructionDeliveryLabel(world,job)}` : ''}` : '';
      if(structure&&isBedKind(structure.kind))cellDescription += ` · Efficacité du repos : ${Math.round(bedRestEffectiveness(structure)*100)} % · Immunité : ${Math.round(bedImmunityFactor(structure,world)*100)} % · Soins : +${Math.round(bedTendOffset(structure,world)*100)} % · Chirurgie : ×${bedSurgeryFactor(structure,world).toLocaleString('fr-FR')} · Guérison du lit : +${bedHealPerDay(structure)} PV/jour Core`;
      if(structure)cellDescription+=vitalsMonitorInspection(world,structure);
      updateCoolerControls(el('inspector'),world,structure,c=>void attempt(()=>client.command(c)));
      if(structure?.power)cellDescription+=powerInspection(world,structure,true);
      if(structure)updatePowerControls(el('inspector'), world, selectedCell, c=>void attempt(()=>client.command(c)));
      if(structure?.kind==='butcher-table')cellDescription+=' · Boucherie : rendement du poste 100 %, compétence Cuisine';
      if(structure?.kind==='butcher-spot')cellDescription+=' · Boucherie : rendement du poste 70 %, compétence Cuisine';
      if(building?.art)cellDescription+=` · Qualité : ${QUALITY_LABELS[building.quality??'normal']} · Beauté une fois posée : ${structureBeauty(building).toLocaleString('fr-FR')} · Auteur : ${world.pawns.find(p=>p.id===building.art!.authorId)?.name??'inconnu'} · Sculpté au jour ${Math.floor(building.art.createdAt/6000)+1}.`;
      if(structure?.kind==='crafting-spot')cellDescription+=' · Gratuit · 60 tissus → tenue tribale · vitesse de poste 50 % · Artisanat.';
      if(structure?.kind==='stonecutter')cellDescription += ' · 1 fragment → 20 blocs · Artisanat.';
      if(structure?.kind==='horseshoes')cellDescription += ` · Dextérité · ${world.pawns.filter(p=>p.recreation.task?.buildingId===structure.id).length}/3 joueurs · places à 5 cases, ligne de vue dégagée.`;
      if(structure?.kind==='tube-television')cellDescription+=televisionInspection(world,structure);
      let inspectionIcon:UiIcon=structure||packed?'home':rock||storage?'blocks':zone||resource?'leaf':'layers';
      if(pile){
        inspectionIcon=pile.item==='simple-meal'||pile.item==='fine-meal'||pile.item==='vegetarian-fine-meal'||pile.item==='carnivore-fine-meal'||pile.item==='lavish-meal'||pile.item==='vegetarian-lavish-meal'||pile.item==='carnivore-lavish-meal'||pile.item==='survival-meal'?'meal'
          :pile.kind==='food'?'food':pile.kind==='medicine'?'medicine'
          :pile.kind==='wood'?'wood':pile.kind==='steel'?'steel'
          :pile.kind==='component'||pile.kind==='advanced-component'?'component'
          :pile.kind==='silver'?'silver':pile.kind==='chunk'||pile.kind==='blocks'?'blocks':'layers';
      }
      presentCellDescription(el('inspector'), cellDescription, inspectionIcon, cellHealth);
      if(structure?.fuel)updateFireControls(el('inspector'),structure);
      updateMiniTurretControls(el('inspector'),world,structure,c=>void attempt(async()=>{await client.command(c);renderState();}));
      if(structure&&stationRecipe(structure))updateBillControls(el('inspector'),structure,world);
      el('cell-deconstruct').hidden=!structure||!!job&&job.kind!=='repair'&&job.kind!=='fix-breakdown'&&job.kind!=='flick';
      el('cell-deconstruct').onclick=()=>{if(structure)void attempt(()=>client.command({type:'designate',kind:'deconstruct',targetId:structure.id,x:structure.x,z:structure.z}));};
      // The coordinate command must resolve to the intent shown in this inspector.
      const cancelTarget=job&&(world.jobs.find(item=>footprintCells(item).some(cell=>cell.x===x&&cell.z===z))??furnitureIntentAt(world,selectedCell));
      el('cell-cancel').hidden=!job||job.kind==='repair'||job.kind==='fix-breakdown'||cancelTarget?.id!==job.id||selectedObject.kind!=='job'&&job.furniture?.structureId!==selectedObject.id;
      el('cell-storage').hidden = !storage;
      if(structure)updateBedControls(el('inspector'),world,structure);
      if (storage) {
        const stored=world.piles.filter(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z).reduce((sum,p)=>sum+p.quantity,0);
        const furniture=world.packed.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z)?1:0;
        el('cell-storage-quantity').textContent = `Réserve · ${stored+furniture} / ${storage.capacity} unités`;
      }
    }
  }
  if(currentPanel===null){const target=selectedPawn===undefined?selectedObject?.kind==='pile'&&world.piles.some(p=>p.id===selectedObject!.id&&p.humanCorpse)||selectedObject?.kind==='structure'&&world.structures.some(s=>s.id===selectedObject!.id&&s.kind==='grave')?selectedCell:undefined:world.pawns.find(p=>p.id===selectedPawn);
    updateBurialControls(el('inspector'),world,target,c=>void attempt(()=>client.command(c)));
    updateHygieneControls(el('inspector'),world,selectedPawn===undefined?undefined:target,c=>void attempt(()=>client.command(c)));}
  if (colonistInspector && selectedPawn !== undefined && el('inspector').classList.contains('colonist-inspector-host')) {
    const pawn = world.pawns.find(p => p.id === selectedPawn);
    if (pawn) { colonistInspector = colonistInspectorState(colonistInspector, pawn.id, !!pawn.prisoner); updateColonistInspector(el('inspector'), colonistInspector, !!pawn.prisoner); }
  }
  const pending = world.jobs.filter(job => job.status === 'pending').length;
  el('job-count').textContent = world.jobs.length ? `${world.jobs.length} ordre(s) · ${pending} en attente` : 'Aucun ordre en cours';
  const entries = world.events.slice(-30).reverse();
  const historySignature=JSON.stringify(entries.map(entry=>[entry.tick,entry.message]));
  if(historySignature!==lastColonyHistorySignature){
    lastColonyHistorySignature=historySignature;
    el('journal-items').replaceChildren(...entries.map(entry => {
      const item = document.createElement('p'), time = document.createElement('span'); time.className = 'event-time';
      time.textContent = `J${1 + Math.floor(entry.tick / TICKS_PER_DAY)} · `;
      item.append(time, document.createTextNode(entry.message)); return item;
    }));
    if (!entries.length) el('journal-items').textContent = 'Trois survivants. Une nouvelle histoire.';
  }
  const alerts: string[] = [];
  let sadWanderers=0,foodBingers=0;
  for(const pawn of living){if(pawn.mental?.crisis?.kind==='sad-wander')sadWanderers++;else if(pawn.mental?.crisis?.kind==='food-binge')foodBingers++;}
  if(sadWanderers)alerts.push(`${sadWanderers} colon(s) en errance triste`);
  if(foodBingers)alerts.push(`${foodBingers} colon(s) en frénésie alimentaire`);
  const aggressiveCrises=living.filter(p=>p.mental?.crisis&&['tantrum','berserk','murderous-rage'].includes(p.mental.crisis.kind));
  for(const pawn of aggressiveCrises){
    const crisis=mentalCrisisView(world,pawn,s=>buildingLabels[s.kind])!;
    alerts.push(`${pawn.name} · ${crisis.label}${crisis.target?` · cible : ${crisis.target.label}${crisis.target.type==='structure'?` (${crisis.target.cell.x}, ${crisis.target.cell.z})`:''}`:''}`);
  }
  const enemy=world.pawns.find(p=>p.faction==='outlaws'&&!p.prisoner&&activeThreat(p));
  const rebels=world.pawns.filter(p=>prisonBreakActive(p)&&activeThreat(p));
  if(rebels.length)alerts.push(`Révolte de prison · ${rebels.length} détenu${rebels.length>1?'s':''} en fuite`);
  const mechanicalThreats=world.mechanoids?.filter(m=>m.state!=='dead'&&m.state!=='downed')??[];
  if(mechanicalThreats.length)alerts.push(`${mechanicalThreats.length} machine(s) hostiles${world.raids?.mechActive?.phase==='staging'?' · regroupement avant assaut':world.raids?.mechActive?.phase==='assault'?' · assaut mécanique':''}`);
  for(const structure of world.structures)if(structure.turret?.wick){
    const view=miniTurretView(world,structure)!;alerts.push(`Mini-tourelle (${structure.x}, ${structure.z}) · mèche engagée · danger 3,9 · ${turretSeconds(view.wick!.remainingCore)}`);
  }
  const enraged=world.wildlife?.animals.filter(animal=>animal.manhunter&&animal.state!=='dead'&&animal.state!=='downed')??[];
  if(enraged.length)alerts.push(`${enraged.length} ${enraged.length>1?'animaux':'animal'} en rage`);
  const fires=world.fires?.items??[],fireAlert=el<HTMLButtonElement>('inspect-fire');fireAlert.hidden=!fires.length;fireAlert.textContent=`Incendie · ${fires.length} foyer${fires.length>1?'s':''} · voir`;fireAlert.onclick=()=>{const cell=firePosition(world,fires[0]!);if(cell){applyTool('select');pickCell(cell.x,cell.z);renderer?.focusCell(cell);}};
  const blighted=world.resources.filter(p=>!!p.blight),blightAlert=el<HTMLButtonElement>('inspect-blight');
  blightAlert.hidden=!blighted.length;blightAlert.textContent=`Fléau des cultures · ${blighted.length} plant(s) · voir`;
  blightAlert.onclick=()=>{const plant=blighted[0];if(plant){applyTool('select');pickCell(plant.x,plant.z);renderer?.focusCell(plant);}};
  const threatButton=el<HTMLButtonElement>('inspect-threat'),mentalThreat=aggressiveCrises[0],threat=enemy??rebels[0]??mechanicalThreats[0]??mentalThreat??enraged[0];threatButton.hidden=!threat;if(threat){threatButton.textContent=enemy?'Menace armée · voir':rebels.length?'Révolte de prison · voir':mechanicalThreats.length?'Menace mécanique · voir':mentalThreat?`${mentalCrisisView(world,mentalThreat)!.label} · voir`:'Animal en rage · voir';threatButton.onclick=()=>selectPawn(threat.id);}
  const downed=living.filter(p=>p.state==='downed').length,bleeding=living.filter(p=>p.health&&medicalBleed(p.health)>=.1).length,deaths=colonists.length-living.length;
  const starving=living.filter(p=>(p.health?.malnutrition??0)>0).length;if(starving)alerts.push(`${starving} colon(s) en malnutrition`);
  const chilled=living.filter(p=>(p.health?.hypothermia??0)>=40000000).length;if(chilled)alerts.push(`${chilled} colon(s) en hypothermie`);
  let infected=0,critical=0,gripped=0,extremeFlu=0;
  const immuneCases={malaria:0,plague:0},immuneCritical={malaria:0,plague:0};
  for(const pawn of living){
    const health=pawn.health;
    if(health?.infections?.cases.length){
      infected++;
      if(health.infections.immunity<INFECTION_UNIT&&health.infections.cases.some(c=>['extreme','critical'].includes(infectionStage(c.severity))))critical++;
    }
    const flu=health?.flu;
    if(flu?.severity){gripped++;if(flu.immunity<FLU_UNIT&&fluStage(flu.severity)==='extreme')extremeFlu++;}
    for(const kind of IMMUNE_DISEASE_KINDS){const disease=health?.immuneDiseases?.[kind];if(disease?.severity){immuneCases[kind]++;if(disease.immunity<IMMUNE_DISEASE_UNIT&&['extreme','critical'].includes(immuneDiseaseStage(kind,disease.severity)))immuneCritical[kind]++;}}
  }
  if(critical)alerts.push(`Urgence médicale : ${critical} colon(s) avec une infection grave`);
  if(infected)alerts.push(`${infected} colon(s) avec une infection · consulter Santé`);
  if(extremeFlu)alerts.push(`Urgence médicale : ${extremeFlu} colon(s) avec une grippe extrême`);
  if(gripped)alerts.push(`${gripped} colon(s) grippé(s) · consulter Santé`);
  for(const kind of IMMUNE_DISEASE_KINDS){const label=kind==='malaria'?'paludisme':'peste';if(immuneCritical[kind])alerts.push(`Urgence médicale : ${immuneCritical[kind]} colon(s) avec ${label} grave`);if(immuneCases[kind])alerts.push(`${immuneCases[kind]} colon(s) avec ${label} · consulter Santé`);}
  if(downed)alerts.push(`${downed} colon(s) à terre`);
  if(bleeding)alerts.push(`${bleeding} colon(s) saignent`);
  if(deaths)alerts.push(`${deaths} colon(s) décédé(s)`);
  if (nutrition < living.length * 1.6) alerts.push('Réserves de nourriture faibles');
  const hungry = living.filter(pawn => pawn.hunger < 25).length;
  if (hungry) alerts.push(`${hungry} colon(s) affamé(s)`);
  if (pending) alerts.push(`${pending} ordre(s) en attente`);
  if (!world.stockpiles.length) alerts.push('Aucune réserve de stockage');
  if (world.jobs.some(job => constructionRecipe(job).ingredients.length > 0) && world.pawns.every(pawn => pawn.priorities.haul === 0&&pawn.priorities.build === 0)) alerts.push('Construction/transport désactivés : chantiers non approvisionnés');
  const interrupted=world.pawns.filter(pawn=>pawn.interruptedCargo).length;
  if(interrupted)alerts.push(`${interrupted} cargaison(s) conservée(s) : fin de déplacement ou sol proche à libérer`);
  const idle = world.pawns.filter(pawn => isColonist(pawn)&&!pawn.prisoner&&pawn.state === 'idle'&&!pawn.draft&&!pawn.flee&&!pawn.mental?.crisis&&!pawn.interruptedCargo).length;
  if (idle) alerts.push(`${idle} colon(s) disponible(s)`);
  const beds = world.structures.filter(structure => isBedKind(structure.kind)&&!structure.medical&&!structure.prisoner).length;
  const alertRows=alerts.map(text=>({text,kind:''}));
  if (beds < living.length) alertRows.push({text:`${living.length - beds} couchage(s) manquant(s)`,kind:'beds'});
  const prisoners=world.pawns.filter(p=>p.prisoner&&p.state!=='dead');
  if(prisoners.length)alertRows.push({text:`${prisoners.length} prisonnier(s) · ${living.some(p=>p.priorities.warden>0)?'Geôlier activé':'Geôlier désactivé'}`,kind:'prisoners'});
  const alertSignature=JSON.stringify(alertRows);
  if(alertSignature!==lastStatusAlertsSignature){
    lastStatusAlertsSignature=alertSignature;
    el('status-alerts').replaceChildren(...alertRows.map(row=>{const item=document.createElement('p');item.textContent=row.text;if(row.kind)item.dataset.alert=row.kind;return item;}));
  }
  economyUI.update(world);arrivalUI.update(world);questUI.update(world);raidUI.update(world);heatwaveUI.update(world);flashstormUI.update(world);solarFlareUI.update(world);weatherConditionUI.update(world);shortCircuitUI.update(world);tradeUI.update(world);orbitalUI.update(world);
}
const heatwaveUI=createHeatwaveUI(command=>client.command(command));
const flashstormUI=createFlashstormUI();
const solarFlareUI=createSolarFlareUI();
const weatherConditionUI=createWeatherConditionUI();
const shortCircuitUI=createShortCircuitUI();
const economyUI=createColonyEconomyUI(el('colony-economy'),command=>client.command(command));
const raidUI=createRaidUI(command=>client.command(command),id=>renderer?.focusPawn(id));
const orbitalUI=createOrbitalTradeUI(command=>client.command(command),()=>client.setSpeed(0),id=>{const console=snapshot?.structures.find(s=>s.id===id);if(console)renderer?.focusCell(console);},async()=>{if(currentSpeed===0)await client.setSpeed(1);});
const tradeUI=createTradeUI(command=>client.command(command),()=>client.setSpeed(0),id=>renderer?.focusPawn(id),async()=>{if(currentSpeed===0)await client.setSpeed(1);});
const arrivalUI=createArrivalUI(command=>client.command(command));
const questUI=createQuestUI(command=>client.command(command));
function syncStorageButtons() {
  groupUI.setHostBlocked(groupCommandsBlocked());
  shell.inert = replacingWorld || frontMenu.isOpen() || !snapshot || simulationStopped || graphicsFault || waitingRequests.size > 0;
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-speed]'))button.disabled=replacingWorld||currentPanel==='menu';
  for (const [id, key] of [['load', SAVE_KEY], ['restore-previous', PREVIOUS_KEY]]) {
    try { el<HTMLButtonElement>(id).disabled = replacingWorld || session.busy || !saveRepository.peekItem(key!); } catch { el<HTMLButtonElement>(id).disabled = true; }
  }
  el<HTMLButtonElement>('save').disabled=replacingWorld||session.busy||!snapshot||simulationStopped;
  updateIncident();
}
async function save() {
  if (session.busy || replacingWorld) return;
  const saving = session.save(); syncStorageButtons();
  try { await saving; notify('Colonie sauvegardée dans ce navigateur.'); }
  finally { syncStorageButtons(); }
}
async function load(key = SAVE_KEY) {
  if (session.busy || replacingWorld) return;
  await replaceColony(() => session.load(key));
  notify(key === PREVIOUS_KEY ? 'Colonie précédente restaurée en pause.' : 'Sauvegarde rechargée en pause.');
}
// Explicit scenario URLs retain the historical diagnostic creation dialog.
async function createWorld() {
  if (session.busy || replacingWorld) return;
  const seed=Number(el<HTMLInputElement>('world-seed').value), size=Number(el<HTMLSelectElement>('world-size').value);
  const scenario=el<HTMLSelectElement>('world-scenario').value as ScenarioId;
  el('new-world-error').hidden=true;
  try {
    await replaceColony(() => session.create(seed,size,scenario));
    el<HTMLDialogElement>('new-world-dialog').close();
  } catch (error) {
    el('new-world-error').textContent=error instanceof Error ? error.message : String(error);
    el('new-world-error').hidden=false;
  }
}
async function changeSpeed(speed: number) { if (currentPanel==='menu'||graphicsFault||simulationStopped||waitingRequests.size>0) return; if (speed > 0) lastSpeed = speed; await client.setSpeed(speed); }
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tool]')) button.onclick = () => setTool(button.dataset.tool as Tool);
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-category]')) button.onclick = () => { setCategory(button.dataset.category as ArchitectCategory); applyTool('select'); };
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel]:not(:disabled)')) button.onclick = () => { const panel = button.dataset.panel as Panel; void attempt(() => switchPanel(currentPanel === panel ? null : panel)); };
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-guide-panel]')) button.onclick = () => { const panel = button.dataset.guidePanel as Panel; document.querySelector('.learning-readout')?.removeAttribute('open'); void attempt(() => switchPanel(panel)); };
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-close-panel]')) button.onclick = () => {
  const preserveTool = currentPanel === 'architect' && currentTool !== 'select';
  void attempt(() => switchPanel(null, preserveTool));
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-speed]')) button.onclick = () => { void attempt(() => changeSpeed(Number(button.dataset.speed))); };
el('save').onclick = () => { void attempt(save); }; el('load').onclick = () => { void attempt(() => load()); };
el('restore-previous').onclick = () => { void attempt(() => load(PREVIOUS_KEY)); };
el('browse-saves').onclick = () => { void attempt(() => openFront('load')); };
el('help-open').onclick = () => { renderer?.cancelDesignation(); el<HTMLDialogElement>('help').showModal(); };
el('new-colony').onclick = () => { if (diagnosticStart) el<HTMLDialogElement>('new-world-dialog').showModal(); else void attempt(() => openFront('create')); };
el('return-home').onclick = () => { void attempt(async () => { await save(); await openFront('home'); }); };
function updateScenarioDescription():void {
  const id=el<HTMLSelectElement>('world-scenario').value as ScenarioId;
  el('scenario-description').textContent=SCENARIOS[id].description;
}
el('world-scenario').onchange=updateScenarioDescription;
el('new-world-close').onclick = () => el<HTMLDialogElement>('new-world-dialog').close();
el('new-world-form').onsubmit = event => { event.preventDefault(); void attempt(createWorld); };
el('show-diagnostics').onclick = () => { const hidden = !el('metrics').hidden; el('metrics').hidden = hidden; el('show-diagnostics').textContent = hidden ? 'Afficher les diagnostics' : 'Masquer les diagnostics'; };
textureToggle.onchange = () => { if (!setTexturesEnabled(textureToggle.checked)) notify('Le choix s’applique maintenant, mais ce navigateur ne peut pas le conserver pour la prochaine visite.', true); };
groundGrassToggle.onchange = () => { if (!setGroundGrassEnabled(groundGrassToggle.checked)) notify('Le choix s’applique maintenant, mais ce navigateur ne peut pas le conserver pour la prochaine visite.', true); };
const soundToggle = el<HTMLInputElement>('sound-enabled');
const soundVolumeSlider = el<HTMLInputElement>('sound-volume');
soundToggle.checked = soundEnabled;
soundVolumeSlider.value = String(Math.round(soundVolume * 100));
soundToggle.onchange = () => { if (!setSoundEnabled(soundToggle.checked)) notify('Le choix s’applique maintenant, mais ce navigateur ne peut pas le conserver pour la prochaine visite.', true); };
soundVolumeSlider.oninput = () => { if (!setSoundVolume(Number(soundVolumeSlider.value) / 100)) notify('Le choix s’applique maintenant, mais ce navigateur ne peut pas le conserver pour la prochaine visite.', true); };
const musicToggle = el<HTMLInputElement>('music-enabled');
const musicVolumeSlider = el<HTMLInputElement>('music-volume');
musicToggle.checked = musicEnabled;
musicVolumeSlider.value = String(Math.round(musicVolume * 100));
musicToggle.onchange = () => { if (!setMusicEnabled(musicToggle.checked)) notify('Le choix s’applique maintenant, mais ce navigateur ne peut pas le conserver pour la prochaine visite.', true); };
musicVolumeSlider.oninput = () => { if (!setMusicVolume(Number(musicVolumeSlider.value) / 100)) notify('Le choix s’applique maintenant, mais ce navigateur ne peut pas le conserver pour la prochaine visite.', true); };
const testSoundButton = el<HTMLButtonElement>('test-sound');
const testSoundStatus = el<HTMLElement>('test-sound-status');
testSoundButton.onclick = () => {
  testSoundButton.disabled = true;
  testSoundStatus.textContent = 'Chargement du son d’essai…';
  void audio.playPreview().then(() => {
    testSoundStatus.textContent = 'Son d’essai lancé. Vérifiez le volume de votre appareil si vous ne l’entendez pas.';
  }).catch(error => {
    testSoundStatus.textContent = error instanceof Error ? error.message : 'Le son d’essai a échoué.';
  }).finally(() => { testSoundButton.disabled = false; });
};
// Resume directly from any later user gesture too: the browser/device can suspend an unlocked context.
const audioGestureRoot = document.querySelector<HTMLElement>('#app')!;
audioGestureRoot.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse') { unlockAudioFromGesture(); music.unlock(); } }, { capture: true });
audioGestureRoot.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') { unlockAudioFromGesture(); music.unlock(); } }, { capture: true });
document.addEventListener('keydown', event => { if (!event.repeat) { unlockAudioFromGesture(); music.unlock(); } }, { capture: true });
audioGestureRoot.addEventListener('click', event => {
  const button = event.target instanceof Element ? event.target.closest('button') : null;
  if (!button || button.disabled || button.id === 'test-sound' || button.id === 'front-test-sound') return;
  const panelButton = button.matches('[data-panel], [data-guide-panel], [data-close-panel], .front-back, .front-next');
  audio.playInterface(panelButton ? 'ui.panel' : 'ui.click');
}, { capture: true });
document.addEventListener('visibilitychange', () => { music.setHidden(document.hidden); audio.setHidden(document.hidden); });
el('wall-cutaway').onclick = () => { wallCutaway = !wallCutaway; renderer?.setWallCutaway(wallCutaway); el('wall-cutaway').textContent = wallCutaway ? 'Murs : coupés' : 'Murs : hauts'; el('wall-cutaway').setAttribute('aria-pressed', String(wallCutaway)); };
el('roof-toggle').onclick=()=>{const button=el('roof-toggle'),visible=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(visible));button.textContent=visible?'Toits : visibles':'Toits : masqués';renderer?.setRoofsVisible(visible);};
el('foliage-toggle').onclick = () => { foliageVisible = !foliageVisible; renderer?.setFoliageVisible(foliageVisible); el('foliage-toggle').textContent = foliageVisible ? 'Feuillage' : 'Troncs'; el('foliage-toggle').setAttribute('aria-pressed', String(!foliageVisible)); };
el('view-home').onclick = () => { const pawn = snapshot?.pawns[0]; if (pawn) renderer?.focusPawn(pawn.id); };
el('camera-mode').onclick = () => {
  const perspective = renderer?.toggleCameraMode() === 'perspective';
  el('camera-mode').textContent = perspective ? 'Vue : perspective' : 'Vue : iso';
  el('camera-mode').setAttribute('aria-pressed', String(perspective));
  el('camera-mode').title = `Basculer en ${perspective ? 'vue isométrique' : 'perspective'} ; glisser avec le bouton droit pour tourner`;
};
el('rotate-building').onclick = () => rotatePlacement();
syncStorageButtons(); setCategory(currentCategory); applyTool('select');
window.addEventListener('pointermove',event=>{
  mapPointerX=event.clientX;mapPointerY=event.clientY;
  if(altInspectorHeld)positionMapCellDetails();
},{passive:true});
window.addEventListener('keydown',event=>{
  if(event.key!=='Alt'||frontMenu.isOpen()||!snapshot||replacingWorld)return;
  if(event.target instanceof Element&&event.target.closest('#world-panel'))return;
  altInspectorHeld=true;event.preventDefault();updateMapCellDetails(true);
},true);
window.addEventListener('keyup',event=>{
  if(event.key==='Alt'){altInspectorHeld=false;updateMapCellDetails(true);}
},true);
window.addEventListener('blur',()=>{altInspectorHeld=false;updateMapCellDetails(true);});
document.addEventListener('keydown', event => {
  if(event.defaultPrevented || frontMenu.isOpen() || !snapshot || replacingWorld || graphicsFault || simulationStopped || waitingRequests.size>0)return;
  if(document.getElementById('orbital-dialog') instanceof HTMLDialogElement&&(document.getElementById('orbital-dialog') as HTMLDialogElement).open&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();void attempt(save);return;}
  if (document.querySelector('dialog[open]')) return;
  const worldControl=event.target instanceof Element&&!!event.target.closest('#world-panel');
  if(worldControl&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();void attempt(save);return;}
  if(worldControl&&event.key==='Escape'){event.preventDefault();void attempt(()=>switchPanel(null));return;}
  if(worldControl)return;
  if (event.target instanceof HTMLElement && (event.target.matches('input, select, textarea') || event.target.isContentEditable)) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void attempt(save); return; }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Space') { event.preventDefault(); void attempt(() => changeSpeed(currentSpeed === 0 ? lastSpeed : 0)); return; }
  if (event.key === 'Escape') { event.preventDefault(); if(shootingControls.active){shootingControls.cancel();renderState();return;} if (orderMenu.close() || renderer?.cancelDesignation()) return; void attempt(() => switchPanel(null)); clearSelection(); return; }
  if (event.key === 'Tab' || event.key === 'F1' || event.key === 'F2' || event.key === 'F3') { event.preventDefault(); const panel = event.key === 'Tab' ? 'architect' : event.key === 'F1' ? 'work' : event.key === 'F2' ? 'schedule' : 'assign'; setPanel(currentPanel === panel ? null : panel); return; }
  const speeds: Record<string, number> = { '1': 1, '2': 3, '3': 6 };
  if (event.key in speeds) { void attempt(() => changeSpeed(speeds[event.key])); return; }
  if(event.key.toLowerCase()==='r'&&selection.ids.size){event.preventDefault();if(!event.repeat)toggleDraft(snapshot?.pawns.filter(p=>selection.ids.has(p.id)&&isColonist(p)&&!p.prisoner)??[],c=>void attempt(async()=>{await client.command(c);renderState();}));return;}
  const shortcuts: Record<string, Tool> = { m:'mine', c: 'chop', r: 'harvest', b: 'wall', l: 'bed', x: 'cancel' };
  const key = event.key.toLowerCase(); if (key in shortcuts) setTool(shortcuts[key]);
  else if (rotatableTools.has(currentTool) && (key === 'q' || key === 'e')) { event.preventDefault(); rotatePlacement(key === 'q' ? -1 : 1); }
  else if (key === 's') { event.preventDefault(); setTool('stockpile'); }
});
client.onError = message => notify(message, true);
client.onRequestStatus = status => {
  if (status.state === 'waiting') waitingRequests.set(status.id, status.message ?? 'La simulation tarde à répondre.');
  else waitingRequests.delete(status.id);
  groupUI.setRequestStatus(status);
  updateIncident(); syncStorageButtons();
};
client.onFault = () => {
  groupUI.setSimulationStopped('La simulation est arrêtée. Les derniers états confirmés restent consultables.');
  session.markSimulationStopped(); simulationStopped = true; currentSpeed = 0; menuResumeSpeed = undefined;
  frontMenu.setHasGame(false);
  audio.reset();
  if (snapshot) renderer?.setWorld(snapshot, false, 0, latestMotion, true);
  updateIncident(); syncStorageButtons();
};
client.onSnapshot = (world, cost, speed, replaced, motion) => {
  if (replaced) {audio.reset();lastAudioCamera=undefined;lastAudioSourceFocus={x:Infinity,z:Infinity};lastAudioSourceHeight=NaN;}
  const speedChanged=currentSpeed!==speed;
  const role=(p:Pawn|undefined)=>p?p.prisoner?'prisoner':isColonist(p)?'colonist':'other':'absent';
  const roleChanged=selectedPawn!==undefined&&role(snapshot?.pawns.find(p=>p.id===selectedPawn))!==role(world.pawns.find(p=>p.id===selectedPawn));
  snapshot=world;stepMs=cost;currentSpeed=speed;latestMotion=motion;session.hasWorld=true;frontMenu.setHasGame(true);
  if(soundEnabled)foliageAmbience.adopt(world,true);
  music.setMood(musicMood(world));
  const changed=replaced||[...selection.ids].some(id=>!world.pawns.some(p=>p.id===id)&&!world.wildlife?.animals.some(a=>a.id===id)&&!world.mechanoids?.some(m=>m.id===id))||!!selectedObject&&!mapObjectExists(world,selectedObject);
  if(changed){selection.clear();selectedPawn=undefined;selectedCell=undefined;selectedObject=undefined;renderer?.setSelectedObject(undefined);orderMenu.close();rebuildInspector();}
  else if(roleChanged){orderMenu.close();rebuildInspector();}
  renderer?.setWorld(world,replaced,speed,motion,true);
  syncAudioSources(world);
  if(changed)renderer?.setSelectedPawns(selection.ids);
  updateMapHover();
  snapshotHud.request(changed||roleChanged||speedChanged);
};
client.onAudioCues = (cues) => {
  if (soundEnabled) audio.ingestCues(cues);
};
function updateIncident(): void {
  const visible = simulationStopped || graphicsFault || waitingRequests.size > 0;
  if (!incidentPanel && !visible) return;
  if (!incidentPanel) {
    incidentPanel = document.createElement('section');
    incidentPanel.id = 'game-incident'; incidentPanel.setAttribute('role', 'alert');
    incidentPanel.style.cssText = 'position:fixed;z-index:10000;top:20px;left:50%;transform:translateX(-50%);max-width:560px;padding:20px;background:#fff8ec;color:#292b31;border:2px solid #cda598;border-radius:12px;box-shadow:0 8px 28px #0005';
    incidentPanel.innerHTML = '<strong></strong><p></p><button id="retry-display">Recréer l’affichage</button> <button id="incident-colonies">Charger ou créer une colonie</button> <button id="stop-unanswered">Arrêter la simulation</button>';
    document.querySelector('#app')!.append(incidentPanel);
    el('retry-display').onclick = () => { void attempt(async () => {
      if (graphicsRecovering || replacingWorld || session.busy || simulationStopped) return;
      graphicsRecovering = true; updateIncident(); syncStorageButtons();
      try { await prepareWorld(); }
      finally { graphicsRecovering = false; updateIncident(); syncStorageButtons(); }
    }); };
    el('incident-colonies').onclick = () => { frontMenu.showHome(session.hasWorld && !simulationStopped); incidentPanel!.hidden = true; syncStorageButtons(); };
    el('stop-unanswered').onclick = () => client.stop();
  }
  incidentPanel.hidden = !visible;
  incidentPanel.querySelector('strong')!.textContent = simulationStopped ? 'Simulation arrêtée' : graphicsFault ? 'Affichage interrompu' : 'Opération en attente';
  incidentPanel.querySelector('p')!.textContent = simulationStopped
    ? 'Le dernier tick peut être incomplet. Vos sauvegardes sont conservées. Chargez une copie validée ou créez une colonie pour reprendre.'
    : graphicsFault ? `${graphicsMessage} La colonie est conservée et mise en pause avant la reprise de l’affichage.`
    : 'La simulation tarde à répondre. La commande peut avoir été appliquée ; son résultat et la copie de récupération restent en attente. Vous pouvez attendre ou arrêter la simulation et recharger une copie validée.';
  el<HTMLButtonElement>('retry-display').hidden = !graphicsFault || simulationStopped;
  el<HTMLButtonElement>('retry-display').disabled = graphicsRecovering || replacingWorld || session.busy;
  el<HTMLButtonElement>('incident-colonies').hidden = !simulationStopped && !graphicsFault;
  el<HTMLButtonElement>('incident-colonies').disabled = graphicsRecovering || replacingWorld || session.busy;
  el<HTMLButtonElement>('stop-unanswered').hidden = waitingRequests.size === 0;
}

async function handleGraphicsFailure(message: string): Promise<void> {
  const alreadyFailed = graphicsFault;
  graphicsFault = true; graphicsMessage = message;
  const failed = renderer; renderer = undefined; failed?.dispose(); audio.reset();
  if (alreadyFailed) { updateIncident(); syncStorageButtons(); return; }
  graphicsRecovering = true;
  updateIncident(); syncStorageButtons();
  try { if (snapshot && !simulationStopped) await client.setSpeed(0); }
  catch (error) { notify(error instanceof Error ? error.message : String(error), true); }
  finally { graphicsRecovering = false; updateIncident(); syncStorageButtons(); }
}

function prepareWorld(): Promise<void> {
  return presentationPreparation ??= prepareWorldSafely().finally(() => { presentationPreparation = undefined; });
}
async function prepareWorldSafely(): Promise<void> {
  try {
    await prepareWorldView();
    graphicsFault = false; graphicsMessage = ''; updateIncident();
  } catch (error) {
    await handleGraphicsFailure(error instanceof Error ? error.message : String(error));
    throw error;
  }
}
async function prepareWorldView(): Promise<void> {
  if (!snapshot) throw new Error('Aucune colonie à afficher.');
  shell.hidden=false;
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  if (!renderer) {
    renderer = await ColonyRenderer.create(el('viewport'), pickCell, groundGrassEnabled);
    renderer.onFatalError = message => { void handleGraphicsFailure(message); };
    renderer.onCompatibilityWarning = message => notify(message, true);
    renderer.setTexturesEnabled(texturesEnabled);
    renderer.onAudioFrame = view => {
      lastAudioCamera=view.camera;
      audio.updateCamera(view.camera);
      const pose=listenerPose(view.camera);
      if (soundEnabled && snapshot && !document.hidden &&
        (Math.hypot(pose.x-lastAudioSourceFocus.x,pose.z-lastAudioSourceFocus.z)>=4 ||
          !Number.isFinite(lastAudioSourceHeight) || Math.abs(pose.y-lastAudioSourceHeight)>=2))
        syncAudioSources(snapshot,view.camera);
      audio.update({ presentedTick: view.tick, paused: view.paused || frontMenu.isOpen() || replacingWorld, hidden: document.hidden });
    };
    renderer.onSelection=gesture=>{if(shootingControls.active){const targetId=gesture.ids[0];if(targetId!==undefined){const type=shootingControls.mode!;shootingControls.cancel();void attempt(async()=>{await client.command({type,pawnIds:selectedColonyIds(),targetId});renderState();});}return;}selectPawns(gesture);};
    renderer.onHover=cell=>{hoveredCell=cell;updateMapHover(true);};
    renderer.onInteractionCancel=()=>orderMenu.close();
    renderer.onContext=(cell,x,y,queue,targetId)=>{if(shootingControls.active){shootingControls.cancel();renderState();return;}if(!snapshot||replacingWorld||frontMenu.isOpen())return;const selected=snapshot.pawns.filter(p=>selection.ids.has(p.id)&&isColonist(p)&&!p.prisoner);if(selected.some(p=>p.draft))void orderMenu.openTactical(snapshot,new Set(selected.map(p=>p.id)),cell,x,y,queue,targetId);else void orderMenu.open(snapshot,selection.ids,cell,x,y,queue);};
    renderer.onArea = designateArea;
    renderer.onBuildLine = (kind, from, to, material) => {
      if (!snapshot || replacingWorld || frontMenu.isOpen()) return;
      void attempt(async () => {
        const response = await client.command({ type:'build-line', kind, from, to, ...(material ? { material } : {}) });
        const result = JSON.parse(response!) as { affected:number; skipped:number };
        notify(`${result.affected} plan(s) ${kind==='power-conduit'?'de câble':kind==='fence'?'de clôture':'de mur'} créé(s)${result.skipped ? ` · ${result.skipped} case(s) ignorée(s)` : ''}.`);
      });
    };
    renderer.onAreaPreview = info => {
      el('area-feedback').hidden = !info;
      if (info) el('area-feedback').textContent = `${info.line?'Ligne':'Rectangle'} ${info.width} × ${info.height} · ${info.eligible} case(s) retenue(s) · ${info.skipped} ignorée(s) — Relâcher pour appliquer · Échap pour annuler`;
    };
  }
  renderer.setWorld(snapshot, true, currentSpeed, latestMotion,true);
  if (renderer.compatibilityWarning) notify(renderer.compatibilityWarning, true);
  syncAudioSources(snapshot);
  await renderer.preparePresentation();
  el('loading')?.remove(); renderState();
}
async function start() {
  shell.hidden=true; frontMenu.showHome(false);
  frontMenu.setBusy(true, 'Lecture des sauvegardes…');
  try { await session.initializeStorage(); }
  finally { frontMenu.setBusy(false); }
  if (import.meta.env.DEV && params.has('e2e')) Object.defineProperty(window, '__lisiere', { value: {
    get world() { return structuredClone(snapshot); }, get tick() { return snapshot?.tick ?? 0; }, get backend() { return renderer?.backend; },
    get audio() { return { loadedCount: audio.loadedCount, availableSounds: audio.availableSounds, music: music.diagnostics }; },
    saveRepository,
    get incident() { return { simulationStopped, graphicsFault, waiting: waitingRequests.size }; },
    failGraphics: (message = 'Incident graphique de contrôle') => renderer?.reportFailure(message),
    loseGraphicsDevice: () => renderer?.requestDeviceLossForDiagnostics() ?? false,
    stopSimulation: () => client.stop('Arrêt de contrôle de la simulation.'),
    projectCell: (x: number,z: number) => renderer!.projectCell(x,z),
    projectPawn: (id:number) => renderer?.screenPawns().find(pawn=>pawn.id===id),
  } });
  syncStorageButtons();
  if (!diagnosticStart) return;
  frontMenu.setBusy(true, 'Préparation du scénario de diagnostic…');
  try {
    const seedText=params.get('seed'), seed=seedText===null?42:Number(seedText), size=Number(params.get('size'));
    if(seedText!==null&&(!/^\d{1,10}$/.test(seedText)||!Number.isInteger(seed)||seed<0||seed>4294967295))throw new Error('Graine invalide dans cette adresse.');
    const scenario=params.get('scenario')!;
    if(!Object.hasOwn(SCENARIOS,scenario))throw new Error('Scénario inconnu dans cette adresse.');
    el<HTMLSelectElement>('world-scenario').value=scenario; updateScenarioDescription();
    await replaceColony(() => session.create(seed,[32,...MAP_SIZE_PRESETS].includes(size)?size:DEFAULT_MAP_SIZE,scenario as ScenarioId));
    await changeSpeed(1);
  } catch(error) { frontMenu.showError(error instanceof Error?error.message:String(error)); }
  finally { frontMenu.setBusy(false); syncStorageButtons(); }
}
const metricsInterval = setInterval(() => {
  if (!renderer) return;
  el('fps-counter').textContent = renderer.stats.fps > 0 ? `${Math.round(renderer.stats.fps)} FPS` : '— FPS';
  if (!el('metrics').hidden) {
    const sound = audio.diagnostics;
    const soundState = !soundEnabled ? 'coupé' : soundVolume === 0 ? 'volume 0'
      : sound.state === 'running' ? 'actif' : sound.state === 'suspended' ? 'suspendu' : sound.state;
    const song = music.diagnostics;
    el('metrics').textContent = `${renderer.backend} · ${renderer.stats.frameMs.toFixed(1)} ms/image · p95 ${renderer.stats.frameP95.toFixed(1)} ms · simulation ${stepMs.toFixed(2)} ms/tick · son ${soundState}, ${sound.loaded} MP3, ${sound.playedOneShots} effets, dernier ${sound.lastKind ?? '—'} · musique ${song.state}${song.track ? ` (${song.track})` : ''}`;
  }
}, 1000);
window.addEventListener('pagehide', event => { if (event.persisted) return; clearInterval(metricsInterval); client.dispose(); audio.dispose(); music.dispose(); renderer?.dispose(); saveRepository.close(); });
void start().catch(error => { frontMenu.showError(error instanceof Error ? error.message : String(error)); });
