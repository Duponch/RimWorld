import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { chunkParts, CHUNK_ITEMS } from '../src/render/chunk-presentation';
import { BoxBatches } from '../src/render/BoxBatches';
import { BoxMesh } from '../src/render/BoxMesh';
import { createChunkGeometry } from '../src/render/chunk-shape';
import type { Placement } from '../src/render/primitives';

// Independent recurrence and projection of the shader's deformed primitives;
// do not reuse the production CPU contact or hull helpers.
function contourVertices(part: Placement, geometry: THREE.BufferGeometry): THREE.Vector3[] {
  let state = part.key! | 0;
  const coefficients = Array.from({ length: 4 }, () => {
    state = Math.imul(state ^ (state >>> 16), 0x45d9f3b) + 1013904223 | 0;
    return Math.fround(((state >>> 0) / 0xffffffff - .5) * .05);
  });
  const positions = geometry.getAttribute('position'), c = Math.cos(part.ry!), s = Math.sin(part.ry!);
  return Array.from({ length: positions.count }, (_, i) => {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const radius = Math.max(.88, Math.min(1, .945 + x * coefficients[0]! + y * coefficients[1]!
      + z * coefficients[2]! + x * z * coefficients[3]!));
    return new THREE.Vector3(part.x + (x * c + z * s) * radius * part.sx!,
      part.y + y * radius * part.sy!, part.z + (z * c - x * s) * radius * part.sz!);
  });
}

function hull(points: THREE.Vector3[]): THREE.Vector2[] {
  const ordered = [...new Map(points.map(p => [`${p.x}:${p.z}`, new THREE.Vector2(p.x, p.z)])).values()]
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const half = (sequence: THREE.Vector2[]) => {
    const result: THREE.Vector2[] = [];
    for (const point of sequence) {
      while (result.length >= 2) {
        const a = result[result.length - 2]!, b = result[result.length - 1]!;
        if ((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) > 0) break;
        result.pop();
      }
      result.push(point);
    }
    result.pop(); return result;
  };
  return [...half(ordered), ...half([...ordered].reverse())];
}

function projectedGap(a: THREE.Vector2[], b: THREE.Vector2[]): number {
  let gap = -Infinity;
  for (const polygon of [a, b]) for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i]!, q = polygon[(i + 1) % polygon.length]!;
    const axis = new THREE.Vector2(p.y - q.y, q.x - p.x).normalize();
    const aa = a.map(v => v.dot(axis)), bb = b.map(v => v.dot(axis));
    gap = Math.max(gap, Math.min(...aa) - Math.max(...bb), Math.min(...bb) - Math.max(...aa));
  }
  return gap;
}

test('physical stone fragments vary with isotropic scale, ground contact and compact separated satellites', () => {
  const large=createChunkGeometry(),small=createChunkGeometry(true),counts=new Set<number>();
  try {
  for (const item of CHUNK_ITEMS) {
    const variants=Array.from({length:100},(_,i)=>chunkParts(i%10+2,Math.floor(i/10)+2,item));
    const shapes=variants.map(parts=>parts.map(p=>[p.sx,p.sy,p.sz,p.ry,p.x-Math.floor(p.x),p.z-Math.floor(p.z)]));
    expect(new Set(shapes.map(v=>JSON.stringify(v))).size).toBe(100);
    variants.forEach((parts,i)=>{
      expect(parts).toEqual(chunkParts(i%10+2,Math.floor(i/10)+2,item));
      counts.add(parts.length);
      expect(parts.length).toBeGreaterThanOrEqual(1);expect(parts.length).toBeLessThanOrEqual(3);
      let triangles=0;
      const outlines=parts.map(part=>{
        expect(part.shape).toBe('rounded-rock');
        expect(part.sx).toBe(part.sy);expect(part.sy).toBe(part.sz);
        const geometry=part.key!<0?small:large;
        triangles+=geometry.getAttribute('position').count/3;
        const vertices=contourVertices(part,geometry),ground=Math.min(...vertices.map(p=>p.y));
        expect(ground).toBeGreaterThanOrEqual(0);expect(ground).toBeLessThan(.001);
        return hull(vertices);
      });
      expect(parts[0]!.key).toBeGreaterThanOrEqual(0);
      expect(triangles).toBeLessThanOrEqual(68);
      for(let satellite=1;satellite<parts.length;satellite++){
        expect(parts[satellite]!.sx).toBeLessThan(parts[0]!.sx!);
        // A separating axis proves non-intersection. A small positive gap
        // still preserves the compact assembly instead of detached pebbles.
        expect(projectedGap(outlines[0]!,outlines[satellite]!)).toBeGreaterThanOrEqual(-.00001);
        expect(projectedGap(outlines[0]!,outlines[satellite]!)).toBeLessThan(.005);
        for(let other=1;other<satellite;other++)
          expect(projectedGap(outlines[other]!,outlines[satellite]!)).toBeGreaterThanOrEqual(-.00001);
      }
    });
  }
  expect(counts).toEqual(new Set([1,2,3]));
  }finally{large.dispose();small.dispose();}
});

