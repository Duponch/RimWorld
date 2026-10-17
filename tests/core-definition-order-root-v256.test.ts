import {expect,test} from 'vitest';
import {CORE_4871_GEN_STEP_DEFS,CORE_4871_PAWN_KIND_DEFS,CORE_4871_PAWN_KIND_ORDER,CORE_4871_DEF_ORDER_PROVENANCE} from '../src/sim/core-definition-order-4871';
import {ancientStepOrder256} from '../src/sim/local-ancient-placement-256';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256';
test('the observed complete native databases retain real indices and the750tie order',()=>{
 expect(CORE_4871_GEN_STEP_DEFS).toHaveLength(42);expect(CORE_4871_PAWN_KIND_DEFS).toHaveLength(107);
 expect(CORE_4871_GEN_STEP_DEFS.map(d=>d.index)).toEqual(Array.from({length:42},(_,i)=>i));expect(CORE_4871_PAWN_KIND_DEFS.map(d=>d.index)).toEqual(Array.from({length:107},(_,i)=>i));
 const shrines=CORE_4871_GEN_STEP_DEFS.find(d=>d.defName==='ScatterShrines')!,ruins=CORE_4871_GEN_STEP_DEFS.find(d=>d.defName==='ScatterRuinsSimple')!;expect(shrines.order).toBe(750);expect(ruins.order).toBe(750);expect(ancientStepOrder256({shrines:shrines.index,ruins:ruins.index})).toEqual(['shrines','ruins']);
 for(const fact of Object.values(INITIAL_ANIMAL_FACTS_256))expect(CORE_4871_PAWN_KIND_ORDER).toContain(fact.defId);expect(new Set(CORE_4871_PAWN_KIND_ORDER).size).toBe(107);expect(Object.isFrozen(CORE_4871_PAWN_KIND_ORDER)).toBe(true);
 expect(CORE_4871_DEF_ORDER_PROVENANCE.distributionVersion).toBe('1.6.4871 rev590');expect(CORE_4871_DEF_ORDER_PROVENANCE.gameVersion).toBe('1.6.4871 rev591');expect(CORE_4871_DEF_ORDER_PROVENANCE.cleanStartup).toBe(false);expect(CORE_4871_DEF_ORDER_PROVENANCE.graphicsValidated).toBe(false);
});
