import { isColonist,activeThreat } from '../sim/affiliation';
import { isBedKind } from '../sim/bed-kinds';
import { bedSlotsCount } from '../sim/bed-slots';
import { storageCells } from '../sim/shelf-storage';
import { constructionRecipe } from '../sim/construction-materials';
import { firePosition } from '../sim/fire-rules';
import { FLU_UNIT,fluStage } from '../sim/flu-rules';
import { IMMUNE_DISEASE_UNIT,immuneDiseaseStage } from '../sim/immune-diseases-rules';
import { IMMUNE_DISEASE_KINDS } from '../sim/immune-diseases-types';
import { INFECTION_UNIT,infectionStage } from '../sim/infection-rules';
import { medicalBleed } from '../sim/injury-state';
import { availableNutrition } from '../sim/items';
import { mentalCrisisView } from '../sim/mental-presentation';
import { prisonBreakActive } from '../sim/prison-break-state';
import type { Pawn,World } from '../sim/types';
import { buildingLabels } from './building-labels';
import type { ArchitectCategory,Panel } from './layout';
import { miniTurretView,turretSeconds } from '../sim/mini-turret-presentation';
import { actorNotificationTarget,cellNotificationTarget,objectNotificationTarget,personNotificationTarget,NotificationFocusCycle,type NotificationTarget,type FocusNotification } from './notification-focus';

export interface NotificationContext { panel:Exclude<Panel,null>;category?:ArchitectCategory;tool?:'stockpile'; }
export interface StatusAlert { key:string;text:string;targets:NotificationTarget[];context?:NotificationContext;tab?:'health'|'needs'|'prisoner'; }
const present=<T>(target:T|undefined):target is T=>target!==undefined;
const people=(world:World,pawns:readonly Pawn[])=>[...pawns].sort((a,b)=>a.id-b.id).map(p=>personNotificationTarget(world,p.id)).filter(present);
const actors=(values:readonly {id:number}[])=>[...values].sort((a,b)=>a.id-b.id).map(p=>actorNotificationTarget(p.id));

/** All predicates and targets share the same confirmed snapshot. Labels are
 * never parsed to find an entity, a medical condition or a management panel. */
