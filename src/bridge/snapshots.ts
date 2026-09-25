import { isFloorKind } from '../sim/flooring.ts';
import { validPlantLife } from '../sim/plant-life-save.ts';
import { resourceMaxHp } from '../sim/thing-damage-rules.ts';
import { validPlantThermalFactor } from '../sim/thermal-plants.ts';
import { isPlant } from '../sim/plants.ts';
import { validOre } from '../sim/ore.ts';
import { validMiningDamage } from '../sim/mining-rules.ts';
import { validStoneIdentity } from '../sim/geology.ts';
import { ITEM_DEFINITIONS } from '../sim/items.ts';
import { validFoodContamination } from '../sim/food-poisoning-save.ts';
import { validHumanCorpseShape } from '../sim/burial-save.ts';
import { validCorpseShape } from '../sim/corpse-save.ts';
import { validGunWorkShape } from '../sim/gun-work.ts';
import { validUnfinishedShape } from '../sim/unfinished.ts';
import { validApparelShape } from '../sim/apparel-save.ts';
import { validWeaponShape } from '../sim/equipment-save.ts';
import { pileMaxHp } from '../sim/thing-damage-rules.ts';
import type { MaterialPile, Resource, Terrain, Tile, World } from '../sim/types.ts';

type DynamicWorld = Omit<World, 'tiles' | 'resources' | 'piles'> & { readonly piles?: never };
interface ResourceChanges { removed: number[]; upserted: Resource[]; order?: number[]; growth?:Float64Array }
interface PileChanges { removed: number[]; upserted: MaterialPile[]; order?: number[] }
interface SnapshotHeader { motion?:import('./motion-tracks.ts').PawnTrack[]; type: 'snapshot'; epoch: number; revision: number; stepMs: number; speed: number }
export type SnapshotMessage = SnapshotHeader & (
  | { kind: 'checkpoint'; world: World }
  | { kind: 'delta'; baseRevision: number; world: DynamicWorld; tiles?: Array<[number, Terrain, Tile['stone']?, Tile['miningDamage']?, Tile['ore']?, Tile['floor']?]>; resources?: ResourceChanges; piles?: PileChanges }
);

const equalResourceBase = (a: Resource, b: Resource): boolean => a.id === b.id && a.kind === b.kind && a.species === b.species
  && a.x === b.x && a.z === b.z && a.amount === b.amount && a.stone === b.stone && a.damage === b.damage
  && a.plantLife?.since === b.plantLife?.since && a.plantLife?.bornAt === b.plantLife?.bornAt
  && a.plantLife?.age === b.plantLife?.age && a.plantLife?.darkTicks === b.plantLife?.darkTicks
  && a.plantLife?.leaflessAt === b.plantLife?.leaflessAt && a.plantLife?.nextCheck === b.plantLife?.nextCheck;
const copyResource=(r:Resource):Resource=>({...r,...r.plantLife?{plantLife:{...r.plantLife}}:{}});

/** Preserve own-property presence, nested values and exact floating-point bits. */
function equalPileValue(a:unknown,b:unknown):boolean {
  if(Object.is(a,b))return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const left=Object.keys(a),right=Object.keys(b);
  return left.length===right.length&&left.every((key,index)=>key===right[index]&&Object.hasOwn(b,key)
    &&equalPileValue((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key]));
}
const copyPile=(pile:MaterialPile):MaterialPile=>structuredClone(pile);

