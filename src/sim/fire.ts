import { footprintCells } from './definitions.ts';
import { isRoofed } from './roof-rules.ts';
import { reconcileTemperature } from './temperature.ts';
import { FireContent,targetFlammability,type FireTarget } from './fire-content.ts';
import { burnPawn,burnAnimal } from './fire-damage.ts';
import { damagePile,damageResource,damageStructure } from './thing-damage.ts';
import { structureFlammability } from './thing-damage-rules.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { batteryWattDays,drainBatteryWattDays } from './power-battery.ts';
import { attachFireChance,ensureFireState,fireRandom,fireRound,fireDamage,fireSpreadInterval,firePosition,groundFire,FIRE_COMPLEX_CORE,FIRE_MIN_SIZE,FIRE_MAX_SIZE,FIRE_PULSE_CORE,type FireRecord } from './fire-rules.ts';
import type { Cell,World } from './types.ts';
import type { ThermalLayout } from './thermal-topology.ts';
import { burnFloor } from './flooring.ts';
import { addFilth } from './filth.ts';
export { fireDanger,fireNavigationPenalty,isBurning } from './fire-rules.ts';

const NEAR:readonly (readonly [number,number])[]=[[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]];
// Local 1.6.4871 indexes 10..20: index 9 (+2,0) is intentionally absent.
const FAR:readonly (readonly [number,number])[]=[[-2,0],[0,2],[0,-2],[2,1],[2,-1],[-2,1],[-2,-1],[-1,2],[1,2],[-1,-2],[1,-2]];
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
/** Damage/interruption can drop an existing item without replacing its array. */
function watchOwners(w:World,ids:Set<number>):()=>boolean {
  if(!ids.size)return ()=>false;
  const piles=w.piles.filter(p=>p.owner.type!=='ground'&&p.owner.type!=='job'&&p.owner.type!=='grave'&&ids.has(p.owner.pawnId)).map(item=>({item,owner:item.owner}));
  const packs=w.packed.filter(p=>p.owner.type==='pawn'&&ids.has(p.owner.pawnId)).map(item=>({item,owner:item.owner}));
  const pileCount=w.piles.length,packCount=w.packed.length;
  return ()=>w.piles.length!==pileCount||w.packed.length!==packCount||piles.some(p=>p.item.owner!==p.owner)||packs.some(p=>p.item.owner!==p.owner);
}
function announce(w:World,text:string):void{w.events.push({tick:w.tick,type:'need',message:text});if(w.events.length>80)w.events.splice(0,w.events.length-80);}
function createFire(w:World,c:Cell,size:number,core:number,attached?:{pawnId?:number;animalId?:number}):FireRecord|null {
  if(w.schemaVersion<87||!Number.isFinite(size)||size<(attached?Number.MIN_VALUE:FIRE_MIN_SIZE)||size>FIRE_MAX_SIZE||!Number.isSafeInteger(w.nextId+1))return null;
  const state=ensureFireState(w);if(!Number.isSafeInteger(state.ledger.ignitions+1)||state.items.length>=w.width*w.height+(w.wildlife?.animals.length??0)+w.pawns.length)return null;
  const fire:FireRecord={id:w.nextId++,x:c.x,z:c.z,size,bornCore:core,nextPulseCore:core+15,complexCore:0,spreadCore:Math.floor(fireRandom(state)*fireSpreadInterval(size)),
    ...attached?.pawnId!==undefined?{attachedPawnId:attached.pawnId}:{},...attached?.animalId!==undefined?{attachedAnimalId:attached.animalId}:{}};
  state.items.push(fire);state.ledger.ignitions++;return fire;
}
/** Producer owns the probability draw. Returns false for a nonflammable target. */
export function startFire(w:World,c:Cell,size=.1):boolean {
  if(!new FireContent(w).chance(c))return false;
  const fire=createFire(w,c,size,w.tick*10);if(fire&&w.home?.includes(c.z*w.width+c.x))announce(w,'Incendie dans le foyer.');return !!fire;
}
export function attachPawnFire(w:World,pawnId:number,size=.1):boolean {
  const p=w.pawns.find(p=>p.id===pawnId);if(!p||p.state==='dead'||w.fires?.items.some(f=>f.attachedPawnId===pawnId))return false;
  const fire=createFire(w,p,size,w.tick*10,{pawnId});if(!fire)return false;
  interruptWork(w,p);delete p.draft;delete p.shooting;delete p.melee;delete p.tactics;delete p.flee;
  p.burning={phase:'panic',remainingCore:0};announce(w,`${p.name} est en feu !`);return true;
}
export function attachAnimalFire(w:World,animalId:number,size=.1):boolean {
  const a=w.wildlife?.animals.find(a=>a.id===animalId);if(!a||a.state==='dead'||w.fires?.items.some(f=>f.attachedAnimalId===animalId))return false;
  if(!createFire(w,a,size,w.tick*10,{animalId}))return false;
  delete a.meal;delete a.flee;delete a.threat;delete a.retaliation;delete a.strike;a.path=[];
  a.burning={phase:'panic',remainingCore:0};return true;
}
export function extinguishFire(w:World,id:number,amount=32):boolean {
  const state=w.fires,fire=state?.items.find(f=>f.id===id);if(!state||!fire||!Number.isFinite(amount)||amount<=0)return false;
  fire.size-=amount*.01;if(fire.size<FIRE_MIN_SIZE)removeFire(w,fire,true);return true;
}
function removeFire(w:World,fire:FireRecord,extinguished=false):void {
  const state=w.fires!;state.items=state.items.filter(f=>f!==fire);
  if(extinguished)state.ledger.extinguished++;
  if(fire.attachedPawnId!==undefined){const p=w.pawns.find(p=>p.id===fire.attachedPawnId);if(p){delete p.burning;p.path=[];p.planCooldown=0;if(p.state!=='dead'&&p.state!=='downed')p.state='idle';}}
  if(fire.attachedAnimalId!==undefined){const a=w.wildlife?.animals.find(a=>a.id===fire.attachedAnimalId);if(a){delete a.burning;a.path=[];if(a.state!=='dead'&&a.state!=='downed')a.state=a.motion&&a.motion.end>w.tick?'moving':'idle';}}
  // The captured edge still finishes via motion/moveCooldown. It no longer
  // owns an active walking task after another actor has extinguished the fire.
  for(const p of w.pawns)if(p.firefighting?.fireId===fire.id){delete p.firefighting;p.path=[];p.planCooldown=0;if(p.state!=='dead'&&p.state!=='downed')p.state='idle';}
}
export function reconcileFires(w:World):void {
  if(!w.fires)return;
  for(const f of [...w.fires.items]){
    const pos=firePosition(w,f);if(!pos){removeFire(w,f);continue;}f.x=pos.x;f.z=pos.z;
    const actor=f.attachedPawnId!==undefined?w.pawns.find(p=>p.id===f.attachedPawnId):f.attachedAnimalId!==undefined?w.wildlife?.animals.find(a=>a.id===f.attachedAnimalId):undefined;
    if(actor?.state==='dead'){removeFire(w,f);startFire(w,pos,Math.max(.1,f.size));}
  }
  w.fires.batteryWicks=w.fires.batteryWicks.filter(wick=>w.structures.some(s=>s.id===wick.structureId&&s.kind==='battery'));
  for(const a of w.wildlife?.animals??[])if(a.burning&&!w.fires.items.some(f=>f.attachedAnimalId===a.id))delete a.burning;
  for(const p of w.pawns){if(p.burning&&!w.fires.items.some(f=>f.attachedPawnId===p.id))delete p.burning;if(p.firefighting&&!w.fires.items.some(f=>f.id===p.firefighting!.fireId))delete p.firefighting;}
}
function heat(w:World,c:Cell,amount:number,layout:ThermalLayout):void {
  const id=layout.indices[c.z*w.width+c.x]??-1;if(id<0)return;const room=w.thermal?.regions[id];if(room)room.temperature=Math.min(1000,room.temperature+amount/room.cells.length);
}
function applyDamage(w:World,target:FireTarget,amount:number,core:number):void {
  const cells=target.kind==='structure'?footprintCells(target.value):target.kind==='resource'?[{x:target.value.x,z:target.value.z}]:target.value.owner.type==='ground'?[{x:target.value.owner.x,z:target.value.owner.z}]:[];
  if(target.kind==='resource')damageResource(w,target.value,amount);
  else if(target.kind==='pile')damagePile(w,target.value,amount);
  else {
    const s=target.value,state=ensureFireState(w);damageStructure(w,s,fireRound(amount*Math.max(.05,structureFlammability(s)),()=>fireRandom(state)));
    if(s.kind==='battery'&&w.structures.includes(s)&&!state.batteryWicks.some(w=>w.structureId===s.id)&&fireRandom(state)<.05&&!!s.battery&&batteryWattDays(s.battery)>500)state.batteryWicks.push({structureId:s.id,endCore:core+70+Math.floor(fireRandom(state)*80)});
  }
  const destroyed=target.kind==='resource'?!w.resources.includes(target.value):target.kind==='pile'?!w.piles.includes(target.value):!w.structures.includes(target.value)&&!w.packed.some(p=>p.building===target.value);
  if(destroyed)for(const cell of cells)addFilth(w,cell,'ash');
}
/** Small Flame blast for lightning and the battery's verified burning fuse.
 * No bomb, blast wave, wall-breaking radius expansion or general explosion API. */
