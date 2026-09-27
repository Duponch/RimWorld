import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exchangeSocial } from '../src/sim/social.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

const sourceUrl=new URL('../public/test-saves/v124/rencontre.json',import.meta.url);
const fixtureUrl=new URL('../public/test-saves/v134/mots-gentils.json',import.meta.url);
const manifestUrl=new URL('../public/test-saves/manifest.json',import.meta.url);

export function prepareSocialTraitsDemo():World {
  const world=deserializeWorld(readFileSync(sourceUrl,'utf8'));
  const [ada,basile]=world.pawns;
  assert.ok(ada&&basile&&ada.name==='Ada'&&basile.name==='Basile');
  ada.traits=['kind'];basile.traits=['abrasive','bloodlust'];
  assert.equal(exchangeSocial(world,ada,basile,'kind-words'),true);
  assert.deepEqual(validateWorld(world),[]);
  return world;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  assert.equal(SCHEMA_VERSION,134,'Do not rewrite the V134 reference under a later schema.');
  const world=prepareSocialTraitsDemo(),raw=serializeWorld(world);
  const sha256=createHash('sha256').update(raw).digest('hex');
  mkdirSync(dirname(fileURLToPath(fixtureUrl)),{recursive:true});
  writeFileSync(fixtureUrl,raw);
  const manifest=JSON.parse(readFileSync(manifestUrl,'utf8')) as {version:number;saves:{id:string;[key:string]:unknown}[]};
  assert.equal(manifest.version,2);
  manifest.saves=manifest.saves.filter(save=>save.id!=='mots-gentils-v134');
  manifest.saves.push({
    release:'v134',id:'mots-gentils-v134',label:'Mots gentils et disputes · 2 colons',
    description:'Ada aimable a adressé des mots gentils à Basile incisif et sanguinaire ; opinion, humeur et traits sont inspectables immédiatement.',
    filename:'mots-gentils.json',pawns:2,colonists:2,width:world.width,height:world.height,tick:world.tick,
    focus:['trait Aimable','trait Incisif','trait Sanguinaire','mots gentils','opinion et humeur','bagarre sociale'],
    steps:[
      'Sélectionner Ada et ouvrir Bio pour voir le trait Aimable ; sélectionner Basile pour voir Incisif et Sanguinaire.',
      'Ouvrir Social puis Besoins de Basile : les mots gentils d’Ada ont laissé une opinion et une humeur distinctes.',
      'Reprendre la partie : les échanges futurs et les éventuelles bagarres sont décidés normalement selon ces dispositions.',
    ],prepared:true,
    provenance:'Copie préparée de la scène V124, sans modifier son fichier : seuls trois traits et un échange physique déjà effectué sont ajoutés. La fréquence future et une bagarre ne sont pas préécrites.',
    sha256,
  });
  writeFileSync(manifestUrl,JSON.stringify(manifest,null,2)+'\n');
  assert.deepEqual(deserializeWorld(raw),world);
  process.stdout.write(JSON.stringify({fixture:fileURLToPath(fixtureUrl),sha256,tick:world.tick})+'\n');
}
