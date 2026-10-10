import * as THREE from 'three/webgpu';
import {Fn,If,float,mix,renderGroup,texture,uniform,varying,vec2,vec3,vec4} from 'three/tsl';
import type {Placement} from './primitives';
import {ZONE_SELECTION_COLOR,ZONE_SELECTION_WIDTH,zoneBoundaryEdges} from './zone-surface-presentation';

type Bounds={minX:number;maxX:number;minZ:number;maxZ:number};
const color=new THREE.Color();
/** Cell-sized static zone state plus analytic pointer bounds. No blade census.
 * The eligible preview mask is only its rectangle, and only changes on a gesture
 * or World update; a single-cell hover writes uniforms and never uploads a map. */
export class GroundSurfaceTint {
  readonly zones=new THREE.DataTexture(new Float32Array(4),1,1,THREE.RGBAFormat,THREE.FloatType);
  readonly edges=new THREE.DataTexture(new Uint8Array(4),1,1,THREE.RGBAFormat);
  readonly eligible=new THREE.DataTexture(new Uint8Array(4),1,1,THREE.RGBAFormat);
  private readonly dimensions=uniform(new THREE.Vector2(1,1)).setGroup(renderGroup);
  private readonly zoneActive=uniform(0).setGroup(renderGroup);
  private readonly edgeActive=uniform(0).setGroup(renderGroup);
  private readonly hoverBounds=uniform(new THREE.Vector4(1,1,0,0)).setGroup(renderGroup);
  private readonly hoverColor=uniform(new THREE.Vector4()).setGroup(renderGroup);
  private readonly areaBounds=uniform(new THREE.Vector4(1,1,0,0)).setGroup(renderGroup);
  private readonly areaSize=uniform(new THREE.Vector2(1,1)).setGroup(renderGroup);
  private readonly areaColor=uniform(new THREE.Vector4()).setGroup(renderGroup);
  private edgeKey='';
  private zoneKey='';
  constructor(){for(const map of [this.zones,this.edges,this.eligible]){map.minFilter=map.magFilter=THREE.NearestFilter;map.generateMipmaps=false;map.needsUpdate=true;}}
  shade(base:THREE.Node,root:THREE.Node):THREE.Node {
    // A blade's four vertices share the authored root, before wind/shape. Sample
    // its cell and decide coverage once per vertex, not once per grass fragment.
    // Flat varyings retain that root-owned decision on both triangles, including
    // perspective views. Keep each colour operation below after lighting and in
    // its original order: precomposing an affine RGBA would reorder rounding.
    const p=vec2(root as ReturnType<typeof vec2>),cell=p.add(.5).floor(),local=p.sub(cell);
    const inside=p.x.greaterThanEqual(-.5).and(p.y.greaterThanEqual(-.5)).and(p.x.lessThan(this.dimensions.x.sub(.5))).and(p.y.lessThan(this.dimensions.y.sub(.5)));
    const hasZone=this.zoneActive.greaterThan(0).and(inside);
    const hasHover=this.hoverColor.w.greaterThan(0).and(p.x.greaterThanEqual(this.hoverBounds.x)).and(p.y.greaterThanEqual(this.hoverBounds.y))
      .and(p.x.lessThanEqual(this.hoverBounds.z)).and(p.y.lessThanEqual(this.hoverBounds.w));
    const hasArea=this.areaColor.w.greaterThan(0).and(cell.x.greaterThanEqual(this.areaBounds.x)).and(cell.y.greaterThanEqual(this.areaBounds.y))
      .and(cell.x.lessThanEqual(this.areaBounds.z)).and(cell.y.lessThanEqual(this.areaBounds.w)).and(local.x.abs().lessThanEqual(.43)).and(local.y.abs().lessThanEqual(.43));
    const tint=varying(Fn(()=>{
      const value=vec4(0).toVar();
      If(hasZone,()=>{value.assign(texture(this.zones,cell.add(.5).div(this.dimensions)).level(float(0)));});
      return value;
    })(),'groundZoneTint').setInterpolation(THREE.InterpolationSamplingType.FLAT,THREE.InterpolationSamplingMode.EITHER);
    const present=varying(Fn(()=>{
      const value=float(0).toVar();
      If(hasArea,()=>{value.assign(texture(this.eligible,cell.sub(this.areaBounds.xy).add(.5).div(this.areaSize)).level(float(0)).a);});
      return value;
    })(),'groundZoneEligible').setInterpolation(THREE.InterpolationSamplingType.FLAT,THREE.InterpolationSamplingMode.EITHER);
    const conditions=varying(Fn(()=>{
      const value=vec4(hasZone.select(1,0),hasHover.select(1,0),hasArea.select(1,0),0).toVar();
      If(this.edgeActive.greaterThan(0).and(inside),()=>{
        const edge=texture(this.edges,cell.add(.5).div(this.dimensions)).level(float(0));
        const onEdge=local.x.lessThan(-.5+ZONE_SELECTION_WIDTH).and(edge.r.greaterThan(0))
          .or(local.x.greaterThan(.5-ZONE_SELECTION_WIDTH).and(edge.g.greaterThan(0)))
          .or(local.y.lessThan(-.5+ZONE_SELECTION_WIDTH).and(edge.b.greaterThan(0)))
          .or(local.y.greaterThan(.5-ZONE_SELECTION_WIDTH).and(edge.a.greaterThan(0)));
        value.w.assign(onEdge.select(1,0));
      });
      return value;
    })(),'groundZoneConditions').setInterpolation(THREE.InterpolationSamplingType.FLAT,THREE.InterpolationSamplingMode.EITHER);
    return Fn(()=>{
      const result=vec4(base as ReturnType<typeof vec4>).toVar();
      If(conditions.x.greaterThan(0),()=>{
        result.assign(vec4(result.rgb.mul(float(1).sub(tint.a)).add(tint.rgb),result.a));
      });
      If(conditions.y.greaterThan(0),()=>{
        result.assign(vec4(mix(result.rgb,this.hoverColor.xyz,this.hoverColor.w),result.a));
      });
      If(conditions.z.greaterThan(0),()=>{
        result.assign(vec4(mix(result.rgb,this.areaColor.xyz,this.areaColor.w.mul(present)),result.a));
      });
      If(conditions.w.greaterThan(0),()=>{
        const selected=new THREE.Color(ZONE_SELECTION_COLOR);
        result.assign(vec4(vec3(selected.r,selected.g,selected.b),result.a));
      });
      return result;
    })();
  }
  setZones(width:number,height:number,layers:readonly {placements:readonly Placement[];opacity:number}[],visible:boolean):void {
    const key=`${width}:${height}:${visible}:`+(visible?layers.map(layer=>`${layer.opacity}:${layer.placements.map(p=>`${p.x},${p.z},${p.color??0xffffff}`).join(';')}`).join('|'):'');
    if(key===this.zoneKey)return;this.zoneKey=key;
    const resized=this.zones.image.width!==width||this.zones.image.height!==height;
    const data=new Float32Array(width*height*4);
    let present=false;
    if(visible)for(const layer of layers)for(const p of layer.placements){
      if(p.x<0||p.z<0||p.x>=width||p.z>=height)continue;
      const i=(p.z*width+p.x)*4,a=layer.opacity;color.setHex(p.color??0xffffff);
      data[i]=data[i]!*(1-a)+color.r*a;data[i+1]=data[i+1]!*(1-a)+color.g*a;data[i+2]=data[i+2]!*(1-a)+color.b*a;data[i+3]=data[i+3]!*(1-a)+a;present=true;
    }
    if(resized)this.zones.dispose();this.zones.image={data,width,height};this.zones.needsUpdate=true;
    this.dimensions.value.set(width,height);this.zoneActive.value=Number(present);
  }
  setSelection(width:number,height:number,cells:readonly number[],visible:boolean):void {
    const key=`${width}:${height}:${visible?cells.join(','):''}`;if(key===this.edgeKey)return;this.edgeKey=key;
    const data=new Uint8Array(width*height*4),edges=visible?zoneBoundaryEdges(width,cells):new Map<number,number>();
    for(const [cell,mask]of edges)for(let bit=0;bit<4;bit++)if(mask&(1<<bit))data[cell*4+bit]=255;
    if(this.edges.image.width!==width||this.edges.image.height!==height)this.edges.dispose();
    this.edges.image={data,width,height};this.edges.needsUpdate=true;this.edgeActive.value=Number(edges.size>0);
  }
  setHover(x:number,z:number,sx:number,sz:number,hex:number,opacity:number):void {
    this.hoverBounds.value.set(x-sx*.48,z-sz*.48,x+sx*.48,z+sz*.48);color.setHex(hex);this.hoverColor.value.set(color.r,color.g,color.b,opacity);this.areaColor.value.w=0;
  }
  setArea(width:number,bounds:Bounds,cells:readonly number[],hex:number,opacity=.48):void {
    const w=bounds.maxX-bounds.minX+1,h=bounds.maxZ-bounds.minZ+1,data=new Uint8Array(w*h*4);
    for(const i of cells){const x=i%width-bounds.minX,z=Math.floor(i/width)-bounds.minZ;if(x>=0&&z>=0&&x<w&&z<h)data[(z*w+x)*4+3]=255;}
    if(this.eligible.image.width!==w||this.eligible.image.height!==h)this.eligible.dispose();
    this.eligible.image={data,width:w,height:h};this.eligible.needsUpdate=true;
    this.areaBounds.value.set(bounds.minX,bounds.minZ,bounds.maxX,bounds.maxZ);this.areaSize.value.set(w,h);color.setHex(hex);this.areaColor.value.set(color.r,color.g,color.b,opacity);
  }
  clearPreview():void {this.hoverColor.value.w=0;this.areaColor.value.w=0;}
  dispose():void {this.zones.dispose();this.edges.dispose();this.eligible.dispose();}
}
