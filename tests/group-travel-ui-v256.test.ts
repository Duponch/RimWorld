import {worldTargetChoices263,createWorldTargetConfirmation263} from '../src/ui/world-target-ui-263';
import * as targetAdmission263 from '../src/sim/world-target-access-263';
import {prepareGroupSplit,commitGroupReorganization} from '../src/sim/group-reorganization';
import {groupEntryActions} from '../src/sim/world-map-authority';
import {createGroupAdapters} from '../src/ui/group-adapter';
import {emptyGroupLedger} from '../src/sim/group-loading';
import {travelGroupLabel256,travelElsewhereColonists256} from '../src/ui/group-travel-readers-256';
import {afterEach,expect,test,vi} from 'vitest';
import {createGroupPanel,type GroupPanelFacts,type GroupPanelAdapters,type GroupPanelSnapshot} from '../src/ui/group-panel';
import {createGroupReorganizationPanel256,groupSplitCommand256,groupMergeCommand256} from '../src/ui/group-reorganization-panel-256';
import {createScenarioWorld} from '../src/sim/new-game';
import {generatePlanet,planetHomeInput} from '../src/sim/planet-generation';
import {adultAgeTicks} from '../src/sim/animal-life';
import type {WildAnimal} from '../src/sim/wildlife-state';
import {reorganizationCamp256} from './helpers/group-reorganization-v256';
import {readGroupPanelSnapshot} from '../src/ui/group-adapter';
import {registeredMapPresentation,campaignOnlySummary} from '../src/sim/world-map-presentation';
function projectedSnapshot256(w:import('../src/sim/types').World){const view=registeredMapPresentation(w);if(!view)throw Error('Declared UI fixture has no selected actual map');const snapshot=readGroupPanelSnapshot(view);if(!snapshot)throw Error('Missing confirmed group projection');return snapshot;}
let choosePlanetDOM263:((id:number)=>void)|undefined;
vi.mock('../src/ui/planet-view',()=>({createPlanetView:(_host:HTMLElement,onSelect:(id:number)=>void)=>{choosePlanetDOM263=onSelect;return {setPlanet(){},setOverlay(){},setVisible(){},dispose(){},focusTile(){}};},planetTileLabel:()=> 'Destination'}));
class NodeFixture {
  children:NodeFixture[]=[];parentElement:NodeFixture|null=null;dataset:Record<string,string>={};style:Record<string,string>={};
  attributes=new Map<string,string>();listeners=new Map<string,Array<(event:Record<string,unknown>)=>void>>();
  open=false;showModal(){this.open=true;}close(){this.open=false;}
  get ownerDocument(){return document;}get isConnected(){return this.parentElement!==null;}focus(){}
  onclick:((event:Record<string,unknown>)=>void)|null=null;
  className='';type='';value='';hidden=false;disabled=false;readOnly=false;checked=false;tabIndex=0;
  private text='';constructor(readonly tag='div'){}
  set textContent(text:string){this.text=text;this.replaceChildren();}get textContent():string{return this.text+this.children.map(c=>c.textContent).join(' ');}
  set innerHTML(_value:string){throw Error('Snapshot strings must remain literal.');}
  append(...nodes:NodeFixture[]){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  insertBefore(node:NodeFixture,before:NodeFixture|null){node.remove();node.parentElement=this;const index=before?this.children.indexOf(before):-1;if(index<0)this.children.push(node);else this.children.splice(index,0,node);}
  replaceChildren(...nodes:NodeFixture[]){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;}
  setAttribute(key:string,value:string){this.attributes.set(key,value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase())]=value;}
  getAttribute(key:string){return this.attributes.get(key)??null;}hasAttribute(key:string){return this.attributes.has(key);}removeAttribute(key:string){this.attributes.delete(key);}
  querySelectorAll(selector:string):NodeFixture[]{if(selector!=='*')throw Error('Only node inventory is used by the SVG view.');return this.children.flatMap(c=>[c,...c.querySelectorAll('*')]);}
  querySelector(selector:string):NodeFixture|null {if(selector!=='h3')throw Error('Unexpected fixture selector '+selector);return this.querySelectorAll('*').find(n=>n.tag===selector)??null;}
  get options():NodeFixture[]{return this.children.filter(n=>n.tag==='option');}
  addEventListener(type:string,listener:(event:Record<string,unknown>)=>void){const listeners=this.listeners.get(type)??[];listeners.push(listener);this.listeners.set(type,listeners);}
  fire(type:string,event:Record<string,unknown>={}){const e={target:this,...event};if(type==='click')this.onclick?.(e);for(const listener of this.listeners.get(type)??[])listener(e);}
}
function dom(){
  const documentFixture={activeElement:null as NodeFixture|null,createElement:(tag:string)=>new NodeFixture(tag),createElementNS:(_ns:string,tag:string)=>new NodeFixture(tag),createTextNode:(text:string)=>{const node=new NodeFixture('#text');node.textContent=text;return node;}};
  vi.stubGlobal('document',documentFixture);vi.stubGlobal('Element',NodeFixture);vi.stubGlobal('HTMLElement',NodeFixture);
  vi.stubGlobal('Option',class extends NodeFixture {constructor(label:string,value:string){super('option');this.textContent=label;this.value=value;}});
  vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
  return {host:new NodeFixture(),documentFixture};
}

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();choosePlanetDOM263=undefined;});
const all=(host:NodeFixture)=>host.querySelectorAll('*');
const find=(host:NodeFixture,key:string)=>all(host).find(n=>Object.hasOwn(n.dataset,key))!;
function chooseInput(row:NodeFixture){const input=all(row).find(n=>n.tag==='input'&&n.type==='checkbox'&&/^(Choisir|Charger) /.test(n.getAttribute('aria-label')??''));if(!input)throw Error('Actual labelled person/animal/pack choice absent');return input;}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
/** Declared transport-only witness: relationship knowledge is deliberately
 * broader than the confirmed spawned-colonist roster. No casket is opened,
 * owner allocated, map generated or campaign history claimed by this fixture. */
