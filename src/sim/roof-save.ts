import { isRoofJob, roofIndex, RoofContext, roofJobWanted, ROOF_WORK_TICKS } from './roof-rules.ts';
import type { World } from './types.ts';

/** Cold primitive frontier, before migration/geometry/runtime authorities. */
export function validNaturalRoofState256(state:unknown,version:number,size:number):boolean {
  if(state&&typeof state==='object'&&Object.hasOwn(state,'natural')){
    const d=Object.getOwnPropertyDescriptor(state,'natural');
    if(version<256||!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object'||Array.isArray(d.value)||Object.getPrototypeOf(d.value)!==Object.prototype||Reflect.ownKeys(d.value).length!==2||!['thin','thick'].every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(d.value,k)??{},'value')))return false;
    for(const cells of [d.value.thin,d.value.thick]){
      if(!Array.isArray(cells)||Reflect.ownKeys(cells).length!==cells.length+1||cells.length>size)return false;
      let previous=-1;for(let n=0;n<cells.length;n++){const cell=Object.getOwnPropertyDescriptor(cells,String(n));
        if(!cell||!Object.hasOwn(cell,'value')||!Number.isSafeInteger(cell.value)||cell.value<0||cell.value>=size||cell.value<=previous)return false;previous=cell.value;}
    }
  }
  return true;
}

export function validateRoofing(world: World, version: number): string[] {
  if(version<35)return world.roofing!==undefined||world.jobs.some(isRoofJob)?['Legacy save contains roofing data.']:[];
  const state=world.roofing, errors:string[]=[];
  if(state===undefined)return world.jobs.some(isRoofJob)?['Roof task without area.']:[];
  if(!state||typeof state!=='object')return ['Invalid roofing state.'];
  const size=world.width*world.height;
  if(!validNaturalRoofState256(state,version,size))return ['Invalid or future natural roofing.'];
  for(const name of ['constructed','build','remove'] as const) {
    const cells=state[name];
    if(!Array.isArray(cells)||cells.length>size||cells.some((i,n)=>!Number.isSafeInteger(i)||i<0||i>=size||n>0&&i<=cells[n-1]!))errors.push('Invalid or unordered roof cells.');
  }
  if(errors.length)return errors;
  if(!Number.isSafeInteger(state.cursor)||state.cursor<0||state.cursor>=Math.max(1,state.build.length+state.remove.length))errors.push('Invalid roofing cursor.');
  const context=new RoofContext(world);
  if(state.remove.some(i=>context.thick.has(i)))errors.push('Cannot designate thick natural roof removal.');
  if(state.build.some(i=>context.remove.has(i)))errors.push('Conflicting roof areas.');
  if(context.roof.size!==state.constructed.length+(state.natural?.thin.length??0)+(state.natural?.thick.length??0))errors.push('Two roof types occupy one cell.');
  if(context.connectedRoofs().size!==context.roof.size)errors.push('Floating roof.');
  if(world.resources.some(r=>r.kind==='tree'&&context.roof.has(roofIndex(world,r))))errors.push('Roof intersects a tree.');
  const jobs=new Set<number>();
  for(const j of world.jobs)if(isRoofJob(j)) {
    const i=roofIndex(world,j);
    if(jobs.has(i)||j.orientation!==0||j.footprint!=='standard'||j.material!==undefined||j.construction!==undefined||j.furniture!==undefined||j.deconstruction!==undefined
      ||j.progress>=ROOF_WORK_TICKS||!roofJobWanted(world,j,context))errors.push('Invalid ceiling work.');
    jobs.add(i);
    if(j.clearance&&(j.kind!=='build-roof'||world.resources.find(r=>r.id===j.clearance!.resourceId)?.kind!=='tree'))errors.push('Invalid roof tree clearance.');
  }
  return errors;
}
