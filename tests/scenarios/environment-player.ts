import { isColonist } from '../../src/sim/affiliation.ts';
import { canDesignate } from '../../src/sim/engine.ts';
import { footprintCells,STRUCTURE_DEFINITIONS } from '../../src/sim/definitions.ts';
import { deliveredMaterial,requiredMaterial } from '../../src/sim/construction-materials.ts';
import { isPowerActive } from '../../src/sim/power-rules.ts';
import { isPowerTransmitter } from '../../src/sim/power-grid.ts';
import { batteryWattDays } from '../../src/sim/power-battery.ts';
import { outdoorTemperature,thermalLayout,TemperatureView } from '../../src/sim/temperature.ts';
import { annualNaturalLight } from '../../src/sim/environment.ts';
import { climateDate,climateTick } from '../../src/sim/site-climate.ts';
import { isPlant,plantGrowth,plantTemperatureFactor } from '../../src/sim/plants.ts';
import { isGrowingTerrain } from '../../src/sim/soil.ts';
import { windClearance,windObstructions } from '../../src/sim/wind-rules.ts';
import { blockedCells } from '../../src/sim/pathfinding.ts';
import { captureStandability } from '../../src/sim/furniture-travel.ts';
import { queryArea } from '../../src/sim/designation.ts';
import { prisonDecisions,prisonWoodDecisions,type PrisonPlayerState } from './prison-player.ts';
import { energyPlan } from './energy-player.ts';
import type { Decision } from './colony-player.ts';
import type { Cell,DesignateCommand,StructureKind,World } from '../../src/sim/types.ts';

/** A player's saved notebook, never authoritative environmental state. */
export interface EnvironmentPlayerState {
  startTick:number;initialPeople:number[];prison:PrisonPlayerState;
  turbine:Cell;heaters:Cell[];wire:Cell[];field:{from:Cell;to:Cell};
  milestones:Record<string,number>;coldTicks:number;heatedTicks:number;windTicks:number;
  nightBatteryTicks:number;previousBattery:number;winterMeals:number;springHarvested:number;
  outdoorMin:number;outdoorMax:number;lowestFood:number;
  wiringRevision?:2;dormitoryBypass?:boolean;
}
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
const distance=(a:Cell,b:Cell)=>(a.x-b.x)**2+(a.z-b.z)**2;
const at=(a:Cell,x:number,z:number):Cell=>({x:a.x+x,z:a.z+z});
const existing=(w:World,kind:StructureKind,cell:Cell)=>w.structures.find(s=>s.kind===kind&&same(s,cell));

/** Only ordinary conductor cells; solid rock and water are not a free tunnel. */
function wireRoute(w:World,from:Cell,to:Cell):Cell[]|undefined {
  const origin=from.z*w.width+from.x,target=to.z*w.width+to.x,parents=new Int32Array(w.tiles.length);parents.fill(-2);parents[origin]=-1;
  const stand=captureStandability(w),conductors=new Set(w.structures.filter(s=>isPowerTransmitter(s.kind)).flatMap(footprintCells).map(c=>c.z*w.width+c.x)),bodies=new Set(w.pawns.filter(p=>p.state==='dead').map(p=>p.z*w.width+p.x));
  const service=(i:number)=>conductors.has(i)||!bodies.has(i)&&[{x:i%w.width-1,z:Math.floor(i/w.width)},{x:i%w.width+1,z:Math.floor(i/w.width)},{x:i%w.width,z:Math.floor(i/w.width)-1},{x:i%w.width,z:Math.floor(i/w.width)+1}].some(stand);
  const queue=[origin];
  for(let head=0;head<queue.length&&parents[target]===-2;head++){
    const i=queue[head]!,x=i%w.width,z=Math.floor(i/w.width);
    for(const n of [x>0?i-1:-1,x+1<w.width?i+1:-1,z>0?i-w.width:-1,z+1<w.height?i+w.width:-1]){
      if(n<0||parents[n]!==-2||['water','rock'].includes(w.tiles[n]!.terrain)||!service(n))continue;
      parents[n]=i;queue.push(n);
    }
  }
  if(parents[target]===-2)return;
  const cells:Cell[]=[];for(let i=target;i!==origin;i=parents[i]!)cells.push({x:i%w.width,z:Math.floor(i/w.width)});
  cells.push(from);return cells.reverse();
}