test('other-map label ignores sealed/foreign social knowledge and follows only actual map colonist summaries',()=>{
 const {host}=dom(),f=setup(),remote={id:f.world.nextId++,name:'Veilleur provisoire'},held={id:f.world.nextId++,name:'Dormeur inconnu'},foreign={id:f.world.nextId++,name:'Interlocuteur étranger'};
 f.world.campaignPeople=[remote,held,foreign].map(p=>({...p,status:'away' as const}));
 const map=(id:number,pawns:{id:number;name:string}[]):import('../src/sim/world-map-state').CampaignMapSummary=>({id,tile:id,kind:'camp',createdAt:0,pawnCount:pawns.length,selected:id===0,actions:{view:{ok:true},settle:{ok:false},abandon:{ok:true}},abandonConsequences:{pawns,groundItems:0,structures:0}});
 f.snapshot.campaign={revision:2,activeMapId:0,rootMapId:0,campaignSeed:f.world.seed,mapSize:{width:32,height:32},maxSettlements:1,selectedGroupId:null,maps:[map(0,[f.world.pawns[0]!]),map(1,[remote])],groups:[],groupLosses:[],lossContexts:[],lostMemories:[],incidents:[]};
 const before=JSON.stringify(f.snapshot),ui=createGroupPanel(host as unknown as HTMLElement,f.adapters);ui.update(f.snapshot);
 expect(travelElsewhereColonists256(f.snapshot)).toEqual([remote]);
 const label=find(host,'campaignElsewhere');expect(label.textContent).toBe('Sur les autres cartes, indisponibles ici : Veilleur provisoire.');
 expect(label.textContent).not.toContain(held.name);expect(label.textContent).not.toContain(foreign.name);expect(JSON.stringify(f.snapshot)).toBe(before);expect(f.adapters.send).not.toHaveBeenCalled();
 // Same social knowledge, but the real map roster changed: no stale names.
 f.snapshot.campaign.maps[1]!.abandonConsequences.pawns=[];ui.update(f.snapshot);expect(label.textContent).toBe('');
 delete f.snapshot.campaign;expect(travelElsewhereColonists256(f.snapshot)).toEqual([]);ui.dispose();
});
test('other-map reader never consults generic social knowledge and excludes actors already owned by the current map',()=>{
 const f=setup();Object.defineProperty(f.world,'campaignPeople',{get(){throw Error('Social knowledge is not a map colonist roster');}});
 expect(travelElsewhereColonists256(f.snapshot)).toEqual([]);
 const current=f.world.pawns[0]!;f.snapshot.campaign={revision:2,activeMapId:0,rootMapId:0,campaignSeed:f.world.seed,mapSize:{width:32,height:32},maxSettlements:1,selectedGroupId:null,maps:[{id:1,tile:1,kind:'camp',createdAt:0,pawnCount:1,selected:false,actions:{view:{ok:true},settle:{ok:false},abandon:{ok:true}},abandonConsequences:{pawns:[{id:current.id,name:current.name}],groundItems:0,structures:0}}],groups:[],groupLosses:[],lossContexts:[],lostMemories:[],incidents:[]};
 expect(travelElsewhereColonists256(f.snapshot)).toEqual([]);
});
function setup(){
 const world=createScenarioWorld(214,32);world.planet=generatePlanet(world.seed,planetHomeInput(world),world.tick);
 const a:WildAnimal={id:world.nextId++,species:'muffalo',sex:'female',ageTicks:adultAgeTicks('muffalo'),x:4,z:4,food:1,rest:1,state:'idle',path:[],nextDecision:world.tick,domestic:{since:world.tick,care:'best',tameness:1,nextDecay:world.tick+100}};
 world.wildlife={profile:'biome-fauna-v2',rng:1,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};
 const pack={building:{id:world.nextId++,kind:'bedroll' as const,x:5,z:4,orientation:0 as const,footprint:'standard' as const,material:'cloth' as const,quality:'normal' as const},owner:{type:'ground' as const,x:5,z:4}};world.packed.push(pack);
 const actions=Object.fromEntries((['adopt','start','cancel','pause','route','return','buy','sell','unload']as const).map(k=>[k,{ok:true}]))as GroupPanelFacts['actions'];
 const facts:GroupPanelFacts={originTile:world.planet.homeTile,originLabel:'Foyer',maximumSources:64,mass:null,confirmedRoute:[],actions,trade:null,candidates:world.pawns.map(pawn=>({pawn,ok:true})),sources:[],animals:[{animal:a,ok:true}],bedrolls:[{pack,ok:true}]};
 const adapters:GroupPanelAdapters={capture:()=>facts,previewPlan:vi.fn<GroupPanelAdapters['previewPlan']>(()=>({ok:true,route:[],carriers:[],mass:{grams:2500,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[]}})),previewRoute:()=>({ok:false,reason:'Pas de route'}),quoteTrade:()=>({ok:false,reason:'Pas de devis'}),send:vi.fn(async()=>{})};
 const snapshot:GroupPanelSnapshot={world,planet:world.planet,losses:[],originMapId:0};return {world,a,pack,facts,adapters,snapshot};
}
test('formation forwards actual human, animal and whole pack IDs; unavailable choices retain draft until explicit cleanup',()=>{
 const {host}=dom(),f=setup(),before=JSON.stringify(f.world),ui=createGroupPanel(host as unknown as HTMLElement,f.adapters);ui.update(f.snapshot);
 const human=chooseInput(find(host,'groupMember')),animal=chooseInput(find(host,'groupAnimal')),pack=chooseInput(find(host,'groupBedroll'));
 for(const input of[human,animal,pack]){input.checked=true;input.fire('change');}
 const preview=all(host).find(n=>n.dataset.groupPreview==='formation')!;preview.fire('click');
 expect(f.adapters.previewPlan).toHaveBeenLastCalledWith(f.snapshot,f.facts,expect.objectContaining({animalIds:[f.a.id],packedIds:[f.pack.building.id]}));
 expect(find(host,'groupAnimal').textContent).toContain('Nutrition');expect(find(host,'groupBedroll').textContent).toContain('2,5 kg');expect(host.textContent).not.toContain('#'+f.a.id);expect(JSON.stringify(f.world)).toBe(before);
 f.facts.animals=[{animal:f.a,ok:false,reason:'Animal réservé'}];f.facts.bedrolls=[];ui.update(f.snapshot);expect(animal.checked).toBe(true);expect(host.textContent).toContain('demandent une correction');
 find(host,'groupDraftCleanup').fire('click');preview.fire('click');expect(f.adapters.previewPlan).toHaveBeenLastCalledWith(f.snapshot,f.facts,expect.objectContaining({animalIds:[],packedIds:[]}));ui.dispose();
});
test('prospective formation has no obsolete eight-human UI cap and does not recalculate a preview on snapshot refresh',()=>{
 const {host}=dom(),f=setup(),first=f.world.pawns[0]!;while(f.world.pawns.length<9)f.world.pawns.push({...structuredClone(first),id:f.world.nextId++,name:'Voyageur '+f.world.pawns.length});f.facts.candidates=f.world.pawns.map(pawn=>({pawn,ok:true}));
 const ui=createGroupPanel(host as unknown as HTMLElement,f.adapters);ui.update(f.snapshot);for(const row of all(host).filter(n=>n.dataset.groupMember!==undefined)){const c=chooseInput(row);c.checked=true;c.fire('change');}all(host).find(n=>n.dataset.groupPreview==='formation')!.fire('click');
 expect(vi.mocked(f.adapters.previewPlan).mock.calls[0]![2].memberIds).toHaveLength(9);ui.update(f.snapshot);expect(f.adapters.previewPlan).toHaveBeenCalledTimes(1);ui.dispose();
});
test('split builder transfers only real selected inventory/animals/packs and refuses stale quantity or an ownerless half without mutation',()=>{
 const f=reorganizationCamp256(),s=projectedSnapshot256(f.w);const pile=f.g.items.find(p=>p.owner.type==='inventory')!,before=JSON.stringify(f.w),selection={people:new Set([f.g.members[1]!.id]),animals:new Set<number>(),packs:new Set<number>(),inventory:new Map([[pile.id,'1']])};
 expect(groupSplitCommand256(s,selection)).toMatchObject({groupId:f.g.id,memberIds:[f.g.members[1]!.id],inventory:[{pileId:pile.id,quantity:1}],animalIds:[],packedIds:[]});
 selection.inventory.set(pile.id,String(pile.quantity+1));expect(()=>groupSplitCommand256(s,selection)).toThrow('quantité');selection.inventory.clear();selection.people.clear();expect(()=>groupSplitCommand256(s,selection)).toThrow('Chaque caravane');expect(JSON.stringify(f.w)).toBe(before);
});
test('dialogue opens only after actual pause ACK; cancel emits no command; a replacement cancels an outstanding opening',async()=>{
 const {host}=dom(),f=reorganizationCamp256(),s=projectedSnapshot256(f.w);let resolve!:()=>void;const pause=vi.fn(()=>new Promise<void>(yes=>{resolve=yes;})),send=vi.fn(async()=>true),lock=vi.fn(),failure=vi.fn();
 const ui=createGroupReorganizationPanel256(host as unknown as HTMLElement,{current:()=>s,pause,send,blocked:()=>undefined,onLock:lock,onPauseFailure:failure});
 const pending=ui.open('split'),dialog=all(host).find(n=>n.tag==='dialog')!;expect(dialog.open).toBe(false);expect(pause).toHaveBeenCalledTimes(1);resolve();await pending;expect(dialog.open).toBe(true);
 all(host).find(n=>n.tag==='button'&&n.textContent==='Annuler')!.fire('click');expect(dialog.open).toBe(false);expect(send).not.toHaveBeenCalled();expect(pause).toHaveBeenCalledTimes(1);
 const late=ui.open('split');ui.reset();resolve();await late;expect(dialog.open).toBe(false);expect(failure).not.toHaveBeenCalled();ui.dispose();
});
test('dialogue refusal preserves split draft; ACK sends once and closes with no speed-resume call',async()=>{
 const {host}=dom(),f=reorganizationCamp256(),s=projectedSnapshot256(f.w),pause=vi.fn(async()=>{}),send=vi.fn(async()=>false);const ui=createGroupReorganizationPanel256(host as unknown as HTMLElement,{current:()=>s,pause,send,blocked:()=>undefined,onLock:()=>{},onPauseFailure:()=>{}});await ui.open('split');
 const check=all(host).find(n=>n.tag==='input'&&n.type==='checkbox')!;check.checked=true;check.fire('change');const confirm=all(host).find(n=>n.tag==='button'&&n.textContent==='Confirmer')!;expect(confirm.disabled).toBe(false);confirm.fire('click');await flush();expect(all(host).find(n=>n.tag==='dialog')!.open).toBe(true);expect(check.checked).toBe(true);send.mockResolvedValue(true);confirm.fire('click');await flush();expect(send).toHaveBeenCalledTimes(2);expect(all(host).find(n=>n.tag==='dialog')!.open).toBe(false);expect(pause).toHaveBeenCalledTimes(1);ui.dispose();
});
test('merge keeps selected command order and delegates proximity instead of using a tile-distance shortcut',()=>{
 const f=reorganizationCamp256(),s=projectedSnapshot256(f.w);if(!s.campaign)throw Error('Missing confirmed campaign');const first=s.campaign.groups[0]!;s.campaign={...s.campaign,groups:[first,{...first,id:99,state:{...f.g,id:99,tile:f.g.tile+1}}]};const before=JSON.stringify(s);
 expect(groupMergeCommand256(s,[99,f.g.id])).toEqual({type:'group-merge',groupIds:[99,f.g.id]});expect(()=>groupMergeCommand256(s,[99,99])).toThrow();expect(JSON.stringify(s)).toBe(before);
});

