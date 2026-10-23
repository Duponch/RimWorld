import {captureBombCells} from './bomb-cells.ts';
import {blockedCells} from './pathfinding.ts';
import {isPassageDoor} from './door-rules.ts';
import {firePosition} from './fire-rules.ts';
import {extinguishFire} from './fire.ts';
import {damageStructure} from './thing-damage.ts';
import {structureMaxHp} from './thing-damage-rules.ts';
import {captureWorldProjectileTargets} from './projectile-world.ts';
import {SHOT_LAYER,structureShotLayer} from './combat-content.ts';
import {addFilth} from './filth.ts';
import {applyFirefoamActor290,canApplyFirefoamActor290,firefoamExposedActor290} from './firefoam-actor-290.ts';
import {firefoamResearchUnlocked290} from './firefoam-content-290.ts';
import {firefoamCellCore290,firefoamData290,type FirefoamWave290,type FirefoamWorld290} from './firefoam-state-290.ts';
import type {LivingTargetKey} from './combat-target.ts';
import type {World,Structure,CommandResult} from './types.ts';

const state=(w:World):FirefoamWorld290=>w.firefoam290??={rng:((w.seed^0x46f09d31)>>>0)||1,waves:[]};
function draw(s:FirefoamWorld290){let n=s.rng;n^=n<<13;n^=n>>>17;n^=n<<5;s.rng=n>>>0;return s.rng/4294967296;}
export function initializeFirefoamPopper290(w:World,s:Structure):void {
 if((Number(w.schemaVersion)!==290&&Number(w.schemaVersion)!==291)||s.kind!=='firefoam-popper')return;
 s.firefoam290={autoRebuild:firefoamResearchUnlocked290(w)&&s.factionId===undefined&&!!w.home?.includes(s.z*w.width+s.x)};
}
export function startFirefoamWick290(w:World,s:Structure,core=w.tick*10):boolean {
 if((Number(w.schemaVersion)!==290&&Number(w.schemaVersion)!==291)||s.kind!=='firefoam-popper'||!s.firefoam290||!w.structures.includes(s)||!Number.isSafeInteger(core)||core<Math.max(0,(w.tick-1)*10)||core>w.tick*10||!Number.isSafeInteger(core+150))return false;
 if(s.firefoam290.wick)return true;
 s.firefoam290.wick={startedAtCore:core,endCore:core+140+Math.floor(draw(state(w))*11)};return true;
}
export function applyFirefoamAutoRebuild290(w:World,c:unknown):CommandResult {
 if((Number(w.schemaVersion)!==290&&Number(w.schemaVersion)!==291)||!firefoamData290(c,['type','structureId','on'])||c.type!=='firefoam-auto-rebuild'||!Number.isSafeInteger(c.structureId)||typeof c.on!=='boolean')return {ok:false,reason:'Réglage anti-incendie invalide.'};
 const s=w.structures.find(s=>s.id===c.structureId&&s.kind==='firefoam-popper');
 if(!s?.firefoam290||s.factionId!==undefined||!firefoamResearchUnlocked290(w))return {ok:false,reason:'Appareil colonial installé et recherche Mousse anti-incendie requis.'};
 s.firefoam290.autoRebuild=c.on;return {ok:true,affected:1};
}
/** Broad-phase first; one shared physical component grid only when a real
 * nearby Fire exists. Detours are allowed outside the small detection disk. */
export function detectFirefoam290(w:World,core:number):void {
 if((Number(w.schemaVersion)!==290&&Number(w.schemaVersion)!==291)||core%250||!w.fires?.items.length)return;
 const poppers=w.structures.filter(s=>s.kind==='firefoam-popper'&&s.firefoam290&&!s.firefoam290.wick);
 if(!poppers.length)return;
 const byCell=new Map<number,number[]>();
 for(const f of w.fires.items){const p=firePosition(w,f);if(!p)continue;const i=p.z*w.width+p.x,list=byCell.get(i);if(list)list.push(f.id);else byCell.set(i,[f.id]);}
 const candidates=poppers.map(s=>{const cells:number[]=[];for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)if(dx*dx+dz*dz<9){const x=s.x+dx,z=s.z+dz;if(x>=0&&z>=0&&x<w.width&&z<w.height&&byCell.has(z*w.width+x))cells.push(z*w.width+x);}return {s,cells};}).filter(r=>r.cells.length);
 if(!candidates.length)return;
 const mask=blockedCells(w,true);for(const door of w.structures)if(isPassageDoor(door.kind)&&!door.door?.open)mask[door.z*w.width+door.x]=1;
 const labels=new Int32Array(mask.length);let component=0;
 const label=(first:number)=>{if(mask[first])return -1;if(labels[first])return labels[first]!;const value=++component,queue=[first];labels[first]=value;
  for(let head=0;head<queue.length;head++){const i=queue[head]!,x=i%w.width,z=Math.floor(i/w.width);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dz)continue;const nx=x+dx,nz=z+dz,j=nz*w.width+nx;if(nx<0||nz<0||nx>=w.width||nz>=w.height||mask[j]||labels[j]||dx&&dz&&(mask[z*w.width+nx]||mask[nz*w.width+x]))continue;
   labels[j]=value;queue.push(j);
  }}return value;};
 for(const {s,cells}of candidates.sort((a,b)=>a.s.id-b.s.id)){const own=label(s.z*w.width+s.x);if(own>0&&cells.some(i=>!mask[i]&&label(i)===own))startFirefoamWick290(w,s,core);}
}
export function advanceFirefoamWick290(w:World,s:Structure,core:number):boolean {
 const wick=s.firefoam290?.wick;if((Number(w.schemaVersion)!==290&&Number(w.schemaVersion)!==291)||s.kind!=='firefoam-popper'||!wick||wick.endCore>core||!w.structures.includes(s))return false;
 if(!damageStructure(w,s,structureMaxHp(s)-(s.damage??0),'bomb',w.rng,{core,rawAmount:0,firefoamDetonate290:true}))throw new RangeError('Cannot commit admitted firefoam detonation');return true;
}
/** Called after actual source retirement with the ID already reserved by its
 * transaction. Captured LOS is never recomputed from later changes. */
