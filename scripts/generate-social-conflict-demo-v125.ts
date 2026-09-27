import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {startSocialFight} from '../src/sim/social-fight.ts';
import {exchangeSocial} from '../src/sim/social.ts';
import {insultMoodMemories,opinionOf} from '../src/sim/social-state.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';

const sourceUrl=new URL('../public/test-saves/v124/rencontre.json',import.meta.url);
const fixtureUrl=new URL('../public/test-saves/v125/insulte-bagarre.json',import.meta.url);
const manifestUrl=new URL('../public/test-saves/manifest.json',import.meta.url);

/** The two V124 participants remain physical actors; the insult is exchanged
 * by the simulator, then a physical fight is deliberately staged if its rare
 * spontaneous roll did not trigger. No historical fixture is rewritten. */
export function prepareSocialConflictDemo():World {
  const world=deserializeWorld(readFileSync(sourceUrl,'utf8'));
  assert.equal(world.schemaVersion,125);
  const [ada,basile]=world.pawns;
  assert.ok(ada&&basile);
  assert.ok(exchangeSocial(world,ada,basile,'insult'));
  if(!ada.social?.fight)assert.ok(startSocialFight(world,ada,basile));
  assert.equal(ada.social?.fight?.opponentId,basile.id);
  assert.equal(basile.social?.fight?.opponentId,ada.id);
  assert.ok(opinionOf(basile,ada.id,world.tick)<0);
  assert.deepEqual(insultMoodMemories(basile,world.tick).map(m=>m.offset),[-5]);
  assert.deepEqual(validateWorld(world),[]);
  return world;
}

export function conflictManifestEntry(world:World,sha256:string) {
  return {
    id:'insulte-bagarre-v125',release:'v125',label:'Insulte et bagarre · 2 colons',
    description:'Basile vient de subir une insulte d’Ada et les deux colons sont engagés dans une bagarre physique ; inspecter opinion, humeur et blessures après reprise.',
    filename:'insulte-bagarre.json',pawns:world.pawns.length,colonists:2,
    width:world.width,height:world.height,tick:world.tick,
    focus:['insulte','opinion','humeur','bagarre','blessures'],
    steps:[
      'Sélectionner Basile près de (16, 16) : vérifier l’insulte dans Social et la pensée temporaire dans Besoins.',
      'Reprendre la partie : Ada et Basile se déplacent, échangent des coups de mêlée et peuvent être blessés.',
      'Après la fin de la bagarre, inspecter leurs opinions réciproques, leurs blessures et les soins ordinaires.',
    ],
    prepared:true,
    provenance:'Scène V125 préparée depuis la sauvegarde historique V124 sans la modifier. Une insulte est effectuée par la simulation ; la bagarre est déclenchée explicitement avec les règles physiques du moteur si le tirage spontané ne l’a pas déjà déclenchée. Les coups, blessures et effets de fin de bagarre se produisent seulement après reprise.',
    sha256,
  };
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  assert.equal(Number(SCHEMA_VERSION),125,'V125 scene generator only; preserve this fixture after schema advances.');
  const world=prepareSocialConflictDemo(),raw=serializeWorld(world);
  const sha256=createHash('sha256').update(raw).digest('hex');
  mkdirSync(dirname(fileURLToPath(fixtureUrl)),{recursive:true});
  writeFileSync(fixtureUrl,raw);
  const manifest=JSON.parse(readFileSync(manifestUrl,'utf8')) as {version:number;saves:{id:string}[]};
  assert.equal(manifest.version,2);
  manifest.saves=manifest.saves.filter(save=>save.id!=='insulte-bagarre-v125');
  manifest.saves.push(conflictManifestEntry(world,sha256));
  writeFileSync(manifestUrl,JSON.stringify(manifest,null,2)+'\n');
  assert.deepEqual(deserializeWorld(raw),world);
  process.stdout.write(JSON.stringify({fixture:fileURLToPath(fixtureUrl),sha256,tick:world.tick})+'\n');
}
