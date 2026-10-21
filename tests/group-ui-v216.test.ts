import {afterEach,expect,test,vi} from 'vitest';
import {createGroupPanel,type GroupPanelAdapters,type GroupPanelFacts} from '../src/ui/group-panel.ts';
import {generatePlanet,planetHomeInput} from '../src/sim/planet-generation.ts';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {SimulationRequestError} from '../src/bridge/protocol.ts';
import {emptyGroupLedger} from '../src/sim/group-loading.ts';
import type {GroupPanelAction} from '../src/sim/group-panel-state.ts';
import type {GroupGiftQuote274} from '../src/sim/group-gift-state-274.ts';
import type {GroupState} from '../src/sim/group-state.ts';
import type {MaterialPile} from '../src/sim/types.ts';

/** Focus/identity/content and request boundaries only. Layout, native Tab and
 * actual pointer clipping belong to the composed browser route. */
class NodeFixture {
  children:NodeFixture[]=[];parentElement:NodeFixture|null=null;dataset:Record<string,string>={};style:Record<string,string>={};
  attributes=new Map<string,string>();listeners=new Map<string,Array<(event:Record<string,unknown>)=>void>>();
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
  fire(type:string,event:Record<string,unknown>={}){for(const listener of this.listeners.get(type)??[])listener({target:this,...event});}
}
function dom(){
  const documentFixture={activeElement:null as NodeFixture|null,createElement:(tag:string)=>new NodeFixture(tag),createElementNS:(_ns:string,tag:string)=>new NodeFixture(tag),createTextNode:(text:string)=>{const node=new NodeFixture('#text');node.textContent=text;return node;}};
  vi.stubGlobal('document',documentFixture);vi.stubGlobal('Element',NodeFixture);
  vi.stubGlobal('Option',class extends NodeFixture {constructor(label:string,value:string){super('option');this.textContent=label;this.value=value;}});
  vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
  return {host:new NodeFixture(),documentFixture};
}
function actualCivilianTile(world:import('../src/sim/types.ts').World):number {const tile=world.planet?.civilianTile;if(typeof tile!=='number'||!Number.isSafeInteger(tile))throw Error('Declared UI fixture requires its real civilian tile');return tile;}
function setup(){
  const world=createScenarioWorld(214,32);world.planet=generatePlanet(world.seed,planetHomeInput(world),world.tick);
  world.pawns[0]!.name='<img src=x> & Ada';
  const actions=Object.fromEntries((['adopt','start','cancel','pause','route','return','buy','sell','unload'] satisfies GroupPanelAction[]).map(k=>[k,{ok:true}])) as GroupPanelFacts['actions'];
  const facts:GroupPanelFacts={originTile:world.planet.homeTile,originLabel:'Foyer',maximumSources:64,mass:null,confirmedRoute:[],actions,trade:null,
    candidates:world.pawns.map(pawn=>({pawn,ok:true})),sources:[]};
  const adapters:GroupPanelAdapters={capture:vi.fn(()=>facts),previewPlan:vi.fn<GroupPanelAdapters['previewPlan']>((_snapshot,_facts,draft)=>({ok:true,route:[actualCivilianTile(world)],carriers:[],mass:{grams:0,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:draft.memberIds.map(pawnId=>({pawnId,grams:0,capacityGrams:35000}))}})),
    previewRoute:vi.fn<GroupPanelAdapters['previewRoute']>(()=>({ok:false,reason:'Aucun groupe.'})),quoteTrade:vi.fn<GroupPanelAdapters['quoteTrade']>(()=>({ok:false,reason:'Aucun comptoir.'})),send:vi.fn(()=>Promise.resolve()),inspectPresentPawn:vi.fn()};
  return {world,facts,adapters,snapshot:{world,planet:world.planet,losses:[],originMapId:0}};
}
const find=(host:NodeFixture,key:string,value?:string)=>host.querySelectorAll('*').find(n=>Object.hasOwn(n.dataset,key)&&(value===undefined||n.dataset[key]===value))!;
function chooseInput(row:NodeFixture){const input=row.querySelectorAll('*').find(n=>n.tag==='input'&&n.type==='checkbox'&&n.getAttribute('aria-label')?.startsWith('Choisir '));if(!input)throw Error('Actual labelled person choice absent');return input;}
afterEach(()=>vi.unstubAllGlobals());

