import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { commercialDemoCamp } from '../tests/helpers/commercial-demo-v193.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

export const COMMERCIAL_DEMO_ID='expedition-commerciale-v193';
export const COMMERCIAL_DEMO_CANDIDATE='tmp/v193/expedition-commerciale.json';

/** No command or tick has been executed: loading, exit, post generation,
 * purchases, ration consumption, return and unloading remain player actions. */
export function prepareCommercialDemo():World {
  const {world}=commercialDemoCamp();assert.deepEqual(validateWorld(world),[]);
  assert.equal(world.commercialTrip,undefined);assert.equal(world.civilianPost,undefined);
  return world;
}

export function commercialDemoEntry(world:World,sha256:string){return {
  id:COMMERCIAL_DEMO_ID,release:'v193',label:'Expédition commerciale · 3 colons',
  description:'Charger réellement trois rations et de l’argent, envoyer Ada au comptoir civil, acheter médicaments et composants puis rapporter et déposer les biens.',
  filename:'expedition-commerciale.json',pawns:world.pawns.length,colonists:3,width:world.width,height:world.height,tick:world.tick,
  focus:['chargement physique','argent embarqué','sortie et retour','comptoir civil','devis et achats','poids','déchargement','sauvegarde et reprise'],
  steps:[
    'Charger en pause puis ouvrir Monde · commerce. Choisir Ada, trois repas de survie et 600 argent. Les rations et l’argent sont encore au sol.',
    'Reprendre : Ada rejoint chaque source, charge son inventaire et marche jusqu’au bord. Sauvegarder pendant le chargement ; l’identité et les possessions doivent être conservées.',
    'Après trois heures de trajet abstrait, l’arrivée au comptoir met en pause. Choisir médicaments et composants dans le stock réellement apparu et confirmer le devis ; acheter ne déclenche pas le retour.',
    'Repartir explicitement, ou reprendre le temps pour un départ automatique après une heure au comptoir. Fermer Monde ou sauvegarder ne déclenche aucun départ.',
    'Après trois heures de retour, observer la même Ada rentrer et décharger physiquement argent, rations et achats. Les vêtements et armes déjà portés compteraient dans la limite de 35 kg.',
  ],prepared:true,
  provenance:'Scène préparée 32×32 au schéma 180 à partir de medicalCamp/commercialDemoCamp, graine 42 et tick 3000. Terrain grass dégagé, trois colons adultes libres ; travaux désactivés, repos et récréation 100 %, faim de Basile/Céleste 100 % et d’Ada 35 % pour observer un repas réel pendant le circuit. Ada en (4,12), quatre repas de survie au sol en (5,12), 500 argent au sol en (8,12) et 100 en (9,12), autres résidents en (10,16)/(12,16). Dossiers médicaux sains, automatisme vestimentaire désactivé ; animaux et incidents naturels exclus de ce contrôle borné. Aucun voyage, manifeste, route, inventaire chargé, stock de comptoir, achat, ration consommée, retour ou dépôt accordé. Pas de planète, rencontre, acquisition naturelle, campagne ni preuve de charge 250×250.',
  sha256,
};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-test-save-commercial-v193.ts')){
  assert.equal(SCHEMA_VERSION,180,'Do not rewrite the V193 reference under a later schema.');
  const world=prepareCommercialDemo(),raw=serializeWorld(world);assert.deepEqual(deserializeWorld(raw),world);
  const output=process.argv[2]??COMMERCIAL_DEMO_CANDIDATE;
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  console.log(JSON.stringify({path:output,entry:commercialDemoEntry(world,createHash('sha256').update(raw).digest('hex'))}));
}
