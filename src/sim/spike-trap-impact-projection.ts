import { captureHumanOwners } from './human-owners.ts';
import type { World } from './types.ts';

type RecordObject=Record<string,unknown>;
type Patch={original:RecordObject;before:string;after:RecordObject};
const encoded=(value:unknown)=>JSON.stringify(value);
const replace=(target:RecordObject,source:RecordObject)=>{
  for(const key of Object.keys(target))if(!Object.hasOwn(source,key))delete target[key];
  Object.assign(target,source);
};

/** True-trigger projection only. Terrain, structures and resources are
 * borrowed read-only; actors, piles and reserved jobs can
 * change under the existing medical/release producers. Original identities
 * are retained at adoption, including carried patients and dropped Things. */
export function spikeTrapImpactProjection(world:World){
  const pairs:{original:RecordObject;draft:RecordObject;before:string}[]=[];
  const clone=<T extends object>(original:T):T=>{
    const draft=structuredClone(original);
    pairs.push({original:original as RecordObject,draft:draft as RecordObject,before:encoded(original)});
    return draft;
  };
  const view:World={...world,pawns:world.pawns.map(clone),piles:world.piles.map(clone),
    jobs:world.jobs.map(j=>j.reservedBy===null?j:clone(j)),packed:world.packed.map(p=>p.owner.type==='pawn'?clone(p):p),events:[...world.events]};
  if(world.wildlife)view.wildlife={...world.wildlife,animals:world.wildlife.animals.map(clone)};
  if(world.mechanoids)view.mechanoids=world.mechanoids.map(clone);
  // Death memories also belong to actual off-map living owners. Never create
  // a synthetic owner or overwrite a trip/container when adopting a memory.
  if(world.scout&&'pawn' in world.scout)view.scout={...world.scout,pawn:clone(world.scout.pawn)};
  if(world.commercialTrip&&'pawn' in world.commercialTrip)view.commercialTrip={...world.commercialTrip,pawn:clone(world.commercialTrip.pawn)};
  if(world.group&&'members' in world.group)view.group={...world.group,members:world.group.members.map(clone)};
  captureHumanOwners(view); // Owner/clock failures happen before any real write.
  if(world.economy)view.economy=structuredClone(world.economy);
  if(world.raids)view.raids={...world.raids,...world.raids.mechActive?{mechActive:structuredClone(world.raids.mechActive)}:{}};
  const roots=['pawns','piles','jobs','packed','wildlife','mechanoids','structures','resources','tiles','events','economy','raids','destroyed','scout','commercialTrip','group'] as const;
  const refs=roots.map(key=>[key,world[key]] as const);
  const nextId=world.nextId,schemaVersion=world.schemaVersion;
  const collections=[world.pawns,world.piles,world.jobs,world.packed,world.wildlife?.animals,world.mechanoids,
    world.group&&'members' in world.group?world.group.members:undefined];
  const identities=collections.map(a=>a?[...a]:undefined);
  // Capacity/claims may be read on every nearby cell during involuntary drops.
  // Keep snapshots of those dependencies without cloning the map geometry.
  const dependencies=[world.pawns,world.piles,world.jobs,world.packed,world.wildlife?.animals,world.mechanoids,
    world.economy,world.raids?.mechActive,world.destroyed];
  const before=dependencies.map(encoded);
  return {view,finish:()=>{
    const patches:Patch[]=pairs.filter(p=>encoded(p.draft)!==p.before).map(p=>({...p,after:p.draft}));
    const originalIds=new Set(world.piles.map(p=>p.id)),draftIds=new Set(view.piles.map(p=>p.id));
    const removedPiles=world.piles.filter(p=>!draftIds.has(p.id));
    // These producers may remove garments, but never create a Thing or job.
    if(view.piles.some(p=>!originalIds.has(p.id))||view.nextId!==world.nextId)throw new RangeError('Spike impact allocated a Thing');
    const eventsChanged=encoded(view.events)!==encoded(world.events);
    const economyChanged=encoded(view.economy)!==encoded(world.economy);
    const groupChanged=encoded(view.raids?.mechActive)!==encoded(world.raids?.mechActive);
    const destroyedChanged=encoded(view.destroyed)!==encoded(world.destroyed);
    let used=false;
    return {adopt:()=>{
      if(used||world.nextId!==nextId||world.schemaVersion!==schemaVersion||refs.some(([key,ref])=>world[key]!==ref)
        ||collections.some((a,i)=>a&&(a.length!==identities[i]!.length||a.some((item,n)=>item!==identities[i]![n])))
        ||dependencies.some((d,i)=>encoded(d)!==before[i])
        ||patches.some(p=>encoded(p.original)!==p.before))return false;
      used=true;
      for(const p of patches)replace(p.original,p.after);
      for(const p of removedPiles){const i=world.piles.indexOf(p);if(i>=0)world.piles.splice(i,1);}
      if(eventsChanged)world.events.splice(0,world.events.length,...view.events);
      if(economyChanged)world.economy=view.economy;
      if(groupChanged&&world.raids)world.raids.mechActive=view.raids?.mechActive;
      if(destroyedChanged)world.destroyed=view.destroyed;
      return true;
    }};
  }};
}