test('opening and rotating the canonical globe changes no World, command or route query; confirmed row identity and literal names survive refresh',()=>{
  const {host,documentFixture}=dom(),{world,adapters,snapshot}=setup(),before=JSON.stringify(world),panel=createGroupPanel(host as unknown as HTMLElement,adapters);
  panel.update(snapshot);panel.setVisible(true);
  const svg=host.querySelectorAll('*').find(n=>n.tag==='svg')!,row=find(host,'groupMember',String(world.pawns[0]!.id)),checkbox=chooseInput(row);
  expect(svg.querySelectorAll('*').length+1).toBeLessThanOrEqual(512);expect(row.textContent).toContain('<img src=x> & Ada');
  let prevented=false;svg.fire('keydown',{key:'ArrowLeft',preventDefault(){prevented=true;}});expect(prevented).toBe(true);
  documentFixture.activeElement=checkbox;checkbox.checked=true;checkbox.fire('change');panel.update(snapshot);
  expect(find(host,'groupMember',String(world.pawns[0]!.id))).toBe(row);expect(documentFixture.activeElement).toBe(checkbox);expect(checkbox.checked).toBe(true);
  expect(adapters.previewPlan).not.toHaveBeenCalled();expect(adapters.previewRoute).not.toHaveBeenCalled();expect(adapters.send).not.toHaveBeenCalled();expect(JSON.stringify(world)).toBe(before);
  find(host,'groupPreview','formation').fire('click');expect(adapters.previewPlan).toHaveBeenCalledTimes(1);panel.update(snapshot);expect(adapters.previewPlan).toHaveBeenCalledTimes(1);
  panel.dispose();
});

test('a pending or unknown command locks double submission across snapshots until a validated replacement, while a host lock clears without solving routes',async()=>{
  const {host}=dom(),{adapters,snapshot}=setup();let reject!:(cause:unknown)=>void;
  adapters.send=vi.fn(()=>new Promise((_resolve,no)=>{reject=no;}));const panel=createGroupPanel(host as unknown as HTMLElement,adapters);panel.update(snapshot);
  const checkbox=chooseInput(find(host,'groupMember'));checkbox.checked=true;checkbox.fire('change');find(host,'groupPreview','formation').fire('click');
  const start=find(host,'groupAction','start');start.fire('click');start.fire('click');expect(adapters.send).toHaveBeenCalledTimes(1);expect(adapters.send).toHaveBeenCalledWith(expect.objectContaining({type:'group-start',originMapId:0}));
  panel.setRequestStatus({id:7,type:'command',state:'waiting',message:'Résultat encore inconnu.'});panel.update(snapshot);expect(start.getAttribute('aria-disabled')).toBe('true');
  reject(new SimulationRequestError('Arrêt pendant la commande.','unknown',true));await Promise.resolve();await Promise.resolve();
  panel.setRequestStatus({id:7,type:'command',state:'settled'});panel.update(snapshot);start.fire('click');expect(adapters.send).toHaveBeenCalledTimes(1);expect(host.textContent).toContain('Résultat de commande inconnu');
  panel.resetForReplacement();panel.update(snapshot);panel.setHostBlocked('Sauvegarde en cours.');expect(find(host,'groupPreview','formation').getAttribute('aria-disabled')).toBe('true');
  const calls=vi.mocked(adapters.previewPlan).mock.calls.length;panel.setHostBlocked(undefined);expect(find(host,'groupPreview','formation').getAttribute('aria-disabled')).toBe('false');expect(vi.mocked(adapters.previewPlan).mock.calls).toHaveLength(calls);
  panel.dispose();
});

test('a missing authoritative capture removes previous facts and closes mutations instead of keeping a stale globe or inventing stock',()=>{
  const {host}=dom(),{adapters,snapshot}=setup(),panel=createGroupPanel(host as unknown as HTMLElement,adapters);panel.update(snapshot);
  expect(find(host,'groupMember')).toBeDefined();vi.mocked(adapters.capture).mockImplementation(()=>{throw Error('Namespace indisponible.');});panel.update(snapshot);
  expect(find(host,'groupMember')).toBeUndefined();expect(host.textContent).toContain('Namespace indisponible');expect(find(host,'groupAction','start').getAttribute('aria-disabled')).toBe('true');
  expect(host.querySelectorAll('*').filter(n=>n.dataset.planetTile!==undefined)).toHaveLength(0);find(host,'groupAction','start').fire('click');expect(adapters.send).not.toHaveBeenCalled();panel.dispose();
});

