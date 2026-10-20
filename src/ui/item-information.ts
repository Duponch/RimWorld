import {knownPile256} from './exploration-readers-256';
import {UNDISCOVERED_CELL_LABEL_256} from '../sim/exploration-visibility-256';
import {eggSpeciesForItem256} from '../sim/animal-egg-content-v256';
import { ITEM_DEFINITIONS } from '../sim/items';
import { isApparelItem, apparelDefinition, apparelLabel, armorPiece, apparelQualityFactor, apparelInsulation } from '../sim/apparel-rules';
import { QUALITY_LABELS, isWeaponItem, weaponMaxHitPoints } from '../sim/equipment-rules';
import { commercialItemMassGrams } from '../sim/commercial-mass';
import type { MaterialPile,World } from '../sim/types';
import {deteriorationInspection} from './deterioration-inspection';
import type { ObjectInformationInput, ObjectInformationRow } from './object-information';
import { BODY_PARTS } from '../sim/body-definition';
import { mechCorpseMass } from '../sim/mechanoid-corpse';
import { mechanoidBodyModel } from '../sim/mechanoid-anatomy';
import { partMissing } from '../sim/injury-state';
import {isMinifiedTree} from '../sim/tree-transfer-state';
import {floraDefinition} from '../sim/biome-flora';
import { pileMaxHp,pileDamage } from '../sim/thing-damage-rules';
import { ROT_DAYS } from '../sim/food-preservation';

