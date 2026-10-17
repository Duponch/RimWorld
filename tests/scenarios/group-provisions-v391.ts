import {medicalCamp} from './health.ts';
import {applyCommand} from '../../src/sim/engine.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {serializeWorld} from '../../src/sim/serialization.ts';

/** A finite prepared camp only. No formation, pickup, off-map meal or route step played. */
export function groupProvisionsWorkshopV391(size=32){
 if(size!==32)throw Error('The declared V391 workshop is 32 by 32.');
 const world=medicalCamp(3,size);world.structures=[];world.resources=[];world.jobs=[];world.packed=[];
 world.roofing={constructed:[],build:[],remove:[],cursor:0};world.piles=world.piles.filter(p=>p.owner.type==='apparel');
 for(const [i,p] of world.pawns.entries()){
  p.x=i<2?2+i*2:8;p.z=i<2?4:8;p.bedId=null;delete p.motion;p.path=[];p.moveCooldown=0;p.planCooldown=0;p.state='idle';
  p.hunger=i<2?27:100;p.rest=p.recreation.level=100;p.schedule.fill('anything');
 }
 world.foodPolicies[0]={...world.foodPolicies[0]!,allowed:['pemmican']};world.foodPolicies[1]={...world.foodPolicies[1]!,allowed:['survival-meal']};
 world.pawns[0]!.foodPolicyId=world.foodPolicies[0]!.id;world.pawns[1]!.foodPolicyId=world.foodPolicies[1]!.id;
 addMaterial(world,'food',60,{type:'ground',x:3,z:3},'pemmican');const pemmican=world.piles.at(-1)!;pemmican.rot={progress:600,atTick:world.tick};
 addMaterial(world,'food',4,{type:'ground',x:5,z:3},'survival-meal');const rationId=world.piles.at(-1)!.id;
 const adopted=applyCommand(world,{type:'planet-adopt'});if(!adopted.ok)throw Error(adopted.reason);
  const planet=world.planet;if(!planet||planet.revision===3)throw Error('Historical provisions391 fixture requires its basic revision1/2 planet');
 const destination=planet.tiles[planet.homeTile]!.neighbours.find(id=>id!==planet.civilianTile&&planet.tiles[id]!.biome!=='ocean');
 if(destination===undefined)throw Error('The prepared planet has no ordinary terrestrial neighbour.');
 refreshStock(world);
 return {world,initial:serializeWorld(world),memberIds:world.pawns.slice(0,2).map(p=>p.id),pemmicanId:pemmican.id,rationId,destination,
  notice:'PRÉPARÉ : trois adultes sains, camp ouvert 32² et planète adoptée ; deux départs à faim27, régimes distincts pemmican/rations, 60 pemmicans âgés de600 ticks et4 repas de survie. Aucun chargement, voyage ou ingestion joué.'};
}
