import { describe,expect,it,vi } from 'vitest';
import type * as THREE from 'three/webgpu';
import { FILTH_KINDS,type FilthKind,type FilthRecord } from '../src/sim/filth-rules.ts';
import { FILTH_ATLAS,createFilthAtlas,filthDecal } from '../src/render/filth-appearance.ts';
import { FilthLayer } from '../src/render/FilthLayer.ts';

const record=(kind:FilthKind,x=7,z=11):FilthRecord=>({id:42,kind,x,z,thickness:1,grownCore:123,expiresAfterCore:456,nextCheckCore:789});
const limits:Record<FilthKind,number>={dirt:97,trash:255,blood:180,ash:220,vomit:180,'corpse-bile':255};

function usedTiles(kind:FilthKind):number[] {
  const tiles=new Set<number>();
  for(let x=0;x<32&&tiles.size<4;x++)for(let z=0;z<32&&tiles.size<4;z++)tiles.add(filthDecal(record(kind,x,z),0).tile);
  return [...tiles].sort((a,b)=>a-b);
}

function alphas(data:Uint8Array,width:number,tile:number):number[] {
  const {tileSize,columns}=FILTH_ATLAS,tx=(tile%columns)*tileSize,ty=Math.floor(tile/columns)*tileSize,out:number[]=[];
  for(let y=0;y<tileSize;y++)for(let x=0;x<tileSize;x++)out.push(data[((ty+y)*width+tx+x)*4+3]!);
  return out;
}