test('variation retains both resident rock pipelines, contour buffers, normals and texture fallback', () => {
  const group=new THREE.Group(),batches=new BoxBatches();
  batches.set(group,'fragments',chunkParts(4,4,'marble-chunk'));
  const rocks=['rounded-rock','small-rock'].map(suffix=>group.getObjectByName(`fragments:${suffix}`) as BoxMesh);
  const resident=rocks.map(rock=>({geometry:rock.geometry,material:rock.material,
    attributes:{...rock.geometry.attributes},matrix:rock.instanceMatrix,index:rock.geometry.index}));
  const first=Array.from(rocks[0]!.instanceMatrix.array.slice(0,16));
  try{
    const next=chunkParts(5,4,'marble-chunk');batches.set(group,'fragments',next);
    expect(rocks.reduce((sum,rock)=>sum+rock.activeCount,0)).toBe(next.length);
    expect(Array.from(rocks[0]!.instanceMatrix.array.slice(0,16))).not.toEqual(first);
    for(const [i,rock] of rocks.entries()){
      const saved=resident[i]!;
      expect(rock.geometry).toBe(saved.geometry);expect(rock.material).toBe(saved.material);
      expect(rock.geometry.index).toBe(saved.index);expect(rock.instanceMatrix).toBe(saved.matrix);
      expect(Object.keys(rock.geometry.attributes)).toEqual(Object.keys(saved.attributes));
      for(const [name,attribute] of Object.entries(saved.attributes))expect(rock.geometry.getAttribute(name)).toBe(attribute);
      expect(rock.castShadow).toBe(true);
      expect(rock.geometry.getAttribute('normal').count).toBe(rock.geometry.getAttribute('position').count);
      let samples=0;
      (rock.material as THREE.MeshStandardNodeMaterial).colorNode!.traverse(node=>{if('isTextureNode' in node && node.isTextureNode)samples++;});
      expect(samples).toBe(1);
    }
    batches.setTexturesEnabled(false);
    for(const rock of rocks){
      expect((rock.material as THREE.MeshStandardNodeMaterial).map).toBeNull();
      expect((rock.material as THREE.MeshStandardNodeMaterial).positionNode).not.toBeNull();
      let samples=0;
      (rock.material as THREE.MeshStandardNodeMaterial).colorNode!.traverse(node=>{if('isTextureNode' in node && node.isTextureNode)samples++;});
      expect(samples).toBe(0);
    }
    batches.setTexturesEnabled(true);rocks.forEach((rock,i)=>expect(rock.material).toBe(resident[i]!.material));
    batches.set(group,'fragments',[]);expect(rocks.map(rock=>rock.activeCount)).toEqual([0,0]);
  }finally{batches.dispose();}
});
