/** Raw owner/phase guard. No projected World, registration or mutation. */
import type { GroupState } from './group-state.ts';
import { GROUP_MAX_MEMBERS,GROUP_MAX_LOSSES } from './group-state.ts';
import type { MaterialPile,Pawn,World } from './types.ts';
import { validatePawnRecordShape } from './pawn-record-save.ts';
import { validatePileRecordShape } from './material-record-save.ts';
import { validateRecreationRecordShape } from './recreation-save.ts';
import { validateHumanSocial } from './social-save.ts';
import { validHumanBereavement } from './bereavement-save.ts';
import { validMentalShape } from './mental-save.ts';
import { captureHumanOwners } from './human-owners.ts';
import { commercialItemMassGrams } from './commercial-mass.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { medicalStatus } from './injury-state.ts';
import { pawnBody } from './health-rules.ts';
import { isColonist } from './affiliation.ts';
import { validPlanetRoute } from './planet-navigation.ts';
import type { PlanetState } from './planet-state.ts';
import { validatePlanet } from './planet-save.ts';
import { validatedPlanetFor,type PlanetValidationContext } from './planet-validation-context.ts';
import { validSchedule } from './schedule.ts';
import { APPAREL_POLICY_INTERVAL } from './apparel-renewal.ts';
import { validFilthFeet } from './filth-save.ts';
import { pileMaxHp } from './thing-damage-rules.ts';
import { validAnesthetic } from './anesthetic.ts';
import { conflictsWith,isApparelItem } from './apparel-rules.ts';
import { isPerishable,ROT_DAYS,ticksUntilRot } from './food-preservation.ts';
import { TICKS_PER_DAY } from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>{
  const actual=Reflect.ownKeys(v);return required.every(k=>Object.hasOwn(v,k))&&actual.every(k=>typeof k==='string'&&(required.includes(k)||optional.includes(k)));
};
const dense=(v:unknown,min:number,max:number):v is unknown[]=>{
  if(!Array.isArray(v)||v.length<min||v.length>max)return false;
  const actual=Reflect.ownKeys(v);return actual.length===v.length+1&&actual.every(k=>k==='length'||typeof k==='string'&&int(Number(k),0,v.length-1)&&String(Number(k))===k);
};
const unique=(v:readonly unknown[])=>new Set(v).size===v.length;
const oneOf=(v:unknown,allowed:readonly string[]):v is string=>typeof v==='string'&&allowed.includes(v);
const LEDGER=['foodLoaded','foodConsumed','medicineUsed','silverLoaded','silverPaid','silverEarned','cargoLoaded','sold','bought'];
const BASELINE=['food','silver','cargo','medicine','component'];
const COMMON=['id','startedAt','destination','ledger','phase'];
const PREPARING=['memberIds','rendezvous','meeting','manifest','cursor','exits'];
const AWAY=['members','items','departedAt','lastPersonalTick','baseline','entry','tile','route','segment','paused','stop'];
const PASSIVE_PAWN=['age','appearance','roomMemories','filthFeet','recruitment','social','bereavement','familyBereavement','romanceMemories','deathThoughts',
  'traits','background','mental','faction','hostilityResponse','careDisabled','medicalCare','selfTend','health','apparelPolicyId',
  'apparelAutomation','nextApparelCheckAt','deniedJoining','originQuestId','podRescue','motion',
  'lastAttack','meleeThreat','disturbance','droppedWeaponId'];
const REQUIRED_PAWN=['id','name','x','z','skills','orders','recreation','foodPolicyId','schedule','restZeroTicks','collapsePending',
  'hunger','rest','mood','comfort','beauty','memories','jobId','haul','cooking','need','bedId','needCooldown','state','priorities','path','moveCooldown','planCooldown'];
