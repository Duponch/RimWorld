import {captureLostOwners} from './world-lost-owners.ts';
import {registeredMaps,registeredMapId,registeredMapForValidation,boundWorldGroup} from './world-map-context.ts';
import {globalOwnerContexts,campaignOwnerKey} from './world-map-owners.ts';
import { captureHumanOwners,type HumanOwnershipCapture } from './human-owners.ts';
import { campaignAuthority,otherCampaignMap,secondaryValidationContext } from './secondary-site-context.ts';
import type { Pawn,World } from './types.ts';
import type { RelationshipPerson } from './relationship-state.ts';

/** Cross-map KNOWLEDGE is separate from physical owner registration. It never
 * inserts a Pawn, cargo, job or local reservation into another map context. */
export function appendCampaignPeople(world:World,people:Map<number,RelationshipPerson>):void {
  const root=campaignAuthority(world);
  if(root.worldMaps){const ownGroup=boundWorldGroup(world),ownMap=registeredMapId(world),key=campaignOwnerKey(world);const others=[...root.worldMaps.sites.filter(m=>key!==`map:${m.id}`&&(!ownGroup||ownGroup.localMapId===null||m.id!==ownGroup.localMapId)).map(m=>registeredMapForValidation(root,m.id)!),...globalOwnerContexts(root,true).filter(v=>campaignOwnerKey(v)!==key&&(!ownGroup||campaignOwnerKey(v)!==`losses:${ownGroup.state.id}`))];for(const [id,p] of captureLostOwners(root).people){if(people.has(id))throw Error('Human identity owned twice');people.set(id,p);}for(const other of others)for(const [id,p] of captureHumanOwners(other,{},false).people){if(people.has(id))throw Error('Human identity owned by two campaign contexts');people.set(id,{...p,status:p.status==='present'?'away':p.status});}return;}
  // Knowledge is read-only: imported-world guards must not install a runtime
  // map view before prospective migrations replace optional local fields.
  const other=world===root?secondaryValidationContext(root):root;
  const known:Iterable<readonly [number,RelationshipPerson]>=other?
    captureHumanOwners(other,{},false).people:world.campaignPeople?.map(p=>[p.id,p] as const)??[];
  for(const [id,person] of known){
    if(people.has(id))throw new Error('Human identity owned by two campaign contexts.');
    people.set(id,{...person,status:person.status==='present'?'away':person.status});
  }
  // The authoritative owner of world travellers is the home context. Its
  // capture is already included as "other" when observing the secondary map.
  if(root!==world&&root.tick!==world.tick)throw new Error('Campaign contexts must share their confirmed clock.');
}

export function campaignPhysicalCaptures(world:World):readonly {world:World|undefined;owners:HumanOwnershipCapture}[] {
  const root=campaignAuthority(world),other=root.worldMaps?undefined:otherCampaignMap(root);
  const physical=(root.worldMaps?[...root.worldMaps.sites.map(m=>registeredMapForValidation(root,m.id)!),...globalOwnerContexts(root,true)]:[root,...other?[other]:[]]).map(local=>({world:local as World|undefined,owners:captureHumanOwners(local,{},false)}));return root.worldMaps?[...physical,{world:undefined,owners:captureLostOwners(root)}]:physical;
}

/** Global notifications use actual live owners. Clinical/local work guards
 * deliberately keep captureHumanOwners(context).pawnOwners instead. */
export function campaignLivingObservers(world:World):readonly {world:World;pawn:Pawn;kind:'map'|'away';groupId?:number}[] {
  return campaignPhysicalCaptures(world).flatMap(({world:local,owners})=>!local?[]:[
    ...owners.local.map(s=>({world:local,pawn:s.pawn!,kind:'map' as const})),
    ...owners.away.map(s=>({world:local,pawn:s.pawn!,kind:'away' as const,...s.groupId!==undefined?{groupId:s.groupId}:{}})),
  ]);
}
