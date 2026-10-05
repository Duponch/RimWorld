import { validTelevisionState } from '../sim/television-save.ts';
import { validMiniTurretShape,validateMiniTurrets } from '../sim/mini-turret-save.ts';
import { validBombWaveShape,validateBombWaves } from '../sim/bomb-state.ts';
import { validBombRefugeShape,validateBombRefuges } from '../sim/bomb-danger.ts';
import { validateProjectiles } from '../sim/projectile-save.ts';
import { validSandbagsState } from '../sim/sandbags-save.ts';
import { validPackagedSurvivalState } from '../sim/packaged-survival-save.ts';
import { validHospitalBedState } from '../sim/hospital-bed-save.ts';
import { validArtWorkShape } from '../sim/art-work.ts';
import { validStorageConditions } from '../sim/storage-condition.ts';
import { validFlakWorkShape } from '../sim/flak-work.ts';
import { validComponentWorkShape } from '../sim/component-work.ts';
import { isFloorKind } from '../sim/flooring.ts';
import { validPlantLife } from '../sim/plant-life-save.ts';
import { isCropKindInVersion } from '../sim/crops.ts';
import { validFireResourceLosses } from '../sim/fire-save.ts';
import { validPlantSkill, validMiningSkill } from '../sim/skills-save.ts';
import { validMiscIncidents } from '../sim/cassandra-misc-save.ts';
import { validSmallIncidents } from '../sim/cassandra-small-save.ts';
import { validWorldIncidents } from '../sim/cassandra-world-save.ts';
import { validWildlifeManhunterState } from '../sim/animal-manhunter-save.ts';
import { validFlashstorm } from '../sim/flashstorm-save.ts';
import { validRainElectrical } from '../sim/rain-electric-save.ts';
import { validPawnPodRescue,validPodRescueTransportBindings } from '../sim/pod-rescue-save.ts';
import { validWildlifeExitState,validWildlifePredationState } from '../sim/wildlife-save.ts';
import { validCorpseConsumption } from '../sim/corpse-anatomy.ts';
import { V190_ITEM_IDS } from '../sim/biome-items.ts';
import { validBereavement } from '../sim/bereavement-save.ts';
import { validateRelationshipWorld } from '../sim/relationship-world-save.ts';
import { validateGroupStateWithPlanet } from '../sim/group-save.ts';
import { registerGroupThingIds } from '../sim/group-namespace-save.ts';
import { captureHumanOwners } from '../sim/human-owners.ts';
import { validateSocial } from '../sim/social-save.ts';
import { validPawnSurgeryShape } from '../sim/surgery-save.ts';
import { validAnesthetic } from '../sim/anesthetic.ts';
import { validateScoutRegistry } from '../sim/caravan-save.ts';
import { validateCommercialRegistry,validateCommercialBindings } from '../sim/commercial-save.ts';
import { validateCivilianPost } from '../sim/commercial-post.ts';
import { validateQuests } from '../sim/quest-save.ts';
import { scoutRegistryView } from '../sim/caravan-trip.ts';
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
import { validPrisonerPawnShape } from '../sim/prisoner-save.ts';
import { validWeaponShape } from '../sim/equipment-save.ts';
import { pileMaxHp } from '../sim/thing-damage-rules.ts';
import { SCHEMA_VERSION, type MaterialPile, type Pawn, type Resource, type Terrain, type Tile, type World } from '../sim/types.ts';
import { TileSnapshotCache, type TileDelta } from './tile-snapshot-cache.ts';
import { PlanetValidationCache, type PlanetPreparation } from './planet-validation-cache.ts';
import { validBackground } from '../sim/colonist-backgrounds.ts';
import { validHumanAge, type HumanAge } from '../sim/human-age.ts';
import { validOfferedBackground } from '../sim/background-save.ts';
import { validMentalShape, validMeleeThreatShape, validateMental } from '../sim/mental-save.ts';
import { validMeleeShape, validateMelee } from '../sim/melee-save.ts';
import { validArchivedMeleeThreat } from '../sim/visitor-save.ts';
import { validMechanoidShape,validateMechanoids } from '../sim/mechanoid-save.ts';
import { validMechCorpseShape,validMechSalvageLedger } from '../sim/mechanoid-corpse-save.ts';
import { validateMechanoidRaids } from '../sim/mechanoid-raid-save.ts';

