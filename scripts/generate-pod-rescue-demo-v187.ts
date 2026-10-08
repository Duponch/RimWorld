import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/engine.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { resolveSelectedPodRescue } from '../src/sim/pod-rescue.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { Pawn,World } from '../src/sim/types.ts';

/** Prepared physical care supplies, no patient/admission/healing fabricated. */
export function preparePodRescueDemo():World {
  const w=createWorld(187,32,32);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];w.jobs=[];w.packed=[];w.stockpiles=[];
  for(const [i,p] of w.pawns.entries()){
    p.x=15+i;p.z=20;p.hunger=100;p.rest=100;p.recreation.level=100;p.schedule.fill('work');
    for(const work of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[work]=0;
    p.priorities.doctor=i===0?1:0;p.skills.medicine.level=i===0?12:0;
  }
  w.structures.push({id:w.nextId++,kind:'bed',x:16,z:16,orientation:0,footprint:'standard',quality:'normal',medical:true});
  addGroundMaterial(w,'food',12,{x:18,z:17},'simple-meal');
  addGroundMaterial(w,'medicine',12,{x:18,z:18},'herbal-medicine');
  refreshStock(w);assert.ok(resolveSelectedPodRescue(w,4871));
  // This generator reproduces the immutable V187 scene, before independent rescuees.
  delete w.podRescues!.pending!.origin;
  assert.equal(w.podRescues!.incidents.length,0);assert.deepEqual(validateWorld(w),[]);return w;
}
export function podRescueDemoEntry(w:World,sha256:string){const c=w.podRescues!.pending!.cell;return {
  id:'secours-capsule-v187',release:'v187',label:'Capsule civile et secours · 3 colons',
  description:'Une capsule arrive, avec un lit médical, un médecin, des repas et des doses proches : décider du secours, observer le portage, les soins et la récupération.',
  filename:'secours-capsule.json',pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['capsule civile','secours direct','portage','soins','alimentation','repos médical','départ physique'],
  steps:[`Reprendre à 1× : la capsule tombe en ${c.x},${c.z}, puis un civil blessé apparaît après ouverture. Aucun colon ne le secourt automatiquement.`,
    'Sélectionner le premier colon, puis clic droit sur le naufragé : Secourir. Observer la prise et le portage jusqu’au lit médical en 16,16.',
    'Sélectionner le naufragé pour inspecter Santé. Après dépôt, le médecin peut apporter une dose réelle et traiter les blessures ; le régime et le plafond médical deviennent réglables.',
    'Sauvegarder pendant le portage ou les soins, recharger puis reprendre. Le civil reste extérieur, se repose même après son relèvement et repart par la bordure une fois rétabli.'],
  prepared:true,provenance:'Scène préparée 32×32 au schéma 175, graine187 : terrain aplani, lit médical et provisions ajoutés explicitement, priorités et positions des trois colons préparées. Le producteur réel crée uniquement une capsule en attente ; ni civil, blessure, admission, soin ni départ ne sont précréés. Ne mesure pas la fréquence naturelle ni la charge 250×250.',sha256};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/generate-pod-rescue-demo-v187.ts')){
  const w=preparePodRescueDemo(),raw=serializeWorld(w),sha256=createHash('sha256').update(raw).digest('hex');
  mkdirSync('public/test-saves/v187',{recursive:true});writeFileSync('public/test-saves/v187/secours-capsule.json',raw);
  assert.deepEqual(deserializeWorld(raw),w);
  const manifest=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8'));
  manifest.saves=manifest.saves.filter((s:{id:string})=>s.id!=='secours-capsule-v187');manifest.saves.push(podRescueDemoEntry(w,sha256));
  writeFileSync('public/test-saves/manifest.json',JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({path:'public/test-saves/v187/secours-capsule.json',cell:w.podRescues!.pending!.cell,sha256,entries:manifest.saves.length}));
}