/** Check a transported pile using the same item and optional-state contracts as saves. */
function validPile(pile:MaterialPile,world:DynamicWorld):boolean {
  if(!pile||typeof pile!=='object'||Array.isArray(pile)||!Number.isSafeInteger(pile.id)||pile.id<1||pile.id>=world.nextId
    ||typeof pile.item!=='string'||!Object.hasOwn(ITEM_DEFINITIONS,pile.item))return false;
  const definition=ITEM_DEFINITIONS[pile.item],owner=pile.owner;
  if(pile.kind!==definition.kind||!Number.isSafeInteger(pile.quantity)||pile.quantity<1||pile.quantity>definition.stackLimit
    ||!owner||typeof owner!=='object'||Array.isArray(owner))return false;
  if(owner.type==='ground'){
    if(!Number.isSafeInteger(owner.x)||!Number.isSafeInteger(owner.z)||owner.x<0||owner.z<0||owner.x>=world.width||owner.z>=world.height
      ||Object.keys(owner).some(key=>!['type','x','z'].includes(key)))return false;
  }else if(owner.type==='pawn'||owner.type==='inventory'||owner.type==='equipment'||owner.type==='apparel'){
    if(!Number.isSafeInteger(owner.pawnId)||owner.pawnId<1||!world.pawns.some(p=>p.id===owner.pawnId)
      ||Object.keys(owner).some(key=>!['type','pawnId'].includes(key)))return false;
  }else if(owner.type==='job'){
    if(!Number.isSafeInteger(owner.jobId)||owner.jobId<1||!world.jobs.some(job=>job.id===owner.jobId)
      ||Object.keys(owner).some(key=>!['type','jobId'].includes(key)))return false;
  }else if(owner.type==='grave'){
    if(world.schemaVersion<89||!Number.isSafeInteger(owner.graveId)||owner.graveId<1||!world.structures.some(s=>s.id===owner.graveId&&s.kind==='grave')
      ||Object.keys(owner).some(key=>!['type','graveId'].includes(key)))return false;
  }else return false;
  if(Object.keys(pile).some(key=>!['id','kind','item','quantity','owner','rot','foodPoison','corpse','humanCorpse','damage','unfinished','gunWork','apparel','weapon','haulRequested'].includes(key)))return false;
  if(pile.haulRequested!==undefined&&(world.schemaVersion<28||pile.kind!=='chunk'||pile.haulRequested!==true))return false;
  if(pile.damage!==undefined&&(world.schemaVersion<87||!Number.isSafeInteger(pile.damage)||pile.damage<1||pile.damage>=pileMaxHp(pile)))return false;
  const rot=pile.rot;
  if(rot!==undefined&&(!rot||typeof rot!=='object'||!Number.isFinite(rot.progress)||rot.progress<0
    ||!Number.isSafeInteger(rot.atTick)||rot.atTick<0||rot.atTick>world.tick
    ||rot.rate!==undefined&&(!Number.isFinite(rot.rate)||rot.rate<0||rot.rate>1)))return false;
  const record=pile as unknown as Record<string,unknown>;
  return validFoodContamination(pile.foodPoison,pile.item,world.schemaVersion>=89)
    &&(pile.item==='human-corpse'?validHumanCorpseShape(pile.humanCorpse,world.schemaVersion,world.tick):pile.humanCorpse===undefined)
    &&(pile.item==='human-corpse'||validCorpseShape(record,world.schemaVersion))
    &&validUnfinishedShape(record,world.schemaVersion)&&validGunWorkShape(record,world.schemaVersion)
    &&validApparelShape(record,world.schemaVersion)
    &&validWeaponShape(record,world.schemaVersion);
}

/** Transport cache only: never mutates the simulation or contributes to a saved game. */
export class SnapshotEncoder {
  private source: World | undefined;
  private epoch = 0;
  private revision = 0;
  private width = 0;
  private height = 0;
  private terrain: Terrain[] = [];
  private damage: Tile['miningDamage'][] = [];
  private ores: Tile['ore'][] = [];
  private floors: Tile['floor'][] = [];
  private stones: Tile['stone'][] = [];
  private resources = new Map<number, Resource>();
  private orderedResources: Resource[] = [];
  private piles = new Map<number, MaterialPile>();
  private orderedPiles: MaterialPile[] = [];

