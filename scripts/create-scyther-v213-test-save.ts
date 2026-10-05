import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { initializeWildFlora } from '../src/sim/wild-flora.ts';
import { backgroundWorkRefusal } from '../src/sim/colonist-backgrounds.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { newBuildingFuel,WOOD_BURN_TICKS } from '../src/sim/fuel.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { reconcilePower } from '../src/sim/power.ts';
import { newMiniTurretState } from '../src/sim/mini-turret-state.ts';
import { newBreakdownCalendar } from '../src/sim/breakdowns.ts';
import { enableCassandraRaids } from '../src/sim/cassandra-raids.ts';
import { adoptFluIncidents } from '../src/sim/flu-incidents.ts';
import { chooseMechanoidOpportunity } from '../src/sim/mechanoid-raids.ts';
import { adoptColonyEconomy } from '../src/sim/colony-economy.ts';
import { computeThreatPoints } from '../src/sim/threat-points.ts';
import { SMITHING_RESEARCH_COST,MACHINING_RESEARCH_COST,GUNSMITHING_RESEARCH_COST,GUN_TURRETS_RESEARCH_COST } from '../src/sim/research.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,TICKS_PER_DAY,type Pawn,type Structure,type World } from '../src/sim/types.ts';

export const SCYTHER_DEMO_ID='scyther-v213';
export const SCYTHER_DEMO_PATH='public/test-saves/v213/scyther.json';
export const SCYTHER_OPPORTUNITY_TICK=45*TICKS_PER_DAY+100;
export const SCYTHER_CELLS={generator:{x:16,z:20},leftGun:{x:15,z:16},rightGun:{x:17,z:16},crafting:{x:11,z:21},machining:{x:20,z:21},reserve:{x:12,z:23}} as const;

/** One future Cassandra opportunity, real wealth and intact fixed defenses.
 * No mechanical actor, emission, injury, corpse, delivery or salvage is played. */
export function prepareScytherDemo(seed=213):World {
  const w=createScenarioWorld(seed,32,'crashlanded',{hilliness:'flat',biome:'temperate-forest'});w.tick=SCYTHER_OPPORTUNITY_TICK-10;
  delete w.relationships; // The immutable V213 preparation has no family graph.
  w.breakdown=newBreakdownCalendar(w.seed,w.tick);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];w.jobs=[];w.packed=[];w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.events=[];
  delete w.wildlife;delete w.worldIncidents;delete w.smallIncidents;delete w.miscIncidents;delete w.heatwaves;delete w.visitors;
  delete w.weather;delete w.raids;delete w.arrivals;delete w.filth;delete w.roofing;delete w.home;delete w.economy;
  delete w.fluIncidents;delete w.climate;delete w.wind;delete w.thermal;delete w.fires;delete w.flora;
  adoptFluIncidents(w);
  if(w.site?.revision===2)initializeWildFlora(w,w.site);
  for(const [i,p] of w.pawns.entries()){
    p.name=['Ada · défense','Noé · récupération','Mina · atelier'][i]!;p.x=[14,18,16][i]!;p.z=[21,21,23][i]!;
    p.hunger=100;p.rest=100;p.recreation.level=100;p.health=createMedicalRecord(w.tick);p.schedule.fill('work');p.apparelAutomation=false;
    p.needCooldown=0;p.planCooldown=0;p.bedId=null;for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
    p.priorities.craft=1;p.priorities.haul=2;p.priorities.basic=1;
  }
  assert.ok(w.pawns.some(p=>!backgroundWorkRefusal(p,'craft')&&!backgroundWorkRefusal(p,'haul')),'The prepared roster needs a physically capable salvage worker.');
  w.research={points:0,project:null,smithing:{points:SMITHING_RESEARCH_COST,completedAt:w.tick},machining:{points:MACHINING_RESEARCH_COST,completedAt:w.tick},
    gunsmithing:{points:GUNSMITHING_RESEARCH_COST,completedAt:w.tick},gunTurrets:{points:GUN_TURRETS_RESEARCH_COST,completedAt:w.tick}};
  const generator:Structure={id:w.nextId++,kind:'wood-generator',...SCYTHER_CELLS.generator,orientation:0,footprint:'standard',material:'steel',power:newPowerState('wood-generator'),fuel:newBuildingFuel('wood-generator')};
  generator.fuel!.ticks=75*WOOD_BURN_TICKS;w.structures.push(generator);
  for(const cell of [SCYTHER_CELLS.leftGun,SCYTHER_CELLS.rightGun])w.structures.push({id:w.nextId++,kind:'mini-turret',...cell,orientation:0,footprint:'standard',material:'steel',power:newPowerState('mini-turret'),turret:{...newMiniTurretState(),holdFire:true}});
  w.structures.push({id:w.nextId++,kind:'crafting-spot',...SCYTHER_CELLS.crafting,orientation:0,footprint:'standard',bills:[]},
    {id:w.nextId++,kind:'machining-table',...SCYTHER_CELLS.machining,orientation:0,footprint:'standard',material:'steel',power:newPowerState('machining-table'),bills:[]});
  reconcilePower(w);
  addGroundMaterial(w,'gold',10000,{x:25,z:25},'gold');addGroundMaterial(w,'steel',75,{x:18,z:23},'steel');
  addGroundMaterial(w,'food',18,{x:15,z:23},'survival-meal');refreshStock(w);adoptColonyEconomy(w);
  enableCassandraRaids(w);w.raids!.cassandra!.cycle=3;w.raids!.cassandra!.pending=[SCYTHER_OPPORTUNITY_TICK];w.raids!.nextCheck=SCYTHER_OPPORTUNITY_TICK;
  // Prepared private ticket, never a World/combat RNG draw. Root additionally
  // certifies the actual agenda producer before publishing this exposure.
  w.raids!.mechanoid!.rng=50;
  const points=scytherPreparedThreat(w).points,choice=chooseMechanoidOpportunity({...w,tick:SCYTHER_OPPORTUNITY_TICK},points,{rng:w.raids!.mechanoid!.rng});
  assert.ok(points>300);assert.ok(choice&&choice.roster.length>=1,'Prepared prospective ticket must choose the implemented melee group.');
  assert.equal(w.mechanoids,undefined);assert.equal(w.projectiles,undefined);assert.equal(w.bombWaves,undefined);assert.equal(w.mechSalvage,undefined);
  assert.equal(w.piles.some(p=>p.mechCorpse),false);assert.equal(w.raids!.mechActive,undefined);assert.deepEqual(validateWorld(w),[]);return w;
}
export function scytherPreparedThreat(w:World){return computeThreatPoints({knownWealth:w.economy!.wealth.knownStorytellerWealth,freeColonists:w.pawns.length,colonistHealthSum:w.pawns.length,
  elapsedDays:SCYTHER_OPPORTUNITY_TICK/TICKS_PER_DAY,adaptationDays:w.economy!.adaptationDays,seedBucket:Math.floor(SCYTHER_OPPORTUNITY_TICK/250)});}
