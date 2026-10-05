import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createWorld } from '../src/sim/engine.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { newBuildingFuel,WOOD_BURN_TICKS } from '../src/sim/fuel.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { reconcilePower } from '../src/sim/power.ts';
import { GUN_TURRETS_RESEARCH_COST,GUNSMITHING_RESEARCH_COST,MACHINING_RESEARCH_COST,SMITHING_RESEARCH_COST,RESEARCH_SCALE } from '../src/sim/research.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type Pawn,type Structure,type World } from '../src/sim/types.ts';

export const MINI_TURRET_DEMO_ID='mini-turret-v212';
export const MINI_TURRET_DEMO_PATH='public/test-saves/v212/mini-turret.json';
export const MINI_TURRET_CELLS={turret:{x:16,z:16},research:{x:6,z:6},generator:{x:11,z:16},steel:{x:12,z:14},components:{x:13,z:14},reload:{x:14,z:18}} as const;
/** Research, supplies and a real circuit are preparations. There is no gun,
 * blueprint, delivery, service, shot, injury, fuse or explosion in this World. */
export function prepareMiniTurretDemo(seed=212):World {
  const w=createWorld(seed,32,32);w.tick=3000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  w.resources=[];w.piles=[];w.structures=[];w.jobs=[];w.packed=[];w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.events=[];
  delete w.wildlife;delete w.worldIncidents;delete w.smallIncidents;delete w.miscIncidents;delete w.heatwaves;delete w.visitors;
  delete w.weather;delete w.raids;delete w.arrivals;delete w.filth;delete w.roofing;delete w.home;
  for(const [i,p] of w.pawns.entries()){
    p.name=['Ada · recherche','Noé · chantier','Mina · entretien'][i]!;p.x=[5,11,14][i]!;p.z=[9,13,20][i]!;
    p.hunger=100;p.rest=100;p.recreation.level=100;p.health=createMedicalRecord(w.tick);p.schedule.fill('work');p.apparelAutomation=false;
    p.needCooldown=0;p.planCooldown=0;p.bedId=null;for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  }
  w.pawns[0]!.skills.intellectual={level:8,xp:0,dailyXp:0,passion:0};w.pawns[0]!.priorities.research=1;
  w.pawns[1]!.skills.construction={level:8,xp:0,dailyXp:0,passion:0};w.pawns[1]!.priorities.build=1;w.pawns[1]!.priorities.haul=2;w.pawns[1]!.priorities.basic=1;
  w.pawns[2]!.priorities.haul=1;
  w.research={points:0,project:null,smithing:{points:SMITHING_RESEARCH_COST,completedAt:w.tick},machining:{points:MACHINING_RESEARCH_COST,completedAt:w.tick},
    gunsmithing:{points:GUNSMITHING_RESEARCH_COST,completedAt:w.tick},gunTurrets:{points:GUN_TURRETS_RESEARCH_COST-2*RESEARCH_SCALE}};
  const generator:Structure={id:w.nextId++,kind:'wood-generator',...MINI_TURRET_CELLS.generator,orientation:0,footprint:'standard',material:'steel',power:newPowerState('wood-generator'),fuel:newBuildingFuel('wood-generator')};
  generator.fuel!.ticks=75*WOOD_BURN_TICKS;
  w.structures=[generator,{id:w.nextId++,kind:'research-bench',...MINI_TURRET_CELLS.research,orientation:0,footprint:'standard',material:'wood'}];reconcilePower(w);
  addGroundMaterial(w,'steel',75,MINI_TURRET_CELLS.steel,'steel');addGroundMaterial(w,'steel',25,{x:12,z:15},'steel');
  addGroundMaterial(w,'steel',10,MINI_TURRET_CELLS.reload,'steel');addGroundMaterial(w,'component',3,MINI_TURRET_CELLS.components,'component');
  addGroundMaterial(w,'food',9,{x:7,z:15},'survival-meal');refreshStock(w);
  assert.equal(w.jobs.length,0);assert.equal(w.projectiles,undefined);assert.equal(w.bombWaves,undefined);assert.equal(w.structures.some(s=>s.turret),false);
  assert.equal(w.research.gunTurrets!.completedAt,undefined);assert.deepEqual(validateWorld(w),[]);return w;
}
export function miniTurretDemoEntry(w:World,sha256:string){return {
  id:MINI_TURRET_DEMO_ID,release:'v212',label:'Mini-tourelle · chantier et entretien',filename:'mini-turret.json',
  description:'Achever la recherche, livrer les matériaux puis construire et régler une défense électrique fixe. Les tirs et l’entretien restent des résultats à produire.',
  pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['recherche physique','acier et composants livrés','canon et réseau','politiques confirmées','réarmement physique','panne et PV','sauvegarde et reprise'],
  steps:[
    'Charger en pause. Recherche → Tourelles automatiques : lancer les deux derniers points. Ada rejoint le bureau en (6,6) ; Armurerie et ses préalables sont préparés.',
    'Architecte → Structure → Mini-tourelle automatique : poser en (16,16). Reprendre : Noé livre 100 aciers et trois composants puis accomplit le chantier. Le générateur au bois préparé fournit le courant ; le canon neuf possède 60 coups.',
    'Sélectionner la tourelle : inspecter le canon, le réseau, la cible et les politiques. Retenir le feu puis reprendre le feu par les boutons ; aucune cible ennemie ou émission n’est fournie par la scène. Le rayon 28,9 indique une portée géométrique, pas une garantie de tir.',
    'Après une future consommation réelle du canon, choisir Mina et demander Réarmer avec ce colon. L’acier en (14,18) doit être pris, porté puis consommé au contact pendant le service. Un canon déjà plein refuse cette demande. Sauvegarder et recharger pendant un vrai service ou une coupure électrique.',
  ],prepared:true,
  provenance:`Scène préparée 32×32, createWorld(${w.seed}), schéma 193, tick 3000 sans campagne simulée. Trois personnes saines aux profils de création réels, besoins à 100, horaires Travail et priorités ciblées. Intellect et Construction 8 préparés ; Forge, Usinage et Armurerie achevés, projet Tourelles à 498/500 sans travail engagé. Bureau, générateur rempli, 110 aciers, trois composants et neuf rations au sol. Aucun canon, plan, livraison, réarmement, ennemi, tir, dégât, mèche ou vague préjoué. Incidents exclus. Combat et danger exercés par des expositions privées distinctes ; aucune fréquence naturelle, validation native ni performance générale déduite de cette préparation.`,sha256,
};}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-mini-turret-v212-test-save.ts')){
  assert.equal(SCHEMA_VERSION,193,'Do not rewrite V212 under a later schema.');
  const w=prepareMiniTurretDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??MINI_TURRET_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=miniTurretDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);assert.equal(manifest.version,2);
    const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V212 entry differs; review before rewriting.');
    else{assert.ok(manifest.saves.length<64);const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));}
  }
  console.log(JSON.stringify({path:output,entry}));
}
