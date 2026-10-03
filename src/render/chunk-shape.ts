import * as THREE from 'three/webgpu';
import { Fn, attribute, mat4, normalLocal, positionLocal, transformNormal } from 'three/tsl';
import { configureBoxMaterial } from './BoxMesh';

const phi = (1 + Math.sqrt(5)) / 2, inversePhi = 1 / phi;
const largeVertices = [-1,-1,-1, -1,-1,1, -1,1,-1, -1,1,1, 1,-1,-1, 1,-1,1, 1,1,-1, 1,1,1,
  0,-inversePhi,-phi, 0,-inversePhi,phi, 0,inversePhi,-phi, 0,inversePhi,phi,
  -inversePhi,-phi,0, -inversePhi,phi,0, inversePhi,-phi,0, inversePhi,phi,0,
  -phi,0,-inversePhi, phi,0,-inversePhi, -phi,0,inversePhi, phi,0,inversePhi];
const smallVertices = [-1,phi,0, 1,phi,0, -1,-phi,0, 1,-phi,0, 0,-1,phi, 0,1,phi,
  0,-1,-phi, 0,1,-phi, phi,0,-1, phi,0,1, -phi,0,-1, -phi,0,1];
// Trim the two opposing icosahedron tips: ten used vertices, sixteen faces.
const smallIndices = [11,5,1, 11,1,7, 11,7,10, 1,5,9, 5,11,4, 11,10,2, 10,7,6, 7,1,8,
  9,4,2, 9,2,6, 9,6,8, 4,9,5, 2,4,11, 6,2,10, 8,6,7, 9,8,1];
export const CHUNK_SMALL_MAX_SCALE = .31;
// The sign records topology independently of subsequent surface scaling.
export const isSmallChunk = (key: number | undefined, scale: number | undefined): boolean =>
  key === undefined ? (scale ?? 1) <= CHUNK_SMALL_MAX_SCALE : key < 0;
export type ChunkContour = readonly [number, number, number, number];
type Point = readonly [number, number, number];

const normalized = (vertices: number[], omitted: readonly number[] = []): Point[] => {
  const result: Point[] = [];
  for (let i = 0; i < vertices.length / 3; i++) {
    if (omitted.includes(i)) continue;
    const x = vertices[i*3]!, y = vertices[i*3+1]!, z = vertices[i*3+2]!, length = Math.hypot(x,y,z);
    result.push([Math.fround(x/length), Math.fround(y/length), Math.fround(z/length)]);
  }
  return result;
};
const largePoints = normalized(largeVertices), smallPoints = normalized(smallVertices, [0,3]);

export function createChunkGeometry(small = false): THREE.BufferGeometry {
  return small ? new THREE.PolyhedronGeometry(smallVertices, smallIndices, 1, 0) : new THREE.DodecahedronGeometry(1, 0);
}

/** Small radial changes alter the actual contour, never stretch a whole axis.
 * Four resident floats are written only at adoption. CPU contact uses them too. */
export function chunkContour(key = 0): ChunkContour {
  let state = key | 0;
  const next = () => {
    state = Math.imul(state ^ (state >>> 16), 0x45d9f3b) + 1013904223 | 0;
    return Math.fround(((state >>> 0) / 0xffffffff - .5) * .05);
  };
  return [next(), next(), next(), next()];
}

export function chunkContourPoints(key: number, small: boolean): Point[] {
  const [a,b,c,d] = chunkContour(key);
  return (small ? smallPoints : largePoints).map(([x,y,z]) => {
    const radius = Math.max(.88, Math.min(1, .945 + x*a + y*b + z*c + x*z*d));
    return [x*radius, y*radius, z*radius];
  });
}

/** All deformed vertices stay within the original sphere. Flat shading derives
 * face normals from the deformed position; attribute names survive growth. */
export function configureChunkMaterial(material: THREE.MeshStandardNodeMaterial): void {
  configureBoxMaterial(material);
  material.positionNode = Fn(() => {
    const contour = attribute('chunkContour', 'vec4').toVar();
    const vertex = positionLocal.toVar();
    const radius = vertex.x.mul(contour.x).add(vertex.y.mul(contour.y)).add(vertex.z.mul(contour.z))
      .add(vertex.x.mul(vertex.z).mul(contour.w)).add(.945).clamp(.88,1).toVar();
    const transform = mat4(attribute('boxMatrix0', 'vec4'), attribute('boxMatrix1', 'vec4'),
      attribute('boxMatrix2', 'vec4'), attribute('boxMatrix3', 'vec4')).toVar();
    normalLocal.assign(transformNormal(normalLocal, transform));
    return transform.mul(vertex.mul(radius)).xyz;
  })();
}
