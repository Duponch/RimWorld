# Validation V211 — Crises mentales

Contrôles du 5 octobre 2026, après le commit local V210 `bd27b279`. [Contrat](../development/mental-crises-v211.md), [recherche Core et adaptations](../research/mental-crises-core-v211.md). Le lot est livré dans le périmètre contrôlé : régression hors campagnes longues, cinq parcours natifs par reprises, présentation, build et documentation. Aucune campagne ou performance générale n'est déduite de ces résultats.

La migration 191→192 change seulement le numéro après validation stricte de 191. Aucun épisode, cible, menace, perte matérielle ou tirage passé n'est ajouté. Archives, payloads publics, corpus original et fichiers utilisateur sous `references_UI/` sont conservés.

## Contrôles regroupés

| Contrôle | Résultat et durée murale | Journal |
| --- | --- | --- |
| Typage d'intégration | Passe, **3,791 s**, avant les derniers correctifs de combat | `tmp/validation-runs/v211-typecheck-2026-10-04T23-49-12.122Z-25024/output.log` |
| Cohorte ciblée | **25 fichiers, 164/164 tests**, **21,387 s** | `tmp/validation-runs/v211-targeted-closure-2026-10-05T00-02-08.309Z-7856/output.log` |
| Reprise animaux et riposte | **3 fichiers, 21/21**, **6,064 s**, dont le cas supplémentaire de riposte à un animal domestique | `tmp/validation-runs/v211-animal-final-2026-10-05T00-13-21.470Z-19960/output.log` |
| Menaces, transport et combat automatique | **3 fichiers, 19/19**, **4,681 s**, après la garde d'âge finale des menaces | `tmp/validation-runs/v211-threat-gate-2026-10-05T00-14-38.121Z-28532/output.log` |
| Reprise de récupération, entrée, sauvegarde et transport | **8 fichiers, 48/48**, **7,529 s** | `tmp/validation-runs/v211-recovery-focused-2026-10-05T00-49-32.428Z-12056/output.log` |
| Typage/build des sources finales | Passe, **5,475 s**, 723 modules ; avertissement de taille des bundles conservé | `tmp/validation-runs/v211-build-delivery-2026-10-05T00-52-34.310Z-5264/output.log` |
| Présentation minage/coupe, carte250² | Passe, **116,299 s**, p95RAF **6,1/6,1 ms**, aucun saut ni occupation solide | `tmp/validation-runs/v211-presentation-2026-10-05T00-50-19.745Z-23852/output.log` |
| Régression générale finale hors treize campagnes longues | **508 fichiers, 2315 réussis, un ignoré**, **363,495 s** au lanceur | `tmp/validation-runs/v211-regression-2026-10-05T00-52-43.438Z-4900/output.log` |
| Documentation | Passe, **0,722 s**, six en-têtes192 et trois sources originales byte-identiques | `tmp/validation-runs/v211-docs-2026-10-05T01-00-58.281Z-27812/output.log` |

Le bilan ciblé unique est **25 fichiers et 166 tests réussis par reprises**, dont **44 cas dédiés V211** : admissions6, persistance5, présentation8, transport6, drivers9, menaces7 et destruction3. Ce bilan n'est pas une seconde exécution monolithique des 25 fichiers sur les sources finales. Les derniers changements de sous-tick, d'autorité animale, de menace ancienne et de récupération ont leurs reprises focalisées.

Les cas exercent degré/poids et admission spatiale, budget épuisé sans RNG ni interruption, violence involontaire d'un pacifiste sans XP, cible meurtrière stable et personne à terre, repli/riposte sans réécriture de faction, échéances Core exactes, portes, arête et récupération de frappe, sommeil réel, charge interrompue et dépôts, dégâts de bâtiment et bilans prospectifs distincts du feu. Les formes corrompues et futures sont refusées atomiquement par sauvegarde et bridge ; les changements de cible et d'état au même tick sont publiés.

## Incidents et reprises ciblés