test('preparing caravan labels use actual known members and follow renamed confirmed names without exposing IDs',()=>{
 const f=setup(),a=f.world.pawns[0]!,b=f.world.pawns[1]!,g={id:1,startedAt:f.world.tick,destination:0,ledger:emptyGroupLedger(),phase:'unloading' as const,memberIds:[a.id],pendingPileIds:[]};
 expect(travelGroupLabel256(g,[a,b])).toContain(a.name);expect(travelGroupLabel256({...g,id:2,memberIds:[b.id]},[a,b])).toContain(b.name);
 const changed={...a,name:'Nouveau nom <literal>'};expect(travelGroupLabel256(g,[changed,b])).toContain(changed.name);expect(travelGroupLabel256(g,[changed,b])).not.toContain('#'+a.id);
});

/** Declared UI-only location preparation, no trip or Camp generation claim.
 * The real Split command creates the stationary child, then the real worker
 * projection supplies permissions/group selection to the panel. */
function preparedStationaryEntry256(emptyTile:boolean){
 const f=reorganizationCamp256(),planet=f.w.planet;if(!planet||planet.revision===3)throw Error('This bounded UI fixture uses its historical real planet');
 if(emptyTile){
  let found=false;
  for(const tile of planet.tiles){f.g.tile=tile.id;f.g.destination=tile.id;f.g.route=[tile.id];if(groupEntryActions(f.w,f.g.id).camp.ok){found=true;break;}}
  if(!found)throw Error('Declared fixture has no admissible empty tile');
 }
 const prepared=prepareGroupSplit(f.w,{type:'group-split',groupId:f.g.id,memberIds:[f.members[1]!.id],inventory:[]});
 if(prepared.kind!=='ready')throw Error(prepared.reason);
 expect(commitGroupReorganization(prepared.plan)).toEqual({ok:true});
 const child=prepared.plan.created[0]!.state;
 if(!('members'in child)||child.phase!=='stationary')throw Error('Real split did not produce the stationary owner');
 f.w.worldGroups!.selectedGroupId=child.id;
 return {world:f.w,child,snapshot:projectedSnapshot256(f.w)};
}

