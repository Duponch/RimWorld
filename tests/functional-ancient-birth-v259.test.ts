import {expect,test} from 'vitest';
import {prepareFunctionalAncientHuman256} from '../src/sim/functional-ancient-population-256';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import type {WorldFactionRegistry256} from '../src/sim/world-faction-state';
const factions:WorldFactionRegistry256={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:1,nextFactionId:4,nextSettlementId:1,factions:[
 {id:1,def:'PlayerColony',hidden:false,name:'Prepared player',randomKey:1,colorFromSpectrum:0,leaderOwnerId:null},
 {id:2,def:'Ancients',hidden:true,name:'Prepared actual Ancients',randomKey:2,colorFromSpectrum:.5,leaderOwnerId:null},
 {id:3,def:'AncientsHostile',hidden:true,name:'Prepared actual AncientsHostile',randomKey:3,colorFromSpectrum:.5,leaderOwnerId:null},
],relations:[],settlements:[],leaders:[]};
test('new authored ancient binds only the explicit matching actual birth instance, without changing its stream or payload',()=>{
 const input={id:10,nextId:11,cell:{x:5,z:5},tick:100,contents:'ancient-friendly' as const},old=prepareFunctionalAncientHuman256({...input,random:new WorldGenerationRandom(77)}),born=prepareFunctionalAncientHuman256({...input,random:new WorldGenerationRandom(77),birth259:{factions,factionId:2}});
 expect(old.pawn.worldAffiliation259).toBeUndefined();expect(born.pawn.worldAffiliation259).toEqual({revision:1,factionId:2,hostFactionId:null,guestStatus:'Guest'});
 const compared=structuredClone(born);delete compared.pawn.worldAffiliation259;expect(compared).toEqual(old);
 expect(()=>prepareFunctionalAncientHuman256({...input,random:new WorldGenerationRandom(77),birth259:{factions,factionId:3}})).toThrow(/instance/);
 expect(()=>prepareFunctionalAncientHuman256({...input,random:new WorldGenerationRandom(77),birth259:{factions,factionId:999}})).toThrow(/instance/);
});
