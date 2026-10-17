import {expect,test} from 'vitest';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {withWorldGroup} from '../src/sim/world-map-context.ts';
import {openGroupReorganization} from '../src/sim/group-reorganization-balance.ts';
import {advanceCaravanOtherFoodAges256} from '../src/sim/group-animal-runtime-256.ts';
import {ROT_DAYS} from '../src/sim/food-preservation.ts';
import {TICKS_PER_DAY,type MaterialPile} from '../src/sim/types.ts';

/** Supplemental prepared API case only. This explicitly prepared away stock
 * never claims new259 admission, true geographic exit or a terminal engine run.
 * The separate opt-in case covers actual engine death after an acquired259 save.
 */
test('existing other-food producer settles threshold possessions of every still-living owner once',()=>{
 const f=reorganizationCamp256(),at=f.w.tick,piles:MaterialPile[]=[];
 for(const [n,item]of ['simple-meal','milk','hare-meat'] .entries())piles.push({id:f.w.nextId++,kind:'food',item:item as 'simple-meal'|'milk'|'hare-meat',quantity:n+2,owner:{type:'inventory',pawnId:f.members[n%f.members.length]!.id},rot:{progress:ROT_DAYS[item as keyof typeof ROT_DAYS]*TICKS_PER_DAY-1,atTick:at,rate:1}});
 const fresh:MaterialPile={id:f.w.nextId++,kind:'food',item:'simple-meal',quantity:2,owner:{type:'inventory',pawnId:f.members[1]!.id},rot:{progress:0,atTick:at,rate:1}};
 f.g.items.push(...piles,fresh);f.g.reorganization=openGroupReorganization(f.g,[],at,f.g.reorganization!.memberOrigins);
 const localBefore={...f.w.spoiled},effectsBefore={...f.g.reorganization!.inventoryEffects};f.w.tick++;
 // Away views have no local stock. Their real durable conservation is the
 // signed group inventory effect, not the unrelated home spoilage counter.
 const actual=withWorldGroup(f.w,f.g.id,w=>{const before={...w.spoiled};advanceCaravanOtherFoodAges256(w,w.group as typeof f.g);return {before,spoiled:w.spoiled};})!;
 for(const p of piles){expect(f.g.items).not.toContain(p);expect(actual.spoiled[p.item as keyof typeof actual.spoiled]).toBe((actual.before[p.item as keyof typeof actual.before]??0)+p.quantity);expect(f.g.reorganization!.inventoryEffects?.[p.item]).toBe((effectsBefore[p.item]??0)-p.quantity);}expect(f.w.spoiled).toEqual(localBefore);
 expect(f.g.items).toContain(fresh);const settled=JSON.stringify({items:f.g.items,spoiled:f.w.spoiled,inventoryEffects:f.g.reorganization!.inventoryEffects});
 withWorldGroup(f.w,f.g.id,w=>advanceCaravanOtherFoodAges256(w,w.group as typeof f.g));
 expect(JSON.stringify({items:f.g.items,spoiled:f.w.spoiled,inventoryEffects:f.g.reorganization!.inventoryEffects})).toBe(settled);
});
