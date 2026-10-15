import { captureHumanOwners } from './human-owners.ts';
import { campaignAuthority,otherCampaignMap,selectedMap } from './secondary-site-context.ts';
import { validExpeditionOrigin } from './secondary-site-save.ts';
import type { World } from './types.ts';
import type { RelationshipPerson } from './relationship-state.ts';

const projections=new WeakMap<World,{source:World;view:World}>();
/** Publish the selected genuine map, plus cross-map KNOWLEDGE only. Inactive
 * terrain/resources/jobs/piles never enter its snapshots or per-frame render.
 * Switching source creates a new stable projection, using the existing epoch
 * replacement path. Current campaign save remains the complete authority. */
export function campaignPresentation(world:World):World {
  const root=campaignAuthority(world);if(!root.secondarySite)return root;
  const source=selectedMap(root);let cached=projections.get(root);
  if(!cached||cached.source!==source){cached={source,view:{} as World};projections.set(root,cached);}
  const target=cached.view as unknown as Record<string,unknown>;
  const keys=new Set(Object.keys(source).filter(k=>!['secondarySite','campaignPeople','campaignMap'].includes(k)));
  for(const key of Object.keys(target))if(!keys.has(key))delete target[key];
  for(const key of keys)target[key]=(source as unknown as Record<string,unknown>)[key];
  const other=otherCampaignMap(source)!;
  cached.view.campaignPeople=[...captureHumanOwners(other,{},false).people.values()].map((person):RelationshipPerson=>({...person,status:person.status==='present'?'away':person.status}));
  cached.view.campaignMap={active:source===root?'home':'secondary',secondaryTile:root.secondarySite.tile,
    createdAt:root.secondarySite.createdAt,visitIds:[...root.secondarySite.visit?.memberIds??[]]};
  return cached.view;
}

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const exact=(v:Record<string,unknown>,keys:readonly string[])=>Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)).every(Boolean);

/** Snapshot-only domains are rejected by saved-world guards. References here
 * prove no physical ownership and are never inserted into byId/pawnOwners. */
export function validCampaignPresentation(w:Pick<World,'schemaVersion'|'tick'|'nextId'|'width'|'height'|'pawns'|'planet'|'expeditionSite'|'campaignPeople'|'campaignMap'> & {secondarySite?:unknown}):boolean {
  const raw=w as unknown as Record<string,unknown>;
  if(Object.hasOwn(raw,'secondarySite'))return false;
  if(w.schemaVersion<240)return !['expeditionSite','campaignPeople','campaignMap'].some(k=>Object.hasOwn(raw,k));
  if(!Object.hasOwn(raw,'campaignMap'))return !Object.hasOwn(raw,'campaignPeople')&&!Object.hasOwn(raw,'expeditionSite');
  if(!Array.isArray(w.pawns)||!Array.isArray(w.planet?.tiles))return false;
  const map:unknown=w.campaignMap,people:unknown=w.campaignPeople;
  if(!object(map)||!exact(map,['active','secondaryTile','createdAt','visitIds'])||typeof map.active!=='string'||!['home','secondary'].includes(map.active)
    ||!integer(map.secondaryTile,0,161)||!integer(map.createdAt,0,w.tick)||!dense(map.visitIds,8)||map.visitIds.some(id=>!integer(id,1,w.nextId-1))
    ||new Set(map.visitIds).size!==map.visitIds.length||!dense(people,w.width*w.height+65536)||!validExpeditionOrigin(w.expeditionSite,w,w.schemaVersion))return false;
  if(map.active==='secondary'?(!w.expeditionSite||w.expeditionSite.tile!==map.secondaryTile||w.expeditionSite.createdAt!==map.createdAt):Object.hasOwn(raw,'expeditionSite'))return false;
  const seen=new Set(w.pawns.map(p=>p.id));
  for(const person of people){
    if(!object(person)||!exact(person,person.deathAt===undefined?['id','name','status']:['id','name','status','deathAt'])
      ||!integer(person.id,1,w.nextId-1)||seen.has(person.id)||typeof person.name!=='string'||person.name.length<1||person.name.length>80
      ||typeof person.status!=='string'||!['away','departed','dead'].includes(person.status)||(person.status==='dead'?!integer(person.deathAt,0,w.tick):person.deathAt!==undefined))return false;
    seen.add(person.id);
  }
  return true;
}
