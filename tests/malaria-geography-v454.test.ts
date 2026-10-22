import {expect,test} from 'vitest';
import {createHash} from 'node:crypto';
import {malariaGeographicCamp454} from './scenarios/malaria-geography-v454.ts';
import {advanceFluIncidents,resolveImmuneDiseaseIncident,FLU_FIRST_CHECK,FLU_CHECK_INTERVAL,type ImmuneDiseaseIncidentCalendar} from '../src/sim/flu-incidents.ts';
import {BIOME_DISEASE_FACTS_256,biomeDiseaseChoice256} from '../src/sim/biome-disease-facts-256.ts';
import {WORLD_LAND_BIOMES,type WorldLandBiome} from '../src/sim/world-biome-selection.ts';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';
import type {World} from '../src/sim/types.ts';

// Primary table from the local Core1.6.4871 XML, independently transcribed as
// admission expectations. These are static category weights, not final rates.
const BIOMES454=[
 ['boreal-forest',0],['tundra',0],['cold-bog',0],['ice-sheet',0],['sea-ice',0],
 ['temperate-forest',100],['temperate-swamp',100],['tropical-rainforest',160],['tropical-swamp',160],
 ['arid-shrubland',0],['desert',0],['extreme-desert',0],
] as const;
const NEW_BIOMES454=['temperate-swamp','tropical-rainforest','tropical-swamp'] as const;
const UINT=0x100000000;
const next454=(rng:number)=>{let n=rng;n^=n<<13;n^=n>>>17;n^=n<<5;return n>>>0;};
const advanced454=(rng:number,count:number)=>{for(let i=0;i<count;i++)rng=next454(rng);return rng;};
const pins454=new Map<WorldLandBiome,number>();
/** Bounded deterministic calendar preparation, not a natural frequency claim.
 * It chooses the pre-existing two calendar draws; no clinical case is injected. */
function malariaTicket454(biome:WorldLandBiome):number {
 const cached=pins454.get(biome);if(cached!==undefined)return cached;
 const chance=-Math.expm1(-FLU_CHECK_INTERVAL/(BIOME_DISEASE_FACTS_256[biome].mtbDays*1.5*6000));
 for(let seed=1;seed<=1_000_000;seed++){
  const category=next454(seed),choice=next454(category)/UINT;
  if(category/UINT<chance&&biomeDiseaseChoice256(biome,choice)==='Disease_Malaria'){pins454.set(biome,seed);return seed;}
 }
 throw Error(`No bounded malaria opportunity fixture for ${biome}`);
}
/** With two real candidates requested victims is one. The second draw chooses
 * the second original; the third remains the actual contraction roll. */
function patientPin454(contract?:'accept'|'refuse'):number {
 for(let seed=1;seed<=100_000;seed++){
  const victim=advanced454(seed,2)/UINT,roll=advanced454(seed,3)/UINT;
  if(victim>=.5&&(contract===undefined||(roll<.5)===(contract==='accept')))return seed;
 }
 throw Error('No bounded clinical fixture pin');
}
const detached454=(tick:number,rng=0x454):ImmuneDiseaseIncidentCalendar=>({adoptedAt:tick,rng,draws:1,episodes:0,cases:0});
const exact454=(w:World)=>{expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w),copy=deserializeWorld(raw);expect(serializeWorld(copy)).toBe(raw);return copy;};
function publicMirror454(w:World){
 const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));
 expect(first.status).toBe('applied');if(first.status!=='applied')throw Error(first.status);
 const retained=first.world,before=structuredClone(retained);
 return ()=>{
  const packet=encoder.encode(w,0,0);expect(packet.kind).toBe('delta');const next=decoder.adopt(structuredClone(packet));
  expect(next.status).toBe('applied');if(next.status!=='applied')throw Error(next.status);
  const full=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder({structureDelta:true}).encode(w,0,0)));
  expect(full.status).toBe('applied');if(full.status!=='applied')throw Error(full.status);
  expect(next.world).toEqual(full.world);expect(retained).toEqual(before);
 };
}
const medicineUnits454=(w:World)=>w.piles.filter(p=>p.item==='medicine').reduce((sum,p)=>sum+p.quantity,0);
function prepareOpportunity454(biome:WorldLandBiome){
 const f=malariaGeographicCamp454(biome,2),w=f.w,calendar=w.fluIncidents!;
 if(!calendar.immuneDiseases||w.tick!==FLU_FIRST_CHECK-1)throw Error('The full world must precede the declared first occasion');
 calendar.rng=malariaTicket454(biome);calendar.immuneDiseases.rng=patientPin454();
 return {...f,calendar,patient:w.pawns[1]!,doctor:w.pawns[0]!};
}

