import * as THREE from 'three/webgpu';
import { createStylizedSurfaceTexture } from './stylized-surfaces';
import { instancedBoxPatternUv } from './texture-variation';

/** Restore the previous broad pigment and chalk drawing, including its UV
 * mapping. Only its baked contrast changes; the shader keeps one sample. */
export const chunkPaintUv=instancedBoxPatternUv;

export function createChunkSurfacePaint():THREE.DataTexture {
  const map=createStylizedSurfaceTexture();
  const pixels=map.image.data as Uint8Array;
  for(let i=0;i<pixels.length;i+=4)for(let channel=0;channel<3;channel++)
    pixels[i+channel]=Math.max(128,Math.min(255,Math.round(224+(pixels[i+channel]!-224)*1.8)));
  map.name='Fragments — original pastel pigment with stronger contrast';
  return map;
}
