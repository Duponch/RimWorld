import {expect,test,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {WildlifeLayer} from '../src/render/WildlifeLayer';
import {actionProgress} from '../src/render/action-feedback';
import {pawnWorkPose,WORK_POSE} from '../src/render/work-presentation';
import {animalInspectorScaffold,animalInspectorView} from '../src/ui/animal-inspector';
import {animalActivity} from '../src/ui/animal-activity';
import {pictogramSvg} from '../src/ui/pictograms';
import {herdCareCamp} from './helpers/veterinary-v277';
import {createWorld} from '../src/sim/index';
import {adultAgeTicks} from '../src/sim/animal-life';
import type {WildAnimal} from '../src/sim/wildlife-state';

test('a moving designation shares the exact animal trajectory and disappears after cancellation or death',()=>{
  const w=createWorld(90,16,16);w.resources=[];w.jobs=[];
  const a:WildAnimal={id:w.nextId++,species:'hare',sex:'female',ageTicks:adultAgeTicks('hare'),x:7,z:4,food:.15,rest:.8,state:'moving',path:[],nextDecision:100,
    domestic:{since:0,care:'none',tameness:5,nextDecay:45000,slaughter:true},motion:{from:{x:6,z:4},to:{x:7,z:4},start:0,end:2}};
  w.wildlife={profile:'temperate-hares-v1',rng:1,animals:[a],eatenItems:0,eatenPlants:0,eatenNutrition:0};
  const errors:string[]=[],log=vi.spyOn(console,'error').mockImplementation(message=>errors.push(String(message)));
  let layer:WildlifeLayer;
  try {layer=new WildlifeLayer();} finally {log.mockRestore();}
  expect(errors,'Constructing the GPU pose must have a valid TSL stack.').toEqual([]);
  layer.update(w,undefined,true);
  const marker=layer.mesh.children.find(m=>m.name.startsWith('Domestic slaughter')&&(m as THREE.Mesh).visible) as THREE.Mesh<THREE.InstancedBufferGeometry>;
  const body=layer.mesh.children.find(m=>m.name==='Wild hare — GPU rig') as THREE.Mesh<THREE.InstancedBufferGeometry>;
  expect(marker).toBeDefined();expect(marker.geometry.instanceCount).toBe(1);
  for(const name of ['aFrom','aTo','aTravel','aScale'])expect(marker.geometry.getAttribute(name)).toBe(body.geometry.getAttribute(name));
  expect(marker.geometry.getAttribute('aSlaughter').getX(0)).toBe(1);
  const flag=marker.geometry.getAttribute('aSlaughter') as THREE.InstancedBufferAttribute,version=flag.version;
  layer.update(w,undefined,false);expect(flag.version).toBe(version);
  const cancelled=structuredClone(w);delete cancelled.wildlife!.animals[0]!.domestic!.slaughter;layer.update(cancelled,undefined);
  expect(marker.visible).toBe(false);
  const dead=structuredClone(w);dead.wildlife!.animals[0]!.state='dead';layer.update(dead,undefined);expect(marker.visible).toBe(false);
  layer.dispose();
});

test('handling abattage exposes the real contact counter and a low working stance',()=>{
  const {world:w}=herdCareCamp('hare'),p=w.pawns[0]!;
  p.state='working';p.animalHandling={animalId:w.wildlife!.animals[0]!.id,kind:'slaughter',sourcePileId:0,carryPileId:null,quantity:0,phase:'interact',step:0,progress:9};
  expect(actionProgress(w,p)).toMatchObject({total:18,completed:9,fraction:.5});
  expect(pawnWorkPose(p,undefined)).toBe(WORK_POSE.ground);
  p.animalHandling.phase='approach';p.state='moving';expect(actionProgress(w,p)).toBeUndefined();
});

test('inspection distinguishes the irreversible action and safely publishes the assigned handler',()=>{
  const {world:w}=herdCareCamp('muffalo'),a=w.wildlife!.animals[0]!,p=w.pawns[0]!;
  expect(animalInspectorScaffold()).toContain('data-animal-slaughter');
  expect(animalInspectorView(w,a.id)).toMatchObject({domestic:true,slaughterDesignated:false,slaughterReason:undefined});
  a.domestic!.slaughter=true;p.name='<img src=x onerror=alert(1)>';
  p.animalHandling={animalId:a.id,kind:'slaughter',sourcePileId:0,carryPileId:null,quantity:0,phase:'interact',step:0,progress:3};
  expect(animalActivity(w,a)).toBe(`Abattage · ${p.name}`);
  expect(animalInspectorView(w,a.id)?.slaughterDesignated).toBe(true);
  delete a.domestic;expect(animalInspectorView(w,a.id)?.slaughterReason).toMatch(/possédé/);
  expect(pictogramSvg('slaughter')).not.toEqual(pictogramSvg('chop'));
});
