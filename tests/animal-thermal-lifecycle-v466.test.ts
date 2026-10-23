import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {reconcileAnimalHealth} from '../src/sim/wildlife-health.ts';
import {newShipCasketHolder277,type ShipCasket277} from '../src/sim/ship-casket-state-277.ts';
import {ANESTHETIC_UNIT,ANESTHETIC_DELAY_MAX_CORE} from '../src/sim/anesthetic.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {medicalCivilTick271} from '../src/sim/suspended-human-clock-271.ts';
import {nextHeatSeverity} from '../src/sim/heat-severity.ts';
import {nextColdSeverity} from '../src/sim/cold-rules.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';

/** Finite boundary preparation: actual fresh Labrador, initial anesthetic and
 * two declared thermal conditions, installed empty casket. Carry/closing,
 * suspension and ejection are played; none of the initial medicine, heat,
 * cold or casket construction is claimed as acquired by those actions. */
test('the same real thermal patient is carried, suspended without doses, then resumes once on its civil cadence',()=>{
 const f=animalHaulingCamp459(),w=f.world,a=f.animal;
 const casket:ShipCasket277={id:w.nextId++,kind:'ship-cryptosleep-casket',x:14,z:10,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:newShipCasketHolder277(w.tick)};
 w.structures.push(casket);a.health=createAnimalMedicalRecord256(w,a);a.health.heatstroke=400_000_000;a.health.hypothermia=400_000_000;
 a.health.anesthetic={bornAt:w.tick,expiresAtCore:w.tick*10+ANESTHETIC_DELAY_MAX_CORE,severity:ANESTHETIC_UNIT,remainder:0};reconcileAnimalHealth(w,a);expect(a.state).toBe('downed');
 expect(applyCommand(w,{type:'order-carry-ship-casket',pawnId:f.handlerId,patient:{kind:'animal',id:a.id},casketId:casket.id}).ok).toBe(true);
 for(let i=0;i<1500&&casket.shipCryptosleep277.occupant?.kind!=='animal';i++)stepWorld(w);
 expect(casket.shipCryptosleep277.occupant).toEqual({kind:'animal',animal:a});expect(w.wildlife!.animals).not.toContain(a);
 expect(a.health.heatstroke).toBeGreaterThan(0);expect(a.health.hypothermia).toBeGreaterThan(0);
 const frozen=structuredClone(a),h=a.health,active=h.tick,heat=h.heatstroke!,cold=h.hypothermia!;
 expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
 stepWorld(w,40);expect(a).toEqual(frozen);
 expect(applyCommand(w,{type:'eject-ship-casket',casketId:casket.id}).ok).toBe(true);
 expect(w.wildlife!.animals.find(r=>r.id===a.id)).toBe(a);expect(a.health).toBe(h);expect(h.tick).toBe(active);expect(medicalCivilTick271(h)).toBe(w.tick);expect([h.heatstroke,h.hypothermia]).toEqual([heat,cold]);
 stepWorld(w,6);expect(a.health).toBe(h);expect(h.tick).toBe(active+6);expect(medicalCivilTick271(h)).toBe(w.tick);
 expect(h.heatstroke).toBe(nextHeatSeverity(heat,21,40));expect(h.hypothermia).toBe(nextColdSeverity(cold,21,-30));expect(validateWorld(w)).toEqual([]);
 const final=serializeWorld(w),copy=deserializeWorld(final);stepWorld(w,6);stepWorld(copy,6);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 const packet=new SnapshotEncoder().encode(w,0,0),strict=new SnapshotDecoder().adopt(structuredClone(packet)),resident=new ResidentPresentationAssembler().adopt(structuredClone(packet));
 expect(strict.status).toBe('applied');expect(resident.status).toBe('applied');if(strict.status!=='applied'||resident.status!=='applied')throw Error('Thermal patient publication rejected');expect(strict.world).toEqual(resident.world);
},30_000);
