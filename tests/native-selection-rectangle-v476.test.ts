import {afterEach,describe,expect,it,vi} from 'vitest';
import {PawnSelectionInput} from '../src/render/PawnSelectionInput';

afterEach(()=>vi.unstubAllGlobals());
describe('native selection presentation port',()=>{
  it('draws, selects and releases capture without creating a DOM rectangle',()=>{
    const active=new Set<number>(),rectangle=vi.fn(),select=vi.fn(),lock=vi.fn();
    const canvas={addEventListener:vi.fn(),removeEventListener:vi.fn(),setPointerCapture:(id:number)=>active.add(id),hasPointerCapture:(id:number)=>active.has(id),releasePointerCapture:(id:number)=>active.delete(id)};
    const createElement=vi.fn(()=>{throw Error('Native selection must not create HTML');});
    vi.stubGlobal('document',{createElement,elementFromPoint:()=>canvas});
    const input=new PawnSelectionInput(canvas as unknown as HTMLCanvasElement,{
      enabled:()=>true,pawns:()=>[{id:7,x:20,y:30,radius:4,depth:0,category:0},{id:8,x:25,y:31,radius:4,depth:0,category:1}],
      selected:()=>new Set(),canInspect:()=>false,preferObjectCycle:()=>false,select,inspect:vi.fn(),lock,rectangle,
    });
    const event=(x:number,y:number)=>({button:0,buttons:1,pointerId:3,isPrimary:true,clientX:x,clientY:y,shiftKey:false,preventDefault:vi.fn(),stopImmediatePropagation:vi.fn()}) as unknown as PointerEvent;
    expect(input.down(event(10,10))).toBe(true);expect(input.active).toBe(true);expect(active.has(3)).toBe(true);
    input.move(event(40,50));expect(rectangle).toHaveBeenLastCalledWith({left:10,top:10,width:30,height:40});
    input.up(event(40,50));expect(select).toHaveBeenCalledWith({ids:[7],additive:false,toggle:false});
    expect(rectangle).toHaveBeenLastCalledWith(null);expect(input.active).toBe(false);expect(active.size).toBe(0);expect(lock).toHaveBeenLastCalledWith(false);
    input.dispose();expect(createElement).not.toHaveBeenCalled();expect(canvas.removeEventListener).toHaveBeenCalledWith('dblclick',expect.any(Function));
  });
  it('cancels a native rectangle without committing selection',()=>{
    const select=vi.fn(),rectangle=vi.fn(),release=vi.fn();
    const canvas={addEventListener:vi.fn(),removeEventListener:vi.fn(),setPointerCapture:vi.fn(),hasPointerCapture:()=>true,releasePointerCapture:release};
    vi.stubGlobal('document',{createElement:()=>{throw Error('Unexpected HTML');},elementFromPoint:()=>canvas});
    const input=new PawnSelectionInput(canvas as unknown as HTMLCanvasElement,{enabled:()=>true,pawns:()=>[],selected:()=>new Set(),canInspect:()=>false,preferObjectCycle:()=>false,select,inspect:vi.fn(),lock:vi.fn(),rectangle});
    input.down({button:0,pointerId:9,isPrimary:true,clientX:4,clientY:5,shiftKey:false,preventDefault:vi.fn(),stopImmediatePropagation:vi.fn()} as unknown as PointerEvent);
    expect(input.cancel()).toBe(true);expect(select).not.toHaveBeenCalled();expect(rectangle).toHaveBeenLastCalledWith(null);expect(release).toHaveBeenCalledWith(9);
    expect(input.cancel()).toBe(false);input.dispose();
  });
});
