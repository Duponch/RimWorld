/** Construct a historical fixture from a current generated world. Production
 * validation must still reject these fields when they occur in an old save. */
export function stripV120<T>(world:T):T {
  const w=world as {
    foodPolicies?:Array<{allowed:string[]}>;
    apparelPolicies?:Array<{allowedItems:string[];allowedMaterials:string[]}>;
    spoiled?:Record<string,number>;
    wildlife?:{animals:Array<{domestic?:{productFullness?:number}}>} ;
    structures?:Array<{bills?:Array<{filters:Record<string,boolean>}>}>;
    packed?:Array<{building:{bills?:Array<{filters:Record<string,boolean>}>}} >;
  };
  for(const policy of w.foodPolicies??[])policy.allowed=policy.allowed.filter(item=>item!=='milk'&&item!=='fine-meal'&&item!=='lavish-meal');
  for(const policy of w.apparelPolicies??[]){
    policy.allowedItems=policy.allowedItems.filter(item=>!item.startsWith('muffalo-wool-'));
    policy.allowedMaterials=policy.allowedMaterials.filter(item=>item!=='muffalo-wool');
  }
  if(w.spoiled)delete w.spoiled.milk;
  for(const animal of w.wildlife?.animals??[])if(animal.domestic)delete animal.domestic.productFullness;
  for(const structure of [...w.structures??[],...(w.packed??[]).map(pack=>pack.building)])for(const bill of structure.bills??[]){
    delete bill.filters.milk;delete bill.filters['muffalo-wool'];
  }
  return world;
}
