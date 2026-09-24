import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/index.ts';
import { encodeStoredSave, decodeStoredSave, storedSaveMetadata } from '../src/ui/save-storage-codec.ts';
import { energyLoad } from '../tests/scenarios/energy-load.ts';
import { environmentLoad } from '../tests/scenarios/environment-load.ts';
import { tradeLoad } from '../tests/scenarios/trade-load.ts';
import { habitatApparelLoad } from '../tests/scenarios/habitat-apparel-load.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { builtDoorState } from '../src/sim/door-rules.ts';
import { addGroundMaterial, refreshStock } from '../src/sim/materials.ts';
import { createPrisonerState } from '../src/sim/prisoner-state.ts';
import { reconcileTemperature } from '../src/sim/temperature.ts';
import { updateFoodTemperatures } from '../src/sim/thermal-food.ts';
import type { Cell, Structure, World } from '../src/sim/types.ts';

export interface TestSaveEntry {
  id:string; label:string; description:string; filename:string;
  pawns:number; colonists:number; width:number; height:number; tick:number;
  focus:string[]; steps:string[]; prepared:boolean; provenance:string; sha256:string;
}
export interface TestSaveManifest { version:1; release:'v98'; saves:TestSaveEntry[] }

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const publicSaveDirectory=resolve(root,'public/test-saves/v98');
export const proofPath=resolve(root,'artifacts/test-colonies-v98.json');
const cell=(w:World,kind:string)=>{
  const s=w.structures.find(s=>s.kind===kind);
  return s?`(${s.x}, ${s.z})`:'absent';
};
const colony=(w:World)=>w.pawns.filter(p=>(p.faction??'colony')==='colony'&&p.state!=='dead').length;
const people=(w:World)=>({livingColonists:colony(w),prisoners:w.pawns.filter(p=>!!p.prisoner&&p.state!=='dead').length,visitors:w.pawns.filter(p=>!!p.visitor&&p.state!=='dead').length,dead:w.pawns.filter(p=>p.state==='dead').length});

/** V86's load constructor predates furniture quality. Prepare the same two-room
 * situation on the current V91 schema without changing its rules or old oracle. */
function prisonV98():World {
  const w=energyLoad(12),roofs=new Set(w.roofing?.constructed);
  const policy=w.nextFoodPolicyId++;
  w.foodPolicies.push({id:policy,name:'Rations des prisons témoins',allowed:['survival-meal']});
  for(const p of w.foodPolicies)if(p.id!==policy)p.allowed=p.allowed.filter(id=>id!=='survival-meal');
  const occupied=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.stockpiles,...w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[]),...w.pawns,...w.wildlife?.animals??[]].map(c=>c.z*w.width+c.x));
  for(const zone of w.growingZones)for(const i of zone.cells)occupied.add(i);
  const candidates:Cell[]=[];for(let z=98;z>=74;z-=8)for(let x=108;x<=153;x+=9)candidates.push({x,z});
  let created=0;
  for(const anchor of candidates){
    if(created===2)break;
    const patch:Cell[]=[];for(let dz=-1;dz<=7;dz++)for(let dx=-1;dx<=5;dx++)patch.push({x:anchor.x+dx,z:anchor.z+dz});
    if(patch.some(c=>occupied.has(c.z*w.width+c.x)))continue;
    const cells=new Set(patch.map(c=>c.z*w.width+c.x));for(const c of patch){w.tiles[c.z*w.width+c.x]={terrain:'grass'};occupied.add(c.z*w.width+c.x);}
    w.resources=w.resources.filter(r=>!cells.has(r.z*w.width+r.x));
    const add=(kind:'wall'|'door'|'bed',dx:number,dz:number):Structure=>{
      const s:Structure={id:w.nextId++,kind,x:anchor.x+dx,z:anchor.z+dz,orientation:0,footprint:'standard',material:'wood'};
      if(kind==='bed')s.quality='normal';
      w.structures.push(s);return s;
    };
    for(let dz=0;dz<=4;dz++)for(let dx=0;dx<=4;dx++){
      roofs.add((anchor.z+dz)*w.width+anchor.x+dx);
      if(dx!==0&&dx!==4&&dz!==0&&dz!==4)continue;
      const wall=add(dx===2&&dz===4?'door':'wall',dx,dz);if(wall.kind==='door')wall.door=builtDoorState(w,wall);
    }
    const bed=add('bed',1,1);bed.prisoner=true;
    const keeper=w.pawns[created*6]!;keeper.priorities.warden=1;keeper.skills.social={level:8,xp:0,dailyXp:0,passion:0};
    const p=structuredClone(w.pawns[0]!);p.id=w.nextId++;p.name=`Captif charge ${created+1}`;p.faction='outlaws';p.x=anchor.x+2;p.z=anchor.z+2;p.hunger=20;p.rest=100;p.bedId=bed.id;p.foodPolicyId=policy;
    p.path=[];p.motion=null;p.moveCooldown=0;p.planCooldown=0;p.needCooldown=0;p.need=null;p.state='idle';p.orders={active:null,queue:[]};p.jobId=null;p.haul=null;p.cooking=null;p.memories=[];
    delete p.health;delete p.research;delete p.social;delete p.mental;delete p.traits;delete p.hostilityResponse;delete p.raid;delete p.flee;delete p.draft;
    for(const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[key]=0;
    p.prisoner=createPrisonerState(w,p);p.prisoner.mode='reduce';w.pawns.push(p);
    addGroundMaterial(w,'food',20,{x:anchor.x+2,z:anchor.z+6},'survival-meal');created++;
  }
  if(created!==2)throw Error('V98 prison preparation has no sites for both rooms');
  w.roofing={constructed:[...roofs].sort((a,b)=>a-b),build:[],remove:[],cursor:0};
  const thermal=reconcileTemperature(w);updateFoodTemperatures(w,thermal);refreshStock(w);
  return w;
}

