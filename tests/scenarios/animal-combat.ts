import { firingCamp } from './shooting.ts';
import { enableWildlife } from '../../src/sim/wildlife.ts';
import { refreshStock } from '../../src/sim/materials.ts';

/** Combat fixture only; no damage or material injected by the UI driver. */
export function animalCombatCamp(){
  const w=firingCamp();w.resources=[];w.jobs=[];w.structures=[];w.tiles=w.tiles.map(()=>({terrain:'grass' as const}));
  w.resources.push({id:w.nextId++,kind:'berries',x:10,z:10,amount:10,growth:1,growthTick:w.tick});
  enableWildlife(w,1);const a=w.wildlife!.animals[0]!;
  Object.assign(a,{x:10,z:10,food:.2,rest:1,nextDecision:w.tick+100});
  w.pawns[0]!.skills.shooting.level=20;refreshStock(w);return w;
}
