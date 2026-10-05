import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { scytherCamp,producedScytherCorpse } from './scenarios/scyther-v213.ts';
import { producedScytherArrival } from './helpers/scyther-v213.ts';
import type { MaterialPile,World } from '../src/sim/types.ts';

const adopt=(decoder:SnapshotDecoder,packet:SnapshotMessage):World=>{const r=decoder.adopt(packet);if(r.status!=='applied')throw Error(JSON.stringify(r));return r.world;};
test('same-tick mechanical body to corpse transfer is exclusive and invalid packets preserve the confirmed World and revision',()=>{
  for(const checkpoint of [false,true]){
    const {world,actor}=scytherCamp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(validateWorld(world)).toEqual([]);
    const confirmed=adopt(decoder,structuredClone(encoder.encode(world,0,0))),raw=JSON.stringify(confirmed);
    producedScytherCorpse(world,actor);expect(validateWorld(world)).toEqual([]);
    const good=structuredClone(encoder.encode(world,0,0,checkpoint));
    const corruptions:Array<(packet:SnapshotMessage)=>void>=[
      p=>{p.world.mechanoids=[structuredClone(actor)];},
      p=>{p.world.mechanoids=[{...structuredClone(actor),id:world.pawns[0]!.id}];},
      p=>{p.world.pawns[0]!.health=structuredClone(actor.health!);},
      p=>{const pile=p.kind==='checkpoint'?p.world.piles.find(x=>x.id===actor.id)!:p.piles!.upserted.find(x=>x.id===actor.id)!;pile.owner={type:'job',jobId:1};},
      p=>{const pile=p.kind==='checkpoint'?p.world.piles.find(x=>x.id===actor.id)!:p.piles!.upserted.find(x=>x.id===actor.id)!;pile.mechCorpse!.health.tick=world.tick+1;},
    ];
    for(const corrupt of corruptions){const bad=structuredClone(good);corrupt(bad);expect(decoder.adopt(bad).status).toBe('resync');expect(JSON.stringify(confirmed)).toBe(raw);}
    expect(adopt(decoder,good)).toEqual(world);expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  }
});
test('193 cannot carry new own-properties, policy, filters, recipes or a mechanical medical body',()=>{
  const {world}=scytherCamp();delete world.mechanoids;
  const packet=structuredClone(new SnapshotEncoder().encode(world,0,0));(packet.world as {schemaVersion:number}).schemaVersion=193;
  expect(new SnapshotDecoder().adopt(packet).status).toBe('applied');
  for(const extra of [{mechanoids:undefined},{mechanoids:[]},{mechSalvage:undefined},{mechSalvage:{completed:1,steel:15}}]){
    const bad=structuredClone(packet);Object.assign(bad.world,extra);expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
  }
  const bad=structuredClone(packet);bad.world.pawns[0]!.health={tick:world.tick,body:'scyther',nextInjuryId:1,injuries:[],missing:[],bloodLoss:0};expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
});

test('193 rejects a future own-property in raid or prisoner equipment archives without any mechanical or ballistic owner',()=>{
  for(const archive of ['raid','prison'] as const){
    const {world}=scytherCamp();delete world.mechanoids;
    const pawnId=world.nextId++,item:MaterialPile={id:world.nextId++,kind:'weapon',item:'revolver',quantity:1,
      owner:{type:'equipment',pawnId},weapon:{quality:'normal',hitPoints:100}};
    const departure={pawnId,name:'Ancien propriétaire',cell:{x:0,z:16},tick:world.tick,items:[item]};
    if(archive==='raid')world.raids={profile:'camp-raids-v1',rng:1,nextCheck:world.tick+100,serial:1,completed:1,
      last:{id:1,tick:world.tick,reason:'withdrawn',killed:0,downed:0,escaped:1},departed:[{...departure,group:1}]};
    else world.prisonDepartures=[{...departure,capturedAt:0}];
    expect(validateWorld(world)).toEqual([]);(world as {schemaVersion:number}).schemaVersion=193;
    const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),confirmed=adopt(decoder,structuredClone(encoder.encode(world,0,0)));
    const raw=JSON.stringify(confirmed),good=structuredClone(encoder.encode(world,0,0,true)),bad=structuredClone(good);
    const archivedItem=archive==='raid'?bad.world.raids!.departed[0]!.items[0]!:bad.world.prisonDepartures![0]!.items[0]!;
    Object.assign(archivedItem,{mechCorpse:undefined});
    expect(decoder.adopt(bad)).toMatchObject({status:'resync',reason:'Dossier mécanique de départ historique invalide.'});
    expect(JSON.stringify(confirmed)).toBe(raw);expect(adopt(decoder,good)).toEqual(world);
  }
});

test('an active mechanical group without actor arrays still reserves lost identities against human archives, atomically in checkpoint and delta',()=>{
  const prepared=producedScytherArrival(),group=prepared.raids!.mechActive!;
  // The save permits a consumed historical carcass; the missing actor array
  // must not disable the contextual guard for its still-active group.
  group.lost=[...group.members].sort((a,b)=>a-b);group.phase='assault';delete prepared.mechanoids;
  expect(validateWorld(prepared)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(prepared));expect(resumed).toEqual(prepared);
  for(const checkpoint of [false,true]){
    const world=structuredClone(prepared),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
    const confirmed=adopt(decoder,structuredClone(encoder.encode(world,0,0))),raw=JSON.stringify(confirmed);
    const good=structuredClone(encoder.encode(world,0,0,checkpoint)),bad=structuredClone(good);
    bad.world.prisonDepartures=[{pawnId:group.members[0]!,name:'Identité humaine forgée',capturedAt:world.tick,
      tick:world.tick,cell:{x:0,z:16},items:[]}];
    const forged=structuredClone(world);forged.prisonDepartures=structuredClone(bad.world.prisonDepartures);
    expect(validateWorld(forged)).toContain('Mechanical historical identity reused by another owner.');
    expect(()=>serializeWorld(forged)).toThrow('Mechanical historical identity reused by another owner.');
    expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow('Mechanical historical identity reused by another owner.');
    expect(decoder.adopt(bad)).toMatchObject({status:'resync',reason:'Identité mécanique historique réutilisée dans un autre propriétaire.'});
    expect(JSON.stringify(confirmed)).toBe(raw);expect(adopt(decoder,good)).toEqual(world);
  }
  stepWorld(prepared);stepWorld(resumed);expect(resumed).toEqual(prepared);expect(validateWorld(resumed)).toEqual([]);
  expect(resumed.raids!.mechActive).toBeUndefined();expect(resumed.raids!.last).toMatchObject({mechanoid:true,killed:group.members.length});
});
