import type { StructureKind } from '../sim/types';

export const buildingLabels: Readonly<Record<StructureKind, string>> = {
  grave:'Tombe',
  'power-conduit': 'Câble électrique', 'power-switch': 'Interrupteur électrique',
  heater:'Radiateur','wind-turbine':'Éolienne',
  battery: 'Batterie', 'solar-generator': 'Générateur solaire',
  'fueled-stove': 'Cuisinière à bois', 'electric-stove': 'Cuisinière électrique',
  'butcher-table': 'Table de boucherie', 'butcher-spot': 'Emplacement de boucherie',
  'machining-table':'Atelier d’usinage', 'art-bench':'Atelier de sculpture', cooler: 'Climatiseur', 'research-bench': 'Bureau de recherche', 'tailor-bench': 'Établi de tailleur', 'electric-tailor-bench':'Établi de tailleur électrique',
  'crafting-spot': 'Emplacement d’artisanat', 'wood-generator': 'Générateur à bois',
  'standing-lamp': 'Lampe sur pied', 'passive-cooler': 'Refroidisseur passif', door: 'Porte',
  stonecutter: 'Table de taille de pierre', 'small-sculpture':'Petite sculpture', 'large-sculpture':'Grande sculpture', wall: 'Mur', bed: 'Lit', table: 'Table 1 × 2','table-square':'Table 2 × 2','table-long':'Table 2 × 4',
  stool: 'Tabouret','dining-chair':'Chaise de salle à manger',armchair:'Fauteuil','end-table':'Table de chevet',dresser:'Commode','flower-pot':'Pot de fleurs',horseshoes: 'Piquet de fers à cheval', campfire: 'Feu de camp',
};
