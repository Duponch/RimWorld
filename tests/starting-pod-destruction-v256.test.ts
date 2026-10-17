import {expect,test} from 'vitest';
import {validCoreStartingArrivalShape256} from '../src/sim/starting-pod-save-256';
import {CORE_STARTING_ARRIVAL_PROFILE_256} from '../src/sim/starting-pod-state-256';
import {validWorldPawnsEnvelope256} from '../src/sim/world-pawn-save-256';
import {bombThingKey} from '../src/sim/bomb-state';
import {validStartingPetHeader256} from '../src/sim/starting-pet-state-256';

test('three destroyed capsules finish at the real landed boundary without forged opening anchors;255 refuses',()=>{
 const w={tick:20,width:250,height:250},receipt={profile:CORE_STARTING_ARRIVAL_PROFILE_256,phase:'opened',start:0,landAt:20,openAt:32,openedAt:20,cells:[],destroyedPods:[{id:21,cell:{x:1,z:1},atTick:20,humanId:1,animalIds:[]},{id:22,cell:{x:2,z:1},atTick:20,humanId:2,animalIds:[4]},{id:23,cell:{x:3,z:1},atTick:20,humanId:3,animalIds:[]}]};
 expect(validCoreStartingArrivalShape256(receipt,256,w)).toBe(true);expect(validCoreStartingArrivalShape256(receipt,255,w)).toBe(false);
 const beforeLastLanding=structuredClone(receipt);beforeLastLanding.openedAt=12;for(const p of beforeLastLanding.destroyedPods)p.atTick=12;expect(validCoreStartingArrivalShape256(beforeLastLanding,256,w)).toBe(false);
 expect(validCoreStartingArrivalShape256({...receipt,cells:[{x:1,z:1}]},256,w)).toBe(false);
 expect(validCoreStartingArrivalShape256({...receipt,destroyedPods:undefined},256,w)).toBe(false);
 const duplicate=structuredClone(receipt);duplicate.destroyedPods[1]!.humanId=1;expect(validCoreStartingArrivalShape256(duplicate,256,w)).toBe(false);
 const future=structuredClone(receipt);future.destroyedPods[0]!.atTick=21;expect(validCoreStartingArrivalShape256(future,256,w)).toBe(false);
 let reads=0;const accessor={...receipt};Object.defineProperty(accessor,'destroyedPods',{enumerable:true,get(){reads++;return receipt.destroyedPods;}});expect(validCoreStartingArrivalShape256(accessor,256,w)).toBe(false);expect(reads).toBe(0);
});
test('Destroyed is a strict terminal owner field, never an alias for clinical death or an item carrier',()=>{
 const owner={factionId:1,originMapId:0,context:{},clockCore:0,enteredAtAbsCore:36012000,mode:'dead',items:[],packed:[],kind:'human',actor:{id:1},destroyed:true},header={worldPawns:{revision:1,atCore:200,lastSuccessfulCore:0,currentRate:1,owners:[owner]}};
 expect(validWorldPawnsEnvelope256(header,256,200,99)).toBe(true);expect(validWorldPawnsEnvelope256(header,255,200,99)).toBe(false);
 expect(validWorldPawnsEnvelope256({worldPawns:{...header.worldPawns,owners:[{...owner,destroyed:undefined}]}},256,200,99)).toBe(false);
 expect(validWorldPawnsEnvelope256({worldPawns:{...header.worldPawns,owners:[{...owner,mode:'active',clockCore:200}]}},256,200,99)).toBe(false);
 expect(validWorldPawnsEnvelope256({worldPawns:{...header.worldPawns,owners:[{...owner,items:[{}]}]}},256,200,99)).toBe(false);
 expect(bombThingKey('starting-pod:21',256)).toBe(true);expect(bombThingKey('starting-pod:21',255)).toBe(false);
});
test('Master removal preserves the same Bond/name/obedience, never manufactures one on an unbonded animal',()=>{
 const startingPet={revision:1,name:'Pistache',bondedPawnId:1,obedience:{steps:3,wanted:true}};
 expect(validStartingPetHeader256({startingPet},256)).toBe(true);expect(validStartingPetHeader256({startingPet},255)).toBe(false);
 expect(validStartingPetHeader256({startingPet:{...startingPet,masterId:2}},256)).toBe(false);expect(validStartingPetHeader256({startingPet:{revision:1,name:'Pistache'}},256)).toBe(true);
});
