import { heatwaveCamp } from './heatwave-player.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import { canDesignate } from '../../src/sim/engine.ts';
import { airConditioningUnlocked } from '../../src/sim/research.ts';
import type { World,Command } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** Supplied expedition; no material, research, cooling or nutrition injected
 * after initialization. The player builds around a small future storeroom. */
export function coldStoreCamp():World {
  const w=heatwaveCamp();
  for(let i=0;i<3;i++)addGroundMaterial(w,'steel',75,{x:9+i,z:11},'steel');
  addGroundMaterial(w,'component',5,{x:12,z:11},'component');
  addGroundMaterial(w,'food',20,{x:13,z:11},'simple-meal');
  w.pawns[0]!.priorities.research=2;refreshStock(w);return w;
}
export function coldStoreDecisions(w:World):Decision[]{
  const out:Decision[]=[],plans:Command[]=[];
  if(!w.research)out.push({reason:'Rechercher une conservation obtenable pour les réserves.',command:{type:'research-project',project:'air-conditioning'}});
  if(w.foodPolicies[0]!.allowed.includes('simple-meal'))out.push({reason:'Garder les repas frais en réserve et vivre des rations de l’expédition.',command:{type:'food-policy-update',policyId:1,name:'Rations du chantier',allowed:['survival-meal']}});
  for(let z=2;z<=6;z++)for(let x=2;x<=6;x++)if((x===2||x===6||z===2||z===6)&&!(x===3&&z===2))plans.push({type:'designate',kind:x===6&&z===4?'door':'wall',material:'wood',x,z});
  plans.push({type:'designate',kind:'bed',material:'wood',x:8,z:8},{type:'designate',kind:'bed',material:'wood',x:10,z:8},
    {type:'designate',kind:'research-bench',material:'wood',x:9,z:3},
    {type:'designate',kind:'wood-generator',material:'steel',x:6,z:0},
    {type:'designate',kind:'horseshoes',material:'wood',x:7,z:14});
  if(airConditioningUnlocked(w))plans.push({type:'designate',kind:'cooler',material:'steel',x:3,z:2,orientation:0});
  for(const command of plans)if(command.type==='designate'&&canDesignate(w,command).ok)out.push({reason:'Construire le camp et le garde-manger avec les fournitures disponibles.',command});
  if(!w.roofing?.constructed.includes(3*w.width+3)&&!w.roofing?.build.includes(3*w.width+3))out.push({reason:'Couvrir la réserve pour retenir le froid.',command:{type:'area',action:'build-roof',from:{x:3,z:3},to:{x:5,z:5}}});
  const cooler=w.structures.find(s=>s.kind==='cooler');
  if(cooler?.cooler?.target===21)out.push({reason:'Régler le congélateur avec une marge sous zéro.',command:{type:'cooler-target',structureId:cooler.id,target:-5}});
  if(cooler&&!w.stockpiles.some(s=>s.x===3&&s.z===3))out.push({reason:'Ranger physiquement les provisions dans la réserve froide.',command:{type:'area',action:'stockpile',filters:{food:true,wood:false},from:{x:3,z:3},to:{x:5,z:5}}});
  return out;
}
