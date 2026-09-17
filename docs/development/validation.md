# Validation courante — V49

17 septembre 2026. [Auto-soins ordinaires](self-tending.md), [sources et portée](../research/self-tending-reference.md). [Validation V48 archivée](../history/validation-feeding-v48.md). Aucun résultat ci-dessous ne prouve tous les cas possibles ni une fluidité parfaite.

## Simulation et reprise

**185 scénarios sur 185 passent, 56 suites, 134,6 s** : [rapport global](../../artifacts/core-self-tending-v49.json). Le pilote sur trois cartes 250² pendant cinq jours, puis huit jours pour la graine 42, passe en 133,2 s. La clinique de cinq jours de V48 est également conservée : secours, traitement, alimentation répétée et bilan exact des repas.

Les cinq scénarios d'auto-soins croisent option désactivée, Médecin/Patient distincts, politique de soins, priorité directe conservée, autres patients, réservations, absence de lit obligatoire, perte des mains, incapacité, décès, épuisement, annulation, sortie réelle du mobilier, absence de sortie, progression sauvegardée, snapshots et validation V48 stricte. Cent adultes terminent chacun leurs deux traitements avec XP exacte et continuation identique. Les cas de qualité exigent 0,7 sur la base avant plafond/variation : ce n'est pas 0,7 sur le résultat final ni une pénalité de vitesse.

Le [premier passage ciblé](../../artifacts/self-tending-initial-v49.json) passe 25/27 cas ; deux fixtures sont corrigées : attente de schéma encore 48 et roche synthétique placée sur la seconde case du lit. Le [passage ciblé suivant](../../artifacts/self-tending-targeted-v49.json) passe, puis la suite entière ci-dessus. Aucun validateur assoupli. Ces comptes se recouvrent et ne s'additionnent pas.

## Interface et chronologie

Chromium natif WebGPU, AMD RDNA 1, Ryzen 5 3600, Windows 11 10.0.26200, viewport 1440×1000. Le parcours d'auto-soins utilise Santé, Travail et clic droit ; il quitte un lit, commence le geste, annule sans XP puis reprend et sauvegarde/recharge pendant traitement. Les assertions regardent les vrais attributs GPU après rendu, la position, l'orientation, la posture et l'XP par lésion traitée.

**Le premier parcours a détecté une perte d'orientation au rechargement** : l'acteur immobile repartait vers l'angle arbitraire de 36°, malgré un trajet précédent vers le nord. `PawnLayer` récupère maintenant l'orientation de la dernière arête sauvegardée lorsque la présentation est reconstruite ; les cibles externes et la posture de lit gardent leur priorité. L'oracle n'a pas été assoupli. Le passage corrigé réussit, puis le contrôle final passe en 10,8 s avec 701 observations de travail, deux plaies traitées et 175 XP nettes sans passion. [Rapport natif](../../artifacts/self-tending-ui-v49.json). Capture inspectée ; les deux permissions médicales sont sur des lignes séparées pour la lisibilité.

Le [parcours final regroupé](../../artifacts/self-tending-colony-v49.json) passe ses deux scénarios sans reprise en 423,8 s. La partie de trois jours dure 411,2 s, avec [bilan métier](../../artifacts/self-tending-colony-gameplay-v49.json) : vingt repas cuisinés, dix-huit ingérés, camp équipé, générateur et lampe opérationnels, stocks entretenus, bois conservé et nourriture réconciliée, aucune erreur. Elle vérifie les boucles civiles sans blessure injectée ; les auto-soins sont exercés séparément. Les gros corps encodés des pièces jointes sont retirés du rapport compact, pas ses résultats.

Le [contrôle natif minage/abattage](../../artifacts/self-tending-presentation-v49.json) passe aussi : deux phases de 45 s, carte naturelle 250², trois colons, vitesses 1/6/3 alternées toutes les deux secondes. Les 21 493 images observées ne montrent aucun saut ni occupation solide ; temps d'image p95 4,3 ms, maxima 16,6/16,7 ms. Le délai maximal de changement de vitesse mesuré est 17,4 ms. Ce petit scénario ne remplace pas l'audit graphique à cent acteurs.

## Charge CPU isolée

Même Ryzen/Windows, Node 24.11.1. `scripts/rescue-bench.ts --self`, carte dégagée 250², 800 ticks, tous les acteurs possédant deux lésions et les auto-soins autorisés. Validité/résultats/continuation contrôlés hors chronométrage. Aucun autre banc de test simultané. [Rapport](../../artifacts/self-tending-cpu-v49.json).

| Adultes intégralement traités | Tick p50 / p95 / p99 / max | Clone intégral p95 |
|---|---|---|
| 2 | 0,052 / 0,269 / 0,579 / 20,573 ms | 51,96 ms |
| 30 | 0,471 / 1,755 / 2,366 / 12,568 ms | 48,40 ms |
| 100 | 1,792 / 6,883 / 8,299 / 14,373 ms | 49,83 ms |

Un passage par combinaison. Le banc médical partagé conserve `rescued` pour les adultes traités et `carryTicks` pour les observations actives de travail, explicités dans le protocole. Le clone intégral ne représente pas les messages différentiels. Pas de FPS déduit du CPU ni de comparaison causale avec V48, où seule la moitié des acteurs travaillait comme médecin.

Les pointes graphiques à cent acteurs relevées en [V48](../history/validation-feeding-v48.md) restent ouvertes. Ce lot vérifie cent auto-soins en simulation ; il ne renouvelle pas le banc graphique de cent acteurs. L'audit mixte scène/transferts/HUD/rendu reste à faire, et zéro compilation de pipeline ne prouverait pas son absence de saccades.

## Périmètre

Compilation TypeScript/Vite réussie, avec l'avertissement habituel de taille du chunk graphique. Contrats, guide, catalogue, inventaire et roadmap actualisés ; aucun nouvel objet ni médicament. V48 validée avant V49, sans autorisation d'auto-soin inventée.

Les auto-soins livrés sont le fournisseur ordinaire et l'ordre direct. **Préemption urgente et réévaluation après une seule plaie restent à implémenter** ; cocher l'option n'interrompt pas automatiquement toute activité ou attente au lit. Médicaments, maladies/chirurgie, files, équipement/combat et relations restent absents. G0 se consolide, G1/G2 sont partiels, les fondations humaines de G3 avancent ; aucun jalon déclaré terminé.
