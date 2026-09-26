import * as THREE from 'three/webgpu';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import { doorOrientations } from '../sim/door-rules';
import { doorLeafTop } from './door-parts';

type Point = readonly [number, number, number];

/** Small authored solids are assembled once. Their vertex colours give the
 * bevels and recessed joints a stable, faceted shade without per-cell meshes. */
function geometry(roof: boolean): THREE.BufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], uvs: number[] = [];
  const color = new THREE.Color();
  function quad(a: Point, b: Point, c: Point, d: Point, outward: Point, tint: number, uvRect:readonly [number,number,number,number]=[0,1,0,1]): void {
    const ab = new THREE.Vector3(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    const ac = new THREE.Vector3(c[0]-a[0], c[1]-a[1], c[2]-a[2]);
    const direction = ab.cross(ac).dot(new THREE.Vector3(...outward));
    const corners=[a,b,c,d] as const;
    const order=direction>=0?[0,1,2,0,2,3]:[0,2,1,0,3,2];
    color.setHex(tint);
    const [u0,u1,v0,v1]=uvRect;
    const uv = [[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
    for(let i=0;i<6;i++) {
      const vertex=order[i]!;
      positions.push(...corners[vertex]!);normals.push(...outward);colors.push(color.r,color.g,color.b);uvs.push(...uv[vertex]!);
    }
  }
  function box(x0:number,x1:number,y0:number,y1:number,z0:number,z1:number,tint:number):void {
    const shade=(factor:number)=>new THREE.Color(tint).multiplyScalar(factor).getHex();
    quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],tint);
    quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],shade(.91));
    quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],shade(.86));
    quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],shade(.88));
    quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],shade(1.1));
    quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],shade(.7));
  }
  if(roof) {
    // One edge plank, instanced only where a wall borders open space. A low
    // straight base keeps its join watertight; the uneven inset top and four
    // bevels soften the silhouette without additional per-cell objects.
    box(-.5,.5,-.055,.018,.405,.56,0xaa8050);
    const a:Point=[-.478,.055,.421],b:Point=[.483,.055,.418];
    const c:Point=[.478,.055,.545],d:Point=[-.482,.055,.541];
    quad(a,b,c,d,[0,1,0],0xd6ab72);
    quad([-.5,.018,.56],[.5,.018,.56],c,d,[0,0,1],0xbb8e59);
    quad([.5,.018,.405],[-.5,.018,.405],a,b,[0,0,-1],0xb88a55);
    quad([.5,.018,.56],[.5,.018,.405],b,c,[1,0,0],0xb28350);
    quad([-.5,.018,.405],[-.5,.018,.56],d,a,[-1,0,0],0xb28350);
  } else {
    // A single broad plank covers each cell face. Three unequal height bands
    // gently bend its edge, while two bevel facets round each vertical corner.
    // The dark core only closes hairline joints between adjacent planks.
    box(-.49,.49,0,.94,-.49,.49,0x725238);
    const boardTints=[0xb18858,0xa77d4e,0xb68b58,0xa57c4d];
    const levels=[
      {y:.008,sway:0,depth:.507},
      {y:.32,sway:-.018,depth:.517},
      {y:.67,sway:.013,depth:.508},
      {y:.967,sway:-.011,depth:.518},
    ];
    for(let face=0;face<4;face++) {
      const sign=face%2===0?1:-1,alongX=face<2;
      const p=(u:number,depth:number,y:number):Point=>alongX?[u,y,sign*depth]:[sign*depth,y,u];
      const outward:Point=alongX?[0,0,sign]:[sign,0,0];
      const side:Point=alongX?[1,0,0]:[0,0,1];
      const tint=new THREE.Color(boardTints[face]!).multiplyScalar(face===1||face===3?.94:1).getHex();
      const dark=new THREE.Color(tint).multiplyScalar(.77).getHex();
      const light=new THREE.Color(tint).multiplyScalar(.87).getHex();
      for(let band=0;band<levels.length-1;band++) {
        const a=levels[band]!,b=levels[band+1]!;
        const frontL=(v:typeof a)=>-.445+v.sway,frontR=(v:typeof a)=>.445+v.sway;
        const edgeL=(v:typeof a)=>-.493+v.sway*.3,edgeR=(v:typeof a)=>.493+v.sway*.3;
        quad(p(frontL(a),a.depth,a.y),p(frontR(a),a.depth,a.y),p(frontR(b),b.depth,b.y),p(frontL(b),b.depth,b.y),outward,tint,[.05,.95,a.y,b.y]);
        quad(p(edgeL(a),.47,a.y),p(frontL(a),a.depth,a.y),p(frontL(b),b.depth,b.y),p(edgeL(b),.47,b.y),[-side[0],0,-side[2]],dark,[0,.05,a.y,b.y]);
        quad(p(frontR(a),a.depth,a.y),p(edgeR(a),.47,a.y),p(edgeR(b),.47,b.y),p(frontR(b),b.depth,b.y),side,light,[.95,1,a.y,b.y]);
      }
    }
    // One softly bevelled cap per cell, lower than the overhanging edge rail.
    box(-.499,.499,.944,.961,-.499,.499,0xcfa36b);
    const low=.961,high=.982,edge=.499,top=.464,cap=0xd6ac72;
    quad([-top,high,top],[top,high,top],[top,high,-top],[-top,high,-top],[0,1,0],cap);
    quad([-edge,low,edge],[edge,low,edge],[top,high,top],[-top,high,top],[0,0,1],cap);
    quad([edge,low,-edge],[-edge,low,-edge],[-top,high,-top],[top,high,-top],[0,0,-1],cap);
    quad([edge,low,edge],[edge,low,-edge],[top,high,-top],[top,high,top],[1,0,0],cap);
    quad([-edge,low,-edge],[-edge,low,edge],[-top,high,top],[-top,high,-top],[-1,0,0],cap);
  }
  const result=new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  result.computeBoundingBox();result.computeBoundingSphere();
  return result;
}

