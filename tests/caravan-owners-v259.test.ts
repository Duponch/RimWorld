import {expect,test} from 'vitest';
import {generateWorld} from '../src/sim/generation.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {bindBornHumanFaction259,commitCapturedGuest259,clearActualGuest259,currentPrisoner259,validWorldAffiliationFields259,validWorldAffiliationForeignKeys259,commitJoinedPlayer259} from '../src/sim/world-affiliation-259.ts';
import {createPrisonerState} from '../src/sim/prisoner-state.ts';
import {validPrisonerStateRecord259} from '../src/sim/prisoner-save.ts';
import {validGroupAdmission257} from '../src/sim/group-human-admission-257.ts';
import {validGroupMemberOrigin} from '../src/sim/group-reorganization-save.ts';
import {prepareWorldPawnEntryEffects256} from '../src/sim/world-pawn-transition-256.ts';
import {validWorldPawnsEnvelope256} from '../src/sim/world-pawn-save-256.ts';
import {suspendWorldPawnGoods259} from '../src/sim/world-pawn-held-259.ts';
import {prepareWorldPawnLife256,worldPawnActiveBoundary256} from '../src/sim/world-pawn-life-256.ts';
import {cleanMapRemovedHumanRecord259} from '../src/sim/world-lost-owners.ts';
import {clearReleasedPawnAssignments259} from '../src/sim/work-release.ts';
import {WORLD_FACTION_TECH_LEVEL_259} from '../src/sim/world-faction-catalog.ts';
import type {WorldFactionRegistry256} from '../src/sim/world-faction-state.ts';
import type {WorldPawnOwner256,WorldPawnsState256} from '../src/sim/world-pawn-state-256.ts';
/** Declared small record fixture. No played capture, geographic entry,
 * complete campaign RAW, native GPU or natural NPC parity is asserted here. */
