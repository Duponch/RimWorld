import {expect} from 'vitest';
import {visitorTradeFixture} from './visitors';
import {fixtureBuilding} from './deconstruction';
import {controlledInjury} from './health';
import {BLOOD_UNIT} from '../../src/sim/injury-rules';
import {reconcilePawnHealth} from '../../src/sim/health';
import {addMaterial,refreshStock} from '../../src/sim/materials';
import {stepWorld} from '../../src/sim/engine';
import {validateWorld} from '../../src/sim/serialization';
import type {Pawn,World} from '../../src/sim/types';

/** Prepared small clinical boundary, not a natural campaign. The real visitor
 * producer supplies IDs/group/faction/trade inventory. Local positions, tiny
 * injury and anemia are declared fixture conditions; admission is never set.
 * The .61 blood stage lasts long enough for real pickup/deposit/treatment,
 * then permits a bounded natural rest/departure path without healing resets. */
export function visitorCareScene(){
 const {world:w,traderId}=visitorTradeFixture(2),patient=w.pawns.find(p=>p.id===traderId)!,colonists=w.pawns.filter(p=>!p.visitor),doctor=colonists[0]!,otherDoctor=colonists[1]!;
 for(const [index,d] of colonists.entries()){
  Object.assign(d,{x:3+index,z:5,hunger:100,rest:100,background:{childhood:'quiet-child',adulthood:'medic'}});d.schedule.fill('work');d.recreation.level=100;
  for(const key of Object.keys(d.priorities) as (keyof Pawn['priorities'])[])d.priorities[key]=0;
  d.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};d.medicalCare='industrial';
 }
 doctor.priorities.doctor=1;
 Object.assign(patient,{x:8,z:5,path:[],motion:null,moveCooldown:0,hunger:100,rest:100});patient.medicalCare='industrial';
 controlledInjury(w,patient,'left-arm',1000,'bruise');patient.health!.bloodLoss=BLOOD_UNIT*.61;reconcilePawnHealth(w,patient);expect(patient.state).toBe('downed');
 const bed=Object.assign(fixtureBuilding(w,'bed',3,12),{medical:true});
 let personal=w.piles.find(p=>p.item==='medicine'&&p.owner.type==='inventory'&&p.owner.pawnId===patient.id);
 if(!personal){const id=w.nextId;addMaterial(w,'medicine',3,{type:'inventory',pawnId:patient.id},'medicine');personal=w.piles.find(p=>p.id===id)!;}
 const colonyMedicineId=w.nextId;addMaterial(w,'medicine',3,{type:'ground',x:4,z:11},'medicine');refreshStock(w);
 return {w,doctor,otherDoctor,patient,bed,personalMedicineId:personal.id,colonyMedicineId};
}
export function validVisitorCare(w:World):void{const errors=validateWorld(w);expect(errors,JSON.stringify({tick:w.tick,errors:errors.slice(0,6)})).toEqual([]);}
export function untilVisitorCare(w:World,predicate:()=>boolean,max=1600):void{for(let n=0;n<max&&!predicate();n++)stepWorld(w);expect(predicate(),JSON.stringify({tick:w.tick,pawns:w.pawns.map(p=>({id:p.id,state:p.state,xy:[p.x,p.z],visitor:p.visitor,need:p.need,rescue:p.rescue,tend:p.tend}))})).toBe(true);validVisitorCare(w);}
export function personalVisitorPiles(w:World,patientId:number){return structuredClone(w.piles.filter(p=>'pawnId' in p.owner&&p.owner.pawnId===patientId).map(p=>({id:p.id,item:p.item,quantity:p.quantity,owner:p.owner}))); }
