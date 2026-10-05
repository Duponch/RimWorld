import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {prepareGroupScenario,GROUP_SCENARIO_SEED,GROUP_SCENARIO_FOOD_CELLS,GROUP_SCENARIO_CELLS} from '../src/sim/group-scenario.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {captureHumanOwners} from '../src/sim/human-owners.ts';
import {captureGroupMass,type AwayGroup} from '../src/sim/group-capture.ts';
import {groupTradeQuote} from '../src/sim/group-authority.ts';
import type {Command,MaterialPile,Pawn,World} from '../src/sim/types.ts';
import type {GroupState} from '../src/sim/group-state.ts';
import type {CommercialBuyLine} from '../src/sim/commercial-state.ts';

// Root runs this through validate:logged. No renderer, decoder, publication,
// accelerated clock, path edit or prepared trip is used by this engine probe.
const LIMIT=30000,REPLAY_TICKS=37,TRANSFER_STALL_TICKS=600;
const run=(process.env.LISIERE_TEST_RUN??('group-v216-'+new Date().toISOString()+'-'+process.pid)).replace(/[^a-zA-Z0-9_.-]/g,'-');
const directory=resolve('tmp','group-v216-probe',run);
mkdirSync(directory,{recursive:true});
const started=performance.now(),marks:Record<string,unknown>[]=[];
let world=prepareGroupScenario(),steps=0,replaySteps=0,lastPhysicalProgress=world.tick,lastPhysicalKey='';
const memberIds=world.pawns.slice(0,2).map(p=>p.id),residentId=world.pawns[2]!.id;
let originals=new Map(world.pawns.map(p=>[p.id,p]));
const shirtIds=world.piles.filter(p=>p.owner.type==='apparel').map(p=>p.id);
let currencyBaseline:number|undefined,clothBaseline:number|undefined,medicineBaseline:number|undefined;
let finalLedger:GroupState['ledger']|undefined,groupId:number|undefined,lastMark='';
const hash=(data:string)=>createHash('sha256').update(data).digest('hex');
const write=(name:string,data:string)=>{const path=resolve(directory,name);writeFileSync(path,data,{flag:'wx'});return path;};
const away=(g:GroupState|undefined):g is AwayGroup=>!!g&&'members' in g;
function ownedItems(w:World):MaterialPile[]{return [...w.piles,...(away(w.group)?w.group.items:[])];}
function total(w:World,item:MaterialPile['item']):number{
  return ownedItems(w).filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0)
    +(w.civilianPost?.stock.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0)??0);
}
function localOrAway(w:World,id:number):Pawn|undefined{return w.pawns.find(p=>p.id===id)??(away(w.group)?w.group.members.find(p=>p.id===id):undefined);}
function validate(w:World,label:string):void{
  assert.deepEqual(validateWorld(w),[],label+': invalid World at tick'+w.tick);
  const owners=captureHumanOwners(w);
  for(const [id,person] of originals)assert.equal(owners.byId.get(id)?.pawn,person,label+': original person'+id+' changed owner identity');
  assert.ok(w.pawns.some(p=>p.id===residentId),label+': resident disappeared');
  assert.equal(w.groupLosses?.length??0,0,label+': prepared healthy journey lost a member');
  for(const id of shirtIds)assert.equal(ownedItems(w).filter(p=>p.id===id&&p.owner.type==='apparel').length,1,label+': shirt'+id+' duplicated/lost');
  if(away(w.group)){
    const g=w.group,inventory=g.items.filter(p=>p.owner.type==='inventory');
    const quantity=(item:MaterialPile['item'])=>inventory.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
    assert.equal(quantity('silver'),g.baseline.silver+g.ledger.silverEarned-g.ledger.silverPaid,label+': currency ledger');
    assert.equal(quantity('cloth'),g.baseline.cargo.cloth-g.ledger.sold.cloth,label+': cloth ledger');
    assert.equal(quantity('survival-meal'),g.baseline.food-g.ledger.foodConsumed,label+': food ledger');
    assert.equal(quantity('medicine'),g.baseline.medicine+g.ledger.bought.medicine-g.ledger.medicineUsed,label+': medicine ledger');
    assert.equal(w.pawns.some(p=>memberIds.includes(p.id)),false,label+': away original also on map');
  }
  if(currencyBaseline!==undefined)assert.equal(total(w,'silver'),currencyBaseline,label+': physical currency conservation');
  if(clothBaseline!==undefined)assert.equal(total(w,'cloth'),clothBaseline,label+': physical cloth conservation');
  if(medicineBaseline!==undefined)assert.equal(total(w,'medicine')+(w.group?.ledger.medicineUsed??finalLedger?.medicineUsed??0),medicineBaseline,label+': medicine conservation');
}
function state(w:World):Record<string,unknown>{
  const g=w.group,ids=g?(away(g)?g.members.map(p=>p.id):g.memberIds):memberIds;
  const members=ids.map(id=>localOrAway(w,id)).filter((p):p is Pawn=>!!p);
  const items=away(g)?g.items:w.piles.filter(p=>'pawnId' in p.owner&&ids.includes(p.owner.pawnId));
  const mass=members.length?captureGroupMass(members,items):undefined;
  return {tick:w.tick,phase:g?.phase??'none',...g&&'cursor' in g?{cursor:g.cursor,manifest:g.manifest.map(l=>({pileId:l.pileId,quantity:l.quantity,carrierId:l.carrierId,carriedPileId:l.carriedPileId}))}:{},
    ...away(g)?{tile:g.tile,destination:g.destination,route:g.route,segment:g.segment,stop:g.stop,baseline:g.baseline,lastPersonalTick:g.lastPersonalTick}:{},
    ledger:g?.ledger??finalLedger,mass,people:members.map(p=>({id:p.id,state:p.state,x:p.x,z:p.z,hunger:p.hunger,rest:p.rest,mood:p.mood,health:p.health})),
    post:w.civilianPost?{stockedAt:w.civilianPost.stockedAt,generation:w.civilianPost.generation,stock:w.civilianPost.stock,transactions:w.civilianPost.transactions,silverReceived:w.civilianPost.silverReceived,silverPaid:w.civilianPost.silverPaid,sold:w.civilianPost.sold,bought:w.civilianPost.bought}:null,
    currency:total(w,'silver'),cloth:total(w,'cloth'),medicine:total(w,'medicine'),rng:w.rng,nextId:w.nextId};
}
function mark(label:string,extra:Record<string,unknown>={}):void{
  const row={label,wallMs:Math.round(performance.now()-started),...state(world),...extra};marks.push(row);console.log(JSON.stringify(row));
}
function command(c:Command,label:string):void{
  const result=applyCommand(world,c);assert.equal(result.ok,true,label+': '+JSON.stringify(result));validate(world,label);mark(label);
}
function observe():void{
  const g=world.group;
  assert.ok(g||finalLedger,'Group intent was cancelled before the physical return/unload completed');
  if(g&&groupId!==undefined)assert.equal(g.id,groupId,'Group intent was replaced');
  const phaseKey=JSON.stringify([g?.phase,g&&'cursor' in g?g.cursor:null,away(g)?g.tile:null,away(g)?[g.segment?.from,g.segment?.to,g.stop?.kind]:null]);
  if(phaseKey!==lastMark){mark('physical-phase');lastMark=phaseKey;}
  if(g&&!away(g)){
    const progress=JSON.stringify([g.phase,'cursor' in g?g.cursor:g.pendingPileIds,g.memberIds.map(id=>{
      const p=world.pawns.find(p=>p.id===id)!;return [id,p.x,p.z,p.path,p.moveCooldown,p.motion];
    })]);
    if(progress!==lastPhysicalKey){lastPhysicalKey=progress;lastPhysicalProgress=world.tick;}
    assert.ok(world.tick-lastPhysicalProgress<TRANSFER_STALL_TICKS,'Physical transfer stalled for'+TRANSFER_STALL_TICKS+'ticks');
  }else {lastPhysicalKey='';lastPhysicalProgress=world.tick;}
}
function step(label:string):void{
  assert.ok(steps<LIMIT,LIMIT+' real engine ticks exhausted');
  const tick=world.tick;stepWorld(world);steps++;assert.equal(world.tick,tick+1,'Engine did not publish exactly one tick');
  validate(world,label);observe();
}
function until(predicate:()=>boolean,label:string):void{
  while(!predicate())step(label);mark(label);
}
function linesFor(items:readonly {id:number;item:MaterialPile['item'];quantity:number}[],item:MaterialPile['item'],quantity:number):CommercialBuyLine[]{
  const lines:CommercialBuyLine[]=[];let remaining=quantity;
  for(const pile of items.filter(p=>p.item===item).sort((a,b)=>a.id-b.id)){
    const take=Math.min(remaining,pile.quantity);if(take)lines.push({pileId:pile.id,quantity:take});remaining-=take;if(!remaining)break;
  }
  assert.equal(remaining,0,'Actual stock cannot supply'+quantity+' '+item);return lines;
}
function exchange(direction:'buy'|'sell',item:'cloth'|'medicine',quantity:number):void{
  assert.ok(away(world.group));const people=world.group.members.slice(),before=serializeWorld(world);
  const actual=direction==='buy'?world.civilianPost!.stock:world.group.items.filter(p=>p.owner.type==='inventory');
  const lines=linesFor(actual,item,quantity),quote=groupTradeQuote(world,direction,lines);
  assert.equal(serializeWorld(world),before,'Preview mutated the World');assert.ok(quote.ok,direction+' quote: '+JSON.stringify(quote));
  const groupSilver=world.group.items.filter(p=>p.item==='silver').reduce((n,p)=>n+p.quantity,0);
  const stockSilver=world.civilianPost!.stock.filter(p=>p.item==='silver').reduce((n,p)=>n+p.quantity,0);
  const groupQuantity=world.group.items.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
  const stockQuantity=world.civilianPost!.stock.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
  const oldQuantity=total(world,item),oldTransactions=world.civilianPost!.transactions;
  command({type:direction==='sell'?'group-sell':'group-buy',lines,quote:quote.signature},direction+'-'+quantity+'-'+item);
  assert.ok(away(world.group));assert.deepEqual(world.group.members,people);for(const p of people)assert.ok(world.group.members.includes(p));
  const delta=direction==='sell'?quote.totalSilver:-quote.totalSilver;
  assert.equal(world.group.items.filter(p=>p.item==='silver').reduce((n,p)=>n+p.quantity,0),groupSilver+delta);
  assert.equal(world.civilianPost!.stock.filter(p=>p.item==='silver').reduce((n,p)=>n+p.quantity,0),stockSilver-delta);
  const itemDelta=direction==='buy'?quantity:-quantity;
  assert.equal(world.group.items.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0),groupQuantity+itemDelta);
  assert.equal(world.civilianPost!.stock.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0),stockQuantity-itemDelta);
  assert.equal(total(world,item),oldQuantity);assert.equal(world.civilianPost!.transactions,oldTransactions+1);
  assert.equal(captureGroupMass(world.group.members,world.group.items)?.grams,quote.mass.grams);
  mark('independent-exchange-check',{direction,quantity,item,lines,totalSilver:quote.totalSilver});
}

