import {mechRaidGroups261} from './mechanical-raid-groups-261.ts';
/** True-collapse-only sibling of spikeTrapImpactProjection. The local physical
 * domains and all actual death-memory recipients are isolated. Planet, map
 * cells and immutable geography are NEVER structured-cloned. No worker state,
 * framework, persistent witness or speculative event escapes a refused plan. */
import {CORE_STARTING_ARRIVAL_PROFILE_256} from './starting-pod-state-256.ts';
import {cancelWorldPawnGC256} from './world-pawn-gc-256.ts';
import {campaignAuthority,secondaryContext} from './secondary-site-context.ts';
import {brandCampaignContext,forwardCampaignFields,registeredMapId,registeredMap,registeredMapForValidation,captureLocalMap} from './world-map-context.ts';
import {invalidateAnimalPens} from './animal-pens.ts';
import {campaignLivingObservers} from './campaign-people.ts';
import {captureHumanOwners} from './human-owners.ts';
import type {World,Pawn} from './types.ts';

type Data=Record<string,unknown>;
type Pair={original:Data;draft:Data;before:string};
const encoded=(value:unknown)=>JSON.stringify(value);
const replace=(target:Data,source:Data)=>{for(const key of Object.keys(target))if(!Object.hasOwn(source,key))delete target[key];Object.assign(target,source);};
const mutableRecipient=(o:object)=>Object.isExtensible(o)&&Reflect.ownKeys(o).every(k=>{const d=Object.getOwnPropertyDescriptor(o,k)!;return Object.hasOwn(d,'value')&&d.writable===true&&d.configurable===true;});
const writableSlot=(o:object,key:PropertyKey)=>{const d=Object.getOwnPropertyDescriptor(o,key);return d?Object.hasOwn(d,'value')&&d.writable===true:Object.isExtensible(o)&&!(key in o);};
const deletableSlot=(o:object,key:PropertyKey)=>{const d=Object.getOwnPropertyDescriptor(o,key);return !d||d.configurable===true;};
const mutableState=['startingArrival','roofing','economy','destroyed','stock','spoiled','deconstructed','tailoring','hunting','bombWaves','firefoam290','growingCursor'] as const;
const localCollections=['pawns','resources','structures','jobs','piles','packed','stockpiles','growingZones','events'] as const;
export function roofCollapseProjection256(world:World){
 const root=campaignAuthority(world),mapId=registeredMapId(world),pairs:Pair[]=[],byOriginal=new Map<object,object>(),originalForDraft=new Map<object,object>();
 const own=<T extends object>(original:T):T=>{
  const previous=byOriginal.get(original);if(previous)return previous as T;
  const draft=structuredClone(original);byOriginal.set(original,draft);originalForDraft.set(draft,original);
  pairs.push({original:original as Data,draft:draft as Data,before:encoded(original)});return draft;
 };
 const pawn=(p:Pawn):Pawn=>own(p);
 const observerView=(local:World):World=>{
  const view={...local,pawns:local.pawns.map(pawn)};
  if(local.scout&&'pawn' in local.scout)view.scout={...local.scout,pawn:pawn(local.scout.pawn)};
  if(local.commercialTrip&&'pawn' in local.commercialTrip)view.commercialTrip={...local.commercialTrip,pawn:pawn(local.commercialTrip.pawn)};
  if(local.group&&'members' in local.group)view.group={...local.group,members:local.group.members.map(pawn)};
  if(local.wildlife)view.wildlife={...local.wildlife,animals:local.wildlife.animals.map(own),...local.wildlife.flyers?{flyers:local.wildlife.flyers.map(f=>{const next=own(f);next.animal=own(f.animal);return next;})}:{}};
  const a=local.startingArrival;if(a?.profile===CORE_STARTING_ARRIVAL_PROFILE_256&&a.phase!=='opened'){
   const next=own(a);next.pods=a.pods.map(p=>{const out=own(p);out.pawn=pawn(p.pawn);out.items=p.items.map(own);out.animals=p.animals.map(own);return out;});view.startingArrival=next;
  }
  return view;
 };
 let view=observerView(world);const privateRoot=root===world?view:observerView(root);
 // Local source arrays are copied, records retain their ORIGINAL identities at
 // adoption. Held building objects are registered separately from wrappers.
 view.resources=world.resources.map(own);view.structures=world.structures.map(own);view.jobs=world.jobs.map(own);view.piles=world.piles.map(own);
 view.packed=world.packed.map(pack=>{const draft=own(pack);const building=own(pack.building);draft.building=building;return draft;});
 view.stockpiles=world.stockpiles.map(own);view.growingZones=world.growingZones.map(own);view.events=[...world.events];
 // Copy the array only. Roof/mining writers replace individual cells; no
 // producer in this transaction is allowed to mutate a borrowed Tile object.
 view.tiles=world.tiles.slice();
 for(const key of mutableState){const value=world[key];if(value!==undefined&&key!=='startingArrival')(view as unknown as Data)[key]=structuredClone(value);}
 if(world.thermal)view.thermal={regions:world.thermal.regions.map(region=>({...region,cells:region.cells}))};
 // observerView already owns wildlife and held originals, including pet Master recipients.
 if(world.mechanoids)view.mechanoids=world.mechanoids.map(own);
 if(world.filth)view.filth={...world.filth,items:world.filth.items.map(own)};
 if(world.fires)view.fires={...structuredClone(world.fires),items:world.fires.items.map(own)};
 const mechPrimary=world.raids?.mechActive,mechExtras=world.raids?.extraMechActive261,mechOwners=mechRaidGroups261(world);
 const sameMechanicalOwners=()=>world.raids?.mechActive===mechPrimary&&world.raids?.extraMechActive261===mechExtras&&mechRaidGroups261(world).length===mechOwners.length&&mechRaidGroups261(world).every((g,i)=>g===mechOwners[i]);
 if(world.raids)view.raids={...world.raids,...mechPrimary?{mechActive:structuredClone(mechPrimary)}:{},...mechExtras!==undefined?{extraMechActive261:structuredClone(mechExtras)}:{}};
 // Registry metadata is read-only to collapse. Only the real Pawn recipients
 // of death memories are copied; terminal archives and post stocks stay literal.
 if(root.worldPawns){
  const next=own(root.worldPawns);next.owners=root.worldPawns.owners.map(row=>{const out=own(row);if(out.kind==='human'&&row.kind==='human')out.actor=pawn(row.actor);else if(out.kind==='animal'&&row.kind==='animal')out.actor=own(row.actor);else if(out.kind==='mechanical'&&row.kind==='mechanical')out.actor=own(row.actor);out.items=row.items.map(own);out.packed=row.packed.map(pack=>{const p=own(pack);p.building=own(pack.building);return p;});return out;});privateRoot.worldPawns=next;
 }
 if(root.worldGroups)privateRoot.worldGroups={...root.worldGroups,events:[...root.worldGroups.events],groups:root.worldGroups.groups.map(record=>({...record,state:'members' in record.state?{...record.state,members:record.state.members.map(pawn),...record.state.animalOwners?{animalOwners:{...record.state.animalOwners,members:record.state.animalOwners.members.map(own)}}:{}}:record.state})),legacyTravellers:root.worldGroups.legacyTravellers.map(old=>({...old,...old.scout&&'pawn' in old.scout?{scout:{...old.scout,pawn:pawn(old.scout.pawn)}}:{},...old.commercialTrip&&'pawn' in old.commercialTrip?{commercialTrip:{...old.commercialTrip,pawn:pawn(old.commercialTrip.pawn)}}:{}}))};
 if(root.worldMaps){
  privateRoot.worldMaps={...root.worldMaps,sites:root.worldMaps.sites.map(record=>{
   if(record.id===root.worldMaps!.rootMapId)return {...record};
   const actual=registeredMapForValidation(root,record.id);if(!actual)throw Error('Roof projection has no actual map owner');
   const local=record.id===mapId?view:observerView(actual);return {...record,map:captureLocalMap(local)};
  })};
  if(root!==world)forwardCampaignFields(view,privateRoot);
  brandCampaignContext(view,privateRoot,mapId);brandCampaignContext(privateRoot,privateRoot,root.worldMaps.rootMapId??undefined);
 } else if(root.secondarySite){
  const actual=root.secondarySite.map as unknown as World,local=root===world?observerView(actual):view;
  privateRoot.secondarySite={...root.secondarySite,map:captureLocalMap(local) as typeof root.secondarySite.map};
  if(root!==world)forwardCampaignFields(view,privateRoot);
  brandCampaignContext(view,privateRoot,mapId);
 }
 // Use the existing canonical context only inside the PRIVATE campaign, so
 // death witnesses and validation see this very same live draft before flush.
 // No cache is installed on the actual campaign by this transaction.
 if(privateRoot.worldMaps&&mapId!==undefined){const live=registeredMap(privateRoot,mapId);if(!live)throw Error('Roof projection active map disappeared');view=live;}
 else if(root!==world&&privateRoot.secondarySite){const live=secondaryContext(privateRoot);if(!live)throw Error('Roof projection legacy map disappeared');view=live;}
 captureHumanOwners(view); // Pure ownership/clock failure before any real write.
 const rootRng=root.rng,nextId=root.nextId,tick=root.tick,schema=world.schemaVersion;
 const reads=[...localCollections,'tiles','wildlife','mechanoids','filth','fires','raids',...mutableState] as const;
 const references=reads.map(key=>[key,world[key]] as const),tileRefs=[...world.tiles];
 const collections=[...localCollections.map(key=>world[key]),world.wildlife?.animals,world.mechanoids,world.filth?.items,world.fires?.items];
 const memberships=collections.map(a=>a?[...a]:undefined);
 const observers=campaignLivingObservers(world).map(slot=>slot.pawn);
 const sameObservers=()=>{const current=campaignLivingObservers(world).map(slot=>slot.pawn);return current.length===observers.length&&current.every((p,i)=>p===observers[i]);};
 // No giant terrain/planet JSON: guards retain exact source identities and
 // encoded MUTABLE domains only, so a delayed plan refuses changed owners.
 const guardDomains=[...world.pawns,...world.resources,...world.structures,...world.jobs,...world.piles,...world.packed,...world.stockpiles,...world.growingZones,world.wildlife,world.mechanoids,world.filth,world.fires,world.raids?.mechActive,world.raids?.extraMechActive261,...mutableState.map(key=>world[key])];
 const before=guardDomains.map(encoded),registry=root.worldMaps,groups=root.worldGroups,relationships=root.relationships,relationshipValues=encoded(root.relationships),thermal=world.thermal,heat=world.thermal?.regions.map(r=>({cells:r.cells,temperature:r.temperature}));
 let finished=false;
 return {view,finish:()=>{
  if(finished)throw Error('Roof projection already finished');finished=true;
  // Lazy growth may replace a Resource record with a new data object. Match
  // its already-owned ID inside THIS one physical collection, never a global
  // fallback lookup that could substitute another owner.
  for(const draft of view.resources)if(!originalForDraft.has(draft)){
   const original=world.resources.find(r=>r.id===draft.id);if(original){const pair=pairs.find(p=>p.original===(original as unknown as Data))!;pair.draft=draft as unknown as Data;originalForDraft.set(draft,original);}
  }
  const changed=pairs.filter(pair=>encoded(pair.draft)!==pair.before);
  if(changed.some(pair=>!mutableRecipient(pair.original)))throw Error('Roof retirement requires mutable actual original recipients');
  const translated=(value:unknown):unknown=>{
   if(!value||typeof value!=='object')return value;const original=originalForDraft.get(value);if(original)return original;
   if(Array.isArray(value))return value.map(translated);
   const out:Data={};for(const [key,v] of Object.entries(value))out[key]=translated(v);return out;
  };
  // Capture every commit value while the plan remains private. Original
  // top-level Pawn/Thing/Frame identities are patched rather than substituted.
  const patches=changed.map(pair=>({original:pair.original,before:pair.before,after:Object.fromEntries(Object.entries(pair.draft).map(([key,v])=>[key,translated(v)]))}));
  const arrays=Object.fromEntries(localCollections.map(key=>[key,(view[key] as object[]).map(value=>originalForDraft.get(value)??value)]));
  const tiles=view.tiles,states=Object.fromEntries(mutableState.map(key=>[key,key==='startingArrival'&&view.startingArrival===world.startingArrival?world.startingArrival:translated(view[key])])),wildlife=view.wildlife?translated(view.wildlife):undefined;
  const mechanoids=view.mechanoids?.map(a=>originalForDraft.get(a)??a),filth=view.filth?{...view.filth,items:view.filth.items.map(f=>originalForDraft.get(f)??f)}:undefined;
  const fires=view.fires?{...view.fires,items:view.fires.items.map(f=>originalForDraft.get(f)??f)}:undefined;
  const thermalAfter=view.thermal,rngAfter=privateRoot.rng,nextAfter=privateRoot.nextId,mechActive=view.raids?.mechActive,extraMechActive261=view.raids?.extraMechActive261;
  // A spread gives private slots fresh writable descriptors. Prove the REAL
  // recipients again at adoption, before cancelGC or the first original patch.
  const actualSlotsMutable=()=>localCollections.every(key=>writableSlot(world,key))&&writableSlot(world,'tiles')
   &&mutableState.every(key=>states[key]===undefined?deletableSlot(world,key):writableSlot(world,key))
   &&(thermalAfter?writableSlot(world,'thermal'):deletableSlot(world,'thermal'))
   &&(!wildlife||writableSlot(world,'wildlife'))&&(!mechanoids||writableSlot(world,'mechanoids'))
   &&(filth?writableSlot(world,'filth'):deletableSlot(world,'filth'))&&(fires?writableSlot(world,'fires'):deletableSlot(world,'fires'))
   &&(!world.raids||writableSlot(world.raids,'mechActive')&&(mechExtras===undefined||writableSlot(world.raids,'extraMechActive261')))&&writableSlot(root,'rng')&&writableSlot(root,'nextId')
   &&(!root.worldPawns||!privateRoot.worldPawns||encoded(root.worldPawns)===encoded(privateRoot.worldPawns)||writableSlot(root.worldPawns,'currentRate'));
  let used=false;
  return {adopt:()=>{
   if(used||root.rng!==rootRng||root.nextId!==nextId||root.tick!==tick||world.schemaVersion!==schema||root.worldMaps!==registry||root.worldGroups!==groups||root.relationships!==relationships||encoded(root.relationships)!==relationshipValues||!sameMechanicalOwners()||world.thermal!==thermal||heat?.some((r,i)=>!thermal||thermal.regions[i]?.cells!==r.cells||thermal.regions[i]?.temperature!==r.temperature)
     ||references.some(([key,ref])=>world[key]!==ref)||collections.some((a,i)=>a&&(a.length!==memberships[i]!.length||a.some((value,n)=>value!==memberships[i]![n])))||!sameObservers()||world.tiles.length!==tileRefs.length||world.tiles.some((tile,i)=>tile!==tileRefs[i])
     ||guardDomains.some((value,i)=>encoded(value)!==before[i])||patches.some(pair=>!mutableRecipient(pair.original)||encoded(pair.original)!==pair.before)||!actualSlotsMutable())return false;
   used=true;
   if(root.worldPawns&&privateRoot.worldPawns&&encoded(root.worldPawns)!==encoded(privateRoot.worldPawns))cancelWorldPawnGC256(root.worldPawns);
   for(const pair of patches)replace(pair.original,pair.after);
   Object.assign(world,arrays,{tiles});
   for(const key of mutableState){if(states[key]===undefined)delete (world as unknown as Data)[key];else (world as unknown as Data)[key]=states[key];}
   if(thermalAfter)world.thermal=thermalAfter;else delete world.thermal;
   if(wildlife)world.wildlife=wildlife as World['wildlife'];if(mechanoids)world.mechanoids=mechanoids as World['mechanoids'];
   if(filth)world.filth=filth as World['filth'];else delete world.filth;
   if(fires)world.fires=fires as World['fires'];else delete world.fires;
   if(world.raids)world.raids.mechActive=mechActive;
   if(world.raids&&mechExtras!==undefined)world.raids.extraMechActive261=extraMechActive261;
   root.rng=rngAfter;root.nextId=nextAfter;invalidateAnimalPens(world);return true;
  }};
 }};
}