export function newEnvironmentPlayer(w:World,prison:PrisonPlayerState):EnvironmentPlayerState {
  if(!prison.milestones.recruited||!prison.milestones.colonistBed)throw Error('The environment journey requires the completed real V86 recruitment.');
  const layout=thermalLayout(w),occupied=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells)].map(c=>c.z*w.width+c.x));
  const anchor=prison.campAnchor,dormCells=Array.from({length:9},(_,i)=>(anchor.z+1+Math.floor(i/3))*w.width+anchor.x+1+i%3);
  const beds=w.structures.filter(s=>s.kind==='bed'&&!s.prisoner),rooms=[...new Set(beds.filter(b=>!dormCells.includes(b.z*w.width+b.x)).map(s=>layout.indices[s.z*w.width+s.x]!).filter(id=>id>=0))];
  // The reached V86 dormitory has two ordinary wall jobs left after a raid.
  // Place within its already known plan; actual heating still requires their
  // physical completion, tested later from the real thermal state.
  const heaters=[dormCells,...rooms.map(id=>layout.rooms[id]!.cells)].map(cells=>{
    const cell=cells.find(i=>!occupied.has(i)&&canDesignate(w,{type:'designate',kind:'heater',x:i%w.width,z:Math.floor(i/w.width),material:'steel'}).ok);
    if(cell===undefined)throw Error('A reached bedroom has no ordinary heater placement; inspect the actual room.');
    occupied.add(cell);return {x:cell%w.width,z:Math.floor(cell/w.width)};
  });
  if(heaters.length<2)throw Error('The V86 dormitory and recruited person’s bedroom must both remain available.');
  const sources=w.structures.filter(s=>isPowerTransmitter(s.kind)).flatMap(footprintCells);
  const cableTo=(cell:Cell)=>{
    for(const source of [...sources].sort((a,b)=>distance(a,cell)-distance(b,cell))) {const path=wireRoute(w,cell,source);if(path)return path;}
    throw Error('No ordinary conductor route to the existing network.');
  };
  const zoneCells=new Set(w.growingZones.flatMap(z=>z.cells)),roofs=new Set(w.roofing?.constructed??[]),centre=energyPlan(prison.energy).solar,candidates:Cell[]=[];
  for(let z=Math.max(7,centre.z-30);z<Math.min(w.height-12,centre.z+31);z++)for(let x=Math.max(4,centre.x-30);x<Math.min(w.width-4,centre.x+31);x++)candidates.push({x,z});
  candidates.sort((a,b)=>distance(a,centre)-distance(b,centre)||a.z-b.z||a.x-b.x);
  const turbine=candidates.find(c=>{
    const shape={...c,kind:'wind-turbine' as const,orientation:0 as const};
    return [...footprintCells(shape),...windClearance(shape)].every(q=>{
      const i=q.z*w.width+q.x;return !occupied.has(i)&&!zoneCells.has(i)&&!roofs.has(i)&&!['water','rock'].includes(w.tiles[i]!.terrain);
    })&&canDesignate(w,{type:'designate',...shape,material:'steel'}).ok;
  });
  if(!turbine)throw Error('No free wind corridor near the real network; diagnose the reached terrain instead of clearing it by injection.');
  for(const c of [...footprintCells({...turbine,kind:'wind-turbine'}),...windClearance(turbine)])occupied.add(c.z*w.width+c.x);
  for(const c of w.stockpiles)occupied.add(c.z*w.width+c.x);
  for(const i of zoneCells)occupied.add(i);
  const fieldCandidates:Cell[]=[];
  for(let z=Math.max(1,anchor.z-30);z<Math.min(w.height-10,anchor.z+31);z++)for(let x=Math.max(1,anchor.x-30);x<Math.min(w.width-8,anchor.x+31);x++)fieldCandidates.push({x,z});
  fieldCandidates.sort((a,b)=>distance(a,anchor)-distance(b,anchor)||a.z-b.z||a.x-b.x);
  const fieldOrigin=fieldCandidates.find(a=>{
    for(let dz=0;dz<10;dz++)for(let dx=0;dx<8;dx++){const i=(a.z+dz)*w.width+a.x+dx;if(occupied.has(i)||roofs.has(i)||!isGrowingTerrain(w.tiles[i]!.terrain))return false;}
    return true;
  });
  if(!fieldOrigin)throw Error('No additional ordinary eight-by-ten field near the colony.');
  const byCell=new Map<number,Cell>();for(const c of [turbine,...heaters].flatMap(cableTo))byCell.set(c.z*w.width+c.x,c);
  return {startTick:w.tick,initialPeople:w.pawns.filter(p=>isColonist(p)&&p.state!=='dead').map(p=>p.id),prison:structuredClone(prison),
    turbine,heaters,wire:[...byCell.values()],wiringRevision:2,field:{from:fieldOrigin,to:at(fieldOrigin,7,9)},milestones:{},coldTicks:0,heatedTicks:0,windTicks:0,nightBatteryTicks:0,previousBattery:0,winterMeals:0,springHarvested:0,outdoorMin:outdoorTemperature(w),outdoorMax:outdoorTemperature(w),lowestFood:w.piles.filter(p=>p.kind==='food').reduce((n,p)=>n+p.quantity,0)};
}

