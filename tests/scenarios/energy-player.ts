import { isColonist } from '../../src/sim/affiliation.ts';
import { canDesignate } from '../../src/sim/engine.ts';
import { footprintCells } from '../../src/sim/definitions.ts';
import { requiredMaterial } from '../../src/sim/construction-materials.ts';
import { researchUnlocked } from '../../src/sim/research.ts';
import { isPowerActive } from '../../src/sim/power-rules.ts';
import { batteryWattDays } from '../../src/sim/power-battery.ts';
import { solarPowerOutput } from '../../src/sim/solar-rules.ts';
import { TemperatureView } from '../../src/sim/temperature.ts';
import { blockedCells } from '../../src/sim/pathfinding.ts';
import { queryArea } from '../../src/sim/designation.ts';
import { crashlandedDecisions } from './crashlanded-player.ts';
import { survivorPlan } from './survivor-player.ts';
import type { Decision } from './colony-player.ts';
import type { Cell, DesignateCommand, StructureKind, World, WorkType } from '../../src/sim/types.ts';

export type EnergyStage='construct'|'night'|'open'|'close'|'remove'|'rebuild'|'done';
/** Player notebook, saved separately from World. Only observations advance it. */
export interface EnergyPlayerState {startTick:number;origin:Cell;stage:EnergyStage;stageTick:number;initialSteel:number;initialComponents:number;milestones:Record<string,number>;nightDrainTicks:number;previousBattery:number;electricMeals:number}
const at=(a:Cell,x:number,z:number):Cell=>({x:a.x+x,z:a.z+z});
export const energyPlan=(s:Pick<EnergyPlayerState,'origin'>)=>({origin:s.origin,cooler:at(s.origin,2,0),door:at(s.origin,4,2),bench:at(s.origin,2,9),labDoor:at(s.origin,4,9),stove:at(s.origin,7,2),generator:at(s.origin,14,1),solar:at(s.origin,14,5),battery:at(s.origin,14,9),switch:at(s.origin,10,5),cut:at(s.origin,11,5),coldCell:at(s.origin,2,2)});
export function metalAccount(w:World,item:'steel'|'component'):number {
  return w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)+w.structures.reduce((n,s)=>n+requiredMaterial(s,item),0)+w.packed.reduce((n,p)=>n+requiredMaterial(p.building,item),0)+(w.destroyed?.lost[item]??0)+(item==='steel'?w.deconstructed.lostSteel??0:w.deconstructed.lostComponents??0);
}
export function newEnergyPlayer(w:World):EnergyPlayerState {
  const camp=survivorPlan(w,true).anchor,occupied=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.stockpiles,...w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[])].map(c=>c.z*w.width+c.x));
  for(const zone of w.growingZones)for(const i of zone.cells)occupied.add(i);
  const candidates:Cell[]=[];
  for(let z=Math.max(2,camp.z-32);z<Math.min(w.height-14,camp.z+30);z++)for(let x=Math.max(2,camp.x-32);x<Math.min(w.width-20,camp.x+30);x++)candidates.push({x,z});
  candidates.sort((a,b)=>(a.x+6-camp.x)**2+(a.z+3-camp.z)**2-((b.x+6-camp.x)**2+(b.z+3-camp.z)**2)||a.z-b.z||a.x-b.x);
  const origin=candidates.find(a=>{for(let dz=-1;dz<13;dz++)for(let dx=-1;dx<19;dx++){const i=(a.z+dz)*w.width+a.x+dx,t=w.tiles[i]!;if(occupied.has(i)||t.terrain==='rock'||t.terrain==='water')return false;}return true;});
  if(!origin)throw Error('No ordinary 19×14 energy extension beside the existing colony; inspect the reached map.');
  return {startTick:w.tick,origin,stage:'construct',stageTick:w.tick,initialSteel:metalAccount(w,'steel'),initialComponents:metalAccount(w,'component'),milestones:{},nightDrainTicks:0,previousBattery:0,electricMeals:0};
}
export function energySummary(w:World,s:EnergyPlayerState) {
  const p=energyPlan(s),find=(kind:StructureKind,c:Cell)=>w.structures.find(q=>q.kind===kind&&q.x===c.x&&q.z===c.z),battery=find('battery',p.battery),solar=find('solar-generator',p.solar),cooler=find('cooler',p.cooler),stove=find('electric-stove',p.stove),generator=find('wood-generator',p.generator),sw=find('power-switch',p.switch);
  const coldCells=new Set<number>();for(let dz=1;dz<4;dz++)for(let dx=1;dx<4;dx++)coldCells.add((s.origin.z+dz)*w.width+s.origin.x+dx);
  return {tick:w.tick,stage:s.stage,origin:s.origin,research:w.research,batteryWd:battery?.battery?batteryWattDays(battery.battery):0,solarWatts:solar?solarPowerOutput(w,solar):0,
    batteryId:battery?.id,solarId:solar?.id,generatorId:generator?.id,generatorOn:generator?.power?.switchOn!==false,switchId:sw?.id,switchOn:sw?.power?.switchOn!==false,stoveId:stove?.id,stovePowered:!!stove&&isPowerActive(stove),coolerId:cooler?.id,coolerPowered:!!cooler&&isPowerActive(cooler),coldTemperature:new TemperatureView(w).at(w,p.coldCell),
    coldFood:w.piles.filter(q=>q.kind==='food'&&q.owner.type==='ground'&&coldCells.has(q.owner.z*w.width+q.owner.x)).map(q=>({id:q.id,item:q.item,quantity:q.quantity,rot:q.rot})),
    cablePresent:!!find('power-conduit',p.cut),conduits:w.structures.filter(q=>q.kind==='power-conduit').length,metals:{steel:metalAccount(w,'steel'),component:metalAccount(w,'component')},pawns:w.pawns.filter(isColonist).map(p=>({id:p.id,name:p.name,state:p.state,hunger:p.hunger,rest:p.rest,priorities:p.priorities,research:p.research})),jobs:w.jobs.map(j=>({id:j.id,kind:j.kind,x:j.x,z:j.z,progress:j.progress,reservedBy:j.reservedBy}))};
}
/** Observe every tick: short transitions, cold stock and night drain are not
 * inferred from a broad day checkpoint. No state in the game is changed. */