function fixture(){
 const w=generateWorld(159,32,32);w.tick=0;
 const factions:WorldFactionRegistry256={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:1,nextFactionId:3,nextSettlementId:1,factions:[{id:1,def:'PlayerColony',hidden:false,name:'Prepared player instance',randomKey:1,colorFromSpectrum:0,leaderOwnerId:null,lifecycle259:{revision:1,defeated:false,temporary:false}},{id:2,def:'Pirate',hidden:false,name:'Prepared foreign instance',randomKey:2,colorFromSpectrum:.5,leaderOwnerId:null,lifecycle259:{revision:1,defeated:false,temporary:false}}],relations:[],settlements:[],leaders:[]};
 w.worldFactions=factions;const p=startingPawn(17,'Prepared original',4,5,0,55,w.seed,0,259);p.faction='outlaws';expect(bindBornHumanFaction259(w,p,2)).toBe(true);return {w,p,factions};
}
function row():{w:ReturnType<typeof fixture>['w'];p:ReturnType<typeof fixture>['p'];r:WorldPawnOwner256;s:WorldPawnsState256;factions:WorldFactionRegistry256}{
 const {w,p,factions}=fixture();const r:WorldPawnOwner256={kind:'human',actor:p,factionId:2,originMapId:0,context:{seed:w.seed,width:32,height:32},clockCore:0,enteredAtAbsCore:3600000,mode:'active',items:[],packed:[]};return {w,p,factions,r,s:{revision:1,atCore:0,lastSuccessfulCore:0,currentRate:1,owners:[r]}};
}
test('new259 header is strict old258 data refusal, including dormant history and own undefined',()=>{
 const {w,p}=fixture();expect(validWorldAffiliationFields259(p as unknown as Record<string,unknown>,259)).toBe(true);expect(validWorldAffiliationFields259(p as unknown as Record<string,unknown>,258)).toBe(false);
 const missing={...p,worldAffiliation259:undefined};expect(validWorldAffiliationFields259(missing as unknown as Record<string,unknown>,259)).toBe(false);
 Object.defineProperty(p,'prisonerHistory259',{value:undefined,enumerable:true,configurable:true});expect(validWorldAffiliationFields259(p as unknown as Record<string,unknown>,259)).toBe(false);expect(w.rng).toBeDefined();
});
test('header accessors and inherited dormant dossiers refuse without reading them',()=>{
 const {p}=fixture();let reads=0;const a=Object.defineProperty({...p},'worldAffiliation259',{enumerable:true,get(){reads++;throw Error('not data');}});expect(validWorldAffiliationFields259(a,259)).toBe(false);expect(reads).toBe(0);
 const inherited=Object.assign(Object.create({prisonerHistory259:{}}),p);expect(validWorldAffiliationFields259(inherited,259)).toBe(false);
});
test('true faction and host FK cannot be replaced by a display profile',()=>{
 const {p,factions}=fixture();expect(validWorldAffiliationForeignKeys259(p,factions)).toBe(true);p.worldAffiliation259!.hostFactionId=99;expect(validWorldAffiliationForeignKeys259(p,factions)).toBe(false);p.worldAffiliation259!.hostFactionId=null;p.worldAffiliation259!.factionId=1;expect(validWorldAffiliationForeignKeys259(p,factions)).toBe(false);
});
test('actual capture/guest-null moves the SAME dossier and retains its RNG/resistance/capture receipt',()=>{
 const {w,p}=fixture();p.prisoner=createPrisonerState(w,p);commitCapturedGuest259(w,p);const record=p.prisoner,before=JSON.stringify(record),rng=w.rng;expect(currentPrisoner259(p)).toBe(true);
 clearActualGuest259(p);expect(p.prisoner).toBeUndefined();expect(p.prisonerHistory259).toBe(record);expect(JSON.stringify(record)).toBe(before);expect(currentPrisoner259(p)).toBe(false);expect(p.worldAffiliation259).toMatchObject({factionId:2,hostFactionId:null,guestStatus:'Guest'});expect(w.rng).toBe(rng);expect(validPrisonerStateRecord259(record,259,w,true)).toBe(true);
});
test('real recruitment preserves history and grants only actual player faction, no new dossier draw',()=>{
 const {w,p}=fixture();p.prisoner=createPrisonerState(w,p);commitCapturedGuest259(w,p);const record=p.prisoner,rng=w.rng;commitJoinedPlayer259(w,p);p.faction='colony';expect(p.prisonerHistory259).toBe(record);expect(p.prisoner).toBeUndefined();expect(p.worldAffiliation259).toMatchObject({factionId:1,hostFactionId:null,guestStatus:'Guest'});expect(validWorldAffiliationForeignKeys259(p,w.worldFactions)).toBe(true);expect(w.rng).toBe(rng);
});
test('old admission1 and old origin remain literal; only259 accepts revision2 and true receipt shape',()=>{
 expect(validGroupAdmission257({revision:1},258)).toBe(true);expect(validGroupAdmission257({revision:2},258)).toBe(false);expect(validGroupAdmission257({revision:2},259)).toBe(true);expect(validGroupAdmission257({revision:2},260)).toBe(false);
 const o={pawnId:17,originMapId:0,context:{seed:1,width:32,height:32},enteredAtAbsCore:3600000};expect(validGroupMemberOrigin(o,17,100,()=>true,258)).toBe(false);expect(validGroupMemberOrigin(o,17,100,()=>true,259)).toBe(true);expect(validGroupMemberOrigin({...o,enteredAtAbsCore:undefined},17,100,()=>true,259)).toBe(false);
});
test('per-original CaravanMember entry prepares no fake registry owner, treatment or faction draw',()=>{
 const f=row();f.p.prisoner=createPrisonerState(f.w,f.p);commitCapturedGuest259(f.w,f.p);const before=JSON.stringify(f.r),record=f.p.prisoner;let draws=0;
 const plan=prepareWorldPawnEntryEffects256(f.r,0,f.factions,{float(){draws++;throw Error('not a Free entry');}},{version:259,situation:'CaravanMember'});expect(plan.ok).toBe(true);expect(draws).toBe(0);expect(JSON.stringify(f.r)).toBe(before);expect(f.p.prisoner).toBe(record);expect(f.s.owners).toEqual([f.r]);
});
test('retained goods suspend only at true holder frontier; receipt dates, quantities and originals stay exact',()=>{
 const f=row(),pile={id:18,kind:'food' as const,item:'berries' as const,quantity:2,owner:{type:'inventory' as const,pawnId:17},rot:{progress:3,atTick:0}},r=f.r;r.items.push(pile);expect(worldPawnActiveBoundary256(r,258)).toContain('retained-holder adapter');suspendWorldPawnGoods259(r,0);expect(r.items[0]).toBe(pile);expect(pile.rot).toEqual({progress:3,atTick:0,rate:0});expect(r.heldAtCore259).toBe(0);expect(worldPawnActiveBoundary256(r,259)).toBeNull();expect(validWorldPawnsEnvelope256({worldPawns:f.s},258,0,100)).toBe(false);expect(validWorldPawnsEnvelope256({worldPawns:f.s},259,0,100)).toBe(true);
});
test('ordinary WP continuation never reruns entry or ticks suspended inventory/dormant dossier',()=>{
 const f=row();f.p.prisoner=createPrisonerState(f.w,f.p);commitCapturedGuest259(f.w,f.p);clearActualGuest259(f.p);const record=f.p.prisonerHistory259;
 const pile={id:18,kind:'food' as const,item:'berries' as const,quantity:2,owner:{type:'inventory' as const,pawnId:17},rot:{progress:3,atTick:0}};f.r.items=[pile];suspendWorldPawnGoods259(f.r,0);const frozen=JSON.stringify(f.r.items),rng={rng:7},plan=prepareWorldPawnLife256(f.s,10,rng,259);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);plan.commit();expect(f.r.actor).toBe(f.p);expect(f.r.items[0]).toBe(pile);expect(JSON.stringify(f.r.items)).toBe(frozen);expect(f.p.prisonerHistory259).toBe(record);expect(f.r.enteredAtAbsCore).toBe(3600000);expect(f.r.clockCore).toBe(10);
});
test('own-record MapRemoved cleanup preserves original health and dormant dossier without replaying capture',()=>{
 const {w,p}=fixture();p.prisoner=createPrisonerState(w,p);commitCapturedGuest259(w,p);const dossier=p.prisoner,health=p.health,rng=w.rng;clearReleasedPawnAssignments259(p);cleanMapRemovedHumanRecord259(p,w.tick);expect(p.health).toBe(health);expect(p.prisoner).toBeUndefined();expect(p.prisonerHistory259).toBe(dossier);expect(p.worldAffiliation259).toMatchObject({guestStatus:'Guest',hostFactionId:null});expect(p.path).toEqual([]);expect(w.rng).toBe(rng);
});
test('fixed tech levels follow closed Def XML inheritance, not faction instance names',()=>{expect(WORLD_FACTION_TECH_LEVEL_259).toMatchObject({PlayerColony:4,PlayerTribe:2,Pirate:5,OutlanderCivil:4,Mechanoid:6,Insect:1});});
