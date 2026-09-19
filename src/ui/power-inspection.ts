import { PowerTopologyCache, connectedPowerGroups } from '../sim/power-topology';
import { isElectrical, isPowerActive, powerWatts, powerDemand } from '../sim/power-rules';
import type { Structure, World } from '../sim/types';

const cache=new PowerTopologyCache();
export function powerInspection(world:World,s:Structure):string {
  if(!isElectrical(s.kind)||!s.power)return '';
  const topology=cache.read(world),group=connectedPowerGroups(world,topology).find(g=>g.some(a=>a.id===s.id));
  const supply=group?.reduce((n,a)=>n+Math.max(0,powerWatts(a)),0)??0;
  const used=group?.reduce((n,a)=>n-Math.min(0,powerWatts(a)),0)??0;
  const required=group?.reduce((n,a)=>n+powerDemand(a),0)??0;
  const state=s.kind==='wood-generator'?s.fuel?.ticks?isPowerActive(s)?'En marche':'Démarrage en attente':'Sans combustible'
    :s.power.parentId===null?'Non raccordée':s.power.on?'Allumée':'Alimentation en attente';
  const parent=s.power.parentId===null?undefined:topology.sources.get(s.power.parentId);
  return ` · ${state}. ${s.kind==='wood-generator'?`Production ${Math.max(0,powerWatts(s))} W · 22 bois/jour`:`Demande ${powerDemand(s)} W${parent?` · raccordée au générateur ${parent.x}, ${parent.z}`:''}`} · Réseau : ${supply} W produits, ${used} W utilisés (${required} W demandés). Aucun stockage électrique.`;
}
