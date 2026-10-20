import { ITEM_DEFINITIONS,type ItemId } from './items.ts';
import { freshRot } from './food-preservation.ts';
import type { OrbitalKind,OrbitalShip,OrbitalState } from './orbital-state.ts';
import type { MaterialPile,World } from './types.ts';

export const ORBITAL_STOCK:Readonly<Record<OrbitalKind,readonly (readonly [ItemId,number,number])[]>>={
  bulk:[['silver',2000,4000],['component',15,30],['advanced-component',1,2],['steel',500,800],['wood',500,800],['plasteel',100,400],['cloth',200,600],['medicine',20,30],['gold',50,200],['neutroamine',100,200]],
  exotic:[['silver',2000,4000],['component',5,30],['advanced-component',3,8],['plasteel',100,400],['gold',200,400],['neutroamine',100,500],['glitterworld-medicine',5,30]],
};
export function orbitalRandom(state:Pick<OrbitalState,'rng'>):number {let n=state.rng;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0;return state.rng/0x100000000;}
/** Core BulkGoods Beer uses a total-price range, including no-stock draws.
 * The product keeps its existing independent orbital random stream. */
export function orbitalBeerCount265(random:number):number {
  const value=Math.fround(Math.fround(-70+Math.fround(270*Math.fround(random)))/12);
  const lo=Math.floor(value),fraction=value-lo;
  return Math.max(0,fraction>.5||fraction===.5&&lo%2!==0?lo+1:lo);
}
export const orbitalBeerCatalogue265=(version:number,kind:OrbitalKind,item:ItemId):boolean=>version>=265&&kind==='bulk'&&item==='beer';
/** Direct supported Core stock only. Every draw and physical identity is once. */
export function orbitalStock(w:World,ship:OrbitalShip,state:Pick<OrbitalState,'rng'>):MaterialPile[] {
  const result:MaterialPile[]=[];
  for(const [item,min,max] of ORBITAL_STOCK[ship.kind]){
    let quantity=min+Math.floor(orbitalRandom(state)*(max-min+1));
    while(quantity){const n=Math.min(quantity,ITEM_DEFINITIONS[item].stackLimit);result.push({id:w.nextId++,item,kind:ITEM_DEFINITIONS[item].kind,quantity:n,owner:{type:'orbital-ship',shipId:ship.id},...freshRot(item,w.tick)});quantity-=n;}
  }
  if(w.schemaVersion>=265&&ship.kind==='bulk'){
    let quantity=orbitalBeerCount265(orbitalRandom(state));
    while(quantity>0){const n=Math.min(quantity,ITEM_DEFINITIONS.beer.stackLimit);result.push({id:w.nextId++,item:'beer',kind:'beer',quantity:n,owner:{type:'orbital-ship',shipId:ship.id}});quantity-=n;}
  }
  return result;
}
