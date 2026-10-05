import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {isColonist} from '../src/sim/affiliation.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {ESTABLISHED_COLONY_SCENARIO_ID,prepareEstablishedColonyScenario} from '../src/sim/established-colony-scenario.ts';
import {batteryWattDays} from '../src/sim/power-battery.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,TICKS_PER_DAY,type World} from '../src/sim/types.ts';
import {decodeStoredSave,encodeStoredSave,storedSaveMetadata} from '../src/ui/save-storage-codec.ts';
import type {TestColony} from '../src/ui/test-colonies.ts';

export const ESTABLISHED_COLONY_SAVE_PATH='public/test-saves/v221/les-aulnes.json';
export const ESTABLISHED_COLONY_PRIVATE_DIRECTORY='tmp/established-colony-v221';
const MANIFEST_PATH='public/test-saves/manifest.json';
const sourcePaths=['src/sim/established-colony-scenario.ts','scripts/create-established-colony-v221-test-save.ts'] as const;
const sha256=(text:string)=>createHash('sha256').update(text).digest('hex');
const sourceHashes=()=>Object.fromEntries(sourcePaths.map(path=>[path,sha256(readFileSync(path,'utf8'))]));
const livingColonists=(w:World)=>w.pawns.filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor&&p.state!=='dead');

/** Read-only balances and the producer's existing ledgers. Quantity changes
 * are balances, never reconstructed claims of production or consumption. */
export function establishedColonySummary(w:World){
  const quantities:Record<string,number>={},structureKinds:Record<string,number>={},resourceKinds:Record<string,number>={};
  for(const pile of w.piles)quantities[pile.item]=(quantities[pile.item]??0)+pile.quantity;
  for(const structure of w.structures)structureKinds[structure.kind]=(structureKinds[structure.kind]??0)+1;
  for(const resource of w.resources)resourceKinds[resource.kind]=(resourceKinds[resource.kind]??0)+1;
  return {tick:w.tick,schemaVersion:w.schemaVersion,width:w.width,height:w.height,rng:w.rng,
    people:w.pawns.map(p=>({id:p.id,name:p.name,faction:p.faction??'colony',prisoner:!!p.prisoner,visitor:!!p.visitor,
      state:p.state,x:p.x,z:p.z,hunger:p.hunger,rest:p.rest,mood:p.mood,recreation:p.recreation.level,
      bedId:p.bedId,injuries:p.health?.injuries.length??0,background:p.background??null})),
    livingColonists:livingColonists(w).length,structures:w.structures.length,structureKinds,jobs:w.jobs.length,
    resourceKinds,quantities,stock:{...w.stock},storageCells:w.stockpiles.length,growingCells:w.growingZones.reduce((n,zone)=>n+zone.cells.length,0),
    roofedCells:w.roofing?.constructed.length??0,relationships:structuredClone(w.relationships?.links??[]),planetTiles:w.planet?.tiles.length??0,
    power:w.structures.filter(s=>s.power).map(s=>({id:s.id,kind:s.kind,on:s.power!.on,
      ...(s.battery?{storedWd:batteryWattDays(s.battery)}:{}),...(s.turret?{holdFire:s.turret.holdFire,ammoQ:s.turret.ammoQ}:{}),
      ...(s.fuel?{fuelTicks:s.fuel.ticks}:{})})),
    animals:(w.wildlife?.animals??[]).map(a=>({id:a.id,species:a.species,domestic:!!a.domestic,state:a.state,food:a.food,rest:a.rest})),
    ledgers:structuredClone({spoiled:w.spoiled,deconstructed:w.deconstructed,hunting:w.hunting??null,butchery:w.butchery??null,
      tailoring:w.tailoring??null,mechSalvage:w.mechSalvage??null,wildlife:w.wildlife?{eatenPlants:w.wildlife.eatenPlants,
        eatenNutrition:w.wildlife.eatenNutrition,eatenItems:w.wildlife.eatenItems}:null}),
    research:structuredClone(w.research??null),recentEvents:structuredClone(w.events.slice(-12)),
  };
}