function miningDecisions(w:World,s:EnvironmentPlayerState,planned:Decision[]):Decision[] {
  const pending=[...w.jobs.filter(j=>j.kind in STRUCTURE_DEFINITIONS),...planned.flatMap(d=>d.command.type==='designate'&&d.command.kind in STRUCTURE_DEFINITIONS?[d.command]:[])];
  const needed=(item:'steel'|'component')=>pending.reduce((n,j)=>n+Math.max(0,requiredMaterial(j,item)-('escrow' in j?deliveredMaterial(w,j,item):0)),0)+(item==='steel'?40:2);
  const stock=(item:'steel'|'component')=>w.piles.filter(p=>p.item===item&&(p.owner.type==='ground'||p.owner.type==='pawn')).reduce((n,p)=>n+p.quantity,0);
  const requests=(['steel','component'] as const).filter(item=>stock(item)<needed(item));if(!requests.length)return [];
  const blocked=blockedCells(w),seen=new Uint8Array(w.tiles.length),queue=w.pawns.filter(p=>isColonist(p)&&p.state!=='dead'&&p.state!=='downed').map(p=>p.z*w.width+p.x);
  for(const i of queue)seen[i]=1;
  for(let head=0;head<queue.length;head++){const i=queue[head]!,x=i%w.width;for(const n of [x>0?i-1:-1,x+1<w.width?i+1:-1,i>=w.width?i-w.width:-1,i+w.width<w.tiles.length?i+w.width:-1])if(n>=0&&!seen[n]&&!blocked[n]){seen[n]=1;queue.push(n);}}
  const out:Decision[]=[];
  for(const item of requests){
    const ore=item==='steel'?'steel':'machinery',active=w.jobs.filter(j=>j.kind==='mine'&&w.tiles[j.z*w.width+j.x]!.ore===ore).length;if(active>=2)continue;
    const candidates=w.tiles.flatMap((t,i)=>t.ore===ore?[i]:[]).filter(i=>[i%w.width>0?i-1:-1,i%w.width+1<w.width?i+1:-1,i-w.width,i+w.width].some(n=>n>=0&&n<w.tiles.length&&seen[n]));
    candidates.sort((a,b)=>distance({x:a%w.width,z:Math.floor(a/w.width)},s.prison.campAnchor)-distance({x:b%w.width,z:Math.floor(b/w.width)},s.prison.campAnchor)||a-b);
    let left=2-active;for(const i of candidates){const command:DesignateCommand={type:'designate',kind:'mine',x:i%w.width,z:Math.floor(i/w.width)};
      if(canDesignate(w,command).ok){out.push({reason:'Extraire les matériaux visibles et accessibles manquant aux nouvelles installations.',command});if(!--left)break;}
    }
  }return out;
}

