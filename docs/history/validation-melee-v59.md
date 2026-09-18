# Validation V59 — mêlée, incapacités et continuité

19 septembre 2026, mode jour, main, sans agent supplémentaire. [Contrat](../development/melee.md), [recherches, versions et incertitudes](../research/melee-reference.md).

## Parcours et résultats

Huit scénarios de mêlée profonds complètent les contrats existants : statistiques/outils et parties absentes ; propagation et couches anatomiques ; approche puis échanges réels jusqu’à incapacité avec sauvegardes de phases ; refus atomique, diagonales de contact et récupération non annulable ; étourdissement en cours de trajet et bridge ; oracle indépendant d’intégration à petits pas combinant ralentissement/immobilité ; migration V58 ; trente acteurs qui frappent, tirent, fuient et extraient réellement la roche sans réinitialisation médicale.

La passe globale avant revue a obtenu **268 succès sur 270, en 304,48 s**. Deux échecs sont conservés : attente historique de profil sans Mêlée, corrigée dans la fixture ; pilote civil ayant atteint sa limite de 300 s pendant une mesure native concurrente. Aucun assouplissement du validateur ni du délai. [Sortie complète](../../artifacts/melee-suite-v59.txt).

Le pilote rejoué seul avec les contrôles de santé passe : **6/6 en 150,18 s**, dont 147,48 s pour cinq à huit jours sur trois cartes. Production, construction, repas, repos et bilan physique restent contrôlés. [Sortie](../../artifacts/melee-colony-v59.txt). Après optimisation, **36/36 en 25,95 s**, puis **16/16 en 9,96 s** après la dernière garde d’ordre de déplacement ; [contrats ciblés](../../artifacts/melee-targeted-v59.txt), [dernière revue](../../artifacts/melee-review-v59.txt). Ces passes se chevauchent fonctionnellement : ne pas additionner leurs nombres comme autant de scénarios distincts. Le build final passe, avec l’avertissement existant de taille du chunk graphique ; [sortie](../../artifacts/melee-build-v59.txt).

La vraie UI couvre mobilisation, bouton de mêlée, clic carte, approche, blessures et pose GPU de frappe à 1×/6×, puis sauvegarde/rechargement exact. Le premier essai a atteint 90 s parce que Charger était encore désactivé après l’injection de la fixture ; le parcours crée désormais une sauvegarde par le vrai bouton avant de charger, avec délais bornés. Ce défaut du parcours ne constitue pas une panne du jeu. [Bilan des poses et blessures](../../artifacts/melee-ui-v59.json). La longue partie civile UI de trois jours n’est pas rejouée : dernière preuve V56, pilote numérique et compagnon de rencontre avec soins rejoués dans les contrats ciblés.

## Charge et coût mesurés

Windows 11 10.0.26200, Ryzen 5 3600, Node 24.11.1 ; Chromium natif WebGPU AMD RDNA-1, 1440×1000. Pas de mesure GPU logiciel. La charge externe du PC n’est pas quantifiée. Les passes finales sont séquentielles ; le chevauchement accidentel d’un premier contrôle graphique avec la fin du banc natif est explicitement exclu des comparaisons.

Carte 250², 3/30/100 acteurs, approche et mêlée contre sentinelles armées ; autres civils en fuite ou aux travaux. 240 ticks avec santé réelle, sans guérison artificielle. Vingt premiers ticks exclus des percentiles CPU mixtes mais inclus dans la série de combat actif. Le témoin nommé « quiet » conserve les ordres de mêlée initiaux et l’IA hostile : ce n’est pas un cas sans combat. Le CPU renouvelle les ordres toutes les 60 unités ; le natif garde les ordres initiaux et observe la fin par polling. Ne pas soustraire leurs percentiles. `mixedResourcesRemoved` compte les entités végétales, pas les cellules excavées ; le scénario métier de trente acteurs vérifie séparément la diminution réelle de roche.

Le profilage a identifié les évaluations anatomiques répétées dans les mêmes sous-pas et les recherches de porteurs. Une capture paresseuse limitée à la transaction synchrone réutilise corps et personnes portées, puis expire après toute tentative de mêlée ou impact de projectile. Pas de cache conservé entre ticks ou après mutation médicale. [Avant](../../artifacts/shooting-cpu-v59.json), [après](../../artifacts/shooting-cpu-v59-final.json).

À cent acteurs, le p95 CPU mixte passe **40,86 → 28,14 ms** (environ −31 %). Émissions/impacts, décès/incapacités et ralentissements conservent les mêmes compteurs dans les trois charges ; ce contrôle de résultats ne prétend pas comparer chaque octet avant/après. À trois acteurs le p95 augmente : une passe inclut JIT, GC et variabilité, elle ne garantit pas un gain universel.

