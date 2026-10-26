import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {localBiomeRules256} from './local-biome-rules-v256.ts';
import {INITIAL_ANIMAL_FACTS_256,type InitialAnimalFact256} from './initial-animal-data-256.ts';
import {CORE_4871_PAWN_KIND_ORDER} from './core-definition-order-4871.ts';
import {initialAnimalTargetWeight256,selectInitialAnimalTicket256} from './initial-animals-256.ts';
import {geographicSeasonTemperature256,geographicLongitudeOffsetCore256,climateTick} from './site-climate.ts';
import {stagedCampArrivalRandom256} from './camp-center-entry-256.ts';
import {captureGeographicRenewalSpace262} from './geographic-renewal-space-262.ts';
import {duckMapHasWater256} from './duck-water-256.ts';
import {selectDuckFlyerArrival256} from './duck-flyer-selection-256.ts';
import {duckPhysicalOwnerCount256} from './duck-flyer-runtime-256.ts';
import {animalMechanicalReadiness256} from './animal-readiness-v256.ts';
import {isAnimalSpecies256} from './animal-core-v256.ts';
import {cobraAdmissionReason256} from './cobra-admission-256.ts';
import {toxicFalloutActive294} from './toxic-fallout-state-294.ts';
import {orderedCoreLocalMutators256} from './world-local-mutators-256.ts';
import {MAX_WILDLIFE} from './wildlife-state.ts';
import type {AnimalSpeciesId} from './animal-species.ts';
import type {World,Cell} from './types.ts';
const f=Math.fround,facts:Readonly<Record<string,InitialAnimalFact256>>=INITIAL_ANIMAL_FACTS_256;
const bySpecies=new Map(Object.values(facts).map(fact=>[fact.species,fact]));
export const GEOGRAPHIC_ANIMAL_INTERVAL_CORE_262=1213;
/** The ten true Core substeps cross at most one1213 boundary. Never shift the
 * next check to now+122 and never catch up missed intervals on load. */
export function geographicRenewalDue262(previousTick:number,tick:number):boolean {
 if(!Number.isSafeInteger(previousTick)||previousTick<0||tick!==previousTick+1||!Number.isSafeInteger(tick*10))throw Error('Geographic renewal clock discontinuity');
 return Math.floor(previousTick*10/1213)!==Math.floor(tick*10/1213);
}
/** Current scalar target; no stored fixed target ages through later seasons.
 * Fallout changes new arrivals, never removes an existing physical animal. */
export function geographicRenewalTarget262(w:World){
 const site=w.site,c=w.climate;if(site?.revision!==3||c?.revision!==4||c.tileId!==site.tileId)throw Error('Renewal needs its actual biome and tile climate');
 const rules=localBiomeRules256(site.biome,w.schemaVersion);if(!rules)throw Error('Missing actual renewal biome');orderedCoreLocalMutators256(site.mutatorCode);
 const commonality=new Map(rules.wildAnimals.map(row=>[String(row.defId),f(row.commonality)])),season=geographicSeasonTemperature256(c.definition,climateTick(w)*10-geographicLongitudeOffsetCore256(c.definition.longitude));
 const order=new Set<string>(CORE_4871_PAWN_KIND_ORDER);if([...commonality.keys()].some(def=>!order.has(def)))throw Error('Renewal biome names a missing ordered real species');
 let total=0,acceptable=0;const entries:{fact:InitialAnimalFact256;commonality:number;weight:number}[]=[];
 for(const def of CORE_4871_PAWN_KIND_ORDER){const weight=commonality.get(def);if(weight===undefined||weight<=0)continue;const fact=facts[def];if(!fact)throw Error('Unrepresented real renewal species');total=f(total+weight);if(season>f(fact.comfyMin)&&season<f(fact.comfyMax)){acceptable=f(acceptable+weight);entries.push({fact,commonality:weight,weight});}}
 const target=initialAnimalTargetWeight256(w.width*w.height,rules.scalars.animalDensity,acceptable,total,toxicFalloutActive294(w)?0:1);
 let current=0;for(const a of w.wildlife?.animals??[])if(a.state!=='dead'&&!a.domestic&&!a.hive){const fact=bySpecies.get(a.species);if(!fact)throw Error('Unrepresented spawned ecological weight');current=f(current+f(fact.ecoSystemWeight));}
 return {...target,current,entries};
}
export type GeographicRenewalOutcome262='absent'|'same-tick'|'not-due'|'full'|'chance'|'no-entry'|'no-kind'|'capacity'|'no-space'|'spawned';
/** SIM only; caller supplies its existing actual original-animal producer.
 * It owns identity, ordinary needs/growth and Duck arrival holders. This
 * deliberately preserves the authorized provisional character producer. */
