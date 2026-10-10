import {expect,test,vi} from 'vitest';
import {OrthographicCamera,Vector3} from 'three/webgpu';
import {createWorld} from '../src/sim/engine';
import type {Structure,World} from '../src/sim/types';
import type {CookingTask} from '../src/sim/cooking-types';
import {doorOrientations,isRoomDoor,newDoorState} from '../src/sim/door-rules';
import {newMiniTurretState} from '../src/sim/mini-turret-state';
import {ensureFireState} from '../src/sim/fire-rules';
import {penBoundaryAxes} from '../src/render/pen-parts';
import {DoorLayer} from '../src/render/DoorLayer';
import {StructureVfxLayer} from '../src/render/StructureVfxLayer';
import {SceneStructurePreparation} from '../src/render/SceneStructurePreparation';
import {doorAppearance,vfxAppearance} from './helpers/structure-appearance-v299';

// Presentation fixtures deliberately exercise all consumed branches; partial
// projectile/task records below do not claim to be admissible saved Worlds.
const building=(kind:Structure['kind'],id:number,x=8,z=8):Structure=>({id,kind,x,z,material:'wood',orientation:0,footprint:'standard'});
function world(){const w=createWorld(29901,24,24);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.structures=[];w.jobs=[];return w;}

test('native doors retain leaf F32/history/bounds across reversals, axes, materials, cutaway and duplicate calls',()=>{
  const w=world(),a=new DoorLayer(),b=new DoorLayer();
  w.structures=[building('door',900),building('autodoor',901,12,8),building('fence-gate',902,16,8),building('wall',903,8,7),building('fence',904,16,7)];
  for(const s of w.structures)if(isRoomDoor(s.kind)||s.kind==='fence-gate')s.door=newDoorState(w.tick);
  w.structures[1]!.power={on:true,parentId:null};
  const check=(cutaway=false,reset=false)=>{
    a.update(w,cutaway,reset);
    b.updateNative(w,cutaway,reset,w.structures.filter(s=>isRoomDoor(s.kind)||s.kind==='fence-gate'),doorOrientations(w),penBoundaryAxes(w));
    expect(doorAppearance(b)).toStrictEqual(doorAppearance(a));
  };
  try{
    check(false,true);check();
    for(const s of w.structures.slice(0,3)){s.door!.open=true;s.door!.changedAt++;s.door!.from=.2;}check();check();
    for(const s of w.structures.slice(0,3)){s.door!.open=false;s.door!.changedAt++;s.door!.from=.7;}check();
    w.structures[1]!.door!.duration=3.5;w.structures[1]!.material='steel';check(true);
    w.structures[3]!.x=9;w.structures[3]!.z=8;w.structures[4]!.x=17;w.structures[4]!.z=8;check(true);
    w.structures.splice(0,1);check();check(false,true);
  }finally{a.dispose();b.dispose();}
});

test('native doors preserve empty compile restoration and grown buffers',()=>{
  const w=world(),a=new DoorLayer(),b=new DoorLayer();
  const check=(reset=false)=>{a.update(w,false,reset);b.updateNative(w,false,reset,w.structures,doorOrientations(w),penBoundaryAxes(w));expect(doorAppearance(b)).toStrictEqual(doorAppearance(a));};
  try{
    check(true);const ra=a.prepareForCompile(),rb=b.prepareForCompile();expect(doorAppearance(b)).toStrictEqual(doorAppearance(a));ra();rb();
    w.structures=Array.from({length:140},(_,i)=>({...building('door',1000+i,1+i%20,1+Math.floor(i/20)),door:newDoorState(w.tick)}));check();
    expect(a.mesh.instanceMatrix.count).toBeGreaterThan(256);w.structures=[];check();
  }finally{a.dispose();b.dispose();}
});