/** Broad, asymmetrical painted wood values. Small grain supports the painted
 * facets, rather than being the only feature visible at ordinary camera scale. */
function grainTexture():THREE.DataTexture {
  const width=64,height=64,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const patchX=Math.floor((x+5*Math.sin(y*.12))/19);
    const patchY=Math.floor((y+4*Math.sin(x*.09))/23);
    const patch=(((patchX*73856093)^(patchY*19349663))>>>0)%5-2;
    const painted=Math.sin(x*.085+y*.033)*12+Math.sin(x*.17-y*.08)*7;
    const grain=Math.sin(y*.68+Math.sin(x*.11))*3;
    const value=Math.max(158,Math.min(255,Math.round(226+patch*10+painted+grain)));
    const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;
  texture.needsUpdate=true;return texture;
}

/** Presentation-only wall cladding. Call update when adopting a world or
 * changing cutaway; the layer performs no work during rendered frames. */
export class TimberCladdingLayer {
  readonly group=new THREE.Group();
  readonly wallGeometry=geometry(false);
  readonly eaveGeometry=geometry(true);
  readonly grain=grainTexture();
  readonly material=new THREE.MeshStandardNodeMaterial({color:0xffffff,roughness:.94,metalness:0,flatShading:true,vertexColors:true,map:this.grain});
  readonly plainMaterial=new THREE.MeshStandardNodeMaterial({color:0xffffff,roughness:.94,metalness:0,flatShading:true,vertexColors:true});
  wallMesh:THREE.InstancedMesh;
  eaveMesh:THREE.InstancedMesh;
  private wallCapacity=256;
  private eaveCapacity=256;
  private key='';
  private texturesEnabled=true;
  constructor(configure?: (material: THREE.MeshStandardNodeMaterial)=>void) {
    for(const mat of [this.material,this.plainMaterial]){configure?.(mat);mat.userData.rendererOwned=true;}
    this.wallMesh=this.makeMesh(this.wallGeometry,'timber-vertical-planks',this.wallCapacity);
    this.eaveMesh=this.makeMesh(this.eaveGeometry,'timber-eave-planks',this.eaveCapacity);
    this.group.add(this.wallMesh,this.eaveMesh);
  }
  setTexturesEnabled(enabled:boolean):void {
    if(this.texturesEnabled===enabled)return;
    this.texturesEnabled=enabled;
    this.wallMesh.material=this.eaveMesh.material=enabled?this.material:this.plainMaterial;
  }
  private makeMesh(shape:THREE.BufferGeometry,name:string,capacity:number):THREE.InstancedMesh {
    const mesh=new THREE.InstancedMesh(shape,this.texturesEnabled?this.material:this.plainMaterial,capacity);
    mesh.name=name;mesh.count=0;mesh.visible=false;mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    return mesh;
  }
  private grow(wallCount:number,eaveCount:number):void {
    if(wallCount>this.wallCapacity) {
      this.wallCapacity=2**Math.ceil(Math.log2(wallCount));
      const old=this.wallMesh;this.wallMesh=this.makeMesh(this.wallGeometry,old.name,this.wallCapacity);
      this.group.remove(old);old.dispose();this.group.add(this.wallMesh);
    }
    if(eaveCount>this.eaveCapacity) {
      this.eaveCapacity=2**Math.ceil(Math.log2(eaveCount));
      const old=this.eaveMesh;this.eaveMesh=this.makeMesh(this.eaveGeometry,old.name,this.eaveCapacity);
      this.group.remove(old);old.dispose();this.group.add(this.eaveMesh);
    }
  }
  update(world:World,cutaway:boolean,reset=false):void {
    const walls=world.structures.filter(s=>s.kind==='wall'&&s.material==='wood');
    const doors=walls.length?world.structures.filter(s=>s.kind==='door'):[];
    const axes=doors.length?doorOrientations(world):new Map<number,0|1>();
    const key=`${cutaway}|${walls.map(s=>`${s.id}:${s.x}:${s.z}`).join('|')}|${doors.map(s=>`${s.id}:${s.x}:${s.z}:${axes.get(s.z*world.width+s.x)??0}`).join('|')}`;
    if(!reset&&key===this.key)return;
    this.key=key;
    const at=(x:number,z:number)=>`${x}:${z}`;
    const wood=new Set(walls.map(s=>at(s.x,s.z)));
    type RimCell={x:number;z:number;axis:'all'|'horizontal'|'vertical'};
    const cells:RimCell[]=walls.map(s=>({x:s.x,z:s.z,axis:'all'}));
    const timberDoors:typeof doors=[];
    for(const door of doors) {
      const horizontal=wood.has(at(door.x-1,door.z))&&wood.has(at(door.x+1,door.z));
      const vertical=wood.has(at(door.x,door.z-1))&&wood.has(at(door.x,door.z+1));
      if(horizontal||vertical){
        timberDoors.push(door);
        cells.push({x:door.x,z:door.z,axis:horizontal&&!vertical?'horizontal':vertical&&!horizontal?'vertical':(axes.get(door.z*world.width+door.x)??0)===0?'horizontal':'vertical'});
      }
    }
    const occupied=new Set(cells.map(c=>at(c.x,c.z)));
    type Side='north'|'south'|'east'|'west';
    const offset:Record<Side,readonly [number,number]>={north:[0,1],south:[0,-1],east:[1,0],west:[-1,0]};
    const sides:Side[]=['north','south','east','west'];
    const exposed=new Set<string>();
    for(const c of cells)for(const side of sides) {
      if(c.axis==='horizontal'&&(side==='east'||side==='west')||c.axis==='vertical'&&(side==='north'||side==='south'))continue;
      const [dx,dz]=offset[side];if(!occupied.has(at(c.x+dx,c.z+dz)))exposed.add(`${at(c.x,c.z)}:${side}`);
    }
    const rims:{cell:RimCell;side:Side;centre:number;length:number}[]=[];
    for(const c of cells)for(const side of sides) {
      if(!exposed.has(`${at(c.x,c.z)}:${side}`))continue;
      let low=-.5,high=.5;
      if(side==='north'||side==='south') {
        // Straight runs meet at exactly the cell boundary. A free endpoint
        // reaches 0.06 further to cover the perpendicular corner board.
        if(!exposed.has(`${at(c.x-1,c.z)}:${side}`))low-=.06;
        if(!exposed.has(`${at(c.x+1,c.z)}:${side}`))high+=.06;
      } else {
        // At a corner the horizontal board owns the square intersection.
        // Trimming the vertical board makes a butt joint without coplanar faces.
        if(exposed.has(`${at(c.x,c.z)}:south`))low+=.095;
        if(exposed.has(`${at(c.x,c.z)}:north`))high-=.095;
        const outward=side==='east'?1:-1;
        // Re-entrant room corners meet a horizontal board on the diagonal
        // cell. Its 0.06 endpoint reaches this edge too.
        if(exposed.has(`${at(c.x+outward,c.z-1)}:north`))low=Math.max(low,-.44);
        if(exposed.has(`${at(c.x+outward,c.z+1)}:south`))high=Math.min(high,.44);
      }
      rims.push({cell:c,side,centre:(low+high)/2,length:high-low});
    }
    this.grow(walls.length+timberDoors.length,rims.length);
    const height=cutaway?WORLD_SCALE.wallCutawayHeight:WORLD_SCALE.wallHeight;
    const object=new THREE.Object3D(),color=new THREE.Color();
    for(let i=0;i<walls.length;i++) {
      const wall=walls[i]!;
      const tone=1+((((wall.x*73856093)^(wall.z*19349663)^(wall.id*83492791))>>>0)%13-6)*.007;
      color.setRGB(tone,tone,tone);
      const alongZ=occupied.has(at(wall.x,wall.z-1))||occupied.has(at(wall.x,wall.z+1));
      const alongX=occupied.has(at(wall.x-1,wall.z))||occupied.has(at(wall.x+1,wall.z));
      object.position.set(wall.x,0,wall.z);object.rotation.set(0,alongZ&&!alongX?Math.PI/2:0,0);object.scale.set(1,height,1);object.updateMatrix();
      this.wallMesh.setMatrixAt(i,object.matrix);this.wallMesh.setColorAt(i,color);
    }
    // The upper part of every doorway is a real timber wall plank. In
    // particular, a steel leaf in a timber wall must not become a tall grey
    // column through the lintel.
    for(let i=0;i<timberDoors.length;i++) {
      const door=timberDoors[i]!,from=doorLeafTop(cutaway),axis=axes.get(door.z*world.width+door.x)??0;
      object.position.set(door.x,from,door.z);object.rotation.set(0,axis*Math.PI/2,0);
      object.scale.set(1,height-from,1);object.updateMatrix();
      this.wallMesh.setMatrixAt(walls.length+i,object.matrix);
      this.wallMesh.setColorAt(walls.length+i,color.setRGB(1,1,1));
    }
    for(let i=0;i<rims.length;i++) {
      const {cell,side,centre,length}=rims[i]!;
      const horizontal=side==='north'||side==='south';
      const tone=1+((((cell.x*73856093)^(cell.z*19349663))>>>0)%11-5)*.006;
      color.setRGB(tone,tone,tone);
      object.position.set(cell.x+(horizontal?centre:0),height-.055,cell.z+(horizontal?0:centre));
      object.rotation.set(0,side==='north'?0:side==='south'?Math.PI:side==='east'?Math.PI/2:-Math.PI/2,0);
      object.scale.set(length,1,1);object.updateMatrix();
      this.eaveMesh.setMatrixAt(i,object.matrix);this.eaveMesh.setColorAt(i,color);
    }
    object.rotation.set(0,0,0);
    this.wallMesh.count=walls.length+timberDoors.length;this.eaveMesh.count=rims.length;
    for(const mesh of [this.wallMesh,this.eaveMesh]) {
      mesh.visible=mesh.count>0;
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.computeBoundingSphere();
    }
  }
  /** Compile empty batches for the first real and shadow passes. */
  prepareForCompile():()=>void {
    const empty=[this.wallMesh,this.eaveMesh].filter(mesh=>mesh.count===0);
    const saved=empty.map(mesh=>({mesh,version:mesh.instanceMatrix.version}));
    for(const mesh of empty){mesh.count=1;mesh.visible=true;}
    return ()=>{for(const {mesh,version} of saved)if(mesh.instanceMatrix.version===version){mesh.count=0;mesh.visible=false;}};
  }
  dispose():void {
    this.group.remove(this.wallMesh,this.eaveMesh);
    this.wallMesh.dispose();this.eaveMesh.dispose();
    this.wallGeometry.dispose();this.eaveGeometry.dispose();this.material.dispose();this.plainMaterial.dispose();this.grain.dispose();
  }
}
