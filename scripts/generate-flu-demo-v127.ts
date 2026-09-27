import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {acquireFlu} from '../src/sim/flu-state.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {blockedCells} from '../src/sim/pathfinding.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';

const fixtureUrl=new URL('../public/test-saves/v127/grippe.json',import.meta.url);
const manifestUrl=new URL('../public/test-saves/manifest.json',import.meta.url);

/** Prepared medical state on a real Crashlanded start. The disease is staged
 * expressly for inspection; no claim that Cassandra chose it on landing. */
export function prepareFluDemo():World {
  const world=createScenarioWorld(4871,64,'crashlanded',{hilliness:'small-hills',biome:'temperate-forest'});
  const [minor,major,doctor]=world.pawns;
  assert.ok(minor&&major&&doctor);
  const blocked=blockedCells(world),occupied=new Set(world.pawns.map(p=>p.z*world.width+p.x));
  for(const resource of world.resources)occupied.add(resource.z*world.width+resource.x);
  for(const pile of world.piles)if(pile.owner.type==='ground')occupied.add(pile.owner.z*world.width+pile.owner.x);
  for(const patient of [minor,major]){
    let placed=false;
    for(let radius=2;radius<=10&&!placed;radius++)for(let dz=-radius;dz<=radius&&!placed;dz++)for(let dx=-radius;dx<=radius&&!placed;dx++){
      const x=patient.x+dx,z=patient.z+dz;
      if(x<2||z<2||x>=world.width-2||z>=world.height-3)continue;
      const cells=[z*world.width+x,(z+1)*world.width+x];
      if(cells.some(i=>blocked[i]||occupied.has(i)))continue;
      world.structures.push({id:world.nextId++,kind:'bed',x,z,orientation:0,footprint:'standard',quality:'normal',material:'wood',medical:true});
      cells.forEach(i=>occupied.add(i));placed=true;
    }
    assert.ok(placed,'Two physical medical beds must fit near the landing.');
  }
  // Beds are a prepared construction, paid from the actual wood piles.
  let woodCost=90;
  for(const pile of world.piles)if(pile.item==='wood'&&pile.owner.type==='ground'&&woodCost){const n=Math.min(pile.quantity,woodCost);pile.quantity-=n;woodCost-=n;}
  assert.equal(woodCost,0);
  world.piles=world.piles.filter(p=>p.quantity>0);
  refreshStock(world);
  for(const [pawn,severity,immunity] of [[minor,180_000_000,90_000_000],[major,690_000_000,510_000_000]] as const){
    pawn.health??=createMedicalRecord(world.tick);
    assert.ok(acquireFlu(pawn.health,1_000_000));
    pawn.health.flu!.severity=severity;
    pawn.health.flu!.immunity=immunity;
    pawn.medicalCare='best';
    pawn.priorities.patient=1;
  }
  doctor.priorities.doctor=1;
  assert.ok(world.piles.some(pile=>pile.item==='medicine'&&pile.quantity>0));
  assert.deepEqual(validateWorld(world),[]);
  return world;
}

export function fluManifestEntry(world:World,sha256:string){
  const [minor,major,doctor]=world.pawns;
  return {
    id:'grippe-v127',release:'v127',label:'Grippe et soins · 3 colons',
    description:'Deux colons présentent une grippe préparée à des stades différents ; deux lits médicaux payés en bois et les médicaments physiques permettent les soins.',
    filename:'grippe.json',pawns:world.pawns.length,colonists:3,
    width:world.width,height:world.height,tick:world.tick,
    focus:['grippe','immunité','soins','médecine','repos','humeur'],
    steps:[
      `Sélectionner ${minor!.name} puis ${major!.name} près du site (${minor!.x}, ${minor!.z}) : comparer gravité et immunité dans Santé et la pensée dans Besoins.`,
      `Sélectionner ${doctor!.name} : vérifier Médecine/Travail, puis reprendre pour que les patients gagnent les lits et que le médecin cherche physiquement un médicament.`,
      'Suivre le repos médical, la gravité et l’immunité pendant la convalescence.',
      'Sauvegarder, recharger et vérifier que les jauges, le soin et le calendrier d’incidents continuent sans nouveau tirage.',
    ],
    prepared:true,
    provenance:'Départ Atterrissage forcé 64×64 créé par le moteur, puis deux grippes et deux lits médicaux préparés explicitement au tick zéro pour permettre un essai immédiat. Le narrateur ne les a pas tirées ; les lits coûtent 90 bois des piles initiales, et les médicaments et personnages sont ceux du départ physique normal.',
    sha256,
  };
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  assert.equal(Number(SCHEMA_VERSION),127,'V127 scene generator only; preserve this fixture after schema advances.');
  const world=prepareFluDemo(),raw=serializeWorld(world);
  const sha256=createHash('sha256').update(raw).digest('hex');
  mkdirSync(dirname(fileURLToPath(fixtureUrl)),{recursive:true});
  writeFileSync(fixtureUrl,raw);
  const manifest=JSON.parse(readFileSync(manifestUrl,'utf8')) as {version:number;saves:{id:string}[]};
  assert.equal(manifest.version,2);
  manifest.saves=manifest.saves.filter(save=>save.id!=='grippe-v127');
  manifest.saves.push(fluManifestEntry(world,sha256));
  writeFileSync(manifestUrl,JSON.stringify(manifest,null,2)+'\n');
  assert.deepEqual(deserializeWorld(raw),world);
  process.stdout.write(JSON.stringify({fixture:fileURLToPath(fixtureUrl),sha256,tick:world.tick})+'\n');
}
