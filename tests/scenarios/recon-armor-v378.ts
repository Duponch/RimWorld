import {prepareAdvancedIndustryDemo} from '../../scripts/generate-advanced-industry-demo-v139.ts';
import {addGroundMaterial,addMaterial} from '../../src/sim/materials.ts';
import {CLOTHING_RESEARCH_COST,researchCost} from '../../src/sim/research.ts';
import {validateWorld} from '../../src/sim/serialization.ts';

export type UraniumSource='mined'|'prepared';
export function nativeV378Fixture(source:UraniumSource='mined'){
  const initial=prepareAdvancedIndustryDemo(),bench=initial.structures.find(s=>s.kind==='fabrication-bench')!,pawn=initial.pawns[0]!;
  bench.bills=[];
  initial.research!.points=CLOTHING_RESEARCH_COST;initial.research!.completedAt=1000;
  initial.research!.reconArmor={points:researchCost('recon-armor'),completedAt:initial.tick};
  pawn.schedule.fill('work');pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;pawn.apparelAutomation=false;
  pawn.skills.mining={level:8,xp:0,dailyXp:0,passion:0};
  // Prepared expert bounds this UI workflow; skill6 refusal is covered separately.
  pawn.skills.crafting={level:20,xp:0,dailyXp:0,passion:0};
  pawn.priorities.mine=0;pawn.priorities.haul=2;pawn.priorities.craft=1;
  // Explicit prior equipment, not an earlier clothing transition proved here.
  for(const item of ['flak-vest','cloth-parka'] as const)addMaterial(initial,'apparel',1,{type:'apparel',pawnId:pawn.id},item);
  addGroundMaterial(initial,'plasteel',80,{x:14,z:10},'plasteel');
  addGroundMaterial(initial,'advanced-component',3,{x:14,z:11},'advanced-component');
  addGroundMaterial(initial,'food',2,{x:17,z:12},'simple-meal');
  const ore={x:20,z:10},storage={from:{x:20,z:11},to:{x:21,z:12}};
  if(source==='mined')initial.tiles[ore.z*initial.width+ore.x]={terrain:'rock',stone:'granite',ore:'uranium'};
  else addGroundMaterial(initial,'uranium',10,ore,'uranium');
  const errors=validateWorld(initial);if(errors.length)throw Error('Préparation V378 invalide : '+errors.join(' '));
  if(pawn.skills.crafting!.level<6||!bench.power?.on)throw Error('Le poste alimenté et Artisanat6 sont requis.');
  if(initial.piles.some(p=>p.item==='recon-armor'||p.item==='unfinished-recon-armor'))throw Error('Aucune combinaison ni ouvrage ne doit être préparé.');
  if(source==='mined'&&initial.piles.some(p=>p.item==='uranium'))throw Error('La source minée doit commencer sans uranium extrait.');
  return {initial,pawnId:pawn.id,benchId:bench.id,ore,storage,source,
    notice:'Scène32² préparée depuis industrieV123 via la préparation industrieV139 : générateur/établi alimentés existants, recherche et artisan20 acquis, besoins initiaux100, 90aciers hérités deV123, 1composant+10plastacier+3ors préparés parV139 ; ajout explicite de80plastacier (90au total), 3composants avancés et2repas finis, gilet+parka déjà portés. '+(source==='mined'?'Minerai4000PV intact ajouté explicitement, aucun uranium extrait.':'10uranium au sol acquis explicitement avant le parcours ; ce mode ne prouve pas le minage.')+' Réserve, facture, transport, incorporation, travail4500, qualité, produit, port114 et retrait66 restent à exécuter.'};
}