export function flameBurst(w:World,center:Cell,radius:number,coreTick=w.tick*10):boolean {
  if(w.schemaVersion<87||!Number.isFinite(radius)||radius<=0||radius>3||!Number.isSafeInteger(coreTick)||coreTick<Math.max(0,w.tick*10-9)||coreTick>w.tick*10)return false;
  const state=ensureFireState(w);let content=new FireContent(w),layout=reconcileTemperature(w);const seen=new Set<string>();
  const cells:Cell[]=[];for(let z=Math.ceil(center.z-radius);z<=Math.floor(center.z+radius);z++)for(let x=Math.ceil(center.x-radius);x<=Math.floor(center.x+radius);x++)if((x-center.x)**2+(z-center.z)**2<=radius*radius&&content.inside({x,z})&&content.line(center,{x,z}))cells.push({x,z});
  for(const c of cells){
    const oldStructures=w.structures,oldPiles=w.piles,oldResources=w.resources;
    const ownershipChanged=watchOwners(w,new Set(w.pawns.filter(p=>same(p,c)).map(p=>p.id)));
    for(const t of content.allTargets(c)){const key=t.kind+t.value.id;if(seen.has(key))continue;seen.add(key);applyDamage(w,t,10,coreTick);}
    for(const p of w.pawns)if(same(p,c)&&!seen.has('pawn'+p.id)){seen.add('pawn'+p.id);const penetrated=burnPawn(w,p,10);if(penetrated&&p.state!=='dead'&&fireRandom(state)<attachFireChance(.7,60))attachPawnFire(w,p.id,.15+fireRandom(state)*.1);}
    for(const a of w.wildlife?.animals??[])if(same(a,c)&&!seen.has('animal'+a.id)){seen.add('animal'+a.id);burnAnimal(w,a,10);if(a.state!=='dead'&&fireRandom(state)<attachFireChance(.7,60))attachAnimalFire(w,a.id,.15+fireRandom(state)*.1);}
    if(w.structures!==oldStructures||w.piles!==oldPiles||w.resources!==oldResources||ownershipChanged())content=new FireContent(w);
    if(w.structures!==oldStructures)layout=reconcileTemperature(w);heat(w,c,15,layout);
    if(fireRandom(state)<content.chance(c))createFire(w,c,.2+fireRandom(state)*.4,coreTick);
  }return true;
}
export const igniteLightning=(w:World,c:Cell,coreTick=w.tick*10):boolean=>flameBurst(w,c,1.9,coreTick);

