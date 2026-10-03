import { ITEM_DEFINITIONS } from '../sim/items';
import { isApparelItem, apparelDefinition, apparelLabel, armorPiece, apparelQualityFactor, apparelInsulation } from '../sim/apparel-rules';
import { QUALITY_LABELS, isWeaponItem, weaponMaxHitPoints } from '../sim/equipment-rules';
import { commercialItemMassGrams } from '../sim/commercial-mass';
import type { MaterialPile } from '../sim/types';
import type { ObjectInformationInput, ObjectInformationRow } from './object-information';
import { BODY_PARTS } from '../sim/body-definition';

/** Only delivered properties, evaluated on explicit inspection of one item. */
export function itemInformation(pile:MaterialPile):ObjectInformationInput {
  const definition=ITEM_DEFINITIONS[pile.item],rows:ObjectInformationRow[]=[];
  const add=(category:string,label:string,value:string,description:string)=>rows.push({category,label,value,description});
  add('Général','Quantité',String(pile.quantity),'Quantité réellement présente dans cette pile.');
  add('Général','Limite de pile',String(definition.stackLimit),'Quantité maximale d’une pile de cet objet.');
  const mass=commercialItemMassGrams(pile.item);
  if(mass!==undefined)add('Général','Masse unitaire',`${mass/1000} kg`,'Masse utilisée par le chargement des expéditions commerciales ; elle ne limite pas le transport ordinaire sur la carte.');
  if(definition.nutrition)add('Alimentation','Nutrition',String(definition.nutrition/100),'Nutrition par unité consommée. La jauge de nourriture de 100 points représente une unité de nutrition.');
  const quality=pile.weapon?.quality??pile.apparel?.quality;
  if(quality)add('Général','Qualité',QUALITY_LABELS[quality],'Qualité propre à cette instance, conservée pendant les déplacements et l’équipement.');
  if(isWeaponItem(pile.item)&&pile.weapon)add('Général','Points de vie',`${pile.weapon.hitPoints} / ${weaponMaxHitPoints(pile.item)}`,'État réel de l’arme sélectionnée.');
  if(isApparelItem(pile.item)&&pile.apparel){
    const apparel=apparelDefinition(pile),armor=armorPiece(pile).ratings,insulation=apparelInsulation(pile);
    add('Général','Points de vie',`${pile.apparel.hitPoints} / ${apparel.hitPoints}`,'État réel du vêtement. Les vêtements abîmés peuvent affecter l’humeur.');
    for(const [type,label] of [['sharp','Tranchant'],['blunt','Contondant'],['heat','Chaleur']] as const)add('Protection',label,`${Math.round(armor[type]*100)} %`,`Protection de cette pièce : base ${Math.round(apparel.ratings[type]*100)} % × qualité ${apparelQualityFactor(pile.apparel.quality)} ; plafond 200 %. Ne représente pas une protection uniforme de tout le corps.`);
    add('Isolation','Froid',`${insulation.cold.toFixed(1)} °C`,'Isolation de cette pièce après facteur de qualité.');
    add('Isolation','Chaleur',`${insulation.heat.toFixed(1)} °C`,'Isolation de cette pièce après facteur de qualité.');
    add('Vêtement','Parties couvertes',apparel.coverage.parts.map(part=>BODY_PARTS[part].label).join(', '),'Parties anatomiques couvertes par cette pièce. La couverture participe au calcul de protection au contact.');
  }
  return {title:isApparelItem(pile.item)&&pile.apparel?apparelLabel(pile):definition.label,description:definition.kind==='food'?'Aliment physique pouvant être consommé selon le régime alimentaire.':definition.kind==='apparel'?'Vêtement physique qui peut être porté, retiré et stocké.':definition.kind==='weapon'?'Arme physique qui peut être équipée, déposée et stockée.':'Objet physique de la colonie.',rows};
}