| Acteurs | Tick mixte p95 / p99 / max (ms) | Encodage p95 (ms) | Combat actif max, démarrage inclus (ms) |
|---|---:|---:|---:|
| 3 | 7.07 / 17.95 / 50.86 | 4.88 | 75.05 |
| 30 | 12.55 / 20.67 / 34.48 | 5.80 | 111.40 |
| 100 | 28.14 / 39.13 / 53.62 | 5.23 | 204.53 |

28,14 ms dépasse le budget de 16,67 ms par tick à 6×, avant communication/rendu. Les captures et démarrages de fuite ainsi que l’application des snapshots restent à optimiser avant d’augmenter la densité des affrontements. Aucune promesse de fluidité parfaite ou de cent acteurs soutenus à 6×.

## Garde de récolte — essais non retenus

Premier passage : dix frames d’attente, aucun saut ni occupation rocheuse, 22 changements de vitesse sous 62,7 ms. Le message générique « Delayed speed controls » recouvrait ici les attentes, pas une réponse tardive des commandes. Chevauchement avec la fin d’une mesure native ; [données conservées](../../artifacts/harvest-sync-v59-overlap.json). Le [banc natif concerné](../../artifacts/shooting-native-v59-final.json) est conservé mais n’est pas utilisé comme preuve d’amélioration isolée.

Un second essai a été invalidé par une modification de source pendant le serveur de développement et a atteint le timeout de 60 s. Les contrôles terminent leurs processus ; aucun seuil affaibli. Les mesures finales nécessitent code figé et absence de suite concurrente.

## Portée livrée

Mêlée commandée, riposte locale de sentinelle, coups/ratés/esquive, XP, lésions soignables et pauses de déplacement sont intégrés. Étourdissement de 45 ticks Core explicitement provisoire (sources divergentes). Tir automatique des mobilisés, Attaquer civil, poursuite/positions autonomes, autres armes/armures, dégâts aux bâtiments, raids et prisonniers restent absents. G0 en consolidation, G1/G2 partiels, G3 premières boucles de conflit ; G4/G5 ouverts. Estimation globale inchangée : environ 20 %, fourchette 15–25 %, pas un décompte de fonctionnalités.

## Vraie UI et rendu — passe finale séquentielle

Deux parcours réussis en 1,5 minute : UI mêlée 18,4 s, puis charge native 1,2 minute. Aucune autre suite de cet agent active pendant cette passe, aucune source du jeu modifiée ; charge externe du PC inconnue. [Sortie](../../artifacts/melee-native-v59.txt), [données](../../artifacts/shooting-native-v59-isolated.json).

| Acteurs | Image p95 / p99 / max (ms) | Application scène p95 (ms) | Draw calls max | Poses de frappe observées |
|---|---:|---:|---:|---:|
| 3 | 20.8 / 25.0 / 133.4 | 3.9 | 164 | 212 |
| 30 | 24.9 / 33.3 / 158.3 | 5.0 | 167 | 2731 |
| 100 | 37.5 / 58.3 / 204.2 | 9.7 | 167 | 13623 |

Aucune erreur navigateur ni nouveau pipeline pendant les trois mesures. Les poses emploient le rig instancié existant ; cela ne supprime pas les pointes CPU/IPC/scène. Les maximums sont conservés, aucune promesse de fluidité parfaite. Le [premier passage natif](../../artifacts/shooting-native-v59.json) précède l’optimisation ; la variabilité entre passes interdit de transformer le gain CPU local en pourcentage de FPS garanti.

## Garde finale instrumentée — limite encore ouverte

**Contrôle global non validé** : 45 s de minage passent sans attente ; 45 s d’abattage contiennent **une frame immobile de 16,5 ms** au curseur de présentation. Aucun saut, aucune pénétration rocheuse, aucune disparition avant le temps présenté et aucune erreur navigateur. Les **44 changements de vitesse** répondent sous **40,7 ms** ; les commandes rapides ne constituent donc pas le défaut observé. Image p95 8,5 ms dans les deux phases, maximum 29 / 29,2 ms. [Données avec contexte worker](../../artifacts/harvest-sync-v59-traced.json), [sortie et échec conservés](../../artifacts/melee-presentation-v59.txt).

La fenêtre d’attente montre plusieurs lots worker longs, dont encodage 64,4 ms et lot total 68,8 ms ; les envois suivants rattrapent le retard. Un relevé système effectué **après** le parcours constate sur cinq secondes Firefox 5,88 secondes CPU, deux processus Battle.net 3,47/3,39, un jeu 3,25, plus d’autres processus. [Relevé](../../artifacts/melee-system-load-v59.json). Ce constat ne prouve pas la cause de la pointe précédente et ne mesure pas la contention GPU ; aucun programme utilisateur arrêté.

Le jeu n’est pas déclaré exempt d’attentes. Reprendre ce contrôle sur machine disponible, puis profiler l’encodage si la pointe se reproduit, avant d’augmenter la densité des affrontements. Pas de nouvel essai répété uniquement pour obtenir un résultat vert, ni seuil assoupli. Le parcours fonctionnel de mêlée est livré avec cette limite de performance explicitement ouverte.
