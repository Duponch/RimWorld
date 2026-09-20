import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { isColonist } from '../src/sim/affiliation.ts';
import { ITEM_DEFINITIONS,type ItemId } from '../src/sim/items.ts';
import { foodAccount } from '../tests/scenarios/colony-player.ts';
import { metalAccount } from '../tests/scenarios/energy-player.ts';
import type { EnvironmentPlayerState } from '../tests/scenarios/environment-player.ts';
import { newTradePlayer,observeTrade,tradeDecisions,tradeJourneyComplete,tradeMaintenanceDecisions,tradePlayerSummary,type TradePlayerState } from '../tests/scenarios/trade-player.ts';
import type { Command,World } from '../src/sim/types.ts';

// Committed Lisière world, never a user's private RimWorld save. The immutable
// published checkpoint and its notebook precede the V88 adoption command.
const sourceBytes=gunzipSync(readFileSync('tests/fixtures/colony-v87.json.gz'));
const fixtureHash=createHash('sha256').update(sourceBytes).digest('hex');
assert.equal(fixtureHash,'cec15fc400b8cdf47a24bcacb7ff331b6bdaaec369bf81a184a822d3c819347c');
assert.equal(JSON.parse(sourceBytes.toString('utf8')).schemaVersion,87);
interface Ledger {consumed:number;harvested:number;cooked:number;componentsMined:number;importedFood:number;importedComponents:number;importedSilver:number}
interface Checkpoint {protocol:'trade-v88';fixtureHash:string;world:string;player:TradePlayerState;ledger:Ledger;initial:{food:number;component:number;silver:number};journal:{tick:number;reason:string;command:Command}[];observations:ReturnType<typeof tradePlayerSummary>[]}
const archived=(w:World,item?:ItemId,food=false)=>(w.visitors?.departed??[]).reduce((n,d)=>n+d.items.filter(p=>food?p.kind==='food':p.item===item).reduce((n,p)=>n+p.quantity,0),0);
const fireFood=(w:World)=>Object.entries(w.fires?.ledger.items??{}).reduce((n,[item,quantity])=>n+(ITEM_DEFINITIONS[item as ItemId].kind==='food'?quantity:0),0);
const foodTotal=(w:World)=>foodAccount(w)+fireFood(w)+archived(w,undefined,true)+(w.wildlife?.eatenItems??0);
const componentTotal=(w:World)=>metalAccount(w,'component')+(w.fires?.ledger.items.component??0)+archived(w,'component');
const silverTotal=(w:World)=>w.piles.filter(p=>p.item==='silver').reduce((n,p)=>n+p.quantity,0)+archived(w,'silver')+(w.fires?.ledger.items.silver??0);
const resumePath=process.env.TRADE_RESUME;
const resumed=resumePath?JSON.parse(readFileSync(resumePath,'utf8')) as Checkpoint:undefined;
if(resumed){assert.equal(resumed.protocol,'trade-v88');assert.equal(resumed.fixtureHash,fixtureHash);}
let world=resumed?deserializeWorld(resumed.world):deserializeWorld(sourceBytes.toString('utf8'));
const environmentalReport=JSON.parse(readFileSync('artifacts/environment-colony-v87.json','utf8')) as {player:EnvironmentPlayerState};
const player=resumed?.player??newTradePlayer(world,environmentalReport.player);
const ledger:Ledger=resumed?.ledger??{consumed:0,harvested:0,cooked:0,componentsMined:0,importedFood:0,importedComponents:0,importedSilver:0};
const initial=resumed?.initial??{food:foodTotal(world),component:componentTotal(world),silver:silverTotal(world)};
const journal=resumed?.journal??[],observations=resumed?.observations??[];
const fromTick=world.tick,started=performance.now(),maxDays=Number(process.env.TRADE_MAX_DAYS??15),diagnosticUntil=process.env.TRADE_UNTIL===undefined?undefined:Number(process.env.TRADE_UNTIL);
assert.ok(maxDays===15||maxDays===30,'The agreed horizon is 15 days; extend explicitly to 30 only after examining the actual calendar.');
if(diagnosticUntil!==undefined)assert.ok(Number.isSafeInteger(diagnosticUntil)&&diagnosticUntil>world.tick&&diagnosticUntil<=world.tick+2*6000,'A preflight stops within two days and is never reported as a completed journey.');
const limit=Math.min(player.startTick+maxDays*6000,diagnosticUntil??Infinity);
const checkpoint=():Checkpoint=>({protocol:'trade-v88',fixtureHash,world:serializeWorld(world),player,ledger,initial,journal,observations});
const save=(path:string)=>writeFileSync(path,JSON.stringify(checkpoint()));
function verify():void {
  assert.deepEqual(validateWorld(world),[]);
  assert.equal(foodTotal(world)+ledger.consumed+9*ledger.cooked,initial.food+ledger.harvested+ledger.importedFood,'Physical food + spoilage/fire/export + ingestion/cooking must match harvest and visitor imports.');
  assert.equal(componentTotal(world),initial.component+ledger.componentsMined+ledger.importedComponents,'Physical/imported/exported components and building costs must balance.');
  assert.equal(silverTotal(world),initial.silver+ledger.importedSilver,'Trade transfers silver; it must not create or delete it.');
  assert.ok(player.initialPeople.every(id=>world.pawns.some(p=>p.id===id&&isColonist(p)&&p.state!=='dead')),'The real four-person colony must survive this continuation.');
}
function continuation():void {
  const saved=serializeWorld(world),actual=structuredClone(world),restored=deserializeWorld(saved);
  stepWorld(actual,30);stepWorld(restored,30);
  assert.equal(serializeWorld(actual),serializeWorld(restored),'Checkpoint must resume exactly, including group agendas and all physical inventory.');
}
const observe=()=>{observeTrade(world,player);observations.push(tradePlayerSummary(world,player));verify();};
function command(decision:{reason:string;command:Command}):void {
  const result=applyCommand(world,decision.command);journal.push({tick:world.tick,...decision});
  assert.ok(result.ok,JSON.stringify({tick:world.tick,...decision,result}));observeTrade(world,player);
}
try {
  verify();continuation();
  while(world.tick<limit&&!tradeJourneyComplete(player)){
    const milestones=Object.keys(player.milestones).join(',');
    if(world.tick===fromTick||world.tick%250===0||world.raids?.active&&world.tick%20===0)for(const d of tradeMaintenanceDecisions(world,player))command(d);
    if(world.tick===fromTick||world.tick%20===0)for(const d of tradeDecisions(world,player))command(d);
    const existing=new Set(world.pawns.map(p=>p.id));
    const mines=world.jobs.filter(j=>j.kind==='mine'&&world.tiles[j.z*world.width+j.x]!.ore==='machinery').map(j=>j.z*world.width+j.x);
    stepWorld(world);
    const arrived=new Set(world.pawns.filter(p=>p.visitor&&!existing.has(p.id)).map(p=>p.id));
    if(arrived.size)for(const pile of world.piles)if('pawnId' in pile.owner&&arrived.has(pile.owner.pawnId)){
      if(pile.kind==='food')ledger.importedFood+=pile.quantity;if(pile.item==='component')ledger.importedComponents+=pile.quantity;if(pile.item==='silver')ledger.importedSilver+=pile.quantity;
    }
    for(const index of mines)if(world.tiles[index]!.terrain!=='rock')ledger.componentsMined+=2;
    for(const event of world.events.filter(e=>e.tick===world.tick)){
      const meal=event.message.match(/a mangé une portion \((\d+) ×/);if(meal)ledger.consumed+=Number(meal[1]);
      const harvest=event.message.match(/a récolté (\d+) (baies|riz|pommes de terre|maïs)/);if(harvest)ledger.harvested+=Number(harvest[1]);
      if(event.message.includes('a cuisiné 1 repas simple'))ledger.cooked++;
    }
    observeTrade(world,player);
    if(Object.keys(player.milestones).join(',')!==milestones){observe();continuation();save('tmp/trade-phase-v88.json');console.info(`Commerce J${(world.tick/6000).toFixed(3)} : ${Object.keys(player.milestones).join(', ')}.`);}
    if(world.tick%6000===0){observe();continuation();save('tmp/trade-latest-v88.json');save(`tmp/trade-day${world.tick/6000}-v88.json`);console.info(`Commerce J${world.tick/6000} : ${world.visitors?.groups.length??0} groupe(s), ${world.trade?.count??0} échange(s), ${ledger.cooked} repas produits, ${player.storedMedicine} médicament(s) rangé(s).`);}
  }
  observe();continuation();
  const report={protocol:'trade-v88',fixtureHash,resumed:!!resumed,fromTick,runtimeMs:performance.now()-started,diagnostic:diagnosticUntil!==undefined,completed:tradeJourneyComplete(player),maxDays,initial,ledger,player,journal,observations,final:tradePlayerSummary(world,player)};
  if(diagnosticUntil!==undefined){writeFileSync('artifacts/trade-diagnostic-v88.json',JSON.stringify(report));save('tmp/trade-diagnostic-v88.json');}
  else {
    writeFileSync('artifacts/trade-colony-v88.json',JSON.stringify(report));save('tmp/trade-final-checkpoint-v88.json');writeFileSync('tmp/trade-final-v88.json',serializeWorld(world));
    assert.ok(report.completed,JSON.stringify({message:'Horizon reached without completed commerce. Inspect the genuine calendar/stock/contact, do not force an event.',final:report.final}));
    assert.equal(player.minimumLiving,4);assert.ok(player.soldRevolvers>0&&player.boughtMedicine>0&&player.storedMedicine>=player.boughtMedicine);
  }
  console.info(JSON.stringify({completed:report.completed,diagnostic:report.diagnostic,fromTick,toTick:world.tick,runtimeMs:report.runtimeMs,final:report.final}));
} catch(error) {
  let validation:unknown;try{validation=validateWorld(world);}catch(failure){validation=String(failure);}
  writeFileSync('tmp/trade-failed-v88.json',JSON.stringify({protocol:'trade-v88',fixtureHash,world:JSON.stringify(world),player,ledger,initial,journal,observations,failure:String(error),validation}));throw error;
}
