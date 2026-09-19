# Validation faune V76 — 19 septembre 2026

## Périmètre

Lièvres adultes autonomes, repas physiques/broutage, repos, portes/chantiers, liste Faune, sauvegarde V76 et rig GPU résident. Pas de chasse, santé animale ou boucherie. [Contrat](../development/wildlife.md), [vérification Core](../research/wildlife-reference.md).

## Contrôles

- Première passe globale : **379/380**, 85 fichiers verts sur 86. Le seul échec est le plafond de 300 s du pilote regroupant trois cartes : 325,1 s. Les trois cartes ont atteint leurs vérifications métier, avec rapports à 48 020 / 30 020 / 30 020 ticks. Ce n'est pas une passe monolithique verte.
- Le pilote est désormais paramétré par carte (240 s chacune), sans retirer d'assertion. La carte 93 contient douze lièvres ; le bilan alimentaire distingue leurs prises. Les nouvelles reprises sont consignées ci-dessous.
- **4/4 contrôles ciblés finaux** de faune : contacts/durée/consommation partielle ou totale, continuation exacte pendant repas/mouvement/sommeil, régime et conservation, partage d'une pile avec un colon transporteur, disparition de source, mur/porte/coin/chantiers, PRNG, activation idempotente et corruption/migration V75, sommeil affamé animal distinct du profil humain.
- **Build et typage réussis.** Avertissement Vite de taille de bundle conservé ; il ne s'agit pas d'une mesure des images en jeu.
- **UI native 1/1** : camp neuf 64², présence de trois lièvres, liste et centrage, déplacement à 1×, broutage à 6×, sauvegarde/rechargement exact et reprise à 1×. Premier essai en échec car la capture précédait l'acquittement de pause ; attente de `aria-pressed=true`, puis réussite en 40,1 s. Aucun diagnostic GPU ou erreur JavaScript dans la passe finale. [Trace compacte](../../artifacts/wildlife-ui-v76.json).

## Charge mesurée

Machine : AMD Ryzen 5 3600, Windows 10.0.26200, Node 24.11.1 ; rendu Chromium natif WebGPU AMD RDNA-1, fenêtre 1440×1000. Carte naturelle 250², autant de lièvres que de colons. Moitié des lièvres initialement affamés, un tiers fatigués ; colons répartis recherche/confection/minage/abattage. 650 ticks, échauffement séparé, une passe par charge ; CPU puis navigateur successifs et sources gelées pendant la capture native.

| Colons + lièvres | Tick CPU p50 / p95 / max (ms) | Image native p50 / p95 / max (ms) | Worker publié p95 / max (ms) |
|---|---|---|---|
| 3 + 3 | 1,94 / 3,57 / 21,85 | 12,4 / 16,7 / 41,7 | 4,50 / 34,80 |
| 30 + 30 | 2,37 / 14,02 / 40,96 | 8,4 / 20,7 / 45,9 | 17,60 / 41,60 |
| 100 + 100 | 7,46 / 42,78 / 73,43 | 12,4 / 33,4 / 58,3 | 45,57 / 59,73 |

[Données CPU](../../artifacts/wildlife-cpu-v76.json), [données natives](../../artifacts/wildlife-render-v76.json), avec p99, échantillons, adoption et appels de dessin. Les valeurs worker sont des moyennes de ticks par lot publié, pas un percentile indépendant par tick. Aucun pipeline compilé pendant les fenêtres mesurées, géométrie des colons conservée, aucun état invalide ni erreur GPU. Confections achevées : 1/10/33 ; consommation animale réelle dans chaque charge.

À 100 + 100, 664 ticks en 14,34 s : la demande de 6× n'est pas tenue. Les pointes restent visibles ; aucune promesse de fluidité parfaite. La charge diffère de celle des chambres froides V75 : ne pas déduire une régression ou un gain d'une comparaison directe de ces deux profils. Le plafond de 256 animaux n'est pas un budget de performance validé.

## Parcours complémentaires

