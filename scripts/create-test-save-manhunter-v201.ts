import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createWorld } from '../src/sim/engine.ts';
import { adoptSmallIncidents,SMALL_INTRO_TICK } from '../src/sim/cassandra-small.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { resolveSite } from '../src/sim/site.ts';
import { adoptEnvironment } from '../src/sim/environment-step.ts';
import { initializeWildFlora } from '../src/sim/wild-flora.ts';
import { adoptFluIncidents } from '../src/sim/flu-incidents.ts';
import { adoptMiscIncidents } from '../src/sim/cassandra-misc.ts';
import { adoptColonyEconomy } from '../src/sim/colony-economy.ts';
import { enableVisitors } from '../src/sim/visitors.ts';
import { consumeCassandraOpportunity,enableCassandraRaids } from '../src/sim/cassandra-raids.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { animalSpecies,faunaBiome } from '../src/sim/animal-species.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { addMaterial,addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type Pawn,type World } from '../src/sim/types.ts';

export const MANHUNTER_DEMO_ID='animal-en-rage-v201';
export const MANHUNTER_DEMO_PATH='public/test-saves/v201/animal-en-rage.json';

/** An explicitly prepared clock, shelter and actors. No incident, route,
 * damage, attack or door passage has occurred before the first resumed tick. */
export function prepareManhunterDemo():World {
  const w=createWorld(201,32,32);
  w.tick=SMALL_INTRO_TICK-1;w.gameProfile=crashlandedProfile();
  w.scenario={id:'crashlanded',revision:8,landing:{x:10,z:16}};
  w.site=resolveSite(w.seed,{hilliness:'flat',biome:'temperate-forest'});
  enableCassandraRaids(w);consumeCassandraOpportunity(w,w.raids!);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  w.resources=[];w.piles=[];w.structures=[];w.jobs=[];w.packed=[];
  w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.events=[];
  adoptEnvironment(w);assert.equal(w.site.revision,2);if(w.site.revision===2)initializeWildFlora(w,w.site);
  for(const [i,p] of w.pawns.entries()){
    p.name=['Ada · dehors','Noé · abri','Mina · abri'][i]!;
    p.x=i===0?14:10;p.z=i===0?16:i===1?15:17;
    p.hunger=100;p.rest=100;p.recreation.level=100;p.health=createMedicalRecord(w.tick);
    p.schedule.fill('work');p.apparelAutomation=false;p.hostilityResponse='ignore';
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
    p.skills.melee={level:10,xp:0,dailyXp:0,passion:0};
  }
  // The outside colon has a prepared real weapon. Defense remains a command
  // and physical contact, rather than a precomputed injury or combat outcome.
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:w.pawns[0]!.id},'plasteel-knife');
  for(let z=13;z<=19;z++)for(let x=8;x<=12;x++){
    if(x!==8&&x!==12&&z!==13&&z!==19)continue;
    const door=x===12&&z===16;
    w.structures.push({id:w.nextId++,kind:door?'door':'wall',x,z,orientation:0,
      footprint:'standard',material:'wood',...(door?{door:newDoorState(w.tick)}:{})});
  }
  for(const z of [15,17])w.structures.push({id:w.nextId++,kind:'bed',x:9,z,orientation:0,footprint:'standard',quality:'normal'});
  w.roofing={constructed:[],build:[],remove:[],cursor:0};
  for(let z=14;z<=18;z++)for(let x=9;x<=11;x++)w.roofing.constructed.push(z*w.width+x);
  addGroundMaterial(w,'food',6,{x:10,z:16},'survival-meal');
  addGroundMaterial(w,'medicine',3,{x:10,z:18},'medicine');
  const biome=faunaBiome('temperate-forest',true),full=w.width*w.height*biome.animalDensity/10000;
  w.wildlife={profile:'biome-fauna-v2',rng:(w.seed^0x784caf31)>>>0||1,animals:[{
    id:w.nextId++,species:'hare',sex:'female',ageTicks:adultAgeTicks('hare'),x:19,z:16,
    food:animalSpecies('hare').nutrition,rest:1,state:'idle',path:[],nextDecision:w.tick+100,
    health:{...createMedicalRecord(w.tick),body:'hare'},
  }],eatenPlants:0,eatenNutrition:0,eatenItems:0,population:{biome:'temperate-forest',fullTargetWeight:full,
    targetWeight:full*biome.entries.reduce((sum,e)=>sum+e.commonality,0)/biome.totalCommonality,
    nextCheck:w.tick+122,checks:0,arrivals:0}};
  adoptFluIncidents(w);adoptMiscIncidents(w);adoptColonyEconomy(w);enableVisitors(w);
  adoptSmallIncidents(w);refreshStock(w);
  assert.equal(w.smallIncidents?.introDone,false);assert.equal(w.smallIncidents?.incidents,0);
  assert.equal(w.wildlife.animals[0]!.manhunter,undefined);
  assert.deepEqual(validateWorld(w),[]);return w;
}

