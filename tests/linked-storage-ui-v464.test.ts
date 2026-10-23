import {afterEach,expect,test,vi} from 'vitest';
import {createLinkedStorageControls286,linkedStoragePasteScope286,type LinkedStorageContext286} from '../src/ui/linked-storage-286.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import type {LinkedStorageCommand286,LinkedStorageGroup286} from '../src/sim/linked-storage-state-286.ts';
import type {Structure,World} from '../src/sim/types.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';

/** Narrow DOM port, following the existing bill-worker inspector double.
 * It exercises authored handlers and literal text, not browser layout/hits.
 * Group publications below are declared UI fixtures, not SIM transactions. */
class Node464 {
 children:(Node464|string)[]=[];parentElement?:Node464;dataset:Record<string,string>={};attributes=new Map<string,string>();
 value='';disabled=false;hidden=false;connected=false;className='';type='';maxLength=0;autocomplete='';
 onclick:(()=>void)|null=null;onchange:(()=>void)|null=null;oninput:(()=>void)|null=null;
 private text='';private listeners=new Map<string,((event:Event464)=>void)[]>();
 constructor(readonly tag:string){}
 get isConnected():boolean{return this.connected||!!this.parentElement?.isConnected;}
 get options(){return this.children.filter((n):n is Node464=>n instanceof Node464&&n.tag==='option');}
 set textContent(value:string){this.text=value;for(const child of this.children)if(child instanceof Node464)child.parentElement=undefined;this.children=[];}
 get textContent():string{return this.text+this.children.map(child=>typeof child==='string'?child:child.textContent).join('');}
 set innerHTML(_value:string){throw Error('Names and candidate labels must remain literal text.');}
 append(...nodes:(Node464|string)[]){for(const node of nodes){this.children.push(node);if(node instanceof Node464)node.parentElement=this;}}
 replaceChildren(...nodes:(Node464|string)[]){this.textContent='';this.append(...nodes);}
 setAttribute(key:string,value:string){this.attributes.set(key,value);}
 getAttribute(key:string){return this.attributes.get(key)??null;}
 addEventListener(name:string,listener:(event:Event464)=>void){const listeners=this.listeners.get(name)??[];listeners.push(listener);this.listeners.set(name,listeners);}
 emit(name:string,event:Event464={key:'',stopped:false,stopPropagation(){this.stopped=true;}}){
  if(name==='change')this.onchange?.();if(name==='input')this.oninput?.();
  for(const listener of this.listeners.get(name)??[])listener(event);
  if(!event.stopped)this.parentElement?.emit(name,event);
 }
 click(){if(!this.disabled)this.onclick?.();}
 focus(){(document as unknown as {activeElement:Node464}).activeElement=this;}
 remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=undefined;}}
 querySelectorAll<T=Node464>(selector:string):T[]{
  const attribute=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(selector),key=attribute?.[1]?.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());
  const matches=(node:Node464)=>key?Object.hasOwn(node.dataset,key)&&(attribute![2]===undefined||node.dataset[key]===attribute![2]):node.tag===selector;
  return this.children.flatMap(child=>typeof child==='string'?[]:[...(matches(child)?[child]:[]),...child.querySelectorAll<Node464>(selector)]) as unknown as T[];
 }
 querySelector<T=Node464>(selector:string):T|null{return this.querySelectorAll<T>(selector)[0]??null;}
}
interface Event464 {key:string;stopped:boolean;stopPropagation():void}
afterEach(()=>vi.unstubAllGlobals());
const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function fixture(sendOverride?:(command:LinkedStorageCommand286)=>Promise<unknown>){
 const world=deconstructionCamp(1,32);world.structures=[];world.packed=[];
 const add=(kind:'shelf'|'small-shelf'='shelf',x=3,z=3)=>{
  const shelf:Structure=fixtureBuilding(world,kind,x,z);delete shelf.quality;shelf.material='wood';shelf.shelf=newShelfStorage(Array.from({length:kind==='shelf'?2:1},()=>world.nextId++));return shelf;
 };
 const a=add(),b=add('small-shelf',8,3),c=add('shelf',12,3),d=add('small-shelf',16,3);
 let context:LinkedStorageContext286|undefined={world,mapId:0,epoch:7,structureId:a.id};
 const sent:{command:LinkedStorageCommand286;context:{mapId:number;epoch:number;structureId:number}}[]=[];
 const send=vi.fn((command:LinkedStorageCommand286,anchor:{mapId:number;epoch:number;structureId:number})=>{sent.push({command,context:anchor});return sendOverride?.(command)??Promise.resolve({ok:true});});
 vi.stubGlobal('document',{activeElement:null,createElement:(tag:string)=>new Node464(tag)});
 const pendingChanges:boolean[]=[];
 const controls=createLinkedStorageControls286({current:()=>context,send,onPendingChange:pending=>pendingChanges.push(pending)}),root=controls.element as unknown as Node464,host=new Node464('host');host.connected=true;host.append(root);
 const node=(key:string)=>root.querySelector(`[data-linked-storage-${key}]`)!;
 const action=(key:string)=>root.querySelector(`[data-linked-storage-action="${key}"]`)!;
 const choose=(key:string)=>{node('choice').value=key;node('choice').emit('change');};
 const publishGroup=(members:Structure[],name='Réserves',id=1):LinkedStorageGroup286=>{
  const settings=structuredClone(members[0]!.shelf!.settings),group={id,originMapId:0,name,settings,memberIds:members.map(s=>s.id)};
  world.linkedStorage286??={revision:1,nextId:id+1,groups:[]};world.linkedStorage286.nextId=Math.max(world.linkedStorage286.nextId,id+1);
  world.linkedStorage286.groups=world.linkedStorage286.groups.filter(g=>g.id!==id);world.linkedStorage286.groups.push(group);
  for(const member of members){member.shelf!.linked286={revision:1,groupId:id,independent:structuredClone(member.shelf!.settings)};member.shelf!.settings=structuredClone(settings);}
  return group;
 };
 return {world,a,b,c,d,add,sent,send,controls,root,host,node,action,choose,publishGroup,pendingChanges,get context(){return context;},set context(value:LinkedStorageContext286|undefined){context=value;}};
}

