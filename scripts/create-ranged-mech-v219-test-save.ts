import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { prepareScytherDemo,scytherPreparedThreat,SCYTHER_OPPORTUNITY_TICK,SCYTHER_CELLS } from './create-scyther-v213-test-save.ts';
import { chooseMechanoidOpportunity } from '../src/sim/mechanoid-raids.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { adoptColonyEconomy } from '../src/sim/colony-economy.ts';
import { captureWorldShotGrid } from '../src/sim/combat-world.ts';
import { findShotLine } from '../src/sim/combat-space.ts';
import { mechanoidRangedProfile } from '../src/sim/mechanoid-ranged-profile.ts';
import { MINI_TURRET_PROFILE } from '../src/sim/mini-turret-profile.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type Structure,type World } from '../src/sim/types.ts';

export const RANGED_MECH_DEMO_ID='ranged-mech-v219';
export const RANGED_MECH_DEMO_PATH='public/test-saves/v219/ranged-mech.json';
export const RANGED_MECH_PREPARED_RNG=27;
export const RANGED_MECH_INITIAL_CELLS=[{x:24,z:19},{x:26,z:19},{x:25,z:20}] as const;
export const RANGED_MECH_SHELTER={minX:23,maxX:29,minZ:16,maxZ:21,
  entry:{x:23,z:20},exposed:{x:22,z:20},return:{x:24,z:19}} as const;

/** Reuses the declared V213 clearing and intact workshops; does not replay its
 * historical save or run combat. The new ticket belongs to this preparation. */
export function prepareRangedMechDemo(seed=219):World {
  const w=prepareScytherDemo(seed),policy=w.raids!.mechanoid!;
  const before={rng:w.rng,stock:{...w.stock}};
  assert.equal(w.pawns.length,RANGED_MECH_INITIAL_CELLS.length);
  for(const [i,p] of w.pawns.entries())Object.assign(p,RANGED_MECH_INITIAL_CELLS[i]!);
  assert.deepEqual(w.pawns.map(p=>({x:p.x,z:p.z})),RANGED_MECH_INITIAL_CELLS);
  // Prepared initial positions and intact eastern enclosure only for V219.
  // Existing generator, workshops, supplies and defense lanes stay outside.
  // No roof, construction work, delivery, damage or clinical result is played.
  const enclosure:Structure[]=[];
  const {minX,maxX,minZ,maxZ,entry}=RANGED_MECH_SHELTER;
  for(let z:number=minZ;z<=maxZ;z++)for(let x:number=minX;x<=maxX;x++){
    if(x!==minX&&x!==maxX&&z!==minZ&&z!==maxZ)continue;
    assert.equal(w.tiles[z*w.width+x]?.terrain,'grass',`Unsuitable shelter terrain at ${x},${z}.`);
    assert.ok(!w.structures.some(s=>footprintCells(s).some(c=>c.x===x&&c.z===z))
      &&!w.pawns.some(p=>p.x===x&&p.z===z)&&!w.resources.some(r=>r.x===x&&r.z===z)
      &&!w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z)
      &&!w.packed.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z),`Occupied shelter perimeter at ${x},${z}.`);
    const kind=x===entry.x&&z===entry.z?'door':'wall';
    const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'wood',
      ...(kind==='door'?{door:newDoorState(w.tick)}:{})};
    enclosure.push(s);w.structures.push(s);
  }
  assert.equal(enclosure.filter(s=>s.kind==='wall').length,21);
  assert.deepEqual(enclosure.find(s=>s.kind==='door')?.door,newDoorState(w.tick));
  assert.ok(w.pawns.every(p=>p.x>minX&&p.x<maxX&&p.z>minZ&&p.z<maxZ));
  for(const cell of [...RANGED_MECH_INITIAL_CELLS,RANGED_MECH_SHELTER.exposed]){
    assert.equal(w.tiles[cell.z*w.width+cell.x]?.terrain,'grass');
    assert.ok(!w.structures.some(s=>footprintCells(s).some(c=>c.x===cell.x&&c.z===cell.z))
      &&!w.resources.some(r=>r.x===cell.x&&r.z===cell.z)
      &&!w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===cell.x&&p.owner.z===cell.z)
      &&!w.packed.some(p=>p.owner.type==='ground'&&p.owner.x===cell.x&&p.owner.z===cell.z),`Occupied initial/exposure cell at ${cell.x},${cell.z}.`);
  }
  const grid=captureWorldShotGrid(w),approaches=[{x:8,z:31},{x:9,z:31}];
  for(const from of approaches)for(const kind of ['lancer','pikeman'] as const){
    const range=mechanoidRangedProfile(kind)!.range;
    assert.ok(findShotLine(grid,from,{cell:RANGED_MECH_SHELTER.exposed,leans:true},range).ok,`${kind} exposure line is blocked.`);
    for(const p of w.pawns)assert.equal(findShotLine(grid,from,{cell:p,leans:true},range).ok,false,`${p.name} is exposed through the closed shelter.`);
    for(const gun of [SCYTHER_CELLS.leftGun,SCYTHER_CELLS.rightGun]){
      assert.ok(findShotLine(grid,from,{cell:gun,leans:false},range).ok,`${kind} line to a turret is blocked.`);
      assert.ok(findShotLine(grid,gun,{cell:from,leans:true},MINI_TURRET_PROFILE.range,0,false).ok,'Turret defense line is blocked.');
    }
  }
  assert.equal(w.rng,before.rng);assert.deepEqual(w.stock,before.stock);
  // The helper adopted its census before this new enclosure existed. Re-adopt
  // at the same preparation tick to count the actual buildings, not old wealth.
  delete w.economy;assert.equal(adoptColonyEconomy(w),true);
  assert.ok(scytherPreparedThreat(w).points>300);
  assert.equal(w.rng,before.rng);assert.deepEqual(w.stock,before.stock);
  assert.deepEqual(policy.ranged,{adoptedAt:w.tick});
  policy.rng=RANGED_MECH_PREPARED_RNG;
  const choice=chooseMechanoidOpportunity({...w,tick:SCYTHER_OPPORTUNITY_TICK},scytherPreparedThreat(w).points,{rng:policy.rng});
  assert.ok(choice?.roster.includes('lancer')&&choice.roster.includes('pikeman'),'Prepared ranged ticket must expose both real races.');
  assert.equal(w.mechanoids,undefined);assert.equal(w.projectiles,undefined);
  assert.equal(w.mechSalvage,undefined);assert.equal(w.raids!.mechActive,undefined);
  assert.equal(w.piles.some(p=>p.mechCorpse),false);
  assert.deepEqual(validateWorld(w),[]);return w;
}

