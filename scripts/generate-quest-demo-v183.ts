import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApparelWearCalendar,APPAREL_POLICY_INTERVAL} from '../src/sim/apparel-renewal.ts';
import {newBreakdownCalendar} from '../src/sim/breakdowns.ts';
import {consumeCassandraOpportunity,enableCassandraRaids} from '../src/sim/cassandra-raids.ts';
import {adoptMiscIncidents} from '../src/sim/cassandra-misc.ts';
import {adoptColonyEconomy} from '../src/sim/colony-economy.ts';
import {adoptEnvironment} from '../src/sim/environment-step.ts';
import {adoptFluIncidents} from '../src/sim/flu-incidents.ts';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {enableQuests,advanceQuests} from '../src/sim/quests.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type Pawn,type World} from '../src/sim/types.ts';
import {enableVisitors} from '../src/sim/visitors.ts';
import {initializeWildFlora} from '../src/sim/wild-flora.ts';
import {enableBiomeWildlife} from '../src/sim/wildlife.ts';

const fixtureUrl=new URL('../public/test-saves/v183/asile-et-poursuite.json',import.meta.url);
export const QUEST_DEMO_SEED=13313;

/** Advance the prepared civil date, not its history. Prospective owners are
 * adopted at that date; no missed raid, disease, visit or wildlife roll is paid. */
function prepareClock(world:World,tick:number):void {
  world.tick=tick;
  delete world.climate;delete world.weather;delete world.wind;delete world.fires;
  assert.equal(adoptEnvironment(world),true);
  delete world.flora;assert.ok(world.site?.revision===2);initializeWildFlora(world,world.site);
  delete world.wildlife;enableBiomeWildlife(world,world.site.biome);
  delete world.raids;enableCassandraRaids(world);
  consumeCassandraOpportunity(world,world.raids!); // Consumes the missed intro without creating its raid.
  delete world.fluIncidents;adoptFluIncidents(world);
  delete world.miscIncidents;delete world.heatwaves;adoptMiscIncidents(world);
  delete world.visitors;enableVisitors(world);
  delete world.economy;adoptColonyEconomy(world);
  world.breakdown=newBreakdownCalendar(world.seed,world.tick);
  world.apparelWear=createApparelWearCalendar(world.tick,(world.seed^world.tick^0x0a77e1)>>>0);
  for(const pawn of world.pawns){
    if(pawn.nextApparelCheckAt!==undefined)pawn.nextApparelCheckAt=world.tick+APPAREL_POLICY_INTERVAL.min+pawn.id%(APPAREL_POLICY_INTERVAL.max-APPAREL_POLICY_INTERVAL.min+1);
    if(pawn.health&&!pawn.health.death)pawn.health.tick=world.tick;
    pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;
    pawn.schedule.fill('work');pawn.needCooldown=0;pawn.planCooldown=0;
    for(const work of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[work]=0;
  }
}

export function prepareQuestDemo():World {
  const world=createScenarioWorld(QUEST_DEMO_SEED,250,'crashlanded',{hilliness:'small-hills',biome:'arid-shrubland'});
  assert.equal(world.pawns.length,3);
  enableQuests(world);
  const due=world.quests!.nextCheck;
  prepareClock(world,due);
  assert.equal(world.quests!.entries.length,0);
  assert.equal(world.raids!.active,undefined);
  advanceQuests(world);
  const offer=world.quests!.entries.at(-1);
  assert.equal(offer?.status,'offered','The public scene must contain a real scheduled offer.');
  assert.equal(world.raids!.active,undefined);
  assert.equal(world.pawns.length,3,'The asylum seeker is not pre-generated.');
  assert.deepEqual(validateWorld(world),[]);
  return world;
}

export function questDemoManifestEntry(world:World,sha256:string){
  const offer=world.quests!.entries.at(-1)!;
  return {
    id:'asile-et-poursuite-v183',release:'v183',label:'Asile et poursuite · 3 colons',
    description:`${offer.name} demande asile. Dans Quêtes, examinez ses compétences et la poursuite annoncée, puis acceptez ou refusez avant l’expiration.`,
    filename:'asile-et-poursuite.json',pawns:world.pawns.length,colonists:3,width:world.width,height:world.height,tick:world.tick,
    focus:['Quêtes','asile','offre','réfugié poursuivi','raid physique','sauvegarde et reprise'],
    steps:[
      'Ouvrir Quêtes depuis la lettre dans les alertes ; lire le profil, la menace et les délais, puis accepter l’asile.',
      'Reprendre à 1× : attendre l’entrée réelle du nouveau colon avec sa chemise, puis sauvegarder et charger avant l’arrivée du raid.',
      'Observer l’unique bandit au couteau arriver par une bordure admissible. Défendre la colonie avec les commandes ordinaires.',
      'Après le raid, vérifier la conclusion neutre de la quête, l’identité du colon et le bilan séparé de l’assaut.',
    ],
    prepared:true,
    provenance:`Départ Atterrissage/Cassandra Core adapté, graine ${QUEST_DEMO_SEED}, broussailles arides naturelles 250 × 250, schéma 172. Horloge préparée prospectivement au premier contrôle de la quête ; autres calendriers réadoptés à cette date sans résolution rétroactive. L’offre est créée par advanceQuests, sans colon, possession ni raid précréés. Acceptation, arrivée au bord, poursuite et conclusion exigent les commandes et transitions réelles après chargement. Aucun butin ni verdict de victoire de quête n’est promis.`,
    sha256,
  };
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  assert.equal(SCHEMA_VERSION,172,'Write V183 only with strict schema 172.');
  const world=prepareQuestDemo(),raw=serializeWorld(world),sha256=createHash('sha256').update(raw).digest('hex');
  mkdirSync(dirname(fileURLToPath(fixtureUrl)),{recursive:true});
  writeFileSync(fixtureUrl,raw);
  assert.deepEqual(deserializeWorld(raw),world);
  process.stdout.write(JSON.stringify({fixture:fileURLToPath(fixtureUrl),sha256,tick:world.tick,entry:questDemoManifestEntry(world,sha256)})+'\n');
}
