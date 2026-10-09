/** Maintain one integrated reference; published checkpoints stay immutable.
 * ROOT: --ticks 1500, inspect private result, then --publish-checkpoint PATH.
 * The declared extension is followed only by ordinary engine steps. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isColonist} from '../src/sim/affiliation.ts';
import {addDeepDeposit} from '../src/sim/deep-resources.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {createOrbitalShip} from '../src/sim/orbital.ts';
import {reconcilePower} from '../src/sim/power.ts';
import {enableQuests} from '../src/sim/quests.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {reconcileTemperature} from '../src/sim/temperature.ts';
import {planCommandDrops,releaseWork} from '../src/sim/work-release.ts';
import {clearQueuedOrders} from '../src/sim/player-orders.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {decodeStoredSave,encodeStoredSave} from '../src/ui/save-storage-codec.ts';
import type {TestColony} from '../src/ui/test-colonies.ts';
import {applyAulnesCurrentLayout} from './aulnes-current-layout.ts';
import {applyAulnesCurrentActivities,unlockAulnesCurrentResearch} from './aulnes-current-activities.ts';

const SOURCE='public/test-saves/v224/les-aulnes-sieges.json';
const MANIFEST='public/test-saves/manifest.json';
const RELEASE='v284',FILENAME='les-aulnes-integrees.json';
const hash=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const preparations=new WeakMap<World,unknown>();

/** Creation-only extension of V224, not a grant made when a player loads it.
 * Existing work is released through its normal ownership preflight. Supplies,
 * known research, buildings, fitted prosthesis, surveyed ore and a passing ship
 * are declared scenario conditions; no completed recipe/trade is fabricated. */
export function prepareCurrentAulnes(source:World):World {
  assert.equal(SCHEMA_VERSION,218);assert.equal(source.width,250);assert.equal(source.height,250);
  assert.ok(!source.structures.some(s=>s.kind==='biofuel-refinery'),'Use the immutable V224 source for this extension.');
  const world=structuredClone(source);
  for(const pawn of world.pawns.filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor)){
    const plan=planCommandDrops(world,{type:'clear-orders',pawnId:pawn.id});
    assert.ok(plan,`No safe place to interrupt ${pawn.name}'s initial activity.`);
    assert.ok(releaseWork(world,pawn,plan),`Initial cargo could not be conserved for ${pawn.name}.`);
    clearQueuedOrders(world,pawn);delete pawn.priorityWork;
  }
  const research=unlockAulnesCurrentResearch(world);
  const sites=applyAulnesCurrentLayout(world);
  const activities=applyAulnesCurrentActivities(world,sites);
  const drill=world.structures.find(s=>s.id===sites.drillId)!;
  assert.equal(addDeepDeposit(world,'steel',[{x:drill.x,z:drill.z},{x:drill.x+1,z:drill.z},{x:drill.x,z:drill.z+1}],90),3);
  if(drill.power)drill.power.switchOn=true;
  if(!world.quests)enableQuests(world);
  reconcileTemperature(world);reconcilePower(world);refreshStock(world);
  const ship=createOrbitalShip(world,'exotic');assert.ok(ship,'The prepared passing trader needs a real finite stock owner.');
  preparations.set(world,{research,sites,activities,shipId:ship.id,surveyedSteel:270});
  return world;
}

/** Presence/readiness only. It never claims that all incidents or branches were
 * played, or that every quest is eligible in a 14-colonist colony. */
export function auditCoverage(world:World):Record<string,boolean> {
  const has=(kind:World['structures'][number]['kind'])=>world.structures.some(s=>s.kind===kind);
  const bill=(recipe:string)=>world.structures.some(s=>s.bills?.some(b=>b.recipe===recipe));
  const owned=world.wildlife?.animals.filter(a=>a.domestic)??[];
  return {
    habitat:has('bed')&&has('table-square')&&has('tube-television'),
    logistics:world.stockpiles.length>0&&world.piles.some(p=>p.owner.type==='ground'),
    production:has('machining-table')&&has('fabrication-bench'),research:!!world.research,
    hydroponics:has('hydroponics-basin')&&world.growingZones.some(z=>z.basinId!==undefined),
    clinicalSupport:has('hospital-bed')&&has('vitals-monitor')&&world.tiles.some(t=>t.floor==='sterile-tile'),
    medicineProduction:has('drug-lab')&&bill('make-medicine'),
    woodenProstheses:world.pawns.some(p=>p.health?.artificialParts?.length),
    prison:world.pawns.some(p=>p.prisoner)&&world.structures.some(s=>s.prisoner),
    animalCare:owned.length>=9&&world.pawns.some(p=>p.priorities.doctor>0),
    animalFeeding:owned.some(a=>a.domestic?.care!==undefined)&&world.piles.some(p=>p.item==='rice'),
    combat:has('mini-turret')&&world.piles.some(p=>p.owner.type==='equipment'&&p.kind==='weapon'),
    emp:world.piles.some(p=>p.item==='emp-launcher'),deepDrilling:has('ground-scanner')&&has('deep-drill')&&!!world.deepResources,
    orbitalTrade:has('comms-console')&&has('orbital-beacon')&&!!world.orbital,
    nutrientPaste:has('nutrient-paste-dispenser')&&has('hopper'),
    biofuel:has('biofuel-refinery')&&has('chemfuel-generator')&&bill('chemfuel-from-wood'),
    social:!!world.relationships?.links.length,planet:!!world.planet?.tiles.length,
    quests:!!world.quests,incidents:!!world.raids&&!!world.miscIncidents&&!!world.worldIncidents,
  };
}

