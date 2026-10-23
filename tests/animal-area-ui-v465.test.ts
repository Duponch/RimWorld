import {afterEach,expect,test,vi} from 'vitest';
import {createAnimalAreaControls287,type AnimalAreaActions287,type AnimalAreaContext287} from '../src/ui/animal-area-287.ts';
import {createAnimalInspector,updateAnimalInspector} from '../src/ui/animal-inspector.ts';
import {updateAnimalsPanel} from '../src/ui/animals-panel.ts';
import type {AnimalAreaChoice287,AnimalAreaCommand287} from '../src/sim/animal-area-state-287.ts';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {constructFreshInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';

/** Narrow authored-DOM port, not native layout or physical gameplay evidence.
 * Publications below prepare confirmed UI views; they are not SIM commands. */
class Node465 {
 children:Node465[]=[];parentElement?:Node465;dataset:Record<string,string>={};attributes=new Map<string,string>();
 className='';id='';title='';value='';type='';scope='';tabIndex=-1;hidden=false;checked=false;disabled=false;connected=false;private text='';
 onclick:((e:{currentTarget:Node465})=>void)|null=null;onchange:((e:{currentTarget:Node465})=>void)|null=null;
 private listeners=new Map<string,((e:{currentTarget:Node465;key?:string;preventDefault():void;stopPropagation():void})=>void)[]>();
 constructor(readonly tag='div'){}
 readonly classList={add:(...names:string[])=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),...names])].join(' ');},remove:(...names:string[])=>{this.className=this.className.split(' ').filter(n=>!names.includes(n)).join(' ');},toggle:(name:string,force?:boolean)=>{const on=force??!this.className.split(' ').includes(name);if(on)this.classList.add(name);else this.classList.remove(name);return on;}};
 get isConnected():boolean{return this.connected||!!this.parentElement?.isConnected;}
 get options(){return this.children.filter(n=>n.tag==='option');}
 get textContent():string{return this.text+this.children.map(n=>n.textContent).join('');}
 set textContent(value:string){this.text=value;for(const child of this.children)child.parentElement=undefined;this.children=[];}
 set innerHTML(markup:string){this.textContent='';const stack:Node465[]=[this];for(const match of markup.matchAll(/<\/?[a-z][^>]*>|[^<]+/gi)){const token=match[0];if(token.startsWith('</')){stack.pop();continue;}if(!token.startsWith('<')){const n=new Node465('#text');n.textContent=token;stack.at(-1)!.append(n);continue;}const head=/^<([a-z][a-z0-9-]*)\b/i.exec(token)!,n=new Node465(head[1]!.toLowerCase());for(const attr of token.slice(head[0].length,-1).matchAll(/([^\s=]+)(?:="([^"]*)")?/g))n.setAttribute(attr[1]!,attr[2]??'');stack.at(-1)!.append(n);if(!['input','br','hr','img','meta','link'].includes(n.tag))stack.push(n);}}
 append(...nodes:Node465[]){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
 replaceChildren(...nodes:Node465[]){this.textContent='';this.append(...nodes);}
 remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=undefined;}}
 setAttribute(k:string,v:string){this.attributes.set(k,v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase())]=v;else if(k==='class')this.className=v;else if(k==='id')this.id=v;else if(k==='type')this.type=v;else if(k==='value')this.value=v;else if(k==='hidden')this.hidden=true;}
 getAttribute(k:string){return this.attributes.get(k)??null;}hasAttribute(k:string){return this.attributes.has(k);}removeAttribute(k:string){this.attributes.delete(k);}
 addEventListener(k:string,cb:(e:{currentTarget:Node465;key?:string;preventDefault():void;stopPropagation():void})=>void){const a=this.listeners.get(k)??[];a.push(cb);this.listeners.set(k,a);}
 click(){if(!this.disabled)this.onclick?.({currentTarget:this});}
 change(value:string){this.value=value;this.onchange?.({currentTarget:this});}
 focus(){(document as unknown as {activeElement:Node465}).activeElement=this;}
 private matches(s:string){const d=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(s);if(d){const k=d[1]!.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());return Object.hasOwn(this.dataset,k)&&(d[2]===undefined||this.dataset[k]===d[2]);}return s.startsWith('.')?this.className.split(' ').includes(s.slice(1)):this.tag===s;}
 querySelectorAll<T=Node465>(s:string):T[]{const [a,b]=s.split(' '),all=this.children.flatMap(n=>[n,...n.querySelectorAll<Node465>('*')]);return all.filter(n=>{if(s==='*')return true;if(!b)return n.matches(a!);if(!n.matches(b))return false;for(let p=n.parentElement;p&&p!==this;p=p.parentElement)if(p.matches(a!))return true;return false;}) as unknown as T[];}
 querySelector<T=Node465>(s:string):T|null{return this.querySelectorAll<T>(s)[0]??null;}
}
afterEach(()=>vi.unstubAllGlobals());
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function deferred(){let resolve!:(v:unknown)=>void,reject!:(e:unknown)=>void;const promise=new Promise<unknown>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function fixture(){
 const f=animalHaulingCamp459();
 f.world.allowedAreas=[{id:f.world.nextId++,label:'<Réserve calme>',color:0x557799,cells:[12*32+12]}];
 vi.stubGlobal('document',{activeElement:null,createElement:(tag:string)=>new Node465(tag),createTextNode:(text:string)=>{const n=new Node465('#text');n.textContent=text;return n;}});
 let context:AnimalAreaContext287|undefined={world:f.world,mapId:0,epoch:7};const ack=deferred(),sent:{command:AnimalAreaCommand287;anchor:{mapId:number;epoch:number;animalId:number}}[]=[],pending:boolean[]=[];
 const manage=vi.fn(),actions:AnimalAreaActions287={current:()=>context,send:(command,anchor)=>{sent.push({command,anchor});return ack.promise;},onManage:manage,onPendingChange:(_id,value)=>pending.push(value)};
 const controls=createAnimalAreaControls287(f.animalId,actions),root=controls.element as unknown as Node465,host=new Node465();host.connected=true;host.append(root);controls.update();
 const select=root.querySelector('[data-animal-area-choice]')!,status=root.querySelector('[data-animal-area-status]')!;
 const publish=(choice:AnimalAreaChoice287|null)=>{f.animal.animalMapAreas287={revision:1,assignments:choice?[{mapId:0,choice}]:[]};controls.update();};
 return {...f,controls,root,host,select,status,actions,ack,sent,pending,manage,publish,get context(){return context;},set context(v:AnimalAreaContext287|undefined){context=v;}};
}

test('mount and tick updates keep the literal named choices, focus and original animal unchanged',()=>{
 const f=fixture(),before=JSON.stringify(f.world);f.select.focus();f.controls.update();f.controls.update();
 expect(f.select.options.map(n=>n.textContent)).toEqual(['Sans restriction','Zone de foyer','<Réserve calme>']);expect(f.select.value).toBe('unrestricted');
 expect(f.root.querySelector('[data-animal-area-choice]')).toBe(f.select);expect(document.activeElement).toBe(f.select as unknown as Element);expect(f.sent).toEqual([]);expect(JSON.stringify(f.world)).toBe(before);
 f.root.querySelector('[data-animal-area-manage]')!.click();expect(f.manage).toHaveBeenCalledOnce();expect(f.sent).toEqual([]);
});

test.each(['ack-first','publication-first'] as const)('Home waits for both actual publication and ACK in %s order, including paused completion',async order=>{
 const f=fixture();f.select.change('home');expect(f.sent).toEqual([{command:{type:'animal-area-assign',animalId:f.animalId,choice:{kind:'home'}},anchor:{mapId:0,epoch:7,animalId:f.animalId}}]);expect(f.select.value).toBe('unrestricted');expect(f.controls.pending).toBe(true);
 if(order==='ack-first'){f.ack.resolve({ok:true});await settle();expect(f.controls.pending).toBe(true);f.publish({kind:'home'});}else{f.publish({kind:'home'});expect(f.controls.pending).toBe(true);f.ack.resolve({ok:true});await settle();}
 expect(f.controls.pending).toBe(false);expect(f.select.disabled).toBe(false);expect(f.select.value).toBe('home');expect(f.pending).toEqual([true,false]);expect(f.status.textContent).toContain('confirmée');
});

test('rejection keeps the confirmed choice and visible error through the next update',async()=>{
 const f=fixture();f.select.change(`allowed:${f.world.allowedAreas![0]!.id}`);f.ack.reject(Error('Le portage ne peut pas être interrompu.'));await settle();
 f.controls.update();expect(f.controls.pending).toBe(false);expect(f.select.value).toBe('unrestricted');expect(f.status.textContent).toContain('portage');expect(f.animal.animalMapAreas287).toBeUndefined();
});

test('a later published deletion cannot leave a previously confirmed assignment waiting after its ACK',async()=>{
 const f=fixture(),areaId=f.world.allowedAreas![0]!.id;
 f.select.change(`allowed:${areaId}`);expect(f.sent).toHaveLength(1);
 f.publish({kind:'allowed',areaId});expect(f.controls.pending).toBe(true);expect(f.select.value).toBe(`allowed:${areaId}`);
 // Two actual successive presentation states of this original animal. The
 // request is still waiting for its independent transport ACK, not completed
 // through test-only access to the controller's private request state.
 f.world.allowedAreas=[];f.publish(null);expect(f.controls.pending).toBe(true);expect(f.select.value).toBe('unrestricted');
 f.ack.resolve({ok:true});await settle();
 expect(f.controls.pending).toBe(false);expect(f.select.disabled).toBe(false);expect(f.select.value).toBe('unrestricted');
 expect(f.pending).toEqual([true,false]);expect(f.sent).toHaveLength(1);expect(f.status.textContent).toContain('actualisée');
 expect(f.animal.animalMapAreas287!.assignments).toEqual([]);
});

test('stale callbacks cannot act on a new epoch and late ACKs cannot confirm it',async()=>{
 const f=fixture();f.context={...f.context!,epoch:8};f.select.change('home');expect(f.sent).toEqual([]);
 f.select.change('home');expect(f.sent).toHaveLength(1);f.context={...f.context!,epoch:9};f.controls.update();f.ack.resolve({ok:true});await settle();
 expect(f.controls.pending).toBe(false);expect(f.select.value).toBe('unrestricted');expect(f.status.textContent).not.toContain('confirmée');
});

test('a blocked context and a vanished named choice send nothing, without selecting an alternative',()=>{
 const f=fixture(),id=f.world.allowedAreas![0]!.id;f.context={...f.context!,blocked:true};f.select.change('home');expect(f.sent).toEqual([]);
 f.context={...f.context!,blocked:false};f.world.allowedAreas=[];f.select.change(`allowed:${id}`);expect(f.sent).toEqual([]);expect(f.select.value).toBe('unrestricted');expect(f.status.textContent).toContain('disponible');
});

test('same-choice is a literal UI noop; a pending request cannot issue another command',()=>{
 const f=fixture();f.select.change('unrestricted');expect(f.sent).toEqual([]);f.select.change('home');f.select.change('unrestricted');expect(f.sent).toHaveLength(1);
});

test('empty Home stays selected as its cells change and Unrestricted remains a distinct command',()=>{
 const f=fixture();f.publish({kind:'home'});expect(f.select.value).toBe('home');expect(f.status.textContent).toContain('vide');f.world.home=[12*32+12];f.controls.update();expect(f.select.value).toBe('home');expect(f.sent).toEqual([]);
 f.select.change('unrestricted');expect(f.sent[0]!.command.choice).toBeNull();
});

test('the original table column and stable inspector show areas for the Labrador and pen status for a real Roamer',()=>{
 const f=fixture(),made=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.Muffalo,id:f.world.nextId++,cell:{x:16,z:16},tick:f.world.tick,random:new WorldGenerationRandom(f.world.seed)});
 if(made.status!=='ready')throw Error('Declared UI Roamer construction refused: '+made.reason);made.animal.domestic={since:f.world.tick,care:'herbal',tameness:5,nextDecay:f.world.tick+12000};f.world.wildlife!.animals.push(made.animal);
 const panel=new Node465(),focus=vi.fn();panel.connected=true;
 updateAnimalsPanel(panel as unknown as HTMLElement,f.world,focus,undefined,undefined,undefined,f.actions);
 expect(panel.querySelectorAll('thead th').map(n=>n.textContent)).toContain('Zone / Enclos');const select=panel.querySelector(`[data-animal-area-choice="${f.animalId}"]`)!;expect(select).not.toBeNull();select.focus();
 updateAnimalsPanel(panel as unknown as HTMLElement,f.world,focus,undefined,undefined,undefined,f.actions);expect(panel.querySelector(`[data-animal-area-choice="${f.animalId}"]`)).toBe(select);expect(document.activeElement).toBe(select as unknown as Element);expect(panel.querySelector(`[data-animal-area-choice="${made.animal.id}"]`)).toBeNull();expect(panel.textContent).toContain('Aucun enclos attribué');
 const inspector=new Node465();inspector.connected=true;createAnimalInspector(inspector as unknown as HTMLElement,{onHunt:()=>{},onClose:()=>{},animalAreas:f.actions});expect(updateAnimalInspector(inspector as unknown as HTMLElement,f.world,f.animalId)).toBe(true);
 const infoSelect=inspector.querySelector('[data-animal-area-choice]')!;infoSelect.focus();updateAnimalInspector(inspector as unknown as HTMLElement,f.world,f.animalId);expect(inspector.querySelector('[data-animal-area-choice]')).toBe(infoSelect);expect(document.activeElement).toBe(infoSelect as unknown as Element);expect(f.sent).toEqual([]);
});

test('disposal and a historical view cannot send or receive a latent assignment',async()=>{
 const f=fixture();f.select.change('home');f.controls.dispose();f.ack.resolve({ok:true});await settle();expect(f.pending).toEqual([true,false]);expect(f.animal.animalMapAreas287).toBeUndefined();
 const old=fixture();old.world.schemaVersion=286 as typeof old.world.schemaVersion;old.controls.update();old.select.change('home');expect(old.root.hidden).toBe(true);expect(old.sent).toEqual([]);
 const removed=fixture();removed.root.remove();removed.select.change('home');expect(removed.sent).toEqual([]);
});
