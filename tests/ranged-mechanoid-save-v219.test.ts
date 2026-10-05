import { expect,test } from 'vitest';
import { prepareScytherDemo } from '../scripts/create-scyther-v213-test-save.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { createMechanoidRaid,advanceMechanoidRaid } from '../src/sim/mechanoid-raids.ts';
import { createMechaMedicalRecord,commitMechanoidImpact } from '../src/sim/mechanoid-health.ts';
import { addResolvedInjury } from '../src/sim/injury-state.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { advanceMechanoidCorpses } from '../src/sim/mechanoid-corpse.ts';
import { validMechCorpseShape } from '../src/sim/mechanoid-corpse-save.ts';
import { validMechanoidShape } from '../src/sim/mechanoid-save.ts';
import { admitMechanoidRangedOrder,mechanoidRangedQueries } from '../src/sim/mechanoid-ranged.ts';
import { validateMechanoidRanged } from '../src/sim/mechanoid-ranged-save.ts';
import { damageMechanoidWithBullet,delayMechanoidImpact } from '../src/sim/mechanoid-impact.ts';
import { captureWorldShotGrid } from '../src/sim/combat-world.ts';
import { createBulletFlight } from '../src/sim/bullet-flight.ts';
import { registerWorldProjectile } from '../src/sim/projectile-system.ts';
import { validWorldProjectile } from '../src/sim/projectile-save.ts';
import { projectileProfile } from '../src/sim/ranged-statistics.ts';
import { damagePile } from '../src/sim/thing-damage.ts';
import { validateBarriers } from '../src/sim/barrier-save.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import type { Mechanoid } from '../src/sim/mechanoid-state.ts';
import type { World } from '../src/sim/types.ts';

const noDraw=()=>{throw Error('Mechanical death must not consume a biological draw.');};
function camp(){
  const w=prepareScytherDemo();
  for(const p of w.pawns)expect(applyCommand(w,{type:'hostility-response',pawnId:p.id,response:'ignore'}).ok).toBe(true);
  expect(createMechanoidRaid(w,{budget:300,roster:['lancer','pikeman']},{rng:0x12345678},[{x:0,z:12},{x:0,z:14}])).not.toBeNull();
  expect(validateWorld(w)).toEqual([]);return w;
}
function kill(w:World,m:Mechanoid){
  const r=createMechaMedicalRecord(w.tick,m.mechKind);addResolvedInjury(r,`${m.mechKind}-reactor`,'crack',100000,noDraw);
  expect(commitMechanoidImpact(w,m,r,{rng:w.rng},w.tick*10)).toBe(true);advanceMechanoidRaid(w);advanceMechanoidCorpses(w);
}
function checkpoint(w:World){
  expect(validateWorld(w)).toEqual([]);const twin=deserializeWorld(serializeWorld(w));expect(twin).toEqual(w);
  const decoder=new SnapshotDecoder(),result=decoder.adopt(structuredClone(new SnapshotEncoder().encode(w,0,0)));
  expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);return twin;
}

test('a real mixed raid preserves each body, loss, terminal clock and ID through medical death, transfer, destruction and reload',()=>{
  const w=camp(),ids=w.mechanoids!.map(m=>m.id),next=w.nextId;let twin=checkpoint(w);
  for(const current of [w,twin])kill(current,current.mechanoids![0]!);
  expect(twin).toEqual(w);expect(w.raids!.mechActive!.lost).toEqual([ids[0]]);
  expect(w.piles.find(p=>p.id===ids[0])).toMatchObject({item:'lancer-corpse',quantity:1,mechCorpse:{mechKind:'lancer',health:{body:'lancer'}}});
  twin=checkpoint(w);for(const current of [w,twin])kill(current,current.mechanoids![0]!);
  expect(twin).toEqual(w);expect(w.raids!.last).toMatchObject({mechanoid:true,killed:2,mechComposition:{budget:300,roster:['lancer','pikeman']}});
  expect(w.nextId).toBe(next);expect(w.mechanoids).toEqual([]);const corpses=w.piles.filter(p=>ids.includes(p.id));expect(corpses).toHaveLength(2);
  for(const corpse of corpses){
    expect(validMechCorpseShape(corpse,197,w.tick)).toBe(true);expect(validMechCorpseShape(corpse,196,w.tick)).toBe(false);
    const wrong=structuredClone(corpse);wrong.mechCorpse!.health.body='scyther';expect(validMechCorpseShape(wrong,197,w.tick)).toBe(false);
  }
  checkpoint(w);const corpse=w.piles.find(p=>p.id===ids[1])!;
  expect(damagePile(w,corpse,100,'bomb')).toBe(true);expect(w.destroyed?.items?.['pikeman-corpse']).toBe(1);checkpoint(w);
  expect(validateBarriers(w,196)).toContain('Invalid destroyed building ledger.');
});

