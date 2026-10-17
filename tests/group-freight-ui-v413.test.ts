import {prepareGroupSplit,commitGroupReorganization} from '../src/sim/group-reorganization';
import {groupEntryActions} from '../src/sim/world-map-authority';
import {createGroupAdapters} from '../src/ui/group-adapter';
import {emptyGroupLedger} from '../src/sim/group-loading';
import {travelGroupLabel256} from '../src/ui/group-travel-readers-256';
import {afterEach,expect,test,vi} from 'vitest';
import {createGroupPanel,type GroupPanelFacts,type GroupPanelAdapters,type GroupPanelSnapshot} from '../src/ui/group-panel';
import {createGroupReorganizationPanel256,groupSplitCommand256,groupMergeCommand256} from '../src/ui/group-reorganization-panel-256';
import {createScenarioWorld} from '../src/sim/new-game';
import {generatePlanet,planetHomeInput} from '../src/sim/planet-generation';
import {adultAgeTicks} from '../src/sim/animal-life';
import type {WildAnimal} from '../src/sim/wildlife-state';
import {reorganizationCamp256} from './helpers/group-reorganization-v256';
import {readGroupPanelSnapshot} from '../src/ui/group-adapter';
import {registeredMapPresentation} from '../src/sim/world-map-presentation';
function projectedSnapshot256(w:import('../src/sim/types').World){const view=registeredMapPresentation(w);if(!view)throw Error('Declared UI fixture has no selected actual map');const snapshot=readGroupPanelSnapshot(view);if(!snapshot)throw Error('Missing confirmed group projection');return snapshot;}
vi.mock('../src/ui/planet-view',()=>({createPlanetView:()=>({setPlanet(){},setOverlay(){},setVisible(){},dispose(){},focusTile(){}}),planetTileLabel:()=> 'Destination'}));
class NodeFixture {
  children:NodeFixture[]=[];parentElement:NodeFixture|null=null;dataset:Record<string,string>={};style:Record<string,string>={};
  attributes=new Map<string,string>();listeners=new Map<string,Array<(event:Record<string,unknown>)=>void>>();
  open=false;showModal(){this.open=true;}close(){this.open=false;}
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

afterEach(()=>vi.unstubAllGlobals());
const all=(host:NodeFixture)=>host.querySelectorAll('*');
const find=(host:NodeFixture,key:string)=>all(host).find(n=>Object.hasOwn(n.dataset,key))!;
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
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
/** Prepared UI-only confirmations. No simulation/camp/contact proof is claimed.
 * Expected masses come from MASSES-01.tsv, not from the tested mass helpers. */
test('258 exposes actual freight rows, original minified labels and masses, preserves focus/draft and forwards IDs only',()=>{
 const {host,documentFixture}=dom(),f=setup();f.world.schemaVersion=258;
 const table:import('../src/sim/furniture-rules').PackedFurniture={building:{...f.pack.building,id:f.world.nextId++,kind:'table',material:'wood'},owner:{type:'ground',x:6,z:4}};
 f.world.packed.push(table);f.facts.bedrolls=[{pack:f.pack,ok:true},{pack:table,ok:true}];
 const medicine:import('../src/sim/types').MaterialPile={id:f.world.nextId++,kind:'medicine',item:'medicine',quantity:4,owner:{type:'ground',x:6,z:5}};
 const component:import('../src/sim/types').MaterialPile={id:f.world.nextId++,kind:'component',item:'component',quantity:3,owner:{type:'ground',x:7,z:5}};
 const weapon:import('../src/sim/types').MaterialPile={id:f.world.nextId++,kind:'weapon',item:'revolver',quantity:1,owner:{type:'ground',x:8,z:5},weapon:{quality:'poor',hitPoints:64}};
 f.world.piles.push(medicine,component,weapon);f.facts.sources=[medicine,component,weapon].map(pile=>({pile,reserved:0,available:pile.quantity}));
 const before=JSON.stringify(f.world),ui=createGroupPanel(host as unknown as HTMLElement,f.adapters);ui.update(f.snapshot);
 expect(host.textContent).toContain('Meubles minifiés');
 const tableRow=all(host).find(n=>n.dataset.groupPacked===String(table.building.id))!;
 expect(tableRow.textContent).toContain('Table');expect(tableRow.textContent).toContain('5 kg');expect(tableRow.textContent).not.toContain('Sac de couchage');
 const medicineRow=all(host).find(n=>n.dataset.groupPile===String(medicine.id))!,input=medicineRow.children[3]!.children[0]!;
 expect(medicineRow.textContent).toContain('0,5 kg');expect(all(host).find(n=>n.dataset.groupPile===String(component.id))!.textContent).toContain('0,6 kg');expect(all(host).find(n=>n.dataset.groupPile===String(weapon.id))!.textContent).toContain('1,4 kg');
 documentFixture.activeElement=input;input.value='2';input.fire('input');expect(medicineRow.textContent).toContain('Choisi : 1 kg');
 const human=find(host,'groupMember').children[0]!.children[0]!,pack=tableRow.children[0]!.children[0]!;
 for(const check of [human,pack]){check.checked=true;check.fire('change');}
 ui.update(f.snapshot);expect(medicineRow.children[3]!.children[0]).toBe(input);expect(input.value).toBe('2');
 all(host).find(n=>n.dataset.groupPreview==='formation')!.fire('click');
 expect(f.adapters.previewPlan).toHaveBeenLastCalledWith(f.snapshot,f.facts,expect.objectContaining({sources:[{pileId:medicine.id,quantity:2}],packedIds:[table.building.id]}));
 expect(f.adapters.send).not.toHaveBeenCalled();expect(JSON.stringify(f.world)).toBe(before);ui.dispose();
});

test('258 manifest resolves a real divided or whole receipt and cannot retain stale pile metadata after snapshot adoption',()=>{
 for(const whole of [false,true]){
  const {host}=dom(),f=setup();f.world.schemaVersion=258;const pawn=f.world.pawns[0]!,sourceId=f.world.nextId++,carriedId=whole?sourceId:f.world.nextId++;
  const received:import('../src/sim/types').MaterialPile={id:carriedId,kind:'weapon',item:'revolver',quantity:1,owner:{type:'inventory',pawnId:pawn.id},weapon:{quality:'excellent',hitPoints:83}};
  f.world.piles=[received];f.facts.sources=[];f.facts.bedrolls=[];f.facts.animals=[];
  f.facts.mass={grams:1400,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[{pawnId:pawn.id,grams:1400,capacityGrams:35000}]};
  const destination=f.world.planet!.civilianTile;if(destination===null)throw Error('Prepared UI planet has no real civilian destination');
  f.snapshot.group={id:1,startedAt:f.world.tick,destination,ledger:emptyGroupLedger(),phase:'loading',memberIds:[pawn.id],rendezvous:{x:pawn.x,z:pawn.z},meeting:[],manifest:[{pileId:sourceId,item:'revolver',quantity:1,carrierId:pawn.id,carriedPileId:carriedId}],cursor:1,exits:[]};
  const before=JSON.stringify(f.world),ui=createGroupPanel(host as unknown as HTMLElement,f.adapters);ui.update(f.snapshot);
  expect(find(host,'groupManifest').textContent).toContain('1,4 kg');expect(find(host,'groupManifest').textContent).toContain('Pris au contact');expect(JSON.stringify(f.world)).toBe(before);
  f.world.piles=[];ui.update(f.snapshot);expect(find(host,'groupManifest').textContent).toContain('Masse indisponible');ui.dispose();
 }
});

test('258 revision2 minified loading displays the original package and its actual carrier without altering owners',()=>{
 const {host}=dom(),f=setup();f.world.schemaVersion=258;const pawn=f.world.pawns[0]!;
 const chair:import('../src/sim/furniture-rules').PackedFurniture={building:{...f.pack.building,id:f.world.nextId++,kind:'stool',material:'wood'},owner:{type:'inventory',pawnId:pawn.id}};
 f.world.packed=[chair];f.facts.sources=[];f.facts.bedrolls=[];f.facts.animals=[];
 f.facts.mass={grams:3000,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[{pawnId:pawn.id,grams:3000,capacityGrams:35000}]};
 const destination=f.world.planet!.civilianTile;if(destination===null)throw Error('Prepared UI planet has no real civilian destination');
 f.snapshot.group={id:1,startedAt:f.world.tick,destination,ledger:emptyGroupLedger(),phase:'loading',memberIds:[pawn.id],rendezvous:{x:pawn.x,z:pawn.z},meeting:[],manifest:[],cursor:0,exits:[],bedrollLoading:{revision:2,manifest:[{structureId:chair.building.id,carrierId:pawn.id,loaded:true}]}};
 const before=JSON.stringify(f.world),ui=createGroupPanel(host as unknown as HTMLElement,f.adapters);ui.update(f.snapshot);
 const row=all(host).find(n=>n.dataset.groupPacked===String(chair.building.id))!;
 expect(row.textContent).toContain('Tabouret');expect(row.textContent).toContain('3 kg');expect(row.textContent).toContain(pawn.name);expect(row.textContent).toContain('pris au contact');expect(row.children[0]!.children[0]!.hidden).toBe(true);expect(JSON.stringify(f.world)).toBe(before);ui.dispose();
});