const PILE_KEYS=['id','kind','item','quantity','owner'];
const PILE_OPTIONAL=['foodPoison','damage','apparel','weapon','rot'];
const pair=(v:unknown,a:string,b:string)=>object(v)&&keys(v,[a,b])&&int(v[a])&&int(v[b]);
function ledger(v:unknown):boolean {
  return object(v)&&keys(v,LEDGER)&&LEDGER.filter(k=>!['cargoLoaded','sold','bought'].includes(k)).every(k=>int(v[k]))
    &&pair(v.cargoLoaded,'cloth','muffalo-wool')&&pair(v.sold,'cloth','muffalo-wool')&&pair(v.bought,'medicine','component');
}
function baseline(v:unknown):boolean {
  return object(v)&&keys(v,BASELINE)&&['food','silver','medicine','component'].every(k=>int(v[k]))&&pair(v.cargo,'cloth','muffalo-wool');
}
const total=(values:readonly number[]):number|undefined=>{let n=0;for(const value of values){n+=value;if(!Number.isSafeInteger(n))return undefined;}return n;};

export function validateGroupState(world:World,version:number):string[] {
  const raw=world as unknown as Record<string,unknown>;
  if(version<=195)return ['group','groupLosses'].some(k=>Object.hasOwn(raw,k))?['Future group owner in historical schema.']:[];
  if(raw.group===undefined&&raw.groupLosses===undefined)return [];
  if(!int(world.tick)||!int(world.nextId,1)||validatePlanet(raw.planet,world,version).length||raw.planet===undefined)return ['Invalid group planet authority.'];
  return validateGroupOwners(world,version,world.planet!);
}
/** Composition uses a real validated context, checked again by raw values.
 * No bool can bypass geography; the standalone wrapper remains complete. */
