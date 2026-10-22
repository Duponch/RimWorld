import {deconstructionCamp,fixtureBuilding} from './deconstruction.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';

/** BEFORE real excavation. The small exposed granite seam, worker's ordinary
 * starting skills/permissions and finite property are declared preparation.
 * No rough/smoothed output, yield, random draw or partial mining is injected. */
export function smoothFloorCamp458(){
  const world=deconstructionCamp(1,32),worker=world.pawns[0]!,cell={x:14,z:14},secondCell={x:15,z:14},stone='granite' as const;
  Object.assign(worker,{name:'Bâtisseur de pierre',x:12,z:13});
  for(const work of Object.keys(worker.priorities) as (keyof typeof worker.priorities)[])worker.priorities[work]=0;
  worker.priorities.mine=1;worker.priorities.build=1;worker.schedule.fill('anything');
  worker.skills.construction={level:8,xp:0,dailyXp:0,passion:0};worker.skills.mining={level:8,xp:0,dailyXp:0,passion:0};
  for(const c of [cell,secondCell])world.tiles[c.z*world.width+c.x]={terrain:'rock',stone};
  worker.bedId=fixtureBuilding(world,'bed',9,20).id;
  addMaterial(world,'wood',6,{type:'ground',x:12,z:16},'wood');
  addMaterial(world,'food',6,{type:'ground',x:11,z:16},'survival-meal');refreshStock(world);
  return {world,workerId:worker.id,cell,secondCell,stone,preparation:{kind:'declared-before-excavation' as const,
    terrain:'Two exposed intact granite rock cells prepared on a valid32x32 legacy map, no geographic-generation claim; original solid cells are mined by real actions.',
    worker:'One adult free worker, Construction8/Mining8 and corresponding priorities1 prepared; other work disabled; ordinary needs unchanged during play.',
    property:'One ordinary bed, six finite wood units and six survival meals prepared before any played tick.',
    random:'Inherited world stream, no chosen chunk yield, random reset or output insertion.',fromTick:world.tick}};
}
