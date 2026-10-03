import type { apparelAppearance } from '../render/character-apparel';
import { appearanceOf } from '../sim/pawn-appearance';
import type { Pawn, World } from '../sim/types';
import { portraitDataUrl,portraitExpressionOf } from './pawn-portrait';
import { humanLimbVisualMask } from '../render/human-anatomy-presentation';

type ApparelLook = ReturnType<typeof apparelAppearance>;

/** The one cached portrait belongs to the compact lower summary, never Bio. */
export function updatePawnAppearanceInspection(container: HTMLElement, world: World, pawn: Pawn, look: ApparelLook, weaponItem?: string): void {
  const summary=container.querySelector<HTMLElement>('.colonist-inspector-summary');
  if(!summary)return;
  const appearance = appearanceOf(pawn, world.seed);
  const expression=portraitExpressionOf(pawn);
  const limbMask=humanLimbVisualMask(pawn);
  let section = summary.querySelector<HTMLElement>('.appearance-inspection');
  if (!section) {
    section = document.createElement('div');
    section.className = 'appearance-inspection';
    const image = document.createElement('img');
    image.className = 'appearance-inspection-portrait';
    image.width = 88; image.height = 88;
    section.append(image);summary.prepend(section);
  }
  const key = [pawn.id, pawn.name, pawn.appearance ? 'saved' : 'projection',
    appearance.version, appearance.sex, appearance.bodyType, appearance.headType,
    appearance.hair, appearance.beard, appearance.skinColor, appearance.hairColor,
    look.signature, look.color ?? '', look.vest, look.helmet, look.reconHelmet, look.silhouette, look.pants, weaponItem ?? '',expression,limbMask].join('|');
  if (section.dataset.appearanceKey === key) return;
  section.dataset.appearanceKey = key;
  const image = section.querySelector<HTMLImageElement>('.appearance-inspection-portrait')!;
  image.src = portraitDataUrl(appearance, look, weaponItem, expression,limbMask);
  image.alt = `Portrait de ${pawn.name}`;
}
