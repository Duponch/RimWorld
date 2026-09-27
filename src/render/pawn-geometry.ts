import { HAIR_PARTS,BEARD_PARTS } from './pawn-appearance-shape';
import { BIOME_CARGO } from './biome-cargo';
import { corpseParts } from './corpse-presentation';
import * as THREE from 'three/webgpu';
import { PAWN_MODEL_SCALE } from '../world/scale';
import { ITEM_DEFINITIONS } from '../sim/items';
import { CHUNK_ITEMS } from './chunk-presentation';
import { BLOCK_ITEMS } from './block-presentation';
import { foldedApparel,APPAREL_CARGO } from './character-apparel';
import { APPAREL,type ApparelItem } from '../sim/apparel-rules';
import { WEAPON_VISUALS } from './weapon-shape';

// Disjoint from weapon tags; -4 is the bolt-action rifle, not the parka hood.
export const PARKA_HOOD_DYE = -6;
// Face variants are resident in the same pawn batch. The vertex shader shows
// exactly one of them; portraits project the open-eye variant at rest.
export const PAWN_EYE_OPEN = 60;
export const PAWN_EYE_CLOSED = 61;
export const PAWN_EYE_CROSS = 62;

/** Eight rigid bones, authored entirely in code. Each vertex has one bone influence.
 * The bind position/pivot and animation state are evaluated in the vertex shader.
 * There is no per-pawn AnimationMixer, bone Object3D tree or CPU bone update.
 * This deliberately small prototype rig is not yet the future glTF atlas importer.
 */
