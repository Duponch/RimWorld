import {expect,test} from 'vitest';
import {huntingCamp} from './scenarios/hunting.ts';
import {advanceLocalEggs256,initializeAnimalEggLayer256,processAnimalEggLay256} from '../src/sim/animal-egg-local-v256.ts';
import {mergeFertilizedEgg256,evolveFertilizedEgg256} from '../src/sim/animal-egg-state-v256.ts';
import {validEggPile256,validAnimalEggState256} from '../src/sim/animal-egg-save-v256.ts';
import {applyEggPermission256,canMergeEggPile256} from '../src/sim/animal-egg-permission-v256.ts';
import {copyPileCondition} from '../src/sim/pile-condition.ts';
import {addMaterial,transferPile} from '../src/sim/materials.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {MAX_WILDLIFE,type WildAnimal} from '../src/sim/wildlife-state.ts';
import type {MaterialPile,World} from '../src/sim/types.ts';
const egg=(tick:number)=>({progress:0,temperatureDamage:0,motherId:1,fatherId:2,faction:'wild' as const,atTick:tick});
function scene(){
 const w=huntingCamp();w.schemaVersion=256 as World['schemaVersion'];w.tick=100;
 w.piles=[];w.resources=[];w.structures=[];w.jobs=[];w.pawns=[];delete w.thermal;
 for(const t of w.tiles)t.terrain='soil';
 const a=w.wildlife!.animals[0]!;w.wildlife!.animals=[a];a.species='turkey';a.sex='female';a.ageTicks=adultAgeTicks('turkey');a.x=10;a.z=10;a.state='idle';a.path=[];delete a.motion;delete a.health;
 initializeAnimalEggLayer256(a);return {w,a};
}
test('strict hatch edge, real temperature ruin, suspension and no duplicate tick',()=>{
 const initial=egg(10),once=evolveFertilizedEgg256(initial,'turkey',{tick:11,temperature:21,suspended:false});
 expect(once.state.progress).toBeGreaterThan(0);
 expect(evolveFertilizedEgg256(once.state,'turkey',{tick:11,temperature:21,suspended:false}).state).toEqual(once.state);
 expect(evolveFertilizedEgg256({...initial,progress:1},'turkey',{tick:10,temperature:21,suspended:false}).action).toBe('none');
 expect(evolveFertilizedEgg256({...initial,progress:1},'turkey',{tick:11,temperature:21,suspended:false}).action).toBe('hatch');
 expect(evolveFertilizedEgg256({...initial,temperatureDamage:.9999},'turkey',{tick:11,temperature:-20,suspended:false}).action).toBe('ruin');
 expect(evolveFertilizedEgg256(initial,'turkey',{tick:11,temperature:-200,suspended:true}).state).toEqual({...initial,atTick:11});
 expect(()=>evolveFertilizedEgg256(initial,'turkey',{tick:12,temperature:21,suspended:false})).toThrow();
});
test('split retains all biological owners and permission; merge is quantity weighted, destination parentage',()=>{
 const source={item:'turkey-egg-fertilized',egg:egg(10),eggForbidden:true as const} as MaterialPile;
 const fragment=copyPileCondition(source);expect(fragment).toEqual({egg:egg(10),eggForbidden:true});expect(fragment.egg).not.toBe(source.egg);
 const a={...egg(10),progress:.2,temperatureDamage:.1},b={...egg(10),motherId:3,fatherId:4,progress:.8,temperatureDamage:.7};
 const merged=mergeFertilizedEgg256(a,3,b,1);expect(merged.progress).toBeCloseTo(.35);expect(merged.temperatureDamage).toBeCloseTo(.25);expect(merged.motherId).toBe(1);
 expect(canMergeEggPile256(source,{...source,eggForbidden:undefined})).toBe(false);
 expect(()=>mergeFertilizedEgg256(a,3,{...b,atTick:9},1)).toThrow();
 expect(()=>mergeFertilizedEgg256(a,3,{...b,temperatureDamage:1},1)).toThrow();
});
test('lay requires fifty actual contact ticks; blocked output spends neither sex nor quantity RNG',()=>{
 const {w,a}=scene();a.eggLayer!.progress=1;a.eggLayer!.fertilizations=1;a.eggLayer!.fatherId=w.nextId-1;
 a.eggLay={target:{x:10,z:10},progress:0};const rng=w.wildlife!.rng,nextId=w.nextId;
 for(let i=0;i<49;i++)expect(processAnimalEggLay256(w,a,()=>{throw Error('unexpected movement');})).toBe(true);
 expect(w.piles).toHaveLength(0);expect(a.eggLay!.progress).toBe(49);
 w.structures.push({id:w.nextId++,kind:'wall',x:10,z:10,orientation:0} as World['structures'][number]);
 processAnimalEggLay256(w,a,()=>{});expect(w.piles).toHaveLength(0);expect(w.wildlife!.rng).toBe(rng);expect(a.eggLayer!.progress).toBe(1);
 w.structures=[];processAnimalEggLay256(w,a,()=>{});const laid=w.piles[0]!;
 expect(laid.id).toBe(nextId+1);expect(laid.quantity).toBe(1);expect(laid.item).toBe('turkey-egg-fertilized');expect(laid.owner).toEqual({type:'ground',x:10,z:10});expect(laid.eggForbidden).toBe(true);expect(laid.egg!.motherId).toBe(a.id);expect(a.eggLay).toBeUndefined();
});
test('blocked hatch retains the exact pile, quantity, IDs and RNG; local permission remains independent',()=>{
 const {w,a}=scene();const pile:MaterialPile={id:w.nextId++,kind:'food',item:'turkey-egg-fertilized',quantity:2,owner:{type:'ground',x:10,z:10},egg:{...egg(w.tick),progress:1.000001},eggForbidden:true};w.piles=[pile];
 while(w.wildlife!.animals.length<MAX_WILDLIFE)w.wildlife!.animals.push({...a,id:w.nextId++,x:1,z:1,path:[],eggLayer:{progress:0,fertilizations:0}});
 const nextId=w.nextId,rng=w.wildlife!.rng;advanceLocalEggs256(w);expect(w.piles[0]).toBe(pile);expect(pile.quantity).toBe(2);expect(w.nextId).toBe(nextId);expect(w.wildlife!.rng).toBe(rng);
 expect(applyEggPermission256(w,{type:'egg-forbid',pileId:pile.id,forbidden:false})).toEqual({ok:true});expect(pile.eggForbidden).toBeUndefined();expect(pile.egg!.progress).toBe(1.000001);
 w.wildlife!.animals=[a];advanceLocalEggs256(w);expect(w.piles).toHaveLength(0);expect(w.wildlife!.animals).toHaveLength(3);expect(w.nextId).toBe(nextId+2);expect(w.wildlife!.animals.slice(1).every(child=>child.ageTicks===0&&child.eggLayer?.progress===0)).toBe(true);
});
test('ruin retains true identity and forbidden permission and becomes the same quantity unfertilized',()=>{
 const {w}=scene();const pile:MaterialPile={id:w.nextId++,kind:'food',item:'turkey-egg-fertilized',quantity:3,owner:{type:'ground',x:10,z:10},egg:{...egg(w.tick),temperatureDamage:1},eggForbidden:true};w.piles=[pile];const id=pile.id;advanceLocalEggs256(w);
 expect(w.piles[0]).toBe(pile);expect(pile.id).toBe(id);expect(pile.item).toBe('turkey-egg-unfertilized');expect(pile.quantity).toBe(3);expect(pile.egg).toBeUndefined();expect(pile.eggForbidden).toBe(true);expect(pile.rot?.atTick).toBe(w.tick);
 expect(validEggPile256(pile,256,w.tick,w.nextId)).toBe(true);expect(validEggPile256(pile,255,w.tick,w.nextId)).toBe(false);
 expect(validEggPile256({...pile,item:'wood'},256,w.tick,w.nextId)).toBe(false);
});
test('local creation/transfer never coalesces allowed and forbidden stacks or loses egg condition',()=>{
 const {w}=scene(),state=egg(w.tick),item='turkey-egg-fertilized';
 addMaterial(w,'food',1,{type:'ground',x:8,z:8},item,{egg:state,eggForbidden:true});
 addMaterial(w,'food',1,{type:'ground',x:9,z:8},item,{egg:{...state,progress:.5}});
 const [forbidden,allowed]=w.piles;expect(transferPile(w,allowed!,{type:'ground',x:8,z:8})).toBe(false);expect(forbidden!.quantity).toBe(1);expect(allowed!.egg!.progress).toBe(.5);
 expect(()=>addMaterial(w,'food',1,{type:'ground',x:7,z:7},item)).toThrow();
});
test('egg jobs accept finished historical motion but reject future fields and malformed parentage',()=>{
 const {w,a}=scene();a.eggLayer!.progress=1;a.eggLay={target:{x:a.x,z:a.z},progress:1};a.motion={start:0,end:99,from:{x:a.x,z:a.z},to:{x:a.x,z:a.z}} as WildAnimal['motion'];
 expect(validAnimalEggState256(a,256,w)).toBe(true);expect(validAnimalEggState256(a,255,w)).toBe(false);
 expect(validEggPile256({item:'wood',egg:undefined} as MaterialPile,255,w.tick,w.nextId)).toBe(false);
 expect(validEggPile256({item:'turkey-egg-fertilized',egg:{...egg(w.tick),fatherId:1}} as MaterialPile,256,w.tick,w.nextId)).toBe(false);
});
