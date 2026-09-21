# Performance V91 — trois milieux et charge mixte

Les mesures CPU, les tests lourds et les fenêtres natives sont successifs. Sources servies figées pendant le navigateur. Les scripts ne modifient ni durée biologique, ni fréquence de décision, ni PRNG pour obtenir un meilleur débit.

## Nouvelles cartes

[biomes-cpu-v91.json](../../artifacts/biomes-cpu-v91.json) : graine 42, trois cartes 250², trois colons initiaux, douze désignations de récolte/coupe, 360 ticks consécutifs et encodage tous les cinq ticks. Une seule génération par biome ; ce ne sont pas des percentiles de génération robustes.

| Milieu | Génération | Ressources finales | Animaux | Simulation p95 | Snapshot p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Tempéré | 558 ms | 17 137 | 5 | 10,57 ms | 16,44 ms |
| Boréal | 409 ms | 9 773 | 8 | 4,05 ms | 4,88 ms |
| Aride | 330 ms | 5 312 | 7 | 2,88 ms | 2,02 ms |

La présentation résidente partage les lots de plantes et six silhouettes animales préchauffées. La croissance graphique est quantifiée en quatre étapes ; les matières et portages utilisent les mêmes profils. Le calcul des surfaces de meubles est commun aux espèces d'un snapshot.

## Charge mixte et diagnostic

`HABITAT_APPAREL=1 VALIDATION_VERSION=v91` reprend le protocole V90 : cent colons, cent lièvres, habitat, habillement, cuisine/froid, énergie, commerce et nettoyage, 650 ticks après échauffement. Les oracles de travaux et la validation du monde doivent réussir.

La [première mesure](../../artifacts/habitat-apparel-cpu-v91-before-food-query.json) donne p95 101,13 ms, p50 56,36 ms, pic 179,27 ms ; snapshot p95 14,57 ms. Le relevé V90 publié donnait p95 79,65 ms. Deux passages à des moments différents ne permettent pas d'attribuer causalement cet écart au lot.

Le [profil échantillonné](../../artifacts/biomes-profile-v91.json) sur 350 ticks pointe `navigationCosts`, l'accès candidat et les emprises. La recherche alimentaire animale apparaît aussi : son double calcul de croissance a été supprimé, sans changer candidats, ordre ou règles. Les coûts dominants de navigation restent à traiter séparément avec comparaison équivalente et invalidations prouvées.

Autres optimisations : facteur thermique partagé par région/profil et intervalle neutre sans parcours des plantes ; ensembles immuables de produits de facture mis en cache paresseusement. Le microbanc des factures contient des stocks à zéro : ses durées ne démontrent pas un gain global. L'équivalence utile du compteur est vérifiée séparément avec produits réellement comptés, cargaisons, produits libres et cuirs exclus du compte de viande.

## Transport exact et croissance graphique

Le premier profil natif identifie le traitement des messages de simulation, puis les reconstructions de géométrie. À température matinale inférieure à 6 °C, la variation du facteur thermique modifie les checkpoints de milliers de plantes : le delta objet devenait volumineux.

Le [banc de transport](../../artifacts/growth-transport-v91.json) compare le même delta de 17 060 plantes. Les valeurs de croissance, tick et facteur utilisent désormais un `Float64Array`, sans arrondi ; les autres changements gardent le protocole d'objets. Une valeur sentinelle représente uniquement l'absence du facteur. Après décodage, les deux mondes sont strictement égaux au monde autoritaire. Les refus de doublon, identité inconnue, valeur invalide et ordre incohérent restent atomiques.

- Taille sérialisée V8 indicative : 3 499 250 → 717 776 octets ; ce n'est pas une mesure du format réseau du navigateur.
- Vingt clonages par variante, médiane : 64,57 → 5,19 ms ; p95 : 107,80 → 11,19 ms.
- Aucune modification des intervalles de croissance, de l'horloge ou de la quantité des observations ; seules les données répétées sont retirées du message.