export function pawnGeometry(): THREE.InstancedBufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  const bones: number[] = [], pivots: number[] = [], dyes: number[] = [];
  const indices:number[]=[];
  // Small accessories retain their hard-edged shapes. The anatomical body is
  // authored as continuous exterior shells below, rather than overlapping
  // boxes whose internal caps remain visible around joints.
  const addPart = (size: number[], center: number[], bone: number, pivot: number[], color: number, dye = 0, roll = 0,
    taper?: readonly [topX:number,bottomX:number,topZ:number,bottomZ:number]) => {
    const box = new THREE.BoxGeometry(size[0], size[1], size[2]).toNonIndexed();
    if (taper) {
      const points=box.getAttribute('position');
      for(let i=0;i<points.count;i++) {
        const top=points.getY(i)>0;
        points.setX(i,points.getX(i)*(top?taper[0]:taper[1]));
        points.setZ(i,points.getZ(i)*(top?taper[2]:taper[3]));
      }
      box.computeVertexNormals();
    }
    if (roll) box.rotateZ(roll);
    const pos = box.getAttribute('position'), normal = box.getAttribute('normal');
    const col = new THREE.Color(color);
    const base=bones.length;
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i) + center[0], pos.getY(i) + center[1], pos.getZ(i) + center[2]);
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      colors.push(col.r, col.g, col.b);
      bones.push(bone); pivots.push(...pivot); dyes.push(dye);
      indices.push(base+i);
    }
    box.dispose();
  };
  type Ring = { y:number; x:number; z:number; halfX:number; halfZ:number; corner:number };
  const addShell = (rings:readonly Ring[],bone:number,pivot:readonly [number,number,number],color:number,dye=0) => {
    const tint=new THREE.Color(color),sides=8;
    const contour=(ring:Ring,i:number):readonly [number,number,number] => {
      const {x,z,halfX:a,halfZ:b,corner:c,y}=ring;
      switch(i%sides) {
        case 0:return [x-a+c,y,z-b];case 1:return [x+a-c,y,z-b];
        case 2:return [x+a,y,z-b+c];case 3:return [x+a,y,z+b-c];
        case 4:return [x+a-c,y,z+b];case 5:return [x-a+c,y,z+b];
        case 6:return [x-a,y,z+b-c];default:return [x-a,y,z-b+c];
      }
    };
    const vertex=(v:readonly number[],n:THREE.Vector3):number=>{
      const index=bones.length;
      positions.push(v[0]!,v[1]!,v[2]!);normals.push(n.x,n.y,n.z);
      colors.push(tint.r,tint.g,tint.b);bones.push(bone);pivots.push(...pivot);dyes.push(dye);
      return index;
    };
    const points=rings.map(r=>Array.from({length:sides},(_,i)=>contour(r,i)));
    // The same contour points and averaged normals serve both adjoining bands.
    // This removes the waist's lighting seam without flattening all normals to
    // (0,1,0) as the rock surface does.
    const sideNormals=points.map((row,j)=>row.map((p,i)=>{
      const below=points[Math.max(0,j-1)]![i]!,above=points[Math.min(points.length-1,j+1)]![i]!;
      const left=row[(i+sides-1)%sides]!,right=row[(i+1)%sides]!;
      const vertical=new THREE.Vector3(above[0]-below[0],above[1]-below[1],above[2]-below[2]);
      const around=new THREE.Vector3(right[0]-left[0],right[1]-left[1],right[2]-left[2]);
      return vertical.cross(around).normalize();
    }));
    const sideIndex=points.map((row,j)=>row.map((p,i)=>vertex(p,sideNormals[j]![i]!)));
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<sides;i++){
      const next=(i+1)%sides;
      const a=sideIndex[j]![i]!,b=sideIndex[j]![next]!,c=sideIndex[j+1]![next]!,d=sideIndex[j+1]![i]!;
      // Exterior only: no face is emitted at any intermediate ring.
      indices.push(a,d,b,d,c,b);
    }
    const bottom=rings[0]!,top=rings[rings.length-1]!;
    const down=new THREE.Vector3(0,-1,0),up=new THREE.Vector3(0,1,0);
    const bc=vertex([bottom.x,bottom.y,bottom.z],down),tc=vertex([top.x,top.y,top.z],up);
    const bCap=points[0]!.map(p=>vertex(p,down));
    const tCap=points[points.length-1]!.map(p=>vertex(p,up));
    for(let i=0;i<sides;i+=2){
      const a=bCap[i]!,b=bCap[i+1]!,c=bCap[(i+2)%sides]!;
      indices.push(bc,a,c,a,b,c);
      const ta=tCap[i]!,tb=tCap[i+1]!,tNext=tCap[(i+2)%sides]!;
      indices.push(tc,tNext,ta,tNext,tb,ta);
    }
  };
  const ring=(y:number,x:number,z:number,halfX:number,halfZ:number,corner:number):Ring=>({y,x,z,halfX,halfZ,corner});
  // A single closed jacket/pelvis envelope: the waist is just another contour
  // ring. It has no internal wall or second cap to expose when crouching.
  addShell([
    ring(.51,0,.035,.135,.112,.022),ring(.64,0,.025,.151,.125,.027),
    ring(.78,0,0,.158,.117,.026),ring(.965,0,0,.198,.133,.035),
    ring(1.035,0,0,.147,.105,.032),
  ],0,[0,.61,0],0xffffff,1);
  addShell([
    ring(1.04,0,.01,.112,.105,.021),ring(1.105,0,.01,.142,.13,.029),
    ring(1.295,0,.01,.151,.139,.031),ring(1.34,0,.01,.128,.118,.026),
  ],1,[0,1.04,0],0xe2b899,2);
  HAIR_PARTS.forEach((p,i)=>addPart([...p.size],[...p.center],1,[0,1.04,0],0xffffff,100+i));
  BEARD_PARTS.forEach((p,i)=>addPart([...p.size],[...p.center],1,[0,1.04,0],0xffffff,200+i));
  for (const side of [-1, 1]) {
    const arm = side < 0 ? 2 : 3, leg = side < 0 ? 4 : 5, calf = side < 0 ? 6 : 7;
    const shoulder=side*.226,hip=side*.105;
    addShell([
      ring(.70,side*.23,0,.052,.064,.014),ring(.79,shoulder,0,.059,.071,.017),
      ring(.94,shoulder,0,.067,.08,.019),ring(1.025,side*.219,0,.075,.086,.021),
    ],arm,[side*.23,1.01,0],0xffffff,1);
    addShell([ring(.59,side*.23,0,.051,.061,.012),ring(.71,side*.23,0,.057,.068,.014)],
      arm,[side*.23,1.01,0],0xe2b899,2);
    addShell([ring(.35,hip,0,.086,.113,.019),ring(.50,hip,0,.103,.128,.025),
      ring(.67,hip,0,.103,.132,.026)],leg,[hip,.61,0],APPAREL['cloth-tribalwear'].color,-3);
    addShell([ring(.39,hip,0,.060,.075,.014),ring(.50,hip,0,.067,.082,.017),
      ring(.655,hip,0,.076,.089,.018)],leg,[hip,.61,0],0x495052);
    addShell([ring(.16,hip,0,.061,.074,.013),ring(.28,hip,0,.067,.081,.016),
      ring(.405,hip,0,.071,.084,.017)],calf,[hip,.61,0],0x495052);
    addPart([0.145, 0.12, 0.23], [side * 0.105, 0.11, 0.03], calf, [side * 0.105, 0.61, 0], 0x443e37);
    addPart([.035,.035,.014],[side*.07,1.2,.157],1,[0,1.04,0],0x433e39,PAWN_EYE_OPEN);
    addPart([.068,.016,.016],[side*.07,1.2,.159],1,[0,1.04,0],0x433e39,PAWN_EYE_CLOSED);
    for(const [index,angle] of [-Math.PI/4,Math.PI/4].entries())
      addPart([.068,.015,.016],[side*.07,1.2,.160+index*.002],1,[0,1.04,0],0x433e39,PAWN_EYE_CROSS,angle);
  }
  addShell([ring(.68,0,0,.165,.13,.029),ring(.83,0,0,.191,.148,.034),
    ring(1.015,0,0,.205,.148,.039)],0,[0,.61,0],APPAREL['flak-vest'].color,-2);
  addPart([.12,.18,.025],[0,.86,.145],0,[0,.61,0],0x404c44,-2);
  // Resident parka hood; its visibility follows the outfit attribute.
  addPart([.34,.34,.14],[0,1.17,-.12],1,[0,1.04,0],0xffffff,PARKA_HOOD_DYE);
  // Ground weapon shapes run along X. Rifle barrel rises on its sling; the
  // revolver/knife point down at the hip, grip up against the belt.
  for(const variant of WEAPON_VISUALS)for(const part of variant.parts)addPart(
    [part.size[2],part.size[0],part.size[1]].map(n=>n/PAWN_MODEL_SCALE),
    [.205+part.center[2]/PAWN_MODEL_SCALE,.68+(variant.item==='bolt-action-rifle'?1:-1)*part.center[0]/PAWN_MODEL_SCALE,part.center[1]/PAWN_MODEL_SCALE],0,[0,.61,0],part.color,variant.dye);
  const geometry = new THREE.InstancedBufferGeometry();
  // WebGPU guarantees only eight vertex-buffer slots. Keeping authored attributes
  // interleaved leaves room for the seven independent per-instance attributes.
  const vertexData = new Float32Array(bones.length * 14);
  for (let i = 0; i < bones.length; i++) {
    vertexData.set(positions.slice(i * 3, i * 3 + 3), i * 14);
    vertexData.set(normals.slice(i * 3, i * 3 + 3), i * 14 + 3);
    vertexData.set(colors.slice(i * 3, i * 3 + 3), i * 14 + 6);
    vertexData[i * 14 + 9] = bones[i];
    vertexData.set(pivots.slice(i * 3, i * 3 + 3), i * 14 + 10);
    vertexData[i * 14 + 13] = dyes[i];
  }
  const vertices = new THREE.InterleavedBuffer(vertexData, 14);
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(vertices, 3, 0));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(vertices, 3, 3));
  geometry.setAttribute('color', new THREE.InterleavedBufferAttribute(vertices, 3, 6));
  geometry.setAttribute('boneId', new THREE.InterleavedBufferAttribute(vertices, 1, 9));
  geometry.setAttribute('bindPivot', new THREE.InterleavedBufferAttribute(vertices, 3, 10));
  geometry.setAttribute('dye', new THREE.InterleavedBufferAttribute(vertices, 1, 13));
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices),1));
  geometry.instanceCount = 0;
  return geometry;
}

