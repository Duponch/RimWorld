import {expect,test} from 'vitest';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {applyApparelPolicyUpdate,type ApparelPolicyUpdateCommand} from '../src/sim/apparel-policy-edit.ts';
import {apparelPolicyAllows} from '../src/sim/apparel-policy.ts';
import {addMaterial,reservedSource} from '../src/sim/materials.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {secondaryContext,flushSecondaryContext} from '../src/sim/secondary-site-context.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {SCHEMA_VERSION,type MaterialPile,type World} from '../src/sim/types.ts';
import {equipmentCamp} from './scenarios/equipment.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';
const until=(w:World,done:()=>boolean,max=2500)=>{for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),`tick ${w.tick}`).toBe(true);};
function garment(w:World,item:MaterialPile['item'],owner:MaterialPile['owner'],forced=false){addMaterial(w,'apparel',1,owner,item);const p=w.piles.at(-1)!;if(forced)p.apparel!.forced=true;return p;}
function ready(count=2){const w=equipmentCamp(count);w.piles=[];for(const p of w.pawns){p.hunger=p.rest=p.recreation.level=100;p.apparelAutomation=false;p.nextApparelCheckAt=w.tick+100;}return w;}
function command(w:World,policyId=1):ApparelPolicyUpdateCommand{const p=w.apparelPolicies!.find(p=>p.id===policyId)!;return {type:'apparel-policy-update',policyId,allowedItems:[...p.allowedItems],allowedMaterials:[...p.allowedMaterials],minQuality:p.minQuality,maxQuality:p.maxQuality,minHitPointsPercent:p.minHitPointsPercent,maxHitPointsPercent:p.maxHitPointsPercent};}
function expectedUpdate(w:World,c:ApparelPolicyUpdateCommand){const expected=structuredClone(w);expected.apparelPolicies=expected.apparelPolicies!.map(p=>p.id!==c.policyId?p:{...p,allowedItems:[...c.allowedItems],allowedMaterials:[...c.allowedMaterials],minQuality:c.minQuality,maxQuality:c.maxQuality,minHitPointsPercent:c.minHitPointsPercent,maxHitPointsPercent:c.maxHitPointsPercent});return expected;}