export function advanceGeographicRenewal262(w:World,spawn:(species:AnimalSpeciesId,cell:Cell,nextDecision:number,flyIn:boolean)=>boolean):GeographicRenewalOutcome262 {
 const s=w.wildlife,state=s?.geographicRenewal262;if(!state)return 'absent';
 if((Number(w.schemaVersion)!==262&&!isSchema263OrLater(Number(w.schemaVersion)))||s.profile!=='geographic-fauna-v3'||state.revision!==1||!Number.isSafeInteger(state.adoptedAt)||state.adoptedAt<0||state.adoptedAt>state.lastTick)throw Error('Invalid prospective renewal owner');
 if(state.lastTick===w.tick)return 'same-tick';const due=geographicRenewalDue262(state.lastTick,w.tick);if(!due){state.lastTick=w.tick;return 'not-due';}
 const target=geographicRenewalTarget262(w);if(target.current>=target.weight){state.lastTick=w.tick;return 'full';}
 const staged=stagedCampArrivalRandom256(s.rng),random={value:staged.value,integer:staged.integer,float:(min:number,max:number)=>max<=min?min:f(f(staged.value()*f(f(max)-f(min)))+f(min))};
 const finish=(outcome:GeographicRenewalOutcome262)=>{state.lastTick=w.tick;s.rng=staged.rng;return outcome;};
 const chance=f(f(.026955556)*f(target.density));if(chance<=0){state.lastTick=w.tick;return 'chance';}if(!(chance>=1)&&!(random.value()<chance))return finish('chance');
 // Capture only after the real successful chance, never on every tick/check.
 const space=captureGeographicRenewalSpace262(w),entry=space.entry(random);if(!entry)return finish('no-entry');
 const water=duckMapHasWater256(w),tickets=target.entries.map(row=>({...row,weight:row.fact.waterSeeker&&!water?0:f(row.commonality/f(f(row.fact.wildGroupSize[0]+row.fact.wildGroupSize[1])/2))})),ticket=selectInitialAnimalTicket256(tickets,random);if(!ticket)return finish('no-kind');
 const fact=ticket.fact;if(isAnimalSpecies256(fact.species)&&!animalMechanicalReadiness256(fact.species).ok)throw Error('Selected renewal species has no actual runtime');
 if(fact.species==='cobra'){const reason=cobraAdmissionReason256(w);if(reason)throw Error('Selected Cobra renewal refused: '+reason);}
 const flight=fact.species==='duck'?selectDuckFlyerArrival256(w,random.value):undefined,anchor=flight??entry;
 const count=random.integer(fact.wildGroupSize[0],fact.wildGroupSize[1]+1),neededIds=count*(flight?2:1);
 if(duckPhysicalOwnerCount256(w)+count>MAX_WILDLIFE||!Number.isSafeInteger(w.nextId+neededIds))return finish('capacity');
 const occupied=new Set([...w.pawns.map(p=>p.z*w.width+p.x),...s.animals.map(a=>a.z*w.width+a.x)]),placements:Cell[]=[],radius=Math.ceil(Math.sqrt(fact.wildGroupSize[1]));
 for(let i=0;i<count;i++){const cell=space.nearby(anchor,radius,occupied,random);if(!cell)return finish('no-space');placements.push(cell);occupied.add(cell.z*w.width+cell.x);}
 state.lastTick=w.tick;s.rng=staged.rng;
 for(const cell of placements)if(!spawn(fact.species,cell,w.tick+1,!!flight))throw Error('Preflighted original renewal animal lost its actual producer');
 return 'spawned';
}
