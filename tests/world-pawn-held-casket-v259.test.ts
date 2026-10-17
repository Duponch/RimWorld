import {expect,test} from 'vitest';
import {startingPawn} from '../src/sim/starting-pawns';
import {createMedicalRecord,reconcileMedicalDeath} from '../src/sim/injury-state';
import {BLOOD_UNIT} from '../src/sim/injury-rules';
import {validateAncientCasketRecord256} from '../src/sim/ancient-casket-save-256';
import {ancientHeldHumanAge256} from '../src/sim/ancient-casket-state-256';
import {ancientCasketDestructionRefusal256} from '../src/sim/ancient-casket-release-256';
import {constructNativeWorldPawnOrder256,passNativeWorldPawnOrder256} from '../src/sim/native-world-pawn-order-256';
import {validPhysicalWorldPawnOrder256,orderedWorldPawnRows256} from '../src/sim/world-pawn-native-order-256';
import {heldCasketLivingIds259,heldCasketHumanSlots259,heldCasketGCUnknown259} from '../src/sim/world-pawn-casket-membership-259';
import {initialWorldPawns256} from '../src/sim/world-pawn-state-256';
import {validWorldPawnsEnvelope256} from '../src/sim/world-pawn-save-256';
import {stepWorldPawnGC256} from '../src/sim/world-pawn-gc-256';
import type {HeldWorldCasket259} from '../src/sim/world-pawn-casket-259';

/** Declared pure holder records, not acquired chronology or generated NPCs.
 * The terminal fixture uses the existing medical-death kernel and the same
 * original corpse ownership shape already emitted by the Slave producer. */
function prepared(){
 const live=startingPawn(10,'Préparé — vivant suspendu',5,5,0,55,123,100,259),dead=startingPawn(11,'Préparé — mort contenu',5,5,1,55,124,100,259);
 for(const p of [live,dead]){p.faction='outlanders';delete p.apparelPolicyId;delete p.apparelAutomation;delete p.nextApparelCheckAt;}
 dead.health=createMedicalRecord(100);dead.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(dead.health);expect(dead.health.death).toBeDefined();dead.state='dead';dead.body={observedAt:100,pileId:21};
 const entry:HeldWorldCasket259={originMapId:0,registeredAtCore:1500,enteredAtAbsCore:1500,context:{seed:42,width:20,height:20},casket:{id:20,kind:'ancient-cryptosleep-casket',x:5,z:5,orientation:1,footprint:'standard',factionId:null,casket:{revision:1,groupId:-1,contentsKnown:false,heldAt:100,humans:[live,dead],animals:[],items:[{id:21,kind:'corpse',item:'human-corpse',quantity:1,owner:{type:'ancient-casket',casketId:20},humanCorpse:{pawnId:11},rot:{progress:0,atTick:100,rate:0}},{id:22,kind:'gold',item:'gold',quantity:17,owner:{type:'ancient-casket',casketId:20}}]}}};
 const state=initialWorldPawns256();state.atCore=1500;state.lastSuccessfulCore=0;state.nativeOrder=constructNativeWorldPawnOrder256({atCore:0,atAbsCore:0,firstThingId:1});state.nativeOrder=passNativeWorldPawnOrder256(state.nativeOrder,live.id,false);state.heldCaskets259=[entry];return {state,entry,live,dead};
}
test('retained live/dead/corpse/direct objects have one original owner, only living membership and no active rows',()=>{
 const {state,entry,live,dead}=prepared(),context={schemaVersion:259 as const,tick:150,nextId:100,width:20,height:20};
 expect(validateAncientCasketRecord256(entry.casket,context)).toEqual([]);expect(heldCasketLivingIds259(state)).toEqual([10]);expect(heldCasketHumanSlots259(state).map(s=>s.pawn)).toEqual([live,dead]);
 expect(orderedWorldPawnRows256(state)).toEqual([]);expect(validPhysicalWorldPawnOrder256(state,100)).toBe(true);
 const before=JSON.stringify(entry.casket),biological=live.age!.biologicalTicks;
 expect(ancientHeldHumanAge256(entry.casket.casket,live,1000)).toEqual({...live.age!,chronologicalTicks:live.age!.chronologicalTicks+900});expect(live.age!.biologicalTicks).toBe(biological);expect(JSON.stringify(entry.casket)).toBe(before);
 expect(ancientCasketDestructionRefusal256(entry.casket,'deconstruct')).toBeTruthy();
 state.nativeOrder=passNativeWorldPawnOrder256(state.nativeOrder!,dead.id,true);expect(validPhysicalWorldPawnOrder256(state,100)).toBe(false);
});
test('old schema rejects future holder presence, malformed descriptor is never read, clinical/dead/corpse links remain strict',()=>{
 const {state,entry}=prepared();expect(validWorldPawnsEnvelope256({worldPawns:state},258,1500,100)).toBe(false);expect(validWorldPawnsEnvelope256({worldPawns:state},259,1500,100)).toBe(true);
 let reads=0;const bad=Object.defineProperty({...state},'heldCaskets259',{get(){reads++;throw Error('not data');},enumerable:true});expect(validWorldPawnsEnvelope256({worldPawns:bad},259,1500,100)).toBe(false);expect(reads).toBe(0);
 const broken=structuredClone(entry.casket);broken.casket.items[0]!.humanCorpse!.pawnId=10;expect(validateAncientCasketRecord256(broken,{schemaVersion:259,tick:150,nextId:100,width:20,height:20}).length).toBeGreaterThan(0);
});
test('existing GC Unknown retains the suspended membership without KeepForever, active clinical ticks or RNG draws',()=>{
 const {state,entry}=prepared(),before=JSON.stringify(entry.casket),ids=heldCasketGCUnknown259(state);expect(ids).toHaveLength(1);expect(ids[0]![1].keep).toEqual([]);expect(ids[0]![1].unknown).toContain('literal-historical-faction-instance-absent');
 state.lastSuccessfulCore=0;stepWorldPawnGC256(state,15000,{facts(){throw Error('No active row is represented by this holder');},planDiscard(rows){expect(rows).toEqual([]);return {commit(){}};}},10);
 expect(state.heldCaskets259![0]).toBe(entry);expect(JSON.stringify(entry.casket)).toBe(before);expect(heldCasketLivingIds259(state)).toEqual([10]);
});