export function readStatusAlerts(world:World):StatusAlert[] {
  const rows:StatusAlert[]=[],colonists=world.pawns.filter(isColonist),living=colonists.filter(p=>p.state!=='dead');
  const add=(key:string,text:string,targets:NotificationTarget[],context?:NotificationContext,tab?:StatusAlert['tab'])=>rows.push({key,text,targets,...context?{context}:{},...tab?{tab}:{}});
  const counted=(key:string,pawns:Pawn[],text:(count:number)=>string,tab?:StatusAlert['tab'])=>{if(pawns.length)add(key,text(pawns.length),people(world,pawns),{panel:'history'},tab);};
  counted('sad-wander',living.filter(p=>p.mental?.crisis?.kind==='sad-wander'),n=>`${n} colon(s) en errance triste`,'needs');
  counted('food-binge',living.filter(p=>p.mental?.crisis?.kind==='food-binge'),n=>`${n} colon(s) en frénésie alimentaire`,'needs');
  for(const pawn of living.filter(p=>p.mental?.crisis&&['tantrum','berserk','murderous-rage'].includes(p.mental.crisis.kind))){
    const crisis=mentalCrisisView(world,pawn,s=>buildingLabels[s.kind])!;
    add(`mental:${pawn.id}`,`${pawn.name} · ${crisis.label}${crisis.target?` · cible : ${crisis.target.label}${crisis.target.type==='structure'?` (${crisis.target.cell.x}, ${crisis.target.cell.z})`:''}`:''}`,people(world,[pawn]),undefined,'needs');
  }
  const rebels=world.pawns.filter(p=>prisonBreakActive(p)&&activeThreat(p));
  if(rebels.length)add('prison-break',`Révolte de prison · ${rebels.length} détenu${rebels.length>1?'s':''} en fuite`,people(world,rebels));
  const machines=world.mechanoids?.filter(m=>m.state!=='dead'&&m.state!=='downed')??[];
  if(machines.length)add('mechanical-threat',`${machines.length} machine(s) hostiles${world.raids?.mechActive?.phase==='staging'?' · regroupement avant assaut':world.raids?.mechActive?.phase==='assault'?' · assaut mécanique':''}`,actors(machines));
  for(const structure of world.structures)if(structure.turret?.wick){
    const view=miniTurretView(world,structure)!;
    add(`turret-wick:${structure.id}`,`Mini-tourelle (${structure.x}, ${structure.z}) · mèche engagée · danger 3,9 · ${turretSeconds(view.wick!.remainingCore)}`,[objectNotificationTarget('structure',structure.id,structure)]);
  }
  const enraged=world.wildlife?.animals.filter(a=>a.manhunter&&a.state!=='dead'&&a.state!=='downed')??[];
  if(enraged.length)add('manhunter',`${enraged.length} ${enraged.length>1?'animaux':'animal'} en rage`,actors(enraged));
  counted('malnutrition',living.filter(p=>(p.health?.malnutrition??0)>0),n=>`${n} colon(s) en malnutrition`,'health');
  counted('hypothermia',living.filter(p=>(p.health?.hypothermia??0)>=40000000),n=>`${n} colon(s) en hypothermie`,'health');
  const infected=living.filter(p=>!!p.health?.infections?.cases.length);
  counted('infection-critical',infected.filter(p=>p.health!.infections!.immunity<INFECTION_UNIT&&p.health!.infections!.cases.some(c=>['extreme','critical'].includes(infectionStage(c.severity)))),n=>`Urgence médicale : ${n} colon(s) avec une infection grave`,'health');
  counted('infection',infected,n=>`${n} colon(s) avec une infection · consulter Santé`,'health');
  const flu=living.filter(p=>!!p.health?.flu?.severity);
  counted('flu-critical',flu.filter(p=>p.health!.flu!.immunity<FLU_UNIT&&fluStage(p.health!.flu!.severity)==='extreme'),n=>`Urgence médicale : ${n} colon(s) avec une grippe extrême`,'health');
  counted('flu',flu,n=>`${n} colon(s) grippé(s) · consulter Santé`,'health');
  for(const kind of IMMUNE_DISEASE_KINDS){
    const cases=living.filter(p=>!!p.health?.immuneDiseases?.[kind]?.severity),label=kind==='malaria'?'paludisme':'peste';
    counted(`${kind}-critical`,cases.filter(p=>{const d=p.health!.immuneDiseases![kind]!;return d.immunity<IMMUNE_DISEASE_UNIT&&['extreme','critical'].includes(immuneDiseaseStage(kind,d.severity));}),n=>`Urgence médicale : ${n} colon(s) avec ${label} grave`,'health');
    counted(kind,cases,n=>`${n} colon(s) avec ${label} · consulter Santé`,'health');
  }
  counted('downed',living.filter(p=>p.state==='downed'),n=>`${n} colon(s) à terre`,'health');
  counted('bleeding',living.filter(p=>p.health&&medicalBleed(p.health)>=.1),n=>`${n} colon(s) saignent`,'health');
  counted('deaths',colonists.filter(p=>p.state==='dead'),n=>`${n} colon(s) décédé(s)`,'health');
  if(availableNutrition(world)<living.length*1.6)add('food-reserves','Réserves de nourriture faibles',[],{panel:'assign'});
  counted('hungry',living.filter(p=>p.hunger<25),n=>`${n} colon(s) affamé(s)`,'needs');
  const pending=world.jobs.filter(j=>j.status==='pending');
  if(pending.length)add('pending-jobs',`${pending.length} ordre(s) en attente`,pending.map(j=>objectNotificationTarget('job',j.id,j)),{panel:'work'});
  if(!world.stockpiles.length&&!storageCells(world).length)add('no-stockpile','Aucune réserve de stockage',[],{panel:'architect',tool:'stockpile'});
  if(world.jobs.some(j=>constructionRecipe(j).ingredients.length>0)&&world.pawns.every(p=>p.priorities.haul===0&&p.priorities.build===0))add('disabled-construction','Construction/transport désactivés : chantiers non approvisionnés',[],{panel:'work'});
  const interrupted=world.pawns.filter(p=>p.interruptedCargo);
  if(interrupted.length)add('interrupted-cargo',`${interrupted.length} cargaison(s) conservée(s) : fin de déplacement ou sol proche à libérer`,people(world,interrupted),{panel:'work'});
  counted('idle',world.pawns.filter(p=>isColonist(p)&&!p.prisoner&&p.state==='idle'&&!p.draft&&!p.flee&&!p.mental?.crisis&&!p.interruptedCargo),n=>`${n} colon(s) disponible(s)`);
  const beds=world.structures.filter(s=>isBedKind(s.kind)&&!s.medical&&!s.prisoner).reduce((n,s)=>n+bedSlotsCount(s),0);
  if(beds<living.length)add('beds',`${living.length-beds} couchage(s) manquant(s)`,[],{panel:'architect',category:'furniture'});
  const prisoners=world.pawns.filter(p=>p.prisoner&&p.state!=='dead');
  if(prisoners.length)add('prisoners',`${prisoners.length} prisonnier(s) · ${living.some(p=>p.priorities.warden>0)?'Geôlier activé':'Geôlier désactivé'}`,people(world,prisoners),{panel:'work'},'prisoner');
  return rows;
}

