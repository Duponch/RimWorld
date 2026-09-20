import type { ConstructionRecipe } from './construction-materials.ts';
import type { BlockMaterial } from './building-materials.ts';
import { isBlockMaterial } from './building-materials.ts';
import { ITEM_DEFINITIONS,type ItemId } from './items.ts';
import { addMaterial,refreshStock } from './materials.ts';
import { groundCapacity,groundPile,planGroundPlacement } from './ground-placement.ts';
import { footprintContains } from './definitions.ts';
import { researchUnlocked } from './research.ts';
import { removeFilth } from './filth.ts';
import type { Cell,CommandResult,DesignateCommand,Job,World } from './types.ts';

export const FLOOR_KINDS=['wood-planks','granite-tile','limestone-tile','marble-tile','sandstone-tile','slate-tile','steel-tile'] as const;
export type BuildableFloorKind=typeof FLOOR_KINDS[number];
export type FloorKind=BuildableFloorKind|'burned-wood';
export interface FloorDefinition {label:string;item:ItemId|null;quantity:number;coreWork:number;cleanliness:number;cleaningTime:number;flammability:number;pathCost:number;skill:number;research:'stonecutting'|'smithing'|null}
const stone=(label:string,item:BlockMaterial):FloorDefinition=>({label,item,quantity:4,coreWork:1100,cleanliness:0,cleaningTime:.8,flammability:0,pathCost:0,skill:3,research:'stonecutting'});
export const FLOOR_DEFINITIONS:Readonly<Record<FloorKind,FloorDefinition>>=Object.freeze({
  'wood-planks':{label:'Plancher bois',item:'wood',quantity:3,coreWork:85,cleanliness:0,cleaningTime:1,flammability:.22,pathCost:0,skill:0,research:null},
  'granite-tile':stone('Dalles de granite','granite-blocks'), 'limestone-tile':stone('Dalles de calcaire','limestone-blocks'),
  'marble-tile':stone('Dalles de marbre','marble-blocks'), 'sandstone-tile':stone('Dalles de grès','sandstone-blocks'), 'slate-tile':stone("Dalles d’ardoise",'slate-blocks'),
  'steel-tile':{label:'Dalles en acier',item:'steel',quantity:7,coreWork:800,cleanliness:.2,cleaningTime:.6,flammability:0,pathCost:0,skill:3,research:'smithing'},
  'burned-wood':{label:'Plancher brûlé',item:null,quantity:0,coreWork:0,cleanliness:0,cleaningTime:1,flammability:0,pathCost:1,skill:0,research:null},
});
export const isFloorKind=(v:unknown):v is FloorKind=>typeof v==='string'&&Object.hasOwn(FLOOR_DEFINITIONS,v);
export const isBuildableFloor=(v:unknown):v is BuildableFloorKind=>isFloorKind(v)&&v!=='burned-wood';
export function flooringRecipe(floor:FloorKind|undefined,remove=false):ConstructionRecipe {
  const d=floor&&FLOOR_DEFINITIONS[floor];return {ingredients:!remove&&d?.item?[{item:d.item,quantity:d.quantity}]:[],work:remove?200/10:(d?.coreWork??0)/10,coreWork:remove?200:d?.coreWork??0};
}
export const floorAt=(w:World,c:Cell):FloorKind|undefined=>w.tiles[c.z*w.width+c.x]?.floor;
/** Floors coexist with furniture and its plans. CoversFloor walls/coolers,
 * another floor order and existing plant-work reservations remain exclusive. */
export function canDesignateFloor(w:World,c:DesignateCommand):CommandResult {
  const refuse=(reason:string,code:CommandResult['code']='invalid-command'):CommandResult=>({ok:false,code,reason});
  if(w.schemaVersion<89||(c.kind!=='lay-floor'&&c.kind!=='remove-floor')||c.material!==undefined||c.orientation!==undefined&&c.orientation!==0||c.targetId!==undefined)return refuse('Ordre de sol invalide.');
  if(!Number.isInteger(c.x)||!Number.isInteger(c.z)||c.x<0||c.z<0||c.x>=w.width||c.z>=w.height)return refuse('Case hors de la carte.','out-of-bounds');
  const tile=w.tiles[c.z*w.width+c.x]!;
  if(c.kind==='lay-floor'){
    if(!isBuildableFloor(c.floor))return refuse('Choisissez un sol constructible.');
    const research=FLOOR_DEFINITIONS[c.floor].research;if(research&&!researchUnlocked(w,research))return refuse(research==='stonecutting'?'Recherchez Taille de pierre pour poser ces dalles.':'Recherchez Forge pour poser ces dalles.');
    if(tile.floor)return refuse('Retirez le revêtement existant avant de poser ce sol.','occupied');
  }else if(!tile.floor||c.floor!==undefined&&c.floor!==tile.floor)return refuse('Aucun revêtement correspondant à retirer.','missing-target');
  if(tile.terrain==='rock'||tile.terrain==='water')return refuse('Ce terrain ne peut pas recevoir ce sol.','incompatible-resource');
  const covers=(kind:unknown)=>kind==='wall'||kind==='cooler';
  if(w.structures.some(s=>covers(s.kind)&&footprintContains(s,c))||w.jobs.some(j=>footprintContains(j,c)&&(covers(j.furniture?.kind??j.kind)||j.kind==='lay-floor'||j.kind==='remove-floor'||j.kind==='sow'||j.kind==='cut'||j.kind==='chop'||j.kind==='harvest'||j.kind==='mine')))return refuse('Un ouvrage ou un travail incompatible occupe cette case.','occupied');
  if(c.kind==='lay-floor'&&[...w.structures,...w.jobs].some(s=>s.kind==='grave'&&footprintContains(s,c)))return refuse('Une tombe doit conserver son terrain creusable.','incompatible-resource');
  if(w.resources.some(r=>r.kind==='rock'&&r.x===c.x&&r.z===c.z))return refuse('Dégagez la roche avant de poser ce sol.','incompatible-resource');
  return {ok:true};
}
/** Called only after the ordinary construction clearance has finished. Does
 * not remove the job: the central finish transaction owns activity cleanup. */
