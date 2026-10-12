import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotValidationContext} from '../src/bridge/snapshots.ts';
import {createOwnedValidationGeometry} from '../src/sim/owned-validation-geometry.ts';
import {PowerParentValidationCache} from '../src/sim/power-parent-validation.ts';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {createStartingCandidateRoster,startingPartyFromRoster} from '../src/sim/starting-candidates.ts';
import {generateStartingWorld,resolveStartingSite,startingSiteChoices} from '../src/sim/starting-world.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import type {StartingArrivalPending} from '../src/sim/starting-arrival-state.ts';
import type {World} from '../src/sim/types.ts';

// Optional resource-facts coverage; this public fixture does not claim to be
// the private MAIN owner or certify its native cost.
class QueryDecoder extends SnapshotDecoder {
  protected override createValidationContext(next:World):SnapshotValidationContext {
    const geometry=createOwnedValidationGeometry(next);
    return {powerParents:new PowerParentValidationCache(),geometry,resourceFacts:geometry.resourceFacts};
  }
}
const choice={version:1 as const,seed:333,tile:startingSiteChoices(generateStartingWorld(333))[0]!};
const site=resolveStartingSite(choice),party=startingPartyFromRoster(335,createStartingCandidateRoster(335));
const prepared=()=>createScenarioWorld(site.seed,32,'crashlanded',site.site,party,choice);
const pending=(w:World)=>w.startingArrival as StartingArrivalPending;
const podId=(w:World,id:number)=>{const pod=pending(w).pods[0]!;pod.id=id;for(const pile of pod.items)if(pile.owner.type==='starting-pod')pile.owner.podId=id;};

for(const Decoder of [SnapshotDecoder,QueryDecoder]){
  test(`${Decoder.name}: exact pending checkpoint/delta, skipped opening and new epoch reload preserve original owners`,()=>{
    const w=prepared(),encoder=new SnapshotEncoder(),decoder=new Decoder(),held=pending(w).pods.map(p=>p.pawn.id);
    pending(w).pods[0]!.pawn.health={...createMedicalRecord(0),ageAilments:['bad-back']};
    const send=()=>structuredClone(encoder.encode(w,0,1));
    const first=decoder.adopt(send());expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('pending rejected');
    const before=structuredClone(first.world);
    stepWorld(w,15);const landed=decoder.adopt(send());expect(landed.status).toBe('applied');
    if(landed.status!=='applied')throw Error('landed rejected');
    expect(landed.world).toEqual(w);expect(landed.world.pawns).toEqual([]);
    expect(pending(landed.world).pods[0]!.pawn.health!.tick).toBe(0);
    const closed=structuredClone(landed.world);stepWorld(w,13);
    const opened=decoder.adopt(send());expect(opened.status).toBe('applied');
    if(opened.status!=='applied')throw Error('opened rejected');
    expect(opened.world).toEqual(w);expect(opened.world.pawns.map(p=>p.id)).toEqual(held);
    expect(first.world).toEqual(before);expect(landed.world).toEqual(closed);
    const restarted=prepared(),newEpoch=structuredClone(encoder.encode(restarted,0,0));
    expect(newEpoch.epoch).toBeGreaterThan(1);expect(decoder.adopt(newEpoch).status).toBe('applied');
  });

  const forgeCases:readonly [string,(w:World)=>void][]=[
    ['capsule collides with a map resource',w=>podId(w,w.resources[0]!.id)],
    ['capsule collides with a map pile',w=>podId(w,w.piles[0]!.id)],
    ['contained person also occurs on map',w=>{w.pawns.push(structuredClone(pending(w).pods[0]!.pawn));}],
    ['contained pile also occurs on map',w=>{const pod=pending(w).pods[0]!,pile=pod.items.find(p=>p.owner.type==='starting-pod')!,drop=pod.drops.find(d=>d.pileId===pile.id)!;w.piles.push({...structuredClone(pile),owner:{type:'ground',...drop.cell}});}],
    ['foreign worn owner',w=>{pending(w).pods[0]!.items.find(p=>p.owner.type==='apparel')!.owner={type:'apparel',pawnId:pending(w).pods[1]!.pawn.id};}],
    ['future personal medical tick',w=>{pending(w).pods[0]!.pawn.health=createMedicalRecord(1);}],
    ['unknown material condition',w=>{pending(w).pods[0]!.items[0]!.damage=1;}],
    ['extra dotation',w=>{pending(w).pods[0]!.items.find(p=>p.owner.type==='starting-pod')!.quantity++;}],
    ['dangling relationship endpoint',w=>{w.relationships={links:[{kind:'lover',aId:pending(w).pods[0]!.pawn.id,bId:w.nextId+1,recordedAt:0}]};}],
    ['revision9 cannot own physical arrival',w=>{w.scenario!.revision=9;}],
    ['old schema cannot contain future owner',w=>{(w as unknown as {schemaVersion:number}).schemaVersion=230;}],
  ];
  test.each(forgeCases)(`${Decoder.name}: rejects %s atomically`,(name,forge)=>{
    const w=prepared(),encoder=new SnapshotEncoder(),decoder=new Decoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));
    expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('fixture rejected');
    const old=structuredClone(first.world),correct=structuredClone(encoder.encode(w,0,0,true)),bad=structuredClone(correct);
    forge(bad.world as World);expect(decoder.adopt(bad).status,name).toBe('resync');
    expect(first.world).toEqual(old);
    const repaired=decoder.adopt(correct);expect(repaired.status).toBe('applied');
    if(repaired.status!=='applied')throw Error('refusal advanced decoder revision');
    expect(repaired.world).toEqual(w);expect(first.world).toEqual(old);
  });
}