test('stationary split owner exposes a permitted Camp action and sends only its confirmed group ID once until ACK',async()=>{
 const {host}=dom(),f=preparedStationaryEntry256(true);let resolve!:()=>void;
 const send=vi.fn(()=>new Promise<void>(yes=>{resolve=yes;}));
 const ui=createGroupPanel(host as unknown as HTMLElement,createGroupAdapters({blocked:()=>undefined,send}));
 const before=JSON.stringify(f.world);ui.update(f.snapshot);
 expect(f.snapshot.entryActions?.camp).toEqual(groupEntryActions(f.world,f.child.id).camp);
 expect(f.snapshot.entryActions?.camp.ok).toBe(true);
 const camp=all(host).find(n=>n.dataset.siteAction==='camp')!;
 expect(camp.hidden).toBe(false);expect(camp.getAttribute('aria-disabled')).toBe('false');
 camp.fire('click');camp.fire('click');
 expect(send).toHaveBeenCalledTimes(1);expect(send).toHaveBeenCalledWith({type:'group-enter',groupId:f.child.id,mode:'camp'});
 expect(JSON.stringify(f.world)).toBe(before);
 resolve();await flush();ui.dispose();
});

test('stationary owner on an existing map keeps the Camp action refused and emits no entry command',()=>{
 const {host}=dom(),f=preparedStationaryEntry256(false),send=vi.fn(async()=>{});
 const ui=createGroupPanel(host as unknown as HTMLElement,createGroupAdapters({blocked:()=>undefined,send}));
 ui.update(f.snapshot);expect(f.snapshot.entryActions?.camp.ok).toBe(false);
 const camp=all(host).find(n=>n.dataset.siteAction==='camp')!;
 expect(camp.hidden).toBe(false);expect(camp.getAttribute('aria-disabled')).toBe('true');
 camp.fire('click');expect(send).not.toHaveBeenCalled();ui.dispose();
});

