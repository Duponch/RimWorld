/** ROOT-only publication of an already qualified checkpoint. No simulation,
 * preparation, manufactured history or implicit publication is performed here. */
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,readFileSync,readdirSync,renameSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {aulnesHash} from './aulnes-workshop-v381.ts';
import {loadAulnesV381,AULNES_NEXT_SOURCE,AULNES_NEXT_PARENT_SHA,AULNES_NEXT_START} from './aulnes-tuques-next.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {queryCookingBillStatus} from '../src/sim/cooking-diagnostics.ts';
import {isColonist} from '../src/sim/affiliation.ts';
import {storageAt,storageCellAccepts} from '../src/sim/shelf-storage.ts';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {parseTestColonies,MAX_TEST_COLONY_MANIFEST_BYTES,type TestColony} from '../src/ui/test-colonies.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';

const MANIFEST='public/test-saves/manifest.json',TARGET='public/test-saves/v386/les-aulnes-integrees.json';
interface Baseline {manifestSha256:string;entries:number;paths:number;payloads:Record<string,string>;existingPaths:Record<string,string>}
const baseline=JSON.parse(readFileSync(new URL('./aulnes-publication-v386-baseline.json',import.meta.url),'utf8')) as Baseline;
interface Report {
  source:string;parentRawSha256:string;sourceStoredHash:string;start:number;end:number;ticks:number;schema:number;sha256:string;
  stage:string;productionObserved:number;storedIds:number[];unfinishedIds:number[];manualWearNotPerformed:boolean;
  preparation:{preparedAt:number;parentRawSha256:string;benchId:number;billId:number;declared:string};
  billStatus:{code:string;reason:string};
}
interface RootResult {passed:true;sha256:string;tick:number;parentCheckpointSha256:string;manualWearPerformed:boolean}
function paths(folder='public/test-saves'):string[] {
  return readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?paths(`${folder}/${e.name}`):[`${folder}/${e.name}`]).sort();
}
function hashes(list:readonly string[]):Record<string,string> {return Object.fromEntries(list.map(p=>[p,aulnesHash(readFileSync(p))]));}
function guardOriginals():void {
  assert.equal(aulnesHash(readFileSync(MANIFEST)),baseline.manifestSha256,'Catalogue/pointer changed since the frozen publication preparation.');
  assert.deepEqual(paths(),Object.keys(baseline.existingPaths).sort(),'An old path was added/removed. Reconcile explicitly before publishing.');
  assert.deepEqual(hashes(Object.keys(baseline.existingPaths)),baseline.existingPaths,'An existing public file changed.');
  assert.deepEqual(hashes(Object.keys(baseline.payloads)),baseline.payloads,'An archived payload changed.');
  assert.ok(!existsSync(TARGET),'V386 payload already exists; publication is single-use.');
}
function strict(world:World):string {
  assert.deepEqual(validateWorld(world),[]);const raw=serializeWorld(world);
  assert.equal(serializeWorld(deserializeWorld(raw)),raw);return raw;
}
export function aulnesV386Entry(world:World,sha256:string,report:Report,parent:TestColony,result:RootResult):TestColony {
  const products=world.piles.filter(p=>p.item==='muffalo-wool-tuque');
  const finished=products.length;
  const stored=products.filter(p=>{if(p.owner.type!=='ground')return false;const zone=storageAt(world,p.owner);return !!zone&&storageCellAccepts(world,zone,p);}).length;
  const worn=products.flatMap(p=>p.owner.type==='apparel'?[world.pawns.find(person=>p.owner.type==='apparel'&&person.id===p.owner.pawnId)?.name??`personne ${p.owner.pawnId}`]:[]);
  const wornText=worn.length?`${worn.length} portée(s) par ${worn.join(', ')}`:'aucune portée';
  const bench=world.structures.find(s=>s.id===report.preparation.benchId)!;
  const bill=bench.bills!.find(b=>b.id===report.preparation.billId)!;
  const status=queryCookingBillStatus(world,bench,bill);
  const unfinished=world.piles.filter(p=>p.unfinished?.billId===report.preparation.billId).length;
  return {id:'aulnes-current',release:'v386',filename:'les-aulnes-integrees.json',label:'Les Aulnes · atelier d’hiver 250×250',
    description:`Colonie historique conservée ; facture limitée de deux tuques en laine ajoutée à l’atelier manuel. Au checkpoint final tick ${world.tick} : ${finished} tuque(s) laine finie(s), ${stored} rangée(s), ${wornText}. Les objectifs inachevés restent à jouer.`,
    pawns:world.pawns.length,colonists:world.pawns.filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor&&p.state!=='dead').length,
    width:world.width,height:world.height,tick:world.tick,prepared:true,sha256,
    provenance:`Suite de la référence V381, tick ${AULNES_NEXT_START}, avec son patrimoine préparé : ${parent.provenance} Cette mise à jour ajoute seulement une facture de deux tuques laine, puis laisse les habitants collecter, confectionner et ranger par leurs gestes ordinaires. Aucun stock, recherche, travail ou vêtement supplémentaire n’est offert. Au tick ${world.tick}, ${finished} tuque(s) finie(s), ${stored} rangée(s), ${wornText}. La seconde production et le port restent des actions de partie lorsqu’ils sont inachevés.`,
    focus:[...new Set([...parent.focus,'atelier d’hiver','tuques en laine'])],
    steps:[`Atelier manuel (structure ${report.preparation.benchId}) : facture ${report.preparation.billId}, deux tuques, laine homogène dans le rayon 32, destination réserve. État au checkpoint final : ${status.reason}`,
      `Au checkpoint : ${finished} tuque(s) laine finie(s), ${unfinished} ouvrage(s) de cette facture ; ${stored} rangée(s) dans une réserve compatible et ${wornText} au checkpoint final. La production et le rangement ne sont pas attribués rétroactivement.`,
      `Noé et Alma sont les destinataires envisagés. Port constaté au checkpoint : ${wornText}. ${result.manualWearPerformed?'Des ordres Porter ont été donnés ; seuls les vêtements effectivement enfilés comptent.':'Aucun ordre Porter n’a encore été donné.'}`,
      'L’héritage V381 comprend la tâche de chemise d’Ada et ses réservations ; la préparation de cette facture ne les a pas annulées.',
      'Le village et ses matières proviennent du patrimoine déclaré V381. Aucun marais ni bouche d’aération n’est imposé à cette carte ; les ajouts futurs restent des choix de partie.']};
}
export async function publishAulnesV386(checkpoint:string,sourceReport:string,rootResult:string,publish=false):Promise<void> {
  assert.equal(SCHEMA_VERSION,246,'This publication tool is version-locked.');
  guardOriginals();
  const reportPath=resolve(sourceReport),folder=dirname(reportPath),resultPath=resolve(rootResult);
  const resultStored=readFileSync(resultPath,'utf8'),qualification=JSON.parse(resultStored) as RootResult;
  assert.equal(qualification.passed,true,'ROOT/native result must explicitly qualify this checkpoint.');
  assert.equal(typeof qualification.manualWearPerformed,'boolean');
  const reportStored=readFileSync(reportPath,'utf8'),report=JSON.parse(reportStored) as Report;
  assert.ok(!existsSync(resolve(folder,'failure.txt')),'A failed continuation cannot be published.');
  assert.equal(report.stage,'continued-private');
  assert.equal(report.source,AULNES_NEXT_SOURCE);assert.equal(report.parentRawSha256,AULNES_NEXT_PARENT_SHA);
  assert.equal(report.sourceStoredHash,aulnesHash(readFileSync(AULNES_NEXT_SOURCE)));
  assert.equal(report.schema,246);assert.equal(report.start,AULNES_NEXT_START);
  assert.ok(Number.isSafeInteger(report.ticks)&&report.ticks>0&&report.ticks<=360);
  assert.equal(report.end,report.start+report.ticks);
  assert.ok(Number.isSafeInteger(report.productionObserved)&&report.productionObserved>=0);
  assert.ok(Array.isArray(report.storedIds)&&Array.isArray(report.unfinishedIds));
  assert.equal(report.manualWearNotPerformed,true);
  assert.equal(report.preparation.preparedAt,AULNES_NEXT_START);
  assert.equal(report.preparation.parentRawSha256,AULNES_NEXT_PARENT_SHA);
  const stored=readFileSync(checkpoint,'utf8'),raw=await decodeStoredSave(stored),world=deserializeWorld(raw);
  assert.equal(JSON.parse(raw).schemaVersion,246);assert.equal(strict(world),raw);
  assert.equal(qualification.parentCheckpointSha256,report.sha256,'The qualified final file must name its actual ordinary-continuation parent.');
  const sourceRaw=readFileSync(resolve(folder,'played-world.json'),'utf8');
  assert.equal(aulnesHash(sourceRaw),report.sha256);assert.equal(JSON.parse(sourceRaw).tick,report.end);
  assert.equal(aulnesHash(raw),qualification.sha256);assert.equal(world.tick,qualification.tick);
  assert.ok(world.tick>=report.end,'The final file cannot precede its declared parent.');
  assert.deepEqual([world.width,world.height],[250,250]);
  const {world:parentWorld}=await loadAulnesV381();
  assert.equal(parentWorld.pawns.length,15);
  assert.deepEqual(world.pawns.map(p=>({id:p.id,name:p.name})).sort((a,b)=>a.id-b.id),parentWorld.pawns.map(p=>({id:p.id,name:p.name})).sort((a,b)=>a.id-b.id),'Historic people/identities must survive.');
  assert.ok(world.pawns.every(p=>p.state!=='dead'),'A historic person was lost.');
  const bench=world.structures.find(s=>s.id===report.preparation.benchId&&s.kind==='tailor-bench');
  const bill=bench?.bills?.find(b=>b.id===report.preparation.billId);
  assert.ok(bill&&bill.recipe==='tuque','The declared bill must remain inspectable, including when unfinished.');
  const manifest=JSON.parse(readFileSync(MANIFEST,'utf8')),history=parseTestColonies(manifest);
  assert.equal(history.length,64);assert.equal(Object.keys(baseline.payloads).length,64);assert.equal(baseline.paths,67);
  const parent=history.find(e=>e.id==='aulnes-current');
  assert.ok(parent&&parent.release==='v381'&&parent.sha256===AULNES_NEXT_PARENT_SHA);
  const archived:TestColony={...parent,id:'aulnes-integrated-v381',label:'Les Aulnes · référence historique V381 250×250'};
  assert.ok(!history.some(e=>e.id===archived.id||e.release==='v386'),'Already archived/published.');
  const entry=aulnesV386Entry(world,qualification.sha256,report,parent,qualification);
  const next={...manifest,saves:[entry,archived,...history.filter(e=>e.id!=='aulnes-current')]};
  assert.equal(parseTestColonies(next).length,65);
  const manifestText=JSON.stringify(next,null,2)+'\n';
  assert.ok(Buffer.byteLength(manifestText,'utf8')<=MAX_TEST_COLONY_MANIFEST_BYTES);
  // All asynchronous decoding is complete. Recheck immediately before the
  // synchronous publication writes; never republish or overwrite a payload.
  guardOriginals();assert.equal(readFileSync(checkpoint,'utf8'),stored);assert.equal(readFileSync(reportPath,'utf8'),reportStored);assert.equal(readFileSync(resultPath,'utf8'),resultStored);
  assert.equal(readFileSync(resolve(folder,'played-world.json'),'utf8'),sourceRaw);
  const result={mode:publish?'published':'plan-only',checkpoint:resolve(checkpoint),target:TARGET,schema:world.schemaVersion,tick:world.tick,sha256:qualification.sha256,
    entries:65,paths:68,oldPayloadsExact:64,archived:archived.id,productionObserved:report.productionObserved,qualification:'ROOT supplies the already qualified checkpoint; this tool runs no simulation or native validation.'};
  if(!publish){console.log(JSON.stringify(result,null,2));return;}
  mkdirSync(dirname(TARGET),{recursive:true});
  const manifestStage=MANIFEST+'.v386-new';assert.ok(!existsSync(manifestStage),'Stale staging file: diagnose before retrying.');
  writeFileSync(TARGET,stored,{encoding:'utf8',flag:'wx'});
  writeFileSync(manifestStage,manifestText,{encoding:'utf8',flag:'wx'});renameSync(manifestStage,MANIFEST);
  assert.deepEqual(hashes(Object.keys(baseline.payloads)),baseline.payloads);
  for(const [path,hash] of Object.entries(baseline.existingPaths))if(path!==MANIFEST)assert.equal(aulnesHash(readFileSync(path)),hash);
  assert.deepEqual(paths(),[...Object.keys(baseline.existingPaths),TARGET].sort());
  assert.equal(paths().length,68);assert.equal(aulnesHash(readFileSync(TARGET)),aulnesHash(stored));
  console.log(JSON.stringify(result,null,2));
}
async function main():Promise<void> {
  const args=process.argv.slice(2),publishAt=args.indexOf('--publish-checkpoint'),planAt=args.indexOf('--checkpoint');
  const at=publishAt>=0?publishAt:planAt;
  assert.ok(at>=0&&args[at+1],'Use --checkpoint <qualified stored save> to inspect, or --publish-checkpoint <same save> for ROOT publication.');
  const sourceAt=args.indexOf('--source-report'),resultAt=args.indexOf('--result');
  assert.ok(sourceAt>=0&&args[sourceAt+1]&&resultAt>=0&&args[resultAt+1],'Supply --source-report <ordinary report.json> and --result <ROOT/native result.json>.');
  await publishAulnesV386(args[at+1]!,args[sourceAt+1]!,args[resultAt+1]!,publishAt>=0);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