function strict(world:World,checkSnapshot=false):string {
  assert.deepEqual(validateWorld(world),[]);
  const raw=serializeWorld(world);assert.equal(serializeWorld(deserializeWorld(raw)),raw);
  if(checkSnapshot){
    const adopted=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(world,0,0)));
    assert.equal(adopted.status,'applied');if(adopted.status==='applied')assert.equal(serializeWorld(adopted.world),raw);
  }
  return raw;
}

function oldPayloads(entries:TestColony[]):Record<string,string> {
  return Object.fromEntries(entries.map(e=>{
    assert.match(e.release,/^v[1-9][0-9]{1,2}$/);assert.match(e.filename,/^[a-z0-9-]+\.json$/);
    const path=`public/test-saves/${e.release}/${e.filename}`;return [path,hash(readFileSync(path))];
  }));
}

async function publish(path:string):Promise<void> {
  const stored=readFileSync(path,'utf8'),raw=await decodeStoredSave(stored),world=deserializeWorld(raw);
  // A checkpoint written before a failed final control is not publishable.
  // Match the completed generation report rather than trusting its filename.
  const folder=dirname(resolve(path));assert.ok(!existsSync(resolve(folder,'failure.txt')),'A failed generation cannot be published.');
  const report=JSON.parse(readFileSync(resolve(folder,'report.json'),'utf8'));
  assert.equal(report.source,SOURCE);assert.equal(report.sourceStoredHash,hash(readFileSync(SOURCE)));
  assert.equal(report.start,6934);assert.equal(report.end,world.tick);assert.equal(report.ticks,world.tick-report.start);
  assert.ok(report.ticks>0);assert.equal(report.ordinaryRecoveryTick,world.tick+1);
  assert.equal(report.sha256,hash(raw));assert.equal(report.schema,SCHEMA_VERSION);
  assert.deepEqual([world.width,world.height],[250,250]);
  // The independent tests cover Snapshot; native loading exercises it on the
  // published checkpoint. Do not repeat those large clones in publication.
  assert.equal(strict(world),raw);assert.deepEqual(Object.values(auditCoverage(world)),Array(21).fill(true));
  const manifest=JSON.parse(readFileSync(MANIFEST,'utf8')) as {version:number;saves:TestColony[]};
  const history=structuredClone(manifest.saves),before=oldPayloads(history),target=`public/test-saves/${RELEASE}/${FILENAME}`;
  assert.ok(!existsSync(target),'Published checkpoints are immutable; select a new release.');
  const entry:TestColony={id:'aulnes-current',release:RELEASE,filename:FILENAME,label:'Les Aulnes · référence intégrée 250×250',
    description:'Village avancé : 14 colons, prisonnier, cinq espèces domestiques, hôpital, hydroponie, pharmacie, industrie, forage, commerce orbital et pâte nutritive. Extension préparée puis activités ordinaires réellement jouées.',
    pawns:world.pawns.length,colonists:world.pawns.filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor&&p.state!=='dead').length,
    width:world.width,height:world.height,tick:world.tick,prepared:true,sha256:hash(raw),
    provenance:'Continuation du checkpoint V224 (tick6934), migrée au schéma218. Installations, neuf recherches, dotation finie, patients, prothèse, veine et marchand déclarés ; puis moteur ordinaire sans accélération des règles. Les anciennes références restent immuables.',
    focus:['colonie intégrée','hôpital et pharmacie','hydroponie','industrie et énergie','forage profond','commerce orbital','élevage','vie sociale','défense'],
    steps:['Choisir cette première entrée puis explorer le village ; conserver la pause pour inspecter les activités.',
      'Au sud : pharmacie (113,173), raffinerie (128,173), foreuse (110,165) ; serre hydroponique à l’ouest.',
      'À l’est : hôpital et moniteurs, distributeur (180,101), générateur (166,156). Console orbitale (114,127).',
      'Le marchand de passage part définitivement après4000ticks ; négocier avec Léonie avant son départ.',
      'Les incidents suivent leurs calendriers ordinaires. Les offres d’asile nécessitent moins de12colons ; elles ne sont pas forcées dans ce village.']};
  assert.ok(history.length<64&&!history.some(e=>e.id===entry.id),'This first current pointer requires one catalogue slot.');
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,stored,'utf8');
  manifest.saves=[entry,...history];writeFileSync(MANIFEST,JSON.stringify(manifest,null,2)+'\n','utf8');
  assert.deepEqual(oldPayloads(history),before);assert.deepEqual(manifest.saves.slice(1),history);
  console.log(JSON.stringify({published:target,entry,oldPayloadsExact:Object.keys(before).length}));
}