/** Current stocks, weather, people and power only. No future weather or raid
 * deadline is consulted, and no temperature/growth/resistance is changed. */
export function environmentDecisions(w:World,s:EnvironmentPlayerState):Decision[] {
  if(!w.climate)return [{reason:'Activer explicitement le climat annuel sur la colonie V86 conservée, sans inventer son passé.',command:{type:'climate-adopt'}}];
  const original=prisonDecisions(w,s.prison);
  if(w.raids?.active||w.pawns.some(p=>p.draft)||original.some(d=>['order-rescue','order-tend','order-feed'].includes(d.command.type)))return original;
  // A resumed notebook may contain the first route through an inaccessible bed
  // foot. Replan only its cable intent, never buildings or materials in World.
  const obsoleteWire:Cell[]=[];
  if(s.wiringRevision!==2){
    const solar=existing(w,'solar-generator',energyPlan(s.prison.energy).solar);if(!solar)throw Error('The reached solar source must exist before reconnecting the heater network.');
    const cells=new Map<number,Cell>();
    for(const from of [s.turbine,...s.heaters]){
      let route:Cell[]|undefined;for(const to of footprintCells(solar).sort((a,b)=>distance(a,from)-distance(b,from))){route=wireRoute(w,from,to);if(route)break;}
      if(!route)throw Error('No cable route with physical construction service around the reached obstacles.');
      for(const c of route)cells.set(c.z*w.width+c.x,c);
    }
    for(const c of s.wire)if(!cells.has(c.z*w.width+c.x))obsoleteWire.push(c);
    s.wire=[...cells.values()];s.wiringRevision=2;
  }
  const generator=existing(w,'wood-generator',energyPlan(s.prison.energy).generator);
  const anchor=s.prison.campAnchor,breaches=[at(anchor,0,1),at(anchor,0,2)];
  if(breaches.every(c=>w.pawns.some(p=>p.state==='dead'&&same(p,c))))s.dormitoryBypass=true;
  const out=original.filter(d=>!(d.command.type==='power-flick'&&d.command.structureId===generator?.id)&&!(s.dormitoryBypass&&d.command.type==='designate'&&d.command.kind==='wall'&&breaches.some(c=>same(c,d.command as Cell))));
  for(const c of obsoleteWire)if(w.jobs.some(j=>j.kind==='power-conduit'&&same(j,c)))out.push({reason:'Annuler le câble sans place de travail et le contourner physiquement.',command:{type:'cancel',...c}});
  if(s.dormitoryBypass){
    for(const c of breaches)if(w.jobs.some(j=>j.kind==='wall'&&same(j,c)))out.push({reason:'Conserver les corps sur place et déplacer le plan de fermeture autour d’eux.',command:{type:'cancel',...c}});
    for(let dz=0;dz<4;dz++){
      const c=at(anchor,-1,dz),command:DesignateCommand={type:'designate',kind:'wall',...c,material:'wood',orientation:0};
      if(canDesignate(w,command).ok)out.push({reason:'Refermer réellement le dortoir en contournant les corps humains actuellement non transportables.',command});
    }
    const from=at(anchor,-1,0),to=at(anchor,0,3),covered=new Set(w.roofing?.constructed??[]),requested=new Set(w.roofing?.build??[]);
    if(Array.from({length:8},(_,i)=>(from.z+Math.floor(i/2))*w.width+from.x+i%2).some(i=>!covered.has(i)&&!requested.has(i)))out.push({reason:'Couvrir la petite extension une fois ses supports construits.',command:{type:'area',action:'build-roof',from,to}});
    if(Array.from({length:8},(_,i)=>(from.z+Math.floor(i/2))*w.width+from.x+i%2).some(i=>!(w.home??[]).includes(i)))out.push({reason:'Protéger et entretenir la fermeture agrandie du dortoir.',command:{type:'area',action:'home',from,to}});
  }
  for(const p of w.pawns.filter(isColonist))if(p.priorities.firefight!==1)out.push({reason:'Garder l’extinction prioritaire dans le foyer habité.',command:{type:'priority',pawnId:p.id,work:'firefight',value:1}});
  const queued=new Set(out.flatMap(d=>d.command.type==='designate'?[`${d.command.kind}:${d.command.x}:${d.command.z}`]:[]));
  const designate=(kind:DesignateCommand['kind'],cell:Cell)=>{const command:DesignateCommand={type:'designate',kind,x:cell.x,z:cell.z,...(kind in STRUCTURE_DEFINITIONS?{material:'steel' as const,orientation:0 as const}:{})},key=`${kind}:${cell.x}:${cell.z}`;
    if(!queued.has(key)&&canDesignate(w,command).ok){queued.add(key);out.push({reason:'Construire et raccorder le chauffage et l’éolienne avec les matériaux de la colonie.',command});}
  };
  designate('wind-turbine',s.turbine);for(const c of s.heaters)designate('heater',c);
  const plannedDevices=footprintCells({...s.turbine,kind:'wind-turbine'});
  for(const c of s.wire)if(!plannedDevices.some(p=>same(p,c))&&!w.structures.some(q=>isPowerTransmitter(q.kind)&&footprintCells(q).some(p=>same(p,c))))designate('power-conduit',c);
  const turbine=existing(w,'wind-turbine',s.turbine);if(turbine&&!turbine.wind?.autoCut)out.push({reason:'Entretenir le passage du vent par de vrais travaux de coupe.',command:{type:'wind-auto-cut',structureId:turbine.id,enabled:true}});
  const homeCells=[...s.heaters,...s.wire,...footprintCells({...s.turbine,kind:'wind-turbine'})];
  const home=new Set(w.home);for(const cell of homeCells)if(!home.has(cell.z*w.width+cell.x)){home.add(cell.z*w.width+cell.x);out.push({reason:'Inclure les nouveaux appareils et câbles dans le foyer à réparer et protéger du feu.',command:{type:'area',action:'home',from:cell,to:cell}});}
  const field=s.field;
  for(const tree of w.resources.filter(r=>r.kind==='tree'&&r.x>=field.from.x&&r.x<=field.to.x&&r.z>=field.from.z&&r.z<=field.to.z))designate('chop',tree);
  const grow={type:'area' as const,action:'growing' as const,...field},query=queryArea(w,grow);if(query.ok&&query.cells.length)out.push({reason:'Augmenter les semis de riz pour préparer les réserves des quatre habitants.',command:grow});
  const stored=w.structures.filter(q=>q.battery).reduce((n,q)=>n+batteryWattDays(q.battery!),0);
  if(generator&&!w.jobs.some(j=>j.flick?.structureId===generator.id)){
    const on=generator.power?.switchOn!==false,wanted=stored<120?true:stored>450?false:on;
    if(wanted!==on)out.push({reason:wanted?'Démarrer physiquement le générateur de secours avant épuisement de la batterie.':'Économiser le bois quand les réserves électriques sont reconstituées.',command:{type:'power-flick',structureId:generator.id,on:wanted}});
  }
  out.push(...miningDecisions(w,s,out),...prisonWoodDecisions(w,s.prison.campAnchor,out));
  const last=new Map<string,Decision>(),plain:Decision[]=[];
  for(const d of out){const c=d.command;if(c.type==='priority')last.set(`priority:${c.pawnId}:${c.work}`,d);else if(c.type==='designate')last.set(`designate:${c.kind}:${c.x}:${c.z}`,d);else plain.push(d);}
  return [...last.values(),...plain];
}