interface Source {
  id:string;label:string;focus:string[];prepared:boolean;provenance:string;
  world:()=>World;
  description:(w:World)=>string;
  steps:(w:World)=>string[];
}
export const testColonySources:Source[]=[
  {
    id:'colony-v90',label:'Colonie avancée · 4 colons',focus:['campagne poursuivie','habitat','agriculture','vêtements'],prepared:false,
    provenance:'Campagne Lisière réellement poursuivie pendant 182,577 jours de jeu, sans préparation ajoutée pour ce catalogue.',
    world:()=>deserializeWorld(gunzipSync(readFileSync(resolve(root,'tests/fixtures/colony-v90.json.gz'))).toString('utf8')),
    description:w=>`Campagne Lisière avancée avec ${colony(w)} habitants après ${(w.tick/6000).toFixed(3).replace('.',',')} jours écoulés. Ressources, constructions et travaux proviennent de cette partie réellement poursuivie.`,
    steps:w=>[`Retrouver ${w.pawns.find(p=>(p.faction??'colony')==='colony'&&p.state!=='dead')?.name??'un habitant'} à ${(()=>{const p=w.pawns.find(p=>(p.faction??'colony')==='colony'&&p.state!=='dead');return p?`(${p.x}, ${p.z})`:'la colonie';})()} et examiner les quatre habitants et leurs besoins.`,`Ouvrir Architecte près du camp existant puis poursuivre les cultures, la coupe ou l’habitat avec les stocks présents.`],
  },
  {
    id:'energy-food-12',label:'Nourriture et énergie · 12 colons',focus:['cuisine','cultures','réseau électrique','chambre froide'],prepared:true,
    provenance:'Situation préparée dans Lisière : bâtiments, ingrédients, cultures et batteries sont fournis au départ.',
    world:()=>energyLoad(12),
    description:w=>`Deux groupes de travail, ${colony(w)} colons et ${w.wildlife?.animals.length??0} lièvres ; deux cuisines électriques, panneaux solaires, batteries, interrupteurs et chambres froides préparés. Les récoltes et gestes suivent ensuite le moteur ordinaire.`,
    steps:w=>[`Rejoindre la première cuisine à ${cell(w,'electric-stove')} et observer ${w.pawns[2]?.name??'le cuisinier'}, la boucherie, la récolte et le ravitaillement.`,`Cliquer l’interrupteur à ${cell(w,'power-switch')} : un colon doit effectuer le travail de fermeture ; observer la batterie et la chambre froide à ${cell(w,'cooler')}.`],
  },
  {
    id:'prison-12',label:'Prison et intendance · 12 colons',focus:['prisonniers','geôlier','nourriture','énergie'],prepared:true,
    provenance:'Situation préparée dans Lisière : deux captifs, leurs chambres et leurs rations sont présents au départ.',
    world:prisonV98,
    description:w=>`${colony(w)} colons et ${people(w).prisoners} captifs dans des chambres distinctes avec lits, portes et rations physiques ; geôliers et conversations continuent par la simulation.`,
    steps:w=>[`Sélectionner ${w.pawns.find(p=>p.prisoner)?.name??'un captif'} près du lit de prison à ${w.structures.find(s=>s.prisoner)?`(${w.structures.find(s=>s.prisoner)!.x}, ${w.structures.find(s=>s.prisoner)!.z})`:'absent'} et ouvrir son dossier Prisonnier.`,`Observer la livraison de rations et une visite du geôlier ; suivre aussi les interrupteurs et cuisines du camp.`],
  },
  {
    id:'weather-fire-12',label:'Vent, chaleur et incendie · 12 colons',focus:['météo','éolienne','radiateur','incendie'],prepared:true,
    provenance:'Situation préparée dans Lisière : installations de chauffage et d’énergie, météo et foyers sont présents au départ.',
    world:()=>environmentLoad(12),
    description:w=>`${colony(w)} colons avec climat et vent adoptés, éolienne, radiateur et ${w.fires?.items.length??0} foyers préparés. Les pompiers, la propagation et l’extinction obéissent aux règles normales.`,
    steps:w=>[`Observer la première éolienne à ${cell(w,'wind-turbine')} et le radiateur à ${cell(w,'heater')} avec les conditions météo.`,`Suivre le premier foyer à ${w.fires?.items[0]?`(${w.fires.items[0].x}, ${w.fires.items[0].z})`:'aucun foyer'} et l’intervention physique des colons.`],
  },
  {
    id:'trade-100',label:'Commerce et circulation · 100 colons',focus:['100 colons','visiteurs','commerce','charge mixte'],prepared:true,
    provenance:'Situation préparée dans Lisière : les visiteurs sont déjà sur place et un premier échange a été effectué.',
    world:()=>tradeLoad(100),
    description:w=>`${colony(w)} colons, ${people(w).visitors} visiteurs, ${w.wildlife?.animals.length??0} lièvres, ateliers, cultures, feu et énergie ; le marchand a un stock fini et un premier échange vérifié.`,
    steps:w=>[`Ouvrir Commerce près de ${w.pawns.find(p=>p.visitor?.role==='trader')?.name??'le marchand'} à ${w.pawns.find(p=>p.visitor?.role==='trader')?`(${w.pawns.find(p=>p.visitor?.role==='trader')!.x}, ${w.pawns.find(p=>p.visitor?.role==='trader')!.z})`:'absent'} ; vérifier argent et médicaments physiques.`,`Déplacer la caméra entre les ateliers et passer la vitesse à ×6 pour examiner la charge de 100 colons.`],
  },
  {
    id:'mixed-100',label:'Habitat, vêtements et salubrité · 100 colons',focus:['100 colons','habitat','tailleur','hygiène','commerce'],prepared:true,
    provenance:'Situation préparée dans Lisière : mobilier, vêtements, ateliers, salissures et soins composent le camp dès le chargement.',
    world:()=>habitatApparelLoad(100),
    description:w=>`${colony(w)} colons, ${people(w).visitors} visiteurs, ${people(w).dead} morts préparés, ${w.wildlife?.animals.length??0} lièvres ; mobilier, tailleurs, vêtements, tombes, salissures et patients composent une charge mixte.`,
    steps:w=>[`Inspecter les vêtements et politiques de ${w.pawns[0]?.name??'un colon'}, puis l’établi de tailleur à ${cell(w,'tailor-bench')}.`,`Suivre le nettoyage près de ${w.filth?.items[0]?`(${w.filth.items[0].x}, ${w.filth.items[0].z})`:'une pièce souillée'}, les inhumations et les soins ; comparer le paysage proche et la vue globale pendant les déplacements de caméra.`],
  },
];