/** Cargo is a second instanced batch sharing the pawn pose attributes. Its
 * attachment and interpolation stay on the GPU, including during camera motion.
 * These bundles indicate kind/load; individual logs are not individual items.
 */
export function cargoGeometry(): THREE.InstancedBufferGeometry {
  const data: number[] = [];
  const part = (size: number[], center: number[], kind: number, color: number) => {
    const box = new THREE.BoxGeometry(size[0], size[1], size[2]).toNonIndexed();
    const positions = box.getAttribute('position'), normals = box.getAttribute('normal');
    const tint = new THREE.Color(color);
    for (let i = 0; i < positions.count; i++) data.push(
      positions.getX(i) + center[0], positions.getY(i) + center[1], positions.getZ(i) + center[2],
      normals.getX(i), normals.getY(i), normals.getZ(i), tint.r, tint.g, tint.b, kind,
    );
    box.dispose();
  };
  part([0.56, 0.105, 0.12], [0, -0.025, -0.08], 1, 0xa37b4d);
  part([0.56, 0.105, 0.12], [0, -0.025, 0.08], 1, 0xb08c5d);
  part([0.54, 0.105, 0.12], [0, 0.07, 0], 1, 0xc6a477);
  part([0.07, 0.22, 0.3], [0.14, 0.015, 0], 1, 0x66584b);
  part([0.44, 0.2, 0.32], [0, -0.035, 0], 2, 0x947653);
  for (const x of [-0.1, 0.1]) for (const z of [-0.075, 0.075]) {
    part([0.15, 0.1, 0.12], [x, 0.09, z], 2, x * z > 0 ? 0xba7e65 : 0xb9705c);
  }
  part([0.60,0.44,0.46],[0,0,0],4,0xb6996c);
  part([0.12,0.46,0.48],[0,0,0],4,0x6f634e);
  part([0.38, 0.16, 0.26], [0, 0, 0], 3, 0xc7b96b);
  part([0.09, 0.17, 0.27], [0, 0, 0], 3, 0x86804e);
  part([.5,.22,.32],[0,0,0],24,ITEM_DEFINITIONS.cloth.color);
  part([.07,.24,.34],[0,0,0],24,0x8a846a);
  part([.55,.2,.3],[0,0,0],11,ITEM_DEFINITIONS.steel.color);
  part([.48,.26,.4],[0,0,0],17,ITEM_DEFINITIONS.component.color);
  part([.2,.07,.26],[0,.16,0],17,0x637d77);
  (['herbal-medicine','medicine','glitterworld-medicine'] as const).forEach((item,i)=>{part([.38,.25,.3],[0,0,0],18+i,ITEM_DEFINITIONS[item].color);part([.2,.03,.065],[0,.14,0],18+i,0xf0eee0);part([.065,.03,.2],[0,.14,0],18+i,0xf0eee0);});
  for(const variant of WEAPON_VISUALS)for(const p of variant.parts)part([...p.size],[...p.center],variant.cargo,p.color);
  for(const x of [-.11,.11])part([.18,.075,.30],[x,0,0],30,ITEM_DEFINITIONS.silver.color);
  for(const [item,kind] of Object.entries(APPAREL_CARGO))for(const p of foldedApparel(item as ApparelItem))part(p.size,p.center,kind,p.color);
  part([.48,.10,.50],[0,0,0],25,0xd8c8a2);part([.12,.08,.12],[.15,.09,-.13],25,0x5d716e);
  BLOCK_ITEMS.forEach((item,i)=>{part([.27,.17,.36],[-.145,0,0],12+i,ITEM_DEFINITIONS[item].color);part([.27,.17,.36],[.145,0,0],12+i,ITEM_DEFINITIONS[item].color);});
  CHUNK_ITEMS.forEach((item,i)=>{part([.52,.34,.42],[0,0,0],5+i,ITEM_DEFINITIONS[item].color);part([.22,.2,.27],[.18,-.05,-.12],5+i,ITEM_DEFINITIONS[item].color);});
  for(const p of corpseParts(0,0))part([p.sx!,p.sy!,p.sz!],[p.x,p.y-.16,p.z],27,p.color!);
  part([.52,.07,.35],[0,0,0],28,ITEM_DEFINITIONS['light-leather'].color);
  part([.38,.18,.32],[0,0,0],29,ITEM_DEFINITIONS['hare-meat'].color);
  for(const [item,kind] of Object.entries(BIOME_CARGO)){
    if(item.endsWith('-corpse'))for(const p of corpseParts(0,0,'fresh',0,item.replace('-corpse','')))part([p.sx!,p.sy!,p.sz!],[p.x,p.y-.16,p.z],kind,p.color!);
    else part([.5,.12,.36],[0,0,0],kind,ITEM_DEFINITIONS[item as keyof typeof ITEM_DEFINITIONS].color);
  }
  const vertices = new THREE.InterleavedBuffer(new Float32Array(data), 10);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(vertices, 3, 0));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(vertices, 3, 3));
  geometry.setAttribute('color', new THREE.InterleavedBufferAttribute(vertices, 3, 6));
  geometry.setAttribute('cargoKind', new THREE.InterleavedBufferAttribute(vertices, 1, 9));
  geometry.instanceCount = 0;
  return geometry;
}

/** Owns GPU actor/cargo batches; receives snapshots, never simulates gameplay. */
