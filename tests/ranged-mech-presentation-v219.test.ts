import {expect,test} from 'vitest';
import {InstancedBufferGeometry,InterleavedBufferAttribute,Mesh} from 'three/webgpu';
import {scytherCamp} from './scenarios/scyther-v213.ts';
import {mechanoidBodyModel} from '../src/sim/mechanoid-anatomy.ts';
import {mechanoidDefinition,type MechanoidKind} from '../src/sim/mechanoid-definition.ts';
import {createMechaMedicalRecord} from '../src/sim/mechanoid-health.ts';
import {addResolvedInjury,partMissing} from '../src/sim/injury-state.ts';
import {mechanoidPartIndex,mechanoidTargetView,mechanoidView,mechanoidVisualMask} from '../src/sim/mechanoid-presentation.ts';
import {miniTurretTargets} from '../src/sim/mini-turret-presentation.ts';
import {mechanoidRangedProfile} from '../src/sim/mechanoid-ranged-profile.ts';
import {advanceMechanoidRanged,mechanoidRangedQueries} from '../src/sim/mechanoid-ranged.ts';
import {captureWorldShotGrid} from '../src/sim/combat-world.ts';
import {MechanoidLayer} from '../src/render/MechanoidLayer.ts';
import {LANCER_VISUAL_PARTS,PIKEMAN_VISUAL_PARTS,rangedMechGeometry} from '../src/render/ranged-mech-geometry.ts';
import {PresentationChanges} from '../src/bridge/presentation-changes.ts';
import {AudioCueRecorder} from '../src/bridge/audio-cues.ts';
import {MotionRecorder} from '../src/bridge/motion-tracks.ts';
import {funeralFixture} from './scenarios/hygiene-ui.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {initialGrave} from '../src/sim/burial.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {damagePile} from '../src/sim/thing-damage.ts';
import {validateWorld} from '../src/sim/serialization.ts';
import type {Structure} from '../src/sim/types.ts';

test('original ranged rigs bind every box to the correct clinical subtree and keep both mask halves exact',()=>{
  for(const kind of ['lancer','pikeman'] as const){
    const {world,actor}=scytherCamp();actor.mechKind=kind;actor.health=createMechaMedicalRecord(world.tick,kind);
    const model=mechanoidBodyModel(kind),part=kind==='lancer'?'lancer-left-shoulder':'pikeman-left-rear-leg';
    addResolvedInjury(actor.health,part,'crack',100000,()=>{throw Error('Solid anatomy must not draw a biological result.');});
    const before=JSON.stringify(world),mask=mechanoidVisualMask(actor),parts=kind==='lancer'?LANCER_VISUAL_PARTS:PIKEMAN_VISUAL_PARTS;
    expect(model.parts).toHaveLength(kind==='lancer'?30:20);expect(parts.length).toBeLessThanOrEqual(20);
    model.parts.forEach((p,i)=>expect(Math.floor(mask[i<16?0:1]/2**(i%16))%2===1).toBe(partMissing(actor.health!,p.id)));
    expect(mask.every(n=>Number.isSafeInteger(n)&&n>=0&&n<65536)).toBe(true);
    const geometry=rangedMechGeometry(kind,8,id=>mechanoidPartIndex(kind,id)),attribute=geometry.getAttribute('mechPart');
    parts.forEach((p,i)=>{
      const index=mechanoidPartIndex(kind,p.part);expect(index).toBeGreaterThanOrEqual(0);
      expect(attribute.getY(i*36)).toBe(2**(index%16));expect(attribute.getZ(i*36)).toBe(index>=16?1:0);
    });
    const view=mechanoidView(world,actor);expect(view.parts.map(p=>p.id)).toEqual(model.parts.map(p=>p.id));
    expect(view.parts.filter(p=>p.absent).map(p=>p.id)).toContain(part);expect(view.mass).toBeLessThan(60);
    expect(miniTurretTargets(world).get(`mech:${actor.id}`)).toMatchObject({label:`${mechanoidDefinition(kind).label} ${actor.id}`,cell:{x:actor.x,z:actor.z}});
    expect(JSON.stringify(world)).toBe(before);geometry.dispose();
  }
});

