import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createWorld } from '../src/sim/engine.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { newBuildingFuel,WOOD_BURN_TICKS } from '../src/sim/fuel.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { reconcilePower } from '../src/sim/power.ts';
import { HOSPITAL_BED_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST,COMPLEX_FURNITURE_RESEARCH_COST,RESEARCH_SCALE } from '../src/sim/research.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type Pawn,type Structure,type World } from '../src/sim/types.ts';

export const HOSPITAL_BED_DEMO_ID='hopital-v205';
export const HOSPITAL_BED_DEMO_PATH='public/test-saves/v205/hopital.json';
export const HOSPITAL_BED_CELLS={hospital:{x:14,z:12},normalBed:{x:10,z:10},research:{x:7,z:5},generator:{x:3,z:5},medicine:{x:11,z:14}} as const;

/** Research, supplies and a contusion are explicit preparation. The new project
 * still needs physical research; no plan, hospital bed, admission or care exists. */
export function prepareHospitalBedDemo():World {
  const w=createWorld(205,32,32);w.tick=3000;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];
  w.jobs=[];w.packed=[];w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.events=[];
  delete w.wildlife;delete w.worldIncidents;delete w.smallIncidents;delete w.miscIncidents;
  delete w.heatwaves;delete w.visitors;delete w.weather;delete w.raids;delete w.arrivals;
  for(const [i,p] of w.pawns.entries()){
    p.name=['Ada · médecin','Noé · constructeur','Mina · patiente'][i]!;
    p.x=[5,7,7][i]!;p.z=[8,14,12][i]!;p.hunger=100;p.rest=100;p.recreation.level=100;
    p.health=createMedicalRecord(w.tick);p.schedule.fill('work');p.apparelAutomation=false;
    p.needCooldown=0;p.planCooldown=0;p.bedId=null;p.medicalCare='best';
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  }
  const [doctor,builder,patient]=w.pawns;
  doctor!.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};
  doctor!.skills.intellectual={level:8,xp:0,dailyXp:0,passion:0};
  builder!.skills.construction={level:8,xp:0,dailyXp:0,passion:0};builder!.priorities.build=1;builder!.priorities.haul=2;
  patient!.health!.nextInjuryId=2;
  patient!.health!.injuries=[{id:1,part:'torso',kind:'bruise',severity:18000,bornAt:w.tick}];
  w.research={points:0,project:null,microelectronics:{points:MICROELECTRONICS_RESEARCH_COST,completedAt:w.tick},
    complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:w.tick},hospitalBed:{points:HOSPITAL_BED_RESEARCH_COST-2*RESEARCH_SCALE}};
  const generator:Structure={id:w.nextId++,kind:'wood-generator',...HOSPITAL_BED_CELLS.generator,orientation:0,footprint:'standard',material:'steel',power:newPowerState('wood-generator'),fuel:newBuildingFuel('wood-generator')};
  generator.fuel!.ticks=75*WOOD_BURN_TICKS;
  const desk:Structure={id:w.nextId++,kind:'hi-tech-research-bench',...HOSPITAL_BED_CELLS.research,orientation:0,footprint:'standard',material:'steel',power:newPowerState('hi-tech-research-bench')};
  const normalBed:Structure={id:w.nextId++,kind:'bed',...HOSPITAL_BED_CELLS.normalBed,orientation:0,footprint:'standard',material:'steel',quality:'normal',medical:true};
  w.structures=[generator,desk,normalBed];
  const occupied=w.structures.flatMap(footprintCells).map(c=>c.z*w.width+c.x);
  assert.equal(new Set(occupied).size,occupied.length,'Prepared structures must not overlap.');reconcilePower(w);
  addGroundMaterial(w,'steel',75,{x:8,z:14},'steel');addGroundMaterial(w,'steel',45,{x:9,z:14},'steel');
  addGroundMaterial(w,'component',5,{x:10,z:14},'component');addGroundMaterial(w,'medicine',2,HOSPITAL_BED_CELLS.medicine,'medicine');
  addGroundMaterial(w,'food',9,{x:7,z:16},'survival-meal');refreshStock(w);
  assert.equal(w.jobs.length,0);assert.equal(w.structures.filter(s=>s.kind==='hospital-bed').length,0);
  assert.equal(w.research.hospitalBed!.completedAt,undefined);assert.deepEqual(validateWorld(w),[]);return w;
}