test('applying copied filters changes only the existing shared policy, with no alias, ownership, Auto, due date or forced mutation',()=>{
 const w=ready(),[p,q]=w.pawns;p!.apparelPolicyId=q!.apparelPolicyId=1;const worn=garment(w,'cloth-shirt',{type:'apparel',pawnId:p!.id},true);garment(w,'cloth-tuque',{type:'pawn',pawnId:p!.id});p!.interruptedCargo=true;
 const old=w.apparelPolicies!,previous=old[0]!,other=old[1]!,c={...command(w),allowedItems:['muffalo-wool-tuque'] as const,allowedMaterials:['muffalo-wool'] as const,minQuality:'normal' as const,maxQuality:'excellent' as const,minHitPointsPercent:.51,maxHitPointsPercent:1};
 expect(validateWorld(w)).toEqual([]);const expected=expectedUpdate(w,c),owner=worn.owner,apparel=worn.apparel;
 expect(applyCommand(w,c)).toEqual({ok:true});expect(w).toEqual(expected);expect(w.apparelPolicies![0]).not.toBe(previous);expect(w.apparelPolicies![1]).toBe(other);expect(old[0]).toBe(previous);expect(worn.owner).toBe(owner);expect(worn.apparel).toBe(apparel);
 const tuque=garment(w,'muffalo-wool-tuque',{type:'ground',x:9,z:8});expect(apparelPolicyAllows(w.apparelPolicies![0]!,{id:tuque.id,item:'muffalo-wool-tuque',apparel:tuque.apparel!})).toBe(true);
 tuque.apparel!.quality='poor';expect(apparelPolicyAllows(w.apparelPolicies![0]!,{id:tuque.id,item:'muffalo-wool-tuque',apparel:tuque.apparel!})).toBe(false);
 const applied=command(w),before=JSON.stringify(w),registry=w.apparelPolicies;expect(applyCommand(w,applied)).toEqual({ok:true});expect(JSON.stringify(w)).toBe(before);expect(w.apparelPolicies).toBe(registry);
 const mutable=command(w);expect(applyCommand(w,{...mutable,minHitPointsPercent:.52})).toEqual({ok:true});(mutable.allowedItems as string[]).splice(0);(mutable.allowedMaterials as string[]).splice(0);expect(w.apparelPolicies![0]!.allowedItems).toEqual(['muffalo-wool-tuque']);expect(w.apparelPolicies![0]!.allowedMaterials).toEqual(['muffalo-wool']);
 expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('invalid ids, shape, sparse/duplicate/unknown filters and reversed quality or HP refuse without changing any world field',()=>{
 const w=ready(1),base=command(w),sparse=new Array(1);const missing={...base} as Partial<ApparelPolicyUpdateCommand>;delete missing.maxQuality;
 const invalid:unknown[]=[{...base,policyId:0},{...base,policyId:1.5},{...base,policyId:9999},{...base,label:'Rename'},{...base,allowedItems:['cloth-tuque','cloth-tuque']},{...base,allowedItems:['missing-apparel']},{...base,allowedItems:sparse},{...base,allowedMaterials:['wood']},{...base,allowedMaterials:['cloth','cloth']},{...base,minQuality:'missing'},{...base,minQuality:'legendary',maxQuality:'awful'},{...base,minHitPointsPercent:-.1},{...base,maxHitPointsPercent:1.1},{...base,minHitPointsPercent:.9,maxHitPointsPercent:.5},{...base,minHitPointsPercent:NaN},{...base,maxHitPointsPercent:Infinity},missing];
 const throwing={...base};Object.defineProperty(throwing,'allowedItems',{enumerable:true,get(){throw Error('Malformed command');}});invalid.push(throwing);
 for(const c of invalid){const before=JSON.stringify(w);expect(applyCommand(w,c as ApparelPolicyUpdateCommand).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);}
 const old=structuredClone(w);(old as {schemaVersion:number}).schemaVersion=SCHEMA_VERSION-1;Object.defineProperty(old,'apparelPolicies',{get(){throw Error('Historical registry must remain unread');}});expect(applyApparelPolicyUpdate(old,base).ok).toBe(false);
});

test('editing from the secondary view updates the single campaign registry and same-tick delta while both maps and users stay literal',()=>{
 const {w}=preparedCassandraExpedition(),local=secondaryContext(w)!;for(const map of [w,local])for(const p of map.pawns){p.apparelPolicyId=1;p.apparelAutomation=true;p.nextApparelCheckAt=w.tick+137;}flushSecondaryContext(w);
 expect(applyCommand(w,{type:'secondary-view',site:'secondary'}).ok).toBe(true);const e=new SnapshotEncoder(),d=new SnapshotDecoder(),beforePacket=structuredClone(e.encode(campaignPresentation(w),0,0));expect(d.adopt(beforePacket).status).toBe('applied');
 const c={...command(w),allowedItems:['cloth-tuque'] as const,allowedMaterials:['cloth'] as const},expected=expectedUpdate(w,c),old=local.apparelPolicies;
 expect(applyCommand(w,c)).toEqual({ok:true});expect(w).toEqual(expected);expect(local.apparelPolicies).toBe(w.apparelPolicies);expect(local.apparelPolicies).not.toBe(old);expect(Object.hasOwn(w.secondarySite!.map,'apparelPolicies')).toBe(false);
 const packet=structuredClone(e.encode(campaignPresentation(w),0,0));expect(packet.kind).toBe('delta');const result=d.adopt(packet);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Expected confirmed same-tick edit');expect(result.world.apparelPolicies).toEqual(w.apparelPolicies);
 expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(validateWorld(w)).toEqual([]);
});

test('automatic removal and stored replacement begin only at the saved due check and continue physically through exact saves',()=>{
 const w=ready(1),p=w.pawns[0]!,shirt=garment(w,'cloth-shirt',{type:'apparel',pawnId:p.id}),replacement=garment(w,'light-leather-shirt',{type:'ground',x:p.x+1,z:p.z});
 expect(applyCommand(w,{type:'stockpile',x:p.x+1,z:p.z,enabled:true,filters:{wood:false,food:false,apparel:true}}).ok).toBe(true);p.apparelPolicyId=1;p.apparelAutomation=true;p.nextApparelCheckAt=w.tick+20;
 const c={...command(w),allowedItems:['light-leather-shirt'] as const,allowedMaterials:['light-leather'] as const};expect(applyCommand(w,c)).toEqual({ok:true});const due=p.nextApparelCheckAt,copy=deserializeWorld(serializeWorld(w));
 stepWorld(w,5);stepWorld(copy,5);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(p.nextApparelCheckAt).toBe(due);expect(p.equipmentTask).toBeUndefined();expect(shirt.owner.type).toBe('apparel');
 until(w,()=>p.equipmentTask?.automatic===true&&p.equipmentTask.action==='remove'&&p.equipmentTask.progress>=2);stepWorld(copy,w.tick-copy.tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));const resumed=deserializeWorld(serializeWorld(w));
 until(w,()=>replacement.owner.type==='apparel');stepWorld(resumed,w.tick-resumed.tick);expect(serializeWorld(resumed)).toBe(serializeWorld(w));expect(shirt.owner.type).toBe('ground');expect(replacement.apparel!.forced).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('manual wear already moving survives a contradictory edit and becomes forced at its real completion, with Auto off preserved',()=>{
 const w=ready(1),p=w.pawns[0]!,old=garment(w,'cloth-shirt',{type:'apparel',pawnId:p.id},true),incoming=garment(w,'cloth-parka',{type:'ground',x:p.x+9,z:p.z});
 expect(applyCommand(w,{type:'order-equipment',pawnId:p.id,itemId:incoming.id,action:'wear',queue:false}).ok).toBe(true);until(w,()=>!!p.motion&&p.motion.end>w.tick);const task=p.equipmentTask,edge=p.motion,reservation=reservedSource(w,incoming.id),c={...command(w),allowedItems:[]},expected=expectedUpdate(w,c);
 expect(applyCommand(w,c)).toEqual({ok:true});expect(w).toEqual(expected);expect(p.equipmentTask).toBe(task);expect(p.motion).toBe(edge);expect(reservedSource(w,incoming.id)).toBe(reservation);expect(old.apparel!.forced).toBe(true);expect(p.apparelAutomation).toBe(false);
 const twin=deserializeWorld(serializeWorld(w));until(w,()=>incoming.owner.type==='apparel');stepWorld(twin,w.tick-twin.tick);expect(serializeWorld(twin)).toBe(serializeWorld(w));expect(incoming.apparel!.forced).toBe(true);expect(old.apparel!.forced).toBe(true);expect(p.apparelAutomation).toBe(false);expect(validateWorld(w)).toEqual([]);
});
