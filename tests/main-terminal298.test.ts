import {afterEach,expect,test,vi} from 'vitest';
import {actualMainHost,selectedSource} from './helpers/main-source-host';
import {declaredReadyShip298} from './helpers/declared-ready-ship298';
import {createNativeShipTerminal298,readAdoptedShipCredits298} from '../src/ui3d/native-ship-terminal-298';
import {ColonyRenderer} from '../src/render/ColonyRenderer';
import {SnapshotHud} from '../src/ui/snapshot-hud';
import {PawnSelection} from '../src/ui/pawn-selection';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {createShipCountdownRuntime298} from '../src/bridge/ship-countdown-runtime-298';
import {campaignOnlySummary} from '../src/sim/world-map-presentation';
import {applyCommand} from '../src/sim/engine';
import {isCorePhysicalSchema297} from '../src/sim/physical-schema-297';
import {isColonist} from '../src/sim/affiliation';
import {explorationEnabled256} from '../src/sim/exploration-state-256';
import {knownPosition256} from '../src/ui/exploration-readers-256';
import {nativeTextEntitiesFor} from '../src/ui3d/native-text-entities';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization';
import type {NativePage} from '../src/ui3d/native-contract';
import type {World} from '../src/sim/types';

// Three Main-policy contracts. Browser rendering/audio/storage and delivery
// scheduling are declared; Main bodies, terminal, publications and authority are real.
const cleanup:(()=>void)[]=[];
afterEach(()=>{for(const close of cleanup.splice(0))close();vi.restoreAllMocks();vi.useRealTimers();vi.unstubAllGlobals();});
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function whole(world:World){expect(validateWorld(world)).toEqual([]);const raw=serializeWorld(world);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);return raw;}
function control(page:NativePage|undefined,id:string){const found=page?.actions?.find(c=>c.id===id);expect(found,'Actual Main page control '+id).toBeDefined();if(!found)throw Error('No actual control '+id);return found;}
function host(){
 const f=declaredReadyShip298(),runtime=createShipCountdownRuntime298();runtime.prepareAcceptedOwner(f.world).commit();
 const encoder=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder();
 const publish=(root=f.world)=>{const packet=structuredClone(encoder.encode(root,0,0,true)),result=decoder.adopt(packet);expect(result.status,result.status==='resync'?result.reason:'').toBe('applied');if(result.status!=='applied')throw Error('No genuine publication');expect(Object.hasOwn(result.world,'escapedShips298')).toBe(false);return result.world;};
 const publishCampaign=()=>{
  expect(applyCommand(f.world,{type:'map-view',mapId:null}).ok).toBe(true);whole(f.world);
  const header=encoder.campaignHeader(true),transport=encoder.encodeCampaignSummary(campaignOnlySummary(f.world),true);
  const packet=structuredClone({type:'campaign-only' as const,...header,stepMs:0,speed:0,summary:transport.state,
   ...transport.geography?{geography:transport.geography}:{},urgentThreats:{generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]}});
  const result=decoder.adoptCampaignOnly(packet);expect(result.status,result.status==='resync'?result.reason:'').toBe('applied');if(result.status!=='applied')throw Error('No genuine mapless publication');
  expect(Object.hasOwn(result.summary,'escapedShips298')).toBe(false);return result.summary;
 };
 let active=false,camp=false,creation=false,front=false,requestId=0,page:NativePage|undefined,lastLaunch:{ownerEpoch:number;generation:number}|undefined;
 const events:{name:string;args:any[]}[]=[],note=(name:string)=>(...args:any[])=>{events.push({name,args});};
 const feed=vi.fn(),continued=vi.fn(async(id:number)=>{const r=runtime.continueCredits(f.world,{type:'ship-credits-continue-298',id:++requestId,ownerEpoch:runtime.replyMetadata(f.world).shipOwnerEpoch298!,departureId:id});if(!r.ok)throw Error(r.reason);return r;});
 const launch=vi.fn(async(computerId:number)=>{const r=runtime.launch(f.world,f.world,{type:'ship-launch-298',id:++requestId,ownerEpoch:runtime.replyMetadata(f.world).shipOwnerEpoch298!,computerId});if(!r.ok)throw Error(r.reason);lastLaunch={ownerEpoch:r.ownerEpoch,generation:r.generation};return r;});
 const command=vi.fn(async()=>{throw Error('Generic command must not launch');});
 const client={get shipCountdownActive298(){return active;},get hasCampPreparation(){return camp;},get hasWorldCreationPreparation(){return creation;},hasPendingPresentationRequests:false,
  feedShipFrame298:feed,resumeShipFramesAfterPreparation298:vi.fn(),launchShip298:launch,continueShipCredits298:continued,command,stop:vi.fn()};
 const session={hasWorld:true,busy:false,generation:1,saves:()=>[]};
 const frontMenu={isOpen:()=>front,setHasGame:vi.fn()};
 const ui={showPage:vi.fn((value:NativePage|undefined)=>{page=value;}),setTextEntities:vi.fn(),setWorldVisible:vi.fn(),notifyCountdownFrameEligibility298:vi.fn(),presentShipCurtain298:vi.fn(),gameCountdownFrame298:vi.fn()};
 const hud={setVisible:vi.fn(),setSelection:vi.fn(),update:vi.fn(),setViewState:vi.fn()};
 const renderer={stats:{fps:60},setWorld:vi.fn(),setSelectedPawns:vi.fn(),setSelectedObject:vi.fn(),dispose:vi.fn()};
 const documentHost={hidden:false};vi.stubGlobal('document',documentHost);
 const main=actualMainHost({world:publish(),client,session,frontMenu,ui,hud,renderer,note,
  createNativeShipTerminal298,readAdoptedShipCredits298,ColonyRenderer,SnapshotHud,isCorePhysicalSchema297,isColonist,explorationEnabled256,knownPosition256,nativeTextEntitiesFor,selection:new PawnSelection()});
 cleanup.push(()=>{main.dispose();runtime.cleanup();});
 const depart=()=>{const r=runtime.launch(f.world,f.world,{type:'ship-launch-298',id:++requestId,ownerEpoch:runtime.replyMetadata(f.world).shipOwnerEpoch298!,computerId:f.computer.id});if(!r.ok)throw Error(r.reason);
  const result=runtime.frame(f.world,{type:'ship-frame-298',ownerEpoch:r.ownerEpoch,generation:r.generation,sequence:1,deltas:Array.from({length:29},()=>.25)});
  expect(result.reply).toMatchObject({accepted:true,active:false,outcome:'departed'});whole(f.world);return result.reply.departureId!;};
 return {f,runtime,main,client,session,frontMenu,ui,hud,renderer,documentHost,events,feed,launch,continued,command,publish,publishCampaign,depart,
  get page(){return page;},get lastLaunch(){if(!lastLaunch)throw Error('No real launch receipt');return lastLaunch;},front:(value:boolean)=>{front=value;},active:(value:boolean)=>{active=value;},preparing:(a:boolean,b=false)=>{camp=a;creation=b;}};
}

