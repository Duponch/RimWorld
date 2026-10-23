import {LESSONS,type FirstGestureId,type LearningOrigin,type FirstGesturesLearning} from './first-gestures-learning';
import type {FirstDayGuideAction} from './first-day-guide';

export interface FirstGesturesGuideCallbacks {
 learning:FirstGesturesLearning;
 onAction:(action:FirstDayGuideAction)=>void;
}
const ORIGINS:Record<LearningOrigin,string>={confirmed:'Ordre accepté',declared:'Je connais déjà ce geste'};
const ACTION_LABELS:Record<FirstGestureId,string>={work:'Ouvrir Travail',storage:'Choisir Réserve',beds:'Choisir Couchage au sol',cultivation:'Choisir Zone de culture'};

/** A small view of browser knowledge, separate from the eight current-world
 * facts. Rendering neither accepts a World nor awards learning on its own. */
export function createFirstGesturesGuide(host:HTMLElement,{learning,onAction}:FirstGesturesGuideCallbacks){
 const doc=host.ownerDocument,section=doc.createElement('section'),heading=doc.createElement('h3'),intro=doc.createElement('p');
 section.className='first-gestures-guide';section.setAttribute('aria-label','Parcours facultatif des premiers gestes');heading.textContent='Premiers gestes';
 intro.textContent='Un petit parcours facultatif. Ces repères sont conservés dans ce navigateur pour toutes vos parties.';
 const summary=doc.createElement('p');summary.className='first-gestures-summary';summary.dataset.firstGesturesSummary='';summary.setAttribute('aria-live','polite');
 const list=doc.createElement('ol');list.className='first-gestures-indicators';list.setAttribute('aria-label','Quatre gestes et leur origine');
 const indicators=new Map<FirstGestureId,{node:HTMLLIElement;origin:HTMLElement}>();
 for(const lesson of LESSONS){
  const node=doc.createElement('li'),title=doc.createElement('span'),origin=doc.createElement('small');node.dataset.firstGestureIndicator=lesson.id;title.textContent=lesson.title;origin.dataset.firstGestureOrigin=lesson.id;
  node.append(title,origin);list.append(node);indicators.set(lesson.id,{node,origin});
 }
 const offer=doc.createElement('p');offer.dataset.firstGesturesOffer='';
 const currentBox=doc.createElement('div');currentBox.className='first-gestures-current';currentBox.dataset.firstGestureCurrent='';
 const position=doc.createElement('small'),title=doc.createElement('h4'),instruction=doc.createElement('p');position.dataset.firstGesturePosition='';title.dataset.firstGestureTitle='';instruction.dataset.firstGestureInstruction='';currentBox.append(position,title,instruction);
 const actions=doc.createElement('div');actions.className='first-gestures-actions';
 const start=doc.createElement('button'),open=doc.createElement('button'),declare=doc.createElement('button'),stop=doc.createElement('button'),review=doc.createElement('button');
 start.dataset.firstGesturesStart='';open.dataset.firstGestureAction='';declare.dataset.firstGestureDeclare='';stop.dataset.firstGesturesStop='';review.dataset.firstGesturesReview='';
 const buttons=[start,open,declare,stop,review];for(const button of buttons)button.type='button';
 declare.textContent='Je connais déjà ce geste';declare.title='Déclaration personnelle : aucune commande au jeu.';review.textContent='Revoir ces gestes';review.title='Efface seulement les repères de ce guide. La partie reste telle qu’elle est.';
 actions.append(start,open,declare,stop,review);
 const meaning=doc.createElement('p');meaning.className='first-gestures-note';meaning.textContent='« Ordre accepté » confirme le geste d’interface. Il ne prouve aucun transport, semis, récolte ou chantier payé achevé. Les huit rubriques ci-dessous décrivent la colonie actuelle.';
 const reviewNote=doc.createElement('p');reviewNote.className='first-gestures-note';reviewNote.dataset.firstGesturesReviewNote='';reviewNote.textContent='Revoir efface seulement les repères de ce parcours.';
 const warning=doc.createElement('p');warning.className='first-gestures-warning';warning.dataset.firstGesturesWarning='';warning.setAttribute('role','status');warning.textContent='L’enregistrement dans ce navigateur a échoué. Vos repères restent dans cette session et seront perdus au rechargement.';
 section.append(heading,intro,summary,list,offer,currentBox,actions,meaning,reviewNote,warning);host.append(section);host.hidden=true;
 let active=false,disposed=false,generation=0,bound=false;
 const text=(node:HTMLElement,value:string)=>{if(node.textContent!==value)node.textContent=value;};
 const hide=(node:HTMLElement,value:boolean)=>{if(node.hidden!==value)node.hidden=value;};
 function update():void {
  if(!active||disposed)return;
  const focused=doc.activeElement as HTMLButtonElement|null,wasVisibleControl=focused!==null&&buttons.includes(focused)&&!focused.hidden;
  const state=learning.state,current=learning.current,lesson=LESSONS.find(row=>row.id===current),count=LESSONS.filter(row=>state.learned[row.id]!==undefined).length;
  text(summary,`${count} / ${LESSONS.length} gestes repérés`);
  for(const row of LESSONS){
   const indicator=indicators.get(row.id)!,origin=state.learned[row.id],label=origin?ORIGINS[origin]:'À découvrir';
   text(indicator.origin,label);indicator.node.dataset.origin=origin??'unknown';indicator.node.setAttribute('aria-label',`${row.title} : ${label}`);
   if(row.id===current)indicator.node.setAttribute('aria-current','step');else indicator.node.removeAttribute('aria-current');
  }
  const running=state.enabled&&!!lesson,complete=!lesson;
  section.dataset.state=complete?'complete':running?'active':count?'paused':'off';
  hide(offer,running);text(offer,complete?'Ces quatre gestes sont repérés. Vous pouvez les revoir ou consulter librement les conseils ci-dessous.':count?'Reprenez au prochain geste à découvrir. Vos repères précédents sont conservés.':'Commencez quand vous le souhaitez ; les commandes habituelles du jeu restent disponibles.');
  hide(currentBox,!running);currentBox.dataset.firstGestureCurrent=current??'';
  text(position,lesson?`Geste ${LESSONS.indexOf(lesson)+1} sur ${LESSONS.length}`:'');text(title,lesson?.title??'');text(instruction,lesson?.instruction??'');
  hide(start,state.enabled||complete);text(start,count?'Reprendre':'Commencer');hide(open,!running);hide(declare,!running);hide(stop,!state.enabled);text(stop,complete?'Terminer le parcours':'Interrompre le parcours');hide(review,count===0);hide(reviewNote,count===0);hide(warning,learning.saved);
  text(open,lesson?ACTION_LABELS[lesson.id]:'Ouvrir');
  if(focused&&wasVisibleControl&&focused.hidden&&!host.hidden){const next=running?open:complete?review:start;if(!next.hidden)next.focus({preventScroll:true});}
 }
 function clearCallbacks(){for(const button of buttons)button.onclick=null;bound=false;}
 function bind(){
  if(bound)return;bound=true;const token=generation;
  const run=(action:()=>void)=>()=>{if(!active||disposed||token!==generation)return;action();update();};
  start.onclick=run(()=>learning.start());stop.onclick=run(()=>learning.stop());declare.onclick=run(()=>{if(learning.state.enabled)learning.declareCurrentKnown();});review.onclick=run(()=>learning.review());
  open.onclick=run(()=>{const current=learning.current,lesson=LESSONS.find(row=>row.id===current);if(learning.state.enabled&&lesson)onAction({...lesson.action});});
 }
 bind();
 return {
  setActive(value:boolean){if(disposed)return;active=value;host.hidden=!value;if(value){bind();update();}},
  update,
  /** Releases callbacks on a replaced UI context, without erasing the player's
   * browser knowledge. Reactivation reuses these same retained DOM nodes. */
  reset(){if(disposed)return;generation++;active=false;host.hidden=true;clearCallbacks();},
  dispose(){if(disposed)return;generation++;disposed=true;active=false;clearCallbacks();host.replaceChildren();host.hidden=true;},
 };
}
