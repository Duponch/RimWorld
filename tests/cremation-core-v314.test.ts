import { expect,test } from 'vitest';
import { cremationIngredientAllowed,cremationSpeed,CREMATION_INPUTS,validCremationFilter,validCremationIngredients } from '../src/sim/cremation-rules.ts';
import { finishCremation } from '../src/sim/cremation.ts';
import { ensureFireState } from '../src/sim/fire-rules.ts';
import { advanceHumanCorpses } from '../src/sim/human-corpses.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { cookingSpot,newCookingBill,countedProducts } from '../src/sim/cooking-bills.ts';
import { productionResearchUnlocked,productionWorkerQualified } from '../src/sim/machining.ts';
import { isRecipeProduct,productionWorkTotal,recipeHasProducts,recipeProduct,stationWork,taskWork } from '../src/sim/production-recipes.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { createMedicalRecord,reconcileMedicalDeath } from '../src/sim/injury-state.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { pawnBody } from '../src/sim/health-rules.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { CORPSE_DESSICATION_TICKS,CORPSE_ROT_TICKS } from '../src/sim/corpses.ts';
import { createPrisonerState } from '../src/sim/prisoner-state.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { MaterialPile,Structure,World } from '../src/sim/types.ts';
import type { ProductionContext } from '../src/sim/production-output.ts';
import { biofuelCamp } from './helpers/biofuel-v283.ts';
import { controlledInjury } from './scenarios/health.ts';
import { fixturePower } from './scenarios/power.ts';
import { visitorTradeFixture } from './scenarios/visitors.ts';

/** Prepared finished work; services tests own the real approach/portage circuit. */
function staged(human=false){
  const {world:w,refineryId,startGeneratorId}=biofuelCamp(),p=w.pawns[0]!,person=w.pawns[1]!,station=w.structures.find(s=>s.id===refineryId)!;
  w.structures=w.structures.filter(s=>s.id===refineryId||s.id===startGeneratorId);
  station.kind='electric-crematorium';station.material='granite-blocks';station.power=newPowerState(station.kind);station.power.parentId=startGeneratorId;station.power.on=true;
  const bill=newCookingBill(w.nextId++,'cremate-corpse');station.bills=[bill];
  const spot=cookingSpot(station),cell={x:spot.x-1,z:spot.z};Object.assign(p,{...spot,state:'working',moveCooldown:0});
  let corpse:MaterialPile;
  if(human){
    person.health=createMedicalRecord(w.tick);person.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(person.health);reconcilePawnHealth(w,person);advanceHumanCorpses(w);
    corpse=w.piles.find(i=>i.id===person.body!.pileId)!;corpse.owner={type:'ground',...cell};
  }else{
    const id=w.nextId++,health={...createMedicalRecord(w.tick),body:'hare' as const,bloodLoss:BLOOD_UNIT,death:{tick:w.tick,cause:'blood-loss' as const}};
    corpse={id,item:'hare-corpse',kind:'corpse',quantity:1,owner:{type:'ground',...cell},rot:{progress:0,atTick:w.tick},corpse:{animalId:id,species:'hare',sex:'female',ageTicks:adultAgeTicks('hare'),health}};
    w.piles.push(corpse);bill.filters['hare-corpse']=true;
  }
  p.cooking={recipe:'cremate-corpse',stationId:station.id,billId:bill.id,spot,actionCell:{x:station.x,z:station.z},phase:'work',ingredients:[{pileId:corpse.id,item:corpse.item as 'human-corpse'|'hare-corpse',quantity:1,stage:'placed',cell}],progress:productionWorkTotal('cremate-corpse'),productId:null,storageId:null};
  refreshStock(w);
  const context:ProductionContext={search:()=>null,move:()=>{throw Error('Already placed');},release:()=>{throw Error('Commit never releases cargo');},event:()=>{},workRate:()=>1};
  return {w,p,person,station,bill,corpse,context};
}

