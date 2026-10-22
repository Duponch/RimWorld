import {coupleBed285} from '../sim/couple-bed-285';
import type {Pawn,World} from '../sim/types';

export interface CoupleActivity285 {
 readonly label:string;
 readonly description:string;
 readonly remainingCore:number;
 readonly durationCore:number;
}
/** Current confirmed posture and original local identity only. No UI clock,
 * mutable admission, remote person substitute or activity outcome is created. */
export function coupleActivity285(world:World,pawn:Pawn):CoupleActivity285|undefined {
 if(!coupleBed285(world,pawn))return;
 const task=pawn.coupleTask285!;
 const partner=world.pawns.find(other=>other.id===task.otherId);
 const label=partner?`Moment intime avec ${partner.name}`:'Moment intime';
 const remainingCore=Math.max(0,task.endsAtCore-world.tick*10);
 const minutes=Math.ceil(remainingCore*60/2500);
 return {label,description:`${label}. Éveillés dans leur lit partagé. Temps restant : environ ${minutes} min en jeu.`,remainingCore,durationCore:task.endsAtCore-task.enteredAtCore};
}
