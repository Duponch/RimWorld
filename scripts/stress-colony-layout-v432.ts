/** Authored load fixture, never a gameplay factory or a migration. All earthworks,
 * people, buildings, technologies, stocks and crop maturity are prepared heritage. */
import assert from 'node:assert/strict';
import type {Cell,World,Structure,Pawn,Resource} from '../src/sim/types.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {assignBackground} from '../src/sim/background-generation.ts';
import {backgroundWorkRefusal,BACKGROUND_ADULT_MIN_TICKS} from '../src/sim/colonist-backgrounds.ts';
import {isHabitatFurnitureKind} from '../src/sim/furniture-stats.ts';
import {builtDoorState} from '../src/sim/door-rules.ts';
import {isElectrical,newPowerState} from '../src/sim/power-rules.ts';
import {newBatteryState} from '../src/sim/power-battery.ts';
import {reconcilePower} from '../src/sim/power.ts';
import {isPowerTransmitter} from '../src/sim/power-grid.ts';
import {newHeaterState} from '../src/sim/heater.ts';
import {newCoolerState} from '../src/sim/cooler.ts';
import {isFueledBuilding,newBuildingFuel,fuelLimit} from '../src/sim/fuel.ts';
import {newCookingBill,cookingSpot} from '../src/sim/cooking-bills.ts';
import {stationRecipes,type ProductionRecipe} from '../src/sim/production-recipes.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import {createPlantLife} from '../src/sim/plant-life.ts';
import {PLANT_DEFINITIONS} from '../src/sim/plants.ts';
import {projectProgress,researchCost,type ResearchProject} from '../src/sim/research.ts';
import {invalidateTerrainJournal} from '../src/sim/terrain-mutation-journal.ts';
import {canStandAt} from '../src/sim/furniture-travel.ts';
import {prepareStressAnimals432} from './stress-colony-animals-v432.ts';

