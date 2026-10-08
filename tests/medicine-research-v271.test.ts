import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { cookingSpot } from '../src/sim/cooking-bills.ts';
import { DRUG_PRODUCTION_RESEARCH_COST,MEDICINE_PRODUCTION_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST,drugProductionUnlocked,medicineProductionUnlocked,processResearch,researchCost,researchPrerequisite,researchStationUsable,selectResearch } from '../src/sim/research.ts';
import { validateResearch,validMedicineResearchTransport } from '../src/sim/research-save.ts';
import type { Structure,World } from '../src/sim/types.ts';

function fixture():World {
  const w=createWorld(271,20,20);w.schemaVersion=206;w.tick=2000;w.resources=[];w.structures=[];w.jobs=[];w.packed=[];
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.research={project:null,points:0};w.pawns=w.pawns.slice(0,1);
  const p=w.pawns[0]!;p.priorities.research=1;p.orders={active:null,queue:[]};p.path=[];p.state='idle';p.jobId=null;
  delete p.background;delete p.health;
  return w;
}
function prerequisites(w:World):void {
  w.research!.drugProduction={points:DRUG_PRODUCTION_RESEARCH_COST,completedAt:0};
  w.research!.microelectronics={points:MICROELECTRONICS_RESEARCH_COST,completedAt:0};
}
function bench(w:World,advanced=false):Structure {
  const s:Structure={id:w.nextId++,kind:advanced?'hi-tech-research-bench':'research-bench',x:8,z:8,orientation:0,footprint:'standard',material:'steel',...(advanced?{power:{on:true,parentId:null}}:{})};
  w.structures.push(s);return s;
}
function contact(w:World,s:Structure):void {
  const p=w.pawns[0]!,spot=cookingSpot(s);p.x=spot.x;p.z=spot.z;p.path=[];p.state='working';
  p.research={stationId:s.id,spot,worked:0};
}

test('two industrial research projects have independent costs and explicit prerequisites',()=>{
  const w=fixture();expect(researchCost('drug-production')).toBe(500_000_000);expect(researchCost('medicine-production')).toBe(1_500_000_000);
  const before=structuredClone(w.research);expect(selectResearch(w,'medicine-production').ok).toBe(false);expect(w.research).toEqual(before);
  expect(researchPrerequisite(w,'medicine-production')).toBe('Production de drogues');
  w.research!.drugProduction={points:DRUG_PRODUCTION_RESEARCH_COST,completedAt:0};
  expect(researchPrerequisite(w,'medicine-production')).toBe('Microélectronique');
  prerequisites(w);expect(selectResearch(w,'medicine-production').ok).toBe(true);expect(w.research!.medicineProduction).toEqual({points:0});
  expect(drugProductionUnlocked(w)).toBe(true);expect(medicineProductionUnlocked(w)).toBe(false);
});

test('drug production finishes at ordinary desk contact without granting medicine production',()=>{
  const w=fixture(),s=bench(w);expect(selectResearch(w,'drug-production').ok).toBe(true);w.research!.drugProduction!.points=DRUG_PRODUCTION_RESEARCH_COST-100;
  const p=w.pawns[0]!,spot=cookingSpot(s);p.x=spot.x-1;p.z=spot.z;p.research={stationId:s.id,spot,worked:0};
  let moved=false;processResearch(w,p,()=>{moved=true;},()=>100,()=>{});expect(moved).toBe(true);expect(drugProductionUnlocked(w)).toBe(false);
  contact(w,s);const events:string[]=[];processResearch(w,p,()=>{throw Error('Already at desk.');},()=>100,t=>events.push(t));
  expect(w.research!.drugProduction).toEqual({points:DRUG_PRODUCTION_RESEARCH_COST,completedAt:w.tick});expect(w.research!.project).toBeNull();
  expect(p.research).toBeUndefined();expect(drugProductionUnlocked(w)).toBe(true);expect(medicineProductionUnlocked(w)).toBe(false);expect(events).toHaveLength(1);
  expect(selectResearch(w,'drug-production').ok).toBe(false);
});

