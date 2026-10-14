/* Mode d'emploi ROOT (préparation non exécutée)
 * 1. Revoir/typer ce fichier privé et les sélecteurs sur le produit V358 livré.
 *    Config : tmp/early-access-v359/playwright.private.config.mts. Aucun serveur
 *    n'est démarré ici, aucun retry automatique. V359=1 ; V359_SEGMENT=01.
 *    V359_BODY_SECONDS=120 (100–150) ; V359_END_TICK=<borne utile>, défaut +3000.
 * 2. Départ littéral66037 par défaut. Pour chaque reprise : V359_INPUT=<export>,
 *    V359_INPUT_SHA=<SHA exact>, V359_LEDGER=<ledger.json précédent>,
 *    V359_LEDGER_SHA=<SHA ledger>. Le ledger doit pointer sur ce même checkpoint.
 *    Le fallback last-adopted n'est pas un export UI ; validation ROOT obligatoire
 *    avant reprise. Un danger reste RED et doit être traité par l'étape2.
 * 3. Observation sans gestes par défaut. V359_CONFIGURE_RESERVE=1 ne modifie
 *    les filtres que si une cellule de la zone19652 est observée vide/toitée.
 *    V359_PREPARE_WOOD=1 désigne au maximum2arbres matures admissibles à14cases.
 *    V359_ACTIONS=<JSON Decision[]> offre au maximum12gestes ordinaires via
 *    perform : priorités/culture/facture/stockage/construction bornée/coupe.
 *    ROOT choisit ces gestes depuis l'état réel. Pas d'annexe automatique.
 *    Ne pas rejouer le fichier d'actions au segment suivant si déjà acquis.
 * Mode V359_RETREAT=1 : défaut conservation66104/SHA16b713... et ledger01b
 * SHA22adb0... ; la seule menace admise est gazelle18565/startedAtCore661000.
 * UI mobiliser/déplacer Iris124111, interdireporte18648 après arrivée, observer
 * fermeturefraction0+tousdedans avant démobilisation ; aucun besoin/HP/RNG modifié.
 * Attendre borné la vraie récupération naturelle : sinon partial/RED avec export.
 * Pour reprise d'un résultat partiel fournir les quatre inputs/SHA du nouveau
 * checkpoint/ledger ; aucun geste annexe. Trois images max, pas plus de checkpoints.
 * 4. Trois exports/recharges max et deux PNG horsrepli : initial, ingestion à la table
 *    déjà acquise si observée, final. Au danger/incidence : conservation sans
 *    recharge ni reprise. Première exception préservée, fallback strict séparé.
 * 5. Ledger : repas frais fermés GAP8/INGEST>8/rate<=1, récoltes à source/job/
 *    acteur observés puis nouveaux pieds, sommeil observé puis lié au checkpoint,
 *    événements cuisine/construction seulement observés. Un chaînage de deux
 *    pieds n'est pas une cohorte entière : coverage et adéquation de réserve
 *    restent à relire ROOT, campaignQualified reste false. Une limite dépassée
 *    marque truncated ; jamais considérer une preuve absente comme acquise.
 * Points à relire : arrêt66100, identité de sélection de la zone dans l'inspecteur,
 * cadence réelle des snapshots/borneGAP8, source qui fusionne ou change et donc
 * invalide le repas, calendriers incidents et les modèles typés après V358.
 * Les règles/IDs/RNG/besoins du World ne sont jamais modifiés par la préparation.
 */
import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {footprintCells} from '../../src/sim/definitions';
import {ITEM_DEFINITIONS,nutritionOf,type ItemId} from '../../src/sim/items';
import {INGEST_TICKS} from '../../src/sim/eating';
import {physicalEatingFactor} from '../../src/sim/health-rules';
import {doorOpenness} from '../../src/sim/door-rules';
import {plantGrowth,choppable} from '../../src/sim/plants';
import {canDesignate} from '../../src/sim/engine';
import {world,pause,panel,expectWorld,observeErrors,tool,cell} from '../../tests/integration/helpers';
import {perform,revealCells} from '../../tests/integration/player-actions';
import type {Decision} from '../../tests/scenarios/colony-player';
import type {World,MaterialPile,WorldEvent,Command} from '../../src/sim/types';

// PRIVATE proposal, ROOT alone adopts/types/runs. Only UI controls write the live game.
const ROOT_INPUT='tmp/early-access-v356/native-continuation/dining-day-v356-continuati-15b77-31-no-replayed-construction/continuation-final.json';
const ROOT_SHA='1fcd423d4371197f5e9d6f7c3da2185b9d9743cde33d32dd9c0bcdf22aeecfd9';
const ORIGINALS=[18530,18532,18534],GAP=8,TABLE={x:121,z:111},SEAT={x:123,z:111};
const tableId=19697,seatId=19695;
const RETREAT_INPUT='tmp/early-access-v359/native-01b/colony-survival-v359-V359--86f33-are-not-campaign-completion/conservation.json';
const RETREAT_SHA='16b713dd5669896b774875e30687528a95b6783b1c5c9b7e1551834e9bd8e2ec';
const RETREAT_LEDGER='tmp/early-access-v359/native-01b/colony-survival-v359-V359--86f33-are-not-campaign-completion/ledger.json';
const RETREAT_LEDGER_SHA='22adb0a6fb175fb7e080f4a2e58b015de87c5be88709a12264f4f1475e52ad50';
const THREAT=18565,THREAT_STARTED_CORE=661000,IRIS=18530,DOOR=18648,REFUGE={x:124,z:111};
const inside=(c:{x:number;z:number})=>c.x>=121&&c.x<=124&&c.z>=111&&c.z<=114;
const stable=(w:World,p:World['pawns'][number])=>p.moveCooldown===0&&(p.motion?.end??w.tick)<=w.tick;
const allInside=(w:World)=>w.pawns.filter(p=>ORIGINALS.includes(p.id)).every(p=>inside(p)&&stable(w,p));
const crossesInside=(from:{x:number;z:number},to:{x:number;z:number})=>Math.max(from.x,to.x)>=121&&Math.min(from.x,to.x)<=124&&Math.max(from.z,to.z)>=111&&Math.min(from.z,to.z)<=114;
const doorIsolates=(w:World)=>{const d=w.structures.find(s=>s.id===DOOR);return !!d?.door&&d.x===125&&d.z===114&&d.door.forbidden&&!d.door.holdOpen&&!d.door.open&&doorOpenness(d,w.tick)===0;};
const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
const sum=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const foods=(w:World)=>w.piles.filter(p=>p.kind==='food');
const field=(w:World)=>{const z=w.growingZones.find(z=>z.id===18770);return w.resources.filter(r=>r.kind==='rice'&&!!z?.cells.includes(r.z*w.width+r.x));};
const incidentCounters=(w:World)=>({raid:w.raids?.serial??0,flu:w.fluIncidents?.episodes??0,immune:w.fluIncidents?.immuneDiseases?.episodes??0,fire:w.fires?.ledger.ignitions??0,small:w.smallIncidents?.incidents??0,heat:w.miscIncidents?.heatwaves??0,blight:w.miscIncidents?.cropBlights?.count??0,cold:w.miscIncidents?.weather?.coldSnaps??0,eclipse:w.miscIncidents?.weather?.eclipses??0,short:w.miscIncidents?.shortCircuits?.count??0,flare:w.worldIncidents?.flares??0,flashstorm:w.flashstorm?.storms??0,pod:w.podRescues?.serial??0});

