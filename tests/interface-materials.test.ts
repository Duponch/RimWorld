import { expect, test } from 'vitest';
import { toolDefinitions } from '../src/ui/layout';
import { placementMaterial } from '../src/ui/construction-controls';
import { constructionRecipe, validConstructionMaterial } from '../src/sim/construction-materials';
import { CONSTRUCTION_MATERIALS } from '../src/sim/building-materials';
import type { JobKind } from '../src/sim/types';
import { toolCursorKind, TOOL_CURSOR_KINDS } from '../src/ui/tool-cursors';

test('every Architect material transition offers an actual recipe, including upholstered armchairs',()=>{
  for(const previous of CONSTRUCTION_MATERIALS){
    for(const tool of toolDefinitions){
      const material=placementMaterial(tool.id,previous);
      if(!material)continue;
      expect(validConstructionMaterial(tool.id,material),`${tool.id} from ${previous}`).toBe(true);
      expect(constructionRecipe({kind:tool.id as JobKind,material}).ingredients).toBeInstanceOf(Array);
    }
  }
  expect(placementMaterial('armchair','wood')).toBe('cloth');
  expect(placementMaterial('wall','cloth')).toBe('wood');
});

test('all tools have a cursor and removal/building intentions remain distinct',()=>{
  for(const tool of toolDefinitions)expect(TOOL_CURSOR_KINDS).toContain(toolCursorKind(tool.id));
  expect(toolCursorKind('remove-floor')).toBe('deconstruct');
  expect(toolCursorKind('stockpile')).toBe('zones');
  expect(toolCursorKind('bed')).toBe('build');
  expect(toolCursorKind('cancel')).toBe('cancel');
});
