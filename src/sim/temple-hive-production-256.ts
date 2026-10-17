/** Enabled Temple hive production using the current three insect bodies and
 * Hive duties. Character creation is explicitly provisional (current wildlife
 * needs/adult age), with no native redress or internal generation certificate. */
import type {World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import {MAX_WILDLIFE} from './wildlife-state.ts';
import {duckPhysicalOwnerCount256} from './duck-flyer-runtime-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {ActualHive256} from './cave-hive-state-256.ts';
import {CAVE_INSECT_DATA_256} from './cave-insect-data-256.ts';
import {findActualHiveLord256} from './cave-hive-lord-search-256.ts';
import {captureRandomClosewalk256,randomClosewalkCellNear256} from './random-closewalk-256.ts';
import {captureHiveClosewalk256} from './cave-hive-closewalk-256.ts';
import {attachActualAnimalGrowth256} from './animal-growth-runtime-256.ts';
import {constructAnimalMind256} from './animal-condition-mental-state-256.ts';
import {caveRadialPattern256} from './local-cave-radial-256.ts';
import {captureWorldShotGrid} from './combat-world.ts';
import {clearShotSegment} from './combat-space.ts';
type Random=Pick<WorldGenerationRandom,'integer'|'value'|'float'>;
const kinds=['megascarab','spelopede','megaspider'] as const;
/** Prospective ID, no retained-owner input and no native redress claim. The
 * historical native constructor stays available for its independent facts. */
export function createFunctionalHiveInsect256(input:{species:typeof kinds[number];id:number;cell:{x:number;z:number};tick:number;random:Random}):WildAnimal {
 const {species,id,cell,tick,random}=input,fact=CAVE_INSECT_DATA_256[species];
 if(!fact||!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(tick)||tick<0||!Number.isSafeInteger(tick*10+240)||!Number.isInteger(cell.x)||!Number.isInteger(cell.z))throw Error('Invalid prospective existing insect body frontier');
 const ageCore=Math.trunc(Math.fround(Math.fround(fact.lifeStages.at(-1)!.minAgeYears)*3600000));
 const animal:WildAnimal={id,species,sex:random.value()<.5?'female':'male',...cell,ageTicks:Math.floor(ageCore/10),ageCoreRemainder:ageCore%10,
  food:Math.fround(random.float(.5,.9)*Math.fround(fact.stats.MaxNutrition*fact.race.baseBodySize)),rest:fact.race.needsRest?random.float(.9,1):1,state:'idle',path:[],nextDecision:tick+1,caravanCarrySick:false};
 attachActualAnimalGrowth256(animal,{value:1,nextCheckCore:tick*10+240},256);constructAnimalMind256(animal,256);return animal;
}
export function enabledHivePoints256(w:World,h:ActualHive256):number {
 let points=0;for(const id of h.caveHive.spawnedPawnIds){const a=w.wildlife?.animals.find(a=>a.id===id);if(a&&a.state!=='dead'&&!a.health?.death)points=Math.fround(points+CAVE_INSECT_DATA_256[a.species as typeof kinds[number]].kind.combatPower);}return points;
}
/** A failed capacity/placement adds no actor and spends no Thing/Lord ID.
 * A full unpublished generation candidate is still discarded on an error. */
export function spawnEnabledHivePawn256(w:World,h:ActualHive256,core:number,random:Random,lordIds:{nextId:number}):boolean {
 if(!h.caveHive.temple||!h.caveHive.canSpawnPawns||h.caveHive.awakeAtCore===null)return false;
 const owner=w.wildlife;if(!owner||duckPhysicalOwnerCount256(w)>=MAX_WILDLIFE)return false;
 const points=enabledHivePoints256(w,h),available=kinds.filter(k=>Math.fround(points+CAVE_INSECT_DATA_256[k].kind.combatPower)<=500);
 h.caveHive.chosenKind=available.length?available[random.integer(0,available.length)]!:null;
 if(h.caveHive.chosenKind===null)return false;
 if(!Number.isSafeInteger(w.nextId+1)||!Number.isInteger(lordIds.nextId)||lordIds.nextId<0||lordIds.nextId>=2147483646)throw Error('Enabled Hive identity frontier exhausted');
 const live=captureHiveClosewalk256(w),cell=randomClosewalkCellNear256(captureRandomClosewalk256(w,live.reach),h.z*w.width+h.x,2,random),species=h.caveHive.chosenKind;
 const animal=createFunctionalHiveInsect256({id:w.nextId++,species,cell:{x:cell%w.width,z:Math.floor(cell/w.width)},tick:w.tick,random});
 let lord=findActualHiveLord256(w,h);if(!lord){lord={id:lordIds.nextId++,factionId:h.factionId,aggressive:true,phase:'defend-expand',lastHarmCore:core,memberIds:[],assignedHives:[]};(owner.hiveLords??=[]).push(lord);}
 animal.hive={factionId:h.factionId,lordId:lord.id,spawnerId:h.id};owner.animals.push(animal);h.caveHive.spawnedPawnIds.push(animal.id);lord.memberIds.push(animal.id);
 const reach=live.reach,focus=w.structures.filter((s):s is ActualHive256=>s.kind==='insect-hive'&&s.factionId===h.factionId&&(s.x-animal.x)**2+(s.z-animal.z)**2<=900).sort((a,b)=>(a.x-animal.x)**2+(a.z-animal.z)**2-((b.x-animal.x)**2+(b.z-animal.z)**2)).find(s=>reach.canReach(cell,s.z*w.width+s.x,'closed'));
 if(focus)lord.assignedHives.push({pawnId:animal.id,hiveId:focus.id});return true;
}
/** Existing two reachable searches, with the same exclusions. A read-only
 * no-wipe check prevents a reproductive event from deleting another owner. */
export function enabledHiveChildCell256(w:World,h:ActualHive256,random:Random):number|null {
 const capture=captureHiveClosewalk256(w),root=h.z*w.width+h.x;
 const allowed=(cell:number,min:number)=>{
  const x=cell%w.width,z=Math.floor(cell/w.width);
  if(!capture.physical.roofed(cell)||!capture.physical.normalWalkable(cell)||(x-h.x)**2+(z-h.z)**2<min*min)return false;
  if(w.structures.some(s=>s.kind==='glow-pod'&&s.x===x&&s.z===z||s.kind==='insect-hive'&&Math.max(Math.abs(s.x-x),Math.abs(s.z-z))<=1))return false;
  return !w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z&&(p.item==='insect-jelly'));
 };
 const first=capture.tryCell(root,10,random,c=>allowed(c,3.5)),selected=first??capture.tryCell(root,10,random,c=>allowed(c,0));if(selected===null)return null;
 const minimum=first===null?0:3.5,near={x:selected%w.width,z:Math.floor(selected/w.width)},grid=captureWorldShotGrid(w),radial=caveRadialPattern256(2);
 for(let i=0;i<radial.count;i++){const [dx,dz]=radial.offsets[i]!,x=near.x+dx,z=near.z+dz;if(x<0||z<0||x>=w.width||z>=w.height)continue;const cell=z*w.width+x;
  if(allowed(cell,minimum)&&!capture.physical.edifice(cell)&&clearShotSegment(grid,near,{x,z}))return cell;
 }return null;
}
