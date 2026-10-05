import type { World } from '../sim/types.ts';
import { validatePlanetContext, sameValidatedPlanetGeography, type PlanetValidationContext } from '../sim/planet-validation-context.ts';

type PlanetPreparationFailure = { readonly ok: false; readonly errors: readonly string[] };
export type ValidatedPlanetPreparation = PlanetPreparationFailure | {
  readonly ok: true; readonly context: PlanetValidationContext; readonly geographyChanged: boolean;
};
export type AbsentPlanetPreparation = PlanetPreparationFailure | {
  readonly ok: true; readonly context: undefined; readonly geographyChanged: boolean;
};
export type PlanetPreparation = ValidatedPlanetPreparation | AbsentPlanetPreparation;
type Accepted = {
  readonly epoch: number;
  readonly context: PlanetValidationContext;
  readonly present: boolean;
  readonly nextGroupId: number | undefined;
} | {
  readonly epoch: number;
  readonly context: undefined;
  readonly present: false;
  readonly nextGroupId: undefined;
};

/** One decoder owns one primitive-copy witness, never a mutable World or
 * packet. Planetary preparations check the complete raw geography even at
 * the same tick; a new epoch through prepare is always cold-validated. True
 * absence records only its epoch, preserving the historical no-owner branch. */
export class PlanetValidationCache {
  #accepted: Accepted | undefined;
  #pending: { result: PlanetPreparation; accepted: Accepted } | undefined;

  prepare(world: World, version: number, epoch: number): ValidatedPlanetPreparation {
    this.#pending = undefined;
    if (!Number.isSafeInteger(epoch) || epoch < 1) return { ok: false, errors: ['Invalid planet publication epoch.'] };
    const accepted = this.#accepted;
    const before = accepted && accepted.epoch === epoch ? accepted : undefined;
    const checked = validatePlanetContext(world, version, before?.context);
    if (!checked.ok) return checked;
    // Delay a valid geography replacement to the existing immutability guard:
    // group, projectile and Bomb refusals retain their original precedence.
    const geographyChanged = !!(before?.present && (!checked.present
      || !sameValidatedPlanetGeography(before.context, checked.context)
      || checked.nextGroupId === undefined || before.nextGroupId === undefined
      || checked.nextGroupId < before.nextGroupId));
    const result: ValidatedPlanetPreparation = { ok: true, context: checked.context, geographyChanged };
    this.#pending = { result, accepted: {
      epoch, context: checked.context, present: checked.present, nextGroupId: checked.nextGroupId,
    } };
    return result;
  }

  /** The decoder's historical no-owner branch has no planetary/version guard.
   * Retain only that absence, not a capability usable for group validation.
   * The previous epoch is cleared exclusively by the common final commit. */
  prepareAbsence(epoch: number): AbsentPlanetPreparation {
    this.#pending = undefined;
    if (!Number.isSafeInteger(epoch) || epoch < 1) return { ok: false, errors: ['Invalid planet publication epoch.'] };
    const before = this.#accepted;
    const geographyChanged = !!(before?.epoch === epoch && before.present);
    const result: AbsentPlanetPreparation = { ok: true, context: undefined, geographyChanged };
    this.#pending = { result, accepted: { epoch, context: undefined, present: false, nextGroupId: undefined } };
    return result;
  }

  /** Called only after every guard passes, before any decoder state changes.
   * An abandoned preparation cannot replace the last accepted witness. */
  commit(result: PlanetPreparation): boolean {
    const pending = this.#pending;
    if (!pending || !result.ok || result.geographyChanged || pending.result !== result) return false;
    this.#accepted = pending.accepted;
    this.#pending = undefined;
    return true;
  }
}
