import {healthRandom} from './health.ts';
import {animalBodySize} from './animal-life.ts';
import type {WorldLandBiome} from './world-biome-selection.ts';
import type {AwayGroup} from './group-capture.ts';
import type {CaravanIncident261} from './caravan-encounter-state-261.ts';
const f=Math.fround;
/** Core4871 Incidents_Caravan_All, facts only. No absent biome is normalized. */
export const CARAVAN_BIOME_MTB_261:Readonly<Record<WorldLandBiome,Readonly<Record<CaravanIncident261,number>>>>=Object.freeze({
 'temperate-forest':{ambush:20,'manhunter-ambush':20,meeting:10,demand:20},'boreal-forest':{ambush:20,'manhunter-ambush':20,meeting:10,demand:20},
 'tropical-rainforest':{ambush:20,'manhunter-ambush':20,meeting:10,demand:20},'arid-shrubland':{ambush:20,'manhunter-ambush':20,meeting:10,demand:20},
 desert:{ambush:30,'manhunter-ambush':30,meeting:15,demand:30},tundra:{ambush:30,'manhunter-ambush':30,meeting:15,demand:30},
 'tropical-swamp':{ambush:30,'manhunter-ambush':30,meeting:15,demand:30},'temperate-swamp':{ambush:30,'manhunter-ambush':30,meeting:15,demand:30},
 'cold-bog':{ambush:35,'manhunter-ambush':35,meeting:25,demand:35},'extreme-desert':{ambush:35,'manhunter-ambush':35,meeting:25,demand:35},
 'ice-sheet':{ambush:40,'manhunter-ambush':40,meeting:35,demand:40},'sea-ice':{ambush:60,'manhunter-ambush':60,meeting:80,demand:60},
});
/** Native SimpleCurve clamps outside its endpoints; MovingNow includes real stops. */
export function caravanVisibility261(bodySizeSum:number,movingNow:boolean):number {
 if(!Number.isFinite(bodySizeSum)||bodySizeSum<0)throw Error('Missing actual body-size capture');
 const n=f(bodySizeSum);
 const visibility=n<=1?f(n*f(.2)):n<=6?f(f(.2)+f(f(f(n-1)/5)*f(.8))):n<=12?f(1+f(f(f(n-6)/6)*f(.12))):f(1.12);
 return movingNow?visibility:f(visibility*f(.3));
}
/** The currently admitted human producers are adult BodySize1; animals use their
 * existing life-stage/growth owner. A future human body-size model must bind here. */
export function groupVisibility261(g:AwayGroup):number {
 let sum=f(g.members.length);for(const animal of g.animalOwners?.members??[])sum=f(sum+f(animalBodySize(animal)));
 return caravanVisibility261(sum,g.phase==='travelling'&&!g.paused&&g.stop===null);
}
/** Exact bounded MTB arithmetic from the acquired Rand.MTBEventOccurs; the PRNG
 * is the existing deterministic campaign stream, not native Unity draw parity.
 * Operates on a speculative RNG copy until the caller commits the actual pass. */
export function caravanMtbEvent261(mtbDays:number,deltaCore:number,random:{rng:number}):boolean {
 if(mtbDays===Infinity)return false;
 if(!Number.isFinite(mtbDays)||mtbDays<0||!Number.isSafeInteger(deltaCore)||deltaCore<1)throw Error('Invalid incident MTB capture');
 if(mtbDays===0)return true;
 let chance=deltaCore/(f(mtbDays)*60000),gate=1;
 while(chance<.0001){chance*=8;gate/=8;}
 if(gate<1&&healthRandom(random)>gate)return false;
 return healthRandom(random)<chance;
}
export function caravanIncidentOccurs261(biome:WorldLandBiome,incident:CaravanIncident261,visibility:number,random:{rng:number}):boolean {
 const days=CARAVAN_BIOME_MTB_261[biome]?.[incident];
 if(days===undefined||!Number.isFinite(visibility)||visibility<0)throw Error('Missing actual biome/visibility authority');
 return caravanMtbEvent261(incident==='meeting'?days:visibility===0?Infinity:f(days/visibility),1000,random);
}
/** Counts every original Pawn on both sides, including the real animals. */
export function caravanAmbushMapSize261(playerCount:number,enemyCount:number):number|undefined {
 if(!Number.isSafeInteger(playerCount)||playerCount<1||!Number.isSafeInteger(enemyCount)||enemyCount<1)return;
 const raw=f(Math.sqrt(f((playerCount+enemyCount)*900))),lower=Math.floor(raw),part=raw-lower;
 return Math.max(75,Math.min(110,part===.5?lower+lower%2:Math.round(raw)));
}
