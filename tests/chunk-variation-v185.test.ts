import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { chunkParts, CHUNK_ITEMS } from '../src/render/chunk-presentation';
import { BoxBatches } from '../src/render/BoxBatches';
import { BoxMesh } from '../src/render/BoxMesh';

test('physical stone fragments vary independently with stable ground silhouettes and two primitives', () => {
  for (const item of CHUNK_ITEMS) {
    const variants=Array.from({length:25},(_,i)=>chunkParts(i%5+2,Math.floor(i/5)+2,item));
    const shapes=variants.map(parts=>parts.map(p=>[p.sx,p.sy,p.sz,p.ry,p.x-Math.floor(p.x),p.z-Math.floor(p.z)]));
    expect(new Set(shapes.map(v=>JSON.stringify(v))).size).toBe(25);
    variants.forEach((parts,i)=>{
      expect(parts).toEqual(chunkParts(i%5+2,Math.floor(i/5)+2,item));
      expect(parts).toHaveLength(2);
      for(const part of parts){
        expect(part.shape).toBe('rounded-rock');
        expect(part.y-.934173*part.sy!).toBeGreaterThanOrEqual(0);
      }
      // The two masses stay joined rather than generating detached pebbles.
      const a=parts[0]!,b=parts[1]!;
      expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeLessThan(Math.min(a.sx!,a.sz!)+Math.min(b.sx!,b.sz!));
    });
  }
});

test('variation reuses the resident rock pipeline, capacity and primitive count', () => {
  const group=new THREE.Group(),batches=new BoxBatches();
  batches.set(group,'fragments',chunkParts(4,4,'marble-chunk'));
  const rock=group.children.find(m=>m.name==='fragments:rounded-rock') as BoxMesh;
  const geometry=rock.geometry,material=rock.material,positions=geometry.getAttribute('position');
  const attributes=Object.keys(geometry.attributes),matrix=rock.instanceMatrix;
  const first=Array.from(matrix.array.slice(0,32));
  batches.set(group,'fragments',chunkParts(5,4,'marble-chunk'));
  expect(rock.geometry).toBe(geometry);expect(rock.material).toBe(material);
  expect(geometry.getAttribute('position')).toBe(positions);expect(Object.keys(geometry.attributes)).toEqual(attributes);
  expect(rock.instanceMatrix).toBe(matrix);expect(rock.activeCount).toBe(2);expect(rock.castShadow).toBe(true);
  expect(Array.from(matrix.array.slice(0,32))).not.toEqual(first);
  batches.dispose();
});