test('actual Main frame port elects Worker/credits, excludes unfunded closing intervals and reports guarded game-frame readiness',async()=>{
 const h=host(),m=h.main,raw=whole(h.f.world);expect(selectedSource.mainSHA).toHaveLength(64);
 expect(m.port.canFeed()).toBe(false);h.active(true);expect(m.port.canFeed()).toBe(true);
 h.session.busy=true;m.set({currentSpeed:0});expect(m.port.canFeed()).toBe(true);h.session.busy=false;
 for(const key of ['replacingWorld','simulationStopped','graphicsFault','graphicsRecovering','presentationPreparation']){
  m.set({[key]:key==='presentationPreparation'?Promise.resolve():true});expect(m.port.canFeed(),key).toBe(false);m.set({[key]:key==='presentationPreparation'?undefined:false});
 }
 h.documentHost.hidden=true;expect(m.port.canFeed()).toBe(false);h.documentHost.hidden=false;
 h.preparing(true);expect(m.port.canFeed()).toBe(false);m.resumePreparation();expect(h.client.resumeShipFramesAfterPreparation298).not.toHaveBeenCalled();
 h.preparing(false,true);expect(m.port.canFeed()).toBe(false);h.preparing(false);m.resumePreparation();expect(h.client.resumeShipFramesAfterPreparation298).toHaveBeenCalledTimes(1);
 m.port.feed(.125);expect(h.feed).toHaveBeenLastCalledWith(.125);h.active(false);
 h.depart();m.receiveWorld(h.publish(),0,0,true);control(h.page,'ship-credits-continue298').onActivate();expect(m.terminal.closing).toBe(true);expect(m.port.canFeed()).toBe(true);
 const creditPageId=h.page!.id;expect(h.ui.presentShipCurtain298).toHaveBeenLastCalledWith(creditPageId,'closing',0);
 for(const block of ['front','waiting','hidden','replacing']){
  if(block==='front')h.front(true);if(block==='waiting')m.waitingRequests.set(1,'declared pending');if(block==='hidden')h.documentHost.hidden=true;if(block==='replacing')m.set({replacingWorld:true});
  expect(m.port.canFeed(),block).toBe(false);
  // This is how the elected Stage gate is consumed: blocked deltas are not sent.
  if(m.port.canFeed())m.port.feed(30);
  h.front(false);m.waitingRequests.clear();h.documentHost.hidden=false;m.set({replacingWorld:false});
 }
 expect(h.continued).not.toHaveBeenCalled();expect(m.terminal.closing).toBe(true);
 for(let n=0;n<12;n++)m.port.feed(.25);await flush();expect(h.continued).toHaveBeenCalledTimes(1);expect(h.ui.presentShipCurtain298).toHaveBeenLastCalledWith(creditPageId,'held',1);
 // Actual Main override; the inherited render operation is a declared boundary.
 const proto=ColonyRenderer.prototype as any;vi.spyOn(proto,'frame').mockImplementation(()=>{h.events.push({name:'super-frame',args:[]});});
 const frame=Object.assign(Object.create(m.MainColonyRenderer.prototype),{disposed:false,preparing:false,fatalError:undefined,hostPort:{now:()=>0},beginPresentationFrame297:()=>h.events.push({name:'begin-frame',args:[]})});
 m.set({renderer:frame});h.events.length=0;frame.frame(100);expect(h.events.map(e=>e.name)).toEqual(['begin-frame','drain-admissions','super-frame','notify-admissions']);expect(h.ui.gameCountdownFrame298).toHaveBeenLastCalledWith(100,true);
 frame.preparing=true;frame.frame(200);expect(h.ui.gameCountdownFrame298).toHaveBeenLastCalledWith(200,false);
 vi.mocked(proto.frame).mockImplementation(()=>{throw Error('Declared renderer fault');});expect(()=>frame.frame(300)).toThrow('Declared renderer fault');expect(h.ui.gameCountdownFrame298).toHaveBeenLastCalledWith(300,false);expect(h.events.at(-1)?.name).toBe('notify-admissions');
 expect(raw).not.toBe(whole(h.f.world)); // A real departure/continuation occurred; no fake success receipt.
});

