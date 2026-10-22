import {expect,test} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {abandonRegisteredMap} from '../src/sim/world-map-authority.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {newShipCasketHolder277,type ShipCasket277,type ShipCasketOccupant277} from '../src/sim/ship-casket-state-277.ts';
import {validateShipCasketOwners277} from '../src/sim/ship-casket-owner-save-277.ts';
import {heldCasketGCUnknown259} from '../src/sim/world-pawn-casket-membership-259.ts';
import {captureWorldPawnHumans256} from '../src/sim/world-pawn-human-capture-256.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {marshSupportsFootprint} from '../src/sim/marsh.ts';
import {captureStandability} from '../src/sim/furniture-travel.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {clearQueuedOrders} from '../src/sim/player-orders.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {medicalCivilTick271} from '../src/sim/suspended-human-clock-271.ts';
import {createMechaMedicalRecord} from '../src/sim/mechanoid-health.ts';
import {actualMechanicalBirthFaction259} from '../src/sim/mechanoid-world-faction-259.ts';
import {addResolvedInjury,medicalStatus} from '../src/sim/injury-state.ts';
import {planShipCasketRemoval277} from '../src/sim/ship-casket-removal-277.ts';
import type {Mechanoid} from '../src/sim/mechanoid-state.ts';
import type {World,Structure,MaterialPile} from '../src/sim/types.ts';

const source='tmp/test-runs/caravan-owners-v414-departure-expiry01-2026-10-17T19-08-08.417Z-26072/artifacts/caravan-owners-v259/actual259-paused2905-before-abandon-refusal.json';
const sha='5ff387667bb3933d4b3957c65dd9516c4c3470e13d3c888b2a917878f9778525';
let preparedText:string|undefined;
/** One previously acquired geographic two-map campaign. Boxing the existing
 * human/animal and a declared downed mechanical clinical original is owner-
 * boundary preparation, not played construction, medical cost or capture. */
function prepared(){
 if(!preparedText){
  const text=readFileSync(source,'utf8');expect(createHash('sha256').update(text).digest('hex')).toBe(sha);
  const root=deserializeCampaign(text);if(!('pawns'in root))throw Error('Acquired local colony required');const map=registeredMap(root,0)!,p=map.pawns.find(p=>p.id===8)!;
  if(!releaseWork(map,p))throw Error('Actual human cargo release refused');clearQueuedOrders(map,p);delete p.motion;p.path=[];p.moveCooldown=0;p.planCooldown=0;p.need=null;p.state='idle';p.collapsePending=false;p.restZeroTicks=0;
  const occupied=new Set([...map.structures.flatMap(footprintCells),...map.resources,...map.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[]),...map.packed.flatMap(p=>p.owner.type==='ground'?[p.owner]:[])].map(c=>c.z*map.width+c.x)),positions:{x:number;z:number}[]=[],stands=captureStandability(map);
  for(let z=Math.max(2,p.z-20);z<Math.min(map.height-3,p.z+20)&&positions.length<4;z++)for(let x=Math.max(2,p.x-20);x<Math.min(map.width-3,p.x+20)&&positions.length<4;x++){
   const candidate={kind:positions.length===0?'bed' as const:'ship-cryptosleep-casket' as const,x,z,orientation:0 as const,footprint:'standard' as const,material:positions.length===0?'wood' as const:'steel' as const},cells=footprintCells(candidate);
   if(!cells.every(c=>!occupied.has(c.z*map.width+c.x)&&stands(c))||!marshSupportsFootprint(map,cells,candidate))continue;
   positions.push({x,z});for(const c of cells)occupied.add(c.z*map.width+c.x);
  }
  if(positions.length!==4)throw Error('Actual source needs four unoccupied floor pairs');
  const bed:Structure={id:map.nextId++,kind:'bed',...positions[0]!,orientation:0,footprint:'standard',material:'wood',quality:'normal'};
  p.bedId=bed.id;p.mapBed={revision:1,mapId:0,bedId:bed.id};
  const animal=map.wildlife!.animals.find(a=>a.growthTracker&&a.wander&&a.state!=='dead')!;if(!animal)throw Error('Actual geographic animal required');
  delete animal.motion;animal.path=[];animal.nextDecision=map.tick;animal.health??=createAnimalMedicalRecord256(map,animal);expect(medicalCivilTick271(animal.health)).toBe(map.tick);
  // Declared clinical preparation, not an administered/acquired animal dose.
  animal.health.anesthetic={bornAt:animal.health.tick,expiresAtCore:animal.health.tick*10+120000,severity:1000000000,remainder:0};animal.state=medicalStatus(animal.health)==='downed'?'downed':'idle';if(animal.wander)delete animal.wander.job;
  const faction=actualMechanicalBirthFaction259(root.worldFactions);if(!faction)throw Error('Actual mechanical birth faction required');
  const health=createMechaMedicalRecord(map.tick);for(const side of ['left','right']as const)addResolvedInjury(health,`scyther-${side}-leg`,'crack',100000,()=>.999999);
  const mech:Mechanoid={id:map.nextId++,mechKind:'scyther',x:p.x,z:p.z+1,state:'downed',path:[],heading:0,moveCooldown:0,planCooldown:0,health,worldFaction259:faction};expect(medicalStatus(health)).toBe('downed');
  const occupants:ShipCasketOccupant277[]=[{kind:'human',pawn:p},{kind:'animal',animal},{kind:'mechanical',mech}],caskets:ShipCasket277[]=[];
  for(const [i,o]of occupants.entries()){
   const a=o.kind==='human'?o.pawn:o.kind==='animal'?o.animal:o.mech;a.shipCryptosleepHeldAt277=map.tick;
   const c:ShipCasket277={id:map.nextId++,kind:'ship-cryptosleep-casket',...positions[i+1]!,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:newShipCasketHolder277(map.tick)};
   c.shipCryptosleep277.occupant=o;c.shipCryptosleep277.items=map.piles.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===a.id&&['inventory','equipment','apparel'].includes(i.owner.type));
   const goods:MaterialPile={id:map.nextId++,kind:'wood',item:'wood',quantity:5,owner:{type:'inventory',pawnId:a.id}};if(o.kind!=='mechanical')c.shipCryptosleep277.items.push(goods);
   caskets.push(c);map.pawns=map.pawns.filter(q=>q!==a);map.wildlife!.animals=map.wildlife!.animals.filter(q=>q!==a);map.piles=map.piles.filter(i=>!c.shipCryptosleep277.items.includes(i));
  }
  map.structures.push(bed,...caskets);flushRegisteredMap(map);expect(validateShipCasketOwners277(map)).toEqual([]);expect(validateWorld(root)).toEqual([]);preparedText=serializeCampaign(root);
 }
 const root=deserializeCampaign(preparedText);if(!('pawns'in root))throw Error('Acquired colony remains local');const map=registeredMap(root,0)!,caskets=map.structures.filter((s):s is ShipCasket277=>s.kind==='ship-cryptosleep-casket');return {root,map,caskets};
}
function publicExact(root:World){const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),view=registeredMapPresentation(root)!;for(const full of [true,false]){const result=decoder.adopt(structuredClone(encoder.encode(root,0,0,full)));expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(view);}}

