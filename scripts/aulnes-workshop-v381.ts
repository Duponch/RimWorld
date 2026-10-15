/** Declared V381 inheritance only. No ticks, public writes or fabricated
 * recipe/research history; ordinary continuation belongs to the driver. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {applyCommand,canDesignate} from '../src/sim/engine.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {groundCapacity} from '../src/sim/ground-placement.ts';
import {addMaterial,refreshStock,reservedSource} from '../src/sim/materials.ts';
import {newShelfStorage,storageAt} from '../src/sim/shelf-storage.ts';
import {projectProgress,researchCost} from '../src/sim/research.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type Cell,type Command,type Structure,type World} from '../src/sim/types.ts';
import type {ItemId} from '../src/sim/items.ts';

export const AULNES_V381_SOURCE='public/test-saves/v284/les-aulnes-integrees.json';
export const AULNES_V381_PARENT_SHA='e11bdf91eb592c1432a879b4d6fea296469ec7d7416537f6b5e8702a361e644d';
export const AULNES_V381_START=8434;
export const aulnesHash=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
export function aulnesCommand(world:World,command:Command):void {const result=applyCommand(world,command);assert.ok(result.ok,result.reason??JSON.stringify(command));}

export async function loadAulnesV284():Promise<{world:World;storedHash:string}> {
  const stored=readFileSync(AULNES_V381_SOURCE,'utf8'),raw=await decodeStoredSave(stored);
  assert.equal(aulnesHash(raw),AULNES_V381_PARENT_SHA,'The immutable V284 parent differs.');
  const header=JSON.parse(raw);assert.equal(header.schemaVersion,218);assert.equal(header.tick,AULNES_V381_START);
  return {world:deserializeWorld(raw),storedHash:aulnesHash(stored)};
}

export interface AulnesV381Preparation {
  preparedAt:number;sourceRawSha256:string;addedShelfIds:number[];addedCellIds:number[];
  uraniumPileIds:number[];armorId:number;taoId:number;policyId:number;billId:number;benchId:number;
  research:{project:'recon-armor';previousPoints:number;preparedPoints:number;releasedResearchers:number[]};
  colonialAvailableBefore:{plasteel:number;'advanced-component':number};
  declared:{woodShelves:2;uranium:40;normalReconArmor:1;finishedReconResearch:true};
}

function available(world:World,item:ItemId):number {
  return world.piles.reduce((sum,p)=>sum+(p.item===item&&p.owner.type==='ground'?Math.max(0,p.quantity-reservedSource(world,p.id)):0),0);
}
function exactEmptyCells(world:World,cells:readonly Cell[]):void {
  for(const c of cells){
    const at=(p:Cell)=>p.x===c.x&&p.z===c.z;
    assert.ok(!world.resources.some(at)&&!world.jobs.some(j=>footprintCells(j).some(at)),'Resolve an existing plant/job before this exact retrofit.');
    assert.ok(!world.piles.some(p=>p.owner.type==='ground'&&at(p.owner))&&!world.packed.some(p=>p.owner.type==='ground'&&at(p.owner)),'Do not teleport existing goods for shelf placement.');
    assert.ok(!world.stockpiles.some(at),'Existing stockpile cell identities stay intact.');
    assert.ok(!world.pawns.some(p=>at(p)||!!p.motion&&p.motion.end>world.tick&&at(p.motion.from)),'Do not place a shelf over an actor or captured movement.');
    assert.ok(!world.wildlife?.animals.some(a=>at(a)||!!a.motion&&a.motion.end>world.tick&&at(a.motion.from)),'Do not place a shelf over a historic animal.');
    assert.ok(world.roofing?.constructed.includes(c.z*world.width+c.x),'Keep the authored shelving inside the existing covered workshop.');
  }
}
function addShelf(world:World,cell:Cell,items:ItemId[]):Structure {
  const plan={type:'designate' as const,kind:'shelf' as const,...cell,orientation:0 as const,material:'wood' as const};
  const admitted=canDesignate(world,plan);assert.ok(admitted.ok,admitted.reason);
  exactEmptyCells(world,footprintCells({...plan,footprint:'standard'}));
  const shelf:Structure={id:world.nextId++,kind:'shelf',...cell,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([world.nextId++,world.nextId++])};
  shelf.shelf!.settings={capacity:500,priority:3,filters:{wood:false,food:false,...Object.fromEntries(items.map(item=>[item==='recon-armor'?'apparel':item,true]))},items:Object.fromEntries(items.map(item=>[item,true]))};
  world.structures.push(shelf);return shelf;
}
function finiteSupply(world:World,item:'uranium'|'recon-armor',quantity:number,cell:Cell):number[] {
  assert.ok(groundCapacity(world,cell,item)>=quantity,`No actual floor capacity for ${quantity} ${item}.`);
  const before=new Set(world.piles.map(p=>p.id));addMaterial(world,item==='uranium'?'uranium':'apparel',quantity,{type:'ground',...cell},item);
  return world.piles.filter(p=>!before.has(p.id)).map(p=>p.id);
}

export function prepareAulnesV381(source:World):{world:World;preparation:AulnesV381Preparation} {
  assert.equal(SCHEMA_VERSION,242);assert.equal(source.schemaVersion,SCHEMA_VERSION);
  assert.deepEqual([source.width,source.height,source.tick],[250,250,AULNES_V381_START]);
  assert.deepEqual(validateWorld(source),[]);assert.equal(source.secondarySite,undefined);
  assert.ok(!source.structures.some(s=>s.kind==='shelf'||s.kind==='small-shelf'),'This inheritance is single-use, from the fixed V284 parent.');
  assert.ok(!source.piles.some(p=>p.item==='uranium'||p.item==='recon-armor'||p.item==='unfinished-recon-armor'));
  const original=serializeWorld(source),world=structuredClone(source),bench=world.structures.find(s=>s.id===20946&&s.kind==='fabrication-bench');
  assert.ok(bench?.power?.on&&bench.bills,'Retain the powered historic fabrication bench.');
  const tao=world.pawns.find(p=>p.id===20331&&p.name==='Tao'),iris=world.pawns.find(p=>p.id===20322&&p.name==='Iris');
  assert.ok(tao&&iris&&world.research?.project==='recon-armor'&&iris.research);
  assert.ok(world.piles.some(p=>p.item==='recon-helmet'&&p.owner.type==='apparel'&&p.owner.pawnId===tao.id));
  const colonialAvailableBefore={plasteel:available(world,'plasteel'),'advanced-component':available(world,'advanced-component')};
  assert.ok(colonialAvailableBefore.plasteel>=80&&colonialAvailableBefore['advanced-component']>=3,'Only free colonial ground stocks may supply the new bill.');
  const researchBefore=projectProgress(world.research,'recon-armor').points,releasedResearchers=world.pawns.filter(p=>p.research).map(p=>p.id);
  // Normal cancellation frees Iris's actual desk/analyzer reservation. No
  // worked ticks, XP or completion event is invented by the declared knowledge.
  aulnesCommand(world,{type:'research-project',project:null});
  assert.ok(releasedResearchers.every(id=>!world.pawns.find(p=>p.id===id)!.research));
  Object.assign(projectProgress(world.research,'recon-armor'),{points:researchCost('recon-armor'),completedAt:world.tick});
  const inputs=addShelf(world,{x:124,z:142},['uranium','plasteel','advanced-component']),output=addShelf(world,{x:130,z:142},['recon-armor']);
  // Supplies begin on nearby bare floor; real haulers own their later storage.
  const uraniumPileIds=finiteSupply(world,'uranium',40,{x:126,z:142}),armorId=finiteSupply(world,'recon-armor',1,{x:129,z:142})[0]!;
  const armor=world.piles.find(p=>p.id===armorId)!;assert.equal(armor.apparel?.quality,'normal');
  const prior=world.apparelPolicies!.find(p=>p.id===tao.apparelPolicyId);assert.ok(prior&&world.nextApparelPolicyId);
  const policyId=world.nextApparelPolicyId++;
  world.apparelPolicies!.push({...structuredClone(prior),id:policyId,label:'Garde des Aulnes',allowedItems:[...new Set([...prior.allowedItems,'recon-armor' as const])]});
  // Manual issue first; no automatic remote wardrobe grant can precede it.
  aulnesCommand(world,{type:'apparel-policy-assign',pawnId:tao.id,policyId,automatic:false});
  aulnesCommand(world,{type:'bill-add',structureId:bench.id,recipe:'make-recon-armor'});
  const bill=bench.bills.at(-1)!;bill.radius=32;
  while(bench.bills[0]!.id!==bill.id)aulnesCommand(world,{type:'bill-move',structureId:bench.id,billId:bill.id,direction:-1});
  refreshStock(world);
  for(const s of [inputs,output])for(const id of s.shelf!.cells)assert.ok(storageAt(world,footprintCells(s)[s.shelf!.cells.indexOf(id)]!)?.id===id);
  assert.equal(world.tick,source.tick);assert.equal(world.rng,source.rng);
  assert.deepEqual(source.pawns.map(p=>p.id),world.pawns.map(p=>p.id));
  assert.deepEqual(source.wildlife?.animals.map(a=>a.id),world.wildlife?.animals.map(a=>a.id));
  for(const key of ['pawns','structures','piles','resources'] as const){const ids=new Set(world[key].map(p=>p.id));assert.ok(source[key].every(p=>ids.has(p.id)),`A historic ${key} identity was removed.`);}
  assert.equal(serializeWorld(source),original);assert.deepEqual(validateWorld(world),[]);
  return {world,preparation:{preparedAt:world.tick,sourceRawSha256:AULNES_V381_PARENT_SHA,addedShelfIds:[inputs.id,output.id],addedCellIds:[...inputs.shelf!.cells,...output.shelf!.cells],
    uraniumPileIds,armorId,taoId:tao.id,policyId,billId:bill.id,benchId:bench.id,research:{project:'recon-armor',previousPoints:researchBefore,preparedPoints:researchCost('recon-armor'),releasedResearchers},
    colonialAvailableBefore,declared:{woodShelves:2,uranium:40,normalReconArmor:1,finishedReconResearch:true}}};
}
