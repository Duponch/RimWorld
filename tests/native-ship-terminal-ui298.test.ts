import {afterEach,expect,test,vi} from 'vitest';
import {createNativeShipTerminal298,readAdoptedShipCredits298} from '../src/ui3d/native-ship-terminal-298';
import {nativeSpecialRows} from '../src/ui3d/native-special-inspection';
import {NativeStage} from '../src/ui3d/NativeStage';
import type {NativeControl,NativePage,NativeUiActions,NativeUiState} from '../src/ui3d/native-contract';
import {createShipCountdownRuntime298} from '../src/bridge/ship-countdown-runtime-298';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {campaignOnlySummary} from '../src/sim/world-map-presentation';
import {damageStructure,structureMaxHp} from '../src/sim/thing-damage';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization';
import type {World} from '../src/sim/types';
import {declaredReadyShip298} from './helpers/declared-ready-ship298';
vi.mock('../src/ui/native-cardboard-cursors',()=>({setNativeCursor:vi.fn()}));

/* Three NEW UI finalities. Declared page/keyboard/delivery host only.
 * Actual initial constructors, runtime, departure, read projection and Snapshot
 * decoder are used. No mission, Engine step, browser/GPU or Native grant. */
const cleanup:(()=>void)[]=[];
afterEach(()=>{for(const close of cleanup.splice(0))close();vi.restoreAllMocks();vi.unstubAllGlobals();});
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function deferred<T>(){let resolve!:(v:T)=>void,reject!:(e:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function whole(w:World){expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);return raw;}
function stateFor(world:World):NativeUiState {
 return {world,epoch:1,panel:null,category:'ship',tool:'select',orientation:0,selectedPawnIds:[],selectedObjects:[],
  constructionMaterial:'steel',creationStorage:{filters:{wood:true,food:true},priority:3},speed:0,hasGame:true,busy:false,saves:[]};
}
function host(){
 const f=declaredReadyShip298(),runtime=createShipCountdownRuntime298(),encoder=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder();
 let root=f.world,requestId=0,page:NativePage|undefined,present=true;
 runtime.prepareAcceptedOwner(root).commit();
 const publicWorld=()=>{const result=decoder.adopt(structuredClone(encoder.encode(root,0,0,true)));expect(result.status,result.status==='resync'?result.reason:'').toBe('applied');if(result.status!=='applied')throw Error('No adopted public World');expect(Object.hasOwn(result.world,'escapedShips298')).toBe(false);return result.world;};
 let state=stateFor(publicWorld());
 const realLaunch=(computerId:number)=>{const r=runtime.launch(root,root,{type:'ship-launch-298',id:++requestId,ownerEpoch:runtime.replyMetadata(root).shipOwnerEpoch298!,computerId});if(!r.ok)throw Error(r.reason);return r;};
 const realContinue=(departureId:number,staleOwner=false)=>{const r=runtime.continueCredits(root,{type:'ship-credits-continue-298',id:++requestId,ownerEpoch:runtime.replyMetadata(root).shipOwnerEpoch298!+Number(staleOwner),departureId});if(!r.ok)throw Error(r.reason);return r;};
 let launchImpl=(computerId:number):Promise<unknown>=>Promise.resolve(realLaunch(computerId));
 let continueImpl=(departureId:number):Promise<unknown>=>Promise.resolve(realContinue(departureId));
 const launch=vi.fn((id:number)=>launchImpl(id)),continued=vi.fn((id:number)=>continueImpl(id));
 const shown:NativePage[]=[],closed:string[]=[],demand=vi.fn(),readState=vi.fn(()=>state);
 const terminal=createNativeShipTerminal298({readState,readEpoch:()=>state.epoch,
  readCredits:()=>readAdoptedShipCredits298(state.world,state.campaign,state.hasGame),canPresent:()=>present,
  isPageCurrent:id=>page?.id===id,show:value=>{page=value;shown.push(value);},
  close:id=>{if(page?.id===id){closed.push(id);page=undefined;}},launch,continueCredits:continued,onFrameDemandChanged:demand});
 const command=vi.fn(async()=>{throw Error('Generic command is not a ship launch API');});
 const actions:NativeUiActions={command,panel:vi.fn(),category:vi.fn(),tool:vi.fn(),selectPawn:vi.fn(),speed:vi.fn(),rotate:vi.fn(),material:vi.fn(),creationStorage:vi.fn(),
  front:vi.fn(),save:vi.fn(),exportSave:vi.fn(),showPage:value=>{page=value;shown.push(value);},refresh:vi.fn(),readState,
  closePage:()=>{page=undefined;},launchShip298:id=>terminal.openLaunch(id)};
 const sync=()=>{const next=terminal.update(state);if(next)page=next;else if(terminal.ownsPage(page?.id))page=undefined;return next;};
 const h={f,runtime,terminal,actions,command,launch,continued,shown,closed,demand,readState,realLaunch,realContinue,publicWorld,sync,
  get root(){return root;},get state(){return state;},set state(value:NativeUiState){state=value;},
  get page(){return page;},set page(value:NativePage|undefined){page=value;},
  setPresent(value:boolean){present=value;},
  setLaunch(fn:(id:number)=>Promise<unknown>){launchImpl=fn;},setContinue(fn:(id:number)=>Promise<unknown>){continueImpl=fn;},
  replaceOwner(){root=deserializeWorld(f.text);runtime.prepareAcceptedOwner(root).commit();state={...state,world:publicWorld(),campaign:undefined,epoch:(state.epoch??0)+1};sync();},
  depart(){const r=realLaunch(f.computer.id);const result=runtime.frame(root,{type:'ship-frame-298',ownerEpoch:r.ownerEpoch,generation:r.generation,sequence:1,deltas:Array.from({length:29},()=>.25)});
   expect(result.reply).toMatchObject({accepted:true,active:false,outcome:'departed'});expect(result.reply.departureId).toBeGreaterThan(0);whole(root);
   state={...state,world:publicWorld()};sync();return result.reply.departureId!;},
 };
 cleanup.push(()=>{terminal.dispose();runtime.cleanup();});return h;
}
function control(page:NativePage|undefined,id:string):NativeControl {
 const found=[...(page?.actions??[]),...(page?.rows.flatMap(r=>r.controls??[])??[])].find(c=>c.id===id);
 expect(found,'Actual visible control '+id).toBeDefined();if(!found)throw Error('No control '+id);return found;
}

test('the actual report/confirmation uses the dedicated runtime API, rejects a changed ship and ignores a stale awaited reply',async()=>{
 const h=host(),before=whole(h.root);h.state={...h.state,selectedObjects:[{kind:'structure',id:h.f.computer.id}]};
 let rows=nativeSpecialRows(h.state,h.actions);
 const report=rows.flatMap(r=>r.controls??[]).find(c=>c.id==='special-ship-assembly');expect(report).toBeDefined();await report!.onActivate();
 expect(h.page?.rows.find(r=>r.id==='ship-development')?.label).toBe('Seuls les occupants des caissons reliés partiront.');
 const launchControl=rows.flatMap(r=>r.controls??[]).find(c=>c.id==='special-ship-launch298');expect(launchControl?.icon).toBe('rocket');await launchControl!.onActivate();
 expect(h.launch).not.toHaveBeenCalled();expect(h.page?.modal).toBe(true);expect(h.page?.closable).toBe(false);
 expect(h.page?.rows.some(r=>r.label.includes('restées sur cette carte'))).toBe(true);expect(whole(h.root)).toBe(before);
 const held=deferred<unknown>();h.setLaunch(id=>{const result=h.realLaunch(id);return held.promise.then(()=>result);});
 const pending=Promise.resolve(control(h.page,'ship-launch-confirm298').onActivate());
 expect(h.launch).toHaveBeenCalledExactlyOnceWith(h.f.computer.id);expect(h.command).not.toHaveBeenCalled();expect(whole(h.root)).toBe(before);
 // A real accepted owner replacement, not merely a view mutation.
 h.replaceOwner();const replacementPage:NativePage={id:'declared-new-owner-page',title:'Nouvelle vue',rows:[]};h.page=replacementPage;
 held.resolve(undefined);await pending;expect(h.page).toBe(replacementPage);expect(h.closed).toEqual([]);expect(h.sync()).toBeUndefined();

 // The UI still sees its adopted report. A real destruction removes sensors
 // on authority before confirmation; the real runtime must refuse this stale view.
 h.setLaunch(id=>Promise.resolve().then(()=>h.realLaunch(id)));h.state={...h.state,selectedObjects:[{kind:'structure',id:h.f.computer.id}]};
 rows=nativeSpecialRows(h.state,h.actions);await rows.flatMap(r=>r.controls??[]).find(c=>c.id==='special-ship-launch298')!.onActivate();
 const sensor=h.root.structures.find(s=>s.id===h.f.sensors.id)!;expect(sensor).toBeDefined();
 expect(damageStructure(h.root,sensor,structureMaxHp(sensor),'bullet')).toBe(true);const damaged=whole(h.root);
 await control(h.page,'ship-launch-confirm298').onActivate();
 expect(h.page?.rows.find(r=>r.id==='ship-launch-error')?.label).toContain('Pièces manquantes');
 expect(control(h.page,'ship-launch-confirm298').disabled).toBe(false);expect(h.closed).toEqual([]);expect(h.command).not.toHaveBeenCalled();
 expect(whole(h.root)).toBe(damaged);expect(readAdoptedShipCredits298(h.state.world,h.state.campaign,true)).toBeUndefined();
});

test('only an adopted public credits projection opens the modal; current World wins over stale summary and mapless replacement invalidates old callbacks',()=>{
 const h=host(),id=h.depart(),raw=whole(h.root),summary=campaignOnlySummary(h.root);
 expect(Object.hasOwn(summary,'escapedShips298')).toBe(false);expect(summary.escapedShipsSummary298?.credits?.id).toBe(id);
 const first=h.page!;expect(first.closable).toBe(false);expect(first.rows.some(r=>r.label===h.f.actor.name)).toBe(true);
 const fresh=declaredReadyShip298(),encoder=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder();
 const adopted=decoder.adopt(structuredClone(encoder.encode(fresh.world,0,0,true)));expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('No current World');
 // An intentionally STALE public CampaignSummary is supplied beside a real
 // different adopted World; it must never be used as a credits fallback.
 h.state={...h.state,world:adopted.world,campaign:summary,epoch:2};
 expect(readAdoptedShipCredits298(h.state.world,h.state.campaign,true)).toBeUndefined();expect(h.sync()).toBeUndefined();
 first.onCancel?.();expect(h.terminal.closing).toBe(false);expect(h.continued).not.toHaveBeenCalled();
 // Declared mapless UI host adopts the real producer's summary. This is a
 // reader/controller contract, not a CampaignOnly transport capability grant.
 h.state={...h.state,world:undefined,campaign:summary,epoch:3};const mapless=h.sync()!;
 expect(mapless.rows.some(r=>r.label===h.f.actor.name)).toBe(true);expect(mapless).not.toBe(first);
 h.state={...h.state,epoch:4};const replaced=h.sync()!;mapless.onCancel?.();expect(h.terminal.closing).toBe(false);expect(replaced).not.toBe(mapless);
 expect(h.launch).not.toHaveBeenCalled();expect(h.continued).not.toHaveBeenCalled();expect(whole(h.root)).toBe(raw);
});

test('actual Escape and Continue start one 3s Single transition, preserve refusal/retry and wait for adoption without rebuilding pages per frame',async()=>{
 const h=host(),id=h.depart(),raw=whole(h.root),timer=vi.spyOn(globalThis,'setTimeout');
 // Constructor-free real Stage keyDown/dismiss prototype, existing convention.
 // Only keyboard/gesture surfaces are declared; no renderer or GPU is made.
 const fallback=vi.fn(),gesture=vi.fn(),activated=vi.fn();
 const stage=Object.assign(Object.create(NativeStage.prototype),{editor:undefined,dropdown:undefined,paintDrag:null,scrollbarDrag:null,regionDrag:null,activationSerial:0,page:h.page,
  gesture,swallow:vi.fn(),options:{onEscape:fallback,onActivate:activated}});
 stage.dismissPage();expect(h.terminal.closing).toBe(false);expect(fallback).not.toHaveBeenCalled();
 let stale=true;h.setContinue(departureId=>Promise.resolve().then(()=>{const result=h.realContinue(departureId,stale);return result;}));
 stage.keyDown({key:'Escape',repeat:false});stage.keyDown({key:'Escape',repeat:true});
 expect(gesture).toHaveBeenCalledTimes(1);expect(activated).toHaveBeenCalledExactlyOnceWith('page:cancel');expect(h.terminal.closing).toBe(true);
 const closingPage=h.page,shows=h.shown.length,reads=h.readState.mock.calls.length;
 h.setPresent(false);h.terminal.frame(600);expect(h.continued).not.toHaveBeenCalled();h.setPresent(true);
 h.terminal.frame(60);for(let n=0;n<10;n++)h.terminal.frame(.25);
 expect(h.continued).not.toHaveBeenCalled();expect(h.page).toBe(closingPage);expect(h.shown).toHaveLength(shows);expect(h.readState).toHaveBeenCalledTimes(reads);
 h.terminal.frame(.25);await flush();
 expect(h.continued).toHaveBeenCalledExactlyOnceWith(id);expect(h.terminal.closing).toBe(false);
 expect(h.page?.rows.find(r=>r.id==='ship-credits-error')?.label).toContain('périmé');expect(whole(h.root)).toBe(raw);
 stale=false;await control(h.page,'ship-credits-continue298').onActivate();expect(h.terminal.closing).toBe(true);
 const retryPage=h.page,retryShows=h.shown.length;for(let n=0;n<11;n++)h.terminal.frame(.25);
 expect(h.continued).toHaveBeenCalledTimes(1);expect(h.page).toBe(retryPage);expect(h.shown).toHaveLength(retryShows);
 h.terminal.frame(.25);await flush();expect(h.continued).toHaveBeenCalledTimes(2);expect(h.terminal.closing).toBe(false);
 // A successful real authority reply cleared Raw credits. The UI continues to
 // show its old adopted public screen until a new Snapshot really arrives.
 expect(h.root.escapedShips298?.credits).toBeNull();expect(h.page?.id).toBe(retryPage?.id);
 expect(control(h.page,'ship-credits-continue298').disabled).toBe(true);expect(h.sync()?.id).toBe(retryPage?.id);
 h.state={...h.state,world:h.publicWorld()};expect(h.sync()).toBeUndefined();expect(h.page).toBeUndefined();
 const after=whole(h.root);h.terminal.frame(999);expect(whole(h.root)).toBe(after);expect(h.continued).toHaveBeenCalledTimes(2);expect(timer).not.toHaveBeenCalled();expect(fallback).not.toHaveBeenCalled();
});