export function validateGroupStateWithPlanet(world:World,version:number,context:PlanetValidationContext):string[] {
  const raw=world as unknown as Record<string,unknown>;
  if(version<=195)return ['group','groupLosses'].some(k=>Object.hasOwn(raw,k))?['Future group owner in historical schema.']:[];
  if(raw.group===undefined&&raw.groupLosses===undefined)return [];
  if(!int(world.tick)||!int(world.nextId,1))return ['Invalid group planet authority.'];
  const planet=validatedPlanetFor(context,world,version);
  if(!planet)return ['Invalid group planet authority.'];
  return validateGroupOwners(world,version,planet);
}
function validateGroupOwners(world:World,version:number,planet:PlanetState):string[] {
  const raw=world as unknown as Record<string,unknown>,errors:string[]=[];
  const fail=(message:string)=>errors.push(message);
  const group=raw.group,losses=raw.groupLosses;
  const point=(v:unknown)=>object(v)&&keys(v,['x','z'])&&int(v.x,0,world.width-1)&&int(v.z,0,world.height-1);
  const place=(v:unknown)=>int(v,0,planet.tiles.length-1)&&planet.tiles[v]!.biome!=='ocean';
  const thing=(v:unknown)=>int(v,1,world.nextId-1);
  const groupId=(v:unknown)=>int(v,1,planet.nextGroupId-1);
  const ids=(v:unknown,min=1,max=GROUP_MAX_MEMBERS)=>dense(v,min,max)&&unique(v)&&v.every(thing);
  const localById=new Map(world.pawns.map(p=>[p.id,p]));
  const owners:{pawn:Pawn;clock:number}[]=[],ownerIds=new Set<number>(),pileIds=new Set<number>();
  const retained=new Map<number,MaterialPile[]>();
  // A terminal keeps its historical policy IDs at death. Only a living owner
  // must still resolve those IDs in the current, separately numbered registries.
  function person(v:unknown,clock:number,dead:boolean):v is Pawn {
    if(!object(v)||!keys(v,REQUIRED_PAWN,PASSIVE_PAWN)||!thing(v.id)||ownerIds.has(v.id)||localById.has(v.id)
      ||!int(v.x,0,world.width-1)||!int(v.z,0,world.height-1))return false;
    if(!oneOf(v.state,['idle','resting','downed',...(dead?['dead']:[])])||dead!==(v.state==='dead')
      ||v.jobId!==null||v.haul!==null||v.cooking!==null||v.need!==null||v.bedId!==null||v.moveCooldown!==0||v.planCooldown!==0
      ||!dense(v.path,0,0)||v.motion!==undefined&&v.motion!==null||!object(v.orders)||!keys(v.orders,['active','queue'])
      ||v.orders.active!==null||!dense(v.orders.queue,0,0)||!object(v.recreation)||v.recreation.task!==null
      ||!validSchedule(v.schedule)||!int(v.restZeroTicks,0,4500)||typeof v.collapsePending!=='boolean'
      ||v.collapsePending&&(Number(v.rest)>=.01||v.restZeroTicks<=100)||world.restRules==='legacy'&&(v.restZeroTicks!==0||v.collapsePending)
      ||!int(v.foodPolicyId,1,world.nextFoodPolicyId-1)||!dead&&!world.foodPolicies.some(policy=>policy.id===v.foodPolicyId)
      ||object(v.social)&&Object.hasOwn(v.social,'fight')||object(v.mental)&&Object.hasOwn(v.mental,'crisis'))return false;
    const shape=validatePawnRecordShape(v,world,version,clock);
    if(shape.length){errors.push(...shape.map(e=>`Group pawn ${v.id}: ${e}`));return false;}
    if(!validMentalShape(v.mental,version,clock,world.width,world.height)||validateRecreationRecordShape(v,version,clock).length
      ||v.filthFeet!==undefined&&(!world.filth||!validFilthFeet(v.filthFeet))
      ||v.deniedJoining!==undefined&&(!dense(v.deniedJoining,1,5)||!v.deniedJoining.every((at,i,all)=>int(at,clock+1,clock+6*TICKS_PER_DAY)&&(i===0||at>(all[i-1] as number)))))return false;
    const p=v as unknown as Pawn;
    const assigned=p.apparelPolicyId!==undefined||p.apparelAutomation!==undefined||p.nextApparelCheckAt!==undefined;
    if(assigned&&(!int(p.apparelPolicyId,1,(world.nextApparelPolicyId??0)-1)||!dead&&!world.apparelPolicies?.some(policy=>policy.id===p.apparelPolicyId)
      ||typeof p.apparelAutomation!=='boolean'||!int(p.nextApparelCheckAt,0,clock+APPAREL_POLICY_INTERVAL.max)))return false;
    if(!isColonist(p)||p.health&&(p.health.body!==undefined||p.health.tick!==clock)
      ||(dead?(!p.health?.death||p.health.death.tick!==clock):!!p.health?.death))return false;
    // Passive owners have no spatial vomiting driver. A healthy departure
    // cannot export an episode, and ordinary disease remains a clinical record.
    if(p.health&&(!validAnesthetic(p.health.anesthetic,clock,true,p.id%20)
      ||p.health.foodPoisoning?.vomit!==undefined||p.health.flu?.vomit!==undefined||p.health.immuneDiseases?.malaria?.vomit!==undefined))return false;
    if(p.lastAttack&&(!thing(p.lastAttack.targetId)||p.lastAttack.targetId===p.id)
      ||p.meleeThreat&&(!thing(p.meleeThreat.attackerId)||p.meleeThreat.attackerId===p.id)
      ||p.droppedWeaponId!==undefined&&!thing(p.droppedWeaponId))return false;
    const status=p.health?medicalStatus(p.health,pawnBody(p)):'mobile';
    if(dead?status!=='dead':(status==='downed')!==(p.state==='downed'))return false;
    ownerIds.add(p.id);owners.push({pawn:p,clock});return true;
  }
  function piles(v:unknown,people:ReadonlySet<number>,clock:number,max:number):v is MaterialPile[] {
    if(!dense(v,0,max))return false;
    const counts=new Map<number,number>(),equipment=new Set<number>(),worn=new Map<number,MaterialPile[]>();
    for(const item of v){
      if(!object(item)||!keys(item,PILE_KEYS,PILE_OPTIONAL)||!thing(item.id)||pileIds.has(item.id)
        ||!object(item.owner)||!keys(item.owner,['type','pawnId'])||!people.has(item.owner.pawnId as number)
        ||!oneOf(item.owner.type,['inventory','equipment','apparel']))return false;
      const shape=validatePileRecordShape(item,world,version,clock);
      if(shape.length){errors.push(...shape.map(e=>`Group pile ${item.id}: ${e}`));return false;}
      if(commercialItemMassGrams(item.item as MaterialPile['item'])===undefined)return false;
      const pile=item as unknown as MaterialPile;
      if(item.damage!==undefined&&(pile.apparel||pile.weapon||!int(item.damage,1,pileMaxHp(pile,version)-1)))return false;
      if(isPerishable(pile.item)){
        const rot=item.rot;
        if(!object(rot)||!keys(rot,['progress','atTick'],['rate'])||!int(rot.atTick,0,clock)
          ||typeof rot.progress!=='number'||!Number.isFinite(rot.progress)||rot.progress<0||rot.progress>=ROT_DAYS[pile.item]*TICKS_PER_DAY
          ||rot.rate!==undefined&&(typeof rot.rate!=='number'||!Number.isFinite(rot.rate)||rot.rate<0||rot.rate>=1)
          ||ticksUntilRot(pile,clock)<=0)return false;
      }else if(item.rot!==undefined)return false;
      const owner=item.owner.pawnId as number,count=(counts.get(owner)??0)+1;
      if(item.owner.type==='equipment'){
        if(pile.kind!=='weapon'||equipment.has(owner)||pile.weapon?.forbidden)return false;equipment.add(owner);
      }else if(item.owner.type==='apparel'){
        const previous=worn.get(owner)??[];
        if(pile.kind!=='apparel'||!isApparelItem(pile.item)||pile.apparel?.forbidden||previous.some(p=>conflictsWith(p,pile)))return false;
        previous.push(pile);worn.set(owner,previous);
      }
      if(count>256)return false;counts.set(owner,count);pileIds.add(item.id as number);
    }
    return true;
  }
  if(losses!==undefined){
    if(!dense(losses,0,GROUP_MAX_LOSSES))return ['Invalid group loss array.'];
    for(const loss of losses){
      if(!object(loss)||!keys(loss,['groupId','tile','tick','pawn','items'])||!groupId(loss.groupId)||!place(loss.tile)
        ||!int(loss.tick,planet.adoptedAt,world.tick)||!person(loss.pawn,loss.tick,true))return ['Invalid terminal group person.',...errors];
      const id=(loss.pawn as Pawn).id;
      if(!piles(loss.items,new Set([id]),loss.tick,256))return ['Invalid terminal group possessions.',...errors];
      const existing=retained.get(loss.groupId as number)??[];existing.push(...loss.items);retained.set(loss.groupId as number,existing);
    }
  }
  if(group!==undefined){
    if(!object(group)||!groupId(group.id)||!int(group.startedAt,planet.adoptedAt,world.tick)||!place(group.destination)||!ledger(group.ledger))
      return ['Invalid group identity or ledger.'];
    if(oneOf(group.phase,['gathering','loading','leaving'])){
      if(!keys(group,[...COMMON,...PREPARING])||!ids(group.memberIds)||!point(group.rendezvous)
        ||!dense(group.meeting,(group.memberIds as number[]).length,(group.memberIds as number[]).length)
        ||!dense(group.exits,(group.memberIds as number[]).length,(group.memberIds as number[]).length)
        ||!dense(group.manifest,0,512)||!int(group.cursor,0,group.manifest.length))return ['Invalid group formation shape.'];
      const members=group.memberIds as number[];
      if(members.some(id=>!localById.has(id)))return ['Missing local formation member.'];
      const roster=new Set<number>(),cells=new Set<string>();
      for(const meeting of group.meeting){
        if(!object(meeting)||!keys(meeting,['pawnId','cell'])||!members.includes(meeting.pawnId as number)||roster.has(meeting.pawnId as number)||!point(meeting.cell))return ['Invalid group meeting roster.'];
        const c=meeting.cell as unknown as {x:number;z:number},r=group.rendezvous as unknown as {x:number;z:number},key=`${c.x}:${c.z}`;
        if(cells.has(key)||Math.max(Math.abs(c.x-r.x),Math.abs(c.z-r.z))>2)return ['Invalid group meeting cells.'];
        roster.add(meeting.pawnId as number);cells.add(key);
      }
      roster.clear();cells.clear();
      for(const exit of group.exits){
        if(!object(exit)||!keys(exit,['pawnId','cell'])||!members.includes(exit.pawnId as number)||roster.has(exit.pawnId as number)||!(exit.cell===null||point(exit.cell)))return ['Invalid group exit roster.'];
        roster.add(exit.pawnId as number);
        if(exit.cell!==null){const c=exit.cell as unknown as {x:number;z:number},key=`${c.x}:${c.z}`;
          if(cells.has(key)||!(c.x===0||c.z===0||c.x===world.width-1||c.z===world.height-1))return ['Invalid group exit cells.'];cells.add(key);}
      }
      if(group.phase==='gathering'&&group.cursor!==0||group.phase==='leaving'&&group.cursor!==group.manifest.length)return ['Invalid group contact frontier.'];
      const future=new Map<number,{item:string;quantity:number}>(),carried=new Set<number>(),loaded={food:0,silver:0,cloth:0,'muffalo-wool':0};
      for(let i=0;i<group.manifest.length;i++){
        const line:unknown=group.manifest[i];
        if(!object(line)||!keys(line,['pileId','quantity','item','carrierId'],i<(group.cursor as number)?['carriedPileId']:[])
          ||!thing(line.pileId)||!members.includes(line.carrierId as number)||!oneOf(line.item,['survival-meal','silver','cloth','muffalo-wool'])
          ||!int(line.quantity,1,ITEM_DEFINITIONS[line.item as MaterialPile['item']].stackLimit))return ['Invalid group manifest row.'];
        if(i<(group.cursor as number)){
          if(!thing(line.carriedPileId)||carried.has(line.carriedPileId))return ['Invalid group pickup receipt.'];carried.add(line.carriedPileId);
          const key=line.item==='survival-meal'?'food':line.item as 'silver'|'cloth'|'muffalo-wool';loaded[key]+=line.quantity;
        }else{const old=future.get(line.pileId)??{item:line.item as string,quantity:0};if(old.item!==line.item)return ['Conflicting group source item.'];old.quantity+=line.quantity;future.set(line.pileId,old);}
      }
      for(const [id,line] of future){const pile=world.piles.find(p=>p.id===id);if(!pile||pile.owner.type!=='ground'||pile.item!==line.item||pile.foodPoison||pile.quantity<line.quantity)return ['Invalid future group source ownership.'];}
      const l=group.ledger as unknown as GroupState['ledger'];
      if(!Object.values(loaded).every(Number.isSafeInteger)||l.foodLoaded!==loaded.food||l.silverLoaded!==loaded.silver
        ||l.cargoLoaded.cloth!==loaded.cloth||l.cargoLoaded['muffalo-wool']!==loaded['muffalo-wool']||l.foodConsumed!==0||l.medicineUsed!==0
        ||l.silverPaid!==0||l.silverEarned!==0||l.sold.cloth!==0||l.sold['muffalo-wool']!==0||l.bought.medicine!==0||l.bought.component!==0)return ['Invalid formation contact ledger.'];
    }else if(group.phase==='unloading'){
      if(!keys(group,[...COMMON,'memberIds','pendingPileIds'])||!ids(group.memberIds)||!ids(group.pendingPileIds,1,256*GROUP_MAX_MEMBERS))return ['Invalid group unloading shape.'];
      const members=group.memberIds as number[];
      if(members.some(id=>!localById.has(id))||(group.pendingPileIds as number[]).some(id=>!world.piles.some(p=>p.id===id&&p.owner.type==='inventory'&&members.includes(p.owner.pawnId))))return ['Invalid group unloading possession.'];
    }else if(oneOf(group.phase,['travelling','at-site','awaiting-entry'])){
      if(!keys(group,[...COMMON,...AWAY])||!dense(group.members,1,GROUP_MAX_MEMBERS)||!baseline(group.baseline)||!point(group.entry)
        ||!int(group.departedAt,group.startedAt as number,world.tick)||group.lastPersonalTick!==world.tick||!place(group.tile)
        ||typeof group.paused!=='boolean'||!dense(group.route,1,162))return ['Invalid away group shape or clock.'];
      for(const p of group.members)if(!person(p,world.tick,false))return ['Invalid away group person.',...errors];
      const people=new Set((group.members as Pawn[]).map(p=>p.id));
      if(!piles(group.items,people,world.tick,32768-world.piles.length))return ['Invalid away group possessions.',...errors];
      const segment=group.segment;
      if(segment!==null&&(!object(segment)||!keys(segment,['from','to','totalCore','remainingCore'])||segment.from!==group.tile||!place(segment.to)
        ||!planet.tiles[group.tile as number]!.neighbours.includes(segment.to as number)||!int(segment.totalCore,1,30000)||!int(segment.remainingCore,0,segment.totalCore)))return ['Invalid group captured segment.'];
      const from=object(segment)?segment.to as number:group.tile as number;
      if(!validPlanetRoute(planet,group.route as number[],from,group.destination as number))return ['Invalid persisted group route.'];
      const stop=group.stop;
      if(stop!==null){
        if(!object(stop))return ['Invalid group stop.'];
        if(oneOf(stop.kind,['paused','night','at-site','awaiting-entry'])){if(!keys(stop,['kind']))return ['Invalid group stop shape.'];}
        else if(stop.kind==='incapacity'){if(!keys(stop,['kind','pawnIds'])||!ids(stop.pawnIds)||(stop.pawnIds as number[]).some(id=>!people.has(id)))return ['Invalid group incapacity stop.'];}
        else if(stop.kind==='overload'){if(!keys(stop,['kind','grams','capacityGrams'])||!int(stop.grams)||!int(stop.capacityGrams)||stop.grams<=stop.capacityGrams)return ['Invalid group overload stop.'];}
        else if(stop.kind==='unreachable'){if(!keys(stop,['kind','destination'])||stop.destination!==group.destination)return ['Invalid group blocked destination.'];}
        else return ['Unknown group stop.'];
      }
      if(group.phase!=='travelling'&&(segment!==null||group.tile!==group.destination||group.route.length!==1||!object(stop)||stop.kind!==group.phase)
        ||group.phase==='awaiting-entry'&&group.tile!==planet.homeTile||group.phase==='at-site'&&group.tile===planet.homeTile)return ['Invalid group arrival frontier.'];
      if((losses as unknown[]|undefined)?.some(loss=>object(loss)&&loss.groupId===group.id&&(loss.tick as number)<(group.departedAt as number)))return ['Group loss predates its departure.'];
      const all=[...(group.items as MaterialPile[]),...(retained.get(group.id as number)??[])],b=group.baseline as unknown as Extract<GroupState,{members:Pawn[]}>['baseline'],l=group.ledger as unknown as GroupState['ledger'];
      const amount=(item:string)=>total(all.filter(p=>p.owner.type==='inventory'&&p.item===item).map(p=>p.quantity));
      const equations:[string,bigint][]=[['survival-meal',BigInt(b.food)-BigInt(l.foodConsumed)],['silver',BigInt(b.silver)+BigInt(l.silverEarned)-BigInt(l.silverPaid)],
        ['cloth',BigInt(b.cargo.cloth)-BigInt(l.sold.cloth)],['muffalo-wool',BigInt(b.cargo['muffalo-wool'])-BigInt(l.sold['muffalo-wool'])],
        ['medicine',BigInt(b.medicine)+BigInt(l.bought.medicine)-BigInt(l.medicineUsed)],['component',BigInt(b.component)+BigInt(l.bought.component)]];
      if(equations.some(([item,expected])=>{const actual=amount(item);return expected<0n||expected>BigInt(Number.MAX_SAFE_INTEGER)||actual===undefined||BigInt(actual)!==expected;}))return ['Invalid group baseline conservation.'];
    }else return ['Unknown group phase.'];
  }
  // Contextual memory references use one real capture after all new shapes.
  try{const capture=captureHumanOwners(world),known=new Set(capture.people.keys());
    for(const {pawn,clock} of owners){errors.push(...validateHumanSocial(pawn,version,clock,known,world.pawns));
      if(!validHumanBereavement(pawn.bereavement,pawn,version,clock,capture.people))fail('Invalid group death memory.');
      if(pawn.state!=='dead'&&pawn.droppedWeaponId!==undefined&&(capture.byId.get(pawn.id)?.items.some(i=>i.owner.type==='equipment')
        ||!world.piles.some(i=>i.id===pawn.droppedWeaponId&&i.kind==='weapon'&&i.owner.type==='ground')))fail('Invalid group remembered weapon.');}
  }catch{fail('Invalid group human namespace.');}
  return errors;
}
