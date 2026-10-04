import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createWorld,applyCommand } from '../src/sim/engine.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type Pawn,type World } from '../src/sim/types.ts';

export const MINING_SKILLS_DEMO_ID='minage-competences-v204';
export const MINING_SKILLS_DEMO_PATH='public/test-saves/v204/minage-competences.json';
export const MINING_SKILLS_CELLS={
  noviceSteel:{x:15,z:10},neutralSteel:{x:15,z:14},expertSteel:{x:15,z:18},
  machinery:{x:19,z:14},rock:{x:17,z:22},steelStore:{x:22,z:10},componentStore:{x:22,z:14},
} as const;

/** Explicitly prepared materials and profiles. No designation, reservation,
 * approach, stroke, XP or extracted product is granted by this scene. */
export function prepareMiningSkillsDemo():World {
  const w=createWorld(204,32,32);w.tick=3000;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];
  w.jobs=[];w.packed=[];w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.events=[];
  delete w.wildlife;delete w.worldIncidents;delete w.smallIncidents;delete w.miscIncidents;
  delete w.heatwaves;delete w.visitors;delete w.weather;delete w.raids;delete w.arrivals;
  for(const [i,p] of w.pawns.entries()){
    p.name=['Ada · débutante','Noé · spécialiste','Mina · experte'][i]!;
    p.x=8;p.z=10+i*4;p.hunger=100;p.rest=100;p.recreation.level=100;
    p.health=createMedicalRecord(w.tick);p.schedule.fill('work');p.apparelAutomation=false;
    p.needCooldown=0;p.planCooldown=0;
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
    p.priorities.haul=2;
    p.skills.mining={level:[0,8,20][i]!,xp:0,dailyXp:0,passion:([0,1,2] as const)[i]!};
  }
  for(const c of [MINING_SKILLS_CELLS.noviceSteel,MINING_SKILLS_CELLS.neutralSteel,MINING_SKILLS_CELLS.expertSteel])w.tiles[c.z*w.width+c.x]={terrain:'rock',stone:'granite',ore:'steel'};
  w.tiles[MINING_SKILLS_CELLS.machinery.z*w.width+MINING_SKILLS_CELLS.machinery.x]={terrain:'rock',stone:'slate',ore:'machinery'};
  w.tiles[MINING_SKILLS_CELLS.rock.z*w.width+MINING_SKILLS_CELLS.rock.x]={terrain:'rock',stone:'granite'};
  for(const command of [
    {type:'stockpile',...MINING_SKILLS_CELLS.steelStore,enabled:true,filters:{wood:false,food:false,steel:true},priority:2,capacity:75},
    {type:'stockpile',...MINING_SKILLS_CELLS.componentStore,enabled:true,filters:{wood:false,food:false,component:true},priority:2,capacity:75},
  ] as const){const result=applyCommand(w,command);assert.equal(result.ok,true,result.reason);}
  addGroundMaterial(w,'food',9,{x:6,z:18},'survival-meal');
  addGroundMaterial(w,'wood',50,{x:6,z:20},'wood');refreshStock(w);
  assert.equal(w.jobs.length,0);assert.ok(w.pawns.every(p=>p.skills.mining!.xp===0&&p.jobId===null));
  assert.ok(w.piles.every(p=>p.item!=='steel'&&p.item!=='component'));
  assert.deepEqual(validateWorld(w),[]);return w;
}

export function miningSkillsDemoEntry(w:World,sha256:string){return {
  id:MINING_SKILLS_DEMO_ID,release:'v204',label:'Minage et compétences · 3 colons',
  description:'Comparer Minage 0, 8 et 20 sur des gisements physiques. Observer approche, coups, apprentissage, rendement, transport et usage des métaux, puis sauvegarder pendant un coup.',
  filename:'minage-competences.json',pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['compétence Minage','vitesse et capacités','rendement pondéré','apprentissage au contact','acier et composants','transport physique','construction existante','sauvegarde et reprise'],
  steps:[
    'Charger en pause. Dans Bio, consulter Ada Minage 0 sans passion, Noé Minage 8 avec passion et Mina Minage 20 avec passion brûlante ; survoler leurs lignes pour la vitesse, le rendement et l’XP. Dans Travail, activer Minage pour le colon choisi : aucun gisement n’est encore désigné.',
    'Avec Architecte → Ordres → Miner, désigner l’acier en (15,10), (15,14) ou (15,18), puis reprendre. Observer le trajet avant les vrais coups : ni la désignation ni la marche n’accordent d’XP. Désactiver les autres mineurs pour comparer les profils séparément ; des mineurs successifs contribuent au rendement pondéré d’un même gisement.',
    'La machinerie compactée se trouve en (19,14), la roche naturelle en (17,22). Les composants et l’acier produits doivent être pris au contact puis déposés dans leurs réserves (22,14) et (22,10). Un fragment de roche demande un ordre Transporter les fragments et une réserve qui l’accepte.',
    'Activer Construction et construire un ouvrage en acier ou un générateur au bois avec les métaux réellement extraits ; le bois50 en (6,20) peut alimenter le générateur. Sauvegarder et recharger pendant un coup rapide puis après les dépôts : progression, profils, contributions et ressources doivent continuer sans duplication.',
  ],prepared:true,
  provenance:'Scène préparée 32×32, createWorld(204), schéma186, horloge placée à3000 sans campagne simulée. Trois colons sains en (8,10)/(8,14)/(8,18), besoins hauts, profils Minage0/8/20 et passions0/1/2 choisis explicitement, XP nulle ; aucune biographie Core revendiquée. Sol herbe dégagé, trois gisements d’acier intacts, une machinerie intacte et une roche de granite intacte ajoutés pour comparer les travaux. Deux réserves filtrées, neuf repas et cinquante bois physiques au sol ; aucun acier ou composant offert. Seul Transport2 est actif, autres travaux à commander, habillement automatique et incidents naturels exclus. Aucune désignation, réserve de travail, approche, préparation de coup, contribution, extraction, apprentissage ou fabrication déjà réalisée. Cette scène ne prouve ni distribution naturelle des profils/gisements, campagne longue ni charge générale250².',sha256,
};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-mining-skills-v204-test-save.ts')){
  assert.equal(SCHEMA_VERSION,186,'Do not rewrite V204 under a later schema.');
  const w=prepareMiningSkillsDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??MINING_SKILLS_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=miningSkillsDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);
    assert.equal(manifest.version,2);const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V204 entry differs; review before rewriting.');
    else{assert.equal(manifest.saves.length,49);const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');
      writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));}
  }
  console.log(JSON.stringify({path:output,entry}));
}