/** Packed inventory is supported for a trader's whole sculpture, not a colon's bed. */
function stagedMerchant(){
  const {world:w,pawnId,traderId}=visitorTradeFixture(),p=w.pawns.find(a=>a.id===pawnId)!,person=w.pawns.find(a=>a.id===traderId)!;
  const generator=fixturePower(w,'wood-generator',11,11),bill=newCookingBill(w.nextId++,'cremate-corpse');
  const station:Structure={id:w.nextId++,kind:'electric-crematorium',x:14,z:13,orientation:0,footprint:'standard',material:'granite-blocks',power:newPowerState('electric-crematorium'),bills:[bill]};
  station.power!.parentId=generator.id;station.power!.on=true;w.structures.push(station);
  person.health=createMedicalRecord(w.tick);person.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(person.health);reconcilePawnHealth(w,person);advanceHumanCorpses(w);
  const corpse=w.piles.find(i=>i.id===person.body!.pileId)!,spot=cookingSpot(station),cell={x:spot.x-1,z:spot.z};
  corpse.owner={type:'ground',...cell};Object.assign(p,{...spot,state:'working',moveCooldown:0});p.priorities.haul=1;
  p.cooking={recipe:'cremate-corpse',stationId:station.id,billId:bill.id,spot,actionCell:{x:station.x,z:station.z},phase:'work',ingredients:[{pileId:corpse.id,item:'human-corpse',quantity:1,stage:'placed',cell}],progress:productionWorkTotal('cremate-corpse'),productId:null,storageId:null};
  w.packed.push({building:{id:w.nextId++,kind:'small-sculpture',x:6,z:7,orientation:0,footprint:'standard',material:'wood',quality:'normal',art:{authorId:p.id,createdAt:w.tick}},owner:{type:'inventory',pawnId:person.id}});
  refreshStock(w);const context:ProductionContext={search:()=>null,move:()=>{throw Error('Already placed');},release:()=>{throw Error('Commit never releases cargo');},event:()=>{},workRate:()=>1};
  return {w,p,person,station,bill,corpse,context};
}

test('cremation is prospective hauling with one body and no products, skill gate or learning',()=>{
  const {w,p,station,bill}=staged();expect(validateWorld(w)).toEqual([]);
  expect(stationWork(station)).toBe('haul');expect(taskWork(p.cooking!)).toBe('haul');expect(productionWorkTotal('cremate-corpse')).toBe(180000);
  expect(productionResearchUnlocked(w,'cremate-corpse')).toBe(true);expect(productionResearchUnlocked({...w,schemaVersion:224 as World['schemaVersion']},'cremate-corpse')).toBe(false);
  expect(productionWorkerQualified(p,'cremate-corpse')).toBe(true);expect(cremationSpeed(p)).toBe(1);
  expect(recipeHasProducts('cremate-corpse')).toBe(false);expect(recipeHasProducts('small-sculpture')).toBe(true);
  expect(()=>recipeProduct('cremate-corpse',p.cooking!.ingredients)).toThrow(/no products/);
  expect(isRecipeProduct('cremate-corpse','granite-blocks')).toBe(false);expect(countedProducts(w,bill)).toBe(0);
  const fresh=newCookingBill(1,'cremate-corpse');for(const item of CREMATION_INPUTS)expect(fresh.filters[item]).toBe(item==='human-corpse');
  expect(fresh.cremationFilter).toEqual({colonists:true,strangers:true,fresh:true,rotting:true,desiccated:true});expect(fresh.destination).toBe('drop');
  controlledInjury(w,p,'left-arm',2000);const c=pawnBody(p).capacities;expect(cremationSpeed(p)).toBeCloseTo(Math.max(.1,c.manipulation*(.5+.5*Math.min(1,c.sight))));
});

test.each([['fresh',0],['rotting',CORPSE_ROT_TICKS],['desiccated',CORPSE_DESSICATION_TICKS]] as const)('real %s animal identity is admitted independently of carrier but rejected by its current stage filter',(stage,age)=>{
  const {w,bill,corpse}=staged();w.tick+=age;corpse.rot={progress:age,atTick:w.tick};
  expect(cremationIngredientAllowed(w,bill,corpse)).toBe(true);
  expect(cremationIngredientAllowed(w,bill,{...corpse,owner:{type:'pawn',pawnId:w.pawns[0]!.id}})).toBe(true);
  bill.cremationFilter![stage]=false;expect(cremationIngredientAllowed(w,bill,corpse)).toBe(false);
});

test('admission rejects live originals, mixed metadata, duplicate identity, malformed filters and non-whole sources',()=>{
  const {w,bill,corpse}=staged();expect(validCremationFilter(Object.create(bill.cremationFilter!))).toBe(false);
  expect(validCremationFilter({...bill.cremationFilter,animals:true})).toBe(false);expect(validCremationFilter({...bill.cremationFilter,fresh:1})).toBe(false);
  expect(validCremationIngredients([{item:'hare-corpse',quantity:2}])).toBe(false);expect(validCremationIngredients([{item:'scyther-corpse',quantity:1}])).toBe(false);
  expect(cremationIngredientAllowed(w,bill,{...corpse,humanCorpse:{pawnId:w.pawns[1]!.id}})).toBe(false);
  expect(cremationIngredientAllowed(w,bill,{...corpse,corpse:{...corpse.corpse!,animalId:corpse.id+1}})).toBe(false);
  const human=staged(true);human.person.state='idle';expect(cremationIngredientAllowed(human.w,human.bill,human.corpse)).toBe(false);
  human.person.state='dead';human.person.body!.lostAt=human.w.tick;expect(cremationIngredientAllowed(human.w,human.bill,human.corpse)).toBe(false);
});

