import {expect} from '@playwright/test';
import {validateWorld} from '../../src/sim/serialization';
import {campaignPhysicalCaptures} from '../../src/sim/campaign-people';
import {groupProvisionCounts} from '../../src/sim/group-provisions';
import {isColonist} from '../../src/sim/affiliation';
import type {MaterialPile,World} from '../../src/sim/types';
import type {HumanOwnerKind,HumanPlace} from '../../src/sim/human-owners';
import type {GroupState} from '../../src/sim/group-state';

const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
type Site='home'|'secondary';
type CarriedGroup=Extract<GroupState,{members:unknown}>;
interface HumanRow {
  id:number;name:string;site:Site;owner:HumanOwnerKind;place:HumanPlace;
  status:string;faction:string|null;pawnState:string|null;colonist:boolean;
  itemIds:number[];
}
interface PileRow {site:Site;container:string;pile:MaterialPile}
export interface HumanGoodsCapture {
  tick:number;schema:number;
  maps:{site:Site;width:number;height:number;cells:number;localPawns:number;localColonists:number;localPiles:number;resources:number;structures:number;jobs:number}[];
  humans:HumanRow[];piles:PileRow[];
  externalStock:{site:Site;pile:unknown}[];
  packed:{site:Site;container:string;record:unknown}[];
  structures:{site:Site;record:World['structures'][number]}[];
  groups:{site:Site;id:number;phase:GroupState['phase'];memberIds:number[];ledger:GroupState['ledger'];
    provisions:GroupState['provisions']|null;baseline:CarriedGroup['baseline']|null;counts:ReturnType<typeof groupProvisionCounts>|null}[];
  losses:{site:Site;groupId:number;pawnId:number;tick:number}[];
  limits:string[];
}

/** Rare capture of a COMPLETE decoded save, outside all performance windows.
 * Reuses the real campaign owner capture and validator. In particular the
 * existing group-save equations use baseline minus actual ingestion/spoilage,
 * not a fictitious constant quantity of food throughout the trip. */
export function captureHumanGoods(world:World):HumanGoodsCapture {
  expect(Object.hasOwn(world,'campaignMap'),'Use complete export, not the active-map projection.').toBe(false);
  expect(world.schemaVersion,'Prepare against adopted V396 or newer.').toBeGreaterThanOrEqual(252);
  expect(validateWorld(world)).toEqual([]);
  const maps:HumanGoodsCapture['maps']=[],humans:HumanRow[]=[],piles:PileRow[]=[],packed:HumanGoodsCapture['packed']=[],
    structures:HumanGoodsCapture['structures']=[],groups:HumanGoodsCapture['groups']=[],losses:HumanGoodsCapture['losses']=[],
    externalStock:HumanGoodsCapture['externalStock']=[];
  const captures=campaignPhysicalCaptures(world);
  captures.forEach(({world:local,owners},index)=>{
    const site:Site=index===0?'home':'secondary';
    if(local)maps.push({site,width:local.width,height:local.height,cells:local.width*local.height,localPawns:local.pawns.length,
      localColonists:local.pawns.filter(p=>isColonist(p)&&!p.prisoner&&p.state!=='dead').length,
      localPiles:local.piles.length,resources:local.resources.length,structures:local.structures.length,jobs:local.jobs.length});
    for(const slot of owners.slots){
      humans.push({id:slot.id,name:slot.name,site,owner:slot.kind,place:clone(slot.place),status:slot.status,
        faction:slot.pawn?(slot.pawn.faction??'colony'):null,pawnState:slot.pawn?.state??null,colonist:!!slot.pawn&&isColonist(slot.pawn)&&!slot.pawn.prisoner,
        itemIds:slot.items.map(p=>p.id).sort((a,b)=>a-b)});
      // Map possessions are already in local.piles. Other real owner slots
      // partition their actual inventories/archives; no reference roster union.
      if(slot.kind!=='map'){
        for(const pile of slot.items)piles.push({site,container:slot.kind+':'+slot.id,pile:clone(pile)});
        for(const record of slot.packed)packed.push({site,container:slot.kind+':'+slot.id,record:clone(record)});
      }
    }
    if(!local)return;
    for(const pile of local.piles)piles.push({site,container:'map',pile:clone(pile)});
    for(const record of local.packed)packed.push({site,container:'map',record:clone(record)});
    for(const record of local.structures)structures.push({site,record:clone(record)});
    for(const pile of local.civilianPost?.stock??[])externalStock.push({site,pile:clone(pile)});
    const g=local.group;
    if(g)groups.push({site,id:g.id,phase:g.phase,memberIds:'members' in g?g.members.map(p=>p.id):[...g.memberIds],
      ledger:clone(g.ledger),provisions:g.provisions?clone(g.provisions):null,baseline:'members' in g?clone(g.baseline):null,
      counts:'members' in g?groupProvisionCounts(g.items.filter(p=>p.owner.type==='inventory'),local.tick):null});
    for(const loss of local.groupLosses??[])losses.push({site,groupId:loss.groupId,pawnId:loss.pawn.id,tick:loss.tick});
  });
  // Occurrences remain occurrences. Never hide a collision by deduplicating.
  expect(new Set(humans.map(p=>p.id)).size).toBe(humans.length);
  expect(new Set(piles.map(p=>p.pile.id)).size).toBe(piles.length);
  return {tick:world.tick,schema:world.schemaVersion,maps,humans:humans.sort((a,b)=>a.id-b.id),
    piles:piles.sort((a,b)=>a.pile.id-b.pile.id),packed,structures,groups,losses,externalStock,limits:[
      'Complete-save owner/shape/conservation guards are reused. This snapshot is not a new global economy ledger.',
      'Material IDs may legitimately split/merge through pickup/deposit; owner, item, quantity, damage, rot and poison are captured without asserting ID permanence through a transfer.',
      'Food quantity is allowed to fall by real ingestion/spoilage. Existing away-group baseline/ledger equations are validated, not reset or neutralized.',
      'Production, fuel, repairs, damage, local ingestion and other active work can change stocks between distant ticks; do not assert equal aggregate item quantities across free play.',
      'Exact save/reload is still asserted with complete Worlds by the existing exportCampaign/expectWorld path, not this smaller capture.',
    ]};
}

/** Original humans must each still have exactly one real owner. The driver
 * chooses when/where they should be on-map; hunger/health/jobs may evolve.
 * Real incapacity/death is retained as a failing safety checkpoint, not repaired. */
export function assertHumanGoodsPeople(before:HumanGoodsCapture,after:HumanGoodsCapture,ids=before.humans.filter(p=>p.colonist&&p.pawnState!=='dead').map(p=>p.id)):void {
  expect(after.tick).toBeGreaterThanOrEqual(before.tick);
  for(const id of ids){
    const original=before.humans.find(p=>p.id===id),owners=after.humans.filter(p=>p.id===id);
    expect(original,'Original human '+id).toBeDefined();expect(owners,'Unique real owner for '+id).toHaveLength(1);
    const owner=owners[0]!;
    expect(owner.name).toBe(original!.name);expect(owner.pawnState).not.toBeNull();
    expect(owner.pawnState,'Original human clinically alive '+id).not.toBe('dead');
    expect(owner.pawnState,'Stop on real incapacity '+id).not.toBe('downed');
  }
}