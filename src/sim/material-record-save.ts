import { validMechCorpseShape } from './mechanoid-corpse-save.ts';
import { validFlakWorkShape } from './flak-work.ts';
import { validArtWorkShape } from './art-work.ts';
import { V91_ITEM_IDS, V190_ITEM_IDS } from './biome-items.ts';
import { V120_ANIMAL_PRODUCT_ITEMS } from './animal-product-items.ts';
import { validHumanCorpseShape } from './burial-save.ts';
import { validFoodContamination } from './food-poisoning-save.ts';
import { validCorpseShape } from './corpse-save.ts';
import { validGunWorkShape } from './gun-work.ts';
import { validComponentWorkShape } from './component-work.ts';
import { validUnfinishedShape } from './unfinished.ts';
import { validApparelShape } from './apparel-save.ts';
import { validWeaponShape } from './equipment-save.ts';
import { MAX_STACK } from './definitions.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const oneOf=(v:unknown,values:string[]):boolean=>typeof v==='string'&&values.includes(v);

export function validatePileRecordShape(item:Record<string,unknown>,world:World,version:number,validationTick=world.tick):string[]{
 const input={width:world.width,height:world.height,tick:validationTick};
 const coord=(v:Record<string,unknown>)=>integer(v.x,0,world.width-1)&&integer(v.z,0,world.height-1);
 const errors:string[]=[];
if(!validMechCorpseShape(item,version,input.tick as number))errors.push('Invalid or future mechanoid carcass.');
if(!validFoodContamination(item.foodPoison,item.item as keyof typeof ITEM_DEFINITIONS,version>=89))errors.push('Invalid food contamination.');
if(item.item==='human-corpse'?!validHumanCorpseShape(item.humanCorpse,version,input.tick as number):item.humanCorpse!==undefined)errors.push('Invalid human corpse metadata.');
if(item.item!=='human-corpse'&&!validCorpseShape(item,version))errors.push('Invalid corpse metadata for schema.');
if(!validArtWorkShape(item,version))errors.push('Invalid or future art work.');
if(version<109&&(item.item==='unfinished-flak-vest'||item.flakWork!==undefined))errors.push('Future flak work in older save.');
if(version<141&&(item.item==='flak-helmet'||item.item==='unfinished-flak-helmet'))errors.push('Future flak helmet in older save.');
if(version<148&&(item.item==='recon-helmet'||item.item==='unfinished-recon-helmet'))errors.push('Future recon helmet in older save.');
if(version<152&&item.item==='fine-meal')errors.push('Future fine meal in older save.');
if(version<154&&item.item==='lavish-meal')errors.push('Future lavish meal in older save.');
if(version<155&&item.item==='vegetarian-fine-meal')errors.push('Future vegetarian fine meal in older save.');
if(version<156&&item.item==='carnivore-fine-meal')errors.push('Future carnivore fine meal in older save.');
if(version<157&&item.item==='vegetarian-lavish-meal')errors.push('Future vegetarian lavish meal in older save.');
if(version<159&&item.item==='carnivore-lavish-meal')errors.push('Future carnivore lavish meal in older save.');
if(version<101&&(item.item==='unfinished-gun'||item.gunWork!==undefined))errors.push('Future machining work in older save.');
if(version<178&&(V190_ITEM_IDS.includes(String(item.item))))errors.push('Future predator product in older save.');
if(version<91&&V91_ITEM_IDS.includes(String(item.item)))errors.push('Future biome product in older save.');
if(version<120&&V120_ANIMAL_PRODUCT_ITEMS.includes(String(item.item)))errors.push('Future livestock product in older save.');
if(version<123&&['gold','plasteel','advanced-component','unfinished-component'].includes(String(item.item)))errors.push('Future industrial product in older save.');
if(version<79&&['hare-corpse','hare-meat','light-leather'].includes(String(item.item)))errors.push('Future animal product in older save.');
if(!validUnfinishedShape(item,version)||!validGunWorkShape(item,version)||!validFlakWorkShape(item,version)||!validComponentWorkShape(item,version))errors.push('Invalid unfinished item.');
if(!validApparelShape(item,version))errors.push('Invalid apparel state for schema.');
if(!validWeaponShape(item,version))errors.push('Invalid weapon state for schema.');
if (!oneOf(item.kind, ['wood', 'food', ...(version>=28?['chunk']:[]), ...(version>=29?['steel']:[]),...(version>=123?['gold','plasteel','advanced-component']:[]), ...(version>=32?['blocks']:[]), ...(version>=41?['component']:[]), ...(version>=51?['medicine']:[]), ...(version>=52?['weapon']:[]), ...(version>=63?['apparel']:[]), ...(version>=71?['textile']:[]), ...(version>=72?['unfinished']:[]),...(version>=79?['corpse']:[]),...(version>=194?['mech-corpse']:[]),...(version>=88?['silver']:[])]) || !integer(item.quantity, 1, version>=120&&item.item==='muffalo-wool'?100:version>=88&&item.item==='silver'||version>=123&&item.item==='gold'?500:MAX_STACK) || !record(item.owner)) errors.push('Invalid material pile.');
else {
  if (version >= 5) {
    if (typeof item.item !== 'string' || !Object.hasOwn(ITEM_DEFINITIONS, item.item)) errors.push('Unknown item definition.');
    else {
      if(version<84&&(item.item==='potato'||item.item==='corn'))errors.push('Legacy save contains a V84 crop product.');
      if(version<88&&['silver','bolt-action-rifle','plasteel-knife'].includes(item.item as string))errors.push('Legacy save contains V88 goods.');
      if(version<10&&item.item==='simple-meal')errors.push('Legacy save contains cooked meal.');
      const definition = ITEM_DEFINITIONS[item.item as keyof typeof ITEM_DEFINITIONS];
      if (definition.kind !== item.kind || (item.quantity as number) > definition.stackLimit) errors.push('Invalid item category or stack limit.');
    }
  } else if (item.item !== undefined) errors.push('Legacy save contains version 5 item.');
  const owner = item.owner;
  if (owner.type === 'ground' ? !coord(owner) || Object.keys(owner).some(key => !['type', 'x', 'z'].includes(key))
    : (owner.type === 'pawn'||version>=52&&owner.type==='equipment'||version>=63&&owner.type==='apparel'||version>=88&&owner.type==='inventory') ? !integer(owner.pawnId, 1) || Object.keys(owner).some(key => !['type', 'pawnId'].includes(key))
      : version>=89&&owner.type==='grave' ? !integer(owner.graveId,1)||Object.keys(owner).some(key=>!['type','graveId'].includes(key)) : owner.type === 'job' ? !integer(owner.jobId, 1) || Object.keys(owner).some(key => !['type', 'jobId'].includes(key)) : true) errors.push('Invalid material owner.');
}
 return errors;
}
