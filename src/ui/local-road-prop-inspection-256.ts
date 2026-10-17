import {isLocalRoadProp256} from '../sim/local-road-props-256';
import type {Structure} from '../sim/types';
export function localRoadPropDescription256(s:Pick<Structure,'kind'|'factionId'>):string|undefined {
 if(!isLocalRoadProp256(s.kind))return;
 return (s.factionId===null?'Non revendiqué · ':'Revendiqué · ')+(s.kind==='ancient-road-barrier'?'Vestige en béton · Couvert 50 % selon la direction du tir':
  'Vestige métallique · Couvert 25 % selon la direction du tir · Éclairage hors service')
  +' · Traversée ralentie, sans arrêt · Ininflammable · Ne soutient pas de toit · Non déplaçable';
}
