import type { MaterialPile,Pawn,World } from './types.ts';
import type { ItemId } from './items.ts';
import {MACE_ITEMS_269,isMaceItem269,maceLabel269,maceMaxHitPoints269,type MaceItem269} from './mace-content-269.ts';

export const WEAPON_QUALITIES=['awful','poor','normal','good','excellent','masterwork','legendary'] as const;
export type WeaponQuality=typeof WEAPON_QUALITIES[number];
const MELEE_QUALITY_FACTORS=Object.freeze([.8,.9,1,1.1,1.2,1.45,1.65]);
export const weaponMeleeQualityFactor=(quality:WeaponQuality):number=>MELEE_QUALITY_FACTORS[WEAPON_QUALITIES.indexOf(quality)]!;
export const QUALITY_LABELS:Readonly<Record<WeaponQuality,string>>={awful:'déplorable',poor:'médiocre',normal:'normal',good:'bon',excellent:'excellent',masterwork:'chef-d’œuvre',legendary:'légendaire'};
export interface WeaponState {quality:WeaponQuality;hitPoints:number;forbidden?:true}
export type EquipmentAction='equip'|'drop'|'wear'|'remove';
export interface EquipmentTask {itemId:number;action:EquipmentAction;progress:number;duration?:number;automatic?:true}
export type EquipmentCommand={type:'order-equipment';pawnId:number;itemId:number;action:EquipmentAction;queue:boolean}
  |{type:'weapon-permission';itemId:number;allowed:boolean}
  |{type:'apparel-permission';itemId:number;allowed:boolean}|{type:'forget-weapon';pawnId:number};
export const equippedWeapon=(world:World,pawn:Pawn):MaterialPile|undefined=>world.piles.find(p=>p.owner.type==='equipment'&&p.owner.pawnId===pawn.id);
const maceLabels269=Object.fromEntries(MACE_ITEMS_269.map(item=>[item,maceLabel269(item)])) as Record<MaceItem269,string>;
export const WEAPON_LABELS=Object.freeze({revolver:'Revolver','bolt-action-rifle':'Fusil à verrou','plasteel-knife':'Couteau en plastacier','emp-launcher':'Lanceur EMP',...maceLabels269});
export type WeaponItem=keyof typeof WEAPON_LABELS;
export type RangedWeaponItem='revolver'|'bolt-action-rifle'|'emp-launcher';
export const isWeaponItem=(item:unknown):item is WeaponItem=>typeof item==='string'&&Object.hasOwn(WEAPON_LABELS,item);
export const isRangedWeaponItem=(item:unknown):item is RangedWeaponItem=>item==='revolver'||item==='bolt-action-rifle'||item==='emp-launcher';
export const weaponMaxHitPoints=(item:ItemId):number=>isMaceItem269(item)?maceMaxHitPoints269(item):item==='plasteel-knife'?280:isWeaponItem(item)?100:0;
export const weaponLabel=(pile:MaterialPile):string=>`${WEAPON_LABELS[pile.item as WeaponItem]??'Arme'} (${QUALITY_LABELS[pile.weapon?.quality??'normal']})`;
export const newWeaponState=(item:WeaponItem='revolver'):WeaponState=>({quality:'normal',hitPoints:weaponMaxHitPoints(item)});
