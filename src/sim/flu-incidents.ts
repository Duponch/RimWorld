import { isPlayerPatient } from './affiliation.ts';
import { acquireFlu } from './flu-state.ts';
import { createMedicalRecord } from './injury-state.ts';
import { reconcilePawnHealth,updatePawnHealth } from './health.ts';
import { TICKS_PER_DAY,type Pawn,type World } from './types.ts';

/** One Core disease check is 1,000 Core ticks = 100 local ticks. Cassandra's
 * DiseaseHuman component is dormant until day nine. The biome MTB belongs to
 * the whole category, not to Flu alone. Unimplemented diseases consume their
 * selected opportunities instead of making the one implemented disease more
 * frequent. Adventure Story multiplies the biome MTB by 1.5. */
export const FLU_CHECK_INTERVAL=100;
export const FLU_FIRST_CHECK=9*TICKS_PER_DAY;
const DISEASE_INTERVAL_FACTOR=1.5;
const BIOMES={
  'temperate-forest':{mtbDays:50,humanWeight:470},
  'boreal-forest':{mtbDays:60,humanWeight:370},
  'arid-shrubland':{mtbDays:65,humanWeight:390},
} as const;
const FLU_WEIGHT=100;

export interface FluIncidentCalendar {
  profile:'cassandra-flu-v1';
  /** xorshift32 independent of the world medical/combat random stream. */
  rng:number;
  nextCheck:number;
  checks:number;
  fluDraws:number;
  episodes:number;
  cases:number;
}

function random(state:FluIncidentCalendar):number {
  let n=state.rng;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0;
  return state.rng/0x100000000;
}
function coreRound(value:number):number {
  const whole=Math.floor(value);
  return value-whole===.5?whole+(whole%2):Math.round(value);
}
function fluCandidates(world:World):Pawn[] {
  // The local game has no biosculptor or cryptosleep holder. Free player
  // colonists and colony prisoners are the corresponding implemented subset.
  return world.pawns.filter(p=>p.state!=='dead'&&isPlayerPatient(p)&&!p.visitor&&!p.health?.body);
}
function emit(world:World,message:string):void {
  world.events.push({tick:world.tick,type:'need',message});
  if(world.events.length>80)world.events.splice(0,world.events.length-80);
}

/** Adopt prospectively. An old save never receives a retrospective roll, and
 * merely adding this state does not consume either RNG stream. */
export function adoptFluIncidents(world:World):void {
  if(!world.gameProfile||world.fluIncidents)return;
  world.fluIncidents={profile:'cassandra-flu-v1',rng:((world.seed^0xf10a1270)>>>0)||1,
    nextCheck:Math.max(FLU_FIRST_CHECK,(Math.floor(world.tick/FLU_CHECK_INTERVAL)+1)*FLU_CHECK_INTERVAL),
    checks:0,fluDraws:0,episodes:0,cases:0};
}

/** Resolve only a selected Flu incident. Kept separate so focused tests can
 * cover a physical case without simulating the many disease-free days. */
export function resolveFluIncident(world:World,state:FluIncidentCalendar=world.fluIncidents!):number {
  if(!state)return 0;
  const candidates=fluCandidates(world);
  if(!candidates.length)return 0;
  const min=coreRound(candidates.length*.2),max=coreRound(candidates.length*.5);
  const requested=Math.max(1,min+Math.floor(random(state)*(max-min+1)));
  // A partial Fisher-Yates shuffle samples without favoring a pawn's stable
  // world-array position. The entire O(n) operation occurs only on an incident.
  let acquired=0;const names:string[]=[];
  for(let index=0;index<Math.min(requested,candidates.length);index++){
    const swap=index+Math.floor(random(state)*(candidates.length-index));
    [candidates[index],candidates[swap]]=[candidates[swap]!,candidates[index]!];
    const pawn=candidates[index]!;
    const flu=pawn.health?.flu;
    const immunity=flu?.immunity??0;
    const contractChance=flu?.severity?0:Math.max(0,1-immunity/600_000_000);
    if(random(state)>=contractChance)continue;
    if(pawn.health&&pawn.health.tick<world.tick)updatePawnHealth(world,pawn);
    if(pawn.state==='dead')continue;
    const record=pawn.health??=createMedicalRecord(world.tick);
    const luck=800_000+Math.floor(random(state)*400_001);
    if(!acquireFlu(record,luck))continue;
    reconcilePawnHealth(world,pawn);
    acquired++;names.push(pawn.name);
  }
  if(acquired){
    state.episodes++;state.cases+=acquired;
    emit(world,`Grippe : ${names.join(', ')} ${acquired===1?'est malade':'sont malades'}. Consultez Santé, organisez les soins et le repos au lit.`);
  }
  return acquired;
}

/** O(1) on 99/100 ticks and O(n) only when a disease opportunity is drawn.
 * Non-Flu disease selections are deliberately silent, pending their systems. */
export function advanceFluIncidents(world:World):void {
  const state=world.fluIncidents;if(!state||world.tick<state.nextCheck)return;
  state.nextCheck=world.tick+FLU_CHECK_INTERVAL;
  state.checks++;
  const biome=BIOMES[world.site?.biome??'temperate-forest'];
  const mtbTicks=biome.mtbDays*DISEASE_INTERVAL_FACTOR*TICKS_PER_DAY;
  if(random(state)>=-Math.expm1(-FLU_CHECK_INTERVAL/mtbTicks))return;
  // Core chooses a weighted, currently usable disease after the category
  // event. These static human weights preserve category frequency; other
  // diseases have not yet been implemented or dynamically filtered here.
  if(random(state)*biome.humanWeight>=FLU_WEIGHT)return;
  state.fluDraws++;
  resolveFluIncident(world,state);
}
