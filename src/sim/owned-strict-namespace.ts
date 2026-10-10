import {NumericMembership} from './numeric-membership.ts';
import type {World} from './types.ts';
import type {OwnedValidationResourceReader} from './owned-validation-resources.ts';

/** The real consumer contract, including the raid validator's ordered
 * iteration. This union does not pretend to provide the full Set surface. */
export interface ValidationNamespaceWriter extends Iterable<number> {
  has(id:number):boolean;
  add(id:number):unknown;
}

export type OwnedStrictNamespaceResult=
  | {ok:true;ids:ValidationNamespaceWriter}
  | {ok:false;reason:string};

const STRICT_REASON='Identité dupliquée ou invalide dans le registre relationnel.';
const CORPSE_REASON='Identité de carcasse mécanique dupliquée.';

/** ONLY strictIds and the stable ordinary closed MAIN candidate of ONE
 * adoption. Undefined requests the entire historical owners path. RAW and
 * nonstrict calls keep that literal path; this function grants no authority.
 * Facts prove resource IDs, not owner/claim/quantity or any later guard. */
export function captureOwnedStrictNamespace(world:World,resourceFacts:OwnedValidationResourceReader,mechanicalCorpseIds:ReadonlySet<number>):OwnedStrictNamespaceResult|undefined {
  const resources=resourceFacts.namespace(world);if(!resources)return;
  // Construct all nonresource owners before checking their IDs, retaining
  // the historical packed/bills evaluation and ordered occurrences. The
  // stable ordinary resource array was already captured, not spread again.
  const prefix=[...world.pawns,...world.structures,...world.jobs];
  const suffix=[
    ...world.piles,...world.stockpiles,...world.growingZones,
    ...(world.wildlife?.animals??[]),...(world.filth?.items??[]),...(world.fires?.items??[]),...(world.fires?.embers??[]),
    ...world.packed.map(p=>p.building),...world.structures.flatMap(s=>s.bills??[]),...world.packed.flatMap(p=>p.building.bills??[]),
  ];
  const extras=new NumericMembership();let resourcesActive=false,prefixSize=0;
  const ids:ValidationNamespaceWriter={
    has:id=>extras.has(id)||resourcesActive&&resources.has(id),
    add(id){if(!ids.has(id))extras.add(id);return ids;},
    *[Symbol.iterator](){
      const tail=extras.values();
      for(let i=0;i<prefixSize;i++)yield tail.next().value!;
      for(const resource of world.resources)yield resource.id;
      yield* tail;
    },
  };
  const readOwner=(owner:{id:number}):string|undefined=>{
    const id=owner.id;
    if(!Number.isSafeInteger(id)||id<1||id>=world.nextId||ids.has(id))return STRICT_REASON;
    if(mechanicalCorpseIds.has(id)&&ids.has(id))return CORPSE_REASON;
    ids.add(id);
    return;
  };
  for(const owner of prefix){const reason=readOwner(owner);if(reason)return {ok:false,reason};}
  // This is the exact Resource frontier. Never expose resource membership
  // to prefix guards: a prefix/resource collision belongs to this phase.
  if(!resources.safe||!resources.unique||resources.maxId!==undefined&&resources.maxId>=world.nextId)return {ok:false,reason:STRICT_REASON};
  for(const id of extras)if(resources.has(id))return {ok:false,reason:STRICT_REASON};
  prefixSize=extras.size;
  resourcesActive=true;
  for(const owner of suffix){const reason=readOwner(owner);if(reason)return {ok:false,reason};}
  return {ok:true,ids};
}
