import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization';
/** Read-only reuse of ROOT's acquired V4021792 endpoint, migrated by the strict
 * loader. No tick, journey, policy edit, healing or physical task is prepared. */
export function apparelPolicyCopyWorkshopV404(decoded:string){
 const world=deserializeWorld(decoded),issues=validateWorld(world);
 if(issues.length)throw Error(issues.join('; '));
 if(world.width!==32||world.height!==32||!world.secondarySite||world.secondarySite.selected||world.tick!==1792)throw Error('Use the acquired paused V4021792 home-view two-map export; do not replay a journey.');
 const sourceId=2,source=world.apparelPolicies?.find(p=>p.id===sourceId);
 if(!source||!world.nextApparelPolicyId)throw Error('The acquired policy registry changed; preserve it for diagnosis.');
 return {world,initial:serializeWorld(world),sourceId,copyId:world.nextApparelPolicyId,
  notice:'ADAPTATION DE TÉMOIN UI : export complet indépendant V402 au tick1792,32² et deux cartes, lu/migré strictement par le chargeur courant. Aucune retouche, tick joué, nouveau voyage, guérison, attribution, filtre ou port préparé. Les deux menaces existantes restent en pause. Copier/Renommer puis vues et sauvegarde seulement ; aucune reprise de cette chronologie ni de la campagne Aulnes.'};
}
