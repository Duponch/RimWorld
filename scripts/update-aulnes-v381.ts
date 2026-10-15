/** ROOT-only derivative of the immutable V284 reference. Default: private
 * preparation + bounded ordinary continuation. Publication is explicit. */
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadAulnesV284,prepareAulnesV381,aulnesCommand,aulnesHash,AULNES_V381_SOURCE,AULNES_V381_PARENT_SHA,AULNES_V381_START} from './aulnes-workshop-v381.ts';
import {auditCoverage} from './update-aulnes-test-save.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {isColonist} from '../src/sim/affiliation.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {storageAt,storageCellAccepts} from '../src/sim/shelf-storage.ts';
import {encodeStoredSave,decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {parseTestColonies,type TestColony} from '../src/ui/test-colonies.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';

const MANIFEST='public/test-saves/manifest.json',RELEASE='v381',FILENAME='les-aulnes-integrees.json';
function strict(world:World):string {
  assert.deepEqual(validateWorld(world),[]);const raw=serializeWorld(world);
  assert.equal(serializeWorld(deserializeWorld(raw)),raw);return raw;
}
function storedItems(world:World,item:string):number {
  return world.piles.reduce((sum,p)=>{if(p.item!==item||p.owner.type!=='ground')return sum;const zone=storageAt(world,p.owner);return sum+(zone&&storageCellAccepts(world,zone,p)?p.quantity:0);},0);
}
function payloadHashes(entries:readonly TestColony[]):Record<string,string> {
  return Object.fromEntries(entries.map(entry=>{const path=`public/test-saves/${entry.release}/${entry.filename}`;return [path,aulnesHash(readFileSync(path))];}));
}
export function aulnesV381Entry(world:World,sha256:string):TestColony {
  return {id:'aulnes-current',release:RELEASE,filename:FILENAME,label:'Les Aulnes · référence intégrée 250×250',
    description:'Le village historique conserve ses habitants, élevage et ateliers ; rangement industriel sur étagères, uranium fini et tenue de garde Recon complètent les activités existantes. Patrimoine déclaré puis continuation ordinaire.',
    pawns:world.pawns.length,colonists:world.pawns.filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor&&p.state!=='dead').length,
    width:world.width,height:world.height,tick:world.tick,prepared:true,sha256,
    provenance:'Dérivé du checkpoint V284, tick8434, SHA e11bdf91…644d, migré strictement au schéma242. Deux étagères en bois,40uranium au sol, une combinaison normale et la seule recherche Recon sont explicitement préparés. Iris libérée par vraie annulation ; Tao reçoit la tenue par ordre/contact ordinaires. Aucune acquisition naturelle, expédition ou nouvelle histoire n’est inventée.',
    focus:['colonie intégrée','atelier et étagères','uranium','tenue de garde Recon','fabrication','hôpital et pharmacie','élevage','commerce orbital'],
    steps:['Au sud, atelier de fabrication (128,139) : deux étagères, stock physique limité et une facture de combinaison80plastacier/3composants avancés/10uranium.',
      'Inspecter Tao et sa tenue de garde ; son gilet historique reste un objet original après le remplacement physique. La combinaison initiale est du patrimoine déclaré.',
      'La facture suivante reste à fabriquer par un artisan qualifié. Les autres ateliers, recherches historiques, logements et relations restent ceux de la colonie.',
      'Iris a été libérée de sa recherche par une annulation normale ; la complétion Recon est déclarée dans la préparation, pas présentée comme une recherche jouée.',
      'Le marchand orbital historique garde sa date de départ10934 et ses biens propres. Aucun uranium n’a été pris à son inventaire.']};
}

async function publish(path:string):Promise<void> {
  const folder=dirname(resolve(path)),report=JSON.parse(readFileSync(resolve(folder,'report.json'),'utf8'));
  assert.ok(!existsSync(resolve(folder,'failure.txt'))&&report.stage==='qualified-private'&&report.passed===true);
  assert.equal(report.source,AULNES_V381_SOURCE);assert.equal(report.parentRawSha256,AULNES_V381_PARENT_SHA);
  assert.equal(report.sourceStoredHash,aulnesHash(readFileSync(AULNES_V381_SOURCE)));
  const stored=readFileSync(path,'utf8'),raw=await decodeStoredSave(stored),world=deserializeWorld(raw);
  assert.equal(strict(world),raw);assert.equal(report.sha256,aulnesHash(raw));assert.equal(report.schema,SCHEMA_VERSION);
  assert.equal(report.start,AULNES_V381_START);assert.equal(report.end,world.tick);assert.equal(report.ticks,world.tick-report.start);
  assert.ok(report.ticks>0&&report.ticks<=900);assert.equal(report.ordinaryRecoveryTick,world.tick+1);assert.ok(report.observation.wornAt);
  const manifest=JSON.parse(readFileSync(MANIFEST,'utf8')),history=parseTestColonies(manifest),parent=history.find(e=>e.id==='aulnes-current');
  assert.ok(parent&&parent.release==='v284'&&parent.sha256===AULNES_V381_PARENT_SHA);
  assert.equal(aulnesHash(JSON.stringify(parent)),report.parentEntryHash,'The catalogue pointer changed after this preparation.');
  const originals=payloadHashes(history);assert.deepEqual(originals,report.oldPayloadHashes);
  const archived:TestColony={...parent,id:'aulnes-integrated-v284',label:'Les Aulnes · référence historique V284 250×250'};
  assert.ok(!history.some(e=>e.id===archived.id));
  const entry=aulnesV381Entry(world,aulnesHash(raw)),next={...manifest,saves:[entry,archived,...history.filter(e=>e.id!=='aulnes-current')]};
  parseTestColonies(next); // Includes the existing64-entry capacity and paths/IDs.
  const target=`public/test-saves/${RELEASE}/${FILENAME}`;assert.ok(!existsSync(target),'Published files are immutable.');
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,stored,'utf8');writeFileSync(MANIFEST,JSON.stringify(next,null,2)+'\n','utf8');
  assert.deepEqual(payloadHashes(history),originals);
  console.log(JSON.stringify({published:target,current:entry,archived:archived.id,oldPayloadsExact:history.length}));
}

