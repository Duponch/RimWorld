# Validation V60 — tir automatique et réaction civile Attaquer

19 septembre 2026, `main`. [Contrat](../development/automatic-combat.md), [recherche fraîche](../research/automatic-combat-reference.md). Aucun nouveau catalogue militaire ni raid. Les états V59 sont strictement validés avant migration neutre V60.

## Vérifications fonctionnelles

- Suite complète : **278/278 tests, 67 fichiers, 307,08 s**, dont pilotes de colonie de plusieurs jours et compagnon de rencontre désormais défendu par tir automatique. Cette suite précède l’optimisation des captures locales.
- Après optimisation : **36/36**, contrats acquisition, capture tactique, tir, mêlée et rencontre ; **19/19** après durcissement final des sauvegardes (permission/cycle/visée). Construction TypeScript/Vite réussie ; avertissement existant du bundle principal >500 kB maintenu.
- UI native commandes et charge : **2/2, 1 minute** (commandes 11,8 s, charge 47,8 s), avant la revue finale d’orientation. Reprise des commandes après correction : **10,9 s**, avec contrôle de l’attribut GPU après chargement. À 1× et 6× : permission de tir, politique civile Affectations/inspection, vraies blessures, pause et reprise exacte par boutons. [Bilan UI](../../artifacts/automatic-combat-ui-v60.json), capture locale `artifacts/automatic-combat-v60.png` inspectée.
- Captures locales confrontées au résultat complet sur les empreintes/orientations, y compris origine hors fenêtre et frontière fermée. Résultats de combat/minage identiques dans les trois charges CPU avant/après ; ce contrôle de compteurs ne prétend pas comparer chaque octet.

Premiers échecs conservés dans le relevé : quatre fixtures initiales (retour void de `addMaterial`, versions attendues, champ V60 dans fixture V58) ; UI perdant la sélection après Échap, corrigée par resélection du portrait ; nouveau cas d’ordre civil supposant à tort une acceptation pendant récupération. Le jeu conserve son refus explicite hérité de V56/V59 : limite documentée, récupération jamais effacée. Le test vérifie refus sans mutation, ordre accepté pendant visée puis reprise. Après attente, la fixture désactive temporairement le métier pour éviter que le travail soit déjà pris automatiquement. Aucun seuil de fluidité assoupli.

## Mesures de charge

Windows 11 10.0.26200, Ryzen 5 3600, Node 24.11.1 ; Chromium natif WebGPU AMD RDNA-1, 1440×1000. Tests et mesures séquentiels, sans autre suite de cet agent ; charge des applications utilisateur non quantifiée. Carte 250², 3/30/100 acteurs : tir libre des mobilisés, sentinelles armées, civils Attaquer/Fuir et travailleurs miniers. 240 ticks, santé réelle, sans remise à zéro ni tir commandé injecté. Le témoin `quiet` utilise les mêmes décisions autonomes : ce n’est pas un cas sans combat. `hostileTargets:false` dans ces fichiers décrit le drapeau historique HOSTILE_TARGETS ; `automatic:true` et le protocole identifient bien cette charge hostile.

Le profil CPU localise les pointes dans `considerAutomaticCombat`, les captures tactiques complètes et `blockedCells`. Portée +3 couvre désormais toutes les consultations de l’acquisition (penchement, couvert, cône) ; recréer après interruption/dépôt. La grille de contact n’est allouée que pour une proximité réelle. Pas de cache conservé après mutation, pas de réduction de fréquence ou de règle.

[CPU avant](../../artifacts/shooting-cpu-v60-before.json), [après](../../artifacts/shooting-cpu-v60-final.json), [natif](../../artifacts/shooting-native-v60-final.json). À cent acteurs, **p99 mixte 247,04 → 71,86 ms**, maximum **261,82 → 87,62 ms** ; p95 **30,06 → 30,22 ms**, donc pas de gain significatif sur ce percentile. Pointes de combat actif, démarrage inclus : **265,04 → 105,11 ms**. Une passe inclut JIT/GC et variabilité.

| Acteurs | Tick p95 / p99 / max (ms) | Encodage p95 (ms) | Image p95 / p99 / max (ms) | Scène p95 (ms) | Draw calls max |
|---|---:|---:|---:|---:|---:|
| 3 | 4.18 / 5.32 / 10.16 | 2.98 | 12.50 / 12.60 / 125.00 | 2.80 | 168 |
| 30 | 11.74 / 20.33 / 29.08 | 5.31 | 16.60 / 24.80 / 137.40 | 5.70 | 174 |
| 100 | 30.22 / 71.86 / 87.62 | 5.15 | 24.90 / 37.40 / 129.20 | 9.20 | 175 |

Les vingt premiers ticks sont exclus des percentiles CPU mixtes, inclus dans la série de combat actif. Le natif comprend les transitions/receptions et ne se compare pas par soustraction aux ticks CPU. Zéro erreur navigateur et zéro nouveau pipeline GPU pendant les mesures ; les vols utilisent le lot instancié existant. **Cent acteurs à 6× ne sont pas garantis** : le p95 simulation dépasse déjà 16,67 ms avant communication/rendu. Les pointes natives restent visibles.

## Garde de présentation

