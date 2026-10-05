import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {applyCommand,createWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {createBulletFlight} from '../src/sim/bullet-flight.ts';
import {validWorldProjectile} from '../src/sim/projectile-save.ts';
import {projectileProfile} from '../src/sim/ranged-statistics.ts';
import {miniTurretExplosive} from '../src/sim/bomb-eligibility.ts';
import {validBombWaveShape} from '../src/sim/bomb-state.ts';
import {validBombRefugeShape} from '../src/sim/bomb-danger.ts';
import {commercialCamp} from './helpers/commercial-v193.ts';
import type {World} from '../src/sim/types.ts';

function adopt(decoder:SnapshotDecoder,packet:SnapshotMessage):World {
  const result=decoder.adopt(packet);
  expect(result.status).toBe('applied');
  if(result.status!=='applied')throw Error(JSON.stringify(result));
  return result.world;
}
function refuse(decoder:SnapshotDecoder,packet:SnapshotMessage,before:World,frozen:World,reason:string):void {
  // No thrown exception, partially adopted owner, or consumed revision.
  expect(decoder.adopt(packet)).toEqual({status:'resync',reason});
  expect(before).toEqual(frozen);
}
function startGroup():World {
  const {world,foodId}=commercialCamp();
  // Canonical clocks after the older prepared camp; all subsequent contacts,
  // departure and movement are produced by the real engine/commands.
  stepWorld(world);
  const sources=[{pileId:foodId,quantity:4}];
  // A real retained item with the same stable eligibility as a vanished Bomb
  // source exposes the namespace bug without an eligibility false positive.
  let explosiveId:number|undefined;
  for(let i=0;i<32&&explosiveId===undefined;i++){
    addMaterial(world,'textile',1,{type:'ground',x:4+i%8,z:1+Math.floor(i/8)},'cloth');
    const pile=world.piles.at(-1)!;
    if(miniTurretExplosive(pile.id))explosiveId=pile.id;
  }
  expect(explosiveId).toBeDefined();
  if(explosiveId===undefined)throw Error('No eligible real source in the bounded prepared stock');
  sources.push({pileId:explosiveId,quantity:1});
  expect(applyCommand(world,{type:'planet-adopt'}).ok).toBe(true);
  expect(applyCommand(world,{type:'group-start',memberIds:world.pawns.slice(0,2).map(p=>p.id),destination:world.planet!.civilianTile,sources}).ok).toBe(true);
  return world;
}
function departedGroup():World {
  const world=startGroup();
  for(let i=0;i<600&&!(world.group&&'members' in world.group);i++)stepWorld(world);
  expect(world.group&&'members' in world.group).toBe(true);
  if(!world.group||!('members' in world.group))throw Error('The actual physical group departure did not finish');
  // The resident captures a real edge, so the historical refuge corruption
  // cannot be rejected merely for lacking physical recovery.
  const resident=world.pawns[0]!;
  expect(applyCommand(world,{type:'draft',pawnIds:[resident.id],enabled:true}).ok).toBe(true);
  expect(applyCommand(world,{type:'draft-move',pawnIds:[resident.id],target:{x:resident.x+3,z:resident.z},queue:false}).ok).toBe(true);
  stepWorld(world);
  expect(resident.moveCooldown>0||(resident.motion?.end??0)>world.tick).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  return world;
}

test.each([false,true])('group owners reserve ballistic/Bomb identities before references; refusal and same-epoch retry are atomic (checkpoint=%s)',checkpoint=>{
  const world=departedGroup(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const before=adopt(decoder,structuredClone(encoder.encode(world,0,0))),frozen=structuredClone(before),tick=world.tick;
  expect(applyCommand(world,{type:'group-pause',paused:true}).ok).toBe(true);
  const good=structuredClone(encoder.encode(world,0,0,checkpoint));
  expect(good.epoch).toBe(1);expect(good.kind).toBe(checkpoint?'checkpoint':'delta');
  if(!world.group||!('members' in world.group))throw Error('Missing actual away owners');
  const owners=[...world.group.members,...world.group.items];
  for(const owner of owners){
    const bad=structuredClone(good),raw=bad.world,core=raw.tick*10;
    // Deliberately forged protocol input; the producer would require a real
    // installed Structure. Shape/clock are valid, only owner identity is false.
    raw.projectiles=[{id:raw.nextId++,quality:'normal',weaponItem:'mini-turret-gun',emittedAtCore:core,advancedAtCore:core,
      flight:createBulletFlight({launcherKey:`structure:${owner.id}`,equipmentKey:null,intendedKey:null,usedKey:null,flags:7,preventFriendlyFire:false,
        origin:{x:1.5,z:1.5},destination:{x:10.5,z:1.5},speedPerCoreTick:projectileProfile('mini-turret-gun','normal')!.projectileTilesPerCoreTick}),
      relations:{friendlyPawnIds:[],friendlyFireFactor:.4},arrival:null}];
    expect(validWorldProjectile(raw.projectiles[0],raw,raw.schemaVersion)).toBe(true);
    refuse(decoder,bad,before,frozen,'Balle ou canon lanceur invalide.');
  }
  const source=owners.find(o=>miniTurretExplosive(o.id))!;expect(source).toBeDefined();
  const bomb=structuredClone(good),core=bomb.world.tick*10;
  bomb.world.bombWaves=[{id:bomb.world.nextId++,sourceId:source.id,center:{x:1,z:1},startedAtCore:core,advancedAtCore:core,
    cells:[bomb.world.width+1],nextCell:0,damagedThingKeys:[]}];
  expect(validBombWaveShape(bomb.world.bombWaves[0],bomb.world.schemaVersion)).toBe(true);
  refuse(decoder,bomb,before,frozen,'Vague Bomb ou identité invalide.');

  const refuge=structuredClone(good),resident=refuge.world.pawns[0]!,target=resident.path.at(-1)??resident;
  resident.bombRefuge={sourceId:source.id,target:{x:target.x,z:target.z},endCore:core};
  expect(validBombRefugeShape(resident.bombRefuge,refuge.world.schemaVersion)).toBe(true);
  refuse(decoder,refuge,before,frozen,'Refuge ou danger Bomb incohérent.');

  const malformed=structuredClone(good);
  (malformed.world as unknown as Record<string,unknown>).group=null;
  refuse(decoder,malformed,before,frozen,'Planète, groupe ou pertes incohérents.');
  expect(adopt(decoder,good)).toEqual(world);expect(world.tick).toBe(tick);expect(before).toEqual(frozen);
});

test.each([false,true])('historical 195 accepts true absence and rejects own future keys even undefined without advancing the revision (checkpoint=%s)',checkpoint=>{
  const world=createWorld(42,16,16);(world as unknown as {schemaVersion:number}).schemaVersion=195;
  delete world.planet;delete world.group;delete world.groupLosses;
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),before=adopt(decoder,structuredClone(encoder.encode(world,0,0))),frozen=structuredClone(before);
  const good=structuredClone(encoder.encode(world,0,0,checkpoint));
  for(const key of ['planet','group','groupLosses']){
    const bad=structuredClone(good);
    (bad.world as unknown as Record<string,unknown>)[key]=undefined;
    expect(Object.hasOwn(bad.world,key)).toBe(true);
    refuse(decoder,bad,before,frozen,'Planète ou propriétaire de groupe futur.');
  }
  const emptyLosses=structuredClone(good);emptyLosses.world.groupLosses=[];
  refuse(decoder,emptyLosses,before,frozen,'Planète ou propriétaire de groupe futur.');
  const next=adopt(decoder,good);expect(next).toEqual(world);
  expect(['planet','group','groupLosses'].every(key=>!Object.hasOwn(next,key))).toBe(true);
});

test.each([false,true])('same-epoch cancellation removes sparse preparation owners, while geography requires an explicit replacement (checkpoint=%s)',checkpoint=>{
  const world=startGroup();world.groupLosses=[];
  expect(validateWorld(world)).toEqual([]);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),before=adopt(decoder,structuredClone(encoder.encode(world,0,0))),frozen=structuredClone(before),tick=world.tick;
  expect(applyCommand(world,{type:'group-cancel'}).ok).toBe(true);delete world.groupLosses;
  const good=structuredClone(encoder.encode(world,0,0,checkpoint));
  expect(Object.hasOwn(good.world,'group')).toBe(false);expect(Object.hasOwn(good.world,'groupLosses')).toBe(false);
  const missing=structuredClone(good);delete missing.world.planet;
  refuse(decoder,missing,before,frozen,'La géographie confirmée a changé sans remplacement.');
  const changed=structuredClone(good);changed.world.planet!.generationSeed^=1;
  refuse(decoder,changed,before,frozen,'La géographie confirmée a changé sans remplacement.');
  const next=adopt(decoder,good);expect(next).toEqual(world);expect(next.planet).toEqual(before.planet);expect(world.tick).toBe(tick);
  expect(Object.hasOwn(next,'group')).toBe(false);expect(Object.hasOwn(next,'groupLosses')).toBe(false);

  // A neutral migration may still have no adoption. Only replacement may
  // remove a geography which this decoder previously confirmed.
  const replacement=createWorld(42,16,16);
  delete replacement.planet;delete replacement.group;delete replacement.groupLosses;
  const packet=structuredClone(encoder.encode(replacement,0,0));expect(packet.epoch).toBe(good.epoch+1);
  expect(adopt(decoder,packet)).toEqual(replacement);expect(next).toEqual(world);expect(before).toEqual(frozen);
});