describe('aspect physique des salissures V107',()=>{
  it('produit les 24 tuiles RGBA attendues, avec bords transparents et silhouettes non rectangulaires',()=>{
    const {data,width,height}=createFilthAtlas(),{tileSize,columns,rows,variants}=FILTH_ATLAS;
    expect({tileSize,columns,rows,variants}).toEqual({tileSize:128,columns:8,rows:3,variants:4});
    expect({width,height,length:data.length}).toEqual({width:1024,height:384,length:1024*384*4});
    for(let tile=0;tile<columns*rows;tile++){
      const a=alphas(data,width,tile);
      let left:number=tileSize,top:number=tileSize,right:number=-1,bottom:number=-1;
      for(let y=0;y<tileSize;y++)for(let x=0;x<tileSize;x++)if(a[y*tileSize+x]!>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
      expect(right,`tuile ${tile} vide`).toBeGreaterThan(left);
      expect(bottom,`tuile ${tile} vide`).toBeGreaterThan(top);
      for(let i=0;i<tileSize;i++){
        expect(a[i],`bord haut ${tile}`).toBe(0);
        expect(a[(tileSize-1)*tileSize+i],`bord bas ${tile}`).toBe(0);
        expect(a[i*tileSize],`bord gauche ${tile}`).toBe(0);
        expect(a[i*tileSize+tileSize-1],`bord droit ${tile}`).toBe(0);
      }
      let transparentInside=false;
      for(let y=top;y<=bottom&&!transparentInside;y++)for(let x=left;x<=right;x++)if(a[y*tileSize+x]===0){transparentInside=true;break;}
      expect(transparentInside,`silhouette carrée ${tile}`).toBe(true);
    }
  });

  it('offre quatre variantes par espèce, des alphas nuancés et une terre moins dense que le sang',()=>{
    const atlas=createFilthAtlas(),groups=new Map<FilthKind,number[]>(),all=new Set<number>();
    for(const kind of FILTH_KINDS){
      const tiles=usedTiles(kind);expect(tiles,kind).toHaveLength(4);groups.set(kind,tiles);
      for(const tile of tiles){
        expect(tile).toBeGreaterThanOrEqual(0);expect(tile).toBeLessThan(FILTH_ATLAS.columns*FILTH_ATLAS.rows);
        expect(all.has(tile),`tuile ${tile} partagée entre espèces`).toBe(false);all.add(tile);
        const a=alphas(atlas.data,atlas.width,tile),limit=limits[kind];
        expect(Math.max(...a),`${kind} dépasse son alpha`).toBeLessThanOrEqual(limit);
        expect(a.some(v=>v>0&&v<limit),`${kind} sans alpha intermédiaire`).toBe(true);
      }
    }
    expect(all.size).toBe(24);
    const mass=(kind:FilthKind)=>groups.get(kind)!.reduce((sum,tile)=>sum+alphas(atlas.data,atlas.width,tile).reduce((s,a)=>s+a,0),0);
    expect(mass('dirt')).toBeLessThan(mass('blood'));
  });

  it('borne placement, taille et angle des plans sans déplacer leur cellule source',()=>{
    for(const kind of FILTH_KINDS)for(let x=0;x<12;x++){
      const f=record(kind,x,9),d=filthDecal(f,x%5),base=kind==='ash'?3:1;
      expect(Math.abs(d.x-f.x)).toBeLessThanOrEqual(.450001);
      expect(Math.abs(d.z-f.z)).toBeLessThanOrEqual(.450001);
      expect(d.width).toBeGreaterThanOrEqual(base*.8-.000001);expect(d.width).toBeLessThanOrEqual(base*1.2+.000001);
      expect(d.height).toBeGreaterThanOrEqual(base*.8-.000001);expect(d.height).toBeLessThanOrEqual(base*1.2+.000001);
      expect(d.rotation).toBeGreaterThanOrEqual(0);expect(d.rotation).toBeLessThanOrEqual(Math.PI*2+.000001);
      expect(typeof d.flip).toBe('boolean');
    }
  });

  it('préserve exactement les anciens plans quand une trace épaissit puis s’amincit, indépendamment de son id et du temps',()=>{
    for(const kind of FILTH_KINDS){
      const f=record(kind),first=Array.from({length:5},(_,i)=>filthDecal(f,i));
      for(const thickness of [2,5,3,1]){
        const changed={...f,thickness,id:999,grownCore:999999,nextCheckCore:1};
        expect(Array.from({length:thickness},(_,i)=>filthDecal(changed,i))).toEqual(first.slice(0,thickness));
      }
    }
  });

  it('ne modifie ni ses entrées ni le générateur aléatoire global',()=>{
    const f=Object.freeze(record('blood')),before=JSON.stringify(f),random=vi.spyOn(Math,'random').mockImplementation(()=>{throw new Error('tirage global interdit');});
    try {
      const atlas=createFilthAtlas();expect(atlas.data.length).toBe(atlas.width*atlas.height*4);
      const first=filthDecal(f,2),second=filthDecal(f,2);
      expect(second).toEqual(first);
      expect(JSON.stringify(f)).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally {random.mockRestore();}
  });

  it('garde le lot de plans résident et voit les mutations en place des traces',()=>{
    const layer=new FilthLayer(),items=[{...record('dirt'),thickness:2},{...record('blood',12,13),thickness:3}];
    try {
      layer.update(items);
      const pose=layer.mesh.geometry.getAttribute('filthPose') as THREE.InstancedBufferAttribute,shape=layer.mesh.geometry.getAttribute('filthShape') as THREE.InstancedBufferAttribute;
      expect(layer.mesh.geometry.instanceCount).toBe(5);expect(layer.mesh.visible).toBe(true);
      const version=[pose.version,shape.version],firstPose=Array.from(pose.array).slice(0,4),firstShape=Array.from(shape.array).slice(0,4);
      layer.update(items);
      expect([pose.version,shape.version]).toEqual(version);
      expect(Array.from(pose.array).slice(0,4)).toEqual(firstPose);
      expect(Array.from(shape.array).slice(0,4)).toEqual(firstShape);
      items[0]!.thickness=1;items[0]!.x=8;layer.update(items);
      expect(layer.mesh.geometry.instanceCount).toBe(4);
      expect([pose.version,shape.version]).toEqual(version.map(v=>v+1));
      expect(pose.getX(0)).toBeCloseTo(filthDecal(items[0]!,0).x,5);
      expect(Array.from(pose.array).slice(0,4)).not.toEqual(firstPose);
    } finally {layer.dispose();}
  });

  it('restaure un lot vide après compilation et ne masque pas une trace arrivée entre-temps',()=>{
    const layer=new FilthLayer();
    try {
      expect(layer.mesh.visible).toBe(false);expect(layer.mesh.geometry.instanceCount).toBe(0);
      const restoreEmpty=layer.prepareForCompile();
      expect(layer.mesh.visible).toBe(true);expect(layer.mesh.geometry.instanceCount).toBe(1);
      restoreEmpty();expect(layer.mesh.visible).toBe(false);expect(layer.mesh.geometry.instanceCount).toBe(0);
      const restoreStale=layer.prepareForCompile();
      layer.update([record('ash')]);
      restoreStale();expect(layer.mesh.visible).toBe(true);expect(layer.mesh.geometry.instanceCount).toBe(1);
      layer.update([]);expect(layer.mesh.visible).toBe(false);expect(layer.mesh.geometry.instanceCount).toBe(0);
    } finally {layer.dispose();}
  });
});