Premier parcours UI arrêté au tick 12 107 : comparaison brute JSON fausse alors que les données étaient identiques. Reproduction ciblée depuis le checkpoint : le delta de terrain reconstruit `miningDamage` avant `ore`, tandis que la simulation avait ajouté les dégâts après le minerai. Le helper conserve désormais toutes les valeurs, identités et ordres de tableaux, mais accepte un ordre différent des clés d'objet. Le diagnostic conserve les états complets si une vraie différence subsiste. [Reproduction](../../artifacts/wildlife-reload-v76.json). Reprise native distincte jusqu'au tick 13 118 puis sauvegarde/rechargement exact réussis.

Deuxième essai interrompu par le HMR de Vite après une modification de commentaire du rendu pendant le test. Erreur de méthode consignée ; aucun résultat complet revendiqué pour ces deux essais. Les sources sont ensuite gelées pour la passe finale ; la limite globale passe à dix minutes pour trois jours et la maintenance physique, sans retirer la garde de progression de trente secondes par intervalle.

Pilote paramétré : carte 93, cinq jours avec douze lièvres, réussie. Commande ciblée avec les quatre scénarios de faune : **5 réussis, 2 cartes non rejouées**, 99,42 s au total. Les autres cartes conservent les résultats métier de la passe globale initiale ; aucune nouvelle passe globale prétendue. [Parcours faune](../../artifacts/colony-v76-93.json). Build final après correction du sommeil : réussi.

Troisième parcours initial arrêté au tick 13 042 par une capacité manquante du **pilote UI**, `growing-policy`, alors que la politique de colonie inclut le coton depuis V71. Le pilote sait maintenant inspecter le champ, sélectionner l'espèce et appliquer/vérifier les réglages par les vrais contrôles. Aucune commande injectée directement dans le worker. L'aide du coton, encore erronée sur l'absence de confection, est corrigée.

**Reprise réelle réussie, 1/1 en 1,8 minute**, via `COLONY_JOURNEY_CHECKPOINT=tmp/colony-v76-continuation.json`, tick 13 042 → 18 071. Quatre colons, douze lièvres, coton sur six cellules, quatre lits, atelier, générateur/lampe, 28 toits, 30 médicaments et cinq vêtements portés. 50 acier au sol tous stockés, 150 incorporés, 35 blocs tous rangés et un fragment rangé ; aucun reliquat de maintenance hors cultures n'exigeait d'attendre le matin suivant. Depuis le checkpoint : 100 unités alimentaires récoltées, neuf repas cuisinés, huit unités consommées ; bilan exact et bois conservé. Nutrition animale cumulée 6,1235, sans prise de pile dans cette partie. Sauvegarde/rechargement final exact, aucune erreur JavaScript/GPU. [Continuation](../../artifacts/colony-continuation-v76.json), [essai initial incomplet](../../artifacts/colony-journey-v76.json). **Pas de passe monolithique trois jours entièrement verte revendiquée** : les reprises et limites restent distinctes.

**Garde de minage/abattage réussie**, 20 s par phase, trois colons sur 250², vitesses 1×/6×/1×/3× alternées : zéro saut, occupation solide ou arrêt de l'horloge présentée ; 12 roches et 15 arbres retirés après leur phase de travail. Image p95 8,4 ms dans les deux phases, maximum 20,8/25 ms ; réponse visible aux changements de vitesse 14–46,8 ms. Les compteurs bruts de première arête future ne sont pas interprétés comme des téléportations ; le garde vérifie la pose et la progression réellement présentées. [Mesure](../../artifacts/harvest-sync-v76.json). Ce garde conserve son profil historique sans animaux ; la charge mixte ci-dessus et la vraie colonie couvrent leur présence.

La correction du sommeil à nutrition nulle n'active pas une nouvelle branche dans les charges mesurées, qui démarraient au minimum à 0,02 et ne pouvaient atteindre zéro sur 650 ticks. Les derniers ajustements UI sont des libellés/diagnostics ; aucun shader ou contrat de déplacement changé après ces mesures. Les checkpoints historiques V74/V75 réécrits par les scripts globaux ont été restaurés à leurs octets publiés ; les preuves nouvelles restent nommées V76.

G0 en consolidation ; G1/G2/G3 partiels ; G4 engagé ; G5 absent. Ce lot ouvre la faune, sans terminer le cycle animal ni un jalon global.
