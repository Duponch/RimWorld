import {heldDuckAnimal256} from './duck-owner-capture-256.ts';
import {captureActorBeds256} from './actor-bed-local-256.ts';
import {campaignPhysicalCaptures} from './campaign-people.ts';
import {registeredCampaign} from './world-map-context.ts';
import {isColonist} from './affiliation.ts';
import type {ExplorationApproacher256,ResolveExplorationApproacher256} from './exploration-door-256.ts';
import type {Pawn,World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {Mechanoid} from './mechanoid-state.ts';
type Actor=Pawn|WildAnimal|Mechanoid;
type Guest=Pick<Pawn,'prisoner'|'visitor'|'podRescue'>;
/** Current affiliation of the ORIGINAL actor. Released foreign prisoners
 * retain HostFaction until actual ExitMap; admitted guests also keep their
 * actual guest tracker. Abandoned DeSpawn wrappers retain that same authority. */
export function actualExplorationAffiliation256(actor:Actor,retainedGuest?:Guest):ExplorationApproacher256 {
 if('species'in actor)return {id:actor.id,playerOwned:!!actor.domestic,hostPlayer:false};
 // Current Core-only mechanical owners are hostile mechanoids, not controlled
 // Biotech pawns. A different mechanical producer must extend this admission.
 if('mechKind'in actor)return {id:actor.id,playerOwned:false,hostPlayer:false};
 const guest=retainedGuest??actor,prisoner=guest.prisoner;
 const admitted=actor.faction==='outlanders'&&!prisoner&&
   (guest.podRescue?.admittedAt!==undefined||guest.visitor?.medicalGuestAt!==undefined);
 return {id:actor.id,playerOwned:isColonist(actor),hostPlayer:!!prisoner||admitted};
}
/** Ephemeral original-owner capture only, shared by RAW and transport capture.
 * No knowledge row supplies affiliation; no World or persistent cache is built. */
export function captureActualExplorationApproachers256(world:World):ResolveExplorationApproacher256 {
 const root=registeredCampaign(world),physical=campaignPhysicalCaptures(world);
 const guestByActor=new Map<Pawn,Guest>();
 for(const a of root.worldGroups?.abandonedContents??[])for(const h of a.humans)
  if(h.pawn&&h.guest)guestByActor.set(h.pawn,h.guest);
 const rows=new Map<number,{original:object;value:ExplorationApproacher256}>();
 const add=(original:object,value:ExplorationApproacher256)=>{
  const previous=rows.get(value.id);
  if(previous&&previous.original!==original)throw Error('Exploration actor identity has two originals');
  rows.set(value.id,{original,value:Object.freeze(value)});
 };
 const worldRows=new Map((root.worldPawns?.owners??[]).map(row=>[row.actor,row]));
 for(const actor of captureActorBeds256(root).actors){const row=worldRows.get(actor);
  add(actor,row?{id:actor.id,playerOwned:row.factionId===root.worldFactions?.playerFactionId,hostPlayer:false}:actualExplorationAffiliation256(actor,guestByActor.get(actor as Pawn)));
 }
 for(const row of root.worldPawns?.owners??[])if(row.kind==='mechanical')add(row.actor,actualExplorationAffiliation256(row.actor));
 for(const c of physical){
  for(const m of c.world?.mechanoids??[])add(m,actualExplorationAffiliation256(m));
  // These are actual frozen identity owners, not campaign knowledge. Their
  // concrete producers admit only foreign raiders or already-exited released
  // prisoners; neither can retain player faction/host after that transition.
  for(const slot of c.owners.slots)if(!slot.pawn){
   if(slot.kind!=='raid-departure'&&slot.kind!=='prison-departure')continue;
   add(slot,{id:slot.id,playerOwned:false,hostPlayer:false});
  }
 }
 return id=>rows.get(id)?.value;
}
/** Fast local original first; global owners are queried only for a genuine
 * absent-local reference (dead/away/retained is allowed). No life/path filter. */
export function resolveActualExplorationApproacher256(world:World,id:number):ExplorationApproacher256|undefined {
 if(world.schemaVersion<256||!Number.isSafeInteger(id)||id<=0||id>=world.nextId)return;
 const actor=world.pawns.find(p=>p.id===id)??world.wildlife?.animals.find(a=>a.id===id)??heldDuckAnimal256(world,id)??world.mechanoids?.find(m=>m.id===id);
 if(actor)return actualExplorationAffiliation256(actor);
 return captureActualExplorationApproachers256(world)(id);
}