test('real warmup keeps its focus while stunned, then cancels a dead target after resuming, with exact checkpoint continuation',()=>{
  const w=camp(),m=w.mechanoids![0]!,target=w.pawns[0]!,key=`pawn:${target.id}` as const;
  const queries=mechanoidRangedQueries(w,()=>captureWorldShotGrid(w));
  expect(admitMechanoidRangedOrder(w,m,{targetKey:key,cell:{x:m.x,z:m.z},path:[]},w.tick*10,queries)).toBe(true);
  expect(m.ranged?.stance).toMatchObject({phase:'warmup',remainingCore:102});checkpoint(w);
  expect(damageMechanoidWithBullet(w,m,{damage:1,part:'lancer-thorax'},w.tick*10,1)?.selected).toBe('lancer-thorax');
  delayMechanoidImpact(w,m,w.tick*10,true,1.5);
  addResolvedInjury(target.health!,'brain','crack',100000,()=>.999999);reconcilePawnHealth(w,target);
  expect(target.state).toBe('dead');expect(m.ranged?.order?.targetKey).toBe(key);
  const twin=checkpoint(w),remaining=m.ranged!.stance!.remainingCore;
  stepWorld(w);stepWorld(twin);expect(twin).toEqual(w);expect(m.ranged!.stance!.remainingCore).toBe(remaining);checkpoint(w);
  for(let i=0;i<5;i++){stepWorld(w);stepWorld(twin);expect(twin).toEqual(w);checkpoint(w);}
  expect(m.ranged?.order?.targetKey).not.toBe(key);
});

test('typed active orders reject allies and a raw malformed actor without replacing a confirmed snapshot',()=>{
  const w=camp(),m=w.mechanoids![0]!,target=w.pawns[0]!,queries=mechanoidRangedQueries(w,()=>captureWorldShotGrid(w));
  expect(admitMechanoidRangedOrder(w,m,{targetKey:`pawn:${target.id}`,cell:{x:m.x,z:m.z},path:[]},w.tick*10,queries)).toBe(true);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error(JSON.stringify(first));const confirmed=first.world,frozen=structuredClone(confirmed);
  const early=structuredClone(w);early.mechanoids![0]!.ranged!.stance!.startedAtCore--;
  expect(validateWorld(early).length).toBeGreaterThan(0);expect(()=>serializeWorld(early)).toThrow();
  expect(decoder.adopt(structuredClone(encoder.encode(early,0,0,true))).status).toBe('resync');expect(confirmed).toEqual(frozen);
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,0,true))).status).toBe('applied');
  const ally=structuredClone(w),machine=ally.mechanoids![0]!;machine.ranged!.order!.targetKey=`mech:${ally.mechanoids![1]!.id}`;machine.ranged!.stance!.targetKey=machine.ranged!.order!.targetKey;
  expect(validateMechanoidRanged(ally,machine)).toContain('Mechanical ranged target is no longer an admissible enemy.');expect(()=>serializeWorld(ally)).toThrow();
  const bad=structuredClone(w);Object.assign(bad.mechanoids![0]!,{state:{toString:0}});
  expect(()=>validateWorld(bad)).not.toThrow();expect(validateWorld(bad).length).toBeGreaterThan(0);
  expect(decoder.adopt(structuredClone(encoder.encode(bad,0,0,true))).status).toBe('resync');expect(confirmed).toEqual(frozen);
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,0,true))).status).toBe('applied');
  const historical=structuredClone(m);historical.ranged=undefined;expect(validMechanoidShape(historical,196,w.tick)).toBe(false);
  const scyther={...historical,mechKind:'scyther' as const};delete scyther.ranged;expect(validMechanoidShape(scyther,196,w.tick)).toBe(true);
  scyther.meleeThreat=undefined;expect(validMechanoidShape(scyther,196,w.tick)).toBe(false);
});

test.each(['lancer','pikeman'] as const)('%s registered Bullet persists after real source death but rejects a wrong launcher type or kind',kind=>{
  const w=camp(),m=w.mechanoids!.find(a=>a.mechKind===kind)!,other=w.mechanoids!.find(a=>a!==m)!,target=w.pawns[0]!,weapon=`${kind}-gun` as const,profile=projectileProfile(weapon,'normal')!;
  const flight=createBulletFlight({origin:{x:m.x+.5,z:m.z+.5},destination:{x:target.x+.5,z:target.z+.5},launcherKey:`mech:${m.id}`,equipmentKey:null,
    intendedKey:`pawn:${target.id}`,usedKey:`pawn:${target.id}`,flags:7,preventFriendlyFire:false,speedPerCoreTick:profile.projectileTilesPerCoreTick});
  const p=registerWorldProjectile(w,flight,'normal',{friendlyPawnIds:[],friendlyTargetKeys:w.mechanoids!.map(a=>`mech:${a.id}` as const),friendlyFireFactor:.4},w.rng,w.tick*10,weapon);
  checkpoint(w);expect(validWorldProjectile(p,w,196)).toBe(false);
  for(const id of [target.id,other.id,w.nextId]){
    const forged=structuredClone(w);forged.projectiles![0]!.flight.launcherKey=`mech:${id}`;
    expect(validWorldProjectile(forged.projectiles![0]!,forged,197)).toBe(true);
    expect(validateWorld(forged)).toContain('Invalid intrinsic mechanical projectile launcher.');expect(()=>serializeWorld(forged)).toThrow();
  }
  kill(w,m);expect(w.piles.find(i=>i.id===m.id)?.mechCorpse?.mechKind).toBe(kind);const twin=checkpoint(w);
  for(let i=0;i<3;i++){stepWorld(w);stepWorld(twin);expect(twin).toEqual(w);}checkpoint(w);
});
