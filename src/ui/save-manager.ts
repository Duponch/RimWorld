import './save-manager.css';
import { AUTOSAVE_MINUTES } from './autosave';

export interface SaveManagerEntry {
  key: string;
  label: string;
  detail: string;
  kind: 'manual' | 'recovery' | 'named' | 'auto';
  savedAt?: number;
  revision?: string;
}

export interface SaveManagerOptions {
  getSaves: () => SaveManagerEntry[];
  onSaveNamed: (label: string, key?: string, revision?: string) => Promise<void>;
  onDelete: (key: string, revision?: string) => Promise<void>;
  onExport: () => Promise<void>;
  getAutosaveMinutes: () => number;
  onAutosaveMinutesChange: (minutes: number) => boolean;
  onChanged?: () => void;
}

type Confirmation = { action: 'overwrite' | 'delete'; entry: SaveManagerEntry };
let managerSequence = 0;

/** A storage-independent menu panel. The caller owns capture, persistence and
 * export; only named and automatic slots can be managed from this panel. */
export function createSaveManager(root: HTMLElement, options: SaveManagerOptions): {
  refresh(): void;
  setBlocked(blocked: boolean): void;
} {
  const prefix = `save-manager-${++managerSequence}`;
  const host = document.createElement('fieldset');
  host.className = 'save-manager';
  host.dataset.saveManager = '';
  const legend = document.createElement('legend');
  legend.textContent = 'Sauvegardes';

  const form = document.createElement('form');
  form.className = 'save-manager-create';
  form.noValidate = true;
  const nameLabel = document.createElement('label');
  nameLabel.htmlFor = `${prefix}-name`;
  nameLabel.textContent = 'Nouvelle sauvegarde nommée';
  const nameInput = document.createElement('input');
  nameInput.id = nameLabel.htmlFor;
  nameInput.type = 'text';
  nameInput.maxLength = 64;
  nameInput.required = true;
  nameInput.autocomplete = 'off';
  nameInput.placeholder = 'Nom de la sauvegarde';
  nameInput.dataset.saveManagerName = '';
  const nameHint = document.createElement('small');
  nameHint.id = `${prefix}-name-hint`;
  nameHint.textContent = '64 caractères maximum. Chaque création conserve les autres sauvegardes.';
  nameInput.setAttribute('aria-describedby', nameHint.id);

  const button = (label: string, action: string): HTMLButtonElement => {
    const node = document.createElement('button');
    node.type = 'button';
    node.textContent = label;
    node.dataset.saveManagerAction = action;
    return node;
  };
  const create = button('Créer une sauvegarde', 'create');
  create.type = 'submit';
  form.append(nameLabel, nameInput, create, nameHint);

  const listHeading = document.createElement('h3');
  listHeading.id = `${prefix}-list-heading`;
  listHeading.textContent = 'Sauvegardes nommées et automatiques';
  const list = document.createElement('div');
  list.className = 'save-manager-list';
  list.dataset.saveManagerList = '';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-labelledby', listHeading.id);
  const empty = document.createElement('p');
  empty.className = 'save-manager-empty';
  empty.textContent = 'Aucune sauvegarde nommée ou automatique. Vous pouvez en créer une ci-dessus.';
  const actions = document.createElement('div');
  actions.className = 'save-manager-actions';
  const overwrite = button('Remplacer la sélection', 'overwrite');
  const remove = button('Supprimer la sélection', 'delete');
  actions.append(overwrite, remove);

  const confirmationBox = document.createElement('div');
  confirmationBox.className = 'save-manager-confirmation';
  confirmationBox.hidden = true;
  confirmationBox.setAttribute('role', 'group');
  const confirmationText = document.createElement('p');
  confirmationText.id = `${prefix}-confirmation`;
  confirmationBox.setAttribute('aria-labelledby', confirmationText.id);
  const confirmationActions = document.createElement('div');
  confirmationActions.className = 'save-manager-actions';
  const cancel = button('Annuler', 'cancel');
  const confirm = button('Confirmer', 'confirm');
  confirmationActions.append(cancel, confirm);
  confirmationBox.append(confirmationText, confirmationActions);

  const autosaveLabel = document.createElement('label');
  autosaveLabel.className = 'save-manager-autosave';
  const autosaveCaption = document.createElement('span');
  autosaveCaption.textContent = 'Sauvegarde automatique';
  const autosave = document.createElement('select');
  autosave.dataset.saveManagerAutosave = '';
  for (const minutes of AUTOSAVE_MINUTES) {
    const choice = document.createElement('option');
    choice.value = String(minutes);
    choice.textContent = minutes === 0 ? 'Désactivée' : `${minutes} min${minutes === 5 ? ' (par défaut)' : ''}`;
    autosave.append(choice);
  }
  const autosaveHint = document.createElement('p');
  autosaveHint.className = 'save-manager-hint';
  autosaveHint.id = `${prefix}-autosave-hint`;
  autosaveHint.textContent = 'Intervalle en minutes réelles pendant la partie. Les trois dernières copies automatiques sont conservées.';
  autosave.setAttribute('aria-describedby', autosaveHint.id);
  autosaveLabel.append(autosaveCaption, autosave);
  const exportButton = button('Exporter la partie actuelle', 'export');
  exportButton.className = 'save-manager-export';
  const status = document.createElement('p');
  status.className = 'save-manager-status';
  status.dataset.saveManagerStatus = '';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  host.append(legend, form, listHeading, list, empty, actions, confirmationBox, autosaveLabel, autosaveHint, exportButton, status);
  root.replaceChildren(host);

  let entries: SaveManagerEntry[] = [];
  let selectedKey: string | undefined;
  let confirmation: Confirmation | undefined;
  let pending = false;
  let blocked = false;
  const rows = new Map<string, HTMLButtonElement>();

  const feedback = (state: 'pending' | 'success' | 'error' | 'idle', message: string): void => {
    status.dataset.state = state;
    status.textContent = message;
  };
  const selected = (): SaveManagerEntry | undefined => entries.find(entry => entry.key === selectedKey);
  const unavailable = (): boolean => blocked || pending;
  function syncControls(): void {
    const disabled = unavailable();
    const confirming = confirmation !== undefined;
    host.setAttribute('aria-busy', String(disabled));
    nameInput.disabled = create.disabled = autosave.disabled = exportButton.disabled = disabled || confirming;
    overwrite.disabled = disabled || confirming || selected()?.kind !== 'named';
    remove.disabled = disabled || confirming || selected() === undefined;
    cancel.disabled = confirm.disabled = disabled;
    for (const [key, row] of rows) {
      row.disabled = disabled || confirming;
      row.setAttribute('aria-pressed', String(key === selectedKey));
    }
    confirmationBox.hidden = !confirming;
  }

  function refresh(): void {
    try {
      entries = options.getSaves().filter(entry => entry.kind === 'named' || entry.kind === 'auto');
      const previousIndex = [...rows.keys()].indexOf(selectedKey ?? '');
      if (!entries.some(entry => entry.key === selectedKey)) {
        selectedKey = entries[Math.max(0, Math.min(previousIndex, entries.length - 1))]?.key;
      }
      const focused = document.activeElement;
      let lostRowFocus = false;
      const liveKeys = new Set(entries.map(entry => entry.key));
      for (const [key, row] of rows) {
        if (liveKeys.has(key)) continue;
        lostRowFocus ||= focused === row;
        row.remove();
        rows.delete(key);
      }
      let position: Element | null = list.firstElementChild;
      for (const entry of entries) {
        let row = rows.get(entry.key);
        if (!row) {
          row = button('', 'select');
          row.className = 'save-manager-entry';
          row.dataset.saveManagerKey = entry.key;
          const label = document.createElement('strong');
          const detail = document.createElement('small');
          row.append(label, detail);
          const key = entry.key;
          row.addEventListener('click', () => {
            if (unavailable() || confirmation) return;
            selectedKey = key;
            syncControls();
          });
          rows.set(key, row);
        }
        row.children[0]!.textContent = entry.label;
        row.children[1]!.textContent = `${entry.kind === 'auto' ? 'Automatique' : 'Nommée'}${entry.savedAt===undefined?'':` · ${new Date(entry.savedAt).toLocaleString('fr-FR')}`}${entry.detail ? ` · ${entry.detail}` : ''}`;
        if (row !== position) list.insertBefore(row, position);
        position = row.nextElementSibling;
      }
      empty.hidden = entries.length > 0;
      const target = confirmation?.entry;
      if (target && !entries.some(entry => entry.key === target.key && entry.label === target.label && entry.kind === target.kind && entry.savedAt === target.savedAt && entry.detail === target.detail && entry.revision===target.revision)) {
        const wasFocused = confirmationBox.contains(focused);
        confirmation = undefined;
        feedback('error', 'La sauvegarde sélectionnée a changé. Sélectionnez-la à nouveau avant de confirmer.');
        lostRowFocus ||= wasFocused;
      }
      const minutes = options.getAutosaveMinutes();
      autosave.value = String(AUTOSAVE_MINUTES.some(value => value === minutes) ? minutes : 5);
      syncControls();
      if (lostRowFocus && !unavailable()) (rows.get(selectedKey ?? '') ?? nameInput).focus();
    } catch (error) {
      confirmation = undefined;
      entries = [];
      selectedKey = undefined;
      for (const row of rows.values()) row.remove();
      rows.clear();
      empty.hidden = false;
      feedback('error', `Impossible de lire les sauvegardes : ${error instanceof Error ? error.message : String(error)}`);
      syncControls();
    }
  }

  async function run(operation: () => Promise<void>, pendingText: string, successText: string, focus: () => HTMLElement, changed = true): Promise<void> {
    if (unavailable()) return;
    pending = true;
    confirmation = undefined;
    feedback('pending', pendingText);
    syncControls();
    try {
      await operation();
      feedback('success', successText);
      if (changed) options.onChanged?.();
    } catch (error) {
      feedback('error', `Échec : ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      pending = false;
      if (changed) refresh();
      else syncControls();
      if (!blocked && host.isConnected) focus().focus();
    }
  }

  nameInput.addEventListener('input', () => nameInput.removeAttribute('aria-invalid'));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (unavailable() || confirmation) return;
    const label = nameInput.value.trim();
    if (!label || label.length > 64) {
      nameInput.setAttribute('aria-invalid', 'true');
      feedback('error', 'Saisissez un nom de 1 à 64 caractères.');
      nameInput.focus();
      return;
    }
    void run(async () => {
      await options.onSaveNamed(label);
      nameInput.value = '';
    }, `Création de « ${label} »…`, `Sauvegarde « ${label} » créée.`, () => nameInput);
  });

  function ask(action: Confirmation['action']): void {
    if (unavailable() || confirmation) return;
    refresh();
    const entry = selected();
    if (!entry || (action === 'overwrite' && entry.kind !== 'named')) return;
    confirmation = { action, entry: { ...entry } };
    confirmationText.textContent = action === 'overwrite'
      ? `Remplacer « ${entry.label} » par la partie actuelle ? Le contenu précédent sera perdu.`
      : `Supprimer ${entry.kind === 'auto' ? 'la copie automatique' : 'la sauvegarde'} « ${entry.label} » ? Cette suppression est définitive.`;
    confirm.textContent = action === 'overwrite' ? 'Remplacer cette sauvegarde' : 'Supprimer cette sauvegarde';
    feedback('idle', '');
    syncControls();
    cancel.focus();
  }
  overwrite.addEventListener('click', () => ask('overwrite'));
  remove.addEventListener('click', () => ask('delete'));
  function cancelConfirmation(): void {
    if (unavailable() || !confirmation) return;
    const action = confirmation.action;
    confirmation = undefined;
    syncControls();
    (action === 'overwrite' ? overwrite : remove).focus();
  }
  cancel.addEventListener('click', cancelConfirmation);
  confirmationBox.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    cancelConfirmation();
  });
  confirm.addEventListener('click', () => {
    if (unavailable() || !confirmation) return;
    refresh();
    if (!confirmation) return;
    const { action, entry } = confirmation;
    if (action === 'overwrite') {
      void run(() => options.onSaveNamed(entry.label, entry.key,entry.revision), `Remplacement de « ${entry.label} »…`, `Sauvegarde « ${entry.label} » remplacée.`, () => rows.get(entry.key) ?? nameInput);
    } else {
      void run(() => options.onDelete(entry.key,entry.revision), `Suppression de « ${entry.label} »…`, `Sauvegarde « ${entry.label} » supprimée.`, () => rows.get(selectedKey ?? '') ?? nameInput);
    }
  });
  autosave.addEventListener('change', () => {
    if (unavailable() || confirmation) return;
    const minutes = Number(autosave.value);
    try {
      if (!options.onAutosaveMinutesChange(minutes)) {
        feedback('error', 'Impossible d’enregistrer la fréquence des sauvegardes automatiques.');
      } else {
        feedback('success', minutes === 0 ? 'Sauvegarde automatique désactivée.' : `Sauvegarde automatique toutes les ${minutes} minutes réelles.`);
        options.onChanged?.();
      }
    } catch (error) {
      feedback('error', `Échec du réglage : ${error instanceof Error ? error.message : String(error)}`);
    }
    refresh();
  });
  exportButton.addEventListener('click', () => {
    if (confirmation) return;
    void run(options.onExport, 'Préparation de l’export de la partie actuelle…', 'Export de la partie actuelle préparé.', () => exportButton, false);
  });
  refresh();
  return {
    refresh,
    setBlocked(value: boolean): void {
      blocked = value;
      if (!pending) {
        if (blocked) feedback('pending', 'Une opération est en cours. Les commandes de sauvegarde sont momentanément indisponibles.');
        else if (status.dataset.state === 'pending') feedback('idle', '');
      }
      syncControls();
    },
  };
}
