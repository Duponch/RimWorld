import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type Pawn,type Structure,type World } from '../src/sim/types.ts';

export const FAMILY_DEMO_ID='family-v214';
export const FAMILY_DEMO_PATH='public/test-saves/v214/proches-et-chambre.json';
// This creation seed yields the family generator's independent initial RNG=1.
// The generated link is a pre-existing couple, never a romance played here.
export const FAMILY_DEMO_SEED=0x214c016;
export const FAMILY_OFFER_TICK=10;
export const FAMILY_BED_CELLS=[{x:12,z:12},{x:15,z:12}] as const;

export function familyDemoCouple(w:World):readonly [Pawn,Pawn]{
  const link=w.relationships?.links.find(link=>link.kind==='lover'||link.kind==='spouse');
  assert.ok(link,'The actual new-game family producer must provide the prepared pre-existing couple.');
  const a=w.pawns.find(p=>p.id===link.aId),b=w.pawns.find(p=>p.id===link.bId);assert.ok(a&&b);return [a,b];
}

/** A future welcome opportunity and an unassigned room. No offer, admission,
 * romance, breakup, injury, death or shared sleeping result is supplied. */
export function prepareFamilyDemo():World{
  const w=createScenarioWorld(FAMILY_DEMO_SEED,32,'survivors');
  assert.equal(w.tick,0);assert.equal(w.pawns.length,3);familyDemoCouple(w);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.jobs=[];w.packed=[];w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.events=[];
  delete w.wildlife;delete w.raids;delete w.heatwaves;delete w.filth;delete w.home;
  for(const [i,p] of w.pawns.entries()){
    p.name=['Ada','Noé','Mina'][i]!;p.x=12+i*2;p.z=14;p.hunger=100;p.rest=100;p.recreation.level=100;
    p.schedule.fill('anything');p.bedId=null;p.apparelAutomation=false;
    for(const work of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[work]=0;
  }
  const building=(kind:Structure['kind'],x:number,z:number):Structure=>({id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'wood',
    ...kind==='bed'?{quality:'normal' as const}:{},...kind==='door'?{door:newDoorState(w.tick)}:{}});
  for(let x=10;x<=18;x++)w.structures.push(building('wall',x,10),building(x===14?'door':'wall',x,16));
  for(let z=11;z<16;z++)w.structures.push(building('wall',10,z),building('wall',18,z));
  w.structures.push(...FAMILY_BED_CELLS.map(cell=>building('bed',cell.x,cell.z)));
  const roof:number[]=[];for(let z=11;z<16;z++)for(let x=11;x<18;x++)roof.push(z*w.width+x);
  w.roofing={constructed:roof,build:[],remove:[],cursor:0};
  let ground=0;for(const pile of w.piles)if(pile.owner.type==='ground'){pile.owner={type:'ground',x:22+ground%5,z:18+Math.floor(ground/5)};ground++;}
  assert.ok(w.arrivals&&!w.arrivals.pending);w.arrivals.rng=1;w.arrivals.nextCheck=FAMILY_OFFER_TICK;
  refreshStock(w);assert.deepEqual(validateWorld(w),[]);return w;
}

export function familyDemoEntry(w:World,sha256:string){
  const couple=familyDemoCouple(w);
  return {id:FAMILY_DEMO_ID,release:'v214',label:'Proches · accueil et chambre commune',filename:'proches-et-chambre.json',
    description:'Accueillir un proche annoncé par une occasion future, consulter les liens et les deux avis réels, puis attribuer deux lits dans une chambre commune.',
    pawns:3,colonists:3,width:w.width,height:w.height,tick:w.tick,
    focus:['offre apparentée future','entrée réelle','liens neutres','opinions dirigées','logement du couple','clavier','sauvegarde et reprise'],
    steps:[
      'Charger en pause au tick 0. Aucun voyageur n’est annoncé ou admis. Reprendre à vitesse 1 jusqu’à la demande d’accueil préparée, puis mettre en pause.',
      'Ouvrir la lettre au clavier : lire le proche et son statut avant de répondre. Accueillir la personne puis ouvrir Social des deux proches ; le lien suit son sens réel et les deux avis restent distincts.',
      `Consulter Besoins de ${couple[0].name} : le couple préexistant n’a pas encore de lits attribués. Sélectionner les lits en (12,12) et (15,12), attribuer un lit à chaque partenaire puis vérifier la pensée de logement. La chambre n’est pas un lit double.`,
      'Lire aussi les liens dans Bio, en perspective et en isométrique. Sauvegarder puis recharger : conserver personnes, annonce, liens, propriétaires des lits et état réel du monde.',
    ],prepared:true,
    provenance:`Création Survivants actuelle createScenarioWorld(${FAMILY_DEMO_SEED},32,'survivors'), schéma 195, tick 0. Graine de création préparée pour le flux familial indépendant initial 1 ; couple préexistant issu de initializeCampRelationships, aucune romance jouée. Clairière 32×32, réserves de départ déplacées au sol libre et vêtements conservés, chambre close avec toiture et deux lits civils non attribués préparés. Autres menaces/faune facultatives exclues ; aucune horloge clinique décalée. Calendrier d’accueil prospectif existant : prochaine occasion tick ${FAMILY_OFFER_TICK}, RNG privé 1 préparé ; aucune offre, personne entrante ni lien de l’offre engagé initialement. Aucun sommeil commun, blessure, mort, rupture, souvenir amoureux ou familial préjoué. La préparation ne certifie ni fréquence naturelle, parcours natif ni coût général.`,sha256};
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-family-v214-test-save.ts')){
  assert.equal(SCHEMA_VERSION,195,'Do not rewrite V214 under a later schema.');
  const w=prepareFamilyDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??FAMILY_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=familyDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);assert.equal(manifest.version,2);
    const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V214 entry differs; review before rewriting.');
    else{assert.ok(manifest.saves.length<64);const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));}
  }
  console.log(JSON.stringify({path:output,entry}));
}
