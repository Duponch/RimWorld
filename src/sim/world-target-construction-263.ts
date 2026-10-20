import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {generateForeignBaseLoot263} from './world-site-goods-263.ts';
import {draftForeignRoster261} from './caravan-foreign-roster-261.ts';
import {generateForeignBase400263,FOREIGN_BASE_SEED_PART_263} from './foreign-base-layout-263.ts';
import {generateItemStashStorage400263,ITEM_STASH_STORAGE_SEED_PART_263} from './item-stash-storage-263.ts';
import {populateWorldTargetDefenders263} from './world-target-defence-263.ts';
import {prepareSettlementInhabitants263} from './settlement-inhabitants-263.ts';
import {constructSiteOutpost400263,type SiteOutpostBuilt263} from './world-site-outpost-263.ts';
import type {World} from './types.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {AncientRect256} from './local-ancient-placement-256.ts';

export type WorldTargetConstruction263=Readonly<{dimensions:Readonly<{width:number;height:number}>}&(
 {kind:'foreign-settlement';settlementId:number;factionId:number}|{kind:'quest-site';siteId:number;factionId:number|null})>;
export interface WorldTargetGenerated263 {
 readonly context:WorldTargetConstruction263;readonly storage:AncientRect256;
 readonly inhabitantIds:readonly number[];readonly recalled?:ReturnType<typeof prepareSettlementInhabitants263>;
 readonly outpost?:SiteOutpostBuilt263;
}
export const worldTargetSeedPart263=(context:WorldTargetConstruction263)=>context.kind==='foreign-settlement'?FOREIGN_BASE_SEED_PART_263:ITEM_STASH_STORAGE_SEED_PART_263;
/** Exact target binding and map dimensions, before any generation allocation.
 * The campaign supplies real shared registry references, never a fabricated
 * world object or a target hidden in the historical Camp context. */
export function worldTargetConstructionReason263(c:Pick<World,'worldFactions'|'worldSites263'>&{schemaVersion:number},target:WorldTargetConstruction263,tile:number,size:number):string|undefined {
 if(!isSchema263OrLater(Number(c.schemaVersion))||!target||target.dimensions.width!==size||target.dimensions.height!==size||![200,225,250,275,300,325].includes(size))return 'Actual263 target/campaign dimensions required';
 if(target.kind==='foreign-settlement')return c.worldFactions?.settlements.some(s=>s.id===target.settlementId&&s.tile===tile&&s.factionId===target.factionId&&s.factionId!==c.worldFactions!.playerFactionId&&(!s.attack263||s.attack263.mapId===null))?undefined:'Actual unspawned foreign settlement required';
 return c.worldSites263?.entries.some(s=>s.id===target.siteId&&s.kind==='item-stash'&&!s.closed&&s.tile===tile&&s.factionId===target.factionId&&s.mapId===null)?undefined:'Actual unspawned ItemStash holder required';
}
/** This is a composition phase of the existing complete local generator,
 * called after terrain/roads and before plants, animals and fog. Private
 * candidates are discarded in full on failure; no source owner is written. */
export function constructWorldTarget400263(w:World,target:WorldTargetConstruction263,usedRects:AncientRect256[],random:WorldGenerationRandom):WorldTargetGenerated263 {
 if(target.kind==='quest-site'){
  const site=w.worldSites263!.entries.find(s=>s.id===target.siteId)!;
  if(site.kind!=='item-stash')throw Error('Actual Site kind changed');
  const storage=generateItemStashStorage400263(w,target.factionId,usedRects,random);
  return {context:target,storage,inhabitantIds:[]};
 }
 const settlement=w.worldFactions!.settlements.find(s=>s.id===target.settlementId)!,old=settlement.attack263;
 if(old){
  const layout=generateForeignBase400263(w,target.settlementId,target.factionId,old.inhabitantIds.length,usedRects,random);
  const recalled=prepareSettlementInhabitants263(w.worldPawns!,old.inhabitantIds,target.factionId,w.tick,w.width,layout.spawnCells);
  if(recalled.people.length)populateWorldTargetDefenders263(w,{kind:'foreign-settlement',settlementId:target.settlementId},target.factionId,{people:recalled.people,items:recalled.items,nextId:w.nextId},layout.spawnCells,layout.defendSpot);
  w.packed.push(...recalled.packed);generateForeignBaseLoot263(w,target.settlementId,layout.storage,(random.integerValue()>>>0)||1);
  return {context:target,storage:layout.storage,inhabitantIds:recalled.ids,recalled};
 }
 // Native Settlement's default budget1150..1600; the already delivered
 // original foreign roster remains the declared PNJ content adaptation.
 const points=random.float(1150,1600),roster=draftForeignRoster261(w,'combat',target.factionId,points,(random.integerValue()>>>0)||1);
 if(!roster)throw Error('Actual current foreign inhabitants producer refused');w.nextId=roster.nextId;
 const layout=generateForeignBase400263(w,target.settlementId,target.factionId,roster.people.length,usedRects,random);
 populateWorldTargetDefenders263(w,{kind:'foreign-settlement',settlementId:target.settlementId},target.factionId,roster,layout.spawnCells,layout.defendSpot);
 generateForeignBaseLoot263(w,target.settlementId,layout.storage,(random.integerValue()>>>0)||1);
 return {context:target,storage:layout.storage,inhabitantIds:roster.people.map(p=>p.id)};
}
/** Separate actual Outpost seed/phase, after the shared real storage400. */
export function constructWorldSiteOutpost400263(w:World,generated:WorldTargetGenerated263,usedRects:AncientRect256[],random:WorldGenerationRandom):WorldTargetGenerated263 {
 const context=generated.context;if(context.kind!=='quest-site')return generated;
 const site=w.worldSites263?.entries.find(s=>s.id===context.siteId);
 if(site?.kind!=='item-stash'||site.threat.kind!=='outpost')return generated;
 return {...generated,outpost:constructSiteOutpost400263(w,site,generated.storage,usedRects,random)};
}