test.each(BIOMES454)('geographic %s admits a selected malaria only for its positive native weight (%i)',(biome,weight)=>{
 expect(BIOMES454.map(([b])=>b)).toEqual(WORLD_LAND_BIOMES);
 const {w}=malariaGeographicCamp454(biome,1),beforeCalendar=structuredClone(w.fluIncidents),rng=w.rng,state=detached454(w.tick),stateBefore=structuredClone(state),before=serializeWorld(w);
 expect(validateWorld(w)).toEqual([]);expect(BIOME_DISEASE_FACTS_256[biome].diseases.find(d=>d.id==='Disease_Malaria')?.weight??0).toBe(weight);
 // Direct resolution isolates admission only; this detached auxiliary calendar
 // does not pretend that the world's scheduled opportunity has already fired.
 expect(resolveImmuneDiseaseIncident(w,'malaria',state)).toBe(weight>0?1:0);
 if(weight){expect(w.pawns[0]!.health?.immuneDiseases?.malaria?.severity).toBe(1_000_000);expect(state).toMatchObject({episodes:1,cases:1});expect(state.rng).toBe(advanced454(stateBefore.rng,4));}
 else{expect(state).toEqual(stateBefore);expect(serializeWorld(w)).toBe(before);}
 expect(w.rng).toBe(rng);expect(w.fluIncidents).toEqual(beforeCalendar);exact454(w);
});

test.each(['temperate-forest','boreal-forest','arid-shrubland','tundra'] as const)('legacy %s keeps its historical malaria admission and plague behavior',biome=>{
 const w=createScenarioWorld(454,32,'crashlanded',{biome,hilliness:'flat'});stepWorld(w);
 expect(w.site?.revision).toBe(2);exact454(w);const rng=w.rng,state=detached454(w.tick),before=structuredClone(state);
 const malaria=resolveImmuneDiseaseIncident(w,'malaria',state);
 if(biome==='temperate-forest'){expect(malaria).toBeGreaterThanOrEqual(1);expect(malaria).toBeLessThanOrEqual(2);}
 else{expect(malaria).toBe(0);expect(state).toEqual(before);}
 expect(resolveImmuneDiseaseIncident(w,'plague',detached454(w.tick))).toBeGreaterThan(0);
 expect(w.rng).toBe(rng);exact454(w);
});

test.each(NEW_BIOMES454)('%s reaches malaria through the real scheduled category/choice, keeps counters and exact RAW/public continuation',biome=>{
 const {w,calendar,patient,doctor,preparation}=prepareOpportunity454(biome),sourcePatient=patient,categoryRng=calendar.rng,clinicalRng=calendar.immuneDiseases!.rng,checks=calendar.checks,draws=calendar.immuneDiseases!.draws;
 expect(w.pawns.every(p=>!p.health?.immuneDiseases?.malaria)).toBe(true);const replay=exact454(w),beforeRaw=serializeWorld(w),publicAfter=publicMirror454(w);
 stepWorld(w);stepWorld(replay);
 // Real ecological updates (geyser phases and wild flora) may consume world RNG;
 // the direct resolver cases above separately require its disease stream isolation.
 expect(w.tick).toBe(FLU_FIRST_CHECK);expect(serializeWorld(replay)).toBe(serializeWorld(w));expect(w.rng).toBe(replay.rng);
 expect(w.fluIncidents).toMatchObject({rng:advanced454(categoryRng,2),checks:checks+1,nextCheck:FLU_FIRST_CHECK+FLU_CHECK_INTERVAL,fluDraws:0,episodes:0,cases:0});
 expect(w.fluIncidents!.immuneDiseases).toMatchObject({rng:advanced454(clinicalRng,4),draws:draws+1,episodes:1,cases:1});
 expect(w.pawns.filter(p=>!!p.health?.immuneDiseases?.malaria?.severity)).toEqual([sourcePatient]);
 expect(patient.health!.immuneDiseases!.malaria).toMatchObject({bornAt:FLU_FIRST_CHECK,severity:1_000_000,immunity:0});expect(patient.health!.immuneDiseases!.malaria!.luck).toBe(800_000+Math.floor(advanced454(clinicalRng,4)/UINT*400_001));
 expect(w.events.filter(e=>e.message.startsWith('Paludisme :'))).toHaveLength(1);expect(w.events.some(e=>e.message.startsWith('Paludisme :')&&e.message.includes(patient.name))).toBe(true);
 // A duplicate call at the same accepted time consumes no extra occasion.
 const occurred=serializeWorld(w);advanceFluIncidents(w);expect(serializeWorld(w)).toBe(occurred);exact454(w);publicAfter();
 const afterIllness=serializeWorld(w),doctorXpBefore=doctor.skills.medicine.xp,dosesBefore=medicineUnits454(w);
 if(biome==='tropical-swamp'){
  let worked=false;for(let i=0;i<1000&&!patient.health!.immuneDiseases!.malaria!.tend;i++){
   if(doctor.tend?.phase==='tend')worked=true;
   stepWorld(w);stepWorld(replay);
  }
  expect(worked).toBe(true);expect(w.pawns.find(p=>p.id===patient.id)).toBe(sourcePatient);expect(patient.health!.immuneDiseases!.malaria!.tend?.quality).toBeGreaterThan(0);
  expect(patient.need?.kind).toBe('sleep');const bedId=patient.need?.kind==='sleep'?patient.need.bedId:null;expect(bedId).not.toBeNull();expect(w.structures.some(s=>s.id===bedId&&s.medical)).toBe(true);
  expect(medicineUnits454(w)).toBe(dosesBefore-1);expect(doctor.skills.medicine.xp).toBeGreaterThan(doctorXpBefore);
  expect(w.events.some(e=>e.message.includes(`${doctor.name} a traité le paludisme de ${patient.name}`))).toBe(true);
  expect(serializeWorld(replay)).toBe(serializeWorld(w));exact454(w);publicAfter();
  // Evidence is written only after this real case's assertions. ROOT uses the
  // manifest only when the required suite is acquired; failed-run artifacts
  // remain diagnostics. test-output redirects these unique paths into tmp.
  const folder='artifacts/malaria-geography-v454';
  writeTestFileSync(`${folder}/before.json`,beforeRaw);writeTestFileSync(`${folder}/after-illness.json`,afterIllness);writeTestFileSync(`${folder}/after-care.json`,serializeWorld(w));
  writeTestFileSync(`${folder}/manifest.json`,JSON.stringify({version:454,schemaVersion:277,beforePath:testOutputPath(`${folder}/before.json`),beforeSha256:createHash('sha256').update(beforeRaw).digest('hex'),afterIllnessPath:testOutputPath(`${folder}/after-illness.json`),afterCarePath:testOutputPath(`${folder}/after-care.json`),patientId:patient.id,patientName:patient.name,biome,occasionTick:FLU_FIRST_CHECK,stopTick:w.tick,expectedCases:1,care:{doctorId:doctor.id,bedId,medicineItem:'medicine',expectedDoses:1,maxTicks:1000},preparation:{fixture:'tests/scenarios/malaria-geography-v454.ts',worldFixture:preparation,notice:'Date 53999, initial needs, finite medical workshop and both independent disease streams are explicitly prepared. The next real tick selects malaria; every subsequent care tick is played. No nine-day waiting frequency, naturally acquired workshop or injected malaria is claimed.',categoryRng,clinicalRng}},null,2));
 }else{
  stepWorld(w,80);stepWorld(replay,80);expect(serializeWorld(replay)).toBe(serializeWorld(w));exact454(w);publicAfter();
 }
});

