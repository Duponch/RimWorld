import { isColonist } from '../sim/affiliation';
import { scoutEligible } from '../sim/caravan-trip';
import { ITEM_DEFINITIONS } from '../sim/items';
import { TICKS_PER_DAY, type Cell, type Command, type World } from '../sim/types';

const countRations = (world: World, pawnId: number): number => world.piles.reduce((sum, pile) =>
  sum + (pile.item === 'survival-meal' && pile.owner.type === 'inventory' && pile.owner.pawnId === pawnId ? pile.quantity : 0), 0);

function replaceOptions(select: HTMLSelectElement, entries: readonly (readonly [number, string])[]): void {
  const signature = entries.map(([id, label]) => `${id}:${label}`).join('|');
  if (select.dataset.signature === signature) return;
  const previous = select.value;
  select.replaceChildren(...entries.map(([id, label]) => {
    const option = document.createElement('option');
    option.value = String(id);
    option.textContent = label;
    return option;
  }));
  select.dataset.signature = signature;
  if (entries.some(([id]) => String(id) === previous)) select.value = previous;
}

/** Keeps the selectors stable while snapshots refresh the text each tick. */
export function createScoutUI(root: HTMLElement, send: (command: Command) => void): { update: (world: World) => void } {
  const heading = document.createElement('h2'); heading.textContent = 'Monde · reconnaissance';
  const intro = document.createElement('p'); intro.textContent = 'Un colon part six heures, puis revient au même foyer. Ce circuit individuel reste abstrait et ne suit pas une route du globe.';
  const form = document.createElement('div'); form.className = 'scout-form';
  const pawnLabel = document.createElement('label'); pawnLabel.textContent = 'Colon ';
  const pawnSelect = document.createElement('select'); pawnSelect.id = 'scout-pawn'; pawnSelect.setAttribute('aria-label', 'Colon pour la reconnaissance'); pawnLabel.append(pawnSelect);
  const pileLabel = document.createElement('label'); pileLabel.textContent = 'Rations au sol ';
  const pileSelect = document.createElement('select'); pileSelect.id = 'scout-pile'; pileSelect.setAttribute('aria-label', 'Pile de repas de survie'); pileLabel.append(pileSelect);
  const quantityLabel = document.createElement('label'); quantityLabel.textContent = 'Quantité ';
  const quantitySelect = document.createElement('select'); quantitySelect.id = 'scout-quantity'; quantitySelect.setAttribute('aria-label', 'Nombre de repas de survie');
  for (const quantity of [2, 3] as const) { const option = document.createElement('option'); option.value = String(quantity); option.textContent = String(quantity); quantitySelect.append(option); }
  quantityLabel.append(quantitySelect);
  const start = document.createElement('button'); start.id = 'scout-start'; start.type = 'button'; start.textContent = 'Préparer la reconnaissance';
  form.append(pawnLabel, pileLabel, quantityLabel, start);
  const status = document.createElement('p'); status.id = 'scout-status'; status.setAttribute('role', 'status');
  const needs = document.createElement('p'); needs.id = 'scout-needs';
  const possessions = document.createElement('p'); possessions.id = 'scout-possessions';
  const cancel = document.createElement('button'); cancel.id = 'scout-cancel'; cancel.type = 'button'; cancel.textContent = 'Annuler la préparation';
  const unloadList = document.createElement('div'); unloadList.id = 'scout-unload-list';
  const note = document.createElement('p'); note.className = 'muted'; note.textContent = 'Le chargement et la sortie demandent un déplacement réel. Les rations restantes sont déposées au bord au retour ; aucun butin n’est créé.';
  const feedback = document.createElement('p'); feedback.id = 'scout-feedback'; feedback.setAttribute('role', 'alert');
  root.replaceChildren(heading, intro, form, status, needs, possessions, cancel, unloadList, note, feedback);

  let current: World | undefined;
  let trackedPawnId: number | undefined;
  let lastEntry: Cell | undefined;
  let wasOffMap = false;
  pawnSelect.onchange = () => { trackedPawnId = Number(pawnSelect.value); if (current) update(current); };
  pileSelect.onchange = () => { if (current) update(current); };
  quantitySelect.onchange = () => { if (current) update(current); };
  start.onclick = () => {
    const pawnId = Number(pawnSelect.value), pileId = Number(pileSelect.value), quantity = Number(quantitySelect.value);
    if (!current || !Number.isSafeInteger(pawnId) || !Number.isSafeInteger(pileId) || (quantity !== 2 && quantity !== 3)) return;
    trackedPawnId = pawnId;
    feedback.textContent = '';
    try { send({ type: 'scout-start', pawnId, pileId, quantity }); }
    catch (error) { feedback.textContent = error instanceof Error ? error.message : String(error); }
  };
  cancel.onclick = () => {
    feedback.textContent = '';
    try { send({ type: 'scout-cancel' }); }
    catch (error) { feedback.textContent = error instanceof Error ? error.message : String(error); }
  };
  function update(world: World): void {
    current = world;
    const scout = world.scout;
    form.hidden = !!scout;
    cancel.hidden = !scout || (scout.phase !== 'loading' && scout.phase !== 'leaving');
    unloadList.hidden = !!scout;
    if (!scout) {
      if (wasOffMap && trackedPawnId !== undefined) {
        const returnedPawn = world.pawns.find(pawn => pawn.id === trackedPawnId);
        if (returnedPawn) lastEntry = { x: returnedPawn.x, z: returnedPawn.z };
      }
      wasOffMap = false;
      const unloadable = world.pawns.filter(pawn => {
        if (!isColonist(pawn) || pawn.visitor || pawn.prisoner) return false;
        const inventory = world.piles.filter(pile => pile.owner.type === 'inventory' && pile.owner.pawnId === pawn.id);
        return inventory.length === 1 && inventory[0]?.item === 'survival-meal' && inventory[0].quantity >= 1 && inventory[0].quantity <= 3;
      });
      const unloadSignature = unloadable.map(pawn => `${pawn.id}:${pawn.name}:${countRations(world, pawn.id)}`).join('|');
      if (unloadList.dataset.signature !== unloadSignature) {
        unloadList.dataset.signature = unloadSignature;
        unloadList.replaceChildren(...unloadable.map(pawn => {
          const button = document.createElement('button');
          button.id = `scout-unload-${pawn.id}`;
          button.type = 'button';
          button.textContent = `Décharger les rations de ${pawn.name} (${countRations(world, pawn.id)})`;
          button.onclick = () => { feedback.textContent = ''; try { send({ type: 'scout-unload', pawnId: pawn.id }); } catch (error) { feedback.textContent = error instanceof Error ? error.message : String(error); } };
          return button;
        }));
      }
      const candidates = world.pawns.filter(pawn => scoutEligible(world, pawn) === null);
      replaceOptions(pawnSelect, candidates.map(pawn => [pawn.id, pawn.name] as const));
      const piles = world.piles.filter(pile => pile.item === 'survival-meal' && pile.owner.type === 'ground' && pile.quantity >= 2 && !pile.foodPoison);
      replaceOptions(pileSelect, piles.flatMap(pile => pile.owner.type === 'ground' ? [[pile.id, `Pile ${pile.id} · ${pile.quantity} repas · (${pile.owner.x}, ${pile.owner.z})`] as const] : []));
      if (trackedPawnId !== undefined && candidates.some(pawn => pawn.id === trackedPawnId)) pawnSelect.value = String(trackedPawnId);
      else if (trackedPawnId === undefined || !world.pawns.some(pawn => pawn.id === trackedPawnId)) trackedPawnId = pawnSelect.value ? Number(pawnSelect.value) : undefined;
      const selectedPile = piles.find(pile => pile.id === Number(pileSelect.value));
      const three = quantitySelect.querySelector<HTMLOptionElement>('option[value="3"]')!;
      three.disabled = !selectedPile || selectedPile.quantity < 3;
      if (three.disabled && quantitySelect.value === '3') quantitySelect.value = '2';
      start.disabled = !candidates.length || !selectedPile;
      status.textContent = candidates.length ? 'Choisissez un colon et une pile de rations. Le foyer continue de vivre pendant son absence.' : 'Aucun colon libre admissible pour le départ.';
      const tracked = trackedPawnId === undefined ? undefined : world.pawns.find(pawn => pawn.id === trackedPawnId);
      needs.textContent = tracked ? `${tracked.name} · faim ${Math.round(tracked.hunger)} % · repos ${Math.round(tracked.rest)} %.` : '';
      const returned = lastEntry ? world.piles.filter(pile => pile.item === 'survival-meal' && pile.owner.type === 'ground' && pile.owner.x === lastEntry!.x && pile.owner.z === lastEntry!.z).reduce((sum, pile) => sum + pile.quantity, 0) : 0;
      possessions.textContent = tracked ? `Inventaire de ${tracked.name} : ${countRations(world, tracked.id)} repas de survie.${lastEntry ? ` Au dernier point d’entrée (${lastEntry.x}, ${lastEntry.z}) : ${returned} repas actuellement au sol.` : ''}` : '';
      return;
    }
    const offMap = scout.phase === 'travelling' || scout.phase === 'awaiting-entry';
    if (offMap) { lastEntry = scout.entry; wasOffMap = true; }
    const pawn = 'pawn' in scout ? scout.pawn : world.pawns.find(candidate => candidate.id === scout.pawnId);
    if (pawn) trackedPawnId = pawn.id;
    const name = pawn?.name ?? 'Le colon';
    if (scout.phase === 'loading') status.textContent = `${name} rejoint la pile ${scout.sourcePileId} pour charger ${scout.quantity} repas au contact.`;
    else if (scout.phase === 'leaving') status.textContent = `${name} porte ${scout.quantity} repas et marche vers une bordure accessible.`;
    else if (scout.phase === 'travelling') {
      const hours = Math.max(0, Math.ceil((scout.returnAt - world.tick) * 24 / TICKS_PER_DAY));
      status.textContent = `${name} est hors carte · reconnaissance abstraite · retour prévu dans ${hours} h de jeu.`;
    } else status.textContent = `${name} a terminé le circuit et attend une case libre au bord de la même colonie. Ses besoins restent figés pendant cette attente.`;
    needs.textContent = pawn ? `${name} · faim ${Math.round(pawn.hunger)} % · repos ${Math.round(pawn.rest)} %.` : '';
    const carried = offMap ? scout.items.filter(pile => pile.item === 'survival-meal').reduce((sum, pile) => sum + pile.quantity, 0) : pawn ? countRations(world, pawn.id) : 0;
    const equipment = offMap ? scout.items.filter(pile => pile.owner.type === 'equipment' || pile.owner.type === 'apparel').map(pile => ITEM_DEFINITIONS[pile.item].label).join(', ') : '';
    possessions.textContent = `Repas de survie dans l’inventaire : ${carried}${offMap ? ` · consommés pendant le trajet : ${scout.consumed}` : ''}.${equipment ? ` Équipement et vêtements conservés : ${equipment}.` : ''}`;
  }
  return { update };
}
