import {GROUP_FREIGHT_SCHEMA,validGroupFreight} from './group-freight.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function field(v:object,key:string):{present:boolean;valid:boolean;value?:unknown} {
  const d=Object.getOwnPropertyDescriptor(v,key);
  return d?{present:true,valid:Object.hasOwn(d,'value')&&d.enumerable===true,value:d.value}:{present:false,valid:true};
}
/** New permission never follows from preexisting wood inventory or a receipt. */
export function validGroupFreightShape(group:unknown,version:number):boolean {
  try{
    if(!object(group))return true;
    const f=field(group,'freight'),b=field(group,'baseline'),m=field(group,'manifest');
    if(!f.valid||!b.valid||!m.valid)return false;
    if(f.present)return version>=GROUP_FREIGHT_SCHEMA&&validGroupFreight(f.value);
    if(object(b.value)&&Object.hasOwn(b.value,'freight'))return false;
    return !Array.isArray(m.value)||!m.value.some(row=>object(row)&&(row.item==='wood'||row.item==='steel'));
  }catch{return false;}
}
/** Caller supplies its actual World authority. RAW never unwraps a decoy
 * world field; Decoder supplies packet.world and its own sparse upserts.
 * No terrain/resource or foreign-person inventory traversal is performed. */
export function validGroupFreightHistoricalTransport(value:unknown,version:number,upsertedPiles?:unknown):boolean {
  try{
    if(version>=GROUP_FREIGHT_SCHEMA||!object(value))return true;
    const w=value;
    const localInventory=(raw:Record<string,unknown>,piles:unknown):boolean=>{
      if(!Array.isArray(piles)||!Array.isArray(raw.pawns))return true;
      return !piles.some(pile=>{
        if(!object(pile)||(pile.item!=='wood'&&pile.item!=='steel')||!object(pile.owner)||pile.owner.type!=='inventory')return false;
        const pawn=(raw.pawns as unknown[]).find(p=>object(p)&&p.id===(pile.owner as Record<string,unknown>).pawnId);
        // Historical traders may already own either material. Off-map humans
        // and terminal possessions are not local inventory at this boundary.
        return object(pawn)&&!pawn.visitor;
      });
    };
    const domains=(raw:unknown):boolean=>{
      if(!object(raw))return true;
      const group=field(raw,'group'),losses=field(raw,'groupLosses'),piles=field(raw,'piles');
      return piles.valid&&localInventory(raw,piles.value)&&group.valid&&losses.valid&&validGroupFreightShape(group.value,version)
        &&(!Array.isArray(losses.value)||losses.value.every(loss=>validGroupFreightShape(loss,version)));
    };
    if(!domains(w))return false;
    if(!localInventory(w,upsertedPiles))return false;
    const site=field(w,'secondarySite');if(!site.valid)return false;
    if(object(site.value)){const map=field(site.value,'map');return map.valid&&domains(map.value);}
    return true;
  }catch{return false;}
}
