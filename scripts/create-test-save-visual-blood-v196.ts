import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { applyCommand,createWorld } from '../src/sim/engine.ts';
import { injurePawn } from '../src/sim/health.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { appearanceOf } from '../src/sim/pawn-appearance.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { ANIMAL_SPECIES_IDS,animalSpecies,faunaBiome,type AnimalSpeciesId } from '../src/sim/animal-species.ts';
import { animalBodyModel } from '../src/sim/body-model.ts';
import { damageAnimalWithBullet } from '../src/sim/wildlife-health.ts';
import { advanceCorpses } from '../src/sim/corpses.ts';
import { addFilth } from '../src/sim/filth.ts';
import { COMPLEX_FURNITURE_RESEARCH_COST } from '../src/sim/research.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type Pawn,type StructureKind,type World } from '../src/sim/types.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';

export const VISUAL_BLOOD_DEMO_ID='sang-depouilles-douleur-v196';
export const VISUAL_BLOOD_DEMO_PATH='public/test-saves/v196/sang-depouilles-douleur.json';

/** Specimen chart only: injuries use medical producers and original animal
 * identities pass through the real death/corpse boundary. Nothing claims a
 * played combat, ecological distribution or elapsed colony campaign. */
export function prepareVisualBloodDemo():World {
  const world=createWorld(196,32,32);
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.piles=[];world.structures=[];world.jobs=[];world.packed=[];
  world.stockpiles=[];world.growingZones=[];world.growingCursor=0;
  // Explicit specimen preparation, following the habitat-apparel fixture:
  // constructed armchairs remain subject to the ordinary research validator.
  assert.equal(applyCommand(world,{type:'research-project',project:null}).ok,true);
  world.research!.complexFurniture={points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:world.tick};
  for(const [index,pawn] of world.pawns.entries()) {
    pawn.x=index===2?18:6+index*4;pawn.z=index===2?27:23;
    pawn.hunger=index===0?29:100;pawn.rest=100;pawn.recreation.level=100;
    pawn.health=createMedicalRecord(world.tick);pawn.schedule.fill('work');pawn.apparelAutomation=false;
    for(const work of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[work]=0;
    const sex=index===1?'male':'female';
    pawn.appearance={...appearanceOf(pawn,world.seed),sex,bodyType:sex==='male'?'Male':'Female',
      headType:sex==='male'?'Male_AverageWide':'Female_AverageNormal',beard:sex==='male'?'Full':'NoBeard'};
    pawn.name=index===0?'Ada · femme':index===1?'Noé · homme':'Mina · mobilier';
  }
  injurePawn(world,world.pawns[0]!,'left-arm','cut',4000);
  injurePawn(world,world.pawns[1]!,'right-arm','cut',4000);
  assert.equal(world.pawns[0]!.state,'idle');assert.equal(world.pawns[1]!.state,'idle');

  const biome=faunaBiome('temperate-forest',true),full=world.width*world.height*biome.animalDensity/10000;
  world.wildlife={profile:'biome-fauna-v2',rng:(world.seed^0x784caf31)>>>0||1,animals:[],
    eatenPlants:0,eatenNutrition:0,eatenItems:0,population:{biome:'temperate-forest',fullTargetWeight:full,
      targetWeight:full*biome.entries.reduce((sum,entry)=>sum+entry.commonality,0)/biome.totalCommonality,
      nextCheck:world.tick+122,checks:0,arrivals:0}};
  const specimen=(species:AnimalSpeciesId,x:number,z:number,sleeping=false):WildAnimal=>({
    id:world.nextId++,species,sex:'female',ageTicks:adultAgeTicks(species),x,z,
    food:animalSpecies(species).nutrition,rest:sleeping?.6:1,state:'idle',path:[],nextDecision:world.tick+100,
    health:{...createMedicalRecord(world.tick),body:species},
    ...(species==='dromedary'?{domestic:{since:world.tick,care:'none' as const,tameness:5,nextDecay:world.tick+6000,productFullness:0}}:{}),
  });
  for(const [column,species] of ANIMAL_SPECIES_IDS.entries()) {
    const x=4+column*4;
    // Snow hare is tied to tundra and cannot be domesticated. Do not relax the
    // biome validator just to put all seven living species into one save.
    if(species!=='snow-hare')for(const [z,sleeping] of [[6,false],[11,true]] as const) {
      const animal=specimen(species,x,z,sleeping);world.wildlife.animals.push(animal);
      damageAnimalWithBullet(world,animal,{part:'torso',damage:1});
      assert.equal(animal.state,'idle');
      if(sleeping)animal.state='sleeping'; // disclosed initial sleeping pose, not a clinical change
    }
    const animal=specimen(species,x,16);world.wildlife.animals.push(animal);
    damageAnimalWithBullet(world,animal,{part:'heart',damage:animalBodyModel(species).byId.heart.hp});
    assert.equal(animal.state,'dead');assert.ok(animal.health?.death);
    advanceCorpses(world);
    const corpse=world.piles.find(pile=>pile.id===animal.id);
    assert.equal(corpse?.corpse?.species,species);assert.equal(corpse?.owner.type,'ground');
    assert.ok(!world.wildlife.animals.some(live=>live.id===animal.id));
    assert.equal(corpse?.corpse?.health,animal.health);
    assert.ok(addFilth(world,{x,z:16},'blood',3));
  }
  for(const cell of [{x:5,z:22},{x:6,z:23},{x:8,z:23},{x:10,z:23},{x:12,z:22}])assert.ok(addFilth(world,cell,'blood',3));

  const structure=(kind:StructureKind,x:number,z:number,orientation:0|1=0)=>{
    const building={id:world.nextId++,kind,x,z,orientation,footprint:'standard' as const,quality:'normal' as const};
    world.structures.push(building);return building;
  };
  structure('table',6,25,1);structure('dining-chair',6,24);structure('stool',7,24);structure('armchair',5,25);
  structure('bed',11,25);
  addGroundMaterial(world,'food',6,{x:5,z:23},'survival-meal');
  addGroundMaterial(world,'medicine',6,{x:12,z:23},'medicine');
  // Water walls form a dead-end corridor open to the west. Walking to (28,27)
  // physically crosses the three seats and the two-cell table, without a
  // cheaper detour. No route, seat reservation or dining action is granted.
  for(let z=26;z<=28;z++)for(let x=18;x<=30;x++)if(z!==27||x===30)world.tiles[z*world.width+x]={terrain:'water'};
  structure('stool',21,27);structure('dining-chair',22,27);structure('table',23,27,1);structure('armchair',25,27);
  const command=applyCommand(world,{type:'stockpile',x:3,z:19,enabled:true,filters:{wood:false,food:false,corpse:true},priority:2,capacity:1});
  assert.equal(command.ok,true,command.reason);
  refreshStock(world);
  assert.equal(world.pawns.length,3);assert.equal(world.piles.filter(pile=>pile.corpse).length,7);
  assert.equal(world.wildlife.animals.length,12);assert.deepEqual(validateWorld(world),[]);
  return world;
}

export function visualBloodDemoEntry(world:World,sha256:string){return {
  id:VISUAL_BLOOD_DEMO_ID,release:'v196',label:'Sang, dépouilles et douleur · 3 colons',
  description:'Comparer sang sur herbe et corps, pelages vivants/endormis/morts, vrais sièges et passage du mobilier au sol. Les blessures initiales sont préparées ; les sons exigent de nouveaux coups.',
  filename:'sang-depouilles-douleur.json',pawns:world.pawns.length,colonists:3,width:world.width,height:world.height,tick:world.tick,
  focus:['sang au sol et sur herbe','blessures anatomiques','pelage et dépouilles','douleur humaine et animale','repas assis','passage du mobilier','pause et reprise'],
  steps:[
    'Charger en pause. Colonnes x4/8/12/16/20/24/28 : lièvre, lièvre des neiges, cerf, muffalo, gazelle, dromadaire, renard. Vivants à z6, sommeil à z11, dépouilles fraîches à z16. Le lièvre des neiges apparaît uniquement en dépouille : son vivant est limité à la toundra par les règles existantes. Comparer modèles, proportions, fourrure, couleurs et yeux avec les textures activées puis désactivées.',
    'Ada (femme) en (6,23) et Noé (homme) en (10,23) portent chacun une coupure préparée de 4 PV à un bras. Inspecter Santé et les traces, puis les cellules de sang dans la prairie. Le chargement de ces blessures ne doit pas jouer un nouveau râle ; leurs soins et besoins restent réels après reprise.',
    'Reprendre à 1× : Ada a faim (29) et six repas de survie sont au sol en (5,23). Observer collecte, approche de la table et assise réelle. Aucun repas, trajet ou siège n’est déjà réservé. Les trois types de siège se trouvent autour de la table (6,25) ; le lit (11,25) reste disponible pour un repos médical ordinaire après activation des priorités appropriées.',
    'Pour le passage, mobiliser Mina en (18,27), puis demander le déplacement vers (28,27). Le couloir est ouvert à l’ouest, bordé d’eau, avec tabouret, chaise, table 1×2 et fauteuil. Observer les pieds au niveau de marche et les délais logiques, puis faire pause, sauvegarder et recharger en cours de trajet.',
    'Pour les dépouilles portées, demander à un colon le transport réel d’un corps depuis la rangée z16 vers la réserve Corps (3,19). Aucun corps n’est préattribué à un porteur. Observer collecte, pelage porté, dépôt, puis sauvegarde et reprise.',
    'Pour l’écoute, recharger le témoin, mobiliser Mina et choisir Attaquer au corps à corps dans son inspection, puis cliquer Noé pour la prise masculine ou Ada pour la prise féminine. Reprendre à 1× et arrêter l’ordre après le premier contact. Recharger entre prises. Le même ciblage sur un lièvre sauvage de z6 permet la douleur animale. Ces coups sont à accomplir ; les plaies préparées au chargement ne prouvent ni une émission nouvelle ni une écoute humaine.',
  ],prepared:true,
  provenance:'Scène préparée 32×32 au schéma182, createWorld(196), tick0. Trois colons libres adultes : Ada femme blessée bras gauche, Noé homme blessé bras droit, Mina femme saine pour le couloir. Profils visuels de sexe cohérents préparés ; besoins hauts sauf faim29 d’Ada ; tous travaux et habillement automatique désactivés. Coupures humaines4PV via injurePawn, aucun champ clinique arbitraire ni maladie. Douze animaux adultes femelles en comparaison debout/sommeil, blessure extérieure1PV via damageAnimalWithBullet : six espèces légales sur carte tempérée, dromadaire domestique explicitement importé, six poses de sommeil et repos0,6 préparés. Sept morts par destruction réelle du cœur au producteur anatomique, propagation extérieure conservée puis advanceCorpses au sol avec identité originale, dossier figé et rot0 ; le lièvre des neiges n’est jamais adopté comme vivant tempéré. Douze dépôts de sang physiques via addFilth, épaisseur3, indépendamment préparés sans revendiquer un saignement naturel. Recherche Mobilier complexe achevée explicitement à tick0 pour les fauteuils ; mobilier/table/lit construits préparés, couloir d’eau, six repas de survie et six médicaments au sol, une réserve Corps. Aucun contact de repas, soin, trajet, coup audible futur, transport ou consommation déjà accompli. Le témoin sert aux comparaisons et contrôles manuels ; il ne démontre ni chronologie de combat jouée, campagne naturelle, parité exhaustive ou coût général.',
  sha256,
};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-test-save-visual-blood-v196.ts')){
  assert.equal(SCHEMA_VERSION,182,'Do not rewrite V196 under a later schema.');
  const world=prepareVisualBloodDemo(),raw=serializeWorld(world),output=process.argv[2]??VISUAL_BLOOD_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),world);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=visualBloodDemoEntry(world,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);
    assert.equal(manifest.version,2);assert.equal(manifest.saves.filter((save:{id:string})=>save.id!==entry.id).length,45);
    // Append without reserializing any historical entry: their text bytes remain
    // identical, including the V195 reference immediately preceding this one.
    const existing=manifest.saves.some((save:{id:string})=>save.id===entry.id);
    if(existing)assert.deepEqual(manifest.saves.find((save:{id:string})=>save.id===entry.id),entry,'V196 entry already differs; review before rewriting.');
    else {
      const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');
      const prefix=before.slice(0,close).trimEnd();
      writeFileSync(path,prefix+',\n'+formatted+'\n'+before.slice(close));
    }
  }
  console.log(JSON.stringify({path:output,entry}));
}