test('initial pending may skip both boundaries in one accepted snapshot',()=>{
  const w=prepared(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('applied');
  stepWorld(w,30);const accepted=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(accepted.status).toBe('applied');if(accepted.status!=='applied')throw Error('skipped opening rejected');
  expect(accepted.world).toEqual(w);expect(accepted.world.startingArrival).toMatchObject({phase:'opened',openedAt:27});
});

for(const checkpoint of [false,true]){
  test(`${checkpoint?'checkpoint':'delta'}: exact opening cannot erase every contained person and possession`,()=>{
    const w=prepared(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();w.relationships={links:[]};
    const first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
    expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('pending rejected');
    const before=structuredClone(first.world);stepWorld(w,27);
    const correct=structuredClone(encoder.encode(w,0,1,checkpoint)),bad=structuredClone(correct);
    bad.world.pawns=[];bad.world.stock.food=0;
    if(bad.kind==='checkpoint')bad.world.piles=structuredClone(before.piles);
    else delete bad.piles; // Well-formed delta retains exactly the old ground supplies.
    const rejected=decoder.adopt(bad);
    expect(rejected.status).toBe('resync');if(rejected.status!=='resync')throw Error('lost contents accepted');
    expect(rejected.reason).toBe('Contenu ou transfert des capsules initiales réécrit dans cette partie.');
    expect(first.world).toEqual(before);
    const accepted=decoder.adopt(correct);expect(accepted.status).toBe('applied');
    if(accepted.status!=='applied')throw Error('exact transfer rejected after refusal');
    expect(accepted.world).toEqual(w);expect(accepted.world.tick).toBe(27);
    expect(accepted.world.pawns).toHaveLength(3);expect(first.world).toEqual(before);
  });

  test(`${checkpoint?'checkpoint':'delta'}: exact opening preserves initial Pawn values and individual material identities`,()=>{
    const w=prepared(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
    pending(w).pods[0]!.pawn.health={...createMedicalRecord(0),ageAilments:['bad-back']};
    const initial=structuredClone(pending(w)),first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
    expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('pending rejected');
    const before=structuredClone(first.world);stepWorld(w,27);
    const correct=structuredClone(encoder.encode(w,0,1,checkpoint));
    const changedPawn=structuredClone(correct);changedPawn.world.pawns[0]!.name='Personne remplacée';
    expect(decoder.adopt(changedPawn).status).toBe('resync');expect(first.world).toEqual(before);
    const changedMaterial=structuredClone(correct),loose=initial.pods.flatMap(p=>p.items).find(p=>p.item==='component')!;
    const piles=changedMaterial.kind==='checkpoint'?changedMaterial.world.piles:changedMaterial.piles!.upserted;
    piles.find(p=>p.id===loose.id)!.quantity--;
    expect(decoder.adopt(changedMaterial).status).toBe('resync');expect(first.world).toEqual(before);
    const accepted=decoder.adopt(correct);expect(accepted.status).toBe('applied');
    if(accepted.status!=='applied')throw Error('exact transfer rejected');
    expect(accepted.world).toEqual(w);
    for(const pod of initial.pods){
      const expected={...pod.pawn,...pod.pawn.health?{health:{...pod.pawn.health,tick:27}}:{}};
      expect(accepted.world.pawns.find(p=>p.id===pod.pawn.id)).toEqual(expected);
      for(const item of pod.items){
        const expectedPile={...item,...item.owner.type==='starting-pod'?{owner:{type:'ground',...pod.drops.find(d=>d.pileId===item.id)!.cell}}:{}};
        expect(accepted.world.piles.find(p=>p.id===item.id)).toEqual(expectedPile);
      }
    }
  });
}

test('a refused custody mutation does not block the next authoritative checkpoint after resync',()=>{
  const w=prepared(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('fixture rejected');
  const old=structuredClone(first.world);stepWorld(w,15);
  const bad=structuredClone(encoder.encode(w,0,1));pending(bad.world as World).pods[0]!.pawn.name='Nom réécrit';
  expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(old);
  stepWorld(w,12);const checkpoint=structuredClone(encoder.encode(w,0,1,true)),repaired=decoder.adopt(checkpoint);
  expect(repaired.status).toBe('applied');if(repaired.status!=='applied')throw Error('checkpoint recovery rejected');
  expect(repaired.world).toEqual(w);expect(first.world).toEqual(old);
});

test('opened receipt cannot resurrect pending owners in the same epoch',()=>{
  const w=prepared(),original=structuredClone(pending(w)),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('applied');
  stepWorld(w,27);const opened=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(opened.status).toBe('applied');if(opened.status!=='applied')throw Error('opened rejected');
  const old=structuredClone(opened.world),correct=structuredClone(encoder.encode(w,0,1,true)),bad=structuredClone(correct);
  original.phase='landed';bad.world.startingArrival=original;
  expect(decoder.adopt(bad).status).toBe('resync');expect(opened.world).toEqual(old);
  expect(decoder.adopt(correct).status).toBe('applied');
});

test('malformed nested array and accessor fail without reading getter or mutating accepted state',()=>{
  const w=prepared(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('fixture rejected');
  const old=structuredClone(first.world),correct=structuredClone(encoder.encode(w,0,0,true));
  const extra=structuredClone(correct);Object.assign(pending(extra.world as World).pods,{extra:1});
  expect(decoder.adopt(extra).status).toBe('resync');
  let reads=0;const accessor=structuredClone(correct);
  Object.defineProperty(pending(accessor.world as World).pods[0]!.pawn,'health',{enumerable:true,get:()=>{reads++;return createMedicalRecord(0);}});
  expect(decoder.adopt(accessor).status).toBe('resync');expect(reads).toBe(0);expect(first.world).toEqual(old);
  expect(decoder.adopt(correct).status).toBe('applied');
});
