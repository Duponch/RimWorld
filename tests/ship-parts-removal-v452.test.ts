import {expect,test} from 'vitest';
import {shipReactorWorkshop275} from './scenarios/ship-reactor-v451.ts';
import {SHIP_ADDED_KINDS_276,SHIP_ADDED_CONTENT_276,type ShipAddedKind276} from '../src/sim/ship-part-content-276.ts';
import {designateDeconstruction} from '../src/sim/deconstruction-rules.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {validateDeconstruction} from '../src/sim/deconstruction-save.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import type {Structure} from '../src/sim/types.ts';

/** Declared already-built isolated removal inputs. The paid construction
 * scenario is separate; no natural acquisition or worked demolition claimed. */
function fixture(kind:ShipAddedKind276){
 const {w}=shipReactorWorkshop275();w.structures=[];w.piles=[];w.jobs=[];w.rng=0x12345678;
 const s:Structure={id:w.nextId++,kind,x:16,z:16,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
 w.structures.push(s);refreshStock(w);return {w,s};
}
const lossKeys={steel:'lostSteel',component:'lostComponents',plasteel:'lostPlasteel275',uranium:'lostUranium','advanced-component':'lostAdvancedComponents271'} as const;
const returned=(w:ReturnType<typeof fixture>['w'],item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);

for(const kind of SHIP_ADDED_KINDS_276)test(`${kind}: actual deconstruction uses the existing half-recipe rounding, finite returns and prospective loss terms`,()=>{
 const {w,s}=fixture(kind);designateDeconstruction(w,s);const job=w.jobs.find(j=>j.deconstruction?.structureId===s.id)!;
 const expected=kind==='ship-beam'?{steel:100,plasteel:20,component:1,'advanced-component':1}:{steel:130,plasteel:70,uranium:35,'advanced-component':3};
 const ledger=structuredClone(w.deconstructed);expect(finishDeconstruction(w,w.pawns[0]!,job)).toBe(true);
 expect(w.structures).toEqual([]);expect(w.jobs).toEqual([]);expect(w.rng).toBe(kind==='ship-beam'?0x155b24a3:0x12345678);
 for(const c of SHIP_ADDED_CONTENT_276[kind].ingredients){
  const units=expected[c.item as keyof typeof expected]!;expect(returned(w,c.item)).toBe(units);
  expect((w.deconstructed[lossKeys[c.item]]??0)-(ledger[lossKeys[c.item]]??0)).toBe(c.quantity-units);
 }
 expect(w.deconstructed.count).toBe(ledger.count+1);expect(w.deconstructed).not.toHaveProperty('lostPlasteel276');expect(w.packed).toEqual([]);
 expect(validateDeconstruction(w,276,true)).toEqual([]);expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
});

for(const kind of SHIP_ADDED_KINDS_276)test(`${kind}: fatal damage reuses quarter-recipe leavings and records exactly the unreturned original ingredients`,()=>{
 const {w,s}=fixture(kind),prior=structuredClone(w.destroyed),twin=structuredClone(w);
 const expected=kind==='ship-beam'?{steel:50,plasteel:10,component:1,'advanced-component':1}:{steel:65,plasteel:35,uranium:17,'advanced-component':2};
 expect(damageStructure(w,s,400,'bullet')).toBe(true);expect(damageStructure(twin,twin.structures[0]!,400,'bullet')).toBe(true);
 expect(w).toEqual(twin);expect(w.structures).toEqual([]);expect(w.rng).toBe(0x155b24a3);
 for(const c of SHIP_ADDED_CONTENT_276[kind].ingredients){
  const units=expected[c.item as keyof typeof expected]!;expect(returned(w,c.item)).toBe(units);
  expect((w.destroyed!.lost[c.item]??0)-(prior?.lost[c.item]??0)).toBe(c.quantity-units);
 }
 expect(w.destroyed!.count).toBe((prior?.count??0)+1);expect(w.packed).toEqual([]);expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
});

test('beam/engine refusal preflights every relevant loss overflow, ground capacity and identities before changing originals or PRNG',()=>{
 for(const kind of SHIP_ADDED_KINDS_276){
  const {w,s}=fixture(kind);designateDeconstruction(w,s);const jobId=w.jobs.find(j=>j.deconstruction?.structureId===s.id)!.id;
  for(const c of SHIP_ADDED_CONTENT_276[kind].ingredients){
   const copy=structuredClone(w);copy.deconstructed[lossKeys[c.item]]=Number.MAX_SAFE_INTEGER;const before=structuredClone(copy),original=copy.structures[0],piles=copy.piles;
   // Beam's advanced component can be entirely returned by this fixed stream;
   // the max counter then remains valid. Use the other deterministic branch.
   if(kind==='ship-beam'&&c.item==='advanced-component')copy.rng=0xdeadbeef;
   const sealed=structuredClone(copy);expect(finishDeconstruction(copy,copy.pawns[0]!,copy.jobs.find(j=>j.id===jobId)!)).toBe(false);
   expect(copy).toEqual(sealed);expect(copy.structures[0]).toBe(original);expect(copy.piles).toBe(piles);expect(before.deconstructed[lossKeys[c.item]]).toBe(Number.MAX_SAFE_INTEGER);
  }
  for(const failure of ['ground','ids'] as const){
   const copy=structuredClone(w);if(failure==='ground')copy.tiles=copy.tiles.map(()=>({terrain:'water'}));else copy.nextId=Number.MAX_SAFE_INTEGER;
   const before=structuredClone(copy),original=copy.structures[0];expect(finishDeconstruction(copy,copy.pawns[0]!,copy.jobs.find(j=>j.id===jobId)!)).toBe(false);expect(copy).toEqual(before);expect(copy.structures[0]).toBe(original);
  }
 }
});