Premier ciblé : **141/147**, six échecs. Un défaut produit réel concernait la référence devenue cadavre animal : ce cadavre conserve l'identifiant de l'animal dans la pile, et pouvait être confondu avec une fausse cible matérielle. Le validateur accepte maintenant cette seule identité historique réelle ; les autres piles/jobs/ressources restent refusés. Les autres échecs venaient d'oracles191, d'un scénario mineur encore exposé au degré extrême et d'une attente de mobilisation pacifiste interdite à tort. La mobilisation et le déplacement restent permis hors crise ; la violence volontaire reste refusée.

Reprise **159/162** : initialisation de recherche, compteur de fatigue incohérent et ordre forcé sans priorité étaient des préparations incorrectes. Les fixtures établissent désormais leurs préconditions par les admissions existantes. La revue a aussi fermé les ripostes pendant commerce ou nettoyage/extinction forcés, puis conservé l'arête et vidé seulement le futur trajet quand une autorité privée expire. Cohorte suivante164/164.

La riposte à un animal domestique exige sa menace réellement reçue, l'autorité privée et la permission du défenseur. Le premier oracle attendait une contre-frappe avant la fin du segment déjà engagé de l'animal ; il attend maintenant le contact réel. Le checkpoint suivant révélait une population de biome absente dans la fixture, corrigée vers le profil historique d'un lièvre. Reprise21/21, sans relâchement des validateurs.

La consultation de cible de mêlée reçoit maintenant le sous-tick Core courant, évitant d'expirer un délai avec l'horloge de fin du tick local. Une ancienne menace sauvegardée ne déclenche plus indéfiniment la recherche de fuite/combat après 400 Core. Contrôle19/19 et build verts.

Les précontrôles TypeScript ont aussi corrigé des unions discriminées, un tuple indexé et des types de fixtures ; le build final inclut toutes ces corrections. Les scènes mineures ont des flux explicitement sélectionnés pour leur degré mineur réel : seed1 pour la frénésie,106858330 pour l'errance, sans remappage caché de seed ni crise préparée.

## Premier parcours natif et corrections

Premier groupe : **3/5 parcours passent en 233,115 s**. La fureur violente et la colère meurtrière ont une entrée par humeur après travail réel, une approche, une frappe avec blessure, un refus d'ordre, une défense réglée par UI, la chute physique de l'agresseur, catharsis vivante et deux reprises exactes. L'errance triste existante passe à1× et6× jusqu'au sommeil/catharsis. Les trois agresseurs préparés n'ont ni crise ni dégât initial.

Le parcours de destruction a atteint une table et lui a réellement retiré sept PV ; sa fiche était sélectionnée mais ne présentait pas les PV. Défaut produit préexistant : le HUD n'affichait cette résistance que pour les barrières. Il présente maintenant les PV réels de tout bâtiment admissible, installé ou empaqueté, sans en inventer pour les objets sans définition. L'oracle42/49 PV est conservé. La capture clinique a aussi montré un texte « impact de balle » pour un stagger produit par mêlée ; le libellé parle désormais d'impact.

L'ancien parcours frénésie capturait tick3126 immédiatement après clic Pause ; le worker confirmait3127, qui était ensuite sauvegardé et repris correctement. Le test attend maintenant la pause acquittée avant son oracle, avec le même helper que les autres parcours, et passe au lanceur Chromium matériel. La comparaison exacte n'est pas supprimée. Les deux parcours échoués ont ensuite leurs reprises réussies.

La reprise de frénésie passe en **12,7 s**. La destruction passe PV et sauvegarde, mais reste figée exactement au tick3551, même en augmentant l'attente de45 à120 s. Ce constat invalide l'hypothèse d'un simple débit insuffisant : aucune mesure de cadence n'est déduite de cette attente. Le moteur/transport ont été reproduits séparément en **1,657 s** jusqu'à la première frontière invalide3552 : le dernier tabouret est détruit, une frappe reste en récupération jusqu'à35640 Core, et le driver ouvre immédiatement une arête d'errance3552→3555. `validateWorld` refuse `Invalid melee recovery` et le décodeur demande une resynchronisation. La correction porte sur cette transition productrice, sans relâcher le validateur.

