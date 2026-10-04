import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { prepareSolarFlareDemo } from '../tests/helpers/solar-flare-v202-fixture.ts';
import { deserializeWorld,serializeWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';
export { prepareSolarFlareDemo } from '../tests/helpers/solar-flare-v202-fixture.ts';
export const SOLAR_FLARE_DEMO_ID='eruption-solaire-v202';
export const SOLAR_FLARE_DEMO_PATH='public/test-saves/v202/eruption-solaire.json';
export function solarFlareDemoEntry(w:World,sha256:string){return {
  id:SOLAR_FLARE_DEMO_ID,release:'v202',label:'Éruption solaire · réserves et secours',
  description:'Une occasion mondiale préparée coupe progressivement les consommateurs. Observer batteries sans transfert, sources au bois, froid, lumière, serre et reprise ordinaire.',
  filename:'eruption-solaire.json',pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['éruption solaire','délestage progressif','batteries','combustible réel','froid et conservation','lumière et serre','secours au bois','sauvegarde et reprise'],
  steps:[
    'Charger en pause au tick 90099, juste avant un contrôle mondial préparé. La lampe horticole (13,14), la lampe ordinaire (9,8) et le climatiseur (10,6) sont alimentés après quarante ticks réels de démarrage. La serre et la réserve ont un toit physique ; trois générateurs à droite brûlent leur bois.',
    'Reprendre à 1× : le prochain tick déclenche la vraie occasion mondiale. Ouvrir la lettre puis inspecter les appareils et la batterie (19,16). Les consommateurs s’arrêtent progressivement ; la batterie conserve sa réserve sans charge ni décharge du réseau, avec autodécharge normale. Un toit ne protège pas de l’éruption.',
    'Surveiller le riz sous toit et les aliments dans la réserve : lumière, croissance et froid suivent l’alimentation réelle. Le feu de camp (5,16), le refroidisseur passif (9,14), la cuisinière à bois (3,22), le tailleur manuel (9,24) et le bureau simple (14,24) sont des secours existants. Le passif ne congèle pas. Les travaux sont désactivés : les recettes et les gestes restent à commander physiquement.',
    'Sauvegarder et recharger pendant la condition puis reprendre. Après sa vraie expiration, observer le retour ordinaire des appareils, sans rattrapage de croissance ni énergie offerte. Pour économiser le bois avant la fin, demander l’arrêt d’un générateur et activer Tâches élémentaires dans Travail : un colon doit rejoindre son interrupteur.',
  ],prepared:true,
  provenance:'Scène préparée 32×32 au schéma 184, createWorld(202), horloge explicitement placée à 90059 sans campagne préalable. Trois colons sains, besoins hauts, travaux et habillement automatique désactivés. Deux pièces en bois réellement couvertes, portes fermées, climatiseur cible −5 °C, trois générateurs avec chacun 75 bois préparés, douze conduits et batterie initialement chargée de 400 W·j. Lampe horticole, lampe ordinaire, trois riz à 30 %, dix riz alimentaires, six repas de survie, quarante bois et trente tissus au sol. Recherches Batteries, Climatisation et Vêtements complexes explicitement achevées avant préparation ; aucun travail de recherche revendiqué. Site tempéré plat, calendrier de flore vide initialisé et profil Atterrissage/Cassandra partiel avec ses agendas distincts. Feu de camp, refroidisseur passif et cuisinière au bois alimentés, établi manuel, bureau simple et couture électrique existants sans facture. Quarante vrais ticks stepWorld produisent les démarrages, la combustion, le froid et le régime de croissance antérieurs au contrôle : retour au tick 90099. Agenda mondial adopté prospectivement, prochain contrôle 90100, checks/opportunities/flares nuls ; seul son PRNG futur est préparé à 2472303839, permettant une sélection solaire puis une durée Core de 9000. Aucune éruption active, extinction solaire, issue de travail ou reprise déjà préparée. Cette scène ne prouve ni fréquence naturelle, campagne longue ni charge générale 250×250.',sha256,
};}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-test-save-solar-flare-v202.ts')){
  assert.equal(SCHEMA_VERSION,184,'Do not rewrite V202 under a later schema.');
  const w=prepareSolarFlareDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??SOLAR_FLARE_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=solarFlareDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);
    assert.equal(manifest.version,2);const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V202 entry differs; review before rewriting.');
    else {assert.equal(manifest.saves.length,47);const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');
      writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));}
  }
  console.log(JSON.stringify({path:output,entry}));
}
