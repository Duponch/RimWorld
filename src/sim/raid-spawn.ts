import { newApparelState } from './apparel-rules.ts';
import { newWeaponState } from './equipment-rules.ts';
import { captureStandability } from './furniture-travel.ts';
import { atMapEdge } from './raid-space.ts';
import { raidRandom,type RaidComposition,type RaidGroup,type RaidRole } from './raid-state.ts';
import { startingPawn } from './starting-pawns.ts';
import type { Cell,Pawn,World } from './types.ts';

export const RAID_ROLE_OPTIONS:readonly {role:RaidRole;weight:number;weapon:'plasteel-knife'|'revolver'|'bolt-action-rifle'}[]=[
  {role:'drifter',weight:10,weapon:'plasteel-knife'},
  {role:'thrasher',weight:3,weapon:'plasteel-knife'},
  {role:'scavenger',weight:10,weapon:'revolver'},
  {role:'pirate',weight:10,weapon:'bolt-action-rifle'},
];

export interface RaidSpawnOptions {
  count:number;
  sites:readonly Cell[];
  random:{rng:number};
  composition?:RaidComposition;
  preserveCalendarRng?:boolean;
}

/** The caller has already selected real entry cells. Prepare every person and
 * possession locally; no world, calendar or RNG change precedes admission. */
export function createRaidGroup(w:World,options:RaidSpawnOptions):RaidGroup|null {
  const s=w.raids,{count,sites,composition}=options;
  const scout=w.scout?.phase==='travelling'||w.scout?.phase==='awaiting-entry'?w.scout:undefined;
  if(!s||s.active||!Number.isSafeInteger(count)||count<1||sites.length!==count
    ||s.serial>=Number.MAX_SAFE_INTEGER||w.nextId>Number.MAX_SAFE_INTEGER-count*3
    ||w.pawns.length+Number(!!scout)+count>w.width*w.height||w.piles.length+(scout?.items.length??0)+count*2>32768
    ||s.departed.length+count>w.width*w.height||!w.foodPolicies[0]
    ||!Number.isSafeInteger(options.random.rng)||options.random.rng<0||options.random.rng>0xffffffff
    ||composition&&(composition.roster.length!==count||composition.roster.some(role=>!RAID_ROLE_OPTIONS.some(option=>option.role===role))))return null;
  const stands=captureStandability(w),occupied=new Set(w.pawns.flatMap(p=>[p.z*w.width+p.x,...p.motion&&p.motion.end>w.tick?[p.motion.from.z*w.width+p.motion.from.x]:[]]));
  const used=new Set<number>();
  for(const cell of sites){const key=cell.z*w.width+cell.x;
    if(!Number.isSafeInteger(cell.x)||!Number.isSafeInteger(cell.z)||cell.x<0||cell.z<0||cell.x>=w.width||cell.z>=w.height
      ||!atMapEdge(w,cell)||!stands(cell)||occupied.has(key)||used.has(key))return null;
    used.add(key);
  }
  const id=s.serial+1,generated:Pawn[]=[],piles:World['piles']=[];let next=w.nextId;
  for(let i=0;i<count;i++){
    const p=startingPawn(next++,`Assaillant ${id}.${i+1}`,sites[i]!.x,sites[i]!.z,0,55,w.seed,w.tick);p.faction='outlaws';p.raid={group:id,exiting:false,goal:null};p.skills.shooting.level=4;p.skills.melee.level=4;p.foodPolicyId=w.foodPolicies[0]!.id;
    generated.push(p);piles.push({id:next++,kind:'apparel',item:'cloth-shirt',quantity:1,owner:{type:'apparel',pawnId:p.id},apparel:newApparelState('cloth-shirt')});
    const weapon=composition?RAID_ROLE_OPTIONS.find(role=>role.role===composition.roster[i])!.weapon:id>1&&i===0?'revolver':undefined;
    if(weapon)piles.push({id:next++,kind:'weapon',item:weapon,quantity:1,owner:{type:'equipment',pawnId:p.id},weapon:newWeaponState(weapon)});
  }
  const random={rng:options.random.rng};
  const deadline=w.tick+2600+Math.floor(raidRandom(random)*1201),lossPermille=400+Math.floor(raidRandom(random)*301);
  const group:RaidGroup={id,startedAt:w.tick,deadline,lossPermille,members:generated.map(p=>p.id),lost:[],phase:'assault'};
  if(composition)group.composition=composition;
  w.nextId=next;w.pawns.push(...generated);w.piles.push(...piles);if(!options.preserveCalendarRng)s.rng=random.rng;options.random.rng=random.rng;s.serial=id;s.nextCheck=null;s.active=group;
  w.events.push({tick:w.tick,type:'command',message:`Raid : ${count} assaillant(s) arrive(nt) au bord de la carte et attaque(nt) immédiatement. Mobilisez la défense.`});if(w.events.length>80)w.events.splice(0,w.events.length-80);
  return group;
}
