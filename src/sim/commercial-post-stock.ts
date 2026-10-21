import {COMMERCIAL_MAX_STOCK,COMMERCIAL_RESTOCK_TICKS,type CivilianPost,type CommercialProduct,type CommercialStockPile} from './commercial-state.ts';
import {ITEM_DEFINITIONS} from './items.ts';
import {validCivilianPostShape} from './commercial-post-rules.ts';
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
function random(state:{rng:number}):number {
  let n=state.rng;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0;return state.rng/0x100000000;
}
export interface CommercialPostStockHeader {seed:number;tick:number;nextId:number;schemaVersion?:number}
/** Same finite producer as the historical arrival wrapper, with scalar input.
 * Draft refusal commits no identities; no World, map or local owner fabricated. */
export function draftCommercialPostStock(header:CommercialPostStockHeader,old?:CivilianPost):{post:CivilianPost;nextId:number;changed:boolean}|undefined {

  
  if(!integer(header.tick)||!integer(header.nextId,1)||!Number.isInteger(header.seed))return undefined;
  if(old&&!validCivilianPostShape(old,header.tick,header.nextId,header.schemaVersion??185))return undefined;
  if(old&&header.tick-old.stockedAt<=COMMERCIAL_RESTOCK_TICKS)return {post:old!,nextId:header.nextId,changed:false};
  if(old&&!Number.isSafeInteger(old.generation+1))return undefined;
  const state={rng:old?.rng??(((header.seed^0x43a71d9b)>>>0)||1)},stock:CommercialStockPile[]=[];
  let nextId=header.nextId;
  const add=(item:'silver'|CommercialProduct,min:number,max:number):boolean=>{
    let total=min+Math.floor(random(state)*(max-min+1));
    while(total>0){
      if(!integer(nextId,1)||!Number.isSafeInteger(nextId+1)||stock.length>=COMMERCIAL_MAX_STOCK)return false;
      const quantity=Math.min(total,ITEM_DEFINITIONS[item].stackLimit);
      stock.push({id:nextId++,kind:ITEM_DEFINITIONS[item].kind,item,quantity});total-=quantity;
    }
    return true;
  };
  if(!add('silver',800,3000)||!add('component',20,70)||!add('medicine',25,50))return undefined;
  const post:CivilianPost={stockedAt:header.tick,rng:state.rng,generation:(old?.generation??0)+1,stock,
    transactions:old?.transactions??0,silverReceived:old?.silverReceived??0,bought:{medicine:old?.bought.medicine??0,component:old?.bought.component??0},recent:old?structuredClone(old.recent):[],
    ...old?.sold?{sold:{...old.sold},silverPaid:old.silverPaid!}:{},
    ...old?.gifts274?{gifts274:structuredClone(old.gifts274)}:{}};
  return {post,nextId,changed:true};

}
