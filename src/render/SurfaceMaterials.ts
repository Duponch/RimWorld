import{MeshLambertNodeMaterial,MeshStandardNodeMaterial,type MeshLambertNodeMaterialParameters,type MeshStandardNodeMaterialParameters}from'three/webgpu';

/** Opaque pigment surfaces only. Reflections/metal/transparency are an explicit
 * physical choice, never silently accepted and discarded by a diffuse model. */
export type OpaqueDiffuseParameters=Pick<MeshLambertNodeMaterialParameters,'map'|'vertexColors'|'flatShading'|'side'|'alphaTest'|'depthWrite'|'depthTest'|'fog'|'toneMapped'>;
const diffuseKeys=new Set(['map','vertexColors','flatShading','side','alphaTest','depthWrite','depthTest','fog','toneMapped']);
export function createSurfaceMaterial(model:'diffuse',color:number,parameters?:OpaqueDiffuseParameters):MeshLambertNodeMaterial;
export function createSurfaceMaterial(model:'physical',color:number,parameters?:MeshStandardNodeMaterialParameters):MeshStandardNodeMaterial;
export function createSurfaceMaterial(model:'diffuse'|'physical',color:number,parameters:object={}):MeshLambertNodeMaterial|MeshStandardNodeMaterial{
 if(model==='diffuse'){
  for(const key of Object.keys(parameters))if(!diffuseKeys.has(key))throw new TypeError('Unsupported opaque diffuse parameter: '+key);
  return new MeshLambertNodeMaterial({color,flatShading:true,...parameters});
 }
 if(model!=='physical')throw new TypeError('Unknown surface material model');
 return new MeshStandardNodeMaterial({color,roughness:.93,metalness:0,flatShading:true,...parameters});
}