  /** postMessage must follow synchronously: it owns cloning the returned dynamic state. */
  encode(world: World, stepMs: number, speed: number, checkpoint = false): SnapshotMessage {
    const replacement = world !== this.source || world.width !== this.width || world.height !== this.height;
    if (replacement) { this.epoch++; this.revision = 0; }
    const baseRevision = this.revision++;
    const header: SnapshotHeader = { type: 'snapshot', epoch: this.epoch, revision: this.revision, stepMs, speed };
    if (replacement || checkpoint) {
      this.source = world; this.width = world.width; this.height = world.height;
      this.terrain = world.tiles.map(tile => tile.terrain);
      this.stones = world.tiles.map(tile => tile.stone);this.damage=world.tiles.map(t=>t.miningDamage);this.ores=world.tiles.map(t=>t.ore);this.floors=world.tiles.map(t=>t.floor);
      this.orderedResources = world.resources.map(copyResource);
      this.resources = new Map(this.orderedResources.map(resource => [resource.id, resource]));
      this.orderedPiles = world.piles.map(copyPile);
      this.piles = new Map(this.orderedPiles.map(pile => [pile.id, pile]));
      return { ...header, kind: 'checkpoint', world };
    }

    const tiles: Array<[number, Terrain, Tile['stone']?, Tile['miningDamage']?, Tile['ore']?, Tile['floor']?]> = [];
    for (let index = 0; index < world.tiles.length; index++) {
      const {terrain,stone,miningDamage:damage,ore,floor}=world.tiles[index]!;
      if (this.terrain[index] !== terrain || this.stones[index] !== stone || this.damage[index]!==damage || this.ores[index]!==ore || this.floors[index]!==floor) {
        tiles.push(floor!==undefined?[index,terrain,stone,damage,ore,floor]:ore!==undefined?[index,terrain,stone,damage,ore]:damage!==undefined?[index,terrain,stone,damage]:stone === undefined ? [index, terrain] : [index, terrain, stone]);
        this.terrain[index] = terrain; this.stones[index] = stone;this.damage[index]=damage;this.ores[index]=ore;this.floors[index]=floor;
      }
    }
    const upserted: Resource[] = [];
    const growthValues:number[]=[],growthUpdates:Resource[]=[];
    let nextOrder: Resource[] | undefined = world.resources.length !== this.orderedResources.length ? [] : undefined;
    for (let index = 0; index < world.resources.length; index++) {
      const resource = world.resources[index]!;
      const ordered = this.orderedResources[index];
      const sameSlot = ordered?.id === resource.id;
      if (!sameSlot && !nextOrder) nextOrder = this.orderedResources.slice(0, index);
      // Most publications preserve order. Avoid hashing every unchanged plant,
      // but still compare values: simulation edits objects in place.
      const previous = sameSlot ? ordered : this.resources.get(resource.id);
      let cached = previous;
      const sameBase=previous!==undefined&&equalResourceBase(previous,resource);
      if (!sameBase || previous!.growth!==resource.growth || previous!.growthTick!==resource.growthTick || previous!.growthThermalFactor!==resource.growthThermalFactor) {
        const copy = copyResource(resource);
        // Exact doubles, not rounded presentation values. A whole forest can
        // change its thermal growth factor without cloning its full identities.
        if(sameBase&&resource.growth!==undefined&&resource.growthTick!==undefined){
          growthValues.push(resource.id,resource.growth,resource.growthTick,resource.growthThermalFactor??NaN);growthUpdates.push(copy);
        }else upserted.push(copy);
        if (sameSlot) this.orderedResources[index] = copy;
        cached = copy;
      }
      nextOrder?.push(cached!);
    }
    let changes: ResourceChanges | undefined;
    if (upserted.length || growthUpdates.length || nextOrder) {
      const removed: number[] = [];
      changes = { removed, upserted };
      if(growthValues.length)changes.growth=new Float64Array(growthValues);
      // Metadata/quantities alone cannot alter membership or ordering. Only
      // structural edits need the ID set and an optional explicit order.
      if (nextOrder) {
        const currentIds = new Set(world.resources.map(resource => resource.id));
        const implicitOrder: number[] = [];
        for (const resource of this.orderedResources) {
          if (currentIds.has(resource.id)) implicitOrder.push(resource.id);
          else removed.push(resource.id);
        }
        for (const resource of upserted) if (!this.resources.has(resource.id)) implicitOrder.push(resource.id);
        if (implicitOrder.some((id, index) => id !== world.resources[index]?.id)) changes.order = world.resources.map(resource => resource.id);
      }
      for (const id of removed) this.resources.delete(id);
      for (const resource of upserted) this.resources.set(resource.id, resource);
      for (const resource of growthUpdates) this.resources.set(resource.id, resource);
      if (nextOrder) this.orderedResources = nextOrder;
    }
    const pileUpserts:MaterialPile[]=[];
    let nextPileOrder:MaterialPile[]|undefined=world.piles.length!==this.orderedPiles.length?[]:undefined;
    for(let index=0;index<world.piles.length;index++){
      const pile=world.piles[index]!,ordered=this.orderedPiles[index],sameSlot=ordered?.id===pile.id;
      if(!sameSlot&&!nextPileOrder)nextPileOrder=this.orderedPiles.slice(0,index);
      const previous=sameSlot?ordered:this.piles.get(pile.id);
      let cached=previous;
      if(!previous||!equalPileValue(previous,pile)){
        const copy=copyPile(pile);pileUpserts.push(copy);cached=copy;
        if(sameSlot)this.orderedPiles[index]=copy;
      }
      nextPileOrder?.push(cached!);
    }
    let pileChanges:PileChanges|undefined;
    if(pileUpserts.length||nextPileOrder){
      const removed:number[]=[];pileChanges={removed,upserted:pileUpserts};
      if(nextPileOrder){
        const currentIds=new Set(world.piles.map(p=>p.id)),implicitOrder:number[]=[];
        for(const pile of this.orderedPiles){
          if(currentIds.has(pile.id))implicitOrder.push(pile.id);
          else removed.push(pile.id);
        }
        for(const pile of pileUpserts)if(!this.piles.has(pile.id))implicitOrder.push(pile.id);
        if(implicitOrder.some((id,index)=>id!==world.piles[index]?.id))pileChanges.order=world.piles.map(p=>p.id);
      }
      for(const id of removed)this.piles.delete(id);
      for(const pile of pileUpserts)this.piles.set(pile.id,pile);
      if(nextPileOrder)this.orderedPiles=nextPileOrder;
    }
    const { tiles: _tiles, resources: _resources, piles: _piles, ...dynamic } = world;
    return { ...header, kind: 'delta', baseRevision, world: dynamic,
      ...(tiles.length ? { tiles } : {}), ...(changes ? { resources: changes } : {}), ...(pileChanges ? { piles: pileChanges } : {}) };
  }
}