test('mount, updates, opening, choices, refresh and cancellation send nothing and keep the panel stable',()=>{
 const f=fixture(),before=JSON.stringify(f.world),editor=f.node('editor'),choice=f.node('choice');
 expect(choice.options).toHaveLength(0);f.controls.update();expect(f.sent).toEqual([]);
 f.action('open').click();expect(choice.options.some(o=>o.value===`s:${f.b.id}`)).toBe(true);f.choose(`s:${f.b.id}`);f.controls.update();
 expect(f.node('choice')).toBe(choice);expect(f.node('editor')).toBe(editor);expect(document.activeElement).toBe(choice as unknown as Element);
 f.action('refresh').click();f.action('cancel').click();expect(editor.hidden).toBe(true);expect(f.sent).toEqual([]);expect(JSON.stringify(f.world)).toBe(before);
});

test('create explicitly announces source A and sends A plus the chosen independent only',async()=>{
 const f=fixture();f.a.shelf!.settings.priority=5;f.b.shelf!.settings.priority=1;const before=JSON.stringify(f.world);
 expect(f.controls.pending).toBe(false);
 f.action('open').click();f.choose(`s:${f.b.id}`);expect(f.node('preview').textContent).toContain(`Source : Étagère ${f.a.id}`);expect(f.sent).toEqual([]);
 f.action('confirm').click();expect(f.sent).toEqual([{command:{type:'shelf-link',structureIds:[f.a.id,f.b.id]},context:{mapId:0,epoch:7,structureId:f.a.id}}]);
 expect(f.controls.pending).toBe(true);await settle();expect(f.controls.pending).toBe(true);expect(f.node('status').textContent).toContain('attente');expect(JSON.stringify(f.world)).toBe(before);
 f.publishGroup([f.a,f.b]);f.controls.update();expect(f.controls.pending).toBe(false);expect(f.node('status').textContent).toContain('confirmée');expect(f.node('editor').hidden).toBe(true);
});

test('a late ACK releases sibling policy controls without another paused publication',async()=>{
 const ack=deferred<unknown>(),f=fixture(()=>ack.promise);f.action('open').click();f.choose(`s:${f.b.id}`);f.action('confirm').click();
 expect(f.pendingChanges).toEqual([true]);f.publishGroup([f.a,f.b]);f.controls.update();
 expect(f.controls.pending).toBe(true);expect(f.pendingChanges).toEqual([true]);
 ack.resolve({ok:true});await settle();
 expect(f.controls.pending).toBe(false);expect(f.pendingChanges).toEqual([true,false]);expect(f.action('open').disabled).toBe(false);
});

