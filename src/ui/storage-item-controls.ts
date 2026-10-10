import { ITEM_DEFINITIONS, type ItemId } from '../sim/items';
import {modelIconUrl} from './pictograms';
import { QUALITY_LABELS,WEAPON_QUALITIES,type WeaponQuality } from '../sim/equipment-rules';
import type { StorageFilters } from '../sim/types';
import { STORAGE_FILTER_TREE,STORAGE_LEAVES,setStorageNode,storageNodeState,storageSearchNodes,storageTreePermissions,storageTreeSelection,type StorageFilterNode,type StorageLeafId } from './storage-filter-tree';

export type StorageItemSelection = Partial<Record<ItemId, boolean>>;
const GROUP_LABELS:Readonly<Record<string,string>>={chemfuel:'Biocarburant',neutroamine:'Neutroamine',silver:'Argent',corpse:'Dépouilles','mech-corpse':'Carcasses mécaniques',wood:'Bois',food:'Nourriture',unfinished:'Ouvrages inachevés',textile:'Textiles',chunk:'Fragments',steel:'Acier',gold:'Or',plasteel:'Plastacier',component:'Composants','advanced-component':'Composants avancés',medicine:'Médicaments',weapon:'Armes',apparel:'Vêtements',blocks:'Blocs de pierre'};

/** Mount beside the existing category controls. A historical zone without an
 * item list displays every item as selected, matching its category-only rule. */
export function mountStorageItemControls(parent:HTMLElement,items?:StorageItemSelection):HTMLElement {
  const fieldset=document.createElement('fieldset');
  fieldset.className='storage-item-controls';
  const legend=document.createElement('legend');legend.textContent='Objets précis';fieldset.append(legend);
  const toggle=document.createElement('input');toggle.type='checkbox';toggle.dataset.storageItemToggle='';toggle.checked=items!==undefined;
  const enable=document.createElement('label');enable.append(toggle,document.createTextNode(' Affiner les catégories par objet'));fieldset.append(enable);
  const body=document.createElement('div');body.className='storage-item-list';body.hidden=!toggle.checked;fieldset.append(body);
  toggle.onchange=()=>{body.hidden=!toggle.checked;};
  const actions=document.createElement('div');actions.className='storage-item-actions';body.append(actions);
  for(const [label,checked] of [['Tout autoriser',true],['Tout refuser',false]] as const){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{for(const c of body.querySelectorAll<HTMLInputElement>('input'))c.checked=checked;};actions.append(b);}
  const groups=new Map<string,HTMLElement>();
  for(const [id,definition] of Object.entries(ITEM_DEFINITIONS) as [ItemId,(typeof ITEM_DEFINITIONS)[ItemId]][]) {
    let group=groups.get(definition.kind);
    if(!group){
      const details=document.createElement('details'),summary=document.createElement('summary');
      summary.textContent=GROUP_LABELS[definition.kind]??definition.kind;details.append(summary);body.append(details);
      group=details;groups.set(definition.kind,group);
    }
    const label=document.createElement('label'),check=document.createElement('input');
    check.type='checkbox';check.dataset.storageItem=id;check.checked=items===undefined||items[id]===true;
    label.append(check,document.createTextNode(` ${definition.label}`));group.append(label);
  }
  parent.append(fieldset);return fieldset;
}

/** An explicit map intentionally contains only accepted items. */
export function readStorageItemControls(parent:ParentNode):StorageItemSelection|undefined {
  if(!parent.querySelector<HTMLInputElement>('[data-storage-item-toggle]')?.checked)return undefined;
  const items:StorageItemSelection={};
  for(const check of parent.querySelectorAll<HTMLInputElement>('input[data-storage-item]'))if(check.checked)items[check.dataset.storageItem as ItemId]=true;
  return items;
}

export function showStorageItemControls(parent:ParentNode,items?:StorageItemSelection):void {
  const toggle=parent.querySelector<HTMLInputElement>('[data-storage-item-toggle]');if(toggle)toggle.checked=items!==undefined;
  const body=parent.querySelector<HTMLElement>('.storage-item-list');if(body)body.hidden=items===undefined;
  for(const check of parent.querySelectorAll<HTMLInputElement>('input[data-storage-item]'))check.checked=items===undefined||items[check.dataset.storageItem as ItemId]===true;
}

export interface StorageConditionSelection {
  quality?:{min:WeaponQuality;max:WeaponQuality};
  hitPoints?:{min:number;max:number};
}
type RangeInput={min:string;max:string};

