import './notification-letter.css';

/** Map focus is the primary action when it has a physical target. Information
 * keeps its own keyboard-accessible button so a modal never blocks the ring. */
export function createNotificationLetterDetails(letter:HTMLButtonElement,dialog:HTMLDialogElement):{
  update:(parent:HTMLElement,hasTargets:boolean,prepend?:boolean)=>void;remove:()=>void;
} {
  const root=document.createElement('div');root.className='notification-row';
  const details=document.createElement('button');details.type='button';details.id=letter.id.replace(/-letter$/,'-details');details.className='notification-details';details.textContent='i';
  details.onclick=()=>{if(!dialog.open)dialog.showModal();};root.append(letter,details);
  let lastLabel='';
  return {remove:()=>root.remove(),update(parent,hasTargets,prepend=false){
    if(details.hidden!==!hasTargets)details.hidden=!hasTargets;const label=`Informations : ${letter.textContent}`;
    if(label!==lastLabel){details.setAttribute('aria-label',label);lastLabel=label;}
    if(root.parentElement!==parent){if(prepend)parent.prepend(root);else parent.append(root);}
  }};
}
