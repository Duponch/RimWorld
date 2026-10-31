import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import {parseAst} from 'rolldown/parseAst';

// Test-only source seam, following the repository's native-options-speed and
// native-hud-speed tests. Nothing imports/executes Main's browser bootstrap.
export const MAIN_UI14_SHA='436f50e6f8a40fe3560d5988957766b6449b1aef636d4921a40b676fd7b98e1a';
const mainText=readFileSync(new URL('../../src/main.ts',import.meta.url),'utf8');
if(createHash('sha256').update(mainText).digest('hex')!==MAIN_UI14_SHA)throw Error('MainUI14 exact source mismatch');
const main=parseAst(mainText,{lang:'ts'},'src/main.ts');
function one<T>(rows:T[],name:string):T {if(rows.length!==1)throw Error('Expected one source node: '+name);return rows[0]!;}
function findAll(node:any,predicate:(n:any)=>boolean,out:any[]=[]):any[]{
 if(!node||typeof node!=='object')return out;if(predicate(node))out.push(node);
 for(const [key,value] of Object.entries(node)){if(key==='parent')throw Error('Unexpected cyclic AST');
  if(Array.isArray(value)){for(const child of value)findAll(child,predicate,out);}else if(value&&typeof value==='object')findAll(value,predicate,out);}
 return out;
}
const span=(node:any)=>mainText.slice(node.start,node.end);
const declaration=(name:string,kind='FunctionDeclaration')=>span(one(main.body.filter((n:any)=>n.type===kind&&n.id?.name===name),name));
const functions=['nativeShipPresentationEligible298','nativeShipFrameEligible298','nativeShipCurtainEligible298',
 'resumeNativeShipPreparation298','readNativeState','nativeActions','nativePawnInspectorKey','refreshNativeUi',
 'receiveMainSnapshot','receiveMainCampaignOnly','renderCampaignOnly','renderState','updateIncident'];
const declarations=functions.map(name=>declaration(name)).join('\n')+'\n'+declaration('MainColonyRenderer','ClassDeclaration');
const stage=one(findAll(main,(n:any)=>n.type==='NewExpression'&&n.callee?.type==='Identifier'&&n.callee.name==='NativeStage'),'new NativeStage');
const stageOptions=stage.arguments[0];if(stageOptions?.type!=='ObjectExpression')throw Error('NativeStage options shape changed');
const countdown:any=one(stageOptions.properties.filter((n:any)=>n.type==='Property'&&n.key?.name==='countdownFrame298'),'countdownFrame298');
const terminal=one(findAll(main,(n:any)=>n.type==='CallExpression'&&n.callee?.type==='Identifier'&&n.callee.name==='createNativeShipTerminal298'),'terminal factory');
if(terminal.arguments.length!==1||terminal.arguments[0].type!=='ObjectExpression')throw Error('Terminal options shape changed');
export const selectedSource=Object.freeze({mainSHA:MAIN_UI14_SHA,functions:[...functions],
 className:'MainColonyRenderer',countdown:span(countdown.value),terminal:span(terminal)});