/** Declared group-only presentation of the existing stationary owner. This
 * exercises no map removal, map generation or acquired3408 chronology. */
test('group-only caravan with zero local source slots keeps its confirmed selector and permitted entry action',async()=>{
 const {host}=dom(),f=preparedStationaryEntry256(true),snapshot=readGroupPanelSnapshot(campaignOnlySummary(f.world));
 if(!snapshot||!snapshot.group)throw Error('Missing declared group-only owner projection');
 expect(snapshot.campaign?.activeMapId).toBeNull();expect(snapshot.world.piles).toEqual([]);
 const send=vi.fn(async()=>{}),adapters=createGroupAdapters({blocked:()=>undefined,send});
 expect(adapters.capture(snapshot).maximumSources).toBe(0);
 const before=JSON.stringify(f.world),projectedBefore=JSON.stringify(snapshot),ui=createGroupPanel(host as unknown as HTMLElement,adapters);ui.update(snapshot);
 const error=all(host).find(n=>n.className==='group-error')!,selector=all(host).find(n=>n.getAttribute('aria-label')==='Choisir une caravane')!;
 expect(error.hidden).toBe(true);expect(selector.children.map(n=>n.value)).toEqual(['',...f.world.worldGroups!.groups.map(r=>String(r.state.id))]);expect(selector.value).toBe(String(f.child.id));expect(selector.children[0]!.disabled).toBe(true);
 const camp=all(host).find(n=>n.dataset.siteAction==='camp')!;expect(camp.hidden).toBe(false);expect(camp.getAttribute('aria-disabled')).toBe('false');
 expect(send).not.toHaveBeenCalled();camp.fire('click');await flush();expect(send).toHaveBeenCalledExactlyOnceWith({type:'group-enter',groupId:f.child.id,mode:'camp'});
 expect(JSON.stringify(f.world)).toBe(before);expect(JSON.stringify(snapshot)).toBe(projectedBefore);ui.dispose();
});

