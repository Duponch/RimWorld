import {expect,test} from 'vitest';
import {createHash} from 'node:crypto';
import {apparelReserveWorkshop455} from './scenarios/apparel-reserves-v455.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {countedProducts,billWanted} from '../src/sim/cooking-bills.ts';
import {WEAPON_QUALITIES} from '../src/sim/equipment-rules.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';
import type {World,Command} from '../src/sim/types.ts';

const exact455=(w:World)=>{expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w),copy=deserializeWorld(raw);expect(serializeWorld(copy)).toBe(raw);return copy;};
const accept455=(w:World,c:Command)=>expect(applyCommand(w,c)).toMatchObject({ok:true});
const clothBalance455=(w:World)=>w.piles.reduce((n,p)=>n+(p.item==='cloth'?p.quantity:p.unfinished?.recipe==='shirt'?p.unfinished.parts.reduce((a,b)=>a+b,0):0),0)+(w.tailoring?.completed??0)*45+(w.tailoring?.lostCloth??0);

test('a real finite shirt reserve keeps author work through interruption, replaces worn apparel and retains one useful spare',()=>{
 const {w,author,wearer,station,bill,old,preparation}=apparelReserveWorkshop455();
 expect(w.schemaVersion).toBe(278);exact455(w);expect(countedProducts(w,bill)).toBe(0);expect(billWanted(w,bill)).toBe(true);expect(clothBalance455(w)).toBe(180);
 const beforeRaw=serializeWorld(w),encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
 const first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');
 let actualWork=false;
 for(let i=0;i<1800;i++){
  if(author.cooking?.phase==='work'&&(w.piles.find(p=>p.unfinished?.recipe==='shirt')?.unfinished?.progress??0)>20_000){actualWork=true;break;}
  stepWorld(w);
 }
 expect(actualWork).toBe(true);const unfinished=w.piles.find(p=>p.unfinished?.recipe==='shirt')!,originalId=unfinished.id,progress=unfinished.unfinished!.progress;
 expect(unfinished.unfinished!.authorId).toBe(author.id);expect(author.skills.crafting!.xp).toBeGreaterThan(0);expect(clothBalance455(w)).toBe(180);exact455(w);
 accept455(w,{type:'priority',pawnId:author.id,work:'craft',value:0});stepWorld(w,10);
 expect(w.piles.find(p=>p.id===originalId)?.unfinished).toMatchObject({authorId:author.id,progress});expect(author.cooking).toBeNull();
 const interruptedRaw=serializeWorld(w);exact455(w);accept455(w,{type:'priority',pawnId:author.id,work:'craft',value:1});const replay=exact455(w);
 let completed=false;
 for(let i=0;i<4000;i++){
  const usefulWorn=w.piles.find(p=>p.item==='cloth-shirt'&&p.id!==old.id&&p.owner.type==='apparel'&&p.owner.pawnId===wearer.id&&p.apparel&&p.apparel.hitPoints>=51&&WEAPON_QUALITIES.indexOf(p.apparel.quality)>=WEAPON_QUALITIES.indexOf('normal'));
  if(usefulWorn&&countedProducts(w,bill)===1&&!author.cooking){completed=true;break;}
  stepWorld(w);stepWorld(replay);
 }
 expect(completed,`tick${w.tick}: ${JSON.stringify(w.pawns.map(p=>({id:p.id,state:p.state,cooking:p.cooking,equipment:p.equipmentTask})))}`).toBe(true);
 expect(serializeWorld(replay)).toBe(serializeWorld(w));exact455(w);expect(clothBalance455(w)).toBe(180);
 expect(w.piles.find(p=>p.id===old.id)).toBe(old);expect(old.owner.type).toBe('ground');expect(old.apparel!.hitPoints).toBe(50);
 expect(w.piles.some(p=>p.id===originalId&&p.unfinished)).toBe(false);expect(w.tailoring!.completed).toBeGreaterThanOrEqual(2);
 expect(countedProducts(w,bill)).toBe(1);expect(billWanted(w,bill)).toBe(false);expect(countedProducts(w,{...bill,apparelCount:{...bill.apparelCount!,includeEquipped:true}})).toBeGreaterThanOrEqual(2);
 const delta=decoder.adopt(structuredClone(encoder.encode(w,0,0))),full=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder({structureDelta:true}).encode(w,0,0)));
 expect(delta.status).toBe('applied');expect(full.status).toBe('applied');if(delta.status==='applied'&&full.status==='applied')expect(delta.world).toEqual(full.world);
 const folder='artifacts/apparel-reserves-v455';writeTestFileSync(`${folder}/before.json`,beforeRaw);writeTestFileSync(`${folder}/interrupted.json`,interruptedRaw);writeTestFileSync(`${folder}/after.json`,serializeWorld(w));
 writeTestFileSync(`${folder}/manifest.json`,JSON.stringify({version:455,schemaVersion:278,beforePath:testOutputPath(`${folder}/before.json`),beforeSha256:createHash('sha256').update(beforeRaw).digest('hex'),interruptedPath:testOutputPath(`${folder}/interrupted.json`),afterPath:testOutputPath(`${folder}/after.json`),authorId:author.id,wearerId:wearer.id,stationId:station.id,billId:bill.id,oldGarmentId:old.id,recipe:'shirt',initialCloth:180,target:1,fromTick:0,toTick:w.tick,preparation},null,2));
});
