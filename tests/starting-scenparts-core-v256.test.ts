import {expect,test} from 'vitest';
import {startingPawn} from '../src/sim/starting-pawns';
import {chooseStartingPetKind256,STARTING_PET_KINDS_256} from '../src/sim/starting-pet-selection-256';
import {drawStartingApparelColor256,validStartingApparelColor256,packStartingApparelTint256} from '../src/sim/starting-apparel-color-256';
import {divideStartingScatterCount256} from '../src/sim/starting-scatter-stacks-256';
import {planStartingPlaceDirect256,type StartingPlaceCell256} from '../src/sim/starting-place-near-256';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import {createMedicalRecord} from '../src/sim/injury-state';
import {addCryptosleepSickness256} from '../src/sim/cryptosleep-sickness-256';
import {prepareStartingHeldClinicalResume256} from '../src/sim/starting-held-clinical-256';
import {validCoreStartingArrivalShape256} from '../src/sim/starting-pod-save-256';
import {validStartingArrivalShape} from '../src/sim/starting-arrival-save';
import {CORE_STARTING_ARRIVAL_PROFILE_256} from '../src/sim/starting-pod-state-256';

test('native22 pet weights remain in their real order and no unsupported clinical choice is removed here',()=>{
 const selected=[1,2,3].map(id=>startingPawn(id,'Original '+id,0,0,0,65,712,0,256));for(const pawn of selected)pawn.skills.animals!.level=20;
 const weights:number[]=[],last=chooseStartingPetKind256(selected,{float:(_min,max)=>{weights.push(max);return max;}});
 expect(STARTING_PET_KINDS_256).toHaveLength(22);expect(weights).toHaveLength(21);expect(last.defId).toBe('Fox_Arctic');
 expect(STARTING_PET_KINDS_256.map(p=>p.defId)).toContain('Cobra');expect(STARTING_PET_KINDS_256.slice(0,5).map(p=>p.defId)).toEqual(['Cat','YorkshireTerrier','GuineaPig','LabradorRetriever','Husky']);
});

test('MakeThing color spends its actual option/range draws; Plasteel does not get a decorative counter',()=>{
 let choices=0,ranges=0;const random={value:()=>{choices++;return 1;},float:(_min:number,max:number)=>{ranges++;return Math.fround(max);}};
 expect(drawStartingApparelColor256('plasteel-flak-helmet',random)).toBeUndefined();expect([choices,ranges]).toEqual([0,0]);
 const pants=drawStartingApparelColor256('flak-pants',random)!;expect(pants).toEqual({r:Math.fround(.62),g:Math.fround(.62),b:Math.fround(.62)});expect([choices,ranges]).toEqual([1,0]);
 const vest=drawStartingApparelColor256('flak-vest',random)!;expect(vest).toEqual({r:.5,g:.5,b:.5});expect([choices,ranges]).toEqual([2,3]);
 expect(validStartingApparelColor256({birthColor:vest},'flak-vest',256)).toBe(true);expect(validStartingApparelColor256({birthColor:vest},'flak-vest',255)).toBe(false);expect(packStartingApparelTint256(vest)).toBe(1+16*1024+16*32+16);
});

const place:StartingPlaceCell256={canSpawn:true,sameRoom:true,passDoorsReachable:true,itemCount:0,maxItems:1,haulDestinationAccepts:true,saveCompressiblePresent:false,matchingStackSpace:0,fullFill:false,preventDropping:false,door:false,workTable:false,downedPawn:false,anyPawn:false,selectablePlant:false};
test('held Silver800 and Meal50 split only on real direct outputs, with the original ID on the final remainder',()=>{
 for(const [quantity,limit,parts] of [[800,500,2],[50,10,5]] as const){
  let left:number=quantity,nextId=100;const ids:number[]=[],amounts:number[]=[];
  while(left){const p=planStartingPlaceDirect256({id:7,category:'item',quantity:left,stackLimit:limit,downed:false,saveCompressible:false},place,[],nextId);for(const op of p.operations)if(op.kind==='spawn'){ids.push(op.id);amounts.push(op.quantity);}left=p.remaining;nextId=p.nextId;}
  expect(amounts.reduce((a,b)=>a+b,0)).toBe(quantity);expect(ids).toHaveLength(parts);expect(ids.at(-1)).toBe(7);expect(ids.slice(0,-1)).toEqual(Array.from({length:parts-1},(_,i)=>100+i));expect(nextId).toBe(100+parts-1);
 }
 let draws=0;const meals=divideStartingScatterCount256(7,10,true,{integer:()=>{draws++;return 1;},value:()=>{draws++;return 0;}});expect(meals).toEqual([1,1,1,1,1,1,1]);expect(draws).toBe(0);
});

test('a genuinely added initial sickness stays frozen in its held original, without a free elapsed cure or a new draw',()=>{
 const record=createMedicalRecord(0),random=new WorldGenerationRandom(771);addCryptosleepSickness256(record,random,256);const before=structuredClone(record),counter=random.state;
 const resumed=prepareStartingHeldClinicalResume256(record,47)!;expect(record).toEqual(before);expect(resumed.tick).toBe(47);expect(resumed.cryptosleepSickness).toEqual(before.cryptosleepSickness);expect(random.state).toEqual(counter);
 expect(resumed.injuries).toEqual(before.injuries);expect(resumed.missing).toEqual(before.missing);expect(resumed.bloodLoss).toBe(before.bloodLoss);
});

test('future arrival headers reject getters before owner reads and255 never accepts the new profile',()=>{
 const world={tick:32,width:250,height:250},receipt={profile:CORE_STARTING_ARRIVAL_PROFILE_256,phase:'opened',start:0,landAt:20,openAt:32,openedAt:32,cells:[{x:1,z:1},{x:1,z:1},{x:3,z:3}]};
 expect(validCoreStartingArrivalShape256(receipt,256,world)).toBe(true);expect(validStartingArrivalShape(receipt,255,world)).toBe(false);
 let reads=0;const forged={...receipt};Object.defineProperty(forged,'cells',{get(){reads++;return [];},enumerable:true});expect(validCoreStartingArrivalShape256(forged,256,world)).toBe(false);expect(reads).toBe(0);
});