test('joining duplicate-named groups uses distinct IDs and the original local representative, destination first',()=>{
 const f=fixture(),g=f.publishGroup([f.b,f.c],'<Réserves>',3),e=f.add('shelf',20,3),h=f.add('small-shelf',24,3);f.publishGroup([e,h],'<Réserves>',4);
 f.controls.update();f.action('open').click();const options=f.node('choice').options;
 expect(options.filter(o=>o.textContent.includes('« <Réserves> »'))).toHaveLength(2);expect(options.some(o=>o.value==='g:3')).toBe(true);expect(options.some(o=>o.value==='g:4')).toBe(true);
 f.choose(`g:${g.id}`);expect(f.node('preview').textContent).toContain('destination gagnent');f.action('confirm').click();expect(f.sent[0]!.command).toEqual({type:'shelf-link',structureIds:[f.b.id,f.a.id]});
});

test('an existing source group can add an independent without transferring a different whole group',()=>{
 const f=fixture(),g=f.publishGroup([f.a,f.c],'Courant');f.controls.update();f.action('open').click();f.choose(`s:${f.b.id}`);
 expect(f.node('preview').textContent).toContain('réglages actuels du groupe');expect(f.node('preview').textContent).toContain('Courant');f.action('confirm').click();
 expect(f.sent[0]!.command).toEqual({type:'shelf-link',structureIds:[f.a.id,f.b.id]});expect(g.memberIds).toEqual([f.a.id,f.c.id]);
});

test('packed and foreign originals are never new local choices; one group is listed only once',()=>{
 const f=fixture();f.publishGroup([f.c,f.d],'Groupe');const packed=f.add('small-shelf',20,3);f.world.structures=f.world.structures.filter(s=>s!==packed);f.world.packed.push({building:packed,owner:{type:'ground',x:20,z:3}});
 // The existing foreign-building catalogue admits the large shelf. A small
 // shelf with an invented faction field is not a valid foreign original.
 const foreign=f.add('shelf',24,3);foreign.factionId=null;f.controls.update();f.action('open').click();
 expect(f.node('choice').options.some(o=>o.value===`s:${packed.id}`||o.value===`s:${foreign.id}`)).toBe(false);expect(f.node('choice').options.filter(o=>o.value==='g:1')).toHaveLength(1);
});

test('a vanished representative blocks confirmation even if another real group member remains',()=>{
 const f=fixture();f.publishGroup([f.b,f.c],'Destination');f.action('open').click();f.choose('g:1');
 f.world.structures=f.world.structures.filter(s=>s!==f.b);f.world.packed.push({building:f.b,owner:{type:'ground',x:8,z:3}});f.controls.update();
 expect(f.action('confirm').disabled).toBe(true);f.action('confirm').onclick!();expect(f.sent).toEqual([]);expect(f.node('status').textContent).toContain('automatiquement');
 f.action('refresh').click();f.action('confirm').click();expect(f.sent[0]!.command).toEqual({type:'shelf-link',structureIds:[f.c.id,f.a.id]});
});

test('unlink is a separate confirmation, announces pair dissolution and keeps effective settings',async()=>{
 const f=fixture();f.a.shelf!.settings.priority=5;f.publishGroup([f.a,f.b],'Paire');const effective=JSON.stringify(f.a.shelf!.settings),before=JSON.stringify(f.world);f.controls.update();
 f.action('unlink').click();expect(f.node('preview').textContent).toContain('conservera les réglages effectifs');expect(f.node('preview').textContent).toContain('dissous');expect(f.sent).toEqual([]);
 f.action('confirm').click();await settle();expect(f.sent[0]!.command).toEqual({type:'shelf-unlink',structureId:f.a.id});expect(JSON.stringify(f.world)).toBe(before);
 delete f.a.shelf!.linked286;delete f.b.shelf!.linked286;f.world.linkedStorage286!.groups=[];f.controls.update();expect(f.node('summary').textContent).toBe('Réglages indépendants.');expect(JSON.stringify(f.a.shelf!.settings)).toBe(effective);
});

test('rename trims the explicit draft, uses the actual anchor and retains names as literal labels',()=>{
 const f=fixture();f.publishGroup([f.a,f.b],'Initial');f.controls.update();f.action('rename').click();const input=f.node('name');
 expect(document.activeElement).toBe(input as unknown as Element);input.value='  <Nouveau>  ';input.emit('input');f.controls.update();expect(input.value).toBe('  <Nouveau>  ');expect(f.sent).toEqual([]);
 f.action('confirm').click();expect(f.sent[0]!.command).toEqual({type:'shelf-group-rename',structureId:f.a.id,name:'<Nouveau>'});
});

