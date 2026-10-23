import {expect,test} from 'vitest';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {writeTestFileSync} from './test-output.ts';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {registryCamp,preparedMap,command} from './helpers/world-maps-v255.ts';
import {constructFreshInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {captureStandability} from '../src/sim/furniture-travel.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {animalThermalFields466} from '../src/sim/animal-thermal-v466.ts';
import {advanceAnimalHealth,reconcileAnimalHealth} from '../src/sim/wildlife-health.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {HEAT_UNIT} from '../src/sim/heat-severity.ts';
import {reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {advanceCorpses} from '../src/sim/corpses.ts';
import {validCorpseShape} from '../src/sim/corpse-save.ts';
import {validCryptosleepSicknessTransport256} from '../src/sim/cryptosleep-sickness-save-256.ts';
import {addCryptosleepSickness256} from '../src/sim/cryptosleep-sickness-256.ts';
import {validToxicBuildupTransport256} from '../src/sim/toxic-buildup-save-256.ts';
import {validCaravanAnimalRecord256} from '../src/sim/group-animal-record-save-256.ts';
import {newShipCasketHolder277,type ShipCasket277} from '../src/sim/ship-casket-state-277.ts';
import {validateRetainedShipCasketOwner277} from '../src/sim/ship-casket-owner-save-277.ts';
import {validateWorldPawnOwners256} from '../src/sim/world-pawn-save-256.ts';
import type {WorldPawnsState256} from '../src/sim/world-pawn-state-256.ts';
import {ANESTHETIC_UNIT,ANESTHETIC_DELAY_MAX_CORE} from '../src/sim/anesthetic.ts';
import {medicalCivilTick271} from '../src/sim/suspended-human-clock-271.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {validFilthFeet} from '../src/sim/filth-save.ts';
import {validAnimalClinicalOwner256} from '../src/sim/animal-clinical-age-v256.ts';
import {beginDuckFlyExit256,commitDuckFlyExits256,holdNewDuckArrival256} from '../src/sim/duck-flyer-runtime-256.ts';
import {validateDuckFlyers256} from '../src/sim/duck-flyer-save-256.ts';
import {detachMapOwners} from '../src/sim/world-lost-owners.ts';
import {validLostArchiveShape} from '../src/sim/world-lost-save.ts';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {serializeCampaign,deserializeCampaign,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import type {World} from '../src/sim/types.ts';

/** These are declared owner/admission preparations, not acquired illnesses,
 * generated random encounters, played taming, or claims of Core parity. */
class LowerEndpoints466 extends WorldGenerationRandom {
 constructor(){super(0);}
 override value(){return .999999;}
 override float(min:number,_max:number){return Math.fround(min);}
 override integer(min:number,_max:number){return min;}
}
function fresh(w:World,def:'Duck'|'LabradorRetriever'|'Megascarab'){
 const stand=captureStandability(w);let cell:{x:number;z:number}|undefined;
 for(let z=1;z<w.height-1&&!cell;z++)for(let x=1;x<w.width-1;x++)if(stand({x,z})&&!w.pawns.some(p=>p.x===x&&p.z===z)&&!w.wildlife?.animals.some(a=>a.x===x&&a.z===z)){cell={x,z};break;}
 if(!cell)throw Error('Declared owner fixture lacks a real free cell');
 const made=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256[def],id:w.nextId,cell,tick:w.tick,random:new LowerEndpoints466()});
 if(made.status!=='ready')throw Error('Declared owner constructor refused without retry: '+made.reason);
 const a=made.animal;w.nextId++;if(!w.wildlife)enableWildlife(w,0);w.wildlife!.animals.push(a);return a;
}
function conditions(w:World,a:WildAnimal){a.health??=createAnimalMedicalRecord256(w,a);a.health.heatstroke=10_000_000;a.health.hypothermia=10_000_000;return a.health;}
function exact(w:World){
 expect(validateWorld(w)).toEqual([]);const raw=serializeCampaign(w),copy=deserializeCampaign(raw);expect(serializeCampaign(copy)).toBe(raw);
 expect(validateWorld(copy)).toEqual([]);const expected=structuredClone(w.worldMaps?registeredMapPresentation(w)!:w),packet=structuredClone(new SnapshotEncoder().encode(w,0,0));
 const strict=new SnapshotDecoder().adopt(structuredClone(packet)),resident=new ResidentPresentationAssembler().adopt(structuredClone(packet));
 expect(strict.status,strict.status==='resync'?strict.reason:'strict').toBe('applied');expect(resident.status,resident.status==='resync'?resident.reason:'resident').toBe('applied');
 if(strict.status!=='applied'||resident.status!=='applied')throw Error('Actual thermal-owner checkpoint refused');
 expect(strict.world).toEqual(expected);expect(resident.world).toEqual(expected);return {raw,copy};
}

test('the current local dossier crosses whole RAW, Snapshot and Resident without changing a thermal value or owner',()=>{
 const {world:w,animal:a}=animalHaulingCamp459();const h=conditions(w,a),before=structuredClone(w),rng=w.rng;
 const {raw}=exact(w);expect(w).toEqual(before);expect(a.health).toBe(h);expect(w.rng).toBe(rng);
 const future=JSON.parse(raw);future.schemaVersion=SCHEMA_VERSION+1;expect(()=>deserializeWorld(JSON.stringify(future))).toThrow();
});

test('thermal sickness and toxicity use the same real local medical record instead of failing their independent guards',()=>{
 const {world:w,animal:a}=animalHaulingCamp459(),h=conditions(w,a);
 addCryptosleepSickness256(h,{integer:()=>10000,integerValue:()=>17},w.schemaVersion);h.toxicBuildup={severity:Math.fround(.01),bornAt:h.tick};
 expect(validCryptosleepSicknessTransport256(a,287,w.tick,w)).toBe(true);expect(validToxicBuildupTransport256(a,287,w.tick,w)).toBe(true);
 for(const version of [286,SCHEMA_VERSION+1]){expect(validCryptosleepSicknessTransport256(a,version,w.tick,w)).toBe(false);expect(validToxicBuildupTransport256(a,version,w.tick,w)).toBe(false);}
 exact(w);expect(a.health).toBe(h);
});

test('current admission still rejects malformed anatomy and future condition dates after accepting the thermal fields',()=>{
 const {world:w,animal:a}=animalHaulingCamp459(),h=conditions(w,a);exact(w);
 h.injuries.push({id:h.nextInjuryId++,part:'absent-animal-organ' as never,kind:'bruise',severity:100,bornAt:h.tick});
 expect(validateWorld(w).length).toBeGreaterThan(0);h.injuries=[];
 h.toxicBuildup={severity:Math.fround(.01),bornAt:h.tick+1};expect(validToxicBuildupTransport256(a,287,w.tick,w)).toBe(false);
});

test('an unmarked historical hare cannot acquire thermal admission merely from its species string',()=>{
 // Actual public106 source, before native growth profiles existed. Strict
 // loading preserves that original186; no mark is removed from a new animal.
 const source=readFileSync('public/test-saves/v106/lievres.json','utf8');expect(createHash('sha256').update(source).digest('hex')).toBe('2159a4196438be65301524c2771d006d5578406c8862e1c7480e4a5687cd6390');
 const w=deserializeWorld(source),a=w.wildlife!.animals.find(a=>a.id===186)!;
 expect(a.species).toBe('hare');expect(a.growthTracker).toBeUndefined();conditions(w,a);
 expect(animalThermalFields466(a,287)).toEqual({heat:false,cold:false});expect(validateWorld(w).length).toBeGreaterThan(0);
 const context={context:w,tick:w.tick,nextId:w.nextId,version:287};expect(validCaravanAnimalRecord256(a,context)).toBe(false);
 // Historical group admission already allowed the two fields from277; it
 // retains that literal scope rather than being silently rewritten here.
 expect(validCaravanAnimalRecord256(a,{...context,version:286})).toBe(true);
});

test('an actual insect admits Heat only in local and shared group guards, keeping all older group flags literal',()=>{
 const w=deconstructionCamp(1,32),a=fresh(w,'Megascarab');a.health=createAnimalMedicalRecord256(w,a);a.health.heatstroke=10_000_000;
 expect(animalThermalFields466(a,287)).toEqual({heat:true,cold:false});expect(validateWorld(w)).toEqual([]);
 const context={context:w,tick:w.tick,nextId:w.nextId,version:287};expect(validCaravanAnimalRecord256(a,context)).toBe(true);
 a.health.hypothermia=10_000_000;expect(validateWorld(w).length).toBeGreaterThan(0);expect(validCaravanAnimalRecord256(a,context)).toBe(false);
 expect(validCaravanAnimalRecord256(a,{...context,version:286})).toBe(true);expect(validCaravanAnimalRecord256(a,{...context,version:SCHEMA_VERSION+1})).toBe(false);
});

test('the isolated retained-casket animal guard rejects a false insect Hypothermia without a whole-campaign transfer claim',()=>{
 const w=deconstructionCamp(1,32),a=fresh(w,'Megascarab');a.health=createAnimalMedicalRecord256(w,a);a.health.heatstroke=10_000_000;a.shipCryptosleepHeldAt277=w.tick;
 const c:ShipCasket277={id:w.nextId++,kind:'ship-cryptosleep-casket',x:14,z:10,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:{revision:1,heldAt:w.tick,occupant:{kind:'animal',animal:a},items:[],packed:[]}};
 expect(validateRetainedShipCasketOwner277(c,w,new Set())).toEqual([]);
 a.health.hypothermia=10_000_000;expect(validateRetainedShipCasketOwner277(c,w,new Set())).toContain('Invalid actual spatial-casket animal record/clock.');
});

test('WorldPawn clinical admission differentiates the false insect cold from the same isolated origin header',()=>{
 const w=registryCamp(),map=registeredMap(w,0)!,a=fresh(map,'Megascarab');a.health=createAnimalMedicalRecord256(map,a);a.health.heatstroke=10_000_000;flushRegisteredMap(map);
 // Explicit isolated row preparation. This is a validator differential, not
 // a played MapRemoved transfer or a whole WorldPawn campaign qualification.
 const state:WorldPawnsState256={revision:1,atCore:w.tick*10,lastSuccessfulCore:w.tick*10,currentRate:1,owners:[{kind:'animal',actor:a,factionId:null,originMapId:0,context:{seed:map.seed,width:map.width,height:map.height},clockCore:w.tick*10,enteredAtAbsCore:w.tick*10,mode:'active',items:[],packed:[]}]};
 const before=validateWorldPawnOwners256(state,w,new Set());expect(before).not.toContain('Invalid actual world animal');
 a.health.hypothermia=10_000_000;const after=validateWorldPawnOwners256(state,w,new Set());expect(after).toContain('Invalid actual world animal');
 expect(after.filter(e=>e!=='Invalid actual world animal')).toEqual(before);
});

test('a real thermal death keeps the same medical record and same-ID body through full serialization',()=>{
 const {world:w,animal:a}=animalHaulingCamp459(),h=conditions(w,a);h.heatstroke=HEAT_UNIT;reconcileMedicalDeath(h);reconcileAnimalHealth(w,a);
 expect(a.state).toBe('dead');exact(w);advanceCorpses(w);const body=w.piles.find(p=>p.id===a.id)!;
 expect(body.corpse!.health).toBe(h);expect(validCorpseShape(body as unknown as Record<string,unknown>,287)).toBe(true);
 for(const version of [286,SCHEMA_VERSION+1])expect(validCorpseShape(body as unknown as Record<string,unknown>,version)).toBe(false);
 exact(w);
});

test('real classic retirement retains the same thermal patient, dossier and finite carried property in its archive',()=>{
 const w=registryCamp(),map=registeredMap(w,0)!,a=fresh(map,'LabradorRetriever'),h=conditions(map,a),id=map.nextId;
 addMaterial(map,'wood',1,{type:'inventory',pawnId:a.id},'wood');const item=map.piles.find(p=>p.id===id)!;
 preparedMap(w);command(w,{type:'map-abandon',mapId:0,confirm:true});
 const archive=w.worldGroups!.abandonedContents.find(row=>row.mapId===0)!,row=archive.animals.find(row=>row.animal.id===a.id)!;
 expect(row.animal).toBe(a);expect(a.health).toBe(h);expect(row.items![0]).toBe(item);expect([h.heatstroke,h.hypothermia]).toEqual([10_000_000,10_000_000]);
 expect(validLostArchiveShape(archive,w.tick,w.nextId,287,w)).toBe(true);for(const version of [286,SCHEMA_VERSION+1])expect(validLostArchiveShape(archive,w.tick,w.nextId,version,w)).toBe(false);
 exact(w);
});

function leavingDuck(){
 const w=registryCamp(),map=registeredMap(w,0)!,a=fresh(map,'Duck'),h=conditions(map,a);
 expect(beginDuckFlyExit256(map,a,map.tick*10,'exit')).toBe(true);
 if(a.exitFlight!.readyAtCore>map.tick*10)stepWorld(w);else commitDuckFlyExits256(map);
 flushRegisteredMap(map);const holder=map.wildlife!.flyers!.find(f=>f.animal===a)!;expect(holder.kind).toBe('leaving');
 return {w,map,a,h,holder};
}

test('an actual leaving Duck holds its thermal original frozen through RAW, Snapshot and Resident',()=>{
 const {w,map,a,h,holder}=leavingDuck();expect(map.wildlife!.animals).not.toContain(a);expect(holder.animal.health).toBe(h);
 expect(validateDuckFlyers256(map,287)).toEqual([]);for(const version of [286,SCHEMA_VERSION+1])expect(validateDuckFlyers256(map,version).length).toBeGreaterThan(0);
 const frozen=structuredClone(a),personal=holder.personalTick,{raw}=exact(w);stepWorld(w);expect(a).toEqual(frozen);expect(holder.personalTick).toBe(personal);exact(w);
 const copy=deserializeCampaign(raw);if(!('pawns'in copy))throw Error('The declared loaded world must remain local');stepWorld(copy);expect(serializeCampaign(copy)).toBe(serializeCampaign(w));
});

test('a leaving Duck with a real current thermal/toxic record passes its independent toxic guard and remains an inadmissible incoming patient',()=>{
 const {w,map,a,h,holder}=leavingDuck();h.toxicBuildup={severity:Math.fround(.01),bornAt:h.tick};
 expect(validateDuckFlyers256(map,287)).toEqual([]);exact(w);
 const incoming=structuredClone(w),local=registeredMap(incoming,0)!,f=local.wildlife!.flyers![0]!;
 const falseArrival={...f,kind:'arrival' as const,totalCore:600,remainingCore:600-(incoming.tick*10-f.startedAtCore),roofHit:false};delete (falseArrival as {flipped?:boolean}).flipped;
 local.wildlife!.flyers=[falseArrival];expect(validateDuckFlyers256(local,287).length).toBeGreaterThan(0);
 expect(holder.animal).toBe(a);expect(holder.animal.health).toBe(h);
});

test('the exact incoming Duck producer still refuses an existing thermal dossier before changing IDs, RNG or ownership',()=>{
 const w=deconstructionCamp(1,32),a=fresh(w,'Duck');conditions(w,a);const before=structuredClone(w);
 expect(holdNewDuckArrival256(w,a)).toBe(false);expect(w).toEqual(before);expect(w.wildlife!.animals).toContain(a);
});

test('removing an actual thermal Duck holder preserves its personal frontier rather than adopting the later map-removal time',()=>{
 const {w,map,a,h,holder}=leavingDuck(),personal=holder.personalTick;stepWorld(w);expect(w.tick).toBeGreaterThan(personal);
 const archive=detachMapOwners(map,0,w.planet!.homeTile),row=archive.animals.find(row=>row.animal===a)!;
 expect(row.clock).toBe(personal);expect(a.health).toBe(h);expect(medicalCivilTick271(h)).toBe(personal);expect(archive.removedAt).toBe(w.tick);
 expect(validLostArchiveShape(archive,w.tick,w.nextId,287,w)).toBe(true);
 const bad=structuredClone(archive);bad.animals.find(row=>row.animal.id===a.id)!.clock=archive.removedAt;expect(validLostArchiveShape(bad,w.tick,w.nextId,287,w)).toBe(false);
});

test('the same thermal animal resumes from its real casket and enters a classic archive with its true civil/active offset',()=>{
 // All map/people placement is declared BEFORE play. Ada/Noé stay home;
 // the already idle Mina is placed on the second map by the existing helper.
 // No person, movement edge or timer is moved/reset after carrying starts.
 const w=registryCamp(),home=registeredMap(w,0)!,handler=home.pawns[0]!;preparedMap(w);
 expect(home.pawns).toContain(handler);const a=fresh(home,'LabradorRetriever');a.domestic={since:home.tick,care:'herbal',tameness:5,nextDecay:home.tick+6000};conditions(home,a);
 a.health!.anesthetic={bornAt:w.tick,expiresAtCore:w.tick*10+ANESTHETIC_DELAY_MAX_CORE,severity:ANESTHETIC_UNIT,remainder:0};reconcileAnimalHealth(home,a);
 const c:ShipCasket277={id:w.nextId++,kind:'ship-cryptosleep-casket',x:14,z:10,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:newShipCasketHolder277(w.tick)};home.structures.push(c);flushRegisteredMap(home);
 expect(applyCommand(w,{type:'order-carry-ship-casket',pawnId:handler.id,patient:{kind:'animal',id:a.id},casketId:c.id}).ok).toBe(true);
 for(let i=0;i<1500&&c.shipCryptosleep277.occupant?.kind!=='animal';i++)stepWorld(w);expect(c.shipCryptosleep277.occupant).toEqual({kind:'animal',animal:a});
 const h=a.health!,active=h.tick;stepWorld(w,40);expect(applyCommand(w,{type:'eject-ship-casket',casketId:c.id}).ok).toBe(true);
 expect(a.health).toBe(h);expect(h.tick).toBe(active);expect(medicalCivilTick271(h)).toBe(w.tick);expect(h.tick).toBeLessThan(w.tick);exact(w);
 command(w,{type:'map-abandon',mapId:0,confirm:true});const archive=w.worldGroups!.abandonedContents.find(row=>row.mapId===0)!,row=archive.animals.find(row=>row.animal===a)!;
 expect(row.animal.health).toBe(h);expect(h.tick).toBe(active);expect(medicalCivilTick271(h)).toBe(archive.removedAt);
 const withoutOnlyFilth=structuredClone(archive);delete withoutOnlyFilth.animals.find(r=>r.animal.id===a.id)!.animal.filthFeet;
 const withoutOnlyThermal=structuredClone(archive),copyHealth=withoutOnlyThermal.animals.find(r=>r.animal.id===a.id)!.animal.health!;delete copyHealth.heatstroke;delete copyHealth.hypothermia;
 const admitted=validLostArchiveShape(archive,w.tick,w.nextId,287,w);
 writeTestFileSync('artifacts/animal-thermal-v466/after-real-casket-archive-diagnostic.json',JSON.stringify({version:w.schemaVersion,animalId:a.id,worldTick:w.tick,removedAt:archive.removedAt,rowClock:row.clock??null,clinical:h.tick,civil:medicalCivilTick271(h),animalKeys:Object.keys(a),healthKeys:Object.keys(h),filth:a.filthFeet??null,
  independent:{medical:validateMedicalRecord(h,true,true,true,true,true,true,true,true,true,true,true,287),clinicalOwner:validAnimalClinicalOwner256(h,a.species,a.ageTicks,archive.removedAt),filth:validFilthFeet(a.filthFeet,287)},
  archiveGuards:{original:admitted,withoutOnlyFilth:validLostArchiveShape(withoutOnlyFilth,w.tick,w.nextId,287,w),withoutOnlyThermal:validLostArchiveShape(withoutOnlyThermal,w.tick,w.nextId,287,w)},archive},null,2)+'\n');
 writeTestFileSync('artifacts/animal-thermal-v466/after-real-casket-archive-world.json',JSON.stringify(w)+'\n');
 expect(admitted).toBe(true);exact(w);
 expect(a.filthFeet).toEqual({carried:[{kind:'slime',thickness:1}]});
 const badFilth=structuredClone(archive);badFilth.animals.find(r=>r.animal.id===a.id)!.animal.filthFeet!.carried[0]!.thickness=6;
 expect(validLostArchiveShape(badFilth,w.tick,w.nextId,287,w)).toBe(false);
 const withoutThermalOrOffset=structuredClone(archive),literal=withoutThermalOrOffset.animals.find(r=>r.animal.id===a.id)!.animal;
 delete literal.health;literal.state='idle';
 // Removing clinical state on this independent negative candidate isolates
 // the newly admitted physical filth field from the thermal/civil guards.
 expect(validLostArchiveShape(withoutThermalOrOffset,w.tick,w.nextId,287,w)).toBe(true);
 for(const version of [286,SCHEMA_VERSION+1])expect(validLostArchiveShape(withoutThermalOrOffset,w.tick,w.nextId,version,w)).toBe(false);
},30_000);
