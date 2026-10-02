import { isColonist } from './affiliation.ts';
import type { World } from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,lo:number,hi=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const exact=(v:Record<string,unknown>,keys:readonly string[])=>Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
const edge=(v:unknown,w:World)=>object(v)&&exact(v,['x','z'])&&integer(v.x,0,w.width-1)&&integer(v.z,0,w.height-1)&&(v.x===0||v.z===0||v.x===w.width-1||v.z===w.height-1);

/** Validate the container before a read-only union exposes its original people
 * and items to the ordinary strict save validators. No second pawn validator. */
export function validateScoutRegistry(w:World,version:number):string[] {
  const s:unknown=w.scout;
  if(s===undefined)return [];
  if(version<171)return ['Future scout state in legacy save.'];
  if(!object(s)||!integer(s.startedAt,0,w.tick))return ['Invalid scout registry.'];
  if(s.phase==='loading'||s.phase==='leaving'){
    const keys=s.phase==='loading'?['phase','pawnId','sourcePileId','quantity','startedAt']:['phase','pawnId','foodPileId','quantity','startedAt','exit'];
    if(!exact(s,keys)||!integer(s.pawnId,1,w.nextId-1)||(s.quantity!==2&&s.quantity!==3))return ['Invalid scout preparation.'];
    const p=w.pawns.find(p=>p?.id===s.pawnId),id=s.phase==='loading'?s.sourcePileId:s.foodPileId;
    if(!p||!isColonist(p)||p.prisoner||p.visitor||!integer(id,1,w.nextId-1))return ['Missing scout participant.'];
    const food=w.piles.find(i=>i?.id===id);
    const owner:unknown=food?.owner;
    if(!food||food.item!=='survival-meal'||food.foodPoison!==undefined||food.quantity<(s.quantity as number)||!object(owner)
      ||(s.phase==='loading'?owner.type!=='ground':owner.type!=='inventory'||owner.pawnId!==p.id||food.quantity!==s.quantity))return ['Invalid scout provisions.'];
    if(s.phase==='leaving'&&s.exit!==null&&!edge(s.exit,w))return ['Invalid scout exit.'];
    return [];
  }
  if(!['travelling','awaiting-entry'].includes(String(s.phase))||!exact(s,['phase','pawn','items','quantity','foodPileId','startedAt','departedAt','returnAt','consumed','entry'])
    ||!object(s.pawn)||!Array.isArray(s.items)||s.items.length>32||(s.quantity!==2&&s.quantity!==3)||!integer(s.foodPileId,1,w.nextId-1)
    ||!integer(s.departedAt,s.startedAt as number,w.tick)||s.returnAt!==(s.departedAt as number)+1500||!integer(s.consumed,0,s.quantity as number)||!edge(s.entry,w)
    ||(s.phase==='travelling'?w.tick>=Number(s.returnAt):w.tick<Number(s.returnAt)))return ['Invalid off-map scout.'];
  const p=s.pawn;
  if(!integer(p.id,1,w.nextId-1)||w.pawns.some(q=>q?.id===p.id)||!isColonist(p as unknown as World['pawns'][number])||p.prisoner||p.visitor
    ||p.x!==(s.entry as Record<string,unknown>).x||p.z!==(s.entry as Record<string,unknown>).z||p.state!=='idle'||p.bedId!==null||p.jobId!==null||p.haul!==null||p.cooking!==null||p.need!==null
    ||!Array.isArray(p.path)||p.path.length||p.moveCooldown!==0||p.motion!==undefined||!object(p.orders)||p.orders.active!==null||!Array.isArray(p.orders.queue)||p.orders.queue.length
    ||['draft','shooting','melee','flee','tactics','stun','stagger','rescue','tend','feed','ward','trade','firefighting','priorityWork','research','hunting','burial','cleaning','burning','animalHandling','animalCare','equipmentTask','interruptedCargo','transitExit','heatRefuge'].some(k=>p[k]!==undefined)
    ||object(p.social)&&p.social.fight!==undefined||object(p.mental)&&p.mental.crisis!==undefined)return ['Off-map scout retains a map task or duplicate owner.'];
  let food=0;
  const ids=new Set<number>();
  for(const i of s.items){
    if(!object(i)||!integer(i.id,1,w.nextId-1)||ids.has(i.id)||w.piles.some(q=>q?.id===i.id)||!object(i.owner)||i.owner.pawnId!==p.id
      ||!['inventory','equipment','apparel'].includes(String(i.owner.type)))return ['Invalid off-map scout possession.'];
    ids.add(i.id);
    if(i.owner.type==='inventory'){
      if(i.id!==s.foodPileId||i.item!=='survival-meal'||i.foodPoison!==undefined||!integer(i.quantity,1,3))return ['Invalid off-map scout food.'];
      food+=i.quantity;
    }
  }
  if(food!==Number(s.quantity)-Number(s.consumed))return ['Scout provisions are not conserved.'];
  // Reject map actions which retain a now absent physical contact target. Social
  // memories are deliberately resolved by the union, never erased on departure.
  if(w.pawns.some(q=>q?.rescue?.patientId===p.id||q?.tend?.patientId===p.id||q?.feed?.patientId===p.id||q?.ward?.patientId===p.id||q?.melee?.order?.targetId===p.id||q?.melee?.strike?.targetId===p.id||q?.shooting?.order?.targetId===p.id))return ['Map action targets an absent scout.'];
  return [];
}