La sonde conserve les Worlds avant/après dans `tmp/tantrum-invalid-world.json` ; journal `tmp/validation-runs/v211-tantrum-transport-probe-2026-10-05T00-37-17.031Z-8120/output.log`. Les preuves natives capturent désormais incident, notice, vitesses actives et World complet sur échec ; l'attente sort dès un arrêt fatal/graphique et l'annonce comme échec. Une absence de `pageerror` seule ne prouve pas que la simulation tourne.

Le driver attend désormais la fin réelle de la récupération avant de choisir une arête d'errance. La sonde complète passe en **2,447 s**, jusqu'au tick4228 et à la catharsis22228 ; `validateWorld` et le transport réel sont contrôlés à chaque tick. Un neuvième cas de driver couvre les deux destructions, cette récupération, l'errance puis la durée naturelle, avec checkpoints et reprise jumelle exacte. Sa cohorte finale **8 fichiers, 48/48** passe en **7,529 s** (`v211-recovery-focused-2026-10-05T00-49-32.428Z-12056`). Le build suivant a détecté une annotation de compteur inférée comme littéral2 dans ce seul test ; elle est corrigée vers `number`, sans changement produit.

La reprise native de destruction passe en **56,7 s Playwright, 62,110 s au lanceur** (`v211-native-tantrum-recovery-2026-10-05T00-42-21.459Z-20128`). Les PV42/49 sont affichés, la sauvegarde au tick3037 est exacte, les deux meubles sont détruits physiquement puis la crise atteint sa durée naturelle. L'attente demandée/adoptée6× observe **1196 ticks en 33,292 s** ; aucune performance générale n'est déduite de cette scène préparée. Incident fatal/graphique faux, zéro erreur de page, contrôle rendu et seconde reprise exacte. Les captures de conséquence et de fin ont été inspectées visuellement ; le nom contenant des balises demeure du texte littéral. Relevé complet et captures dans `tmp/test-runs/v211-native-tantrum-recovery-2026-10-05T00-42-21.459Z-20128/artifacts/`.

Journal : `tmp/validation-runs/v211-native-2026-10-05T00-19-27.831Z-26056/output.log`. Relevés et captures complètes pour Berserk/Murder dans `tmp/test-runs/v211-native-2026-10-05T00-19-27.831Z-26056/artifacts/` ; le relevé Tantrum est explicitement partiel. Les captures de conséquence Berserk et de fin Murder ont été inspectées visuellement. BackendWebGPU, adaptateurAMD/rdna-1, `isFallbackAdapter=false` pour les trois variantesV211 ; le premier ancien food utilisait encore le repli logiciel, son échec ne constitue pas une mesure matérielle.

## Portée, temps et limites

Les **cinq cas natifs uniques passent par reprises**, pas dans une nouvelle exécution monolithique finale : errance1×/6×, frénésie, destruction, fureur et colère meurtrière. Ils vérifient l'entrée par le producteur d'humeur, interruption de travail, conséquences et fin réellement effectuées, refus expliqué, journal, défense et sauvegardes. La dernière correction concerne la transition destruction→errance ; elle possède son parcours natif final et son test de continuation avec transport, puis la régression complète finale. Aucune réussite n'est déduite de leur préparation.

Le registre `tmp/validation-runs/ledger.jsonl` compte **24 commandes V211 avant contrôle documentaire**, soit **1152,687 s cumulées (19 min13 s)**. Ce total inclut reprises, typages, builds, sondes et lancement natif ; ce n'est ni un temps exclusif de CPU ni toute la durée du lot. La régression finale seule prend6min03s. Deux attentes natives sur le même arrêt3551 ont consommé leurs délais45/120s sans identifier le défaut ; le diagnostic fatal explicite et la sonde moteur/transport courte sont maintenant disponibles. Aucun débit de tokens/seconde n'est mesuré ; recherche, intégration, revue et coordination ne sont pas réparties artificiellement entre catégories exclusives.

La régression générale V211 est réellement exécutée sur les sources finales ; les treize campagnes longues, le navigateur exhaustif, la distribution complète des crises Core et le coût CPU/GPU général restent non établis. Agresseurs prisonniers/NPC, piles destructibles, arrestation, abandon avec sortie, invisibilité psychologique et autres crises sont différés. Population, classement spatial et cadence Tantrum ont leurs adaptations explicites ; G0–G5 restent ouverts.