test('empty and historical scenes allocate only present races; mixed owners share six meshes, selection buffers and confirmed motion',()=>{
  const {world,actor}=scytherCamp(),layer=new MechanoidLayer();
  layer.update({...world,mechanoids:undefined},undefined);expect(layer.group.children).toHaveLength(0);
  layer.update(world,undefined);expect(layer.group.children).toHaveLength(2);
  const mixed=structuredClone(world);mixed.mechanoids!.push(...(['lancer','pikeman'] as const).map((kind,i)=>({...structuredClone(actor),id:mixed.nextId++,mechKind:kind,x:20+i*2})));
  const lancer=mixed.mechanoids![1]!;lancer.state='moving';lancer.motion={from:{x:lancer.x-1,z:lancer.z},to:{x:lancer.x,z:lancer.z},start:mixed.tick-1,end:mixed.tick+2};lancer.moveCooldown=2;
  layer.update(mixed,undefined);layer.setSelected(new Set([lancer.id]));expect(layer.group.children).toHaveLength(6);
  for(let i=0;i<6;i+=2){const body=layer.group.children[i] as Mesh,selection=layer.group.children[i+1] as Mesh;expect(selection.geometry.getAttribute('aFrom')).toBe(body.geometry.getAttribute('aFrom'));}
  const body=layer.group.children.find(n=>n.userData.mechKind==='lancer') as Mesh,geometry=body.geometry as InstancedBufferGeometry;
  const data=(geometry.getAttribute('aFrom') as InterleavedBufferAttribute).data,version=data.version;
  layer.update(mixed,undefined);expect(data.version).toBe(version);
  const poses=new Map<number,{x:number;kind:MechanoidKind}>();layer.forEachPose((id,x,_y,_z,_h,_r,_dead,kind)=>poses.set(id,{x,kind}));
  expect(poses.get(lancer.id)!.x).toBeCloseTo(lancer.x-1+1/3,5);expect(poses.get(lancer.id)!.kind).toBe('lancer');
  const recorder=new MotionRecorder();recorder.capture(mixed);expect(recorder.snapshot().find(t=>t.id===lancer.id)!.segments[0]).toMatchObject(lancer.motion);
  layer.update(world,undefined);expect((body.geometry as InstancedBufferGeometry).instanceCount).toBe(0);
  layer.reset();expect(layer.group.children).toHaveLength(0);layer.dispose();
});

test('same-World anatomical loss updates the bound mask once without turning a continuous Busy clock into an upload',()=>{
  const {world,actor}=scytherCamp();actor.mechKind='pikeman';const layer=new MechanoidLayer();layer.update(world,undefined);
  const geometry=(layer.group.children[0] as Mesh).geometry,data=(geometry.getAttribute('aMask') as InterleavedBufferAttribute).data,version=data.version;
  actor.health=createMechaMedicalRecord(world.tick,'pikeman');addResolvedInjury(actor.health,'pikeman-right-rear-leg','crack',100000,()=>{throw Error('No biological draw');});
  layer.update(world,undefined);expect(data.version).toBe(version+1);expect(geometry.getAttribute('aMask').getY(0)).toBe(mechanoidVisualMask(actor)[1]);
  layer.update(world,undefined);expect(data.version).toBe(version+1);layer.dispose();
});

test('confirmed focus and suspension publish while a remaining timer stays periodic, with independent cooldown history and literal names',()=>{
  const {world,actor}=scytherCamp();actor.mechKind='lancer';world.pawns[0]!.name='<img src=x> & Ada';const changes=new PresentationChanges(),audio=new AudioCueRecorder();changes.capture(world);audio.capture(world);
  const core=world.tick*10,a=`pawn:${world.pawns[0]!.id}` as const,b=`pawn:${world.pawns[1]!.id}` as const;
  actor.ranged={order:{targetKey:a,admittedAtCore:core,jobUntilCore:core+500},stance:{phase:'warmup',targetKey:a,targetStartedDowned:false,startedAtCore:core,lastAdvancedAtCore:core,remainingCore:102}};
  expect(changes.capture(world)).toBe(true);actor.ranged.stance!.remainingCore--;expect(changes.capture(world)).toBe(false);
  actor.stun={sinceCore:core,untilCore:core+45};expect(changes.capture(world)).toBe(true);expect(mechanoidView(world,actor).ranged).toMatchObject({suspended:true,remainingCore:101,target:{label:world.pawns[0]!.name}});
  delete actor.stun;actor.ranged.stance={phase:'cooldown',targetKey:a,startedAtCore:core,lastAdvancedAtCore:core,remainingCore:162};actor.ranged.order!.targetKey=b;
  expect(changes.capture(world)).toBe(true);const before=JSON.stringify(world),view=mechanoidView(world,actor);
  expect(view.target!.id).toBe(world.pawns[1]!.id);expect(view.ranged!.target!.id).toBe(world.pawns[0]!.id);
  expect(JSON.stringify(world)).toBe(before);audio.capture(world);expect(audio.drain()).toEqual([]);
  // A historical typed target cannot silently resolve to another namespace.
  actor.ranged.stance.targetKey=`mech:${world.pawns[0]!.id}`;expect(mechanoidView(world,actor).ranged!.target!.cell).toBeNull();
});

