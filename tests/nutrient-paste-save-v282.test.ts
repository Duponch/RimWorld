import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld,serializeWorld } from '../src/sim/serialization.ts';
import { initialFoodPolicies } from '../src/sim/food-policy.ts';
import { adoptPasteFoodPolicies } from '../src/sim/food-policy-save.ts';
import { validNutrientPasteTransport,validPasteRequestShape } from '../src/sim/nutrient-paste-save.ts';
import { NUTRIENT_PASTE_RESEARCH_COST } from '../src/sim/research.ts';
import { freshRot } from '../src/sim/food-preservation.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { medicalCamp } from './scenarios/health.ts';
import type { World } from '../src/sim/types.ts';

const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function collected(){const w=medicalCamp(),p=w.pawns[0]!,id=w.nextId++;p.jobId=null;p.haul=null;p.cooking=null;p.state='moving';p.path=[];p.moveCooldown=0;delete p.motion;
 w.piles.push({id,kind:'food',item:'nutrient-paste-meal',quantity:1,owner:{type:'pawn',pawnId:p.id},...freshRot('nutrient-paste-meal',w.tick)});
 p.need={kind:'eat',phase:'collect',sourcePileId:null,carryPileId:id,quantity:1,progress:0,dining:null,paste:{dispenserId:w.nextId++,spot:{x:p.x,z:p.z},producedAt:w.tick}};refreshStock(w);return {w,p,id};}
function refused(w:World){expect(validNutrientPasteTransport(w,w.schemaVersion)).toBe(false);expect(checkpoint(w).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();}
test('216 adoption changes only the three exact original profiles',()=>{
 const w=medicalCamp();w.schemaVersion=216 as World['schemaVersion'];w.foodPolicies=initialFoodPolicies(true,true,true,true,true,false);const before=structuredClone(w),expected=structuredClone(w);expected.schemaVersion=218;adoptPasteFoodPolicies(expected);
 expect(deserializeWorld(JSON.stringify(w))).toEqual(expected);expect(w).toEqual(before);expect(expected.foodPolicies.slice(0,3).every(p=>p.allowed.includes('nutrient-paste-meal'))).toBe(true);expect(expected.foodPolicies[3]!.allowed).toEqual([]);
});
test('custom labels, IDs, omissions and ordering keep their exact diets',()=>{
 for(const change of [(w:World)=>{w.foodPolicies[0]!.name='Personnel';},(w:World)=>{w.foodPolicies[0]!.id=5;},(w:World)=>{w.foodPolicies[0]!.allowed.pop();},(w:World)=>{w.foodPolicies[0]!.allowed.reverse();}]){const w=medicalCamp();w.foodPolicies=initialFoodPolicies(true,true,true,true,true,false);change(w);const before=structuredClone(w.foodPolicies[0]);adoptPasteFoodPolicies(w);expect(w.foodPolicies[0]).toEqual(before);}
});
test('legacy files and Decoder refuse every prospective discriminant before migration',()=>{
 for(const field of ['paste','phase']){const {w,p}=collected();w.schemaVersion=216 as World['schemaVersion'];w.foodPolicies=initialFoodPolicies(true,true,true,true,true,false);w.piles=w.piles.filter(i=>i.item!=='nutrient-paste-meal');if(field==='paste')Object.assign(p.need!,{paste:null,phase:'pickup',sourcePileId:1,carryPileId:null});refused(w);}
 const w=medicalCamp();w.schemaVersion=216 as World['schemaVersion'];w.foodPolicies=initialFoodPolicies(true,true,true,true,true,false);w.research??={points:0,project:null};w.research.nutrientPaste={points:NUTRIENT_PASTE_RESEARCH_COST,completedAt:w.tick};refused(w);
});
test('produced cargo survives absence of its historical machine with an exact checkpoint',()=>{
 const {w}=collected();expect(validNutrientPasteTransport(w,217)).toBe(true);expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(checkpoint(w).status).toBe('applied');
});
test('collect never accepts fictitious, duplicated or premature sources',()=>{
 for(const patch of [{sourcePileId:1},{carryPileId:null},{quantity:2},{phase:'pickup'},{progress:1},{paste:null},{paste:{dispenserId:1,spot:{x:1,z:1},ingredients:[],producedAt:3000}}]){const {w,p}=collected();Object.assign(p.need!,patch);refused(w);}
 for(const patch of [{moveCooldown:1},{path:[{x:1,z:1}]},{state:'eating'}]){const {w,p}=collected();Object.assign(p,patch);refused(w);}
});
test('six unit inputs have strict independent identities and no ambiguous production clock',()=>{
 const w=medicalCamp(),v={dispenserId:1,spot:{x:1,z:1},ingredients:[{pileId:2,quantity:3},{pileId:3,quantity:3}]};expect(validPasteRequestShape(v,w)).toBe(true);
 for(const ingredients of [[{pileId:2,quantity:5}],[{pileId:2,quantity:3},{pileId:2,quantity:3}],null,[{pileId:2,quantity:6,extra:1}]])expect(validPasteRequestShape({...v,ingredients},w)).toBe(false);
 expect(validPasteRequestShape({...v,producedAt:w.tick},w)).toBe(false);expect(validPasteRequestShape({...v,ingredients:undefined,producedAt:w.tick},w)).toBe(false);
});
test('paste archives reject active tasks and honor the original memory clock',()=>{
 const {w,p}=collected();w.pawns=[];w.visitors={departed:[{tick:w.tick,pawn:p,items:w.piles}]} as never;expect(validNutrientPasteTransport(w,217)).toBe(false);
 const f=medicalCamp();f.pawns[0]!.memories=[{kind:'ate-nutrient-paste',expiresAt:f.tick+6001}];refused(f);
 // A stun can postpone retrieval processing; an existing portion stays real.
 const delayed=collected();delayed.w.tick+=6;expect(validNutrientPasteTransport(delayed.w,217)).toBe(true);
});
