import {fermentationInspection265} from '../sim/fermentation-runtime-265';
import type {Structure,World} from '../sim/types';

/** Explicit inspection of one installed vessel; no inferred transfers. */
export function brewingInspection265(world:World,structure:Structure):string {
 if(structure.kind==='brewery')return 'Brasserie manuelle · Facture : 25 houblons → 5 moûts · Cuisine au poste réel · 1 000 ticks Core nominaux · sans combustible ni électricité · Transport apporte le moût aux tonneaux';
 const state=fermentationInspection265(world,structure);if(!state)return '';
 const temperature=`${state.temperature.toFixed(1).replace('.',',')} °C`;
 if(state.ruin>=1)return `Contenu perdu à cause de la température · ${temperature} · tonneau vide · Transport peut apporter du nouveau moût entre 1 et 30 °C`;
 if(!state.wort)return `Vide · capacité 25 moûts · ${temperature} · ${state.fillAllowed?'Transport peut charger le moût disponible au contact':'Remplissage suspendu : température requise entre 1 et 30 °C ou accès indisponible'} · 6 jours à température idéale`;
 const status=state.fermented?`${state.wort} bières prêtes · Transport extrait au contact`:`${state.wort} / ${state.capacity} moûts · fermentation ${Math.floor(state.progress*100)} % · vitesse ${Math.round(state.factor*100)} %`;
 return `${status} · ${temperature} · dommages thermiques ${Math.floor(state.ruin*100)} % · progression idéale dès 7 °C, dommages sous −1 °C et au-dessus de 32 °C · ajout de moût : progression moyenne du mélange · la désinstallation suspend la fermentation`;
}