type DynamicWorld = Omit<World, 'tiles' | 'resources' | 'piles'> & { readonly piles?: never };
interface ResourceChanges { removed: number[]; upserted: Resource[]; order?: number[]; growth?:Float64Array }
interface PileChanges { removed: number[]; upserted: MaterialPile[]; order?: number[] }
interface SnapshotHeader { motion?:import('./motion-tracks.ts').PawnTrack[]; audioCues?:import('./audio-cues.ts').AudioCue[]; type: 'snapshot'; epoch: number; revision: number; stepMs: number; speed: number }
function validMiningTransport(pawn:Pawn,version:number):boolean {
  return !(version<186&&pawn.skills&&Object.hasOwn(pawn.skills,'mining'))&&validMiningSkill(pawn.skills?.mining,version);
}
/** Private crisis/retaliation ownership follows the same shape contract as a
 * save. Target relations are checked after the complete delta is reconstructed. */
function validMentalTransport(pawn:Pawn,world:Pick<World,'schemaVersion'|'tick'|'width'|'height'>):boolean {
  return !(world.schemaVersion<192&&Object.hasOwn(pawn,'meleeThreat'))
    &&validMentalShape(pawn.mental,world.schemaVersion,world.tick,world.width,world.height)
    &&validMeleeThreatShape(pawn.meleeThreat,world.schemaVersion,world.tick)
    &&validMeleeShape(pawn.melee,world.schemaVersion,world.tick);
}
/** Sparse historical offers keep both fields absent. Active owners use the
 * same age/profile rules on and off the map; archives are not rewritten. */
function validBackgroundTransport(value:unknown,version:number,offer=false):boolean {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const person=value as {background?:Pawn['background'];age?:HumanAge};
  if(version<191&&Object.hasOwn(person,'background'))return false;
  if(offer){
    if(version<191&&Object.hasOwn(person,'age'))return false;
    return validOfferedBackground(person,version);
  }
  return validHumanAge(person.age,version)&&validBackground(person.background,version,person.age);
}
export type SnapshotMessage = SnapshotHeader & (
  | { kind: 'checkpoint'; world: World }
  | { kind: 'delta'; baseRevision: number; world: DynamicWorld; tiles?: TileDelta[]; resources?: ResourceChanges; piles?: PileChanges }
);

import { validPlantGrowthLight } from '../sim/plant-light-save.ts';

/** The new cultivated identity must not enter an older transport stream, even
 * without growth fields. Keep its physical and vital bounds shared with saves. */
function validDomesticHealroot(resource:Resource,world:World|DynamicWorld):boolean {
  if(resource.kind!=='healroot')return true;
  if(world.schemaVersion<182||resource.amount!==1||resource.species!==undefined
    ||!Number.isSafeInteger(resource.id)||resource.id<1||resource.id>=world.nextId
    ||!Number.isSafeInteger(resource.x)||resource.x<0||resource.x>=world.width
    ||!Number.isSafeInteger(resource.z)||resource.z<0||resource.z>=world.height
    ||!validStoneIdentity(resource.stone,resource.kind,world.schemaVersion)
    ||!validPlantLife(resource,world.schemaVersion,world)
    ||!validPlantThermalFactor(resource,world.schemaVersion)
    ||resource.damage!==undefined&&(!Number.isSafeInteger(resource.damage)||resource.damage<1||resource.damage>=resourceMaxHp(resource)))return false;
  return resource.growth===undefined&&resource.growthTick===undefined
    ||typeof resource.growth==='number'&&Number.isFinite(resource.growth)&&resource.growth>=0&&resource.growth<=1
      &&Number.isSafeInteger(resource.growthTick)&&resource.growthTick!>=0&&resource.growthTick!<=world.tick;
}

/** Sparse clinical transport guard. Full anatomy, permissions and possession
 * relations remain save-validator responsibilities. A dead dossier uses its
 * frozen medical tick; live anesthesia must follow the confirmed World tick. */
function validSurgeryTransport(pawn:Pawn,world:Pick<World,'schemaVersion'|'tick'|'width'|'height'|'nextId'>):boolean {
  if(world.schemaVersion<179&&(Object.hasOwn(pawn,'surgery')||Object.hasOwn(pawn,'surgeryRequest')||pawn.health&&Object.hasOwn(pawn.health,'anesthetic')))return false;
  if(!validPawnSurgeryShape(pawn,world.schemaVersion,world))return false;
  const record=pawn.health;
  if(record?.body==='scyther')return false;
  if(record?.anesthetic===undefined)return true;
  if(!record||typeof record!=='object'||Array.isArray(record)||record.body!==undefined||record.tick>world.tick||
    (record.death===undefined?record.tick!==world.tick:!record.death||typeof record.death!=='object'||Array.isArray(record.death)||record.death.tick!==record.tick))return false;
  return validAnesthetic(record.anesthetic,record.tick,world.schemaVersion>=179,pawn.id%20);
}

