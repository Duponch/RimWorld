import {createScenarioWorld} from '../src/sim/new-game.ts';
import {expect,test} from 'vitest';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {canDesignate} from '../src/sim/engine.ts';
import {generateSiteWorld} from '../src/sim/site-generation.ts';
import {resolveSite} from '../src/sim/site.ts';
import {shallowWaterPatchValue} from '../src/sim/shallow-water-generation.ts';
import {soilFertility} from '../src/sim/soil.ts';
import {blockedCells,routeToCell,reachableCells} from '../src/sim/pathfinding.ts';
import {terrainTravelDelay,navigationCosts} from '../src/sim/furniture-travel.ts';
import {validMarshTile,validateMarshTransport} from '../src/sim/marsh.ts';
import {validBridgeTile} from '../src/sim/bridge-rules.ts';
import {destroyBridge} from '../src/sim/bridge.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {addFilth} from '../src/sim/filth.ts';
import {initializeSnowSurface,setSnowDepth,terrainRetainsSnow} from '../src/sim/snow-surface.ts';
import {startFire,attachPawnFire,advanceFires} from '../src/sim/fire.ts';
import {FireContent} from '../src/sim/fire-content.ts';
import {thermalLayout} from '../src/sim/temperature.ts';
import {deteriorationExposure} from '../src/sim/deterioration-rules.ts';
import {SCHEMA_VERSION,type World,type DesignateCommand} from '../src/sim/types.ts';
import {bridgeWorkshopV387} from './scenarios/bridge-v387.ts';
import {marshWorkshopV385} from './scenarios/marsh-v385.ts';
import {generateSiteFields} from '../src/sim/site-noise.ts';
const fixture=()=>{const f=bridgeWorkshopV387(32);for(const t of f.world.tiles)if(t.terrain==='marsh')t.terrain='water-shallow';return f;};
const until=(w:World,done:()=>boolean,limit=2400)=>{for(let n=0;n<limit&&!done();n++)stepWorld(w);expect(done(),String(w.tick)).toBe(true);};
const accept=(w:World,c:Parameters<typeof applyCommand>[1])=>expect(applyCommand(w,c).ok,JSON.stringify(c)).toBe(true);
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);

test('only prospective boreal lowlands receive the original pond field; old generation, other biomes and legacy water stay literal',()=>{
 const site=resolveSite(42,{biome:'boreal-forest',hilliness:'flat'}),old=generateSiteWorld(42,128,128,site,253),current=generateSiteWorld(42,128,128,site,254);
 expect(old.tiles.some(t=>t.terrain==='water-shallow')).toBe(false);expect(current.rng).toBe(old.rng);
 const wet=current.tiles.flatMap((t,i)=>t.terrain==='water-shallow'?[i]:[]);expect(wet.length).toBeGreaterThan(0);
 expect(current.tiles).toEqual(generateSiteWorld(42,128,128,site,254).tiles);
 const fresh=createScenarioWorld(42,128,'crashlanded',{biome:'boreal-forest',hilliness:'flat'});expect(fresh.tiles).toEqual(current.tiles);expect(validateWorld(fresh)).toEqual([]);
 const fields=generateSiteFields(current.seed,128,128,.8);
 for(const i of wet){expect(fields.elevation[i]!).toBeLessThanOrEqual(.55);expect(shallowWaterPatchValue(42,i%128,Math.floor(i/128))).toBeGreaterThanOrEqual(.76);expect(current.resources.some(r=>r.z*128+r.x===i)).toBe(false);expect(current.tiles[i]!.ore).toBeUndefined();}
 for(const biome of ['temperate-forest','arid-shrubland','tundra'] as const){const s=resolveSite(42,{biome,hilliness:'flat'});expect(generateSiteWorld(42,32,32,s,254)).toEqual(generateSiteWorld(42,32,32,s,253));}
});