export function observeEnvironment(w:World,s:EnvironmentPlayerState):void {
  if(!w.climate)return;
  const outside=outdoorTemperature(w);s.outdoorMin=Math.min(s.outdoorMin,outside);s.outdoorMax=Math.max(s.outdoorMax,outside);
  const mark=(key:string,value:boolean)=>{if(value)s.milestones[key]??=w.tick;};
  const phase=climateTick(w)%360000/6000;mark('winter',phase>=45);mark('springReturn',s.milestones.winter!==undefined&&phase<15);
  if(outside<6&&plantTemperatureFactor(outside)<1){s.coldTicks++;mark('growthSlowed',true);mark('winterGrowthSlowed',phase>=45&&w.resources.some(isPlant));}
  mark('sowingColdBoundary',outside<=0);
  const heaters=s.heaters.flatMap(c=>{const q=existing(w,'heater',c);return q?[q]:[];}),view=new TemperatureView(w);
  if(heaters.length===s.heaters.length&&heaters.every(h=>isPowerActive(h))&&heaters.some(h=>h.heater?.high)&&heaters.every(h=>view.at(w,h)>=16&&view.at(w,h)>outside+2)){s.heatedTicks++;mark('winterHeating',phase>=45);}
  mark('heatedHome',s.heatedTicks>=120);
  const turbine=existing(w,'wind-turbine',s.turbine);if(turbine&&isPowerActive(turbine)&&(turbine.wind?.cachedWatts??0)>0)s.windTicks++;
  mark('windSupply',s.windTicks>=120);
  const stored=w.structures.filter(q=>q.battery).reduce((n,q)=>n+batteryWattDays(q.battery!),0),generator=existing(w,'wood-generator',energyPlan(s.prison.energy).generator);
  if(annualNaturalLight(w)===0&&stored>0&&stored<s.previousBattery&&generator?.power?.switchOn===false&&heaters.some(isPowerActive))s.nightBatteryTicks++;
  s.previousBattery=stored;mark('nightBattery',s.nightBatteryTicks>=120);
  const food=w.piles.filter(p=>p.kind==='food').reduce((n,p)=>n+p.quantity,0);s.lowestFood=Math.min(s.lowestFood,food);
}

