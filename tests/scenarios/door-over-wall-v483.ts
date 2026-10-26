import {emptyLandscape} from '../../src/sim/generation.ts';
import {startingPawn} from '../../src/sim/starting-pawns.ts';
import {finalizeInitialWorldRegistry} from '../../src/sim/world-map-context.ts';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials.ts';
import {applyCommand,stepWorld} from '../../src/sim/engine.ts';
import {SCHEMA_VERSION,type Command,type Pawn,type World} from '../../src/sim/types.ts';
import {serializeCampaign,deserializeWorld} from '../../src/sim/serialization.ts';

/** Declared initial property only. No live actor is healed or repositioned after
 * play starts. The five wood are finite; all future door goods start forbidden. */
export function prepareDoorOverWallScenario483(count=2){
 const world=emptyLandscape(483,32,32),cells={wall:{x:16,z:16},wood:{x:11,z:16},steel:{x:12,z:18},components:{x:13,z:18},meal:{x:10,z:18}};
 world.tiles=Array.from({length:world.width*world.height},()=>({terrain:'soil' as const}));
 for(let i=0;i<count;i++){
  const p=startingPawn(world.nextId++,['Alix','Basile','Camille'][i]??'Dorian',10+i,16,i,65,world.seed,0,SCHEMA_VERSION);
  p.schedule.fill('work');for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  p.priorities.build=i===0?1:0;world.pawns.push(p);
 }
 addGroundMaterial(world,'wood',5,cells.wood,'wood');
 addGroundMaterial(world,'steel',65,cells.steel,'steel');
 addGroundMaterial(world,'component',2,cells.components,'component');
 addGroundMaterial(world,'food',10,cells.meal,'survival-meal');
 const steel=world.piles.find(p=>p.item==='steel')!,components=world.piles.find(p=>p.item==='component')!;
 steel.forbidden=true;components.forbidden=true;
 refreshStock(world);finalizeInitialWorldRegistry(world);
 return {world,cells,ids:{builderId:world.pawns[0]!.id,otherId:world.pawns[1]?.id,lowSkillId:world.pawns[2]?.id,steelId:steel.id,componentId:components.id},
  preparation:'PRÉPARÉ tick0 : sol plat, vrais adultes nommés et compétences/âge/affections/besoins conservés, seul Alix construit ; 5 bois disponibles, 65 acier et 2 composants interdits, 10 repas. Aucun bâtiment préfabriqué, aucune construction jouée.'};
}

export function advanceDoorOverWall483(w:World,done:()=>boolean,limit=1200,observe?:(w:World)=>void){
 for(let n=0;n<limit&&!done();n++){stepWorld(w);observe?.(w);}
 if(!done())throw Error('V483 real play did not reach boundary: '+JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({id:p.id,state:p.state,jobId:p.jobId,haul:p.haul,need:p.need}))}));
}

/** The reusable checkpoint is obtained by ordinary designation, real walking,
 * finite delivery, frame and work. Its wall is never injected as a Structure. */
export function buildDoorOverWallScenario483(count=2){
 const f=prepareDoorOverWallScenario483(count),w=f.world;
 const result=applyCommand(w,{type:'designate',kind:'wall',material:'wood',...f.cells.wall});if(!result.ok)throw Error(result.reason);
 const wallJobId=w.jobs.find(j=>j.kind==='wall')!.id,observations:{tick:number;phase:string;delivered:number;progress:number}[]=[];
 advanceDoorOverWall483(w,()=>w.structures.some(s=>s.kind==='wall'&&s.x===f.cells.wall.x&&s.z===f.cells.wall.z),1200,()=>{
  const j=w.jobs.find(j=>j.id===wallJobId),p=w.pawns[0]!;
  const phase=p.haul?.destination.type==='job'?'delivery-'+p.haul.phase:j?.construction??'complete';
  if(observations.at(-1)?.phase!==phase||j&&j.progress>0&&observations.at(-1)?.progress===0)observations.push({tick:w.tick,phase,delivered:j?.escrow.wood??0,progress:j?.progress??0});
 });
 const wall=w.structures.find(s=>s.kind==='wall'&&s.x===f.cells.wall.x&&s.z===f.cells.wall.z)!,finishedAt=w.tick;
 if(!observations.some(o=>o.phase.startsWith('delivery-'))||!observations.some(o=>o.phase==='frame'&&o.delivered===5)||!observations.some(o=>o.progress>0)||w.piles.some(p=>p.item==='wood'))throw Error('V483 wall payment/delivery/frame/work provenance incomplete.');
 // Return the original builder by actual mobilisation/travel commands. The
 // later deconstruction therefore has a genuine pre-contact travel boundary.
 const builder=w.pawns[0]!,home={x:10,z:16},returnFrom={x:builder.x,z:builder.z};
 const returnCommands:Command[]=[{type:'draft',pawnIds:[builder.id],enabled:true},{type:'draft-move',pawnIds:[builder.id],target:home,queue:false}];
 for(const command of returnCommands){const r=applyCommand(w,command);if(!r.ok)throw Error(r.reason);}
 advanceDoorOverWall483(w,()=>builder.x===home.x&&builder.z===home.z&&!builder.path.length&&(builder.motion?.end??0)<=w.tick);
 const released=applyCommand(w,{type:'draft',pawnIds:[builder.id],enabled:false});if(!released.ok)throw Error(released.reason);
 return {...f,ids:{...f.ids,wallId:wall.id},played:{wallJobId,finishedAt,readyAt:w.tick,returnTrip:{from:returnFrom,to:home},observations},checkpoint:serializeCampaign(w)};
}

export function copyDoorOverWall483(f:ReturnType<typeof buildDoorOverWallScenario483>){return {...f,world:deserializeWorld(f.checkpoint)};}

export function planDoorOverWall483(f:ReturnType<typeof buildDoorOverWallScenario483>,kind:'door'|'autodoor'='door'){
 const w=f.world,result=applyCommand(w,{type:'designate',kind,material:'steel',...f.cells.wall});if(!result.ok)throw Error(result.reason);
 const job=w.jobs.find(j=>j.kind==='deconstruct'&&j.deconstruction?.structureId===f.ids.wallId)!;
 if(!job?.wallDoor296?.plan)throw Error('V483 paid wall has no independent future plan.');
 return {job,planId:job.wallDoor296.plan.id};
}