export function registerFirefoamWave290(w:World,s:Structure,id:number,core:number):void {
 if(w.structures.includes(s))throw new Error('Firefoam source is still installed');
 const center={x:s.x,z:s.z},primary=captureBombCells(w,center,9.9,true),all=new Set(primary),original=new Set(primary),mask=blockedCells(w,true);
 for(const i of primary)if(!mask[i]){const x=i%w.width,z=Math.floor(i/w.width);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(dx||dz){const nx=x+dx,nz=z+dz;if(nx>=0&&nz>=0&&nx<w.width&&nz<w.height)all.add(nz*w.width+nx);}}
 const date=(i:number)=>Math.floor(Math.hypot(i%w.width-center.x,Math.floor(i/w.width)-center.z)*1.5);
 const cells=[...all].sort((a,b)=>date(a)-date(b)||a-b);
 state(w).waves.push({id,sourceId:s.id,center,startedAtCore:core,advancedAtCore:core,cells,damageOnlyCells:cells.filter(i=>!original.has(i)),nextCell:0,affectedActorKeys:[]});
 w.firefoam290!.waves.sort((a,b)=>a.id-b.id);
}
/** Deliberate local phase: helpful impact/clinical admission after this tick's
 * ordinary clinical intervals. Native substep timing differs by at most9Core. */
export function advanceFirefoamWaves290(w:World):void {
 if((Number(w.schemaVersion)!==290&&Number(w.schemaVersion)!==291)||!w.firefoam290?.waves.length)return;
 const end=w.tick*10,start=end-10;
 w.firefoam290.waves=w.firefoam290.waves.filter(a=>a.nextCell<a.cells.length||a.advancedAtCore>start);
 if(!w.firefoam290.waves.length)return;
 const scene=captureWorldProjectileTargets(w).scene(new Set(),1),mask=blockedCells(w,true);
 const altitude=(key:string)=>key.startsWith('structure:')?structureShotLayer(w.structures.find(s=>s.id===Number(key.slice(10)))!.kind):key.startsWith('pawn:')||key.startsWith('animal:')||key.startsWith('mech:')?SHOT_LAYER.pawn:SHOT_LAYER.item;
 for(const wave of w.firefoam290.waves){
  if(wave.nextCell===wave.cells.length)continue;
  const affected=new Set(wave.affectedActorKeys),damageOnly=new Set(wave.damageOnlyCells);
  while(wave.nextCell<wave.cells.length&&firefoamCellCore290(w.width,wave,wave.cells[wave.nextCell]!)<=end){
   const i=wave.cells[wave.nextCell]!,cell={x:i%w.width,z:Math.floor(i/w.width)},targets=[...scene.at(cell)],full=targets.reduce((h,t)=>t.fill>.99?Math.max(h,altitude(t.key)):h,-Infinity);
   const actorKeys=new Set(targets.filter(t=>/^(pawn|animal|mech):/.test(t.key)&&altitude(t.key)>=full&&firefoamExposedActor290(w,t.key as LivingTargetKey)).map(t=>t.key as LivingTargetKey));
   const actors=[...actorKeys].filter(key=>!affected.has(key));
   if(actors.some(key=>!canApplyFirefoamActor290(w,key)))throw new RangeError('Invalid actual firefoam recipient');
   for(const key of actors){if(!applyFirefoamActor290(w,key))throw new RangeError('Preflighted firefoam recipient changed');affected.add(key);}
   for(const fire of [...w.fires?.items??[]]){const p=firePosition(w,fire);if(p?.x!==cell.x||p.z!==cell.z)continue;
    if(fire.attachedPawnId!==undefined&&!actorKeys.has(`pawn:${fire.attachedPawnId}`)||fire.attachedAnimalId!==undefined&&!actorKeys.has(`animal:${fire.attachedAnimalId}`))continue;
    extinguishFire(w,fire.id,999999);
   }
   if(!damageOnly.has(i)&&!mask[i])addFilth(w,cell,'firefoam');
   wave.nextCell++;
  }
  wave.advancedAtCore=end;wave.affectedActorKeys=[...affected].sort();
 }
}
