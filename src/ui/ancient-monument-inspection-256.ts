import {ANCIENT_MONUMENT_DEFS_256,isAncientMonumentKind256} from '../sim/ancient-monument-props-256';
import type {Structure} from '../sim/types';
/** Confirmed structure facts only; no author, occupancy or acquisition invented. */
export function ancientMonumentDescription256(s:Pick<Structure,'kind'>):string|undefined {
 if(!isAncientMonumentKind256(s.kind))return;
 const d=ANCIENT_MONUMENT_DEFS_256[s.kind];
 const support={Light:'léger',Medium:'moyen',Heavy:'lourd'}[d.support];
 return `Support ${support} requis · ${d.holdsRoof?'Soutient le toit':'Ne soutient pas le toit'} · ${d.minifiable?'Désinstallable':'Non désinstallable'}`
  +(s.kind==='sarcophagus'?' · Sépulture pour une dépouille, attribution et transport réels':'' );
}
