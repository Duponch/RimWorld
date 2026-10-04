/** A test oracle records the outcome at the harvest boundary. It never derives
 * a harvest loss from the total inventory difference it is meant to detect. */
export class HarvestPotentialLedger {
  lost=0;
  private remaining:Map<number,number>;
  constructor(sources:readonly {id:number;amount:number;kind:string;growth?:number}[]){
    this.remaining=new Map(sources.filter(r=>r.kind==='berries'&&r.growth===undefined).map(r=>[r.id,r.amount]));
  }
  record(id:number,quantity:number|null):void {
    if(quantity===null)return;
    const nominal=this.remaining.get(id);if(nominal===undefined)return;
    if(!Number.isSafeInteger(quantity)||quantity<0)throw new Error('Invalid observed harvest output');
    this.lost+=nominal-quantity;this.remaining.delete(id);
  }
}
