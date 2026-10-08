import {adoptMiscIncidents,adoptWeatherIncidents,MISC_FIRST_CHECK} from '../../src/sim/cassandra-misc.ts';
import {enableCassandraRaids} from '../../src/sim/cassandra-raids.ts';
import {adoptFluIncidents} from '../../src/sim/flu-incidents.ts';
import {crashlandedProfile} from '../../src/sim/game-profile.ts';
import {createWorld,refreshStock} from '../../src/sim/index.ts';
import {BATTERY_ENERGY_SCALE} from '../../src/sim/power-battery.ts';
import {BATTERIES_RESEARCH_COST} from '../../src/sim/research.ts';
import {newPowerState} from '../../src/sim/power-rules.ts';
import {adoptShortCircuits} from '../../src/sim/short-circuit.ts';
import {adoptSiteClimate} from '../../src/sim/site-climate.ts';
import {resolveSite} from '../../src/sim/site.ts';
import {initializeWildFlora} from '../../src/sim/wild-flora.ts';
import type {Structure,World} from '../../src/sim/types.ts';

/** Complete ordinary storyteller and source provenance, rather than a wave-only fixture. */
export function shortCircuitColony(withReserve=true):World {
  const w=createWorld(266,32,32);w.pawns=[];w.resources=[];w.piles=[];w.jobs=[];w.structures=[];
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.stockpiles=[];w.growingZones=[];refreshStock(w);
  w.gameProfile=crashlandedProfile();w.tick=MISC_FIRST_CHECK-1;
  w.scenario={id:'crashlanded',revision:8,landing:{x:4,z:4}};
  w.site=resolveSite(w.seed,{hilliness:'flat',biome:'boreal-forest'});
  if(w.site.revision===2)initializeWildFlora(w,w.site);
  enableCassandraRaids(w);adoptFluIncidents(w);adoptSiteClimate(w);
  adoptMiscIncidents(w);adoptWeatherIncidents(w);adoptShortCircuits(w);
  if(withReserve){
    w.research={points:0,project:null,batteries:{points:BATTERIES_RESEARCH_COST,completedAt:w.tick}};
    const conduit:Structure={id:w.nextId++,kind:'power-conduit',x:10,z:10,orientation:0,footprint:'standard',material:'steel',power:newPowerState('power-conduit')};
    w.structures.push(conduit);
    for(let i=0;i<9;i++)w.structures.push({id:w.nextId++,kind:'battery',x:11+i,z:10,orientation:0,footprint:'standard',material:'steel',power:newPowerState('battery'),battery:{stored:600*BATTERY_ENERGY_SCALE}});
  }
  return w;
}
