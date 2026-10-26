import {expect,test} from 'vitest';
import {firefoamManualCamp469} from './scenarios/firefoam-v469.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {validFirefoamHistoricalTransport290,validFirefoamWorld290,validateFirefoamLocal290} from '../src/sim/firefoam-save-290.ts';
import {deserializeWorld,serializeWorld,validateCampaignSchema289,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {isSchema256Or257,isSchema283OrLater,isSchema287OrLater,isSchema288OrLater} from '../src/sim/schema-compatibility-257.ts';
import type {FirefoamWave290} from '../src/sim/firefoam-state-290.ts';
import {SCHEMA_VERSION,type Structure} from '../src/sim/types.ts';

const component=()=>({autoRebuild:false});
const building=()=>({id:2,kind:'firefoam-popper',material:'steel',firefoam290:component()});
const coated=()=>({health:{coveredInFirefoam290:{remainingCore:900}}});

test('the actual ordered approach and continuous use are each valid whole saves and retained public/resident publications',()=>{
 const {w,pawn,popper}=firefoamManualCamp469(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const check=()=>{expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);const message=structuredClone(encoder.encode(w,0,0));const a=decoder.adopt(structuredClone(message)),b=resident.adopt(structuredClone(message));expect(a.status).toBe('applied');expect(b.status).toBe('applied');if(a.status==='applied'&&b.status==='applied'){expect(a.world.pawns[0]!.firefoamTask290).toEqual(pawn.firefoamTask290);expect(b.world.pawns[0]!.firefoamTask290).toEqual(pawn.firefoamTask290);}};
 check();expect(applyCommand(w,{type:'firefoam-trigger',pawnId:pawn.id,structureId:popper.id}).ok).toBe(true);expect(pawn.firefoamTask290!.phase).toBe('approach');check();
 for(let n=0;n<600&&pawn.firefoamTask290?.phase!=='use';n++)stepWorld(w);expect(pawn.firefoamTask290!.phase).toBe('use');check();stepWorld(w,5);expect(pawn.firefoamTask290!.progressCore).toBe(50);check();
});
/** Declared propagation checkpoint, not a played emission: the prepared source
 * is absent, two captured cells are due, and a third remains pending. */
function propagation(){
 const f=firefoamManualCamp469(),{w,popper}=f;w.structures=w.structures.filter(s=>s!==popper);
 const center={x:popper.x,z:popper.z},i=center.z*w.width+center.x;
 const wave:FirefoamWave290={id:w.nextId++,sourceId:popper.id,center,startedAtCore:w.tick*10-1,advancedAtCore:w.tick*10,
  cells:[i,i+1,i+2],damageOnlyCells:[i+2],nextCell:2,affectedActorKeys:[]};
 w.firefoam290={rng:1,waves:[wave]};return {...f,wave};
}
function furnitureOwners(b:unknown):unknown[]{return [
 {structures:[b]},{packed:[{building:b}]},{world:{schemaVersion:290},structures:{removed:[],upserted:[b]}},
 {dynamic:{structures:{removed:[],upserted:[b]}}},{worldMaps:{sites:[{map:{packed:[{building:b}]}}]}},
 {secondarySite:{map:{structures:[b]}}},{campaignMap:{groups:[{state:{packed:[{building:b}]}}]}},
 {worldGroups:{groups:[{state:{packed:[{building:b}]}},{pending261:{packed:[{building:b}]}}],losses:[{packed:[{building:b}]}],animalLosses:[{packed:[{building:b}]}],abandonedPawns:[{packed:[{building:b}]}],abandonedContents:[{humans:[{packed:[{building:b}]}],animals:[{packed:[{building:b}]}]}]}},
 {worldPawns:{owners:[{actor:coated(),packed:[{building:b}]}],heldCaskets259:[{casket:{casket:{humans:[coated()],packed:[{building:b}]}}}],heldPlayerCaskets271:[{casket:{cryptosleep:{human:coated(),packed:[{building:b}]}}}],heldShipCaskets277:[{casket:{shipCryptosleep277:{occupant:{kind:'human',pawn:coated()},packed:[{building:b}]}}}]}},
 {worldFactions:{leaders:[{packed:[{building:b}]}]}},{visitors:{departed:[{pawn:coated(),packed:[{building:b}]}]},podRescues:{departed:[{packed:[{building:b}]}]}},
 {groupLosses:[{pawn:coated(),packed:[{building:b}]}],animalLosses:[{animal:coated(),packed:[{building:b}]}]},
 ];}

test('strict289 migration changes only the number, keeps V468 reserve capability and offers no firefoam acquisition',()=>{
 const w=deconstructionCamp(2),old=JSON.parse(serializeWorld(w));old.schemaVersion=289;
 expect(validateCampaignSchema289(old)).toEqual([]);const saved=JSON.stringify(old),copy=deserializeWorld(saved);
 expect(JSON.parse(serializeWorld(copy))).toEqual({...old,schemaVersion:SCHEMA_VERSION});expect(JSON.stringify(old)).toBe(saved);
 for(const key of ['firefoam290'])expect(Object.hasOwn(copy,key)).toBe(false);
 expect(copy.structures.some(s=>s.kind==='firefoam-popper')).toBe(false);expect(copy.research?.firefoam).toBeUndefined();
 const b=fixtureBuilding(w,'campfire',4,4) as Structure;
 b.bills=[newCookingBill(w.nextId++,'simple-meal',290)];b.bills[0]!.mode='until';b.bills[0]!.target=10;b.bills[0]!.reservePause={enabled:true,resumeAt:5,paused:true};
 const previous=JSON.parse(serializeWorld(w));previous.schemaVersion=289;
 expect(validateCampaignSchema289(previous)).toEqual([]);expect(JSON.parse(serializeWorld(deserializeWorld(JSON.stringify(previous))))).toEqual({...previous,schemaVersion:SCHEMA_VERSION});
});

test('historical imports refuse prospective families and future295 while current294 preserves exact state',()=>{
 const newData=[{structures:[building()]},{research:{project:'firefoam',firefoam:{points:1}}},{firefoam290:{rng:1,waves:[]}},
  {filth:{items:[{id:1,kind:'firefoam',x:0,z:0,thickness:1,grownCore:0,expiresAfterCore:300000,nextCheckCore:1}]}},
  {pawns:[{filthFeet:{carried:[{kind:'firefoam',thickness:1}]}}]},{pawns:[coated()]},
  {pawns:[{firefoamTask290:{structureId:2,phase:'approach',progressCore:0,lastWorkedAt:0}}]}];
 for(const raw of newData){const before=JSON.stringify(raw);for(const version of [1,256,283,288,289,295])expect(validFirefoamHistoricalTransport290(raw,version)).toBe(false);for(const version of [290,291,292,293,294])expect(validFirefoamHistoricalTransport290(raw,version)).toBe(true);expect(JSON.stringify(raw)).toBe(before);}
 const clean=JSON.parse(serializeWorld(deconstructionCamp(2)));
 expect(JSON.parse(serializeWorld(deserializeWorld(JSON.stringify({...clean,schemaVersion:294}))))).toEqual({...clean,schemaVersion:294});
 for(const version of [295]){const raw={...clean,schemaVersion:version};expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow();}
 for(const feature of newData){const raw={...clean,...feature,schemaVersion:289};expect(validateCampaignSchema289(raw).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/firefoam/i);}
});

test('current RAW retains installed wick, exact option and actor protection without replaying time or RNG',()=>{
 const {w,pawn,popper}=firefoamManualCamp469();w.firefoam290={rng:123,waves:[]};popper.firefoam290={autoRebuild:true,wick:{startedAtCore:w.tick*10-17,endCore:w.tick*10+128}};
 pawn.health=createMedicalRecord(w.tick);pawn.health.coveredInFirefoam290={remainingCore:887};
 expect(validateWorld(w)).toEqual([]);const saved=serializeWorld(w),copy=deserializeWorld(saved);expect(serializeWorld(copy)).toBe(saved);
 expect(copy.pawns[0]!.health!.coveredInFirefoam290).toEqual({remainingCore:887});expect(copy.firefoam290!.rng).toBe(123);
});

test('every real retained custody lane preserves the same inert component and rejects an active packed wick',()=>{
 for(const raw of furnitureOwners(building())){const before=JSON.stringify(raw);expect(validFirefoamHistoricalTransport290(raw,290)).toBe(true);expect(validFirefoamHistoricalTransport290(raw,289)).toBe(false);expect(JSON.stringify(raw)).toBe(before);}
 const active={...building(),firefoam290:{autoRebuild:false,wick:{startedAtCore:0,endCore:140}}};
 for(const raw of furnitureOwners(active).filter((_,n)=>![0,2,3,5].includes(n)))expect(validFirefoamHistoricalTransport290(raw,290)).toBe(false);
 const task={structureId:2,phase:'approach',progressCore:0,lastWorkedAt:0};
 for(const raw of [{group:{members:[{firefoamTask290:task}]}},{worldPawns:{owners:[{actor:{firefoamTask290:task}}]}},{structures:[{cryptosleep:{human:{firefoamTask290:task}}}]}])expect(validFirefoamHistoricalTransport290(raw,290)).toBe(false);
});

test('new components, health, research, traces and sparse upserts refuse hidden/inherited/getter/symbol/undefined data with zero getter reads',()=>{
 let reads=0;const bad=building();Object.defineProperty(bad,'firefoam290',{enumerable:true,get(){reads++;throw Error('No component getter');}});
 const health={};Object.defineProperty(health,'coveredInFirefoam290',{enumerable:true,get(){reads++;throw Error('No health getter');}});
 const hidden=building();Object.defineProperty(hidden,'firefoam290',{enumerable:false,value:component()});
 const inherited=Object.assign(Object.create({firefoam290:component()}),{kind:'firefoam-popper',material:'steel'});
 const symbols={...component(),[Symbol('future')]:true};
 const loop:{world?:unknown}={};loop.world=loop;
 for(const raw of [{structures:[bad]},{pawns:[{health}]},{structures:[hidden]},{structures:[inherited]},
  {structures:[{...building(),firefoam290:symbols}]},{structures:[{...building(),firefoam290:undefined}]},
  {world:{},structures:{removed:[],upserted:[bad]}},{pawns:[{health:{coveredInFirefoam290:{remainingCore:901}}}]},
  {research:{firefoam:{points:0,completedAt:undefined}}},{firefoam290:undefined},loop])expect(validFirefoamHistoricalTransport290(raw,290)).toBe(false);
 const schema={};Object.defineProperty(schema,'schemaVersion',{enumerable:true,get(){reads++;throw Error('No schema getter');}});expect(validFirefoamWorld290(schema)).toBe(false);expect(reads).toBe(0);
});

test('captured wave roundtrips with exact pending cursor, independent of later LOS and without bomb ownership',()=>{
 const {w,wave}=propagation();expect(validateFirefoamLocal290(w)).toEqual([]);expect(validateWorld(w)).toEqual([]);
 const saved=serializeWorld(w),copy=deserializeWorld(saved);expect(serializeWorld(copy)).toBe(saved);expect(copy.firefoam290!.waves[0]).toEqual(wave);
 expect(copy.bombWaves??[]).toEqual(w.bombWaves??[]);expect(copy.pawns.every(p=>!p.bombRefuge)).toBe(true);
 const ids=new Set<number>();expect(validateFirefoamLocal290(w,ids)).toEqual([]);expect(ids.has(wave.id)).toBe(true);expect(validateFirefoamLocal290(w,ids).length).toBeGreaterThan(0);
});

test('wave context rejects changed source ownership, namespace, bounds, timing, halo order and due cursor without repair',()=>{
 const mutations:((f:ReturnType<typeof propagation>)=>void)[]=[
  f=>{f.wave.id=f.w.pawns[0]!.id;},f=>{f.w.structures.push(f.popper);},f=>{f.wave.center.x=f.w.width;},
  f=>{f.wave.cells.push(f.w.width*f.w.height);},f=>{f.wave.cells.reverse();},f=>{f.wave.nextCell=1;},
  f=>{f.wave.advancedAtCore-=10;},f=>{f.wave.startedAtCore=f.w.tick*10+1;},f=>{f.wave.damageOnlyCells=[f.wave.cells[0]!];},
  f=>{f.wave.affectedActorKeys=[`pawn:${f.w.nextId}`];},f=>{f.w.firefoam290!.waves.push(structuredClone(f.wave));},
 ];
 for(const change of mutations){const f=propagation();change(f);const before=JSON.stringify(f.w);expect(validateFirefoamLocal290(f.w).length).toBeGreaterThan(0);expect(JSON.stringify(f.w)).toBe(before);}
});

test.each([false,true])('RAW/public/resident publication keeps the previous state on malformed current feature and then accepts the same good revision (checkpoint=%s)',checkpoint=>{
 const {w,popper}=firefoamManualCamp469(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const first=structuredClone(encoder.encode(w,0,0));expect(decoder.adopt(structuredClone(first)).status).toBe('applied');expect(resident.adopt(structuredClone(first)).status).toBe('applied');
 popper.firefoam290!.autoRebuild=true;const good=structuredClone(encoder.encode(w,0,0,checkpoint));
 const bad=structuredClone(good),table='structures'in bad?bad.structures!.upserted:bad.world.structures;
 table!.find(s=>s.id===popper.id)!.firefoam290={autoRebuild:true,wick:{startedAtCore:0,endCore:1}};
 expect(decoder.adopt(structuredClone(bad)).status).toBe('resync');expect(resident.adopt(structuredClone(bad)).status).toBe('resync');
 const a=decoder.adopt(structuredClone(good)),b=resident.adopt(structuredClone(good));expect(a.status).toBe('applied');expect(b.status).toBe('applied');
 if(a.status!=='applied'||b.status!=='applied')throw Error('Good firefoam publication refused');
 expect(a.world.structures.find(s=>s.id===popper.id)!.firefoam290).toEqual({autoRebuild:true});expect(b.world).toEqual(a.world);
});

test('wave-only dynamic publication is retained; a forged wave cursor cannot replace the confirmed publication',()=>{
 const {w,wave}=propagation(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const first=structuredClone(encoder.encode(w,0,0));expect(decoder.adopt(structuredClone(first)).status).toBe('applied');expect(resident.adopt(structuredClone(first)).status).toBe('applied');
 w.firefoam290!.rng=2;const good=structuredClone(encoder.encode(w,0,0)),bad=structuredClone(good);bad.world.firefoam290!.waves[0]!.nextCell=0;
 expect(decoder.adopt(structuredClone(bad)).status).toBe('resync');expect(resident.adopt(structuredClone(bad)).status).toBe('resync');
 const a=decoder.adopt(structuredClone(good)),b=resident.adopt(structuredClone(good));expect(a.status).toBe('applied');expect(b.status).toBe('applied');
 if(a.status==='applied'&&b.status==='applied'){expect(a.world.firefoam290!.waves[0]).toEqual(wave);expect(b.world.firefoam290).toEqual(a.world.firefoam290);}
});

test('290 preserves actual older capabilities while numeric strings and future families stay closed',()=>{
 for(const fn of [isSchema256Or257,isSchema283OrLater,isSchema287OrLater,isSchema288OrLater]){
  for(const version of [289,290,291,292,293,294])expect(fn(version)).toBe(true);expect(fn(295)).toBe(false);expect(fn('290')).toBe(false);
 }
 expect(isSchema283OrLater(282)).toBe(false);expect(isSchema287OrLater(286)).toBe(false);expect(isSchema288OrLater(287)).toBe(false);
 for(const version of [289,290])expect(validFirefoamHistoricalTransport290({pawns:[],structures:[]},version)).toBe(true);
});