/** Disabled ranges are omitted. Invalid active input must never quietly remove
 * the player's restriction or turn into a different, clamped range. */
export function storageConditionSelection(quality?:RangeInput,hitPoints?:RangeInput):StorageConditionSelection {
  const selection:StorageConditionSelection={};
  if(quality){
    const min=WEAPON_QUALITIES.indexOf(quality.min as WeaponQuality),max=WEAPON_QUALITIES.indexOf(quality.max as WeaponQuality);
    if(min<0||max<0)throw new Error('Choisissez deux qualités valides.');
    if(min>max)throw new Error('La qualité minimale doit être inférieure ou égale à la qualité maximale.');
    selection.quality={min:WEAPON_QUALITIES[min]!,max:WEAPON_QUALITIES[max]!};
  }
  if(hitPoints){
    const min=Number(hitPoints.min),max=Number(hitPoints.max);
    if(!hitPoints.min.trim()||!hitPoints.max.trim()||!Number.isInteger(min)||!Number.isInteger(max)||min<0||max>100||min>100||max<0)
      throw new Error('Les points de vie doivent être des pourcentages entiers entre 0 et 100.');
    if(min>max)throw new Error('Le minimum de points de vie doit être inférieur ou égal au maximum.');
    selection.hitPoints={min,max};
  }
  return selection;
}

type RangeControl=HTMLInputElement|HTMLSelectElement;
function conditionRange(parent:ParentNode,kind:'quality'|'hitPoints'):RangeInput|undefined {
  if(!parent.querySelector<HTMLInputElement>(`[data-storage-condition-toggle="${kind}"]`)?.checked)return;
  return {
    min:parent.querySelector<RangeControl>(`[data-storage-condition-min="${kind}"]`)?.value??'',
    max:parent.querySelector<RangeControl>(`[data-storage-condition-max="${kind}"]`)?.value??'',
  };
}

function validateConditionRange(parent:ParentNode,kind:'quality'|'hitPoints'):void {
  const max=parent.querySelector<RangeControl>(`[data-storage-condition-max="${kind}"]`);
  const feedback=parent.querySelector<HTMLElement>(`[data-storage-condition-feedback="${kind}"]`);
  if(!max||!feedback)return;
  max.setCustomValidity('');feedback.textContent='';feedback.hidden=true;
  const values=conditionRange(parent,kind);
  try {storageConditionSelection(kind==='quality'?values:undefined,kind==='hitPoints'?values:undefined);}
  catch(error){
    const message=error instanceof Error?error.message:'Plage invalide.';
    max.setCustomValidity(message);feedback.textContent=message;feedback.hidden=false;
  }
}

/** Independent from the ItemId whitelist, including for packed furniture. */
export function mountStorageConditionControls(parent:HTMLElement,conditions:StorageConditionSelection={}):HTMLElement {
  const fieldset=document.createElement('fieldset');fieldset.className='storage-condition-controls';
  const legend=document.createElement('legend');legend.textContent='Qualité et état';fieldset.append(legend);
  for(const [kind,title,hint] of [
    ['quality','Limiter la qualité','Cette plage s’applique seulement aux objets ayant une qualité, y compris les meubles emballés.'],
    ['hitPoints','Limiter les points de vie','Cette plage s’applique seulement aux objets ayant des points de vie, y compris les meubles emballés.'],
  ] as const){
    const range=document.createElement('div');range.className='storage-condition-range';fieldset.append(range);
    const label=document.createElement('label'),toggle=document.createElement('input');
    toggle.type='checkbox';toggle.dataset.storageConditionToggle=kind;
    label.append(toggle,document.createTextNode(` ${title}`));range.append(label);
    const body=document.createElement('div');body.className='storage-condition-values';body.dataset.storageConditionBody=kind;range.append(body);
    for(const [bound,title] of [['min','Minimum'],['max','Maximum']] as const){
      const boundLabel=document.createElement('label');boundLabel.append(document.createTextNode(kind==='hitPoints'?`${title} (%)`:title));
      let input:RangeControl;
      if(kind==='quality'){
        const select=document.createElement('select');
        for(const quality of WEAPON_QUALITIES){
          const option=document.createElement('option');option.value=quality;option.textContent=QUALITY_LABELS[quality];select.append(option);
        }
        input=select;
      }else{
        const number=document.createElement('input');number.type='number';number.min='0';number.max='100';number.step='1';number.required=true;input=number;
      }
      input.setAttribute('aria-label',kind==='quality'?`Qualité ${bound==='min'?'minimale':'maximale'}`:`Points de vie ${bound==='min'?'minimum':'maximum'} (%)`);
      if(bound==='min')input.dataset.storageConditionMin=kind;else input.dataset.storageConditionMax=kind;
      input.oninput=input.onchange=()=>validateConditionRange(fieldset,kind);
      boundLabel.append(input);body.append(boundLabel);
    }
    const explanation=document.createElement('small');explanation.textContent=hint;range.append(explanation);
    const feedback=document.createElement('p');feedback.className='storage-condition-feedback';feedback.dataset.storageConditionFeedback=kind;
    feedback.setAttribute('role','alert');feedback.hidden=true;range.append(feedback);
    toggle.onchange=()=>{
      body.hidden=!toggle.checked;
      for(const input of body.querySelectorAll<RangeControl>('input,select'))input.disabled=!toggle.checked;
      validateConditionRange(fieldset,kind);
    };
  }
  parent.append(fieldset);showStorageConditionControls(fieldset,conditions);return fieldset;
}