test('two confirmed manifest rows sharing one source retain both porters instead of collapsing into a single pile row',()=>{
  const {host}=dom(),{world,facts,adapters,snapshot}=setup(),[a,b]=world.pawns;
  const sourceId=world.nextId++;
  world.piles.push({id:sourceId,kind:'textile',item:'cloth',quantity:75,owner:{type:'ground',x:a!.x,z:a!.z}});
  world.group={id:1,startedAt:world.tick,destination:actualCivilianTile(world),ledger:emptyGroupLedger(),phase:'loading',memberIds:[a!.id,b!.id],rendezvous:{x:a!.x,z:a!.z},
    meeting:[{pawnId:a!.id,cell:{x:a!.x,z:a!.z}},{pawnId:b!.id,cell:{x:b!.x,z:b!.z}}],cursor:0,
    manifest:[{pileId:sourceId,quantity:37,item:'cloth',carrierId:a!.id},{pileId:sourceId,quantity:38,item:'cloth',carrierId:b!.id}],
    exits:[{pawnId:a!.id,cell:null},{pawnId:b!.id,cell:null}]};
  facts.mass={grams:0,capacityGrams:70000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[{pawnId:a!.id,grams:0,capacityGrams:35000},{pawnId:b!.id,grams:0,capacityGrams:35000}]};
  const panel=createGroupPanel(host as unknown as HTMLElement,adapters);panel.update({...snapshot,group:world.group});
  const rows=find(host,'groupManifest').querySelectorAll('*').filter(n=>n.tag==='tbody')[0]!.children;
  expect(rows).toHaveLength(2);expect(rows[0]!.textContent).toContain(a!.name);expect(rows[1]!.textContent).toContain(b!.name);
  expect(rows[0]!.textContent).toContain('37');expect(rows[1]!.textContent).toContain('38');expect(rows.every(row=>!row.textContent.includes(`#${sourceId}`))).toBe(true);expect(adapters.send).not.toHaveBeenCalled();panel.dispose();
});


test('V391 mixed provision counts and nutrition follow the confirmed projection, without changing source identities or solving a route',()=>{
  const {host,documentFixture}=dom(),{world,facts,adapters,snapshot}=setup(),p=world.pawns[0]!;
  const source={id:world.nextId++,kind:'food' as const,item:'pemmican' as const,quantity:60,owner:{type:'ground' as const,x:p.x,z:p.z}};
  world.piles.push(source);facts.sources=[{pile:source,reserved:0,available:60}];
  facts.mass={grams:1080,capacityGrams:35000,rations:2,pemmicanUnits:60,provisionNutrition:480,byMember:[]};
  const before=JSON.stringify(world),panel=createGroupPanel(host as unknown as HTMLElement,adapters);panel.update(snapshot);
  const mass=find(host,'groupMass'),row=find(host,'groupPile',String(source.id)),input=row.children[3]!.children[0]!;
  expect(mass.textContent).toContain('2 repas de survie · 60 unités de pemmican · nutrition des rations et du pemmican 4,8');
  expect(mass.textContent).toContain('possédée');expect(mass.textContent).not.toMatch(/jour|autonomie/);
  documentFixture.activeElement=input;input.value='37';input.fire('input');
  facts.mass={...facts.mass,rations:1,pemmicanUnits:37,provisionNutrition:275};panel.update(snapshot);
  expect(find(host,'groupPile',String(source.id))).toBe(row);expect(documentFixture.activeElement).toBe(input);expect(input.value).toBe('37');
  expect(mass.textContent).toContain('1 repas de survie · 37 unités de pemmican · nutrition des rations et du pemmican 2,75');
  expect(adapters.send).not.toHaveBeenCalled();expect(adapters.previewPlan).not.toHaveBeenCalled();expect(adapters.previewRoute).not.toHaveBeenCalled();expect(JSON.stringify(world)).toBe(before);panel.dispose();
});