test('human affiliation remains historical; prisoner status does not change the colony filter, grave is unavailable',()=>{
  const {w,person,bill,corpse}=staged(true);bill.cremationFilter!.colonists=false;
  person.prisoner=createPrisonerState(w,person);expect(cremationIngredientAllowed(w,bill,corpse)).toBe(false);
  person.faction='outlanders';expect(cremationIngredientAllowed(w,bill,corpse)).toBe(true);
  bill.cremationFilter!.strangers=false;expect(cremationIngredientAllowed(w,bill,corpse)).toBe(false);
  bill.cremationFilter!.strangers=true;corpse.owner={type:'grave',graveId:123};expect(cremationIngredientAllowed(w,bill,corpse)).toBe(false);
});

test('a partially consumed animal still retires one original body, with no meat, leather or anatomy mutation',()=>{
  const {w,p,bill,corpse,context}=staged();corpse.corpse!.consumedParts=[{part:'tail',atTick:w.tick}];
  expect(validateWorld(w)).toEqual([]);const medical=structuredClone(corpse.corpse!.health),anatomy=structuredClone(corpse.corpse!.consumedParts);
  expect(finishCremation(w,p,bill,context)).toBe(true);expect(w.destroyed?.items).toEqual({'hare-corpse':1});
  expect(corpse.corpse!.health).toEqual(medical);expect(corpse.corpse!.consumedParts).toEqual(anatomy);
  expect(w.piles.some(i=>i.item==='hare-meat'||i.item==='light-leather')).toBe(false);
});