interface MaturationObservation {
  ticks:number;
  pawnStateTicks:Record<string,number>;
  pawnNeedTicks:Record<string,number>;
  productionWorkPhaseTicks:number;
  productionOutputPhaseTicks:number;
  researchTaskTicks:number;
  haulingTicks:number;
  animalHandlingTicks:number;
  poweredStructureTicks:Record<string,number>;
  lowestNeeds:{hunger:number;rest:number;mood:number};
  physicalProductionOutputs:{tick:number;pawnId:number;stationId:number;recipe:string;productId:number;item:string;quantity:number}[];
  productionOutputUnits:Record<string,number>;
  events:World['events'];
}

function observe(w:World,out:MaturationObservation,knownProducts:Set<number>):void {
  out.ticks++;
  for(const pawn of livingColonists(w)){
    out.pawnStateTicks[pawn.state]=(out.pawnStateTicks[pawn.state]??0)+1;
    if(pawn.need)out.pawnNeedTicks[pawn.need.kind]=(out.pawnNeedTicks[pawn.need.kind]??0)+1;
    if(pawn.cooking?.phase==='work')out.productionWorkPhaseTicks++;
    if(pawn.cooking?.phase==='output'){
      out.productionOutputPhaseTicks++;
      const task=pawn.cooking,id=task.productId;
      // cooking.ts commits a newly allocated, physically carried product before
      // entering output. Observe that producer boundary once per original ID;
      // no final pile census is interpreted as a completed recipe.
      if(id!==null&&!knownProducts.has(id)){
        const product=w.piles.find(p=>p.id===id);
        assert.ok(product&&product.owner.type==='pawn'&&product.owner.pawnId===pawn.id,
          `Cooking output ${id} has no physical owner at tick ${w.tick}.`);
        knownProducts.add(id);
        out.physicalProductionOutputs.push({tick:w.tick,pawnId:pawn.id,stationId:task.stationId,recipe:task.recipe??'simple-meal',
          productId:id,item:product.item,quantity:product.quantity});
        out.productionOutputUnits[product.item]=(out.productionOutputUnits[product.item]??0)+product.quantity;
      }
    }
    if(pawn.research)out.researchTaskTicks++;
    if(pawn.haul)out.haulingTicks++;
    if(pawn.animalHandling)out.animalHandlingTicks++;
    out.lowestNeeds.hunger=Math.min(out.lowestNeeds.hunger,pawn.hunger);
    out.lowestNeeds.rest=Math.min(out.lowestNeeds.rest,pawn.rest);
    out.lowestNeeds.mood=Math.min(out.lowestNeeds.mood,pawn.mood);
  }
  for(const structure of w.structures)if(structure.power?.on)
    out.poweredStructureTicks[structure.kind]=(out.poweredStructureTicks[structure.kind]??0)+1;
  // Preserve the actual producer messages at their new tick, including harvest,
  // construction, care and animal products that have no dedicated World ledger.
  out.events.push(...w.events.filter(event=>event.tick===w.tick).map(event=>({...event})));
}

export function establishedColonyEntry(w:World,initialTick:number,ticks:number,digest:string):TestColony {
  return {id:ESTABLISHED_COLONY_SCENARIO_ID,release:'v221',label:'Les Aulnes · colonie en activité',filename:'les-aulnes.json',
    description:`Une colonie aménagée de ${livingColonists(w).length} habitants, puis réellement poursuivie pendant ${ticks} ticks : logements, repas, cultures, élevage, ateliers, soins, recherche et défense partagent le même quotidien.`,
    pawns:w.pawns.length,colonists:livingColonists(w).length,width:w.width,height:w.height,tick:w.tick,
    focus:['quotidien de colonie','biographies et relations','nourriture et chambre froide','cultures et élevage','ateliers et recherche','soins et prison','énergie et défense','globe et sauvegarde'],
    steps:[
      'Charger en pause, puis reprendre à vitesse 1 pour découvrir la colonie. Les horaires, priorités, besoins et factures sont déjà réglés ; les stocks sont finis et les colons poursuivent leurs activités ordinaires.',
      'Visiter les chambres et la salle commune. Dans les dossiers Bio, Social et Besoins, consulter les vrais passés, liens, aptitudes et conditions de vie des habitants.',
      'Suivre les aliments entre champs, cuisine, réserve froide et table ; consulter aussi les factures des ateliers et le projet de recherche. Les bâtiments et stocks initiaux sont préparés, tandis que les travaux de la journée écoulée proviennent du moteur.',
      'Inspecter le troupeau, les soins et la prison, puis ouvrir Monde pour voir le globe et préparer un voyage avec les provisions réellement disponibles. Aucun départ ni échange n’est fourni par la préparation.',
      'Les deux tourelles sont autorisées à tirer et à se réarmer. Observer leur alimentation et leur champ de tir ; sauvegarder, recharger et reprendre les activités ou développer la colonie.',
    ],prepared:true,
    provenance:`Colonie originale V221 préparée avec prepareEstablishedColonyScenario(), schéma ${w.schemaVersion}, ${w.width}×${w.height}, tick initial ${initialTick}. Village, bâtiments, sols, toits, réserves, technologies connues, équipements, politiques, cultures, animaux domestiques et état clinique initial sont une dotation déclarée, pas les gains d'une campagne naturelle. Les adultes et biographies proviennent des producteurs actuels de création ; les relations préparées ne sont pas une romance reconstruite. Après cette préparation, ${ticks} appels ordinaires à stepWorld, soit ${(ticks/TICKS_PER_DAY).toFixed(3)} jour(s) local(aux) réellement écoulé(s), sans commande, saut d'horloge, injection de stock, réparation d'état, retrait d'incident ou attribution rétroactive. Checkpoint final au tick ${w.tick}, validé et repris exactement ; consommations, mouvements, travaux, besoins et événements du suffixe restent réels. Aucun groupe ni voyage n'est fabriqué pour ce catalogue. Cette continuation bornée ne certifie ni une partie entièrement développée depuis zéro, une campagne longue, la performance générale ou une parité Core exhaustive.`,
    sha256:digest,
  };
}

