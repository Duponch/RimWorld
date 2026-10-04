import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createWorld } from '../src/sim/engine.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { addGroundMaterial,addMaterial,refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type Pawn,type World } from '../src/sim/types.ts';

export const SANDBAGS_DEMO_ID='sacs-sable-v207';
export const SANDBAGS_DEMO_PATH='public/test-saves/v207/sacs-sable.json';
export const SANDBAGS_CELLS={cover:{x:12,z:12},cloth:{x:10,z:14},builder:{x:10,z:15},defender:{x:13,z:12},shooter:{x:6,z:12}} as const;

/** Construction and every impact remain prospective player actions. Two
 * equipped allies permit deliberate target practice without a spawned raid. */
export function prepareSandbagsDemo(seed=207):World {
  const w=createWorld(seed,32,32);w.tick=3000;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];
  w.jobs=[];w.packed=[];w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.events=[];
  delete w.wildlife;delete w.worldIncidents;delete w.smallIncidents;delete w.miscIncidents;
  delete w.heatwaves;delete w.visitors;delete w.weather;delete w.raids;delete w.arrivals;
  delete w.filth;delete w.roofing;delete w.home;
  const positions=[SANDBAGS_CELLS.builder,SANDBAGS_CELLS.defender,SANDBAGS_CELLS.shooter];
  for(const [i,p] of w.pawns.entries()){
    Object.assign(p,positions[i]);p.name=['Ada · bâtisseuse','Noé · défenseur','Mina · tireuse'][i]!;
    p.hunger=100;p.rest=100;p.recreation.level=100;p.health=createMedicalRecord(w.tick);
    p.schedule.fill('work');p.apparelAutomation=false;p.needCooldown=0;p.planCooldown=0;p.bedId=null;
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  }
  w.pawns[0]!.skills.construction={level:8,xp:0,dailyXp:0,passion:0};
  for(const p of w.pawns.slice(1)){
    p.skills.shooting={level:8,xp:0,dailyXp:0,passion:0};
    addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');
  }
  addGroundMaterial(w,'textile',5,SANDBAGS_CELLS.cloth,'cloth');refreshStock(w);
  assert.equal(w.structures.length,0);assert.equal(w.jobs.length,0);assert.equal(w.projectiles,undefined);
  assert.deepEqual(validateWorld(w),[]);return w;
}

export function sandbagsDemoEntry(w:World,sha256:string){return {
  id:SANDBAGS_DEMO_ID,release:'v207',label:'Sacs de sable · construction et couvert',
  description:'Livrer cinq tissus, construire le couvert bas, observer de vrais tirs dirigés puis réparer ses impacts dans le foyer.',
  filename:'sacs-sable.json',pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['livraison physique','couvert directionnel','tir réel','dégâts','passage lent','réparation','sauvegarde et reprise'],
  steps:[
    'Charger en pause. Architecte → Structure → Sacs de sable : poser une case en (12,12). Dans Travail, activer Construction 1 pour Ada. Reprendre : les cinq tissus en (10,14) sont pris et livrés avant les 18 ticks neutres de construction.',
    'Mobiliser Noé et Mina, désactiver leur tir à volonté et les placer respectivement en (13,12) et (6,12). Noé peut tirer vers Mina depuis derrière son sac ; arrêter ensuite son ordre. Attention : ce sont deux alliés, leurs tirs peuvent réellement les blesser.',
    'Sélectionner Mina → Tirer sur une cible → Noé. Le sac immédiatement devant Noé peut intercepter les projectiles venant de l’ouest. Reprendre jusqu’à un impact sur le sac puis mettre en pause et arrêter le tir. Aucun premier impact ni protection intégrale n’est garanti.',
    'Sauvegarder le couvert endommagé et recharger. Architecte → Zones → Zone de foyer : inclure (12,12). Ada répare réellement au contact sans tissu supplémentaire ; sauvegarder pendant la réparation puis à sa finition.',
  ],prepared:true,
  provenance:`Scène préparée 32×32, createWorld(${w.seed}), schéma 189, tick 3000 sans campagne simulée. Trois adultes libres sains, besoins à 100, travaux désactivés ; Construction 8 pour Ada, Tir 8 pour Noé et Mina, deux revolvers existants équipés. Cinq tissus au sol et aucun sac, plan, livraison, tir, dégât, foyer ou réparation fournis. Incidents exclus. Couvert local tissu seul ; autres textiles, barricades et défenses exhaustives différés. Tirs et interceptions probabilistes réels, sans flux PRNG choisi pour garantir une première réussite. Scène préparée distincte d’une campagne naturelle ou d’un coût CPU/GPU général sur 250².`,sha256,
};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-sandbags-v207-test-save.ts')){
  assert.equal(SCHEMA_VERSION,189,'Do not rewrite V207 under a later schema.');
  const w=prepareSandbagsDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??SANDBAGS_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=sandbagsDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);
    assert.equal(manifest.version,2);const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V207 entry differs; review before rewriting.');
    else{assert.equal(manifest.saves.length,52);const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');
      writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));}
  }
  console.log(JSON.stringify({path:output,entry}));
}
