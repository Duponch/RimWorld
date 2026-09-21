import { hygieneLoad,hygieneLoadInitial,hygieneLoadOutcomeErrors,hygieneLoadSummary,HYGIENE_PROTOCOL,type HygieneLoadInitial } from './hygiene-load.ts';
import { addMaterial,refreshStock } from '../../src/sim/materials.ts';
import { newCookingBill } from '../../src/sim/cooking-bills.ts';
import { createFlowerPotState,sowDaylily } from '../../src/sim/flower-pot.ts';
import { newApparelState,type ApparelMaterial } from '../../src/sim/apparel-rules.ts';
import { footprintCells } from '../../src/sim/definitions.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import { CLOTHING_RESEARCH_COST,COMPLEX_FURNITURE_RESEARCH_COST } from '../../src/sim/research.ts';
import type { Cell,MaterialPile,Structure,StructureKind,World } from '../../src/sim/types.ts';

export const HABITAT_APPAREL_PROTOCOL=HYGIENE_PROTOCOL+' V90 HABITAT_APPAREL extends the prepared 100-colonist hygiene/trade/environment load. A separate free grass island contains real wood/steel tables, seats, bedside furniture, two planted daylily pots and manual/electric tailor benches with physical bills; nothing replaces an earlier structure, job, stock, floor, visitor or corpse oracle. All 100 original colonists retain their existing cloth tribalwear identities; six active garments are worn but policy-eligible, two additional garments are deliberately below the maintained-policy threshold, and six stored shirt/pants/parka candidates alternate cloth and light-leather. The two persisted apparel policies remain assigned to original colonists, with six bounded automatic policy checks announced inside the 650-tick window; candidates and textile ingredients sit in explicit physical stockpiles. The wear calendar is moved to one announced pulse inside the 650-tick measurement window; this is fixture preparation, not elapsed natural history. No furniture, flower, apparel, policy, bill or wear observer runs during timing. Outcomes retain every HYGIENE/TRADE/ENVIRONMENT oracle and require every prepared furniture identity, both living flowers, both workshops and bills, both apparel policies, conserved apparel identities through physical replacement and at least one ordinary wear change. V89 profiles without HABITAT_APPAREL are unchanged.';

export interface HabitatApparelLoadInitial {
  hygiene:HygieneLoadInitial;
  furniture:{id:number;kind:StructureKind;material:string;quality:string}[];
  flowers:{id:number;growth:number;lastTick:number}[];
  workshops:{id:number;kind:StructureKind;billId:number}[];
  apparel:{id:number;pawnId:number;item:string;material:ApparelMaterial;hitPoints:number;automatic:boolean}[];
  candidates:number[];
  textileIds:number[];
  policyAssignments:{pawnId:number;policyId:number;automatic:boolean}[];
  wear:{nextWearAt:number;rng:number};
  tailoringCompleted:number;
}

const preparation=new WeakMap<World,HabitatApparelLoadInitial>();
const key=(w:World,c:Cell)=>c.z*w.width+c.x;
const livingColonists=(w:World)=>w.pawns.filter(p=>(p.faction??'colony')==='colony'&&!p.visitor&&p.state!=='dead');

function freeIsland(w:World):Cell {
  const occupied=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.pawns,...w.resources,...w.wildlife?.animals??[],...w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[])].map(c=>key(w,c)));
  for(let z=12;z<w.height-16;z++)for(let x=12;x<w.width-22;x++) {
    let ok=true;for(let dz=0;dz<10&&ok;dz++)for(let dx=0;dx<18;dx++) {
      const i=key(w,{x:x+dx,z:z+dz});if(w.tiles[i]?.terrain!=='grass'||occupied.has(i)){ok=false;break;}
    }
    if(ok)return {x,z};
  }
  throw Error('V90 habitat load has no free grass island');
}