test('medicine research requires powered advanced desk and retains its points across outage and pause',()=>{
  const w=fixture();prerequisites(w);const simple=bench(w),advanced=bench(w,true);selectResearch(w,'medicine-production');
  expect(researchStationUsable(w,simple,'medicine-production')).toBe(false);expect(researchStationUsable(w,simple,'drug-production')).toBe(true);
  contact(w,advanced);processResearch(w,w.pawns[0]!,()=>{throw Error('At contact.');},()=>125,()=>{});
  expect(w.research!.medicineProduction!.points).toBe(125);advanced.power!.on=false;
  processResearch(w,w.pawns[0]!,()=>{throw Error('Must release before movement.');},()=>125,()=>{});
  expect(w.pawns[0]!.research).toBeUndefined();expect(w.research!.medicineProduction!.points).toBe(125);
  expect(selectResearch(w,null).ok).toBe(true);expect(w.research!.medicineProduction!.points).toBe(125);
  advanced.power!.on=true;selectResearch(w,'medicine-production');w.research!.medicineProduction!.points=MEDICINE_PRODUCTION_RESEARCH_COST-125;contact(w,advanced);
  processResearch(w,w.pawns[0]!,()=>{throw Error('At contact.');},()=>125,()=>{});expect(medicineProductionUnlocked(w)).toBe(true);
  expect(w.research!.medicineProduction!.completedAt).toBe(w.tick);
});

test('schema 205 refuses future projects and own future properties without adopting research',()=>{
  const w=fixture();w.schemaVersion=205 as World['schemaVersion'];const before=JSON.stringify(w);
  for(const project of ['drug-production','medicine-production']){expect(selectResearch(w,project).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);}
  expect(validateResearch(w,205)).toEqual([]);expect(validMedicineResearchTransport(w,205)).toBe(true);
  for(const key of ['drugProduction','medicineProduction'] as const){const bad=structuredClone(w);bad.research![key]=undefined;
    expect(validateResearch(bad,205)).toContain('Invalid research project.');expect(validMedicineResearchTransport(bad,205)).toBe(false);}
  expect(w.research!.drugProduction).toBeUndefined();expect(w.research!.medicineProduction).toBeUndefined();
});

test('strict research validation rejects malformed, premature and unsupported medicine records without repair',()=>{
  const w=fixture();prerequisites(w);w.research!.medicineProduction={points:12};expect(validateResearch(w,206)).toEqual([]);expect(validMedicineResearchTransport(w,206)).toBe(true);
  const changes:Array<(v:World)=>void>=[
    v=>{v.research!.medicineProduction!.points=-1;},v=>{v.research!.medicineProduction!.points=MEDICINE_PRODUCTION_RESEARCH_COST;},
    v=>{v.research!.medicineProduction={points:MEDICINE_PRODUCTION_RESEARCH_COST,completedAt:v.tick+1};},
    v=>{v.research!.project='medicine-production';delete v.research!.medicineProduction;},
    v=>{v.research!.project='medicine-production';v.research!.medicineProduction={points:MEDICINE_PRODUCTION_RESEARCH_COST,completedAt:0};},
    v=>{delete v.research!.drugProduction;},v=>{delete v.research!.microelectronics;},
    v=>{(v.research!.medicineProduction as unknown as Record<string,unknown>).extra=true;},
  ];
  for(const change of changes){const bad=structuredClone(w);change(bad);const retained=JSON.stringify(bad);expect(validateResearch(bad,206)).toContain('Invalid research project.');expect(validMedicineResearchTransport(bad,206)).toBe(false);expect(JSON.stringify(bad)).toBe(retained);}
});

test('laboratory construction is gated while purchased medicine requires no research',()=>{
  const w=fixture(),lab:Structure={id:w.nextId++,kind:'drug-lab',x:8,z:8,orientation:0,footprint:'standard',material:'wood'};
  w.structures.push(lab);expect(validateResearch(w,206)).toContain('Locked drug lab.');expect(validMedicineResearchTransport(w,206)).toBe(false);
  w.research!.drugProduction={points:DRUG_PRODUCTION_RESEARCH_COST,completedAt:0};expect(validateResearch(w,206)).toEqual([]);expect(validMedicineResearchTransport(w,206)).toBe(true);
  w.structures=[];delete w.research!.drugProduction;w.piles=[];addGroundMaterial(w,'medicine',1,{x:4,z:4},'medicine');
  expect(w.piles.some(p=>p.item==='medicine'&&p.quantity===1)).toBe(true);expect(validateResearch(w,206)).toEqual([]);expect(validMedicineResearchTransport(w,206)).toBe(true);
});

test('transport refuses a medicine research task at an ordinary desk but preserves an outage checkpoint',()=>{
  const w=fixture();prerequisites(w);selectResearch(w,'medicine-production');const s=bench(w);contact(w,s);
  expect(validMedicineResearchTransport(w,206)).toBe(false);expect(validateResearch(w,206)).toContain('Invalid research ownership.');
  s.kind='hi-tech-research-bench';s.power={on:false,parentId:null};
  expect(validMedicineResearchTransport(w,206)).toBe(true);expect(validateResearch(w,206)).toEqual([]);
  expect(researchStationUsable(w,s,'medicine-production')).toBe(false);
});