try {
  validate(world,'prepared-source');assert.equal(world.seed,GROUP_SCENARIO_SEED);assert.equal(world.tick,0);
  for(const key of ['planet','group','groupLosses','civilianPost'])assert.equal(Object.hasOwn(world,key),false);
  const source=serializeWorld(world),sourcePath=write('prepared-source.json',source);assert.deepEqual(deserializeWorld(source),world);
  mark('prepared-source',{sha256:hash(source),payload:sourcePath,scope:'Prepared32x32 engine journey; no renderer or general performance claim'});
  command({type:'planet-adopt'},'planet-adopt');assert.ok(world.planet);
  const sourceAt=(item:MaterialPile['item'],cell:{x:number;z:number})=>{
    const pile=world.piles.find(p=>p.item===item&&p.owner.type==='ground'&&p.owner.x===cell.x&&p.owner.z===cell.z);assert.ok(pile);return pile;
  };
  const foodSources=GROUP_SCENARIO_FOOD_CELLS.map(cell=>sourceAt('survival-meal',cell));
  assert.deepEqual(foodSources.map(p=>p.quantity),[10,10,4]);
  const sources=[...foodSources.map(p=>({pileId:p.id,quantity:4})),{pileId:sourceAt('silver',GROUP_SCENARIO_CELLS.silver).id,quantity:500},
    {pileId:sourceAt('cloth',GROUP_SCENARIO_CELLS.cloth).id,quantity:60}];
  command({type:'group-start',memberIds,destination:world.planet.civilianTile,sources},'group-start');
  groupId=world.group!.id;
  until(()=>away(world.group),'physical-departure');assert.ok(away(world.group));
  assert.equal(world.group.ledger.foodLoaded,12);assert.equal(world.group.ledger.silverLoaded,500);assert.equal(world.group.ledger.cargoLoaded.cloth,60);
  assert.equal(world.group.baseline.silver,500);assert.equal(world.group.baseline.cargo.cloth,60);
  assert.ok(world.group.baseline.food<=12&&world.group.baseline.food>=memberIds.length);
  until(()=>away(world.group)&&!!world.group.segment&&world.group.segment.remainingCore>REPLAY_TICKS*10+10,'mid-segment');
  assert.ok(away(world.group)&&world.group.segment);
  const resumeRaw=serializeWorld(world),resumeTick=world.tick,resumeSegment=structuredClone(world.group.segment),resumePath=write('mid-segment.json',resumeRaw);
  const originalBranch=world;world=deserializeWorld(resumeRaw);assert.deepEqual(world,originalBranch);
  originals=new Map(captureHumanOwners(world).slots.filter(s=>originals.has(s.id)).map(s=>{assert.ok(s.pawn);return [s.id,s.pawn] as const;}));
  for(let i=0;i<REPLAY_TICKS;i++){
    stepWorld(originalBranch);replaySteps++;step('mid-segment-replay');
    assert.deepEqual(world,originalBranch,'Exact save/load continuation diverged at replay'+(i+1));
  }
  mark('save-load-37-exact',{sourceTick:resumeTick,sourceSegment:resumeSegment,sha256:hash(resumeRaw),payload:resumePath,replayTicks:REPLAY_TICKS});
  until(()=>away(world.group)&&world.group.phase==='at-site'&&world.group.tile===world.planet!.civilianTile,'civilian-arrival');
  assert.ok(world.civilianPost);currencyBaseline=total(world,'silver');clothBaseline=total(world,'cloth');medicineBaseline=total(world,'medicine');
  validate(world,'post-conservation-baseline');exchange('sell','cloth',5);exchange('buy','medicine',2);
  assert.ok(away(world.group));assert.equal(world.group.ledger.sold.cloth,5);assert.equal(world.group.ledger.bought.medicine,2);
  command({type:'group-route',destination:world.planet!.homeTile},'route-home');
  until(()=>world.group?.phase==='unloading'||!world.group,'physical-return');
  for(const id of memberIds)assert.equal(world.pawns.find(p=>p.id===id),originals.get(id),'Returned person must be the actual original');
  const returned=world.group as GroupState|undefined;
  assert.ok(returned?.phase==='unloading','Expected real returned inventory pending physical deposits');
  finalLedger=structuredClone(returned.ledger);assert.ok(returned.pendingPileIds.length>0);
  until(()=>!world.group,'physical-unload');
  assert.equal(world.pawns.length,3);assert.equal(world.piles.some(p=>p.owner.type==='inventory'&&memberIds.includes(p.owner.pawnId)),false);
  const finalRaw=serializeWorld(world),finalPath=write('returned-and-unloaded.json',finalRaw);assert.deepEqual(deserializeWorld(finalRaw),world);
  const proof={status:'pass',seed:GROUP_SCENARIO_SEED,sourceSha256:hash(source),finalSha256:hash(finalRaw),sourcePath,finalPath,
    engineTicks:steps,replayShadowTicks:replaySteps,wallMs:Math.round(performance.now()-started),memberIds,residentId,sourceLines:sources,
    conservation:{currencyBaseline,clothBaseline,medicineBaseline,finalCurrency:total(world,'silver'),finalCloth:total(world,'cloth'),finalMedicine:total(world,'medicine'),ledger:finalLedger},
    marks,scope:'One prepared32x32 CPU/engine journey. Full save/load; no decoder, GPU, natural campaign frequency or general benchmark.'};
  const proofPath=write('proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify({status:'pass',proofPath,engineTicks:steps,wallMs:proof.wallMs}));
}catch(error){
  let lastState:Record<string,unknown>;try{lastState=state(world);}catch{lastState={tick:world.tick,phase:world.group?.phase,summaryUnavailable:true};}
  const lastPath=write('failure-world.json',JSON.stringify(world)),proofPath=write('failure-proof.json',JSON.stringify({status:'fail',error:error instanceof Error?error.stack:String(error),
    tick:world.tick,engineTicks:steps,replayShadowTicks:replaySteps,wallMs:Math.round(performance.now()-started),lastPath,lastState,marks},null,2));
  console.error(JSON.stringify({status:'fail',proofPath,lastPath,tick:world.tick,engineTicks:steps,error:(error instanceof Error?error.message:String(error)).slice(0,2000)}));process.exitCode=1;
}
