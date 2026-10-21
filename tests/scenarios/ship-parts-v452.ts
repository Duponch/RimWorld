import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeWorld} from '../../src/sim/serialization.ts';
import {projectProgress,researchCost} from '../../src/sim/research.ts';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials.ts';

export const EARNED_REACTOR_SHA275='2193119d8983fb32c823fe1246900a68e98fec92f5d1f68436c22275dbebe708';
export const SHIP_PART_PREPARATION276='Reuses the byte-identified whole V451 reactor actually paid and worked to completion at tick12200. Original workshop/research/skill/stocks were declared V451 preparation. V452 adds only completed engine knowledge and finite980steel/460plasteel/210uranium/3components/19advanced-components at declared accessible ground positions. No beam, engine, blueprint, delivery, work, activation, elapsed defence or victory is prepared. Original person, reactor, lamp, food and history are retained.';
export const SHIP_PART_STOCK276=Object.freeze([
 {item:'steel' as const,quantity:980},{item:'plasteel' as const,quantity:460},{item:'uranium' as const,quantity:210},
 {item:'component' as const,quantity:3},{item:'advanced-component' as const,quantity:19},
]);
export const SHIP_PART_PLANS276=Object.freeze([
 {type:'designate' as const,kind:'ship-beam' as const,x:13,z:20,orientation:1 as const,material:'steel' as const},
 {type:'designate' as const,kind:'ship-engine' as const,x:13,z:16,orientation:0 as const,material:'steel' as const},
 {type:'designate' as const,kind:'ship-engine' as const,x:13,z:22,orientation:0 as const,material:'steel' as const},
 {type:'designate' as const,kind:'ship-engine' as const,x:16,z:24,orientation:0 as const,material:'steel' as const},
]);
export function shipPartsWorkshop276(){
 const original=readFileSync(new URL('../fixtures/ship-reactor-v451-earned.json',import.meta.url),'utf8');
 if(createHash('sha256').update(original).digest('hex')!==EARNED_REACTOR_SHA275)throw Error('Earned V451 reactor bytes changed');
 const w=deserializeWorld(original);
 const engine=projectProgress(w.research!,'ship-engine');engine.points=researchCost('ship-engine');engine.completedAt=w.tick;
 for(const [i,row]of SHIP_PART_STOCK276.entries())addGroundMaterial(w,row.item,row.quantity,{x:5+i,z:14},row.item);
 refreshStock(w);
 return {w,source:JSON.parse(original),reactorId:284,builderId:168,lampId:185,plans:SHIP_PART_PLANS276};
}