export function habitatApparelLoad(count:number):World {
  if(count!==100)throw Error('The V90 HABITAT_APPAREL protocol is restricted to 100 original colonists');
  const w=hygieneLoad(count),hygiene=hygieneLoadInitial(w),origin=freeIsland(w),occupied=new Set<number>();
  w.research!.project=null;w.research!.points=CLOTHING_RESEARCH_COST;w.research!.completedAt=w.tick;
  w.research!.complexFurniture={points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:w.tick};
  const place=(kind:StructureKind,x:number,z:number,material:NonNullable<Structure['material']>,quality?:string,extra:Partial<Structure>={}):Structure=>{
    const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material,...extra};
    if(quality!==undefined)s.quality=quality as Structure['quality'];
    for(const c of footprintCells(s)){const i=key(w,c);if(occupied.has(i))throw Error(`V90 habitat furniture overlaps itself at ${c.x},${c.z}`);occupied.add(i);}
    w.structures.push(s);return s;
  };
  const furniture:HabitatApparelLoadInitial['furniture']=[];
  const remember=(s:Structure)=>{if(s.quality===undefined)throw Error('V90 furniture lacks quality');furniture.push({id:s.id,kind:s.kind,material:s.material!,quality:s.quality});return s;};
  remember(place('table-long',origin.x+2,origin.z+2,'wood','normal'));
  remember(place('dining-chair',origin.x+1,origin.z+2,'steel','good'));
  remember(place('dining-chair',origin.x+4,origin.z+2,'wood','poor'));
  remember(place('table-square',origin.x+8,origin.z+2,'steel','excellent'));
  remember(place('stool',origin.x+7,origin.z+2,'wood','normal'));
  remember(place('armchair',origin.x+12,origin.z+2,'cloth','good'));
  remember(place('armchair',origin.x+14,origin.z+2,'light-leather','normal'));
  remember(place('end-table',origin.x+16,origin.z+2,'steel','normal'));
  remember(place('dresser',origin.x+2,origin.z+8,'wood','normal'));
  const flowers:HabitatApparelLoadInitial['flowers']=[];
  for(const dx of [6,8]){
    const pot=remember(place('flower-pot',origin.x+dx,origin.z+8,'wood','normal',{flower:{...createFlowerPotState(true),plant:sowDaylily(w.tick)}}));
    flowers.push({id:pot.id,growth:pot.flower!.plant!.growth,lastTick:pot.flower!.plant!.lastTick});
  }
  const manualBill=newCookingBill(w.nextId++,'shirt');manualBill.mode='forever';manualBill.destination='drop';
  const electricBill=newCookingBill(w.nextId++,'pants');electricBill.mode='forever';electricBill.destination='drop';
  const manual=place('tailor-bench',origin.x+11,origin.z+8,'steel',undefined,{bills:[manualBill]});
  const electric=place('electric-tailor-bench',origin.x+15,origin.z+8,'steel',undefined,{power:{on:false,parentId:null},bills:[electricBill]});
  const workshops=[{id:manual.id,kind:manual.kind,billId:manualBill.id},{id:electric.id,kind:electric.kind,billId:electricBill.id}];
  const apparel:HabitatApparelLoadInitial['apparel']=[];
  const colonists=livingColonists(w);if(colonists.length!==count)throw Error(`V90 habitat load expected ${count} living colonists, got ${colonists.length}`);
  for(const [i,pawn] of colonists.entries()){
    const item='cloth-tribalwear',material='cloth' as ApparelMaterial;
    const pile=w.piles.find(p=>p.owner.type==='apparel'&&p.owner.pawnId===pawn.id&&p.item===item);
    if(!pile?.apparel)throw Error('V90 habitat load expected the existing worn tribalwear identity');
    pile.apparel={...newApparelState(item,material),hitPoints:i<6?60:i<8?40:newApparelState(item,material).hitPoints,material};
    const automatic=i<6;
    apparel.push({id:pile.id,pawnId:pawn.id,item,material,hitPoints:pile.apparel.hitPoints,automatic});
    const policyId=i%2===0?2:1;pawn.apparelPolicyId=policyId;pawn.apparelAutomation=false;pawn.nextApparelCheckAt=w.tick+600+i%20;
    if(automatic){pawn.apparelPolicyId=2;pawn.apparelAutomation=true;pawn.nextApparelCheckAt=w.tick+1+i;}
  }
  const apparelFilters={wood:false,food:false,apparel:true,textile:false,unfinished:false,weapon:false,medicine:false,component:false,blocks:false,steel:false,chunk:false,furniture:false};
  const stockApparel={id:w.nextId++,x:origin.x+0,z:origin.z+9,filters:apparelFilters,priority:2,capacity:75};
  const stockTextile={id:w.nextId++,x:origin.x+12,z:origin.z+9,filters:{wood:false,food:false,apparel:false,textile:true,unfinished:false,weapon:false,medicine:false,component:false,blocks:false,steel:false,chunk:false,furniture:false},priority:2,capacity:75};
  const apparelOffsets=[0,1,3,4,5,6] as const;
  const apparelStockCells=apparelOffsets.map((offset,i)=>({id:i===0?stockApparel.id:w.nextId++,x:origin.x+offset,z:origin.z+9,filters:apparelFilters,priority:2,capacity:75}));
  w.stockpiles.push(...apparelStockCells,stockTextile);
  addMaterial(w,'textile',75,{type:'ground',x:stockTextile.x,z:stockTextile.z},'cloth');
  addMaterial(w,'textile',75,{type:'ground',x:stockTextile.x+1,z:stockTextile.z},'light-leather');
  const candidates:number[]=[];
  for(const [i,item] of (['cloth-shirt','light-leather-shirt','cloth-pants','light-leather-pants','cloth-parka','light-leather-parka'] as const).entries()){
    const cell={x:origin.x+apparelOffsets[i]!,z:origin.z+9};addMaterial(w,'apparel',1,{type:'ground',...cell},item);
    const pile=w.piles.find(p=>p.owner.type==='ground'&&p.owner.x===cell.x&&p.owner.z===cell.z&&p.item===item);
    if(!pile?.apparel||pile.owner.type!=='ground')throw Error(`V90 prepared apparel candidate was not materialized: ${item}`);
    pile.apparel.quality='good';candidates.push(pile.id);
  }
  const wear={nextWearAt:w.tick+300,rng:w.apparelWear!.rng};w.apparelWear={...wear};
  refreshStock(w);
  const initial:HabitatApparelLoadInitial={hygiene,furniture,flowers,workshops,apparel,candidates,textileIds:w.piles.filter(p=>p.kind==='textile'&&p.owner.type==='ground'&&p.owner.x>=stockTextile.x&&p.owner.x<=stockTextile.x+1&&p.owner.z===stockTextile.z).map(p=>p.id),policyAssignments:colonists.map(p=>({pawnId:p.id,policyId:p.apparelPolicyId!,automatic:p.apparelAutomation!})),wear,tailoringCompleted:w.tailoring?.completed??0};
  const errors=validateWorld(w);if(errors.length)throw Error(`Invalid V90 habitat/apparel load: ${errors.join('; ')}; zones=${JSON.stringify(w.stockpiles.slice(-10).map(z=>({x:z.x,z:z.z})))}`);
  preparation.set(w,initial);return w;
}

