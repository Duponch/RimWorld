import { expect,test } from 'vitest';
import { advanceFoodPoisoning,cookFoodPoisonChance,copyFoodPoison,exposeFoodPoisoning,foodPoisonFromRecipe,foodPoisoningModifiers,foodPoisoningStage,foodPoisonVomitChance,ingestionFoodPoison,mergedFoodPoison,roomFoodPoisonChance,type FoodContamination,type FoodPoisoningState } from '../src/sim/food-poisoning';
import { processFoodPoisoningVomit,type FoodPoisonVomitContext } from '../src/sim/food-poisoning-runtime';
import { validFoodContamination,validFoodPoisoning } from '../src/sim/food-poisoning-save';

const forbiddenRandom=()=>{throw new Error('Unexpected randomness');};
const illness=():FoodPoisoningState=>exposeFoodPoisoning(undefined,'incompetent-cook','simple-meal',0);

test('recipe completion resolves room before cook; clean rooms skip the zero-risk draw',()=>{
  expect([-10,-5,-3.5,-2,-1,0].map(roomFoodPoisonChance)).toEqual([.05,.05,.025,0,0,0]);expect(roomFoodPoisonChance(null)).toBe(.02);
  expect(Array.from({length:11},(_,i)=>cookFoodPoisonChance(i))).toEqual([.05,.04,.03,.02,.015,.01,.005,.0025,.0015,.001,.001]);expect(cookFoodPoisonChance(20)).toBe(.001);
  let calls=0;expect(foodPoisonFromRecipe(-5,0,()=>{calls++;return .049;})).toEqual({fraction:1,cause:'filthy-kitchen'});expect(calls).toBe(1);
  const rolls=[.05,.049];expect(foodPoisonFromRecipe(-5,0,()=>rolls.shift()!)).toEqual({fraction:1,cause:'incompetent-cook'});expect(rolls).toEqual([]);
  calls=0;expect(foodPoisonFromRecipe(0,9,()=>{calls++;return .001;})).toBeUndefined();expect(calls).toBe(1);
  expect(foodPoisonFromRecipe(null,9,()=>.01)?.cause).toBe('filthy-kitchen');
});

test('split, partial merge and ties preserve toxic fraction without infecting a whole clean stack',()=>{
  const poisoned:FoodContamination={fraction:1,cause:'filthy-kitchen'},other:FoodContamination={fraction:1,cause:'incompetent-cook'};
  const split=copyFoodPoison(poisoned)!;expect(split).toEqual(poisoned);expect(split).not.toBe(poisoned);
  expect(mergedFoodPoison(undefined,9,poisoned,1)).toEqual({fraction:.1,cause:'filthy-kitchen'});
  expect(mergedFoodPoison(poisoned,1,other,1)).toEqual({fraction:1,cause:'incompetent-cook'});
  expect(mergedFoodPoison(poisoned,2,other,1)?.cause).toBe('filthy-kitchen');
  expect(mergedFoodPoison({fraction:.5,cause:'unknown'},2,other,1)).toEqual({fraction:2/3,cause:'incompetent-cook'});
  expect(mergedFoodPoison(undefined,2,undefined,1)).toBeUndefined();expect(()=>mergedFoodPoison(poisoned,1,other,-1)).toThrow();
  const diluted=mergedFoodPoison(undefined,4,poisoned,1)!,a=copyFoodPoison(diluted)!,b=copyFoodPoison(diluted)!;
  expect(mergedFoodPoison(a,2,b,3)).toEqual(diluted);expect(poisoned.fraction).toBe(1);
});

test('risk applies once on completed ingestion; raw risk is human-only and difficulty acts then',()=>{
  for(const item of ['berries','rice','potato','corn','hare-meat'] as const){
    let calls=0;expect(ingestionFoodPoison({item},true,.75,()=>{calls++;return .0149;})).toBe('dangerous-food');expect(calls).toBe(1);
    expect(ingestionFoodPoison({item},true,.75,()=>.015)).toBeUndefined();expect(ingestionFoodPoison({item},false,.75,forbiddenRandom)).toBeUndefined();
  }
  const meal={item:'simple-meal' as const,foodPoison:{fraction:1,cause:'filthy-kitchen' as const}};
  expect(ingestionFoodPoison(meal,false,.75,()=>.749)).toBe('filthy-kitchen');expect(ingestionFoodPoison(meal,true,.75,()=>.75)).toBeUndefined();
  expect(ingestionFoodPoison(meal,true,1,forbiddenRandom)).toBe('filthy-kitchen');expect(ingestionFoodPoison(meal,true,0,forbiddenRandom)).toBeUndefined();
  expect(ingestionFoodPoison({item:'survival-meal'},true,1,forbiddenRandom)).toBeUndefined();
  expect(ingestionFoodPoison({item:'legacy-portion'},true,1,forbiddenRandom)).toBeUndefined();
});