test('bare shallow water is walkable: physical30Core and perceived180/18 remain distinct during real cargo and reload',()=>{
 const f=marshWorkshopV385(),{world:w,pawnId,marshCell:bridgeCell,sourceId:cargoId,storage}=f;for(const t of w.tiles)if(t.terrain==='marsh')t.terrain='water-shallow';const p=w.pawns[0]!,i=bridgeCell.z*w.width+bridgeCell.x;
 expect(validateWorld(w)).toEqual([]);expect(blockedCells(w)[i]).toBe(0);expect(routeToCell(w,bridgeCell,reachableCells(w,p,blockedCells(w),new Set()))).not.toBeNull();expect(terrainTravelDelay(w,i)).toBe(3);
 expect(navigationCosts(w,p).costs!.get(i)).toBe(7000);accept(w,{type:'draft',pawnIds:[pawnId],enabled:true});expect(navigationCosts(w,p).costs!.get(i)).toBe(1600);accept(w,{type:'draft',pawnIds:[pawnId],enabled:false});
 accept(w,{type:'priority',pawnId,work:'build',value:0});accept(w,{type:'priority',pawnId,work:'haul',value:1});
 until(w,()=>p.motion?.terrainDelay===3&&p.motion.end>w.tick);
 expect(p.motion!.terrainDelay).toBe(3);const saved=deserializeWorld(serializeWorld(w)),tick=w.tick;until(w,()=>p.haul?.phase==='deliver'&&p.haul.carryPileId!==null);const carryId=p.haul!.carryPileId!;
 expect(carryId).not.toBe(cargoId);expect(w.piles.some(v=>v.id===cargoId)).toBe(false);expect(w.piles.find(v=>v.id===carryId)).toMatchObject({item:'wood',quantity:10,owner:{type:'pawn',pawnId}});
 until(w,()=>w.piles.some(v=>v.id===carryId&&v.owner.type==='ground'&&v.owner.x===storage.x&&v.owner.z===storage.z));stepWorld(saved,w.tick-tick);expect(serializeWorld(saved)).toBe(serializeWorld(w));expect(wood(w)).toBe(10);
});

test('real contact pays12wood, resumes a frame, then removal refunds6 and reveals the exact original shallow water',()=>{
 const {world:w,pawnId,bridgeCell}=fixture(),i=bridgeCell.z*w.width+bridgeCell.x;
 accept(w,{type:'designate',kind:'build-bridge',...bridgeCell});const job=w.jobs.at(-1)!;until(w,()=>job.progress>0);
 expect(job.escrow.wood).toBe(12);expect(w.tiles[i]!.bridge).toBeUndefined();expect(Math.max(Math.abs(w.pawns[0]!.x-job.x),Math.abs(w.pawns[0]!.z-job.z))).toBeLessThanOrEqual(1);
 accept(w,{type:'priority',pawnId,work:'build',value:0});const saved=deserializeWorld(serializeWorld(w));accept(w,{type:'priority',pawnId,work:'build',value:1});accept(saved,{type:'priority',pawnId,work:'build',value:1});const at=w.tick;
 until(w,()=>w.tiles[i]!.bridge===true);stepWorld(saved,w.tick-at);expect(serializeWorld(saved)).toBe(serializeWorld(w));expect(w.tiles[i]).toEqual({terrain:'water-shallow',bridge:true});expect(wood(w)).toBe(10);expect(terrainTravelDelay(w,i)).toBe(0);
 const pile={...w.piles.find(p=>p.item==='wood')!,owner:{type:'ground' as const,...bridgeCell}};expect(deteriorationExposure(w,pile).terrainFactor).toBe(0);
 accept(w,{type:'designate',kind:'remove-bridge',...bridgeCell});until(w,()=>!w.tiles[i]!.bridge);expect(w.tiles[i]).toEqual({terrain:'water-shallow'});expect(terrainTravelDelay(w,i)).toBe(3);expect(deteriorationExposure(w,pile).terrainFactor).toBe(3);expect(wood(w)).toBe(16);expect(w.deconstructed.lostWood).toBe(6);expect(validateWorld(w)).toEqual([]);
});

