import { PowerTopologyCache, connectedPowerGroups } from '../sim/power-topology';
import { isElectrical, isPowerActive, powerWatts, powerDemand } from '../sim/power-rules';
import { batteryWattDays } from '../sim/power-battery';
import { solarUnroofedCells } from '../sim/solar-rules';
import { naturalLight } from '../sim/environment';
import { calendarTick } from '../sim/calendar';
import type { Structure, World } from '../sim/types';

const cache = new PowerTopologyCache();
const watts = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} W`;

export function powerInspection(world: World, structure: Structure): string {
  if (!isElectrical(structure.kind) || !structure.power) return '';
  const topology = cache.read(world);
  const group = connectedPowerGroups(world, topology).find(g => g.some(s => s.id === structure.id));
  const supply = group?.reduce((n, s) => n + Math.max(0, powerWatts(s, world)), 0) ?? 0;
  const used = group?.reduce((n, s) => n - Math.min(0, powerWatts(s, world)), 0) ?? 0;
  const required = group?.reduce((n, s) => n + (s.power?.switchOn === false ? 0 : powerDemand(s)), 0) ?? 0;
  const batteries = group?.filter(s => s.battery) ?? [];
  const stored = batteries.reduce((n, s) => n + batteryWattDays(s.battery!), 0);
  let detail: string;
  if (structure.kind === 'solar-generator') {
    const open = solarUnroofedCells(world, structure);
    detail = `Production ${watts(Math.max(0, powerWatts(structure, world)))} / 1 700 W · ${open}/16 cases sans toit · lumière naturelle ${Math.round(naturalLight(calendarTick(world)) * 100)} %`;
    if (!open) detail += ' · Entièrement sous toit';
    else if (naturalLight(calendarTick(world)) === 0) detail += ' · Nuit';
    else if (!isPowerActive(structure)) detail += ' · Démarrage en attente';
  } else if (structure.kind === 'battery') {
    detail = `Stockage ${batteryWattDays(structure.battery ?? {stored: 0}).toFixed(2)} / 600 W·j · rendement de charge 50 % · autodécharge 5 W`;
  } else if (structure.kind === 'power-switch') {
    detail = structure.power.switchOn === false ? 'Interrupteur ouvert · liaison interrompue sur cette case' : 'Interrupteur fermé · liaison établie sur cette case';
  } else if (structure.kind === 'power-conduit') {
    detail = 'Conducteur passif · transmet le courant entre cellules voisines · aucun remboursement à la déconstruction';
  } else {
    const off = structure.power.switchOn === false;
    const state = off ? 'Arrêt manuel' : structure.kind === 'wood-generator'
      ? !structure.fuel?.ticks ? 'Sans combustible' : isPowerActive(structure) ? 'En marche' : 'Démarrage en attente'
      : structure.power.parentId === null ? 'Non raccordée' : structure.power.on ? 'Allumée' : 'Alimentation en attente';
    detail = `${state} · ${structure.kind === 'wood-generator' ? `Production ${watts(Math.max(0, powerWatts(structure, world)))} · 22 bois/jour` : `Demande ${watts(powerDemand(structure))}`}`;
    const parent = structure.power.parentId === null ? undefined : topology.sources.get(structure.power.parentId);
    if (parent) detail += ` · raccordée au réseau en ${parent.x}, ${parent.z}`;
  }
  if (group) detail += ` · Réseau : ${watts(supply)} produits, ${watts(used)} utilisés (${watts(required)} demandés) · ${batteries.length ? `${stored.toFixed(2)} / ${batteries.length * 600} W·j stockés` : 'aucune batterie raccordée'}`;
  return ` · ${detail}.`;
}