test('actual Main terminal initializer, actions and refresh keep dedicated launch, adopted World priority and front/incident precedence',async()=>{
 const h=host(),m=h.main,raw=whole(h.f.world);m.refresh();expect(h.hud.setVisible).toHaveBeenLastCalledWith(true);expect(h.page).toBeNull();
 m.actions().launchShip298(h.f.computer.id);expect(h.launch).not.toHaveBeenCalled();expect(h.page?.modal).toBe(true);
 await control(h.page,'ship-launch-confirm298').onActivate();expect(h.launch).toHaveBeenCalledExactlyOnceWith(h.f.computer.id);expect(h.command).not.toHaveBeenCalled();expect(whole(h.f.world)).toBe(raw);
 // The dedicated Main callback has armed the real runtime; settle it physically.
 const started=h.lastLaunch,result=h.runtime.frame(h.f.world,{type:'ship-frame-298',ownerEpoch:started.ownerEpoch,generation:started.generation,sequence:1,deltas:Array.from({length:29},()=>.25)});
 expect(result.reply).toMatchObject({accepted:true,outcome:'departed'});const publicWorld=h.publish(),summary=h.publishCampaign(),rawDeparted=whole(h.f.world);
 m.set({snapshot:publicWorld,campaignOnly:undefined});m.refresh();expect(h.page?.id).toContain(':credits:');expect(h.page?.rows.some(r=>r.label===h.f.actor.name)).toBe(true);
 const creditsPage=h.page,shown=h.ui.showPage.mock.calls.length;h.front(true);m.refresh();expect(h.ui.showPage).toHaveBeenCalledTimes(shown);expect(h.hud.setVisible).toHaveBeenLastCalledWith(false);h.front(false);
 m.waitingRequests.set(1,'unresolved transport');m.refresh();expect(h.page?.id).toBe('native-incident');expect(h.page?.title).toBe('Opération en attente');m.waitingRequests.clear();
 m.set({graphicsFault:true});m.refresh();expect(h.page?.title).toBe('Affichage interrompu');m.set({graphicsFault:false});m.refresh();expect(h.page?.id).toBe(creditsPage?.id);
 // Deliberately paired stale public summary: a genuine different current World wins.
 const fresh=declaredReadyShip298(),freshEncoder=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:0}),freshDecoder=new SnapshotDecoder();
 const accepted=freshDecoder.adopt(structuredClone(freshEncoder.encode(fresh.world,0,0,true)));expect(accepted.status).toBe('applied');if(accepted.status!=='applied')throw Error('Missing public replacement');
 m.set({snapshot:accepted.world,campaignOnly:summary});m.refresh();expect(h.page).toBeNull();expect(m.port.canFeed()).toBe(false);
 m.set({snapshot:undefined,campaignOnly:summary});m.refresh();expect(h.page?.id).toContain(':credits:');expect(h.page?.rows.some(r=>r.label===h.f.actor.name)).toBe(true);
 expect(whole(h.f.world)).toBe(rawDeparted);expect(h.command).not.toHaveBeenCalled();
});

