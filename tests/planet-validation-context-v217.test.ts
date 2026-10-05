import {expect,test} from 'vitest';
import {applyCommand,createWorld,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {validatePlanet} from '../src/sim/planet-save.ts';
import {validatePlanetContext,validatedPlanetFor,sameValidatedPlanetGeography,type PlanetValidationContext} from '../src/sim/planet-validation-context.ts';
import {validateGroupState,validateGroupStateWithPlanet} from '../src/sim/group-save.ts';
import {commercialCamp} from './helpers/commercial-v193.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import type {PlanetTile} from '../src/sim/planet-state.ts';

function adopted(seed=42):World{
  const w=createWorld(seed,16,16),rng=w.rng,nextId=w.nextId;
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);return w;
}
function context(w:World,previous?:PlanetValidationContext):PlanetValidationContext{
  const result=validatePlanetContext(w,SCHEMA_VERSION,previous);
  expect(result.ok).toBe(true);if(!result.ok)throw Error(result.errors.join(', '));return result.context;
}
function differential(w:World,previous:PlanetValidationContext):void{
  const errors=validatePlanet(w.planet,w,SCHEMA_VERSION),cold=validatePlanetContext(w,SCHEMA_VERSION),warm=validatePlanetContext(w,SCHEMA_VERSION,previous);
  expect(cold.ok).toBe(errors.length===0);expect(warm.ok).toBe(cold.ok);
  if(!cold.ok&&!warm.ok){expect(cold.errors).toEqual(errors);expect(warm.errors).toEqual(errors);}
  else if(cold.ok&&warm.ok){expect(sameValidatedPlanetGeography(cold.context,warm.context)).toBe(true);expect(validatedPlanetFor(warm.context,w,SCHEMA_VERSION)).toBe(w.planet);}
}

test('owned primitives accept equal originals while forged capabilities confer no planet authority',()=>{
  const w=adopted(),before=structuredClone(w),proof=context(w),equal=structuredClone(w),equalProof=context(equal,proof);
  expect(validatedPlanetFor(proof,w,SCHEMA_VERSION)).toBe(w.planet);
  expect(validatedPlanetFor(proof,equal,SCHEMA_VERSION)).toBe(equal.planet);
  expect(equal.planet).not.toBe(w.planet);expect(equal.planet!.tiles[0]!.center).not.toBe(w.planet!.tiles[0]!.center);
  expect(sameValidatedPlanetGeography(proof,equalProof)).toBe(true);
  for(const fake of [undefined,null,true,{},Object.freeze({}),{...proof}]){
    expect(validatedPlanetFor(fake,w,SCHEMA_VERSION)).toBeUndefined();
    expect(sameValidatedPlanetGeography(fake,proof)).toBe(false);
  }
  // A bogus optional hint must fall back to full validation, rather than trust it.
  const fake={} as PlanetValidationContext;
  expect(validatePlanetContext(w,SCHEMA_VERSION,fake).ok).toBe(true);
  const bad=structuredClone(w);bad.planet!.tiles[0]!.center=[0,0,0];
  expect(validatePlanetContext(bad,SCHEMA_VERSION,fake).ok).toBe(false);
  expect(w).toEqual(before);
});

