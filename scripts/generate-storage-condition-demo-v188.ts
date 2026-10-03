import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import { applyCommand,createWorld } from '../src/sim/engine.ts';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { newWeaponState } from '../src/sim/equipment-rules.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { structureMaxHp } from '../src/sim/thing-damage-rules.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { Pawn,Structure,World } from '../src/sim/types.ts';

export const STORAGE_DEMO_LOW=[{x:10,z:12},{x:11,z:12},{x:12,z:12}] as const;
export const STORAGE_DEMO_HIGH=[{x:20,z:12},{x:21,z:12},{x:22,z:12}] as const;

/** Explicit initial supplies and policies; no pickup, delivery or installation
 * is fabricated. The right-hand range must be changed by the player. */
export function prepareStorageConditionDemo():World {
  const w=createWorld(188,32,32);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];w.jobs=[];w.packed=[];w.stockpiles=[];
  for(const [i,p] of w.pawns.entries()){
    p.x=15+i;p.z=20;p.hunger=100;p.rest=100;p.recreation.level=100;p.schedule.fill('work');p.apparelAutomation=false;
    for(const work of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[work]=0;
    p.priorities.haul=i===0?1:0;
  }
  for(const [cells,quality,hitPoints,priority] of [
    [STORAGE_DEMO_LOW,{min:'awful',max:'poor'},{min:0,max:69},1],
    [STORAGE_DEMO_HIGH,{min:'excellent',max:'legendary'},{min:90,max:100},3],
  ] as const)for(const c of cells)assert.ok(applyCommand(w,{type:'stockpile',enabled:true,...c,
    filters:{wood:false,food:false,apparel:true,weapon:true,furniture:true},capacity:1,priority,quality,hitPoints}).ok);
  for(const [z,quality,percent] of [[16,'poor',45],[18,'good',80]] as const){
    w.piles.push({id:w.nextId++,kind:'apparel',item:'cloth-shirt',quantity:1,owner:{type:'ground',x:14,z},
      apparel:{...newApparelState('cloth-shirt'),quality,hitPoints:percent}});
    w.piles.push({id:w.nextId++,kind:'weapon',item:'revolver',quantity:1,owner:{type:'ground',x:16,z},
      weapon:{...newWeaponState('revolver'),quality,hitPoints:percent}});
    const building:Structure={id:w.nextId++,kind:'bed',material:'wood',x:18,z,orientation:0,footprint:'standard',quality};
    building.damage=structureMaxHp(building)-Math.round(structureMaxHp(building)*percent/100);
    w.packed.push({building,owner:{type:'ground',x:18,z}});
  }
  refreshStock(w);assert.deepEqual(validateWorld(w),[]);return w;
}

export function storageConditionDemoEntry(w:World,sha256:string){return {
  id:'tri-reserves-v188',release:'v188',label:'Tri des réserves · 3 colons',
  description:'Deux réserves, des chemises, des revolvers et des lits emballés : régler qualité et points de vie, puis observer le transport réel et sa reprise.',
  filename:'tri-reserves.json',pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['stockage','qualité','points de vie','vêtements','armes','meubles emballés','portage','sauvegarde et reprise'],
  steps:['Charger en pause : les six objets sont au sol entre les deux réserves. Ada est seule affectée au Transport ; aucun objet n’a déjà été rangé.',
    'Inspecter les trois cases de droite, en 20–22,12 : appliquer une qualité de normal à légendaire et des points de vie de 70 à 100 %. Les trois cases de gauche acceptent déplorable à médiocre, de 0 à 69 %.',
    'Reprendre à 1× : observer les chemises, armes et lits emballés transportés vers la réserve qui les admet. Leur qualité et leur état ne changent pas pendant le tri.',
    'Sauvegarder pendant un portage, recharger puis reprendre. Les mêmes objets arrivent au sol, sans copie ni perte ; les lits restent emballés et peuvent ensuite être réinstallés.'],
  prepared:true,provenance:'Scène préparée 32×32 au schéma 176, graine 188 : terrain aplani, deux rectangles de réserve de trois cases, six objets au sol ajoutés explicitement (deux chemises, deux revolvers, deux lits en bois emballés). Qualités médiocre/bon et PV voisins de 45/80 % ; les lits utilisent leurs PV entiers réels. Besoins, positions et priorités des trois colons préparés, habillement automatique désactivé. Aucun trajet, réservation, transport achevé, installation ou compteur crédité. Ne démontre ni campagne autonome ni charge 250×250.',sha256};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/generate-storage-condition-demo-v188.ts')){
  const w=prepareStorageConditionDemo(),raw=serializeWorld(w),sha256=createHash('sha256').update(raw).digest('hex');
  assert.deepEqual(deserializeWorld(raw),w);
  mkdirSync('public/test-saves/v188',{recursive:true});writeFileSync('public/test-saves/v188/tri-reserves.json',raw);
  // The integrating owner adds this entry to the shared catalogue separately.
  console.log(JSON.stringify({path:'public/test-saves/v188/tri-reserves.json',entry:storageConditionDemoEntry(w,sha256)}));
}
