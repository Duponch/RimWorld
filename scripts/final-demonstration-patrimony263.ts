/** PRIVATE PREPARATION ONLY. No top-level World, factory, tick or file write.
 * Call only after ROOT acquired the final263 creation and ordinary pod opening.
 * Returned heritage is explicitly prepared, never earned campaign history. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isAbsolute} from 'node:path';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type World,type Structure,type Cell,type Resource} from '../src/sim/types.ts';
import {canDesignate} from '../src/sim/engine.ts';
import {FLORA_DEFINITIONS,isPlantSpeciesInVersion} from '../src/sim/biome-flora.ts';
import {isCavePlant256} from '../src/sim/cave-flora-256.ts';
import {isConstructionLightPlant} from '../src/sim/construction-plants.ts';
import {conduitKeepsPlant} from '../src/sim/power-construction.ts';
import {isColonist} from '../src/sim/affiliation.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {terrainSupportsAffordance256,terrainGroundFertility256} from '../src/sim/natural-terrain-runtime-256.ts';
import {buildingSupportNeed256} from '../src/sim/bridge-rules.ts';
import {foggedCell256} from '../src/sim/exploration-state-256.ts';
import {RoofContext,roofKindAt} from '../src/sim/roof-rules.ts';
import {groupFormationAuthority} from '../src/sim/group-authority.ts';
import {workNeighbours} from '../src/sim/pathfinding.ts';
import {horseshoeCells,recreationSiteValid} from '../src/sim/recreation-space.ts';
import {adjacentTable} from '../src/sim/dining.ts';
import {builtDoorState} from '../src/sim/door-rules.ts';
import {isElectrical,newPowerState} from '../src/sim/power-rules.ts';
import {newBatteryState} from '../src/sim/power-battery.ts';
import {reconcilePower} from '../src/sim/power.ts';
import {isPowerTransmitter,isPowerConnector} from '../src/sim/power-grid.ts';
import {PowerTopologyCache} from '../src/sim/power-topology.ts';
import {isFueledBuilding,newBuildingFuel} from '../src/sim/fuel.ts';
import {newHeaterState} from '../src/sim/heater.ts';
import {newCoolerState} from '../src/sim/cooler.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {newCookingBill,cookingSpot} from '../src/sim/cooking-bills.ts';
import {stationRecipes} from '../src/sim/production-recipes.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {projectProgress,researchCost,researchPrerequisite,type ResearchProject} from '../src/sim/research.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {groundCapacity} from '../src/sim/ground-placement.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import {settlementLimit} from '../src/sim/world-map-options.ts';

type Kind='wall'|'door'|'bed'|'table'|'stool'|'animal-sleeping-spot'|'fueled-stove'|'butcher-table'|'stonecutter'|'tailor-bench'|'research-bench'|'shelf'|'standing-lamp'|'heater'|'battery'|'cooler'|'wood-generator'|'solar-generator'|'power-conduit'|'horseshoes';
type Furniture={kind:Kind;x:number;z:number;medical?:true;orientation?:0|2};
interface Room {name:string;x:number;z:number;width:number;height:number;structures:Structure[];inside:Cell[];door:Cell}
interface Input {path:string;sha256:string}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const ownJson=(v:unknown):string=>JSON.stringify(v)??'undefined';
const KNOWLEDGE:readonly ResearchProject[]=['complex-furniture','complex-clothing','stonecutting','air-conditioning','batteries','solar-power'];
const STOCK:readonly {item:ItemId;quantity:number;purpose:string}[]=[
 {item:'wood',quantity:450,purpose:'Refuelling, repairs and genuinely paid later construction'},
 {item:'steel',quantity:300,purpose:'Finite electrical/repair/construction material'},
 {item:'component',quantity:24,purpose:'Finite repair and construction components'},
 {item:'cloth',quantity:160,purpose:'Shirt/parka bills and medical/building reserve'},
 {item:'muffalo-wool',quantity:80,purpose:'Declared textile stock, no fictional shearing'},
 {item:'rice',quantity:300,purpose:'Actual ingredient pickups and cooking'},
 {item:'herbal-medicine',quantity:25,purpose:'Finite care reserve; no created patient or treatment'},
 {item:'silver',quantity:500,purpose:'Future actual physical trade, no purchase receipt invented'},
 {item:'granite-chunk',quantity:4,purpose:'Declared raw stone inputs, no mineable removed'},
 {item:'survival-meal',quantity:12,purpose:'Declared finite startup reserve while refuelling/cooking begin'},
 {item:'kibble',quantity:100,purpose:'Original starting animal feeding; no extra animal'},
 {item:'cloth-tuque',quantity:3,purpose:'Finite normal clothing for actual later equip choices'},
 {item:'bolt-action-rifle',quantity:1,purpose:'Finite spare arm, no original equipment overwritten'},
];
const ROOM_SPECS:readonly {name:string;width:number;height:number;cooler?:true;furniture:readonly Furniture[]}[]=[
 {name:'Habitat et repos',width:11,height:8,furniture:[{kind:'bed',x:1,z:2},{kind:'bed',x:3,z:2},{kind:'bed',x:5,z:2},{kind:'bed',x:8,z:2,medical:true},{kind:'table',x:3,z:5},{kind:'stool',x:2,z:5},{kind:'stool',x:4,z:5},{kind:'stool',x:2,z:6},{kind:'standing-lamp',x:6,z:5},{kind:'heater',x:8,z:5},{kind:'animal-sleeping-spot',x:1,z:5}]},
 {name:'Cuisine et boucherie',width:9,height:7,furniture:[{kind:'fueled-stove',x:2,z:2},{kind:'butcher-table',x:2,z:4},{kind:'standing-lamp',x:6,z:1},{kind:'heater',x:7,z:5}]},
 {name:'Atelier pierre, tenue et recherche',width:11,height:8,furniture:[{kind:'stonecutter',x:2,z:2},{kind:'tailor-bench',x:2,z:4},{kind:'research-bench',x:6,z:3},{kind:'shelf',x:6,z:6},{kind:'standing-lamp',x:1,z:6},{kind:'heater',x:9,z:5}]},
 {name:'Réserve réfrigérable',width:9,height:7,cooler:true,furniture:[{kind:'shelf',x:1,z:2},{kind:'shelf',x:4,z:2},{kind:'shelf',x:1,z:4},{kind:'shelf',x:4,z:4},{kind:'standing-lamp',x:7,z:1},{kind:'battery',x:7,z:3}]},
];

/** No output write, import-time invocation, factory, gameplay step, profile or
 * person editing. An impossible plan throws and leaves the acquired file intact. */
