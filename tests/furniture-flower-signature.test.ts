import {expect,test} from 'vitest';
import {StructurePresentationSignature as Reference} from './furniture-signature-reference-v233';
import {StructurePresentationSignature} from '../src/render/presentation-signatures';
import type {Structure} from '../src/sim/types';
import {camp,growth,pot} from './furniture-resident-fixtures';

test('flower receipt accumulates unique ordinals until an actual acknowledged build',()=>{
  const w=camp(),a=new Reference(),b=new StructurePresentationSignature();
  const read=(reset=false,doors='',packages='')=>{
    expect(b.read(w.structures,doors,packages,reset)).toBe(a.read(w.structures,doors,packages,reset));
  };
  read();expect(b.flowerChanges()).toBeUndefined();b.ackFurnitureBuild();
  growth(w,1,.25);read();expect(b.flowerChanges()).toEqual([1]);
  read();expect(b.flowerChanges()).toEqual([1]);
  growth(w,4,.5);read();expect(b.flowerChanges()).toEqual([1,4]);
  growth(w,1,.75);read();expect(b.flowerChanges()).toEqual([1,4]);
  b.ackFurnitureBuild();growth(w,8,.26,0);read();expect(b.flowerChanges()).toEqual([8]);
  b.ackFurnitureBuild();read(true);expect(b.flowerChanges()).toBeUndefined();
  b.ackFurnitureBuild();read(false,'different-door');expect(b.flowerChanges()).toBeUndefined();
  b.ackFurnitureBuild();read(false,'different-door','different-parcel');expect(b.flowerChanges()).toBeUndefined();
});

test('raw nonflower difference that collides in legacy text poisons a later flower plan',()=>{
  const w=camp(),a=new Reference(),b=new StructurePresentationSignature();w.structures[0]!.x=-0;
  const original=b.read(w.structures,'','');expect(original).toBe(a.read(w.structures,'',''));b.ackFurnitureBuild();
  w.structures[0]!.x=0;expect(b.read(w.structures,'','')).toBe(original);expect(a.read(w.structures,'','')).toBe(original);
  expect(b.flowerChanges()).toBeUndefined(); // Core skips build because the legacy text is equal; no ACK occurs.
  growth(w,1,.25);expect(b.read(w.structures,'','')).toBe(a.read(w.structures,'',''));
  expect(b.flowerChanges()).toBeUndefined();
  b.ackFurnitureBuild();growth(w,4,.5);b.read(w.structures,'','');expect(b.flowerChanges()).toEqual([4]);
});

test('presence, insertion, reorder, clear and unsupported raw arithmetic never certify a stable flower span',()=>{
  const w=camp(),b=new StructurePresentationSignature(),a=new Reference();
  const read=()=>expect(b.read(w.structures,'','')).toBe(a.read(w.structures,'',''));
  read();b.ackFurnitureBuild();w.structures[1]!.flower={allowSow:true};read();expect(b.flowerChanges()).toBeUndefined();
  b.ackFurnitureBuild();w.structures.push(pot(400));read();expect(b.flowerChanges()).toBeUndefined();
  b.ackFurnitureBuild();w.structures.reverse();read();expect(b.flowerChanges()).toBeUndefined();
  b.ackFurnitureBuild();b.clear();a.clear();read();expect(b.flowerChanges()).toBeUndefined();
  b.ackFurnitureBuild();const s=w.structures.find(s=>s.flower?.plant)!;
  s.flower={...s.flower!,plant:{...s.flower!.plant!,growth:{valueOf:()=>.5} as unknown as number}};
  read();expect(b.flowerChanges()).toBeUndefined();
  const sentinel=new Error('actual coercion throws');
  s.flower={...s.flower!,plant:{...s.flower!.plant!,growth:{valueOf:()=>{throw sentinel;}} as unknown as number}};
  const thrown=(signature:Reference|StructurePresentationSignature)=>{try{signature.read(w.structures,'','');return undefined;}catch(e){return e;}};
  expect(thrown(b)).toBe(sentinel);expect(thrown(a)).toBe(sentinel);expect(b.flowerChanges()).toBeUndefined();
  s.flower={...s.flower!,plant:{...s.flower!.plant!,growth:.75}};read();expect(b.flowerChanges()).toBeUndefined();
});

test('public signature preserves getter order and coercion/throw identity against the literal historical reader',()=>{
  const create=()=>{
    const trace:string[]=[],raw=pot(500),plant=raw.flower!.plant!;
    const proxyPlant=new Proxy(plant,{get(t,k,r){trace.push(`plant:${String(k)}`);return Reflect.get(t,k,r);}});
    const s=new Proxy({...raw,flower:{allowSow:true,plant:proxyPlant}},{get(t,k,r){trace.push(`structure:${String(k)}`);return Reflect.get(t,k,r);}}) as Structure;
    const structures=new Proxy([s],{get(t,k,r){trace.push(`array:${String(k)}`);return Reflect.get(t,k,r);}});
    return {trace,structures};
  };
  const left=create(),right=create(),a=new Reference(),b=new StructurePresentationSignature();
  for(const reset of [false,false,true]){
    left.trace.length=right.trace.length=0;expect(b.read(right.structures,'d','p',reset)).toBe(a.read(left.structures,'d','p',reset));
    expect(right.trace).toEqual(left.trace);
  }
});
