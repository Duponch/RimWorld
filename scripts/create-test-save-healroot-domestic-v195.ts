import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { applyCommand, createWorld } from '../src/sim/engine.ts';
import { addResolvedInjury, createMedicalRecord } from '../src/sim/injury-state.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { createPlantLife } from '../src/sim/plant-life.ts';
import { addGroundMaterial, refreshStock } from '../src/sim/materials.ts';
import { adoptSiteClimate } from '../src/sim/site-climate.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION, type Pawn, type Resource, type World } from '../src/sim/types.ts';

export const DOMESTIC_HEALROOT_DEMO_ID='champ-medicinal-v195';
export const DOMESTIC_HEALROOT_DEMO_PATH='public/test-saves/v195/champ-medicinal.json';
export const DOMESTIC_HEALROOT_CELLS={field:{x:13,z:16},mature:{x:18,z:16},store:{x:16,z:12}} as const;

/** The mature medicinal plant and bruise are explicit preparations. The empty
 * rice field is changed by the player; no sowing, dose or treatment is granted. */
export function prepareDomesticHealrootDemo():World {
  const w=createWorld(42,32,32);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  w.resources=[];w.piles=[];w.structures=[];w.jobs=[];w.packed=[];
  w.stockpiles=[];w.growingZones=[];w.growingCursor=0;
  for(const [i,p] of w.pawns.entries()){
    p.x=10+i*2;p.z=14;p.hunger=100;p.rest=100;p.recreation.level=100;
    p.health=createMedicalRecord(w.tick);p.schedule.fill('work');p.apparelAutomation=false;
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
    p.skills.plants={level:i===1?7:8,xp:0,dailyXp:0,passion:0};
  }
  const patient=w.pawns[2]!;patient.medicalCare='herbal';
  assert.ok(addResolvedInjury(patient.health!,'left-arm','bruise',5000,()=>.999999));
  reconcilePawnHealth(w,patient);assert.equal(patient.state,'idle');
  adoptSiteClimate(w);
  const mature:Resource={id:w.nextId++,kind:'healroot',...DOMESTIC_HEALROOT_CELLS.mature,
    amount:1,growth:1,growthTick:w.tick};
  mature.plantLife=createPlantLife(w,mature,true);w.resources=[mature];
  for(const command of [
    {type:'area',action:'growing',from:DOMESTIC_HEALROOT_CELLS.field,to:DOMESTIC_HEALROOT_CELLS.field},
    {type:'stockpile',...DOMESTIC_HEALROOT_CELLS.store,enabled:true,filters:{wood:false,food:false,medicine:true},priority:2,capacity:25},
  ] as const){const r=applyCommand(w,command);assert.equal(r.ok,true,r.reason);}
  addGroundMaterial(w,'food',6,{x:8,z:14},'survival-meal');refreshStock(w);
  assert.deepEqual(validateWorld(w),[]);assert.equal(w.jobs.length,0);
  assert.equal(w.piles.filter(p=>p.item==='herbal-medicine').length,0);
  return w;
}

export function domesticHealrootDemoEntry(w:World,sha256:string){return {
  id:DOMESTIC_HEALROOT_DEMO_ID,release:'v195',label:'Champ médicinal et soins · 3 colons',
  description:'Changer une case de riz vide en racine médicinale, semer avec Plantes 8, puis récolter un pied mûr préparé, ranger la dose et soigner une contusion.',
  filename:'champ-medicinal.json',pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['culture médicinale','Plantes 8 au semis','récolte sous Plantes 8','médicament physique','stockage','soins','reprise'],
  steps:[
    'En pause, sélectionner la case de culture vide en (13,16). Choisir Racine médicinale, appliquer les réglages et activer Culture pour Ada (Plantes 8). Le second colon est Plantes 7 : il ne peut pas commencer ce semis, même avec un ordre forcé.',
    'Reprendre : observer le déplacement, le travail de semis et le plant nouveau. Son budget neutre est 80 ticks locaux ; sept jours biologiques de croissance ne sont pas accélérés. Sauvegarder et recharger pendant le travail.',
    'Le pied mûr en (18,16) est explicitement préparé pour ne pas attendre plusieurs journées dans ce contrôle court. Désigner Récolter et activer Récolte pour le second colon Plantes 7. Son risque d’échec existe ; la dose n’est jamais précréditée. Désactiver Culture si vous voulez observer séparément le ressemis.',
    'Activer Transport, ranger la dose dans la réserve Médicaments (16,12). Le troisième colon a une contusion préparée au bras gauche et un plafond Plantes médicinales. Activer son Auto-soin dans Santé et Médecin dans Travail, puis observer collecte et consommation au soin.',
  ],prepared:true,
  provenance:'Scène préparée 32×32 au schéma 182, createWorld(42), tick0. Sol grass dégagé ; trois colons adultes libres avec besoins hauts, horaires Travail et travaux initialement désactivés. Profils Plantes 8/7/8 préparés, sans XP. Santé remise saine, puis contusion5PV du bras gauche du troisième colon, plafond herbal. Climat adopté au tick0. Un healroot mûr à (18,16), identité/PV intacts/âge zéro explicitement préparés ; ce stade ne prouve pas sept journées de croissance naturelle. Une case de riz vide (13,16), réserve médicale25 (16,12), six repas de survie réels au sol. Aucune tâche, route, semis, récolte, dose herbal, portage, soin ou progression préalable. Le semis vide et tous les contacts restent à accomplir ; les anciennes colonies ne sont pas régénérées.',
  sha256,
};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-test-save-healroot-domestic-v195.ts')){
  assert.equal(SCHEMA_VERSION,182,'Do not rewrite V195 under a later schema.');
  const w=prepareDomesticHealrootDemo(),raw=serializeWorld(w),output=process.argv[2]??DOMESTIC_HEALROOT_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=domesticHealrootDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',manifest=JSON.parse(readFileSync(path,'utf8'));
    assert.equal(manifest.version,2);assert.equal(manifest.saves.filter((s:{id:string})=>s.id!==entry.id).length,44);
    manifest.saves=[...manifest.saves.filter((s:{id:string})=>s.id!==entry.id),entry];writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');
  }
  console.log(JSON.stringify({path:output,entry}));
}