export function readInspectAlerts(world:World):Partial<Record<'inspect-fire'|'inspect-blight'|'inspect-threat',StatusAlert>> {
  const result:ReturnType<typeof readInspectAlerts>={},fires=world.fires?.items??[],blighted=world.resources.filter(r=>!!r.blight);
  if(fires.length)result['inspect-fire']={key:'fire',text:`Incendie · ${fires.length} foyer${fires.length>1?'s':''} · voir`,targets:fires.map(f=>{
    if(f.attachedPawnId!==undefined)return personNotificationTarget(world,f.attachedPawnId);
    if(f.attachedAnimalId!==undefined)return world.wildlife?.animals.some(a=>a.id===f.attachedAnimalId)?actorNotificationTarget(f.attachedAnimalId):undefined;
    const cell=firePosition(world,f);return cell?cellNotificationTarget(`fire:${f.id}`,cell):undefined;
  }).filter(present),context:{panel:'work'}};
  if(blighted.length)result['inspect-blight']={key:'blight',text:`Fléau des cultures · ${blighted.length} plant(s) · voir`,targets:blighted.map(r=>objectNotificationTarget('resource',r.id,r)),context:{panel:'architect',category:'orders'}};
  const enemies=world.pawns.filter(p=>p.faction==='outlaws'&&!p.prisoner&&activeThreat(p)),rebels=world.pawns.filter(p=>prisonBreakActive(p)&&activeThreat(p));
  const machines=world.mechanoids?.filter(m=>m.state!=='dead'&&m.state!=='downed')??[],mental=world.pawns.filter(p=>isColonist(p)&&p.state!=='dead'&&p.mental?.crisis&&['tantrum','berserk','murderous-rage'].includes(p.mental.crisis.kind)),animals=world.wildlife?.animals.filter(a=>a.manhunter&&a.state!=='dead'&&a.state!=='downed')??[];
  const targets=[...people(world,enemies),...people(world,rebels),...actors(machines),...people(world,mental),...actors(animals)];
  if(targets.length)result['inspect-threat']={key:'threat',text:enemies.length?'Menace armée · voir':rebels.length?'Révolte de prison · voir':machines.length?'Menace mécanique · voir':mental.length?`${mentalCrisisView(world,mental[0]!)!.label} · voir`:'Animal en rage · voir',targets};
  return result;
}

export interface StatusAlertsActions {
  focus:FocusNotification;context:(context:NotificationContext)=>void;tab?:(tab:NonNullable<StatusAlert['tab']>)=>void;
}
/** Keyed nodes keep keyboard focus and the per-alert ring through tick refreshes. */
export function createStatusAlerts(host:HTMLElement,jumps:Partial<Record<'inspect-fire'|'inspect-blight'|'inspect-threat',HTMLButtonElement>>,actions:StatusAlertsActions):{update:(world:World)=>void;reset:()=>void} {
  const cycle=new NotificationFocusCycle(),nodes=new Map<string,{node:HTMLElement;row:StatusAlert}>();
  const activate=(row:StatusAlert)=>{const target=cycle.next(row.key,row.targets);if(target){actions.focus(target);if(row.tab&&target.kind==='actor')actions.tab?.(row.tab);}else if(row.context)actions.context(row.context);};
  let inspection:ReturnType<typeof readInspectAlerts>={};
  for(const [id,button] of Object.entries(jumps))if(button)button.onclick=()=>{const row=inspection[id as keyof typeof inspection];if(row)activate(row);};
  return {reset:()=>cycle.reset(),update(world){
    const rows=readStatusAlerts(world),keys=new Set(rows.map(row=>row.key));
    for(const [key,record] of nodes)if(!keys.has(key)){record.node.remove();nodes.delete(key);}
    rows.forEach((row,index)=>{
      let record=nodes.get(row.key);if(!record){
        const node=document.createElement('p');node.setAttribute('role','button');node.tabIndex=0;node.style.cursor='pointer';node.dataset.alert=row.key;
        const created={node,row};record=created;nodes.set(row.key,created);node.onclick=()=>activate(created.row);
        node.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();activate(created.row);}};
      }
      record.row=row;const node=record.node;if(node.textContent!==row.text)node.textContent=row.text;
      if(host.children[index]!==node)host.insertBefore(node,host.children[index]??null);
    });
    inspection=readInspectAlerts(world);
    for(const [id,button] of Object.entries(jumps)){if(!button)continue;const row=inspection[id as keyof typeof inspection];if(button.hidden!==!row)button.hidden=!row;if(row&&button.textContent!==row.text)button.textContent=row.text;}
  }};
}
