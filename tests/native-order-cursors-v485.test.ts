import {readFileSync} from 'node:fs';
import {afterEach,expect,test,vi} from 'vitest';
import {paintNativeOrderCursor,installNativeCardboardCursors,syncNativeMapToolCursor} from '../src/ui/native-cardboard-cursors';
import {syncToolCursor} from '../src/ui/tool-cursors';
import {drawNativeActionIcon} from '../src/ui3d/native-action-icons';

vi.mock('../src/ui3d/native-action-icons',()=>({drawNativeActionIcon:vi.fn()}));
afterEach(()=>vi.unstubAllGlobals());

function rootAndViewport(){
  const values=new Map<string,string>(),rootWrites=vi.fn((key:string,value:string)=>values.set(key,value));
  let canvases=0,images=0;
  const ctx={setTransform:vi.fn(),clearRect:vi.fn(),drawImage:vi.fn()};
  const document={createElement:()=>{const index=++canvases;return {width:0,height:0,getContext:()=>ctx,toDataURL:()=>`data:image/png;base64,cursor-${index}`};},documentElement:null as unknown as HTMLElement};
  const root={dataset:{},style:{setProperty:rootWrites,getPropertyValue:(key:string)=>values.get(key)??'',removeProperty:(key:string)=>values.delete(key)}} as unknown as HTMLElement;
  document.documentElement=root;
  const viewportValues=new Map<string,string>();
  const viewport={ownerDocument:document,dataset:{},removeAttribute:vi.fn(),style:{setProperty:(key:string,value:string)=>viewportValues.set(key,value)}} as unknown as HTMLElement;
  vi.stubGlobal('CSS',{supports:()=>true});
  vi.stubGlobal('Image',class{onload:(()=>void)|undefined;onerror:(()=>void)|undefined;set src(_value:string){images++;queueMicrotask(()=>this.onload?.());}});
  installNativeCardboardCursors(root);
  return {root,viewport,values,viewportValues,rootWrites,ctx,get canvases(){return canvases;},get images(){return images;}};
}

test('order cursor paints the exact native action icon beside a small physical arrow',()=>{
  const ctx={setTransform:vi.fn(),clearRect:vi.fn(),drawImage:vi.fn()} as unknown as CanvasRenderingContext2D;
  const arrow={} as CanvasImageSource,draw=vi.fn();
  paintNativeOrderCursor(ctx,'mine','pointer',arrow,2,draw);
  expect(ctx.setTransform).toHaveBeenCalledWith(2,0,0,2,0,0);
  expect(ctx.drawImage).toHaveBeenCalledWith(arrow,0,0,16,16);
  expect(draw).toHaveBeenCalledWith(ctx,'mine',26,26,11,'#261e18','#f4ecda');
});

test('native selection creates one cached order family and keeps UI/terrain semantics separate',async()=>{
  const owner=rootAndViewport();
  syncToolCursor(owner.viewport,'chop');
  expect(owner.viewport.dataset.cursorMode).toBe('order');
  expect(owner.viewportValues.get('--map-tool-cursor')).toBe('var(--cursor-tool-chop, var(--cursor-pointer, crosshair))');
  await vi.waitFor(()=>expect(owner.values.has('--cursor-tool-chop-grabbing')).toBe(true));
  expect(owner.canvases).toBe(6);expect(owner.images).toBe(3);
  expect(vi.mocked(drawNativeActionIcon).mock.calls.filter(call=>call[1]==='chop')).toHaveLength(6);
  expect(owner.values.get('--cursor-tool-chop')).toContain('image-set(');
  const writes=owner.rootWrites.mock.calls.length;
  syncToolCursor(owner.viewport,'chop');await Promise.resolve();await Promise.resolve();
  expect(owner.canvases).toBe(6);expect(owner.rootWrites).toHaveBeenCalledTimes(writes);
  syncToolCursor(owner.viewport,'select');
  expect(owner.viewportValues.get('--map-tool-cursor')).toBe('var(--cursor-pointer, default)');
  expect(owner.viewport.dataset.cursorMode).toBe('select');expect(owner.canvases).toBe(6);
});

test('a delayed old order cannot replace a newer selected order or redraw on pointer motion',async()=>{
  const owner=rootAndViewport();
  syncToolCursor(owner.viewport,'harvest');syncToolCursor(owner.viewport,'mine');
  await vi.waitFor(()=>expect(owner.values.has('--cursor-tool-mine')).toBe(true));
  expect(owner.viewportValues.get('--map-tool-cursor')).toBe('var(--cursor-tool-mine, var(--cursor-pointer, crosshair))');
  expect(owner.viewport.dataset.cursor).toBe('mine');
  const canvases=owner.canvases;
  syncNativeMapToolCursor(owner.root,owner.viewport,'mine');await Promise.resolve();await Promise.resolve();
  expect(owner.canvases).toBe(canvases);
});

test('native CSS restores tool composites and retains the overlay semantic priority',()=>{
  const css=readFileSync(new URL('../src/ui/cursors.css',import.meta.url),'utf8');
  expect(css).toContain('html[data-cardboard-cursors="true"] #viewport[data-cursor] canvas { cursor: var(--map-tool-cursor, var(--cursor-pointer, default))');
  expect(css).toContain('html[data-native-cursor] #viewport[data-cursor] canvas { cursor: var(--native-ui-cursor, default)');
  expect(css).toContain('html[data-native-cursor="grabbing"] #viewport[data-cursor-mode="order"] canvas { cursor: var(--map-tool-grabbing-cursor');
});
