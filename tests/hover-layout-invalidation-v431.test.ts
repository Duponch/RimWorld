import {afterEach,expect,test,vi} from 'vitest';
import {commitHoverReadoutPlacement,installHoverReadoutLayout} from '../src/ui/hover-readout-layout';

/** Event contract double only. No browser geometry or native pointer delivery
 * is credited: queueMicrotask is held so events cannot trigger layout reads. */
class Fixture {
  children:Fixture[]=[];parent:Fixture|undefined;hidden=false;dataset:Record<string,string>={};tabIndex=-1;isConnected=true;
  selectors=new Map<string,Fixture>();listeners=new Map<string,EventListener[]>();attributes=new Map<string,string>();
  properties=new Map<string,string>();measurements=0;textContent='Terrain\nLumière\nDernière ligne réelle';
  style={getPropertyValue:(name:string)=>this.properties.get(name)??'',setProperty:(name:string,value:string)=>{this.properties.set(name,value);},removeProperty:(name:string)=>{this.properties.delete(name);}};
  setAttribute(name:string,value:string){this.attributes.set(name,value);}
  getAttribute(name:string){return this.attributes.get(name)??null;}
  append(node:Fixture){this.children.push(node);node.parent=this;}
  contains(node:unknown):boolean{return node===this||this.children.some(child=>child.contains(node));}
  querySelector(selector:string){return this.selectors.get(selector)??null;}
  querySelectorAll(selector:string):Fixture[]{return selector==='.order-menu'&&this.selectors.has(selector)?[this.selectors.get(selector)!]:[];}
  addEventListener(type:string,callback:EventListener){const list=this.listeners.get(type)??[];list.push(callback);this.listeners.set(type,list);}
  emit(type:string,data:Record<string,unknown>={}){const event={type,target:this,...data};for(const callback of this.listeners.get(type)??[])callback(event as unknown as Event);}
  getBoundingClientRect(){this.measurements++;throw Error('Pointer callbacks must not measure DOM.');}
  blurCalls=0;onBlur=()=>{};
  blur(){this.blurCalls++;this.onBlur();}
}
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
  const shell=new Fixture(),readout=new Fixture(),resources=new Fixture(),inspector=new Fixture(),dock=new Fixture(),viewport=new Fixture(),canvas=new Fixture();
  viewport.append(canvas);for(const node of [readout,resources,inspector,dock,viewport])shell.append(node);
  for(const [key,node] of [['#map-hover-readout',readout],['.resource-list',resources],['#inspector',inspector],['.map-tools-dock',dock],['#viewport',viewport]] as const)shell.selectors.set(key,node);
  const menu=new Fixture();const doc=new Fixture() as Fixture&{createElement:()=>Fixture;activeElement:Fixture|null;fonts:Fixture};doc.selectors.set('.order-menu',menu);doc.createElement=()=>new Fixture();doc.activeElement=null;doc.fonts=new Fixture();readout.onBlur=()=>{doc.activeElement=null;};
  const win=new Fixture();
  vi.stubGlobal('Node',Fixture);vi.stubGlobal('HTMLElement',Fixture);vi.stubGlobal('HTMLDialogElement',class {});
  vi.stubGlobal('document',doc);vi.stubGlobal('window',win);const pending:(()=>void)[]=[];vi.stubGlobal('queueMicrotask',vi.fn((callback:()=>void)=>pending.push(callback)));
  vi.stubGlobal('ResizeObserver',class {observe(){}unobserve(){}});const observers:{callback:MutationCallback;observed:{node:Fixture;options:MutationObserverInit}[]}[]=[];
  vi.stubGlobal('MutationObserver',class {entry:{callback:MutationCallback;observed:{node:Fixture;options:MutationObserverInit}[]};constructor(callback:MutationCallback){this.entry={callback,observed:[]};observers.push(this.entry);}observe(node:Fixture,options:MutationObserverInit){this.entry.observed.push({node,options});}});
  let cell:{x:number;z:number}|null={x:8,z:9};
  const refresh=()=>{readout.hidden=!(cell??layout.retainedCell);};
  const layout=installHoverReadoutLayout(shell as unknown as HTMLElement,{cell:()=>cell,refresh});
  return {shell,readout,canvas,viewport,doc,win,layout,menu,observers,pending,inspector,flushInitial(){shell.hidden=true;pending.shift()!();shell.hidden=false;},leaveCanvas(){cell=null;refresh();},hover(){cell={x:8,z:9};readout.hidden=false;},cell:()=>cell};
}


function attribute(target:Fixture,name:string,oldValue:string|null):MutationRecord{return {type:'attributes',target,attributeName:name,oldValue} as unknown as MutationRecord;}
function deliver(owner:ReturnType<typeof fixture>['observers'][number],records:MutationRecord[]){owner.callback(records,{} as MutationObserver);}

test('V431 repeated hidden/style/class writes do not schedule layout or measure DOM',()=>{
 const f=fixture();f.flushInitial();const owner=f.observers[0]!;
 expect(owner.observed.every(row=>row.options.attributeOldValue)).toBe(true);
 for(const name of ['hidden','class','style']){f.inspector.setAttribute(name,name==='hidden'?'':'same');deliver(owner,[attribute(f.inspector,name,f.inspector.getAttribute(name))]);}
 expect(f.pending).toHaveLength(0);expect(f.shell.measurements+f.readout.measurements).toBe(0);
 f.layout.changed();expect(f.pending).toHaveLength(1); // real changed text still schedules
});

test('V431 real attributes, child replacement and batched flips remain invalidations',()=>{
 for(const records of ['added','removed','child','flip'] as const){
  const f=fixture();f.flushInitial();const owner=f.observers[0]!;
  if(records==='added'){f.inspector.setAttribute('hidden','');deliver(owner,[attribute(f.inspector,'hidden',null)]);}
  if(records==='removed')deliver(owner,[attribute(f.inspector,'hidden','')]);
  if(records==='child')deliver(owner,[{type:'childList',target:f.inspector} as unknown as MutationRecord]);
  if(records==='flip'){f.inspector.setAttribute('class','A');deliver(owner,[attribute(f.inspector,'class','A'),attribute(f.inspector,'class','B')]);}
  expect(f.pending,records).toHaveLength(1);
 }
});

test('V431 resident contextual menu filters only identical attributes',()=>{
 const f=fixture();f.flushInitial();const owner=f.observers[1]!;
 expect(owner.observed.some(row=>row.node===f.menu&&row.options.attributeOldValue)).toBe(true);
 f.menu.setAttribute('style','left:1px');deliver(owner,[attribute(f.menu,'style','left:1px')]);expect(f.pending).toHaveLength(0);
 deliver(owner,[attribute(f.menu,'style','left:0px')]);expect(f.pending).toHaveLength(1);
 expect(f.shell.measurements+f.readout.measurements).toBe(0);
});