export function describeTestWorld(source:Source,w:World,raw:string):TestSaveEntry {
  return {id:source.id,label:source.label,description:source.description(w),filename:`${source.id}.json`,pawns:w.pawns.length,colonists:colony(w),width:w.width,height:w.height,tick:w.tick,focus:source.focus,steps:source.steps(w),prepared:source.prepared,provenance:source.provenance,sha256:createHash('sha256').update(raw).digest('hex')};
}

/** Explicit maintainer command: WRITE_TEST_SAVES=1 npx vitest run tests/test-colonies-v98.test.ts */
export async function writeTestColonies():Promise<{manifest:TestSaveManifest;proof:unknown}> {
  mkdirSync(publicSaveDirectory,{recursive:true});
  const entries:TestSaveEntry[]=[],proofSaves:unknown[]=[];
  for(const source of testColonySources){
    const w=source.world(),errors=validateWorld(w);
    if(errors.length)throw Error(`${source.id}: ${errors.join('; ')}`);
    const raw=serializeWorld(w),restored=deserializeWorld(raw);
    if(serializeWorld(restored)!==raw)throw Error(`${source.id}: strict serialization roundtrip changed the world`);
    const stored=await encodeStoredSave(raw);
    if(await decodeStoredSave(stored)!==raw)throw Error(`${source.id}: storage codec changed the world`);
    const meta=storedSaveMetadata(stored);
    if(meta?.tick!==w.tick||meta.width!==w.width||meta.height!==w.height)throw Error(`${source.id}: storage metadata mismatch`);
    const entry=describeTestWorld(source,w,raw);entries.push(entry);
    writeFileSync(resolve(publicSaveDirectory,entry.filename),stored,'utf8');
    proofSaves.push({id:entry.id,sha256:entry.sha256,storedBytes:Buffer.byteLength(stored),rawBytes:Buffer.byteLength(raw),schemaVersion:w.schemaVersion,...people(w),structures:w.structures.length,jobs:w.jobs.length,piles:w.piles.length,wildlife:w.wildlife?.animals.length??0});
  }
  const manifest:TestSaveManifest={version:1,release:'v98',saves:entries};
  writeFileSync(resolve(publicSaveDirectory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
  const proof={version:1,release:'v98',source:'generated from immutable V90 fixture and declared scenario builders',assets:proofSaves,checked:['strict world validation','serialize/deserialize exact roundtrip','compressed storage decode exact roundtrip','storage metadata']};
  mkdirSync(dirname(proofPath),{recursive:true});writeFileSync(proofPath,JSON.stringify(proof,null,2)+'\n','utf8');
  return {manifest,proof};
}