type MealTrace={pawnId:number;name:string;sourceId:number;sourceObservedTick:number;source:MaterialPile|null;sourceRemainder?:number;quantity:number;carryId:number;item:ItemId;heldTick:number;lastTick:number;lastActualIngestTick?:number;lastProgress?:number;lastHunger?:number;invalidReason?:string;invalidAt?:number;dining?:unknown;ingestTick?:number;ingestProgress?:number;hungerBefore?:number;completion?:unknown};
type HarvestWitness={sourceId:number;jobId:number;pawnId:number;name:string;cell:{x:number;z:number};seenTick:number;event?:WorldEvent;removedTick?:number;newSourceId?:number;bornAt?:number};
type Cycle={pawnId:number;startTick:number;endTick:number;startRest:number;endRest:number;bedId:number|null};
type Ledger={retreat?:{sourceSha:string;threatId:number;startedAtCore:number;isolatedAt?:number;recoveredAt?:number};version:359;rootInputSha:string;inputSha:string;checkpoint?:{path:string;sha256:string;tick:number;provenance:string};previousLedgerSha?:string;segments:{inputSha:string;startTick:number;endTick:number;stop:string;report:string}[];qualifiedMeals:MealTrace[];harvests:HarvestWitness[];sleepCycles:Cycle[];pendingSleep?:{pawnId:number;tick:number;rest:number;bedId:number|null}[];production:WorldEvent[];incidents:unknown[];initialWood:number;initialFuel:unknown;truncated:boolean};
class StopObservation extends Error {constructor(readonly reason:string,readonly detail:unknown){super(reason);}}