export function environmentSummary(w:World,s:EnvironmentPlayerState){
  const turbine=existing(w,'wind-turbine',s.turbine),view=new TemperatureView(w);
  return {tick:w.tick,elapsed:(w.tick-s.startTick)/6000,date:climateDate(w),outside:outdoorTemperature(w),outdoorMin:s.outdoorMin,outdoorMax:s.outdoorMax,
    light:annualNaturalLight(w),milestones:{...s.milestones},coldTicks:s.coldTicks,heatedTicks:s.heatedTicks,windTicks:s.windTicks,nightBatteryTicks:s.nightBatteryTicks,winterMeals:s.winterMeals,springHarvested:s.springHarvested,
    turbine:turbine?{id:turbine.id,watts:turbine.wind?.cachedWatts,blockers:windObstructions(w,turbine).length}:null,
    heaters:s.heaters.map(c=>{const h=existing(w,'heater',c);return {cell:c,id:h?.id,on:!!h&&isPowerActive(h),high:h?.heater?.high,temperature:view.at(w,c)};}),
    foods:w.piles.filter(p=>p.kind==='food').reduce<Record<string,number>>((a,p)=>{a[p.item]=(a[p.item]??0)+p.quantity;return a;},{}),
    crops:w.growingZones.map(z=>{const plants=w.resources.filter(p=>isPlant(p)&&z.cells.includes(p.z*w.width+p.x)),growth=plants.map(p=>plantGrowth(w,p));return {id:z.id,plant:z.plant,cells:z.cells.length,count:plants.length,mature:growth.filter(g=>g>=1).length,meanGrowth:growth.length?growth.reduce((n,g)=>n+g,0)/growth.length:0,damaged:plants.filter(p=>(p.damage??0)>0).length,oldestObserved:Math.max(0,...plants.map(p=>p.plantLife?.age??0))};}),
    people:w.pawns.filter(isColonist).map(p=>({id:p.id,state:p.state,hunger:p.hunger,rest:p.rest})),jobs:w.jobs.length,fire:w.fires?.ledger};
}
