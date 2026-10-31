import {createWorld} from '../../src/sim/engine.ts';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials.ts';
import {projectProgress,researchCost,type ResearchProject} from '../../src/sim/research.ts';
import type {World} from '../../src/sim/types.ts';
export const STOCK298=[{item:'steel',quantity:150},{item:'gold',quantity:70},{item:'advanced-component',quantity:4},{item:'ai-core',quantity:1}] as const;
export const PLAN298={type:'designate',kind:'ship-computer',x:20,z:20,orientation:0,material:'steel'} as const;
export const PREPARATION298='Declared createWorld42/32x32: one healthy adult Construction20, full needs/work schedule, no traits/background; flat discovered ground; one ordinary bed; completed industrial/ShipBasics/computer research; finite150steel/70gold/4advanced-components/1AI and40survival meals. No computer/sensor/blueprint/delivery/work/acquisition receipt/victory is prepared.';
export function finishDeclaredResearch(w:World,id:ResearchProject){const r=projectProgress(w.research!,id);r.points=researchCost(id);r.completedAt=w.tick;}
export function declaredFixture():World {
 const w=createWorld(42,32,32),original=w.pawns[0]!;
 w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.stockpiles=[];w.packed=[];w.growingZones=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.roofing={constructed:[],build:[],remove:[],cursor:0};
 delete w.wildlife;delete w.arrivals;delete w.raids;delete w.heatwaves;delete w.thermal;
 w.pawns=[{...structuredClone(original),id:w.nextId++,name:'Bâtisseuse déclarée',x:13,z:16,hunger:100,rest:100,mood:100,comfort:100}];
 const p=w.pawns[0]!;delete p.background;delete p.traits;delete p.medicalCare;p.schedule.fill('work');p.recreation.level=100;
 for(const key of Object.keys(p.priorities))p.priorities[key as keyof typeof p.priorities]=0;
 p.priorities.build=1;p.priorities.haul=2;p.priorities.basic=3;p.skills.construction.level=20;
 w.structures.push({id:w.nextId++,kind:'bed',x:6,z:6,orientation:0,footprint:'standard',material:'wood',quality:'normal'});
 w.research={project:null,points:0};for(const id of ['smithing','machining','microelectronics','multi-analyzer','fabrication','advanced-fabrication','ship-basics','ship-computer'] as const)finishDeclaredResearch(w,id);
 for(const [i,row] of STOCK298.entries())addGroundMaterial(w,row.item,row.quantity,{x:10+i,z:15},row.item);
 addGroundMaterial(w,'food',40,{x:4,z:5},'survival-meal');refreshStock(w);return w;
}
