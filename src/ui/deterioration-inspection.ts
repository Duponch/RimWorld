import {deteriorationExposure} from '../sim/deterioration-rules';
import {pileMaxHp,pileDamage} from '../sim/thing-damage-rules';
import type {World,MaterialPile} from '../sim/types';
import type {CellHealth} from './cell-inspector';
import type {ObjectInformationRow} from './object-information';

const exposureLabels={
  outside:'Au sol exposé',
  'covered-outside':'Auvent extérieur couvert',
  'unroofed-inside':'Au sol non couvert, à température intérieure',
  'protected-shelf':'Protégé par une étagère',
  'protected-inside':'Intérieur couvert',
  'not-ground':'Hors sol',
  'terrain-exposed':'Intérieur couvert, sol humide exposé',
} as const;
const rateText=(rate:number)=>`${rate.toFixed(2).replace(/\.?0+$/,'').replace('.',',')} PV/jour`;
const environmentalScope='Usure environnementale des matières sensibles au sol. Une étagère annule cette usure. Un intérieur couvert sur sol sec l’annule aussi. Le marais nu et l’eau peu profonde nue ajoutent trois fois le taux de base ; un pont ou un sol construit retire ce supplément. Sous un auvent extérieur, l’air conserve la moitié du taux de base, sans effet de pluie. La pluie, neige comprise, augmente le taux seulement sans toit. Ces protections ne protègent ni du feu ni de la pourriture ; accès et transport non évalués.';

/** One selected physical object, from its confirmed snapshot. No new topology or state. */
export function deteriorationInspection(world:World,pile:MaterialPile):{summary:string;health:CellHealth;rows:ObjectInformationRow[]}|undefined {
  const exposure=deteriorationExposure(world,pile);if(exposure.status==='out-of-scope')return;
  const label=exposureLabels[exposure.status],maximum=pileMaxHp(pile,world.schemaVersion),current=maximum-pileDamage(pile);
  const rate=rateText(exposure.rate),base=rateText(exposure.baseRate);
  const terrain=exposure.terrainFactor>0?` · Sol humide : +${exposure.terrainFactor} × taux de base avant protection`:'';
  return {summary:`Détérioration : ${label} · Taux moyen : ${rate}${terrain}`,health:{current,maximum,label:'État'},rows:[
    {category:'Général',label:'Points de vie',value:`${current} / ${maximum}`,description:'État physique réel de cette pile. Le transport conserve cet état ; il ne répare pas les matières.'},
    {category:'Conservation',label:'Exposition',value:label,description:environmentalScope},
    ...(exposure.terrainFactor>0?[{category:'Conservation',label:'Supplément du terrain',value:'+'+exposure.terrainFactor+' × taux de base',description:'Supplément du marais nu ou de l’eau peu profonde nue avant effet de pluie et protection de l’étagère. Un pont ou un sol construit le retire ; une étagère annule l’usure environnementale totale.'}]:[]),
    {category:'Conservation',label:'Détérioration moyenne',value:rate,description:`Taux actuel moyen, pas une date garantie de dommage ou de disparition. Taux de base : ${base}. ${environmentalScope}`},
  ]};
}
