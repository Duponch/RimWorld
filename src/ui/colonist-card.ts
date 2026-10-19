/** Retained DOM for the always-visible colonist bar. All text remains literal;
 * callers supply the same confirmed values on every HUD refresh. */
export interface ColonistCardValues {
  selected:boolean;drafted:boolean;name:string;title:string;equipment:string;
  apparel:string;portrait:string;bodyColor:string;vest:boolean;
  symbol:string;symbolLabel:string;mentalCrisis:string;symbolState:string;mood:number;
}
type Card={name:HTMLElement;portrait:HTMLElement;body:HTMLElement;vest:HTMLElement;symbol:HTMLElement;mood:HTMLElement;values?:ColonistCardValues};
const cards=new WeakMap<HTMLButtonElement,Card>();

export function updateColonistCard(button:HTMLButtonElement,next:ColonistCardValues):void {
  let card=cards.get(button);
  if(!card){
    const find=(selector:string)=>{const node=button.querySelector<HTMLElement>(selector);if(!node)throw Error('Missing colonist card '+selector);return node;};
    card={name:find('strong'),portrait:find('.portrait-head'),body:find('.portrait-body'),vest:find('.portrait-vest'),symbol:find('.pawn-symbol'),mood:find('.pawn-mood i')};cards.set(button,card);
  }
  const old=card.values;
  if(!old||old.selected!==next.selected){button.classList.toggle('selected',next.selected);button.setAttribute('aria-pressed',String(next.selected));}
  if(!old||old.drafted!==next.drafted)button.dataset.drafted=String(next.drafted);
  if(!old||old.name!==next.name)card.name.textContent=next.name;
  if(!old||old.title!==next.title)button.title=next.title;
  if(!old||old.equipment!==next.equipment)button.dataset.equipment=next.equipment;
  if(!old||old.apparel!==next.apparel)button.dataset.apparel=next.apparel;
  if(!old||old.portrait!==next.portrait){card.portrait.dataset.source=next.portrait;card.portrait.style.setProperty('--pawn-portrait',`url("${next.portrait}")`);}
  if(!old||old.bodyColor!==next.bodyColor)card.body.style.background=next.bodyColor;
  if(!old||old.vest!==next.vest)card.vest.hidden=!next.vest;
  if(!old||old.symbol!==next.symbol)card.symbol.textContent=next.symbol;
  if(!old||old.symbolLabel!==next.symbolLabel)card.symbol.setAttribute('aria-label',next.symbolLabel);
  if(!old||old.mentalCrisis!==next.mentalCrisis)button.dataset.mentalCrisis=next.mentalCrisis;
  if(!old||old.symbolState!==next.symbolState)card.symbol.dataset.state=next.symbolState;
  if(!old||old.mood!==next.mood)card.mood.style.width=`${next.mood}%`;
  // Capture primitives rather than retaining a caller-owned mutable object.
  card.values={...next};
}