/** Prepared transport/DOM witness only. The real split fixture supplies the
 * group; the arrival field is a scalar projection presented to the UI, not a
 * claim of a travelled/reformed World or a test of SIM order acceptance. */
test('arrival dropdown is explicitly a new-order draft while the confirmed enter intent stays visible and unchanged',()=>{
 const {host}=dom(),f=preparedStationaryEntry256(true),snapshot=f.snapshot;
 const confirmed=snapshot.campaign!.groups.find(g=>g.id===f.child.id)!;
 confirmed.arrival261={tile:f.child.destination,action:{kind:'enter',mapId:0}};
 const send=vi.fn(async()=>{}),ui=createGroupPanel(host as unknown as HTMLElement,createGroupAdapters({blocked:()=>undefined,send})),before=JSON.stringify(snapshot);
 ui.update(snapshot);
 const saved=find(host,'groupArrivalConfirmed'),draft=all(host).find(n=>n.tag==='select'&&n.getAttribute('aria-label')==='Action à l’arrivée du nouvel ordre')!;
 expect(saved.hidden).toBe(false);expect(saved.textContent).toContain('Ordre d’arrivée confirmé : entrer sur Foyer');expect(draft.parentElement!.textContent).toContain('Nouvel ordre (non confirmé)');
 draft.value='none';draft.fire('change');ui.update(snapshot);
 expect(draft.value).toBe('none');expect(saved.textContent).toContain('Ordre d’arrivée confirmé : entrer sur Foyer');expect(confirmed.arrival261).toEqual({tile:f.child.destination,action:{kind:'enter',mapId:0}});expect(JSON.stringify(snapshot)).toBe(before);expect(send).not.toHaveBeenCalled();
 ui.resetForReplacement();expect(saved.hidden).toBe(true);expect(saved.textContent).toBe('');ui.dispose();
});