test.skipIf(!existsSync(source))('real MapRemoved retains all three original spatial holders, clears the real bed and preserves RAW/public owners',()=>{
 const {root,map,caskets}=prepared(),originals=caskets.map(c=>c.shipCryptosleep277.occupant!),before=caskets.map(c=>structuredClone(c.shipCryptosleep277)),result=abandonRegisteredMap(root,0,true);expect(result.ok,result.reason).toBe(true);
 const rows=root.worldPawns!.heldShipCaskets277!;expect(rows).toHaveLength(3);expect(map.structures.some(s=>s.kind==='ship-cryptosleep-casket')).toBe(false);
 for(const [i,row]of rows.entries()){expect(row.casket).toBe(caskets[i]);expect(row.casket.shipCryptosleep277.occupant).toBe(originals[i]);const o=originals[i]!,a=o.kind==='human'?o.pawn:o.kind==='animal'?o.animal:o.mech;
  const previous=before[i]!.occupant!,prior=previous.kind==='human'?previous.pawn:previous.kind==='animal'?previous.animal:previous.mech;expect(a.health).toEqual(prior.health);
  expect(a.health?.cryptosleepSickness).toBeUndefined();expect(root.worldPawns!.owners.some(r=>r.actor.id===a.id)).toBe(false);expect(heldCasketGCUnknown259(root.worldPawns!).find(([id])=>id===a.id)?.[1].unknown).toContain('actual-spatial-cryptosleep-holder-terminal-uncomposed');
 }
 const human=originals[0]!;if(human.kind!=='human')throw Error('Original human required');expect(human.pawn.bedId).toBeNull();expect(human.pawn.mapBed).toBeUndefined();expect(captureWorldPawnHumans256(root).byId.get(human.pawn.id)?.pawn).toBe(human.pawn);
 expect(validateWorld(root)).toEqual([]);const saved=serializeCampaign(root);expect(serializeCampaign(deserializeCampaign(saved))).toBe(saved);publicExact(root);
 for(const mutate of [(r:World)=>r.worldPawns!.heldShipCaskets277!.push(structuredClone(r.worldPawns!.heldShipCaskets277![0]!)),(r:World)=>{r.schemaVersion=276 as World['schemaVersion'];},(r:World)=>{r.worldPawns!.heldShipCaskets277![0]!.casket.shipCryptosleep277.heldAt--;}]){const bad=JSON.parse(saved);mutate(bad);expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();expect(serializeCampaign(root)).toBe(saved);}
});

test.skipIf(!existsSync(source))('real terminal Vanish records the same original as destroyed without clinical death or faction reassignment',()=>{
 const {root,map,caskets}=prepared(),c=caskets[0]!,o=c.shipCryptosleep277.occupant!;if(o.kind!=='human')throw Error('Actual human required');const p=o.pawn,faction=structuredClone(p.worldAffiliation259),rng=root.rng;
 const plan=planShipCasketRemoval277(map,c,'vanish');expect(plan.ok,plan.ok?'':plan.reason).toBe(true);if(!plan.ok)throw Error(plan.reason);expect(plan.commit()).toBe(true);flushRegisteredMap(map);
 const row=root.worldPawns!.owners.find(r=>r.actor.id===p.id)!;expect(row.actor).toBe(p);expect(row.destroyed).toBe(true);expect(p.health?.death).toBeUndefined();expect(p.worldAffiliation259).toEqual(faction);expect(root.rng).toBe(rng);expect(row.shipCasketTerminal277).toMatchObject({revision:1,mapId:0,atCore:map.tick*10,kind:'human'});
 expect(validateWorld(root)).toEqual([]);const saved=serializeCampaign(root);expect(serializeCampaign(deserializeCampaign(saved))).toBe(saved);publicExact(root);
 const forged=JSON.parse(saved);forged.worldPawns.owners.find((r:{actor:{id:number}})=>r.actor.id===p.id).shipCasketTerminal277.mapId=forged.worldMaps.nextMapId;expect(()=>deserializeCampaign(JSON.stringify(forged))).toThrow();expect(serializeCampaign(root)).toBe(saved);
});