test('invalid names cannot send and a changed source preserves the focused draft while blocking it',()=>{
 const f=fixture();f.publishGroup([f.a,f.b],'Initial');f.controls.update();f.action('rename').click();const input=f.node('name');
 for(const value of ['   ','x'.repeat(65),'Nom\ninterdit']){input.value=value;input.emit('input');expect(f.action('confirm').disabled).toBe(true);f.action('confirm').onclick!();}
 input.value='Brouillon conservé';input.emit('input');f.world.linkedStorage286!.groups[0]!.name='Renommé ailleurs';f.controls.update();
 expect(input.value).toBe('Brouillon conservé');expect(document.activeElement).toBe(input as unknown as Element);expect(f.action('confirm').disabled).toBe(true);expect(f.sent).toEqual([]);
});

test('same-tick policy changes cannot silently change the announced source',()=>{
 const f=fixture();f.action('open').click();f.choose(`s:${f.b.id}`);const tick=f.world.tick;f.a.shelf!.settings.priority=5;f.controls.update();
 expect(f.world.tick).toBe(tick);expect(f.action('confirm').disabled).toBe(true);expect(f.node('choice').value).toBe(`s:${f.b.id}`);f.action('confirm').onclick!();expect(f.sent).toEqual([]);
 f.action('refresh').click();expect(f.action('confirm').disabled).toBe(false);expect(f.sent).toEqual([]);
});

test('authority refusals retain the unsent draft and its original destination for an explicit retry',async()=>{
 const f=fixture(async()=>({ok:false,reason:'Dépôt physique impossible'}));f.action('open').click();f.choose(`s:${f.b.id}`);f.action('confirm').click();await settle();
 expect(f.controls.pending).toBe(false);expect(f.node('status').textContent).toContain('Dépôt physique impossible');expect(f.node('choice').value).toBe(`s:${f.b.id}`);expect(f.action('confirm').disabled).toBe(false);expect(f.sent).toHaveLength(1);
});

test('epoch, anchor or detachment changes invalidate pending replies without retargeting',async()=>{
 for(const change of ['epoch','anchor','detach'] as const){
  const response=deferred<unknown>(),f=fixture(()=>response.promise);f.action('open').click();f.choose(`s:${f.b.id}`);f.action('confirm').click();
  if(change==='detach')f.host.replaceChildren();else{f.context={...f.context!,...(change==='epoch'?{epoch:8}:{structureId:f.c.id})};f.controls.update();}
  response.reject(Error('Ancienne sélection'));await settle();
  expect(f.node('status').textContent).not.toContain('Ancienne sélection');if(change!=='detach')expect(f.node('editor').hidden).toBe(true);expect(f.sent).toHaveLength(1);expect(f.sent[0]!.context.structureId).toBe(f.a.id);
 }
});

test('blocked or historical contexts and disposed controls cannot emit commands',()=>{
 const f=fixture();f.context={...f.context!,blocked:true};f.controls.update();f.action('open').onclick!();expect(f.node('editor').hidden).toBe(true);expect(f.sent).toEqual([]);
 f.context={...f.context!,blocked:false};f.controls.update();f.action('open').click();f.choose(`s:${f.b.id}`);f.context=undefined;f.action('confirm').onclick!();expect(f.sent).toEqual([]);expect(f.root.hidden).toBe(true);
 f.context={world:{...f.world,schemaVersion:285} as unknown as World,mapId:0,epoch:8,structureId:f.a.id};f.controls.update();expect(f.root.hidden).toBe(true);f.action('open').onclick!();expect(f.sent).toEqual([]);
 f.context={world:f.world,mapId:0,epoch:9,structureId:f.a.id};f.controls.update();f.controls.dispose();f.action('open').onclick!();f.action('confirm').onclick!();expect(f.sent).toEqual([]);
});

test('paste scope counts the real linked registry including a packed member without fabricating a local shelf',()=>{
 const f=fixture();expect(linkedStoragePasteScope286(f.world,f.a.id)).toContain('indépendante');f.publishGroup([f.a,f.b,f.c],'Même nom');
 f.world.structures=f.world.structures.filter(s=>s!==f.c);f.world.packed.push({building:f.c,owner:{type:'ground',x:12,z:3}});const before=JSON.stringify(f.world);
 expect(linkedStoragePasteScope286(f.world,f.a.id)).toContain('3 étagères liées');expect(linkedStoragePasteScope286(f.world,f.a.id)).toContain('emballés ou absents');expect(linkedStoragePasteScope286(f.world,f.c.id)).toContain('indisponible');expect(JSON.stringify(f.world)).toBe(before);
});