const equalResourceBase = (a: Resource, b: Resource): boolean => a.id === b.id && a.kind === b.kind && a.species === b.species
  && a.growthLight === b.growthLight && a.x === b.x && a.z === b.z && a.amount === b.amount && a.stone === b.stone && a.damage === b.damage
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
function validPile(pile:MaterialPile,world:World|DynamicWorld):boolean {
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
  if(Object.keys(pile).some(key=>!['id','kind','item','quantity','owner','rot','foodPoison','corpse','humanCorpse','mechCorpse','damage','unfinished','gunWork','flakWork','componentWork','artWork','apparel','weapon','haulRequested'].includes(key)))return false;
  if(world.schemaVersion<194&&Object.hasOwn(pile,'mechCorpse'))return false;
  if(pile.haulRequested!==undefined&&(world.schemaVersion<28||pile.kind!=='chunk'||pile.haulRequested!==true))return false;
  if(pile.damage!==undefined&&(world.schemaVersion<87||!Number.isSafeInteger(pile.damage)||pile.damage<1||pile.damage>=pileMaxHp(pile)))return false;
  const rot=pile.rot;
  if(rot!==undefined&&(!rot||typeof rot!=='object'||!Number.isFinite(rot.progress)||rot.progress<0
    ||!Number.isSafeInteger(rot.atTick)||rot.atTick<0||rot.atTick>world.tick
    ||rot.rate!==undefined&&(!Number.isFinite(rot.rate)||rot.rate<0||rot.rate>1)))return false;
  const record=pile as unknown as Record<string,unknown>;
  return validFoodContamination(pile.foodPoison,pile.item,world.schemaVersion>=89)
    &&validMechCorpseShape(pile,world.schemaVersion,world.tick)
    &&(pile.item==='human-corpse'?validHumanCorpseShape(pile.humanCorpse,world.schemaVersion,world.tick):pile.humanCorpse===undefined)
    &&(pile.item==='human-corpse'||validCorpseShape(record,world.schemaVersion))
    &&(!pile.corpse||validCorpseConsumption(pile.corpse,world.tick))
    &&(world.schemaVersion>=178||!V190_ITEM_IDS.includes(pile.item))
    &&validUnfinishedShape(record,world.schemaVersion)&&validGunWorkShape(record,world.schemaVersion)
    &&validArtWorkShape(record,world.schemaVersion)&&validFlakWorkShape(record,world.schemaVersion)&&validComponentWorkShape(record,world.schemaVersion)
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
  private tiles = new TileSnapshotCache();
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
      this.tiles.reset(world.tiles);
      this.orderedResources = world.resources.map(copyResource);
      this.resources = new Map(this.orderedResources.map(resource => [resource.id, resource]));
      this.orderedPiles = world.piles.map(copyPile);
      this.piles = new Map(this.orderedPiles.map(pile => [pile.id, pile]));
      return { ...header, kind: 'checkpoint', world };
    }

    const tiles = this.tiles.diff(world.tiles);
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
  private readonly planetValidation = new PlanetValidationCache();
  // The decoder owns immutable snapshots. Membership changes rebuild this
  // index; ordinary growth/metadata packets only copy the array of references.
  private resourceSlots = new Map<number, number>();
  private pileSlots = new Map<number, number>();

  adopt(message: SnapshotMessage): SnapshotAdoption {
    const resync = (reason: string): SnapshotAdoption => ({ status: 'resync', reason });
    if (!Number.isSafeInteger(message.epoch) || message.epoch < 1
      || !Number.isSafeInteger(message.revision) || message.revision < 1) return resync('Révision de snapshot invalide.');
    if (message.epoch < this.epoch || (message.epoch === this.epoch && message.revision <= this.revision)) return { status: 'stale' };
    if (!Number.isSafeInteger(message.world.schemaVersion) || message.world.schemaVersion < 1
      || message.world.schemaVersion > SCHEMA_VERSION) return resync('Version de schéma du snapshot invalide.');
    if(message.world.schemaVersion<=195&&['planet','group','groupLosses'].some(key=>Object.hasOwn(message.world,key)))return resync('Planète ou propriétaire de groupe futur.');
    if(message.world.schemaVersion<194&&(Object.hasOwn(message.world,'mechanoids')||Object.hasOwn(message.world,'mechSalvage')
      ||['mechanoid','mechActive'].some(k=>Object.hasOwn(message.world.raids??{},k))
      ||['mechanoid','mechComposition'].some(k=>Object.hasOwn(message.world.raids?.last??{},k))))return resync('Propriétaire ou calendrier mécanique futur.');
    if(Object.hasOwn(message.world,'mechanoids')&&(!Array.isArray(message.world.mechanoids)||message.world.mechanoids.some(m=>!validMechanoidShape(m,message.world.schemaVersion,message.world.tick))))return resync('Forme mécanique invalide.');
    if(message.world.wildlife?.animals.some(a=>a.health?.body==='scyther'))return resync('Dossier mécanique attribué à un animal.');
    if(message.world.schemaVersion<194&&[...message.world.structures,...message.world.packed.map(p=>p.building)].some(s=>s.bills?.some(b=>['smash-mechanoid','shred-mechanoid'].includes(b.recipe))))return resync('Facture mécanique future.');
    if(!Array.isArray(message.world.stockpiles)||message.world.stockpiles.some(zone=>!validStorageConditions(zone,message.world.schemaVersion)))return resync('Plages de qualité ou de PV de réserve invalides pour ce snapshot.');
    for(const zone of message.world.stockpiles)if(message.world.schemaVersion<194&&(Object.hasOwn(zone.filters??{},'mech-corpse')||Object.hasOwn(zone.items??{},'scyther-corpse')))return resync('Filtre mécanique futur.');
    if(!Array.isArray(message.world.growingZones)||message.world.growingZones.some(zone=>!zone||!isCropKindInVersion(zone.plant,message.world.schemaVersion)))return resync('Culture future ou inconnue dans ce snapshot.');
    if(message.world.fires!==undefined&&!validFireResourceLosses(message.world.fires?.ledger?.resources,message.world.schemaVersion))return resync('Pertes végétales du feu invalides pour ce snapshot.');
    if(message.world.schemaVersion<193&&(Object.hasOwn(message.world,'bombWaves')||Object.hasOwn(message.world.research??{},'gunTurrets')
      ||[...message.world.structures,...message.world.jobs,...message.world.packed.map(p=>p.building)].some(s=>s.kind==='mini-turret'||Object.hasOwn(s,'turret'))))return resync('Tourelle, recherche ou vague future.');
    for(const s of message.world.structures)if(Object.hasOwn(s,'turret')&&!validMiniTurretShape(s.turret,message.world.schemaVersion,message.world.tick*10,message.world.nextId))return resync('Canon intrinsèque invalide.');
    if(Object.hasOwn(message.world,'bombWaves')&&(!Array.isArray(message.world.bombWaves)||message.world.bombWaves.some(w=>!validBombWaveShape(w,message.world.schemaVersion))))return resync('Forme de vague Bomb invalide.');
    for(const pawn of message.world.pawns){
      if(!pawn||typeof pawn!=='object'||Array.isArray(pawn))return resync('Personne locale invalide pour ce snapshot.');
      if(Object.hasOwn(pawn,'bombRefuge')&&!validBombRefugeShape(pawn.bombRefuge,message.world.schemaVersion))return resync('Refuge Bomb futur ou invalide.');
      if(!validMentalTransport(pawn,message.world))return resync('Crise mentale, menace ou autorité de mêlée invalide pour ce snapshot.');
      if(!validBackgroundTransport(pawn,message.world.schemaVersion))return resync('Âge ou passé personnel invalide pour ce snapshot.');
      if(!validSurgeryTransport(pawn,message.world))return resync('État chirurgical ou anesthésique invalide pour ce snapshot.');
      if(!validPawnPodRescue(pawn,message.world.schemaVersion,message.world))return resync('Mandat de secours civil invalide pour ce snapshot.');
      if(!validMiningTransport(pawn,message.world.schemaVersion))return resync('Compétence Minage invalide pour ce snapshot.');
      if(!validPlantSkill(pawn.skills?.plants,message.world.schemaVersion))return resync('Compétence Plantes invalide pour ce snapshot.');
      if(pawn.bereavement!==undefined&&!Object.hasOwn(message.world,'group')&&!Object.hasOwn(message.world,'groupLosses')&&!validBereavement(pawn.bereavement,pawn.id,message.world.schemaVersion,message.world))return resync('Souvenir de décès invalide pour ce snapshot.');
    }
    for(const owner of [message.world.scout,message.world.commercialTrip]){
      if(owner&&typeof owner==='object'&&'pawn' in owner&&!validBackgroundTransport(owner.pawn,message.world.schemaVersion))return resync('Âge ou passé personnel hors carte invalide pour ce snapshot.');
      if(owner&&typeof owner==='object'&&'pawn' in owner&&(owner.pawn.mental?.crisis
        ||Object.hasOwn(owner.pawn,'bombRefuge')
        ||owner.pawn.melee?.order?.auto==='mental'||owner.pawn.melee?.order?.auto==='retaliation'
        ||!validArchivedMeleeThreat(owner.pawn,message.world,message.world.tick)))return resync('Crise mentale ou menace hors carte invalide.');
    }
    if(message.world.arrivals?.pending&&!validBackgroundTransport(message.world.arrivals.pending,message.world.schemaVersion,true))return resync('Profil d’accueil invalide pour ce snapshot.');
    if(Array.isArray(message.world.quests?.entries)&&message.world.quests.entries.some(quest=>!validBackgroundTransport(quest,message.world.schemaVersion,true)))return resync('Profil d’asile invalide pour ce snapshot.');
    if(!validMiscIncidents(message.world.miscIncidents,message.world.schemaVersion,message.world))return resync('Calendrier d’incidents divers invalide pour ce snapshot.');
    if(!validSmallIncidents(message.world.smallIncidents,message.world.schemaVersion,message.world))return resync('Calendrier de petites menaces invalide pour ce snapshot.');
    if(message.world.schemaVersion<184&&Object.hasOwn(message.world,'worldIncidents')||!validWorldIncidents(message.world.worldIncidents,message.world.schemaVersion,message.world))return resync('Calendrier mondial invalide pour ce snapshot.');
    if(!validFlashstorm(message.world.flashstorm,message.world.schemaVersion,message.world))return resync('Orage sec localisé invalide pour ce snapshot.');
    if((message.world.schemaVersion<181&&Object.hasOwn(message.world,'rainElectrical'))
      ||!validRainElectrical(message.world.rainElectrical,message.world.schemaVersion,message.world))return resync('Exposition électrique aux précipitations invalide pour ce snapshot.');
    if(!validPodRescueTransportBindings(message.world))return resync('Secours civil invalide pour ce snapshot.');
    if(message.kind==='checkpoint'&&(!Array.isArray(message.world.tiles)||message.world.tiles.some(tile=>!tile||!validMiningDamage(tile,message.world.schemaVersion))))return resync('Rendement ou dégâts miniers invalides pour ce snapshot.');
    let next: World;
    let planetCheck: PlanetPreparation | undefined;
    let reindexResources = message.kind === 'checkpoint';
    let reindexPiles = message.kind === 'checkpoint';
    if (message.kind === 'checkpoint') {
      if (message.world.tiles.length !== message.world.width * message.world.height) return resync('Dimensions du checkpoint invalides.');
      if(!Array.isArray(message.world.piles)||message.world.piles.some(pile=>!validPile(pile,message.world)))return resync('Pile de checkpoint invalide.');
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
        if(message.world.schemaVersion<186&&message.tiles.some(tile=>tile.length>6))return resync('Rendement minier futur dans ce delta.');
        for (const [index, terrain, stone, miningDamage, ore, floor, miningYield] of message.tiles) {
          if (!Number.isInteger(index) || index < 0 || index >= tiles.length || touched.has(index)
            || !['grass', 'soil', 'water', 'rock', ...(message.world.schemaVersion>=28?['rough-stone']:[]), ...(message.world.schemaVersion>=83?['rich-soil','gravel']:[])].includes(terrain) || floor!==undefined&&(message.world.schemaVersion<89||!isFloorKind(floor)||terrain==='water'||terrain==='rock') || !validOre({terrain,ore},message.world.schemaVersion) || !validMiningDamage({terrain,stone,miningDamage,ore,...miningYield===undefined?{}:{miningYield}},message.world.schemaVersion) || !validStoneIdentity(stone, terrain, message.world.schemaVersion)) return resync('Delta de terrain invalide.');
          touched.add(index);
        }
        tiles = tiles.slice();
        for (const [index, terrain, stone, miningDamage, ore, floor, miningYield] of message.tiles) tiles[index] = {terrain,...stone===undefined?{}:{stone},...miningDamage===undefined?{}:{miningDamage},...ore===undefined?{}:{ore},...floor===undefined?{}:{floor},...miningYield===undefined?{}:{miningYield}};
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
          if(!validDomesticHealroot(resource,message.world)||!validPlantGrowthLight(resource,message.world.schemaVersion,message.world.tick)||!validPlantLife(resource,message.world.schemaVersion,message.world)||resource.damage!==undefined&&(message.world.schemaVersion<87||!Number.isSafeInteger(resource.damage)||resource.damage<1||resource.damage>=resourceMaxHp(resource)))return resync('État végétal invalide.');
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
    for(const pawn of next.pawns)if(!validPrisonerPawnShape(pawn as unknown as Record<string,unknown>,next.schemaVersion,next))return resync('Prisonnier, geôlier ou provenance de recrutement invalide.');
    if(validateMental(next,next.schemaVersion).length||next.schemaVersion>=192&&validateMelee(next).length)return resync('Cible de crise mentale ou autorité de mêlée incohérente.');
    if(!validMechSalvageLedger(next,next.schemaVersion)||validateMechanoidRaids(next,next.schemaVersion).length)return resync('Récupération ou mandat mécanique invalide.');
    const mechanicalCorpseIds=new Set<number>();
    for(const pile of next.piles)if(pile.item==='scyther-corpse'||Object.hasOwn(pile,'mechCorpse')){if(mechanicalCorpseIds.has(pile.id)||!validPile(pile,next))return resync('Carcasse mécanique invalide.');mechanicalCorpseIds.add(pile.id);}
    if(validateMiniTurrets(next).length)return resync('Propriétaire ou cible de mini-tourelle invalide.');
    if(validateCommercialRegistry(next,next.schemaVersion).length)return resync('Registre commercial invalide.');
    const postIds=new Set<number>();
    if(validateCivilianPost(next,next.schemaVersion,postIds).length)return resync('Stock du comptoir invalide.');
    const commercial=next.commercialTrip,foreignIds=new Set(postIds);
    if(commercial&&'pawn' in commercial){
      for(const entity of [commercial.pawn,...commercial.items]){
        if(foreignIds.has(entity.id))return resync('Identité commerciale hors carte dupliquée.');
        foreignIds.add(entity.id);
      }
    }
    if(next.resources.some(resource=>foreignIds.has(resource.id)||!validDomesticHealroot(resource,next)||!validPlantGrowthLight(resource,next.schemaVersion,next.tick)))return resync('État végétal ou identité commerciale invalide.');
    if(foreignIds.size){
      const collides=(entities:readonly {id:number}[])=>entities.some(e=>foreignIds.has(e.id));
      if([next.pawns,next.piles,next.structures,next.jobs,next.stockpiles,next.growingZones,next.wildlife?.animals??[],next.mechanoids??[],next.filth?.items??[],next.fires?.items??[],next.fires?.embers??[],next.projectiles??[],next.bombWaves??[]].some(collides)
        ||next.packed.some(p=>foreignIds.has(p.building.id)||collides(p.building.bills??[]))||next.structures.some(s=>collides(s.bills??[])))return resync('Identité commerciale dupliquée sur la carte.');
      if((next.raids?.departed??[]).some(d=>foreignIds.has(d.pawnId)||collides(d.items))||(next.prisonDepartures??[]).some(d=>foreignIds.has(d.pawnId)||collides(d.items))
        ||[next.visitors?.departed??[],next.podRescues?.departed??[]].some(records=>records.some(d=>foreignIds.has(d.pawn.id)||collides(d.items)||(d.packed??[]).some(p=>foreignIds.has(p.building.id)||collides(p.building.bills??[])))))return resync('Identité commerciale dupliquée dans une archive.');
      if(next.scout&&'pawn' in next.scout&&(postIds.has(next.scout.pawn.id)||next.scout.items.some(i=>postIds.has(i.id))))return resync('Stock commercial dupliqué dans la reconnaissance.');
    }
    if(!validSandbagsState(next,next.schemaVersion))return resync('Sacs de sable ou bilan textile invalides ou futurs.');
    if(!validTelevisionState(next,next.schemaVersion))return resync('Télévision ou loisir télévisé invalide ou futur.');
    if(!validHospitalBedState(next,next.schemaVersion))return resync('Lit d’hôpital invalide ou futur.');
    if(!validPackagedSurvivalState(next,next.schemaVersion))return resync('Production de repas de survie invalide ou future.');
    if(next.schemaVersion<177&&[...next.structures,...next.jobs,...(next.packed??[]).map(p=>p.building)].some(s=>s.kind==='sun-lamp'))return resync('Lampe horticole future.');
    if(validateScoutRegistry(next,next.schemaVersion).length)return resync('Registre de reconnaissance invalide.');
    if(!validWildlifeExitState(next,next.schemaVersion))return resync('Départ de faune invalide.');
    if(!validWildlifePredationState(next,next.schemaVersion))return resync('Prédation de faune invalide.');
    if(!validWildlifeManhunterState(next,next.schemaVersion))return resync('Rage de faune invalide.');
    if(validateQuests(next,next.schemaVersion).length)return resync('Dossier de quête invalide.');
    if(next.scout&&(next.scout.phase==='travelling'||next.scout.phase==='awaiting-entry')){
      const registry=scoutRegistryView(next),pawn=next.scout.pawn;
      if(!validSurgeryTransport(pawn,next)||!validPlantSkill(pawn.skills?.plants,next.schemaVersion)||!validMiningTransport(pawn,next.schemaVersion)||pawn.bereavement!==undefined&&!validBereavement(pawn.bereavement,pawn.id,next.schemaVersion,registry)
        ||next.scout.items.some(pile=>!validPile(pile,registry)))return resync('Voyageur ou possession hors carte invalide.');
    }
    if(commercial&&'pawn' in commercial){
      const registry=scoutRegistryView(next),pawn=commercial.pawn;
      if(postIds.has(pawn.id)||!validSurgeryTransport(pawn,next)||!validPlantSkill(pawn.skills?.plants,next.schemaVersion)||!validMiningTransport(pawn,next.schemaVersion)||pawn.bereavement!==undefined&&!validBereavement(pawn.bereavement,pawn.id,next.schemaVersion,registry)
        ||commercial.items.some(pile=>postIds.has(pile.id)||!validPile(pile,registry)))return resync('Voyageur commercial ou possession invalide.');
    }
    if(validateCommercialBindings(next,next.schemaVersion).length)return resync('Possessions commerciales incohérentes.');
    for(const records of [next.raids?.departed??[],next.prisonDepartures??[]])for(const departure of records)
      if(departure.items.some(p=>!validMechCorpseShape(p,next.schemaVersion,departure.tick)||next.schemaVersion<194&&Object.hasOwn(p,'mechCorpse')))return resync('Dossier mécanique de départ historique invalide.');
    for(const records of [next.visitors?.departed??[],next.podRescues?.departed??[]])
      for(const departure of records){
        if(departure.pawn.health?.body==='scyther'||departure.items.some(p=>!validMechCorpseShape(p,next.schemaVersion,departure.tick)||next.schemaVersion<194&&Object.hasOwn(p,'mechCorpse')))return resync('Dossier mécanique archivé invalide.');
        if(!validMiningTransport(departure.pawn,next.schemaVersion))return resync('Profil de minage archivé invalide.');
        if(!validArchivedMeleeThreat(departure.pawn,next,departure.tick))return resync('Menace de mêlée archivée invalide.');
        if(Object.hasOwn(departure.pawn,'bombRefuge'))return resync('Refuge Bomb archivé hors carte.');
      }
    for(const departure of next.podRescues?.departed??[])if(!validSurgeryTransport(departure.pawn,{schemaVersion:next.schemaVersion,tick:departure.tick,width:next.width,height:next.height,nextId:next.nextId}))return resync('Dossier chirurgical civil archivé invalide.');
    const relationMemories=(p:Pawn):boolean=>Object.hasOwn(p,'romanceMemories')||Object.hasOwn(p,'familyBereavement');
    const relationships=Object.hasOwn(next,'planet')||Object.hasOwn(next,'group')||Object.hasOwn(next,'groupLosses')||Object.hasOwn(next,'relationships')||next.pawns.some(relationMemories)
      ||[next.scout,next.commercialTrip].some(owner=>owner&&'pawn' in owner&&relationMemories(owner.pawn))
      ||[next.visitors?.departed??[],next.podRescues?.departed??[]].some(records=>records.some(record=>relationMemories(record.pawn)))
      ||Object.hasOwn(next.arrivals?.pending??{},'relationship')||(next.quests?.entries??[]).some(q=>Object.hasOwn(q,'relationship'));
    // Retained ballistic/Bomb and relationship owners need this additional identity
    // capture. Foreign registries above are already validated; their historical
    // owners reserve the same namespace as the map and cannot become a wave.
    if(relationships||Object.hasOwn(next,'mechanoids')||next.raids?.mechActive||mechanicalCorpseIds.size||Object.hasOwn(next,'projectiles')||Object.hasOwn(next,'bombWaves')||next.pawns.some(p=>Object.hasOwn(p,'bombRefuge'))){
      const owners=[
        ...next.pawns,...next.structures,...next.jobs,...next.resources,...next.piles,...next.stockpiles,...next.growingZones,
        ...(next.wildlife?.animals??[]),...(next.filth?.items??[]),...(next.fires?.items??[]),...(next.fires?.embers??[]),
        ...next.packed.map(p=>p.building),...next.structures.flatMap(s=>s.bills??[]),...next.packed.flatMap(p=>p.building.bills??[]),
      ];
      const ids=new Set<number>();
      for(const owner of owners){if(relationships&&(!Number.isSafeInteger(owner.id)||owner.id<1||owner.id>=next.nextId||ids.has(owner.id)))return resync('Identité dupliquée ou invalide dans le registre relationnel.');if(mechanicalCorpseIds.has(owner.id)&&ids.has(owner.id))return resync('Identité de carcasse mécanique dupliquée.');ids.add(owner.id);}
      const addId=(id:unknown):boolean=>{if(!Number.isSafeInteger(id)||Number(id)<1||Number(id)>=next.nextId||ids.has(Number(id))&&(relationships||mechanicalCorpseIds.has(Number(id))))return false;ids.add(Number(id));return true;};
      const addItems=(items:unknown):boolean=>Array.isArray(items)&&items.every(item=>item&&typeof item==='object'&&addId(item.id));
      if(relationships){for(const id of postIds)if(!addId(id))return resync('Identité du comptoir dupliquée dans le registre relationnel.');}
      else for(const id of foreignIds)ids.add(id);
      for(const owner of [next.scout,next.commercialTrip])if(owner&&'pawn' in owner){if(!addId(owner.pawn.id)||!addItems(owner.items))return resync('Identité hors carte invalide pour les projectiles.');}
      for(const pawn of next.pawns)if(pawn.body?.lostAt!==undefined&&!addId(pawn.body.pileId))return resync('Identité de dépouille perdue invalide.');
      for(const records of [next.raids?.departed??[],next.prisonDepartures??[]])for(const d of records)
        if(!addId(d.pawnId)||!addItems(d.items))return resync('Identité de départ historique invalide.');
      for(const records of [next.visitors?.departed??[],next.podRescues?.departed??[]])for(const d of records){
        if(!addId(d.pawn.id)||!addItems(d.items))return resync('Identité de dossier archivé invalide.');
        for(const pack of d.packed??[])if(!addId(pack.building.id)||!addItems(pack.building.bills??[]))return resync('Identité de mobilier archivé invalide.');
      }
      if(validateMechanoids(next,next.schemaVersion,ids).length)return resync('Identité, cible ou déplacement mécanique invalide.');
      planetCheck=this.planetValidation.prepare(next,next.schemaVersion,message.epoch);
      if(!planetCheck.ok||validateGroupStateWithPlanet(next,next.schemaVersion,planetCheck.context).length)return resync('Planète, groupe ou pertes incohérents.');
      if(registerGroupThingIds(next,ids).length)return resync('Une identité du groupe possède plusieurs propriétaires.');
      if(validateMechanoidRaids(next,next.schemaVersion,ids).length)return resync('Identité mécanique historique réutilisée dans un autre propriétaire.');
      if(validateProjectiles(next,next.schemaVersion,ids).length)return resync('Balle ou canon lanceur invalide.');
      const bombErrors:string[]=[];validateBombWaves(next,bombErrors,ids);if(bombErrors.length)return resync('Vague Bomb ou identité invalide.');
      if(validateBombRefuges(next,[],ids).length)return resync('Refuge ou danger Bomb incohérent.');
    }
    // An absent planet also belongs to the accepted epoch. A replacement
    // without planetary owners must clear the previous witness atomically.
    planetCheck??=this.planetValidation.prepareAbsence(message.epoch);
    if(!planetCheck.ok)return resync('Planète, groupe ou pertes incohérents.');
    if(planetCheck.geographyChanged)return resync('La géographie confirmée a changé sans remplacement.');
    if(Object.hasOwn(next,'group')||Object.hasOwn(next,'groupLosses')){
      try {const people=captureHumanOwners(next).people;
        if(validateSocial(next,next.schemaVersion,new Set(people.keys())).length||next.pawns.some(p=>!validBereavement(p.bereavement,p.id,next.schemaVersion,next,people)))return resync('Souvenirs de personnes hors carte incohérents.');
      }catch{return resync('Propriétaire humain hors carte incohérent.');}
    }
    if(validateRelationshipWorld(next,next.schemaVersion).length)return resync('Liens, annonce ou souvenirs relationnels incohérents.');
    // Commit only after every patch is checked. A refusal preserves both state and revision.
    if(!this.planetValidation.commit(planetCheck))return resync('Planète, groupe ou pertes incohérents.');
    const replaced = message.epoch !== this.epoch;
    if(reindexResources){this.resourceSlots.clear();for(let i=0;i<next.resources.length;i++)this.resourceSlots.set(next.resources[i]!.id,i);}
    if(reindexPiles){this.pileSlots.clear();for(let i=0;i<next.piles.length;i++)this.pileSlots.set(next.piles[i]!.id,i);}
    this.current = next; this.epoch = message.epoch; this.revision = message.revision;
    return { status: 'applied', world: next, replaced };
  }
}
