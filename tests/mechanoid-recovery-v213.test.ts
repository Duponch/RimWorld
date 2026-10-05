import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {createMechaMedicalRecord,commitMechanoidImpact} from '../src/sim/mechanoid-health.ts';
import {addResolvedInjury} from '../src/sim/injury-state.ts';
import {advanceMechanoidCorpses,mechCorpseMass} from '../src/sim/mechanoid-corpse.ts';
import {mechSalvageYield,finishMechSalvage,mechSalvageSpeed} from '../src/sim/mechanoid-salvage.ts';
import {productionWorkTotal} from '../src/sim/production-recipes.ts';
import {processHaul} from '../src/sim/hauling.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {healthRandom} from '../src/sim/health.ts';
import type {ProductionContext} from '../src/sim/production-output.ts';
import type {Mechanoid} from '../src/sim/mechanoid-state.ts';
function camp(amputate=false){
 const w=medicalCamp(),p=w.pawns[0]!;p.priorities.craft=1;p.skills.crafting={level:10,xp:0,dailyXp:0,passion:1};delete p.background;
 p.x=12;p.z=15;const m:Mechanoid={id:w.nextId++,mechKind:'scyther',x:15,z:16,state:'idle',path:[],heading:0,moveCooldown:0,planCooldown:0};w.mechanoids=[m];
 const health=createMechaMedicalRecord(w.tick);if(amputate)addResolvedInjury(health,'scyther-left-blade','crack',27000,()=>.99);addResolvedInjury(health,'scyther-brain','crack',14000,()=>.99);
 expect(commitMechanoidImpact(w,m,health,{rng:w.rng},w.tick*10)).toBe(true);advanceMechanoidCorpses(w);
 const corpse=w.piles.find(i=>i.id===m.id)!;expect(corpse.mechCorpse).toBeDefined();
 expect(applyCommand(w,{type:'designate',kind:'crafting-spot',x:16,z:16}).ok).toBe(true);
 const station=w.structures.find(s=>s.kind==='crafting-spot')!;
 expect(applyCommand(w,{type:'bill-add',structureId:station.id,recipe:'smash-mechanoid'}).ok).toBe(true);
 const bill=station.bills![0]!;bill.destination='drop';refreshStock(w);expect(validateWorld(w)).toEqual([]);
 return {w,p,corpse,station,bill};
}
const context={event:()=>{},release:()=>{},move:()=>{},workRate:()=>1,search:()=>null} as unknown as ProductionContext;
test('two mandatory yield draws and steel independent of corpse amputations',()=>{
 const {p,corpse}=camp();let draws=0;expect(mechSalvageYield(p,()=>{draws++;return .99;})).toBe(15);expect(draws).toBe(2);
 const full=mechCorpseMass(corpse),amputated=camp(true).corpse;
 expect(mechCorpseMass(amputated)).toBeLessThan(full);expect(mechSalvageYield(p,()=>.99)).toBe(15);expect(mechSalvageSpeed(p)).toBe(1);
});
test('real hauling transfers whole identity and dossier with no allocation',()=>{
 const {w,p,corpse}=camp();p.priorities.craft=0;p.priorities.haul=1;p.x=14;p.z=16;
 const zone={id:w.nextId++,x:20,z:20,filters:{wood:false,food:false,'mech-corpse':true},priority:2,capacity:1};w.stockpiles=[zone];
 p.haul={sourcePileId:corpse.id,carryPileId:null,quantity:1,phase:'pickup',destination:{type:'stockpile',stockpileId:zone.id}};
 const next=w.nextId,health=corpse.mechCorpse!.health;processHaul(w,p,()=>{throw Error('already at source');},()=>{});
 expect(w.nextId).toBe(next);expect(p.haul?.carryPileId).toBe(corpse.id);expect(corpse.owner).toEqual({type:'pawn',pawnId:p.id});expect(corpse.mechCorpse!.health).toBe(health);
 expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
test('smashing traverses real source, cargo, placement and work before one atomic steel output',()=>{
 const {w,p,corpse,bill}=camp();const id=corpse.id;let source=false,held=false,placed=false,work=0;
 for(let i=0;i<600&&!w.mechSalvage;i++){
  stepWorld(w);expect(validateWorld(w),String(w.tick)).toEqual([]);
  const task=p.cooking;source ||=!!task?.ingredients.some(i=>i.stage==='source');held ||=!!task?.ingredients.some(i=>i.stage==='held');placed ||=!!task?.ingredients.some(i=>i.stage==='placed');
  if(task?.phase==='work')work++;
  if(i===20||task?.phase==='work'&&work===10){const clone=deserializeWorld(serializeWorld(w));expect(clone).toEqual(w);}
 }
 expect(source&&held&&placed).toBe(true);expect(work).toBeGreaterThanOrEqual(89);expect(w.mechSalvage).toEqual({completed:1,steel:15});expect(bill.target).toBe(0);
 expect(w.piles.some(i=>i.id===id)).toBe(false);expect(w.piles.filter(i=>i.item==='steel').reduce((n,i)=>n+i.quantity,0)).toBe(15);
});
test('failed finishing preserves source, RNG, ledger, bill and cargo when identity capacity is exhausted',()=>{
 const {w,p,corpse,station,bill}=camp();corpse.owner={type:'ground',x:16,z:16};p.x=16;p.z=15;p.state='working';
 p.cooking={recipe:'smash-mechanoid',stationId:station.id,billId:bill.id,spot:{x:16,z:15},actionCell:{x:16,z:16},phase:'work',ingredients:[{pileId:corpse.id,item:'scyther-corpse',quantity:1,stage:'placed',cell:{x:16,z:16}}],progress:productionWorkTotal('smash-mechanoid'),productId:null,storageId:null};
 w.nextId=Number.MAX_SAFE_INTEGER;const before=structuredClone(w);expect(finishMechSalvage(w,p,bill,context)).toBe(false);expect(w).toEqual(before);
 w.nextId=before.pawns[0]!.id+10000;const rng={rng:w.rng};healthRandom(rng);healthRandom(rng);
 expect(finishMechSalvage(w,p,bill,context)).toBe(true);expect(w.rng).toBe(rng.rng);expect(validateWorld(w)).toEqual([]);
});
