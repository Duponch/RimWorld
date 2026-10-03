import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/engine.ts';
import { enableWildlife } from '../src/sim/wildlife.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { Pawn,World } from '../src/sim/types.ts';

export function prepareWildlifeExitDemo():World {
  const w=createWorld(186,32,32);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.structures=[];w.jobs=[];w.packed=[];w.stockpiles=[];
  w.resources=[{id:w.nextId++,kind:'berries',x:12,z:12,amount:10,growth:1,growthTick:0}];
  enableWildlife(w,3);w.resources=[];
  for(let z=22;z<=26;z++)for(let x=22;x<=26;x++)if(x===22||x===26||z===22||z===26)
    w.structures.push({id:w.nextId++,kind:'wall',material:'wood',x,z,orientation:0,footprint:'standard'});
  const food=w.piles.filter(p=>p.kind==='food');assert.ok(food.length<=9);
  food.forEach((p,i)=>{p.owner={type:'ground',x:23+i%3,z:23+Math.floor(i/3)};});refreshStock(w);
  const [wild,healthy,pet]=w.wildlife!.animals;
  Object.assign(wild!,{x:12,z:12,food:0,rest:1,nextDecision:0});
  Object.assign(healthy!,{x:18,z:12,food:.18,rest:1,nextDecision:0});
  Object.assign(pet!,{x:12,z:18,food:0,rest:.2,state:'sleeping',nextDecision:0,
    domestic:{since:0,care:'none',tameness:5,nextDecay:6000}});
  for(const p of w.pawns){
    p.hunger=100;p.rest=100;p.recreation.level=100;p.schedule.fill('work');
    for(const work of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[work]=0;
    p.priorities.build=2;
  }
  assert.equal(w.wildlife!.exitedAnimals,undefined);assert.ok(w.wildlife!.animals.every(a=>!a.exiting));
  assert.deepEqual(validateWorld(w),[]);return w;
}

export function wildlifeExitDemoEntry(w:World,sha256:string){return {
  id:'faune-affamee-v186',release:'v186',label:'Faune affamée · 3 colons',
  description:'Une réserve fermée, un lièvre sauvage affamé, un sauvage rassasié et un domestique endormi : observer le départ réel ou rouvrir l’accès à la nourriture.',
  filename:'faune-affamee.json',pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['Faune','famine','sortie physique','réserve inaccessible','domestique','sauvegarde et reprise'],
  steps:['Charger en pause, ouvrir Faune, puis reprendre à 1× : le lièvre à 12,12 commence un trajet vers le bord, sans disparaître au centre.',
    'Sauvegarder pendant le trajet, recharger puis reprendre : observer un seul départ au bord et le domestique qui reste sur la carte.',
    'Pour une autre issue, recharger la scène initiale et déconstruire un mur de la réserve à 22–26,22–26 : la nourriture accessible peut annuler le départ au prochain contrôle.'],
  prepared:true,provenance:'Scène préparée 32×32 au schéma 174, graine186 : sol plat et réserve murée ajoutés explicitement, aliments existants déplacés derrière les murs, nutrition et propriété des trois lièvres préparées. Aucun départ, chemin, cadavre, consommation ni compteur précréé. Les trois colons conservent leurs identités ; ce scénario ne mesure pas la fréquence naturelle ni la charge 250×250.',sha256};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/generate-wildlife-exit-demo-v186.ts')){
  const w=prepareWildlifeExitDemo(),raw=serializeWorld(w),sha256=createHash('sha256').update(raw).digest('hex');
  mkdirSync('public/test-saves/v186',{recursive:true});writeFileSync('public/test-saves/v186/faune-affamee.json',raw);
  assert.deepEqual(deserializeWorld(raw),w);
  const manifest=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8'));
  manifest.saves=manifest.saves.filter((s:{id:string})=>s.id!=='faune-affamee-v186');manifest.saves.push(wildlifeExitDemoEntry(w,sha256));
  writeFileSync('public/test-saves/manifest.json',JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({path:'public/test-saves/v186/faune-affamee.json',sha256,entries:manifest.saves.length}));
}