async function main():Promise<void> {
  const args=process.argv.slice(2),at=args.indexOf('--publish-checkpoint');
  if(at>=0){assert.ok(args[at+1]);await publish(args[at+1]!);return;}
  const ticksAt=args.indexOf('--ticks'),ticks=ticksAt<0?1500:Number(args[ticksAt+1]);
  assert.ok(Number.isSafeInteger(ticks)&&ticks>=1&&ticks<=6000,'Use a bounded ordinary continuation.');
  mkdirSync('tmp',{recursive:true});const out=mkdtempSync('tmp/aulnes-v284-generation-');
  const stored=readFileSync(SOURCE,'utf8'),source=deserializeWorld(await decodeStoredSave(stored)),world=prepareCurrentAulnes(source);
  const preparation=preparations.get(world),start=world.tick,initial=strict(world);
  writeFileSync(resolve(out,'prepared-world.json'),initial);console.log(JSON.stringify({output:out,start,ticks,coverage:auditCoverage(world)}));
  const observation={taskTicks:{} as Record<string,number>,outputs:[] as unknown[],poweredTicks:{} as Record<string,number>,events:[] as World['events'],workOrders:[] as unknown[]};
  const products=new Set(world.piles.map(p=>p.id));
  const originalPeople=source.pawns.map(p=>p.id);let lastValid=initial;
  try{
    for(let i=0;i<ticks;i++){
      stepWorld(world);
      // Player-like work intentions start only after the network has really
      // powered up. Normal preflight conserves the workers' old possessions.
      if(observation.workOrders.length<2){
        for(const [name,kind] of [['Émile','biofuel-refinery'],['Basile','drug-lab']] as const){
          const pawn=world.pawns.find(p=>p.name===name)!,bench=world.structures.find(s=>s.kind===kind)!;
          if((bench.power&&!bench.power.on)||observation.workOrders.some(order=>(order as {pawnId:number}).pawnId===pawn.id))continue;
          const result=applyCommand(world,{type:'order-cook',pawnId:pawn.id,structureId:bench.id,queue:false});
          assert.ok(result.ok,`${name}: ${result.reason}`);
          observation.workOrders.push({tick:world.tick,pawnId:pawn.id,stationId:bench.id,kind});
        }
      }
      for(const p of world.pawns){
        for(const key of ['cooking','research','haul','tend','feed','animalCare','animalFeed','animalHandling','deepWork','ward','cleaning','need'] as const)
          if(p[key])observation.taskTicks[key]=(observation.taskTicks[key]??0)+1;
        if(p.cooking?.phase==='output'&&p.cooking.productId!==null&&!products.has(p.cooking.productId)){
          const pile=world.piles.find(q=>q.id===p.cooking!.productId);
          if(pile){observation.outputs.push({tick:world.tick,pawnId:p.id,recipe:p.cooking.recipe,item:pile.item,quantity:pile.quantity});products.add(pile.id);}
        }
      }
      for(const s of world.structures)if(s.power?.on)observation.poweredTicks[s.kind]=(observation.poweredTicks[s.kind]??0)+1;
      observation.events.push(...world.events.filter(e=>e.tick===world.tick));
      assert.ok(originalPeople.every(id=>world.pawns.some(p=>p.id===id&&p.state!=='dead')),`A reference resident was lost at tick${world.tick}.`);
      if((i+1)%300===0||i===ticks-1){
        lastValid=strict(world);writeFileSync(resolve(out,'last-valid-world.json'),lastValid);
        (globalThis as typeof globalThis & {gc?:()=>void}).gc?.();
        console.log('ordinary checkpoint',world.tick);
      }
    }
    assert.equal(observation.workOrders.length,2,'Both new workshops need physically admitted work intentions.');
    const raw=strict(world);writeFileSync(resolve(out,'played-world.json'),raw);
    const encoded=await encodeStoredSave(raw);assert.equal(await decodeStoredSave(encoded),raw);
    writeFileSync(resolve(out,'les-aulnes-integrees.json'),encoded);
    (globalThis as typeof globalThis & {gc?:()=>void}).gc?.();
    const resumed=deserializeWorld(raw),copy=structuredClone(world);
    stepWorld(resumed);stepWorld(copy);assert.equal(strict(resumed),strict(copy));
    const report={source:SOURCE,sourceStoredHash:hash(stored),start,end:world.tick,ticks,ordinaryRecoveryTick:resumed.tick,
      schema:world.schemaVersion,sha256:hash(raw),coverage:auditCoverage(world),preparation,observation,
      residents:world.pawns.map(p=>({id:p.id,name:p.name,state:p.state,hunger:p.hunger,rest:p.rest,mood:p.mood})),
      structures:world.structures.length,animals:world.wildlife?.animals.filter(a=>a.domestic).map(a=>({id:a.id,species:a.species,state:a.state})),
      deepResources:world.deepResources,orbital:world.orbital};
    writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({output:out,end:world.tick,taskTicks:observation.taskTicks,outputs:observation.outputs,coverage:auditCoverage(world)}));
  }catch(error){writeFileSync(resolve(out,'last-valid-world.json'),lastValid);writeFileSync(resolve(out,'failure.txt'),String(error));throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