export function scytherDemoEntry(w:World,sha256:string){return {
  id:SCYTHER_DEMO_ID,release:'v213',label:'Scyther · défense et récupération',filename:'scyther.json',
  description:'Observer une occasion Cassandra future, inspecter les machines hostiles puis défendre et récupérer leurs carcasses par les ateliers réels.',
  pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['adoption prospective','regroupement puis assaut','anatomie mécanique réelle','défense électrique','carcasse entière','concassage et broyage','reprise physique'],
  steps:[
    'Charger en pause, dix ticks avant une occasion Cassandra préparée au jour 45. Les richesses et le ticket privé sont déclarés ; aucun Scyther n’est déjà arrivé. Reprendre à vitesse 1, puis mettre en pause après la lettre du raid mécanique.',
    'Sélectionner un Scyther et ouvrir son dossier mécanique : cible réelle, regroupement, capacités et 32 parties. Il ne reçoit aucune commande coloniale. Examiner aussi en vue isométrique ; les deux tourelles intactes retiennent encore leur feu.',
    'Sélectionner les tourelles en (15,16) et (17,16), lever Retenir le feu puis reprendre. Le circuit alimenté, les vrais tirs et les dégâts doivent produire la défense ; aucun succès n’est fourni par la préparation.',
    'Après neutralisation réelle et fin de récupération, inspecter une carcasse et sa masse restante. Atelier d’usinage en (20,21) : ajouter Broyer un mécanoïde, puis choisir un artisan apte et Prioriser au poste. Collecte, portage, staging et sortie d’acier restent physiques. L’emplacement en (11,21) offre aussi le concassage, plus lent.',
    'Réserves : autoriser Carcasses mécaniques seulement si souhaité. Sauvegarder pendant un vrai déplacement, coup, portage ou travail, puis recharger et poursuivre exactement le même monde.',
  ],prepared:true,
  provenance:`Scène préparée 32×32, createScenarioWorld(${w.seed},32,'crashlanded', site tempéré plat) et biographies de création actuelles, schéma 194, tick ${w.tick}, sans campagne simulée. Clairière entière préparée ; flore réadoptée sans capacité de repeuplement, climat et incidents facultatifs exclus. Calendrier de grippe obligatoire et horloge de panne des appareils neufs réadoptés prospectivement au tick préparé, sans contrôle, maladie ou panne antérieurs. Occasion Cassandra future ${SCYTHER_OPPORTUNITY_TICK}, cycle 3, adoption mécanique au tick de préparation et RNG privé 50. Les 10 000 ors physiques rendent la menace connue strictement supérieure à 300 ; aucune perte historique ajoutée. Deux canons intacts à 60 coups, feu retenu, générateur au bois, ateliers et fournitures au sol. Aucun acteur mécanique, groupe actif, balle, blessure, carcasse, livraison ou acier de récupération préjoué. La préparation ne prouve ni fréquence naturelle, validation native ni performance générale.`,sha256,
};}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-scyther-v213-test-save.ts')){
  assert.equal(SCHEMA_VERSION,194,'Do not rewrite V213 under a later schema.');
  const w=prepareScytherDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??SCYTHER_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=scytherDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);assert.equal(manifest.version,2);
    const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V213 entry differs; review before rewriting.');
    else{assert.ok(manifest.saves.length<64);const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));}
  }
  console.log(JSON.stringify({path:output,threat:scytherPreparedThreat(w),entry}));
}
