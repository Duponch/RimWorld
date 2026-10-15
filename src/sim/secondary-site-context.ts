import { CAMPAIGN_FIELDS, type SecondaryMap } from './secondary-site-state.ts';
import type { World } from './types.ts';

const shared=new Set<string>(CAMPAIGN_FIELDS);
const contexts=new WeakMap<World,{map:SecondaryMap;view:World}>();
const authorities=new WeakMap<World,World>();
export const campaignAuthority=(world:World):World=>authorities.get(world)??world;
export const isSecondaryContext=(world:World):boolean=>authorities.has(world);

/** Transfer references to a serializable LOCAL record. Shared accessors never
 * enter the record or its JSON. The discarded generator owns no live people. */
export function captureSecondaryMap(world:World):SecondaryMap {
  const data:Record<string,unknown>={};
  for(const key of Object.keys(world))if(!shared.has(key)&&!['secondarySite','campaignPeople','campaignMap'].includes(key))data[key]=(world as unknown as Record<string,unknown>)[key];
  return data as unknown as SecondaryMap;
}

/** Stable plain-object context, so existing WeakMap caches remain map-local
 * and worker structured cloning can read the same normal World contract.
 * Arrays are original local references. Global fields forward on every read
 * and write; no second RNG, nextId, tick, research or policy registry exists. */
export function secondaryContext(world:World):World|undefined {
  const root=campaignAuthority(world),site=root.secondarySite;
  if(!site)return undefined;
  let cached=contexts.get(root);
  if(!cached||cached.map!==site.map){
    const view={...site.map} as World;
    for(const key of CAMPAIGN_FIELDS)Object.defineProperty(view,key,{enumerable:true,configurable:false,
      get:()=>root[key],set:value=>{(root as unknown as Record<string,unknown>)[key]=value;}});
    authorities.set(view,root);cached={map:site.map,view};contexts.set(root,cached);
  }
  return cached.view;
}

/** Existing systems can replace arrays or add/delete optional local fields.
 * Flush at the end of a synchronous command/tick, never after an await. */
export function flushSecondaryContext(world:World):void {
  const root=campaignAuthority(world),cached=contexts.get(root);
  if(!cached||cached.map!==root.secondarySite?.map)return;
  const data=captureSecondaryMap(cached.view) as unknown as Record<string,unknown>;
  const target=cached.map as unknown as Record<string,unknown>;
  for(const key of Object.keys(target))if(!Object.hasOwn(data,key))delete target[key];
  Object.assign(target,data);
}
export function selectedMap(world:World):World {
  const root=campaignAuthority(world);
  return root.secondarySite?.selected?secondaryContext(root)!:root;
}

/** The context has no secondarySite field, preventing recursive save/capture.
 * This helper supplies the OTHER actual map, not a projected pawn union. */
export function otherCampaignMap(world:World):World|undefined {
  const root=campaignAuthority(world);
  return world===root?secondaryContext(root):root;
}

/** Descriptor-safe, read-only validation boundary. Existing guards require
 * plain data rather than runtime forwarding accessors. Physical records and
 * shared values stay original references; branding preserves their map owner
 * and global person knowledge. This view is never stepped or persisted. */
export function secondaryValidationContext(world:World):World|undefined {
  const root=campaignAuthority(world),local=secondaryContext(root);
  if(!local)return undefined;
  const view={...local};authorities.set(view,root);return view;
}
