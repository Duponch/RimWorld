import {afterEach,expect,test,vi} from 'vitest';
import {createGroupPanel,type GroupPanelAdapters,type GroupPanelFacts} from '../src/ui/group-panel.ts';
import {generatePlanet,planetHomeInput} from '../src/sim/planet-generation.ts';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {SimulationRequestError} from '../src/bridge/protocol.ts';
import {emptyGroupLedger} from '../src/sim/group-loading.ts';
import type {GroupPanelAction} from '../src/sim/group-panel-state.ts';

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
  addEventListener(type:string,listener:(event:Record<string,unknown>)=>void){const listeners=this.listeners.get(type)??[];listeners.push(listener);this.listeners.set(type,listeners);}
  fire(type:string,event:Record<string,unknown>={}){for(const listener of this.listeners.get(type)??[])listener({target:this,...event});}
}
function dom(){
  const documentFixture={activeElement:null as NodeFixture|null,createElement:(tag:string)=>new NodeFixture(tag),createElementNS:(_ns:string,tag:string)=>new NodeFixture(tag)};
  vi.stubGlobal('document',documentFixture);vi.stubGlobal('Element',NodeFixture);
  vi.stubGlobal('Option',class extends NodeFixture {constructor(label:string,value:string){super('option');this.textContent=label;this.value=value;}});
  vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
  return {host:new NodeFixture(),documentFixture};
}
function setup(){
  const world=createScenarioWorld(214,32);world.planet=generatePlanet(world.seed,planetHomeInput(world),world.tick);
  world.pawns[0]!.name='<img src=x> & Ada';
  const actions=Object.fromEntries((['adopt','start','cancel','pause','route','return','buy','sell','unload'] satisfies GroupPanelAction[]).map(k=>[k,{ok:true}])) as GroupPanelFacts['actions'];
  const facts:GroupPanelFacts={originTile:world.planet.homeTile,originLabel:'Foyer',maximumSources:64,mass:null,confirmedRoute:[],actions,trade:null,
    candidates:world.pawns.map(pawn=>({pawn,ok:true})),sources:[]};
  const adapters:GroupPanelAdapters={capture:vi.fn(()=>facts),previewPlan:vi.fn<GroupPanelAdapters['previewPlan']>((_snapshot,_facts,draft)=>({ok:true,route:[world.planet!.civilianTile],carriers:[],mass:{grams:0,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:draft.memberIds.map(pawnId=>({pawnId,grams:0,capacityGrams:35000}))}})),
    previewRoute:vi.fn<GroupPanelAdapters['previewRoute']>(()=>({ok:false,reason:'Aucun groupe.'})),quoteTrade:vi.fn<GroupPanelAdapters['quoteTrade']>(()=>({ok:false,reason:'Aucun comptoir.'})),send:vi.fn(()=>Promise.resolve()),inspectPresentPawn:vi.fn()};
  return {world,facts,adapters,snapshot:{world,planet:world.planet,losses:[],originMapId:0}};
}
const find=(host:NodeFixture,key:string,value?:string)=>host.querySelectorAll('*').find(n=>Object.hasOwn(n.dataset,key)&&(value===undefined||n.dataset[key]===value))!;
afterEach(()=>vi.unstubAllGlobals());

test('opening and rotating the canonical globe changes no World, command or route query; confirmed row identity and literal names survive refresh',()=>{
  const {host,documentFixture}=dom(),{world,adapters,snapshot}=setup(),before=JSON.stringify(world),panel=createGroupPanel(host as unknown as HTMLElement,adapters);
  panel.update(snapshot);panel.setVisible(true);
  const svg=host.querySelectorAll('*').find(n=>n.tag==='svg')!,row=find(host,'groupMember',String(world.pawns[0]!.id)),checkbox=row.children[0]!.children[0]!;
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
  const checkbox=find(host,'groupMember').children[0]!.children[0]!;checkbox.checked=true;checkbox.fire('change');find(host,'groupPreview','formation').fire('click');
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
  world.group={id:1,startedAt:world.tick,destination:world.planet!.civilianTile,ledger:emptyGroupLedger(),phase:'loading',memberIds:[a!.id,b!.id],rendezvous:{x:a!.x,z:a!.z},
    meeting:[{pawnId:a!.id,cell:{x:a!.x,z:a!.z}},{pawnId:b!.id,cell:{x:b!.x,z:b!.z}}],cursor:0,
    manifest:[{pileId:sourceId,quantity:37,item:'cloth',carrierId:a!.id},{pileId:sourceId,quantity:38,item:'cloth',carrierId:b!.id}],
    exits:[{pawnId:a!.id,cell:null},{pawnId:b!.id,cell:null}]};
  facts.mass={grams:0,capacityGrams:70000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[{pawnId:a!.id,grams:0,capacityGrams:35000},{pawnId:b!.id,grams:0,capacityGrams:35000}]};
  const panel=createGroupPanel(host as unknown as HTMLElement,adapters);panel.update({...snapshot,group:world.group});
  const rows=find(host,'groupManifest').querySelectorAll('*').filter(n=>n.tag==='tbody')[0]!.children;
  expect(rows).toHaveLength(2);expect(rows[0]!.textContent).toContain(a!.name);expect(rows[1]!.textContent).toContain(b!.name);
  expect(rows.every(row=>row.textContent.includes(`#${sourceId}`))).toBe(true);expect(adapters.send).not.toHaveBeenCalled();panel.dispose();
});


