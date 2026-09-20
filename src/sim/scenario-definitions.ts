import type { Cell } from './types.ts';

export const SCENARIO_REVISION=1 as const;
export const SCENARIOS=Object.freeze({
  crashlanded:Object.freeze({label:'Atterrissage forcé',revision:SCENARIO_REVISION,minSize:32,description:'Adaptation partielle : trois personnes, 300 bois, 450 acier, 30 composants, 50 repas de survie, 30 médicaments, un revolver, trois chemises et un gilet. Cassandra et Récit d’aventure partiels ; argent, autres armes/protections, animal familier et débris dispersés restent absents.'}),
  survivors:Object.freeze({label:'Trois survivants',revision:SCENARIO_REVISION,minSize:32,description:'Forêt tempérée : 300 bois, 450 acier, 30 composants, 50 repas de survie, 30 médicaments, un revolver, trois chemises portées et un gilet. Vêtements complexes et Climatisation connus. Départ Lisière inspiré de Crashlanded ; contenu et difficulté encore partiels.'}),
  camp:Object.freeze({label:'Camp pédagogique',revision:SCENARIO_REVISION,minSize:32,description:'Le camp historique : clairière centrale, ressources proches et recherches à découvrir. Adapté aux essais des boucles de colonie.'}),
  sentry:Object.freeze({label:'Rencontre armée',revision:SCENARIO_REVISION,minSize:64,description:'Scène de combat contrôlée avec une sentinelle hostile et un revolver équipé. Ce n’est pas un départ de survie ordinaire.'}),
});
export type ScenarioId=keyof typeof SCENARIOS;
export interface ScenarioStamp {id:ScenarioId;revision:typeof SCENARIO_REVISION;landing:Cell}
export const DEFAULT_SCENARIO:ScenarioId='survivors';
export const isScenarioId=(value:unknown):value is ScenarioId=>typeof value==='string'&&Object.hasOwn(SCENARIOS,value);
