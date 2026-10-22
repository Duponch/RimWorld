import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {applyCommand} from '../../src/sim/engine.ts';
import {addGroundMaterial,addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {startingPawn} from '../../src/sim/starting-pawns.ts';
import {generatePawnBackground} from '../../src/sim/background-generation.ts';
import {generateVisitorStock} from '../../src/sim/trade-stock.ts';
import {enableVisitors} from '../../src/sim/visitors.ts';
import {newApparelState} from '../../src/sim/apparel-rules.ts';
import type {Command} from '../../src/sim/types.ts';

export const APPAREL_TRADE_SOURCE456=Object.freeze({
 path:'tests/fixtures/apparel-reserves-v455-earned.json',
 sha256:'0a6b79f347014e4c64bcfb87909e2dc3b09dd65a3fdc1a0a1a1214badafaab9a',
 schemaVersion:278,tick:3641,
 acquired:'tmp/apparel-reserves-v455/native-ui-resume/2026-10-22T01-07-19-985Z/actual-replaced-and-spare.json',
 report:'tmp/apparel-reserves-v455/native-ui-resume/2026-10-22T01-07-19-985Z/report.json',
});
export const APPAREL_TRADE_PREPARATION456='The byte-identical acquired V455 native UI final at3641 supplies the original people and actual finished shirts201/208(poor),214(good worn),220(normal spare), plus the declared pre-existing worn-out188. The original four shirts, 180 consumed cloth, qualities, HP, authors, people, clocks and RNG are not recreated or edited. Strict278 is migrated by number alone to279. Prepared additions: one ordinary outlander merchant using the existing person/background and finite stock producers(seed88), one ordinary worn shirt and two personal survival meals, a declared8000Core halt, 200 finite ground silver, four finite ground survival meals and a local home rectangle. The original hunger13.45 and rest42.35 remain unchanged. No contact, ingestion, garment transfer, price or departure is supplied; all of those must actually play after this checkpoint. This is a declared commercial boundary, not a sampled arrival or a self-sufficient colony.';

/** Pure fixture preparation. Native UI and Node tests start from the same
 * complete world before the original hungry negotiator has eaten or traded. */
export function apparelTradeCamp456(){
 const sourceRaw=readFileSync(new URL('../fixtures/apparel-reserves-v455-earned.json',import.meta.url),'utf8');
 if(createHash('sha256').update(sourceRaw).digest('hex')!==APPAREL_TRADE_SOURCE456.sha256)throw Error('Earned V455 native source hash differs');
 const source=JSON.parse(sourceRaw) as Record<string,unknown>,w=deserializeWorld(sourceRaw);
 if(Number(w.schemaVersion)!==279||JSON.stringify({...source,schemaVersion:279})!==serializeWorld(w))throw Error('V455 must migrate by schema number alone');
 const negotiatorId=182,wearerId=183,firstGarmentId=201,secondGarmentId=208,spareGarmentId=220,wornGarmentId=214,oldGarmentId=188;
 const negotiator=w.pawns.find(p=>p.id===negotiatorId),wearer=w.pawns.find(p=>p.id===wearerId);
 if(w.tick!==3641||!negotiator||!wearer||negotiator.hunger>=24||negotiator.need||negotiator.cooking||Boolean(w.visitors))throw Error('Wrong acquired V455 people or food/contact frontier');
 const garments=[firstGarmentId,secondGarmentId,spareGarmentId,wornGarmentId,oldGarmentId].map(id=>w.piles.find(p=>p.id===id));
 if(garments.some(p=>!p?.apparel||p.item!=='cloth-shirt')||w.tailoring?.completed!==4)throw Error('Original actual V455 garments missing');
 const command=(c:Command)=>{const r=applyCommand(w,c);if(!r.ok)throw Error(r.reason);};
 // A bounded prepared halt, with the same live actor/stock constructors as
 // existing visitor fixtures. No merchant category is broadened here.
 enableVisitors(w,false,true);if(w.visitors?.profile!=='cassandra-visitors-v1')throw Error('Prepared local visitor calendar unavailable');
 const traderId=w.nextId++,trader=startingPawn(traderId,'Marchand standard déclaré',17,13,0,70,w.seed,w.tick,w.schemaVersion);
 trader.faction='outlanders';trader.foodPolicyId=w.foodPolicies[0]!.id;
 delete trader.apparelPolicyId;delete trader.apparelAutomation;delete trader.nextApparelCheckAt;
 for(const skill of Object.values(trader.skills))if(typeof skill==='object'){skill.level=0;skill.passion=0;}
 generatePawnBackground(trader,w.seed,false,true);
 for(const work of Object.keys(trader.priorities) as (keyof typeof trader.priorities)[])trader.priorities[work]=0;
 trader.visitor={group:1,role:'trader',phase:'staying',goal:{x:17,z:13},personalFoodIds:[]};w.pawns.push(trader);
 addMaterial(w,'apparel',1,{type:'apparel',pawnId:traderId},'cloth-shirt');
 const merchantShirt=w.piles.find(p=>p.owner.type==='apparel'&&p.owner.pawnId===traderId)!;
 // addMaterial uses the ordinary apparel factory; retain its actual fields.
 if(JSON.stringify(merchantShirt.apparel)!==JSON.stringify(newApparelState('cloth-shirt')))throw Error('Prepared visitor shirt factory differs');
 const stock=generateVisitorStock(88,traderId,w.nextId,w.tick,w.schemaVersion);w.piles.push(...stock.piles);w.nextId=stock.nextId;
 // As in the visitor arrival producer, personal provisions are a distinct
 // real pile, not merged into that actor's already generated sale stock.
 const personalMeal={id:w.nextId++,kind:'food' as const,item:'survival-meal' as const,quantity:2,owner:{type:'inventory' as const,pawnId:traderId}};
 w.piles.push(personalMeal);trader.visitor.personalFoodIds=[personalMeal.id];
 w.visitors.serial=1;w.visitors.groups=[{id:1,kind:'visitor',members:[traderId],entry:{x:0,z:13},spot:{x:17,z:13},phase:'staying',startedAt:w.tick,arrivedAt:w.tick,durationCore:8000,hostile:false}];
 addGroundMaterial(w,'silver',200,{x:12,z:12},'silver');
 addGroundMaterial(w,'food',4,{x:12,z:13},'survival-meal');
 const meal=w.piles.find(p=>p.item==='survival-meal'&&p.owner.type==='ground'&&p.owner.x===12&&p.owner.z===13);
 if(!meal)throw Error('Prepared colonial meals missing');
 command({type:'area',action:'home',from:{x:10,z:8},to:{x:18,z:16}});refreshStock(w);
 const errors=validateWorld(w);if(errors.length)throw Error('Invalid declared V456 boundary: '+errors.join(' '));
 return {w,negotiatorId,wearerId,traderId,firstGarmentId,secondGarmentId,spareGarmentId,wornGarmentId,oldGarmentId,mealPileId:meal.id,personalMealId:personalMeal.id,
  source:APPAREL_TRADE_SOURCE456,preparation:APPAREL_TRADE_PREPARATION456};
}
