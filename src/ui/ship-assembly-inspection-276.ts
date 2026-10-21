import {isShipPartKind276} from '../sim/ship-part-content-276';
import {indexShipParts276,readShipAssembly276,type ShipPartIndexResult276,type ShipAssemblyReport276} from '../sim/ship-part-reader-276';
import type {Structure,World} from '../sim/types';

type Cache276={structures:readonly Structure[];length:number;width:number;height:number;index:ShipPartIndexResult276<Structure>;reports:Map<number,ShipAssemblyReport276<Structure>>};
// Confirmed MAIN snapshots preserve unchanged structure-array identities. Keep
// only this inspector's latest index; no campaign/world cache is serialized.
const caches=new WeakMap<HTMLElement,Cache276>();
function read(root:HTMLElement,w:World,id:number):ShipAssemblyReport276<Structure>|undefined {
 let cache=caches.get(root);
 if(!cache||cache.structures!==w.structures||cache.length!==w.structures.length||cache.width!==w.width||cache.height!==w.height){
  cache={structures:w.structures,length:w.structures.length,width:w.width,height:w.height,index:indexShipParts276(w.structures,w.width,w.height),reports:new Map()};caches.set(root,cache);
 }
 if(!cache.index.ok)return;
 let report=cache.reports.get(id);if(!report){report=readShipAssembly276(cache.index.index,id);cache.reports.set(id,report);}return report;
}

/** Structural report only. Missing future components remain visible without
 * offering a launch command or allocating a graph on every rendered frame. */
export function updateShipAssemblyInspection276(root:HTMLElement,w:World,s:Structure|undefined):void {
 let section=root.querySelector<HTMLDetailsElement>('[data-ship-assembly]');
 if(w.schemaVersion!==276||!s||!isShipPartKind276(s.kind)){section?.remove();caches.delete(root);return;}
 if(!section){section=root.ownerDocument.createElement('details');section.dataset.shipAssembly='';root.querySelector('.cell-card')?.append(section);}
 const doc=root.ownerDocument,report=read(root,w,s.id);
 let summary=section.querySelector('summary');if(!summary){summary=doc.createElement('summary');section.append(summary);}
 let body=section.querySelector('p');if(!body){body=doc.createElement('p');body.style.whiteSpace='pre-line';section.append(body);}
 const title=report?.ok?`Vaisseau relié · ${report.partIds.length} pièce${report.partIds.length===1?'':'s'}`:'Vaisseau relié';
 if(summary.textContent!==title)summary.textContent=title;
 const text=report?.ok?report.requirements.map(row=>`${row.label} : ${row.present}/${row.required}`).join('\n')
  +`\nRéacteurs opérationnels : ${report.parts.filter(p=>p.kind==='ship-reactor'&&p.source.shipReactor275?.state==='running').length}/${report.counts.reactor}`
  +'\nUn caisson spatial occupé sera nécessaire au départ.':'Assemblage indisponible.';
 if(body.textContent!==text)body.textContent=text;
}