test('completed animal work consumes once without output, allocation, RNG, XP or a second ledger',()=>{
  const {w,p,bill,corpse,context}=staged(),rng=w.rng,nextId=w.nextId,skills=structuredClone(p.skills),id=corpse.id;
  expect(validateWorld(w)).toEqual([]);expect(finishCremation(w,p,bill,context)).toBe(true);
  expect(w.piles.some(i=>i.id===id)).toBe(false);expect(w.destroyed?.items?.['hare-corpse']).toBe(1);expect(w.destroyed?.count).toBe(0);
  expect(w.nextId).toBe(nextId);expect(w.rng).toBe(rng);expect(p.skills).toEqual(skills);expect(p.cooking).toBeNull();expect(bill.target).toBe(0);expect(Object.hasOwn(w,'cremation')).toBe(false);
  const after=structuredClone(w);expect(finishCremation(w,p,bill,context)).toBe(false);expect(w).toEqual(after);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('whole colon neutral loss retires disabled attached equipment, clothing and admissible inventory but preserves person and dropped witnesses',()=>{
  const {w,p,person,bill,corpse,context}=staged(true);
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:person.id},'revolver');person.equipmentDropPending=true;
  addMaterial(w,'apparel',1,{type:'apparel',pawnId:person.id},'cloth-shirt');addMaterial(w,'medicine',3,{type:'inventory',pawnId:person.id},'medicine');
  addMaterial(w,'weapon',1,{type:'ground',x:8,z:10},'bolt-action-rifle');const dropped=w.piles.find(i=>i.item==='bolt-action-rifle')!;
  w.structures.push({id:w.nextId++,kind:'grave',x:22,z:16,orientation:0,footprint:'standard',grave:{colonists:true,strangers:true,assignedPawnId:person.id}});
  ensureFireState(w).ledger.items.wood=2;
  refreshStock(w);expect(validateWorld(w)).toEqual([]);
  const health=structuredClone(person.health),history=structuredClone({relations:w.relationships,death:person.deathThoughts,family:person.familyBereavement}),fires=structuredClone(w.fires),rng=w.rng,nextId=w.nextId,skills=structuredClone(p.skills),bodyId=corpse.id;
  expect(finishCremation(w,p,bill,context)).toBe(true);expect(w.pawns.find(a=>a.id===person.id)).toBe(person);expect(person.body).toMatchObject({pileId:bodyId,lostAt:w.tick});expect(person.health).toEqual(health);
  expect({relations:w.relationships,death:person.deathThoughts,family:person.familyBereavement}).toEqual(history);expect(w.piles).toContain(dropped);
  expect(w.piles.some(i=>'pawnId' in i.owner&&i.owner.pawnId===person.id)).toBe(false);expect(w.packed).toEqual([]);
  expect(w.destroyed).toMatchObject({count:0,lost:{},items:{'human-corpse':1,revolver:1,'cloth-shirt':1,medicine:3}});expect(person.equipmentDropPending).toBeUndefined();
  expect(w.structures.find(s=>s.kind==='grave')!.grave!.assignedPawnId).toBeUndefined();expect(w.fires).toEqual(fires);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(p.skills).toEqual(skills);expect(bill.target).toBe(0);
  advanceHumanCorpses(w);expect(w.piles.some(i=>i.humanCorpse?.pawnId===person.id)).toBe(false);expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('a real merchant corpse loses its complete finite inventory and whole attached sculpture atomically',()=>{
  const {w,p,person,bill,corpse,context}=stagedMerchant();expect(validateWorld(w)).toEqual([]);
  const attached=w.piles.filter(i=>i===corpse||'pawnId' in i.owner&&i.owner.pawnId===person.id),quantities:Record<string,number>={};
  for(const pile of attached)quantities[pile.item]=(quantities[pile.item]??0)+pile.quantity;
  const witnesses=w.piles.filter(i=>!attached.includes(i)),health=structuredClone(person.health),rng=w.rng,nextId=w.nextId,skills=structuredClone(p.skills);
  expect(finishCremation(w,p,bill,context)).toBe(true);expect(w.destroyed).toMatchObject({count:1,lost:{wood:50},items:quantities});
  expect(w.packed).toEqual([]);expect(w.piles).toEqual(witnesses);expect(person.body!.lostAt).toBe(w.tick);expect(person.health).toEqual(health);expect(person.visitor!.personalFoodIds).toEqual([]);
  expect(w.pawns).toContain(person);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(p.skills).toEqual(skills);expect(bill.target).toBe(0);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test.each(['animal-items','human-items','human-pack-count','human-pack-material'] as const)('saturated %s ledger rejects the whole commit and preserves exact progress, possessions and bill',which=>{
  const scene=which.startsWith('human-pack')?stagedMerchant():staged(which!=='animal-items'),{w,p,bill,context}=scene;
  w.destroyed=which==='human-pack-count'?{count:Number.MAX_SAFE_INTEGER,lost:{wood:1}}
    :which==='human-pack-material'?{count:1,lost:{wood:Number.MAX_SAFE_INTEGER}}
    :{count:0,lost:{},items:which==='animal-items'?{'hare-corpse':Number.MAX_SAFE_INTEGER}:{'human-corpse':Number.MAX_SAFE_INTEGER}};
  expect(validateWorld(w)).toEqual([]);
  const before=structuredClone(w);expect(finishCremation(w,p,bill,context)).toBe(false);expect(w).toEqual(before);
});

test.each(['power','draft','priority','unfinished-edge','wrong-stage','foreign-bill','claim','outside-area','undefined-learning','bad-filter'] as const)('final revalidation of %s refuses consumption atomically',which=>{
  const {w,p,station,bill,corpse,context}=staged();
  if(which==='power')station.power!.on=false;
  if(which==='draft')p.draft={target:null,queue:[],lastActiveTick:w.tick};
  if(which==='priority'){p.priorities.haul=0;p.orders.active='cook';}
  if(which==='unfinished-edge')p.motion={from:{x:p.x-1,z:p.z},to:{x:p.x,z:p.z},start:w.tick,end:w.tick+1};
  if(which==='wrong-stage')p.cooking!.ingredients[0]!.stage='held';
  if(which==='undefined-learning')Object.defineProperty(p.cooking!,'workTicks',{value:undefined,enumerable:true});
  if(which==='bad-filter')delete bill.cremationFilter;
  if(which==='claim')w.pawns[1]!.orders.queue.push({cooking:structuredClone(p.cooking!)});
  if(which==='outside-area'){w.allowedAreas=[{id:w.nextId++,label:'Elsewhere',color:0xff0000,cells:[0]}];p.allowedAreaId=w.allowedAreas[0]!.id;}
  const before=structuredClone(w);expect(finishCremation(w,p,which==='foreign-bill'?structuredClone(bill):bill,context)).toBe(false);expect(w).toEqual(before);expect(w.piles).toContain(corpse);
});

test('no-output commit remains possible at the identity and pile-count limits',()=>{
  const {w,p,bill,context}=staged();
  // Isolate the allocation boundary on an otherwise ordinary transaction.
  // A larger empty terrain supplies one distinct physical cell per witness.
  w.width=256;w.height=256;w.tiles=Array.from({length:65536},()=>({terrain:'grass'}));
  for(let n=w.piles.length;n<32768;n++)w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',x:n%256,z:64+Math.floor(n/256)}});
  w.nextId=Number.MAX_SAFE_INTEGER;const nextId=w.nextId;
  expect(w.piles).toHaveLength(32768);expect(finishCremation(w,p,bill,context)).toBe(true);expect(w.piles).toHaveLength(32767);expect(w.nextId).toBe(nextId);expect(bill.target).toBe(0);
});