test('actual Main World/CampaignOnly adoption and real HUD scheduler expose credits only after public delivery and invalidate old epochs',async()=>{
 vi.useFakeTimers();const h=host(),m=h.main;h.depart();const publicWorld=h.publish(),summary=h.publishCampaign(),raw=whole(h.f.world);
 expect(h.page).toBeUndefined();m.receiveWorld(publicWorld,7,0,true);expect(m.state.snapshot).toBe(publicWorld);expect(m.state.campaignOnly).toBeUndefined();
 expect(h.renderer.setWorld).toHaveBeenLastCalledWith(publicWorld,true,0,undefined,true,undefined,false);expect(h.hud.update).toHaveBeenLastCalledWith(publicWorld,0,60);
 const first=h.page;expect(first?.id).toContain(':credits:');expect(first?.rows.some(r=>r.label===h.f.actor.name)).toBe(true);const oldEpoch=m.state.campaignPresentationEpoch;
 // A second calm delivery is deferred by the ACTUAL SnapshotHud, not a copied gate.
 const shown=h.ui.showPage.mock.calls.length;m.receiveWorld(publicWorld,8,0,false);expect(h.ui.showPage).toHaveBeenCalledTimes(shown);vi.advanceTimersByTime(199);expect(h.ui.showPage).toHaveBeenCalledTimes(shown);vi.advanceTimersByTime(1);expect(h.ui.showPage.mock.calls.length).toBeGreaterThan(shown);
 m.receiveCampaign(summary,9,0,false);expect(h.renderer.dispose).toHaveBeenCalledTimes(1);expect(m.state.snapshot).toBeUndefined();expect(m.state.campaignOnly).toBe(summary);expect(m.state.renderer).toBeUndefined();expect(m.state.campaignPresentationEpoch).toBe(oldEpoch+1);
 expect(h.ui.setWorldVisible).toHaveBeenLastCalledWith(false);expect(h.hud.setVisible).toHaveBeenLastCalledWith(false);expect(h.page?.rows.some(r=>r.label===h.f.actor.name)).toBe(true);
 h.session.generation++;m.refresh();const replacement=h.page;expect(replacement).not.toBe(first);first?.onCancel?.();expect(m.terminal.closing).toBe(false);expect(h.continued).not.toHaveBeenCalled();expect(h.page).toBe(replacement);
 expect(whole(h.f.world)).toBe(raw);expect(Object.hasOwn(publicWorld,'escapedShips298')).toBe(false);expect(Object.hasOwn(summary,'escapedShips298')).toBe(false);
});