test('active malaria rejects a selected victim without replacing its real case or touching world/calendar RNG',()=>{
 const {w,patient}=prepareOpportunity454('temperate-swamp');stepWorld(w);exact454(w);
 const state=detached454(w.tick,patientPin454()),beforeState=state.rng,before=serializeWorld(w);
 expect(resolveImmuneDiseaseIncident(w,'malaria',state)).toBe(0);expect(state.rng).toBe(advanced454(beforeState,3));expect(state.episodes).toBe(0);expect(serializeWorld(w)).toBe(before);expect(patient.health!.immuneDiseases!.malaria!.severity).toBeGreaterThan(0);exact454(w);
});

test('a real selected tropical opportunity without a candidate consumes its ticket but creates no patient or clinical draw',()=>{
 const {w}=malariaGeographicCamp454('tropical-swamp',0),calendar=w.fluIncidents!,extension=calendar.immuneDiseases!;
 calendar.rng=malariaTicket454('tropical-swamp');const category=calendar.rng,clinical=extension.rng,replay=exact454(w);
 stepWorld(w);stepWorld(replay);expect(w.fluIncidents).toMatchObject({checks:1,rng:advanced454(category,2),fluDraws:0,episodes:0,cases:0});
 // Ecology still advances without colonists; the complete replay owns its RNG oracle.
 expect(w.fluIncidents!.immuneDiseases).toMatchObject({rng:clinical,draws:1,episodes:0,cases:0});expect(w.pawns).toEqual([]);expect(w.events.some(e=>e.message.startsWith('Paludisme :'))).toBe(false);expect(w.rng).toBe(replay.rng);
 expect(serializeWorld(replay)).toBe(serializeWorld(w));exact454(w);
});

test.each(['full','partial-refuse','partial-accept'] as const)('declared residual malaria immunity %s uses the existing contraction threshold and conserves complete worlds',mode=>{
 const {w}=malariaGeographicCamp454('tropical-rainforest',2),p=w.pawns[1]!;
 // Explicit clinical boundary fixture, never a claim that immunity was played
 // to recovery. The actual incident resolver owns the contraction test.
 p.health=createMedicalRecord(w.tick);p.health.immuneDiseases={malaria:{bornAt:w.tick,severity:0,immunity:mode==='full'?600_000_000:300_000_000,luck:1_000_000}};
 exact454(w);const state=detached454(w.tick,patientPin454(mode==='partial-accept'?'accept':'refuse')),rng=state.rng,before=serializeWorld(w),accept=mode==='partial-accept';
 expect(resolveImmuneDiseaseIncident(w,'malaria',state)).toBe(accept?1:0);expect(state.rng).toBe(advanced454(rng,accept?4:3));
 if(accept){expect(p.health.immuneDiseases.malaria).toMatchObject({bornAt:w.tick,severity:1_000_000,immunity:300_000_000});expect(state.episodes).toBe(1);}
 else{expect(state.episodes).toBe(0);expect(serializeWorld(w)).toBe(before);}
 exact454(w);
});