export function readStorageConditionControls(parent:ParentNode):StorageConditionSelection {
  for(const kind of ['quality','hitPoints'] as const)validateConditionRange(parent,kind);
  return storageConditionSelection(conditionRange(parent,'quality'),conditionRange(parent,'hitPoints'));
}

export function showStorageConditionControls(parent:ParentNode,conditions:StorageConditionSelection={}):void {
  for(const kind of ['quality','hitPoints'] as const){
    const toggle=parent.querySelector<HTMLInputElement>(`[data-storage-condition-toggle="${kind}"]`);
    const body=parent.querySelector<HTMLElement>(`[data-storage-condition-body="${kind}"]`);
    const min=parent.querySelector<RangeControl>(`[data-storage-condition-min="${kind}"]`);
    const max=parent.querySelector<RangeControl>(`[data-storage-condition-max="${kind}"]`);
    const range=conditions[kind],enabled=range!==undefined;
    if(toggle)toggle.checked=enabled;if(body)body.hidden=!enabled;
    if(min){min.value=String(range?.min??(kind==='quality'?'awful':0));min.disabled=!enabled;}
    if(max){max.value=String(range?.max??(kind==='quality'?'legendary':100));max.disabled=!enabled;}
    validateConditionRange(parent,kind);
  }
}

export interface StorageControlSettings extends StorageConditionSelection {
  filters:StorageFilters;
  items?:StorageItemSelection;
  priority:number;
  allowFresh?:boolean;
  allowRotten?:boolean;
}
export interface MountedStorageControls {
  element:HTMLElement;
  read():StorageControlSettings;
  show(settings:StorageControlSettings,force?:boolean):void;
  dispose():void;
}
let storageControlSerial=0;

/** A whole policy is committed on discrete changes; search and slider previews
 * never issue commands. Mounting/showing likewise never calls onChange. */
