import{expect,test}from'vitest';
import{MeshLambertNodeMaterial,MeshStandardNodeMaterial,type NodeMaterial}from'three/webgpu';
import{float,positionLocal,vec3,vec4}from'three/tsl';
import{createSurfaceMaterial}from'../src/render/SurfaceMaterials';
import{material as legacyMaterial}from'../src/render/primitives';

test('surface models return their native classes and the diffuse surface remains lit',()=>{
 const diffuse=createSurfaceMaterial('diffuse',0xaabbcc,{vertexColors:true}),physical=createSurfaceMaterial('physical',0x112233,{roughness:.74,metalness:.24});
 try{
  expect(diffuse).toBeInstanceOf(MeshLambertNodeMaterial);
  expect(diffuse.color.getHex()).toBe(0xaabbcc);expect(diffuse.vertexColors).toBe(true);
  expect(diffuse.flatShading).toBe(true);expect(diffuse.lights).toBe(true);
  expect(diffuse.setupLightingModel().specular).toBe(false);
  expect(physical).toBeInstanceOf(MeshStandardNodeMaterial);
  expect(physical.roughness).toBe(.74);expect(physical.metalness).toBe(.24);
 }finally{diffuse.dispose();physical.dispose();}
});

test('the legacy factory preserves physical defaults, water, metal and transparent parameters',()=>{
 const cases=[
  {extra:{},roughness:.93,metalness:0,transparent:false,opacity:1,depthWrite:true},
  {extra:{roughness:.45,metalness:.08},roughness:.45,metalness:.08,transparent:false,opacity:1,depthWrite:true},
  {extra:{roughness:.74,metalness:.24},roughness:.74,metalness:.24,transparent:false,opacity:1,depthWrite:true},
  {extra:{transparent:true,opacity:.4,depthWrite:false},roughness:.93,metalness:0,transparent:true,opacity:.4,depthWrite:false},
 ];
 for(const row of cases){const material=legacyMaterial(0xabcdef,row.extra);try{
  expect(material).toBeInstanceOf(MeshStandardNodeMaterial);expect(material.color.getHex()).toBe(0xabcdef);
  expect(material.roughness).toBe(row.roughness);expect(material.metalness).toBe(row.metalness);
  expect(material.transparent).toBe(row.transparent);expect(material.opacity).toBe(row.opacity);expect(material.depthWrite).toBe(row.depthWrite);
 }finally{material.dispose();}}
});

test('diffuse rejects physical and transparent options instead of silently discarding them',()=>{
 // @ts-expect-error metal requires the physical model
 const metal=()=>createSurfaceMaterial('diffuse',0xffffff,{metalness:.2});
 // @ts-expect-error roughness requires the physical model
 const roughness=()=>createSurfaceMaterial('diffuse',0xffffff,{roughness:.93});
 // @ts-expect-error transparency is outside this opaque domain
 const transparent=()=>createSurfaceMaterial('diffuse',0xffffff,{transparent:true});
 // @ts-expect-error environment reflections are outside this opaque pigment domain
 const reflections=()=>createSurfaceMaterial('diffuse',0xffffff,{envMap:null});
 for(const create of[metal,roughness,transparent,reflections])expect(create).toThrow('Unsupported opaque diffuse parameter');
});

test('a common NodeMaterial configurator and cloning retain the actual class and shared graph nodes',()=>{
 const position=positionLocal.add(vec3(0,.1,0)),output=vec4(.8,.7,.6,1),mask=float(1).greaterThan(0);
 const configure=(material:NodeMaterial)=>{material.positionNode=position;material.outputNode=output;material.maskNode=mask;material.maskShadowNode=mask;};
 const source=createSurfaceMaterial('diffuse',0xffffff);configure(source);const clone=source.clone();
 try{
  expect(clone).toBeInstanceOf(MeshLambertNodeMaterial);expect(clone).not.toBe(source);
  expect(clone.setupLightingModel().specular).toBe(false);
  expect(clone.positionNode).toBe(position);expect(clone.outputNode).toBe(output);
  expect(clone.maskNode).toBe(mask);expect(clone.maskShadowNode).toBe(mask);
  configure(clone);expect(clone.outputNode).toBe(source.outputNode);
 }finally{clone.dispose();source.dispose();}
});
