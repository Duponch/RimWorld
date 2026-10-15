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
  append(node:Fixture){this.children.push(node);node.parent=this;}
  contains(node:unknown):boolean{return node===this||this.children.some(child=>child.contains(node));}
  querySelector(selector:string){return this.selectors.get(selector)??null;}
  querySelectorAll(_selector:string){return [];}
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
  const doc=new Fixture() as Fixture&{createElement:()=>Fixture;activeElement:Fixture|null;fonts:Fixture};doc.createElement=()=>new Fixture();doc.activeElement=null;doc.fonts=new Fixture();readout.onBlur=()=>{doc.activeElement=null;};
  const win=new Fixture();
  vi.stubGlobal('Node',Fixture);vi.stubGlobal('HTMLElement',Fixture);vi.stubGlobal('HTMLDialogElement',class {});
  vi.stubGlobal('document',doc);vi.stubGlobal('window',win);vi.stubGlobal('queueMicrotask',vi.fn());
  vi.stubGlobal('ResizeObserver',class {observe(){}unobserve(){}});vi.stubGlobal('MutationObserver',class {observe(){}});
  let cell:{x:number;z:number}|null={x:8,z:9};
  const refresh=()=>{readout.hidden=!(cell??layout.retainedCell);};
  const layout=installHoverReadoutLayout(shell as unknown as HTMLElement,{cell:()=>cell,refresh});
  return {shell,readout,canvas,viewport,doc,win,layout,leaveCanvas(){cell=null;refresh();},hover(){cell={x:8,z:9};readout.hidden=false;},cell:()=>cell};
}

test('V380 entering the scroll readout retains its last real cell across renderer pointerleave, then releases it on exit',()=>{
  const f=fixture();f.readout.dataset.hoverLayout='scroll';const text=f.readout.textContent;
  f.shell.emit('pointerout',{target:f.canvas,relatedTarget:f.readout});
  f.leaveCanvas();expect(f.cell()).toBeNull();expect(f.layout.retainedCell).toEqual({x:8,z:9});expect(f.readout.hidden).toBe(false);
  expect(f.readout.textContent).toBe(text);
  const stop=vi.fn(),prevent=vi.fn();f.readout.emit('keydown',{key:'PageDown',stopPropagation:stop,preventDefault:prevent});
  expect(stop).toHaveBeenCalledOnce();expect(prevent).not.toHaveBeenCalled();
  f.readout.emit('pointerleave');expect(f.layout.retainedCell).toBeUndefined();expect(f.readout.hidden).toBe(true);
  expect(f.shell.measurements+f.readout.measurements).toBe(0);
});

test('V380 normal pointerleave clears hover; tool/map reset and window blur release only presentation retention',()=>{
  const f=fixture();f.readout.dataset.hoverLayout='whole';f.shell.emit('pointerout',{target:f.canvas,relatedTarget:f.readout});f.leaveCanvas();
  expect(f.layout.retainedCell).toBeUndefined();expect(f.readout.hidden).toBe(true);
  for(const release of [()=>f.layout.reset(),()=>f.win.emit('blur')]){
    f.hover();f.readout.dataset.hoverLayout='scroll';f.shell.emit('pointerout',{target:f.canvas,relatedTarget:f.readout});f.leaveCanvas();expect(f.readout.hidden).toBe(false);
    release();expect(f.layout.retainedCell).toBeUndefined();expect(f.readout.hidden).toBe(true);
  }
});


test('V380 fractional probe width is committed exactly rather than rounded across a wrapping boundary',()=>{
  const f=fixture(),stop=vi.fn();
  // This asserts the measurement-to-style transfer, not browser font metrics.
  // A fractional width must not be narrowed after its height probe.
  const measured={left:242.25,top:110.125,width:359.375,height:84};
  commitHoverReadoutPlacement(f.readout as unknown as HTMLElement,measured,'whole',stop);
  expect(f.readout.properties.get('width')).toBe('359.375px');
  expect(f.readout.properties.get('left')).toBe('242.25px');
  expect(f.readout.properties.get('height')).toBe('84px');
  expect(f.shell.measurements+f.readout.measurements).toBe(0);
});

test.each(['scroll','panel'] as const)('V380 %s to whole releases focus/hold and no longer captures reading keys',mode=>{
  const f=fixture();f.readout.dataset.hoverLayout=mode;
  f.shell.emit('pointerout',{target:f.canvas,relatedTarget:f.readout});f.leaveCanvas();
  f.doc.activeElement=f.readout;f.readout.tabIndex=0;
  expect(f.layout.retainedCell).toEqual({x:8,z:9});expect(f.readout.hidden).toBe(false);
  commitHoverReadoutPlacement(f.readout as unknown as HTMLElement,{left:242,top:110,width:400,height:84},'whole',()=>f.layout.resume());
  expect(f.readout.blurCalls).toBe(1);expect(f.doc.activeElement).toBeNull();
  expect(f.layout.retainedCell).toBeUndefined();expect(f.readout.hidden).toBe(true);expect(f.readout.tabIndex).toBe(-1);
  const stop=vi.fn();f.readout.emit('keydown',{key:'ArrowDown',stopPropagation:stop});f.readout.emit('wheel',{stopPropagation:stop});
  f.readout.emit('focusin');expect(f.layout.retainedCell).toBeUndefined();expect(stop).not.toHaveBeenCalled();
});