export function hospitalBedDemoEntry(w:World,sha256:string){return {
  id:HOSPITAL_BED_DEMO_ID,release:'v205',label:'Lit d’hôpital · recherche et soins',
  description:'Achever les deux derniers points de recherche au vrai bureau, construire un lit depuis les fournitures au sol, puis installer et soigner Mina. Le lit normal médical sert de témoin.',
  filename:'hopital.json',pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['recherche au contact','construction et composants','lit spécialisé','rôle médical','patient et chevet','médicament physique','guérison','sauvegarde et reprise'],
  steps:[
    'Charger en pause. Recherche → Lit d’hôpital montre 1 198/1 200 points préparés ; Microélectronique et Mobilier complexe sont déjà connus. Lancer le projet et activer Recherche pour Ada dans Travail. Reprendre jusqu’à son travail au bureau avancé en (7,5), raccordé au générateur au bois.',
    'Après la recherche, Architecte → Mobilier → Lit d’hôpital : choisir la case (14,12), avec l’orientation initiale. Noé a Construction 8 et Transport actifs. Les 120 aciers en (8,14)/(9,14) et cinq composants en (10,14) doivent être livrés puis construits physiquement. Sauvegarder pendant le cadre puis recharger.',
    'Inspecter le nouveau lit : il est médical par défaut. Le rôle peut être désactivé puis réactivé ; son identité hospitalière demeure. Dans Travail, activer Patient 1 et Repos au lit 3 pour Mina, puis Médecin 1 pour Ada. Mina porte une contusion préparée, sans soin déjà fait.',
    'Observer Mina rejoindre le lit, Ada prendre un médicament en (11,14) et soigner au chevet. Sauvegarder pendant le traitement et recharger avant de reprendre. Le repos, les soins et la guérison utilisent le vrai lit ; le lit médical ordinaire en (10,10) reste un témoin sans bonus hospitalier.',
  ],prepared:true,
  provenance:'Scène préparée 32×32, createWorld(205), schéma187, tick3000 sans campagne simulée. Trois adultes libres avec besoins hauts ; Ada Médecine8/Intellectuel8, Noé Construction8/Transport2, Mina contusion thorax18PV sans traitement. Autres travaux désactivés et Patient/Repos/Médecin à activer après construction. Microélectronique et Mobilier complexe achevés explicitement ; recherche hospitalière à1198/1200 points, projet non sélectionné, aucun travail actif. Bureau avancé et générateur existants avec75bois de combustible, connexions préparées mais alimentation du consommateur à démarrer normalement. Lit normal médical en(10,10), 120acier/cinqcomposants/deuxmédicaments/neufrepas au sol. Aucun lit hospitalier, chantier, livraison, réservation, admission, dose consommée, soin ou guérison hospitalière accordé. Incidents naturels exclus. Acier seul et omission explicite du préalable Core Matériaux stériles ; moniteur/sols stériles absents. Cette clinique préparée ne prouve ni campagne naturelle, acquisition complète des parents, ni performance générale250².',sha256,
};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-hospital-bed-v205-test-save.ts')){
  assert.equal(SCHEMA_VERSION,187,'Do not rewrite V205 under a later schema.');
  const w=prepareHospitalBedDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??HOSPITAL_BED_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=hospitalBedDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);
    assert.equal(manifest.version,2);const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V205 entry differs; review before rewriting.');
    else{assert.equal(manifest.saves.length,50);const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');
      writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));}
  }
  console.log(JSON.stringify({path:output,entry}));
}
