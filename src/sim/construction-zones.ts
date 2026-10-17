import { footprintCells } from './definitions.ts';
import { isShelfKind } from './shelf-storage.ts';
import { connectedZoneCells,stockpileZoneId } from './stockpile-zones.ts';
import { occupancyOf } from './occupancy.ts';
import { cancelGrowingJobs } from './farming.ts';
import { releaseWork, type DropPlan } from './work-release.ts';
import type { DesignateCommand, World } from './types.ts';

/** A blueprint removes incompatible zone cells immediately, not the items.
 * The caller preflights cargo drops before any mutation. */
export function zonesUnderPlan(world:World,command:DesignateCommand|import('./cave-glowpod-minification-256.ts').NaturalInstallPlan256):{storage:Set<number>;deliveries:Set<number>;growing:Set<number>;cells:Set<number>} {
  // This is also called during preflight, before command validation.
  const valid=Number.isInteger(command.x)&&Number.isInteger(command.z)&&command.x>=0&&command.z>=0&&command.x<world.width&&command.z<world.height
    &&(command.orientation===undefined||Number.isInteger(command.orientation)&&command.orientation>=0&&command.orientation<=3);
  const profile=occupancyOf(command.kind),footprint=new Set(valid?footprintCells(command).map(c=>c.z*world.width+c.x):[]);
  const cells=profile?.zones===false?footprint:new Set<number>();
  const storage=new Set(world.stockpiles.filter(z=>cells.has(z.z*world.width+z.x)).map(z=>z.id));
  // A shelf's own storage is inactive until completion. Retiring the covered
  // ground zone also retires its old delivery identity, even with store:true.
  // Keep the same first surviving component as the ordinary zone-shrink UI.
  if(isShelfKind(command.kind)&&storage.size){
    const zoneIds=new Set(world.stockpiles.filter(z=>storage.has(z.id)).map(stockpileZoneId));
    for(const zoneId of zoneIds){
      const survivors=world.stockpiles.filter(z=>stockpileZoneId(z)===zoneId&&!storage.has(z.id));
      const indices=survivors.map(z=>z.z*world.width+z.x);
      const connected=connectedZoneCells(world.width,indices,indices.slice(0,1));
      for(const cell of survivors)if(!connected.has(cell.z*world.width+cell.x))storage.add(cell.id);
    }
  }
  const deliveries=new Set(world.stockpiles.filter(z=>storage.has(z.id)
    ||profile?.store===false&&footprint.has(z.z*world.width+z.x)).map(z=>z.id));
  return {cells,storage,deliveries,growing:new Set(world.growingZones.filter(z=>z.cells.some(c=>cells.has(c))).map(z=>z.id))};
}
export function removeZonesForPlan(world:World,command:DesignateCommand|import('./cave-glowpod-minification-256.ts').NaturalInstallPlan256,drops:DropPlan):void {
  const {storage,deliveries,growing,cells}=zonesUnderPlan(world,command);
  if(storage.size)world.stockpiles=world.stockpiles.filter(z=>!storage.has(z.id));
  if(deliveries.size) {
    for(const pawn of world.pawns) {
      if(pawn.cooking?.storageId&&deliveries.has(pawn.cooking.storageId)){pawn.cooking.storageId=null;delete pawn.cooking.storageQuantity;pawn.path=[];pawn.planCooldown=0;}
      if(pawn.haul?.destination.type==='stockpile'&&deliveries.has(pawn.haul.destination.stockpileId))releaseWork(world,pawn,drops);
    }
  }
  if(growing.size) {
    cancelGrowingJobs(world,growing,drops);
    world.growingZones=world.growingZones.map(z=>growing.has(z.id)?{...z,cells:z.cells.filter(c=>!cells.has(c))}:z).filter(z=>z.cells.length);
    world.growingCursor=0;
  }
}
