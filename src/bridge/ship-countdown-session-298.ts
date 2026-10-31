/** Private runtime state only. No World/SAVE clock, deadline or launch permission. */
export interface ShipCountdownDue298<Owner extends object,Root extends object> {
 readonly owner:Owner;
 readonly root:Root;
 readonly generation:number;
}
export interface ShipCountdownSession298<Owner extends object,Root extends object> {
 readonly timeLeftSeconds:number;
 readonly countingDown:boolean;
 readonly generation:number;
 /** Internal caller has already preflighted the real launch/root. */
 start(root:Root,currentOwner:Owner):boolean;
 /** Called only for an eligible Update, using its supplied deltaSeconds. */
 update(deltaSeconds:number,currentOwner:Owner):ShipCountdownDue298<Owner,Root>|undefined;
 isCurrent(token:unknown,currentOwner:Owner,currentRoot:Root):boolean;
 /** Consume only after the separate physical finalizer has preflighted. */
 adopt(token:unknown,currentOwner:Owner,currentRoot:Root):boolean;
 /** Main menu/ingame main-tab menu cancellation; no generic options/save hook. */
 cancelFromMenu():void;
 /** Safety adaptation: call only after a replacement owner was accepted. */
 bindOwner(nextOwner:Owner):void;
}

const initialSeconds298=Math.fround(7.2),cancelledSeconds298=Math.fround(-1000);
function requireObject298(value:unknown):void {
 if(value===null||typeof value!=='object')throw TypeError('A real runtime owner/root object is required.');
}

export function createShipCountdownSession298<Owner extends object,Root extends object>(initialOwner:Owner):ShipCountdownSession298<Owner,Root> {
 requireObject298(initialOwner);
 let owner=initialOwner,root:Root|undefined,timeLeft=cancelledSeconds298,generation=0;
 let due:ShipCountdownDue298<Owner,Root>|undefined;
 function invalidate(nextTime:number):void {
  const next=generation+1;
  if(!Number.isSafeInteger(next))throw RangeError('Countdown generation exhausted.');
  generation=next;timeLeft=nextTime;due=undefined;
 }
 function isCurrent(token:unknown,currentOwner:Owner,currentRoot:Root):boolean {
  return due!==undefined&&token===due&&currentOwner===owner&&due.owner===owner&&currentRoot===root&&due.root===root&&due.generation===generation;
 }
 return {
  get timeLeftSeconds(){return timeLeft;},
  get countingDown(){return timeLeft>=0;},
  get generation(){return generation;},
  start(nextRoot,currentOwner){
   if(currentOwner!==owner)return false;
   requireObject298(nextRoot);invalidate(initialSeconds298);root=nextRoot;return true;
  },
  update(deltaSeconds,currentOwner){
   const singleDelta=Math.fround(deltaSeconds);
   if(!Number.isFinite(deltaSeconds)||deltaSeconds<0||!Number.isFinite(singleDelta))throw RangeError('Update delta must be finite, nonnegative and finite in Single.');
   if(currentOwner!==owner||!(timeLeft>0))return;
   const next=Math.fround(timeLeft-singleDelta);
   if(!Number.isFinite(next))throw RangeError('Countdown subtraction must remain finite in Single.');
   timeLeft=next;
   if(next<=0){due=Object.freeze({owner,root:root!,generation});return due;}
  },
  isCurrent,
  adopt(token,currentOwner,currentRoot){
   if(!isCurrent(token,currentOwner,currentRoot))return false;
   due=undefined;return true;
  },
  cancelFromMenu(){invalidate(cancelledSeconds298);root=undefined;},
  bindOwner(nextOwner){
   requireObject298(nextOwner);invalidate(cancelledSeconds298);root=undefined;owner=nextOwner;
  },
 };
}
