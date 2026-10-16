import {expect,test} from 'vitest';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {applyApparelPolicyName,normalizeApparelPolicyName,type ApparelPolicyNameCommand} from '../src/sim/apparel-policy-edit.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {secondaryContext,flushSecondaryContext} from '../src/sim/secondary-site-context.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {reservedSource} from '../src/sim/materials.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {apparelPolicyWorkshopV392} from './scenarios/apparel-policy-v392.ts';
import {preparedV377LocalCheckpoint} from './scenarios/secondary-site-v377.ts';
const until=(w:World,done:()=>boolean,max=1500)=>{for(let n=0;n<max&&!done();n++)stepWorld(w);expect(done(),String(w.tick)).toBe(true);};
const command=(policyId=1,label='Hiver'):ApparelPolicyNameCommand=>({type:'apparel-policy-copy',policyId,label});
const expectedCopy=(w:World,label:string)=>{const next=structuredClone(w),source=next.apparelPolicies![0]!;next.apparelPolicies!.push({...source,id:next.nextApparelPolicyId!,label,allowedItems:[...source.allowedItems],allowedMaterials:[...source.allowedMaterials]});next.nextApparelPolicyId=next.nextApparelPolicyId!+1;return next;};

test('copy adds only a deep copy of confirmed filters, keeps the first/default and every person, possession, Auto/forced and due check',()=>{
 const {world:w}=apparelPolicyWorkshopV392(),registry=w.apparelPolicies!,source=registry[0]!,other=registry[1]!,id=w.nextApparelPolicyId!,expected=expectedCopy(w,'Hiver');expect(validateWorld(w)).toEqual([]);
 expect(applyCommand(w,command(1,'  Hiver  '))).toEqual({ok:true});expect(w).toEqual(expected);expect(w.apparelPolicies![0]).toBe(source);expect(w.apparelPolicies![1]).toBe(other);expect(w.apparelPolicies).not.toBe(registry);
 const copy=w.apparelPolicies!.at(-1)!;expect(copy.id).toBe(id);expect(copy.allowedItems).not.toBe(source.allowedItems);expect(copy.allowedMaterials).not.toBe(source.allowedMaterials);expect(Object.keys(copy).sort()).toEqual(Object.keys(source).sort());
 expect(applyCommand(w,{type:'apparel-policy-update',policyId:id,allowedItems:['muffalo-wool-tuque'],allowedMaterials:['muffalo-wool'],minQuality:'normal',maxQuality:'excellent',minHitPointsPercent:.51,maxHitPointsPercent:1})).toEqual({ok:true});
 expect(w.apparelPolicies![0]).toBe(source);expect(source.allowedItems).toEqual(['cloth-shirt']);expect(source.allowedMaterials).toEqual(['cloth']);expect(w.pawns.every(p=>p.apparelPolicyId!==id)).toBe(true);
 expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(w.schemaVersion).toBe(SCHEMA_VERSION);
});