export function habitatApparelLoadInitial(w:World):HabitatApparelLoadInitial {const initial=preparation.get(w);if(!initial)throw Error('V90 habitat/apparel load must be captured from its prepared world');return structuredClone(initial);}

export function habitatApparelLoadSummary(w:World,initial:HabitatApparelLoadInitial){
  const furniture=initial.furniture.map(item=>{const now=w.structures.find(s=>s.id===item.id);return {...item,present:!!now,qualityNow:now?.quality??null,materialNow:now?.material??null};});
  const flowers=initial.flowers.map(item=>{const pot=w.structures.find(s=>s.id===item.id),plant=pot?.flower?.plant;return {...item,present:!!pot?.flower,plantPresent:!!plant,growth:plant?.growth??null,initialLastTick:item.lastTick,lastTick:plant?.lastTick??null};});
  const apparel=initial.apparel.map(item=>{const pile=w.piles.find(p=>p.id===item.id),a=pile?.apparel,owner=pile?.owner;return {...item,present:!!pile,retained:!!pile&&(owner?.type==='ground'||owner?.type==='apparel'&&owner.pawnId===item.pawnId),worn:owner?.type==='apparel'&&owner.pawnId===item.pawnId,owner:owner?.type??null,hitPointsNow:a?.hitPoints??null,materialNow:a?.material??null};});
  return {hygiene:hygieneLoadSummary(w,initial.hygiene),furniture,flowers,workshops:initial.workshops.map(item=>{const s=w.structures.find(v=>v.id===item.id);return {...item,present:!!s,billPresent:!!s?.bills?.some(b=>b.id===item.billId),bills:s?.bills?.length??0};}),apparel,policies:w.apparelPolicies?.map(p=>({id:p.id,label:p.label,minHitPointsPercent:p.minHitPointsPercent}))??[],policyAssignments:initial.policyAssignments.map(a=>{const p=w.pawns.find(v=>v.id===a.pawnId);return {...a,policyIdNow:p?.apparelPolicyId??null,automaticNow:p?.apparelAutomation??null};}),wear:{initial:initial.wear,next:w.apparelWear??null,damaged:apparel.filter(a=>a.hitPointsNow!==null&&a.hitPointsNow<a.hitPoints).length},replacements:apparel.filter(a=>a.automatic&&!a.worn&&a.owner==='ground').length,candidateWorn:initial.candidates.filter(id=>w.piles.some(p=>p.id===id&&p.owner.type==='apparel')).length,candidatesPresent:initial.candidates.filter(id=>w.piles.some(p=>p.id===id)),textileIdsPresent:initial.textileIds.filter(id=>w.piles.some(p=>p.id===id)),tailoringCompleted:w.tailoring?.completed??0};
}