test('three phases, repeat exposure and 200-Core recovery pulses survive exact continuation',()=>{
  const initial=illness();expect(foodPoisoningStage(initial)).toBe('initial');expect(foodPoisoningModifiers(initial).consciousnessFactor).toBe(.6);
  advanceFoodPoisoning(initial,0,0);expect(initial.severity).toBe(300000);advanceFoodPoisoning(initial,19,0);expect(initial.severity).toBe(300000);
  advanceFoodPoisoning(initial,20,0);expect(initial.severity).toBe(299000);
  const before=structuredClone(initial);expect(exposeFoodPoisoning(initial,'dangerous-food','rice',30)).toEqual(before);
  initial.severity=240000;expect(foodPoisoningStage(initial)).toBe('initial');advanceFoodPoisoning(initial,40,0);expect(foodPoisoningStage(initial)).toBe('major');
  expect(foodPoisoningModifiers(initial)).toEqual({painOffset:.4,consciousnessFactor:.5,movingFactor:.5,manipulationFactor:.8,bloodFiltrationFactor:.85,eatingFactor:.3,talkingFactor:.8});
  initial.severity=59999;expect(foodPoisoningStage(initial)).toBe('recovering');expect(foodPoisonVomitChance(initial)).toBeCloseTo(.025,14);
  exposeFoodPoisoning(initial,'dangerous-food','corn',41);expect(initial.severity).toBe(239700);expect(initial.bornAt).toBe(0);
  const restored=JSON.parse(JSON.stringify(initial)) as FoodPoisoningState;
  for(let tick=42;tick<=4840;tick++){advanceFoodPoisoning(initial,tick,0);advanceFoodPoisoning(restored,tick,0);expect(validFoodPoisoning(initial,tick,true)).toBe(initial.severity>0);}
  expect(restored).toEqual(initial);expect(initial.severity).toBe(0);expect(foodPoisoningStage(initial)).toBe('none');expect(foodPoisoningModifiers(initial).painOffset).toBe(0);
  const full=illness();for(let tick=1;tick<=6000;tick++)advanceFoodPoisoning(full,tick,0);expect(full.severity).toBe(0);
});

test('vomiting has physical initiation, bounded target selection, phased nutrition loss and restartable duration',()=>{
  const state=illness(),deposits:{x:number;z:number}[]=[];
  let start=0,randomCalls=0;
  const context:FoodPoisonVomitContext={awake:true,position:{x:4,z:4},foodLevel:10.01,foodMax:100,random:()=>{randomCalls++;return 0;},canStand:()=>false,start:()=>{start++;return false;},deposit:c=>deposits.push({...c})};
  expect(processFoodPoisoningVomit(state,60,0,context).active).toBe(false);expect(start).toBe(1);expect(randomCalls).toBe(1);expect(state.vomit).toBeUndefined();
  context.start=()=>true;const begun=processFoodPoisoningVomit(state,120,0,context);expect(begun).toEqual({active:true,foodLevel:6.01});expect(state.vomit).toEqual({remainingCore:290,cell:{x:4,z:4}});expect(randomCalls).toBe(16);expect(deposits).toEqual([{x:4,z:4}]);
  const restored=structuredClone(state);let food=begun.foodLevel;
  for(let tick=121;tick<150;tick++){
    const a=processFoodPoisoningVomit(state,tick,0,{...context,foodLevel:food,random:forbiddenRandom});
    const b=processFoodPoisoningVomit(restored,tick,0,{...context,foodLevel:food,random:forbiddenRandom,deposit:()=>{}});
    expect(a).toEqual(b);food=a.foodLevel;
  }
  expect(state).toEqual(restored);expect(state.vomit).toBeUndefined();expect(food).toBe(6.01);expect(deposits).toHaveLength(2);
  state.vomit={remainingCore:10,cell:{x:4,z:4}};state.severity=0;expect(advanceFoodPoisoning(state,160,0)).toBe(true);expect(validFoodPoisoning(state,160,true)).toBe(true);
  processFoodPoisoningVomit(state,160,0,{...context,random:forbiddenRandom});expect(advanceFoodPoisoning(state,161,0)).toBe(false);
  const sleeping=illness();expect(processFoodPoisoningVomit(sleeping,60,0,{...context,awake:false,start:()=>{throw new Error('Sleep interrupted');}}).active).toBe(false);
});

test('migration accepts absence only; malformed contamination and illness never become valid data',()=>{
  expect(validFoodContamination(undefined,'simple-meal',false)).toBe(true);expect(validFoodPoisoning(undefined,0,false)).toBe(true);
  const poison={fraction:.5,cause:'filthy-kitchen'};expect(validFoodContamination(poison,'simple-meal',true)).toBe(true);expect(validFoodContamination(poison,'simple-meal',false)).toBe(false);expect(validFoodContamination(poison,'rice',true)).toBe(false);
  for(const fraction of [0,-1,1.1,NaN,Infinity])expect(validFoodContamination({...poison,fraction},'simple-meal',true)).toBe(false);
  const state=illness();expect(validFoodPoisoning(state,0,true)).toBe(true);expect(validFoodPoisoning(state,0,false)).toBe(false);
  for(const bad of [{...state,extra:true},{...state,bornAt:1},{...state,severity:.1},{...state,severity:300001},{...state,cause:'dangerous-food'},{...state,item:'wood'},{...state,vomit:{remainingCore:900,cell:{x:1,z:1}}}])expect(validFoodPoisoning(bad,0,true)).toBe(false);
});