Les comparaisons graphiques utilisent des champs scalaires ; les nouvelles cartes ne doublonnent plus les plantes physiques avec de l'herbe décorative. Le premier essai natif conservé et les passages corrigés ont des cadrages différents : ne pas leur attribuer un gain causal global sans cette réserve.

La croissance redimensionne maintenant les plages de sommets depuis leur copie d'origine, sans reconstruire les chunks. Les buffers, matériaux et masques de visibilité restent résidents ; les bornes sont recalculées. Quatre contrôles de rétention passent, dont croissance réelle, retour au checkpoint, retrait/restauration et comparaison à une reconstruction neuve. Dix-huit contrôles bridge/site/flore passent après la modification du transport. Ces reprises ciblées complètent la campagne regroupée, elles ne s'additionnent pas à ses 138 tests comme autant de contrats distincts.

La [mesure CPU finale](../../artifacts/habitat-apparel-cpu-v91.json), même protocole de 650 ticks, donne p50 68,40 ms, p95 131,95 ms, pic 207,51 ms ; snapshot p95 20,45 ms. Les oracles métier passent, mais ce relevé est plus lent que le premier et que V90. Aucun gain général de simulation n'est établi. Le microbanc de clonage isole un gain réel de transport ; il ne masque pas ce résultat défavorable à cent colons.

## Résultats natifs et clôture

Le [parcours natif des trois biomes](../../artifacts/biomes-native-v91.json) passe : accueil, scénario/difficulté, choix de milieu et retour, vraie génération, inspection/recentrage animal, activation et retrait de chasse, dix secondes à 6×, sauvegarde et restauration exacte. Navigateur Chromium natif, 1440×1000, sans SwiftShader ; sources figées. Les captures locales ont été inspectées. Le premier essai révélait un libellé de biome constant et une herbe décorative doublonnant la flore ; ils ont été corrigés.

| Milieu, trois colons | Images p95 | Pic conservé | Débit observé / 6× |
| --- | ---: | ---: | ---: |
| Foret temperee | 58.3 ms | 279.2 ms | 5.630× |
| Foret boreale | 20.8 ms | 179.1 ms | 5.718× |
| Broussailles arides | 20.5 ms | 150.0 ms | 5.741× |

Les [premier](../../artifacts/biomes-native-v91-initial.json), [intermédiaire](../../artifacts/biomes-native-v91-intermediate.json) et [profil instrumenté](../../artifacts/biomes-native-v91-profile.json) restent distincts. Les compteurs `methods` de l'intermédiaire sont nuls : l'instrumentation par remplacement de méthode ne ciblait pas l'instance chargée et ne fournit aucune mesure exploitable. Le profil CDP ultérieur a identifié les vrais coûts. Les cadrages et l'instrumentation diffèrent entre passages ; les écarts de temps d'image ne constituent pas une comparaison causale isolée.

Sur la [charge mixte native](../../artifacts/habitat-apparel-render-v91.json), cent colons et cent animaux : **2.414× pour 6× demandé**, image p95 25.0 ms, pic 120.7 ms. Les objets GPU restent stables, aucun message d'erreur ni état invalide ; les oracles des activités passent. Le worker fournit des moyennes de coût par lot de pas : leur p95 99.72 ms n'est pas un percentile de chaque tick. Adoption des snapshots p95 13.3 ms. Le rendu et le débit de simulation sont deux mesures distinctes.

La forêt tempérée dense conserve des saccades et le débit général reste insuffisant à cent colons. Aucun débit 6× garanti, aucune campagne annuelle ni conclusion d'autonomie universelle.


La présentation historique mine/coupe passe également après les optimisations, sans saut ni occupation solide détectés ; ces scènes restent distinctes du banc des nouveaux biomes. [Contrôles finaux](../../artifacts/biomes-final-checks-v91.json).