export function observeEnergy(w:World,s:EnergyPlayerState):void {
  const p=energyPlan(s),battery=w.structures.find(q=>q.kind==='battery'&&q.x===p.battery.x&&q.z===p.battery.z),solar=w.structures.find(q=>q.kind==='solar-generator'&&q.x===p.solar.x&&q.z===p.solar.z),stored=battery?.battery?batteryWattDays(battery.battery):0;
  const cooler=w.structures.find(q=>q.kind==='cooler'&&q.x===p.cooler.x&&q.z===p.cooler.z),stove=w.structures.find(q=>q.kind==='electric-stove'&&q.x===p.stove.x&&q.z===p.stove.z),gen=w.structures.find(q=>q.kind==='wood-generator'&&q.x===p.generator.x&&q.z===p.generator.z),sw=w.structures.find(q=>q.kind==='power-switch'&&q.x===p.switch.x&&q.z===p.switch.z);
  const record=(key:string,yes:boolean)=>{if(yes&&s.milestones[key]===undefined)s.milestones[key]=w.tick;};
  record('batteriesResearch',researchUnlocked(w,'batteries'));record('solarResearch',researchUnlocked(w,'solar-power'));record('charged500Wd',stored>=500);
  if(s.stage==='night'&&gen?.power?.switchOn===false&&solar&&solarPowerOutput(w,solar)===0&&stored<s.previousBattery&&!!cooler&&isPowerActive(cooler)&&!!stove&&isPowerActive(stove))s.nightDrainTicks++;
  record('nightSupply',s.nightDrainTicks>=120);s.previousBattery=stored;
  if(w.tick%50===0){const a=energySummary(w,s);record('frozenFood',a.coldTemperature<=0&&a.coldFood.some(q=>q.quantity>0&&q.rot?.rate===0));}
  const next=(stage:EnergyStage)=>{s.stage=stage;s.stageTick=w.tick;};
  if(s.stage==='construct'&&s.milestones.charged500Wd&&s.milestones.solarResearch&&cooler&&stove&&sw&&isPowerActive(cooler)&&isPowerActive(stove)&&s.electricMeals>0)next('night');
  else if(s.stage==='night'&&s.milestones.nightSupply)next('open');
  else if(s.stage==='open'&&sw?.power?.switchOn===false&&cooler&&!isPowerActive(cooler)&&stove&&!isPowerActive(stove)){record('switchCut',true);if(w.tick-s.milestones.switchCut!>=120)next('close');}
  else if(s.stage==='close'&&sw?.power?.switchOn!==false&&cooler&&isPowerActive(cooler)&&stove&&isPowerActive(stove)){record('switchRestored',true);next('remove');}
  else if(s.stage==='remove'&&!w.structures.some(q=>q.kind==='power-conduit'&&q.x===p.cut.x&&q.z===p.cut.z)&&cooler&&!isPowerActive(cooler)&&stove&&!isPowerActive(stove)){record('cableCut',true);if(w.tick-s.milestones.cableCut!>=120)next('rebuild');}
  else if(s.stage==='rebuild'&&w.structures.some(q=>q.kind==='power-conduit'&&q.x===p.cut.x&&q.z===p.cut.z)&&cooler&&isPowerActive(cooler)&&stove&&isPowerActive(stove)){record('cableRestored',true);next('done');}
}
export function energyDecisions(w:World,s:EnergyPlayerState):Decision[] {
  const base=crashlandedDecisions(w);
  if(w.raids?.active||w.pawns.some(p=>p.draft)||base.some(d=>d.command.type.startsWith('order-tend')||d.command.type==='order-feed'||d.command.type==='order-rescue'))return base;
  const out=base.filter(d=>d.command.type!=='priority'),p=energyPlan(s),colonists=w.pawns.filter(isColonist),builder=colonists.reduce((a,b)=>a.skills.construction.level>=b.skills.construction.level?a:b),cook=colonists.reduce((a,b)=>(a.skills.cooking?.level??0)>=(b.skills.cooking?.level??0)?a:b),grower=colonists.find(q=>q!==builder&&q!==cook)!;
  const priority=(id:number,work:WorkType,value:number)=>{if(w.pawns.find(p=>p.id===id)!.priorities[work]!==value)out.push({reason:'Conserver cuisine, potager et soins ; faire la recherche entre les repas et extraire les matériaux nécessaires.',command:{type:'priority',pawnId:id,work,value}});};
  for(const pawn of colonists)for(const [work,value] of Object.entries({build:pawn===builder?1:3,cook:pawn===cook?1:3,grow:pawn===grower?1:3,haul:2,gather:2,mine:pawn===builder?1:3,basic:1,research:pawn===cook?1:0}) as [WorkType,number][])priority(pawn.id,work,value);
  const designate=(kind:DesignateCommand['kind'],cell:Cell,material:'steel'|'wood'='steel')=>{const command:DesignateCommand={type:'designate',kind,...cell,material,orientation:0};if(canDesignate(w,command).ok)out.push({reason:'Construire l’extension énergétique avec ses vrais matériaux et accès.',command});};
  const find=(kind:StructureKind,c:Cell)=>w.structures.find(q=>q.kind===kind&&q.x===c.x&&q.z===c.z);
  designate('research-bench',p.bench,'wood');
  for(const project of ['batteries','solar-power'] as const)if(!researchUnlocked(w,project)){if(w.research?.project!==project)out.push({reason:'Rechercher les prérequis énergétiques au bureau ordinaire.',command:{type:'research-project',project}});break;}
  // A visible face can still belong to an enclosed pocket. This short-lived
  // flood proves an approach from the colonists before requesting excavation.
  let accessible:Uint8Array|undefined;
  const surface=()=>{if(accessible)return accessible;const blocked=blockedCells(w),seen=new Uint8Array(w.tiles.length),queue=colonists.map(q=>q.z*w.width+q.x);for(const i of queue)seen[i]=1;for(let k=0;k<queue.length;k++){const i=queue[k]!,x=i%w.width;for(const n of [x>0?i-1:-1,x+1<w.width?i+1:-1,i>=w.width?i-w.width:-1,i+w.width<w.tiles.length?i+w.width:-1])if(n>=0&&!seen[n]&&!blocked[n]){seen[n]=1;queue.push(n);}}return accessible=seen;};
  // Exposed veins only; successive faces become available after real mining.
  for(const [ore,item,target] of [['steel','steel',s.initialSteel+240],['machinery','component',s.initialComponents+2]] as const){
    const pending=w.jobs.filter(j=>j.kind==='mine'&&w.tiles[j.z*w.width+j.x]!.ore===ore).length;
    if(metalAccount(w,item)>=target||pending>=2)continue;
    const seen=surface(),candidates=w.tiles.flatMap((tile,i)=>tile.ore===ore?[{x:i%w.width,z:Math.floor(i/w.width)}]:[]).filter(c=>[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dz])=>{const x=c.x+dx!,z=c.z+dz!;return x>=0&&x<w.width&&z>=0&&z<w.height&&seen[z*w.width+x]===1;})).sort((a,b)=>(a.x-p.origin.x)**2+(a.z-p.origin.z)**2-((b.x-p.origin.x)**2+(b.z-p.origin.z)**2)||a.z-b.z||a.x-b.x);
    let left=2-pending;for(const c of candidates){const command:DesignateCommand={type:'designate',kind:'mine',...c};if(canDesignate(w,command).ok){out.push({reason:'Extraire physiquement acier et composants des filons exposés.',command});if(!--left)break;}}
  }
  // Two ordinary enclosed rooms, one for food and one for the research bench.
  for(const dz of [0,7]){
    for(let z=0;z<5;z++)for(let x=0;x<5;x++)if(x===0||z===0||x===4||z===4){const c=at(p.origin,x,dz+z),kind=dz===0&&x===2&&z===0?'cooler':x===4&&z===(dz===0?2:2)?'door':'wall';designate(kind,c,kind==='cooler'?'steel':'wood');}
    const boundary=w.structures.filter(q=>q.x>=p.origin.x&&q.x<=p.origin.x+4&&q.z>=p.origin.z+dz&&q.z<=p.origin.z+dz+4&&['wall','door','cooler'].includes(q.kind));
    if(boundary.length===16){const from=at(p.origin,0,dz),to=at(p.origin,4,dz+4),roof=new Set(w.roofing?.build),home=new Set(w.home);if(Array.from({length:25},(_,i)=>(from.z+Math.floor(i/5))*w.width+from.x+i%5).some(i=>!roof.has(i)))out.push({reason:'Couvrir la chambre froide et le bureau après construction des supports.',command:{type:'area',action:'build-roof',from,to}});if(!home.has(from.z*w.width+from.x))out.push({reason:'Entretenir les murs de l’extension.',command:{type:'area',action:'home',from,to}});}
  }
  // Zone painting skips a tree instead of clearing it. Clear the interior by
  // ordinary work, then extend only over newly admissible cells; a missing
  // centre cell is not evidence that the whole rectangle is still unpainted.
  for(const tree of w.resources.filter(r=>r.kind==='tree'&&r.x>p.origin.x&&r.x<p.origin.x+4&&r.z>p.origin.z&&r.z<p.origin.z+4)){
    const command:DesignateCommand={type:'designate',kind:'chop',x:tree.x,z:tree.z};
    if(canDesignate(w,command).ok)out.push({reason:'Dégager physiquement l’intérieur de la future réserve froide.',command});
  }
  const storage={type:'area' as const,action:'stockpile' as const,from:at(p.origin,1,1),to:at(p.origin,3,3),filters:{wood:false,food:true},priority:4,capacity:75},query=queryArea(w,storage);
  if(query.ok&&query.cells.length)out.push({reason:'Ranger prioritairement les denrées dans les cellules libres de la chambre froide.',command:storage});
  designate('wood-generator',p.generator);designate('electric-stove',p.stove);designate('power-switch',p.switch);
  if(researchUnlocked(w,'batteries'))designate('battery',p.battery);
  if(researchUnlocked(w,'solar-power'))designate('solar-generator',p.solar);
  for(let x=5;x<14;x++)if(x!==10&&!(x===11&&s.stage==='remove'))designate('power-conduit',at(p.origin,x,5));
  for(const dz of [3,4])designate('power-conduit',at(p.origin,14,dz));
  const gen=find('wood-generator',p.generator),sw=find('power-switch',p.switch),cooler=find('cooler',p.cooler),stove=find('electric-stove',p.stove);
  if(cooler&&cooler.cooler?.target!==-5)out.push({reason:'Conserver les aliments sous zéro sans modifier leurs âges.',command:{type:'cooler-target',structureId:cooler.id,target:-5}});
  if(stove&&!stove.bills?.length)out.push({reason:'Ajouter les repas simples au poste électrique.',command:{type:'bill-add',structureId:stove.id,recipe:'simple-meal'}});
  const bill=stove?.bills?.[0];if(stove&&bill&&(bill.mode!=='until'||bill.target!==9||bill.radius!==60))out.push({reason:'Maintenir neuf repas avec les récoltes existantes, dans la réserve froide.',command:{type:'bill-update',structureId:stove.id,billId:bill.id,settings:{mode:'until',target:9,suspended:false,radius:60,filters:{rice:true,berries:true,potato:true,corn:true,'hare-meat':true},destination:'stockpile'}}});
  const powered=!!stove&&isPowerActive(stove);for(const wood of w.structures.filter(q=>q.kind==='fueled-stove'))for(const b of wood.bills??[])if(b.suspended!==powered)out.push({reason:powered?'Utiliser le poste électrique et conserver la cuisine au bois comme secours.':'Rétablir la cuisine au bois pendant la coupure.',command:{type:'bill-update',structureId:wood.id,billId:b.id,settings:{mode:b.mode,target:b.target,filters:{...b.filters},radius:b.radius,destination:b.destination,suspended:powered}}});
  const flick=(id:number,on:boolean)=>{const q=w.structures.find(q=>q.id===id)!;if((q.power?.switchOn!==false)!==on&&!w.jobs.some(j=>j.flick?.structureId===id))out.push({reason:'Faire actionner physiquement l’interrupteur par un colon.',command:{type:'power-flick',structureId:id,on}});};
  if(gen&&s.stage!=='construct')flick(gen.id,false);
  if(sw)flick(sw.id,s.stage!=='open');
  if(s.stage==='remove'){const cable=find('power-conduit',p.cut);if(cable&&!w.jobs.some(j=>j.deconstruction?.structureId===cable.id)){const command:DesignateCommand={type:'designate',kind:'deconstruct',...p.cut,targetId:cable.id};if(canDesignate(w,command).ok)out.push({reason:'Retirer précisément le conduit du pont, puis le reconstruire après observation de la panne.',command});}}
  return out;
}
