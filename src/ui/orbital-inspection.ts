import { orbitalAtContact,orbitalCoverage,orbitalPoweredBeacon } from '../sim/orbital-rules';
import { powerWatts } from '../sim/power-rules';
import type { Structure,World } from '../sim/types';

/** Read-only projection of the confirmed machines, contact and deliveries. */
export function orbitalInspection(world:World,structure:Structure):string {
  if(structure.kind!=='orbital-beacon'&&structure.kind!=='comms-console')return '';
  const state=structure.breakdown?'En panne':structure.power?.switchOn===false?'Arrêt manuel':powerWatts(structure,world)<0?'Alimentée':'Sans alimentation';
  if(structure.kind==='orbital-beacon'){
    const cells=orbitalCoverage(world),goods=world.piles.filter(p=>p.owner.type==='ground'&&cells.has(p.owner.z*world.width+p.owner.x));
    return `${state} · 40 W · portée 7,9 cases, sans traverser les portes, murs et roche · union des balises alimentées : ${cells.size} cases et ${goods.length} pile(s) au sol · biens et argent doivent être couverts et disponibles · fonctionnement sous toit autorisé`;
  }
  const ships=world.orbital?.ships.filter(s=>s.departAt>world.tick)??[];
  const pawn=world.pawns.find(p=>p.orbitalTrade?.consoleId===structure.id);
  const ship=ships.find(s=>s.id===pawn?.orbitalTrade?.shipId);
  const work=pawn?` · ${pawn.name} ${ship&&orbitalAtContact(world,pawn,ship)?'au contact':'rejoint la console'}`:'';
  return `${state} · 200 W${work} · ${orbitalPoweredBeacon(world)?'balise alimentée disponible':'une balise alimentée est nécessaire'} · ${ships.length} vaisseau(x) en orbite · appel au contact par un négociateur capable de parler et entendre · achats reçus en capsule puis rangés`;
}