async function main():Promise<void> {
  const args=process.argv.slice(2),publishAt=args.indexOf('--publish-checkpoint');
  if(publishAt>=0){assert.ok(args[publishAt+1]);await publish(args[publishAt+1]!);return;}
  const ticksAt=args.indexOf('--ticks'),ticks=ticksAt<0?360:Number(args[ticksAt+1]);
  assert.ok(Number.isSafeInteger(ticks)&&ticks>=1&&ticks<=900,'Only a short ordinary continuation is permitted.');
  const {world:source,storedHash}=await loadAulnesV284(),{world,preparation}=prepareAulnesV381(source);
  const manifest=JSON.parse(readFileSync(MANIFEST,'utf8')),history=parseTestColonies(manifest),parent=history.find(e=>e.id==='aulnes-current');
  assert.ok(parent&&parent.release==='v284'&&parent.sha256===AULNES_V381_PARENT_SHA);
  const oldPayloadHashes=payloadHashes(history),parentEntryHash=aulnesHash(JSON.stringify(parent));
  mkdirSync('tmp',{recursive:true});const out=mkdtempSync('tmp/aulnes-v381-generation-'),start=world.tick;
  let lastValid=strict(world);writeFileSync(resolve(out,'prepared-world.json'),lastValid);
  const common={source:AULNES_V381_SOURCE,parentRawSha256:AULNES_V381_PARENT_SHA,sourceStoredHash:storedHash,parentEntry:parent,parentEntryHash,oldPayloadHashes,start,preparation};
  if(args.includes('--prepare-only')){writeFileSync(resolve(out,'report.json'),JSON.stringify({...common,stage:'prepared-only',passed:false},null,2));console.log(out);return;}
  const originalPeople=source.pawns.map(p=>p.id),observation={wearOrderAt:world.tick,wornAt:null as number|null,uraniumStored:0,armorWorkProgress:0,armorProducts:[] as number[],events:[] as World['events']};
  try{
    // Real order preflight releases Tao's drilling/cargo atomically. No owner,
    // pose, timer, health or speed is assigned by the preparation/driver.
    aulnesCommand(world,{type:'order-equipment',pawnId:preparation.taoId,itemId:preparation.armorId,action:'wear',queue:false});
    for(let i=0;i<ticks;i++){
      stepWorld(world);
      const armor=world.piles.find(p=>p.id===preparation.armorId)!;
      if(!observation.wornAt&&armor.owner.type==='apparel'&&armor.owner.pawnId===preparation.taoId)observation.wornAt=world.tick;
      observation.uraniumStored=storedItems(world,'uranium');
      observation.armorWorkProgress=Math.max(observation.armorWorkProgress,...world.piles.filter(p=>p.flakWork?.recipe==='make-recon-armor').map(p=>p.flakWork!.progress));
      observation.armorProducts=world.piles.filter(p=>p.item==='recon-armor'&&p.id!==preparation.armorId).map(p=>p.id);
      observation.events.push(...world.events.filter(e=>e.tick===world.tick));
      assert.ok(originalPeople.every(id=>world.pawns.some(p=>p.id===id&&p.state!=='dead')),`A historic resident was lost at tick${world.tick}.`);
      if((i+1)%120===0||i===ticks-1){lastValid=strict(world);writeFileSync(resolve(out,'last-valid-world.json'),lastValid);}
    }
    assert.ok(observation.wornAt,'The finite continuation did not complete the actual wardrobe order. Preserve the checkpoint and diagnose before extending it.');
    const raw=strict(world),encoded=await encodeStoredSave(raw);assert.equal(await decodeStoredSave(encoded),raw);
    writeFileSync(resolve(out,FILENAME),encoded);writeFileSync(resolve(out,'played-world.json'),raw);
    const resumed=deserializeWorld(raw),copy=structuredClone(world);stepWorld(resumed);stepWorld(copy);assert.equal(strict(resumed),strict(copy));
    assert.deepEqual(payloadHashes(history),oldPayloadHashes);
    const report={...common,stage:'qualified-private',passed:true,end:world.tick,ticks,schema:world.schemaVersion,sha256:aulnesHash(raw),ordinaryRecoveryTick:resumed.tick,
      observation,coverage:auditCoverage(world),residents:world.pawns.map(p=>({id:p.id,name:p.name,state:p.state})),structures:world.structures.length};
    writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,end:world.tick,observation}));
  }catch(error){writeFileSync(resolve(out,'last-valid-world.json'),lastValid);writeFileSync(resolve(out,'failure.txt'),String(error));throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
