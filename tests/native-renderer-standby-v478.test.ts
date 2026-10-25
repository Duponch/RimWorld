import {describe, expect, it, vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {NativeRendererStandby} from '../src/ui3d/NativeRendererStandby';

type MRT = ReturnType<THREE.WebGPURenderer['getMRT']>;
type Hook = ReturnType<THREE.WebGPURenderer['getRenderObjectFunction']>;

/** Models lazy output-surface allocation separately from the canvas size. */
class StandbyRendererDouble {
  initialized = true;
  width = 1440;
  height = 1000;
  pixelRatio = 2;
  outputWidth = 2880;
  outputHeight = 2000;
  readonly xr = {enabled: true};
  readonly canvasStyle = {width: '100%', height: '100%'};
  readonly device = {};
  readonly texture = new THREE.Texture();
  readonly material = new THREE.MeshBasicMaterial();
  readonly dispose = vi.fn();
  readonly textureDispose = vi.spyOn(this.texture, 'dispose');
  readonly materialDispose = vi.spyOn(this.material, 'dispose');
  readonly originalTarget = new THREE.RenderTarget(13, 17);
  readonly originalOutput = new THREE.RenderTarget(19, 23);
  target: THREE.RenderTarget | null = this.originalTarget;
  output: THREE.RenderTarget | null = this.originalOutput;
  cube = 2;
  mip = 1;
  mrt: MRT = {name: 'retained-mrt'} as unknown as MRT;
  hook: Hook = () => {};
  scissor = true;
  autoClear = true;
  autoClearColor = false;
  autoClearDepth = false;
  autoClearStencil = true;
  readonly clearColor = new THREE.Color(0x738291);
  clearAlpha = .37;
  clearDepth = .5;
  clearStencil = 7;
  fail = false;
  readonly sizes: number[][] = [];
  readonly clears: Array<{size: number[]; target: unknown; output: unknown; mrt: MRT; hook: Hook; scissor: boolean; xr: boolean}> = [];
  asRenderer(): THREE.WebGPURenderer {return this as unknown as THREE.WebGPURenderer;}
  getSize(value: THREE.Vector2): THREE.Vector2 {return value.set(this.width, this.height);}
  getPixelRatio(): number {return this.pixelRatio;}
  getDrawingBufferSize(value: THREE.Vector2): THREE.Vector2 {return value.set(Math.floor(this.width*this.pixelRatio), Math.floor(this.height*this.pixelRatio));}
  setDrawingBufferSize(width: number, height: number, ratio: number): void {
    this.width = width; this.height = height; this.pixelRatio = ratio; this.sizes.push([width, height, ratio]);
  }
  getRenderTarget(): THREE.RenderTarget | null {return this.target;}
  setRenderTarget(value: THREE.RenderTarget | null, cube = 0, mip = 0): void {this.target=value; this.cube=cube; this.mip=mip;}
  getOutputRenderTarget(): THREE.RenderTarget | null {return this.output;}
  setOutputRenderTarget(value: THREE.RenderTarget | null): void {this.output=value;}
  getActiveCubeFace(): number {return this.cube;}
  getActiveMipmapLevel(): number {return this.mip;}
  getMRT(): MRT {return this.mrt;}
  setMRT(value: MRT): void {this.mrt=value;}
  getRenderObjectFunction(): Hook {return this.hook;}
  setRenderObjectFunction(value: Hook): void {this.hook=value;}
  getScissorTest(): boolean {return this.scissor;}
  setScissorTest(value: boolean): void {this.scissor=value;}
  clear(color: boolean, depth: boolean, stencil: boolean): void {
    expect([color,depth,stencil]).toEqual([true,true,true]);
    this.clears.push({size: [this.width,this.height,this.pixelRatio], target:this.target,output:this.output,
      mrt:this.mrt,hook:this.hook,scissor:this.scissor,xr:this.xr.enabled});
    // Emulate Three's output pass mutation, including its exceptional path.
    this.autoClear=false; this.xr.enabled=false;
    if(this.fail) throw new Error('submission failed');
    this.outputWidth=this.width*this.pixelRatio; this.outputHeight=this.height*this.pixelRatio;
  }
}

function fixture() {
  const renderer = new StandbyRendererDouble();
  const standby = new NativeRendererStandby(renderer.asRenderer());
  const mrt = renderer.mrt, hook = renderer.hook;
  const expectPreserved = () => {
    expect(renderer.target).toBe(renderer.originalTarget); expect(renderer.output).toBe(renderer.originalOutput);
    expect([renderer.cube,renderer.mip]).toEqual([2,1]);
    expect(renderer.mrt).toBe(mrt); expect(renderer.hook).toBe(hook);
    expect(renderer.scissor).toBe(true); expect(renderer.xr.enabled).toBe(true);
    expect([renderer.autoClear,renderer.autoClearColor,renderer.autoClearDepth,renderer.autoClearStencil]).toEqual([true,false,false,true]);
    expect([renderer.clearColor.getHex(),renderer.clearAlpha,renderer.clearDepth,renderer.clearStencil]).toEqual([0x738291,.37,.5,7]);
    expect(renderer.canvasStyle).toEqual({width:'100%',height:'100%'});
    expect(renderer.dispose).not.toHaveBeenCalled(); expect(renderer.textureDispose).not.toHaveBeenCalled(); expect(renderer.materialDispose).not.toHaveBeenCalled();
  };
  return {renderer,standby,expectPreserved};
}

describe('exclusive native renderer standby', () => {
  it('does not reset a visible canvas when its dimensions and DPR already match',()=>{
    const {renderer,standby}=fixture();
    standby.setActive(true);standby.resize(1440,1000,2);standby.setActive(true);
    expect(renderer.sizes).toHaveLength(0);expect(renderer.clears).toHaveLength(0);
    standby.resize(1440,1000,1);expect(renderer.sizes).toEqual([[1440,1000,1]]);
    standby.setActive(true);expect(renderer.sizes).toHaveLength(1);
  });
  it('submits a tiny default-output clear instead of retaining lazy full-size attachments', () => {
    const {renderer,standby,expectPreserved}=fixture();
    standby.setActive(false);
    expect(renderer.clears).toEqual([{size:[1,1,1],target:null,output:null,mrt:null,hook:null,scissor:false,xr:false}]);
    expect([renderer.outputWidth,renderer.outputHeight]).toEqual([1,1]);
    expect(standby.stats).toEqual({active:false,parked:true,transitions:1,parks:1,failures:0,drawingBuffer:{width:1,height:1}});
    expectPreserved();
  });

  it('retains the latest desired viewport and DPR while hidden, restoring before the next visible render', () => {
    const {renderer,standby,expectPreserved}=fixture();
    standby.setActive(false); standby.resize(2557,1440,1.5); standby.resize(900,700,2); standby.setActive(false);
    expect(renderer.sizes).toEqual([[1,1,1]]); expect(renderer.clears).toHaveLength(1);
    standby.setActive(true);
    expect(renderer.sizes.at(-1)).toEqual([900,700,2]);
    expect(standby.stats.drawingBuffer).toEqual({width:1800,height:1400});
    expect(standby.stats.parked).toBe(false); expectPreserved();
  });

  it('keeps normal active sizing and remembers the initial viewport without a resize', () => {
    const {renderer,standby}=fixture();
    standby.setActive(false); standby.setActive(true);
    expect(renderer.sizes.at(-1)).toEqual([1440,1000,2]);
    standby.resize(810,610,1.25);
    expect(renderer.sizes.at(-1)).toEqual([810,610,1.25]);
  });

  it('defers submission until initialization and retries the same inactive request after ready', () => {
    const {renderer,standby}=fixture(); renderer.initialized=false;
    standby.setActive(false); expect(renderer.clears).toHaveLength(0); expect(standby.stats.parked).toBe(false);
    renderer.initialized=true; standby.setActive(false);
    expect(renderer.clears).toHaveLength(1); expect(standby.stats.parked).toBe(true);
  });

  it('restores state after failed submission and allows retry or immediate activation', () => {
    const {renderer,standby,expectPreserved}=fixture(); renderer.fail=true;
    expect(()=>standby.setActive(false)).toThrow('submission failed'); expectPreserved();
    expect(standby.stats.parked).toBe(false); expect(standby.stats.failures).toBe(1);
    renderer.fail=false; standby.setActive(false); expectPreserved();
    expect(standby.stats.parks).toBe(1);
    standby.setActive(true); expect(renderer.sizes.at(-1)).toEqual([1440,1000,2]);
  });

  it('rejects invalid sizes without overwriting the restore viewport', () => {
    const {renderer,standby}=fixture(); standby.setActive(false);
    for(const dimensions of [[0,10,1],[10,-1,1],[10,10,0],[NaN,10,1],[10,Infinity,1]]) {
      expect(()=>standby.resize(dimensions[0]!,dimensions[1]!,dimensions[2]!)).toThrow(RangeError);
    }
    standby.setActive(true); expect(renderer.sizes.at(-1)).toEqual([1440,1000,2]);
  });
});
