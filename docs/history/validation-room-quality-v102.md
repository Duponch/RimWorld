# Validation qualité des pièces V102

Validation Cloud initiale du 25 septembre 2026. Aucun schéma, contenu physique ou règle temporelle n'a changé ; une campagne longue n'est donc pas justifiée.

- Contrôle ciblé : le besoin et l'inspection partagent les contributeurs physiques ; une pile visible retranche exactement quatre à la somme et les huit bandes ont un libellé stable.
- TypeScript : les types complets passent.
- Parcours natif Pièces adapté : l'oracle exige désormais la beauté dans l'enceinte réelle avant l'ouverture de porte, la déconstruction, l'extérieur après brèche et la reprise. Son exécution locale est bloquée avant démarrage parce que le binaire Chromium Playwright attendu (`.playwright/chromium-1243/.../chrome`) est absent ; aucune capture nouvelle n'est revendiquée.
- Performance initiale (corrigée lors de la revue ci-dessous) : aucune lecture n'est ajoutée à RAF ou à la boucle worker. La reconstruction a lieu lors d'une actualisation de l'inspecteur ; les optimisations V95–V97 et le schéma 101 restent inchangés.

Le contrôle Internet demandé a été tenté mais bloqué par le proxy 403 ; les valeurs viennent donc de la référence primaire locale 1.6.4871 déjà consignée, avec cette limitation explicite dans la recherche V102.


## Revue locale de la PR #1 et intégration

La [PR Cloud](https://github.com/Duponch/RimWorld/pull/1), tête `bf15c0b`, apporte un affichage de beauté et un adaptateur partagé ; elle ne livre pas sculptures, richesse, impression ou souvenirs de pièces. Le code annoncé existe. Schéma 101 et anciens mondes conservés ; aucun jalon G0–G5 ni estimation fonctionnelle globale clos.

Deux corrections avant fusion :

- L'invalidation systématique reconstruisait quatre champs Float64 de 250² (environ 2 Mo) à chaque lecture, même pour un extérieur sans score. Le cache UI refuse ces cas avant capture et réutilise les valeurs tant que leurs contributeurs, terrain et topologie restent identiques. Cinquante lectures avec changements de tick et nouvelles instances des meubles inchangés ne provoquent qu'une reconstruction. Les modifications de pile/sol, la reprise et la brèche sont vérifiées ; aucune promesse de FPS n'est déduite de ce contrôle structurel.
- Une omission héritée de V90 ignorait l'override de beauté du pot fleuri. Pot matériel/qualité et fleur vivante contribuent maintenant séparément. Le test exige +18 pour la fleur, puis conserve seulement le pot lorsqu'elle meurt. Le besoin personnel est corrigé prospectivement, sans mutation rétroactive d'une sauvegarde ni tirage nouveau.

**Validation locale :** [19/19 contrôles regroupés](../../artifacts/review-v102-unit.json) — beauté/bandes, habitat/fleurs, topologie et snapshots. Typage et build réussis. [Parcours Chromium WebGPU](../../artifacts/review-v102-ui.json) réussi en 32,2 secondes : Environnement réellement ouvert, valeur −2,84 et bande « laide », porte, coupe, déconstruction physique, extérieur et sauvegarde/rechargement. Sources gelées durant le parcours. Captures locales `rooms-ui-enclosed.png` et `rooms-ui-breach.png`.

Le premier parcours local s'arrêtait sur un bouton de vitesse masqué par le panneau Travail élargi en V100. Le pilote utilise désormais les vrais raccourcis 3/Espace, conserve les assertions métier et ne force aucun clic à travers le panneau. Sa trace initiale reste dans `tmp/review-v102-ui-initial.json`. La fixture de pot ajoutée pendant la revue a aussi été complétée de son emprise après un refus de typage. Aucune campagne annuelle ni suite complète rejouée pour cette revue bornée ; les échecs globaux signalés dans Cloud ne sont pas réputés validés ici.
