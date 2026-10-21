import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {shipPartsWorkshop276,SHIP_PART_STOCK276,SHIP_PART_PREPARATION276,EARNED_REACTOR_SHA275} from './scenarios/ship-parts-v452.ts';
import {SHIP_ADDED_CONTENT_276,isShipAddedKind276} from '../src/sim/ship-part-content-276.ts';
import {constructionSupplied,deliveredMaterial} from '../src/sim/construction-materials.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {readShipReactorStart275} from '../src/sim/ship-reactor-runtime-275.ts';
import {indexShipParts276,readShipAssembly276} from '../src/sim/ship-part-reader-276.ts';
import {powerWatts} from '../src/sim/power-rules.ts';
import {writeTestFileSync} from './test-output.ts';
import type {Command,World} from '../src/sim/types.ts';

const units=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const command=(w:World,c:Command)=>{const r=applyCommand(w,c);expect(r.ok,r.reason??JSON.stringify(c)).toBe(true);};
const reload=(w:World)=>{const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;};
function assembly(w:World,id:number){const built=indexShipParts276(w.structures,w.width,w.height);expect(built.ok).toBe(true);if(!built.ok)throw Error(built.reason);const report=readShipAssembly276(built.index,id);expect(report.ok).toBe(true);if(!report.ok)throw Error(report.reason);return report;}
function until(w:World,done:()=>boolean,limit:number,observe?:()=>void){
 for(let n=0;n<limit&&!done();n++){stepWorld(w);observe?.();}
 if(!done()){writeTestFileSync('tmp/ship-reactor-v452/engine-failure.json',JSON.stringify(w));throw Error(JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({id:p.id,state:p.state,x:p.x,z:p.z,jobId:p.jobId,haul:p.haul,path:p.path})),events:w.events.slice(-5)}));}
 expect(validateWorld(w)).toEqual([]);
}
function publicProbe(w:World){
 const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));
 expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('First hull checkpoint refused');const retained=first.world,frozen=structuredClone(retained);
 return ()=>{const packet=structuredClone(encoder.encode(w,0,0));expect(packet.kind).toBe('delta');const next=decoder.adopt(packet);expect(next.status).toBe('applied');if(next.status!=='applied')throw Error('Hull delta refused');
  const full=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder({structureDelta:true}).encode(w,0,0)));expect(full.status).toBe('applied');if(full.status!=='applied')throw Error('Full hull oracle refused');expect(next.world).toEqual(full.world);expect(retained).toEqual(frozen);};
}