Avant V60, reprise isolée du contrôle V59 : minage puis abattage 45 s chacun, zéro attente après amorçage, saut ou occupation de roche, images p95 8,4 ms et max 33,3 ms. [Données avant](../../artifacts/harvest-sync-v60-before.json). Ce passage réussi ne supprime pas les échecs V59 ni ne prouve leur cause. Garde finale réussie sur les deux phases : **zéro attente après amorçage, zéro saut, zéro occupation rocheuse, zéro erreur** ; 44 changements de vitesse, application complète sous **38.8 ms**. Images p95 **8,3 ms**, max **25 ms** pour minage et abattage. [Données finales](../../artifacts/harvest-sync-v60-final.json). Les compteurs `gapCount` incluent la préparation initiale et ne sont pas le compteur d’attente après amorçage. Aucun changement des seuils ni du protocole.

## Portée et suite

Livré : défense automatique du poste mobilisé, réglage de tir libre, sélection pondérée, réaction civile Attaquer physique, inspection/Affectations et continuation V60. Déjà jouable : survie, construction/logistique/minage/production, habitat, secours/soins/médicaments, équipement du revolver, mobilisation, tir/mêlée et sentinelle optionnelle.

Partiel/absent : réveil défensif, acceptation immédiate des ordres civils pendant récupération, poursuite/postes ennemis, armes/vêtements/armures/inventaire complet, maladies/chirurgie, animaux, social/crises, climat/biomes complets, incendies/électricité complète, recherche/contenu, raids/narrateur/factions/commerce, monde/caravanes/fin. G0 en consolidation, G1/G2 partiels, G3 premières boucles ; G4/G5 ouverts, aucun jalon clos. Estimation globale inchangée environ 20 % (15–25 %). Prochain lot : poursuite et positions de tir de la menace, avec leurs dépendances.

## Revue finale : présentation et pilote humain

La nouvelle assertion sur l’attribut GPU `aTo.w` a reproduit une orientation perdue après chargement pendant le cooldown automatique. L’ordre ayant fini à l’émission, le rendu n’avait plus sa cible ; il utilise maintenant `lastAttack` durant cette récupération. L’oracle final vérifie le cosinus de l’écart à la cible (évite aussi un retournement de 180°). Le patient porté est exclu du cône de risque pour ne pas compter sa position miroir en plus de son porteur. Les mesures de charge et la garde de fluidité précèdent ces deux corrections locales ; la UI des commandes les suit. Dernière relecture : une origine de mêlée sous forme de tableau est refusée sans coercition en chaîne ; **14/14** sur acquisition/mêlée puis build réussi.

Premier parcours UI civil : échec métier après **6,7 minutes**, au tick 18 057, avec alimentation, sommeil, habitat, énergie et bilans cohérents mais zéro bloc et aucun mur en pierre. [Rapport conservé](../../artifacts/colony-journey-v60-before.json). Le pilote avait miné huit roches naturelles et huit minerais sans obtenir de fragment naturel ; il ne redésignait qu’une cellule par visite de quatre heures. Reprise de la stratégie : maintenir quatre chantiers miniers proches tant que l’atelier manque de fragments/blocs. Aucun changement des chances de fragment, aucune ressource injectée et aucune acceptation du stock nul comme réussite. **7/7** sur acquisition et pilote de colonie (trois cartes, cinq à huit jours), 136,93 s.

Deuxième UI : 35 blocs rangés et mur en pierre achevé au tick 18 094, mais l’ancienne assertion exigeait aussi aucun minage en attente à minuit. [État conservé](../../artifacts/colony-journey-v60-maintenance-before.json). Elle contredisait le maintien de la réserve. Les ouvrages doivent toujours être achevés au troisième jour ; seule la maintenance minière (au plus quatre cellules) rejoint les autres travaux de réapprovisionnement suivis jusqu’au réveil. Le contrôle exige ensuite la disparition de leurs IDs précis et le rangement/emploi de tous les fragments. [Rejeu préalable du checkpoint](../../artifacts/colony-maintenance-v60-preflight.json) : tout achevé/rangé au tick 20 094, bilans et sauvegarde valides, avant la reprise UI complète.

**Parcours UI complet final réussi : 1/1, 7,2 minutes, WebGPU natif.** [Rapport final](../../artifacts/colony-journey-v60-final.json). Au jour 3, tick 18 093 : 35 blocs rangés, 50 aciers rangés et 150 incorporés, mur en pierre, trois lits, table/tabourets, atelier, toit, porte, générateur et lampe présents. Dix-huit repas consommés et dix-huit cuisinés observés, trois dormeurs, deux loisirs, bois conservé et nourriture réconciliée. Au matin, tick 20 140 : aucun chantier restant, un fragment rangé, besoins positifs, aucune erreur navigateur. Capture finale locale `artifacts/colony-three-days.png` inspectée. Ce parcours part du générateur par la vraie UI, sans injection de stock, blessure ni vitesse non disponible au joueur.

Les journaux compacts, y compris les échecs diagnostiqués, sont dans [le relevé V60](../../artifacts/automatic-combat-v60-checks.txt). Vérification documentaire finale : liens locaux valides, 25 identifiants de domaines et cinq familles de validation préservés ; les trois originaux restent byte-identiques.