/** Called once before actors, after the climate/room update. */
export function advanceFires(w:World,weather:{rainRate:number},initialLayout:ThermalLayout):void {
  if(w.schemaVersion<87)return;
  const now=w.tick*10;let layout=initialLayout,content:FireContent|undefined;
  const view=()=>content??=new FireContent(w);
  // Sparse hot-room candidates, sampled by a deterministic full-period permutation.
  // The rate matches Core's ceil(area*.0006) cells/Core; cold maps allocate nothing.
  if(w.thermal?.regions.some(r=>r.temperature>240)){
    const area=w.width*w.height,checks=Math.ceil(area*.0006);let stride=1+((w.seed^0x63e192a7)>>>0)%(area-1);while(stride>1&&gcd(stride,area)!==1)stride--;
    for(let n=0;n<checks*10;n++){const i=((w.tick*10*checks+n)*stride+(w.seed>>>0))%area,id=layout.indices[i]??-1,temp=id<0?0:w.thermal.regions[id]?.temperature??0;if(temp<=240)continue;
      const state=ensureFireState(w);if(fireRandom(state)<Math.min(1,(temp-240)/760)*.7){const c={x:i%w.width,z:Math.floor(i/w.width)};if(fireRandom(state)<view().chance(c))createFire(w,c,.1,now);}
    }
  }
  const state=w.fires;if(!state)return;
  if(now<state.clockCore)throw new Error('Fire clock moved backwards');if(now===state.clockCore)return;
  reconcileFires(w);
  for(const ember of [...state.embers])if(ember.impactCore<=now){if(view().line(ember.from,ember.to)&&view().chance(ember.to)>0)createFire(w,ember.to,.1,ember.impactCore);state.embers=state.embers.filter(e=>e!==ember);}
  for(const f of [...state.items])while(state.items.includes(f)&&f.nextPulseCore<=now){
    const core=f.nextPulseCore;f.nextPulseCore+=FIRE_PULSE_CORE;f.complexCore+=FIRE_PULSE_CORE;if(f.size>1)f.spreadCore+=FIRE_PULSE_CORE;
    const pos=firePosition(w,f);if(!pos){removeFire(w,f);break;}f.x=pos.x;f.z=pos.z;
    if(groundFire(f)&&core-f.bornCore>=7500&&view().floorFuel(pos)>0)burnFloor(w,pos);
    if(f.size>1&&f.spreadCore>=fireSpreadInterval(f.size)){
      f.spreadCore=0;const near=fireRandom(state)<.8,offsets=near?NEAR:FAR,[dx,dz]=offsets[Math.floor(fireRandom(state)*offsets.length)]!,to={x:pos.x+dx,z:pos.z+dz};
      if(view().inside(to)&&fireRandom(state)<view().chance(to)){
        if(near)createFire(w,to,.1,core);else if(view().line(pos,to)&&Number.isSafeInteger(w.nextId+1))state.embers.push({id:w.nextId++,from:{x:pos.x,z:pos.z},to,impactCore:core+Math.ceil(Math.hypot(dx,dz)/1.5*60)});
      }
    }
    if(f.complexCore<FIRE_COMPLEX_CORE)continue;f.complexCore-=FIRE_COMPLEX_CORE;
    if(w.tiles[pos.z*w.width+pos.x]?.terrain==='water'){removeFire(w,f,true);break;}
    const peopleHere=w.pawns.filter(p=>same(p,pos)&&p.state!=='dead'),animalsHere=w.wildlife?.animals.filter(a=>same(a,pos)&&a.state!=='dead')??[];
    const ownershipChanged=watchOwners(w,new Set(peopleHere.map(p=>p.id)));
    const targets=groundFire(f)?view().allTargets(pos).filter(t=>targetFlammability(t)>=.01):[],fuel=groundFire(f)?Math.max(view().fuel(pos),peopleHere.length||animalsHere.length?.7:0):.7;
    if(fuel<.01){removeFire(w,f);break;}
    if(groundFire(f)&&f.size>.4)for(const p of w.pawns)if(same(p,pos)&&p.state!=='dead'&&fireRandom(state)<attachFireChance(.7))attachPawnFire(w,p.id,f.size*.2);
    if(groundFire(f)&&f.size>.4)for(const a of animalsHere)if(fireRandom(state)<attachFireChance(.7))attachAnimalFire(w,a.id,f.size*.2);
    const oldStructures=w.structures,oldPiles=w.piles,oldResources=w.resources;
    const amount=fireDamage(f.size,()=>fireRandom(state));
    if(f.attachedPawnId!==undefined){const p=w.pawns.find(p=>p.id===f.attachedPawnId);if(p)burnPawn(w,p,amount);}
    else if(f.attachedAnimalId!==undefined){const a=w.wildlife?.animals.find(a=>a.id===f.attachedAnimalId);if(a)burnAnimal(w,a,amount);}
    else {
      const people=peopleHere,animals=animalsHere,count=targets.length+people.length+animals.length;
      if(count){const roll=Math.floor(fireRandom(state)*count);if(roll<targets.length)applyDamage(w,targets[roll]!,amount,core);else if(f.size>=.4){if(roll<targets.length+people.length)burnPawn(w,people[roll-targets.length]!,amount);else {const a=animals[roll-targets.length-people.length]!;burnAnimal(w,a,amount);}}}
    }
    // A target removal may change supports/regions in this very batch.
    if(w.structures!==oldStructures||w.piles!==oldPiles||w.resources!==oldResources||ownershipChanged())content=undefined;
    if(w.structures!==oldStructures)layout=reconcileTemperature(w);
    const door=w.structures.some(s=>s.kind==='door'&&same(s,pos));heat(w,pos,f.size*160*(door?.15:1),layout);
    f.size=Math.min(FIRE_MAX_SIZE,f.size+.00055*fuel*150);
    if(weather.rainRate>.01&&(!isRoofed(w,pos.z*w.width+pos.x)||w.structures.some(s=>(s.kind==='wall'||s.kind==='door')&&same(s,pos)))){fireRandom(state);extinguishFire(w,f.id,10);}
  }
  for(const wick of [...state.batteryWicks])if(wick.endCore<=now){
    state.batteryWicks=state.batteryWicks.filter(w=>w!==wick);const s=w.structures.find(s=>s.id===wick.structureId);if(!s?.battery)continue;
    const cells=footprintCells(s),c=cells[Math.floor(fireRandom(state)*cells.length)]!,radius=(.5+fireRandom(state)*.5)*3;flameBurst(w,c,radius);
    if(w.structures.includes(s)){const lost=drainBatteryWattDays(s.battery,400)*120000;state.ledger.batteryEnergyLost+=lost;}
  }
  state.clockCore=now;reconcileFires(w);
}
function gcd(a:number,b:number):number{while(b){const r=a%b;a=b;b=r;}return a;}