export type SnapshotAdoption = { status: 'applied'; world: World; replaced: boolean } | { status: 'stale' } | { status: 'resync'; reason: string };

/** Reuses stable arrays and replaces changed arrays; previous render snapshots remain intact. */
export class SnapshotDecoder {
  private epoch = 0;
  private revision = 0;
  private current: World | undefined;
  // The decoder owns immutable snapshots. Membership changes rebuild this
  // index; ordinary growth/metadata packets only copy the array of references.
  private resourceSlots = new Map<number, number>();
  private pileSlots = new Map<number, number>();

  adopt(message: SnapshotMessage): SnapshotAdoption {
    const resync = (reason: string): SnapshotAdoption => ({ status: 'resync', reason });
    if (!Number.isSafeInteger(message.epoch) || message.epoch < 1
      || !Number.isSafeInteger(message.revision) || message.revision < 1) return resync('Révision de snapshot invalide.');
    if (message.epoch < this.epoch || (message.epoch === this.epoch && message.revision <= this.revision)) return { status: 'stale' };
    let next: World;
    let reindexResources = message.kind === 'checkpoint';
    let reindexPiles = message.kind === 'checkpoint';
    if (message.kind === 'checkpoint') {
      if (message.world.tiles.length !== message.world.width * message.world.height) return resync('Dimensions du checkpoint invalides.');
      next = message.world;
    } else {
      const previous = this.current;
      if (!previous || message.epoch !== this.epoch || message.baseRevision !== this.revision
        || message.revision !== message.baseRevision + 1) return resync('Snapshot intermédiaire manquant.');
      if (message.world.width !== previous.width || message.world.height !== previous.height
        || message.world.schemaVersion !== previous.schemaVersion) return resync('Le delta appartient à une autre carte.');
      let tiles = previous.tiles;
      if (message.tiles?.length) {
        const touched = new Set<number>();
        for (const [index, terrain, stone, miningDamage, ore, floor] of message.tiles) {
          if (!Number.isInteger(index) || index < 0 || index >= tiles.length || touched.has(index)
            || !['grass', 'soil', 'water', 'rock', ...(message.world.schemaVersion>=28?['rough-stone']:[]), ...(message.world.schemaVersion>=83?['rich-soil','gravel']:[])].includes(terrain) || floor!==undefined&&(message.world.schemaVersion<89||!isFloorKind(floor)||terrain==='water'||terrain==='rock') || !validOre({terrain,ore},message.world.schemaVersion) || !validMiningDamage({terrain,stone,miningDamage,ore},message.world.schemaVersion) || !validStoneIdentity(stone, terrain, message.world.schemaVersion)) return resync('Delta de terrain invalide.');
          touched.add(index);
        }
        tiles = tiles.slice();
        for (const [index, terrain, stone, miningDamage, ore, floor] of message.tiles) tiles[index] = {terrain,...stone===undefined?{}:{stone},...miningDamage===undefined?{}:{miningDamage},...ore===undefined?{}:{ore},...floor===undefined?{}:{floor}};
      }
      let resources = previous.resources;
      if (message.resources) {
        const { removed, upserted, order, growth } = message.resources;
        const sparse = !removed.length && !order && upserted.every(resource => this.resourceSlots.has(resource.id));
        const byId = sparse ? undefined : new Map(resources.map(resource => [resource.id, resource]));
        // Candidate mutations stay private until the complete packet validates.
        const patches = new Map<number, Resource>();
        const read = (id:number):Resource|undefined => byId ? byId.get(id) : resources[this.resourceSlots.get(id) ?? -1];
        const write = (resource:Resource):void => { if(byId)byId.set(resource.id,resource);else patches.set(resource.id,resource); };
        const touched = new Set<number>();
        for (const id of removed) {
          if (!byId!.delete(id) || touched.has(id)) return resync('Suppression de ressource invalide.');
          touched.add(id);
        }
        for (const resource of upserted) {
          if(!validPlantLife(resource,message.world.schemaVersion,message.world)||resource.damage!==undefined&&(message.world.schemaVersion<87||!Number.isSafeInteger(resource.damage)||resource.damage<1||resource.damage>=resourceMaxHp(resource)))return resync('État végétal invalide.');
          if (!validPlantThermalFactor(resource,message.world.schemaVersion)) return resync('Facteur thermique végétal invalide.');
          if (!validStoneIdentity(resource.stone, resource.kind, message.world.schemaVersion)) return resync('Identité géologique invalide.');
          if (touched.has(resource.id)) return resync('Ressource modifiée plusieurs fois.');
          touched.add(resource.id); write(resource);
        }
        if(growth!==undefined){
          if(!(growth instanceof Float64Array)||growth.length%4||growth.length>previous.width*previous.height*4)return resync('Delta de croissance invalide.');
          for(let i=0;i<growth.length;i+=4){
            const id=growth[i]!,value=growth[i+1]!,tick=growth[i+2]!,factor=growth[i+3]!,old=read(id);
            if(!old||!isPlant(old)||touched.has(id)||!Number.isSafeInteger(id)||!Number.isFinite(value)||value<0||value>1||!Number.isSafeInteger(tick)||tick<0||tick>message.world.tick||!Number.isNaN(factor)&&(!Number.isFinite(factor)||factor<0||factor>1))return resync('Delta de croissance invalide.');
            const updated={...old,growth:value,growthTick:tick};
            if(Number.isNaN(factor))delete updated.growthThermalFactor;else updated.growthThermalFactor=factor;
            if(!validPlantLife(updated,message.world.schemaVersion,message.world)||!validPlantThermalFactor(updated,message.world.schemaVersion))return resync('Delta de croissance invalide.');
            touched.add(id);write(updated);
          }
        }
        if (order) {
          if (order.length !== byId!.size || new Set(order).size !== order.length
            || order.some(id => !byId!.has(id))) return resync('Ordre des ressources invalide.');
          resources = order.map(id => byId!.get(id)!);
        } else if(byId) resources = [...byId.values()];
        else {
          resources = resources.slice();
          for(const [id,resource] of patches)resources[this.resourceSlots.get(id)!]=resource;
        }
        reindexResources = !sparse;
      }
      let piles=previous.piles;
      if(message.piles){
        const {removed,upserted,order}=message.piles;
        if(!Array.isArray(removed)||!Array.isArray(upserted)||order!==undefined&&!Array.isArray(order))return resync('Delta de piles invalide.');
        const sparse=!removed.length&&!order&&upserted.every(p=>p&&this.pileSlots.has(p.id));
        const byId=sparse?undefined:new Map(piles.map(p=>[p.id,p]));
        const patches=new Map<number,MaterialPile>(),touched=new Set<number>();
        for(const id of removed){
          if(!Number.isSafeInteger(id)||touched.has(id)||!byId?.delete(id))return resync('Suppression de pile invalide.');
          touched.add(id);
        }
        for(const pile of upserted){
          if(!validPile(pile,message.world)||touched.has(pile.id))return resync('Pile modifiée invalide.');
          touched.add(pile.id);
          if(byId)byId.set(pile.id,pile);else patches.set(pile.id,pile);
        }
        if(order){
          if(order.length!==byId!.size||new Set(order).size!==order.length||order.some(id=>!Number.isSafeInteger(id)||!byId!.has(id)))return resync('Ordre des piles invalide.');
          piles=order.map(id=>byId!.get(id)!);
        }else if(byId)piles=[...byId.values()];
        else if(patches.size){
          piles=piles.slice();
          for(const [id,pile] of patches)piles[this.pileSlots.get(id)!]=pile;
        }
        reindexPiles=!sparse;
      }
      // Keep the checkpoint's property order for exact JSON/save comparisons.
      next = { ...previous, ...message.world, tiles, resources, piles };
      // DynamicWorld is a complete replacement, not a partial field patch.
      // In particular an absent sparse collection means it was removed.
      for(const key of Object.keys(previous) as (keyof World)[])if(key!=='tiles'&&key!=='resources'&&key!=='piles'&&!Object.hasOwn(message.world,key))delete (next as Partial<World>)[key];
    }
    // Commit only after every patch is checked. A refusal preserves both state and revision.
    const replaced = message.epoch !== this.epoch;
    if(reindexResources){this.resourceSlots.clear();for(let i=0;i<next.resources.length;i++)this.resourceSlots.set(next.resources[i]!.id,i);}
    if(reindexPiles){this.pileSlots.clear();for(let i=0;i<next.piles.length;i++)this.pileSlots.set(next.piles[i]!.id,i);}
    this.current = next; this.epoch = message.epoch; this.revision = message.revision;
    return { status: 'applied', world: next, replaced };
  }
}