/** Only delivered properties, evaluated on explicit inspection of one item. */
export function itemInformation(pile:MaterialPile,world?:World):ObjectInformationInput {
  if(world&&!knownPile256(world,pile))return {title:UNDISCOVERED_CELL_LABEL_256,description:'',rows:[]};
  const definition=ITEM_DEFINITIONS[pile.item],rows:ObjectInformationRow[]=[];
  const add=(category:string,label:string,value:string,description:string)=>rows.push({category,label,value,description});
  if(eggSpeciesForItem256(pile.item)){
    add('Œuf','Permission',pile.eggForbidden?'Interdit':'Autorisé','Les œufs pondus par un animal sauvage restent interdits au travail de la colonie jusqu’à votre autorisation.');
    add('Œuf','Masse',`${(pile.quantity*.15).toLocaleString('fr-FR')} kg`,'150 g par œuf. Le transport local conserve l’identité, la quantité et l’incubation ; le chargement en caravane attend son propriétaire biologique complet.');
    if(pile.egg){add('Œuf','Incubation',`${Math.min(100,Math.floor(pile.egg.progress*100))} %`,'L’incubation suit la température réelle de son emplacement. Si aucune place d’éclosion n’est libre, tous les œufs sont conservés.');add('Œuf','Dommages thermiques',`${Math.floor(pile.egg.temperatureDamage*100)} %`,'Sous 0 °C ou au-dessus de 50 °C, la pile peut perdre sa fécondation.');}
  }
  add('Général','Quantité',String(pile.quantity),'Quantité réellement présente dans cette pile.');
  add('Général','Limite de pile',String(definition.stackLimit),'Quantité maximale d’une pile de cet objet.');
  if(isMinifiedTree(pile)){
    add('Général','Masse','150 kg','Masse de l’arbre entier ; son portage à la main est distinct du transport de provisions en voyage.');
    add('Général','Points de vie',`${pileMaxHp(pile,235)-pileDamage(pile)} / ${pileMaxHp(pile,235)}`,'État de l’emballage, distinct de la santé de l’arbre conservé à l’intérieur.');
    add('Arbre','Espèce',floraDefinition(pile.innerResource)?.label??'Arbre',pile.plantPack.pendingExpiry?'Espèce de l’arbre original avant sa mort.':'L’arbre conserve son espèce lors de sa replantation.');
    if(pile.plantPack.pendingExpiry){
      add('Arbre','État','Mort · restes en attente','L’arbre est mort à son échéance et ne peut plus être replanté.');
      add('Arbre','Bois à déposer',String(pile.plantPack.pendingExpiry.quantity),'Tous les restes sont conservés ; leur dépôt attend de pouvoir se faire entièrement.');
    }else{
      add('Arbre','Croissance',`${Math.round((pile.innerResource.growth??1)*100)} %`,'La croissance est suspendue tant que l’arbre reste déraciné.');
      add('Arbre','Conservation','7 jours après le déracinement','Replantez l’arbre sur un sol fertile et sans toit avant sa mort.');
    }
  }
  if(pile.mechCorpse){
    add('Général','Masse restante',`${mechCorpseMass(pile).toFixed(3).replace('.',',')} kg`,'Masse de la carcasse entière, issue de la couverture naturelle des parties restantes. Les blessures seules ne retirent pas de matière.');
    add('Général','Points de vie',`${pileMaxHp(pile)-pileDamage(pile)} / ${pileMaxHp(pile)}`,'État physique de l’objet transporté, distinct du dossier mécanique figé au décès.');
    const missing=mechanoidBodyModel(pile.mechCorpse.mechKind).parts.filter(p=>partMissing(pile.mechCorpse!.health,p.id));
    add('Dossier mécanique','Parties absentes',missing.length?missing.map(p=>p.label).join(', '):'Aucune','Absences réelles conservées à la neutralisation. La carcasse ne guérit pas et ne pourrit pas.');
    add('Récupération','Usage','Concassage ou broyage','Une facture d’Artisanat consomme une carcasse entière au poste réel et produit de l’acier selon l’efficacité de l’artisan. Ce corps n’est pas un aliment ni une dépouille de boucherie.');
  }
  const mass=commercialItemMassGrams(pile.item);
  if(mass!==undefined&&!pile.mechCorpse)add('Général','Masse unitaire',`${mass/1000} kg`,'Masse utilisée par le chargement des expéditions commerciales ; elle ne limite pas le transport ordinaire sur la carte.');
  if(definition.nutrition)add('Alimentation','Nutrition',String(definition.nutrition/100),'Nutrition par unité consommée. La jauge de nourriture de 100 points représente une unité de nutrition.');
  if(pile.item==='hops')add('Brassage','Usage','Ingrédient végétal','25 houblons donnent 5 moûts à la brasserie. Le houblon n’est pas proposé comme repas aux personnes ni comme provision de voyage.');
  if(pile.item==='wort'){
    add('Brassage','Usage','Moût à fermenter','Transport apporte physiquement le moût dans un tonneau entre 1 et 30 °C. Le moût ne se boit pas.');
    add('Brassage','Conservation','5 jours avant pourriture','Durée à 10 °C ou plus ; le froid ralentit la pourriture et la congélation la suspend.');
  }
  if(pile.item==='beer'){
    add('Alcool','Consommation','1 bière par prise','Boisson alcoolisée prise au contact. Les politiques partagées règlent les prises automatiques ; un ordre direct reste soumis aux refus physiques.');
    add('Alcool','Effets','Plaisir et alcoolémie','L’alcool peut altérer les capacités et provoquer tolérance, dépendance, sevrage et gueule de bois. Consultez Santé pour l’état réel de la personne.');
    add('Alcool','Conservation','Ne pourrit pas','La pile reste sensible aux dégâts et à la détérioration à l’extérieur.');
  }
  if(pile.item==='pemmican'){
    add('Alimentation','Conservation',`${ROT_DAYS.pemmican} jours`,'Durée avant pourriture à 10 °C ou plus. Le froid ralentit cette progression ; la congélation la suspend.');
    add('Alimentation','Usage','Réserve de camp','Aliment préparé pouvant être consommé selon le régime. Les expéditions de cette version demandent toujours des repas de survie.');
  }
  if(world){const deterioration=deteriorationInspection(world,pile);if(deterioration)rows.push(...deterioration.rows);}
  const quality=pile.weapon?.quality??pile.apparel?.quality;
  if(quality)add('Général','Qualité',QUALITY_LABELS[quality],'Qualité propre à cette instance, conservée pendant les déplacements et l’équipement.');
  if(isWeaponItem(pile.item)&&pile.weapon)add('Général','Points de vie',`${pile.weapon.hitPoints} / ${weaponMaxHitPoints(pile.item)}`,'État réel de l’arme sélectionnée.');
  if(pile.item==='emp-launcher'){
    add('Arme','Effet','Impulsion EMP','Interrompt temporairement les mécanoïdes et les équipements électriques sensibles. Ne blesse pas directement les personnes et ne vide pas les batteries.');
    add('Arme','Rayon de l’impulsion','1,1 case','L’impulsion se déclenche au point d’impact réel du projectile. La dispersion et les obstacles peuvent déplacer cet impact.');
    add('Arme','Adaptation mécanique','Temporaire','Après une impulsion, les mécanoïdes résistent temporairement aux suivantes ; un tir répété ne garantit pas un nouvel étourdissement.');
  }
  if(isApparelItem(pile.item)&&pile.apparel){
    const apparel=apparelDefinition(pile),armor=armorPiece(pile).ratings,insulation=apparelInsulation(pile);
    add('Général','Points de vie',`${pile.apparel.hitPoints} / ${apparel.hitPoints}`,'État réel du vêtement. Les vêtements abîmés peuvent affecter l’humeur.');
    for(const [type,label] of [['sharp','Tranchant'],['blunt','Contondant'],['heat','Chaleur']] as const)add('Protection',label,`${Math.round(armor[type]*100)} %`,`Protection de cette pièce : base ${Math.round(apparel.ratings[type]*100)} % × qualité ${apparelQualityFactor(pile.apparel.quality)} ; plafond 200 %. Ne représente pas une protection uniforme de tout le corps.`);
    add('Isolation','Froid',`${insulation.cold.toFixed(1)} °C`,'Isolation de cette pièce après facteur de qualité.');
    add('Isolation','Chaleur',`${insulation.heat.toFixed(1)} °C`,'Isolation de cette pièce après facteur de qualité.');
    add('Vêtement','Parties couvertes',apparel.coverage.parts.map(part=>BODY_PARTS[part].label).join(', '),'Parties anatomiques couvertes par cette pièce. La couverture participe au calcul de protection au contact.');
  }
  return {title:isMinifiedTree(pile)&&pile.plantPack.pendingExpiry?'Arbre mort · restes en attente':isApparelItem(pile.item)&&pile.apparel?apparelLabel(pile):definition.label,description:pile.item==='hops'?'Houblon récolté destiné au brassage.':pile.item==='wort'?'Moût préparé à la brasserie ; la fermentation en tonneau produit la bière.':pile.item==='beer'?'Bière fermentée, stockable et échangeable. Sa consommation a des effets sur la santé.':isMinifiedTree(pile)&&pile.plantPack.pendingExpiry?'Arbre mort ; tous ses restes sont conservés jusqu’à leur dépôt.':definition.kind==='food'?'Aliment physique pouvant être consommé selon le régime alimentaire.':definition.kind==='apparel'?'Vêtement physique qui peut être porté, retiré et stocké.':definition.kind==='weapon'?'Arme physique qui peut être équipée, déposée et stockée.':'Objet physique de la colonie.',rows};
}