test.each(['inherited slice','inherited map'] as const)('legal raw arrays cannot lend mutable storage to a cold proof (%s)',variant=>{
  class BorrowedNeighbours extends Array<number>{override slice():number[]{return this;}}
  class BorrowedTiles extends Array<PlanetTile>{}
  Object.defineProperty(BorrowedTiles.prototype,'map',{value:function(this:unknown){return this;}});
  const original=adopted(),equal=structuredClone(original),frozen=structuredClone(equal);
  if(variant==='inherited slice')Object.setPrototypeOf(original.planet!.tiles[0]!.neighbours,BorrowedNeighbours.prototype);
  else Object.setPrototypeOf(original.planet!.tiles,BorrowedTiles.prototype);
  // V216 admits the prototype while requiring the exact dense own fields.
  // No new prototype prohibition or raw normalization is part of this fix.
  expect(validatePlanet(original.planet,original,SCHEMA_VERSION)).toEqual([]);
  const proof=context(original);
  expect(validatedPlanetFor(proof,original,SCHEMA_VERSION)).toBe(original.planet);
  expect(validatedPlanetFor(proof,equal,SCHEMA_VERSION)).toBe(equal.planet);
  original.planet!.tiles[0]!.neighbours[0]=0;
  const errors=validatePlanet(original.planet,original,SCHEMA_VERSION);
  expect(errors.length).toBeGreaterThan(0);
  expect(validatedPlanetFor(proof,original,SCHEMA_VERSION)).toBeUndefined();
  expect(validatePlanetContext(original,SCHEMA_VERSION,proof)).toEqual({ok:false,errors});
  // The failure neither poisons nor replaces the earlier primitive witness.
  expect(validatedPlanetFor(proof,equal,SCHEMA_VERSION)).toBe(equal.planet);
  expect(sameValidatedPlanetGeography(proof,context(equal,proof))).toBe(true);
  expect(equal).toEqual(frozen);
});

test('every immutable field and ordered array is compared after same-tick in-place mutation',()=>{
  const original=adopted(),frozen=structuredClone(original),proof=context(original),tick=original.tick;
  const mutations:((w:World)=>void)[]=[
    w=>{(w.planet as unknown as Record<string,unknown>).revision=2;},
    w=>{w.planet!.adoptedAt=w.tick+1;},w=>{w.planet!.generationSeed^=1;},
    w=>{[w.planet!.homeTile,w.planet!.civilianTile]=[w.planet!.civilianTile,w.planet!.homeTile];},
    w=>{w.planet!.tiles[0]!.id++;},w=>{w.planet!.tiles[0]!.center[0]+=.01;},
    w=>{w.planet!.tiles[0]!.neighbours.reverse();},
    w=>{const t=w.planet!.tiles[0]!;t.biome=t.biome==='temperate-forest'?'boreal-forest':'temperate-forest';},
    w=>{const t=w.planet!.tiles[0]!;t.hilliness=t.hilliness==='flat'?'small-hills':'flat';},
    w=>{w.planet!.tiles[0]!.meanTemperature+=.5;},w=>{w.planet!.tiles[0]!.rainfall++;},
  ];
  for(const mutate of mutations){
    const w=structuredClone(original);mutate(w);expect(w.tick).toBe(tick);
    expect(validatedPlanetFor(proof,w,SCHEMA_VERSION)).toBeUndefined();differential(w,proof);
    const changed=validatePlanetContext(w,SCHEMA_VERSION,proof);
    if(changed.ok)expect(sameValidatedPlanetGeography(proof,changed.context)).toBe(false);
    expect(validatedPlanetFor(proof,original,SCHEMA_VERSION)).toBe(original.planet);
  }
  // The witness also survives mutation of the very original from which it was copied.
  original.planet!.tiles[0]!.rainfall++;
  expect(validatedPlanetFor(proof,original,SCHEMA_VERSION)).toBeUndefined();
  expect(validatedPlanetFor(proof,frozen,SCHEMA_VERSION)).toBe(frozen.planet);
});