test('no bare support, floor or crops: Light bridge support checks every footprint and retained installation owner',()=>{
 const {world:w,bridgeCell}=fixture(),i=bridgeCell.z*w.width+bridgeCell.x;expect(soilFertility('water-shallow')).toBe(0);
 for(const kind of ['wall','power-conduit','sleeping-spot','animal-sleeping-spot','crafting-spot','butcher-spot','grave','spike-trap'] as const){const before=serializeWorld(w);const c:DesignateCommand={type:'designate',kind,...bridgeCell,...kind==='wall'?{material:'wood' as const}:{}};expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
 expect(applyCommand(w,{type:'designate',kind:'lay-floor',floor:'wood-planks',...bridgeCell}).ok).toBe(false);expect(applyCommand(w,{type:'area',action:'growing',from:bridgeCell,to:bridgeCell}).affected??0).toBe(0);
 w.tiles[i]!.bridge=true;expect(canDesignate(w,{type:'designate',kind:'wall',material:'wood',...bridgeCell}).ok).toBe(true);expect(canDesignate(w,{type:'designate',kind:'wall',material:'steel',...bridgeCell}).ok).toBe(false);
 const bed={type:'designate' as const,kind:'bed' as const,material:'wood' as const,...bridgeCell,orientation:0 as const};for(const c of footprintCells(bed))w.tiles[c.z*w.width+c.x]={terrain:'water-shallow'};w.tiles[i]!.bridge=true;expect(canDesignate(w,bed).ok).toBe(false);for(const c of footprintCells(bed))w.tiles[c.z*w.width+c.x]!.bridge=true;expect(canDesignate(w,bed).ok).toBe(true);
 const source={id:w.nextId++,kind:'bed' as const,material:'wood' as const,x:3,z:3,orientation:0 as const,footprint:'standard' as const,quality:'normal' as const};w.packed.push({building:source,owner:{type:'ground',x:3,z:3}});accept(w,{type:'install',structureId:source.id,...bridgeCell,orientation:0});
 const before=serializeWorld(w);expect(applyCommand(w,{type:'designate',kind:'remove-bridge',...bridgeCell}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 w.tiles[2*w.width+2]={terrain:'water'};expect(blockedCells(w)[2*w.width+2]).toBe(1);expect(applyCommand(w,{type:'designate',kind:'build-bridge',x:2,z:2}).ok).toBe(false);
});

test('bare water rejects fire/snow/filth and extinguishes a real attachment; forced bridge loss removes overlays without drying its substrate',()=>{
 const {world:w,pawnId,bridgeCell}=fixture(),p=w.pawns[0]!,i=bridgeCell.z*w.width+bridgeCell.x;
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)w.tiles[(bridgeCell.z+dz)*w.width+bridgeCell.x+dx]={terrain:'water-shallow'};
 expect(new FireContent(w).fuel(bridgeCell)).toBe(0);expect(startFire(w,bridgeCell)).toBe(false);expect(terrainRetainsSnow('water-shallow')).toBe(false);const rng=w.rng,id=w.nextId;expect(addFilth(w,bridgeCell,'blood')).toBe(false);expect(w.nextId).toBe(id);expect(w.rng).toBe(rng);
 w.tiles[i]!.bridge=true;initializeSnowSurface(w);setSnowDepth(w,i,.4);expect(addFilth(w,bridgeCell,'blood')).toBe(true);expect(destroyBridge(w,bridgeCell,'bomb',35)).toBe(true);expect(w.tiles[i]).toEqual({terrain:'water-shallow'});expect(w.filth!.items.some(f=>f.x===bridgeCell.x&&f.z===bridgeCell.z)).toBe(false);
 p.x=bridgeCell.x;p.z=bridgeCell.z;expect(attachPawnFire(w,pawnId)).toBe(true);w.tick=15;advanceFires(w,{rainRate:0},thermalLayout(w));expect(w.fires!.items).toEqual([]);expect(p.burning).toBeUndefined();expect(wood(w)).toBe(22);
 expect(validMarshTile({terrain:'water-shallow'},253)).toBe(false);expect(validMarshTile({terrain:'water-shallow',snowDepth:.1},254)).toBe(false);expect(validMarshTile({terrain:'water-shallow',bridge:true,snowDepth:.1},254)).toBe(true);expect(validBridgeTile({terrain:'water-shallow',bridge:true},253)).toBe(false);expect(validBridgeTile({terrain:'water-shallow',bridge:true},254)).toBe(true);
 const invalid=fixture().world;invalid.structures.push({id:invalid.nextId++,kind:'power-conduit',...bridgeCell,orientation:0,footprint:'standard',material:'steel'});expect(validateMarshTransport(invalid).length).toBeGreaterThan(0);expect(SCHEMA_VERSION).toBe(254);
});
