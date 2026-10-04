import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createWorld } from '../src/sim/engine.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { newBuildingFuel,WOOD_BURN_TICKS } from '../src/sim/fuel.ts';
import { PACKAGED_SURVIVAL_MEALS_RESEARCH_COST,RESEARCH_SCALE } from '../src/sim/research.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type Pawn,type Structure,type World } from '../src/sim/types.ts';

export const PACKAGED_SURVIVAL_DEMO_ID='repas-survie-v206';
export const PACKAGED_SURVIVAL_DEMO_PATH='public/test-saves/v206/repas-survie.json';
export const PACKAGED_SURVIVAL_CELLS={stove:{x:10,z:10},research:{x:6,z:5},protein:{x:8,z:12},vegetable:{x:9,z:12},storage:{x:13,z:12}} as const;

/** Ingredients, fuel and nearly completed research are explicit preparation.
 * No bill, cooked ration, active task, trip or consumed ingredient is supplied. */
export function preparePackagedSurvivalDemo(seed=206):World {
  const w=createWorld(seed,32,32);w.tick=3000;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];
  w.jobs=[];w.packed=[];w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.events=[];
  delete w.wildlife;delete w.worldIncidents;delete w.smallIncidents;delete w.miscIncidents;
  delete w.heatwaves;delete w.visitors;delete w.weather;delete w.raids;delete w.arrivals;
  delete w.filth;delete w.roofing;delete w.home;
  // Explicit prepared stream for a healthy demonstration; genuine cooking
  // rolls still occur and the contamination scenario uses another stream.
  w.rng=0x12345678;
  for(const [i,p] of w.pawns.entries()){
    p.name=['Ada · chercheuse','Noé · cuisinier','Mina · exploratrice'][i]!;
    p.x=[5,10,18][i]!;p.z=[7,12,12][i]!;p.hunger=100;p.rest=100;p.recreation.level=100;
    p.health=createMedicalRecord(w.tick);p.schedule.fill('work');p.apparelAutomation=false;
    p.needCooldown=0;p.planCooldown=0;p.bedId=null;
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  }
  w.pawns[0]!.skills.intellectual={level:8,xp:0,dailyXp:0,passion:0};
  w.pawns[1]!.skills.cooking={level:8,xp:0,dailyXp:0,passion:0};
  w.research={points:0,project:null,packagedSurvivalMeals:{points:PACKAGED_SURVIVAL_MEALS_RESEARCH_COST-2*RESEARCH_SCALE}};
  const desk:Structure={id:w.nextId++,kind:'research-bench',...PACKAGED_SURVIVAL_CELLS.research,orientation:0,footprint:'standard',material:'wood'};
  const stove:Structure={id:w.nextId++,kind:'fueled-stove',...PACKAGED_SURVIVAL_CELLS.stove,orientation:0,footprint:'standard',material:'steel',bills:[],fuel:newBuildingFuel('fueled-stove')};
  stove.fuel!.ticks=10*WOOD_BURN_TICKS;
  w.structures=[desk,stove];
  const occupied=w.structures.flatMap(footprintCells).map(c=>c.z*w.width+c.x);
  assert.equal(new Set(occupied).size,occupied.length,'Prepared structures must not overlap.');
  addGroundMaterial(w,'food',18,PACKAGED_SURVIVAL_CELLS.protein,'hare-meat');
  addGroundMaterial(w,'food',18,PACKAGED_SURVIVAL_CELLS.vegetable,'rice');refreshStock(w);
  assert.equal(w.jobs.length,0);assert.equal(w.piles.some(p=>p.item==='survival-meal'),false);
  assert.equal(w.research.packagedSurvivalMeals!.completedAt,undefined);assert.deepEqual(validateWorld(w),[]);return w;
}

export function packagedSurvivalDemoEntry(w:World,sha256:string){return {
  id:PACKAGED_SURVIVAL_DEMO_ID,release:'v206',label:'Repas de survie · production et voyage',
  description:'Achever la recherche au bureau simple, préparer trois rations depuis les ingrédients au sol, les ranger puis charger une reconnaissance avec ces repas fabriqués.',
  filename:'repas-survie.json',pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['recherche au contact','Cuisine 8','ingrédients réservés','combustible','conservation sans froid','réserve','chargement physique','reconnaissance','sauvegarde et reprise'],
  steps:[
    'Charger en pause. Recherche → Repas de survie montre 498/500 points préparés. Lancer le projet, activer Recherche 1 pour Ada dans Travail et reprendre jusqu’à sa finition au bureau simple en (6,5).',
    'Architecte → Zones → Réserve : placer une cellule en (13,12) qui accepte les aliments. Inspecter la cuisinière à bois en (10,10), ajouter Cuisiner un repas de survie et régler Faire X fois sur 3, Produit sur Meilleure réserve. Les 18 viandes et 18 riz permettent exactement trois préparations.',
    'Dans Travail, activer Cuisine 1 pour Noé. Observer prises, placement des six protéines et six végétaux, travail puis dépôt réel. Sauvegarder pendant la cuisson et recharger. Les rations ne pourrissent pas ; une préparation contaminée reste impropre au chargement des voyages.',
    'Quand les trois repas sains sont en réserve, Monde → Reconnaissance : choisir Mina, la pile fabriquée et trois rations. Préparer, sauvegarder pendant le chargement, reprendre puis observer la sortie physique, le circuit abstrait et le retour. Besoins initialement hauts : une consommation pendant les six heures n’est pas garantie.',
  ],prepared:true,
  provenance:`Scène préparée 32×32, createWorld(${w.seed}), schéma 188, tick 3000 sans campagne simulée. Trois adultes libres sains avec besoins à 100, travaux désactivés ; Ada Intellectuel 8, Noé Cuisine 8, Mina disponible pour reconnaissance. Recherche Repas de survie à 498/500 non sélectionnée, bureau simple et cuisinière à bois existants avec 10 bois de combustible. 18 viandes de lièvre et 18 riz frais au sol ; aucune ration, facture, réserve, réservation, production, sortie ou consommation fournie. Flux PRNG 0x12345678 explicitement préparé pour la démonstration saine ; tirages de contamination réels à la finition, risque d’hygiène extérieur conservé. Incidents exclus. Préalable Core Pâte nutritive explicitement différé ; facture ×4 et détérioration extérieure des repas absentes. La scène ne prouve ni campagne naturelle, acquisition complète de la recherche, ni coût général sur 250².`,sha256,
};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-packaged-survival-v206-test-save.ts')){
  assert.equal(SCHEMA_VERSION,188,'Do not rewrite V206 under a later schema.');
  const w=preparePackagedSurvivalDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??PACKAGED_SURVIVAL_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=packagedSurvivalDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);
    assert.equal(manifest.version,2);const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V206 entry differs; review before rewriting.');
    else{assert.equal(manifest.saves.length,51);const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');
      writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));}
  }
  console.log(JSON.stringify({path:output,entry}));
}