export function manhunterDemoEntry(w:World,sha256:string){return {
  id:MANHUNTER_DEMO_ID,release:'v201',label:'Animal en rage · abri et défense',
  description:'Une introduction Cassandra préparée transforme un lièvre déjà présent après reprise. Observer poursuite, protection initiale de la porte et défense au contact, sans pirate.',
  filename:'animal-en-rage.json',pawns:w.pawns.length,colonists:w.pawns.length,width:w.width,height:w.height,tick:w.tick,
  focus:['animal en rage','poursuite physique','porte et abri','défense réelle','alerte et musique','sauvegarde et reprise'],
  steps:[
    'Charger en pause, juste avant J3,4. Ada est dehors en (14,16), équipée d’un couteau ; Noé et Mina sont dans l’abri (8–12,13–19), avec une porte fermée en (12,16). Le lièvre en (19,16) est sain et encore calme. Aucun pirate n’est présent.',
    'Reprendre à 1× : le prochain tick exerce la vraie introduction Cassandra. Le lièvre devient en rage, l’alerte permet son inspection et la musique passe en danger. Sauvegarder puis recharger pendant la poursuite : le chargement ne doit pas rejouer une nouvelle alerte sonore.',
    'Les trois réponses initiales sont Ignorer afin de laisser le choix au joueur. Dans l’inspection d’Ada, choisir Fuir ou demander un déplacement mobilisé vers l’intérieur (10,16) : observer les déplacements, l’ouverture physique et la fermeture réelle de la porte. Une porte fermée protège initialement les occupants ; rentrer pendant une poursuite peut provoquer quelques frappes de porte.',
    'Pour défendre Ada, choisir Attaquer dans sa réponse aux menaces, ou la mobiliser et demander Attaquer au corps à corps sur le lièvre. Observer approche, coups, récupération et dossiers Santé. Les blessures et la fin de rage doivent provenir des transitions réelles ; aucune victoire n’est préparée.',
  ],prepared:true,
  provenance:'Scène préparée 32×32 au schéma183, createWorld(201), horloge explicitement placée à20400−1 sans campagne simulée. Trois colons libres sains, besoins hauts, Mêlée10, travaux et habillement automatique désactivés, réponse Ignorer. Couteau de plasteel réellement équipé par Ada, six repas et trois médicaments au sol. Abri en bois construit, porte initialement fermée via newDoorState, deux lits normaux et toit soutenu. Un lièvre sauvage adulte sain déjà présent, profil tempéré et horloge de population cohérents ; aucune rage ou blessure préparée. Profil Cassandra partiel et agenda ThreatSmall adoptés prospectivement avant l’introduction, compteur nul. Le premier tick repris doit sélectionner cet animal réel via le producteur d’incident et startAnimalManhunter. Aucune poursuite, attaque, ouverture, récupération mentale ou défense déjà jouée ; aucun pirate, Scaria ou meute. Ce témoin ne prouve ni fréquence naturelle, campagne longue ou charge générale.',
  sha256,
};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-test-save-manhunter-v201.ts')){
  assert.equal(SCHEMA_VERSION,183,'Do not rewrite V201 under a later schema.');
  const w=prepareManhunterDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??MANHUNTER_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=manhunterDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);
    assert.equal(manifest.version,2);
    const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V201 entry differs; review before rewriting.');
    else{
      const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');
      writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));
    }
  }
  console.log(JSON.stringify({path:output,id:entry.id,tick:w.tick}));
}