test.use({channel:'chrome'});
test('V359 grouped survival checkpoint segment — observations are not campaign completion',async({page},info)=>{
 test.skip(process.env.V359!=='1','PRIVATE ROOT opt-in; no execution or campaign result yet.');test.setTimeout(210000);page.setDefaultTimeout(10000);
 const bodySeconds=Number(process.env.V359_BODY_SECONDS??120);expect(bodySeconds).toBeGreaterThanOrEqual(100);expect(bodySeconds).toBeLessThanOrEqual(150);
 const segment=process.env.V359_SEGMENT??'01';expect(segment).toMatch(/^[a-zA-Z0-9_-]{1,32}$/);
 const retreat=process.env.V359_RETREAT==='1',inputPath=process.env.V359_INPUT??(retreat?RETREAT_INPUT:ROOT_INPUT),inputSha=process.env.V359_INPUT_SHA??(retreat?RETREAT_SHA:ROOT_SHA),raw=await readFile(inputPath,'utf8');expect(digest(raw)).toBe(inputSha);
 const literal=JSON.parse(raw),initial=deserializeWorld(raw);expect(initial).toEqual({...literal,schemaVersion:initial.schemaVersion});expect(validateWorld(initial)).toEqual([]);expect(INGEST_TICKS).toBeGreaterThan(GAP);
 const endTick=Number(process.env.V359_END_TICK??initial.tick+3000);expect(Number.isSafeInteger(endTick)&&endTick>initial.tick).toBe(true);
 const started=Date.now(),deadline=started+bodySeconds*1000,observeUntil=deadline-18000,errors=observeErrors(page),rotation={value:0};
 let ledger:Ledger;
 const ledgerInput=process.env.V359_LEDGER??(retreat?RETREAT_LEDGER:undefined),ledgerSha=process.env.V359_LEDGER_SHA??(retreat?RETREAT_LEDGER_SHA:undefined);
 if(ledgerInput){const previous=await readFile(ledgerInput,'utf8');expect(ledgerSha,'Cumulative ledger requires its exact SHA').toMatch(/^[0-9a-f]{64}$/);expect(digest(previous)).toBe(ledgerSha);ledger=JSON.parse(previous) as Ledger;expect(ledger.version).toBe(359);expect(ledger.rootInputSha).toBe(ROOT_SHA);expect(ledger.checkpoint?.sha256).toBe(inputSha);expect(ledger.checkpoint?.tick).toBe(initial.tick);ledger.previousLedgerSha=digest(previous);ledger.inputSha=inputSha;}
 else{expect(inputPath,'Resumes require the preceding ledger; no silent reset of accumulated proofs').toBe(ROOT_INPUT);expect(inputSha).toBe(ROOT_SHA);expect(initial.tick).toBe(66037);ledger={version:359,rootInputSha:ROOT_SHA,inputSha,segments:[],qualifiedMeals:[],harvests:[],sleepCycles:[],production:[],incidents:[],initialWood:sum(initial,'wood'),initialFuel:initial.structures.find(s=>s.id===18884)?.fuel,truncated:false};}
 if(retreat){
  if(!ledger.retreat){expect(inputSha).toBe(RETREAT_SHA);expect(ledgerSha).toBe(RETREAT_LEDGER_SHA);expect(initial.tick).toBe(66104);expect(initial.wildlife?.animals.find(a=>a.id===THREAT)?.manhunter).toMatchObject({startedAtCore:THREAT_STARTED_CORE,targetId:IRIS});ledger.retreat={sourceSha:RETREAT_SHA,threatId:THREAT,startedAtCore:THREAT_STARTED_CORE};}
  for(const p of initial.pawns.filter(p=>ORIGINALS.includes(p.id))){expect(p.health?.injuries??[],'A wounded failure checkpoint cannot reset the no-new-injury boundary').toEqual([]);expect(p.health?.missing??[]).toEqual([]);expect(p.health?.bloodLoss??0).toBe(0);}
  expect(ledger.retreat).toMatchObject({sourceSha:RETREAT_SHA,threatId:THREAT,startedAtCore:THREAT_STARTED_CORE});expect(process.env.V359_ACTIONS,'No unrelated work/construction during this narrow response').toBeUndefined();expect(process.env.V359_CONFIGURE_RESERVE).not.toBe('1');expect(process.env.V359_PREPARE_WOOD).not.toBe('1');
 }
 const initialWounds=new Map(initial.pawns.filter(p=>ORIGINALS.includes(p.id)).map(p=>[p.id,{injuries:new Map(p.health?.injuries.map(i=>[i.id,i.severity])??[]),missing:new Set(p.health?.missing.map(m=>m.part)??[]),blood:p.health?.bloodLoss??0}]));
 let sealed=retreat&&ledger.retreat?.isolatedAt!==undefined,threatRecovered=retreat&&ledger.retreat?.recoveredAt!==undefined;
 const responseLog:unknown[]=[],screenshots:{name:string;tick:number}[]=[];
 const checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean;screenshot:boolean;path:string}[]=[],journal:unknown[]=[],ring:unknown[]=[],lifecycle:{kind:string;elapsedMs:number}[]=[],actionLog:unknown[]=[];
 const meals=new Map<number,MealTrace>(),seenFood=new Map<number,{tick:number;pile:MaterialPile}>(),usedMealEvents=new Set<string>(ledger.qualifiedMeals.flatMap(m=>{const e=(m.completion as {event?:WorldEvent}|undefined)?.event;return e?[`${e.tick}:${e.message}`]:[];}));
 const initiallySleeping=new Set(initial.pawns.filter(p=>p.state==='sleeping'&&!ledger.pendingSleep?.some(s=>s.pawnId===p.id)).map(p=>p.id));
 const priorRiceGround=new Map<string,number>();
 const harvestJobs=new Map<number,HarvestWitness>(),sleeps=new Map<number,{tick:number;rest:number;bedId:number|null}>(),seenEvents=new Set<string>(ledger.production.map(e=>`${e.tick}:${e.message}`)),baselineIncidents=incidentCounters(initial);
 for(const s of ledger.pendingSleep??[]){const p=initial.pawns.find(p=>p.id===s.pawnId);expect(p?.state).toBe('sleeping');expect(p?.need?.kind).toBe('sleep');if(p?.need?.kind!=='sleep')throw Error('Saved sleep witness lost its exact task');expect(p.need.bedId).toBe(s.bedId);expect(s.tick).toBeLessThanOrEqual(initial.tick);sleeps.set(s.pawnId,{tick:s.tick,rest:s.rest,bedId:s.bedId});}
 let loaded=false,last:World|undefined,backend:unknown,stop='not-started',failure:unknown,exportFailure:unknown,fallback:unknown,stage='input',lastJournalKey='',lastJournalTick=-1,witness=false,naturalStartTick:number|undefined;
 const unqualifiedSleep:unknown[]=[];
 const onCrash=()=>lifecycle.push({kind:'pagecrash',elapsedMs:Date.now()-started}),onClose=()=>lifecycle.push({kind:'pageclose',elapsedMs:Date.now()-started}),onDisconnected=()=>lifecycle.push({kind:'browserdisconnected',elapsedMs:Date.now()-started});page.on('crash',onCrash);page.on('close',onClose);const browser=page.context().browser();browser?.on('disconnected',onDisconnected);
 const front=()=>page.locator('.front-menu');
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();};
 const bounded=<T>(list:T[],value:T,max=512)=>{list.push(value);if(list.length>max){list.shift();ledger.truncated=true;}};
 const guard=(w:World)=>{
  expect(w.pawns.filter(p=>ORIGINALS.includes(p.id)).map(p=>p.id).sort()).toEqual(ORIGINALS);
  for(const p of w.pawns.filter(p=>ORIGINALS.includes(p.id)))expect(physicalEatingFactor(p)).toBeLessThanOrEqual(1);
  const dangerous=w.pawns.filter(p=>ORIGINALS.includes(p.id)&&(['dead','downed'].includes(p.state)||p.mental?.crisis||retreat&&p.collapsePending)).map(p=>({id:p.id,state:p.state,mental:p.mental}));
  const enemies=w.pawns.filter(p=>p.faction==='outlaws'&&!p.prisoner&&!['dead','downed'].includes(p.state)).map(p=>p.id),animals=w.wildlife?.animals.filter(a=>a.manhunter&&!a.manhunter.exhausted&&!['dead','downed'].includes(a.state)).map(a=>a.id)??[];
  const fires=w.fires?.items.map(f=>({id:f.id,x:f.x,z:f.z}))??[];
  const unapproved=retreat?w.wildlife?.animals.filter(a=>a.manhunter&&(a.id!==THREAT||threatRecovered||a.manhunter.startedAtCore!==THREAT_STARTED_CORE)).map(a=>a.id)??[]:animals;
  const changed=retreat?w.pawns.filter(p=>ORIGINALS.includes(p.id)&&(()=>{const old=initialWounds.get(p.id)!;return !!p.health?.injuries.some(i=>!old.injuries.has(i.id)||i.severity>old.injuries.get(i.id)!)||!!p.health?.missing.some(m=>!old.missing.has(m.part))||(p.health?.bloodLoss??0)>old.blood||(p.stun?.untilCore??0)>w.tick*10;})()).map(p=>({id:p.id,health:p.health,stun:p.stun})):[];
  const intruders=retreat?w.wildlife?.animals.filter(a=>!['dead','downed'].includes(a.state)&&(inside(a)||a.x===125&&a.z===114||!!a.motion&&a.motion.end>w.tick&&(crossesInside(a.motion.from,a.motion.to)||a.motion.to.x===125&&a.motion.to.z===114))).map(a=>({id:a.id,x:a.x,z:a.z,motion:a.motion}))??[]:[];
  const escaped=retreat&&sealed?w.pawns.filter(p=>ORIGINALS.includes(p.id)&&(!inside(p)||!!p.motion&&p.motion.end>w.tick&&(!inside(p.motion.from)||!inside(p.motion.to)))).map(p=>({id:p.id,x:p.x,z:p.z,motion:p.motion})):[];
  if(dangerous.length||enemies.length||unapproved.length||fires.length||changed.length||intruders.length||escaped.length)throw new StopObservation('danger',{dangerous,enemies,animals:unapproved,fires,newInjuries:changed,intruders,escaped,tick:w.tick});
  if(retreat){const a=w.wildlife?.animals.find(a=>a.id===THREAT);if(!a||['dead','downed'].includes(a.state))throw new StopObservation('danger',{reason:'Initial animal disappeared/died/downed; no natural recovery inferred',tick:w.tick});if(a.manhunter&&a.manhunter.startedAtCore!==THREAT_STARTED_CORE)throw new StopObservation('danger',{reason:'A new hostility episode is not the admitted initial threat',tick:w.tick});if(sealed&&!doorIsolates(w))throw new StopObservation('danger',{reason:'Door no longer physically isolates the camp',door:w.structures.find(s=>s.id===DOOR),tick:w.tick});if(!a.manhunter&&!threatRecovered){threatRecovered=true;ledger.retreat!.recoveredAt=w.tick;responseLog.push({kind:'natural-recovery-observed',tick:w.tick,animal:{id:a.id,state:a.state,motion:a.motion}});}}
  // Existing wounds/medicine may legitimately change through ordinary care. No blanket26-dose postcondition.
 };
 const trackMeals=(w:World)=>{
  const invalidate=(m:MealTrace,reason:string)=>{m.invalidReason??=reason;m.invalidAt??=w.tick;m.lastTick=w.tick;};
  // seenFood contains only the immediately preceding observed ground state.
  for(const pawn of w.pawns.filter(p=>ORIGINALS.includes(p.id))){const task=pawn.need;if(task?.kind!=='eat'||task.carryPileId===null||task.sourcePileId===null||meals.has(task.carryPileId))continue;
   const carry=w.piles.find(p=>p.id===task.carryPileId),old=seenFood.get(task.sourcePileId),source=w.piles.find(p=>p.id===task.sourcePileId);if(!carry)continue;
   const trace:MealTrace={pawnId:pawn.id,name:pawn.name,sourceId:task.sourcePileId,sourceObservedTick:old?.tick??-1,source:old?.pile??null,quantity:task.quantity,carryId:carry.id,item:carry.item,heldTick:w.tick,lastTick:w.tick};if(meals.size>=128)throw new StopObservation('meal-trace-bound',{tick:w.tick});meals.set(carry.id,trace);
   if(task.forced||task.progress!==0||!old||w.tick-old.tick>GAP||old.pile.owner.type!=='ground'||carry.kind!=='food'||carry.owner.type!=='pawn'||carry.owner.pawnId!==pawn.id||carry.quantity!==task.quantity||carry.item!==old.pile.item){invalidate(trace,'Missing or inconsistent natural ground-source/cargo history');continue;}
   if(carry.id===old.pile.id){if(old.pile.quantity!==task.quantity)invalidate(trace,'Whole pickup did not preserve exact source quantity');}
   else if(old.pile.quantity<=task.quantity||!source||source.kind!=='food'||source.owner.type!=='ground'||source.owner.x!==old.pile.owner.x||source.owner.z!==old.pile.owner.z||source.item!==old.pile.item||source.quantity!==old.pile.quantity-task.quantity||source.quantity<=0)invalidate(trace,'Split pickup lacks the exact positive same-cell source remainder');
   else trace.sourceRemainder=source.quantity;
  }
  for(const trace of meals.values()){
   if(trace.completion||trace.invalidReason)continue;
   const pawn=w.pawns.find(p=>p.id===trace.pawnId),task=pawn?.need,carry=w.piles.find(p=>p.id===trace.carryId),source=w.piles.find(p=>p.id===trace.sourceId);
   if(!pawn||pawn.name!==trace.name||w.tick<trace.lastTick){invalidate(trace,'Actor identity or clock changed');continue;}
   if(trace.sourceRemainder!==undefined){const original=trace.source;if(!original||original.owner.type!=='ground'||!source||source.owner.type!=='ground'||source.owner.x!==original.owner.x||source.owner.z!==original.owner.z||source.item!==trace.item||source.quantity!==trace.sourceRemainder){invalidate(trace,'Observed split source changed before completion');continue;}}
   const matching=task?.kind==='eat'&&!task.forced&&task.sourcePileId===trace.sourceId&&task.carryPileId===trace.carryId&&task.quantity===trace.quantity;
   if(!matching){
    // Completion can credit only the immediate disappearance of this exact observed ingestion.
    const at=trace.lastActualIngestTick,label=ITEM_DEFINITIONS[trace.item].label,message=`${trace.name} a mangé une portion (${trace.quantity} × ${label}) à table.`;
    const candidates=at===undefined?[]:w.events.filter(e=>e.tick>at&&e.tick<=w.tick&&e.message===message&&!usedMealEvents.has(`${e.tick}:${e.message}`));
    if(at!==undefined&&w.tick-at>0&&w.tick-at<=GAP&&!carry&&pawn.hunger>(trace.lastHunger??100)&&w.pawns.filter(p=>p.name===trace.name).length===1&&candidates.length===1){
     const event=candidates[0]!;usedMealEvents.add(`${event.tick}:${event.message}`);trace.completion={tick:event.tick,capturedTick:w.tick,event:structuredClone(event),hunger:pawn.hunger,state:pawn.state,cargoAbsent:true,lastActualIngestTick:at,lastProgress:trace.lastProgress};trace.lastTick=w.tick;
    }else invalidate(trace,`Attempt ended without one unique exact-label completion in the next bounded${GAP} ticks`);
    continue;
   }
   if(task?.kind!=='eat'||!carry||carry.kind!=='food'||carry.item!==trace.item||carry.quantity!==trace.quantity||carry.owner.type!=='pawn'||carry.owner.pawnId!==trace.pawnId){invalidate(trace,'Exact carry custody/item/quantity was interrupted');continue;}
   if(trace.ingestTick!==undefined&&(task.phase!=='ingest'||w.tick-trace.lastTick>GAP)){invalidate(trace,`Ingestion restarted or observation gap exceeded${GAP} ticks`);continue;}
   if(task.phase==='ingest'){
    const dining=task.dining;
    if(tableId===undefined||seatId===undefined||!dining||dining.tableId!==tableId||dining.seatId!==seatId||dining.target.x!==SEAT.x||dining.target.z!==SEAT.z||pawn.x!==SEAT.x||pawn.z!==SEAT.z||pawn.state!=='eating'||pawn.moveCooldown!==0||(pawn.motion?.end??w.tick)>w.tick){invalidate(trace,'Ingestion is not stationary at the selected actual seat/table');continue;}
    if(trace.lastProgress!==undefined&&task.progress<trace.lastProgress){invalidate(trace,'Ingestion progress regressed');continue;}
    trace.dining=structuredClone(dining);trace.ingestTick??=w.tick;trace.ingestProgress??=task.progress;trace.hungerBefore??=pawn.hunger;trace.lastActualIngestTick=w.tick;trace.lastProgress=task.progress;trace.lastHunger=pawn.hunger;
   }
   trace.lastTick=w.tick;
  }
  seenFood.clear();for(const p of foods(w))if(p.owner.type==='ground')seenFood.set(p.id,{tick:w.tick,pile:structuredClone(p)});
 };

 const trackCycles=(w:World)=>{
  for(const p of w.pawns.filter(p=>ORIGINALS.includes(p.id))){
   if(p.state!=='sleeping')initiallySleeping.delete(p.id);
   if(p.need?.kind==='sleep'&&p.state==='sleeping'&&!initiallySleeping.has(p.id)&&!sleeps.has(p.id))sleeps.set(p.id,{tick:w.tick,rest:p.rest,bedId:p.need.bedId});
   if(p.state!=='sleeping'&&sleeps.has(p.id)){const s=sleeps.get(p.id)!;sleeps.delete(p.id);bounded(ledger.sleepCycles,{pawnId:p.id,startTick:s.tick,endTick:w.tick,startRest:s.rest,endRest:p.rest,bedId:s.bedId});}
  }
  for(const job of w.jobs.filter(j=>j.kind==='harvest')){
   const r=w.resources.find(r=>job.plantTarget?r.id===job.plantTarget.resourceId:r.x===job.x&&r.z===job.z),p=w.pawns.find(p=>p.jobId===job.id&&p.state==='working');
   if(r?.kind==='rice'&&w.growingZones.find(z=>z.id===18770)?.cells.includes(r.z*w.width+r.x)&&p&&ORIGINALS.includes(p.id))harvestJobs.set(job.id,{sourceId:r.id,jobId:job.id,pawnId:p.id,name:p.name,cell:{x:r.x,z:r.z},seenTick:w.tick});
  }
  for(const [jobId,h] of harvestJobs){if(w.jobs.some(j=>j.id===jobId))continue;harvestJobs.delete(jobId);
   const events=w.events.filter(e=>e.tick>h.seenTick&&e.tick<=w.tick&&e.type==='job'&&new RegExp('^'+h.name+' a récolté [1-9][0-9]* riz\\.$').test(e.message));
   const event=events.length===1?events[0]:undefined,quantity=event?Number(event.message.match(/récolté ([1-9][0-9]*) riz\./)?.[1]):NaN;
   const now=w.piles.filter(p=>p.item==='rice'&&p.owner.type==='ground'&&p.owner.x===h.cell.x&&p.owner.z===h.cell.z).reduce((n,p)=>n+p.quantity,0),before=priorRiceGround.get(`${h.cell.x}:${h.cell.z}`)??0;
   if(w.tick-h.seenTick<=GAP&&!w.resources.some(r=>r.id===h.sourceId)&&event&&quantity>0&&now-before===quantity)bounded(ledger.harvests,{...h,removedTick:w.tick,event:structuredClone(event)});
  }
  priorRiceGround.clear();for(const pile of w.piles)if(pile.item==='rice'&&pile.owner.type==='ground'){const key=`${pile.owner.x}:${pile.owner.z}`;priorRiceGround.set(key,(priorRiceGround.get(key)??0)+pile.quantity);}
  const rice=field(w);for(const h of ledger.harvests){if(h.newSourceId!==undefined)continue;const n=rice.find(r=>r.x===h.cell.x&&r.z===h.cell.z&&r.id!==h.sourceId&&(r.plantLife?.bornAt??-1)>=(h.event?.tick??w.tick));if(n){h.newSourceId=n.id;h.bornAt=n.plantLife!.bornAt;}}
  for(const e of w.events){const key=`${e.tick}:${e.message}`;if(e.tick>initial.tick&&!seenEvents.has(key)&&/a cuisiné|a terminé l’abattage|a terminé la construction|a terminé la pose/.test(e.message)){bounded(ledger.production,structuredClone(e));seenEvents.add(key);}}
 };
 const summary=(w:World)=>({tick:w.tick,pawns:w.pawns.filter(p=>ORIGINALS.includes(p.id)).map(p=>({id:p.id,name:p.name,state:p.state,hunger:p.hunger,rest:p.rest,need:p.need,cooking:p.cooking,haul:p.haul,jobId:p.jobId,orders:p.orders,memories:p.memories,health:p.health,mental:p.mental})),food:foods(w),nutritionPhysical:foods(w).reduce((n,p)=>n+nutritionOf(p),0)/100,wood:sum(w,'wood'),medicine:sum(w,'medicine'),stove:w.structures.find(s=>s.id===18884),jobs:w.jobs.map(j=>({id:j.id,kind:j.kind,x:j.x,z:j.z,plantTarget:j.plantTarget,progress:j.progress,reservedBy:j.reservedBy})),field:field(w).map(r=>({id:r.id,x:r.x,z:r.z,bornAt:r.plantLife?.bornAt,growthTick:r.growthTick,growth:plantGrowth(w,r),blight:r.blight})),incidents:incidentCounters(w),response:retreat?{sealed,threatRecovered,door:w.structures.find(s=>s.id===DOOR),animal:w.wildlife?.animals.find(a=>a.id===THREAT)}:undefined,events:w.events.slice(-14)});
 const read=async(conserve=false)=>{
  if(!conserve){if(lifecycle.length)throw Error('Native lifecycle: '+lifecycle[0]!.kind);if(errors.length)throw Error('Native error: '+errors[0]);if(Date.now()>deadline)throw Error('V359 body deadline');}
  const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);
  if(!conserve){guard(w);const technical=await page.evaluate(()=>window.__lisiere.incident);if(technical.simulationStopped||technical.graphicsFault)throw Error('Native technical incident: '+JSON.stringify(technical));trackMeals(w);trackCycles(w);const c=incidentCounters(w);if(Object.keys(c).some(k=>c[k as keyof typeof c]>baselineIncidents[k as keyof typeof c])){const detail={tick:w.tick,before:baselineIncidents,after:c,events:w.events.slice(-20)};bounded(ledger.incidents,detail,32);throw new StopObservation('new-natural-incident',detail);}}
  const key=JSON.stringify([stage,...w.pawns.filter(p=>ORIGINALS.includes(p.id)).map(p=>[p.id,p.state,p.need?.kind,p.need?.phase,p.jobId,p.haul?.phase,p.cooking?.phase])]);
  // Expensive derived crop summary is journal-only, never computed for each observation.
  if(key!==lastJournalKey||w.tick-lastJournalTick>=120){const sample={elapsedMs:Date.now()-started,stage,...summary(w)};bounded(journal,sample,256);lastJournalTick=w.tick;lastJournalKey=key;}
  ring.push({tick:w.tick,elapsedMs:Date.now()-started,pawns:w.pawns.filter(p=>ORIGINALS.includes(p.id)).map(p=>({id:p.id,state:p.state,need:p.need,haul:p.haul,jobId:p.jobId})),food:foods(w),events:w.events.slice(-6)});if(ring.length>24)ring.shift();return w;
 };
 const capture=async(name:string,reload=true,screenshot=false,conserve=false)=>{
  await pause(page);await closeMenu();const before=await read(conserve);expect(validateWorld(before)).toEqual([]);
  if(screenshot){expect(screenshots.length).toBeLessThan(retreat?3:2);await page.screenshot({path:info.outputPath(name+'.png')});screenshots.push({name,tick:before.tick});}
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label=`V359 ${segment} ${name}`;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);const record={name,tick:before.tick,sha256:digest(text),reloaded:false,screenshot,path};checkpoints.push(record);
  if(reload){expect(checkpoints.filter(c=>c.reloaded).length).toBeLessThan(3);await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,before);record.reloaded=true;}
  ledger.checkpoint={path,sha256:record.sha256,tick:before.tick,provenance:reload?'UI export and exact reload':'UI conservation export; not reloaded'};await info.attach(name,{contentType:'application/json',path});await closeMenu();return before;
 };
 const run=async(speed:1|6)=>{await closeMenu();await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();};
 const wait=async(done:(w:World)=>boolean,maxMs=10000)=>{const until=Math.min(observeUntil,Date.now()+maxMs);while(Date.now()<until){const w=await read();if(done(w))return w;await page.waitForTimeout(100);}throw Error('UI confirmation bound: '+stage);};
 const configureReserve=async()=>{
  const w=await read(),cells=w.stockpiles.filter(s=>(s.zoneId??s.id)===19652);expect(cells.length).toBe(2);
  const free=cells.filter(s=>!w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===s.x&&p.owner.z===s.z)&&!w.jobs.some(j=>footprintCells(j).some(c=>c.x===s.x&&c.z===s.z))&&w.roofing?.constructed.includes(s.z*w.width+s.x));
  if(!free.length){actionLog.push({kind:'reserve-capacity-required',tick:w.tick,zoneId:19652,reason:'No observed vacant roofed storage cell; retain15-ration buffer and current filters'});return;}
  if(cells.every(s=>s.items?.['simple-meal']&&s.items?.rice&&s.items?.['survival-meal']&&s.priority===3))return;
  stage='reserve-policy';await tool(page,'select');await page.keyboard.press('Escape');const target=cells[0]!;
  for(let n=0;n<=w.pawns.length+6;n++){await revealCells(page,[target]);await cell(page,target.x,target.z);if(await page.locator('#selected-stockpile-items').isVisible())break;}
  const controls=page.locator('#selected-stockpile-items');await expect(controls).toBeVisible();
  for(const item of ['simple-meal','rice']){await controls.locator('[data-storage-search]').fill(item);await controls.locator(`[data-storage-item="${item}"]`).setChecked(true);await wait(state=>state.stockpiles.filter(s=>(s.zoneId??s.id)===19652).every(s=>s.items?.[item as ItemId]===true));}
  await controls.locator('[data-storage-search]').fill('');await page.keyboard.press('Escape');const configured=await read();expect(configured.stockpiles.filter(s=>(s.zoneId??s.id)===19652).every(s=>s.items?.['survival-meal']&&s.priority===3)).toBe(true);
  actionLog.push({kind:'reserve-policy',tick:configured.tick,zoneId:19652,items:['survival-meal','simple-meal','rice'],qualification:'Admission only; both cells may remain physically occupied'});
 };
 const allowedAction=(c:Command):boolean=>c.type==='priority'||c.type==='growing-policy'||c.type==='bill-update'||c.type==='stockpile'||c.type==='area'&&['stockpile','growing','home','build-roof'].includes(c.action)||c.type==='designate'&&['chop','harvest','shelf','small-shelf','wall','door','build-roof'].includes(c.kind);
 const executeActions=async()=>{
  if(!process.env.V359_ACTIONS)return;const decisions=JSON.parse(await readFile(process.env.V359_ACTIONS,'utf8')) as Decision[];expect(decisions.length).toBeLessThanOrEqual(12);
  for(const d of decisions){expect(allowedAction(d.command),'Ordinary survival UI actions only; no forced consume, gifts or combat solver').toBe(true);if(d.command.type==='area')expect(d.command.targetZoneId,'perform(area) does not target an existing logical zone; use its real expansion button instead').toBeUndefined();await read();stage='ordinary-action';await perform(page,d,rotation);const adopted=await read();actionLog.push({...d,tick:adopted.tick});}
 };
 const prepareWood=async()=>{
  const w=await read();if(sum(w,'wood')>=60||w.jobs.some(j=>j.kind==='chop'))return;
  const candidates=w.resources.filter(r=>r.kind==='tree'&&Math.hypot(r.x-125,r.z-114)<=14&&choppable(w,r)&&canDesignate(w,{type:'designate',kind:'chop',x:r.x,z:r.z}).ok).sort((a,b)=>Math.hypot(a.x-125,a.z-114)-Math.hypot(b.x-125,b.z-114)||a.id-b.id).slice(0,2);
  for(const r of candidates){stage='ordinary-wood';await perform(page,{reason:'Renouveler le bois disponible pour combustible et ouvrages utiles',command:{type:'designate',kind:'chop',x:r.x,z:r.z}},rotation);const adopted=await read();expect(adopted.jobs.some(j=>j.kind==='chop'&&j.plantTarget?.resourceId===r.id)).toBe(true);actionLog.push({kind:'chop',resourceId:r.id,cell:{x:r.x,z:r.z},tick:adopted.tick});}
  if(!candidates.length)actionLog.push({kind:'wood-direction-required',tick:w.tick,reason:'No admissible nearby mature tree; no remote-route promise'});
 };
 const retreatResponse=async()=>{
  let w=await read();naturalStartTick=w.tick;
  const act=async(d:Decision)=>{await pause(page);await read();await perform(page,d,rotation);const adopted=await read();actionLog.push({...d,tick:adopted.tick});};
  if(!sealed){
   const iris=w.pawns.find(p=>p.id===IRIS)!;
   if(!inside(iris)||!stable(w,iris)){
    stage='retreat-draft';await act({reason:'Interrompre le travail exposé et reprendre Iris face à la menace réellement observée',command:{type:'draft',pawnIds:[IRIS],enabled:true}});
    stage='retreat-move';await act({reason:'Rejoindre la cellule intérieure libre par un vrai trajet',command:{type:'draft-move',pawnIds:[IRIS],target:REFUGE,queue:false}});
    await run(1);w=await wait(state=>{const p=state.pawns.find(p=>p.id===IRIS)!;return p.x===REFUGE.x&&p.z===REFUGE.z&&stable(state,p)&&allInside(state);},35000);await pause(page);w=await read();
    responseLog.push({kind:'actual-refuge-arrival',tick:w.tick,pawns:w.pawns.filter(p=>ORIGINALS.includes(p.id)).map(p=>({id:p.id,x:p.x,z:p.z,state:p.state,motion:p.motion}))});
   }
   if(!allInside(w))throw new StopObservation('retreat-partial',{reason:'Other civilians are not safely inside/stationary',tick:w.tick});
   stage='retreat-door';await pause(page);await tool(page,'select');await page.keyboard.press('Escape');const door=w.structures.find(s=>s.id===DOOR);if(!door)throw new StopObservation('danger',{reason:'Physical door is missing',tick:w.tick});
   for(let n=0;n<=w.pawns.length+6;n++){await revealCells(page,[door]);await cell(page,door.x,door.z);if(await page.locator('#door-forbidden').isVisible())break;}
   await expect(page.locator('#door-forbidden')).toBeVisible();expect((await read()).structures.find(s=>s.id===DOOR)?.door?.holdOpen).toBe(false);await page.locator('#door-forbidden').setChecked(true);await wait(state=>state.structures.find(s=>s.id===DOOR)?.door?.forbidden===true);
   actionLog.push({kind:'door-forbidden',structureId:DOOR,tick:last!.tick,qualification:'Permission only; physical closure still required'});
   await run(1);w=await wait(state=>doorIsolates(state)&&allInside(state),20000);await pause(page);w=await read();
   if(!doorIsolates(w)||!allInside(w))throw new StopObservation('retreat-partial',{reason:'Isolation changed before confirmed pause',tick:w.tick});
   sealed=true;ledger.retreat!.isolatedAt=w.tick;responseLog.push({kind:'physical-isolation',tick:w.tick,door:structuredClone(w.structures.find(s=>s.id===DOOR)),pawns:w.pawns.filter(p=>ORIGINALS.includes(p.id)).map(p=>({id:p.id,x:p.x,z:p.z,state:p.state,motion:p.motion}))});
   // One screenshot without an extra export/checkpoint, within the total three-image budget.
   expect(screenshots.length).toBeLessThan(3);await page.screenshot({path:info.outputPath('retreat-isolated.png')});screenshots.push({name:'retreat-isolated',tick:w.tick});
  }
  w=await read();if(!doorIsolates(w))throw new StopObservation('danger',{reason:'Resumed isolation is not physical',tick:w.tick});
  if(!allInside(w)){await run(1);w=await wait(state=>allInside(state),20000);await pause(page);w=await read();}
  if(!doorIsolates(w)||!allInside(w))throw new StopObservation('danger',{reason:'Resumed civilians are not stably isolated',tick:w.tick});
  if(w.pawns.find(p=>p.id===IRIS)?.draft){stage='retreat-undraft';await act({reason:'Rendre son autonomie à Iris seulement après isolation physique',command:{type:'draft',pawnIds:[IRIS],enabled:false}});expect((await read()).pawns.find(p=>p.id===IRIS)?.draft).toBeUndefined();}
  stage='retreat-natural-wait';await run(6);let mealChosen:number|undefined;
  while(Date.now()<observeUntil){w=await read();
   const animal=w.wildlife!.animals.find(a=>a.id===THREAT)!;
   if(threatRecovered&&!animal.manhunter&&allInside(w)&&doorIsolates(w)){stop='incident-cleared';break;}
   if(w.tick>=endTick)throw new StopObservation('retreat-partial-bound',{reason:'Tick bound reached with initial threat unresolved or actors still moving',tick:w.tick,animal:{id:animal.id,state:animal.state,manhunter:animal.manhunter}});
   const active=[...meals.values()].find(m=>!m.invalidReason&&!m.completion&&m.ingestTick!==undefined);
   if(!witness&&active){await run(1);await pause(page);await read();if(!active.invalidReason&&!active.completion){witness=true;mealChosen=active.carryId;stage='natural-ingest';await capture('natural-ingest',true,true);stage='retreat-natural-wait';await run(1);}}
   const held=w.pawns.some(p=>ORIGINALS.includes(p.id)&&(p.need?.kind==='eat'||p.hunger<=35)),awaiting=mealChosen!==undefined&&!meals.get(mealChosen)?.completion&&!meals.get(mealChosen)?.invalidReason;
   // No guarantee of recovery: >=10000Core then a1/600 draw each eligible3ticks, observed only.
   const desired=held||awaiting?1:6;if(await page.locator(`[data-speed="${desired}"]`).getAttribute('aria-pressed')!=='true')await run(desired);await page.waitForTimeout(100);
  }
  if(stop!=='incident-cleared')throw new StopObservation('retreat-partial-bound',{reason:'Body observation bound; initial threat not qualified as cleared',tick:last?.tick});
  stage='retreat-final';const final=await capture('final',true,true);expect(final.wildlife?.animals.find(a=>a.id===THREAT)?.manhunter).toBeUndefined();expect(allInside(final)&&doorIsolates(final)).toBe(true);expect(final.tick).toBeGreaterThan(naturalStartTick!);expect(errors).toEqual([]);
 };
 try{
  expect(initial.structures.find(s=>s.id===tableId)).toMatchObject({kind:'table',...TABLE,orientation:1});expect(initial.structures.find(s=>s.id===seatId)).toMatchObject({kind:'stool',...SEAT,orientation:1});for(const c of [TABLE,{x:122,z:111},SEAT])expect(initial.roofing?.constructed.includes(c.z*initial.width+c.x)).toBe(true);expect(initial.growingZones.find(z=>z.id===18770)?.cells.length).toBe(80);
  // In-flight input meals and sleep started before this segment are never counted as complete fresh cycles.
  for(const p of initial.pawns){const n=p.need;if(n?.kind==='eat'&&n.carryPileId!==null&&n.sourcePileId!==null){const carry=initial.piles.find(i=>i.id===n.carryPileId);if(carry)meals.set(carry.id,{pawnId:p.id,name:p.name,sourceId:n.sourcePileId,sourceObservedTick:-1,source:null,quantity:n.quantity,carryId:carry.id,item:carry.item,heldTick:initial.tick,lastTick:initial.tick,invalidAt:initial.tick,invalidReason:'Already active at checkpoint; new source history absent'});}}
  const migrated=info.outputPath('literal-input.json');await writeFile(migrated,serializeWorld(initial));await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(migrated);await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,initial);loaded=true;await pause(page);await read();
  stage='initial';await capture('initial');
  if(retreat)await retreatResponse();else{
  if(process.env.V359_CONFIGURE_RESERVE==='1')await configureReserve();
  await executeActions();if(process.env.V359_PREPARE_WOOD==='1')await prepareWood();
  stage='natural-life';naturalStartTick=(await read()).tick;await run(1);let mealChosen:number|undefined;
  while(Date.now()<observeUntil){const w=await read();if(w.tick>=endTick){stop='tick-bound';break;}
   const active=[...meals.values()].find(m=>!m.invalidReason&&!m.completion&&m.ingestTick!==undefined);
   if(!witness&&active){await pause(page);await read();if(!active.invalidReason&&!active.completion){witness=true;mealChosen=active.carryId;stage='natural-ingest';await capture('natural-ingest',true,true);stage='natural-life';await run(1);}}
   const held=w.pawns.some(p=>ORIGINALS.includes(p.id)&&(p.need?.kind==='eat'||p.hunger<=35));
   const awaiting=mealChosen!==undefined&&!meals.get(mealChosen)?.completion&&!meals.get(mealChosen)?.invalidReason;
   // First300ticks slow; next incidentcheck crossings slow. Held meals stay slow for provenance.
   const next=Math.min(w.fluIncidents?.nextCheck??Infinity,w.miscIncidents?.nextCheck??Infinity,w.smallIncidents?.nextCheck??Infinity,w.raids?.nextCheck??Infinity);
   const desired=held||awaiting||w.tick<initial.tick+300||next-w.tick<=40?1:6;
   const selected=await page.locator(`[data-speed="${desired}"]`).getAttribute('aria-pressed');if(selected!=='true')await run(desired);
   await page.waitForTimeout(100);
  }
  if(stop==='not-started')stop='segment-body-bound';stage='final';await capture('final',true,true);expect(errors).toEqual([]);expect(last!.tick,'A survival segment must observe positive natural progression after preparation').toBeGreaterThan(naturalStartTick);
  }
 }catch(e){if(e instanceof StopObservation){stop=e.reason;failure={reason:e.reason,detail:e.detail};}else{stop='technical-or-oracle-error';failure=e;}}
 finally{
  if(loaded&&failure&&!page.isClosed())try{stage='conservation';await capture('conservation',false,screenshots.length<(retreat?3:2),true);}catch(e){exportFailure=String(e);}
  if(last){const validation=validateWorld(last);if(!validation.length){const text=serializeWorld(last),path=info.outputPath('last-adopted.json');await writeFile(path,text);fallback={path,tick:last.tick,sha256:digest(text),provenance:'last read adopted World, not UI export'};const checkpoint=ledger.checkpoint;let exact=false;if(checkpoint){const saved=await readFile(checkpoint.path,'utf8');exact=serializeWorld(deserializeWorld(saved))===text;}if(!exact)ledger.checkpoint=fallback as NonNullable<Ledger['checkpoint']>;}else fallback={validation};}
  for(const m of meals.values())if(!m.invalidReason&&m.ingestTick!==undefined&&m.completion&&!ledger.qualifiedMeals.some(old=>old.carryId===m.carryId))bounded(ledger.qualifiedMeals,m,128);
  const report=info.outputPath('survival-summary.json');bounded(ledger.segments,{inputSha,startTick:initial.tick,endTick:last?.tick??initial.tick,stop,report},128);
  ledger.pendingSleep=[...sleeps].flatMap(([pawnId,s])=>{const p=last?.pawns.find(p=>p.id===pawnId);if(p?.state==='sleeping'&&p.need?.kind==='sleep'&&p.need.bedId===s.bedId)return [{pawnId,...s}];unqualifiedSleep.push({pawnId,...s,checkpointTick:last?.tick,reason:'Witness incompatible with conservation checkpoint; no unobserved cycle credited'});return [];});
  const ledgerPath=info.outputPath('ledger.json'),ledgerText=JSON.stringify(ledger,null,2);await writeFile(ledgerPath,ledgerText);
  const renewalChains=ledger.harvests.filter(h=>h.newSourceId!==undefined&&ledger.harvests.some(next=>next.sourceId===h.newSourceId&&next.newSourceId!==undefined)).map(h=>({cell:h.cell,first:h.sourceId,second:h.newSourceId}));
  await writeFile(report,JSON.stringify({version:359,segment,inputPath,inputSha,rootInputSha:ROOT_SHA,retreat,responseQualified:retreat&&stop==='incident-cleared'&&!failure&&!exportFailure,responseLog,screenshots,channel:'chrome',backend,bodyMs:Date.now()-started,stop,naturalStartTick,executionReachedPlannedBound:(stop==='tick-bound'||stop==='segment-body-bound')&&naturalStartTick!==undefined&&(last?.tick??0)>naturalStartTick,campaignQualified:false,qualification:'Bounded segment and cumulative observed witnesses only. ROOT reviews reserve adequacy/cohort coverage/rest/incident response; no whole campaign or food autonomy inferred.',failure:failure instanceof Error?{message:failure.message,stack:failure.stack}:failure,exportFailure,fallback,errors,lifecycle,checkpoints,actions:actionLog,unqualifiedSleep,ledger:{path:ledgerPath,sha256:digest(ledgerText),renewalChains,qualifiedMeals:ledger.qualifiedMeals.length,sleepCycles:ledger.sleepCycles.length,truncated:ledger.truncated},meals:[...meals.values()],journal,ring,last:last?summary(last):null},null,2));await info.attach('V359 summary',{contentType:'application/json',path:report});
  page.off('crash',onCrash);page.off('close',onClose);browser?.off('disconnected',onDisconnected);
 }
 if(stop==='technical-or-oracle-error')throw failure;
 if(retreat)expect(stop,'An unresolved bounded response is partial/RED; only real natural recovery may clear it').toBe('incident-cleared');
 expect(stop,'Danger outcome is conserved, never reported as a successful survival segment').not.toBe('danger');
 expect(checkpoints.some(c=>c.name==='final'||c.name==='conservation')||fallback,'A stopped segment requires conservation evidence').toBeTruthy();
});