test('cold and reused proofs preserve V216 strict own-key and dense-array rejection, including raw JS keys',()=>{
  const original=adopted(),proof=context(original);
  const corruptions:((w:World)=>void)[]=[
    w=>{delete (w.planet!.tiles as unknown[])[7];},
    w=>{delete (w.planet!.tiles[0]!.center as unknown[])[1];},
    w=>{delete (w.planet!.tiles[0]!.neighbours as unknown[])[1];},
    w=>{w.planet!.tiles[0]!.neighbours.push(1,2);},
    w=>{Object.defineProperty(w.planet!,'newField',{value:undefined,enumerable:true});},
    w=>{Object.defineProperty(w.planet!,'hidden',{value:undefined,enumerable:false});},
    w=>{Object.defineProperty(w.planet!,Symbol('planet-extra'),{value:1});},
    w=>{Object.defineProperty(w.planet!.tiles[0]!,'hidden',{value:1});},
    w=>{Object.defineProperty(w.planet!.tiles,Symbol('tiles-extra'),{value:1});},
    w=>{Object.defineProperty(w.planet!.tiles[0]!.center,'hidden',{value:1});},
    w=>{Object.defineProperty(w.planet!.tiles[0]!.neighbours,Symbol('neighbours-extra'),{value:1});},
  ];
  for(const corrupt of corruptions){
    const w=structuredClone(original);corrupt(w);
    expect(validatePlanet(w.planet,w,SCHEMA_VERSION).length).toBeGreaterThan(0);
    differential(w,proof);expect(validatedPlanetFor(proof,w,SCHEMA_VERSION)).toBeUndefined();
  }
  expect(validatedPlanetFor(proof,original,SCHEMA_VERSION)).toBe(original.planet);
});

test('current clock, seed and counter bounds stay live while contexts bind each operation metadata',()=>{
  const original=adopted(),proof=context(original);
  for(const [field,values] of [
    ['generationSeed',[-1,0x100000000,NaN]],['nextGroupId',[0,1.5,Number.MAX_SAFE_INTEGER+1]],
    ['adoptedAt',[-1,original.tick+1,NaN]],
  ] as const)for(const value of values){
    const w=structuredClone(original);(w.planet as unknown as Record<string,unknown>)[field]=value;
    differential(w,proof);expect(validatedPlanetFor(proof,w,SCHEMA_VERSION)).toBeUndefined();
  }
  for(const tick of [-1,NaN,Number.MAX_SAFE_INTEGER+1]){
    const w=structuredClone(original);w.tick=tick;differential(w,proof);
  }
  const newer=structuredClone(original);newer.planet!.nextGroupId++;
  expect(validatedPlanetFor(proof,newer,SCHEMA_VERSION)).toBeUndefined();
  const newProof=context(newer,proof);expect(sameValidatedPlanetGeography(proof,newProof)).toBe(true);
  expect(validatedPlanetFor(newProof,newer,SCHEMA_VERSION)).toBe(newer.planet);
  stepWorld(newer);expect(validatedPlanetFor(newProof,newer,SCHEMA_VERSION)).toBeUndefined();
  expect(sameValidatedPlanetGeography(newProof,context(newer,newProof))).toBe(true);
  expect(validatedPlanetFor(proof,original,195)).toBeUndefined();
});

test('cold replacement and absence produce independent proofs without replay, future fields or a damaged prior witness',()=>{
  const original=adopted(),proof=context(original),replacement=adopted(93),frozen=structuredClone(original);
  const newProof=context(replacement);expect(sameValidatedPlanetGeography(proof,newProof)).toBe(false);
  const bad=structuredClone(replacement),t=bad.planet!.tiles[0]!,n=bad.planet!.tiles[t.neighbours[0]!]!;
  n.center=t.center.map(v=>-v) as [number,number,number];
  expect(validatePlanetContext(bad,SCHEMA_VERSION).ok).toBe(false);
  expect(validatedPlanetFor(proof,original,SCHEMA_VERSION)).toBe(original.planet);expect(original).toEqual(frozen);
  const empty=createWorld(42,16,16),before=structuredClone(empty),absent=context(empty);
  expect(validatePlanetContext(empty,SCHEMA_VERSION).ok).toBe(true);
  expect(validatedPlanetFor(absent,empty,SCHEMA_VERSION)).toBeUndefined();
  expect(sameValidatedPlanetGeography(absent,proof)).toBe(false);expect(empty).toEqual(before);
  expect(validatePlanetContext(empty,195).ok).toBe(true);
  for(const key of ['planet','group','groupLosses']){
    const historical=structuredClone(empty);Object.defineProperty(historical,key,{value:undefined,enumerable:true});
    expect(validatePlanetContext(historical,195).ok).toBe(false);
  }
});

