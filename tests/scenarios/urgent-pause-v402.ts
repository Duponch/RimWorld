import {preparedV377LocalCheckpoint} from './secondary-site-v377';
import {applyCommand} from '../../src/sim/engine';
import {secondaryContext,flushSecondaryContext} from '../../src/sim/secondary-site-context';
import {serializeWorld,validateWorld} from '../../src/sim/serialization';

/** A finite authored transport checkpoint, not a naturally acquired campaign.
 * V377 starts from the existing Survivors camp, not a Core creation profile.
 * The two FUTURE camp calendars are explicit preparation. Neither raid has
 * been generated, and no person, gear, hit points, RNG stream or World is
 * modified by the browser after import. Ordinary advanceRaids owns admission. */
export function urgentPauseWorkshopV402(){
 const prepared=preparedV377LocalCheckpoint(),w=prepared.initial,local=secondaryContext(w);
 if(w.gameProfile||w.scenario?.id!=='survivors'||!local)throw Error('The prepared V377 Survivors camp contract changed; do not relabel a Core creation.');
 const ids=[...prepared.memberIds],tile=prepared.tile;
 if(w.raids?.active||w.raids?.mechActive||local.raids?.active||local.raids?.mechActive)throw Error('The existing prepared camp already has a raid. Preserve it for diagnosis.');
 const secondaryDue=w.tick+12,homeDue=w.tick+60;
 local.raids={profile:'camp-raids-v1',rng:379,nextCheck:secondaryDue,serial:0,completed:0,departed:[]};
 w.raids={profile:'camp-raids-v1',rng:216,nextCheck:homeDue,serial:0,completed:0,departed:[]};
 flushSecondaryContext(w);const view=applyCommand(w,{type:'secondary-view',site:'home'});if(!view.ok)throw Error(view.reason??'Prepared home view refused.');
 const errors=validateWorld(w);if(errors.length)throw Error(errors.join('; '));
 return {world:w,initial:serializeWorld(w),ids,tile,secondaryDue,homeDue,
  notice:prepared.notice+' ADAPTATION DU TÉMOIN : préparation Survivants de camp V216/V377 existante, aucun profil de création Core converti. Deux calendriers de camp finis ajoutés avant import : raid futur au second site à +12ticks, foyer à +60ticks. Aucun raid déjà produit, aucune guérison supplémentaire, aucun champ écrit après import. Le natif joue seulement arrivées futures, avertissement, pause et navigation.'};
}
