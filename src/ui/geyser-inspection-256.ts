import {geyserOwnedId256,type GeyserWorld256} from '../sim/local-geyser-state-256';
import {knownPosition256} from './exploration-readers-256';
export const GEYSER_LABEL_256='Geyser de vapeur';
/** Read-only real owner. No owner claim, destruction, resources or blueprint. */
export function geyserInspection256(world:GeyserWorld256,id:number):{title:string;description:string}|undefined {
 const g=geyserOwnedId256(world,id);if(!g||![{x:g.x,z:g.z},{x:g.x+1,z:g.z},{x:g.x,z:g.z+1},{x:g.x+1,z:g.z+1}].some(c=>knownPosition256(world,c)))return undefined;
 return {title:GEYSER_LABEL_256,description:`Objet naturel · 2×2 cases · Traversable · Indestructible · ${g.sprayTicksLeft>0?'Émission de vapeur':'Entre deux émissions'} · La vapeur réchauffe l’air intérieur et fait fondre la neige alentour au début de chaque émission. Le sol ne peut être recouvert ni cultivé ici.`};
}