test('real group formation and physical departure retain all owner and conservation guards with an opaque planet context',()=>{
  const {world:w,foodId}=commercialCamp(16);
  for(const p of w.pawns){p.hunger=95;p.rest=95;p.state='idle';p.path=[];p.moveCooldown=0;delete p.motion;}
  expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  const originals=w.pawns.slice(0,2),stale=context(w);
  expect(applyCommand(w,{type:'group-start',memberIds:originals.map(p=>p.id),destination:w.planet!.civilianTile,sources:[{pileId:foodId,quantity:4}]}).ok).toBe(true);
  expect(validateGroupStateWithPlanet(w,SCHEMA_VERSION,stale)).toEqual(['Invalid group planet authority.']);
  for(const fake of [{},{...stale},null]){
    expect(validateGroupStateWithPlanet(w,SCHEMA_VERSION,fake as unknown as PlanetValidationContext)).toEqual(['Invalid group planet authority.']);
  }
  let proof=context(w,stale),phase=w.group!.phase;
  expect(validateGroupStateWithPlanet(w,SCHEMA_VERSION,proof)).toEqual(validateGroupState(w,SCHEMA_VERSION));
  expect(validateGroupState(w,SCHEMA_VERSION)).toEqual([]);
  for(let i=0;i<600&&!(w.group&&'members' in w.group);i++){
    stepWorld(w);
    if(!w.group)throw Error('Actual group formation was cancelled');
    if(w.group?.phase!==phase){
      phase=w.group!.phase;proof=context(w,proof);
      expect(validateGroupStateWithPlanet(w,SCHEMA_VERSION,proof)).toEqual([]);
      expect(validateGroupState(w,SCHEMA_VERSION)).toEqual([]);
    }
  }
  const group=w.group;expect(group&&'members' in group).toBe(true);
  if(!group||!('members' in group))throw Error('Actual group departure did not finish');
  expect(group.members.every((p,i)=>p===originals[i])).toBe(true);
  expect(w.pawns.some(p=>originals.includes(p))).toBe(false);
  proof=context(w,proof);expect(validateGroupStateWithPlanet(w,SCHEMA_VERSION,proof)).toEqual([]);
  const frozen=serializeWorld(w),resumed=deserializeWorld(frozen),copyProof=context(resumed,proof);
  expect(validatedPlanetFor(proof,resumed,SCHEMA_VERSION)).toBe(resumed.planet);
  expect(validateGroupStateWithPlanet(resumed,SCHEMA_VERSION,copyProof)).toEqual([]);
  const index=group.items.findIndex(p=>p.item==='survival-meal');expect(index).toBeGreaterThanOrEqual(0);
  for(const corrupt of [
    (v:World)=>{if(v.group&&'items' in v.group)v.group.items[index]!.owner={type:'inventory',pawnId:v.pawns[0]!.id};},
    (v:World)=>{if(v.group&&'items' in v.group)v.group.items[index]!.quantity++;},
    (v:World)=>{if(v.group&&'members' in v.group)v.group.lastPersonalTick--;},
  ]){
    const bad=structuredClone(w);corrupt(bad);
    const expected=validateGroupState(bad,SCHEMA_VERSION);
    expect(expected.length).toBeGreaterThan(0);expect(validateGroupStateWithPlanet(bad,SCHEMA_VERSION,proof)).toEqual(expected);
  }
  expect(serializeWorld(w)).toBe(frozen);
  stepWorld(w);stepWorld(resumed);
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
  expect(validateGroupStateWithPlanet(w,SCHEMA_VERSION,proof)).toEqual(['Invalid group planet authority.']);
  const current=context(w,proof);expect(validateGroupStateWithPlanet(w,SCHEMA_VERSION,current)).toEqual([]);
},15000);