test('finite stock and every construction tick make one beam and three engines beside the same earned reactor; a physical bridge removal splits their actual report',()=>{
 const {w,reactorId,builderId,lampId,plans,source}=shipPartsWorkshop276();expect(validateWorld(w)).toEqual([]);
 expect(w.pawns.map(p=>p.id)).toEqual(source.pawns.map((p:{id:number})=>p.id));expect(w.structures).toEqual(source.structures);expect(w.tick).toBe(source.tick);
 expect(w.structures.some(s=>isShipAddedKind276(s.kind))).toBe(false);
 const before=Object.fromEntries(SHIP_PART_STOCK276.map(i=>[i.item,units(w,i.item)]));
 for(const plan of plans)command(w,plan);
 const jobIds=w.jobs.filter(j=>isShipAddedKind276(j.kind)).map(j=>j.id),beamJobId=w.jobs.find(j=>j.kind==='ship-beam')!.id,carried=new Set<string>(),contact=new Set<number>();
 const observe=()=>{const p=w.pawns.find(p=>p.id===builderId)!;
  if(p.haul?.destination.type==='job'&&jobIds.includes(p.haul.destination.jobId)&&p.haul.phase==='deliver'){const q=w.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id);if(q)carried.add(q.item);}
  const j=w.jobs.find(j=>j.id===p.jobId);if(j&&jobIds.includes(j.id)&&p.state==='working'&&j.progress>0){const cells=footprintCells(j);expect(cells.some(c=>c.x===p.x&&c.z===p.z)).toBe(false);expect(cells.some(c=>Math.abs(c.x-p.x)+Math.abs(c.z-p.z)===1)).toBe(true);contact.add(j.id);}
 };
 until(w,()=>{const j=w.jobs.find(j=>j.id===beamJobId);return !!j&&j.construction==='frame'&&constructionSupplied(w,j)&&j.progress>0;},12000,observe);
 const frame=w.jobs.find(j=>j.id===beamJobId)!;for(const i of SHIP_ADDED_CONTENT_276['ship-beam'].ingredients)expect(deliveredMaterial(w,frame,i.item)).toBe(i.quantity);
 writeTestFileSync('tmp/ship-reactor-v452/native-paid-frame.json',serializeWorld(w));
 writeTestFileSync('tmp/ship-reactor-v452/native-paid-frame.meta.json',JSON.stringify({prepared:SHIP_PART_PREPARATION276,sourceSha256:EARNED_REACTOR_SHA275,tick:w.tick,jobId:beamJobId,builderId,reactorId,lampId,actualFourIngredientsDelivered:true,actualWorkAtExteriorContact:true,terminalPartsPrepared:false,jobIds},null,2));
 const twin=reload(w),at=w.tick,send=publicProbe(w);
 until(w,()=>jobIds.every(id=>!w.jobs.some(j=>j.id===id)),36000,observe);stepWorld(twin,w.tick-at);expect(serializeWorld(twin)).toBe(serializeWorld(w));
 expect(carried).toEqual(new Set(['steel','plasteel','uranium','component','advanced-component']));expect(contact).toEqual(new Set(jobIds));
 for(const i of SHIP_PART_STOCK276)expect(units(w,i.item)).toBe(before[i.item]-i.quantity);
 const built=w.structures.filter(s=>isShipAddedKind276(s.kind));expect(built.map(s=>s.kind).sort()).toEqual(['ship-beam','ship-engine','ship-engine','ship-engine']);
 expect(built.every(s=>s.power?.on===false&&s.power.parentId===null&&powerWatts(s,w)===0)).toBe(true);
 const report=assembly(w,reactorId);expect(report.counts).toEqual({beam:1,engine:3,reactor:1,computer:0,sensors:0,casket:0});expect(report.missing.map(p=>p.id)).toEqual(['computer','sensors','casket']);expect(w.structures.find(s=>s.id===reactorId)?.shipReactor275).toBeUndefined();
 send();reload(w);writeTestFileSync('tmp/ship-reactor-v452/assembled.json',serializeWorld(w));
 writeTestFileSync('tmp/ship-reactor-v452/assembled.meta.json',JSON.stringify({prepared:SHIP_PART_PREPARATION276,sourceSha256:EARNED_REACTOR_SHA275,tick:w.tick,builderId,reactorId,lampId,originalJobIds:jobIds,partIds:report.partIds,actualConstructionFinished:true,rawExactReplay:true,publicCheckpointAndDelta:true,recipeSpent:SHIP_PART_STOCK276},null,2));
 const quote=readShipReactorStart275(w,reactorId);expect(quote).toEqual({ok:true,reactorIds:[reactorId]});if(!quote.ok)throw Error(quote.reason);command(w,{type:'ship-reactor-start',reactorId,reactorIds:quote.reactorIds});
 const dates=structuredClone(w.structures.find(s=>s.id===reactorId)!.shipReactor275!),beam=built.find(s=>s.kind==='ship-beam')!,lost=structuredClone(w.deconstructed);
 command(w,{type:'designate',kind:'deconstruct',x:beam.x,z:beam.z,targetId:beam.id});until(w,()=>!w.structures.some(s=>s.id===beam.id),2500);
 expect(w.structures.find(s=>s.id===reactorId)!.shipReactor275).toEqual(dates);expect(w.shipReactorThreats275?.active).toBe(true);
 expect(assembly(w,reactorId).counts).toEqual({beam:0,engine:2,reactor:1,computer:0,sensors:0,casket:0});
 const keys={'steel':'lostSteel','plasteel':'lostPlasteel275','component':'lostComponents','advanced-component':'lostAdvancedComponents271'} as const;
 for(const i of SHIP_ADDED_CONTENT_276['ship-beam'].ingredients){const key=keys[i.item],returned=units(w,i.item);expect(returned).toBeGreaterThanOrEqual(Math.floor(i.quantity/2));expect(returned).toBeLessThanOrEqual(Math.ceil(i.quantity/2));expect(returned+(w.deconstructed[key]??0)-(lost[key]??0)).toBe(i.quantity);}
 expect(w.deconstructed.count).toBe(lost.count+1);send();reload(w);
 writeTestFileSync('tmp/ship-reactor-v452/bridge-removed.json',serializeWorld(w));
},180000);