test('native VFX decision preserves every appliance branch and skips RAW geometry on a stable key',()=>{
  const w=world(),a=new StructureVfxLayer(),b=new StructureVfxLayer(),preparation=new SceneStructurePreparation();
  const kinds:Structure['kind'][]=['mini-turret','autodoor','machining-table','fabrication-bench','electric-stove','fueled-stove','hi-tech-research-bench','multi-analyzer','battery','biofuel-refinery','chemfuel-generator','wood-generator','campfire','heater','bed'];
  w.structures=kinds.map((kind,i)=>({...building(kind,900+i,3+i%5*4,3+Math.floor(i/5)*5),power:{on:true,parentId:null}}));
  for(const s of w.structures)if(['fueled-stove','chemfuel-generator','wood-generator','campfire'].includes(s.kind))s.fuel={ticks:100,burned:0,autoRefuel:true};
  w.structures[0]!.turret=newMiniTurretState();w.structures[0]!.turret!.wick={startedAtCore:w.tick*10,endCore:w.tick*10+240};
  w.structures[1]!.door=newDoorState(w.tick);w.structures[8]!.battery={stored:600*120000/4};
  const check=(reset=false)=>{const prepared=preparation.read(w);a.adopt(w,reset);b.adoptNative(w,reset,prepared.axes,prepared.effects);expect(vfxAppearance(b)).toStrictEqual(vfxAppearance(a));};
  try{
    check(true);const stable=vi.spyOn(b,'adopt');check();expect(stable).not.toHaveBeenCalled();stable.mockRestore();
    for(const index of [2,3,4,5]){w.pawns[0]!.state='working';w.pawns[0]!.cooking={stationId:w.structures[index]!.id,phase:'work'} as CookingTask;check();}
    w.pawns[0]!.cooking!.phase='output';check();
    w.structures[8]!.battery!.stored=0;check();w.structures[8]!.battery!.stored=600*120000;check();
    w.structures[13]!.breakdown={brokenAt:w.tick};w.structures[14]!.emp={sinceCore:w.tick*10,untilCore:(w.tick+1)*10};check();
    w.tick++;check();delete w.structures[13]!.breakdown;delete w.structures[14]!.emp;check();
    for(const s of w.structures){if(s.power)s.power.on=false;if(s.fuel)s.fuel.ticks=0;}check();
    a.setDistant(true);b.setDistant(true);check();a.setDistant(false);b.setDistant(false);
    const ra=a.prepareForCompile(),rb=b.prepareForCompile();expect(vfxAppearance(b)).toStrictEqual(vfxAppearance(a));ra();rb();check(true);
  }finally{a.dispose();b.dispose();}
});

test('native VFX preserves one-tick flashes, ground fire selection and historical key collisions',()=>{
  const w=world(),a=new StructureVfxLayer(),b=new StructureVfxLayer();
  w.projectiles=[{id:1200,weaponItem:'mini-turret-gun',emittedAtCore:w.tick*10,flight:{origin:{x:5,z:5},destination:{x:8,z:8}}} as unknown as NonNullable<World['projectiles']>[number]];
  const wave=(id:number)=>({id,sourceId:id-1,center:{x:9,z:9},startedAtCore:w.tick*10,advancedAtCore:w.tick*10,cells:[225],nextCell:0,damagedThingKeys:[]});
  w.bombWaves=[wave(1202),{...wave(1204),emp:{quality:'normal'}},{...wave(1206),shortCircuit:{damage:'flame',radius:5,seed:5}}];
  ensureFireState(w).items.push({id:1210,x:10,z:10,size:.8,bornCore:0,nextPulseCore:15,complexCore:150,spreadCore:150});
  const camera=new OrthographicCamera(-18,18,18,-18,.1,150),target=new Vector3(10,0,10);camera.position.set(30,35,30);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const check=()=>{a.adopt(w);b.adoptNative(w);a.setView(camera,target);b.setView(camera,target);expect(vfxAppearance(b)).toStrictEqual(vfxAppearance(a));};
  try{
    check();const before=vfxAppearance(a);w.projectiles![0]!.flight.destination.x=20;check();expect(vfxAppearance(a)).toStrictEqual(before); // legacy flash token contains only ID
    w.tick++;check();expect(a.glow.activeCount).toBe(0);expect(a.smoke.geometry.instanceCount).toBe(7);
    ensureFireState(w).items[0]!.attachedPawnId=w.pawns[0]!.id;check();expect(a.smoke.geometry.instanceCount).toBe(0);
  }finally{a.dispose();b.dispose();}
});
