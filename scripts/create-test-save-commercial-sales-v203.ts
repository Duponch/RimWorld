import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { commercialDemoCamp } from '../tests/helpers/commercial-demo-v193.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

export const COMMERCIAL_SALES_DEMO_ID='ventes-textiles-v203';
export const COMMERCIAL_SALES_DEMO_PATH='public/test-saves/v203/ventes-textiles.json';
/** Prepared cargo, never an already loaded trip or a granted transaction. */
export function prepareCommercialSalesDemo():World {
  const {world:w}=commercialDemoCamp();
  w.piles=w.piles.filter(p=>p.item!=='silver');
  delete w.worldIncidents;
  addMaterial(w,'textile',75,{type:'ground',x:8,z:12},'cloth');
  addMaterial(w,'textile',60,{type:'ground',x:9,z:12},'muffalo-wool');
  refreshStock(w);assert.deepEqual(validateWorld(w),[]);
  assert.equal(w.commercialTrip,undefined);assert.equal(w.civilianPost,undefined);return w;
}
export function commercialSalesDemoEntry(w:World,sha256:string){return {
  id:COMMERCIAL_SALES_DEMO_ID,release:'v203',label:'Ventes de textiles · 3 colons',
  description:'Embarquer tissu et laine sans argent, les vendre contre la monnaie réelle du comptoir, acheter des fournitures et ramener les invendus.',
  filename:'ventes-textiles.json',pawns:w.pawns.length,colonists:3,width:w.width,height:w.height,tick:w.tick,
  focus:['vente de textiles','chargement physique','fonds du comptoir','argent réel','charge','invendus','achats','reprise'],
  steps:[
    'Charger en pause, ouvrir Monde · commerce. Choisir Ada, trois rations, zéro argent, 75 tissus et 60 laines de muffalo. Les marchandises sont encore au sol.',
    'Reprendre : attendre les prises au contact et la sortie réelle. Sauvegarder pendant le chargement puis reprendre ; aucun stock du foyer ne peut être vendu à distance.',
    'Au comptoir, vendre 60 tissus et 40 laines. Vérifier la caisse du poste et le devis. Puis acheter un médicament et un composant avec l’argent réellement reçu.',
    'Demander le retour et observer Ada rentrer, puis déposer ses invendus, l’argent restant, les rations et les fournitures. Sauvegarder à chaque phase ; aucune monnaie ou marchandise ne doit se dupliquer.',
  ],prepared:true,
  provenance:'Scène préparée 32×32, graine42/tick3000, schéma185. Trois adultes libres sains, tâches ordinaires désactivées et quatre rations réelles au sol. Ada en (4,12), faim35 ; tissu75 en (8,12), laine60 en (9,12), aucun argent initial. Les textiles sont préparés pour isoler le circuit commercial, leur production naturelle n’est pas prouvée par cette scène. Aucun chargement, voyage, comptoir, vente, achat ou retour accordé ; incidents naturels exclus. Durées de voyage et paniers successifs adaptés, pas planète ni groupe ni campagne naturelle ni charge 250².',sha256,
};}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-test-save-commercial-sales-v203.ts')){
  assert.equal(SCHEMA_VERSION,185,'Do not rewrite V203 under a later schema.');
  const w=prepareCommercialSalesDemo(),raw=serializeWorld(w),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'))??COMMERCIAL_SALES_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw),w);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  const entry=commercialSalesDemoEntry(w,createHash('sha256').update(raw).digest('hex'));
  if(process.argv.includes('--publish')){
    const path='public/test-saves/manifest.json',before=readFileSync(path,'utf8'),manifest=JSON.parse(before);
    assert.equal(manifest.version,2);const existing=manifest.saves.find((s:{id:string})=>s.id===entry.id);
    if(existing)assert.deepEqual(existing,entry,'V203 entry differs; review before rewriting.');
    else {assert.equal(manifest.saves.length,48);const close=before.lastIndexOf('  ]');assert.ok(close>=0);
      const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');
      writeFileSync(path,before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close));}
  }
  console.log(JSON.stringify({path:output,entry}));
}
