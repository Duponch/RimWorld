import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {validCorpseShape} from '../src/sim/corpse-save.ts';
import {beforeAll,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {initialWorldRegistry,registeredMap,registeredMapId,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {readAnimalAreaChoice287} from '../src/sim/animal-area-state-287.ts';
import {prepareAnimalAreaRemoval287} from '../src/sim/animal-area-owners-287.ts';
import {newShipCasketHolder277,type ShipCasket277} from '../src/sim/ship-casket-state-277.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {ANESTHETIC_UNIT,ANESTHETIC_DELAY_MAX_CORE} from '../src/sim/anesthetic.ts';
import {reconcileAnimalHealth} from '../src/sim/wildlife-health.ts';
import {advanceCorpses} from '../src/sim/corpses.ts';
import {prepareMapRemoved259} from '../src/sim/world-pawn-map-removed-259.ts';
import {abandonRegisteredMap} from '../src/sim/world-map-authority.ts';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import type {Command,World} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const r=applyCommand(w,c);expect(r.ok,r.reason??c.type).toBe(true);};
function named(w:World,a:WildAnimal){
 const mapId=registeredMapId(w);if(w.worldMaps&&mapId!==undefined)command(w,{type:'map-view',mapId});
 command(w,{type:'allowed-area-create',label:'Cour acquise'});const areaId=w.allowedAreas!.at(-1)!.id;
 command(w,{type:'allowed-area-paint',areaId,enabled:true,from:{x:a.x,z:a.z},to:{x:a.x,z:a.z}});
 command(w,{type:'animal-area-assign',animalId:a.id,choice:{kind:'allowed',areaId}});return areaId;
}
function checkpoint(root:World){
 const expected=structuredClone(registeredMapPresentation(root)!),packet=structuredClone(new SnapshotEncoder().encode(root,0,0));
 const a=new SnapshotDecoder().adopt(structuredClone(packet)),b=new ResidentPresentationAssembler().adopt(structuredClone(packet));
 expect(a.status,a.status==='resync'?a.reason:'snapshot').toBe('applied');expect(b.status,b.status==='resync'?b.reason:'resident').toBe('applied');
 if(a.status!=='applied'||b.status!=='applied')throw Error('Both readers must admit the same actual lifecycle candidate');expect(a.world).toEqual(expected);expect(b.world).toEqual(expected);
}
function exact(root:World){expect(validateWorld(root)).toEqual([]);const raw=serializeCampaign(root),copy=deserializeCampaign(raw);expect(serializeCampaign(copy)).toBe(raw);expect(validateWorld(copy)).toEqual([]);expect(registeredMapPresentation(copy)).toEqual(registeredMapPresentation(root));return copy;}

/** Existing finite32² colony and actual fresh Labrador. The installed empty
 * caisson and anesthetic clinical frontier are declared preparation, not paid
 * construction or administered medicine. Actual carry/contact/500Core closing
 * and ejection are executed by the existing engine below, without teleporting
 * the patient, injecting a completed task or resetting a gameplay random stream. */
function heldCamp(){
 const f=animalHaulingCamp459(),w=f.world,a=f.animal;initialWorldRegistry(w);
 const casket:ShipCasket277={id:w.nextId++,kind:'ship-cryptosleep-casket',x:14,z:10,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:newShipCasketHolder277(w.tick)};
 w.structures.push(casket);a.health=createAnimalMedicalRecord256(w,a);a.health.anesthetic={bornAt:w.tick,expiresAtCore:w.tick*10+ANESTHETIC_DELAY_MAX_CORE,severity:ANESTHETIC_UNIT,remainder:0};reconcileAnimalHealth(w,a);expect(a.state).toBe('downed');
 const areaId=named(w,a),choice=structuredClone(a.animalMapAreas287);expect(validateWorld(w)).toEqual([]);
 command(w,{type:'order-carry-ship-casket',pawnId:f.handlerId,patient:{kind:'animal',id:a.id},casketId:casket.id});
 for(let i=0;i<1500&&casket.shipCryptosleep277.occupant?.kind!=='animal';i++)stepWorld(w);
 expect(casket.shipCryptosleep277.occupant).toEqual({kind:'animal',animal:a});expect(w.wildlife!.animals).not.toContain(a);expect(a.animalMapAreas287).toEqual(choice);expect(a).not.toHaveProperty('animalAreaReturn287');
 return {...f,casket,areaId,choice};
}

test('an acquired preference survives actual carrying, held suspension and ejection of the same animal',()=>{
 const f=heldCamp(),a=f.animal,w=f.world;exact(w);checkpoint(w);const frozen=structuredClone(a);stepWorld(w,12);expect(a).toEqual(frozen);
 command(w,{type:'eject-ship-casket',casketId:f.casket.id});expect(w.wildlife!.animals.find(r=>r.id===a.id)).toBe(a);expect(a.animalMapAreas287).toEqual(f.choice);expect(readAnimalAreaChoice287(a,0)).toEqual({kind:'allowed',areaId:f.areaId});expect(a).not.toHaveProperty('animalAreaReturn287');exact(w);checkpoint(w);
},30_000);

test('deleting the actual named definition reaches the held original and keeps an acquired empty dictionary after ejection',()=>{
 const f=heldCamp(),a=f.animal,w=f.world,before=JSON.stringify(w),rng=w.rng,nextId=w.nextId;
 const preview=prepareAnimalAreaRemoval287(w,{mapId:0,areaId:f.areaId});expect(preview.ok,preview.ok?'':preview.reason).toBe(true);if(!preview.ok)throw Error(preview.reason);expect(preview.writes.some(r=>r.object===a&&r.key==='animalMapAreas287')).toBe(true);expect(JSON.stringify(w)).toBe(before);
 command(w,{type:'allowed-area-delete',areaId:f.areaId});expect(w.allowedAreas?.some(r=>r.id===f.areaId)??false).toBe(false);expect(a.animalMapAreas287).toEqual({revision:1,assignments:[]});expect([w.rng,w.nextId]).toEqual([rng,nextId]);exact(w);checkpoint(w);
 command(w,{type:'eject-ship-casket',casketId:f.casket.id});expect(w.wildlife!.animals.find(r=>r.id===a.id)).toBe(a);expect(a.animalMapAreas287).toEqual({revision:1,assignments:[]});exact(w);
},30_000);

test('actual classic legacy-site retirement removes the acquired reference on the same generated animal without creating WorldPawns',()=>{
 // Existing registryCamp and preparedMap create their own actual legacy globe
 // and map1. No Planet/geography/animal/WorldPawn is grafted. Player custody of
 // its generated hare is explicit authored preparation, not played taming.
 const root=registryCamp(),map=preparedMap(root,52,'legacy-site',false),animal=map.wildlife!.animals[0]!;
 expect(map.pawns).toEqual([]);expect(map.wildlife!.animals).toHaveLength(1);expect(animal.species).toBe('hare');expect(Object.hasOwn(root,'worldPawns')).toBe(false);
 animal.domestic={since:map.tick,care:'herbal',tameness:5,nextDecay:map.tick+6000};const areaId=named(map,animal);flushRegisteredMap(map);root.worldMaps!.selectedMapId=0;
 expect(readAnimalAreaChoice287(animal,1)).toEqual({kind:'allowed',areaId});expect(validateWorld(root)).toEqual([]);const rng=root.rng,nextId=root.nextId;
 const result=abandonRegisteredMap(root,1,true);expect(result.ok,result.reason).toBe(true);expect(registeredMap(root,1)).toBeUndefined();
 const row=root.worldGroups!.abandonedContents.find(c=>c.mapId===1)!.animals.find(r=>r.animal.id===animal.id)!;expect(row.animal).toBe(animal);expect(animal.animalMapAreas287).toEqual({revision:1,assignments:[]});expect(animal).not.toHaveProperty('animalAreaReturn287');
 expect(Object.hasOwn(root,'worldPawns')).toBe(false);expect([root.rng,root.nextId]).toEqual([rng,nextId]);exact(root);checkpoint(root);
});

const source='tmp/test-runs/reform-v415-complete11-2026-10-17T22-21-45.321Z-20704/artifacts/reform-v415/07-existing-camp736-before-real-work-order-RAW-BEFORE-ADMISSION.json';
const sourceSHA='70dea3811dab70e7225cced4c715c8438b1d7aecec6aa173ac72eaa52115e699';
let geographicBaseline:string;
beforeAll(()=>{const raw=readFileSync(source,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(sourceSHA);geographicBaseline=serializeCampaign(deserializeCampaign(raw));},120_000);

test('geographic MapRemoved removes a ground corpse preference while transferring the actual humans to their real WorldPawns',()=>{
 // Same acquired Camp736/hash as V464. All original geography, people,
 // animals and real WorldPawns remain. Hare59485 is a factual healthy source;
 // custody and terminal blood loss are declared preparation, not
 // played taming/hunting. The ordinary corpse producer performs conversion.
 // The resulting same-ID body stays on its actual ground cell. Corpse
 // inventory is not currently represented; no such holder is manufactured.
 // Actual abandonment removes its reference before the body is truly lost,
 // while the acquired humans independently enter their real WorldPawns.
 const campaign=deserializeCampaign(geographicBaseline);if(!('pawns'in campaign))throw Error('The acquired loaded settlement is required');const root=campaign,map=registeredMap(root,1)!;
 expect(root.tick).toBe(736);expect(root.planet?.revision).toBe(3);expect(map.climate?.revision).toBe(4);expect(map.site?.revision).toBe(3);expect(root.worldMaps!.sites.find(s=>s.id===1)?.kind).toBe('camp');
 const animal=map.wildlife!.animals.find(a=>a.id===59485)!;expect(animal).toMatchObject({species:'hare',state:'idle'});expect(animal.health).toBeUndefined();
 const pawn=map.pawns.find(p=>p.id===7)!;expect(pawn.name).toBe('Milo');animal.domestic={since:map.tick,care:'herbal',tameness:5,nextDecay:map.tick+6000};const areaId=named(map,animal);
 animal.health=createAnimalMedicalRecord256(map,animal);animal.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(animal.health);expect(animal.health.death).toMatchObject({tick:map.tick,cause:'blood-loss'});reconcileAnimalHealth(map,animal);advanceCorpses(map);
 const body=map.piles.find(p=>p.id===animal.id)!;expect(body.corpse?.animalMapAreas287).toEqual({revision:1,assignments:[{mapId:1,choice:{kind:'allowed',areaId}}]});expect(map.wildlife!.animals).not.toContain(animal);
 expect(validCorpseShape(body as unknown as Record<string,unknown>,287)).toBe(true);
 const rejectedInventory={...body,owner:{type:'inventory',pawnId:pawn.id}};expect(validCorpseShape(rejectedInventory,287)).toBe(false);
 const withoutNewField=structuredClone(rejectedInventory);delete withoutNewField.corpse!.animalMapAreas287;expect(validCorpseShape(withoutNewField,287)).toBe(false);
 expect(body.owner.type).toBe('ground');flushRegisteredMap(map);root.worldMaps!.selectedMapId=0;expect(validateWorld(root)).toEqual([]);
 const state=root.worldPawns!,before=JSON.stringify(root),preview=prepareMapRemoved259(root,map,1,false);expect(preview.ok,preview.ok?'':preview.reason).toBe(true);if(!preview.ok)throw Error(preview.reason);expect(preview.current()).toBe(true);expect(JSON.stringify(root)).toBe(before);
 const result=abandonRegisteredMap(root,1,true);expect(result.ok,result.reason).toBe(true);expect(root.worldPawns).toBe(state);
 const owner=state.owners.find(r=>r.kind==='human'&&r.actor.id===pawn.id)!;expect(owner.kind).toBe('human');expect(owner.actor).toBe(pawn);expect(owner.items.some(p=>p.id===body.id)).toBe(false);expect(body.corpse!.animalId).toBe(animal.id);expect(body.corpse!.animalMapAreas287).toEqual({revision:1,assignments:[]});
 expect(registeredMap(root,1)).toBeUndefined();expect(root.worldMaps!.retired.find(s=>s.id===1)).toMatchObject({id:1,kind:'camp',removedAt:736});
 const archive=root.worldGroups!.abandonedContents.find(c=>c.mapId===1)!;expect(archive.lost.items[body.item]).toBe(1);expect(archive.animals.some(r=>r.animal.id===animal.id)).toBe(false);
 const copy=exact(root);expect(copy.worldPawns!.owners.find(r=>r.actor.id===pawn.id)!.items.some(p=>p.id===body.id)).toBe(false);expect(copy.worldGroups!.abandonedContents.find(c=>c.mapId===1)!.lost.items[body.item]).toBe(1);checkpoint(root);
 const raw=serializeCampaign(root);expect(abandonRegisteredMap(root,1,true).ok).toBe(false);expect(serializeCampaign(root)).toBe(raw);
},120_000);