export function rangedMechDemoEntry(w:World,sha256:string){return {
  id:RANGED_MECH_DEMO_ID,release:'v219',label:'Lancier et Piquier · tirs et récupération',filename:'ranged-mech.json',
  description:'Protéger trois colons dans un abri préparé, observer une sortie exposée face aux machines, défendre avec les tourelles puis récupérer les carcasses par les ateliers physiques.',
  pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['adoption prospective','abri et sortie exposée','deux corps mécaniques','visée et récupération Core','projectiles réels','défense électrique','carcasses et acier','sauvegarde en cours'],
  steps:[
    'Charger en pause, dix ticks avant une occasion Cassandra préparée au jour45. Mobiliser les trois colons en(24,19),(26,19),(25,20), dans l’abri est déjà construit, porte fermée en(23,20). La richesse et le ticket privé sont déclarés ; aucun Lancier ou Piquier n’est encore arrivé. Reprendre à vitesse1, puis mettre en pause après l’annonce mécanique.',
    'Après l’arrivée réelle, déplacer Ada seule vers(22,20), par la porte ouest, pour observer une vraie visée et une balle en vol, puis ordonner son retour en(24,19). Les deux artisans restent abrités. Sélectionner chaque race : corps de30 ou20 parties, vraie portée, cible et phase de tir. Examiner les silhouettes en vue isométrique et rapprochée. Les tourelles retiennent encore leur feu.',
    'Lever Retenir le feu sur les tourelles en(15,16) et(17,16), puis reprendre. Les tirs, les interceptions, les blessures et la neutralisation restent à produire. Les armes intrinsèques ne créent aucun canon transportable.',
    'Après une neutralisation réelle et la récupération engagée, inspecter la carcasse. Démobiliser un artisan apte, ajouter Broyer un mécanoïde à l’atelier d’usinage en(20,21), puis Prioriser. Collecte, passage de porte, portage, travail et sortie d’acier restent physiques. Concassage est aussi disponible en(11,21).',
    'Sauvegarder pendant une vraie préparation, récupération, balle en vol ou collecte ; recharger et poursuivre ce monde. Les anciennes factures conservent leurs filtres : autoriser explicitement les nouvelles carcasses si nécessaire.',
  ],prepared:true,
  provenance:`Nouvelle scène préparée32×32, createScenarioWorld(${w.seed},32,'crashlanded', site tempéré plat), schéma${w.schemaVersion}, tick${w.tick}. Clairière, appareils et fournitures réutilisent la fonction de préparation V213 ; aucun payload historique réécrit. Cette seule préparation V219 ajoute une enceinte est non couverte déjà construite x23..29,z16..21 :21murs enbois et1porte manuelle intacte fermée en(23,20). Ses positions initiales propres sont(24,19),(26,19),(25,20), différentes de V213, sans téléportation runtime. Générateur, ateliers, tourelles et stocks gardent leurs empreintes et quantités horsabri. Sortie exposée proposée(22,20), retour(24,19), sans déplacement préjoué. Biographies actuelles, graphes familiaux exclus de cette exposition mécanique ; calendriers obligatoires de grippe/panne réadoptés au tick préparé. Occasion future${SCYTHER_OPPORTUNITY_TICK}, politique mécanique et permission ranged adoptées à${w.tick}, ticket privé déclaré${RANGED_MECH_PREPARED_RNG} ; aucun tirage de combat préjoué. Richesse10000ors physiques et enceinte réellement recensée au tick préparé, menace${scytherPreparedThreat(w).points}points ; deux tourelles intactes à60coups au feu retenu, générateur75bois, ateliers vides,75aciers et18rations au sol ; aucun stock ajouté ou consommé pour cette géométrie initiale. Aucun acteur, projectile, blessure, carcasse, livraison ou acier de récupération préjoué. La préparation ne prouve ni fréquence naturelle, victoire, validation native ou coût CPU/GPU général.`,sha256,
};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-ranged-mech-v219-test-save.ts')){
  assert.equal(SCHEMA_VERSION,197,'Do not rewrite V219 under a later schema.');
  const w=prepareRangedMechDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??RANGED_MECH_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=rangedMechDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);assert.equal(manifest.version,2);
    const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V219 entry differs; review before rewriting.');
    else{assert.ok(manifest.saves.length<64);const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));}
  }
  console.log(JSON.stringify({path:output,threat:scytherPreparedThreat(w),entry}));
}