test('rename retains same ID and filter arrays, permits duplicate names, and never normalizes another historical label',()=>{
 const {world:w}=apparelPolicyWorkshopV392(),old=w.apparelPolicies![0]!,other={...w.apparelPolicies![1]!,label:'  Ancien\t<label>  '};w.apparelPolicies![1]=other;expect(validateWorld(w)).toEqual([]);
 const expected=structuredClone(w);expected.apparelPolicies![0]={...expected.apparelPolicies![0]!,label:'Hiver'};
 expect(applyCommand(w,{type:'apparel-policy-rename',policyId:1,label:' Hiver '})).toEqual({ok:true});expect(w).toEqual(expected);expect(w.apparelPolicies![0]!.allowedItems).toBe(old.allowedItems);expect(w.apparelPolicies![0]!.allowedMaterials).toBe(old.allowedMaterials);expect(w.apparelPolicies![1]).toBe(other);
 const registry=w.apparelPolicies;expect(applyCommand(w,{type:'apparel-policy-rename',policyId:1,label:'Hiver'})).toEqual({ok:true});expect(w.apparelPolicies).toBe(registry);
 expect(applyCommand(w,command(1,'Hiver'))).toEqual({ok:true});expect(w.apparelPolicies!.filter(p=>p.label==='Hiver')).toHaveLength(2);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('new names and command shapes refuse atomically, including getters/symbols/missing source; historical simulation is not upgraded',()=>{
 const {world:w}=apparelPolicyWorkshopV392(),base=command(),missing={...base} as Partial<ApparelPolicyNameCommand>;delete missing.label;let reads=0;const getter=Object.defineProperty({...base},'label',{enumerable:true,get(){reads++;return 'Hiver';}});
 const invalid:unknown[]=[{...base,policyId:0},{...base,policyId:9999},{...base,policyId:1.5},{...base,label:''},{...base,label:'   '},{...base,label:'a'.repeat(61)},{...base,label:'Hiver\n'},{...base,label:'\tHiver'},{...base,label:'a\u0000b'},{...base,label:'a\u007fb'},{...base,label:3},{...base,allowedItems:[]},{...base,[Symbol()]:true},missing,getter];
 for(const type of ['apparel-policy-copy','apparel-policy-rename'] as const)for(const value of invalid){const c=Object.create(Object.prototype,Object.getOwnPropertyDescriptors(value as object));c.type=type;const before=serializeWorld(w);expect(applyCommand(w,c as ApparelPolicyNameCommand).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}expect(reads).toBe(0);
 expect(normalizeApparelPolicyName('a'.repeat(60))).toBe('a'.repeat(60));expect(normalizeApparelPolicyName(' <Hiver & laine> ')).toBe('<Hiver & laine>');
 const old=structuredClone(w);(old as {schemaVersion:number}).schemaVersion=SCHEMA_VERSION-1;Object.defineProperty(old,'apparelPolicies',{get(){throw Error('Historical registry must remain unread');}});expect(applyApparelPolicyName(old,base).ok).toBe(false);
});

test('full registry and exhausted/reused allocator refuse without changes; rename still works at capacity and at last safe next ID',()=>{
 const {world:w}=apparelPolicyWorkshopV392(),source=w.apparelPolicies![0]!;w.apparelPolicies=Array.from({length:32},(_,i)=>({...source,id:i+1,label:'Tenue '+(i+1),allowedItems:[...source.allowedItems],allowedMaterials:[...source.allowedMaterials]}));w.nextApparelPolicyId=33;expect(validateWorld(w)).toEqual([]);
 let before=serializeWorld(w);expect(applyCommand(w,command()).ok).toBe(false);expect(serializeWorld(w)).toBe(before);expect(applyCommand(w,{type:'apparel-policy-rename',policyId:1,label:'Pleine'}).ok).toBe(true);
 w.apparelPolicies=w.apparelPolicies.slice(0,2);w.nextApparelPolicyId=Number.MAX_SAFE_INTEGER;expect(validateWorld(w)).toEqual([]);before=serializeWorld(w);expect(applyCommand(w,command()).ok).toBe(false);expect(serializeWorld(w)).toBe(before);expect(applyCommand(w,{type:'apparel-policy-rename',policyId:1,label:'Dernière'}).ok).toBe(true);
 w.nextApparelPolicyId=2;before=JSON.stringify(w);expect(applyCommand(w,command()).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('second-site commands share one campaign registry and same-tick full/delta confirms copy and rename with literal owners on both maps',()=>{
 const w=preparedV377LocalCheckpoint().initial,local=secondaryContext(w)!;flushSecondaryContext(w);expect(applyCommand(w,{type:'secondary-view',site:'secondary'}).ok).toBe(true);
 const before=structuredClone(w),id=w.nextApparelPolicyId!,source=w.apparelPolicies![0]!,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(encoder.encode(campaignPresentation(w),0,0))).status).toBe('applied');
 expect(applyCommand(w,command(source.id,'Voyage'))).toEqual({ok:true});expect(local.apparelPolicies).toBe(w.apparelPolicies);expect(Object.hasOwn(w.secondarySite!.map,'apparelPolicies')).toBe(false);
 const copy=structuredClone(encoder.encode(campaignPresentation(w),0,0)),adopted=decoder.adopt(copy);expect(copy.kind).toBe('delta');expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Expected confirmed copy');expect(adopted.world.apparelPolicies!.find(p=>p.id===id)?.label).toBe('Voyage');
 expect(applyCommand(local,{type:'apparel-policy-rename',policyId:id,label:'Voyage laine'})).toEqual({ok:true});expect(w.nextApparelPolicyId).toBe(id+1);const renamed=decoder.adopt(structuredClone(encoder.encode(campaignPresentation(w),0,0)));expect(renamed.status).toBe('applied');if(renamed.status!=='applied')throw Error('Expected confirmed rename');expect(renamed.world.apparelPolicies!.find(p=>p.id===id)?.label).toBe('Voyage laine');
 const expected=structuredClone(before);expected.apparelPolicies=w.apparelPolicies;expected.nextApparelPolicyId=id+1;expect(w).toEqual(expected);expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(validateWorld(w)).toEqual([]);
});

test('copy/rename during a real manual clothing edge preserves task, reservation, cargo, Auto and physical continuation after save',()=>{
 const f=apparelPolicyWorkshopV392(),w=f.world,p=w.pawns.find(p=>p.id===f.pawnId)!,incoming=w.piles.find(v=>v.id===f.tuqueId)!;
 expect(applyCommand(w,{type:'order-equipment',pawnId:p.id,itemId:incoming.id,action:'wear',queue:false}).ok).toBe(true);until(w,()=>!!p.motion&&p.motion.end>w.tick);const task=p.equipmentTask,edge=p.motion,reservation=reservedSource(w,incoming.id),expected=expectedCopy(w,'Copie active'),id=w.nextApparelPolicyId!;
 expect(applyCommand(w,command(1,'Copie active'))).toEqual({ok:true});expect(w).toEqual(expected);const renamed=structuredClone(w);renamed.apparelPolicies=renamed.apparelPolicies!.map(v=>v.id===id?{...v,label:'Renommée'}:v);expect(applyCommand(w,{type:'apparel-policy-rename',policyId:id,label:'Renommée'})).toEqual({ok:true});expect(w).toEqual(renamed);expect(p.equipmentTask).toBe(task);expect(p.motion).toBe(edge);expect(reservedSource(w,incoming.id)).toBe(reservation);
 const twin=deserializeWorld(serializeWorld(w)),tick=w.tick;until(w,()=>incoming.owner.type==='apparel');stepWorld(twin,w.tick-tick);expect(serializeWorld(twin)).toBe(serializeWorld(w));expect(incoming.apparel!.forced).toBe(true);expect(validateWorld(w)).toEqual([]);
});
