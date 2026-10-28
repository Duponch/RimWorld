import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/engine';
import {PawnLayer} from '../src/render/PawnLayer';
import {MotionTimeline} from '../src/render/MotionTimeline';
import {ownActorPlaybackWorld435} from '../src/render/ActorPlayback435';
import {CorePhaseFrameOwner297} from '../src/bridge/core-phase-owner-297';
import {captureCoreActor297} from '../src/bridge/core-phase-data-297';
// Real PawnLayer/streams and Owner. Authored render fixture, no played SIM,
// Native proof, clinical save validity, physical FPS or wall-time measurement.
test('only a target moves: stationary unchanged melee attacker follows its confirmed detached target across macros',()=>{
 const world=createWorld(492,16,16),a=world.pawns[0]!,b=world.pawns[1]!;world.pawns=[a,b];world.resources=[];world.structures=[];world.jobs=[];world.piles=[];world.packed=[];world.tick=20;world.phaseCore297=0;
 for(const pawn of world.pawns){pawn.state='idle';pawn.path=[];pawn.jobId=null;delete pawn.motion;}
 a.x=5;a.z=5;b.x=6;b.z=5;
 a.melee={order:{targetId:b.id,startedDowned:false},strike:{targetId:b.id,atCore:200,untilCore:400,tool:'left-fist',outcome:'miss'}};
 const stance=structuredClone(a.melee),fullBefore=structuredClone(world),owner=new CorePhaseFrameOwner297(),full=owner.adoptFull(world,1,1,[],{mapId:0,core:200,projectilesRetained:[],actorMode297:'frontier'},1),layer=new PawnLayer(),timeline=new MotionTimeline();
 ownActorPlaybackWorld435(world,true);
 try{
  layer.update(world,1,true);timeline.adopt(20,1,[],0,true,true,true);timeline.tick=20;layer.updateTravel(world,timeline,1/60,1,full.actorScene);
  const g=layer.feedbackSource!;expect(g.getAttribute('aTo').getW(0)).toBeCloseTo(Math.PI/2,5);
  const moved={...b,x:5,z:6},packet={type:'actor-frontier-297',audioCues:[],epoch:1,mapId:0,baseRevision:1,phaseSeq:1,nextId:world.nextId,fromCore:200,toCore:210,speed:1,actors:[captureCoreActor297('human',1,moved)],tracks:[],projectiles:{upserted:[],removed:[]}};
  const phase=owner.commit(owner.prepare(packet));expect(phase.actorScene.humans[0]).toBe(full.actorScene.humans[0]);expect(phase.actorScene.humans[0]!.melee).toEqual(stance);
  layer.adoptPhase297(world,[1],phase.actorScene);timeline.adopt(21,1,[],100,false,true,true);timeline.tick=21;layer.updateTravel(world,timeline,1/60,1,phase.actorScene);
  const later=owner.commit(owner.prepare({...packet,phaseSeq:2,fromCore:210,toCore:240,actors:[]}));layer.adoptPhase297(world,[],later.actorScene);timeline.adopt(24,1,[],200,false,true,true);timeline.tick=24;layer.updateTravel(world,timeline,1/60,1,later.actorScene);
  expect(g.getAttribute('aTo').getW(0)).toBeCloseTo(0,5);expect(g.getAttribute('aFrom').getW(0)).toBeCloseTo(0,5);expect(a.melee).toEqual(stance);expect(world).toEqual(fullBefore);expect(later.world).toBe(world);expect(world.tick).toBe(20);
 }finally{layer.dispose();ownActorPlaybackWorld435(world,false);}
});
