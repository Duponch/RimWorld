import {clearForcedWorkshopV388} from './clear-forced-v388';
import {applyCommand} from '../../src/sim/engine';
import {serializeWorld} from '../../src/sim/serialization';

/** Reuse V388 finite property; only the declared policy/check deadline/storage change. */
export function apparelPolicyWorkshopV392(){
  const f=clearForcedWorkshopV388(),w=f.world,p=w.pawns.find(p=>p.id===f.pawnId)!,other=w.pawns.find(p=>p.id===f.otherId)!;
  p.apparelAutomation=true;p.nextApparelCheckAt=w.tick+40;other.apparelAutomation=false;
  w.apparelPolicies![0]={...w.apparelPolicies![0]!,allowedItems:['cloth-shirt'],allowedMaterials:['cloth']};
  const tuque=w.piles.find(p=>p.id===f.tuqueId)!,storage={x:12,z:p.z};tuque.owner={type:'ground',...storage};
  const accepted=applyCommand(w,{type:'stockpile',...storage,enabled:true,filters:{wood:false,food:false,apparel:true}});if(!accepted.ok)throw Error(accepted.reason);
  return {...f,world:w,initial:serializeWorld(w),policyId:1,storage,dueAt:p.nextApparelCheckAt,
    notice:'PRÉPARÉ32² dérivé V388 : deux adultes sains, chemise portée et casque forcé de l’autre colon ; tuque laine normale déjà finie dans une réserve acceptante. Politique1 limitée chemise/tissu ; Auto actif pour le premier, désactivé pour l’autre, échéance déclarée à +40. Aucun filtre édité par le joueur, déplacement, retrait ou port de tuque joué.'};
}