test('V391 draft nutrition is only the injected formation estimate, including an empty legacy projection',()=>{
  const {host}=dom(),{facts,adapters,snapshot}=setup();
  adapters.previewPlan=vi.fn(()=>({ok:true as const,route:[],carriers:[],mass:{grams:900,capacityGrams:35000,rations:1,pemmicanUnits:50,provisionNutrition:340,byMember:[]}}));
  const panel=createGroupPanel(host as unknown as HTMLElement,adapters);panel.update(snapshot);
  expect(find(host,'groupMass').textContent).toContain('Charge non calculée');
  find(host,'groupPreview','formation').fire('click');
  expect(find(host,'groupMass').textContent).toContain('1 repas de survie · 50 unités de pemmican · nutrition des rations et du pemmican 3,4');
  expect(find(host,'groupMass').textContent).toContain('estimation à vérifier au lancement');
  facts.mass={grams:0,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[]};panel.update(snapshot);
  expect(find(host,'groupMass').textContent).toContain('0 repas de survie · 0 unités de pemmican · nutrition des rations et du pemmican 0');
  expect(adapters.send).not.toHaveBeenCalled();panel.dispose();
});


test('a refused caravan selection restores the confirmed group, and replacement rebuilds even identical selector keys',async()=>{
 const {host}=dom(),{world,facts,adapters,snapshot}=setup(),pawn=world.pawns[0]!;
 facts.mass={grams:0,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[{pawnId:pawn.id,grams:0,capacityGrams:35000}]};
 const group={id:1,startedAt:world.tick,destination:actualCivilianTile(world),ledger:emptyGroupLedger(),phase:'loading' as const,memberIds:[pawn.id],rendezvous:{x:pawn.x,z:pawn.z},meeting:[{pawnId:pawn.id,cell:{x:pawn.x,z:pawn.z}}],cursor:0,manifest:[],exits:[{pawnId:pawn.id,cell:null}]};
 const other={...group,id:2};world.group=group;
 const campaign={revision:2 as const,campaignSeed:world.seed,mapSize:{width:32,height:32},groupLosses:[],lossContexts:[],lostMemories:[],activeMapId:0,rootMapId:0,maxSettlements:1 as const,selectedGroupId:1,maps:[],incidents:[],groups:[group,other].map(state=>({id:state.id,originMapId:0,localMapId:0,phase:state.phase,originTile:world.planet!.homeTile,filthPresent:!!world.filth,tile:world.planet!.homeTile,memberIds:state.memberIds,mass:null,context:{seed:world.seed,width:32,height:32,climate:world.climate,site:world.site,scenario:world.scenario},entryActions:{visit:{ok:false},camp:{ok:false},settle:{ok:false}},state}))};
 adapters.send=vi.fn(async command=>{if(command.type==='group-select')throw new SimulationRequestError('Caravane indisponible.','refused');});
 const panel=createGroupPanel(host as unknown as HTMLElement,adapters),confirmed={...snapshot,group,campaign};panel.update(confirmed);
 const select=host.querySelectorAll('*').find(n=>n.getAttribute('aria-label')==='Choisir une caravane')!;const option=select.children[1]!;expect(select.children).toHaveLength(3);expect(option.value).toBe('1');expect(select.value).toBe('1');
 select.value='2';select.fire('change');await Promise.resolve();await Promise.resolve();expect(select.value).toBe('1');panel.update(confirmed);expect(select.value).toBe('1');expect(select.children[1]).toBe(option);
 find(host,'groupAction','cancel').fire('click');expect(adapters.send).toHaveBeenLastCalledWith({type:'group-cancel',groupId:1});await Promise.resolve();await Promise.resolve();
 panel.resetForReplacement();expect(select.children).toHaveLength(0);expect(select.dataset.key).toBeUndefined();panel.update(confirmed);expect(select.value).toBe('1');expect(select.children[1]).not.toBe(option);panel.dispose();
});

