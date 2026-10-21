import {PROSTHETIC_REQUIREMENTS_273,isProstheticRecipe273,PROSTHETIC_PRODUCTION_WORK_TICKS_273} from './prosthetic-content-273.ts';
import type {World} from './types.ts';
const materials=['steel','component'] as const;
type ProstheticMaterial273=typeof materials[number];
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const closed=(value:unknown,keys:readonly string[]):value is Record<string,unknown>=>record(value)&&Reflect.ownKeys(value).every(k=>typeof k==='string'&&keys.includes(k)&&Object.getOwnPropertyDescriptor(value,k)?.enumerable&&Object.hasOwn(Object.getOwnPropertyDescriptor(value,k)!,'value'));
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER):boolean=>Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;

export function validProstheticWorkShape273(p:Record<string,unknown>,version:number):boolean {
  if(p.item!=='unfinished-prosthetic')return !Object.hasOwn(p,'prostheticWork273');
  const work=p.prostheticWork273,owner=p.owner;
  if(['unfinished','gunWork','flakWork','componentWork','artWork','smithingWork','apparel','weapon','egg','humanCorpse','mechCorpse'].some(k=>Object.hasOwn(p,k)))return false;
  if(version!==273||p.kind!=='unfinished'||p.quantity!==1||!record(owner)||!['ground','pawn','inventory'].includes(String(owner.type))||!closed(work,['recipe','authorId','progress','parts','billId'])||!['recipe','authorId','progress','parts'].every(k=>Object.hasOwn(work,k))||!isProstheticRecipe273(work.recipe))return false;
  const recipe=work.recipe,required=PROSTHETIC_REQUIREMENTS_273;
  if(!integer(work.authorId,1)||!integer(work.progress,0,PROSTHETIC_PRODUCTION_WORK_TICKS_273*10000)||Object.hasOwn(work,'billId')&&!integer(work.billId,1)||!Array.isArray(work.parts)||work.parts.length<2||work.parts.length>44||Object.keys(work.parts).length!==work.parts.length)return false;
  const totals={steel:0,component:0};
  for(const part of work.parts){
    if(!closed(part,['item','quantity'])||Reflect.ownKeys(part).length!==2||!materials.includes(part.item as ProstheticMaterial273)||!integer(part.quantity,1,40))return false;
    totals[part.item as ProstheticMaterial273]+=part.quantity as number;
  }
  return totals.steel===required.steel&&totals.component===required.component;
}

export function validateProstheticWorks273(world:World,version:number=world.schemaVersion):string[] {
  const errors:string[]=[],bound=new Set<number>();
  for(const pile of world.piles){
    if(pile.item!=='unfinished-prosthetic'&&!Object.hasOwn(pile,'prostheticWork273'))continue;
    if(!validProstheticWorkShape273(pile as unknown as Record<string,unknown>,version)){errors.push('Invalid unfinished prosthetic.');continue;}
    const work=pile.prostheticWork273!;
    if(work.authorId>=world.nextId)errors.push('Invalid unfinished prosthetic author identity.');
    if(work.billId!==undefined){
      if(bound.has(work.billId)||![...world.structures,...world.packed.map(p=>p.building)].some(s=>s.bills?.some(b=>b.id===work.billId&&b.recipe===work.recipe)))errors.push('Invalid unfinished prosthetic bound bill.');
      bound.add(work.billId);
    }
  }
  return errors;
}
