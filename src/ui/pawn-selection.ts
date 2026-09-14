import type { SelectionGesture } from '../render/PawnSelectionInput';

/** Presentation state; a selected group never becomes a simulation entity. */
export class PawnSelection {
  ids=new Set<number>();
  get single():number|undefined{return this.ids.size===1?this.ids.values().next().value:undefined;}
  apply(gesture:SelectionGesture,available:ReadonlySet<number>):void {
    const next=gesture.additive?new Set(this.ids):new Set<number>();
    for(const id of gesture.ids)if(available.has(id)) {
      if(gesture.toggle&&next.has(id))next.delete(id);else next.add(id);
    }
    this.ids=new Set([...next].filter(id=>available.has(id)));
  }
  clear():void {this.ids=new Set();}
}
