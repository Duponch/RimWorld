import type { StructureKind } from '../sim/types';

export const buildingLabels: Readonly<Record<StructureKind, string>> = {
  'power-conduit': 'Câble électrique', 'power-switch': 'Interrupteur électrique',
  heater:'Radiateur','wind-turbine':'Éolienne',
  battery: 'Batterie', 'solar-generator': 'Générateur solaire',
  'fueled-stove': 'Cuisinière à bois', 'electric-stove': 'Cuisinière électrique',
  'butcher-table': 'Table de boucherie', 'butcher-spot': 'Emplacement de boucherie',
  cooler: 'Climatiseur', 'research-bench': 'Bureau de recherche', 'tailor-bench': 'Établi de tailleur',
  'crafting-spot': 'Emplacement d’artisanat', 'wood-generator': 'Générateur à bois',
  'standing-lamp': 'Lampe sur pied', 'passive-cooler': 'Refroidisseur passif', door: 'Porte',
  stonecutter: 'Table de taille de pierre', wall: 'Mur', bed: 'Lit', table: 'Table',
  stool: 'Tabouret', horseshoes: 'Piquet de fers à cheval', campfire: 'Feu de camp',
};