/** UI projection fixture only: it makes no physical-travel or faction claim. */
function giftSurface274(){
 const {host,documentFixture}=dom(),f=setup(),pawn=f.world.pawns[0]!,tile=actualCivilianTile(f.world);
 const pile:MaterialPile={id:f.world.nextId++,item:'cloth',kind:'textile',quantity:6,owner:{type:'inventory',pawnId:pawn.id}};
 const mass={grams:180,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[{pawnId:pawn.id,grams:180,capacityGrams:35000}]};
 const group={id:1,startedAt:f.world.tick,destination:tile,ledger:emptyGroupLedger(),phase:'at-site',members:[pawn],items:[pile],departedAt:f.world.tick,lastPersonalTick:f.world.tick,baseline:{food:0,silver:0,medicine:0,component:0},tile,route:[tile],segment:null,paused:false,arrivedAt:f.world.tick,decisionUntil:f.world.tick+250} as unknown as GroupState;
 f.world.group=group;f.facts.mass=mass;f.facts.trade={negotiator:pawn,groupSilver:0,postSilver:0,buys:[],sells:[]};
 let revision='initial';
 const quote=(lines:readonly {pileId:number;quantity:number}[]):GroupGiftQuote274=>({ok:true,signature:JSON.stringify([revision,lines]),negotiatorId:pawn.id,settlementId:1,settlementName:'Comptoir <atelier>',factionId:2,factionName:'Union <img src=x>',postId:1,recognizedValue:lines.reduce((n,l)=>n+l.quantity*1.2,0),baseGoodwill:.2,naturalGoodwill:0,requestedGain:1,adjustedGain:1,appliedGain:1,goodwillBefore:74,goodwillAfter:75,relationBefore:'neutral',relationAfter:'ally',goods:[{pile,available:6,unitPrice:1.2}],selected:lines.map(l=>({...l,item:'cloth' as const,unitPrice:1.2})),mass});
 f.facts.gift274=quote([]);f.adapters.quoteGift274=vi.fn<NonNullable<GroupPanelAdapters['quoteGift274']>>((_snapshot,_facts,lines)=>quote(lines));
 const snapshot={...f.snapshot,group},panel=createGroupPanel(host as unknown as HTMLElement,f.adapters);panel.update(snapshot);
 const box=find(host,'groupGift274'),input=box.querySelectorAll('*').find(n=>n.tag==='input'&&n.type==='number')!;
 return {...f,host,documentFixture,panel,snapshot,pile,box,input,revise(){revision='changed';}};
}

test('V450 gift draft states the real recipient and effect literally; cancellation sends nothing and quantities retain focus',()=>{
 const f=giftSurface274(),before=JSON.stringify(f.world);
 expect(f.box.hidden).toBe(false);expect(f.input.getAttribute('aria-label')).toContain('Donner');
 f.documentFixture.activeElement=f.input;f.input.value='2';f.input.fire('input');
 const preview=find(f.host,'groupGiftPreview274');expect(preview.textContent).toContain('Union <img src=x>');expect(preview.textContent).toContain('74 → 75');expect(preview.textContent).toContain('Neutre → Alliée');expect(preview.textContent).toContain('2,4');
 f.panel.update(f.snapshot);expect(f.documentFixture.activeElement).toBe(f.input);expect(f.input.value).toBe('2');
 const cancel=find(f.host,'groupGiftCancel274');f.documentFixture.activeElement=cancel;cancel.fire('click');expect(f.input.value).toBe('');expect(f.adapters.send).not.toHaveBeenCalled();expect(JSON.stringify(f.world)).toBe(before);f.panel.dispose();
});

test('V450 changed gift quotes require a fresh preview and an unknown result locks further confirmation',async()=>{
 const f=giftSurface274(),before=JSON.stringify(f.world),confirm=find(f.host,'groupGiftConfirm274');f.input.value='2';f.input.fire('input');f.revise();
 confirm.fire('click');await Promise.resolve();expect(f.adapters.send).not.toHaveBeenCalled();expect(f.host.textContent).toContain('Le don a changé');
 f.adapters.send=vi.fn(()=>Promise.reject(new SimulationRequestError('Réponse perdue','unknown')));
 confirm.fire('click');await Promise.resolve();await Promise.resolve();await Promise.resolve();
 expect(f.adapters.send).toHaveBeenCalledOnce();expect(f.adapters.send).toHaveBeenCalledWith(expect.objectContaining({type:'group-gift274',groupId:1,lines:[{pileId:f.pile.id,quantity:2}]}));
 expect(confirm.getAttribute('aria-disabled')).toBe('true');expect(f.input.readOnly).toBe(true);confirm.fire('click');await Promise.resolve();expect(f.adapters.send).toHaveBeenCalledOnce();
 expect(JSON.stringify(f.world)).toBe(before);f.panel.resetForReplacement();f.panel.update(f.snapshot);expect(f.input.value).toBe('2'); // Detached old input is never recycled into the replacement surface.
 const replacement=find(f.host,'groupGift274').querySelectorAll('*').find(n=>n.tag==='input'&&n.type==='number')!;expect(replacement).not.toBe(f.input);expect(replacement.value).toBe('');f.panel.dispose();
});