/** Preserve every historical byte. A published identity can only be encountered
 * again with exactly the same entry and payload; it is never regenerated in place. */
export function appendEstablishedColonyEntry(before:string,entry:TestColony):string {
  const manifest=JSON.parse(before);assert.equal(manifest.version,2);
  assert.ok(Array.isArray(manifest.saves)&&manifest.saves.length>0&&manifest.saves.length<=64,'Invalid catalogue envelope.');
  const entries=manifest.saves as TestColony[];
  assert.ok(entries.every(save=>save&&typeof save==='object'&&typeof save.id==='string'
    &&typeof save.release==='string'&&typeof save.filename==='string'),'Invalid catalogue identity.');
  const existing=entries.find(save=>save.id===entry.id);
  if(existing){assert.deepEqual(existing,entry,'The established colony is already published with different metadata.');return before;}
  assert.equal(entries.length,59,'V221 must append the 60th scene; review a changed catalogue before publishing.');
  assert.ok(!entries.some(save=>save.release===entry.release&&save.filename===entry.filename),'Duplicate established-colony path.');
  const close=before.lastIndexOf('  ]');assert.ok(close>=0,'Unexpected catalogue formatting.');
  const formatted=JSON.stringify(entry,null,2).split('\n').map(line=>'    '+line).join('\n');
  const after=before.slice(0,close).trimEnd()+',\n'+formatted+'\n'+before.slice(close);
  assert.deepEqual(JSON.parse(after).saves.slice(0,entries.length),entries,'Historical catalogue entries changed.');
  return after;
}

interface GenerationOptions {ticks:number;publish:boolean}
export function parseGenerationOptions(args:readonly string[]):GenerationOptions {
  let ticks=TICKS_PER_DAY,publish=false,mode:string|undefined;
  for(let i=0;i<args.length;i++){
    const arg=args[i]!;
    if(arg==='--publish'||arg==='--dry-run'){
      assert.equal(mode,undefined,'Choose only one generation mode.');mode=arg;publish=arg==='--publish';
    }else if(arg==='--ticks'){
      const raw=args[++i];assert.ok(raw!==undefined&&/^\d+$/.test(raw),'--ticks requires a non-negative integer.');ticks=Number(raw);
    }else if(arg.startsWith('--ticks=')){
      const raw=arg.slice('--ticks='.length);assert.ok(/^\d+$/.test(raw),'--ticks requires a non-negative integer.');ticks=Number(raw);
    }else throw Error(`Unknown generation argument: ${arg}`);
  }
  assert.ok(Number.isSafeInteger(ticks)&&ticks>=0&&ticks<=100000,'Choose between 0 and 100000 real maturation ticks.');
  assert.ok(!publish||ticks>0,'Publication requires a real simulated suffix. Use --dry-run --ticks 0 to inspect preparation.');
  return {ticks,publish};
}

