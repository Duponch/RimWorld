import { describe,expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { controlledInjury,medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { notifyPawnDeath } from '../src/sim/bereavement.ts';
import { familyBereavementThoughts,expireFamilyBereavement,FAMILY_DEATH_DURATION } from '../src/sim/family-bereavement.ts';
import { validFamilyBereavementShape } from '../src/sim/family-bereavement-save.ts';
import { tryAddRelationship } from '../src/sim/relationship-runtime.ts';
import { relationshipHousingThought } from '../src/sim/relationship-housing.ts';
import { captureRoomQuality } from '../src/sim/room-quality.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { advanceHumanCorpses } from '../src/sim/human-corpses.ts';
import { damagePile,damageStructure } from '../src/sim/thing-damage.ts';
import { addSocialMemory,opinionOf } from '../src/sim/social-state.ts';
import { HUMAN_YEAR_TICKS } from '../src/sim/human-age.ts';
import type { RelationshipKind } from '../src/sim/relationship-state.ts';
import type { Pawn,World } from '../src/sim/types.ts';

function camp(count=3):World {
  const w=medicalCamp(count);delete w.relationships;
  for(const [n,p] of w.pawns.entries()){
    p.x=12+n;p.z=12;delete p.background;
    p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:1000*HUMAN_YEAR_TICKS};
    p.social={rng:1,memories:[]};p.priorities.basic=0;
  }
  return w;
}
function bond(w:World,kind:RelationshipKind,a:Pawn,b:Pawn):void {
  const aId=kind==='parent'?a.id:Math.min(a.id,b.id),bId=kind==='parent'?b.id:Math.max(a.id,b.id);
  expect(tryAddRelationship(w,{kind,aId,bId,recordedAt:w.tick})).toBe(true);
}
function kill(w:World,p:Pawn):void {
  controlledInjury(w,p,'heart',20000,'cut');
  expect(p.state).toBe('dead');expect(p.health?.death?.tick).toBe(w.tick);
}

describe('V214 — family consequences retain physical and historical owners',()=>{
  test.each([
    ['parent','parent-died',-8],['child','child-died',-20],['sibling','sibling-died',-14],
    ['lover','lover-died',-16],['spouse','spouse-died',-20],
  ] as const)('%s death captures one family memory beside the directed friend memory and continues through save/transport',(relation,kind,offset)=>{
    const w=camp(),[observer,deceased]=w.pawns as [Pawn,Pawn,Pawn];
    if(relation==='child')bond(w,'parent',deceased,observer);
    else bond(w,relation,observer,deceased);
    observer.traits=['bloodlust'];
    expect(validateWorld(w)).toEqual([]);
    const opinion=opinionOf(observer,deceased.id,w.tick,w),worldRng=w.rng;
    const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
    const before=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
    if(before.status!=='applied')throw Error(before.status);
    const frozen=JSON.stringify(before.world);
    kill(w,deceased);notifyPawnDeath(w,deceased);
    expect(w.rng).toBe(worldRng);
    expect(observer.familyBereavement).toEqual([{otherId:deceased.id,kind,at:w.tick}]);
    expect(observer.bereavement).toMatchObject([{otherId:deceased.id,kind:'friend-died',opinion}]);
    expect(familyBereavementThoughts(w,observer)[0]).toMatchObject({offset,expiresAt:w.tick+FAMILY_DEATH_DURATION});
    expect(validFamilyBereavementShape(observer.familyBereavement,194,w.tick)).toBe(false);
    const after=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
    if(after.status!=='applied')throw Error(after.status);
    expect(after.world.pawns[0]!.familyBereavement).toEqual(observer.familyBereavement);
    expect(JSON.stringify(before.world)).toBe(frozen);
    expect(validateWorld(w)).toEqual([]);
    const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,80);stepWorld(resumed,80);
    expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
  });

  test('a lost body keeps its known family identity and rival joy does not erase family grief',()=>{
    const w=camp(),[observer,deceased]=w.pawns as [Pawn,Pawn,Pawn];bond(w,'parent',observer,deceased);
    for(let n=0;n<3;n++)addSocialMemory(observer.social!,deceased.id,'fight-angering',w.tick,1);
    expect(opinionOf(observer,deceased.id,w.tick,w)).toBeLessThan(-20);
    kill(w,deceased);
    expect(observer.bereavement?.[0]?.kind).toBe('rival-died');
    const thought=familyBereavementThoughts(w,observer)[0]!;expect(thought.offset).toBe(-8);
    advanceHumanCorpses(w);const corpse=w.piles.find(p=>p.humanCorpse?.pawnId===deceased.id)!;
    expect(corpse).toBeDefined();expect(damagePile(w,corpse,10000,'bomb')).toBe(true);
    expect(deceased.body?.lostAt).toBe(w.tick);expect(w.pawns).toContain(deceased);
    expect(familyBereavementThoughts(w,observer)).toEqual([thought]);expect(validateWorld(w)).toEqual([]);
    const resumed=deserializeWorld(serializeWorld(w));expect(resumed.pawns[0]!.familyBereavement).toEqual(observer.familyBereavement);
    const expired=structuredClone(observer);expireFamilyBereavement(expired,thought.expiresAt!);
    expect(expired.familyBereavement).toBeUndefined();
  });

  test('a family path must already exist at death; a later graph cannot forge retroactive grief',()=>{
    const w=camp(),[observer,deceased,relative]=w.pawns as [Pawn,Pawn,Pawn];
    bond(w,'sibling',observer,relative);bond(w,'parent',relative,deceased);
    kill(w,deceased);expect(observer.familyBereavement?.[0]?.kind).toBe('parent-died');
    stepWorld(w,2);expect(validateWorld(w)).toEqual([]);
    const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
    expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('applied');
    const good=structuredClone(encoder.encode(w,0,1)),bad=structuredClone(good);
    // The graph remains well shaped and its timestamp is not in the future.
    // Only the parent edge needed to prove the captured memory becomes late.
    bad.world.relationships!.links.find(l=>l.kind==='parent')!.recordedAt=w.tick;
    expect(validateWorld({...w,relationships:bad.world.relationships})).toContain('Invalid family bereavement memory.');
    expect(decoder.adopt(bad).status).toBe('resync');expect(decoder.adopt(good).status).toBe('applied');

    const late=camp(),[living,dead]=late.pawns as [Pawn,Pawn,Pawn];kill(late,dead);stepWorld(late,2);
    bond(late,'parent',living,dead);notifyPawnDeath(late,dead);
    expect(living.familyBereavement).toBeUndefined();expect(validateWorld(late)).toEqual([]);
  });

  test('two assigned civilian beds need one real enclosed room; occupancy and current positions do not substitute for ownership',()=>{
    const w=camp(),[a,b]=w.pawns as [Pawn,Pawn,Pawn];bond(w,'lover',a,b);
    for(let x=11;x<20;x++){fixtureBuilding(w,'wall',x,10);fixtureBuilding(w,'wall',x,20);}
    for(let z=11;z<20;z++){
      fixtureBuilding(w,'wall',10,z);fixtureBuilding(w,'wall',20,z);
      if(z!==15)fixtureBuilding(w,'wall',15,z);
    }
    w.structures.push({id:w.nextId++,kind:'door',x:15,z:15,material:'wood',orientation:0,footprint:'standard',door:newDoorState(w.tick)});
    const left=fixtureBuilding(w,'bed',11,11),right=fixtureBuilding(w,'bed',17,11),shared=fixtureBuilding(w,'bed',12,16);
    expect(applyCommand(w,{type:'assign-bed',pawnId:a.id,bedId:left.id}).ok).toBe(true);
    expect(applyCommand(w,{type:'assign-bed',pawnId:b.id,bedId:right.id}).ok).toBe(true);
    const topology=captureRoomQuality(w).topology,before=serializeWorld(w);let consultations=0;
    expect(relationshipHousingThought(w,a,()=>{consultations++;return topology;})).toMatchObject({id:'want-shared-room',offset:-4});
    expect(consultations).toBe(1);expect(serializeWorld(w)).toBe(before);
    expect(applyCommand(w,{type:'assign-bed',pawnId:b.id,bedId:shared.id}).ok).toBe(true);
    a.x=3;a.z=3;b.x=4;b.z=3;
    expect(relationshipHousingThought(w,a,topology)).toBeUndefined();expect(relationshipHousingThought(w,b,topology)).toBeUndefined();
    expect(validateWorld(w)).toEqual([]);
    expect(damageStructure(w,shared,10000,'melee')).toBe(true);
    expect(b.bedId).toBeNull();expect(relationshipHousingThought(w,a,captureRoomQuality(w).topology)).toMatchObject({offset:-4});
    const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,40);stepWorld(resumed,40);
    expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
  });
});