test('a real ranged expiry emits one existing shot cue at the mechanical origin and loading that record emits none',()=>{
  for(const kind of ['lancer','pikeman'] as const){
    const {world,actor}=scytherCamp();actor.mechKind=kind;const core=world.tick*10,profile=mechanoidRangedProfile(kind)!;
    actor.ranged={order:{targetKey:`pawn:${world.pawns[0]!.id}`,admittedAtCore:core-profile.warmupCoreTicks,jobUntilCore:core+400},
      stance:{phase:'warmup',targetKey:`pawn:${world.pawns[0]!.id}`,targetStartedDowned:false,startedAtCore:core-profile.warmupCoreTicks,lastAdvancedAtCore:core-1,remainingCore:1}};
    const audio=new AudioCueRecorder();audio.capture(world);
    advanceMechanoidRanged(world,actor,core,mechanoidRangedQueries(world,()=>captureWorldShotGrid(world)));
    expect(world.projectiles).toHaveLength(1);expect(world.projectiles![0]!.weaponItem).toBe(kind==='lancer'?'lancer-gun':'pikeman-gun');
    audio.capture(world);expect(audio.drain()).toContainEqual(expect.objectContaining({kind:'weapon.gunshot',x:actor.x+.5,z:actor.z+.5}));
    const loaded=new AudioCueRecorder();loaded.capture(structuredClone(world));expect(loaded.drain()).toEqual([]);
    audio.capture(world);expect(audio.drain()).toEqual([]);
  }
});

test('a historical human target follows real body pickup and ground deposition, then loses its location with the physical corpse',()=>{
  const {w,actor,other,body}=funeralFixture();other.priorities.haul=0;
  const original={x:body.x,z:body.z},pileId=body.body!.pileId!,grave=fixtureBuilding(w,'grave',25,16) as Structure;grave.grave=initialGrave();
  expect(mechanoidTargetView(w,body.id).cell).toEqual(original);
  expect(applyCommand(w,{type:'order-bury',pawnId:actor.id,bodyPawnId:body.id,graveId:grave.id})).toMatchObject({ok:true});
  for(let i=0;i<300&&actor.burial?.phase!=='carry';i++)stepWorld(w);
  expect(actor.burial?.phase).toBe('carry');const pile=w.piles.find(p=>p.id===pileId)!;expect(pile.owner).toEqual({type:'pawn',pawnId:actor.id});
  expect(mechanoidTargetView(w,body.id).cell).toEqual({x:actor.x,z:actor.z});expect({x:body.x,z:body.z}).toEqual(original);
  expect(applyCommand(w,{type:'clear-orders',pawnId:actor.id})).toMatchObject({ok:true});expect(pile.owner.type).toBe('ground');
  if(pile.owner.type!=='ground')throw Error('Physical corpse was not deposited.');
  expect(mechanoidTargetView(w,body.id).cell).toEqual({x:pile.owner.x,z:pile.owner.z});
  expect(damagePile(w,pile,100)).toBe(true);expect(w.piles.some(p=>p.id===pileId)).toBe(false);expect(validateWorld(w)).toEqual([]);
  const before=JSON.stringify(w);expect(mechanoidTargetView(w,body.id)).toEqual({id:body.id,label:body.name,cell:null});expect(JSON.stringify(w)).toBe(before);
});
