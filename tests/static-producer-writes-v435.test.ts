import{expect,it}from'vitest';import * as THREE from'three/webgpu';
import{StaticSceneCompiler435}from'../src/render/StaticSceneCompiler435';
import{ResourceLayer}from'../src/render/ResourceLayer';
import{createWorld}from'../src/sim/index';
import type{Job}from'../src/sim/types';

function corners(meshes:readonly THREE.Mesh[]):number[]{const result:number[]=[];for(const mesh of meshes){const g=mesh.geometry,index=g.index!,position=g.getAttribute('position'),color=g.getAttribute('color'),normal=g.getAttribute('normal');for(let i=g.drawRange.start;i<Math.min(index.count,g.drawRange.start+g.drawRange.count);i++){const v=index.getX(i);for(const a of[position,normal,color])for(let c=0;c<a.itemSize;c++)result.push(a.getComponent(v,c));}}return result;}
function originals(group:THREE.Group):THREE.Mesh[]{const rows:THREE.Mesh[]=[];group.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible)rows.push(o);});return rows;}
it('real ResourceLayer tint restore/apply and confirmed chop writers patch compiled pages immediately, without adoption/rebuild',()=>{
 const world=createWorld(83,20,20),pawn=world.pawns[0]!;world.resources=[{id:9001,kind:'tree',species:'oak',x:8,z:8,amount:30,growth:1},{id:9002,kind:'tree',species:'oak',x:10,z:8,amount:30,growth:1}];pawn.x=7;pawn.z=8;pawn.state='working';pawn.jobId=9100;
 const job:Job={id:9100,kind:'chop',x:8,z:8,orientation:0,footprint:'standard',status:'active',reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0}};world.jobs=[job];const cycle=(tick:number)=>Math.floor((11*tick/6+pawn.id*1.7-1.5*Math.PI)/(2*Math.PI));let tick=2;while(tick<20&&cycle(tick)===cycle(tick-1))tick++;world.tick=tick-1;
 const scene=new THREE.Scene(),root=new THREE.Group(),material=new THREE.MeshLambertNodeMaterial({vertexColors:true}),layer=new ResourceLayer(root,material),compiler=new StaticSceneCompiler435(scene);material.userData.rendererOwned=true;scene.add(root);layer.compiledAttributeChanged435=(a,start,count)=>compiler.patchAttribute(a,start,count);
 try{
  layer.update(world,true);scene.updateMatrixWorld(true);compiler.reconcile([root],layer.compiledMaterials435());expect(compiler.meshes()).toHaveLength(1);const before=corners(compiler.meshes()),rebuilds=compiler.snapshot().rebuilds;
  layer.setTargetPreview(new Set([9001]));expect(corners(compiler.meshes())).not.toEqual(before);expect(corners(compiler.meshes())).toEqual(corners(originals(root)));layer.clearTargetPreview();expect(corners(compiler.meshes())).toEqual(before);
  const next=structuredClone(world);next.tick++;next.jobs[0]!.progress=1;layer.adoptChopWork(world,next);const phase=pawn.id*1.7-1.5*Math.PI,contact=(cycle(next.tick)*2*Math.PI-phase)/11;
  layer.presentChop(contact+.09);expect(corners(compiler.meshes())).not.toEqual(before);expect(corners(compiler.meshes())).toEqual(corners(originals(root)));layer.presentChop(contact+.6);expect(corners(compiler.meshes())).toEqual(before);expect(compiler.snapshot().rebuilds).toBe(rebuilds);
  layer.setFoliageVisible(false);compiler.reconcile([root],layer.compiledMaterials435());expect(corners(compiler.meshes())).toEqual([]);expect(originals(root).filter(m=>m.layers.mask!==0).length).toBe(1);
 }finally{compiler.dispose();layer.dispose();material.dispose();}
});
