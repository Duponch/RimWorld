import { ITEM_DEFINITIONS, type ItemId } from '../sim/items';
import { QUALITY_LABELS,WEAPON_QUALITIES,type WeaponQuality } from '../sim/equipment-rules';

export type StorageItemSelection = Partial<Record<ItemId, boolean>>;
const GROUP_LABELS:Readonly<Record<string,string>>={neutroamine:'Neutroamine',silver:'Argent',corpse:'Dépouilles','mech-corpse':'Carcasses mécaniques',wood:'Bois',food:'Nourriture',unfinished:'Ouvrages inachevés',textile:'Textiles',chunk:'Fragments',steel:'Acier',gold:'Or',plasteel:'Plastacier',component:'Composants','advanced-component':'Composants avancés',medicine:'Médicaments',weapon:'Armes',apparel:'Vêtements',blocks:'Blocs de pierre'};

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
