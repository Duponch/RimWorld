import {afterEach,describe,expect,it,vi} from 'vitest';
import {NativeStage} from '../src/ui3d/NativeStage';
import {ColonyRenderer} from '../src/render/ColonyRenderer';
vi.mock('../src/ui/native-cardboard-cursors',()=>({setNativeCursor:vi.fn()}));

type StageAccess={ [key:string]:unknown;hit:ReturnType<typeof vi.fn>;cameraWorldPoint(x:number,y:number):boolean;pointerDown(event:PointerEvent):void;pointerMove(event:PointerEvent):void;wheel(event:WheelEvent):void;worldPress?:{pointerId:number;button:number}};
function stageFixture(){
 vi.stubGlobal('document',{documentElement:{}});
 return Object.assign(Object.create(NativeStage.prototype),{worldVisible:true,frontVisible:false,page:{id:'factions',modal:true},pageBox:{x:20,y:100,width:600,height:400},displayScale:1,height:1000,bottomDockHeight:96,bottomOffset:0,bottomOpen:false,options:{},
  hit:vi.fn(()=>undefined),globeHit:vi.fn(()=>null),clearHint:vi.fn(),hover:vi.fn(),setPointerOverUi:vi.fn(),invalidate:vi.fn(),dismissPage:vi.fn()}) as StageAccess;
}
const pointer=(button:number,x=900,y=600,id=7)=>({button,buttons:button===2?2:button===1?4:1,clientX:x,clientY:y,pointerId:id,target:null,isPrimary:true,preventDefault:vi.fn(),stopImmediatePropagation:vi.fn()}) as unknown as PointerEvent;
type RendererAccess={ [key:string]:unknown;beginCameraOnlyInput(event:PointerEvent):boolean;endCameraOnlyInput(event:PointerEvent):boolean};
function rendererFixture(enabled=true){
 const cancel=vi.fn(()=>true),begin=vi.fn(),focus=vi.fn(),interaction=vi.fn(),context=vi.fn();
 const renderer=Object.assign(Object.create(ColonyRenderer.prototype),{cameraOnlyInput:()=>enabled,selectionInput:{cancel},keys:new Set(['w']),deferredHover:{beginCamera:begin},renderer:{domElement:{focus}},onInteractionCancel:interaction,onContext:context}) as RendererAccess;
 return {renderer,cancel,begin,focus,interaction,context};
}
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});

describe('native camera gestures around an open game page',()=>{
 it('protects modal command contexts without blocking a fresh right click from a nonmodal pawn inspector',()=>{
  const stage=stageFixture() as StageAccess&{hasOpenGamePage(modalOnly?:boolean):boolean};
  expect(stage.hasOpenGamePage(true)).toBe(true);stage.page={id:'inspect-pawn',modal:false};
  expect(stage.hasOpenGamePage()).toBe(true);expect(stage.hasOpenGamePage(true)).toBe(false);
 });
 it('passes only unoccupied game space, using unfiltered HUD hits and the physical scale',()=>{
  const stage=stageFixture();expect(stage.cameraWorldPoint(900,600)).toBe(true);expect(stage.hit).toHaveBeenLastCalledWith(900,600,true);
  expect(stage.cameraWorldPoint(100,200)).toBe(false);stage.displayScale=2;expect(stage.cameraWorldPoint(200,400)).toBe(false);expect(stage.cameraWorldPoint(1300,1100)).toBe(true);
  stage.hit.mockReturnValue({piece:{}});expect(stage.cameraWorldPoint(1300,1100)).toBe(false);
 });
 it('keeps front screens, dropdowns and text composition protected',()=>{
  for(const key of ['frontVisible','dropdown','editor']){const stage=stageFixture();stage[key]=key==='frontVisible'?true:{};expect(stage.cameraWorldPoint(900,600)).toBe(false);}
  const stage=stageFixture();stage.worldVisible=false;expect(stage.cameraWorldPoint(900,600)).toBe(false);
 });
 it('retains right/middle acquisition across the page while left outside still dismisses and is consumed',()=>{
  for(const button of [1,2]){const stage=stageFixture(),page=stage.page,event=pointer(button);stage.pointerDown(event);expect(stage.worldPress).toEqual({pointerId:7,button});expect(event.preventDefault).not.toHaveBeenCalled();expect(stage.dismissPage).not.toHaveBeenCalled();stage.pointerMove(pointer(button,100,200));expect(stage.page).toBe(page);expect(stage.worldPress?.button).toBe(button);}
  const stage=stageFixture(),left=pointer(0);stage.pointerDown(left);expect(stage.dismissPage).toHaveBeenCalledOnce();expect(left.preventDefault).toHaveBeenCalledOnce();expect(left.stopImmediatePropagation).toHaveBeenCalledOnce();expect(stage.worldPress).toBeUndefined();
 });
 it('lets the actual map wheel listener receive an outside gesture without changing the open page',()=>{
  const stage=stageFixture(),page=stage.page,event={clientX:900,clientY:600,deltaY:250,preventDefault:vi.fn(),stopImmediatePropagation:vi.fn()} as unknown as WheelEvent;
  stage.wheel(event);expect(event.preventDefault).not.toHaveBeenCalled();expect(event.stopImmediatePropagation).not.toHaveBeenCalled();expect(stage.page).toBe(page);expect(stage.dismissPage).not.toHaveBeenCalled();
 });
 it('releases selection lock without revoking native orders or submitting a context click, while legacy input is unchanged',()=>{
  for(const button of [1,2]){const f=rendererFixture(),event=pointer(button);expect(f.renderer.beginCameraOnlyInput(event)).toBe(true);expect(f.cancel).toHaveBeenCalledOnce();expect(f.begin).toHaveBeenCalledExactlyOnceWith(event);expect(f.focus).toHaveBeenCalledOnce();expect(f.interaction).not.toHaveBeenCalled();expect(f.renderer.endCameraOnlyInput(pointer(button,940,620,8))).toBe(false);expect(f.renderer.endCameraOnlyInput(event)).toBe(true);expect(f.renderer.pointerDown).toBeNull();expect(f.context).not.toHaveBeenCalled();}
  const f=rendererFixture(false);expect(f.renderer.beginCameraOnlyInput(pointer(2))).toBe(false);expect(f.cancel).not.toHaveBeenCalled();expect(f.begin).not.toHaveBeenCalled();const left=rendererFixture();expect(left.renderer.beginCameraOnlyInput(pointer(0))).toBe(false);expect(left.cancel).not.toHaveBeenCalled();
 });
});