export function habitatApparelLoadOutcomeErrors(w:World,crops:readonly number[],initial:HabitatApparelLoadInitial):string[]{
  const errors=hygieneLoadOutcomeErrors(w,crops,initial.hygiene),s=habitatApparelLoadSummary(w,initial);
  if(s.furniture.some(f=>!f.present||f.qualityNow!==f.quality||f.materialNow!==f.material))errors.push('A prepared V90 furniture identity, quality or material changed');
  if(s.flowers.some(f=>!f.present||!f.plantPresent||f.lastTick===null||f.lastTick<=f.initialLastTick))errors.push('A prepared daylily flower did not remain physical and advancing');
  if(s.workshops.some(a=>!a.present||!a.billPresent))errors.push('A prepared V90 tailor workshop or bill disappeared');
  if(s.policies.length<2||s.policyAssignments.some(a=>a.policyIdNow!==a.policyId||a.automaticNow!==a.automatic))errors.push('Prepared apparel policies or assignments changed');
  if(s.apparel.some(a=>!a.present||!a.retained||a.materialNow!==a.material))errors.push('A prepared apparel identity or material was lost instead of being retained on a wearer or physical ground pile');
  if(s.replacements<1||s.candidateWorn<1)errors.push('No bounded automatic apparel policy check completed a physical candidate replacement');
  if(!s.wear.next||s.wear.next.nextWearAt<=initial.wear.nextWearAt||s.wear.damaged<1)errors.push('The announced ordinary apparel wear pulse did not advance or damage a garment');
  if(s.candidatesPresent.length!==initial.candidates.length||s.textileIdsPresent.length!==initial.textileIds.length)errors.push('Prepared V90 apparel candidates or textile inputs were lost');
  if(s.tailoringCompleted<initial.tailoringCompleted)errors.push('Tailoring completion ledger regressed');
  return errors;
}