export function prepareStressLayout432(w:World){
 assert.equal(w.schemaVersion,263);assert.equal(w.width,250);assert.equal(w.height,250);
 assert.equal(w.tick,35);assert.equal(w.pawns.length,3);assert.equal(w.jobs.length,0);
 assert.equal(w.worldMaps?.sites.length,1);assert.equal(w.startingArrival?.phase,'opened');
 const originalRng=w.rng,originalPeople=w.pawns.map(p=>p.id),originalStructures=w.structures.map(s=>JSON.stringify(s));
 const index=(p:Cell)=>p.z*w.width+p.x;
 const cells=(x:number,z:number,width:number,height:number):Cell[]=>Array.from({length:width*height},(_,i)=>({x:x+i%width,z:z+Math.floor(i/width)}));
 const districts=Array.from({length:8},(_,i)=>({x:40+i%4*47,z:45+Math.floor(i/4)*94}));
 const protectedCells=new Set(w.structures.flatMap(s=>footprintCells(s).flatMap(c=>cells(c.x-1,c.z-1,3,3).map(index))));
 const plots=new Set<number>();
 for(const d of districts)for(const c of cells(d.x-1,d.z-1,42,77))if(!protectedCells.has(index(c)))plots.add(index(c));
 for(let i=0;i<4;i++)for(const c of cells(39+i*47,9,42,29))plots.add(index(c));
 const removed=w.resources.filter(r=>plots.has(index(r))),oldTerrainCounts:Record<string,number>={};
 // The benchmark's earthworks remove loose natural chunks from its parcels;
 // no resource yield is credited and the source save remains immutable.
 const removedChunks=w.piles.filter(p=>p.owner.type==='ground'&&plots.has(index(p.owner))&&['slate-chunk','sandstone-chunk'].includes(p.item));
 const removedChunkIds=new Set(removedChunks.map(p=>p.id));w.piles=w.piles.filter(p=>!removedChunkIds.has(p.id));
 w.resources=w.resources.filter(r=>!plots.has(index(r)));
 for(const n of plots){const t=w.tiles[n]!;oldTerrainCounts[t.terrain]=(oldTerrainCounts[t.terrain]??0)+1;w.tiles[n]={terrain:'soil-natural'};}
 invalidateTerrainJournal(w.tiles);
 if(w.roofing?.natural)for(const key of ['thin','thick'] as const)w.roofing.natural[key]=w.roofing.natural[key].filter(n=>!plots.has(n));
 const occupied=new Set(w.structures.flatMap(s=>footprintCells(s).map(index))),workspots=new Set<number>(),roofs=new Set(w.roofing?.constructed??[]),home=new Set(w.home??[]),wires=new Set<number>();
 const make=(kind:Structure['kind'],x:number,z:number,extra:Partial<Structure>={}):Structure=>{
  const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'wood',...extra};
  if(isHabitatFurnitureKind(kind))s.quality='normal';
  if(isElectrical(kind)){s.material='steel';s.power=newPowerState(kind);}
  if(isFueledBuilding(kind)){s.fuel=newBuildingFuel(kind);s.fuel.ticks=fuelLimit(kind);}
  if(kind==='battery')s.battery=newBatteryState();
  if(kind==='heater')s.heater=newHeaterState();
  if(kind==='cooler')s.cooler={...newCoolerState(),target:4};
  if(kind==='door'||kind==='fence-gate')s.door=builtDoorState(w,s);
  if(stationRecipes(s).length)s.bills=[];
  for(const c of footprintCells(s)){const n=index(c);assert.ok(plots.has(n),`${kind} outside prepared plot ${x},${z}`);if(kind!=='power-conduit'){assert.ok(!occupied.has(n)&&!workspots.has(n),`${kind} overlap ${c.x},${c.z}`);occupied.add(n);}home.add(n);}
  if(s.bills||kind==='research-bench'){const n=index(cookingSpot(s));assert.ok(!occupied.has(n),`${kind} blocked service cell`);workspots.add(n);}
  w.structures.push(s);return s;
 };
 const room=(x:number,z:number,width:number,height:number)=>{
  for(const c of cells(x,z,width,height)){const edge=c.x===x||c.x===x+width-1||c.z===z||c.z===z+height-1;
   if(edge)make(c.x===x+Math.floor(width/2)&&c.z===z+height-1?'door':'wall',c.x,c.z);
   else if(plots.has(index(c))){w.tiles[index(c)]!.floor='wood-planks';roofs.add(index(c));home.add(index(c));}
  }
 };
 const wire=(x:number,z:number,width:number,height:number)=>{const transmitters=new Set(w.structures.filter(s=>isPowerTransmitter(s.kind)).flatMap(s=>footprintCells(s).map(index)));for(const c of cells(x,z,width,height)){const n=index(c);if(wires.has(n)||transmitters.has(n)||!plots.has(n))continue;wires.add(n);make('power-conduit',c.x,c.z);}};
 const bill=(s:Structure,recipe:ProductionRecipe)=>{assert.ok(stationRecipes(s).includes(recipe));const b=newCookingBill(w.nextId++,recipe,263);b.target=200;b.radius=50;s.bills!.push(b);};
 const stocks:Record<string,number>={},beds:Structure[]=[],positions:Cell[]=[],stations:Structure[]=[],pens:{markerId:number;cells:Cell[]}[]=[];
 const stock=(item:ItemId,quantity:number,where:Cell)=>{const d=ITEM_DEFINITIONS[item];assert.ok(quantity<=d.stackLimit);assert.ok(!occupied.has(index(where))&&!workspots.has(index(where)),`stock overlap ${item} ${where.x},${where.z}`);addMaterial(w,d.kind,quantity,{type:'ground',...where},item);stocks[item]=(stocks[item]??0)+quantity;};
 const knowledge:ResearchProject[]=['complex-furniture','complex-clothing','stonecutting','air-conditioning','batteries','solar-power','smithing','machining','gunsmithing','microelectronics','multi-analyzer','fabrication','hospital-bed','tube-television'];
 w.research??={project:null,points:0};for(const p of knowledge)Object.assign(projectProgress(w.research,p),{points:researchCost(p),completedAt:w.tick});w.research.project='packaged-survival-meals';projectProgress(w.research,'packaged-survival-meals');
 for(const [di,d] of districts.entries()){
  const {x,z}=d;
  for(let j=0;j<10;j++){const bx=x+j%5*8,bz=z+Math.floor(j/5)*9;room(bx,bz,7,7);beds.push(make('bed',bx+2,bz+2));positions.push({x:bx+3,z:bz+4});make('standing-lamp',bx+1,bz+1);make('heater',bx+5,bz+5);}
  // Four separate workshops keep roofs supported and services accessible.
  const kinds=['electric-stove','tailor-bench','stonecutter','research-bench'] as const;
  for(let j=0;j<4;j++){const bx=x+j*10;room(bx,z+20,9,9);const s=make(kinds[j]!,bx+3,z+23);stations.push(s);make('standing-lamp',bx+1,z+21);if(j<3)bill(s,j===0?'cook-simple-meal-bulk':j===1?'shirt':'stone-blocks');}
  // Dining rooms and a broad, roofed store with columns for real support.
  room(x,z+31,19,8);room(x+21,z+(di===7?29:31),19,di===7?7:8);
  for(const sx of [x+3,x+12,x+24,x+33]){const dz=di===7&&sx>=x+21?-1:0;make('table',sx,z+34+dz);make('stool',sx-1,z+34+dz);make('stool',sx+1,z+34+dz);make('standing-lamp',sx,z+32+dz);}
  // Stock is outside to keep large volumes accessible; deterioration remains active.
  const store=cells(x,z+41,40,8).filter(c=>plots.has(index(c))&&!occupied.has(index(c))&&!workspots.has(index(c)));
  for(const c of store)w.stockpiles.push({id:w.nextId++,...c,filters:{wood:true,food:true,steel:true,component:true,textile:true,blocks:true,chunk:true,medicine:true,apparel:true},priority:2,capacity:75});
  let at=0;for(const [item,total] of [['wood',1500],['steel',900],['cloth',600],['rice',900],['potato',600],['simple-meal',100],['herbal-medicine',50],['component',30],['granite-blocks',750],['granite-chunk',12]] as const){for(let remaining=total;remaining>0;){const q=Math.min(remaining,ITEM_DEFINITIONS[item].stackLimit);stock(item,q,store[at++]!);remaining-=q;}}
  for(const gx of [x,x+10,x+20,x+30]){make('wood-generator',gx,z+51);make('battery',gx+4,z+51);}
  for(const dz of [1,10,21,32,42,51])wire(x,z+dz,40,1);wire(x+5,z,1,54);wire(x+25,z,1,54);
  for(let f=0;f<4;f++){const plant=(['rice','potato','cotton','healroot'] as const)[(di+f)%4]!,field=cells(x+f*10,z+57,9,16).filter(c=>plots.has(index(c))&&!occupied.has(index(c)));
   w.growingZones.push({id:w.nextId++,plant,cells:field.map(index),allowSow:true,allowCut:true});
   for(const [i,c] of field.entries()){if(i%4===0)continue;const r:Resource={id:w.nextId++,kind:plant,...c,amount:PLANT_DEFINITIONS[plant].yield,growth:i%4===1?1:i%4===2?.6:.15,growthTick:w.tick};r.plantLife=createPlantLife(w,r);w.resources.push(r);}
  }
  // Paid future construction, no delivered materials or artificial work progress.
  for(let j=0;j<16;j++){const c={x:x+j*2,z:z+55};w.jobs.push({id:w.nextId++,kind:'sandbags',...c,material:'cloth',construction:'blueprint',orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});home.add(index(c));}
 }
 for(let i=0;i<4;i++){const x=40+i*47,z=10;for(const c of cells(x,z,40,27))if(c.x===x||c.x===x+39||c.z===z||c.z===z+26)make(c.x===x+19&&c.z===z+26?'fence-gate':'fence',c.x,c.z);const marker=make('pen-marker',x+2,z+2,{pen:{accepted:['muffalo','dromedary','alpaca','yak','duck','turkey']}});const interior=cells(x+1,z+1,38,25).filter(c=>!occupied.has(index(c)));pens.push({markerId:marker.id,cells:interior});
  for(const [j,c] of interior.entries())if(j%3!==0){const r:Resource={id:w.nextId++,kind:'wild-plant',species:'grass',...c,amount:0,growth:.85,growthTick:w.tick};r.plantLife=createPlantLife(w,r);w.resources.push(r);}for(let j=0;j<12;j++)stock('hay',200,interior[j*3]!);
 }
 // Preserve every original ground pile, relocating only a conflicting footprint.
 const naturalRocks=new Set(w.resources.filter(r=>r.kind==='rock').map(index));
 const freeOutside=cells(1,1,248,248).filter(c=>!plots.has(index(c))&&!occupied.has(index(c))&&!naturalRocks.has(index(c))&&canStandAt(w,c));
 const pileOccupied=new Set(w.piles.flatMap(p=>p.owner.type==='ground'?[index(p.owner)]:[]));let moved=0,cursor=0;
 for(const p of w.piles)if(p.owner.type==='ground'&&occupied.has(index(p.owner))){while(freeOutside[cursor]&&pileOccupied.has(index(freeOutside[cursor]!)))cursor++;const c=freeOutside[cursor++];assert.ok(c);p.owner={type:'ground',...c};pileOccupied.add(index(c));moved++;}
 const roles:readonly (keyof Pawn['priorities'])[]=['build','build','grow','grow','cook','craft','haul','handle','research','clean'];
 for(let i=0;i<80;i++){const p=w.pawns[i]??startingPawn(w.nextId++,`Épreuve ${String(i+1).padStart(2,'0')}`,positions[i]!.x,positions[i]!.z,i%3,75,w.seed,w.tick,263);if(i>=3)w.pawns.push(p);Object.assign(p,positions[i]);delete p.motion;delete p.arrivalRotation;p.path=[];p.bedId=beds[i]!.id;p.hunger=80+i%5*3;p.rest=85+i%4*2;p.recreation.level=70;p.mood=80;
  delete p.background;assignBackground(p,{childhood:'workshop-child',...p.age&&p.age.biologicalTicks>=BACKGROUND_ADULT_MIN_TICKS?{adulthood:roles[i%10]==='grow'?'farmer' as const:roles[i%10]==='research'?'researcher' as const:roles[i%10]==='handle'?'farmer' as const:'artisan' as const}:{}});
  for(const record of Object.values(p.skills))Object.assign(record,{level:10,passion:1,xp:0,dailyXp:0});
  for(const k of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[k]=0;Object.assign(p.priorities,{patient:1,bedrest:1,firefight:1,basic:2,haul:3,clean:4,[roles[i%10]!]:1});
  if(i%10===7)p.priorities.doctor=2;for(const k of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])if(backgroundWorkRefusal(p,k))p.priorities[k]=0;
  if(i>=3){addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'cloth-shirt');addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'cloth-pants');}
 }
 w.roofing??={constructed:[],build:[],remove:[],cursor:0};w.roofing.constructed=[...roofs].sort((a,b)=>a-b);w.home=[...home].sort((a,b)=>a-b);
 refreshStock(w);reconcilePower(w);const animalReceipt=prepareStressAnimals432(w,pens,freeOutside);
 for(const s of stations)assert.ok(canStandAt(w,cookingSpot(s)),`work spot blocked ${s.id}`);
 assert.equal(w.rng,originalRng);assert.deepEqual(w.pawns.slice(0,3).map(p=>p.id),originalPeople);assert.deepEqual(w.structures.slice(0,originalStructures.length).map(s=>JSON.stringify(s)),originalStructures);
 return {prepared:true,notice:'Terrain, removal without yields, people, skills, maturity, full fuel, research, stocks, buildings and relocation are authored load conditions, not naturally earned history.',districts:districts.length,originalPeople,preparedColonists:77,landscapedCells:plots.size,originalTerrain:oldTerrainCounts,removedResources:removed.length,removedNaturalChunks:removedChunks.map(p=>({id:p.id,item:p.item,quantity:p.quantity})),movedOriginalPiles:moved,stocks,knowledge,animals:animalReceipt,stations:stations.map(s=>s.id)};
}