export function mountStorageControls(parent:HTMLElement,settings:StorageControlSettings,onChange:(settings:StorageControlSettings)=>void):MountedStorageControls {
  const element=document.createElement('section');element.className='storage-core-controls';element.setAttribute('aria-label','Réglages du stockage');
  const prefix=`storage-controls-${++storageControlSerial}`;
  const events=new AbortController(),listen=(node:HTMLElement,event:string,callback:()=>void)=>node.addEventListener(event,callback,{signal:events.signal});
  let selected:Set<StorageLeafId>=new Set(),disposed=false;
  let lastIncomingSettingsKey:string|undefined;
  const priorityLabel=document.createElement('label'),priority=document.createElement('select');
  priorityLabel.className='storage-core-priority';priorityLabel.append(document.createTextNode('Priorité'),priority);element.append(priorityLabel);
  priority.dataset.storagePriority='';
  for(const [value,label] of [[1,'Basse'],[2,'Normale'],[3,'Préférée'],[4,'Importante'],[5,'Critique']] as const){const option=document.createElement('option');option.value=String(value);option.textContent=label;priority.append(option);}
  const actions=document.createElement('div');actions.className='storage-core-actions';element.append(actions);
  const checks=new Map<string,{node:StorageFilterNode;check:HTMLInputElement;row:HTMLLIElement;children?:HTMLUListElement;toggle?:HTMLButtonElement;open:boolean}>();
  const emit=()=>{if(!disposed)onChange(read());};
  for(const [text,allowed] of [['Tout effacer',false],['Tout autoriser',true]] as const){
    const button=document.createElement('button');button.type='button';button.textContent=text;button.dataset.storageAll=String(allowed);
    listen(button,'click',()=>{for(const node of STORAGE_FILTER_TREE)setStorageNode(node,selected,allowed);refreshChecks();emit();});actions.append(button);
  }
  const searchLabel=document.createElement('label'),search=document.createElement('input');search.type='search';search.placeholder='Rechercher un objet…';search.dataset.storageSearch='';
  searchLabel.className='storage-core-search';searchLabel.append(document.createTextNode('Rechercher'),search);element.append(searchLabel);
  type DualRange={min:HTMLInputElement;max:HTMLInputElement;show:(low:number,high:number)=>void;values:()=>{min:number;max:number}};
  function dualRange(kind:'quality'|'hitPoints',title:string,ceiling:number,format:(value:number)=>string):DualRange{
    const group=document.createElement('fieldset');group.className='storage-core-range';
    const legend=document.createElement('legend'),output=document.createElement('output');legend.append(document.createTextNode(`${title} : `),output);group.append(legend);
    const track=document.createElement('div');track.className='storage-core-range-track';group.append(track);
    const inputs=[] as HTMLInputElement[];
    for(const bound of ['min','max'] as const){
      const input=document.createElement('input');input.type='range';input.min='0';input.max=String(ceiling);input.step='1';
      input.dataset.storageRange=kind;input.dataset.storageBound=bound;
      input.setAttribute('aria-label',`${title} ${bound==='min'?'minimum':'maximum'}`);
      inputs.push(input);track.append(input);
    }
    const [min,max]=inputs as [HTMLInputElement,HTMLInputElement];
    const refresh=()=>{
      const low=Number(min.value),high=Number(max.value);
      output.value=`${format(low)} – ${format(high)}`;
      min.setAttribute('aria-valuetext',format(low));max.setAttribute('aria-valuetext',format(high));
      track.style.setProperty('--range-low',`${low/ceiling*100}%`);track.style.setProperty('--range-high',`${high/ceiling*100}%`);
    };
    const constrain=(input:HTMLInputElement)=>{
      if(Number(min.value)>Number(max.value))input.value=input===min?max.value:min.value;
      refresh();
    };
    for(const input of inputs){listen(input,'input',()=>constrain(input));listen(input,'change',()=>{constrain(input);emit();});}
    element.append(group);
    return {min,max,values:()=>({min:Number(min.value),max:Number(max.value)}),show:(low,high)=>{
      min.value=String(low);max.value=String(high);refresh();
    }};
  }
  const hp=dualRange('hitPoints','Points de vie',100,value=>`${value} %`);
  const quality=dualRange('quality','Qualité',WEAPON_QUALITIES.length-1,value=>QUALITY_LABELS[WEAPON_QUALITIES[value]!]);
  const freshness=document.createElement('div');freshness.className='storage-core-freshness';element.append(freshness);
  const freshChecks={} as Record<'allowFresh'|'allowRotten',HTMLInputElement>;
  for(const [key,text] of [['allowRotten','Autoriser les corps pourris'],['allowFresh','Autoriser les produits frais']] as const){
    const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.dataset.storageFreshness=key;
    const caption=document.createElement('span'),indicator=document.createElement('span'),visual=document.createElement('span');caption.className='storage-core-node-text';caption.textContent=text;
    indicator.className='storage-core-indicator';visual.setAttribute('aria-hidden','true');indicator.append(check,visual);
    label.append(caption,indicator);freshness.append(label);freshChecks[key]=check;listen(check,'change',emit);
  }
  const list=document.createElement('ul');list.className='storage-core-tree';list.setAttribute('aria-label','Objets autorisés');element.append(list);
  const empty=document.createElement('p');empty.className='storage-core-empty';empty.textContent='Aucun objet ne correspond à cette recherche.';empty.hidden=true;element.append(empty);
  function build(node:StorageFilterNode,parentList:HTMLUListElement,depth:number):void{
    const row=document.createElement('li');row.dataset.storageNode=node.id;parentList.append(row);
    const line=document.createElement('div');line.className='storage-core-node';row.append(line);
    const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';
    const text=document.createElement('span');text.className='storage-core-node-text';text.textContent=node.label;
    const indicator=document.createElement('span'),visual=document.createElement('span');indicator.className='storage-core-indicator';visual.setAttribute('aria-hidden','true');
    indicator.append(check,visual);label.append(text,indicator);
    let children:HTMLUListElement|undefined,toggle:HTMLButtonElement|undefined;
    if(node.children){
      check.dataset.storageCategory=node.id;children=document.createElement('ul');children.id=`${prefix}-${node.id}`;
      toggle=document.createElement('button');toggle.type='button';toggle.className='storage-core-disclosure';toggle.setAttribute('aria-controls',children.id);toggle.setAttribute('aria-label',`Déplier ou replier ${node.label}`);line.append(toggle);
      for(const child of node.children)build(child,children,depth+1);row.append(children);
    }else {check.dataset.storageItem=node.item!;const spacer=document.createElement('span');spacer.className='storage-core-disclosure-space';line.append(spacer);if(node.item&&node.item!=='furniture'&&!['corpse','mech-corpse'].includes(ITEM_DEFINITIONS[node.item].kind)){const picture=document.createElement('img');picture.className='storage-item-model';picture.src=modelIconUrl(`item-${node.item}`);picture.alt='';picture.width=22;picture.height=22;picture.loading='lazy';label.prepend(picture);}}
    line.append(label);const entry={node,check,row,children,toggle,open:false};checks.set(node.id,entry);
    listen(check,'change',()=>{setStorageNode(node,selected,check.checked);refreshChecks();emit();});
    if(toggle)listen(toggle,'click',()=>{entry.open=!entry.open;refreshSearch();});
  }
  for(const node of STORAGE_FILTER_TREE)build(node,list,0);
  function refreshChecks():void{
    for(const {node,check} of checks.values()){
      const state=storageNodeState(node,selected);check.checked=state==='all';check.indeterminate=state==='mixed';check.setAttribute('aria-checked',state==='mixed'?'mixed':String(state==='all'));
    }
  }
  function refreshSearch():void{
    const visible=storageSearchNodes(search.value),searching=search.value.trim().length>0;
    for(const {node,row,children,toggle,open} of checks.values()){
      row.hidden=!visible.has(node.id);
      if(children&&toggle){const expanded=searching||open;children.hidden=!expanded;toggle.textContent=expanded?'▾':'▸';toggle.setAttribute('aria-expanded',String(expanded));}
    }
    empty.hidden=visible.size>0;
  }
  function read():StorageControlSettings{
    const qualities=quality.values(),points=hp.values();return {
      ...storageTreePermissions(selected),priority:Number(priority.value),hitPoints:points.min===0&&points.max===100?undefined:points,
      quality:qualities.min===0&&qualities.max===WEAPON_QUALITIES.length-1?undefined:{min:WEAPON_QUALITIES[qualities.min]!,max:WEAPON_QUALITIES[qualities.max]!},
      allowFresh:freshChecks.allowFresh.checked,allowRotten:freshChecks.allowRotten.checked,
    };
  }
  function show(next:StorageControlSettings,force=false):void{
    const incoming=storageTreeSelection(next.filters,next.items);
    const key=JSON.stringify([STORAGE_LEAVES.map(id=>incoming.has(id)?1:0),next.priority,
      next.hitPoints?.min??0,next.hitPoints?.max??100,next.quality?.min??'awful',next.quality?.max??'legendary',
      next.allowFresh!==false,next.allowRotten!==false]);
    // Publications of the same policy must not erase a local slider drag (nor
    // touch hundreds of DOM controls). Root can force a rollback after refusal.
    if(!force&&key===lastIncomingSettingsKey)return;
    lastIncomingSettingsKey=key;selected=incoming;priority.value=String(next.priority);
    hp.show(next.hitPoints?.min??0,next.hitPoints?.max??100);
    quality.show(WEAPON_QUALITIES.indexOf(next.quality?.min??'awful'),WEAPON_QUALITIES.indexOf(next.quality?.max??'legendary'));
    freshChecks.allowFresh.checked=next.allowFresh!==false;freshChecks.allowRotten.checked=next.allowRotten!==false;
    refreshChecks();refreshSearch();
  }
  listen(priority,'change',emit);listen(search,'input',refreshSearch);show(settings);parent.append(element);
  return {element,read,show,dispose:()=>{if(!disposed){disposed=true;events.abort();element.remove();}}};
}