/** DOM ADAPTATION ONLY. Reuse the existing stationary UI fixture and actual
 * modal/panel/choice readers. The independent geographic SIM admission alone
 * is stubbed successful; route preview is a scalar UI stub, send is never
 * applied. No World is played, actual save rerouted or faction changed. */
function attackConfirmationDOM263(kind:'neutral'|'ally',planned=false,send=vi.fn(async()=>{})){
 const {host}=dom(),f=preparedStationaryEntry256(true),tile=f.child.tile;
 const admission=vi.spyOn(targetAdmission263,'worldTargetActions263').mockReturnValue({ok:true});
 const factions:NonNullable<typeof f.snapshot.world.worldFactions>={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:1,nextFactionId:3,nextSettlementId:5,factions:[{id:1,def:'PlayerColony',hidden:false,name:'Projection joueur',randomKey:1,colorFromSpectrum:1,leaderOwnerId:null},{id:2,def:'OutlanderCivil',hidden:false,name:'Projection étrangère',randomKey:2,colorFromSpectrum:2,leaderOwnerId:null}],relations:[{aId:1,bId:2,goodwill:kind==='ally'?80:0,kind}],settlements:[{id:4,factionId:2,tile,name:'Établissement <literal>',postId:null}],leaders:[]};
 const snapshot:GroupPanelSnapshot={...f.snapshot,world:{...f.snapshot.world,schemaVersion:264 as typeof f.snapshot.world.schemaVersion,worldFactions:factions}};
 const base=createGroupAdapters({blocked:()=>undefined,send}),captured=base.capture(f.snapshot),facts={...captured,actions:{...captured.actions,route:{ok:true}}};
 const previewRoute=vi.fn<GroupPanelAdapters['previewRoute']>(()=>({ok:true,route:[tile],durationCore:0})),adapters:GroupPanelAdapters={...base,capture:()=>facts,previewRoute},ui=createGroupPanel(host as unknown as HTMLElement,adapters);
 const before=JSON.stringify(snapshot),worldBefore=JSON.stringify(f.world),relationsBefore=JSON.stringify(factions.relations);ui.update(snapshot);
 expect(all(host).find(n=>n.className==='group-error')!.hidden).toBe(true);expect(worldTargetChoices263(snapshot.world,tile)).toContainEqual(expect.objectContaining({key:'attack:4',confirmAttack:true,target:{kind:'attack-settlement',settlementId:4,factionId:2,confirmed:true}}));
 let order:NodeFixture;
 if(planned){
  expect(choosePlanetDOM263).toBeTypeOf('function');choosePlanetDOM263!(tile);const draft=all(host).find(n=>n.tag==='select'&&n.getAttribute('aria-label')==='Action à l’arrivée du nouvel ordre')!;draft.value='attack:4';draft.fire('change');all(host).find(n=>n.dataset.groupPreview==='route')!.fire('click');order=all(host).find(n=>n.dataset.groupAction==='route')!;
 }else order=all(host).find(n=>n.dataset.worldTarget==='attack:4')!;
 expect(order.getAttribute('aria-disabled')).toBe('false');
 const unchanged=()=>{expect(JSON.stringify(snapshot)).toBe(before);expect(JSON.stringify(f.world)).toBe(worldBefore);expect(JSON.stringify(factions.relations)).toBe(relationsBefore);};
 const modal=()=>all(host).find(n=>n.tag==='dialog'&&n.getAttribute('aria-label')==='Confirmer l’attaque de cet établissement'&&n.open)!;
 return {host,f,snapshot,tile,send,ui,order,modal,unchanged,admission,previewRoute};
}
const modalAction263=(dialog:NodeFixture,label:string)=>all(dialog).find(n=>n.tag==='button'&&n.textContent===label)!;

