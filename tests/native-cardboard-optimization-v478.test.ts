import {afterEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {PALETTE,PrototypeCardboardArt,type CardboardDraw,type CardboardPiece} from '../src/ui3d/prototype-art';

type Command=unknown[];
interface Surface {canvas:HTMLCanvasElement;commands:Command[];options:unknown[]}
function installPaint():Surface[] {
  const surfaces:Surface[]=[],methods=new Set(['clearRect','fillRect','save','restore','beginPath','moveTo','lineTo','closePath','fill','stroke','arc','translate','rotate','scale','fillText','strokeText','drawImage','resetTransform']);
  vi.stubGlobal('document',{createElement:(tag:string)=>{
    if(tag!=='canvas')throw new Error(`Unexpected element ${tag}`);
    const commands:Command[]=[],state=new Map<PropertyKey,unknown>(),stack:Array<Map<PropertyKey,unknown>>=[],options:unknown[]=[];
    const ctx=new Proxy({}, {
      get(_target,key){
        if(typeof key==='string'&&methods.has(key))return (...args:unknown[])=>{
          commands.push([key,...args]);
          if(key==='save')stack.push(new Map(state));
          if(key==='restore'){state.clear();for(const [name,value] of stack.pop()??[])state.set(name,value);}
        };
        return state.get(key);
      },
      set(_target,key,value:unknown){state.set(key,value);commands.push(['set',key,value]);return true;}
    });
    const canvas={width:0,height:0,getContext:(_kind:string,config:unknown)=>{options.push(config);return ctx;}} as unknown as HTMLCanvasElement;
    surfaces.push({canvas,commands,options});return canvas;
  }});
  return surfaces;
}
function resources(piece:CardboardPiece){
  return {geometry:piece.userData.mesh.geometry,material:(Array.isArray(piece.userData.mesh.material)?piece.userData.mesh.material[0]:piece.userData.mesh.material) as THREE.Material,texture:piece.userData.texture};
}
const released=(resource:THREE.BufferGeometry|THREE.Material|THREE.Texture)=>{const spy=vi.fn();resource.addEventListener('dispose',spy);return spy;};
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('opt-in native cardboard background cache',()=>{
  it('preserves the exact background stream, callback entry state and random sequence for every repaint',()=>{
    const surfaces=installPaint(),art=new PrototypeCardboardArt(),samples:number[][]=[],entryFills:unknown[]=[];
    let consumption=7;
    const draw:CardboardDraw=(ctx,_w,_h,rng)=>{
      entryFills.push(ctx.fillStyle);samples.push(Array.from({length:consumption},()=>rng()));ctx.fillText('ink-start',0,0);
    };
    try{
      const plain=art.createPiece({w:5.14,h:4.89,seed:153,drawFn:draw});
      const cached=art.createPiece({w:5.14,h:4.89,seed:153,drawFn:draw,cacheBackground:true});
      expect(surfaces).toHaveLength(3);
      const background=surfaces[2]!,plainSurface=surfaces[0]!;
      const marker=plainSurface.commands.findIndex(command=>command[0]==='fillText'&&command[1]==='ink-start');
      expect(background.commands).toEqual(plainSurface.commands.slice(0,marker));
      expect(samples[1]).toEqual(samples[0]);expect(entryFills[1]).toBe(entryFills[0]);
      expect(background.options).toContainEqual({alpha:false});
      const backgroundCost=background.commands.length;
      consumption=31;plain.redraw();cached.redraw();
      expect(samples[3]).toEqual(samples[2]);expect(samples[3]!.slice(0,7)).toEqual(samples[1]);
      consumption=3;cached.redraw();
      expect(samples[4]).toEqual(samples[0]!.slice(0,3));
      expect(background.commands).toHaveLength(backgroundCost);
      expect(surfaces).toHaveLength(3);
      const copy=surfaces[1]!.commands.find(command=>command[0]==='drawImage');
      expect(copy).toEqual(['drawImage',background.canvas,0,0]);
      expect(background.canvas.width).toBe(cached.userData.canvas.width);
      expect(background.canvas.height).toBe(cached.userData.canvas.height);
    }finally{art.dispose();}
  });

  it('rebuilds only changed backgrounds while preserving textures, dimensions and material quality',()=>{
    const surfaces=installPaint(),art=new PrototypeCardboardArt();
    try{
      const piece=art.createPiece({w:5.14,h:4.89,seed:183,cacheBackground:true,bgColor:PALETTE.creamPaper});
      const background=surfaces[1]!,cost=background.commands.length,owned=resources(piece);
      const before=piece.userData.texture.version;
      piece.redraw();expect(background.commands).toHaveLength(cost);
      piece.redraw(undefined,PALETTE.sageMountain);expect(background.commands.length).toBeGreaterThan(cost);
      const rebuilt=background.commands.length;piece.redraw();expect(background.commands).toHaveLength(rebuilt);
      expect(resources(piece)).toEqual(owned);expect(piece.userData.texture.version).toBe(before+3);
      expect((owned.material as THREE.MeshStandardMaterial).roughness).toBe(.99);
      expect((owned.material as THREE.MeshStandardMaterial).metalness).toBe(0);
      expect(owned.texture.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(owned.texture.generateMipmaps).toBe(true);
      const calls=Object.values(owned).map(released);
      art.disposePiece(piece);art.disposePiece(piece);
      for(const call of calls)expect(call).toHaveBeenCalledTimes(1);
      expect(background.canvas.width).toBe(1);expect(background.canvas.height).toBe(1);
    }finally{art.dispose();}
  });

  it('leaves ordinary and transparent ink surfaces uncached by default',()=>{
    const surfaces=installPaint(),art=new PrototypeCardboardArt();
    try{
      const plain=art.createPiece({w:.63,h:.55,seed:600}),transparent=art.createPiece({w:2,h:.28,paper:false,cacheBackground:true});
      expect(surfaces).toHaveLength(2);
      const commands=surfaces[0]!.commands.length;plain.redraw();
      expect(surfaces[0]!.commands).toHaveLength(commands*2);
      transparent.redraw();expect(surfaces).toHaveLength(2);
      expect(surfaces[1]!.commands.some(command=>command[0]==='drawImage')).toBe(false);
    }finally{art.dispose();}
  });
});

describe('opt-in native input planes',()=>{
  it('keeps native raycasts and actions without paint, sampled GPU textures or visible shadow geometry',()=>{
    const surfaces=installPaint(),art=new PrototypeCardboardArt(),click=vi.fn(),draw=vi.fn();
    try{
      const piece=art.createPiece({w:3,h:2,seed:913,interactive:true,hitOnly:true,tooltip:'Action native',drawFn:draw,onClick:click});
      piece.updateMatrixWorld(true);
      expect(surfaces).toHaveLength(1);expect(surfaces[0]!.commands).toHaveLength(0);expect(draw).not.toHaveBeenCalled();
      expect(piece.userData.canvas.width).toBe(1);expect(piece.userData.canvas.height).toBe(1);
      expect(piece.userData.paper).toBe(false);expect(piece.userData.hitOnly).toBe(true);
      const owned=resources(piece),material=owned.material as THREE.MeshBasicMaterial;
      expect(material.map).toBeNull();expect(piece.userData.shadowMesh.visible).toBe(false);
      expect(piece.userData.shadowMesh.geometry).toBe(owned.geometry);
      expect(piece.userData.shadowMesh.material).toBe(material);
      const camera=new THREE.PerspectiveCamera();expect(camera.layers.test(piece.userData.mesh.layers)).toBe(false);
      const raycaster=new THREE.Raycaster(new THREE.Vector3(.23,.17,1),new THREE.Vector3(0,0,-1));
      expect(raycaster.intersectObjects([...art.interactiveMeshes])).toHaveLength(0);
      raycaster.layers.enable(31);expect(raycaster.intersectObjects([...art.interactiveMeshes])).toHaveLength(1);
      expect(piece.userData.mesh.userData.widgetGroup).toBe(piece);
      piece.userData.onClick?.();expect(click).toHaveBeenCalledTimes(1);
      const version=owned.texture.version;piece.redraw(draw);piece.setActive(true);
      expect(owned.texture.version).toBe(version);expect(draw).not.toHaveBeenCalled();expect(surfaces[0]!.commands).toHaveLength(0);
      piece.setBaseTransform(1,2,0,.1);expect(piece.userData.basePos.toArray()).toEqual([1,2,0]);expect(piece.userData.baseRot.toArray().slice(0,3)).toEqual([0,0,.1]);
    }finally{art.dispose();}
  });

  it('disposes shared dummy geometry/material exactly once and preserves siblings and factory materials',()=>{
    installPaint();const art=new PrototypeCardboardArt();
    try{
      const hit=art.createPiece({w:3,h:2,interactive:true,hitOnly:true}),sibling=art.createPiece({w:.63,h:.55});
      const calls=Object.values(resources(hit)).map(released),survivor=released(sibling.userData.texture),edge=released(art.cardboardEdgeMat),shadow=released(art.shadowMat);
      art.disposePiece(hit);art.disposePiece(hit);
      for(const call of calls)expect(call).toHaveBeenCalledTimes(1);
      expect(art.interactiveMeshes).not.toContain(hit.userData.mesh);
      for(const call of [survivor,edge,shadow])expect(call).not.toHaveBeenCalled();
      art.dispose();expect(survivor).toHaveBeenCalledTimes(1);expect(edge).toHaveBeenCalledTimes(1);expect(shadow).toHaveBeenCalledTimes(1);
    }finally{art.dispose();}
  });
});