export async function generateEstablishedColony(options:GenerationOptions):Promise<void> {
  assert.equal(SCHEMA_VERSION,198,'Do not regenerate V221 under a later schema.');
  assert.ok(Number.isSafeInteger(options.ticks)&&options.ticks>=0&&options.ticks<=100000);
  assert.ok(!options.publish||options.ticks>0);
  const sources=sourceHashes(),world=prepareEstablishedColonyScenario();
  assert.deepEqual(validateWorld(world),[],'Invalid established-colony preparation.');
  const initialTick=world.tick,initial=establishedColonySummary(world),prepared=serializeWorld(world);
  assert.equal(serializeWorld(deserializeWorld(prepared)),prepared,'Preparation does not roundtrip exactly.');
  const protectedHumanIds=world.pawns.filter(p=>(isColonist(p)&&!p.visitor||!!p.prisoner)&&p.state!=='dead').map(p=>p.id);
  const protectedAnimalIds=(world.wildlife?.animals??[]).filter(a=>a.domestic&&a.state!=='dead').map(a=>a.id);
  const observations:MaturationObservation={ticks:0,pawnStateTicks:{},pawnNeedTicks:{},productionWorkPhaseTicks:0,productionOutputPhaseTicks:0,
    researchTaskTicks:0,haulingTicks:0,animalHandlingTicks:0,poweredStructureTicks:{},lowestNeeds:{hunger:100,rest:100,mood:100},
    physicalProductionOutputs:[],productionOutputUnits:{},events:[]};
  const knownProducts=new Set(world.piles.map(p=>p.id)),maturationStarted=performance.now();
  let priorProgressAt=maturationStarted,priorProgressTick=0;
  const directory=ESTABLISHED_COLONY_PRIVATE_DIRECTORY;mkdirSync(directory,{recursive:true});
  writeFileSync(`${directory}/prepared.json`,prepared);
  let lastValidated=prepared;
  writeFileSync(`${directory}/last-valid.json`,lastValidated);
  try {
    for(let elapsed=0;elapsed<options.ticks;elapsed++){
      const previousTick=world.tick;stepWorld(world);assert.equal(world.tick,previousTick+1,'Simulation skipped a local tick.');
      for(const id of protectedHumanIds){
        const pawn=world.pawns.find(p=>p.id===id);
        assert.ok(pawn&&pawn.state!=='dead'&&pawn.state!=='downed',`Person ${id} disappeared, died or collapsed at tick ${world.tick}.`);
      }
      for(const id of protectedAnimalIds){
        const animal=world.wildlife?.animals.find(a=>a.id===id);
        assert.ok(animal&&animal.state!=='dead'&&animal.state!=='downed',`Domestic animal ${id} disappeared, died or collapsed at tick ${world.tick}.`);
      }
      observe(world,observations,knownProducts);
      if((elapsed+1)%1000===0||elapsed+1===options.ticks){
        assert.deepEqual(validateWorld(world),[],`Invalid established colony at tick ${world.tick}.`);
        lastValidated=serializeWorld(world);writeFileSync(`${directory}/last-valid.json`,lastValidated);
        const progressAt=performance.now();
        console.log(JSON.stringify({phase:'maturation',elapsedTicks:elapsed+1,tick:world.tick,livingColonists:livingColonists(world).length,
          elapsedMilliseconds:progressAt-maturationStarted,lastIntervalMilliseconds:progressAt-priorProgressAt,
          lastIntervalTicks:elapsed+1-priorProgressTick,wallMillisecondsPerObservedTick:(progressAt-priorProgressAt)/(elapsed+1-priorProgressTick),
          lowestNeeds:observations.lowestNeeds,productionWorkPhaseTicks:observations.productionWorkPhaseTicks,physicalProductionOutputUnits:observations.productionOutputUnits,
          haulingTicks:observations.haulingTicks}));
        priorProgressAt=progressAt;priorProgressTick=elapsed+1;
      }
    }
    assert.equal(world.tick,initialTick+options.ticks);
    assert.deepEqual(validateWorld(world),[],'Invalid final established colony.');
    const raw=serializeWorld(world),restored=deserializeWorld(raw);
    assert.deepEqual(restored,world,'Final deserialization changed the World.');
    assert.equal(serializeWorld(restored),raw,'Final checkpoint does not roundtrip exactly.');
    const stored=await encodeStoredSave(raw);assert.equal(await decodeStoredSave(stored),raw,'Storage codec changed the final World.');
    const metadata=storedSaveMetadata(stored);assert.ok(metadata,'Missing final storage metadata.');
    assert.equal(metadata.tick,world.tick);assert.equal(metadata.width,world.width);assert.equal(metadata.height,world.height);
    assert.equal(metadata.schemaVersion,world.schemaVersion);
    const entry=establishedColonyEntry(world,initialTick,options.ticks,sha256(raw));
    assert.ok(entry.colonists>0&&entry.colonists<=entry.pawns);
    assert.ok([entry.pawns,entry.colonists,entry.width,entry.height,entry.tick].every(Number.isSafeInteger));
    assert.deepEqual(sourceHashes(),sources,'Preparation or generation source changed during maturation.');
    // Prepare and verify both halves before performing any public write.
    const before=options.publish?readFileSync(MANIFEST_PATH,'utf8'):undefined;
    const after=before===undefined?undefined:appendEstablishedColonyEntry(before,entry);
    if(options.publish&&existsSync(ESTABLISHED_COLONY_SAVE_PATH))
      assert.equal(readFileSync(ESTABLISHED_COLONY_SAVE_PATH,'utf8'),stored,'Published established-colony payload differs; refusing replacement.');
    if(options.publish&&before===after)
      assert.ok(existsSync(ESTABLISHED_COLONY_SAVE_PATH),'Published entry has no payload; inspect the broken publication before repairing it.');
    writeFileSync(`${directory}/final.json`,raw);writeFileSync(`${directory}/les-aulnes.json`,stored);
    writeFileSync(`${directory}/generation.json`,JSON.stringify({status:'passed',mode:options.publish?'publish':'dry-run',sourceHashes:sources,
      ticksPerLocalDay:TICKS_PER_DAY,maturationTicks:options.ticks,preparedSha256:sha256(prepared),finalSha256:entry.sha256,
      preparedBytes:Buffer.byteLength(prepared),finalRawBytes:Buffer.byteLength(raw),finalStoredBytes:Buffer.byteLength(stored),
      initial,final:establishedColonySummary(world),observations,maturationWallMilliseconds:performance.now()-maturationStarted,
      observationLimits:'Activity counts are person/structure ticks observed after each real step; researchTaskTicks includes travel and productionWorkPhaseTicks includes a waiting work phase. physicalProductionOutputs observes the real carried product when cooking enters output, once per identity absent from the prepared inventory; this pipeline also produces clothes, weapons and blocks. Butchery side products are covered separately by its existing ledger. Inventory differences are balances; consumption is not reconstructed from them. Raw new-tick producer events are retained. Wall intervals include observations, validation and filesystem checkpoints; they are not a simulation benchmark. No browser, long-campaign or general performance claim.',
      checks:['strict preparation and final validation','one actual increment per local tick','original humans and domestic animals survive without collapse',
        'periodic validated checkpoint','final World and serialized roundtrip exact','ordinary storage codec and metadata exact','generation sources unchanged'],entry,
    },null,2)+'\n');
    if(options.publish){
      if(!existsSync(ESTABLISHED_COLONY_SAVE_PATH)){mkdirSync(dirname(ESTABLISHED_COLONY_SAVE_PATH),{recursive:true});writeFileSync(ESTABLISHED_COLONY_SAVE_PATH,stored,{flag:'wx'});}
      if(after!==before)writeFileSync(MANIFEST_PATH,after!);
    }
    console.log(JSON.stringify({path:options.publish?ESTABLISHED_COLONY_SAVE_PATH:`${directory}/les-aulnes.json`,proof:`${directory}/generation.json`,entry}));
  }catch(cause){
    // Do not serialize or publish a potentially partial tick after an exception.
    const error=cause instanceof Error?`${cause.name}: ${cause.message}`:String(cause);
    writeFileSync(`${directory}/generation.json`,JSON.stringify({status:'failed',mode:options.publish?'publish':'dry-run',sourceHashes:sources,
      requestedTicks:options.ticks,initial,lastValidatedTick:JSON.parse(lastValidated).tick,lastValidatedSha256:sha256(lastValidated),error,
      checkedCheckpoint:`${directory}/last-valid.json`,partialTickPublished:false},null,2)+'\n');
    throw cause;
  }
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-established-colony-v221-test-save.ts'))
  await generateEstablishedColony(parseGenerationOptions(process.argv.slice(2)));