test('DOM adaptation263: actual owned modal resolves Annuler, Escape cancel and Confirmer clicks',async()=>{
 const {host}=dom(),modal=createWorldTargetConfirmation263(host as unknown as HTMLElement);
 let pending=modal.ask('Cible <literal>'),dialog=all(host).find(n=>n.tag==='dialog'&&n.open)!;expect(dialog.textContent).toContain('Cible <literal>');modalAction263(dialog,'Annuler').fire('click');expect(await pending).toBe(false);expect(dialog.open).toBe(false);
 pending=modal.ask('Même cible');dialog=all(host).find(n=>n.tag==='dialog'&&n.open)!;const preventDefault=vi.fn();dialog.fire('cancel',{preventDefault});expect(await pending).toBe(false);expect(preventDefault).toHaveBeenCalledTimes(1);
 pending=modal.ask('Même cible');dialog=all(host).find(n=>n.tag==='dialog'&&n.open)!;modalAction263(dialog,'Confirmer l’attaque').fire('click');expect(await pending).toBe(true);expect(dialog.open).toBe(false);modal.close();
});

for(const [kind,planned]of [['neutral',false],['ally',true]]as const)test(`DOM adaptation263 ${kind}/${planned?'arrival-route':'target-button'}: waiting, Annuler and Escape send nothing and keep snapshot/order/relations exact`,async()=>{
 const f=attackConfirmationDOM263(kind,planned);try{
  f.order.fire('click');expect(f.modal()).toBeDefined();expect(f.send).not.toHaveBeenCalled();f.unchanged();modalAction263(f.modal(),'Annuler').fire('click');await flush();expect(f.send).not.toHaveBeenCalled();f.unchanged();
  f.order.fire('click');const dialog=f.modal();expect(dialog).toBeDefined();expect(f.send).not.toHaveBeenCalled();dialog.fire('cancel',{preventDefault:vi.fn()});await flush();expect(f.send).not.toHaveBeenCalled();f.unchanged();
 }finally{f.ui.dispose();}
});

for(const [kind,planned]of [['neutral',false],['ally',true]]as const)test(`DOM adaptation263 ${kind}/${planned?'arrival-route':'target-button'}: one accepted modal sends one confirmed order until ACK`,async()=>{
 let ack!:()=>void;const send=vi.fn(()=>new Promise<void>(resolve=>{ack=resolve;})),f=attackConfirmationDOM263(kind,planned,send);try{
  f.order.fire('click');const accept=modalAction263(f.modal(),'Confirmer l’attaque');expect(send).not.toHaveBeenCalled();f.unchanged();accept.fire('click');accept.fire('click');await flush();expect(send).toHaveBeenCalledExactlyOnceWith({type:'caravan-order',groupId:f.f.child.id,destination:f.tile,action:{kind:'attack-settlement',settlementId:4,factionId:2,confirmed:true}});f.unchanged();f.order.fire('click');await flush();expect(send).toHaveBeenCalledTimes(1);ack();await flush();f.unchanged();
 }finally{f.ui.dispose();}
});

test('DOM adaptation263: changed group or changed arrival draft refuses an accepted stale attack without command/faction mutation',async()=>{
 const direct=attackConfirmationDOM263('neutral');try{
  direct.order.fire('click');const dialog=direct.modal(),next={...direct.snapshot,group:{...direct.snapshot.group!,id:direct.f.child.id+1}} as GroupPanelSnapshot;direct.ui.update(next);modalAction263(dialog,'Confirmer l’attaque').fire('click');await flush();expect(direct.send).not.toHaveBeenCalled();direct.unchanged();expect(all(direct.host).find(n=>n.className==='group-error')!.textContent).toContain('choix de destination a changé');
 }finally{direct.ui.dispose();}
 const planned=attackConfirmationDOM263('ally',true);try{
  planned.order.fire('click');const dialog=planned.modal(),draft=all(planned.host).find(n=>n.tag==='select'&&n.getAttribute('aria-label')==='Action à l’arrivée du nouvel ordre')!;draft.value='none';draft.fire('change');modalAction263(dialog,'Confirmer l’attaque').fire('click');await flush();expect(planned.send).not.toHaveBeenCalled();planned.unchanged();expect(all(planned.host).find(n=>n.className==='group-error')!.textContent).toContain('choix de destination a changé');
 }finally{planned.ui.dispose();}
});