test('V391 mixed provision counts and nutrition follow the confirmed projection, without changing source identities or solving a route',()=>{
  const {host,documentFixture}=dom(),{world,facts,adapters,snapshot}=setup(),p=world.pawns[0]!;
  const source={id:world.nextId++,kind:'food' as const,item:'pemmican' as const,quantity:60,owner:{type:'ground' as const,x:p.x,z:p.z}};
  world.piles.push(source);facts.sources=[{pile:source,reserved:0,available:60}];
  facts.mass={grams:1080,capacityGrams:35000,rations:2,pemmicanUnits:60,provisionNutrition:480,byMember:[]};
  const before=JSON.stringify(world),panel=createGroupPanel(host as unknown as HTMLElement,adapters);panel.update(snapshot);
  const mass=find(host,'groupMass'),row=find(host,'groupPile',String(source.id)),input=row.children[3]!.children[0]!;
  expect(mass.textContent).toContain('2 repas de survie · 60 unités de pemmican · nutrition disponible 4,8');
  expect(mass.textContent).toContain('possédée');expect(mass.textContent).not.toMatch(/jour|autonomie/);
  documentFixture.activeElement=input;input.value='37';input.fire('input');
  facts.mass={...facts.mass,rations:1,pemmicanUnits:37,provisionNutrition:275};panel.update(snapshot);
  expect(find(host,'groupPile',String(source.id))).toBe(row);expect(documentFixture.activeElement).toBe(input);expect(input.value).toBe('37');
  expect(mass.textContent).toContain('1 repas de survie · 37 unités de pemmican · nutrition disponible 2,75');
  expect(adapters.send).not.toHaveBeenCalled();expect(adapters.previewPlan).not.toHaveBeenCalled();expect(adapters.previewRoute).not.toHaveBeenCalled();expect(JSON.stringify(world)).toBe(before);panel.dispose();
});

test('V391 draft nutrition is only the injected formation estimate, including an empty legacy projection',()=>{
  const {host}=dom(),{facts,adapters,snapshot}=setup();
  adapters.previewPlan=vi.fn(()=>({ok:true as const,route:[],carriers:[],mass:{grams:900,capacityGrams:35000,rations:1,pemmicanUnits:50,provisionNutrition:340,byMember:[]}}));
  const panel=createGroupPanel(host as unknown as HTMLElement,adapters);panel.update(snapshot);
  expect(find(host,'groupMass').textContent).toContain('Charge non calculée');
  find(host,'groupPreview','formation').fire('click');
  expect(find(host,'groupMass').textContent).toContain('1 repas de survie · 50 unités de pemmican · nutrition disponible 3,4');
  expect(find(host,'groupMass').textContent).toContain('estimation à vérifier au lancement');
  facts.mass={grams:0,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[]};panel.update(snapshot);
  expect(find(host,'groupMass').textContent).toContain('0 repas de survie · 0 unités de pemmican · nutrition disponible 0');
  expect(adapters.send).not.toHaveBeenCalled();panel.dispose();
});


test('a refused caravan selection restores the confirmed group, and replacement rebuilds even identical selector keys',async()=>{
 const {host}=dom(),{world,facts,adapters,snapshot}=setup(),pawn=world.pawns[0]!;
 facts.mass={grams:0,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[{pawnId:pawn.id,grams:0,capacityGrams:35000}]};
 const group={id:1,startedAt:world.tick,destination:world.planet!.civilianTile,ledger:emptyGroupLedger(),phase:'loading' as const,memberIds:[pawn.id],rendezvous:{x:pawn.x,z:pawn.z},meeting:[{pawnId:pawn.id,cell:{x:pawn.x,z:pawn.z}}],cursor:0,manifest:[],exits:[{pawnId:pawn.id,cell:null}]};
 const other={...group,id:2};world.group=group;
 const campaign={revision:2 as const,campaignSeed:world.seed,mapSize:{width:32,height:32},groupLosses:[],lossContexts:[],lostMemories:[],activeMapId:0,rootMapId:0,maxSettlements:1 as const,selectedGroupId:1,maps:[],incidents:[],groups:[group,other].map(state=>({id:state.id,originMapId:0,localMapId:0,phase:state.phase,originTile:world.planet!.homeTile,filthPresent:!!world.filth,tile:world.planet!.homeTile,memberIds:state.memberIds,mass:null,context:{seed:world.seed,width:32,height:32,climate:world.climate,site:world.site,scenario:world.scenario},entryActions:{visit:{ok:false},camp:{ok:false},settle:{ok:false}},state}))};
 adapters.send=vi.fn(async command=>{if(command.type==='group-select')throw new SimulationRequestError('Caravane indisponible.','refused');});
 const panel=createGroupPanel(host as unknown as HTMLElement,adapters),confirmed={...snapshot,group,campaign};panel.update(confirmed);
 const select=host.querySelectorAll('*').find(n=>n.getAttribute('aria-label')==='Choisir une caravane')!;const option=select.children[1]!;expect(select.children).toHaveLength(3);expect(option.value).toBe('1');expect(select.value).toBe('1');
 select.value='2';select.fire('change');await Promise.resolve();await Promise.resolve();expect(select.value).toBe('1');panel.update(confirmed);expect(select.value).toBe('1');expect(select.children[1]).toBe(option);
 find(host,'groupAction','cancel').fire('click');expect(adapters.send).toHaveBeenLastCalledWith({type:'group-cancel',groupId:1});await Promise.resolve();await Promise.resolve();
 panel.resetForReplacement();expect(select.children).toHaveLength(0);expect(select.dataset.key).toBeUndefined();panel.update(confirmed);expect(select.value).toBe('1');expect(select.children[1]).not.toBe(option);panel.dispose();
});