// These are declared peripheral services/data, not replacement Main guards.
// Unstudied interactive branches throw rather than silently returning success.
const factoryText=`(function(d:any){
 const {createNativeShipTerminal298,readAdoptedShipCredits298,ColonyRenderer,SnapshotHud,
   isCorePhysicalSchema297,isColonist,explorationEnabled256,knownPosition256,nativeTextEntitiesFor}=d;
 const unexpected=(name:string)=>(...args:any[])=>{throw Error('Unclosed Main service: '+name);};
 const client=d.client,session=d.session,frontMenu=d.frontMenu,nativeUi=d.ui,nativeHud=d.hud;
 const selection=d.selection,waitingRequests=new Map<number,string>();
 let snapshot=d.world,campaignOnly,currentPanel='world',currentCategory='ship',currentTool='select',placementOrientation=0;
 let nativeConstructionMaterial='steel',nativeCreationStorage={filters:{wood:true,food:true},priority:3};
 let selectedPawn,selectedCell,selectedObject,selectedObjects:any[]=[],nativeCampProgress,nativeCaravanProgress;
 let currentSpeed=0,lastSpeed=1,stepMs=0,replacingWorld=false,presentationPreparation,simulationStopped=false,graphicsFault=false,graphicsRecovering=false;
 let nativeShipTerminal298,nativeCustomPage,nativeBeforeIncident,nativeToolPalette,nativeEncounterKey,nativeHudHiddenInspectorKey;
 let campaignPresentationEpoch=0,worldTab='maps',nativeLocalTrade,nativeFactionComms298,saveStorageReady=false;
 let wallCutaway=false,foliageVisible=true,nativeRoofsVisible=true,nativeZonesVisible=true,nativePerspective=false;
 let latestCoreFullInput297,latestCorePhaseInput297,latestFoodReadability,latestMotion,hoveredCell;
 let lastAudioCamera,lastAudioSourceFocus={x:Infinity,z:Infinity},lastAudioSourceHeight=NaN;
 let soundEnabled=false,graphicsMessage='Declared rendering fault',incidentPanel,replantPileId,installationId,allowedAreaEditId;
 let renderer=d.renderer;
 const firstGesturesLearning={cancelPending:d.note('cancel-learning')},hoverReadoutLayout={reset:d.note('hover-reset')};
 const shell={hidden:false,classList:{remove:d.note('class-remove'),add:d.note('class-add')}};
 const audio={reset:d.note('audio-reset')},music={setMood:d.note('music-mood')},musicMood=()=> 'calm';
 const foliageAmbience={adopt:unexpected('foliage ambience')};
 const orderMenu={close:d.note('order-close')},startingArrivalUI={reset:d.note('arrival-reset')};
 const deferredResumeGuard={confirm:d.note('resume-confirm')};
 const syncArchitectAvailability=d.note('architect'),syncAudioSources=d.note('audio-sources'),updateMapHover=d.note('hover');
 const rebuildInspector=d.note('inspector'),syncStorageButtons=d.note('storage'),handleCommercialArrival=d.note('commercial-arrival');
 const syncNativePanelState=d.note('panel-sync');
 const buildNativePanel=()=>null,buildNativeInspector=()=>null,buildNativeEncounter=()=>undefined;
 const buildNativeToolPalette=unexpected('tool palette');
 const setCategory=unexpected('category'),setTool=unexpected('tool'),selectPawn=unexpected('select pawn');
 const switchPanel=unexpected('switch panel'),setPanel=unexpected('set panel'),clearSelection=unexpected('clear selection');
 const changeSpeed=unexpected('speed'),openFront=unexpected('front'),save=unexpected('save'),exportCurrentColony=unexpected('export');
 const openNativeSaveManager=unexpected('save manager'),openNativeOptions=unexpected('options'),openHelp=unexpected('help');
 const sendCampaignCommand=unexpected('campaign command'),commercialCommand=unexpected('commercial command');
 const attempt=async(fn:any)=>fn(),prepareWorld=unexpected('prepare renderer');
 const applyTool=unexpected('apply tool'),editZone=unexpected('edit zone'),selectObjects=unexpected('select objects');
 const stockpileCellsByZoneId=unexpected('stockpile anchor'),stockpileZoneId=unexpected('stockpile id');
 const isMinifiedTree=unexpected('minified tree'),mapObjectGroupCells=unexpected('object group'),mapObjectExists=unexpected('map object');
 const isShipComputerSensorsKind298=unexpected('tool kind'),actionLabel=unexpected('activity'),carriedPatientsOf=unexpected('patients'),furnitureObject=unexpected('furniture');
 const drainMainAdmissionsBeforeFrame=d.note('drain-admissions'),notifyMainAdmissionAvailability=d.note('notify-admissions');
 ${declarations}
 const snapshotHud=new SnapshotHud(()=>renderState());
 const port=${span(countdown.value)};
 nativeShipTerminal298=${span(terminal)};
 const set=(values:any)=>{for(const [key,value] of Object.entries(values)){switch(key){
  case 'snapshot':snapshot=value;break;case 'campaignOnly':campaignOnly=value;break;
  case 'replacingWorld':replacingWorld=value;break;case 'presentationPreparation':presentationPreparation=value;break;
  case 'simulationStopped':simulationStopped=value;break;case 'graphicsFault':graphicsFault=value;break;case 'graphicsRecovering':graphicsRecovering=value;break;
  case 'currentSpeed':currentSpeed=value;break;case 'renderer':renderer=value;break;
  default:throw Error('Unclosed Main test input '+key);
 }}};
 return {port,terminal:nativeShipTerminal298,actions:nativeActions,read:readNativeState,refresh:refreshNativeUi,
  render:renderState,resumePreparation:resumeNativeShipPreparation298,receiveWorld:receiveMainSnapshot,receiveCampaign:receiveMainCampaignOnly,
  MainColonyRenderer,set,waitingRequests,
  get state(){return {snapshot,campaignOnly,currentPanel,currentSpeed,campaignPresentationEpoch,nativeCustomPage,renderer,shell};},
  dispose:()=>nativeShipTerminal298.dispose()};
})`;
const factory=Function('return ('+stripTypeScriptTypes(factoryText,{mode:'transform'}).trim().replace(/;$/u,'')+');')();
export function actualMainHost(dependencies:any):any {return factory(dependencies);}
