/** Derive a new reference checkpoint through eight ordinary furniture orders.
 * No V223 payload, actor, need, stock or furniture record is edited directly.
 * node --experimental-strip-types scripts/rotate-aulnes-seating-v224.ts [--publish]
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {applyCommand,stepWorld} from '../src/sim/index.ts';
import {isColonist} from '../src/sim/affiliation.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {decodeStoredSave,encodeStoredSave} from '../src/ui/save-storage-codec.ts';
import type {TestColony} from '../src/ui/test-colonies.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';

const input='public/test-saves/v223/les-aulnes-250.json',output='public/test-saves/v224/les-aulnes-sieges.json';
const manifestPath='public/test-saves/manifest.json',directory='tmp/performance-orientation-v224/seating';
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const sourceHashes=()=>{
  const paths:string[]=['scripts/rotate-aulnes-seating-v224.ts'];
  const visit=(directory:string)=>{for(const entry of readdirSync(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())visit(path);else paths.push(path);}};
  visit('src');return Object.fromEntries(paths.sort().map(path=>[path,hash(readFileSync(path))]));
};
assert.ok(process.argv.slice(2).every(arg=>arg==='--publish'));assert.ok(process.argv.slice(2).length<=1);
const publish=process.argv.includes('--publish'),sources=sourceHashes(),before=readFileSync(manifestPath,'utf8');
const catalogue=JSON.parse(before),entries=catalogue.saves as TestColony[];
assert.equal(catalogue.version,2);assert.equal(entries.length,61,'Append only to the reviewed V223 catalogue.');
const historical=Object.fromEntries(entries.map(entry=>{assert.match(entry.release,/^v\d+$/);assert.match(entry.filename,/^[a-z0-9-]+\.json$/);const path=`public/test-saves/${entry.release}/${entry.filename}`;return [path,hash(readFileSync(path))];}));
const stored=readFileSync(input,'utf8'),raw=await decodeStoredSave(stored);
assert.equal(hash(raw),'13d93da228c2ad46794592368d19f1e3e41709575807072ba4d99bd12ed7366f');
const world=deserializeWorld(raw);assert.equal(world.tick,6000);
const chairs=world.structures.filter(s=>s.kind==='armchair'&&[124,125,126].includes(s.x)&&[116,117].includes(s.z));
assert.equal(chairs.length,6);assert.ok(chairs.every(s=>s.orientation===0));
const outdoor=world.structures.filter(s=>s.kind==='dining-chair'&&[124,127].includes(s.x)&&s.z===157);
assert.equal(outdoor.length,2);assert.ok(outdoor.every(s=>s.orientation===0));
const originals=[...chairs,...outdoor].map(s=>({id:s.id,x:s.x,z:s.z,kind:s.kind,quality:s.quality,material:s.material}));
const humans=world.pawns.filter(p=>p.state!=='dead').map(p=>p.id);
const domestics=world.wildlife!.animals.filter(a=>a.domestic&&a.state!=='dead').map(a=>a.id);
const orders=originals.map(s=>({type:'install' as const,structureId:s.id,x:s.x,z:s.z,orientation:(s.kind==='armchair'?2:s.x===124?1:3) as 1|2|3}));
mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/initial.json`,raw);
const fullEncoder=new SnapshotEncoder(),sparseEncoder=new SnapshotEncoder({structureDelta:true});
const fullDecoder=new SnapshotDecoder(),sparseDecoder=new SnapshotDecoder();
const publications:Array<{tick:number;reason:string;upserts:number}>=[];
let previousFrame:ReturnType<typeof deserializeWorld>|undefined,previousValue:string|undefined;
const publishOracle=(reason:string)=>{
  const packet=structuredClone(sparseEncoder.encode(world,0,0));
  const sparse=sparseDecoder.adopt(packet),full=fullDecoder.adopt(structuredClone(fullEncoder.encode(world,0,0)));
  assert.equal(sparse.status,'applied');assert.equal(full.status,'applied');
  if(sparse.status!=='applied'||full.status!=='applied')throw Error('Transport rejected an ordinary furniture transition.');
  const exact=JSON.stringify(world);assert.equal(JSON.stringify(sparse.world),exact);assert.equal(JSON.stringify(full.world),exact);
  if(previousFrame)assert.equal(JSON.stringify(previousFrame),previousValue,'Previous furniture frame mutated.');
  previousFrame=sparse.world;previousValue=exact;
  publications.push({tick:world.tick,reason,upserts:packet.kind==='delta'&&packet.structures?packet.structures.upserted.length:world.structures.length});
};
const ownership=()=>JSON.stringify(originals.map(o=>({id:o.id,installed:world.structures.find(s=>s.id===o.id)?.orientation,packed:world.packed.find(p=>p.building.id===o.id)?.owner})));
publishOracle('initial');
for(const command of orders)assert.equal(applyCommand(world,command).ok,true,JSON.stringify(command));
publishOracle('eight ordinary install commands');let priorOwnership=ownership();
const completed:Array<{id:number;tick:number}>=[];let lastValid=raw,publicationState='not-started';
try{
  for(let elapsed=0;elapsed<4000;elapsed++){
    const prior=world.tick;stepWorld(world);assert.equal(world.tick,prior+1);
    assert.ok(humans.every(id=>world.pawns.some(p=>p.id===id&&p.state!=='dead'&&p.state!=='downed')),'Original human lost or collapsed.');
    assert.ok(domestics.every(id=>world.wildlife!.animals.some(a=>a.id===id&&a.state!=='dead'&&a.state!=='downed')),'Original domestic animal lost or collapsed.');
    const currentOwnership=ownership();if(currentOwnership!==priorOwnership){publishOracle('physical ownership/orientation transition');priorOwnership=currentOwnership;}
    for(const original of originals)if(!completed.some(c=>c.id===original.id)){
      const s=world.structures.find(s=>s.id===original.id);
      if(s?.orientation===orders.find(o=>o.structureId===original.id)!.orientation&&!world.jobs.some(j=>j.furniture?.structureId===s.id)&&!world.packed.some(p=>p.building.id===s.id))completed.push({id:s.id,tick:world.tick});
    }
    if((elapsed+1)%250===0||completed.length===8){assert.deepEqual(validateWorld(world),[]);lastValid=serializeWorld(world);writeFileSync(`${directory}/last-valid.json`,lastValid);console.log(JSON.stringify({tick:world.tick,completed}));}
    if(completed.length===8)break;
  }
  assert.equal(completed.length,8,'Eight furniture orders must physically finish within the fixed horizon.');
  for(const original of originals){const s=world.structures.find(s=>s.id===original.id)!;assert.deepEqual({id:s.id,x:s.x,z:s.z,kind:s.kind,quality:s.quality,material:s.material},original);assert.equal(s.orientation,orders.find(o=>o.structureId===s.id)!.orientation);}
  assert.deepEqual(validateWorld(world),[]);
  publishOracle('final');
  const final=serializeWorld(world),restored=deserializeWorld(final);assert.equal(serializeWorld(restored),final);
  const uninterrupted=structuredClone(world);stepWorld(uninterrupted);stepWorld(restored);assert.equal(serializeWorld(restored),serializeWorld(uninterrupted));
  const encoded=await encodeStoredSave(final);assert.equal(await decodeStoredSave(encoded),final);
  const originalEntry=entries.find(e=>e.id==='advanced-colony-v223')!;
  const entry:TestColony={...originalEntry,id:'aulnes-seating-v224',release:'v224',filename:'les-aulnes-sieges.json',label:'Les Aulnes · sièges corrigés 250×250',tick:world.tick,pawns:world.pawns.length,colonists:world.pawns.filter(p=>isColonist(p)&&!p.prisoner&&p.state!=='dead').length,
    description:'La grande colonie V223 poursuivie avec huit déplacements ordinaires pour orienter les fauteuils vers la télévision et les chaises extérieures vers leur table.',
    provenance:originalEntry.provenance+` Dérivé V224 de son checkpoint exact au tick 6000 : six commandes install sur les fauteuils 124–126 × 116–117, aux mêmes cellules, orientation 2 ; deux commandes sur les chaises extérieures 124/127 × 157, orientations 1/3. ${world.tick-6000} ticks ordinaires réellement joués jusqu’au dernier remontage, sans modification directe de meuble, stock, personne, besoin ou horloge. Identités, matériaux et qualités des huit originaux conservés ; reprise du tick suivant exacte. V223 et les 61 anciennes scènes restent inchangées.`,sha256:hash(final)};
  assert.equal(readFileSync(manifestPath,'utf8'),before);assert.deepEqual(sourceHashes(),sources);
  for(const [path,digest] of Object.entries(historical))assert.equal(hash(readFileSync(path)),digest);
  const close=before.lastIndexOf('  ]');assert.ok(close>=0);
  const after=before.slice(0,close).trimEnd()+',\n'+JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n')+'\n'+before.slice(close);
  assert.ok(Buffer.byteLength(after,'utf8')<=128*1024,'Catalogue exceeds its public reader byte limit.');
  assert.deepEqual(JSON.parse(after).saves.slice(0,61),entries);
  writeFileSync(`${directory}/final.json`,final);writeFileSync(`${directory}/les-aulnes-sieges.json`,encoded);
  writeFileSync(`${directory}/proof.json`,JSON.stringify({status:'passed',publish,input,inputStoredSha256:hash(stored),inputDecodedSha256:hash(raw),sourceHashes:sources,historicalPayloadHashes:historical,orders,completed,transportPublications:publications,initialTick:6000,finalTick:world.tick,finalSha256:hash(final),continuationSha256:hash(serializeWorld(restored)),entry},null,2)+'\n');
  if(publish){assert.ok(!existsSync(output),'Never replace a published payload.');mkdirSync('public/test-saves/v224',{recursive:true});publicationState='writing-payload';writeFileSync(output,encoded,{flag:'wx'});publicationState='payload-written';writeFileSync(manifestPath,after);publicationState='catalogue-written';}
}catch(error){writeFileSync(`${directory}/failure.json`,JSON.stringify({status:'failed',partialTickPublished:false,publicationState,lastValidTick:JSON.parse(lastValid).tick,completed,error:String(error)},null,2));throw error;}
