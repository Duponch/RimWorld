import {nativeWorldPawnOrderCurrent256,commitNativeWorldPawnOrder256} from './world-pawn-native-order-256.ts';
import {removeNativeWorldPawnOrder256} from './native-world-pawn-order-256.ts';
import {isAnimalSpecies256} from './animal-core-v256.ts';
import {animalMechanicalReadiness256} from './animal-readiness-v256.ts';
import {constructFreshInitialWildAnimal256,type InitialAnimalConstruction256} from './initial-animal-constructor-256.ts';
import {selectWorldAnimalToRedress256,prepareWorldAnimalRedress256,type ActualWorldPawnSelectionWeight256,type PreparedWorldAnimalRedress256} from './world-pawn-redress-256.ts';
import {cancelWorldPawnGC256} from './world-pawn-gc-256.ts';
import type {ActualWorldPawnSituationReader256} from './world-pawn-capture-256.ts';
import type {WorldPawnsState256,WorldPawnOwner256} from './world-pawn-state-256.ts';
import type {InitialAnimalFact256} from './initial-animal-data-256.ts';
import type {InitialAnimalRandom256} from './initial-animal-age-256.ts';
import type {WildAnimal} from './wildlife-state.ts';
/** A single PRIVATE1200 phase. Only the small owner roster is projected. The
 * actual registry and originals remain untouched until all generated phases
 * and candidate guards succeeded. No map, old archive or geometry is cloned. */
export function prepareWorldAnimalGeneration256(state:WorldPawnsState256,input:{tick:number;nextId:number;situation:ActualWorldPawnSituationReader256;weight:ActualWorldPawnSelectionWeight256;random:InitialAnimalRandom256}) {
 if(!Object.getOwnPropertyDescriptor(state,'owners')?.writable)throw Error('Animal generation needs its mutable actual registry');
 if(state.atCore!==input.tick*10||!Number.isSafeInteger(input.nextId)||input.nextId<1)throw Error('Animal generation lacks actual WorldPawn frontier');
 const nativeBefore=state.nativeOrder;if(!nativeWorldPawnOrderCurrent256(state,nativeBefore))throw Error('Actual native generation order is not mutable/admitted');
 const before=state.owners.slice(),atBefore=state.atCore,working={...state,owners:state.owners.slice()},selected:WorldPawnOwner256[]=[],plans:Extract<PreparedWorldAnimalRedress256,{ok:true}>[]=[],animals:WildAnimal[]=[];
 let nextId=input.nextId,closed=false,blocked=false;
 return {
  generate(fact:InitialAnimalFact256,cell:{x:number;z:number}):{status:'ready';animal:WildAnimal;source:'fresh'|'world';initialGrowth?:{value:number;nextCheckCore:number}}|{status:'blocked';reason:string;construction?:InitialAnimalConstruction256}{
   if(closed||blocked)throw Error('Animal generation phase already closed or blocked');
   const fail=(reason:string,construction?:InitialAnimalConstruction256)=>{blocked=true;return {status:'blocked' as const,reason,...construction?{construction}:{}};};
   if(isAnimalSpecies256(fact.species)&&!animalMechanicalReadiness256(fact.species).ok)return fail('Real selected species has an unsupported mechanic');
   const choice=selectWorldAnimalToRedress256(working,fact,input.random,input.weight,input.situation);
   if(choice.status==='blocked')return fail(choice.reason);
   if(choice.status==='selected'){
    const plan=prepareWorldAnimalRedress256(working,choice.row,fact,{tick:input.tick,cell,random:input.random,situation:input.situation});if(!plan.ok)return fail(plan.reason);
    plans.push(plan);selected.push(choice.row);animals.push(plan.draft);working.owners=working.owners.filter(r=>r!==choice.row);if(working.nativeOrder)working.nativeOrder=removeNativeWorldPawnOrder256(working.nativeOrder,choice.row.actor.id);return {status:'ready',animal:plan.draft,source:'world'};
   }
   if(!Number.isSafeInteger(nextId+1))return fail('Fresh animal namespace exhausted');
   const made=constructFreshInitialWildAnimal256({fact,id:nextId,cell,tick:input.tick,random:input.random});if(made.status==='blocked')return fail(made.reason,made);
   nextId++;animals.push(made.animal);return {status:'ready',animal:made.animal,source:'fresh',initialGrowth:{value:made.growth,nextCheckCore:made.nextGrowthCheckCore}};
  },
  get nextId(){return nextId;},
  get selectedOriginals():readonly WildAnimal[]{return Object.freeze(plans.map(p=>p.original));},
  get candidateState():WorldPawnsState256{return {...working,owners:working.owners.slice()};},
  current():boolean{return !closed&&!blocked&&nativeWorldPawnOrderCurrent256(state,nativeBefore)&&(!selected.length||Object.getOwnPropertyDescriptor(state,'currentRate')?.writable===true)&&state.atCore===atBefore&&Object.getOwnPropertyDescriptor(state,'owners')?.writable===true&&state.owners.length===before.length&&state.owners.every((r,i)=>r===before[i])&&plans.every(p=>p.current());},
  get candidateAnimals():readonly WildAnimal[]{return Object.freeze(animals.slice());},
  /** Execute INSIDE the sole map/campaign adoption commit. Returned references
   * replace the corresponding draft animals in the private candidate map. */
  commit():WildAnimal[]{
   if(closed||blocked||!nativeWorldPawnOrderCurrent256(state,nativeBefore)||selected.length&&Object.getOwnPropertyDescriptor(state,'currentRate')?.writable!==true||Object.getOwnPropertyDescriptor(state,'owners')?.writable!==true||state.atCore!==atBefore||state.owners.length!==before.length||state.owners.some((r,i)=>r!==before[i])||plans.some(p=>!p.current()))throw Error('Stale/blocked WorldPawn generation phase');closed=true;
   if(selected.length)cancelWorldPawnGC256(state);
   const originals=new Map<WildAnimal,WildAnimal>();for(const plan of plans)originals.set(plan.draft,plan.adoptOriginal());
   const removed=new Set(selected);if(removed.size)state.owners=state.owners.filter(r=>!removed.has(r));commitNativeWorldPawnOrder256(state,nativeBefore,working.nativeOrder);return animals.map(a=>originals.get(a)??a);
  }
 };
}