export function finishFloor(w:World,job:Job):boolean {
  if(job.kind!=='lay-floor'||!isBuildableFloor(job.floor))return false;
  const tile=w.tiles[job.z*w.width+job.x];if(!tile||tile.floor||tile.terrain==='rock'||tile.terrain==='water'||w.resources.some(r=>r.x===job.x&&r.z===job.z))return false;
  const recipe=flooringRecipe(job.floor),piles=w.piles.filter(p=>p.owner.type==='job'&&p.owner.jobId===job.id);
  if(piles.some(p=>!recipe.ingredients.some(c=>c.item===p.item))||recipe.ingredients.some(c=>piles.filter(p=>p.item===c.item).reduce((n,p)=>n+p.quantity,0)!==c.quantity))return false;
  w.piles=w.piles.filter(p=>p.owner.type!=='job'||p.owner.jobId!==job.id);tile.floor=job.floor;job.escrow.wood=0;job.escrow.food=0;
  // Keep the growing-zone intention; zero fertility prevents sowing until the
  // floor is removed. Designation already excludes competing plant jobs.
  refreshStock(w);return true;
}
/** Preflight shared ground placement and ledger before changing terrain or RNG.
 * The small preview copies only mutable material owners/escrows, not the world. */
export function removeFloor(w:World,job:Job):boolean {
  const tile=w.tiles[job.z*w.width+job.x];if(job.kind!=='remove-floor'||!tile?.floor||tile.floor!==job.floor)return false;
  const d=FLOOR_DEFINITIONS[tile.floor];let rng=w.rng,quantity=Math.floor(d.quantity/2);
  if(d.quantity%2){rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;rng>>>=0;if(rng/4294967296<.5)quantity++;}
  const view={...w,jobs:w.jobs.map(j=>({...j,escrow:{...j.escrow}})),piles:w.piles.map(p=>({...p,owner:{...p.owner}}))};
  const drops=!quantity||!d.item?[]:groundCapacity(view,job,d.item)>=quantity?[{cell:{x:job.x,z:job.z},quantity}]:planGroundPlacement(view,quantity,job,d.item);
  if(!drops)return false;
  const created=drops.filter(drop=>!groundPile(view,drop.cell)).length,lost=d.quantity-quantity,ledger=w.deconstructed;
  const previous=d.item==='wood'?ledger.lostWood:d.item==='steel'?ledger.lostSteel??0:d.item&&isBlockMaterial(d.item)?ledger.lostBlocks?.[d.item]??0:0;
  if(view.piles.length+created>32768||!Number.isSafeInteger(w.nextId+created)||!Number.isSafeInteger(ledger.count+1)||!Number.isSafeInteger(previous+lost))return false;
  for(const drop of drops)if(d.item)addMaterial(w,ITEM_DEFINITIONS[d.item].kind,drop.quantity,{type:'ground',...drop.cell},d.item);
  w.rng=rng;delete tile.floor;ledger.count++;
  if(d.item==='wood')ledger.lostWood+=lost;else if(d.item==='steel')ledger.lostSteel=(ledger.lostSteel??0)+lost;
  else if(d.item&&isBlockMaterial(d.item)){ledger.lostBlocks??={};ledger.lostBlocks[d.item]=(ledger.lostBlocks[d.item]??0)+lost;}
  for(const f of [...w.filth?.items??[]])if(f.x===job.x&&f.z===job.z)removeFilth(w,f);
  refreshStock(w);return true;
}
/** A burned floor is a distinct nonflammable surface with no recipe refund.
 * Fire's resource ledger records the original three wooden units as lost. */
export function burnFloor(w:World,c:Cell):boolean {
  const tile=w.tiles[c.z*w.width+c.x];if(tile?.floor!=='wood-planks'||!w.fires||!Number.isSafeInteger((w.fires.ledger.items.wood??0)+3))return false;
  tile.floor='burned-wood';w.fires.ledger.items.wood=(w.fires.ledger.items.wood??0)+3;return true;
}