export async function prepareFinalDemonstration263(input:Input):Promise<{world:World;raw:string;receipt:object}> {
 if(!input.path||!isAbsolute(input.path)||!/^[a-f0-9]{64}$/.test(input.sha256)||Number(SCHEMA_VERSION)!==263)throw Error('Final263 absolute source path and exact SHA are mandatory; no fallback');
 const bytes=readFileSync(input.path,'utf8');if(hash(bytes)!==input.sha256)throw Error('Acquired creation SHA differs');
 const raw=await decodeStoredSave(bytes);if(!raw.startsWith('{"schemaVersion":263,'))throw Error('Only the actual final263 export is admitted, no old-world migration');
 const state=deserializeCampaign(raw);if(!('tiles'in state)||Number(state.schemaVersion)!==263)throw Error('Complete loaded263 input required');const w=state;
 if(serializeCampaign(w)!==raw||validateWorld(w).length||w.planet?.revision!==3||w.site?.revision!==3||!w.worldMaps||w.worldMaps.sites.length!==1||w.worldMaps.rootMapId!==0||w.worldMaps.sites[0]?.kind!=='settlement'||!w.worldGroups||w.worldGroups.groups.length||settlementLimit(w)!==1||w.startingArrival?.phase!=='opened'||w.jobs.length||w.research?.project||w.nextId>Number.MAX_SAFE_INTEGER-100000)throw Error('Require true final new single-colony export AFTER ordinary capsules, before jobs/research; no auto-opening or repairs');
 const people=w.pawns.filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor&&p.state!=='dead');if(people.length!==3||w.pawns.length!==3)throw Error('Keep exactly the three actual starting originals; no person is created');
 const allowed=new Set(['nextId','structures','piles','stock','stockpiles','growingZones','research','roofing','home','resources']);
 const untouched=new Map(Object.entries(w).filter(([k])=>!allowed.has(k)).map(([k,v])=>[k,hash(ownJson(v))]));
 const oldStructures=w.structures.slice(),oldPiles=w.piles.slice(),oldStructureValues=oldStructures.map(ownJson),oldPileValues=oldPiles.map(ownJson),oldRoof=w.roofing?structuredClone(w.roofing):undefined,oldResearch=ownJson(w.research??null),startId=w.nextId;
 const oldResources=w.resources.slice(),oldResourceValues=oldResources.map(ownJson);
 const receipt:{[key:string]:unknown}={notice:'Explicitly prepared finite demonstration inheritance. Includes explicitly prepared ordinary vegetation removal only on the selected heritage footprints. No natural acquisition, construction/research completion event, XP, person, animal, history, treatment, simulation tick or terrain alteration. Removed vegetation is not earned cutting/harvest work.',input:{...input},tick:w.tick,maxColonies:1,people:people.map(p=>p.id),preparedResearch:[],rooms:[],stocks:[],manual:[]};
 const manual:string[]=[],preparedResearch:ResearchProject[]=[];w.research??={project:null,points:0};
 for(const project of KNOWLEDGE){const before=projectProgress(w.research,project);if(before.completedAt!==undefined)continue;const missing=researchPrerequisite(w,project);if(missing)throw Error('Prepared research prerequisite unavailable: '+project+' / '+missing);before.points=researchCost(project);before.completedAt=w.tick;preparedResearch.push(project);}
 const cell=(x:number,z:number)=>z*w.width+x,inside=(x:number,z:number)=>x>=1&&z>=1&&x<w.width-1&&z<w.height-1;
 const protectedPlantIds=new Set((w.wildlife?.animals??[]).flatMap(a=>a.meal?.kind==='plant'?[a.meal.id]:[]));
 const protectedPlantCells=new Set([...w.growingZones.flatMap(z=>z.cells),...(w.fires?.items??[]).map(f=>cell(f.x,f.z)),...(w.fires?.embers??[]).flatMap(e=>[cell(e.from.x,e.from.z),cell(e.to.x,e.to.z)])]);
 // Spawned ordinary wild vegetation only. No crop/pot/packed tree, cave plant,
 // transplant clock, active food owner or existing growing-zone owner is lost.
 const ordinaryVegetation=(r:Resource)=>['tree','berries','wild-plant'].includes(r.kind)&&r.species!==undefined&&isPlantSpeciesInVersion(r.species,263)&&!isCavePlant256(r.species)&&FLORA_DEFINITIONS[r.species].kind===r.kind&&r.stone===undefined&&r.plantLife?.bornAt===undefined&&r.plantLife?.pausedTicks===undefined&&r.plantLife?.ageTick===undefined&&r.plantLife?.leaflessPausedTicks===undefined&&!protectedPlantIds.has(r.id)&&!protectedPlantCells.has(cell(r.x,r.z));
 const removedIds=new Set<number>(),clearingCells=new Set<number>(),clearingAreas:{purpose:string;cells:number[]}[]=[],removedVegetation:{id:number;kind:Resource['kind'];species:Resource['species'];cell:Cell;purpose:string;beforeSHA256:string;before:Resource}[]=[];
 const vegetationFreeView=(view:World,cells:ReadonlySet<number>):World=>({...view,resources:view.resources.filter(r=>!cells.has(cell(r.x,r.z))||!ordinaryVegetation(r))});
 const clearPreparedVegetation=(cells:ReadonlySet<number>,purpose:string)=>{
  const selected=w.resources.filter(r=>cells.has(cell(r.x,r.z))&&ordinaryVegetation(r));
  for(const r of selected){if(naturalBlocked.has(cell(r.x,r.z))||removedIds.has(r.id))throw Error('Prepared vegetation scope conflicts with a protected original owner');removedIds.add(r.id);removedVegetation.push({id:r.id,kind:r.kind,species:r.species,cell:{x:r.x,z:r.z},purpose,beforeSHA256:hash(ownJson(r)),before:structuredClone(r)});}
  for(const n of cells)clearingCells.add(n);clearingAreas.push({purpose,cells:[...cells].sort((a,b)=>a-b)});
  if(selected.length){const ids=new Set(selected.map(r=>r.id));w.resources=w.resources.filter(r=>!ids.has(r.id));}
 };
 const naturalBlocked=new Set<number>();for(const r of w.resources)if(!ordinaryVegetation(r))naturalBlocked.add(cell(r.x,r.z));for(const s of oldStructures)for(const c of footprintCells(s))naturalBlocked.add(cell(c.x,c.z));for(const p of oldPiles)if(p.owner.type==='ground')naturalBlocked.add(cell(p.owner.x,p.owner.z));for(const p of w.packed)if(p.owner.type==='ground')naturalBlocked.add(cell(p.owner.x,p.owner.z));for(const p of [...w.pawns,...w.wildlife?.animals??[],...w.mechanoids??[]]){naturalBlocked.add(cell(p.x,p.z));if(p.motion&&p.motion.end>w.tick)naturalBlocked.add(cell(p.motion.from.x,p.motion.from.z));}
 const claimed=new Set<number>(),anchor={x:Math.round(people.reduce((n,p)=>n+p.x,0)/3),z:Math.round(people.reduce((n,p)=>n+p.z,0)/3)},rooms:Room[]=[];
 const free=(x:number,z:number)=>inside(x,z)&&!naturalBlocked.has(cell(x,z))&&!claimed.has(cell(x,z))&&!foggedCell256(w,cell(x,z))&&!roofKindAt(w,cell(x,z))&&!w.tiles[cell(x,z)]!.mineable&&!w.tiles[cell(x,z)]!.collapsedRock&&terrainSupportsAffordance256(w.tiles[cell(x,z)]!,'Heavy',w);
 const candidates:Cell[]=[];for(let z=Math.max(2,anchor.z-42);z<=Math.min(w.height-3,anchor.z+42);z++)for(let x=Math.max(2,anchor.x-42);x<=Math.min(w.width-3,anchor.x+42);x++)candidates.push({x,z});candidates.sort((a,b)=>Math.abs(a.x-anchor.x)+Math.abs(a.z-anchor.z)-Math.abs(b.x-anchor.x)-Math.abs(b.z-anchor.z)||a.z-b.z||a.x-b.x);
 const make=(view:World,kind:Kind,x:number,z:number,id:()=>number,extra:Partial<Structure>={}):Structure=>{
  const steel=['fueled-stove','standing-lamp','heater','battery','cooler','wood-generator','solar-generator','power-conduit'].includes(kind),stuff=['wall','door','bed','table','stool','butcher-table','stonecutter','tailor-bench','research-bench','shelf'].includes(kind),material=steel?'steel' as const:stuff?'wood' as const:undefined;
  const s:Structure={id:id(),kind,x,z,orientation:0,footprint:'standard',...material?{material}:{},...['bed','table','stool'].includes(kind)?{quality:'normal' as const}:{},...extra};
  const permitted=canDesignate(view,{type:'designate',kind,x,z,orientation:s.orientation,...material?{material}:{}});if(!permitted.ok)throw Error(`${kind} physical admission: ${permitted.reason}`);
  const support=buildingSupportNeed256(s);if(support&&footprintCells(s).some(c=>!terrainSupportsAffordance256(view.tiles[cell(c.x,c.z)]!,support,view)))throw Error('Prepared footprint has no real support');
  if(isElectrical(kind))s.power=newPowerState(kind);if(isFueledBuilding(kind))s.fuel=newBuildingFuel(kind);if(kind==='battery')s.battery=newBatteryState();if(kind==='heater')s.heater=newHeaterState();if(kind==='cooler')s.cooler={...newCoolerState(),target:-4};if(kind==='door')s.door=builtDoorState(view,s);
  if(kind==='shelf')s.shelf=newShelfStorage(footprintCells(s).map(()=>id()));if(stationRecipes(s).length)s.bills=[];return s;
 };
 for(const spec of ROOM_SPECS){let chosen:Room|undefined,chosenCells:Set<number>|undefined,next=w.nextId,lastRefusal='no free revealed supported rectangle';
  for(const origin of candidates){let clear=true;for(let z=origin.z-1;z<=origin.z+spec.height;z++)for(let x=origin.x-1;x<=origin.x+spec.width;x++)if(!free(x,z))clear=false;if(!clear)continue;
   const door={x:origin.x+Math.floor(spec.width/2),z:origin.z+spec.height-1},outside={x:door.x,z:door.z+1};if(!groupFormationAuthority(w).reachable(people[0]!,outside))continue;
   const preparedCells=new Set<number>();for(let z=origin.z;z<origin.z+spec.height;z++)for(let x=origin.x;x<origin.x+spec.width;x++)preparedCells.add(cell(x,z));
   const view=vegetationFreeView({...w,structures:[...w.structures]},preparedCells),made:Structure[]=[],id=()=>next++,local=new Set<number>(),workspots=new Set<number>();next=w.nextId;
   const add=(kind:Kind,x:number,z:number,extra:Partial<Structure>={})=>{const s=make(view,kind,x,z,id,extra),cells=footprintCells(s);if(cells.some(c=>!inside(c.x,c.z)||naturalBlocked.has(cell(c.x,c.z))||local.has(cell(c.x,c.z))||workspots.has(cell(c.x,c.z))))throw Error('Prepared furniture/standing-cell overlap');if(s.bills||kind==='research-bench'){const p=cookingSpot(s);if(p.x<=origin.x||p.x>=origin.x+spec.width-1||p.z<=origin.z||p.z>=origin.z+spec.height-1||local.has(cell(p.x,p.z)))throw Error('Actual workstation spot is blocked');workspots.add(cell(p.x,p.z));}for(const c of cells)local.add(cell(c.x,c.z));view.structures.push(s);made.push(s);};
   try{for(let z=origin.z;z<origin.z+spec.height;z++)for(let x=origin.x;x<origin.x+spec.width;x++)if(x===origin.x||z===origin.z||x===origin.x+spec.width-1||z===origin.z+spec.height-1){if(x===door.x&&z===door.z)continue;if(spec.cooler&&x===origin.x+Math.floor(spec.width/2)&&z===origin.z)add('cooler',x,z,{orientation:0});else add('wall',x,z);}add('door',door.x,door.z);for(const f of spec.furniture)add(f.kind,origin.x+f.x,origin.z+f.z,{...f.medical?{medical:true as const}:{},...f.orientation!==undefined?{orientation:f.orientation}:{}});
    const interior:Cell[]=[];for(let z=origin.z+1;z<origin.z+spec.height-1;z++)for(let x=origin.x+1;x<origin.x+spec.width-1;x++)interior.push({x,z});chosen={name:spec.name,...origin,width:spec.width,height:spec.height,structures:made,inside:interior,door};chosenCells=preparedCells;
   }catch(error){lastRefusal=String(error);continue;}break;
  }
  if(!chosen||!chosenCells)throw Error(`No revealed, supported compact placement for ${spec.name}; ${lastRefusal}; ordinary prepared vegetation only, no terrain/object/relocation/reseed fallback`);
  clearPreparedVegetation(chosenCells,`prepared room: ${spec.name}`);w.nextId=next;w.structures.push(...chosen.structures);rooms.push(chosen);for(let z=chosen.z-1;z<=chosen.z+chosen.height;z++)for(let x=chosen.x-1;x<=chosen.x+chosen.width;x++)claimed.add(cell(x,z));
 }
 w.roofing??={constructed:[],build:[],remove:[],cursor:0};w.roofing={...w.roofing,constructed:[...new Set([...w.roofing.constructed,...rooms.flatMap(r=>r.inside.map(c=>cell(c.x,c.z)))])].sort((a,b)=>a-b)};const roof=new RoofContext(w);for(const r of rooms)for(const c of r.inside)if(!roof.supported(cell(c.x,c.z)))throw Error('Prepared roof unsupported');
 const addOutside=(kind:'wood-generator'|'solar-generator'|'horseshoes')=>{for(const c of candidates){const shape={kind,...c,orientation:0 as const,footprint:'standard' as const},fp=footprintCells(shape);if(fp.some(p=>!free(p.x,p.z))||!groupFormationAuthority(w).reachable(people[0]!,c))continue;const preparedCells=new Set(fp.map(p=>cell(p.x,p.z))),view=vegetationFreeView(w,preparedCells),permitted=canDesignate(view,{type:'designate',kind,...c,orientation:0,...kind==='horseshoes'?{}:{material:'steel' as const}});if(!permitted.ok)continue;let next=w.nextId;const s=make(view,kind,c.x,c.z,()=>next++);clearPreparedVegetation(preparedCells,`prepared outdoor footprint: ${kind}`);w.nextId=next;w.structures.push(s);for(const p of fp)claimed.add(cell(p.x,p.z));return s;}throw Error('No actual outdoor placement for '+kind);};
 const generator=addOutside('wood-generator');let solar:Structure|undefined;try{solar=addOutside('solar-generator');}catch(error){manual.push('Solar module not prepared; retain the real wood generation/battery base and add panels manually if a legal4x4 is found: '+String(error));}addOutside('horseshoes');
 const newcomers=()=>w.structures.filter(s=>s.id>=startId),electrical=newcomers().filter(s=>s.power),existingConduit=new Set<number>();
 // Rare bounded physical conduit routing, using the existing construction
 // authority; no plant, Mineable, water, existing structure or owner is removed.
 const sourceCells=new Set(footprintCells(generator).map(c=>cell(c.x,c.z)));
 const wirePlantBlocked=new Set(w.resources.filter(r=>!isConstructionLightPlant(r)&&!conduitKeepsPlant('power-conduit',r.kind)).map(r=>cell(r.x,r.z)));
 const cardinal=(c:number)=>{const x=c%w.width;return [c-w.width,c+w.width,...x?[c-1]:[],...x+1<w.width?[c+1]:[]].filter(n=>n>=0&&n<w.width*w.height);};
 const wireCell=(n:number)=>{const x=n%w.width,z=Math.floor(n/w.width);return !naturalBlocked.has(n)&&!wirePlantBlocked.has(n)&&!foggedCell256(w,n)&&(existingConduit.has(n)||canDesignate(w,{type:'designate',kind:'power-conduit',x,z,material:'steel'}).ok);};
 for(const target of electrical.filter(s=>s!==generator)){
  // Transmitters occupy their own footprint: connect its cardinal perimeter,
  // never try to put an incompatible conduit under a battery or solar panel.
  const footprint=new Set(footprintCells(target).map(c=>cell(c.x,c.z))),goals=new Set(isPowerTransmitter(target.kind)?[...new Set([...footprint].flatMap(cardinal))].filter(n=>!footprint.has(n)&&(sourceCells.has(n)||wireCell(n))):[cell(target.x,target.z)]);
  const parents=new Int32Array(w.width*w.height);parents.fill(-1);const queue=[...sourceCells];for(const c of queue)parents[c]=c;let reached=queue.find(c=>goals.has(c));
  for(let h=0;h<queue.length&&reached===undefined;h++)for(const n of cardinal(queue[h]!)){if(parents[n]!==-1)continue;const x=n%w.width,z=Math.floor(n/w.width);if(Math.abs(x-anchor.x)>55||Math.abs(z-anchor.z)>55||!wireCell(n))continue;parents[n]=queue[h]!;queue.push(n);if(goals.has(n)){reached=n;break;}}
  if(reached===undefined)throw Error('No physical conductor route; no invisible network fallback');for(let c=reached;!sourceCells.has(c);c=parents[c]!){if(existingConduit.has(c))continue;const s=make(w,'power-conduit',c%w.width,Math.floor(c/w.width),()=>w.nextId++);w.structures.push(s);existingConduit.add(c);}
 }
 const sourceIds=new Set(oldStructures.map(s=>s.id)),powerView={...w,structures:w.structures.map(s=>sourceIds.has(s.id)&&s.power?{...s,power:{...s.power}}:s)};reconcilePower(powerView);
 const topology=new PowerTopologyCache().read(powerView),net=topology.netOf.get(generator.id);if(net===undefined)throw Error('Prepared generator has no physical network');
 for(const s of newcomers())if(isPowerTransmitter(s.kind)&&topology.netOf.get(s.id)!==net||isPowerConnector(s.kind)&&(s.power?.parentId===null||s.power?.parentId===undefined||topology.netOf.get(s.power.parentId)!==net))throw Error('Prepared electrical module is not in the real generator network');
 if(oldStructures.some(s=>topology.netOf.get(s.id)===net))throw Error('Prepared electrical grid would borrow an existing natural/foreign transmitter');
 const store=rooms.find(r=>r.name==='Réserve réfrigérable')!,storeStructures=new Set(store.structures.flatMap(s=>footprintCells(s).map(c=>cell(c.x,c.z)))),storage=store.inside.filter(c=>!storeStructures.has(cell(c.x,c.z))&&c.x!==store.door.x),shelfCells=store.structures.filter(s=>s.shelf).flatMap(s=>footprintCells(s));
 for(const c of storage)w.stockpiles.push({id:w.nextId++,...c,filters:{wood:true,food:true,textile:true,steel:true,component:true,medicine:true,silver:true,weapon:true,apparel:true,blocks:true},priority:2,capacity:75});
 const workCells=new Set(newcomers().filter(s=>s.bills||s.kind==='research-bench').map(s=>{const c=cookingSpot(s);return cell(c.x,c.z);})),stockCells=[...shelfCells,...storage,...rooms.find(r=>r.name==='Atelier pierre, tenue et recherche')!.inside.filter(c=>!workCells.has(cell(c.x,c.z))&&!newcomers().some(s=>footprintCells(s).some(p=>p.x===c.x&&p.z===c.z)))];
 const stockReceipt:{item:ItemId;quantity:number;purpose:string;ids:number[]}[]=[];
 for(const supply of STOCK){let left=supply.quantity;const before=new Set(w.piles.map(p=>p.id));for(const c of stockCells){const take=Math.min(left,ITEM_DEFINITIONS[supply.item].stackLimit,groundCapacity(w,c,supply.item));if(take<1)continue;addMaterial(w,ITEM_DEFINITIONS[supply.item].kind,take,{type:'ground',...c},supply.item);left-=take;if(!left)break;}if(left)throw Error('Finite prepared stock has no true capacity: '+supply.item);stockReceipt.push({...supply,ids:w.piles.filter(p=>!before.has(p.id)).map(p=>p.id)});}
 for(const [kind,recipe,target]of [['fueled-stove','simple-meal',6],['stonecutter','stone-blocks',3],['tailor-bench','shirt',1]]as const){const station=newcomers().find(s=>s.kind===kind)!;if(!stationRecipes(station).includes(recipe)||!people.some(p=>productionWorkerQualified(p,recipe)))throw Error('No actual original qualifies for '+recipe);const bill=newCookingBill(w.nextId++,recipe,263);bill.target=target;bill.mode='times';station.bills!.push(bill);}
 const cropUsed=new Set<number>();for(const plant of ['potato','cotton']as const){const cells:number[]=[];for(const c of candidates)if(free(c.x,c.z)&&!cropUsed.has(cell(c.x,c.z))&&terrainGroundFertility256(w.tiles[cell(c.x,c.z)]!)>=.7){cells.push(cell(c.x,c.z));cropUsed.add(cell(c.x,c.z));if(cells.length===16)break;}if(cells.length!==16)throw Error('No actual revealed free fertile cells for '+plant+'; no artificial soil/crop');cells.sort((a,b)=>a-b);clearPreparedVegetation(new Set(cells),`prepared unsown growing zone: ${plant}`);w.growingZones.push({id:w.nextId++,plant,cells,allowSow:true,allowCut:true});}
 // Preserve the entire finite stock allocation above, including every other
 // item ID/quantity/cell. Only the four NEW prepared chunks leave shelf faces.
 const stoneIds=stockReceipt.find(s=>s.item==='granite-chunk')?.ids??[],stoneIdSet=new Set(stoneIds),stones=w.piles.filter(p=>stoneIdSet.has(p.id));
 if(stoneIds.length!==4||stoneIdSet.size!==4||stones.length!==4||stones.some(p=>p.id<startId||oldPiles.includes(p)||p.item!=='granite-chunk'||p.quantity!==1||p.owner.type!=='ground'))throw Error('Prepared stone stock must retain its four distinct new original IDs and units');
 const otherPreparedPiles=w.piles.filter(p=>!stoneIdSet.has(p.id)),otherPreparedValues=otherPreparedPiles.map(ownJson),stoneNextId=w.nextId,stonePileArray=w.piles,stoneOriginalValues=stones.map(ownJson);
 const stoneOrigins=new Map(people.map(p=>{const at=p.motion&&p.motion.end>w.tick?p.motion.from:p;return [p.id,{x:at.x,z:at.z}] as const;}));
 const stoneAccess=(view:World,targets:ReadonlyArray<(typeof stones)[number]>)=>{
  const authority=groupFormationAuthority(view,false,stoneOrigins),witnesses:{pileId:number;pawnId:number;cell:Cell}[]=[];
  for(const p of targets){const at=p.owner;if(at.type!=='ground')return undefined;for(const pawn of people){const spot=workNeighbours(at).find(c=>authority.stand(c)&&authority.reachable(pawn,c));if(!spot)return undefined;witnesses.push({pileId:p.id,pawnId:pawn.id,cell:{...spot}});}}
  return witnesses;
 };
 const stoneResourceCells=new Set(w.resources.map(r=>cell(r.x,r.z))),stoneStructureCells=new Set(w.structures.flatMap(s=>footprintCells(s).map(c=>cell(c.x,c.z)))),stoneGroundCells=new Set(w.piles.flatMap(p=>p.owner.type==='ground'?[cell(p.owner.x,p.owner.z)]:[])),stoneGrowingCells=new Set(w.growingZones.flatMap(z=>z.cells));
 type StonePlacement={pileId:number;from:Cell;to:Cell;quantity:number};
 let stonePlan:StonePlacement[]|undefined,stoneArea:Cell[]|undefined,stonePrefixAccess:{afterPileId:number;access:{pileId:number;pawnId:number;cell:Cell}[]}[]=[];
 for(const origin of candidates){
  const area:Cell[]=[];for(let dz=0;dz<3;dz++)for(let dx=0;dx<3;dx++)area.push({x:origin.x+dx,z:origin.z+dz});
  if(area.some(c=>!free(c.x,c.z)||stoneStructureCells.has(cell(c.x,c.z))||stoneGroundCells.has(cell(c.x,c.z))||stoneGrowingCells.has(cell(c.x,c.z))))continue;
  const corners=[area[0]!,area[2]!,area[6]!,area[8]!];if(corners.some(c=>stoneResourceCells.has(cell(c.x,c.z))))continue;
  // Read-only placement prefixes: unallocated prepared chunks are absent from
  // this candidate view; every original and every other new good stays exact.
  const view={...w,piles:w.piles.filter(p=>!stoneIdSet.has(p.id))},placed:typeof stones=[],plan:StonePlacement[]=[],prefix:typeof stonePrefixAccess=[];let admitted=true;
  for(let i=0;i<stones.length;i++){const p=stones[i]!,to=corners[i]!,from=p.owner;if(from.type!=='ground'||groundCapacity(view,to,p)<p.quantity){admitted=false;break;}const proposed={...p,owner:{type:'ground' as const,...to}};view.piles=[...view.piles,proposed];placed.push(proposed);const access=stoneAccess(view,placed);if(!access){admitted=false;break;}plan.push({pileId:p.id,from:{x:from.x,z:from.z},to:{...to},quantity:p.quantity});prefix.push({afterPileId:p.id,access});}
  if(!admitted||plan.length!==4||!stoneAccess(view,placed))continue;stonePlan=plan;stoneArea=area;stonePrefixAccess=prefix;break;
 }
 if(!stonePlan||!stoneArea)throw Error('No compatible accessible compact outdoor area for the same four prepared chunks; no vegetation clearing, terrain edit, stock rewrite or reseed fallback');
 const stonePlacementById=new Map(stonePlan.map(p=>[p.pileId,p]));
 // Publish a new Pile[] and four new prepared records: same IDs/quantities,
 // original objects and all other new records unchanged; invalidate pile indices.
 w.piles=w.piles.map(p=>{const placement=stonePlacementById.get(p.id);return placement?{...p,owner:{type:'ground' as const,...placement.to}}:p;});
 for(const c of stoneArea)claimed.add(cell(c.x,c.z));
 const committedStones=w.piles.filter(p=>stoneIdSet.has(p.id)),stoneFinalAccess=stoneAccess(w,committedStones);
 if(!stoneFinalAccess||w.piles===stonePileArray||w.nextId!==stoneNextId||committedStones.length!==4||stones.some((p,i)=>ownJson(p)!==stoneOriginalValues[i])||committedStones.some(p=>{const before=stones.find(s=>s.id===p.id)!;return stones.includes(p)||p.quantity!==1||p.item!=='granite-chunk'||ownJson({...p,owner:before.owner})!==ownJson(before);})||otherPreparedPiles.some((p,i)=>!w.piles.includes(p)||ownJson(p)!==otherPreparedValues[i]))throw Error('Prepared stone organisation changed another good, identity, count or final access');
 const preparedStoneStorage={notice:'Declared prepared outdoor organisation of the same four chunks; no transport or acquisition played',area:stoneArea,placements:stonePlan,accessAfterEachPlacement:stonePrefixAccess,finalAccess:stoneFinalAccess,vegetationRemoved:0,quantity:4,ids:stoneIds};
 refreshStock(w);
 // Capture only AFTER the complete greedy layout: later rooms, generators,
 // conduits, storage and the pin must not strand any of the three originals.
 // These are existing standability/connectivity/interaction readers, not
 // routes, moves or a second planner. A refusal never expands clearing beyond
 // the already selected prepared footprints and never backtracks/reseeds.
 w.home=[...new Set([...(w.home??[]),...rooms.flatMap(r=>r.inside.map(c=>cell(c.x,c.z))),...newcomers().flatMap(s=>footprintCells(s).map(c=>cell(c.x,c.z)))])].sort((a,b)=>a-b);
 const accessOrigins=new Map(people.map(p=>{const c=p.motion&&p.motion.end>w.tick?p.motion.from:p;return [p.id,{x:c.x,z:c.z}] as const;})),finalAccess=groupFormationAuthority(w,false,accessOrigins),accessReceipt:{pawnId:number;purpose:string;cell:Cell}[]=[];
 const requireAccess=(purpose:string,choices:readonly Cell[])=>{
  for(const p of people){const target=choices.find(c=>finalAccess.stand(c)&&finalAccess.reachable(p,c));if(!target)throw Error(`Final prepared layout strands original${p.id}: ${purpose}; no move/additional-clearing/backtracking/reseed fallback`);accessReceipt.push({pawnId:p.id,purpose,cell:{...target}});}
 };
 for(const r of rooms){requireAccess(`door outside: ${r.name}`,[{x:r.door.x,z:r.door.z+1}]);requireAccess(`door inside: ${r.name}`,[{x:r.door.x,z:r.door.z-1}]);}
 for(const s of newcomers()){
  if(s.bills||s.kind==='research-bench')requireAccess(`workstation${s.id}/${s.kind}`,[cookingSpot(s)]);
  if(s.kind==='bed'||s.kind==='animal-sleeping-spot'||s.kind==='shelf'||s.power&&s.kind!=='power-conduit'||isFueledBuilding(s.kind))requireAccess(`physical service${s.id}/${s.kind}`,footprintCells(s).flatMap(c=>workNeighbours(c)));
  if(s.kind==='stool'){if(!adjacentTable(w,s))throw Error(`Prepared dining seat${s.id} has no actual adjacent table`);requireAccess(`dining seat${s.id}`,[s]);}
  if(s.kind==='horseshoes')requireAccess(`horseshoes${s.id}`,horseshoeCells(s).filter(target=>recreationSiteValid(w,{activity:'horseshoes',buildingId:s.id,target,phase:'travel',elapsed:0})));
 }
 for(const p of w.piles)if(p.id>=startId&&p.owner.type==='ground')requireAccess(`prepared stock${p.id}/${p.item}`,[p.owner,...workNeighbours(p.owner)]);
 for(const zone of w.growingZones)if(zone.id>=startId)for(const n of zone.cells)requireAccess(`growing zone${zone.id}/cell${n}`,[{x:n%w.width,z:Math.floor(n/w.width)}]);
 const expectedResources=oldResources.filter(r=>!removedIds.has(r.id));
 if(w.resources.length!==expectedResources.length||w.resources.some((r,i)=>r!==expectedResources[i])||oldResources.some((r,i)=>ownJson(r)!==oldResourceValues[i])||removedVegetation.length!==removedIds.size||removedVegetation.some(r=>!clearingCells.has(cell(r.cell.x,r.cell.z))))throw Error('Prepared vegetation partition changed an untargeted original, order or resource value');
 for(const [k,v]of untouched)if(hash(ownJson((w as unknown as Record<string,unknown>)[k]))!==v)throw Error('Natural/campaign/person/clock field changed: '+k);
 if(oldStructures.some((s,i)=>!w.structures.includes(s)||ownJson(s)!==oldStructureValues[i])||oldPiles.some((p,i)=>!w.piles.includes(p)||ownJson(p)!==oldPileValues[i]))throw Error('An original object was changed or lost');
 if(oldRoof&&(ownJson(w.roofing.natural)!==ownJson(oldRoof.natural)||ownJson(w.roofing.build)!==ownJson(oldRoof.build)||ownJson(w.roofing.remove)!==ownJson(oldRoof.remove)||w.roofing.cursor!==oldRoof.cursor||oldRoof.constructed.some(c=>!w.roofing!.constructed.includes(c))))throw Error('Existing roof owner/history changed');
 const errors=validateWorld(w);if(errors.length)throw Error('Prepared world refused: '+errors.join('; '));const prepared=serializeCampaign(w);if(readFileSync(input.path,'utf8')!==bytes)throw Error('Input file changed during preparation');
 manual.push('No gameplay step or acquisition has been demonstrated: ROOT must play refuelling, real network startup/charge, ingredients/cooking/ingestion, stonework, tailoring/equipping, growing and an ordinary journey.');manual.push('No patient, injury, corpse, domestication/training or new NPC is prepared; care/butchery use only genuinely occurring later needs.');manual.push('Placement is greedy: even a different arrangement might fit. The final all-original access check can refuse this one layout; preserve its acquired input, never backtrack, move actors, expand clearing beyond the declared selected footprints or reroll to pass.');manual.push('Défrichage préparé déclaré : seuls les végétaux ordinaires recensés sur les emprises des pièces, équipements extérieurs et32cellules de culture retenues sont retirés. Aucun bois, fruit, récolte, XP ou travail acquis ; les autres végétaux et le vrai terrain restent conservés. Les conduits conservent leur végétation.');manual.push('Les quatre chunks de granite préparés sont organisés dans une petite aire extérieure accessible, sans retirer de végétation ; IDs et quantité4 inchangés, aucun transport joué.');manual.push('No floors are prepared. Further floors/paths/expansions use ordinary paid commands; preserve the acquired source on any refusal.');
 Object.assign(receipt,{preparedStoneStorage,preparedVegetationClearing:{notice:'Explicitly prepared vegetation removal, not earned cutting or harvest; no wood/fruit/XP/material/clock/RNG credit',areas:clearingAreas,removed:removedVegetation,remainingOriginals:expectedResources.length,originalCount:oldResources.length,regrowthStateUnchanged:true,credits:{wood:0,fruit:0,harvest:0,xp:0,playedTicks:0},conduitVegetationRetained:true},finalAccessOrigins:[...accessOrigins].map(([pawnId,c])=>({pawnId,cell:{...c}})),finalAccess:accessReceipt,preparedResearch,researchBefore:oldResearch,rooms:rooms.map(r=>({name:r.name,x:r.x,z:r.z,width:r.width,height:r.height,structureIds:r.structures.map(s=>s.id)})),stocks:stockReceipt,buildingsPreparedWithoutEarnedConstruction:newcomers().map(s=>({id:s.id,kind:s.kind,x:s.x,z:s.z,orientation:s.orientation,material:s.material,quality:s.quality,...s.shelf?{shelfCellIds:s.shelf.cells}:{}})),nextId:{before:startId,after:w.nextId},batteriesInitialEnergy:0,woodGeneratorInitialFuel:0,stoveInitialFuel:0,crops:'Two unsown16-cell potato/cotton zones on actual fertile cells, no growth or harvest credited',manual,outputSHA256:hash(prepared)});
 return {world:w,raw:prepared,receipt};
}
