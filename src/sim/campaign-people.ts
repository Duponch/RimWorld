import { captureHumanOwners,type HumanOwnershipCapture } from './human-owners.ts';
import { campaignAuthority,otherCampaignMap } from './secondary-site-context.ts';
import type { Pawn,World } from './types.ts';
import type { RelationshipPerson } from './relationship-state.ts';

/** Cross-map KNOWLEDGE is separate from physical owner registration. It never
 * inserts a Pawn, cargo, job or local reservation into another map context. */
export function appendCampaignPeople(world:World,people:Map<number,RelationshipPerson>):void {
  const root=campaignAuthority(world),other=otherCampaignMap(world);
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

export function campaignPhysicalCaptures(world:World):readonly {world:World;owners:HumanOwnershipCapture}[] {
  const root=campaignAuthority(world),other=otherCampaignMap(root);
  return [root,...other?[other]:[]].map(local=>({world:local,owners:captureHumanOwners(local,{},false)}));
}

/** Global notifications use actual live owners. Clinical/local work guards
 * deliberately keep captureHumanOwners(context).pawnOwners instead. */
export function campaignLivingObservers(world:World):readonly {world:World;pawn:Pawn;kind:'map'|'away';groupId?:number}[] {
  return campaignPhysicalCaptures(world).flatMap(({world:local,owners})=>[
    ...owners.local.map(s=>({world:local,pawn:s.pawn!,kind:'map' as const})),
    ...owners.away.map(s=>({world:local,pawn:s.pawn!,kind:'away' as const,...s.groupId!==undefined?{groupId:s.groupId}:{}})),
  ]);
}
