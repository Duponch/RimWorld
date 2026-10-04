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
import { COMPLEX_FURNITURE_RESEARCH_COST,TUBE_TELEVISION_RESEARCH_COST,RESEARCH_SCALE } from '../src/sim/research.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type Pawn,type Structure,type World } from '../src/sim/types.ts';

export const TELEVISION_DEMO_ID='television-v208';
export const TELEVISION_DEMO_PATH='public/test-saves/v208/television.json';
export const TELEVISION_CELLS={television:{x:12,z:12},research:{x:6,z:6},generator:{x:8,z:9},steel:{x:9,z:14},components:{x:10,z:14},
  seats:[{x:12,z:14},{x:11,z:15},{x:13,z:16}]} as const;

/** Prepared research, real supplies and existing seats; the new appliance and
 * all watching, construction and switch work remain prospective actions. */
export function prepareTelevisionDemo(seed=208):World {
  const w=createWorld(seed,32,32);w.tick=3000;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];
  w.jobs=[];w.packed=[];w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.events=[];
  delete w.wildlife;delete w.worldIncidents;delete w.smallIncidents;delete w.miscIncidents;
  delete w.heatwaves;delete w.visitors;delete w.weather;delete w.raids;delete w.arrivals;
  delete w.filth;delete w.roofing;delete w.home;
  for(const [i,p] of w.pawns.entries()){
    p.name=['Ada · chercheuse','Noé · constructeur','Mina · spectatrice'][i]!;
    p.x=[5,9,16][i]!;p.z=[9,15,16][i]!;p.hunger=100;p.rest=100;p.recreation.level=20;
    p.health=createMedicalRecord(w.tick);p.schedule.fill('work');p.apparelAutomation=false;
    p.needCooldown=0;p.planCooldown=0;p.bedId=null;
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  }
  w.pawns[0]!.skills.intellectual={level:8,xp:0,dailyXp:0,passion:0};w.pawns[0]!.priorities.research=1;
  w.pawns[1]!.skills.construction={level:8,xp:0,dailyXp:0,passion:0};w.pawns[1]!.priorities.build=1;w.pawns[1]!.priorities.haul=2;w.pawns[1]!.priorities.basic=1;
  w.research={points:0,project:null,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:w.tick},tubeTelevision:{points:TUBE_TELEVISION_RESEARCH_COST-2*RESEARCH_SCALE}};
  const generator:Structure={id:w.nextId++,kind:'wood-generator',...TELEVISION_CELLS.generator,orientation:0,footprint:'standard',material:'steel',power:newPowerState('wood-generator'),fuel:newBuildingFuel('wood-generator')};
  generator.fuel!.ticks=75*WOOD_BURN_TICKS;
  const desk:Structure={id:w.nextId++,kind:'research-bench',...TELEVISION_CELLS.research,orientation:0,footprint:'standard',material:'wood'};
  const seats:Structure[]=TELEVISION_CELLS.seats.map(c=>({id:w.nextId++,kind:'stool',...c,orientation:0,footprint:'standard',material:'wood',quality:'normal'}));
  w.structures=[generator,desk,...seats];
  const occupied=w.structures.flatMap(footprintCells).map(c=>c.z*w.width+c.x);
  assert.equal(new Set(occupied).size,occupied.length);reconcilePower(w);
  addGroundMaterial(w,'steel',75,TELEVISION_CELLS.steel,'steel');addGroundMaterial(w,'steel',5,{x:9,z:13},'steel');
  addGroundMaterial(w,'component',4,TELEVISION_CELLS.components,'component');
  addGroundMaterial(w,'food',9,{x:7,z:15},'survival-meal');refreshStock(w);
  assert.equal(w.jobs.length,0);assert.equal(w.structures.filter(s=>s.kind==='tube-television').length,0);
  assert.equal(w.research.tubeTelevision!.completedAt,undefined);assert.deepEqual(validateWorld(w),[]);return w;
}

export function televisionDemoEntry(w:World,sha256:string){return {
  id:TELEVISION_DEMO_ID,release:'v208',label:'Télévision · recherche et loisirs',
  description:'Achever la recherche au bureau, livrer acier et composants, construire une télévision, rejoindre un vrai siège puis constater une coupure et la reprise.',
  filename:'television.json',pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['recherche physique','acier et composants livrés','électricité','sièges et visibilité','plaisir au contact','coupure','sauvegarde et reprise'],
  steps:[
    'Charger en pause. Recherche → Télévision cathodique : lancer les deux derniers points. Ada rejoint le bureau en (6,6) et achève réellement le projet ; Mobilier complexe est préparé.',
    'Architecte → Loisirs → Télévision cathodique : poser en (12,12), écran vers les sièges au sud (orientation initiale). Reprendre : Noé prend les 80 aciers et quatre composants au sol puis construit l’appareil. Le générateur au bois déjà alimenté fournit le courant.',
    'Dans Planning, peindre Loisir sur les heures courantes d’Ada et Mina. Noé reste en Travail, avec Construction et Manutention activées pour les commutations. Les spectatrices rejoignent des sièges à deux, trois ou quatre cases devant l’écran ; aucun plaisir pendant le trajet. Besoins affiche la nouvelle lassitude Télévision. Sauvegarder et recharger pendant un visionnage réel.',
    'Sélectionner la télévision, demander son arrêt électrique et reprendre : Noé actionne le commutateur au contact. L’écran s’éteint et le visionnage cesse sans plaisir supplémentaire. Sauvegarder cet arrêt puis demander la remise en marche et reprendre.',
  ],prepared:true,
  provenance:`Scène préparée 32×32, createWorld(${w.seed}), schéma 190, tick 3000 sans campagne simulée. Trois adultes sains, besoins faim/repos à 100 et plaisir à 20, horaires Travail. Recherche Intellect 8 et Construction 8, priorités utiles préparées. Mobilier complexe achevé, projet TV à 998/1000 sans sélection ni travail engagé. Bureau simple, trois tabourets réels et générateur rempli de 75 bois préparés ; 80 acier, 4 composants et neuf rations au sol. Aucun téléviseur, plan, livraison, plaisir télévisuel, panne ou commutation préinjectés. Incidents exclus. Écran fixe original dans le lot résident, sans image ou vidéo propriétaire. Cette préparation ne prouve ni campagne naturelle ni performance générale sur 250².`,sha256,
};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-television-v208-test-save.ts')){
  assert.equal(SCHEMA_VERSION,190,'Do not rewrite V208 under a later schema.');
  const w=prepareTelevisionDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??TELEVISION_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=televisionDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);
    assert.equal(manifest.version,2);const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V208 entry differs; review before rewriting.');
    else{assert.equal(manifest.saves.length,53);const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');
      writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));}
  }
  console.log(JSON.stringify({path:output,entry}));
}
